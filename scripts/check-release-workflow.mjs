#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];

const packageJson = await readJson("package.json");
const workflow = await readText(".github/workflows/release.yml");
const readme = await readText("README.md");
const ciSetup = await readText("docs/ci-setup.md");
const releaseChecklist = await readText("docs/release-checklist.md");
const releaseCommandPlan = await readText("docs/release-command-plan-v0.1.0.md");
const deepAudit = await readText("docs/deep-audit-2026-07-11.md");
const qualityRunner = await readText("scripts/run-quality-group.mjs");

expect(
  packageJson.scripts?.["check:release-workflow"] === "node scripts/check-release-workflow.mjs",
  "package.json must expose the release workflow checker"
);
expect(
  packageJson.scripts?.quality === "node scripts/run-quality-group.mjs quality" &&
    qualityRunner.includes('"check:release-workflow"'),
  "quality must include the release workflow checker"
);

for (const phrase of [
  "name: Release Proof",
  "workflow_dispatch:",
  "branches:",
  "- main",
  "permissions:",
  "contents: read",
  "discussions: read",
  "name: Release proof",
  "runs-on: ubuntu-latest",
  "actions/checkout@v7.0.0",
  "actions/setup-node@v6.4.0",
  "node-version: 24",
  "cache: npm",
  "npm ci",
  "GITHUB_TOKEN: ${{ github.token }}",
  "npm run quality:release",
  "npm run check:npm-registry-boundary",
  "npm run check:release-readiness",
  "npm run check:release-notes",
  "npm run check:release-command-plan",
  "npm run check:release-workflow",
  "npm pack --workspace packages/core --dry-run",
  "npm pack --workspace packages/cli --dry-run",
  "mkdir -p release-artifacts",
  "npm pack --workspace packages/core --pack-destination release-artifacts",
  "npm pack --workspace packages/cli --pack-destination release-artifacts",
  "node scripts/write-release-artifact-manifest.mjs release-artifacts",
  "actions/upload-artifact@v7.0.1",
  "name: n8n-lint-release-proof-packages",
  "path: |",
  "release-artifacts/*.tgz",
  "release-artifacts/release-artifact-manifest.json",
  "if-no-files-found: error"
]) {
  expect(workflow.includes(phrase), `release workflow must include: ${phrase}`);
}

for (const forbidden of [
  "NPM_TOKEN",
  "secrets.NPM_TOKEN",
  "npm publish",
  "npm config",
  "git tag",
  "git push",
  "gh release create",
  "contents: write",
  "packages: write",
  "id-token: write",
  "--provenance"
]) {
  expect(!workflow.includes(forbidden), `release workflow must not include unsafe publish path: ${forbidden}`);
}

for (const phrase of [
  "Release proof workflow: `.github/workflows/release.yml` runs quality, release contract checks, package dry-runs, and local tarball artifact upload without npm publish, tag push, or GitHub Release creation.",
  "`npm run check:release-workflow` proves the release proof workflow stays a read-only packaging gate and cannot publish, push tags, request npm tokens, or create GitHub Releases."
]) {
  expect(hasPhrase(readme, phrase), `README must document release workflow phrase: ${phrase}`);
}

for (const phrase of [
  "The release proof workflow is `.github/workflows/release.yml`.",
  "It runs on manual dispatch and `main` pushes.",
  "It runs `npm run quality:release`, the release contract checks, package dry-runs, and uploads local tarball artifacts.",
  "It does not request `NPM_TOKEN`, does not use write permissions, does not run `npm publish`, does not push tags, and does not create a GitHub Release.",
  "Actual npm publication, tag push, GitHub Release creation, and public launch posts remain owner-gated."
]) {
  expect(hasPhrase(ciSetup, phrase), `CI setup doc must document release workflow phrase: ${phrase}`);
}

for (const phrase of [
  "Run `npm run check:release-workflow` before publish approval.",
  "The release proof workflow in `.github/workflows/release.yml` may package and upload local tarballs, but it must not publish to npm, push tags, or create GitHub Releases.",
  "Actual npm publish, tag push, GitHub Release creation, and public posting still require owner approval."
]) {
  expect(hasPhrase(releaseChecklist, phrase), `release checklist must document release workflow phrase: ${phrase}`);
}

for (const phrase of [
  "npm run check:release-workflow",
  "gh workflow run release.yml --repo sherunscode/n8n-lint --ref main",
  "The release proof workflow must complete without write permissions, npm tokens, npm publish, tag push, or GitHub Release creation."
]) {
  expect(hasPhrase(releaseCommandPlan, phrase), `release command plan must include release workflow phrase: ${phrase}`);
}

for (const phrase of [
  "`npm run check:release-workflow` now enforces `.github/workflows/release.yml` as a read-only release proof workflow",
  "package dry-runs, local tarball artifact upload, no npm token, no npm publish, no tag push, and no GitHub Release creation",
  "`check:release-workflow`"
]) {
  expect(hasPhrase(deepAudit, phrase), `deep audit must include release workflow phrase: ${phrase}`);
}

if (failures.length > 0) {
  throw new Error(`release workflow check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      workflow: ".github/workflows/release.yml",
      checked: [
        "manual dispatch trigger",
        "main proof trigger",
        "read-only permissions",
        "quality gate",
        "release contract checks",
        "package dry-runs",
        "local tarball artifact upload",
        "release artifact manifest upload",
        "no npm token",
        "no npm publish",
        "no tag push",
        "no GitHub Release creation"
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
  return normalizeWhitespace(text).includes(normalizeWhitespace(phrase));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}
