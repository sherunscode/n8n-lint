#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const failures = [];
const readme = await readFile("README.md", "utf8");
const normalizedReadme = readme.replaceAll("\\|", "|");
const actualHelp = await readCliHelp();

expectHelpBlockMatchesCli();
expectReadmeDocumentsAllHelpFlags();
expectReadmeDocumentsCliOptionVariants();
expectNoPlaceholderCopy();

if (failures.length > 0) {
  throw new Error(`docs contract check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: ["README --help output", "README CLI option table", "README all help flags", "placeholder copy scan"]
    },
    null,
    2
  )
);

function expectHelpBlockMatchesCli() {
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

function expectReadmeDocumentsAllHelpFlags() {
  const flagsFromHelp = [...new Set(actualHelp.match(/--[a-z0-9-]+/gi) ?? [])].sort((left, right) =>
    left.localeCompare(right)
  );
  const documentedFlags = new Set(
    [...readme.matchAll(/`(--[a-z0-9-]+)(?:[^`]*)`/gi)].map((match) => match[1]).filter(Boolean)
  );

  for (const flag of flagsFromHelp) {
    if (!documentedFlags.has(flag)) {
      failures.push(`README option table must document CLI flag ${flag}`);
    }
  }
}

function expectReadmeDocumentsCliOptionVariants() {
  const requiredOptionVariants = [
    "`--source bundled-n8n-package`",
    "`--source local-placeholder`",
    "`--n8n-version 2.29.6`",
    "`--n8n-version 2.30.0`",
    "`--n8n-version matrix`",
    "`--json`",
    "`--format github`",
    "`--format markdown|json|svg`",
    "`--output <file>`",
    "`--apply`",
    "`--confirm`",
    "`--label <text>`",
    "`--kind status`",
    "`--kind last-verified`",
    "`--as-of YYYY-MM-DD`"
  ];

  for (const option of requiredOptionVariants) {
    if (!normalizedReadme.includes(option)) {
      failures.push(`README must document CLI option variant ${option}`);
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
