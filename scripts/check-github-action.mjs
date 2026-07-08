#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];
const packageJson = await readJson("package.json");
const tool = await readJson("tool.json");
const action = await readText("action.yml");
const ci = await readText(".github/workflows/ci.yml");
const readme = await readText("README.md");
const ciSetup = await readText("docs/ci-setup.md");
const deepAudit = await readText("docs/deep-audit-2026-07-08.md");

expect(
  packageJson.scripts?.["check:github-action"] === "node scripts/check-github-action.mjs",
  "package.json must expose check:github-action"
);
expect(
  typeof packageJson.scripts?.quality === "string" &&
    packageJson.scripts.quality.includes("npm run check:github-action"),
  "package.json quality gate must include check:github-action"
);

for (const phrase of [
  "name: n8n-lint",
  "description: Validate n8n workflow JSON with artifact-backed schema checks.",
  "author: She Runs Code",
  "paths:",
  "source:",
  "n8n-version:",
  "default: bundled-n8n-package",
  "default: 2.29.6",
  "using: composite",
  "npm ci",
  "npm run build",
  'read -r -a path_args <<< "$N8N_LINT_PATHS"',
  'check "${path_args[@]}" --source "$N8N_LINT_SOURCE" --n8n-version "$N8N_LINT_VERSION" --format github',
  'check "${path_args[@]}" --source "$N8N_LINT_SOURCE" --n8n-version "$N8N_LINT_VERSION" --json',
  'badge "$json_file" --kind last-verified',
  "status=${PIPESTATUS[0]}",
  "GITHUB_STEP_SUMMARY",
  "| Last verified badge | $badge_markdown |",
  "tail -n 200",
  'exit "$status"'
]) {
  expect(action.includes(phrase), `action.yml must include: ${phrase}`);
}

expect(!action.includes("check $N8N_LINT_PATHS"), "action.yml must not expand paths unquoted");
expect(
  ci.includes("- name: Dogfood GitHub Action") &&
    ci.includes("uses: ./") &&
    ci.includes("paths: examples/known-http-request-workflow.json"),
  "CI must dogfood the local composite action against the known workflow fixture"
);
expect(
  Array.isArray(tool.githubAction?.inputs) &&
    tool.githubAction.inputs.includes("paths") &&
    tool.githubAction.inputs.includes("source") &&
    tool.githubAction.inputs.includes("n8n-version"),
  "tool.json must describe GitHub Action inputs"
);
expect(tool.githubAction?.jobSummary === true, "tool.json must preserve job summary support");
expect(
  tool.githubAction?.lastVerifiedBadgeSummary === true,
  "tool.json must preserve last-verified badge job summary support"
);
expect(
  hasPhrase(tool.githubAction?.releaseBoundary ?? "", "GitHub Marketplace listing is not claimed"),
  "tool.json must preserve Marketplace non-claim for the action"
);

for (const phrase of [
  "Composite GitHub Action in `action.yml`, dogfooded by this repo's CI.",
  "GitHub Actions annotation output with `--format github` and action job",
  "Composite GitHub Action, with semver tags and Marketplace listing still"
]) {
  expect(hasPhrase(readme, phrase), `README must include action proof phrase: ${phrase}`);
}

for (const phrase of [
  "The repo ships a composite action at `action.yml`.",
  "The action writes a GitHub job summary",
  "decaying last-verified badge",
  "Marketplace listing and semver tag usage remain release gates.",
  "pin a commit SHA for external use"
]) {
  expect(hasPhrase(ciSetup, phrase), `CI setup doc must include: ${phrase}`);
}

for (const phrase of [
  "A composite GitHub Action exists at `action.yml`, writes a reviewer-facing job",
  "Composite GitHub Action path that runs `check --format github` and writes a",
  "last-verified badge",
  "npm run check:github-action"
]) {
  expect(hasPhrase(deepAudit, phrase), `deep audit must include action proof phrase: ${phrase}`);
}

if (failures.length > 0) {
  throw new Error(`GitHub Action check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "action metadata",
        "safe paths array expansion",
        "format github invocation",
        "last-verified badge summary",
        "job summary output",
        "CI dogfood step",
        "tool metadata",
        "Marketplace boundary"
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

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function hasPhrase(text, phrase) {
  return normalizeWhitespace(String(text)).includes(normalizeWhitespace(String(phrase)));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}
