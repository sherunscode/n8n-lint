#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];

const packageJson = await readJson("package.json");
const strategyPath = process.env.N8N_LINT_STRATEGY_PATH ?? "STRATEGY.md";
const strategy = await readOptionalText(strategyPath);
const gitignore = await readText(".gitignore");
const deepAudit = await readText("docs/deep-audit-2026-07-08.md");
const readme = await readText("README.md");

expect(
  packageJson.scripts?.["check:strategy-checklist"] === "node scripts/check-strategy-checklist.mjs",
  "package.json must expose check:strategy-checklist"
);
expect(
  typeof packageJson.scripts?.quality === "string" &&
    packageJson.scripts.quality.includes("npm run check:strategy-checklist"),
  "package.json quality gate must include check:strategy-checklist"
);
expect(
  gitignore.includes("STRATEGY.md") && gitignore.includes("RESEARCH.md"),
  ".gitignore must keep local strategy/research artifacts out of the public repo"
);

if (strategy === undefined) {
  expect(
    process.env.GITHUB_ACTIONS === "true" || process.env.N8N_LINT_STRATEGY_PATH !== undefined,
    "STRATEGY.md is absent outside CI/test; restore the local strategy file or set N8N_LINT_STRATEGY_PATH"
  );
} else {
  for (const phrase of [
    "Checked README demo, animated SVG demo, and social preview assets captured from real CLI/benchmark output",
    "CLI exits with correct non-zero exit codes on implemented local failure modes",
    "Full TypeScript strict mode",
    "Automated test suite covers bundled schema loading",
    "Test suite runs a pinned bundled matrix",
    "Fallback path implemented and tested",
    "Runtime and generator n8n schema-version selection is centralized",
    "npm audit --omit=dev --audit-level=high",
    "Package size sanity check",
    "Lint (`eslint`) and format (`prettier`) both run clean",
    "README loads and renders correctly on GitHub",
    "README opens with a one-paragraph",
    "README states in the first screen what n8n-lint does NOT do",
    "Source-checkout and packed-tarball first-run commands",
    "CLI `--help` output is documented",
    "Dedicated `SECURITY.md` exists",
    "`CONTRIBUTING.md` exists",
    "LICENSE file present",
    "Every shipped CLI flag and output option is documented",
    "CHANGELOG.md exists",
    "Error messages name the exact node path",
    "CLI output uses consistent color semantics",
    "Exit summary (X passed, Y failed, Z warnings)",
    "`--json` output mode exists",
    "GitHub Action produces a readable PR-check summary",
    "Pre-commit hook output is quiet on success",
    'decaying "last verified',
    "Naming is consistent end-to-end",
    "README has a checked real failing validation demo",
    "Terminal output: full color pass",
    "Pre-commit hook rejecting",
    "Video or GIF demonstrates the multi-version matrix result",
    "Benchmark dashboard: bar chart",
    "`n8n-lint check-dir` batch output on a full template repo",
    "Demo SVG assets are tiny",
    "README badge states",
    "At least one example `workflow.json` fixture is committed",
    "GitHub Action demo path exists through `/examples`",
    "All demo assets are hosted in-repo",
    "Architecture diagram",
    "Demo commands and checked assets are re-verified",
    "Screenshot of the GitHub PR merge-gate",
    "GitHub Action check run in a PR",
    "n8n API key material is never logged",
    "API keys are not accepted as bare CLI arguments",
    "`.gitignore` explicitly excludes local config/credentials/log file patterns",
    "README and SECURITY.md explicitly document",
    "Threat-modeled and documented",
    "GitHub Action documentation shows storing the n8n API key",
    "No credential values",
    "Dependency supply chain checked",
    "Synthetic trigger firing is outside this MVP",
    "Issue templates exist",
    "PR template exists",
    "CODE_OF_CONDUCT.md present",
    "`good first issue` label exists",
    "GitHub Discussions or an equivalent",
    "Response SLA is self-imposed",
    "Repo topics/tags set on GitHub",
    "No placeholder content anywhere",
    "Commit history tells a real story",
    "`git log --oneline` reviewed",
    "README includes an explicit",
    "Architecture/design rationale documented",
    "GitHub profile README or pinned-repos section",
    "No inconsistent authorship",
    "At least one written technical postmortem",
    "Benchmark run completed against Zie619/n8n-workflows",
    "Benchmark methodology documented",
    "Cross-checked against every",
    "Launch post drafted for each target channel",
    "Rollback/support plan exists"
  ]) {
    expectCheckbox(phrase, true);
  }

  for (const phrase of [
    "`npx n8n-lint check workflow.json` works on a clean machine",
    "Tool fails closed on TLS/certificate errors",
    "Social preview image configured in repo settings",
    "Release notes on GitHub Releases",
    "npm package published and installable exactly as documented",
    "GitHub Action published to the GitHub Marketplace",
    "Version tagged as a real semver release",
    "Someone other than the founder",
    "Final check: does the repo, cold",
    "npm package published under `n8n-lint`",
    "Submit to: n8n community forum",
    "Post-launch: monitor issues"
  ]) {
    expectCheckbox(phrase, false);
  }
}

for (const phrase of [
  "strategy checklist reconciliation",
  "remaining unchecked checklist boxes are owner-gated, external UI proof, or future live REST/release gates"
]) {
  expect(hasPhrase(deepAudit, phrase), `deep audit must mention strategy checklist proof: ${phrase}`);
}

expect(
  hasPhrase(readme, "`npm run check:strategy-checklist` checks the local strategy checklist when present"),
  "README must describe the strategy checklist gate"
);

if (failures.length > 0) {
  throw new Error(`strategy checklist check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      strategyPath,
      localStrategyStatus: strategy === undefined ? "absent" : "checked",
      checked: [
        "local strategy privacy boundary",
        "launch checklist reconciliation",
        "repo quality checklist checked items",
        "owner/external/future gates remain unchecked",
        "audit and README proof phrases"
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

async function readOptionalText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function expectCheckbox(phrase, expectedChecked) {
  const line = findLine(phrase);
  if (line === undefined) {
    failures.push(`${strategyPath} must include checklist phrase: ${phrase}`);
    return;
  }

  const expectedPrefix = expectedChecked ? "- [x]" : "- [ ]";
  if (!line.trimStart().startsWith(expectedPrefix)) {
    failures.push(`${strategyPath} checklist phrase must be ${expectedPrefix}: ${phrase}`);
  }
}

function findLine(phrase) {
  const normalizedPhrase = normalizeWhitespace(phrase);
  return strategy
    .split(/\r?\n/)
    .find((line) => normalizeWhitespace(line).includes(normalizedPhrase) && /^\s*- \[[ x]\]/.test(line));
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
