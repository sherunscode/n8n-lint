#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const failures = [];
const packageJson = await readJson("package.json");
const tool = await readJson("tool.json");
const cliPackage = await readJson("packages/cli/package.json");
const ciWorkflow = await readText(".github/workflows/ci.yml");

expect(tool.name === cliPackage.name, "tool.json name must match CLI package name");
expect(tool.version === cliPackage.version, "tool.json version must match CLI package version");
expect(tool.repository === "https://github.com/sherunscode/n8n-lint", "tool.json repository must be canonical");
expect(hasCommand("check"), "tool.json must describe check command");
expect(hasCommand("repair"), "tool.json must describe repair command");
expect(hasCommand("badge"), "tool.json must describe badge command");
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("live REST schema validation"),
  "tool.json must preserve live REST non-claim"
);
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("npm registry publication"),
  "tool.json must preserve npm publication non-claim"
);
expect(packageJson.scripts?.lint === "eslint packages scripts", "package.json must expose the ESLint gate");
expect(
  typeof packageJson.scripts?.["format:check"] === "string" &&
    packageJson.scripts["format:check"].includes("prettier --check"),
  "package.json must expose the Prettier check gate"
);
expect(
  typeof packageJson.scripts?.quality === "string" &&
    packageJson.scripts.quality.includes("npm run lint") &&
    packageJson.scripts.quality.includes("npm run format:check") &&
    packageJson.scripts.quality.includes("npm run check:security") &&
    packageJson.scripts.quality.includes("npm run check:docs"),
  "package.json quality gate must include lint, format, security hygiene, and docs contract checks"
);
expect(ciWorkflow.includes("npm run quality"), "CI workflow must run the full quality gate");

await expectFile(".github/ISSUE_TEMPLATE/config.yml");
await expectFile(".prettierrc.json");
await expectFile("action.yml");
await expectFile("docs/ci-setup.md");
await expectFile("eslint.config.js");
await expectFile("examples/pre-commit-setup/.pre-commit-config.yaml");
await expectFile("examples/failing-nested-dead-parameter.json");
await expectFile("scripts/smoke-packed-install.mjs");
await expectFile("scripts/check-security-hygiene.mjs");
await expectFile("scripts/check-docs-contract.mjs");

if (failures.length > 0) {
  throw new Error(`metadata check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "tool.json",
        ".github/ISSUE_TEMPLATE/config.yml",
        ".prettierrc.json",
        "action.yml",
        "docs/ci-setup.md",
        "eslint.config.js",
        "examples/pre-commit-setup/.pre-commit-config.yaml",
        "examples/failing-nested-dead-parameter.json",
        "scripts/smoke-packed-install.mjs",
        "scripts/check-security-hygiene.mjs",
        "scripts/check-docs-contract.mjs"
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

function hasCommand(name) {
  return Array.isArray(tool.commands) && tool.commands.some((command) => command.name === name);
}

async function expectFile(filePath) {
  try {
    await access(filePath);
  } catch {
    failures.push(`${filePath} must exist`);
  }
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
