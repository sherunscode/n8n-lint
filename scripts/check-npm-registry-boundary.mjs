#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const failures = [];

const packageJson = await readJson("package.json");
const corePackage = await readJson("packages/core/package.json");
const cliPackage = await readJson("packages/cli/package.json");
const tool = await readJson("tool.json");
const readme = await readText("README.md");
const releaseChecklist = await readText("docs/release-checklist.md");
const releaseCommandPlan = await readText("docs/release-command-plan-v0.1.0.md");
const releaseReadiness = await readText("scripts/check-release-readiness.mjs");
const audit = await readText("docs/deep-audit-2026-07-08.md");

expect(corePackage.name === "@n8nproof/core", "core package name must stay @n8nproof/core");
expect(cliPackage.name === "n8n-lint", "CLI package name must stay n8n-lint");
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("npm registry publication"),
  "tool.json must preserve npm registry publication non-claim while packages are unpublished"
);
expect(
  packageJson.scripts?.["check:npm-registry-boundary"] === "node scripts/check-npm-registry-boundary.mjs",
  "package.json must expose the npm registry boundary checker"
);
expect(
  typeof packageJson.scripts?.quality === "string" &&
    packageJson.scripts.quality.includes("npm run check:npm-registry-boundary"),
  "quality must include the npm registry boundary checker"
);

for (const packageName of [corePackage.name, cliPackage.name]) {
  const result = npmViewVersion(packageName);
  if (result.status === "published") {
    failures.push(
      `${packageName} is published as ${result.version}, but the repo still claims npm registry publication is not complete`
    );
  } else if (result.status !== "unpublished") {
    failures.push(`${packageName} registry state could not be proven: ${result.reason}`);
  }
}

for (const phrase of [
  "This repository is still a local MVP. It is not published to npm yet",
  "registry-backed `npx n8n-lint` usage will only be documented after npm publication",
  "Not claimed yet: npm registry install"
]) {
  expect(hasPhrase(readme, phrase), `README must preserve pre-publication boundary: ${phrase}`);
}

for (const phrase of [
  "npm view @n8nproof/core version",
  "npm view n8n-lint version",
  "Expected first-release npm state: both package lookups return `E404`.",
  "Run `npm run check:npm-registry-boundary` before publish approval."
]) {
  expect(hasPhrase(releaseChecklist, phrase), `release checklist must include registry boundary phrase: ${phrase}`);
}

for (const phrase of [
  "npm view @n8nproof/core version",
  "npm view n8n-lint version",
  "Expected first-release npm state: both package lookups return `E404`.",
  "npm run check:npm-registry-boundary"
]) {
  expect(
    hasPhrase(releaseCommandPlan, phrase),
    `release command plan must include registry boundary phrase: ${phrase}`
  );
}

expect(
  releaseReadiness.includes("check:npm-registry-boundary"),
  "release-readiness checker must enforce registry boundary documentation"
);
expect(audit.includes("npm run check:npm-registry-boundary"), "deep audit must mention the registry boundary checker");
expect(audit.includes("both publishable package names return npm `E404`"), "deep audit must mention both E404 proofs");

if (failures.length > 0) {
  throw new Error(`npm registry boundary check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      registry: "https://registry.npmjs.org",
      checked: [
        {
          package: corePackage.name,
          expected: "E404 unpublished"
        },
        {
          package: cliPackage.name,
          expected: "E404 unpublished"
        }
      ],
      releaseStatus: "pre-publication",
      postPublishAction:
        "After owner-approved publication and clean-machine registry smoke, remove npm registry publication from tool.json.notClaimed and update this gate."
    },
    null,
    2
  )
);

function npmViewVersion(packageName) {
  const command = npmCommand(["view", packageName, "version"]);
  const result = spawnSync(command.executable, command.args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status === 0) {
    return {
      status: "published",
      version: result.stdout.trim()
    };
  }

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  if (isUnpublishedE404(output)) {
    return {
      status: "unpublished"
    };
  }

  return {
    status: "unknown",
    reason: summarizeNpmOutput(output)
  };
}

function npmCommand(args) {
  if (process.platform === "win32") {
    return { executable: "cmd.exe", args: ["/d", "/s", "/c", "npm", ...args] };
  }

  return { executable: "npm", args };
}

function summarizeNpmOutput(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.includes("_logs"))
    .slice(0, 4)
    .join(" | ");
}

function isUnpublishedE404(output) {
  const normalizedOutput = output.toLowerCase();
  return (
    output.includes("E404") &&
    (normalizedOutput.includes("is not in this registry") ||
      normalizedOutput.includes("could not be found") ||
      normalizedOutput.includes("not found"))
  );
}

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
