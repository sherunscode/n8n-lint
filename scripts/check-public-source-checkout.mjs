#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repositoryUrl = "https://github.com/sherunscode/n8n-lint.git";
const publicMainRef = "refs/heads/main";
const force = process.env.N8N_LINT_PUBLIC_CLONE_FORCE === "1";
const localHead = git(["rev-parse", "HEAD"]);
const publicMainHead = git(["ls-remote", repositoryUrl, publicMainRef]).split(/\s+/)[0] ?? "";
const shouldEnforce = force || localHead === publicMainHead;

if (!/^[0-9a-f]{40}$/i.test(publicMainHead)) {
  throw new Error(`Could not resolve public main from ${repositoryUrl}`);
}

if (!shouldEnforce) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        skipped: true,
        reason: "local HEAD is not public main; public clone proof is enforced after merge to main",
        localHead,
        publicMainHead
      },
      null,
      2
    )
  );
  process.exit(0);
}

const tempRoot = mkdtempSync(join(tmpdir(), "n8n-lint-public-source-"));
const checkoutDir = join(tempRoot, "n8n-lint");

try {
  run("git", ["clone", "--depth", "1", "--branch", "main", repositoryUrl, checkoutDir], process.cwd());
  const clonedHead = git(["rev-parse", "HEAD"], checkoutDir);

  if (clonedHead !== publicMainHead) {
    throw new Error(`public clone HEAD ${clonedHead} did not match public main ${publicMainHead}`);
  }

  run("npm", ["ci"], checkoutDir);
  run("npm", ["run", "build"], checkoutDir);

  const quickstart = run(
    "node",
    ["packages/cli/dist/bin.js", "check", "examples/known-http-request-workflow.json"],
    checkoutDir,
    { capture: true }
  );
  assertIncludes(outputText(quickstart), "PASS examples/known-http-request-workflow.json", "public clone quickstart");
  assertIncludes(outputText(quickstart), "Schema source: bundled-n8n-package", "public clone quickstart");

  run("npm", ["run", "smoke:pack"], checkoutDir);

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: repositoryUrl,
        publicMainHead,
        localHead,
        mode: force ? "forced-public-main-proof" : "public-main-proof",
        checked: [
          "git clone public main",
          "npm ci",
          "npm run build",
          "README quickstart check command",
          "npm run smoke:pack"
        ],
        cleanedTempDir: true
      },
      null,
      2
    )
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function git(args, cwd = process.cwd()) {
  const result = run("git", args, cwd, { capture: true });
  return result.stdout.trim();
}

function run(command, args, cwd, options = {}) {
  const label = `${command} ${args.join(" ")}`;
  const timeout = options.timeoutMs ?? 240_000;
  process.stderr.write(`[public-source] START ${label} (timeout ${Math.round(timeout / 1000)}s)\n`);
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.executable, resolved.args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      NPM_CONFIG_AUDIT: "false",
      NPM_CONFIG_FUND: "false",
      NPM_CONFIG_PROGRESS: "false"
    },
    stdio: "pipe",
    timeout
  });

  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`${label} timed out after ${timeout}ms`);
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}${output ? `\n${output}` : ""}`);
  }

  process.stderr.write(`[public-source] PASS  ${label}\n`);

  if (!options.capture && result.stdout.trim() !== "") {
    process.stdout.write(result.stdout);
  }

  if (!options.capture && result.stderr.trim() !== "") {
    process.stderr.write(result.stderr);
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function resolveCommand(command, args) {
  if (process.platform === "win32" && command === "npm") {
    return { executable: "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }

  return { executable: command, args };
}

function assertIncludes(text, phrase, label) {
  if (!text.includes(phrase)) {
    throw new Error(`${label} output must include: ${phrase}`);
  }
}

function outputText(result) {
  return `${result.stdout}\n${result.stderr}`;
}
