#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const outputPath = join(repoRoot, "packages/core/schema/bundled-n8n-package.json");
const packageName = "n8n-nodes-base";
const nodeMetadataFile = "dist/types/nodes.json";
const credentialMetadataFile = "dist/types/credentials.json";
const selection = {
  referencePackage: "n8n@2.29.7",
  packageName,
  packageVersion: "2.29.6",
  workflowPackageVersion: "2.29.2",
  reason:
    "Pinned to the n8n-nodes-base dependency selected by n8n@2.29.7, instead of the stale-looking n8n-nodes-base latest dist-tag."
};

const packageJsonPath = require.resolve(`${packageName}/package.json`);
const packageRoot = dirname(packageJsonPath);
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const [nodeDefinitions, credentialDefinitions] = await Promise.all([
  readJsonArray(join(packageRoot, nodeMetadataFile), "node definitions"),
  readJsonArray(join(packageRoot, credentialMetadataFile), "credential definitions")
]);

const nodeEntries = nodeDefinitions
  .map((definition) => {
    const name = readDefinitionName(definition);
    if (name === undefined) {
      return undefined;
    }

    const qualifiedName = qualifyNodeType(name, packageName);
    return {
      definition,
      name: qualifiedName
    };
  })
  .filter((entry) => entry !== undefined);

const artifact = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  source: "bundled-n8n-package",
  package: {
    name: readNonEmptyString(packageJson.name, packageName),
    version: readNonEmptyString(packageJson.version, "unknown"),
    metadataFiles: {
      nodes: nodeMetadataFile,
      credentials: credentialMetadataFile
    }
  },
  selection,
  nodeTypes: uniqueSorted(nodeEntries.map((entry) => entry.name)),
  credentialTypes: uniqueSorted(
    credentialDefinitions
      .map((definition) => readDefinitionName(definition))
      .filter((name) => name !== undefined)
  ),
  nodeParameterNames: buildNodeParameterNameMap(nodeEntries),
  triggerNodeTypes: uniqueSorted(
    nodeEntries
      .filter((entry) => isTriggerNodeDefinition(entry.definition))
      .map((entry) => entry.name)
  )
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ok: true,
      outputPath: "packages/core/schema/bundled-n8n-package.json",
      package: `${artifact.package.name}@${artifact.package.version}`,
      nodeTypes: artifact.nodeTypes.length,
      credentialTypes: artifact.credentialTypes.length,
      parameterizedNodeTypes: Object.keys(artifact.nodeParameterNames).length,
      triggerNodeTypes: artifact.triggerNodeTypes.length
    },
    null,
    2
  )
);

async function readJsonArray(filePath, label) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${label} to be an array at ${filePath}.`);
  }

  return parsed;
}

function readDefinitionName(definition) {
  if (!definition || typeof definition !== "object" || typeof definition.name !== "string") {
    return undefined;
  }

  const name = definition.name.trim();
  return name === "" ? undefined : name;
}

function readNonEmptyString(value, fallback) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function qualifyNodeType(name, prefix) {
  return name.includes(".") ? name : `${prefix}.${name}`;
}

function collectTopLevelParameterNames(definition) {
  if (!definition || typeof definition !== "object" || !Array.isArray(definition.properties)) {
    return [];
  }

  return uniqueSorted(
    definition.properties
      .map((property) => property?.name)
      .filter((name) => typeof name === "string" && name.trim() !== "")
      .map((name) => name.trim())
  );
}

function buildNodeParameterNameMap(nodeEntries) {
  const merged = new Map();
  for (const entry of nodeEntries) {
    const current = merged.get(entry.name) ?? [];
    merged.set(entry.name, [...current, ...collectTopLevelParameterNames(entry.definition)]);
  }

  return Object.fromEntries(
    [...merged.entries()]
      .map(([name, parameters]) => [name, uniqueSorted(parameters)])
      .filter(([, parameters]) => parameters.length > 0)
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function isTriggerNodeDefinition(definition) {
  if (!definition || typeof definition !== "object") {
    return false;
  }

  if (Array.isArray(definition.group) && definition.group.includes("trigger")) {
    return true;
  }

  return typeof definition.name === "string" && definition.name.endsWith("Trigger");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
