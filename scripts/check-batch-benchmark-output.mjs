#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const writeMode = process.argv.includes("--write");
const assetPath = "docs/assets/batch-benchmark-output.svg";
const benchmarkPath = "docs/benchmark-zie619-report.json";
const failures = [];

const benchmark = await readJson(benchmarkPath);

expect(benchmark.benchmark === "Zie619/n8n-workflows", "batch output must use the checked Zie619 benchmark");
expect(benchmark.totalJsonFiles === 2077, "batch output total JSON count must match the checked report");
expect(benchmark.total === 2066, "batch output workflow count must match the checked report");
expect(benchmark.passed === 762, "batch output passed count must match the checked report");
expect(benchmark.failed === 1304, "batch output failed count must match the checked report");
expect(benchmark.skipped === 11, "batch output skipped count must match the checked report");
expect(benchmark.passed + benchmark.failed === benchmark.total, "batch output pass/fail counts must reconcile");
expect(
  benchmark.command?.executed?.includes("npm run benchmark:zie619 --"),
  "batch output must cite the recorded benchmark command"
);
expect(
  benchmark.methodology.includes("does not execute workflows") &&
    benchmark.methodology.includes("does not use live n8n REST validation"),
  "batch output source methodology must preserve execution and live REST boundaries"
);

if (failures.length > 0) {
  throw new Error(`batch benchmark output check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

const expectedSvg = renderAsset(benchmark);

if (writeMode) {
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, expectedSvg, "utf8");
} else {
  const actualSvg = await readFile(assetPath, "utf8");
  if (actualSvg !== expectedSvg) {
    throw new Error(
      `batch benchmark output asset is stale. Run npm run generate:batch-benchmark-output and commit ${assetPath}.`
    );
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      asset: assetPath,
      source: benchmarkPath,
      checked: [
        "real Zie619 benchmark JSON",
        "full-repo batch result counts",
        "recorded benchmark command",
        "failure category samples",
        "non-execution and live REST boundaries",
        "checked SVG asset"
      ]
    },
    null,
    2
  )
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function renderAsset(value) {
  const width = 1360;
  const height = 620;
  const command = value.command.executed.replaceAll("\\", "/");
  const lines = [
    `$ ${command}`,
    `DISCOVERED ${formatNumber(value.totalJsonFiles)} JSON files in ${value.benchmark}`,
    `SELECTED   ${formatNumber(value.total)} n8n workflow inputs`,
    `PASS       ${formatNumber(value.passed)} workflows`,
    `FAIL       ${formatNumber(value.failed)} workflows`,
    `SKIP       ${formatNumber(value.skipped)} non-workflow JSON files`,
    "",
    "TOP FAILURE CATEGORIES",
    ...value.failureCategories
      .slice(0, 4)
      .map(
        (category) =>
          `${category.code}  ${formatNumber(category.workflowCount)} workflows / ${formatNumber(
            category.issueCount
          )} issues`
      ),
    "",
    "BOUNDARY   no workflow execution; no live REST validation"
  ];

  return `${[
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '  <title id="title">n8n-lint full-repo batch benchmark output</title>',
    '  <desc id="desc">Terminal-style capture generated from the checked Zie619/n8n-workflows benchmark JSON.</desc>',
    '  <rect width="100%" height="100%" fill="#f8fafc"/>',
    '  <text x="52" y="58" fill="#0f172a" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="32" font-weight="800">Full-repo batch output proof</text>',
    '  <text x="52" y="92" fill="#475569" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16">Generated from docs/benchmark-zie619-report.json by npm run generate:batch-benchmark-output.</text>',
    '  <rect x="52" y="124" width="1256" height="430" rx="14" fill="#0f172a" stroke="#cbd5e1"/>',
    '  <rect x="52" y="124" width="1256" height="48" rx="14" fill="#111827"/>',
    '  <rect x="52" y="160" width="1256" height="12" fill="#111827"/>',
    '  <circle cx="78" cy="149" r="6" fill="#ef4444"/>',
    '  <circle cx="100" cy="149" r="6" fill="#f59e0b"/>',
    '  <circle cx="122" cy="149" r="6" fill="#22c55e"/>',
    '  <text x="150" y="154" fill="#cbd5e1" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="14">actual checked benchmark output</text>',
    ...lines.map((line, index) => renderLine(line, index)),
    `  <text x="52" y="590" fill="#64748b" font-family="Consolas, Menlo, Monaco, monospace" font-size="15">benchmark ${escapeXml(
      value.benchmarkSource.commit.slice(0, 12)
    )} | n8n-lint ${escapeXml(value.n8nLintSource.commit.slice(0, 12))}</text>`,
    "</svg>",
    ""
  ].join("\n")}`;
}

function renderLine(line, index) {
  const y = 206 + index * 26;
  const color = line.startsWith("$")
    ? "#67e8f9"
    : line.startsWith("PASS")
      ? "#86efac"
      : line.startsWith("FAIL")
        ? "#fca5a5"
        : line.startsWith("SKIP")
          ? "#fde68a"
          : line.startsWith("TOP") || line.startsWith("BOUNDARY")
            ? "#cbd5e1"
            : "#e5e7eb";
  return `  <text x="82" y="${y}" fill="${color}" font-family="Consolas, Menlo, Monaco, monospace" font-size="18">${escapeXml(line)}</text>`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
