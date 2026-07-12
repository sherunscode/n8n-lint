import { bundledN8nPackageVersions, defaultBundledN8nPackageVersion, isBundledN8nPackageVersion } from "@n8nproof/core";
export function parseArgs(args) {
    const parsed = {
        inputs: [],
        source: "bundled-n8n-package",
        sourceWasSet: false,
        json: false,
        jsonWasSet: false,
        help: false,
        version: false,
        format: "markdown",
        formatWasSet: false,
        outputWasSet: false,
        label: "n8n-lint",
        labelWasSet: false,
        badgeKind: "status",
        kindWasSet: false,
        asOfWasSet: false,
        n8nVersion: defaultBundledN8nPackageVersion,
        n8nVersionWasSet: false,
        apply: false,
        applyWasSet: false,
        confirm: false,
        confirmWasSet: false
    };
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === undefined)
            continue;
        if (arg === "--help" || arg === "-h") {
            parsed.help = true;
            continue;
        }
        if (arg === "--version" || arg === "-v") {
            parsed.version = true;
            continue;
        }
        if (arg === "--json") {
            parsed.json = true;
            parsed.jsonWasSet = true;
            continue;
        }
        if (arg === "--apply") {
            parsed.apply = true;
            parsed.applyWasSet = true;
            continue;
        }
        if (arg === "--confirm") {
            parsed.confirm = true;
            parsed.confirmWasSet = true;
            continue;
        }
        if (arg === "--n8n-version" || arg.startsWith("--n8n-version=")) {
            const value = readOptionValue(args, index, arg, "--n8n-version");
            parsed.n8nVersion = parseN8nVersionSelection(value.value);
            parsed.n8nVersionWasSet = true;
            index = value.nextIndex;
            continue;
        }
        if (arg === "--format" || arg.startsWith("--format=")) {
            const value = readOptionValue(args, index, arg, "--format");
            if (!isOutputFormat(value.value))
                throw new Error("--format must be markdown, json, svg, or github.");
            parsed.format = value.value;
            parsed.formatWasSet = true;
            index = value.nextIndex;
            continue;
        }
        if (arg === "--output" || arg.startsWith("--output=")) {
            const value = readOptionValue(args, index, arg, "--output");
            parsed.outputPath = requireNonEmpty(value.value, "--output requires a file path.");
            parsed.outputWasSet = true;
            index = value.nextIndex;
            continue;
        }
        if (arg === "--label" || arg.startsWith("--label=")) {
            const value = readOptionValue(args, index, arg, "--label");
            parsed.label = requireNonEmpty(value.value, "--label requires a non-empty value.");
            parsed.labelWasSet = true;
            index = value.nextIndex;
            continue;
        }
        if (arg === "--kind" || arg.startsWith("--kind=")) {
            const value = readOptionValue(args, index, arg, "--kind");
            parsed.badgeKind = parseBadgeKind(value.value);
            parsed.kindWasSet = true;
            index = value.nextIndex;
            continue;
        }
        if (arg === "--as-of" || arg.startsWith("--as-of=")) {
            const value = readOptionValue(args, index, arg, "--as-of");
            parsed.asOfDate = requireNonEmpty(value.value, "--as-of requires a YYYY-MM-DD date.");
            parsed.asOfWasSet = true;
            index = value.nextIndex;
            continue;
        }
        if (arg === "--source" || arg.startsWith("--source=")) {
            const value = readOptionValue(args, index, arg, "--source");
            if (value.value !== "bundled-n8n-package" && value.value !== "local-placeholder") {
                throw new Error("--source must be bundled-n8n-package or local-placeholder.");
            }
            parsed.source = value.value;
            parsed.sourceWasSet = true;
            index = value.nextIndex;
            continue;
        }
        if (arg.startsWith("-"))
            throw new Error(`Unexpected option: ${arg}`);
        if (parsed.command === undefined)
            parsed.command = arg;
        else
            parsed.inputs.push(arg);
    }
    validateCommandOptions(parsed);
    return parsed;
}
function validateCommandOptions(parsed) {
    if (parsed.help || parsed.version)
        return;
    const unsupported = [];
    const reject = (condition, option) => {
        if (condition)
            unsupported.push(option);
    };
    if (parsed.command === "check") {
        reject(parsed.applyWasSet, "--apply");
        reject(parsed.confirmWasSet, "--confirm");
        reject(parsed.outputWasSet, "--output");
        reject(parsed.labelWasSet, "--label");
        reject(parsed.kindWasSet, "--kind");
        reject(parsed.asOfWasSet, "--as-of");
    }
    else if (parsed.command === "repair") {
        reject(parsed.labelWasSet, "--label");
        reject(parsed.kindWasSet, "--kind");
        reject(parsed.asOfWasSet, "--as-of");
    }
    else if (parsed.command === "badge") {
        reject(parsed.sourceWasSet, "--source");
        reject(parsed.n8nVersionWasSet, "--n8n-version");
        reject(parsed.applyWasSet, "--apply");
        reject(parsed.confirmWasSet, "--confirm");
    }
    if (unsupported.length > 0) {
        throw new Error(`${parsed.command ?? "command"} does not support ${unsupported.join(", ")}.`);
    }
}
function readOptionValue(args, index, arg, option) {
    if (arg.startsWith(`${option}=`))
        return { value: arg.slice(option.length + 1), nextIndex: index };
    const value = args[index + 1];
    if (value === undefined)
        throw new Error(`${option} requires a value.`);
    return { value, nextIndex: index + 1 };
}
function requireNonEmpty(value, message) {
    if (value.trim() === "")
        throw new Error(message);
    return value;
}
function isOutputFormat(value) {
    return value === "markdown" || value === "json" || value === "svg" || value === "github";
}
function parseBadgeKind(value) {
    if (value === "status" || value === "last-verified")
        return value;
    throw new Error("--kind must be status or last-verified.");
}
function parseN8nVersionSelection(value) {
    if (value === "matrix")
        return value;
    if (isBundledN8nPackageVersion(value))
        return value;
    throw new Error(`--n8n-version must be one of ${bundledN8nPackageVersions.join(", ")} or matrix.`);
}
//# sourceMappingURL=args.js.map