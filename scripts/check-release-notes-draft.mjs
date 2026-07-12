#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];

const notes = await readText("docs/release-notes-v0.1.0-draft.md");
const benchmark = await readJson("docs/benchmark-zie619-report.json");
const tool = await readJson("tool.json");
const corePackage = await readJson("packages/core/package.json");
const cliPackage = await readJson("packages/cli/package.json");

expect(
  hasPhrase(
    notes,
    "Status: draft only. Do not publish, tag, or announce this release until the owner approves npm publication"
  ),
  "draft notes must preserve owner approval boundary"
);
expect(hasPhrase(notes, "Draft GitHub Release Notes - v0.1.0"), "draft notes must name the intended release");
expect(hasPhrase(notes, "`n8n-lint` v0.1.0 is the first n8nproof release"), "draft notes must include summary");
expect(
  hasPhrase(notes, "compact schema artifacts generated from n8n's own package metadata"),
  "draft notes must describe artifact-backed schema source"
);

for (const claim of tool.verifiedClaims) {
  expect(notes.includes(claim) || hasEquivalentClaim(notes, claim), `draft notes must cover verified claim: ${claim}`);
}

for (const nonClaim of tool.notClaimed) {
  expect(hasReleaseBoundary(notes, nonClaim), `draft notes must preserve non-claim: ${nonClaim}`);
}

expect(
  hasPhrase(notes, `bundled \`n8n-nodes-base@${defaultSchemaVersion()}\` metadata`),
  "draft notes must include default bundled schema version"
);
expect(hasPhrase(notes, "n8n-nodes-base@2.30.0"), "draft notes must include second matrix schema version");
expect(hasPhrase(notes, "npm run quality"), "draft notes must require full quality gate");
expect(hasPhrase(notes, "npm run smoke:pack"), "draft notes must mention packed smoke proof");
expect(hasPhrase(notes, "npm run check:pack"), "draft notes must mention package-content proof");
expect(hasPhrase(notes, "npm run check:release-readiness"), "draft notes must mention release-readiness proof");
expect(hasPhrase(notes, "npm run check:npm-registry-boundary"), "draft notes must mention npm registry boundary proof");
expect(hasPhrase(notes, "npm run check:release-notes"), "draft notes must mention this release-notes proof gate");
expect(
  hasPhrase(notes, "GitHub Discussion #8"),
  "draft notes must mention the live community support discussion proof"
);
expect(hasPhrase(notes, "docs/deep-audit-2026-07-11.md"), "draft notes must point to the current deep audit");
expect(hasPhrase(notes, "docs/release-checklist.md"), "draft notes must point to the owner-gated release checklist");
expect(
  hasPhrase(notes, "clean-machine registry install proof"),
  "draft notes must keep registry-backed npx gated until post-publish proof"
);

const benchmarkPhrases = [
  ["JSON files discovered", benchmark.totalJsonFiles],
  ["Workflow inputs checked", benchmark.total],
  ["Passed", benchmark.passed],
  ["Failed", benchmark.failed],
  ["Skipped non-workflow JSON", benchmark.skipped]
];

for (const [label, count] of benchmarkPhrases) {
  expect(hasPhrase(notes, `${label}: ${count.toLocaleString("en-US")}.`), `draft notes must include ${label}`);
}

expect(
  hasPhrase(
    notes,
    `${benchmark.total.toLocaleString("en-US")} workflow inputs, ${benchmark.passed.toLocaleString(
      "en-US"
    )} passed, ${benchmark.failed.toLocaleString("en-US")} failed, ${benchmark.skipped.toLocaleString("en-US")} skipped`
  ),
  "draft notes must include benchmark proof phrase"
);
expect(hasPhrase(notes, benchmark.benchmarkSource.commit), "draft notes must include the benchmark source commit");
expect(
  hasPhrase(notes, "The benchmark does not execute workflows and does not use live n8n REST validation."),
  "draft notes must preserve benchmark execution/live REST boundary"
);
expect(
  corePackage.version === cliPackage.version,
  "core and CLI package versions must match before release notes can be used"
);
expect(
  cliPackage.dependencies?.["@n8nproof/core"] === corePackage.version,
  "CLI package must depend on the exact core package version"
);
expect(hasPhrase(notes, "Publish `@n8nproof/core` first, then `n8n-lint`."), "draft notes must preserve publish order");

for (const forbidden of [
  "released today",
  "published to npm",
  "available on npm now",
  "live REST validation is supported",
  "executes workflows",
  "Marketplace listing is live"
]) {
  expect(!normalizeWhitespace(notes).toLowerCase().includes(forbidden), `draft notes must not claim: ${forbidden}`);
}

if (failures.length > 0) {
  throw new Error(`release-notes draft check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      notes: "docs/release-notes-v0.1.0-draft.md",
      release: "v0.1.0",
      packageVersions: {
        core: `${corePackage.name}@${corePackage.version}`,
        cli: `${cliPackage.name}@${cliPackage.version}`
      },
      benchmark: {
        source: benchmark.benchmark,
        sourceCommit: benchmark.benchmarkSource.commit,
        total: benchmark.total,
        passed: benchmark.passed,
        failed: benchmark.failed,
        skipped: benchmark.skipped
      },
      checked: [
        "owner-gated draft status",
        "substantive release summary",
        "verified claims",
        "current non-claims",
        "schema version facts",
        "quality and package proof commands",
        "npm registry boundary proof",
        "community and deep-audit proof links",
        "benchmark count reconciliation",
        "publish order and rollback boundaries"
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

function defaultSchemaVersion() {
  return "2.29.6";
}

function hasEquivalentClaim(text, claim) {
  const equivalents = {
    "workflow structure validation": "Validation for workflow shape",
    "bundled node type validation": "bundled node type names",
    "bundled credential type validation": "credential type names",
    "top-level node parameter validation": "top-level node parameters",
    "structured nested collection/fixedCollection/filter parameter-key validation":
      "structured nested collection/fixedCollection/filter parameter keys",
    "trigger graph/type-version validation": "trigger graph/type-version shape",
    "batch checks": "single-file and batch validation",
    "two-version bundled schema matrix": "pinned compatibility matrix artifact",
    "local badge generation": "Local status badges",
    "decaying last-verified badge generation": "decaying last-verified badges",
    "human-gated repair patches": "Conservative `repair` mode"
  };

  const equivalent = equivalents[claim];
  return typeof equivalent === "string" && hasPhrase(text, equivalent);
}

function hasReleaseBoundary(text, nonClaim) {
  const boundaries = {
    "npm registry publication": "Do not use these commands in public copy until npm publication",
    "live REST schema validation": "live REST schema validation",
    "workflow execution": "workflow execution",
    "hosted SaaS": "hosted SaaS",
    "GitHub Marketplace listing": "GitHub Marketplace listing"
  };

  const boundary = boundaries[nonClaim];
  return typeof boundary === "string" && hasPhrase(text, boundary);
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
