#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = "packages/cli/dist/bin.js";
const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

const checks = [
  {
    name: "positive fixture passes with bundled source",
    args: [cliPath, "check", "examples/known-http-request-workflow.json"],
    exitCode: 0,
    stdoutIncludes: ["PASS examples/known-http-request-workflow.json", "Schema source: bundled-n8n-package"]
  },
  {
    name: "missing nodes fixture fails structure validation",
    args: [cliPath, "check", "examples/failing-missing-nodes.json"],
    exitCode: 1,
    stderrIncludes: ["workflow.nodes_missing"]
  },
  {
    name: "unknown node fixture fails schema validation",
    args: [cliPath, "check", "examples/failing-unknown-node.json"],
    exitCode: 1,
    stderrIncludes: ["workflow.node_type_unknown", "n8n-nodes-base.notARealNode"]
  },
  {
    name: "unknown credential fixture fails schema validation",
    args: [cliPath, "check", "examples/failing-unknown-credential.json"],
    exitCode: 1,
    stderrIncludes: ["workflow.credential_type_unknown", "notARealCredential"]
  },
  {
    name: "dead parameter fixture fails schema validation",
    args: [cliPath, "check", "examples/failing-dead-parameter.json"],
    exitCode: 1,
    stderrIncludes: ["workflow.node_parameter_unknown", "notARealParameter"]
  },
  {
    name: "nested dead parameter fixture fails schema validation",
    args: [cliPath, "check", "examples/failing-nested-dead-parameter.json"],
    exitCode: 1,
    stderrIncludes: [
      "workflow.node_parameter_nested_unknown",
      "$.nodes[0].parameters.options.redirect.redirect.notARealNestedParameter"
    ]
  },
  {
    name: "stale trigger shape fixture fails schema validation",
    args: [cliPath, "check", "examples/failing-stale-trigger-shape.json"],
    exitCode: 1,
    stderrIncludes: ["workflow.trigger_type_version_missing", "workflow.trigger_incoming_connection"]
  },
  {
    name: "json output mode reports source",
    args: [cliPath, "check", "examples/known-http-request-workflow.json", "--json"],
    exitCode: 0,
    stdoutIncludes: ['"source": "bundled-n8n-package"']
  },
  {
    name: "batch mode reports mixed explicit inputs",
    args: [
      cliPath,
      "check",
      "examples/known-http-request-workflow.json",
      "examples/failing-dead-parameter.json",
      "examples/not-a-*.json"
    ],
    exitCode: 1,
    stdoutIncludes: [
      "PASS examples/known-http-request-workflow.json",
      "FAIL examples/failing-dead-parameter.json",
      "workflow.node_parameter_unknown",
      "SKIP examples/not-a-workflow.json",
      "Summary: 1 passed, 1 failed, 2 warnings, 1 skipped, 0 errors"
    ]
  },
  {
    name: "batch json mode reports summary",
    args: [
      cliPath,
      "check",
      "examples/known-http-request-workflow.json",
      "examples/failing-dead-parameter.json",
      "examples/not-a-*.json",
      "--json"
    ],
    exitCode: 1,
    stdoutIncludes: ['"summary"', '"passed": 1', '"failed": 1', '"warnings": 2', '"skipped": 1', '"status": "skipped"']
  },
  {
    name: "explicit malformed workflow fails in multi-input mode",
    args: [
      cliPath,
      "check",
      "examples/known-http-request-workflow.json",
      "examples/failing-missing-nodes.json",
      "--json"
    ],
    exitCode: 1,
    stdoutIncludes: ['"code": "workflow.nodes_missing"', '"failed": 1', '"skipped": 0']
  },
  {
    name: "batch glob mode can skip ordinary json without failing",
    args: [cliPath, "check", "examples/not-a-*.json"],
    exitCode: 0,
    stdoutIncludes: [
      "SKIP examples/not-a-workflow.json",
      "Summary: 0 passed, 0 failed, 0 warnings, 1 skipped, 0 errors"
    ]
  },
  {
    name: "version output matches package metadata",
    args: [cliPath, "--version"],
    exitCode: 0,
    stdoutIncludes: ["0.0.0"]
  },
  {
    name: "check rejects repair-only options",
    args: [cliPath, "check", "examples/passing-workflow.json", "--apply", "--confirm"],
    exitCode: 2,
    stderrIncludes: ["check does not support --apply, --confirm."]
  },
  {
    name: "badge rejects schema-source options",
    args: [cliPath, "badge", "examples/badge-batch-result.json", "--source", "local-placeholder"],
    exitCode: 2,
    stderrIncludes: ["badge does not support --source."]
  },
  {
    name: "badge markdown output uses checked json result",
    args: [cliPath, "badge", "examples/badge-batch-result.json"],
    exitCode: 0,
    stdoutIncludes: ["![n8n-lint: 1 passing]", "https://img.shields.io/badge/n8n--lint-1_passing-brightgreen"]
  },
  {
    name: "badge json output reports summary-derived status",
    args: [cliPath, "badge", "examples/badge-batch-result.json", "--format", "json"],
    exitCode: 0,
    stdoutIncludes: [
      '"message": "1 passing"',
      '"color": "brightgreen"',
      '"sourceFile": "examples/badge-batch-result.json"'
    ]
  },
  {
    name: "badge svg output is static local markup",
    args: [cliPath, "badge", "examples/badge-batch-result.json", "--format=svg", "--label", "n8n proof"],
    exitCode: 0,
    stdoutIncludes: ['<svg xmlns="http://www.w3.org/2000/svg"', "n8n proof", "1 passing"]
  },
  {
    name: "last-verified badge renders green for recent proof",
    args: [
      cliPath,
      "badge",
      "examples/badge-last-verified-green.json",
      "--kind",
      "last-verified",
      "--as-of",
      "2026-07-08"
    ],
    exitCode: 0,
    stdoutIncludes: [
      "![last verified: n8n v2.29.6, verified 2 days ago]",
      "last_verified-n8n_v2.29.6%2C_verified_2_days_ago-brightgreen"
    ]
  },
  {
    name: "last-verified badge renders yellow when recheck is recommended",
    args: [
      cliPath,
      "badge",
      "examples/badge-last-verified-yellow.json",
      "--kind=last-verified",
      "--as-of=2026-07-08",
      "--format",
      "json"
    ],
    exitCode: 0,
    stdoutIncludes: [
      '"message": "n8n v2.29.6, verified 45 days ago - recheck recommended"',
      '"color": "yellow"',
      '"ageDays": 45',
      '"state": "recheck-recommended"'
    ]
  },
  {
    name: "last-verified badge renders red when stale",
    args: [
      cliPath,
      "badge",
      "examples/badge-last-verified-red.json",
      "--kind",
      "last-verified",
      "--as-of",
      "2026-07-08",
      "--format=svg"
    ],
    exitCode: 0,
    stdoutIncludes: [
      '<svg xmlns="http://www.w3.org/2000/svg"',
      "last verified",
      "n8n v2.29.6, verified 120 days ago - stale, unverified",
      "#e05d44"
    ]
  },
  {
    name: "explicit 2.30 schema accepts 2.30-only parameter",
    args: [cliPath, "check", "examples/matrix-2-30-parameter-workflow.json", "--n8n-version=2.30.0"],
    exitCode: 0,
    stdoutIncludes: ["PASS examples/matrix-2-30-parameter-workflow.json"]
  },
  {
    name: "default 2.29 schema rejects 2.30-only parameter",
    args: [cliPath, "check", "examples/matrix-2-30-parameter-workflow.json"],
    exitCode: 1,
    stderrIncludes: ["workflow.node_parameter_unknown", "clearWarning"]
  },
  {
    name: "matrix mode reports real version compatibility difference",
    args: [cliPath, "check", "examples/matrix-2-30-parameter-workflow.json", "--n8n-version=matrix"],
    exitCode: 1,
    stdoutIncludes: [
      "MATRIX n8n-nodes-base@2.29.6: FAIL",
      "MATRIX n8n-nodes-base@2.30.0: PASS",
      "DIFF examples/matrix-2-30-parameter-workflow.json: 2.29.6=failed, 2.30.0=passed",
      "Matrix summary: 2 versions, 1 compatibility differences"
    ]
  },
  {
    name: "matrix json includes per-version summaries and differences",
    args: [cliPath, "check", "examples/matrix-2-30-parameter-workflow.json", "--n8n-version=matrix", "--json"],
    exitCode: 1,
    stdoutIncludes: [
      '"packageVersion": "2.29.6"',
      '"packageVersion": "2.30.0"',
      '"differences"',
      '"2.29.6": "failed"',
      '"2.30.0": "passed"'
    ]
  },
  {
    name: "github format emits actions annotations for validation failures",
    args: [cliPath, "check", "examples/failing-dead-parameter.json", "--format=github"],
    exitCode: 1,
    stdoutIncludes: [
      "::error file=examples/failing-dead-parameter.json,title=workflow.node_parameter_unknown::",
      "::warning file=examples/failing-dead-parameter.json,title=schema_source.warning::",
      "Summary: 0 passed, 1 failed, 1 warnings, 0 skipped, 0 errors"
    ]
  },
  {
    name: "github format emits matrix annotations with version-prefixed titles",
    args: [cliPath, "check", "examples/matrix-2-30-parameter-workflow.json", "--n8n-version=matrix", "--format=github"],
    exitCode: 1,
    stdoutIncludes: [
      "MATRIX n8n-nodes-base@2.29.6: FAIL",
      "::error file=examples/matrix-2-30-parameter-workflow.json,title=2.29.6%3Aworkflow.node_parameter_unknown::",
      "Matrix summary: 2 versions, 1 compatibility differences"
    ]
  },
  {
    name: "github format cannot be combined with json check output",
    args: [cliPath, "check", "examples/failing-dead-parameter.json", "--json", "--format=github"],
    exitCode: 2,
    stderrIncludes: ["check cannot combine --json with --format github."]
  },
  {
    name: "check rejects badge-only format values",
    args: [cliPath, "check", "examples/failing-dead-parameter.json", "--format=json"],
    exitCode: 2,
    stderrIncludes: ["check --format only supports github; use --json for JSON output."]
  },
  {
    name: "badge rejects github output format",
    args: [cliPath, "badge", "examples/badge-batch-result.json", "--format=github"],
    exitCode: 2,
    stderrIncludes: ["badge --format must be markdown, json, or svg."]
  },
  {
    name: "repair rejects format output options",
    args: [cliPath, "repair", "examples/failing-dead-parameter.json", "--format=github"],
    exitCode: 2,
    stderrIncludes: ["repair does not support --format; use --json for machine-readable output."]
  },
  {
    name: "repair emits a diff without mutating the workflow",
    args: [cliPath, "repair", "examples/failing-dead-parameter.json"],
    exitCode: 0,
    stdoutIncludes: [
      "--- examples/failing-dead-parameter.json",
      "+++ examples/failing-dead-parameter.json",
      '-        "notARealParameter": true'
    ]
  },
  {
    name: "repair json reports conservative change model",
    args: [cliPath, "repair", "examples/failing-dead-parameter.json", "--json"],
    exitCode: 0,
    stdoutIncludes: [
      '"ok": true',
      '"code": "remove_unknown_parameter"',
      '"path": "$.nodes[0].parameters.notARealParameter"'
    ]
  },
  {
    name: "repair keeps non-repairable stale trigger failures blocked",
    args: [cliPath, "repair", "examples/failing-stale-trigger-shape.json"],
    exitCode: 1,
    stderrIncludes: ["No repairable issues found."]
  },
  {
    name: "repair keeps nested parameter failures blocked",
    args: [cliPath, "repair", "examples/failing-nested-dead-parameter.json"],
    exitCode: 1,
    stderrIncludes: ["No repairable issues found."]
  },
  {
    name: "repair apply requires explicit confirmation",
    args: [cliPath, "repair", "examples/failing-dead-parameter.json", "--apply"],
    exitCode: 2,
    stderrIncludes: ["repair --apply requires --confirm."]
  }
];

for (const check of checks) {
  const result = spawnSync(process.execPath, check.args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: plainOutputEnv()
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

const tempRepairDirectory = mkdtempSync(join(tmpdir(), "n8n-lint-repair-"));
try {
  const tempWorkflowPath = join(tempRepairDirectory, "workflow.json");
  copyFileSync(join(repoRoot, "examples/failing-dead-parameter.json"), tempWorkflowPath);

  const result = spawnSync(process.execPath, [cliPath, "repair", tempWorkflowPath, "--apply", "--confirm"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: plainOutputEnv()
  });

  if (result.status !== 0) {
    throw new Error(`repair apply temp copy: expected exit 0, received ${result.status}`);
  }

  const repaired = readFileSync(tempWorkflowPath, "utf8");
  if (repaired.includes("notARealParameter")) {
    throw new Error("repair apply temp copy: repaired file still contains notARealParameter");
  }
} finally {
  rmSync(tempRepairDirectory, { recursive: true, force: true });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [...checks.map((check) => check.name), "repair apply mutates only a temp copy with confirmation"]
    },
    null,
    2
  )
);

function fail(check, reason) {
  throw new Error(`${check.name}: ${reason}`);
}

function plainOutputEnv() {
  return {
    ...process.env,
    FORCE_COLOR: "0",
    NO_COLOR: "1"
  };
}
