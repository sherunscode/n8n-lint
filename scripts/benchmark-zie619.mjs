#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const [, , workflowRootArg, reportPathArg] = process.argv;

if (!workflowRootArg) {
  console.error("Usage: npm run benchmark:zie619 -- <path-to-Zie619-n8n-workflows> [report.json]");
  console.error("This harness does not clone external repositories or invent benchmark results.");
  process.exitCode = 2;
  process.exit();
}

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const workflowRoot = resolve(workflowRootArg);
const reportPath = resolve(reportPathArg ?? "docs/benchmark-zie619-report.json");
const markdownReportPath = markdownPathFor(reportPath);
const allJsonFiles = await findJsonFiles(workflowRoot);
const { workflowFiles, skippedFiles } = await selectWorkflowFiles(workflowRoot, allJsonFiles);
const n8nLintSource = gitInfo(repoRoot);
const benchmarkSource = gitInfo(workflowRoot);
const startedAt = new Date().toISOString();
const started = performance.now();
const results = [];

for (const workflowFile of workflowFiles) {
  const itemStarted = performance.now();
  const result = spawnSync(process.execPath, ["packages/cli/dist/bin.js", "check", workflowFile, "--json"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  const durationMs = Math.round((performance.now() - itemStarted) * 100) / 100;
  const stdout = parseJsonOutput(result.stdout);

  results.push({
    path: relative(workflowRoot, workflowFile).replaceAll("\\", "/"),
    ok: result.status === 0,
    exitCode: result.status,
    durationMs,
    issueCodes: issueCodesFor(stdout, result),
    stdout,
    stderr: result.stderr.trim()
  });
}

const report = {
  benchmark: "Zie619/n8n-workflows",
  methodology:
    "Discovers JSON files under workflowRoot, skips JSON that is not an n8n workflow object with a top-level nodes array, then runs n8n-lint check --json against each selected workflow using the bundled-n8n-package schema source. It validates workflow structure, bundled node and credential type names, top-level node parameter names, structured nested collection/fixedCollection parameter keys, and trigger graph/type-version shape. This benchmark does not execute workflows and does not use live n8n REST validation.",
  workflowRoot,
  command: {
    cwd: repoRoot,
    executed: `npm run benchmark:zie619 -- ${quoteArg(workflowRoot)} ${quoteArg(relative(repoRoot, reportPath).replaceAll("\\", "/"))}`
  },
  n8nLintSource,
  benchmarkSource,
  startedAt,
  completedAt: new Date().toISOString(),
  durationMs: Math.round((performance.now() - started) * 100) / 100,
  totalJsonFiles: allJsonFiles.length,
  total: results.length,
  passed: results.filter((result) => result.ok).length,
  failed: results.filter((result) => !result.ok).length,
  skipped: skippedFiles.length,
  skippedFiles,
  failureCategories: failureCategoriesFor(results),
  results
};

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownReportPath, renderMarkdownReport(report, reportPath, markdownReportPath));
console.log(
  JSON.stringify(
    {
      ok: true,
      reportPath: relative(repoRoot, reportPath).replaceAll("\\", "/"),
      markdownReportPath: relative(repoRoot, markdownReportPath).replaceAll("\\", "/"),
      total: report.total,
      passed: report.passed,
      failed: report.failed,
      skipped: report.skipped,
      durationMs: report.durationMs
    },
    null,
    2
  )
);

async function findJsonFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJsonFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function selectWorkflowFiles(root, files) {
  const workflowFiles = [];
  const skippedFiles = [];

  for (const file of files) {
    const relativePath = relative(root, file).replaceAll("\\", "/");
    const classification = await classifyJsonFile(file);
    if (classification.workflow) {
      workflowFiles.push(file);
    } else {
      skippedFiles.push({
        path: relativePath,
        reason: classification.reason
      });
    }
  }

  return { workflowFiles, skippedFiles };
}

async function classifyJsonFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return { workflow: false, reason: "invalid_json" };
  }

  if (!isRecord(parsed)) {
    return { workflow: false, reason: "json_not_object" };
  }

  if (!Array.isArray(parsed.nodes)) {
    return { workflow: false, reason: "nodes_not_array" };
  }

  return { workflow: true };
}

function parseJsonOutput(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function issueCodesFor(stdout, result) {
  if (stdout && Array.isArray(stdout.issues)) {
    return stdout.issues
      .filter((issue) => issue?.severity === "error" && typeof issue.code === "string")
      .map((issue) => issue.code);
  }

  if (result.status === 0) {
    return [];
  }

  return ["cli.error"];
}

function failureCategoriesFor(results) {
  const categories = new Map();

  for (const result of results.filter((item) => !item.ok)) {
    const uniqueCodes = new Set(result.issueCodes.length > 0 ? result.issueCodes : ["cli.error"]);
    for (const code of uniqueCodes) {
      const category = categories.get(code) ?? { code, workflowCount: 0, issueCount: 0 };
      category.workflowCount += 1;
      category.issueCount += result.issueCodes.filter((item) => item === code).length || 1;
      categories.set(code, category);
    }
  }

  return [...categories.values()].sort((left, right) => {
    if (right.workflowCount !== left.workflowCount) {
      return right.workflowCount - left.workflowCount;
    }

    return left.code.localeCompare(right.code);
  });
}

function gitInfo(cwd) {
  return {
    remote: git(["remote", "get-url", "origin"], cwd),
    commit: git(["rev-parse", "HEAD"], cwd),
    ref: git(["rev-parse", "--abbrev-ref", "HEAD"], cwd),
    dirty: git(["status", "--short"], cwd).trim().length > 0
  };
}

function git(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function markdownPathFor(jsonPath) {
  if (extname(jsonPath) === ".json") {
    return `${jsonPath.slice(0, -".json".length)}.md`;
  }

  return `${jsonPath}.md`;
}

function renderMarkdownReport(report, jsonReportPath, markdownReportPath) {
  const skippedReasons = countBy(report.skippedFiles.map((item) => item.reason));
  const failureRows =
    report.failureCategories.length > 0
      ? report.failureCategories
          .map((category) => `| \`${category.code}\` | ${category.workflowCount} | ${category.issueCount} |`)
          .join("\n")
      : "| none | 0 | 0 |";
  const skippedRows =
    skippedReasons.length > 0
      ? skippedReasons.map((item) => `| \`${item.value}\` | ${item.count} |`).join("\n")
      : "| none | 0 |";
  const relativeJsonPath = relative(repoRoot, jsonReportPath).replaceAll("\\", "/");
  const relativeMarkdownPath = relative(repoRoot, markdownReportPath).replaceAll("\\", "/");

  return `# Zie619 n8n-workflows Benchmark Report

Generated: ${report.completedAt}

## Summary

| Field | Value |
|---|---:|
| Source repository | ${report.benchmark} |
| Source commit | \`${report.benchmarkSource.commit ?? "unknown"}\` |
| Source ref | \`${report.benchmarkSource.ref ?? "unknown"}\` |
| Source dirty | ${String(report.benchmarkSource.dirty)} |
| n8n-lint commit | \`${report.n8nLintSource.commit ?? "unknown"}\` |
| n8n-lint ref | \`${report.n8nLintSource.ref ?? "unknown"}\` |
| n8n-lint dirty | ${String(report.n8nLintSource.dirty)} |
| JSON files discovered | ${report.totalJsonFiles} |
| Input workflows | ${report.total} |
| Passed | ${report.passed} |
| Failed | ${report.failed} |
| Skipped non-workflow JSON | ${report.skipped} |
| Runtime | ${report.durationMs} ms |

## Reproduce

\`\`\`powershell
git clone --depth 1 https://github.com/Zie619/n8n-workflows.git C:/dev/_benchmarks/Zie619-n8n-workflows
git -C C:/dev/_benchmarks/Zie619-n8n-workflows checkout ${report.benchmarkSource.commit ?? "HEAD"}
npm ci
npm run build
${report.command.executed}
\`\`\`

Report files:

- Markdown summary: \`${relativeMarkdownPath}\`
- Raw JSON results: \`${relativeJsonPath}\`

## Methodology

${report.methodology}

The current n8n-lint validator checks workflow JSON structure, bundled n8n node type names, bundled credential type names, top-level node parameter names, structured nested collection/fixedCollection parameter keys, and trigger graph/type-version shape. It does not execute workflows or claim live REST schema validation.

## Failure Categories

Failure categories are non-exclusive: one workflow can contribute to multiple categories.

| Code | Workflows | Issue occurrences |
|---|---:|---:|
${failureRows}

## Skipped JSON Categories

| Reason | Files |
|---|---:|
${skippedRows}
`;
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function quoteArg(value) {
  return value.includes(" ") ? `"${value}"` : value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
