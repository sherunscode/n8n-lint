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
    packageJson.scripts.quality.includes("npm run check:schema-config") &&
    packageJson.scripts.quality.includes("npm run check:type-hygiene") &&
    packageJson.scripts.quality.includes("npm run check:precommit") &&
    packageJson.scripts.quality.includes("npm run check:community") &&
    packageJson.scripts.quality.includes("npm run check:security") &&
    packageJson.scripts.quality.includes("npm run check:docs") &&
    packageJson.scripts.quality.includes("npm run check:pack") &&
    packageJson.scripts.quality.includes("npm run check:claims") &&
    packageJson.scripts.quality.includes("npm run check:links") &&
    packageJson.scripts.quality.includes("npm run check:exit-codes"),
  "package.json quality gate must include lint, format, schema config, type hygiene, pre-commit, community readiness, security hygiene, docs contract, package content, claims hygiene, markdown link, and exit-code checks"
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
await expectFile("packages/core/schema/bundled-n8n-package-config.json");
await expectFile("scripts/check-schema-config.mjs");
await expectFile("scripts/check-type-hygiene.mjs");
await expectFile("scripts/check-precommit-hook.mjs");
await expectFile("scripts/check-community-readiness.mjs");
await expectFile("scripts/check-security-hygiene.mjs");
await expectFile("scripts/check-docs-contract.mjs");
await expectFile("scripts/check-package-contents.mjs");
await expectFile("scripts/check-claims-hygiene.mjs");
await expectFile("scripts/check-markdown-links.mjs");
await expectFile("scripts/check-exit-codes.mjs");

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
        "packages/core/schema/bundled-n8n-package-config.json",
        "scripts/check-schema-config.mjs",
        "scripts/check-type-hygiene.mjs",
        "scripts/check-precommit-hook.mjs",
        "scripts/check-community-readiness.mjs",
        "scripts/check-security-hygiene.mjs",
        "scripts/check-docs-contract.mjs",
        "scripts/check-package-contents.mjs",
        "scripts/check-claims-hygiene.mjs",
        "scripts/check-markdown-links.mjs",
        "scripts/check-exit-codes.mjs"
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
