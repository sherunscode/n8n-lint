import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface ValidationIssue {
  severity?: unknown;
  code?: unknown;
  message?: unknown;
  path?: unknown;
}

const actionDist = dirname(fileURLToPath(import.meta.url));
const workspace = requireEnvironment("GITHUB_WORKSPACE");
const paths = readInput("PATHS")
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);
const source = readInput("SOURCE") || "bundled-n8n-package";
const n8nVersion = readInput("N8N-VERSION") || "2.29.6";

if (paths.length === 0) fail("paths input must include at least one path, directory, or glob.", 2);

const cliPath = join(actionDist, "cli", "bin.js");
const result = spawnSync(
  process.execPath,
  [cliPath, "check", ...paths, "--source", source, "--n8n-version", n8nVersion, "--json"],
  {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    maxBuffer: 32 * 1024 * 1024
  }
);

if (result.error) fail(result.error.message, 1);

let payload: unknown;
try {
  payload = JSON.parse(result.stdout) as unknown;
} catch {
  const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").slice(0, 4000);
  fail(`n8n-lint did not return valid JSON.${detail ? `\n${detail}` : ""}`, result.status ?? 1);
}

emitAnnotations(payload);
writeSummary(payload, paths, source, n8nVersion, result.status ?? 1);

if (result.status !== 0) process.exitCode = result.status ?? 1;

function emitAnnotations(value: unknown, versionPrefix = ""): void {
  if (!isRecord(value)) return;
  const filePath = typeof value.filePath === "string" ? value.filePath : undefined;
  emitIssueList(value.issues, filePath, versionPrefix);

  if (Array.isArray(value.results)) {
    for (const item of value.results) {
      if (!isRecord(item)) continue;
      const itemPath = typeof item.filePath === "string" ? item.filePath : undefined;
      if (item.status === "skipped") {
        command("notice", itemPath, `${versionPrefix}workflow.skipped`, "Skipped non-workflow JSON file.");
      } else if (item.status === "error") {
        command("error", itemPath, `${versionPrefix}input_error`, readText(item.error, "Input could not be read."));
      }
      emitIssueList(item.issues, itemPath, versionPrefix);
    }
  }

  if (Array.isArray(value.versions)) {
    for (const version of value.versions) {
      if (!isRecord(version)) continue;
      const prefix = typeof version.packageVersion === "string" ? `${version.packageVersion}:` : "matrix:";
      emitAnnotations(version, prefix);
    }
  }
}

function emitIssueList(value: unknown, filePath: string | undefined, prefix: string): void {
  if (!Array.isArray(value)) return;
  for (const rawIssue of value) {
    if (!isRecord(rawIssue)) continue;
    const issue = rawIssue as ValidationIssue;
    const severity = issue.severity === "warning" ? "warning" : "error";
    const code = readText(issue.code, "validation.issue");
    const message = readText(issue.message, "Validation failed.");
    const issuePath = readText(issue.path, "$");
    command(severity, filePath, `${prefix}${code}`, `${message} (${issuePath})`);
  }
}

function command(kind: "error" | "warning" | "notice", file: string | undefined, title: string, message: string): void {
  const properties = [file ? `file=${escapeProperty(file)}` : "", `title=${escapeProperty(title)}`]
    .filter(Boolean)
    .join(",");
  process.stdout.write(`::${kind} ${properties}::${escapeData(message)}\n`);
}

function writeSummary(
  value: unknown,
  inputPaths: string[],
  schemaSource: string,
  version: string,
  status: number
): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const summary = isRecord(value) && isRecord(value.summary) ? value.summary : {};
  const checkedAt = isRecord(value) && typeof value.checkedAt === "string" ? value.checkedAt : new Date().toISOString();
  const versionLabel = readVersionLabel(value, version);
  const badgeLabel = encodeURIComponent("last verified").replace(/-/g, "--").replace(/%20/g, "_");
  const badgeMessage = encodeURIComponent(`${versionLabel}, verified now`).replace(/-/g, "--").replace(/%20/g, "_");
  const badge = `![last verified: ${versionLabel}, verified now](https://img.shields.io/badge/${badgeLabel}-${badgeMessage}-brightgreen)`;
  const lines = [
    "## n8n-lint",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Status | ${status === 0 ? "Passed" : "Failed"} |`,
    `| Paths | ${markdown(inputPaths.join("<br>"))} |`,
    `| Source | \`${markdown(schemaSource)}\` |`,
    `| n8n version selector | \`${markdown(version)}\` |`,
    `| Checked at | \`${markdown(checkedAt)}\` |`,
    `| Last verified badge | ${badge} |`,
    "",
    "### Summary",
    "",
    `- Passed: ${readCount(summary.passed)}`,
    `- Failed: ${readCount(summary.failed)}`,
    `- Warnings: ${readCount(summary.warnings)}`,
    `- Skipped: ${readCount(summary.skipped)}`,
    `- Errors: ${readCount(summary.errors)}`,
    ""
  ];
  appendFileSync(summaryPath, lines.join("\n"), "utf8");
}

function readVersionLabel(value: unknown, fallback: string): string {
  if (isRecord(value) && isRecord(value.packageInfo) && typeof value.packageInfo.version === "string") {
    return `n8n v${value.packageInfo.version}`;
  }
  return fallback === "matrix" ? "n8n matrix" : `n8n v${fallback}`;
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function readInput(name: string): string {
  return process.env[`INPUT_${name}`] ?? "";
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) fail(`${name} is required.`, 2);
  return value;
}

function fail(message: string, code: number): never {
  command("error", undefined, "n8n-lint action", message);
  process.exit(code);
}

function readText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function markdown(value: string): string {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(/`/g, "&#96;");
}

function escapeProperty(value: string): string {
  return escapeData(value).replace(/\\/g, "%5C").replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
