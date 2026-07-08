#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const expectations = [
  {
    workspace: "packages/core",
    name: "@n8nproof/core",
    maxSize: 230_000,
    maxUnpackedSize: 1_600_000,
    expectedFiles: [
      "LICENSE",
      "README.md",
      "dist/index.d.ts",
      "dist/index.js",
      "dist/index.js.map",
      "dist/schema-source.d.ts",
      "dist/schema-source.js",
      "dist/schema-source.js.map",
      "package.json",
      "schema/bundled-n8n-package-2.30.0.json",
      "schema/bundled-n8n-package.json"
    ]
  },
  {
    workspace: "packages/cli",
    name: "n8n-lint",
    maxSize: 25_000,
    maxUnpackedSize: 100_000,
    expectedFiles: ["LICENSE", "README.md", "dist/bin.d.ts", "dist/bin.js", "dist/bin.js.map", "package.json"]
  }
];

const forbiddenPathPatterns = [
  /(^|\/)\.env(\.|$)/,
  /(^|\/)\.n8nlintrc\.json$/,
  /(^|\/)\.n8n-lint\.local\.json$/,
  /(^|\/)node_modules\//,
  /(^|\/)examples\//,
  /(^|\/)test(s)?\//,
  /(^|\/)STRATEGY\.md$/,
  /(^|\/)RESEARCH\.md$/,
  /(^|\/).*\.log$/,
  /(^|\/).*\.tsbuildinfo$/
];

const results = [];
const failures = [];

for (const expectation of expectations) {
  const pack = runPack(expectation.workspace);
  results.push({
    name: pack.name,
    version: pack.version,
    size: pack.size,
    unpackedSize: pack.unpackedSize,
    entryCount: pack.entryCount,
    files: pack.files.map((file) => file.path)
  });

  if (pack.name !== expectation.name) {
    failures.push(`${expectation.workspace} packed as ${pack.name}, expected ${expectation.name}`);
  }

  if (pack.size > expectation.maxSize) {
    failures.push(`${expectation.name} package size ${pack.size} exceeds ${expectation.maxSize}`);
  }

  if (pack.unpackedSize > expectation.maxUnpackedSize) {
    failures.push(`${expectation.name} unpacked size ${pack.unpackedSize} exceeds ${expectation.maxUnpackedSize}`);
  }

  const actualFiles = pack.files.map((file) => file.path).sort((left, right) => left.localeCompare(right));
  const expectedFiles = [...expectation.expectedFiles].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    failures.push(
      `${expectation.name} package file list changed. Expected ${expectedFiles.join(", ")}; got ${actualFiles.join(", ")}`
    );
  }

  for (const file of actualFiles) {
    if (forbiddenPathPatterns.some((pattern) => pattern.test(file))) {
      failures.push(`${expectation.name} package includes forbidden path ${file}`);
    }
  }

  if (Array.isArray(pack.bundled) && pack.bundled.length > 0) {
    failures.push(`${expectation.name} must not bundle dependencies`);
  }
}

if (failures.length > 0) {
  throw new Error(`package content check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      packages: results
    },
    null,
    2
  )
);

function runPack(workspace) {
  const result = spawnSync("npm", ["pack", "--workspace", workspace, "--json", "--dry-run"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`npm pack --workspace ${workspace} --json --dry-run failed with exit ${result.status}\n${output}`);
  }

  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || parsed.length !== 1 || !isPackResult(parsed[0])) {
    throw new Error(`Unexpected npm pack JSON output for ${workspace}`);
  }

  return parsed[0];
}

function isPackResult(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.name === "string" &&
    typeof value.version === "string" &&
    typeof value.size === "number" &&
    typeof value.unpackedSize === "number" &&
    typeof value.entryCount === "number" &&
    Array.isArray(value.files)
  );
}
