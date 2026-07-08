#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const writeMode = process.argv.includes("--write");
const assetPath = "docs/assets/matrix-compatibility-demo.svg";
const fixturePath = "examples/matrix-2-30-parameter-workflow.json";
const textCommand = ["packages/cli/dist/bin.js", "check", fixturePath, "--n8n-version=matrix"];
const jsonCommand = ["packages/cli/dist/bin.js", "check", fixturePath, "--n8n-version=matrix", "--json"];
const failures = [];

const textRun = runCommand(textCommand);
const jsonRun = runCommand(jsonCommand);
const matrix = parseJson(jsonRun.output);

expect(
  textRun.status === 1,
  `matrix text command must exit with status 1 when one pinned version fails:\n${textRun.output}`
);
expect(
  jsonRun.status === 1,
  `matrix JSON command must exit with status 1 when one pinned version fails:\n${jsonRun.output}`
);
expect(textRun.output.includes("MATRIX n8n-nodes-base@2.29.6: FAIL"), "matrix output must show 2.29.6 failing");
expect(textRun.output.includes("MATRIX n8n-nodes-base@2.30.0: PASS"), "matrix output must show 2.30.0 passing");
expect(
  textRun.output.includes("DIFF examples/matrix-2-30-parameter-workflow.json: 2.29.6=failed, 2.30.0=passed"),
  "matrix output must include the compatibility diff line"
);
expect(
  textRun.output.includes("Matrix summary: 2 versions, 1 compatibility differences"),
  "matrix output must include the matrix summary"
);
expect(textRun.output.includes("not live REST validation") === false, "matrix text summary should stay concise");

const oldVersion = getVersion(matrix, "2.29.6");
const newVersion = getVersion(matrix, "2.30.0");
const difference = Array.isArray(matrix.differences) ? matrix.differences[0] : undefined;

expect(matrix.ok === false, "matrix JSON must report overall ok false when one pinned version fails");
expect(oldVersion?.ok === false, "2.29.6 matrix JSON result must fail");
expect(newVersion?.ok === true, "2.30.0 matrix JSON result must pass");
expect(oldVersion?.summary?.failed === 1, "2.29.6 summary must include one failed workflow");
expect(newVersion?.summary?.passed === 1, "2.30.0 summary must include one passed workflow");
expect(difference?.filePath === fixturePath, "matrix difference must reference the fixture path");
expect(difference?.statusByVersion?.["2.29.6"] === "failed", "matrix diff must mark 2.29.6 failed");
expect(difference?.statusByVersion?.["2.30.0"] === "passed", "matrix diff must mark 2.30.0 passed");
expect(
  difference?.errorSignaturesByVersion?.["2.29.6"]?.includes(
    "workflow.node_parameter_unknown:$.nodes[0].parameters.clearWarning"
  ),
  "matrix diff must include the clearWarning parameter error signature"
);
expect(
  matrix.summary?.passed === 1 && matrix.summary?.failed === 1,
  "matrix summary must report one pass and one fail"
);

if (failures.length > 0) {
  throw new Error(`matrix demo check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

const expectedSvg = renderAsset({
  textCommand: `node ${textCommand.join(" ")}`,
  jsonCommand: `node ${jsonCommand.join(" ")}`,
  output: textRun.output,
  matrix,
  oldVersion,
  newVersion,
  difference
});

if (writeMode) {
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, expectedSvg, "utf8");
} else {
  const actualSvg = await readFile(assetPath, "utf8");
  if (actualSvg !== expectedSvg) {
    throw new Error(`matrix demo asset is stale. Run npm run generate:matrix-demo and commit ${assetPath}.`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      asset: assetPath,
      commands: [`node ${textCommand.join(" ")}`, `node ${jsonCommand.join(" ")}`],
      checked: [
        "real matrix CLI command",
        "2.29.6 fail and 2.30.0 pass",
        "clearWarning compatibility difference",
        "stable matrix SVG asset"
      ]
    },
    null,
    2
  )
);

function runCommand(command) {
  const result = spawnSync(process.execPath, command, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      FORCE_COLOR: undefined,
      NO_COLOR: "1"
    }
  });

  return {
    status: result.status,
    output: normalizeLines([result.stdout, result.stderr].filter(Boolean).join("\n"))
  };
}

function parseJson(output) {
  try {
    return JSON.parse(output);
  } catch (error) {
    failures.push(`matrix JSON output must parse: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

function getVersion(matrix, version) {
  return Array.isArray(matrix.versions)
    ? matrix.versions.find((entry) => entry?.packageVersion === version)
    : undefined;
}

function renderAsset({ textCommand, jsonCommand, output, matrix, oldVersion, newVersion, difference }) {
  const width = 1280;
  const height = 720;
  const outputLines = output.split("\n");
  const cards = [
    {
      label: "n8n-nodes-base@2.29.6",
      status: "FAIL",
      statusColor: "#ef4444",
      body: [
        "Pinned by n8n@2.29.7",
        `workflows: ${oldVersion.summary.workflows}`,
        `failed: ${oldVersion.summary.failed}`,
        "clearWarning is rejected"
      ]
    },
    {
      label: "n8n-nodes-base@2.30.0",
      status: "PASS",
      statusColor: "#22c55e",
      body: [
        "Pinned by n8n@2.30.0",
        `workflows: ${newVersion.summary.workflows}`,
        `passed: ${newVersion.summary.passed}`,
        "clearWarning is accepted"
      ]
    }
  ];

  return `${[
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '  <title id="title">n8n-lint matrix compatibility proof</title>',
    '  <desc id="desc">Generated from actual n8n-lint matrix CLI and JSON output for a fixture that fails under 2.29.6 and passes under 2.30.0.</desc>',
    '  <rect width="100%" height="100%" fill="#f8fafc"/>',
    '  <text x="52" y="66" fill="#0f172a" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="34" font-weight="800">Matrix proof from real CLI output</text>',
    '  <text x="52" y="102" fill="#475569" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16">Generated by npm run generate:matrix-demo from the built CLI and checked by npm run check:matrix-demo.</text>',
    renderCard(cards[0], 52, 140),
    renderCard(cards[1], 672, 140),
    '  <rect x="52" y="362" width="1176" height="204" rx="14" fill="#0f172a" stroke="#cbd5e1"/>',
    '  <text x="82" y="400" fill="#67e8f9" font-family="Consolas, Menlo, Monaco, monospace" font-size="16">$ ' +
      escapeXml(textCommand) +
      "</text>",
    ...outputLines.map((line, index) => {
      const color =
        line.startsWith("MATRIX") && line.includes("FAIL")
          ? "#fca5a5"
          : line.startsWith("MATRIX") && line.includes("PASS")
            ? "#86efac"
            : line.startsWith("DIFF")
              ? "#fde68a"
              : "#e5e7eb";
      return `  <text x="82" y="${430 + index * 28}" fill="${color}" font-family="Consolas, Menlo, Monaco, monospace" font-size="16">${escapeXml(line)}</text>`;
    }),
    '  <rect x="52" y="584" width="1176" height="100" rx="12" fill="#ffffff" stroke="#cbd5e1"/>',
    `  <text x="82" y="616" fill="#0f172a" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="18" font-weight="800">Diff: ${escapeXml(difference.filePath)}</text>`,
    `  <text x="82" y="644" fill="#475569" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="15">${escapeXml(signatureLine(difference))}</text>`,
    `  <text x="82" y="672" fill="#64748b" font-family="Consolas, Menlo, Monaco, monospace" font-size="13">$ ${escapeXml(jsonCommand)}</text>`,
    "</svg>",
    ""
  ].join("\n")}`;
}

function renderCard(card, x, y) {
  const body = card.body
    .map(
      (line, index) =>
        `  <text x="${x + 30}" y="${y + 100 + index * 31}" fill="#475569" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="17">${escapeXml(line)}</text>`
    )
    .join("\n");

  return [
    `  <rect x="${x}" y="${y}" width="556" height="180" rx="14" fill="#ffffff" stroke="#cbd5e1"/>`,
    `  <text x="${x + 30}" y="${y + 44}" fill="#0f172a" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="21" font-weight="800">${escapeXml(card.label)}</text>`,
    `  <rect x="${x + 388}" y="${y + 22}" width="120" height="38" rx="19" fill="${card.statusColor}"/>`,
    `  <text x="${x + 448}" y="${y + 47}" text-anchor="middle" fill="#ffffff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="18" font-weight="800">${card.status}</text>`,
    body
  ].join("\n");
}

function signatureLine(difference) {
  const signature = difference.errorSignaturesByVersion["2.29.6"][0];
  return `2.29.6=failed, 2.30.0=passed; ${signature}`;
}

function normalizeLines(text) {
  return text.replace(/\r\n/g, "\n").trimEnd();
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
