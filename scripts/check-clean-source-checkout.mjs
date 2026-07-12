#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const tempRoot = mkdtempSync(join(tmpdir(), "n8n-lint-clean-source-"));
const checkoutDir = join(tempRoot, "n8n-lint");

try {
  const trackedFiles = listTrackedFiles();
  copyTrackedFiles(trackedFiles);

  if (existsSync(join(checkoutDir, "node_modules"))) {
    throw new Error("clean source checkout unexpectedly contains node_modules");
  }

  run("npm", ["ci"], checkoutDir);
  run("npm", ["run", "build"], checkoutDir);

  const help = run("node", ["packages/cli/dist/bin.js", "--help"], checkoutDir, { capture: true });
  assertIncludes(outputText(help), "n8n-lint check <workflow.json|directory|glob>", "clean checkout CLI help");

  const success = run(
    "node",
    ["packages/cli/dist/bin.js", "check", "examples/known-http-request-workflow.json"],
    checkoutDir,
    { capture: true }
  );
  assertIncludes(
    outputText(success),
    "PASS examples/known-http-request-workflow.json",
    "clean checkout quickstart check"
  );
  assertIncludes(outputText(success), "Schema source: bundled-n8n-package", "clean checkout quickstart check");

  const failure = run(
    "node",
    ["packages/cli/dist/bin.js", "check", "examples/failing-dead-parameter.json"],
    checkoutDir,
    { capture: true, expectedStatus: 1 }
  );
  assertIncludes(
    outputText(failure),
    "FAIL examples/failing-dead-parameter.json",
    "clean checkout failing fixture check"
  );
  assertIncludes(
    outputText(failure),
    'Unknown or dead parameter "notARealParameter"',
    "clean checkout failing fixture check"
  );

  run("npm", ["run", "smoke:pack"], checkoutDir);

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: "tracked-file-clean-checkout",
        copiedFiles: trackedFiles.length,
        checked: [
          "npm ci",
          "npm run build",
          "node packages/cli/dist/bin.js --help",
          "README quickstart check command",
          "failing fixture nonzero exit",
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

function listTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`git ls-files failed with exit ${result.status}${output ? `\n${output}` : ""}`);
  }

  return result.stdout
    .split("\0")
    .map((file) => file.trim())
    .filter(Boolean);
}

function copyTrackedFiles(files) {
  for (const file of files) {
    const source = join(repoRoot, file);
    const destination = join(checkoutDir, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
}

function run(command, args, cwd, options = {}) {
  const label = `${command} ${args.join(" ")}`;
  const timeout = options.timeoutMs ?? 240_000;
  process.stderr.write(`[clean-source] START ${label} (timeout ${Math.round(timeout / 1000)}s)\n`);
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
  const expectedStatus = options.expectedStatus ?? 0;

  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`${label} timed out after ${timeout}ms`);
  }

  if (result.status !== expectedStatus) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `${command} ${args.join(" ")} exited ${result.status}, expected ${expectedStatus}${output ? `\n${output}` : ""}`
    );
  }

  process.stderr.write(`[clean-source] PASS  ${label}\n`);

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function resolveCommand(command, args) {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
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
