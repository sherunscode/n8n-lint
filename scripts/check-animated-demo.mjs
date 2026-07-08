#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const writeMode = process.argv.includes("--write");
const assetPath = "docs/assets/animated-failure-demo.svg";
const command = ["packages/cli/dist/bin.js", "check", "examples/failing-dead-parameter.json"];
const result = spawnSync(process.execPath, command, {
  cwd: process.cwd(),
  encoding: "utf8",
  env: {
    ...process.env,
    FORCE_COLOR: "0",
    NO_COLOR: "1"
  }
});
const output = normalizeLines([result.stdout, result.stderr].filter(Boolean).join("\n"));
const failures = [];

expect(result.status === 1, "animated demo command must exit with status 1");
expect(output.includes("FAIL examples/failing-dead-parameter.json"), "animated demo must use the failing fixture");
expect(output.includes("ERROR workflow.node_parameter_unknown"), "animated demo must include the schema error code");
expect(output.includes("notARealParameter"), "animated demo must include the dead parameter name");
expect(output.includes("not live REST validation"), "animated demo must include the live REST boundary warning");

if (failures.length > 0) {
  throw new Error(`animated demo check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

const expectedSvg = renderAnimatedSvg({
  command: `node ${command.join(" ")}`,
  lines: output.split("\n")
});

if (writeMode) {
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, expectedSvg, "utf8");
} else {
  const actualSvg = await readFile(assetPath, "utf8");
  if (actualSvg !== expectedSvg) {
    throw new Error(`animated demo asset is stale. Run npm run generate:animated-demo and commit ${assetPath}.`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      asset: assetPath,
      command: `node ${command.join(" ")}`,
      expectedExitCode: 1,
      checked: [
        "real failing CLI command",
        "dead parameter error output",
        "live REST boundary warning",
        "checked animated SVG asset"
      ]
    },
    null,
    2
  )
);

function renderAnimatedSvg({ command, lines }) {
  const failLine = lines.find((line) => line.startsWith("FAIL ")) ?? "FAIL examples/failing-dead-parameter.json";
  const errorLine =
    lines.find((line) => line.includes("workflow.node_parameter_unknown")) ??
    'ERROR workflow.node_parameter_unknown $.nodes[0].parameters.notARealParameter: Unknown or dead parameter "notARealParameter".';
  const warningLine =
    lines.find((line) => line.includes("not live REST validation")) ??
    "WARNING schema_source.warning $: Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation.";

  return `${[
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-labelledby="title desc">',
    '  <title id="title">n8n-lint animated failure demo</title>',
    '  <desc id="desc">Animated SVG generated from actual n8n-lint CLI output for a dead parameter fixture.</desc>',
    "  <style>",
    "    .terminal { font-family: Consolas, Menlo, Monaco, 'Liberation Mono', monospace; }",
    "    .frame { opacity: 0; }",
    "    .frame1 { animation: frameOne 8s infinite; }",
    "    .frame2 { animation: frameTwo 8s infinite; }",
    "    .frame3 { animation: frameThree 8s infinite; }",
    "    @keyframes frameOne { 0%, 29% { opacity: 1; } 33%, 100% { opacity: 0; } }",
    "    @keyframes frameTwo { 0%, 31% { opacity: 0; } 34%, 62% { opacity: 1; } 66%, 100% { opacity: 0; } }",
    "    @keyframes frameThree { 0%, 64% { opacity: 0; } 68%, 100% { opacity: 1; } }",
    "  </style>",
    '  <rect width="960" height="540" rx="18" fill="#0f172a"/>',
    '  <rect x="30" y="30" width="900" height="480" rx="16" fill="#111827" stroke="#334155" stroke-width="2"/>',
    '  <circle cx="58" cy="58" r="7" fill="#ef4444"/>',
    '  <circle cx="82" cy="58" r="7" fill="#f59e0b"/>',
    '  <circle cx="106" cy="58" r="7" fill="#22c55e"/>',
    '  <text x="132" y="64" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="15">actual CLI proof, animated</text>',
    '  <g class="terminal">',
    '    <g class="frame frame1">',
    `      <text x="58" y="124" fill="#67e8f9" font-size="22">$ ${escapeXml(command)}</text>`,
    '      <text x="58" y="178" fill="#e5e7eb" font-size="21">Checking workflow JSON against bundled schema...</text>',
    '      <text x="58" y="232" fill="#94a3b8" font-size="18">source: bundled-n8n-package</text>',
    "    </g>",
    '    <g class="frame frame2">',
    `      <text x="58" y="124" fill="#f87171" font-size="22">${escapeXml(failLine)}</text>`,
    ...wrapSvgText(errorLine, 58, 178, 20, 72, "#fecaca"),
    "    </g>",
    '    <g class="frame frame3">',
    '      <text x="58" y="124" fill="#22c55e" font-size="22">Proof boundary preserved</text>',
    ...wrapSvgText(warningLine, 58, 178, 20, 74, "#fde68a"),
    '      <text x="58" y="318" fill="#e5e7eb" font-size="20">No npm publication claim. No live REST validation claim.</text>',
    "    </g>",
    "  </g>",
    '  <rect x="58" y="436" width="844" height="34" rx="17" fill="#1f2937"/>',
    '  <rect x="58" y="436" width="278" height="34" rx="17" fill="#0ea5e9">',
    '    <animate attributeName="width" values="278;562;844;278" dur="8s" repeatCount="indefinite"/>',
    "  </rect>",
    '  <text x="58" y="496" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="16">Generated by npm run generate:animated-demo</text>',
    "</svg>",
    ""
  ].join("\n")}`;
}

function wrapSvgText(text, x, firstY, fontSize, maxLength, color) {
  return wrapLine(text, maxLength).map((line, index) => {
    const y = firstY + index * (fontSize + 8);
    return `      <text x="${x}" y="${y}" fill="${color}" font-size="${fontSize}">${escapeXml(line)}</text>`;
  });
}

function wrapLine(line, maxLength) {
  if (line.length <= maxLength) {
    return [line];
  }

  const chunks = [];
  let remaining = line;
  while (remaining.length > maxLength) {
    const breakAt = remaining.lastIndexOf(" ", maxLength);
    const index = breakAt > 0 ? breakAt : maxLength;
    chunks.push(remaining.slice(0, index));
    remaining = `  ${remaining.slice(index).trimStart()}`;
  }
  chunks.push(remaining);
  return chunks;
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
