import { readFile } from "node:fs/promises";
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

const defaultN8nNodesPackage = "n8n-nodes-base";
export const bundledN8nPackageVersions = ["2.29.6", "2.30.0"] as const;
export type BundledN8nPackageVersion = (typeof bundledN8nPackageVersions)[number];
export const defaultBundledN8nPackageVersion: BundledN8nPackageVersion = "2.29.6";
const defaultBundledSchemaArtifactPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../schema/bundled-n8n-package.json"
);
const bundledSchemaArtifactPaths: Record<BundledN8nPackageVersion, string> = {
  "2.29.6": defaultBundledSchemaArtifactPath,
  "2.30.0": join(dirname(fileURLToPath(import.meta.url)), "../schema/bundled-n8n-package-2.30.0.json")
};

export interface BundledN8nPackageSelection {
  referencePackage: string;
  packageName: string;
  packageVersion: BundledN8nPackageVersion;
  workflowPackageVersion: string;
  reason: string;
}

export const bundledN8nPackageSelections: Record<BundledN8nPackageVersion, BundledN8nPackageSelection> = {
  "2.29.6": {
    referencePackage: "n8n@2.29.7",
    packageName: defaultN8nNodesPackage,
    packageVersion: "2.29.6",
    workflowPackageVersion: "2.29.2",
    reason:
      "Pinned to the n8n-nodes-base dependency selected by n8n@2.29.7, instead of the stale-looking n8n-nodes-base latest dist-tag."
  },
  "2.30.0": {
    referencePackage: "n8n@2.30.0",
    packageName: defaultN8nNodesPackage,
    packageVersion: "2.30.0",
    workflowPackageVersion: "2.30.0",
    reason: "Pinned to the n8n-nodes-base dependency selected by n8n@2.30.0."
  }
};

export const bundledN8nPackageSelection = bundledN8nPackageSelections[defaultBundledN8nPackageVersion];

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
      const baseUrl = config.baseUrl.trim();
      if (!baseUrl) {
        throw new Error("n8n base URL is required for live REST schema source.");
      }

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

export function isBundledN8nPackageVersion(value: string): value is BundledN8nPackageVersion {
  return bundledN8nPackageVersions.includes(value as BundledN8nPackageVersion);
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
  const raw = await readFile(filePath, "utf8");
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

  return bundledN8nPackageSelections[packageInfo.version];
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
