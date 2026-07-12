#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const schemaPath = join(repoRoot, "schemas", "check-result.v1.schema.json");
const docsPath = join(repoRoot, "docs", "json-output.md");
const cliPath = join(repoRoot, "packages", "cli", "dist", "bin.js");
const fixtureDirectory = join(repoRoot, "examples", "check-json-schema");
const failures = [];

const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
const docs = await readFile(docsPath, "utf8");
const schema = JSON.parse(await readFile(schemaPath, "utf8"));

// strict mode flags the additionalProperties/oneOf combinations we rely on for discriminated unions.
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

expectQualityGateIncludesCheck();
expectDocsLinkSchema();

const positiveFixtures = [
  { name: "single-file", file: "single-file-fail.json" },
  { name: "batch", file: "batch-mixed.json" },
  { name: "matrix", file: "matrix-compat.json" }
];

for (const fixture of positiveFixtures) {
  const payload = JSON.parse(await readFile(join(fixtureDirectory, fixture.file), "utf8"));
  if (!validate(payload)) {
    fail(`${fixture.name} positive fixture`, formatValidationErrors(validate.errors));
  }
}

const negativeFixtures = [
  { name: "invalid batch status", file: "invalid-batch-status.json", expectedPath: "/results/0/status" },
  { name: "invalid summary shape", file: "invalid-summary-shape.json", expectedPath: "/summary/passed" },
  { name: "invalid matrix status", file: "invalid-matrix-status.json", expectedPath: "/differences/0/statusByVersion/2.29.6" }
];

for (const fixture of negativeFixtures) {
  const payload = JSON.parse(await readFile(join(fixtureDirectory, fixture.file), "utf8"));
  if (validate(payload)) {
    fail(`${fixture.name} negative fixture`, "expected schema validation to fail");
    continue;
  }

  const actualPaths = (validate.errors ?? []).map((error) => error.instancePath || "/");
  if (!actualPaths.includes(fixture.expectedPath)) {
    fail(
      `${fixture.name} negative fixture`,
      `expected validation error at ${fixture.expectedPath}, got ${actualPaths.join(", ") || "none"}`
    );
  }
}

const liveChecks = [
  {
    name: "live single-file CLI output",
    args: [cliPath, "check", "examples/failing-dead-parameter.json", "--json"]
  },
  {
    name: "live batch CLI output",
    args: [
      cliPath,
      "check",
      "examples/known-http-request-workflow.json",
      "examples/failing-dead-parameter.json",
      "examples/not-a-workflow.json",
      "--json"
    ]
  },
  {
    name: "live matrix CLI output",
    args: [cliPath, "check", "examples/matrix-2-30-parameter-workflow.json", "--n8n-version=matrix", "--json"]
  }
];

for (const check of liveChecks) {
  const result = spawnSync(process.execPath, check.args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status === null) {
    fail(check.name, `CLI process did not exit${formatOutputSnippet(result.stderr)}`);
    continue;
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    fail(
      check.name,
      `stdout was not valid JSON${formatOutputSnippet(result.stdout, result.stderr)}`
    );
    continue;
  }

  if (!validate(payload)) {
    fail(check.name, formatValidationErrors(validate.errors));
  }
}

if (failures.length > 0) {
  throw new Error(`JSON output schema check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "schemas/check-result.v1.schema.json",
      checked: [
        "quality gate wiring",
        "docs/json-output.md schema link",
        "positive single-file fixture",
        "positive batch fixture",
        "positive matrix fixture",
        "negative batch status fixture",
        "negative summary shape fixture",
        "negative matrix status fixture",
        "live single-file CLI output",
        "live batch CLI output",
        "live matrix CLI output"
      ]
    },
    null,
    2
  )
);

function expectQualityGateIncludesCheck() {
  if (
    typeof packageJson.scripts?.quality !== "string" ||
    !packageJson.scripts.quality.includes("npm run check:json-output-schema")
  ) {
    fail("quality gate", "package.json quality script must include npm run check:json-output-schema");
  }
}

function expectDocsLinkSchema() {
  const requiredPhrases = ["schemas/check-result.v1.schema.json", "Machine-readable JSON Schema"];

  for (const phrase of requiredPhrases) {
    if (!docs.includes(phrase)) {
      fail("docs/json-output.md", `must include ${JSON.stringify(phrase)}`);
    }
  }
}

function fail(name, reason) {
  failures.push(`${name}: ${reason}`);
}

function formatValidationErrors(errors) {
  return (errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`).join("; ");
}

function formatOutputSnippet(stdout, stderr) {
  const parts = [];
  if (stdout) {
    parts.push(`stdout=${JSON.stringify(truncateOutput(stdout))}`);
  }
  if (stderr) {
    parts.push(`stderr=${JSON.stringify(truncateOutput(stderr))}`);
  }

  return parts.length > 0 ? ` (${parts.join("; ")})` : "";
}

function truncateOutput(output) {
  const normalized = String(output ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}
