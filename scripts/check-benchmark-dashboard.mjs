#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const writeMode = process.argv.includes("--write");
const assetPath = "docs/assets/benchmark-dashboard.svg";
const benchmarkPath = "docs/benchmark-zie619-report.json";
const failures = [];

const benchmark = await readJson(benchmarkPath);

expect(benchmark.benchmark === "Zie619/n8n-workflows", "dashboard must use the checked Zie619 benchmark");
expect(benchmark.totalJsonFiles === 2077, "dashboard total JSON count must match the checked report");
expect(benchmark.total === 2066, "dashboard workflow count must match the checked report");
expect(benchmark.passed === 762, "dashboard passed count must match the checked report");
expect(benchmark.failed === 1304, "dashboard failed count must match the checked report");
expect(benchmark.skipped === 11, "dashboard skipped count must match the checked report");
expect(
  benchmark.passed + benchmark.failed === benchmark.total,
  "dashboard passed and failed counts must reconcile to total workflows"
);
expect(
  Array.isArray(benchmark.failureCategories) &&
    benchmark.failureCategories.some((category) => category.code === "workflow.node_parameter_unknown"),
  "dashboard must include failure categories from the checked report"
);
expect(
  benchmark.methodology.includes("does not execute workflows") &&
    benchmark.methodology.includes("does not use live n8n REST validation"),
  "dashboard source methodology must preserve execution and live REST boundaries"
);

if (failures.length > 0) {
  throw new Error(`benchmark dashboard check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

const expectedSvg = renderDashboard(benchmark);

if (writeMode) {
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, expectedSvg, "utf8");
} else {
  const actualSvg = await readFile(assetPath, "utf8");
  if (actualSvg !== expectedSvg) {
    throw new Error(
      `benchmark dashboard asset is stale. Run npm run generate:benchmark-dashboard and commit ${assetPath}.`
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
        "pass/fail/skipped count reconciliation",
        "failure category chart data",
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

function renderDashboard(value) {
  const width = 1200;
  const height = 760;
  const passRate = value.passed / value.total;
  const failRate = value.failed / value.total;
  const skippedRate = value.skipped / value.totalJsonFiles;
  const sourceCommit = value.benchmarkSource?.commit?.slice(0, 12) ?? "unknown";
  const lintCommit = value.n8nLintSource?.commit?.slice(0, 12) ?? "unknown";
  const categories = value.failureCategories.slice(0, 4);

  return `${[
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '  <title id="title">n8n-lint Zie619 benchmark dashboard</title>',
    '  <desc id="desc">Generated from the checked Zie619/n8n-workflows benchmark JSON. Shows pass, fail, skipped, and failure category counts without claiming workflow execution or live REST validation.</desc>',
    '  <rect width="1200" height="760" fill="#f8fafc"/>',
    '  <text x="56" y="72" fill="#0f172a" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="34" font-weight="800">Zie619/n8n-workflows benchmark</text>',
    '  <text x="56" y="108" fill="#475569" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="17">Generated from docs/benchmark-zie619-report.json by npm run generate:benchmark-dashboard.</text>',
    statCard(56, 142, "Workflow inputs", formatNumber(value.total), "#1d4ed8"),
    statCard(338, 142, "Passed", formatNumber(value.passed), "#047857"),
    statCard(620, 142, "Failed", formatNumber(value.failed), "#b91c1c"),
    statCard(902, 142, "Skipped JSON", formatNumber(value.skipped), "#b45309"),
    '  <rect x="56" y="302" width="1088" height="164" rx="14" fill="#ffffff" stroke="#cbd5e1"/>',
    '  <text x="86" y="344" fill="#0f172a" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="22" font-weight="800">Pass/fail split</text>',
    stackedBar(86, 378, 1028, 34, [
      { label: "passed", value: passRate, color: "#10b981" },
      { label: "failed", value: failRate, color: "#ef4444" }
    ]),
    `  <text x="86" y="442" fill="#334155" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="18">${formatPercent(
      passRate
    )} passed / ${formatPercent(failRate)} failed across ${formatNumber(value.total)} checked workflow inputs.</text>`,
    `  <text x="760" y="442" fill="#64748b" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16">${formatPercent(
      skippedRate
    )} of discovered JSON skipped as non-workflow JSON.</text>`,
    '  <rect x="56" y="500" width="1088" height="184" rx="14" fill="#ffffff" stroke="#cbd5e1"/>',
    '  <text x="86" y="542" fill="#0f172a" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="22" font-weight="800">Top failure categories</text>',
    ...categories.flatMap((category, index) => failureCategoryRow(category, index)),
    `  <text x="56" y="724" fill="#64748b" font-family="Consolas, Menlo, Monaco, monospace" font-size="15">source ${escapeXml(
      sourceCommit
    )} | n8n-lint ${escapeXml(lintCommit)} | no workflow execution | no live REST validation</text>`,
    "</svg>",
    ""
  ].join("\n")}`;
}

function statCard(x, y, label, value, color) {
  return [
    `  <rect x="${x}" y="${y}" width="242" height="112" rx="14" fill="#ffffff" stroke="#cbd5e1"/>`,
    `  <text x="${x + 24}" y="${y + 38}" fill="#64748b" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16" font-weight="700">${escapeXml(
      label.toUpperCase()
    )}</text>`,
    `  <text x="${x + 24}" y="${y + 82}" fill="${color}" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="38" font-weight="800">${escapeXml(
      value
    )}</text>`
  ].join("\n");
}

function stackedBar(x, y, width, height, parts) {
  let cursor = x;
  const segments = [];
  for (const part of parts) {
    const partWidth = Math.round(width * part.value);
    segments.push(
      `  <rect x="${cursor}" y="${y}" width="${partWidth}" height="${height}" rx="8" fill="${part.color}"/>`
    );
    cursor += partWidth;
  }

  return segments.join("\n");
}

function failureCategoryRow(category, index) {
  const maxWorkflows = 1088;
  const x = 86;
  const y = 576 + index * 30;
  const barWidth = Math.max(4, Math.round((category.workflowCount / maxWorkflows) * 360));
  return [
    `  <text x="${x}" y="${y}" fill="#334155" font-family="Consolas, Menlo, Monaco, monospace" font-size="15">${escapeXml(
      category.code
    )}</text>`,
    `  <rect x="520" y="${y - 14}" width="360" height="18" rx="9" fill="#e2e8f0"/>`,
    `  <rect x="520" y="${y - 14}" width="${barWidth}" height="18" rx="9" fill="#2563eb"/>`,
    `  <text x="906" y="${y}" fill="#475569" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="15">${formatNumber(
      category.workflowCount
    )} workflows / ${formatNumber(category.issueCount)} issues</text>`
  ];
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
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
