#!/usr/bin/env node
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  bundledN8nPackageVersions,
  createBundledN8nPackageSchemaSource,
  createLocalPlaceholderSchemaSource,
  defaultBundledN8nPackageVersion,
  isBundledN8nPackageVersion,
  validateWorkflow,
  type BundledN8nPackageSelection,
  type BundledN8nPackageVersion,
  type SchemaPackageInfo,
  type SchemaSource,
  type SchemaSourceKind,
  type ValidationIssue
} from "@n8nproof/core";

type CliSchemaSource = Extract<SchemaSourceKind, "bundled-n8n-package" | "local-placeholder">;
type BatchStatus = "passed" | "failed" | "skipped" | "error";
type BadgeFormat = "markdown" | "json" | "svg";
type OutputFormat = BadgeFormat | "github";
type CheckFormat = "human" | "json" | "github";
type N8nVersionSelection = BundledN8nPackageVersion | "matrix";

interface ParsedArgs {
  command?: string;
  inputs: string[];
  source: CliSchemaSource;
  json: boolean;
  help: boolean;
  format: OutputFormat;
  formatWasSet: boolean;
  outputPath?: string;
  label: string;
  n8nVersion: N8nVersionSelection;
  apply: boolean;
  confirm: boolean;
}

interface BatchFileResult {
  filePath: string;
  status: BatchStatus;
  ok: boolean;
  issues?: ValidationIssue[];
  reason?: string;
  error?: string;
}

interface BatchSummary {
  totalFiles: number;
  workflows: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
}

interface BatchRunResult {
  ok: boolean;
  checkedAt: string;
  source: SchemaSourceKind;
  packageInfo?: SchemaPackageInfo;
  selection?: BundledN8nPackageSelection;
  summary: BatchSummary;
  results: BatchFileResult[];
}

interface MatrixRunResult {
  ok: boolean;
  checkedAt: string;
  source: "bundled-n8n-package";
  versions: Array<{
    packageVersion: BundledN8nPackageVersion;
    ok: boolean;
    packageInfo?: SchemaPackageInfo;
    selection?: BundledN8nPackageSelection;
    summary: BatchSummary;
    results: BatchFileResult[];
  }>;
  differences: MatrixDifference[];
}

interface MatrixDifference {
  filePath: string;
  statusByVersion: Record<string, BatchStatus | "missing">;
  errorSignaturesByVersion: Record<string, string[]>;
}

interface RepairChange {
  code: "remove_unknown_parameter";
  path: string;
  message: string;
}

let parsed: ParsedArgs;
try {
  parsed = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printHelp();
  process.exit(2);
}

if (parsed.help) {
  printHelp();
  process.exitCode = 0;
} else if (parsed.command === "check" && parsed.inputs.length > 0) {
  const checkFormat = readCheckFormat(parsed);
  if (checkFormat === undefined) {
    process.exitCode = 2;
  } else if (parsed.n8nVersion === "matrix") {
    if (parsed.source !== "bundled-n8n-package") {
      console.error("--n8n-version matrix requires --source bundled-n8n-package.");
      process.exitCode = 2;
    } else {
      const result = await runMatrix(parsed.inputs);
      printMatrixResult(result, checkFormat);
      process.exitCode = result.ok ? 0 : 1;
    }
  } else if (parsed.source !== "bundled-n8n-package" && parsed.n8nVersion !== defaultBundledN8nPackageVersion) {
    console.error("--n8n-version only applies to --source bundled-n8n-package.");
    process.exitCode = 2;
  } else {
    const schemaSource = createSchemaSource(parsed.source, parsed.n8nVersion);
    const shouldUseBatch = parsed.inputs.length > 1 || (await inputRequiresBatch(parsed.inputs[0] as string));

    if (shouldUseBatch) {
      try {
        const result = await runBatch(parsed.inputs, schemaSource);
        printBatchResult(result, checkFormat);
        process.exitCode = result.ok ? 0 : 1;
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    } else {
      const filePath = parsed.inputs[0] as string;
      process.exitCode = await runSingleFile(filePath, schemaSource, checkFormat);
    }
  }
} else if (parsed.command === "repair" && parsed.inputs.length === 1) {
  if (parsed.formatWasSet) {
    console.error("repair does not support --format; use --json for machine-readable output.");
    process.exitCode = 2;
  } else if (parsed.n8nVersion === "matrix") {
    console.error("repair does not support --n8n-version matrix; choose one pinned version.");
    process.exitCode = 2;
  } else {
    const schemaSource = createSchemaSource(parsed.source, parsed.n8nVersion);
    process.exitCode = await runRepair(parsed.inputs[0] as string, schemaSource, parsed);
  }
} else if (parsed.command === "badge" && parsed.inputs.length === 1) {
  if (parsed.format === "github") {
    console.error("badge --format must be markdown, json, or svg.");
    process.exitCode = 2;
  } else {
    process.exitCode = await runBadge(parsed.inputs[0] as string, parsed);
  }
} else {
  printHelp();
  process.exitCode = 2;
}

function parseArgs(args: string[]): ParsedArgs {
  const parsedArgs: ParsedArgs = {
    inputs: [],
    source: "bundled-n8n-package",
    json: false,
    help: false,
    format: "markdown",
    formatWasSet: false,
    label: "n8n-lint",
    n8nVersion: defaultBundledN8nPackageVersion,
    apply: false,
    confirm: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      parsedArgs.help = true;
      continue;
    }

    if (arg === "--json") {
      parsedArgs.json = true;
      if (parsedArgs.command === "badge") {
        parsedArgs.format = "json";
      }
      continue;
    }

    if (arg === "--apply") {
      parsedArgs.apply = true;
      continue;
    }

    if (arg === "--confirm") {
      parsedArgs.confirm = true;
      continue;
    }

    if (arg === "--n8n-version") {
      const n8nVersion = args[index + 1];
      if (n8nVersion === undefined) {
        throw new Error("--n8n-version requires a pinned version or matrix.");
      }

      parsedArgs.n8nVersion = parseN8nVersionSelection(n8nVersion);
      index += 1;
      continue;
    }

    if (arg.startsWith("--n8n-version=")) {
      parsedArgs.n8nVersion = parseN8nVersionSelection(arg.slice("--n8n-version=".length));
      continue;
    }

    if (arg === "--format") {
      const format = args[index + 1];
      if (format !== "markdown" && format !== "json" && format !== "svg" && format !== "github") {
        throw new Error("--format must be markdown, json, svg, or github.");
      }

      parsedArgs.format = format;
      parsedArgs.formatWasSet = true;
      index += 1;
      continue;
    }

    if (arg.startsWith("--format=")) {
      const format = arg.slice("--format=".length);
      if (format !== "markdown" && format !== "json" && format !== "svg" && format !== "github") {
        throw new Error("--format must be markdown, json, svg, or github.");
      }

      parsedArgs.format = format;
      parsedArgs.formatWasSet = true;
      continue;
    }

    if (arg === "--output") {
      const outputPath = args[index + 1];
      if (outputPath === undefined || outputPath.trim() === "") {
        throw new Error("--output requires a file path.");
      }

      parsedArgs.outputPath = outputPath;
      index += 1;
      continue;
    }

    if (arg.startsWith("--output=")) {
      const outputPath = arg.slice("--output=".length);
      if (outputPath.trim() === "") {
        throw new Error("--output requires a file path.");
      }

      parsedArgs.outputPath = outputPath;
      continue;
    }

    if (arg === "--label") {
      const label = args[index + 1];
      if (label === undefined || label.trim() === "") {
        throw new Error("--label requires a non-empty value.");
      }

      parsedArgs.label = label;
      index += 1;
      continue;
    }

    if (arg.startsWith("--label=")) {
      const label = arg.slice("--label=".length);
      if (label.trim() === "") {
        throw new Error("--label requires a non-empty value.");
      }

      parsedArgs.label = label;
      continue;
    }

    if (arg === "--source") {
      const source = args[index + 1];
      if (source !== "bundled-n8n-package" && source !== "local-placeholder") {
        throw new Error("--source must be bundled-n8n-package or local-placeholder.");
      }

      parsedArgs.source = source;
      index += 1;
      continue;
    }

    if (arg.startsWith("--source=")) {
      const source = arg.slice("--source=".length);
      if (source !== "bundled-n8n-package" && source !== "local-placeholder") {
        throw new Error("--source must be bundled-n8n-package or local-placeholder.");
      }

      parsedArgs.source = source;
      continue;
    }

    if (arg.startsWith("-") && parsedArgs.command !== undefined) {
      throw new Error(`Unexpected option: ${arg}`);
    }

    if (parsedArgs.command === undefined) {
      parsedArgs.command = arg;
      continue;
    }

    parsedArgs.inputs.push(arg);
  }

  return parsedArgs;
}

function readCheckFormat(options: ParsedArgs): CheckFormat | undefined {
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

function parseN8nVersionSelection(value: string): N8nVersionSelection {
  if (value === "matrix") {
    return value;
  }

  if (isBundledN8nPackageVersion(value)) {
    return value;
  }

  throw new Error(`--n8n-version must be one of ${bundledN8nPackageVersions.join(", ")} or matrix.`);
}

async function inputRequiresBatch(input: string): Promise<boolean> {
  if (hasGlobCharacters(input)) {
    return true;
  }

  try {
    return (await stat(input)).isDirectory();
  } catch {
    return false;
  }
}

async function runSingleFile(filePath: string, schemaSource: SchemaSource, format: CheckFormat): Promise<number> {
  try {
    const raw = await readFile(filePath, "utf8");
    const workflow = JSON.parse(raw) as unknown;
    const validation = await validateWorkflow(workflow, schemaSource);

    if (format === "json") {
      console.log(JSON.stringify({ filePath, ...validation }, null, 2));
      return validation.ok ? 0 : 1;
    }

    if (format === "github") {
      printGithubValidationResult(filePath, validation.issues);
      console.log(`Summary: ${validation.ok ? 1 : 0} passed, ${validation.ok ? 0 : 1} failed, 0 skipped, 0 errors`);
      return validation.ok ? 0 : 1;
    }

    if (validation.ok) {
      console.log(`PASS ${filePath}`);
      console.log(`Schema source: ${validation.source}`);
      for (const issue of validation.issues.filter((item) => item.severity === "warning")) {
        console.log(`WARN ${issue.code}: ${issue.message}`);
      }
      return 0;
    }

    console.error(`FAIL ${filePath}`);
    console.error(`Schema source: ${validation.source}`);
    for (const issue of validation.issues) {
      console.error(`${issue.severity.toUpperCase()} ${issue.code} ${issue.path}: ${issue.message}`);
    }
    return 1;
  } catch (error) {
    if (format === "github") {
      printGithubAnnotation(
        "error",
        displayPath(filePath),
        "input_error",
        error instanceof Error ? error.message : String(error)
      );
      console.log("Summary: 0 passed, 0 failed, 0 skipped, 1 errors");
      return 1;
    }

    console.error(`FAIL ${filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function runBadge(resultPath: string, options: ParsedArgs): Promise<number> {
  try {
    const raw = await readFile(resultPath, "utf8");
    const parsedResult = JSON.parse(raw) as unknown;
    const badge = createBadgeModel(parsedResult, options.label, displayPath(resultPath));
    const rendered = renderBadge(badge, readBadgeFormat(options.format));

    if (options.outputPath !== undefined) {
      await writeFile(options.outputPath, `${rendered}\n`, "utf8");
    } else {
      console.log(rendered);
    }

    return 0;
  } catch (error) {
    console.error(`FAIL ${resultPath}`);
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function readBadgeFormat(format: OutputFormat): BadgeFormat {
  if (format === "github") {
    throw new Error("badge --format must be markdown, json, or svg.");
  }

  return format;
}

async function runRepair(filePath: string, schemaSource: SchemaSource, options: ParsedArgs): Promise<number> {
  if (options.apply && !options.confirm) {
    console.error("repair --apply requires --confirm.");
    return 2;
  }

  try {
    const raw = await readFile(filePath, "utf8");
    const workflow = JSON.parse(raw) as unknown;
    const validation = await validateWorkflow(workflow, schemaSource);
    const repair = buildRepair(workflow, validation.issues);

    if (repair.changes.length === 0) {
      const message = validation.ok ? "No repair needed." : "No repairable issues found.";
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              ok: validation.ok,
              filePath,
              applied: false,
              changes: [],
              message,
              issues: validation.issues.filter((issue) => issue.severity === "error")
            },
            null,
            2
          )
        );
      } else if (validation.ok) {
        console.log(`PASS ${filePath}`);
        console.log(message);
      } else {
        console.error(`FAIL ${filePath}`);
        console.error(message);
      }

      return validation.ok ? 0 : 1;
    }

    const repairedText = `${JSON.stringify(repair.workflow, null, 2)}\n`;
    const repairedValidation = await validateWorkflow(repair.workflow, schemaSource);
    const patch = createWholeFilePatch(displayPath(filePath), raw, repairedText);

    if (options.apply) {
      await writeFile(filePath, repairedText, "utf8");
    } else if (options.outputPath !== undefined) {
      await writeFile(options.outputPath, patch, "utf8");
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ok: repairedValidation.ok,
            filePath,
            applied: options.apply,
            outputPath: options.apply ? undefined : options.outputPath,
            changes: repair.changes,
            remainingIssues: repairedValidation.issues.filter((issue) => issue.severity === "error")
          },
          null,
          2
        )
      );
    } else if (options.apply) {
      console.log(`APPLIED ${filePath}`);
      console.log(`Changes: ${repair.changes.length}`);
    } else if (options.outputPath !== undefined) {
      console.log(`PATCH ${options.outputPath}`);
      console.log(`Changes: ${repair.changes.length}`);
    } else {
      console.log(patch.trimEnd());
    }

    return repairedValidation.ok ? 0 : 1;
  } catch (error) {
    console.error(`FAIL ${filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function buildRepair(workflow: unknown, issues: readonly ValidationIssue[]): {
  workflow: unknown;
  changes: RepairChange[];
} {
  const repaired = cloneJson(workflow);
  const changes: RepairChange[] = [];

  for (const issue of issues) {
    if (issue.severity !== "error" || issue.code !== "workflow.node_parameter_unknown") {
      continue;
    }

    const target = parseNodeParameterPath(issue.path);
    if (target === undefined || !isRecord(repaired) || !Array.isArray(repaired.nodes)) {
      continue;
    }

    const node = repaired.nodes[target.nodeIndex];
    if (!isRecord(node) || !isRecord(node.parameters) || !(target.parameterName in node.parameters)) {
      continue;
    }

    delete node.parameters[target.parameterName];
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

function parseNodeParameterPath(pathExpression: string): { nodeIndex: number; parameterName: string } | undefined {
  const match = /^\$\.nodes\[(\d+)\]\.parameters\.([A-Za-z0-9_$-]+)$/.exec(pathExpression);
  if (match === null) {
    return undefined;
  }

  return {
    nodeIndex: Number.parseInt(match[1] as string, 10),
    parameterName: match[2] as string
  };
}

function cloneJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function createWholeFilePatch(filePath: string, beforeText: string, afterText: string): string {
  const beforeLines = splitPatchLines(beforeText);
  const afterLines = splitPatchLines(afterText);
  return [
    `--- ${filePath}`,
    `+++ ${filePath}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
    ...beforeLines.map((line) => `-${line}`),
    ...afterLines.map((line) => `+${line}`)
  ].join("\n") + "\n";
}

function splitPatchLines(value: string): string[] {
  const normalized = value.replace(/\r\n/g, "\n");
  const withoutFinalNewline = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  return withoutFinalNewline.length === 0 ? [] : withoutFinalNewline.split("\n");
}

async function runBatch(
  inputs: string[],
  schemaSource: SchemaSource
): Promise<BatchRunResult> {
  const resolved = await resolveBatchInputs(inputs);
  const sourceSnapshot = await schemaSource.load();
  const results: BatchFileResult[] = [];

  for (const inputError of resolved.errors) {
    results.push({
      filePath: displayPath(inputError.filePath),
      status: "error",
      ok: false,
      error: inputError.error
    });
  }

  for (const filePath of resolved.files) {
    results.push(await checkBatchFile(filePath, createLoadedSchemaSource(sourceSnapshot)));
  }

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

async function checkBatchFile(filePath: string, schemaSource: SchemaSource): Promise<BatchFileResult> {
  const resultPath = displayPath(filePath);

  try {
    const raw = await readFile(filePath, "utf8");
    const workflow = JSON.parse(raw) as unknown;

    if (!isWorkflowCandidate(workflow)) {
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
  } catch (error) {
    return {
      filePath: resultPath,
      status: "error",
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function printBatchResult(result: BatchRunResult, format: CheckFormat): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (format === "github") {
    printGithubBatchResult(result);
    return;
  }

  for (const fileResult of result.results) {
    if (fileResult.status === "passed") {
      console.log(`PASS ${fileResult.filePath}`);
      continue;
    }

    if (fileResult.status === "skipped") {
      console.log(`SKIP ${fileResult.filePath}`);
      continue;
    }

    if (fileResult.status === "error") {
      console.log(`ERROR ${fileResult.filePath}`);
      console.log(`  ${fileResult.error ?? "Unknown read or parse error."}`);
      continue;
    }

    console.log(`FAIL ${fileResult.filePath}`);
    for (const issue of (fileResult.issues ?? []).filter((item) => item.severity === "error")) {
      console.log(`  ERROR ${issue.code} ${issue.path}: ${issue.message}`);
    }
  }

  const { passed, failed, skipped, errors } = result.summary;
  console.log(`Summary: ${passed} passed, ${failed} failed, ${skipped} skipped, ${errors} errors`);
}

async function runMatrix(inputs: string[]): Promise<MatrixRunResult> {
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
    differences: collectMatrixDifferences(versions)
  };
}

function printMatrixResult(result: MatrixRunResult, format: CheckFormat): void {
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
    console.log(`MATRIX ${packageLabel}: ${version.ok ? "PASS" : "FAIL"}`);
    const { passed, failed, skipped, errors } = version.summary;
    console.log(`  Summary: ${passed} passed, ${failed} failed, ${skipped} skipped, ${errors} errors`);
  }

  for (const difference of result.differences) {
    const statusSummary = Object.entries(difference.statusByVersion)
      .map(([version, status]) => `${version}=${status}`)
      .join(", ");
    console.log(`DIFF ${difference.filePath}: ${statusSummary}`);
  }

  console.log(
    `Matrix summary: ${result.versions.length} versions, ${result.differences.length} compatibility differences`
  );
}

function collectMatrixDifferences(versions: MatrixRunResult["versions"]): MatrixDifference[] {
  const filePaths = new Set<string>();
  for (const version of versions) {
    for (const fileResult of version.results) {
      filePaths.add(fileResult.filePath);
    }
  }

  const differences: MatrixDifference[] = [];
  for (const filePath of [...filePaths].sort((left, right) => left.localeCompare(right))) {
    const statusByVersion: Record<string, BatchStatus | "missing"> = {};
    const errorSignaturesByVersion: Record<string, string[]> = {};

    for (const version of versions) {
      const fileResult = version.results.find((candidate) => candidate.filePath === filePath);
      statusByVersion[version.packageVersion] = fileResult?.status ?? "missing";
      errorSignaturesByVersion[version.packageVersion] = readErrorSignatures(fileResult);
    }

    const statusSignatures = new Set(Object.values(statusByVersion));
    const errorSignatures = new Set(
      Object.values(errorSignaturesByVersion).map((signatures) => signatures.join("|"))
    );
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

function readErrorSignatures(fileResult: BatchFileResult | undefined): string[] {
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

function printGithubValidationResult(filePath: string, issues: readonly ValidationIssue[], titlePrefix = ""): void {
  for (const issue of issues) {
    printGithubAnnotation(
      issue.severity === "error" ? "error" : "warning",
      displayPath(filePath),
      `${titlePrefix}${issue.code}`,
      `${issue.message} (${issue.path})`
    );
  }
}

function printGithubBatchResult(result: BatchRunResult): void {
  for (const fileResult of result.results) {
    if (fileResult.status === "skipped") {
      printGithubAnnotation(
        "notice",
        fileResult.filePath,
        "workflow.skipped",
        `Skipped non-workflow JSON file: ${fileResult.reason ?? "not an n8n workflow"}`
      );
      continue;
    }

    if (fileResult.status === "error") {
      printGithubAnnotation("error", fileResult.filePath, "input_error", fileResult.error ?? "Unknown read or parse error.");
      continue;
    }

    printGithubValidationResult(fileResult.filePath, fileResult.issues ?? []);
  }

  const { passed, failed, skipped, errors } = result.summary;
  console.log(`Summary: ${passed} passed, ${failed} failed, ${skipped} skipped, ${errors} errors`);
}

function printGithubMatrixResult(result: MatrixRunResult): void {
  for (const version of result.versions) {
    const packageLabel = version.packageInfo
      ? `${version.packageInfo.name}@${version.packageInfo.version}`
      : `n8n-nodes-base@${version.packageVersion}`;
    console.log(`MATRIX ${packageLabel}: ${version.ok ? "PASS" : "FAIL"}`);

    for (const fileResult of version.results) {
      const titlePrefix = `${version.packageVersion}:`;
      if (fileResult.status === "skipped") {
        printGithubAnnotation(
          "notice",
          fileResult.filePath,
          `${titlePrefix}workflow.skipped`,
          `Skipped non-workflow JSON file: ${fileResult.reason ?? "not an n8n workflow"}`
        );
        continue;
      }

      if (fileResult.status === "error") {
        printGithubAnnotation(
          "error",
          fileResult.filePath,
          `${titlePrefix}input_error`,
          fileResult.error ?? "Unknown read or parse error."
        );
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

  console.log(
    `Matrix summary: ${result.versions.length} versions, ${result.differences.length} compatibility differences`
  );
}

function printGithubAnnotation(
  kind: "error" | "warning" | "notice",
  filePath: string,
  title: string,
  message: string
): void {
  console.log(
    `::${kind} file=${escapeGithubProperty(filePath)},title=${escapeGithubProperty(title)}::${escapeGithubData(message)}`
  );
}

function escapeGithubProperty(value: string): string {
  return escapeGithubData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function escapeGithubData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

async function resolveBatchInputs(inputs: string[]): Promise<{
  files: string[];
  errors: Array<{ filePath: string; error: string }>;
}> {
  const files = new Set<string>();
  const errors: Array<{ filePath: string; error: string }> = [];

  for (const input of inputs) {
    try {
      const resolvedFiles = hasGlobCharacters(input)
        ? await resolveGlobInput(input)
        : await resolveFileOrDirectoryInput(input);

      if (resolvedFiles.length === 0) {
        errors.push({ filePath: input, error: "No files matched input." });
        continue;
      }

      for (const file of resolvedFiles) {
        files.add(path.resolve(file));
      }
    } catch (error) {
      errors.push({
        filePath: input,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    files: [...files].sort((left, right) => displayPath(left).localeCompare(displayPath(right))),
    errors
  };
}

async function resolveFileOrDirectoryInput(input: string): Promise<string[]> {
  const inputStat = await stat(input);
  if (inputStat.isDirectory()) {
    return collectJsonFiles(input);
  }

  if (inputStat.isFile()) {
    return [input];
  }

  return [];
}

async function resolveGlobInput(pattern: string): Promise<string[]> {
  const baseDirectory = getGlobBase(pattern);
  const candidates = await collectFiles(baseDirectory);
  const matcher = globToRegExp(normalizePathForMatch(pattern));
  const isAbsolutePattern = path.isAbsolute(pattern);

  return candidates.filter((candidate) => {
    const candidateForMatch = normalizePathForMatch(
      isAbsolutePattern ? path.resolve(candidate) : path.relative(process.cwd(), candidate)
    );
    return matcher.test(candidateForMatch);
  });
}

async function collectJsonFiles(directory: string): Promise<string[]> {
  const files = await collectFiles(directory);
  return files.filter((file) => file.toLowerCase().endsWith(".json"));
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function getGlobBase(pattern: string): string {
  const normalized = normalizePathForMatch(pattern);
  const wildcardIndex = normalized.search(/[*?]/);
  if (wildcardIndex === -1) {
    return path.dirname(pattern);
  }

  const fixedPrefix = normalized.slice(0, wildcardIndex);
  const lastSlash = fixedPrefix.lastIndexOf("/");
  if (lastSlash === -1) {
    return ".";
  }

  const base = fixedPrefix.slice(0, lastSlash);
  return base === "" ? path.parse(process.cwd()).root : path.normalize(base);
}

function globToRegExp(pattern: string): RegExp {
  let regex = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] as string;
    const next = pattern[index + 1];

    if (char === "*") {
      if (next === "*") {
        const afterNext = pattern[index + 2];
        if (afterNext === "/") {
          regex += "(?:.*/)?";
          index += 2;
        } else {
          regex += ".*";
          index += 1;
        }
      } else {
        regex += "[^/]*";
      }
      continue;
    }

    if (char === "?") {
      regex += "[^/]";
      continue;
    }

    regex += escapeRegExp(char);
  }

  regex += "$";
  return new RegExp(regex);
}

function hasGlobCharacters(input: string): boolean {
  return /[*?]/.test(input);
}

function normalizePathForMatch(value: string): string {
  return value.replace(/\\/g, "/");
}

function displayPath(filePath: string): string {
  return normalizePathForMatch(path.relative(process.cwd(), path.resolve(filePath)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
}

function isWorkflowCandidate(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as Record<string, unknown>).nodes)
  );
}

interface BadgeModel {
  label: string;
  message: string;
  color: "brightgreen" | "red";
  ok: boolean;
  sourceFile: string;
  summary?: BatchSummary;
}

function createBadgeModel(value: unknown, label: string, sourceFile: string): BadgeModel {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    throw new Error("Badge input must be a JSON result emitted by n8n-lint check --json.");
  }

  const summary = readOptionalBatchSummary(value.summary);
  const ok = value.ok;
  const message = ok ? passingBadgeMessage(summary) : failingBadgeMessage(summary);

  return {
    label,
    message,
    color: ok ? "brightgreen" : "red",
    ok,
    sourceFile,
    ...(summary === undefined ? {} : { summary })
  };
}

function readOptionalBatchSummary(value: unknown): BatchSummary | undefined {
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
    skipped: readNonNegativeInteger(value.skipped, "summary.skipped"),
    errors: readNonNegativeInteger(value.errors, "summary.errors")
  };
}

function readNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Badge input ${label} must be a non-negative integer.`);
  }

  return value;
}

function passingBadgeMessage(summary: BatchSummary | undefined): string {
  if (summary === undefined) {
    return "passing";
  }

  return `${summary.passed} passing`;
}

function failingBadgeMessage(summary: BatchSummary | undefined): string {
  if (summary === undefined) {
    return "failing";
  }

  return `${summary.failed + summary.errors} failing`;
}

function renderBadge(badge: BadgeModel, format: BadgeFormat): string {
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

function renderSvgBadge(badge: BadgeModel): string {
  const labelWidth = textWidth(badge.label);
  const messageWidth = textWidth(badge.message);
  const width = labelWidth + messageWidth;
  const color = badge.color === "brightgreen" ? "#4c1" : "#e05d44";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(
      `${badge.label}: ${badge.message}`
    )}">`,
    `<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>`,
    `<clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>`,
    `<g clip-path="url(#r)"><rect width="${labelWidth}" height="20" fill="#555"/><rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/><rect width="${width}" height="20" fill="url(#s)"/></g>`,
    `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">`,
    `<text x="${Math.floor(labelWidth / 2)}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(
      badge.label
    )}</text><text x="${Math.floor(labelWidth / 2)}" y="14">${escapeXml(badge.label)}</text>`,
    `<text x="${labelWidth + Math.floor(messageWidth / 2)}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(
      badge.message
    )}</text><text x="${labelWidth + Math.floor(messageWidth / 2)}" y="14">${escapeXml(badge.message)}</text>`,
    `</g></svg>`
  ].join("");
}

function textWidth(value: string): number {
  return Math.max(44, value.length * 7 + 10);
}

function shieldsEscape(value: string): string {
  return encodeURIComponent(value.replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_"));
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createLoadedSchemaSource(snapshot: Awaited<ReturnType<SchemaSource["load"]>>): SchemaSource {
  return {
    kind: snapshot.source,
    async load() {
      return snapshot;
    }
  };
}

function summarizeBatch(results: BatchFileResult[]): BatchSummary {
  const summary: BatchSummary = {
    totalFiles: results.length,
    workflows: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: 0
  };

  for (const result of results) {
    if (result.status === "passed") {
      summary.passed += 1;
      summary.workflows += 1;
    } else if (result.status === "failed") {
      summary.failed += 1;
      summary.workflows += 1;
    } else if (result.status === "skipped") {
      summary.skipped += 1;
    } else {
      summary.errors += 1;
    }
  }

  return summary;
}

function createSchemaSource(source: CliSchemaSource, packageVersion: BundledN8nPackageVersion): SchemaSource {
  if (source === "local-placeholder") {
    return createLocalPlaceholderSchemaSource();
  }

  return createBundledN8nPackageSchemaSource({ packageVersion });
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  n8n-lint check <workflow.json|directory|glob> [...inputs] [--source bundled-n8n-package|local-placeholder] [--n8n-version 2.29.6|2.30.0|matrix] [--json|--format github]",
      "  n8n-lint repair <workflow.json> [--source bundled-n8n-package|local-placeholder] [--n8n-version 2.29.6|2.30.0] [--output fix.patch] [--apply --confirm] [--json]",
      "  n8n-lint badge <check-result.json> [--format markdown|json|svg] [--label n8n-lint] [--output badge.svg]"
    ].join("\n")
  );
}
