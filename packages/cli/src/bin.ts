#!/usr/bin/env node
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createBundledN8nPackageSchemaSource,
  createLocalPlaceholderSchemaSource,
  validateWorkflow,
  type SchemaSource,
  type SchemaSourceKind,
  type ValidationIssue
} from "@n8nproof/core";

type CliSchemaSource = Extract<SchemaSourceKind, "bundled-n8n-package" | "local-placeholder">;
type BatchStatus = "passed" | "failed" | "skipped" | "error";
type BadgeFormat = "markdown" | "json" | "svg";

interface ParsedArgs {
  command?: string;
  inputs: string[];
  source: CliSchemaSource;
  json: boolean;
  help: boolean;
  format: BadgeFormat;
  outputPath?: string;
  label: string;
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
  const schemaSource = createSchemaSource(parsed.source);
  const shouldUseBatch = parsed.inputs.length > 1 || (await inputRequiresBatch(parsed.inputs[0] as string));

  if (shouldUseBatch) {
    try {
      const result = await runBatch(parsed.inputs, schemaSource);
      printBatchResult(result, parsed.json);
      process.exitCode = result.ok ? 0 : 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  } else {
    const filePath = parsed.inputs[0] as string;
    process.exitCode = await runSingleFile(filePath, schemaSource, parsed.json);
  }
} else if (parsed.command === "badge" && parsed.inputs.length === 1) {
  process.exitCode = await runBadge(parsed.inputs[0] as string, parsed);
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
    label: "n8n-lint"
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

    if (arg === "--format") {
      const format = args[index + 1];
      if (format !== "markdown" && format !== "json" && format !== "svg") {
        throw new Error("--format must be markdown, json, or svg.");
      }

      parsedArgs.format = format;
      index += 1;
      continue;
    }

    if (arg.startsWith("--format=")) {
      const format = arg.slice("--format=".length);
      if (format !== "markdown" && format !== "json" && format !== "svg") {
        throw new Error("--format must be markdown, json, or svg.");
      }

      parsedArgs.format = format;
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

async function runSingleFile(filePath: string, schemaSource: SchemaSource, json: boolean): Promise<number> {
  try {
    const raw = await readFile(filePath, "utf8");
    const workflow = JSON.parse(raw) as unknown;
    const validation = await validateWorkflow(workflow, schemaSource);

    if (json) {
      console.log(JSON.stringify({ filePath, ...validation }, null, 2));
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
    const rendered = renderBadge(badge, options.format);

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

async function runBatch(
  inputs: string[],
  schemaSource: SchemaSource
): Promise<{
  ok: boolean;
  checkedAt: string;
  source: SchemaSourceKind;
  summary: BatchSummary;
  results: BatchFileResult[];
}> {
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

function printBatchResult(
  result: {
    ok: boolean;
    checkedAt: string;
    source: SchemaSourceKind;
    summary: BatchSummary;
    results: BatchFileResult[];
  },
  json: boolean
): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
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

function createSchemaSource(source: CliSchemaSource): SchemaSource {
  if (source === "local-placeholder") {
    return createLocalPlaceholderSchemaSource();
  }

  return createBundledN8nPackageSchemaSource();
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  n8n-lint check <workflow.json|directory|glob> [...inputs] [--source bundled-n8n-package|local-placeholder] [--json]",
      "  n8n-lint badge <check-result.json> [--format markdown|json|svg] [--label n8n-lint] [--output badge.svg]"
    ].join("\n")
  );
}
