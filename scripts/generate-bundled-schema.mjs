#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const config = await readBundledSchemaConfig();
const packageName = config.packageName;
const nodeMetadataFile = config.nodeMetadataFile;
const credentialMetadataFile = config.credentialMetadataFile;
const defaultPackageVersion = config.defaultPackageVersion;
const selections = config.selections;

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
      schemaVersion: 3,
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
        credentialDefinitions.map((definition) => readDefinitionName(definition)).filter((name) => name !== undefined)
      ),
      nodeParameterNames: buildNodeParameterNameMap(nodeEntries),
      nodeParameterPaths: buildNodeParameterPathMap(nodeEntries),
      triggerNodeTypes: uniqueSorted(
        nodeEntries.filter((entry) => isTriggerNodeDefinition(entry.definition)).map((entry) => entry.name)
      )
    };

    if (artifact.package.version !== version) {
      throw new Error(
        `Expected ${packageName}@${version}, loaded ${artifact.package.name}@${artifact.package.version}.`
      );
    }

    const outputPath = join(repoRoot, config.schemaDirectory, selection.artifactFile);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

    return {
      outputPath: join(config.schemaDirectory, selection.artifactFile).replace(/\\/g, "/"),
      package: `${artifact.package.name}@${artifact.package.version}`,
      nodeTypes: artifact.nodeTypes.length,
      credentialTypes: artifact.credentialTypes.length,
      parameterizedNodeTypes: Object.keys(artifact.nodeParameterNames).length,
      nestedParameterizedNodeTypes: Object.keys(artifact.nodeParameterPaths).length,
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

async function readBundledSchemaConfig() {
  const configPath = join(repoRoot, "packages/core/schema/bundled-n8n-package-config.json");
  const parsed = JSON.parse(await readFile(configPath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Bundled schema config must be an object at ${configPath}.`);
  }

  const packageName = readRequiredString(parsed.packageName, "packageName", configPath);
  const nodeMetadataFile = readRequiredString(parsed.nodeMetadataFile, "nodeMetadataFile", configPath);
  const credentialMetadataFile = readRequiredString(
    parsed.credentialMetadataFile,
    "credentialMetadataFile",
    configPath
  );
  const schemaDirectory = readRequiredString(parsed.schemaDirectory, "schemaDirectory", configPath);
  const defaultPackageVersion = readRequiredString(parsed.defaultPackageVersion, "defaultPackageVersion", configPath);
  if (!parsed.selections || typeof parsed.selections !== "object" || Array.isArray(parsed.selections)) {
    throw new Error(`Bundled schema config selections must be an object at ${configPath}.`);
  }

  const selections = Object.fromEntries(
    Object.entries(parsed.selections).map(([packageVersion, value]) => [
      packageVersion,
      readConfigSelection(packageVersion, value, packageName, configPath)
    ])
  );

  if (!Object.hasOwn(selections, defaultPackageVersion)) {
    throw new Error(`Bundled schema config default ${defaultPackageVersion} has no selection.`);
  }

  return {
    packageName,
    nodeMetadataFile,
    credentialMetadataFile,
    schemaDirectory,
    defaultPackageVersion,
    selections
  };
}

function readConfigSelection(packageVersion, value, packageName, configPath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Bundled schema config selection ${packageVersion} must be an object.`);
  }

  const selection = {
    referencePackage: readRequiredString(value.referencePackage, `${packageVersion}.referencePackage`, configPath),
    packageName: readRequiredString(value.packageName, `${packageVersion}.packageName`, configPath),
    packageVersion: readRequiredString(value.packageVersion, `${packageVersion}.packageVersion`, configPath),
    workflowPackageVersion: readRequiredString(
      value.workflowPackageVersion,
      `${packageVersion}.workflowPackageVersion`,
      configPath
    ),
    artifactFile: readRequiredString(value.artifactFile, `${packageVersion}.artifactFile`, configPath),
    reason: readRequiredString(value.reason, `${packageVersion}.reason`, configPath)
  };

  if (selection.packageName !== packageName) {
    throw new Error(`Bundled schema config selection ${packageVersion} has packageName ${selection.packageName}.`);
  }

  if (selection.packageVersion !== packageVersion) {
    throw new Error(`Bundled schema config selection ${packageVersion} has mismatched packageVersion.`);
  }

  return selection;
}

function readRequiredString(value, label, configPath) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Bundled schema config ${label} is invalid at ${configPath}.`);
  }

  return value.trim();
}

function npmExecutable() {
  return "npm";
}

function runCommand(command, args) {
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.executable, resolved.args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 128
  });

  if (result.error !== undefined || result.status !== 0) {
    const detail = result.error === undefined ? result.stderr || result.stdout : String(result.error);
    throw new Error(`${command} ${args.join(" ")} failed:\n${detail}`);
  }

  return result;
}

function resolveCommand(command, args) {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    return { executable: "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }

  return { executable: command, args };
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

function collectParameterPaths(definition) {
  if (!definition || typeof definition !== "object" || !Array.isArray(definition.properties)) {
    return [];
  }

  return uniqueSorted(definition.properties.flatMap((property) => collectPropertyPaths(property)));
}

function collectPropertyPaths(property) {
  const name = readPropertyName(property);
  if (name === undefined) {
    return [];
  }

  const childPaths = collectChildPropertyPaths(property).map((childPath) => `${name}.${childPath}`);
  return [name, ...childPaths];
}

function collectChildPropertyPaths(property) {
  if (!property || typeof property !== "object") {
    return [];
  }

  if (property.type === "filter") {
    return [
      "combinator",
      "conditions[]",
      "options",
      "options.caseSensitive",
      "options.leftValue",
      "options.typeValidation",
      "options.version"
    ];
  }

  if (!Array.isArray(property.options)) {
    return [];
  }

  if (property.type === "collection") {
    return uniqueSorted(property.options.flatMap((option) => collectPropertyPaths(option)));
  }

  if (property.type === "fixedCollection") {
    const allowsMultiple = property.typeOptions?.multipleValues === true;
    return uniqueSorted(
      property.options.flatMap((option) => {
        const optionName = readPropertyName(option);
        if (optionName === undefined) {
          return [];
        }

        const optionSegment = allowsMultiple ? `${optionName}[]` : optionName;
        const valuePaths = Array.isArray(option.values)
          ? option.values
              .flatMap((value) => collectPropertyPaths(value))
              .map((valuePath) => `${optionSegment}.${valuePath}`)
          : [];
        return [optionSegment, ...valuePaths];
      })
    );
  }

  return [];
}

function readPropertyName(property) {
  if (!property || typeof property !== "object" || typeof property.name !== "string") {
    return undefined;
  }

  const name = property.name.trim();
  return name === "" ? undefined : name;
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

function buildNodeParameterPathMap(nodeEntries) {
  const merged = new Map();
  for (const entry of nodeEntries) {
    const current = merged.get(entry.name) ?? [];
    merged.set(entry.name, [...current, ...collectParameterPaths(entry.definition)]);
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
