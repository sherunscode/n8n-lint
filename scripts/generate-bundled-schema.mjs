#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const packageName = "n8n-nodes-base";
const nodeMetadataFile = "dist/types/nodes.json";
const credentialMetadataFile = "dist/types/credentials.json";
const defaultPackageVersion = "2.29.6";
const selections = {
  "2.29.6": {
    referencePackage: "n8n@2.29.7",
    packageName,
    packageVersion: "2.29.6",
    workflowPackageVersion: "2.29.2",
    outputPath: "packages/core/schema/bundled-n8n-package.json",
    reason:
      "Pinned to the n8n-nodes-base dependency selected by n8n@2.29.7, instead of the stale-looking n8n-nodes-base latest dist-tag."
  },
  "2.30.0": {
    referencePackage: "n8n@2.30.0",
    packageName,
    packageVersion: "2.30.0",
    workflowPackageVersion: "2.30.0",
    outputPath: "packages/core/schema/bundled-n8n-package-2.30.0.json",
    reason: "Pinned to the n8n-nodes-base dependency selected by n8n@2.30.0."
  }
};

const requestedVersions = readRequestedVersions(process.argv.slice(2));
const results = [];
for (const version of requestedVersions) {
  results.push(await generateArtifact(version));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      artifacts: results
    },
    null,
    2
  )
);

function readRequestedVersions(args) {
  if (args.length === 0 || args.includes("--all")) {
    return Object.keys(selections);
  }

  const versions = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--package-version") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("--package-version requires a value.");
      }
      versions.push(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--package-version=")) {
      versions.push(arg.slice("--package-version=".length));
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  for (const version of versions) {
    if (!Object.hasOwn(selections, version)) {
      throw new Error(`Unsupported pinned package version: ${version}`);
    }
  }

  return [...new Set(versions)];
}

async function generateArtifact(version) {
  const selection = selections[version];
  const packageRootContext = await resolvePackageRoot(version);

  try {
    const packageJson = JSON.parse(await readFile(join(packageRootContext.packageRoot, "package.json"), "utf8"));
    const [nodeDefinitions, credentialDefinitions] = await Promise.all([
      readJsonArray(join(packageRootContext.packageRoot, nodeMetadataFile), "node definitions"),
      readJsonArray(join(packageRootContext.packageRoot, credentialMetadataFile), "credential definitions")
    ]);

    const nodeEntries = nodeDefinitions
      .map((definition) => {
        const name = readDefinitionName(definition);
        if (name === undefined) {
          return undefined;
        }

        return {
          definition,
          name: qualifyNodeType(name, packageName)
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
      selection: {
        referencePackage: selection.referencePackage,
        packageName: selection.packageName,
        packageVersion: selection.packageVersion,
        workflowPackageVersion: selection.workflowPackageVersion,
        reason: selection.reason
      },
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

    if (artifact.package.version !== version) {
      throw new Error(`Expected ${packageName}@${version}, loaded ${artifact.package.name}@${artifact.package.version}.`);
    }

    const outputPath = join(repoRoot, selection.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

    return {
      outputPath: selection.outputPath,
      package: `${artifact.package.name}@${artifact.package.version}`,
      nodeTypes: artifact.nodeTypes.length,
      credentialTypes: artifact.credentialTypes.length,
      parameterizedNodeTypes: Object.keys(artifact.nodeParameterNames).length,
      triggerNodeTypes: artifact.triggerNodeTypes.length,
      packageRootSource: packageRootContext.source
    };
  } finally {
    await packageRootContext.cleanup();
  }
}

async function resolvePackageRoot(version) {
  if (version === defaultPackageVersion) {
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    return {
      packageRoot: dirname(packageJsonPath),
      source: "installed-dev-dependency",
      async cleanup() {}
    };
  }

  const workDir = await mkdtemp(join(tmpdir(), "n8n-lint-schema-"));
  const packResult = runCommand(npmExecutable(), ["pack", `${packageName}@${version}`, "--pack-destination", workDir]);
  const tarballName = packResult.stdout
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  if (!tarballName) {
    throw new Error(`Could not determine npm pack tarball name for ${packageName}@${version}.`);
  }

  const tarballPath = join(workDir, basename(tarballName));
  const extractDir = join(workDir, "extract");
  await mkdir(extractDir);
  runCommand("tar", ["-xzf", tarballPath, "-C", extractDir]);

  return {
    packageRoot: join(extractDir, "package"),
    source: "npm-pack-tarball",
    async cleanup() {
      await rm(workDir, { recursive: true, force: true });
    }
  };
}

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    maxBuffer: 1024 * 1024 * 128
  });

  if (result.error !== undefined || result.status !== 0) {
    const detail = result.error === undefined ? result.stderr || result.stdout : String(result.error);
    throw new Error(`${command} ${args.join(" ")} failed:\n${detail}`);
  }

  return result;
}

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
