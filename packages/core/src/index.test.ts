import { describe, expect, it } from "vitest";
import { validateWorkflow, validateWorkflowStructure, type SchemaSnapshot, type SchemaSource } from "./index.js";

const snapshot: SchemaSnapshot = {
  source: "bundled-n8n-package",
  fetchedAt: "2026-07-11T00:00:00.000Z",
  nodeTypes: ["known.trigger", "known.action"],
  credentialTypes: ["knownCredential"],
  nodeParameterNames: { "known.action": ["options"] },
  nodeParameterPaths: { "known.action": ["options.allowed", "options.rows[].name"] },
  triggerNodeTypes: ["known.trigger"],
  nodes: [],
  credentials: [],
  warnings: ["schema proof warning"]
};

const source: SchemaSource = { kind: "bundled-n8n-package", load: () => Promise.resolve(snapshot) };

describe("validateWorkflow", () => {
  it("validates a known workflow and appends schema warnings", async () => {
    const result = await validateWorkflow(
      {
        nodes: [
          { name: "Trigger", type: "known.trigger", typeVersion: 1 },
          { name: "Action", type: "known.action", parameters: { options: { allowed: true, rows: [{ name: "a" }] } } }
        ],
        connections: { Trigger: { main: [[{ node: "Action" }]] } }
      },
      source
    );
    expect(result.ok).toBe(true);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "schema_source.warning" }));
  });

  it.each([
    [null, "workflow.not_object"],
    [{}, "workflow.nodes_missing"],
    [{ nodes: [], connections: [] }, "workflow.connections_invalid"],
    [{ nodes: [null] }, "workflow.node_invalid"],
    [{ nodes: [{}] }, "workflow.node_type_missing"],
    [{ nodes: [{ type: "unknown" }] }, "workflow.node_type_unknown"],
    [{ nodes: [{ type: "known.action", parameters: [] }] }, "workflow.node_parameters_invalid"],
    [{ nodes: [{ type: "known.action", parameters: { dead: true } }] }, "workflow.node_parameter_unknown"],
    [
      { nodes: [{ type: "known.action", parameters: { options: { dead: true } } }] },
      "workflow.node_parameter_nested_unknown"
    ],
    [{ nodes: [{ type: "known.action", credentials: [] }] }, "workflow.credentials_invalid"],
    [{ nodes: [{ type: "known.action", credentials: { renamed: {} } }] }, "workflow.credential_type_unknown"],
    [{ nodes: [{ name: "Trigger", type: "known.trigger" }] }, "workflow.trigger_type_version_missing"]
  ])("reports %s as %s", async (workflow, code) => {
    const result = await validateWorkflow(workflow, source);
    expect(result.issues.some((issue) => issue.code === code)).toBe(true);
  });

  it("rejects incoming connections to trigger nodes", async () => {
    const result = await validateWorkflow(
      {
        nodes: [
          { name: "Trigger", type: "known.trigger", typeVersion: 1 },
          { name: "Action", type: "known.action" }
        ],
        connections: { Action: { main: [[{ node: "Trigger" }]] } }
      },
      source
    );
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "workflow.trigger_incoming_connection" }));
  });

  it("keeps structure-only validation available", () => {
    expect(validateWorkflowStructure({ nodes: [{ type: "anything" }] }).ok).toBe(true);
    expect(validateWorkflowStructure([]).issues[0]?.code).toBe("workflow.not_object");
  });
});
