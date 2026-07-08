#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const auditPath = "docs/deep-audit-2026-07-08.md";
const audit = await readFile(auditPath, "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const failures = [];

const qualityScript = packageJson.scripts?.quality ?? "";
const requiredQualityGates = [
  "check:schema-config",
  "check:type-hygiene",
  "check:precommit",
  "check:community",
  "check:release-readiness",
  "check:readme-demo",
  "check:animated-demo",
  "check:social-preview",
  "check:audit-report",
  "check:status-docs",
  "check:metadata",
  "check:security",
  "check:docs",
  "check:pack",
  "check:claims",
  "check:links",
  "check:exit-codes"
];

expect(audit.includes("**CONDITIONAL GO for local MVP and public repo proof.**"), "audit must keep local MVP verdict");
expect(audit.includes("**NO-GO for full public launch/release**"), "audit must keep full-launch NO-GO verdict");
expect(
  audit.includes("npm publish, semver tag, GitHub release, launch posts"),
  "audit must name owner-gated release blockers"
);
expect(audit.includes("docs/assets/readme-failure-demo.svg"), "audit must mention the checked README demo asset");
expect(audit.includes("npm run check:readme-demo"), "audit must mention the README demo checker");
expect(audit.includes("docs/assets/animated-failure-demo.svg"), "audit must mention the checked animated demo asset");
expect(audit.includes("npm run check:animated-demo"), "audit must mention the animated demo checker");
expect(audit.includes("docs/assets/social-preview.svg"), "audit must mention the checked social preview asset");
expect(audit.includes("npm run check:social-preview"), "audit must mention the social preview checker");
expect(audit.includes("npm run check:release-readiness"), "audit must mention the release-readiness checker");
expect(audit.includes("npm run check:claims"), "audit must mention the claims checker");

for (const gate of requiredQualityGates) {
  expect(qualityScript.includes(`npm run ${gate}`), `package quality script must include ${gate}`);
  expect(audit.includes(gate), `audit must mention ${gate}`);
}

for (const pack of [runPack("packages/core"), runPack("packages/cli")]) {
  const packageLabel = `${pack.name}@${pack.version}`;
  expect(
    audit.includes(`\`${packageLabel}\`: ${pack.entryCount} files`),
    `audit must include current entry count for ${packageLabel}`
  );
  expect(audit.includes(formatKilobytes(pack.size)), `audit must include current packed size for ${packageLabel}`);
}

expect(
  hasPhrase(
    audit,
    "Additional video/GIF captures beyond the checked README, animated demo, and social preview SVG assets."
  ),
  "remaining gates must distinguish extra visual launch assets from the checked README, animated demo, and social preview SVGs"
);

for (const remainingGate of [
  "npm publish and registry-backed `npx n8n-lint`",
  "Semver tag and GitHub release",
  "GitHub Action Marketplace listing",
  "Live REST schema validation",
  "Public X, Reddit, HN, or n8n forum launch posts"
]) {
  expect(audit.includes(remainingGate), `audit remaining gates must include: ${remainingGate}`);
}

if (failures.length > 0) {
  throw new Error(`audit report check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      audit: auditPath,
      checked: [
        "conditional/no-go verdicts",
        "quality gate list",
        "current package dry-run counts",
        "owner-gated remaining items",
        "README demo proof",
        "animated demo proof",
        "social preview proof"
      ]
    },
    null,
    2
  )
);

function runPack(workspace) {
  const result = spawnSync("npm", ["pack", "--workspace", workspace, "--json", "--dry-run"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`npm pack --workspace ${workspace} --json --dry-run failed with exit ${result.status}\n${output}`);
  }

  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || parsed.length !== 1 || !isPackResult(parsed[0])) {
    throw new Error(`Unexpected npm pack JSON output for ${workspace}`);
  }

  return parsed[0];
}

function isPackResult(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.name === "string" &&
    typeof value.version === "string" &&
    typeof value.size === "number" &&
    typeof value.entryCount === "number"
  );
}

function formatKilobytes(bytes) {
  return `${(bytes / 1000).toFixed(1)} kB`;
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
