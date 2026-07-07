#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import {
  createBundledN8nPackageSchemaSource,
  validateWorkflow
} from "../packages/core/dist/index.js";

const fixture = JSON.parse(await readFile(new URL("../examples/known-http-request-workflow.json", import.meta.url), "utf8"));
const unknownNode = JSON.parse(await readFile(new URL("../examples/failing-unknown-node.json", import.meta.url), "utf8"));
const unknownCredential = JSON.parse(
  await readFile(new URL("../examples/failing-unknown-credential.json", import.meta.url), "utf8")
);
const source = createBundledN8nPackageSchemaSource();

const passing = await validateWorkflow(fixture, source);
assert(passing.ok, "known HTTP Request fixture should pass bundled schema validation");
assert(passing.source === "bundled-n8n-package", "passing fixture should use bundled schema source");

const nodeFailure = await validateWorkflow(unknownNode, source);
assert(!nodeFailure.ok, "unknown node fixture should fail bundled schema validation");
assert(
  nodeFailure.issues.some((issue) => issue.code === "workflow.node_type_unknown"),
  "unknown node fixture should report workflow.node_type_unknown"
);

const credentialFailure = await validateWorkflow(unknownCredential, source);
assert(!credentialFailure.ok, "unknown credential fixture should fail bundled schema validation");
assert(
  credentialFailure.issues.some((issue) => issue.code === "workflow.credential_type_unknown"),
  "unknown credential fixture should report workflow.credential_type_unknown"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        "core bundled schema positive fixture",
        "core unknown node fixture",
        "core unknown credential fixture"
      ]
    },
    null,
    2
  )
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
