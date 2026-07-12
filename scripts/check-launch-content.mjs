#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];
const packageJson = await readJson("package.json");
const qualityRunner = await readText("scripts/run-quality-group.mjs");
const tool = await readJson("tool.json");
const benchmark = await readJson("docs/benchmark-zie619-report.json");
const launchContentPack = await readText("docs/launch-content-pack.md");
const launchDrafts = await readText("docs/launch-drafts.md");
const readme = await readText("README.md");

expect(
  packageJson.scripts?.["check:launch-content"] === "node scripts/check-launch-content.mjs",
  "package.json must expose check:launch-content"
);
expect(
  packageJson.scripts?.quality === "node scripts/run-quality-group.mjs quality" &&
    qualityRunner.includes('"check:launch-content"'),
  "package.json quality gate must include check:launch-content"
);

expect(tool.repository === "https://github.com/sherunscode/n8n-lint", "tool.json must preserve canonical repo");
for (const notClaimed of [
  "npm registry publication",
  "live REST schema validation",
  "workflow execution",
  "hosted SaaS",
  "GitHub Marketplace listing"
]) {
  expect(
    Array.isArray(tool.notClaimed) && tool.notClaimed.includes(notClaimed),
    `tool.json must preserve non-claim: ${notClaimed}`
  );
  expect(hasPhrase(launchContentPack, notClaimed), `launch content pack must mention non-claim: ${notClaimed}`);
}

for (const phrase of [
  "Do not post to X, GitHub Releases, npm, or any external channel without owner approval.",
  "Do not claim npm publication, registry-backed `npx` usage, live REST schema validation, workflow execution, or public benchmark availability until those claims are true in public artifacts.",
  "No fake stars, fake followers, bought engagement, bots, spam, or misleading authorship.",
  "Use the README badge or Actions tab to verify the latest public `main` quality run before posting.",
  "Do not rely on a static run ID in launch copy; re-check after every pushed commit.",
  "Use `docs/assets/social-preview.svg` and `docs/assets/social-preview.png` only after `npm run check:social-preview`",
  "Use `docs/assets/animated-failure-demo.svg` only after `npm run check:animated-demo`",
  "Use `docs/assets/terminal-output-demo.svg` only after `npm run check:terminal-output-demo`",
  "Use `docs/assets/precommit-rejection-demo.svg` only after `npm run check:precommit-rejection-demo`",
  "Use `docs/assets/matrix-compatibility-demo.svg` only after `npm run check:matrix-demo`",
  "Use `docs/assets/matrix-compatibility-demo.gif` only after `npm run check:matrix-gif`",
  "Use `docs/assets/benchmark-dashboard.svg` only after `npm run check:benchmark-dashboard`",
  "Use `docs/assets/batch-benchmark-output.svg` only after `npm run check:batch-benchmark-output`",
  "Use `docs/assets/github-pr-merge-gate-proof.png` only after `npm run check:github-pr-gate-proof`",
  "Run `npm run check:benchmark-report` before publishing benchmark-number claims.",
  "npm run check:npm-registry-boundary",
  "Do not mention stars, followers, installs, traffic, or engagement unless a current source is attached.",
  "Run `npm run check:launch-content` before approving any launch copy changes."
]) {
  expect(hasPhrase(launchContentPack, phrase), `launch content pack must include: ${phrase}`);
}

for (const evidenceId of [
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
  "E6",
  "E7",
  "E8",
  "E9",
  "E9A",
  "E9B",
  "E9C",
  "E10",
  "E11",
  "E12",
  "E13",
  "E14",
  "E15",
  "E16",
  "E17",
  "E18",
  "E19"
]) {
  expect(
    new RegExp(`\\| ${evidenceId}\\s+\\|`).test(launchContentPack),
    `launch content pack must include ${evidenceId}`
  );
}

expect(
  countMatches(launchContentPack, /^Claim map:/gm) >= 3,
  "launch content pack must keep claim maps for each external copy block"
);
expect(
  countMatches(launchContentPack, /^Postability: ready after owner approval/gm) >= 3,
  "launch content pack must keep owner approval gates on postable drafts"
);

const benchmarkPhrases = [
  `${formatNumber(benchmark.totalJsonFiles)} JSON files`,
  `${formatNumber(benchmark.total)} workflow inputs`,
  `${formatNumber(benchmark.passed)} passed`,
  `${formatNumber(benchmark.failed)} failed`,
  `${formatNumber(benchmark.skipped)} skipped`,
  benchmark.benchmarkSource?.commit,
  benchmark.n8nLintSource?.commit,
  benchmark.n8nLintSource?.remote,
  "https://github.com/sherunscode/n8n-lint/blob/main/docs/benchmark-zie619-report.md"
].filter(Boolean);

for (const phrase of benchmarkPhrases) {
  expect(hasPhrase(launchContentPack, phrase), `launch content pack must include benchmark proof: ${phrase}`);
}

for (const phrase of [
  "These drafts are not posted.",
  "Do not add npm install claims until `n8n-lint` is published",
  "Every public number comes from a reproducible run.",
  "It does not execute workflows or claim live REST validation yet.",
  "not a hosted SaaS, dashboard, marketplace, MCP server, or fake star play",
  "https://github.com/sherunscode/n8n-lint"
]) {
  expect(hasPhrase(launchDrafts, phrase), `launch drafts must include: ${phrase}`);
}

for (const phrase of [
  `${formatNumber(benchmark.total)} workflow inputs checked`,
  `${formatNumber(benchmark.passed)} passed`,
  `${formatNumber(benchmark.failed)} failed`,
  `${formatNumber(benchmark.skipped)} non-workflow JSON files`
]) {
  expect(hasPhrase(launchDrafts, phrase), `launch drafts must match benchmark proof: ${phrase}`);
}

for (const forbidden of [
  "npm install n8n-lint",
  "npm i n8n-lint",
  "npx n8n-lint check",
  "live REST validation is supported",
  "executes workflows",
  "buy stars",
  "buy followers"
]) {
  expect(
    !hasPhrase(launchContentPack, forbidden),
    `launch content pack must not include unsupported claim: ${forbidden}`
  );
  expect(!hasPhrase(launchDrafts, forbidden), `launch drafts must not include unsupported claim: ${forbidden}`);
}

expect(
  hasPhrase(readme, "Not claimed yet: npm registry install, live REST schema validation, workflow execution"),
  "README must keep launch content anchored to current public boundaries"
);

if (failures.length > 0) {
  throw new Error(`launch content check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "owner approval gates",
        "real-growth rule",
        "benchmark count alignment",
        "claim maps",
        "tool non-claims",
        "unsupported claim scan",
        "asset freshness prerequisites"
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
  return normalizeWhitespace(text).includes(normalizeWhitespace(String(phrase)));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}
