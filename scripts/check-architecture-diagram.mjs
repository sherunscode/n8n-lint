#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const writeMode = process.argv.includes("--write");
const assetPath = "docs/assets/architecture.svg";
const packagePath = "package.json";
const schemaConfigPath = "packages/core/schema/bundled-n8n-package-config.json";
const toolPath = "tool.json";
const failures = [];

const packageJson = await readJson(packagePath);
const schemaConfig = await readJson(schemaConfigPath);
const tool = await readJson(toolPath);

expect(tool.name === "n8n-lint", "architecture diagram must use the current tool name");
expect(
  tool.repository === "https://github.com/sherunscode/n8n-lint",
  "architecture diagram must use the canonical repository"
);
expect(
  Array.isArray(packageJson.workspaces) && packageJson.workspaces.includes("packages/*"),
  "architecture diagram must reflect npm workspace packaging"
);
expect(
  schemaConfig.defaultPackageVersion === "2.29.6",
  "architecture diagram must use the current default bundled schema version"
);
expect(
  Object.keys(schemaConfig.selections ?? {}).includes("2.30.0"),
  "architecture diagram must include the checked matrix schema version"
);
expect(hasCommand("check"), "architecture diagram must reflect the check command");
expect(hasCommand("repair"), "architecture diagram must reflect repair mode");
expect(hasCommand("badge"), "architecture diagram must reflect badge generation");
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("live REST schema validation"),
  "architecture diagram must preserve the live REST non-claim source"
);

if (failures.length > 0) {
  throw new Error(`architecture diagram check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

const expectedSvg = renderArchitectureDiagram({
  repo: "github.com/sherunscode/n8n-lint",
  defaultVersion: schemaConfig.defaultPackageVersion,
  matrixVersions: Object.keys(schemaConfig.selections).sort((left, right) => left.localeCompare(right)),
  packageName: schemaConfig.packageName
});

if (writeMode) {
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, expectedSvg, "utf8");
} else {
  const actualSvg = await readFile(assetPath, "utf8");
  if (actualSvg !== expectedSvg) {
    throw new Error(
      `architecture diagram asset is stale. Run npm run generate:architecture-diagram and commit ${assetPath}.`
    );
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      asset: assetPath,
      sources: [packagePath, schemaConfigPath, toolPath],
      checked: [
        "canonical repo",
        "workspace packaging",
        "default bundled schema version",
        "matrix schema versions",
        "command surfaces",
        "live REST non-claim",
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

function hasCommand(name) {
  return Array.isArray(tool.commands) && tool.commands.some((command) => command.name === name);
}

function renderArchitectureDiagram({ repo, defaultVersion, matrixVersions, packageName }) {
  const matrixLabel = matrixVersions.map((version) => `${packageName}@${version}`).join(" | ");
  return `${[
    '<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="680" viewBox="0 0 1180 680" role="img" aria-labelledby="title desc">',
    '  <title id="title">n8n-lint architecture diagram</title>',
    '  <desc id="desc">Generated architecture diagram for the n8n-lint CLI, core validator, bundled schema artifacts, and output surfaces.</desc>',
    '  <rect width="1180" height="680" rx="24" fill="#f8fafc"/>',
    '  <rect x="40" y="40" width="1100" height="600" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>',
    '  <text x="70" y="90" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800">n8n-lint architecture</text>',
    `  <text x="70" y="122" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="17">${escapeXml(
      repo
    )}</text>`,
    renderBox(70, 170, 230, 116, "input", "workflow JSON", ["file", "directory", "glob"], "#dbeafe", "#1d4ed8"),
    renderBox(360, 170, 230, 116, "cli", "n8n-lint", ["check", "repair", "badge"], "#dcfce7", "#15803d"),
    renderBox(
      650,
      170,
      230,
      116,
      "core",
      "@n8nproof/core",
      ["validateWorkflow", "schema sources"],
      "#fef3c7",
      "#b45309"
    ),
    renderBox(
      360,
      360,
      230,
      120,
      "schemas",
      "bundled artifacts",
      [`default ${packageName}@${defaultVersion}`, "matrix mode"],
      "#ede9fe",
      "#7c3aed"
    ),
    renderBox(
      650,
      360,
      230,
      120,
      "outputs",
      "outputs",
      ["human + JSON", "GitHub annotations", "patches + badges"],
      "#fee2e2",
      "#dc2626"
    ),
    renderBox(70, 360, 230, 120, "gates", "quality gates", ["CI", "pre-commit", "packed smoke"], "#e0f2fe", "#0369a1"),
    renderArrow(305, 228, 352, 228),
    renderArrow(595, 228, 642, 228),
    renderArrow(765, 292, 765, 352),
    renderArrow(650, 420, 600, 420),
    renderArrow(355, 420, 306, 420),
    renderArrow(475, 292, 475, 352),
    '  <rect x="70" y="535" width="1040" height="58" rx="14" fill="#f1f5f9" stroke="#cbd5e1"/>',
    `  <text x="94" y="562" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Schema matrix:</text>`,
    `  <text x="224" y="562" fill="#334155" font-family="Consolas, Menlo, monospace" font-size="15">${escapeXml(
      matrixLabel
    )}</text>`,
    '  <text x="94" y="584" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="14">Boundary: no npm registry publication claim, no workflow execution claim, and no live REST schema validation claim.</text>',
    "</svg>",
    ""
  ].join("\n")}`;
}

function renderBox(x, y, width, height, eyebrow, title, lines, fill, stroke) {
  return [
    `  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
    `  <text x="${x + 18}" y="${y + 30}" fill="${stroke}" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="800">${escapeXml(
      eyebrow.toUpperCase()
    )}</text>`,
    `  <text x="${x + 18}" y="${y + 60}" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="800">${escapeXml(
      title
    )}</text>`,
    ...lines.map(
      (line, index) =>
        `  <text x="${x + 18}" y="${y + 88 + index * 20}" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="15">${escapeXml(
          line
        )}</text>`
    )
  ].join("\n");
}

function renderArrow(x1, y1, x2, y2) {
  const markerId = `arrow-${x1}-${y1}-${x2}-${y2}`.replaceAll("-", "_");
  return [
    `  <defs><marker id="${markerId}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#64748b"/></marker></defs>`,
    `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="3" marker-end="url(#${markerId})"/>`
  ].join("\n");
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
