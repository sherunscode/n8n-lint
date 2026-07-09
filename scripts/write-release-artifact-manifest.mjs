#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const artifactsDir = process.argv[2];
if (artifactsDir === undefined || artifactsDir.trim() === "") {
  throw new Error("Usage: node scripts/write-release-artifact-manifest.mjs <release-artifacts-directory>");
}

const outputDir = resolve(artifactsDir);
await mkdir(outputDir, { recursive: true });

const repository = "https://github.com/sherunscode/n8n-lint";
const packageSpecs = [
  {
    workspace: "packages/core",
    packageJsonPath: "packages/core/package.json"
  },
  {
    workspace: "packages/cli",
    packageJsonPath: "packages/cli/package.json"
  }
];

const artifacts = [];
for (const spec of packageSpecs) {
  const packageJson = JSON.parse(await readFile(spec.packageJsonPath, "utf8"));
  const fileName = packFileName(packageJson);
  const filePath = join(outputDir, fileName);
  const bytes = await readFile(filePath);

  artifacts.push({
    workspace: spec.workspace,
    packageName: packageJson.name,
    version: packageJson.version,
    fileName: basename(filePath),
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  repository,
  gitCommit: git(["rev-parse", "HEAD"]),
  artifacts
};

const manifestPath = join(outputDir, "release-artifact-manifest.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, manifest: manifestPath, artifacts: artifacts.length }, null, 2));

function packFileName(packageJson) {
  const normalizedName = packageJson.name.replace(/^@/, "").replace(/\//g, "-");
  return `${normalizedName}-${packageJson.version}.tgz`;
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`git ${args.join(" ")} failed with exit ${result.status}${output ? `\n${output}` : ""}`);
  }

  return result.stdout.trim();
}
