#!/usr/bin/env node
import { readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [, , workflowRootArg, reportPathArg] = process.argv;

if (!workflowRootArg) {
  console.error("Usage: npm run benchmark:zie619 -- <path-to-Zie619-n8n-workflows> [report.json]");
  console.error("This harness does not clone external repositories or invent benchmark results.");
  process.exitCode = 2;
  process.exit();
}

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const workflowRoot = resolve(workflowRootArg);
const reportPath = resolve(reportPathArg ?? "docs/benchmark-zie619-report.json");
const workflowFiles = await findJsonFiles(workflowRoot);
const startedAt = new Date().toISOString();
const results = [];

for (const workflowFile of workflowFiles) {
  const result = spawnSync(process.execPath, ["packages/cli/dist/bin.js", "check", workflowFile, "--json"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  results.push({
    path: relative(workflowRoot, workflowFile).replaceAll("\\", "/"),
    ok: result.status === 0,
    exitCode: result.status,
    stdout: parseJsonOutput(result.stdout),
    stderr: result.stderr.trim()
  });
}

const report = {
  benchmark: "Zie619/n8n-workflows",
  workflowRoot,
  startedAt,
  completedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((result) => result.ok).length,
  failed: results.filter((result) => !result.ok).length,
  results
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ok: true,
      reportPath: relative(repoRoot, reportPath).replaceAll("\\", "/"),
      total: report.total,
      passed: report.passed,
      failed: report.failed
    },
    null,
    2
  )
);

async function findJsonFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsonFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function parseJsonOutput(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}
