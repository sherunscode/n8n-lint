#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import {
  bundledN8nPackageSelection,
  bundledN8nPackageVersions,
  createBundledN8nPackageSchemaSource
} from "../packages/core/dist/index.js";

const fixtureUrl = new URL("../examples/known-http-request-workflow.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));
const matrixFixtureUrl = new URL("../examples/matrix-2-30-parameter-workflow.json", import.meta.url);
const matrixFixture = JSON.parse(await readFile(matrixFixtureUrl, "utf8"));
const nestedFixtureUrl = new URL("../examples/failing-nested-dead-parameter.json", import.meta.url);
const nestedFixture = JSON.parse(await readFile(nestedFixtureUrl, "utf8"));
const snapshot = await createBundledN8nPackageSchemaSource().load();
const matrixSnapshots = Object.fromEntries(
  await Promise.all(
    bundledN8nPackageVersions.map(async (packageVersion) => [
      packageVersion,
      await createBundledN8nPackageSchemaSource({ packageVersion }).load()
    ])
  )
);

const fixtureNodeTypes = collectFixtureNodeTypes(fixture);
const fixtureCredentialTypes = collectFixtureCredentialTypes(fixture);
const missingNodeTypes = fixtureNodeTypes.filter((nodeType) => !snapshot.nodeTypes.includes(nodeType));
const missingCredentialTypes = fixtureCredentialTypes.filter(
  (credentialType) => !snapshot.credentialTypes.includes(credentialType)
);
const missingFixtureParameters = collectFixtureParameters(fixture).filter(
  ({ nodeType, parameterName }) => !snapshot.nodeParameterNames[nodeType]?.includes(parameterName)
);
const matrixFixtureParameters = collectFixtureParameters(matrixFixture);
const nestedFixtureNodeType = nestedFixture.nodes[0].type;
const expectedNestedPath = "options.redirect.redirect.followRedirects";
const rejectedNestedPath = "options.redirect.redirect.notARealNestedParameter";
const versionMismatch = snapshot.packageInfo?.version !== bundledN8nPackageSelection.packageVersion;
const matrixVersionFailures = bundledN8nPackageVersions
  .map((packageVersion) => {
    const packageInfo = matrixSnapshots[packageVersion]?.packageInfo;
    return packageInfo?.version === packageVersion
      ? undefined
      : `Expected matrix artifact ${packageVersion}, loaded ${packageInfo?.name ?? "unknown"}@${packageInfo?.version ?? "unknown"}`;
  })
  .filter((failure) => failure !== undefined);
const matrixDifferenceFailures = [
  ...matrixFixtureParameters
    .filter(({ nodeType, parameterName }) =>
      matrixSnapshots["2.29.6"]?.nodeParameterNames[nodeType]?.includes(parameterName)
    )
    .map(({ nodeType, parameterName }) => `Expected ${nodeType}.${parameterName} to be absent from 2.29.6`),
  ...matrixFixtureParameters
    .filter(
      ({ nodeType, parameterName }) => !matrixSnapshots["2.30.0"]?.nodeParameterNames[nodeType]?.includes(parameterName)
    )
    .map(({ nodeType, parameterName }) => `Expected ${nodeType}.${parameterName} to be present in 2.30.0`)
];
const nestedPathFailures = [
  ...(snapshot.nodeParameterPaths[nestedFixtureNodeType]?.includes(expectedNestedPath)
    ? []
    : [`Expected nested path ${nestedFixtureNodeType}.${expectedNestedPath} to exist`]),
  ...(snapshot.nodeParameterPaths[nestedFixtureNodeType]?.includes(rejectedNestedPath)
    ? [`Expected nested path ${nestedFixtureNodeType}.${rejectedNestedPath} to be absent`]
    : [])
];
const failures = [
  ...missingNodeTypes.map((nodeType) => `Missing node type ${nodeType}`),
  ...missingCredentialTypes.map((credentialType) => `Missing credential type ${credentialType}`),
  ...missingFixtureParameters.map(
    ({ nodeType, parameterName }) => `Missing parameter ${parameterName} for node type ${nodeType}`
  ),
  ...(versionMismatch
    ? [
        `Expected ${bundledN8nPackageSelection.packageName}@${bundledN8nPackageSelection.packageVersion}, loaded ${snapshot.packageInfo?.name ?? "unknown"}@${snapshot.packageInfo?.version ?? "unknown"}`
      ]
    : []),
  ...matrixVersionFailures,
  ...matrixDifferenceFailures,
  ...nestedPathFailures
];

const result = {
  ok: failures.length === 0,
  source: snapshot.source,
  package: snapshot.packageInfo,
  selection: bundledN8nPackageSelection,
  nodeTypes: snapshot.nodeTypes.length,
  credentialTypes: snapshot.credentialTypes.length,
  parameterizedNodeTypes: Object.keys(snapshot.nodeParameterNames).length,
  nestedParameterizedNodeTypes: Object.keys(snapshot.nodeParameterPaths).length,
  triggerNodeTypes: snapshot.triggerNodeTypes.length,
  matrixArtifacts: Object.fromEntries(
    Object.entries(matrixSnapshots).map(([packageVersion, matrixSnapshot]) => [
      packageVersion,
      {
        package: matrixSnapshot.packageInfo,
        nodeTypes: matrixSnapshot.nodeTypes.length,
        credentialTypes: matrixSnapshot.credentialTypes.length,
        parameterizedNodeTypes: Object.keys(matrixSnapshot.nodeParameterNames).length,
        nestedParameterizedNodeTypes: Object.keys(matrixSnapshot.nodeParameterPaths).length,
        triggerNodeTypes: matrixSnapshot.triggerNodeTypes.length
      }
    ])
  ),
  fixture: {
    path: "examples/known-http-request-workflow.json",
    nodeTypes: fixtureNodeTypes,
    credentialTypes: fixtureCredentialTypes,
    parameters: collectFixtureParameters(fixture)
  },
  matrixFixture: {
    path: "examples/matrix-2-30-parameter-workflow.json",
    parameters: matrixFixtureParameters,
    expectedDifference: "clearWarning is absent from 2.29.6 and present in 2.30.0"
  },
  nestedFixture: {
    path: "examples/failing-nested-dead-parameter.json",
    nodeType: nestedFixtureNodeType,
    expectedNestedPath,
    rejectedNestedPath
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

function collectFixtureParameters(workflow) {
  if (!workflow || !Array.isArray(workflow.nodes)) {
    return [];
  }

  const parameters = [];
  for (const node of workflow.nodes) {
    if (typeof node?.type !== "string" || !node?.parameters || typeof node.parameters !== "object") {
      continue;
    }

    for (const parameterName of Object.keys(node.parameters)) {
      parameters.push({
        nodeType: node.type.trim(),
        parameterName
      });
    }
  }

  return parameters.sort((left, right) =>
    `${left.nodeType}.${left.parameterName}`.localeCompare(`${right.nodeType}.${right.parameterName}`)
  );
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
