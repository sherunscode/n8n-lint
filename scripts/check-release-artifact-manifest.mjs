#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const failures = [];

const packageJson = await readJson("package.json");
const qualityRunner = await readText("scripts/run-quality-group.mjs");
const workflow = await readText(".github/workflows/release.yml");
const readme = await readText("README.md");
const ciSetup = await readText("docs/ci-setup.md");
const releaseChecklist = await readText("docs/release-checklist.md");
const releaseCommandPlan = await readText("docs/release-command-plan-v0.1.0.md");
const deepAudit = await readText("docs/deep-audit-2026-07-11.md");

expect(
  packageJson.scripts?.["check:release-artifact-manifest"] === "node scripts/check-release-artifact-manifest.mjs",
  "package.json must expose the release artifact manifest checker"
);
expect(
  packageJson.scripts?.quality === "node scripts/run-quality-group.mjs quality" &&
    qualityRunner.includes('"check:release-artifact-manifest"'),
  "quality must include the release artifact manifest checker"
);

for (const phrase of [
  "node scripts/write-release-artifact-manifest.mjs release-artifacts",
  "release-artifacts/release-artifact-manifest.json",
  "path: |",
  "release-artifacts/*.tgz",
  "release-artifacts/release-artifact-manifest.json"
]) {
  expect(workflow.includes(phrase), `release workflow must include manifest phrase: ${phrase}`);
}

for (const phrase of [
  "`npm run check:release-artifact-manifest` proves release proof tarballs get a checksum manifest with package names, versions, byte sizes, and SHA-256 hashes.",
  "The release proof artifact upload includes `release-artifact-manifest.json` next to the local tarballs."
]) {
  expect(hasPhrase(readme, phrase), `README must document release artifact manifest phrase: ${phrase}`);
}

for (const phrase of [
  "The artifact upload includes `release-artifact-manifest.json` with package names, versions, byte sizes, and SHA-256 hashes.",
  "`npm run check:release-artifact-manifest` verifies the manifest writer against freshly packed local tarballs."
]) {
  expect(hasPhrase(ciSetup, phrase), `CI setup doc must document release artifact manifest phrase: ${phrase}`);
}

for (const phrase of [
  "npm run check:release-artifact-manifest",
  "Inspect `release-artifact-manifest.json` before owner-approved publish.",
  "The manifest must list both tarballs, byte sizes, and SHA-256 hashes."
]) {
  expect(hasPhrase(releaseChecklist, phrase), `release checklist must include manifest phrase: ${phrase}`);
  expect(hasPhrase(releaseCommandPlan, phrase), `release command plan must include manifest phrase: ${phrase}`);
}

for (const phrase of [
  "`npm run check:release-artifact-manifest` now verifies checksum manifest generation for release proof tarballs",
  "package names, versions, byte sizes, SHA-256 hashes",
  "`check:release-artifact-manifest`"
]) {
  expect(hasPhrase(deepAudit, phrase), `deep audit must include manifest phrase: ${phrase}`);
}

await expectGeneratedManifest();

if (failures.length > 0) {
  throw new Error(`release artifact manifest check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "quality script wiring",
        "release workflow manifest generation",
        "manifest documentation",
        "fresh local tarball packing",
        "manifest package identity",
        "manifest byte sizes",
        "manifest SHA-256 hashes"
      ]
    },
    null,
    2
  )
);

async function expectGeneratedManifest() {
  const tempDir = await mkdtemp(join(tmpdir(), "n8n-lint-release-manifest-"));
  try {
    run("npm", ["run", "build"]);
    run("npm", ["pack", "--workspace", "packages/core", "--pack-destination", tempDir]);
    run("npm", ["pack", "--workspace", "packages/cli", "--pack-destination", tempDir]);
    run("node", ["scripts/write-release-artifact-manifest.mjs", tempDir]);

    const corePackage = await readJson("packages/core/package.json");
    const cliPackage = await readJson("packages/cli/package.json");
    const expected = [
      {
        workspace: "packages/core",
        packageName: corePackage.name,
        version: corePackage.version,
        fileName: packFileName(corePackage)
      },
      {
        workspace: "packages/cli",
        packageName: cliPackage.name,
        version: cliPackage.version,
        fileName: packFileName(cliPackage)
      }
    ];

    const manifest = await readJson(join(tempDir, "release-artifact-manifest.json"));
    expect(manifest.schemaVersion === 1, "manifest schemaVersion must be 1");
    expect(manifest.repository === "https://github.com/sherunscode/n8n-lint", "manifest repository must be canonical");
    expect(
      typeof manifest.generatedAt === "string" && manifest.generatedAt.length > 0,
      "manifest must include generatedAt"
    );
    expect(manifest.gitCommit === git(["rev-parse", "HEAD"]), "manifest gitCommit must match current HEAD");
    expect(Array.isArray(manifest.artifacts) && manifest.artifacts.length === 2, "manifest must list two artifacts");

    for (const expectedArtifact of expected) {
      const actual = manifest.artifacts.find((artifact) => artifact.fileName === expectedArtifact.fileName);
      if (actual === undefined) {
        failures.push(`manifest must include ${expectedArtifact.fileName}`);
        continue;
      }

      expect(actual.workspace === expectedArtifact.workspace, `${expectedArtifact.fileName} workspace must match`);
      expect(
        actual.packageName === expectedArtifact.packageName,
        `${expectedArtifact.fileName} packageName must match`
      );
      expect(actual.version === expectedArtifact.version, `${expectedArtifact.fileName} version must match`);
      const bytes = await readFile(join(tempDir, expectedArtifact.fileName));
      expect(actual.sizeBytes === bytes.length, `${expectedArtifact.fileName} sizeBytes must match`);
      expect(/^[a-f0-9]{64}$/.test(actual.sha256), `${expectedArtifact.fileName} sha256 must be lowercase hex`);
      expect(
        actual.sha256 === createHash("sha256").update(bytes).digest("hex"),
        `${expectedArtifact.fileName} sha256 must match the tarball`
      );
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function run(command, args) {
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.executable, resolved.args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}${output ? `\n${output}` : ""}`);
  }
}

function resolveCommand(command, args) {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    return { executable: "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }

  return { executable: command, args };
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

function packFileName(packageJson) {
  const normalizedName = packageJson.name.replace(/^@/, "").replace(/\//g, "-");
  return `${normalizedName}-${packageJson.version}.tgz`;
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`git ${args.join(" ")} failed with exit ${result.status}${output ? `\n${output}` : ""}`);
  }

  return result.stdout.trim();
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
