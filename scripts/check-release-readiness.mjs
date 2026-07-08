#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];

const rootPackage = await readJson("package.json");
const corePackage = await readJson("packages/core/package.json");
const cliPackage = await readJson("packages/cli/package.json");
const tool = await readJson("tool.json");
const readme = await readText("README.md");
const changelog = await readText("CHANGELOG.md");
const releaseChecklist = await readText("docs/release-checklist.md");
const launchContentPack = await readText("docs/launch-content-pack.md");
const launchDrafts = await readText("docs/launch-drafts.md");
const supportRollback = await readText("docs/support-rollback.md");

const ownerGatedBlockers = [
  "owner approval for npm publish",
  "owner approval for tag push and GitHub release",
  "owner approval for public launch posts",
  "clean-machine registry install proof after publish",
  "live REST endpoint proof before live validation claims",
  "GitHub Marketplace listing after semver release"
];

expect(rootPackage.private === true, "root workspace package must stay private");
expect(corePackage.name === "@n8nproof/core", "core package name must stay @n8nproof/core");
expect(cliPackage.name === "n8n-lint", "CLI package name must stay n8n-lint");
expect(tool.name === cliPackage.name, "tool.json name must match CLI package name");
expect(tool.version === cliPackage.version, "tool.json version must match CLI package version");
expect(corePackage.version === cliPackage.version, "core and CLI package versions must match before release");
expect(
  cliPackage.dependencies?.["@n8nproof/core"] === corePackage.version,
  "CLI dependency on @n8nproof/core must match the exact core version"
);
expect(corePackage.publishConfig?.access === "public", "core package must retain public publishConfig");

expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("npm registry publication"),
  "tool.json must preserve npm registry publication non-claim until release"
);
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("GitHub Marketplace listing"),
  "tool.json must preserve Marketplace listing non-claim until release"
);
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("live REST schema validation"),
  "tool.json must preserve live REST schema validation non-claim until endpoint proof exists"
);

expect(
  hasPhrase(readme, "This repository is still a local MVP. It is not published to npm yet"),
  "README must state the current npm pre-publication boundary"
);
expect(
  hasPhrase(readme, "Actual npm publish, GitHub tag push, and GitHub release creation remain owner-gated."),
  "README release gate must preserve owner-gated publish/tag/release language"
);
expect(
  hasPhrase(readme, "Registry-backed `npx n8n-lint` instructions before npm publication."),
  "README must forbid registry-backed npx instructions before publication"
);
expect(changelog.includes("## 0.0.0 - Unreleased"), "CHANGELOG must preserve unreleased 0.0.0 heading");

for (const phrase of [
  "Do not run `npm publish`, create a GitHub release, push tags, or post launch",
  "Confirm npm auth only after owner approval",
  "prefer npm provenance through OIDC",
  "npm run quality",
  "npm run smoke:pack",
  "npm pack --workspace packages/core --dry-run",
  "npm pack --workspace packages/cli --dry-run",
  "npm publish --workspace packages/core --access public",
  "npm publish --workspace packages/cli",
  "Push the tag only after owner approval",
  "Prefer a patch release over unpublish"
]) {
  expect(hasPhrase(releaseChecklist, phrase), `release checklist must include: ${phrase}`);
}

expect(
  hasPhrase(
    launchContentPack,
    "Do not post to X, GitHub Releases, npm, or any external channel without owner approval."
  ),
  "launch content pack must preserve no-post owner gate"
);
expect(
  hasPhrase(launchContentPack, "Do not include npm or `npx` claims until publication is complete and verified."),
  "launch content pack must block npm/npx launch claims before verification"
);
expect(
  hasPhrase(launchContentPack, "Use `docs/assets/social-preview.svg` only after `npm run check:social-preview`"),
  "launch content pack must require social preview freshness before use"
);
expect(
  hasPhrase(launchContentPack, "Use `docs/assets/animated-failure-demo.svg` only after `npm run check:animated-demo`"),
  "launch content pack must require animated demo freshness before use"
);
expect(
  hasPhrase(
    launchContentPack,
    "Use `docs/assets/terminal-output-demo.svg` only after `npm run check:terminal-output-demo`"
  ),
  "launch content pack must require terminal output demo freshness before use"
);
expect(
  hasPhrase(
    launchContentPack,
    "Use `docs/assets/precommit-rejection-demo.svg` only after `npm run check:precommit-rejection-demo`"
  ),
  "launch content pack must require pre-commit rejection demo freshness before use"
);
expect(
  hasPhrase(
    launchContentPack,
    "Use `docs/assets/matrix-compatibility-demo.svg` only after `npm run check:matrix-demo`"
  ),
  "launch content pack must require matrix demo freshness before use"
);
expect(
  hasPhrase(launchContentPack, "Use `docs/assets/matrix-compatibility-demo.gif` only after `npm run check:matrix-gif`"),
  "launch content pack must require matrix GIF freshness before use"
);
expect(
  hasPhrase(
    launchContentPack,
    "Use `docs/assets/benchmark-dashboard.svg` only after `npm run check:benchmark-dashboard`"
  ),
  "launch content pack must require benchmark dashboard freshness before use"
);
expect(hasPhrase(launchDrafts, "These drafts are not posted."), "launch drafts must remain explicitly unposted");
expect(
  hasPhrase(launchDrafts, "Do not add npm install claims until `n8n-lint` is published"),
  "launch drafts must block npm install claims before publication"
);
expect(
  hasPhrase(supportRollback, "Do not use this plan as permission to publish."),
  "support rollback plan must not imply publish permission"
);
expect(
  hasPhrase(supportRollback, "For the first 48 hours after launch:"),
  "support rollback plan must preserve first-48-hours support coverage"
);

if (failures.length > 0) {
  throw new Error(`release readiness check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      releaseStatus: "CONDITIONAL_GO_PRE_RELEASE",
      packages: {
        core: `${corePackage.name}@${corePackage.version}`,
        cli: `${cliPackage.name}@${cliPackage.version}`,
        cliCoreDependency: cliPackage.dependencies?.["@n8nproof/core"]
      },
      ownerGatedBlockers,
      checked: [
        "root package stays private",
        "core/CLI/tool versions align",
        "CLI core dependency is exact",
        "tool.json non-claims",
        "README release boundaries",
        "CHANGELOG unreleased heading",
        "release checklist owner gates",
        "launch content owner gates",
        "animated demo freshness gate",
        "terminal output demo freshness gate",
        "pre-commit rejection demo freshness gate",
        "matrix demo freshness gate",
        "matrix GIF freshness gate",
        "benchmark dashboard freshness gate",
        "launch visual freshness gate",
        "support and rollback plan"
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
