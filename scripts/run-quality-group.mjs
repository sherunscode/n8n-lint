#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";

const group = process.argv[2];
const groups = {
  fast: [
    ["Build", "build", 120_000],
    ["Lint", "lint", 120_000],
    ["Formatting", "format:check", 60_000],
    ["Coverage", "test:coverage", 120_000],
    ["Core executable tests", "test:core", 60_000],
    ["CLI executable tests", "test:cli", 120_000]
  ],
  quality: [
    ["Fast verification", "verify:fast", 360_000],
    ["Example", "check:example", 60_000],
    ["Bundled schema", "check:bundled-schema", 60_000],
    ["Schema config", "check:schema-config", 60_000],
    ["Type hygiene", "check:type-hygiene", 60_000],
    ["CLI output", "check:cli-output", 120_000],
    ["Pre-commit", "check:precommit", 60_000],
    ["Action runtime", "check:action-dist", 120_000],
    ["Action contract", "check:github-action", 60_000],
    ["Release readiness", "check:release-readiness", 60_000],
    ["Release notes", "check:release-notes", 60_000],
    ["Release command plan", "check:release-command-plan", 60_000],
    ["Release workflow", "check:release-workflow", 60_000],
    ["Release artifact manifest", "check:release-artifact-manifest", 120_000],
    ["Live REST boundary", "check:live-rest-boundary", 60_000],
    ["Launch content", "check:launch-content", 60_000],
    ["Benchmark report", "check:benchmark-report", 60_000],
    ["Benchmark dashboard", "check:benchmark-dashboard", 60_000],
    ["Batch benchmark output", "check:batch-benchmark-output", 60_000],
    ["Strategy checklist", "check:strategy-checklist", 60_000],
    ["Generated demos", "check:generated-assets", 180_000],
    ["Audit report", "check:audit-report", 60_000],
    ["Status docs", "check:status-docs", 60_000],
    ["Metadata", "check:metadata", 60_000],
    ["Security", "check:security", 60_000],
    ["License boundary", "check:license", 60_000],
    ["Package READMEs", "check:package-readmes", 60_000],
    ["Docs", "check:docs", 60_000],
    ["Package contents", "check:pack", 120_000],
    ["Claims", "check:claims", 60_000],
    ["Links", "check:links", 60_000],
    ["Exit codes", "check:exit-codes", 60_000],
    ["Version contract", "check:version", 60_000],
    ["Production audit", "audit:prod", 60_000],
    ["Packed install", "smoke:pack", 120_000]
  ],
  remote: [
    ["Community state", "check:community", 120_000],
    ["npm boundary", "check:npm-registry-boundary", 120_000],
    ["PR gate proof", "check:github-pr-gate-proof", 120_000],
    ["Rendered README", "check:github-rendered-readme", 120_000],
    ["GitHub profile", "check:github-profile", 120_000],
    ["GitHub settings", "check:github-repo-settings", 120_000]
  ],
  release: [
    ["Local quality", "quality", 360_000],
    ["Remote quality", "quality:remote", 600_000],
    ["Clean source checkout", "check:clean-source-checkout", 300_000],
    ["Public source checkout", "check:public-source-checkout", 300_000]
  ]
};

const commands = groups[group];
if (!commands) throw new Error(`Unknown quality group: ${group ?? "missing"}`);

const startedAt = Date.now();
for (const [label, script, timeoutMs] of commands) {
  const commandStartedAt = Date.now();
  process.stdout.write(`\n[${group}] START ${label} (${script})\n`);
  await runNpmScript(script, timeoutMs);
  process.stdout.write(`[${group}] PASS ${label} ${formatDuration(Date.now() - commandStartedAt)}\n`);
}
process.stdout.write(`\n[${group}] COMPLETE ${formatDuration(Date.now() - startedAt)}\n`);

function runNpmScript(script, timeoutMs) {
  return new Promise((resolve, reject) => {
    const executable = process.platform === "win32" ? "cmd.exe" : "npm";
    const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm", "run", script] : ["run", script];
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
      detached: process.platform !== "win32"
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      terminateTree(child.pid);
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) reject(new Error(`${script} timed out after ${timeoutMs}ms`));
      else if (code !== 0) reject(new Error(`${script} exited ${code ?? signal ?? "unknown"}`));
      else resolve();
    });
  });
}

function terminateTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      // The process may have exited between timeout and termination.
    }
  }
}

function formatDuration(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}
