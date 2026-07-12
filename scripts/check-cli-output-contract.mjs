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
    stdoutIncludes: ["\u001B[32mPASS\u001B[0m examples/known-http-request-workflow.json", "\u001B[33mWARN\u001B[0m"],
    stdoutLastLine: "Summary: 1 passed, 0 failed, 1 warnings, 0 skipped, 0 errors"
  },
  {
    name: "interactive failure uses red FAIL and red ERROR",
    args: [cliPath, "check", "examples/failing-dead-parameter.json"],
    env: { FORCE_COLOR: "1" },
    exitCode: 1,
    stderrIncludes: [
      "\u001B[31mFAIL\u001B[0m examples/failing-dead-parameter.json",
      "\u001B[31mERROR\u001B[0m workflow.node_parameter_unknown"
    ],
    stderrLastLine: "Summary: 0 passed, 1 failed, 1 warnings, 0 skipped, 0 errors"
  },
  {
    name: "NO_COLOR disables colors even when FORCE_COLOR is set",
    args: [cliPath, "check", "examples/known-http-request-workflow.json"],
    env: { FORCE_COLOR: "1", NO_COLOR: "1" },
    exitCode: 0,
    stdoutIncludes: ["PASS examples/known-http-request-workflow.json", "WARN schema_source.warning"],
    stdoutLastLine: "Summary: 1 passed, 0 failed, 1 warnings, 0 skipped, 0 errors",
    noAnsi: true
  },
  {
    name: "piped output stays plain by default",
    args: [cliPath, "check", "examples/known-http-request-workflow.json"],
    exitCode: 0,
    stdoutIncludes: ["PASS examples/known-http-request-workflow.json", "WARN schema_source.warning"],
    stdoutLastLine: "Summary: 1 passed, 0 failed, 1 warnings, 0 skipped, 0 errors",
    noAnsi: true
  },
  {
    name: "JSON output stays machine-readable under FORCE_COLOR",
    args: [cliPath, "check", "examples/known-http-request-workflow.json", "--json"],
    env: { FORCE_COLOR: "1" },
    exitCode: 0,
    jsonStdout: true,
    jsonSummaryLast: true,
    summaryWarnings: 1,
    noAnsi: true
  },
  {
    name: "GitHub annotation output stays uncolored under FORCE_COLOR",
    args: [cliPath, "check", "examples/failing-dead-parameter.json", "--format=github"],
    env: { FORCE_COLOR: "1" },
    exitCode: 1,
    stdoutIncludes: ["::error file=examples/failing-dead-parameter.json,title=workflow.node_parameter_unknown::"],
    stdoutLastLine: "Summary: 0 passed, 1 failed, 1 warnings, 0 skipped, 0 errors",
    noAnsi: true
  },
  {
    name: "batch summary remains the final human output line",
    args: [
      cliPath,
      "check",
      "examples/known-http-request-workflow.json",
      "examples/failing-dead-parameter.json",
      "examples/not-a-*.json"
    ],
    exitCode: 1,
    stdoutLastLine: "Summary: 1 passed, 1 failed, 2 warnings, 1 skipped, 0 errors",
    noAnsi: true
  },
  {
    name: "batch JSON summary remains the final top-level field",
    args: [
      cliPath,
      "check",
      "examples/known-http-request-workflow.json",
      "examples/failing-dead-parameter.json",
      "examples/not-a-*.json",
      "--json"
    ],
    exitCode: 1,
    jsonStdout: true,
    jsonSummaryLast: true,
    summaryWarnings: 2,
    noAnsi: true
  },
  {
    name: "matrix JSON summary remains the final top-level field",
    args: [cliPath, "check", "examples/matrix-2-30-parameter-workflow.json", "--n8n-version=matrix", "--json"],
    exitCode: 1,
    jsonStdout: true,
    jsonSummaryLast: true,
    summaryWarnings: 2,
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

  if (check.stderrLastLine !== undefined && lastLine(result.stderr) !== check.stderrLastLine) {
    fail(check, `stderr final line was ${JSON.stringify(lastLine(result.stderr))}`);
  }

  let parsedStdout;
  if (check.jsonStdout === true) {
    try {
      parsedStdout = JSON.parse(result.stdout);
    } catch {
      fail(check, "stdout was not valid JSON");
    }
  }

  if (check.jsonSummaryLast === true) {
    expectJsonSummaryLast(check, result.stdout);
  }

  if (check.summaryWarnings !== undefined && parsedStdout?.summary?.warnings !== check.summaryWarnings) {
    fail(check, `summary warnings was ${JSON.stringify(parsedStdout?.summary?.warnings)}`);
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
        "human final summary lines",
        "JSON final summary field",
        "warning summary counts"
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

function expectJsonSummaryLast(check, stdout) {
  const normalized = stdout.replace(/\r\n/g, "\n").trimEnd();
  const summaryIndex = normalized.lastIndexOf('\n  "summary": {');
  if (summaryIndex === -1) {
    fail(check, "JSON output did not include a top-level summary field");
    return;
  }

  const afterSummary = normalized.slice(summaryIndex);
  if (!/"errors": \d+\n  }\n}$/.test(afterSummary)) {
    fail(check, "JSON summary was not the final top-level field");
  }
}
