#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];
const benchmarkJsonPath = "docs/benchmark-zie619-report.json";
const benchmarkMarkdownPath = "docs/benchmark-zie619-report.md";
const packageJson = await readJson("package.json");
const report = await readJson(benchmarkJsonPath);
const markdown = await readText(benchmarkMarkdownPath);
const readme = await readText("README.md");
const deepAudit = await readText("docs/deep-audit-2026-07-08.md");
const launchContentPack = await readText("docs/launch-content-pack.md");

expect(
  packageJson.scripts?.["check:benchmark-report"] === "node scripts/check-benchmark-report.mjs",
  "package.json must expose check:benchmark-report"
);
expect(
  typeof packageJson.scripts?.quality === "string" &&
    packageJson.scripts.quality.includes("npm run check:benchmark-report"),
  "package.json quality gate must include check:benchmark-report"
);

expect(report.benchmark === "Zie619/n8n-workflows", "benchmark report must use Zie619/n8n-workflows");
expect(
  report.benchmarkSource?.remote === "https://github.com/Zie619/n8n-workflows.git",
  "benchmark source remote must be canonical"
);
expect(
  report.n8nLintSource?.remote === "https://github.com/sherunscode/n8n-lint.git",
  "n8n-lint source remote must be canonical"
);
expect(report.benchmarkSource?.dirty === false, "benchmark source must be clean");
expect(report.n8nLintSource?.dirty === false, "n8n-lint source used for benchmark must be clean");
expect(isSha(report.benchmarkSource?.commit), "benchmark source commit must be a full SHA");
expect(isSha(report.n8nLintSource?.commit), "n8n-lint source commit must be a full SHA");
expect(
  hasPhrase(report.methodology, "This benchmark does not execute workflows"),
  "methodology must preserve no-workflow-execution boundary"
);
expect(
  hasPhrase(report.methodology, "does not use live n8n REST validation"),
  "methodology must preserve live REST non-claim boundary"
);
expect(
  hasPhrase(report.command?.executed ?? "", "npm run benchmark:zie619 --"),
  "benchmark command must record the reproducible npm script"
);

expect(Number.isFinite(report.durationMs) && report.durationMs > 0, "durationMs must be positive");
expect(
  report.totalJsonFiles === report.total + report.skipped,
  "totalJsonFiles must equal total workflows plus skipped JSON"
);
expect(
  Array.isArray(report.results) && report.results.length === report.total,
  "results length must match total workflows"
);
expect(
  Array.isArray(report.skippedFiles) && report.skippedFiles.length === report.skipped,
  "skippedFiles length must match skipped count"
);
expect(report.passed + report.failed === report.total, "passed plus failed must equal total workflows");
expect(
  report.results.filter((result) => result.ok === true).length === report.passed,
  "passed count must match results"
);
expect(
  report.results.filter((result) => result.ok !== true).length === report.failed,
  "failed count must match results"
);
expect(
  report.results.every((result) => typeof result.path === "string" && !/^[A-Za-z]:[\\/]/.test(result.path)),
  "benchmark result paths must stay relative"
);

const expectedFailureCategories = failureCategoriesFor(report.results);
expect(
  JSON.stringify(report.failureCategories) === JSON.stringify(expectedFailureCategories),
  "failureCategories must match issueCodes in results"
);

const expectedMarkdown = renderMarkdownReport(report);
expect(
  markdown === expectedMarkdown,
  "Markdown benchmark report must match JSON. Rerun benchmark harness if intentional."
);

for (const target of [
  { label: "README", text: readme },
  { label: "deep audit", text: deepAudit },
  { label: "launch content pack", text: launchContentPack }
]) {
  for (const phrase of [
    report.benchmarkSource?.commit,
    `${formatNumber(report.total)} workflow inputs`,
    `${formatNumber(report.passed)} passed`,
    `${formatNumber(report.failed)} failed`,
    `${formatNumber(report.skipped)} skipped`,
    benchmarkMarkdownPath,
    benchmarkJsonPath
  ].filter(Boolean)) {
    expect(hasPhrase(target.text, phrase), `${target.label} must include benchmark proof phrase: ${phrase}`);
  }
}

for (const phrase of [
  "npm run check:benchmark-report",
  "does not execute workflows",
  "does not claim live REST validation"
]) {
  expect(hasPhrase(readme, phrase), `README must include: ${phrase}`);
}

for (const phrase of ["npm run check:benchmark-report", "Benchmark Proof"]) {
  expect(hasPhrase(deepAudit, phrase), `deep audit must include: ${phrase}`);
}

expect(
  hasPhrase(launchContentPack, "Run `npm run check:benchmark-report` before publishing benchmark-number claims."),
  "launch content pack must require benchmark report check before benchmark-number claims"
);

if (failures.length > 0) {
  throw new Error(`benchmark report check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      report: benchmarkMarkdownPath,
      raw: benchmarkJsonPath,
      checked: [
        "JSON internal totals",
        "failure category math",
        "relative result paths",
        "Markdown render parity",
        "README/audit/launch proof phrases",
        "non-execution and live REST boundaries"
      ]
    },
    null,
    2
  )
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

function renderMarkdownReport(value) {
  const skippedReasons = countBy(value.skippedFiles.map((item) => item.reason));
  const failureRows =
    value.failureCategories.length > 0
      ? value.failureCategories
          .map((category) => `| \`${category.code}\` | ${category.workflowCount} | ${category.issueCount} |`)
          .join("\n")
      : "| none | 0 | 0 |";
  const skippedRows =
    skippedReasons.length > 0
      ? skippedReasons.map((item) => `| \`${item.value}\` | ${item.count} |`).join("\n")
      : "| none | 0 |";

  return `# Zie619 n8n-workflows Benchmark Report

Generated: ${value.completedAt}

## Summary

| Field | Value |
|---|---:|
| Source repository | ${value.benchmark} |
| Source commit | \`${value.benchmarkSource.commit ?? "unknown"}\` |
| Source ref | \`${value.benchmarkSource.ref ?? "unknown"}\` |
| Source dirty | ${String(value.benchmarkSource.dirty)} |
| n8n-lint commit | \`${value.n8nLintSource.commit ?? "unknown"}\` |
| n8n-lint ref | \`${value.n8nLintSource.ref ?? "unknown"}\` |
| n8n-lint dirty | ${String(value.n8nLintSource.dirty)} |
| JSON files discovered | ${value.totalJsonFiles} |
| Input workflows | ${value.total} |
| Passed | ${value.passed} |
| Failed | ${value.failed} |
| Skipped non-workflow JSON | ${value.skipped} |
| Runtime | ${value.durationMs} ms |

## Reproduce

\`\`\`powershell
git clone --depth 1 https://github.com/Zie619/n8n-workflows.git C:/dev/_benchmarks/Zie619-n8n-workflows
git -C C:/dev/_benchmarks/Zie619-n8n-workflows checkout ${value.benchmarkSource.commit ?? "HEAD"}
npm ci
npm run build
${value.command.executed}
\`\`\`

Report files:

- Markdown summary: \`${benchmarkMarkdownPath}\`
- Raw JSON results: \`${benchmarkJsonPath}\`
- Dashboard SVG: \`docs/assets/benchmark-dashboard.svg\`
- Batch output SVG: \`docs/assets/batch-benchmark-output.svg\`

![Generated n8n-lint Zie619 benchmark dashboard](assets/benchmark-dashboard.svg)

![Generated n8n-lint full-repo batch benchmark output](assets/batch-benchmark-output.svg)

## Methodology

${value.methodology}

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

function countBy(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function hasPhrase(text, phrase) {
  return normalizeWhitespace(text).includes(normalizeWhitespace(String(phrase)));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function isSha(value) {
  return typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}
