import { readFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export type SchemaSourceKind = "local-placeholder" | "live-rest" | "bundled-n8n-package";

export interface SchemaPackageInfo {
  name: string;
  version: string;
  metadataFiles: {
    nodes: string;
    credentials: string;
  };
}

export type SchemaEntityKind = "node" | "credential";

export interface SchemaEntityMetadata {
  kind: SchemaEntityKind;
  name: string;
  displayName?: string;
  sourcePackage: string;
  sourcePackageVersion: string;
}

export interface SchemaSnapshot {
  source: SchemaSourceKind;
  fetchedAt: string;
  selection?: BundledN8nPackageSelection;
  packageInfo?: SchemaPackageInfo;
  nodeTypes: readonly string[];
  credentialTypes: readonly string[];
  nodeParameterNames: Readonly<Record<string, readonly string[]>>;
  nodeParameterPaths: Readonly<Record<string, readonly string[]>>;
  triggerNodeTypes: readonly string[];
  nodes: readonly SchemaEntityMetadata[];
  credentials: readonly SchemaEntityMetadata[];
  warnings: readonly string[];
}

export interface SchemaSource {
  readonly kind: SchemaSourceKind;
  load(): Promise<SchemaSnapshot>;
}

export interface LiveRestSchemaSourceConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface BundledN8nPackageSchemaSourceConfig {
  artifactPath?: string;
  packageVersion?: BundledN8nPackageVersion;
}

interface BundledN8nPackageConfigSelection extends BundledN8nPackageSelection {
  artifactFile: string;
}

interface BundledN8nPackageConfig {
  packageName: string;
  nodeMetadataFile: string;
  credentialMetadataFile: string;
  schemaDirectory: string;
  defaultPackageVersion: BundledN8nPackageVersion;
  selections: Record<BundledN8nPackageVersion, BundledN8nPackageConfigSelection>;
}

export type BundledN8nPackageVersion = string;
const bundledN8nPackageConfig = readBundledN8nPackageConfig();
export const bundledN8nPackageVersions = Object.keys(bundledN8nPackageConfig.selections).sort((left, right) =>
  left.localeCompare(right)
);
export const defaultBundledN8nPackageVersion: BundledN8nPackageVersion = bundledN8nPackageConfig.defaultPackageVersion;
const defaultBundledSchemaArtifactPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../schema/bundled-n8n-package.json"
);
const bundledSchemaArtifactPaths: Record<BundledN8nPackageVersion, string> = Object.fromEntries(
  bundledN8nPackageVersions.map((packageVersion) => {
    const selection = readBundledN8nPackageConfigSelection(packageVersion);
    const artifactPath =
      packageVersion === defaultBundledN8nPackageVersion
        ? defaultBundledSchemaArtifactPath
        : join(dirname(fileURLToPath(import.meta.url)), "../schema", selection.artifactFile);
    return [packageVersion, artifactPath];
  })
);

export interface BundledN8nPackageSelection {
  referencePackage: string;
  packageName: string;
  packageVersion: BundledN8nPackageVersion;
  workflowPackageVersion: string;
  reason: string;
}

export const bundledN8nPackageSelections: Record<BundledN8nPackageVersion, BundledN8nPackageSelection> =
  Object.fromEntries(
    Object.entries(bundledN8nPackageConfig.selections).map(([packageVersion, selection]) => [
      packageVersion,
      toPublicBundledN8nPackageSelection(selection)
    ])
  );

const defaultBundledN8nPackageSelection = bundledN8nPackageSelections[defaultBundledN8nPackageVersion];
if (defaultBundledN8nPackageSelection === undefined) {
  throw new Error(`Bundled n8n package config is missing default ${defaultBundledN8nPackageVersion}.`);
}

export const bundledN8nPackageSelection = defaultBundledN8nPackageSelection;

function readBundledN8nPackageConfig(): BundledN8nPackageConfig {
  const configPath = join(dirname(fileURLToPath(import.meta.url)), "../schema/bundled-n8n-package-config.json");
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;

  if (!isRecord(parsed)) {
    throw new Error(`Bundled n8n package config must be an object at ${configPath}.`);
  }

  const packageName = readNonEmptyConfigString(parsed.packageName, "packageName", configPath);
  const nodeMetadataFile = readNonEmptyConfigString(parsed.nodeMetadataFile, "nodeMetadataFile", configPath);
  const credentialMetadataFile = readNonEmptyConfigString(
    parsed.credentialMetadataFile,
    "credentialMetadataFile",
    configPath
  );
  const schemaDirectory = readNonEmptyConfigString(parsed.schemaDirectory, "schemaDirectory", configPath);
  const defaultPackageVersion = readNonEmptyConfigString(
    parsed.defaultPackageVersion,
    "defaultPackageVersion",
    configPath
  );

  if (!isRecord(parsed.selections)) {
    throw new Error(`Bundled n8n package config selections must be an object at ${configPath}.`);
  }

  const selections = Object.fromEntries(
    Object.entries(parsed.selections).map(([packageVersion, value]) => [
      packageVersion,
      readConfigSelection(packageVersion, value, packageName, configPath)
    ])
  );

  if (Object.keys(selections).length === 0) {
    throw new Error(`Bundled n8n package config must include at least one selection at ${configPath}.`);
  }

  if (!Object.hasOwn(selections, defaultPackageVersion)) {
    throw new Error(`Bundled n8n package config default ${defaultPackageVersion} has no selection.`);
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

function readConfigSelection(
  packageVersion: string,
  value: unknown,
  packageName: string,
  configPath: string
): BundledN8nPackageConfigSelection {
  if (!isRecord(value)) {
    throw new Error(`Bundled n8n package config selection ${packageVersion} must be an object.`);
  }

  const selection = {
    referencePackage: readNonEmptyConfigString(
      value.referencePackage,
      `${packageVersion}.referencePackage`,
      configPath
    ),
    packageName: readNonEmptyConfigString(value.packageName, `${packageVersion}.packageName`, configPath),
    packageVersion: readNonEmptyConfigString(value.packageVersion, `${packageVersion}.packageVersion`, configPath),
    workflowPackageVersion: readNonEmptyConfigString(
      value.workflowPackageVersion,
      `${packageVersion}.workflowPackageVersion`,
      configPath
    ),
    artifactFile: readNonEmptyConfigString(value.artifactFile, `${packageVersion}.artifactFile`, configPath),
    reason: readNonEmptyConfigString(value.reason, `${packageVersion}.reason`, configPath)
  };

  if (selection.packageName !== packageName) {
    throw new Error(`Bundled n8n package config selection ${packageVersion} has packageName ${selection.packageName}.`);
  }

  if (selection.packageVersion !== packageVersion) {
    throw new Error(`Bundled n8n package config selection ${packageVersion} has mismatched packageVersion.`);
  }

  return selection;
}

function readBundledN8nPackageConfigSelection(packageVersion: string): BundledN8nPackageConfigSelection {
  const selection = bundledN8nPackageConfig.selections[packageVersion];
  if (selection === undefined) {
    throw new Error(`Bundled n8n package config is missing selection ${packageVersion}.`);
  }

  return selection;
}

function toPublicBundledN8nPackageSelection(selection: BundledN8nPackageConfigSelection): BundledN8nPackageSelection {
  return {
    referencePackage: selection.referencePackage,
    packageName: selection.packageName,
    packageVersion: selection.packageVersion,
    workflowPackageVersion: selection.workflowPackageVersion,
    reason: selection.reason
  };
}

function readNonEmptyConfigString(value: unknown, label: string, configPath: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Bundled n8n package config ${label} is invalid at ${configPath}.`);
  }

  return value.trim();
}

export function createLocalPlaceholderSchemaSource(): SchemaSource {
  return {
    kind: "local-placeholder",
    load(): Promise<SchemaSnapshot> {
      return Promise.resolve({
        source: "local-placeholder",
        fetchedAt: new Date().toISOString(),
        nodeTypes: [],
        credentialTypes: [],
        nodeParameterNames: {},
        nodeParameterPaths: {},
        triggerNodeTypes: [],
        nodes: [],
        credentials: [],
        warnings: ["Live n8n schema validation is not implemented yet; checked local workflow structure only."]
      });
    }
  };
}

export function createBundledN8nPackageSchemaSource(config: BundledN8nPackageSchemaSourceConfig = {}): SchemaSource {
  const artifactPath =
    config.artifactPath ?? bundledSchemaArtifactPaths[config.packageVersion ?? defaultBundledN8nPackageVersion];
  if (artifactPath === undefined) {
    throw new Error(`Unsupported bundled n8n package version ${config.packageVersion ?? "unknown"}.`);
  }

  return {
    kind: "bundled-n8n-package",
    async load(): Promise<SchemaSnapshot> {
      const artifact = await readBundledSchemaArtifact(artifactPath);
      const packageInfo: SchemaPackageInfo = artifact.package;
      const nodes = artifact.nodeTypes.map((name) => ({
        kind: "node" as const,
        name,
        sourcePackage: packageInfo.name,
        sourcePackageVersion: packageInfo.version
      }));
      const credentials = artifact.credentialTypes.map((name) => ({
        kind: "credential" as const,
        name,
        sourcePackage: packageInfo.name,
        sourcePackageVersion: packageInfo.version
      }));

      return {
        source: "bundled-n8n-package",
        fetchedAt: artifact.generatedAt,
        selection: artifact.selection,
        packageInfo,
        nodeTypes: nodes.map((definition) => definition.name),
        credentialTypes: credentials.map((definition) => definition.name),
        nodeParameterNames: artifact.nodeParameterNames,
        nodeParameterPaths: artifact.nodeParameterPaths,
        triggerNodeTypes: artifact.triggerNodeTypes,
        nodes,
        credentials,
        warnings: [
          "Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation."
        ]
      };
    }
  };
}

export function createLiveRestSchemaSource(config: LiveRestSchemaSourceConfig): SchemaSource {
  return {
    kind: "live-rest",
    load(): Promise<SchemaSnapshot> {
      validateLiveRestBaseUrl(config.baseUrl);

      // This is intentionally a thin placeholder until Week 1 proves the exact
      // n8n REST endpoints and auth shape. Do not claim live validation from it.
      return Promise.resolve({
        source: "live-rest",
        fetchedAt: new Date().toISOString(),
        nodeTypes: [],
        credentialTypes: [],
        nodeParameterNames: {},
        nodeParameterPaths: {},
        triggerNodeTypes: [],
        nodes: [],
        credentials: [],
        warnings: [
          "Live REST schema source is configured but endpoint probing is not implemented yet.",
          config.apiKey ? "API key was provided and kept in memory only." : "No API key was provided."
        ]
      });
    }
  };
}

function validateLiveRestBaseUrl(rawBaseUrl: string): void {
  const baseUrl = rawBaseUrl.trim();
  if (!baseUrl) {
    throw new Error("n8n base URL is required for live REST schema source.");
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("n8n base URL must be a valid HTTPS URL for live REST schema source.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("n8n base URL must use HTTPS for live REST schema source.");
  }

  if (parsed.username !== "" || parsed.password !== "") {
    throw new Error("n8n base URL must not include credentials for live REST schema source.");
  }
}

export function isBundledN8nPackageVersion(value: string): boolean {
  return bundledN8nPackageVersions.includes(value);
}

interface BundledSchemaArtifact {
  schemaVersion: 1 | 2 | 3;
  generatedAt: string;
  package: SchemaPackageInfo;
  selection: BundledN8nPackageSelection;
  nodeTypes: string[];
  credentialTypes: string[];
  nodeParameterNames: Record<string, string[]>;
  nodeParameterPaths: Record<string, string[]>;
  triggerNodeTypes: string[];
}

async function readBundledSchemaArtifact(filePath: string): Promise<BundledSchemaArtifact> {
  const raw = await readFileAsync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!isRecord(parsed)) {
    throw new Error(`Expected bundled n8n schema artifact to be an object at ${filePath}.`);
  }

  const packageInfo = readArtifactPackageInfo(parsed.package, filePath);
  const nodeTypes = readStringArray(parsed.nodeTypes, "nodeTypes", filePath);
  const credentialTypes = readStringArray(parsed.credentialTypes, "credentialTypes", filePath);
  const nodeParameterNames =
    parsed.schemaVersion === 1 ? {} : readStringArrayRecord(parsed.nodeParameterNames, "nodeParameterNames", filePath);
  const nodeParameterPaths =
    parsed.schemaVersion === 3 ? readStringArrayRecord(parsed.nodeParameterPaths, "nodeParameterPaths", filePath) : {};
  const triggerNodeTypes =
    parsed.schemaVersion === 1 ? [] : readStringArray(parsed.triggerNodeTypes, "triggerNodeTypes", filePath);

  if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2 && parsed.schemaVersion !== 3) {
    throw new Error(`Unsupported bundled n8n schema artifact version at ${filePath}.`);
  }

  if (typeof parsed.generatedAt !== "string" || parsed.generatedAt.trim() === "") {
    throw new Error(`Bundled n8n schema artifact is missing generatedAt at ${filePath}.`);
  }

  return {
    schemaVersion: parsed.schemaVersion,
    generatedAt: parsed.generatedAt,
    package: packageInfo,
    selection: readArtifactSelection(parsed.selection, packageInfo, filePath),
    nodeTypes,
    credentialTypes,
    nodeParameterNames,
    nodeParameterPaths,
    triggerNodeTypes
  };
}

function readArtifactSelection(
  value: unknown,
  packageInfo: SchemaPackageInfo,
  filePath: string
): BundledN8nPackageSelection {
  if (!isRecord(value)) {
    return inferArtifactSelection(packageInfo, filePath);
  }

  const referencePackage = readNonEmptySelectionString(value.referencePackage, "referencePackage", filePath);
  const packageName = readNonEmptySelectionString(value.packageName, "packageName", filePath);
  const packageVersion = readNonEmptySelectionString(value.packageVersion, "packageVersion", filePath);
  const workflowPackageVersion = readNonEmptySelectionString(
    value.workflowPackageVersion,
    "workflowPackageVersion",
    filePath
  );
  const reason = readNonEmptySelectionString(value.reason, "reason", filePath);

  if (!isBundledN8nPackageVersion(packageVersion)) {
    throw new Error(`Bundled n8n schema artifact has unsupported packageVersion ${packageVersion} at ${filePath}.`);
  }

  return {
    referencePackage,
    packageName,
    packageVersion,
    workflowPackageVersion,
    reason
  };
}

function inferArtifactSelection(packageInfo: SchemaPackageInfo, filePath: string): BundledN8nPackageSelection {
  if (!isBundledN8nPackageVersion(packageInfo.version)) {
    throw new Error(`Bundled n8n schema artifact is missing selection metadata at ${filePath}.`);
  }

  const selection = bundledN8nPackageSelections[packageInfo.version];
  if (selection === undefined) {
    throw new Error(`Bundled n8n schema artifact has no config selection for ${packageInfo.version} at ${filePath}.`);
  }

  return selection;
}

function readNonEmptySelectionString(value: unknown, label: string, filePath: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Bundled n8n schema artifact selection.${label} is invalid at ${filePath}.`);
  }

  return value.trim();
}

function readArtifactPackageInfo(value: unknown, filePath: string): SchemaPackageInfo {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.version !== "string") {
    throw new Error(`Bundled n8n schema artifact is missing package identity at ${filePath}.`);
  }

  if (!isRecord(value.metadataFiles)) {
    throw new Error(`Bundled n8n schema artifact is missing metadata file paths at ${filePath}.`);
  }

  const nodes = value.metadataFiles.nodes;
  const credentials = value.metadataFiles.credentials;
  if (typeof nodes !== "string" || typeof credentials !== "string") {
    throw new Error(`Bundled n8n schema artifact metadata file paths are invalid at ${filePath}.`);
  }

  return {
    name: value.name,
    version: value.version,
    metadataFiles: {
      nodes,
      credentials
    }
  };
}

function readStringArray(rawValue: unknown, label: string, filePath: string): string[] {
  if (!Array.isArray(rawValue)) {
    throw new Error(`Bundled n8n schema artifact ${label} must be an array at ${filePath}.`);
  }

  const names: string[] = [];
  for (const value of rawValue) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Bundled n8n schema artifact ${label} includes an invalid name at ${filePath}.`);
    }

    names.push(value.trim());
  }

  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

function readStringArrayRecord(rawValue: unknown, label: string, filePath: string): Record<string, string[]> {
  if (!isRecord(rawValue)) {
    throw new Error(`Bundled n8n schema artifact ${label} must be an object at ${filePath}.`);
  }

  const entries: Array<[string, string[]]> = Object.entries(rawValue).map(([key, value]) => [
    key,
    readStringArray(value, `${label}.${key}`, filePath)
  ]);
  return Object.fromEntries(entries);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
