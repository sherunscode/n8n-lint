#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const failures = [];
const baseTsconfig = await readJson("tsconfig.base.json");
const coreTsconfig = await readJson("packages/core/tsconfig.json");
const coreFiles = await collectFiles("packages/core/src", ".ts");

expect(baseTsconfig.compilerOptions?.strict === true, "tsconfig.base.json must enable strict mode");
expect(
  baseTsconfig.compilerOptions?.noUncheckedIndexedAccess === true,
  "tsconfig.base.json must enable noUncheckedIndexedAccess"
);
expect(
  baseTsconfig.compilerOptions?.exactOptionalPropertyTypes === true,
  "tsconfig.base.json must enable exactOptionalPropertyTypes"
);
expect(coreTsconfig.extends === "../../tsconfig.base.json", "packages/core/tsconfig.json must extend base config");
expect(coreTsconfig.compilerOptions?.composite === true, "packages/core must stay composite-built");

for (const filePath of coreFiles) {
  const source = await readFile(filePath, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/\bany\b/.test(line)) {
      failures.push(`${filePath}:${lineNumber} must not use any in validation core`);
    }

    if (line.includes("@ts-ignore") || line.includes("@ts-expect-error")) {
      failures.push(`${filePath}:${lineNumber} must not suppress TypeScript in validation core`);
    }
  });
}

if (failures.length > 0) {
  throw new Error(`type hygiene check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        tsconfig: ["strict", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes"],
        coreFiles,
        forbiddenCorePatterns: ["any", "@ts-ignore", "@ts-expect-error"]
      }
    },
    null,
    2
  )
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath, extension)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(entryPath.replace(/\\/g, "/"));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
