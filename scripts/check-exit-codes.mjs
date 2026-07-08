#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const cliPath = "packages/cli/dist/bin.js";
const tempDirectory = mkdtempSync(join(tmpdir(), "n8n-lint-exit-codes-"));

try {
  const invalidJsonPath = join(tempDirectory, "invalid-workflow.json");
  writeFileSync(invalidJsonPath, "{ not valid json\n", "utf8");

  const checks = [
    {
      name: "check pass exits 0",
      args: [cliPath, "check", "examples/known-http-request-workflow.json"],
      exitCode: 0,
      stdoutIncludes: ["PASS examples/known-http-request-workflow.json"]
    },
    {
      name: "schema mismatch exits 1",
      args: [cliPath, "check", "examples/failing-dead-parameter.json"],
      exitCode: 1,
      stderrIncludes: ["workflow.node_parameter_unknown"]
    },
    {
      name: "invalid json exits 1",
      args: [cliPath, "check", invalidJsonPath],
      exitCode: 1,
      stderrIncludes: ["FAIL", "Expected property name or"]
    },
    {
      name: "missing file exits 1",
      args: [cliPath, "check", "examples/does-not-exist.json"],
      exitCode: 1,
      stderrIncludes: ["FAIL examples/does-not-exist.json"]
    },
    {
      name: "unmatched batch glob exits 1",
      args: [cliPath, "check", "examples/no-match-*.json"],
      exitCode: 1,
      stdoutIncludes: ["ERROR examples/no-match-*.json", "Summary: 0 passed, 0 failed, 0 skipped, 1 errors"]
    },
    {
      name: "missing command exits 2",
      args: [cliPath],
      exitCode: 2,
      stdoutIncludes: ["Usage:"]
    },
    {
      name: "unknown option exits 2",
      args: [cliPath, "check", "examples/known-http-request-workflow.json", "--not-a-real-option"],
      exitCode: 2,
      stderrIncludes: ["Unexpected option: --not-a-real-option"],
      stdoutIncludes: ["Usage:"]
    },
    {
      name: "conflicting check output modes exit 2",
      args: [cliPath, "check", "examples/failing-dead-parameter.json", "--json", "--format=github"],
      exitCode: 2,
      stderrIncludes: ["check cannot combine --json with --format github."]
    },
    {
      name: "repair apply without confirm exits 2",
      args: [cliPath, "repair", "examples/failing-dead-parameter.json", "--apply"],
      exitCode: 2,
      stderrIncludes: ["repair --apply requires --confirm."]
    }
  ];

  for (const check of checks) {
    const result = spawnSync(process.execPath, check.args, {
      cwd: repoRoot,
      encoding: "utf8"
    });

    if (result.status !== check.exitCode) {
      fail(check, `expected exit ${check.exitCode}, received ${result.status}`);
    }

    for (const expected of check.stdoutIncludes ?? []) {
      if (!result.stdout.includes(expected)) {
        fail(check, `stdout did not include ${expected}`);
      }
    }

    for (const expected of check.stderrIncludes ?? []) {
      if (!result.stderr.includes(expected)) {
        fail(check, `stderr did not include ${expected}`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        contract: {
          0: "validation passed",
          1: "validation, read, parse, or batch input failure",
          2: "CLI usage error"
        },
        checked: checks.map((check) => check.name),
        liveRestNetworkFailure: "not applicable until a live REST schema source ships"
      },
      null,
      2
    )
  );
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

function fail(check, reason) {
  throw new Error(`${check.name}: ${reason}`);
}
