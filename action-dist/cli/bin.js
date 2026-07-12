#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { bundledN8nPackageVersions, createBundledN8nPackageSchemaSource, createLocalPlaceholderSchemaSource, defaultBundledN8nPackageVersion, validateWorkflow } from "@n8nproof/core";
import { parseArgs } from "./args.js";
import { displayPath, inputRequiresBatch, resolveBatchInputs } from "./discovery.js";
const cliVersion = "0.0.0";
const ansiByRole = {
    pass: "32",
    fail: "31",
    warn: "33",
    error: "31",
    skip: "36"
};
const millisecondsPerDay = 24 * 60 * 60 * 1000;
let parsed;
try {
    parsed = parseArgs(process.argv.slice(2));
}
catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printHelp();
    process.exit(2);
}
if (parsed.version) {
    console.log(cliVersion);
    process.exitCode = 0;
}
else if (parsed.help) {
    printHelp();
    process.exitCode = 0;
}
else if (parsed.command === "check" && parsed.inputs.length > 0) {
    const checkFormat = readCheckFormat(parsed);
    if (checkFormat === undefined) {
        process.exitCode = 2;
    }
    else if (parsed.n8nVersion === "matrix") {
        if (parsed.source !== "bundled-n8n-package") {
            console.error("--n8n-version matrix requires --source bundled-n8n-package.");
            process.exitCode = 2;
        }
        else {
            const result = await runMatrix(parsed.inputs);
            printMatrixResult(result, checkFormat);
            process.exitCode = result.ok ? 0 : 1;
        }
    }
    else if (parsed.source !== "bundled-n8n-package" && parsed.n8nVersion !== defaultBundledN8nPackageVersion) {
        console.error("--n8n-version only applies to --source bundled-n8n-package.");
        process.exitCode = 2;
    }
    else {
        const schemaSource = createSchemaSource(parsed.source, parsed.n8nVersion);
        const shouldUseBatch = parsed.inputs.length > 1 || (await inputRequiresBatch(parsed.inputs[0]));
        if (shouldUseBatch) {
            try {
                const result = await runBatch(parsed.inputs, schemaSource);
                printBatchResult(result, checkFormat);
                process.exitCode = result.ok ? 0 : 1;
            }
            catch (error) {
                console.error(error instanceof Error ? error.message : String(error));
                process.exitCode = 1;
            }
        }
        else {
            const filePath = parsed.inputs[0];
            process.exitCode = await runSingleFile(filePath, schemaSource, checkFormat);
        }
    }
}
else if (parsed.command === "repair" && parsed.inputs.length === 1) {
    if (parsed.formatWasSet) {
        console.error("repair does not support --format; use --json for machine-readable output.");
        process.exitCode = 2;
    }
    else if (parsed.n8nVersion === "matrix") {
        console.error("repair does not support --n8n-version matrix; choose one pinned version.");
        process.exitCode = 2;
    }
    else {
        const schemaSource = createSchemaSource(parsed.source, parsed.n8nVersion);
        process.exitCode = await runRepair(parsed.inputs[0], schemaSource, parsed);
    }
}
else if (parsed.command === "badge" && parsed.inputs.length === 1) {
    if (parsed.format === "github") {
        console.error("badge --format must be markdown, json, or svg.");
        process.exitCode = 2;
    }
    else {
        process.exitCode = await runBadge(parsed.inputs[0], parsed);
    }
}
else {
    printHelp();
    process.exitCode = 2;
}
function readCheckFormat(options) {
    if (options.json && options.format === "github") {
        console.error("check cannot combine --json with --format github.");
        return undefined;
    }
    if (options.formatWasSet && options.format !== "github") {
        console.error("check --format only supports github; use --json for JSON output.");
        return undefined;
    }
    if (options.json) {
        return "json";
    }
    return options.format === "github" ? "github" : "human";
}
function statusText(role, text, stream = process.stdout) {
    if (!colorEnabled(stream)) {
        return text;
    }
    return `\u001B[${ansiByRole[role]}m${text}\u001B[0m`;
}
function issueStatusText(severity, stream = process.stdout) {
    return severity === "warning" ? statusText("warn", "WARNING", stream) : statusText("error", "ERROR", stream);
}
function colorEnabled(stream) {
    if (process.env.NO_COLOR !== undefined) {
        return false;
    }
    const forceColor = process.env.FORCE_COLOR;
    if (forceColor !== undefined && forceColor !== "" && forceColor !== "0" && forceColor.toLowerCase() !== "false") {
        return true;
    }
    return stream.isTTY;
}
async function runSingleFile(filePath, schemaSource, format) {
    try {
        const raw = await readFile(filePath, "utf8");
        const workflow = JSON.parse(raw);
        const validation = await validateWorkflow(workflow, schemaSource);
        const summary = summarizeSingleValidation(validation);
        if (format === "json") {
            console.log(JSON.stringify({
                filePath,
                ok: validation.ok,
                checkedAt: validation.checkedAt,
                source: validation.source,
                issues: validation.issues,
                summary
            }, null, 2));
            return validation.ok ? 0 : 1;
        }
        if (format === "github") {
            printGithubValidationResult(filePath, validation.issues);
            console.log(formatSummary(summary));
            return validation.ok ? 0 : 1;
        }
        if (validation.ok) {
            console.log(`${statusText("pass", "PASS")} ${filePath}`);
            console.log(`Schema source: ${validation.source}`);
            for (const issue of validation.issues.filter((item) => item.severity === "warning")) {
                console.log(`${statusText("warn", "WARN")} ${issue.code}: ${issue.message}`);
            }
            console.log(formatSummary(summary));
            return 0;
        }
        console.error(`${statusText("fail", "FAIL", process.stderr)} ${filePath}`);
        console.error(`Schema source: ${validation.source}`);
        for (const issue of validation.issues) {
            console.error(`${issueStatusText(issue.severity, process.stderr)} ${issue.code} ${issue.path}: ${issue.message}`);
        }
        console.error(formatSummary(summary));
        return 1;
    }
    catch (error) {
        const summary = summarizeInputError();
        const message = error instanceof Error ? error.message : String(error);
        if (format === "json") {
            console.log(JSON.stringify({
                filePath,
                ok: false,
                checkedAt: new Date().toISOString(),
                source: schemaSource.kind,
                error: message,
                summary
            }, null, 2));
            return 1;
        }
        if (format === "github") {
            printGithubAnnotation("error", displayPath(filePath), "input_error", message);
            console.log(formatSummary(summary));
            return 1;
        }
        console.error(`${statusText("fail", "FAIL", process.stderr)} ${filePath}`);
        console.error(message);
        console.error(formatSummary(summary));
        return 1;
    }
}
async function runBadge(resultPath, options) {
    try {
        const raw = await readFile(resultPath, "utf8");
        const parsedResult = JSON.parse(raw);
        const badge = createBadgeModel(parsedResult, options, displayPath(resultPath));
        const rendered = renderBadge(badge, readBadgeFormat(options.format));
        if (options.outputPath !== undefined) {
            await writeFile(options.outputPath, `${rendered}\n`, "utf8");
        }
        else {
            console.log(rendered);
        }
        return 0;
    }
    catch (error) {
        console.error(`${statusText("fail", "FAIL", process.stderr)} ${resultPath}`);
        console.error(error instanceof Error ? error.message : String(error));
        return 1;
    }
}
function readBadgeFormat(format) {
    if (format === "github") {
        throw new Error("badge --format must be markdown, json, or svg.");
    }
    return format;
}
async function runRepair(filePath, schemaSource, options) {
    if (options.apply && !options.confirm) {
        console.error("repair --apply requires --confirm.");
        return 2;
    }
    try {
        const raw = await readFile(filePath, "utf8");
        const workflow = JSON.parse(raw);
        const validation = await validateWorkflow(workflow, schemaSource);
        const repair = buildRepair(workflow, validation.issues);
        if (repair.changes.length === 0) {
            const message = validation.ok ? "No repair needed." : "No repairable issues found.";
            if (options.json) {
                console.log(JSON.stringify({
                    ok: validation.ok,
                    filePath,
                    applied: false,
                    changes: [],
                    message,
                    issues: validation.issues.filter((issue) => issue.severity === "error")
                }, null, 2));
            }
            else if (validation.ok) {
                console.log(`${statusText("pass", "PASS")} ${filePath}`);
                console.log(message);
            }
            else {
                console.error(`${statusText("fail", "FAIL", process.stderr)} ${filePath}`);
                console.error(message);
            }
            return validation.ok ? 0 : 1;
        }
        const repairedText = `${JSON.stringify(repair.workflow, null, 2)}\n`;
        const repairedValidation = await validateWorkflow(repair.workflow, schemaSource);
        const patch = createWholeFilePatch(displayPath(filePath), raw, repairedText);
        if (options.apply) {
            await writeFile(filePath, repairedText, "utf8");
        }
        else if (options.outputPath !== undefined) {
            await writeFile(options.outputPath, patch, "utf8");
        }
        if (options.json) {
            console.log(JSON.stringify({
                ok: repairedValidation.ok,
                filePath,
                applied: options.apply,
                outputPath: options.apply ? undefined : options.outputPath,
                changes: repair.changes,
                remainingIssues: repairedValidation.issues.filter((issue) => issue.severity === "error")
            }, null, 2));
        }
        else if (options.apply) {
            console.log(`${statusText("pass", "APPLIED")} ${filePath}`);
            console.log(`Changes: ${repair.changes.length}`);
        }
        else if (options.outputPath !== undefined) {
            console.log(`PATCH ${options.outputPath}`);
            console.log(`Changes: ${repair.changes.length}`);
        }
        else {
            console.log(patch.trimEnd());
        }
        return repairedValidation.ok ? 0 : 1;
    }
    catch (error) {
        console.error(`${statusText("fail", "FAIL", process.stderr)} ${filePath}`);
        console.error(error instanceof Error ? error.message : String(error));
        return 1;
    }
}
function buildRepair(workflow, issues) {
    const repaired = cloneJson(workflow);
    const changes = [];
    for (const issue of issues) {
        if (issue.severity !== "error" || issue.code !== "workflow.node_parameter_unknown") {
            continue;
        }
        const target = parseNodeParameterPath(issue.path);
        if (target === undefined || !isRecord(repaired)) {
            continue;
        }
        const nodes = repaired.nodes;
        if (!Array.isArray(nodes)) {
            continue;
        }
        const node = nodes[target.nodeIndex];
        if (!isRecord(node) || !isRecord(node.parameters) || !(target.parameterName in node.parameters)) {
            continue;
        }
        node.parameters = omitRecordKey(node.parameters, target.parameterName);
        changes.push({
            code: "remove_unknown_parameter",
            path: issue.path,
            message: `Remove unknown top-level parameter "${target.parameterName}".`
        });
    }
    return {
        workflow: repaired,
        changes
    };
}
function parseNodeParameterPath(pathExpression) {
    const match = /^\$\.nodes\[(\d+)\]\.parameters\.([A-Za-z0-9_$-]+)$/.exec(pathExpression);
    if (match === null) {
        return undefined;
    }
    return {
        nodeIndex: Number.parseInt(match[1], 10),
        parameterName: match[2]
    };
}
function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}
function omitRecordKey(record, keyToOmit) {
    return Object.fromEntries(Object.entries(record).filter(([key]) => key !== keyToOmit));
}
function createWholeFilePatch(filePath, beforeText, afterText) {
    const beforeLines = splitPatchLines(beforeText);
    const afterLines = splitPatchLines(afterText);
    return ([
        `--- ${filePath}`,
        `+++ ${filePath}`,
        `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
        ...beforeLines.map((line) => `-${line}`),
        ...afterLines.map((line) => `+${line}`)
    ].join("\n") + "\n");
}
function splitPatchLines(value) {
    const normalized = value.replace(/\r\n/g, "\n");
    const withoutFinalNewline = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
    return withoutFinalNewline.length === 0 ? [] : withoutFinalNewline.split("\n");
}
async function runBatch(inputs, schemaSource) {
    const resolved = await resolveBatchInputs(inputs);
    const sourceSnapshot = await schemaSource.load();
    const results = [];
    for (const inputError of resolved.errors) {
        results.push({
            filePath: displayPath(inputError.filePath),
            status: "error",
            ok: false,
            error: inputError.error
        });
    }
    results.push(...(await mapConcurrent(resolved.files, 8, ({ filePath, origin }) => checkBatchFile(filePath, createLoadedSchemaSource(sourceSnapshot), origin))));
    const summary = summarizeBatch(results);
    return {
        ok: summary.failed === 0 && summary.errors === 0,
        checkedAt: new Date().toISOString(),
        source: sourceSnapshot.source,
        ...(sourceSnapshot.packageInfo === undefined ? {} : { packageInfo: sourceSnapshot.packageInfo }),
        ...(sourceSnapshot.selection === undefined ? {} : { selection: sourceSnapshot.selection }),
        summary,
        results
    };
}
async function checkBatchFile(filePath, schemaSource, origin) {
    const resultPath = displayPath(filePath);
    try {
        const raw = await readFile(filePath, "utf8");
        const workflow = JSON.parse(raw);
        if (!isWorkflowCandidate(workflow) && origin === "discovered") {
            return {
                filePath: resultPath,
                status: "skipped",
                ok: true,
                reason: "nodes_missing"
            };
        }
        const validation = await validateWorkflow(workflow, schemaSource);
        return {
            filePath: resultPath,
            status: validation.ok ? "passed" : "failed",
            ok: validation.ok,
            issues: validation.issues
        };
    }
    catch (error) {
        return {
            filePath: resultPath,
            status: "error",
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
function printBatchResult(result, format) {
    if (format === "json") {
        console.log(JSON.stringify(createBatchJsonResult(result), null, 2));
        return;
    }
    if (format === "github") {
        printGithubBatchResult(result);
        return;
    }
    for (const fileResult of result.results) {
        if (fileResult.status === "passed") {
            console.log(`${statusText("pass", "PASS")} ${fileResult.filePath}`);
            continue;
        }
        if (fileResult.status === "skipped") {
            console.log(`${statusText("skip", "SKIP")} ${fileResult.filePath}`);
            continue;
        }
        if (fileResult.status === "error") {
            console.log(`${statusText("error", "ERROR")} ${fileResult.filePath}`);
            console.log(`  ${fileResult.error ?? "Unknown read or parse error."}`);
            continue;
        }
        console.log(`${statusText("fail", "FAIL")} ${fileResult.filePath}`);
        for (const issue of (fileResult.issues ?? []).filter((item) => item.severity === "error")) {
            console.log(`  ${statusText("error", "ERROR")} ${issue.code} ${issue.path}: ${issue.message}`);
        }
    }
    console.log(formatSummary(result.summary));
}
async function runMatrix(inputs) {
    const versions = [];
    for (const packageVersion of bundledN8nPackageVersions) {
        const result = await runBatch(inputs, createBundledN8nPackageSchemaSource({ packageVersion }));
        versions.push({
            packageVersion,
            ok: result.ok,
            ...(result.packageInfo === undefined ? {} : { packageInfo: result.packageInfo }),
            ...(result.selection === undefined ? {} : { selection: result.selection }),
            summary: result.summary,
            results: result.results
        });
    }
    return {
        ok: versions.every((version) => version.ok),
        checkedAt: new Date().toISOString(),
        source: "bundled-n8n-package",
        versions,
        differences: collectMatrixDifferences(versions),
        summary: summarizeMatrixVersions(versions)
    };
}
function printMatrixResult(result, format) {
    if (format === "json") {
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    if (format === "github") {
        printGithubMatrixResult(result);
        return;
    }
    for (const version of result.versions) {
        const packageLabel = version.packageInfo
            ? `${version.packageInfo.name}@${version.packageInfo.version}`
            : `n8n-nodes-base@${version.packageVersion}`;
        console.log(`MATRIX ${packageLabel}: ${version.ok ? statusText("pass", "PASS") : statusText("fail", "FAIL")}`);
        console.log(`  ${formatSummary(version.summary)}`);
    }
    for (const difference of result.differences) {
        const statusSummary = Object.entries(difference.statusByVersion)
            .map(([version, status]) => `${version}=${status}`)
            .join(", ");
        console.log(`DIFF ${difference.filePath}: ${statusSummary}`);
    }
    console.log(`Matrix summary: ${result.versions.length} versions, ${result.differences.length} compatibility differences, ${formatSummaryCounts(result.summary)}`);
}
function collectMatrixDifferences(versions) {
    const filePaths = new Set();
    for (const version of versions) {
        for (const fileResult of version.results) {
            filePaths.add(fileResult.filePath);
        }
    }
    const differences = [];
    for (const filePath of [...filePaths].sort((left, right) => left.localeCompare(right))) {
        const statusByVersion = {};
        const errorSignaturesByVersion = {};
        for (const version of versions) {
            const fileResult = version.results.find((candidate) => candidate.filePath === filePath);
            statusByVersion[version.packageVersion] = fileResult?.status ?? "missing";
            errorSignaturesByVersion[version.packageVersion] = readErrorSignatures(fileResult);
        }
        const statusSignatures = new Set(Object.values(statusByVersion));
        const errorSignatures = new Set(Object.values(errorSignaturesByVersion).map((signatures) => signatures.join("|")));
        if (statusSignatures.size > 1 || errorSignatures.size > 1) {
            differences.push({
                filePath,
                statusByVersion,
                errorSignaturesByVersion
            });
        }
    }
    return differences;
}
function readErrorSignatures(fileResult) {
    if (fileResult === undefined) {
        return [];
    }
    if (fileResult.status === "error") {
        return [`input_error:${fileResult.error ?? "unknown"}`];
    }
    return (fileResult.issues ?? [])
        .filter((issue) => issue.severity === "error")
        .map((issue) => `${issue.code}:${issue.path}`)
        .sort((left, right) => left.localeCompare(right));
}
function printGithubValidationResult(filePath, issues, titlePrefix = "") {
    for (const issue of issues) {
        printGithubAnnotation(issue.severity === "error" ? "error" : "warning", displayPath(filePath), `${titlePrefix}${issue.code}`, `${issue.message} (${issue.path})`);
    }
}
function printGithubBatchResult(result) {
    for (const fileResult of result.results) {
        if (fileResult.status === "skipped") {
            printGithubAnnotation("notice", fileResult.filePath, "workflow.skipped", `Skipped non-workflow JSON file: ${fileResult.reason ?? "not an n8n workflow"}`);
            continue;
        }
        if (fileResult.status === "error") {
            printGithubAnnotation("error", fileResult.filePath, "input_error", fileResult.error ?? "Unknown read or parse error.");
            continue;
        }
        printGithubValidationResult(fileResult.filePath, fileResult.issues ?? []);
    }
    console.log(formatSummary(result.summary));
}
function printGithubMatrixResult(result) {
    for (const version of result.versions) {
        const packageLabel = version.packageInfo
            ? `${version.packageInfo.name}@${version.packageInfo.version}`
            : `n8n-nodes-base@${version.packageVersion}`;
        console.log(`MATRIX ${packageLabel}: ${version.ok ? "PASS" : "FAIL"}`);
        for (const fileResult of version.results) {
            const titlePrefix = `${version.packageVersion}:`;
            if (fileResult.status === "skipped") {
                printGithubAnnotation("notice", fileResult.filePath, `${titlePrefix}workflow.skipped`, `Skipped non-workflow JSON file: ${fileResult.reason ?? "not an n8n workflow"}`);
                continue;
            }
            if (fileResult.status === "error") {
                printGithubAnnotation("error", fileResult.filePath, `${titlePrefix}input_error`, fileResult.error ?? "Unknown read or parse error.");
                continue;
            }
            printGithubValidationResult(fileResult.filePath, fileResult.issues ?? [], titlePrefix);
        }
    }
    for (const difference of result.differences) {
        const statusSummary = Object.entries(difference.statusByVersion)
            .map(([version, status]) => `${version}=${status}`)
            .join(", ");
        console.log(`DIFF ${difference.filePath}: ${statusSummary}`);
    }
    console.log(`Matrix summary: ${result.versions.length} versions, ${result.differences.length} compatibility differences, ${formatSummaryCounts(result.summary)}`);
}
function printGithubAnnotation(kind, filePath, title, message) {
    console.log(`::${kind} file=${escapeGithubProperty(filePath)},title=${escapeGithubProperty(title)}::${escapeGithubData(message)}`);
}
function escapeGithubProperty(value) {
    return escapeGithubData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}
function escapeGithubData(value) {
    return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function isWorkflowCandidate(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Array.isArray(value.nodes));
}
function createBadgeModel(value, options, sourceFile) {
    if (!isRecord(value) || typeof value.ok !== "boolean") {
        throw new Error("Badge input must be a JSON result emitted by n8n-lint check --json.");
    }
    if (options.badgeKind === "last-verified") {
        return createLastVerifiedBadgeModel(value, options, sourceFile);
    }
    const summary = readOptionalBatchSummary(value.summary);
    const ok = value.ok;
    const message = ok ? passingBadgeMessage(summary) : failingBadgeMessage(summary);
    return {
        label: options.label,
        message,
        color: ok ? "brightgreen" : "red",
        kind: "status",
        ok,
        sourceFile,
        state: ok ? "passing" : "failing",
        ...(summary === undefined ? {} : { summary })
    };
}
function createLastVerifiedBadgeModel(value, options, sourceFile) {
    const checkedAt = readCheckedAt(value.checkedAt);
    const asOfDate = readAsOfDate(options.asOfDate);
    const ageDays = daysSince(checkedAt, asOfDate);
    const n8nVersion = readN8nVersionLabel(value);
    const label = options.labelWasSet ? options.label : "last verified";
    const summary = readOptionalBatchSummary(value.summary);
    if (value.ok !== true) {
        return {
            label,
            message: `${n8nVersion}, unverified`,
            color: "red",
            kind: "last-verified",
            ok: false,
            sourceFile,
            checkedAt: checkedAt.toISOString(),
            n8nVersion,
            ageDays,
            state: "unverified",
            ...(summary === undefined ? {} : { summary })
        };
    }
    const state = readLastVerifiedState(ageDays);
    const message = `${n8nVersion}, ${lastVerifiedMessage(ageDays, state)}`;
    return {
        label,
        message,
        color: state === "current" ? "brightgreen" : state === "recheck-recommended" ? "yellow" : "red",
        kind: "last-verified",
        ok: true,
        sourceFile,
        checkedAt: checkedAt.toISOString(),
        n8nVersion,
        ageDays,
        state,
        ...(summary === undefined ? {} : { summary })
    };
}
function readOptionalBatchSummary(value) {
    if (value === undefined) {
        return undefined;
    }
    if (!isRecord(value)) {
        throw new Error("Badge input summary must be an object when present.");
    }
    return {
        totalFiles: readNonNegativeInteger(value.totalFiles, "summary.totalFiles"),
        workflows: readNonNegativeInteger(value.workflows, "summary.workflows"),
        passed: readNonNegativeInteger(value.passed, "summary.passed"),
        failed: readNonNegativeInteger(value.failed, "summary.failed"),
        warnings: value.warnings === undefined ? 0 : readNonNegativeInteger(value.warnings, "summary.warnings"),
        skipped: readNonNegativeInteger(value.skipped, "summary.skipped"),
        errors: readNonNegativeInteger(value.errors, "summary.errors")
    };
}
function readNonNegativeInteger(value, label) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        throw new Error(`Badge input ${label} must be a non-negative integer.`);
    }
    return value;
}
function passingBadgeMessage(summary) {
    if (summary === undefined) {
        return "passing";
    }
    return `${summary.passed} passing`;
}
function failingBadgeMessage(summary) {
    if (summary === undefined) {
        return "failing";
    }
    return `${summary.failed + summary.errors} failing`;
}
function readCheckedAt(value) {
    if (typeof value !== "string") {
        throw new Error("Last-verified badge input must include checkedAt from n8n-lint check --json.");
    }
    const checkedAt = new Date(value);
    if (Number.isNaN(checkedAt.getTime())) {
        throw new Error("Last-verified badge input checkedAt must be a valid ISO date.");
    }
    return checkedAt;
}
function readAsOfDate(value) {
    if (value === undefined) {
        return new Date();
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error("--as-of must be a YYYY-MM-DD date.");
    }
    const asOfDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(asOfDate.getTime()) || asOfDate.toISOString().slice(0, 10) !== value) {
        throw new Error("--as-of must be a valid YYYY-MM-DD date.");
    }
    return asOfDate;
}
function daysSince(checkedAt, asOfDate) {
    return Math.max(0, Math.floor((toUtcDateStart(asOfDate) - toUtcDateStart(checkedAt)) / millisecondsPerDay));
}
function toUtcDateStart(date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
function readN8nVersionLabel(value) {
    const packageInfo = value.packageInfo;
    if (isRecord(packageInfo) && typeof packageInfo.version === "string" && packageInfo.version.trim() !== "") {
        return `n8n v${packageInfo.version}`;
    }
    const selection = value.selection;
    if (isRecord(selection) && typeof selection.packageVersion === "string" && selection.packageVersion.trim() !== "") {
        return `n8n v${selection.packageVersion}`;
    }
    const versions = value.versions;
    if (Array.isArray(versions)) {
        const packageVersions = versions
            .map((version) => isRecord(version) && typeof version.packageVersion === "string" ? version.packageVersion : undefined)
            .filter((version) => version !== undefined);
        if (packageVersions.length > 0) {
            return `n8n v${packageVersions.join("+")}`;
        }
    }
    return "n8n version unknown";
}
function readLastVerifiedState(ageDays) {
    if (ageDays <= 30) {
        return "current";
    }
    if (ageDays <= 90) {
        return "recheck-recommended";
    }
    return "stale";
}
function lastVerifiedMessage(ageDays, state) {
    const ageText = `${ageDays} ${ageDays === 1 ? "day" : "days"} ago`;
    if (state === "recheck-recommended") {
        return `verified ${ageText} - recheck recommended`;
    }
    if (state === "stale") {
        return `verified ${ageText} - stale, unverified`;
    }
    return `verified ${ageText}`;
}
function renderBadge(badge, format) {
    if (format === "json") {
        return JSON.stringify(badge, null, 2);
    }
    if (format === "svg") {
        return renderSvgBadge(badge);
    }
    const label = shieldsEscape(badge.label);
    const message = shieldsEscape(badge.message);
    return `![${badge.label}: ${badge.message}](https://img.shields.io/badge/${label}-${message}-${badge.color})`;
}
function renderSvgBadge(badge) {
    const labelWidth = textWidth(badge.label);
    const messageWidth = textWidth(badge.message);
    const width = labelWidth + messageWidth;
    const colorByBadgeColor = {
        brightgreen: "#4c1",
        yellow: "#dfb317",
        red: "#e05d44"
    };
    const color = colorByBadgeColor[badge.color];
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(`${badge.label}: ${badge.message}`)}">`,
        `<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>`,
        `<clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>`,
        `<g clip-path="url(#r)"><rect width="${labelWidth}" height="20" fill="#555"/><rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/><rect width="${width}" height="20" fill="url(#s)"/></g>`,
        `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">`,
        `<text x="${Math.floor(labelWidth / 2)}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(badge.label)}</text><text x="${Math.floor(labelWidth / 2)}" y="14">${escapeXml(badge.label)}</text>`,
        `<text x="${labelWidth + Math.floor(messageWidth / 2)}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(badge.message)}</text><text x="${labelWidth + Math.floor(messageWidth / 2)}" y="14">${escapeXml(badge.message)}</text>`,
        `</g></svg>`
    ].join("");
}
function textWidth(value) {
    return Math.max(44, value.length * 7 + 10);
}
function shieldsEscape(value) {
    return encodeURIComponent(value.replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_"));
}
function escapeXml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function createLoadedSchemaSource(snapshot) {
    return {
        kind: snapshot.source,
        load() {
            return Promise.resolve(snapshot);
        }
    };
}
async function mapConcurrent(values, concurrency, mapper) {
    const results = new Array(values.length);
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < values.length) {
            const index = nextIndex;
            nextIndex += 1;
            const value = values[index];
            if (value !== undefined)
                results[index] = await mapper(value);
        }
    };
    await Promise.all(Array.from({ length: Math.min(Math.max(concurrency, 1), values.length) }, () => worker()));
    return results;
}
function summarizeBatch(results) {
    const summary = {
        totalFiles: results.length,
        workflows: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0,
        errors: 0
    };
    for (const result of results) {
        if (result.status === "passed") {
            summary.passed += 1;
            summary.workflows += 1;
            summary.warnings += countWarnings(result.issues);
        }
        else if (result.status === "failed") {
            summary.failed += 1;
            summary.workflows += 1;
            summary.warnings += countWarnings(result.issues);
        }
        else if (result.status === "skipped") {
            summary.skipped += 1;
        }
        else {
            summary.errors += 1;
        }
    }
    return summary;
}
function summarizeMatrixVersions(versions) {
    return versions.reduce((aggregate, version) => ({
        totalFiles: aggregate.totalFiles + version.summary.totalFiles,
        workflows: aggregate.workflows + version.summary.workflows,
        passed: aggregate.passed + version.summary.passed,
        failed: aggregate.failed + version.summary.failed,
        warnings: aggregate.warnings + version.summary.warnings,
        skipped: aggregate.skipped + version.summary.skipped,
        errors: aggregate.errors + version.summary.errors
    }), {
        totalFiles: 0,
        workflows: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0,
        errors: 0
    });
}
function summarizeSingleValidation(validation) {
    return {
        totalFiles: 1,
        workflows: 1,
        passed: validation.ok ? 1 : 0,
        failed: validation.ok ? 0 : 1,
        warnings: countWarnings(validation.issues),
        skipped: 0,
        errors: 0
    };
}
function summarizeInputError() {
    return {
        totalFiles: 1,
        workflows: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0,
        errors: 1
    };
}
function countWarnings(issues) {
    return (issues ?? []).filter((issue) => issue.severity === "warning").length;
}
function formatSummary(summary) {
    return `Summary: ${formatSummaryCounts(summary)}`;
}
function formatSummaryCounts(summary) {
    return `${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings, ${summary.skipped} skipped, ${summary.errors} errors`;
}
function createBatchJsonResult(result) {
    return {
        ok: result.ok,
        checkedAt: result.checkedAt,
        source: result.source,
        ...(result.packageInfo === undefined ? {} : { packageInfo: result.packageInfo }),
        ...(result.selection === undefined ? {} : { selection: result.selection }),
        results: result.results,
        summary: result.summary
    };
}
function createSchemaSource(source, packageVersion) {
    if (source === "local-placeholder") {
        return createLocalPlaceholderSchemaSource();
    }
    return createBundledN8nPackageSchemaSource({ packageVersion });
}
function printHelp() {
    console.log([
        "Usage:",
        "  n8n-lint --version",
        "  n8n-lint check <workflow.json|directory|glob> [...inputs] [--source bundled-n8n-package|local-placeholder] [--n8n-version 2.29.6|2.30.0|matrix] [--json|--format github]",
        "  n8n-lint repair <workflow.json> [--source bundled-n8n-package|local-placeholder] [--n8n-version 2.29.6|2.30.0] [--output fix.patch] [--apply --confirm] [--json]",
        "  n8n-lint badge <check-result.json> [--kind status|last-verified] [--as-of YYYY-MM-DD] [--format markdown|json|svg] [--label n8n-lint] [--output badge.svg]"
    ].join("\n"));
}
//# sourceMappingURL=bin.js.map