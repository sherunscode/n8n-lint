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
  "check:cli-output",
  "check:precommit",
  "check:precommit-rejection-demo",
  "check:community",
  "check:release-readiness",
  "check:live-rest-boundary",
  "check:launch-content",
  "check:benchmark-report",
  "check:benchmark-dashboard",
  "check:github-action",
  "check:strategy-checklist",
  "check:github-rendered-readme",
  "check:github-profile",
  "check:readme-demo",
  "check:animated-demo",
  "check:terminal-output-demo",
  "check:matrix-demo",
  "check:matrix-gif",
  "check:social-preview",
  "check:architecture-diagram",
  "check:last-verified-badges",
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
expect(audit.includes("docs/assets/terminal-output-demo.svg"), "audit must mention the checked terminal output asset");
expect(audit.includes("npm run check:terminal-output-demo"), "audit must mention the terminal output checker");
expect(audit.includes("docs/assets/precommit-rejection-demo.svg"), "audit must mention the checked pre-commit asset");
expect(audit.includes("npm run check:precommit-rejection-demo"), "audit must mention the pre-commit rejection checker");
expect(audit.includes("docs/assets/matrix-compatibility-demo.svg"), "audit must mention the checked matrix asset");
expect(audit.includes("npm run check:matrix-demo"), "audit must mention the matrix demo checker");
expect(audit.includes("docs/assets/matrix-compatibility-demo.gif"), "audit must mention the checked matrix GIF asset");
expect(audit.includes("npm run check:matrix-gif"), "audit must mention the matrix GIF checker");
expect(audit.includes("docs/assets/social-preview.svg"), "audit must mention the checked social preview asset");
expect(audit.includes("npm run check:social-preview"), "audit must mention the social preview checker");
expect(audit.includes("docs/assets/architecture.svg"), "audit must mention the checked architecture diagram asset");
expect(audit.includes("npm run check:architecture-diagram"), "audit must mention the architecture diagram checker");
expect(audit.includes("docs/assets/last-verified-badges.svg"), "audit must mention the checked badge-state asset");
expect(audit.includes("npm run check:last-verified-badges"), "audit must mention the badge-state checker");
expect(audit.includes("npm run check:release-readiness"), "audit must mention the release-readiness checker");
expect(audit.includes("npm run check:cli-output"), "audit must mention the CLI output checker");
expect(audit.includes("final JSON summary"), "audit must mention final JSON summary proof");
expect(audit.includes("warning summary counts"), "audit must mention warning summary counts");
expect(audit.includes("npm run check:live-rest-boundary"), "audit must mention the live REST boundary checker");
expect(audit.includes("secrets.N8N_API_KEY"), "audit must mention encrypted GitHub Actions API-key handling");
expect(audit.includes("docs/live-rest-threat-model.md"), "audit must mention the live REST threat model");
expect(audit.includes("fail-closed TLS"), "audit must mention live REST TLS threat handling");
expect(audit.includes("npm run check:launch-content"), "audit must mention the launch-content checker");
expect(audit.includes("npm run check:benchmark-report"), "audit must mention the benchmark-report checker");
expect(audit.includes("docs/assets/benchmark-dashboard.svg"), "audit must mention the checked benchmark dashboard");
expect(audit.includes("npm run check:benchmark-dashboard"), "audit must mention the benchmark dashboard checker");
expect(audit.includes("npm run check:github-action"), "audit must mention the GitHub Action checker");
expect(audit.includes("last-verified badge"), "audit must mention last-verified badge proof");
expect(audit.includes("npm run check:strategy-checklist"), "audit must mention the strategy checklist checker");
expect(audit.includes("npm run check:github-rendered-readme"), "audit must mention the GitHub-rendered README checker");
expect(audit.includes("public GitHub-rendered README page"), "audit must mention public README render proof");
expect(audit.includes("npm run check:github-profile"), "audit must mention the GitHub profile checker");
expect(audit.includes("public She Runs Code organization profile"), "audit must mention public profile proof");
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
    "Additional video captures beyond the checked README, animated demo, terminal output, pre-commit rejection, matrix compatibility SVG/GIF, social preview, architecture SVG, and last-verified badge-state SVG assets."
  ),
  "remaining gates must distinguish extra video launch assets from the checked README, animated demo, terminal output, pre-commit rejection, matrix compatibility SVG/GIF, social preview, architecture SVG, and last-verified badge-state SVGs"
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
        "terminal output proof",
        "pre-commit rejection proof",
        "matrix compatibility proof",
        "matrix GIF proof",
        "social preview proof",
        "architecture diagram proof",
        "last-verified badge visual proof",
        "live REST boundary proof",
        "live REST threat model proof",
        "launch content proof",
        "benchmark report proof",
        "benchmark dashboard proof",
        "GitHub Action proof",
        "strategy checklist proof",
        "GitHub-rendered README proof",
        "GitHub profile proof",
        "CLI output proof"
      ]
    },
    null,
    2
  )
);

function runPack(workspace) {
  const command = npmCommand(["pack", "--workspace", workspace, "--json", "--dry-run"]);
  const result = spawnSync(command.executable, command.args, {
    cwd: process.cwd(),
    encoding: "utf8"
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

function npmCommand(args) {
  if (process.platform === "win32") {
    return { executable: "cmd.exe", args: ["/d", "/s", "/c", "npm", ...args] };
  }

  return { executable: "npm", args };
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
