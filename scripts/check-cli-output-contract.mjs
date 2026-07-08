#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const cliPath = "packages/cli/dist/bin.js";
const ansiPattern = /\u001B\[[0-9;]*m/;
const failures = [];

const checks = [
  {
    name: "interactive success uses green PASS and yellow WARN",
    args: [cliPath, "check", "examples/known-http-request-workflow.json"],
    env: { FORCE_COLOR: "1" },
    exitCode: 0,
    stdoutIncludes: ["\u001B[32mPASS\u001B[0m examples/known-http-request-workflow.json", "\u001B[33mWARN\u001B[0m"]
  },
  {
    name: "interactive failure uses red FAIL and red ERROR",
    args: [cliPath, "check", "examples/failing-dead-parameter.json"],
    env: { FORCE_COLOR: "1" },
    exitCode: 1,
    stderrIncludes: [
      "\u001B[31mFAIL\u001B[0m examples/failing-dead-parameter.json",
      "\u001B[31mERROR\u001B[0m workflow.node_parameter_unknown"
    ]
  },
  {
    name: "NO_COLOR disables colors even when FORCE_COLOR is set",
    args: [cliPath, "check", "examples/known-http-request-workflow.json"],
    env: { FORCE_COLOR: "1", NO_COLOR: "1" },
    exitCode: 0,
    stdoutIncludes: ["PASS examples/known-http-request-workflow.json", "WARN schema_source.warning"],
    noAnsi: true
  },
  {
    name: "piped output stays plain by default",
    args: [cliPath, "check", "examples/known-http-request-workflow.json"],
    exitCode: 0,
    stdoutIncludes: ["PASS examples/known-http-request-workflow.json", "WARN schema_source.warning"],
    noAnsi: true
  },
  {
    name: "JSON output stays machine-readable under FORCE_COLOR",
    args: [cliPath, "check", "examples/known-http-request-workflow.json", "--json"],
    env: { FORCE_COLOR: "1" },
    exitCode: 0,
    jsonStdout: true,
    noAnsi: true
  },
  {
    name: "GitHub annotation output stays uncolored under FORCE_COLOR",
    args: [cliPath, "check", "examples/failing-dead-parameter.json", "--format=github"],
    env: { FORCE_COLOR: "1" },
    exitCode: 1,
    stdoutIncludes: ["::error file=examples/failing-dead-parameter.json,title=workflow.node_parameter_unknown::"],
    noAnsi: true
  },
  {
    name: "batch summary remains the final human output line",
    args: [
      cliPath,
      "check",
      "examples/known-http-request-workflow.json",
      "examples/failing-dead-parameter.json",
      "examples/not-a-workflow.json"
    ],
    exitCode: 1,
    stdoutLastLine: "Summary: 1 passed, 1 failed, 1 skipped, 0 errors",
    noAnsi: true
  }
];

for (const check of checks) {
  const result = spawnSync(process.execPath, check.args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: testEnv(check.env)
  });

  if (result.status !== check.exitCode) {
    fail(check, `expected exit ${check.exitCode}, received ${result.status}`);
  }

  for (const expected of check.stdoutIncludes ?? []) {
    if (!result.stdout.includes(expected)) {
      fail(check, `stdout did not include ${JSON.stringify(expected)}`);
    }
  }

  for (const expected of check.stderrIncludes ?? []) {
    if (!result.stderr.includes(expected)) {
      fail(check, `stderr did not include ${JSON.stringify(expected)}`);
    }
  }

  if (check.stdoutLastLine !== undefined && lastLine(result.stdout) !== check.stdoutLastLine) {
    fail(check, `stdout final line was ${JSON.stringify(lastLine(result.stdout))}`);
  }

  if (check.jsonStdout === true) {
    try {
      JSON.parse(result.stdout);
    } catch {
      fail(check, "stdout was not valid JSON");
    }
  }

  if (check.noAnsi === true && ansiPattern.test(`${result.stdout}\n${result.stderr}`)) {
    fail(check, "output contained ANSI escape codes");
  }
}

if (failures.length > 0) {
  throw new Error(`CLI output contract check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "interactive color semantics",
        "NO_COLOR override",
        "piped plain text",
        "JSON no-color safety",
        "GitHub annotation no-color safety",
        "batch final summary line"
      ]
    },
    null,
    2
  )
);

function fail(check, reason) {
  failures.push(`${check.name}: ${reason}`);
}

function testEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  return { ...env, ...overrides };
}

function lastLine(output) {
  const lines = output.replace(/\r\n/g, "\n").trimEnd().split("\n");
  return lines.at(-1) ?? "";
}
