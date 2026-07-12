#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const auditPath = "docs/deep-audit-2026-07-11.md";
const audit = await readFile(auditPath, "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const qualityRunner = await readFile("scripts/run-quality-group.mjs", "utf8");
const failures = [];

for (const phrase of [
  "# n8n-lint Deep Hardening Audit - 2026-07-11",
  "**GO for protected merge",
  "**NO-GO for npm publication",
  "Open SEV-1: **0**",
  "Confidence",
  "Command evidence",
  "npm run verify:fast",
  "npm run quality",
  "npm run quality:remote",
  "npm run quality:release",
  "explicit malformed/non-workflow JSON",
  "bounded concurrency",
  "runs.using: node24",
  "Vitest",
  "90%",
  "n8n Sustainable Use License",
  "written n8n licensing confirmation",
  "npm run check:benchmark-report",
  "Benchmark Proof",
  "docs/assets/github-pr-merge-gate-proof.png",
  "npm run check:github-pr-gate-proof",
  "npm run check:npm-registry-boundary",
  "both publishable package names return npm `E404`",
  "npm run check:live-rest-boundary",
  "live REST source boundary stays locked",
  "Live REST schema validation",
  "strategy checklist reconciliation",
  "remaining unchecked checklist boxes are owner-gated, external UI proof, or future live REST/release gates",
  "npm publish and registry-backed `npx n8n-lint`",
  "`npm run check:audit-report` now enforces"
]) {
  expect(hasPhrase(audit, phrase), `audit must include: ${phrase}`);
}

expect(packageJson.scripts?.["check:audit-report"] === "node scripts/check-audit-report.mjs", "audit checker script");
expect(packageJson.scripts?.quality === "node scripts/run-quality-group.mjs quality", "local quality group");
expect(qualityRunner.includes('"check:audit-report"'), "quality runner schedules audit checker");

for (const heading of ["## Scope", "## Findings", "## Command Evidence", "## Release Gates", "## Verdict"]) {
  expect(audit.includes(heading), `audit must include heading: ${heading}`);
}

if (failures.length > 0) {
  throw new Error(`audit report check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(JSON.stringify({ ok: true, audit: auditPath, verdict: "GO_MERGE_NO_GO_RELEASE" }, null, 2));

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function hasPhrase(text, phrase) {
  return text.toLowerCase().replace(/\s+/g, " ").includes(phrase.toLowerCase().replace(/\s+/g, " "));
}
