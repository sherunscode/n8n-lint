#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const failures = [];
const packageJson = await readJson("package.json");
const tool = await readJson("tool.json");
const action = await readText("action.yml");
const actionSource = await readText("packages/action/src/index.ts");
const ci = await readText(".github/workflows/ci.yml");
const qualityRunner = await readText("scripts/run-quality-group.mjs");

expect(packageJson.scripts?.["check:github-action"] === "node scripts/check-github-action.mjs", "check script exposed");
expect(qualityRunner.includes('"check:github-action"'), "local quality group includes action contract");

for (const phrase of [
  "name: n8n-lint",
  "description: Validate n8n workflow JSON with artifact-backed schema checks.",
  "author: She Runs Code",
  "paths:",
  "source:",
  "n8n-version:",
  "default: bundled-n8n-package",
  "default: 2.29.6",
  "using: node24",
  "main: action-dist/index.js",
  "icon: shield",
  "color: green"
])
  expect(action.includes(phrase), `action.yml must include: ${phrase}`);

for (const forbidden of ["using: composite", "npm ci", "npm run build", "actions/setup-node", "shell: bash"]) {
  expect(!action.includes(forbidden), `action.yml must not require consumer runtime work: ${forbidden}`);
}

for (const phrase of [
  'readInput("PATHS")',
  'readInput("SOURCE")',
  'readInput("N8N-VERSION")',
  '"--json"',
  "emitAnnotations(payload)",
  "writeSummary(payload",
  "GITHUB_STEP_SUMMARY",
  "maxBuffer: 32 * 1024 * 1024",
  "escapeProperty",
  "escapeData"
])
  expect(actionSource.includes(phrase), `action runtime must include: ${phrase}`);

expect((actionSource.match(/"check"/g) ?? []).length === 1, "action runtime must execute validation exactly once");
expect(!actionSource.includes("npm"), "action runtime must not invoke npm");

for (const phrase of [
  "ubuntu-latest",
  "windows-latest",
  "macos-latest",
  "node-version: 22",
  "node: [22, 24]",
  "uses: ./",
  "name: action-smoke"
])
  expect(ci.includes(phrase), `CI must include: ${phrase}`);

expect(
  Array.isArray(tool.githubAction?.inputs) &&
    ["paths", "source", "n8n-version"].every((value) => tool.githubAction.inputs.includes(value)),
  "tool metadata inputs"
);
expect(tool.githubAction?.jobSummary === true, "tool metadata job summary");
expect(tool.githubAction?.lastVerifiedBadgeSummary === true, "tool metadata badge summary");

for (const file of [
  "action-dist/index.js",
  "action-dist/manifest.json",
  "action-dist/cli/bin.js",
  "action-dist/node_modules/@n8nproof/core/dist/index.js",
  "action-dist/node_modules/@n8nproof/core/schema/bundled-n8n-package.json"
])
  await expectFile(file);

if (failures.length > 0)
  throw new Error(`GitHub Action check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "packaged node24 action",
        "zero consumer install/build",
        "single validation pass",
        "annotation and summary escaping",
        "cross-platform action smoke",
        "committed runtime artifacts"
      ]
    },
    null,
    2
  )
);

async function expectFile(filePath) {
  try {
    await access(filePath);
  } catch {
    failures.push(`${filePath} must exist`);
  }
}
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
async function readText(filePath) {
  return readFile(filePath, "utf8");
}
function expect(condition, message) {
  if (!condition) failures.push(message);
}
