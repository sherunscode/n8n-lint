#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const packDir = mkdtempSync(join(tmpdir(), "n8n-lint-pack-"));
const smokeDir = mkdtempSync(join(tmpdir(), "n8n-lint-smoke-"));
const corePackage = readJson(join(repoRoot, "packages/core/package.json"));
const cliPackage = readJson(join(repoRoot, "packages/cli/package.json"));
const packedCore = packFileName(corePackage);
const packedCli = packFileName(cliPackage);

try {
  run("npm", ["run", "build"], repoRoot);
  run("npm", ["pack", "--workspace", "packages/core", "--pack-destination", packDir], repoRoot);
  run("npm", ["pack", "--workspace", "packages/cli", "--pack-destination", packDir], repoRoot);

  copyFileSync(join(repoRoot, "examples/known-http-request-workflow.json"), join(smokeDir, "workflow.json"));
  run("npm", ["init", "-y"], smokeDir);
  run("npm", ["install", join(packDir, packedCore), join(packDir, packedCli)], smokeDir);
  const result = run("npx", ["n8n-lint", "check", "workflow.json"], smokeDir, { capture: true });
  const output = `${result.stdout}\n${result.stderr}`;

  if (!output.includes("PASS workflow.json")) {
    throw new Error("packed install smoke did not pass workflow.json");
  }

  if (!output.includes("Schema source: bundled-n8n-package")) {
    throw new Error("packed install smoke did not use bundled-n8n-package");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        packages: [packedCore, packedCli],
        command: "npx n8n-lint check workflow.json",
        cleanedTempDirs: true
      },
      null,
      2
    )
  );
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(smokeDir, { recursive: true, force: true });
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: options.capture ? "pipe" : "inherit"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}${output ? `\n${output}` : ""}`);
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function packFileName(packageJson) {
  const normalizedName = packageJson.name.replace(/^@/, "").replace(/\//g, "-");
  return `${normalizedName}-${packageJson.version}.tgz`;
}
