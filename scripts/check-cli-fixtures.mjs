#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
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
      checks: checks.map((check) => check.name)
    },
    null,
    2
  )
);

function fail(check, reason) {
  throw new Error(`${check.name}: ${reason}`);
}
