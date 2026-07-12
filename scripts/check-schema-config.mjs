#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const configPath = "packages/core/schema/bundled-n8n-package-config.json";
const config = await readJson(configPath);
const rootPackage = await readJson("package.json");
const failures = [];

expect(isRecord(config), `${configPath} must be a JSON object`);
const packageName = readString(config.packageName, "packageName");
const defaultPackageVersion = readString(config.defaultPackageVersion, "defaultPackageVersion");
const schemaDirectory = readString(config.schemaDirectory, "schemaDirectory");

if (packageName !== undefined) {
  expect(
    rootPackage.devDependencies?.[packageName] === undefined && rootPackage.dependencies?.[packageName] === undefined,
    `root package must not install heavy generator input ${packageName}`
  );
}

expect(isRecord(config.selections), "config selections must be an object");
const selections = isRecord(config.selections) ? config.selections : {};
expect(Object.keys(selections).length > 0, "config selections must not be empty");
expect(
  defaultPackageVersion === undefined || Object.hasOwn(selections, defaultPackageVersion),
  "default selection exists"
);

for (const [packageVersion, rawSelection] of Object.entries(selections)) {
  const selection = isRecord(rawSelection) ? rawSelection : {};
  expect(isRecord(rawSelection), `selection ${packageVersion} must be an object`);
  expect(
    selection.packageName === packageName,
    `selection ${packageVersion} packageName must match config packageName`
  );
  expect(selection.packageVersion === packageVersion, `selection ${packageVersion} packageVersion must match its key`);
  const artifactFile = readString(selection.artifactFile, `${packageVersion}.artifactFile`);
  if (artifactFile !== undefined && schemaDirectory !== undefined) {
    const artifactPath = `${schemaDirectory}/${artifactFile}`;
    await expectFile(artifactPath);
    const artifact = await readJson(artifactPath);
    expect(artifact.package?.name === packageName, `${artifactPath} package name must match config`);
    expect(artifact.package?.version === packageVersion, `${artifactPath} package version must match config`);
    expect(
      JSON.stringify(artifact.selection) === JSON.stringify(toArtifactSelection(selection)),
      `${artifactPath} selection metadata must match config`
    );
  }
}

await expectNoPinnedSelectionLiterals("packages/core/src/schema-source.ts", config);
await expectNoPinnedSelectionLiterals("scripts/generate-bundled-schema.mjs", config);

if (failures.length > 0) {
  throw new Error(`schema config check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      config: configPath,
      defaultPackageVersion,
      packageName,
      selections: Object.keys(selections).sort((left, right) => left.localeCompare(right)),
      checked: [
        "isolated generator dependency boundary",
        "config selection shape",
        "artifact selection metadata",
        "runtime source has no pinned selection literals",
        "generator source has no pinned selection literals"
      ]
    },
    null,
    2
  )
);

async function expectNoPinnedSelectionLiterals(filePath, config) {
  const source = await readFile(filePath, "utf8");
  const forbidden = new Set();
  for (const [packageVersion, selection] of Object.entries(isRecord(config.selections) ? config.selections : {})) {
    forbidden.add(packageVersion);
    if (isRecord(selection)) {
      for (const key of ["referencePackage", "workflowPackageVersion", "reason"]) {
        const value = selection[key];
        if (typeof value === "string") {
          forbidden.add(value);
        }
      }
    }
  }

  for (const value of forbidden) {
    if (source.includes(value)) {
      failures.push(`${filePath} must read pinned schema selection value "${value}" from ${configPath}`);
    }
  }
}

function toArtifactSelection(selection) {
  return {
    referencePackage: selection.referencePackage,
    packageName: selection.packageName,
    packageVersion: selection.packageVersion,
    workflowPackageVersion: selection.workflowPackageVersion,
    reason: selection.reason
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function expectFile(filePath) {
  try {
    await access(filePath);
  } catch {
    failures.push(`${filePath} must exist`);
  }
}

function readString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    failures.push(`config ${label} must be a non-empty string`);
    return undefined;
  }

  return value.trim();
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
