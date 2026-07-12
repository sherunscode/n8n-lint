#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];

const packageJson = await readJson("package.json");
const corePackage = await readJson("packages/core/package.json");
const cliPackage = await readJson("packages/cli/package.json");
const tool = await readJson("tool.json");
const plan = await readText("docs/release-command-plan-v0.1.0.md");
const releaseChecklist = await readText("docs/release-checklist.md");
const releaseReadiness = await readText("scripts/check-release-readiness.mjs");
const readme = await readText("README.md");
const qualityRunner = await readText("scripts/run-quality-group.mjs");

expect(corePackage.name === "@n8nproof/core", "release plan expects @n8nproof/core package");
expect(cliPackage.name === "n8n-lint", "release plan expects n8n-lint package");
expect(cliPackage.dependencies?.["@n8nproof/core"] === corePackage.version, "CLI must depend on exact core version");
expect(tool.version === cliPackage.version, "tool.json version must match CLI package version");
expect(
  packageJson.scripts?.["check:release-command-plan"] === "node scripts/check-release-command-plan.mjs",
  "package.json must expose the release command plan checker"
);
expect(
  packageJson.scripts?.["check:npm-registry-boundary"] === "node scripts/check-npm-registry-boundary.mjs",
  "package.json must expose the npm registry boundary checker"
);
expect(
  packageJson.scripts?.quality === "node scripts/run-quality-group.mjs quality" &&
    qualityRunner.includes('"check:release-command-plan"'),
  "quality must include the release command plan checker"
);

for (const phrase of [
  "Status: dry-run command contract only.",
  "This plan does not grant permission to publish, tag, create a GitHub Release, or post launch copy.",
  "Planned first public version: `0.1.0`.",
  "Planned tag: `v0.1.0`.",
  "Push only the single approved tag with `git push origin v0.1.0`.",
  "Owner approval for the exact release version is missing.",
  "Local `HEAD` does not equal `origin/main` before publish.",
  "The latest required GitHub `quality` check is not green for the exact commit.",
  "`npm view @n8nproof/core version` or `npm view n8n-lint version` returns an existing version before the first public publish attempt.",
  "Do not print tokens, npm config values, environment variables, cookies, or secret file contents.",
  "Do not update README with registry-backed `npx` instructions until this smoke passes.",
  "The release proof workflow must complete without write permissions, npm tokens, npm publish, tag push, or GitHub Release creation.",
  "Inspect `release-artifact-manifest.json` before owner-approved publish.",
  "The manifest must list both tarballs, byte sizes, and SHA-256 hashes.",
  "The tag must point to the same commit that passed final pre-publish `quality` and CodeQL checks.",
  "Remove `npm registry publication` from `tool.json.notClaimed` only after the registry package and clean-machine smoke are verified.",
  "Prefer a patch release over unpublish."
]) {
  expect(hasPhrase(plan, phrase), `release command plan must include: ${phrase}`);
}

for (const command of [
  "git fetch origin",
  "git status --short --branch",
  "git rev-parse HEAD",
  "git rev-parse origin/main",
  "gh run list --repo sherunscode/n8n-lint --branch main",
  "npm view @n8nproof/core version",
  "npm view n8n-lint version",
  "npm ci",
  "npm run quality:release",
  "npm run check:npm-registry-boundary",
  "npm run check:release-readiness",
  "npm run check:release-notes",
  "npm run check:release-command-plan",
  "npm run check:release-workflow",
  "npm run check:release-artifact-manifest",
  "npm run smoke:pack",
  "npm pack --workspace packages/core --dry-run",
  "npm pack --workspace packages/cli --dry-run",
  "gh workflow run release.yml --repo sherunscode/n8n-lint --ref main",
  "npm whoami",
  "npm publish --workspace packages/core --access public",
  "npm publish --workspace packages/cli",
  "npm view @n8nproof/core@0.1.0 version",
  "npm view n8n-lint@0.1.0 version",
  "npm install n8n-lint@0.1.0",
  "npx n8n-lint check workflow.json",
  "git tag v0.1.0",
  "git push origin v0.1.0",
  "gh release create v0.1.0",
  "gh release view v0.1.0"
]) {
  expect(plan.includes(command), `release command plan must include command: ${command}`);
}

for (const forbiddenCommand of [
  "git push --tags",
  "git tag -f v0.1.0",
  "git push --force",
  "npm config list",
  "npm config get //registry.npmjs.org/:_authToken",
  "gh release delete v0.1.0"
]) {
  expect(
    plan.includes(forbiddenCommand),
    `release command plan must explicitly forbid unsafe command: ${forbiddenCommand}`
  );
}

expect(
  countOccurrences(plan, "git push --tags") === 1,
  "git push --tags must appear only in the forbidden command list"
);
expect(
  countOccurrences(plan, "git push --force") === 1,
  "git push --force must appear only in the forbidden command list"
);
expect(
  countOccurrences(plan, "npm config list") === 1,
  "npm config list must appear only in the forbidden command list"
);
expect(!plan.includes("npm publish --force"), "release command plan must not use force publish");
expect(!plan.includes("gh release create --draft=false"), "release command plan should not hide release state flags");

expect(
  hasPhrase(releaseChecklist, "Run `npm run check:release-command-plan` before publish approval."),
  "release checklist must point at the release command plan checker"
);
expect(
  hasPhrase(releaseChecklist, "Run `npm run check:release-workflow` before publish approval."),
  "release checklist must point at the release workflow checker"
);
expect(
  hasPhrase(releaseChecklist, "npm run check:release-artifact-manifest"),
  "release checklist must point at the release artifact manifest checker"
);
expect(
  hasPhrase(releaseChecklist, "Run `npm run check:npm-registry-boundary` before publish approval."),
  "release checklist must point at the npm registry boundary checker"
);
expect(
  releaseReadiness.includes("docs/release-command-plan-v0.1.0.md") &&
    releaseReadiness.includes("check:release-command-plan"),
  "release-readiness checker must load and enforce the release command plan"
);
expect(
  hasPhrase(readme, "`npm run check:release-command-plan` proves the owner-gated publish/tag/release command path"),
  "README must document the release command plan checker"
);

if (failures.length > 0) {
  throw new Error(`release command plan check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      plan: "docs/release-command-plan-v0.1.0.md",
      plannedVersion: "0.1.0",
      currentPackageVersion: cliPackage.version,
      checked: [
        "owner-gated dry-run status",
        "package order",
        "public state preflight commands",
        "version PR mutation allowlist",
        "final pre-publish quality commands",
        "owner-approved npm publish commands",
        "clean-machine registry smoke commands",
        "single-tag GitHub Release commands",
        "forbidden unsafe command list",
        "post-release documentation boundary",
        "rollback commands"
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

function countOccurrences(text, pattern) {
  return text.split(pattern).length - 1;
}
