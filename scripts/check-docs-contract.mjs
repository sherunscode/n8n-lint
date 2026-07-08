#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const failures = [];
const readme = await readFile("README.md", "utf8");

await expectHelpBlockMatchesCli();
expectReadmeDocumentsCliOptions();
expectNoPlaceholderCopy();

if (failures.length > 0) {
  throw new Error(`docs contract check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: ["README --help output", "README CLI option table", "placeholder copy scan"]
    },
    null,
    2
  )
);

async function expectHelpBlockMatchesCli() {
  const actualHelp = await readCliHelp();
  const documentedHelp = extractHelpBlock();
  if (documentedHelp !== actualHelp) {
    failures.push("README documented --help output must match actual CLI --help output byte-for-byte");
  }
}

async function readCliHelp() {
  const { stdout } = await execFileAsync("node", ["packages/cli/dist/bin.js", "--help"], { encoding: "utf8" });
  return stdout.trimEnd();
}

function extractHelpBlock() {
  const marker = "`n8n-lint --help` output:";
  const markerIndex = readme.indexOf(marker);
  if (markerIndex === -1) {
    failures.push("README must include the n8n-lint --help output marker");
    return "";
  }

  const afterMarker = readme.slice(markerIndex + marker.length);
  const blockMatch = /```text\r?\n([\s\S]*?)\r?\n```/.exec(afterMarker);
  if (blockMatch === null) {
    failures.push("README must include a text code block after the --help output marker");
    return "";
  }

  return blockMatch[1] ?? "";
}

function expectReadmeDocumentsCliOptions() {
  const requiredOptions = [
    "`--source bundled-n8n-package`",
    "`--source local-placeholder`",
    "`--n8n-version 2.29.6`",
    "`--n8n-version 2.30.0`",
    "`--n8n-version matrix`",
    "`--json`",
    "`--format github`"
  ];

  for (const option of requiredOptions) {
    if (!readme.includes(option)) {
      failures.push(`README must document CLI option ${option}`);
    }
  }
}

function expectNoPlaceholderCopy() {
  const forbidden = ["TODO:", "Lorem ipsum", "Coming soon"];
  for (const phrase of forbidden) {
    if (readme.includes(phrase)) {
      failures.push(`README must not contain placeholder copy: ${phrase}`);
    }
  }
}
