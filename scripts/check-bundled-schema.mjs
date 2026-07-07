#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import {
  bundledN8nPackageSelection,
  createBundledN8nPackageSchemaSource
} from "../packages/core/dist/index.js";

const fixtureUrl = new URL("../examples/known-http-request-workflow.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));
const snapshot = await createBundledN8nPackageSchemaSource().load();

const fixtureNodeTypes = collectFixtureNodeTypes(fixture);
const fixtureCredentialTypes = collectFixtureCredentialTypes(fixture);
const missingNodeTypes = fixtureNodeTypes.filter((nodeType) => !snapshot.nodeTypes.includes(nodeType));
const missingCredentialTypes = fixtureCredentialTypes.filter(
  (credentialType) => !snapshot.credentialTypes.includes(credentialType)
);
const versionMismatch = snapshot.packageInfo?.version !== bundledN8nPackageSelection.packageVersion;
const failures = [
  ...missingNodeTypes.map((nodeType) => `Missing node type ${nodeType}`),
  ...missingCredentialTypes.map((credentialType) => `Missing credential type ${credentialType}`),
  ...(versionMismatch
    ? [
        `Expected ${bundledN8nPackageSelection.packageName}@${bundledN8nPackageSelection.packageVersion}, loaded ${snapshot.packageInfo?.name ?? "unknown"}@${snapshot.packageInfo?.version ?? "unknown"}`
      ]
    : [])
];

const result = {
  ok: failures.length === 0,
  source: snapshot.source,
  package: snapshot.packageInfo,
  selection: bundledN8nPackageSelection,
  nodeTypes: snapshot.nodeTypes.length,
  credentialTypes: snapshot.credentialTypes.length,
  fixture: {
    path: "examples/known-http-request-workflow.json",
    nodeTypes: fixtureNodeTypes,
    credentialTypes: fixtureCredentialTypes
  },
  failures
};

const output = JSON.stringify(result, null, 2);
if (failures.length > 0) {
  console.error(output);
  process.exitCode = 1;
} else {
  console.log(output);
}

function collectFixtureNodeTypes(workflow) {
  if (!workflow || !Array.isArray(workflow.nodes)) {
    return [];
  }

  return uniqueSorted(
    workflow.nodes
      .map((node) => node?.type)
      .filter((nodeType) => typeof nodeType === "string" && nodeType.trim() !== "")
      .map((nodeType) => nodeType.trim())
  );
}

function collectFixtureCredentialTypes(workflow) {
  if (!workflow || !Array.isArray(workflow.nodes)) {
    return [];
  }

  const credentialTypes = [];
  for (const node of workflow.nodes) {
    if (!node?.credentials || typeof node.credentials !== "object" || Array.isArray(node.credentials)) {
      continue;
    }

    credentialTypes.push(...Object.keys(node.credentials));
  }

  return uniqueSorted(credentialTypes);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
