#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const writeMode = process.argv.includes("--write");
const assetPath = "docs/assets/readme-failure-demo.svg";
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

expect(result.status === 1, "failing demo command must exit with status 1");
expect(
  output.includes("FAIL examples/failing-dead-parameter.json"),
  "demo output must include the failing fixture path"
);
expect(output.includes("ERROR workflow.node_parameter_unknown"), "demo output must include the schema error code");
expect(output.includes("notARealParameter"), "demo output must include the dead parameter name");
expect(output.includes("not live REST validation"), "demo output must include the live REST boundary warning");

if (failures.length > 0) {
  throw new Error(`README demo check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

const expectedSvg = renderTerminalSvg([`$ node ${command.join(" ")}`, ...output.split("\n")]);

if (writeMode) {
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, expectedSvg, "utf8");
} else {
  const actualSvg = await readFile(assetPath, "utf8");
  if (actualSvg !== expectedSvg) {
    throw new Error(`README demo asset is stale. Run npm run generate:readme-demo and commit ${assetPath}.`);
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
        "checked SVG asset"
      ]
    },
    null,
    2
  )
);

function renderTerminalSvg(lines) {
  const wrappedLines = lines.flatMap((line) => wrapLine(line, 112));
  const width = 1040;
  const paddingX = 28;
  const firstLineY = 72;
  const lineHeight = 22;
  const height = firstLineY + wrappedLines.length * lineHeight + 28;

  const textRows = wrappedLines
    .map((line, index) => {
      const y = firstLineY + index * lineHeight;
      const color = colorForLine(line);
      return `  <text x="${paddingX}" y="${y}" fill="${color}" font-size="15">${escapeXml(line)}</text>`;
    })
    .join("\n");

  return `${[
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '  <title id="title">n8n-lint failure demo</title>',
    '  <desc id="desc">Actual n8n-lint CLI output for a workflow with a dead parameter.</desc>',
    '  <rect width="100%" height="100%" rx="14" fill="#0f172a"/>',
    '  <rect x="0" y="0" width="100%" height="42" rx="14" fill="#111827"/>',
    '  <circle cx="28" cy="22" r="6" fill="#ef4444"/>',
    '  <circle cx="48" cy="22" r="6" fill="#f59e0b"/>',
    '  <circle cx="68" cy="22" r="6" fill="#22c55e"/>',
    "  <g font-family=\"Consolas, Menlo, Monaco, 'Liberation Mono', monospace\">",
    '  <text x="92" y="27" fill="#94a3b8" font-size="13">verified CLI failure output</text>',
    textRows,
    "  </g>",
    "</svg>"
  ].join("\n")}\n`;
}

function colorForLine(line) {
  if (line.startsWith("$")) {
    return "#67e8f9";
  }

  if (line.startsWith("FAIL") || line.startsWith("ERROR")) {
    return "#f87171";
  }

  if (line.startsWith("WARNING") || line.startsWith("WARN")) {
    return "#facc15";
  }

  return "#e5e7eb";
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
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
