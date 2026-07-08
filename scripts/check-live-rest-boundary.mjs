#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

const failures = [];
const packageJson = await readJson("package.json");
const tool = await readJson("tool.json");
const cliSource = await readText("packages/cli/src/bin.ts");
const schemaSource = await readText("packages/core/src/schema-source.ts");

expect(
  packageJson.scripts?.["check:live-rest-boundary"] === "node scripts/check-live-rest-boundary.mjs",
  "package.json must expose check:live-rest-boundary"
);
expect(
  typeof packageJson.scripts?.quality === "string" &&
    packageJson.scripts.quality.includes("npm run check:live-rest-boundary"),
  "package.json quality gate must include check:live-rest-boundary"
);
expect(
  Array.isArray(tool.notClaimed) && tool.notClaimed.includes("live REST schema validation"),
  "tool.json must preserve live REST schema validation as not claimed"
);

expect(
  cliSource.includes('type CliSchemaSource = Extract<SchemaSourceKind, "bundled-n8n-package" | "local-placeholder">;'),
  "CLI public schema source type must stay limited to bundled-n8n-package and local-placeholder"
);
expect(!cliSource.includes('"live-rest"') && !cliSource.includes("'live-rest'"), "CLI must not expose live-rest");
expect(
  cliSource.includes("--source must be bundled-n8n-package or local-placeholder."),
  "CLI usage errors must reject non-public schema sources"
);

const help = runBuiltCliHelp();
if (help !== undefined) {
  expect(!help.includes("live-rest"), "built CLI help must not mention live-rest");
  expect(
    help.includes("--source bundled-n8n-package|local-placeholder"),
    "built CLI help must document only the public schema source choices"
  );
}

expect(
  schemaSource.includes('kind: "live-rest"'),
  "core live-rest adapter must remain internal and auditable until endpoint proof exists"
);
expect(
  schemaSource.includes("n8n base URL is required for live REST schema source."),
  "core live-rest adapter must fail closed without a base URL"
);
expect(
  schemaSource.includes("Live REST schema source is configured but endpoint probing is not implemented yet."),
  "core live-rest adapter must preserve the endpoint-not-implemented warning"
);
expect(
  schemaSource.includes("Do not claim live validation from it."),
  "core live-rest adapter must preserve the non-claim implementation comment"
);

await expectLiveRestRuntimeBoundary();

await expectDocPhrases("README.md", [
  "not claim live REST schema validation yet",
  "npm run check:live-rest-boundary",
  "live REST source boundary stays locked"
]);
await expectDocPhrases("docs/deep-audit-2026-07-08.md", [
  "npm run check:live-rest-boundary",
  "live REST source boundary stays locked",
  "Live REST schema validation"
]);
await expectDocPhrases("docs/schema-source-decision.md", [
  "The CLI must not claim live schema validation until endpoint coverage is proven",
  "`npm run check:live-rest-boundary`",
  "must stay CLI-inaccessible until endpoint coverage exists"
]);
await expectDocPhrases("docs/architecture.md", ["No live REST claim without endpoint proof."]);
await expectDocPhrases("docs/json-output.md", [
  "does not claim npm registry installation, live REST schema validation",
  "Current CLI values are `bundled-n8n-package` and `local-placeholder`"
]);
await expectDocPhrases("docs/exit-codes.md", [
  "does not ship live REST schema validation",
  "network-source failure mode to prove yet"
]);
await expectDocPhrases("SECURITY.md", ["Future live REST validation must redact API keys"]);
await expectDocPhrases("tool.json", ["live REST schema validation"]);

if (failures.length > 0) {
  throw new Error(`live REST boundary check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "quality script wiring",
        "tool non-claim metadata",
        "public CLI source choices",
        "built CLI help",
        "internal live-rest placeholder behavior",
        "documentation non-claim phrases"
      ]
    },
    null,
    2
  )
);

async function expectLiveRestRuntimeBoundary() {
  let module;
  try {
    module = await import(pathToFileURL(resolve("packages/core/dist/schema-source.js")).href);
  } catch (error) {
    failures.push(
      `packages/core/dist/schema-source.js must be built before checking live REST runtime boundary: ${formatError(error)}`
    );
    return;
  }

  if (typeof module.createLiveRestSchemaSource !== "function") {
    failures.push("built core package must export createLiveRestSchemaSource");
    return;
  }

  try {
    await module.createLiveRestSchemaSource({ baseUrl: "   " }).load();
    failures.push("live REST source must fail closed when baseUrl is blank");
  } catch (error) {
    expect(
      formatError(error).includes("n8n base URL is required for live REST schema source."),
      "blank live REST baseUrl must return the documented failure"
    );
  }

  const apiKeySentinel = "redacted-token-value";
  const snapshot = await module
    .createLiveRestSchemaSource({ baseUrl: "https://example.invalid", apiKey: apiKeySentinel })
    .load();

  expect(snapshot.source === "live-rest", "internal live REST placeholder must label its source");
  expect(
    Array.isArray(snapshot.nodeTypes) && snapshot.nodeTypes.length === 0,
    "live REST placeholder must not invent node types"
  );
  expect(
    Array.isArray(snapshot.credentialTypes) && snapshot.credentialTypes.length === 0,
    "live REST placeholder must not invent credential types"
  );
  expect(
    Array.isArray(snapshot.warnings) &&
      snapshot.warnings.includes("Live REST schema source is configured but endpoint probing is not implemented yet."),
    "live REST placeholder must warn that endpoint probing is not implemented"
  );
  expect(
    JSON.stringify(snapshot).includes(apiKeySentinel) === false,
    "live REST placeholder must not echo provided API key material"
  );
}

function runBuiltCliHelp() {
  const result = spawnSync("node", ["packages/cli/dist/bin.js", "--help"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    failures.push(
      `built CLI help must exit 0; got ${result.status}: ${[result.stdout, result.stderr].join("\n").trim()}`
    );
    return undefined;
  }

  return [result.stdout, result.stderr].join("\n");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function expectDocPhrases(filePath, phrases) {
  const content = await readText(filePath);
  for (const phrase of phrases) {
    expect(hasPhrase(content, phrase), `${filePath} must include: ${phrase}`);
  }
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function hasPhrase(text, phrase) {
  return normalizeWhitespace(text).includes(normalizeWhitespace(phrase));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
