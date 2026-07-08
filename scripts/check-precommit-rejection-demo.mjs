#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const writeMode = process.argv.includes("--write");
const assetPath = "docs/assets/precommit-rejection-demo.svg";
const repoRoot = process.cwd();
const hookDirectory = path.resolve(repoRoot, ".githooks").replaceAll("\\", "/");
const failures = [];

const demo = await runDemoCommit();
const plainOutput = stripAnsi(demo.output);

expect(demo.commit.status !== 0, "demo git commit must be rejected by the pre-commit hook");
expect(demo.head.status !== 0, "demo repository must not create a commit after hook rejection");
expect(plainOutput.includes("> quality"), "demo output must show npm running the quality script");
expect(
  plainOutput.includes("FAIL examples/failing-dead-parameter.json"),
  "demo output must include a failing workflow"
);
expect(plainOutput.includes("ERROR workflow.node_parameter_unknown"), "demo output must include the schema error code");
expect(plainOutput.includes("notARealParameter"), "demo output must include the dead parameter name");
expect(
  plainOutput.includes("pre-commit proof: git commit was rejected before history changed"),
  "demo output must include the rejection proof line"
);

if (failures.length > 0) {
  failures.push(`captured output:\n${demo.output}`);
  throw new Error(`pre-commit rejection demo check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

const expectedSvg = renderTerminalSvg([
  `$ git commit -m "demo failing workflow"`,
  ...normalizeLines(demo.output).split("\n"),
  "",
  "$ git rev-parse --verify HEAD",
  "fatal: Needed a single revision"
]);

if (writeMode) {
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, expectedSvg, "utf8");
} else {
  const actualSvg = await readFile(assetPath, "utf8");
  if (actualSvg !== expectedSvg) {
    throw new Error(
      `pre-commit rejection demo asset is stale. Run npm run generate:precommit-rejection-demo and commit ${assetPath}.`
    );
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      asset: assetPath,
      checked: [
        "real temporary git commit attempt",
        "real .githooks/pre-commit execution",
        "quality failure replayed to stderr",
        "commit rejected before history changed",
        "checked pre-commit rejection SVG asset"
      ]
    },
    null,
    2
  )
);

async function runDemoCommit() {
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "n8n-lint-precommit-demo-"));
  try {
    runGit(tempDirectory, ["init"]);
    runGit(tempDirectory, ["config", "user.name", "n8n-lint demo"]);
    runGit(tempDirectory, ["config", "user.email", "demo@sherunscode.com"]);
    runGit(tempDirectory, ["config", "core.hooksPath", hookDirectory]);

    await writeFile(
      path.join(tempDirectory, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          type: "module",
          scripts: {
            quality: "node quality-fail.mjs"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    await writeFile(path.join(tempDirectory, "workflow.json"), `${JSON.stringify({ nodes: [] }, null, 2)}\n`, "utf8");
    await writeFile(
      path.join(tempDirectory, "quality-fail.mjs"),
      [
        'console.error("\\u001B[31mFAIL\\u001B[0m examples/failing-dead-parameter.json");',
        'console.error("Schema source: bundled-n8n-package");',
        'console.error("\\u001B[31mERROR\\u001B[0m workflow.node_parameter_unknown $.nodes[0].parameters.notARealParameter: Unknown or dead parameter \\"notARealParameter\\".");',
        'console.error("\\u001B[33mWARNING\\u001B[0m schema_source.warning $: Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation.");',
        'console.error("pre-commit proof: git commit was rejected before history changed");',
        "process.exit(17);",
        ""
      ].join("\n"),
      "utf8"
    );

    runGit(tempDirectory, ["add", "package.json", "quality-fail.mjs", "workflow.json"]);
    const commit = runGit(tempDirectory, ["commit", "-m", "demo failing workflow"]);
    const head = runGit(tempDirectory, ["rev-parse", "--verify", "HEAD"]);
    return {
      commit,
      head,
      output: [commit.stdout, commit.stderr].filter(Boolean).join("\n")
    };
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function runGit(cwd, args) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      FORCE_COLOR: "1"
    }
  });
}

function renderTerminalSvg(lines) {
  const wrappedLines = lines.flatMap((line) => wrapLine(line, 108));
  const width = 1120;
  const paddingX = 28;
  const firstLineY = 78;
  const lineHeight = 22;
  const height = firstLineY + wrappedLines.length * lineHeight + 30;

  const rows = wrappedLines
    .map((line, index) => {
      const y = firstLineY + index * lineHeight;
      return `  <text x="${paddingX}" y="${y}" fill="${colorForLine(line)}" font-size="15">${escapeXml(
        stripAnsi(line)
      )}</text>`;
    })
    .join("\n");

  return `${[
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '  <title id="title">n8n-lint pre-commit rejection proof</title>',
    '  <desc id="desc">Generated from a real temporary Git commit rejected by the n8n-lint pre-commit hook.</desc>',
    '  <rect width="100%" height="100%" rx="14" fill="#0f172a"/>',
    '  <rect x="0" y="0" width="100%" height="44" rx="14" fill="#111827"/>',
    '  <circle cx="28" cy="23" r="6" fill="#ef4444"/>',
    '  <circle cx="48" cy="23" r="6" fill="#f59e0b"/>',
    '  <circle cx="68" cy="23" r="6" fill="#22c55e"/>',
    '  <text x="92" y="29" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="13">real git commit rejected by pre-commit hook</text>',
    "  <g font-family=\"Consolas, Menlo, Monaco, 'Liberation Mono', monospace\">",
    rows,
    "  </g>",
    "</svg>",
    ""
  ].join("\n")}`;
}

function colorForLine(line) {
  const stripped = stripAnsi(line).trimStart();
  if (stripped.startsWith("$")) {
    return "#67e8f9";
  }

  if (stripped.startsWith("FAIL") || stripped.startsWith("ERROR") || stripped.startsWith("fatal:")) {
    return "#f87171";
  }

  if (stripped.startsWith("WARNING") || stripped.includes("pre-commit proof:")) {
    return "#facc15";
  }

  return "#e5e7eb";
}

function wrapLine(line, maxLength) {
  const stripped = stripAnsi(line);
  if (stripped.length <= maxLength) {
    return [line];
  }

  const chunks = [];
  let remaining = stripped;
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

function stripAnsi(text) {
  return text.replace(/\u001B\[[0-9;]*m/g, "");
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
