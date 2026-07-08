#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const failures = [];
const tool = await readJson("tool.json");
const cliPackage = await readJson("packages/cli/package.json");

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

await expectFile(".github/ISSUE_TEMPLATE/config.yml");
await expectFile("docs/ci-setup.md");
await expectFile("examples/pre-commit-setup/.pre-commit-config.yaml");

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
        "docs/ci-setup.md",
        "examples/pre-commit-setup/.pre-commit-config.yaml"
      ]
    },
    null,
    2
  )
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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
