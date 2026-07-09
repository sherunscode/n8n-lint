#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const writeMode = process.argv.includes("--write");
const svgAssetPath = "docs/assets/social-preview.svg";
const pngAssetPath = "docs/assets/social-preview.png";
const benchmarkPath = "docs/benchmark-zie619-report.json";
const schemaConfigPath = "packages/core/schema/bundled-n8n-package-config.json";
const toolPath = "tool.json";
const failures = [];

const benchmark = await readJson(benchmarkPath);
const schemaConfig = await readJson(schemaConfigPath);
const tool = await readJson(toolPath);

expect(benchmark.benchmark === "Zie619/n8n-workflows", "social preview must use the checked Zie619 benchmark");
expect(benchmark.total === 2066, "social preview benchmark total must match the current checked report");
expect(benchmark.passed === 762, "social preview benchmark passed count must match the current checked report");
expect(benchmark.failed === 1304, "social preview benchmark failed count must match the current checked report");
expect(benchmark.skipped === 11, "social preview benchmark skipped count must match the current checked report");
expect(
  schemaConfig.defaultPackageVersion === "2.29.6",
  "social preview must use the current default bundled schema version"
);
expect(tool.repository === "https://github.com/sherunscode/n8n-lint", "social preview must use the canonical repo URL");
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("npm registry publication"),
  "social preview must preserve npm publication non-claim source"
);
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("live REST schema validation"),
  "social preview must preserve live REST validation non-claim source"
);

if (failures.length > 0) {
  throw new Error(`social preview check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

const expectedSvg = renderSocialPreview({
  repo: "github.com/sherunscode/n8n-lint",
  schemaVersion: schemaConfig.defaultPackageVersion,
  total: benchmark.total,
  passed: benchmark.passed,
  failed: benchmark.failed,
  skipped: benchmark.skipped,
  benchmarkCommit: benchmark.benchmarkSource?.commit ?? "",
  sourceCommit: benchmark.n8nLintSource?.commit ?? ""
});

if (writeMode) {
  await mkdir(path.dirname(svgAssetPath), { recursive: true });
  await writeFile(svgAssetPath, expectedSvg, "utf8");
  await writeFile(pngAssetPath, await renderUploadPng(expectedSvg));
} else {
  const actualSvg = await readFile(svgAssetPath, "utf8");
  if (actualSvg !== expectedSvg) {
    throw new Error(
      `social preview SVG asset is stale. Run npm run generate:social-preview and commit ${svgAssetPath}.`
    );
  }
}

const pngBuffer = await readFile(pngAssetPath);
const pngMetadata = await sharp(pngBuffer).metadata();
expect(pngMetadata.format === "png", "social preview upload asset must be PNG");
expect(pngMetadata.width === 1280, "social preview upload PNG width must be 1280");
expect(pngMetadata.height === 640, "social preview upload PNG height must be 640");
expect(pngMetadata.size < 1_000_000, "social preview upload PNG must stay under GitHub's 1 MB limit");
await expectPngColorAt(pngBuffer, 10, 10, [16, 24, 39], "outer background");
await expectPngColorAt(pngBuffer, 64, 64, [248, 250, 252], "outer card");
await expectPngColorAt(pngBuffer, 90, 90, [255, 255, 255], "inner card");
await expectPngColorAt(pngBuffer, 112, 292, [226, 232, 240], "benchmark band");

if (failures.length > 0) {
  throw new Error(`social preview check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      assets: {
        svg: svgAssetPath,
        uploadPng: pngAssetPath
      },
      uploadPng: {
        width: pngMetadata.width,
        height: pngMetadata.height,
        size: pngMetadata.size
      },
      sources: [benchmarkPath, schemaConfigPath, toolPath],
      checked: [
        "canonical repo",
        "current benchmark counts",
        "default bundled schema version",
        "npm publication non-claim",
        "live REST validation non-claim",
        "checked SVG asset",
        "checked GitHub-ready PNG upload asset"
      ]
    },
    null,
    2
  )
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function renderSocialPreview({ repo, schemaVersion, total, passed, failed, skipped, benchmarkCommit, sourceCommit }) {
  const width = 1280;
  const height = 640;
  const benchmarkShort = benchmarkCommit.slice(0, 12);
  const sourceShort = sourceCommit.slice(0, 12);

  return `${[
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '  <title id="title">n8n-lint social preview</title>',
    '  <desc id="desc">Evidence-backed social preview for the She Runs Code n8n-lint repository.</desc>',
    '  <rect width="1280" height="640" fill="#f8fafc"/>',
    '  <rect x="0" y="0" width="1280" height="640" fill="#101827"/>',
    '  <rect x="48" y="48" width="1184" height="544" rx="24" fill="#f8fafc"/>',
    '  <rect x="78" y="78" width="1124" height="484" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>',
    '  <text x="104" y="128" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700">She Runs Code</text>',
    `  <text x="104" y="196" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="78" font-weight="800">${escapeXml(
      "n8n-lint"
    )}</text>`,
    '  <text x="104" y="244" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="500">Validate n8n workflow JSON before it reaches production.</text>',
    '  <rect x="104" y="286" width="1072" height="118" rx="14" fill="#e2e8f0"/>',
    `  <text x="132" y="332" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700">${formatNumber(
      total
    )} workflow inputs checked</text>`,
    `  <text x="132" y="374" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="24">${formatNumber(
      passed
    )} passed / ${formatNumber(failed)} failed / ${formatNumber(skipped)} skipped in the checked benchmark</text>`,
    renderBadge(104, 434, 312, "bundled schema", `n8n-nodes-base@${schemaVersion}`, "#0f766e"),
    renderBadge(436, 434, 372, "repo", repo, "#1d4ed8"),
    renderBadge(828, 434, 348, "boundary", "no npm / no live REST claim", "#b45309"),
    `  <text x="104" y="536" fill="#64748b" font-family="Consolas, Menlo, monospace" font-size="18">benchmark ${escapeXml(
      benchmarkShort
    )} | source ${escapeXml(sourceShort)}</text>`,
    "</svg>",
    ""
  ].join("\n")}`;
}

function renderBadge(x, y, width, label, value, color) {
  return [
    `  <rect x="${x}" y="${y}" width="${width}" height="72" rx="14" fill="${color}"/>`,
    `  <text x="${x + 18}" y="${y + 28}" fill="#dbeafe" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">${escapeXml(
      label.toUpperCase()
    )}</text>`,
    `  <text x="${x + 18}" y="${y + 53}" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(
      value
    )}</text>`
  ].join("\n");
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

async function renderUploadPng(svg) {
  return sharp(Buffer.from(svg, "utf8"))
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false
    })
    .toBuffer();
}

async function expectPngColorAt(pngBuffer, x, y, expectedRgb, label) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  const actualRgb = [data[offset], data[offset + 1], data[offset + 2]];
  const withinTolerance = actualRgb.every((value, index) => Math.abs(value - expectedRgb[index]) <= 2);
  expect(
    withinTolerance,
    `social preview upload PNG ${label} pixel at ${x},${y} must be rgb(${expectedRgb.join(",")}), got rgb(${actualRgb.join(",")})`
  );
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
