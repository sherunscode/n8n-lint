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
const deadParameter = JSON.parse(await readFile(new URL("../examples/failing-dead-parameter.json", import.meta.url), "utf8"));
const nestedDeadParameter = JSON.parse(
  await readFile(new URL("../examples/failing-nested-dead-parameter.json", import.meta.url), "utf8")
);
const staleTriggerShape = JSON.parse(
  await readFile(new URL("../examples/failing-stale-trigger-shape.json", import.meta.url), "utf8")
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

const parameterFailure = await validateWorkflow(deadParameter, source);
assert(!parameterFailure.ok, "dead parameter fixture should fail bundled schema validation");
assert(
  parameterFailure.issues.some((issue) => issue.code === "workflow.node_parameter_unknown"),
  "dead parameter fixture should report workflow.node_parameter_unknown"
);

const nestedParameterFailure = await validateWorkflow(nestedDeadParameter, source);
assert(!nestedParameterFailure.ok, "nested dead parameter fixture should fail bundled schema validation");
assert(
  nestedParameterFailure.issues.some((issue) => issue.code === "workflow.node_parameter_nested_unknown"),
  "nested dead parameter fixture should report workflow.node_parameter_nested_unknown"
);

const triggerFailure = await validateWorkflow(staleTriggerShape, source);
assert(!triggerFailure.ok, "stale trigger shape fixture should fail bundled schema validation");
assert(
  triggerFailure.issues.some((issue) => issue.code === "workflow.trigger_type_version_missing"),
  "stale trigger shape fixture should report workflow.trigger_type_version_missing"
);
assert(
  triggerFailure.issues.some((issue) => issue.code === "workflow.trigger_incoming_connection"),
  "stale trigger shape fixture should report workflow.trigger_incoming_connection"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        "core bundled schema positive fixture",
        "core unknown node fixture",
        "core unknown credential fixture",
        "core dead parameter fixture",
        "core nested dead parameter fixture",
        "core stale trigger shape fixture"
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
