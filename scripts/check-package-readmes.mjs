#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];

const packageJson = await readJson("package.json");
const corePackage = await readJson("packages/core/package.json");
const cliPackage = await readJson("packages/cli/package.json");
const tool = await readJson("tool.json");
const rootReadme = await readText("README.md");
const coreReadme = await readText("packages/core/README.md");
const cliReadme = await readText("packages/cli/README.md");

expect(
  packageJson.scripts?.["check:package-readmes"] === "node scripts/check-package-readmes.mjs",
  "package.json must expose the package README checker"
);
expect(
  typeof packageJson.scripts?.quality === "string" &&
    packageJson.scripts.quality.includes("npm run check:package-readmes"),
  "quality must include the package README checker"
);
expect(corePackage.name === "@n8nproof/core", "core package name must stay @n8nproof/core");
expect(cliPackage.name === "n8n-lint", "CLI package name must stay n8n-lint");
expect(tool.name === cliPackage.name, "tool name must match CLI package name");

for (const [label, text] of [
  ["packages/core/README.md", coreReadme],
  ["packages/cli/README.md", cliReadme]
]) {
  for (const phrase of [
    "Current repository state: this package is not published to npm yet.",
    "repository source checkout",
    "packed local tarball smoke path",
    "owner-approved npm release",
    "clean-machine registry proof",
    "does not execute workflows",
    "does not claim live REST validation"
  ]) {
    expect(hasPhrase(text, phrase), `${label} must preserve package README boundary phrase: ${phrase}`);
  }

  for (const forbidden of [
    "live REST validation is supported",
    "executes workflows",
    "available on npm today",
    "is published to npm",
    "published to npm today",
    "GitHub Marketplace listing is live"
  ]) {
    expect(!hasPhrase(text, forbidden), `${label} must not include unsupported package README claim: ${forbidden}`);
  }
}

for (const phrase of [
  "# @n8nproof/core",
  "Core validation library used by `n8n-lint`.",
  "checked-in compact n8n schema artifacts",
  "workflow JSON structure",
  "node type names",
  "credential type names",
  "top-level node parameter names",
  "structured nested collection/fixedCollection/filter parameter keys",
  "trigger graph/type-version shape",
  "`n8n-nodes-base@2.29.6`",
  "`n8n-nodes-base@2.30.0`",
  "schema/bundled-n8n-package-config.json",
  "After owner-approved npm publication, install the CLI package for normal use:",
  "npm install n8n-lint",
  "See the repository README for current supported commands, release gates, and scope boundaries."
]) {
  expect(hasPhrase(coreReadme, phrase), `core package README must include: ${phrase}`);
}

for (const phrase of [
  "# n8n-lint",
  "Validate n8n workflow JSON before it reaches production.",
  "n8n-lint check workflow.json",
  "n8n-lint check workflow.json --format github",
  'n8n-lint check workflows/ "examples/*.json"',
  "n8n-lint check workflow.json --n8n-version=matrix",
  "n8n-lint repair workflow.json --output fix.patch",
  "n8n-lint badge n8n-lint-result.json --format svg --output badge.svg",
  "n8n-lint badge n8n-lint-result.json --kind last-verified",
  "bundled `n8n-nodes-base@2.29.6` compact schema artifact",
  "GitHub Actions annotations",
  "action job summaries",
  "batch checks",
  "pinned two-version schema matrix",
  "local pass/fail badge output",
  "decaying last-verified badge output",
  "Repair mode is diff-only by default",
  "requires both `--apply` and `--confirm`",
  "semver tag usage and Marketplace listing remain release-gated"
]) {
  expect(hasPhrase(cliReadme, phrase), `CLI package README must include: ${phrase}`);
}

expect(
  hasPhrase(rootReadme, "`npm run check:package-readmes` proves the package README files"),
  "root README must document the package README checker"
);

if (failures.length > 0) {
  throw new Error(`package README check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "core package README metadata and boundaries",
        "CLI package README commands and boundaries",
        "pre-publication install boundary",
        "no workflow execution claim",
        "no live REST validation claim",
        "root README checker documentation"
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
