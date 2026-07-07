import {
  createLocalPlaceholderSchemaSource,
  type SchemaSource,
  type SchemaSourceKind
} from "./schema-source.js";

export type {
  BundledN8nPackageSchemaSourceConfig,
  LiveRestSchemaSourceConfig,
  SchemaEntityKind,
  SchemaEntityMetadata,
  SchemaPackageInfo,
  SchemaSnapshot,
  SchemaSource,
  SchemaSourceKind
} from "./schema-source.js";
export {
  bundledN8nPackageSelection,
  createBundledN8nPackageSchemaSource,
  createLiveRestSchemaSource,
  createLocalPlaceholderSchemaSource
} from "./schema-source.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  path: string;
}

export interface ValidationResult {
  ok: boolean;
  checkedAt: string;
  source: SchemaSourceKind;
  issues: ValidationIssue[];
}

interface SchemaValidationContext {
  source: SchemaSourceKind;
  nodeTypes?: ReadonlySet<string>;
  credentialTypes?: ReadonlySet<string>;
}

interface WorkflowLike {
  name?: unknown;
  nodes?: unknown;
  connections?: unknown;
}

export function validateWorkflowStructure(workflow: unknown): ValidationResult {
  return validateWorkflowStructureWithSource(workflow, "local-placeholder");
}

export async function validateWorkflow(
  workflow: unknown,
  schemaSource: SchemaSource = createLocalPlaceholderSchemaSource()
): Promise<ValidationResult> {
  const snapshot = await schemaSource.load();
  const schemaContext: SchemaValidationContext = { source: snapshot.source };
  if (snapshot.nodeTypes.length > 0) {
    schemaContext.nodeTypes = new Set(snapshot.nodeTypes);
  }

  if (snapshot.credentialTypes.length > 0) {
    schemaContext.credentialTypes = new Set(snapshot.credentialTypes);
  }

  const validation = validateWorkflowStructureWithSource(workflow, snapshot.source, schemaContext);

  for (const warning of snapshot.warnings) {
    validation.issues.push({
      severity: "warning",
      code: "schema_source.warning",
      message: warning,
      path: "$"
    });
  }

  return validation;
}

function validateWorkflowStructureWithSource(
  workflow: unknown,
  source: SchemaSourceKind,
  schemaContext?: SchemaValidationContext
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(workflow)) {
    issues.push({
      severity: "error",
      code: "workflow.not_object",
      message: "Workflow JSON must be an object.",
      path: "$"
    });
    return result(issues, source);
  }

  const candidate = workflow as WorkflowLike;

  if (!Array.isArray(candidate.nodes)) {
    issues.push({
      severity: "error",
      code: "workflow.nodes_missing",
      message: "Workflow must include a nodes array.",
      path: "$.nodes"
    });
  }

  if (candidate.connections != null && !isRecord(candidate.connections)) {
    issues.push({
      severity: "error",
      code: "workflow.connections_invalid",
      message: "Workflow connections must be an object when present.",
      path: "$.connections"
    });
  }

  if (Array.isArray(candidate.nodes)) {
    validateWorkflowNodes(candidate.nodes, issues, schemaContext);
  }

  return result(issues, source);
}

function validateWorkflowNodes(
  nodes: unknown[],
  issues: ValidationIssue[],
  schemaContext: SchemaValidationContext | undefined
): void {
  nodes.forEach((node, index) => {
    const path = `$.nodes[${index}]`;

    if (!isRecord(node)) {
      issues.push({
        severity: "error",
        code: "workflow.node_invalid",
        message: "Workflow node must be an object.",
        path
      });
      return;
    }

    if (typeof node.type !== "string" || node.type.trim() === "") {
      issues.push({
        severity: "error",
        code: "workflow.node_type_missing",
        message: "Workflow node must include a string type.",
        path: `${path}.type`
      });
      return;
    }

    const nodeType = node.type.trim();
    if (schemaContext?.nodeTypes !== undefined && !schemaContext.nodeTypes.has(nodeType)) {
      issues.push({
        severity: "error",
        code: "workflow.node_type_unknown",
        message: `Unknown node type "${nodeType}" for schema source ${schemaContext.source}.`,
        path: `${path}.type`
      });
    }

    validateWorkflowNodeCredentials(node, path, issues, schemaContext);
  });
}

function validateWorkflowNodeCredentials(
  node: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
  schemaContext: SchemaValidationContext | undefined
): void {
  if (node.credentials == null) {
    return;
  }

  if (!isRecord(node.credentials)) {
    issues.push({
      severity: "error",
      code: "workflow.credentials_invalid",
      message: "Workflow node credentials must be an object when present.",
      path: `${path}.credentials`
    });
    return;
  }

  if (schemaContext?.credentialTypes === undefined) {
    return;
  }

  for (const credentialType of Object.keys(node.credentials)) {
    if (!schemaContext.credentialTypes.has(credentialType)) {
      issues.push({
        severity: "error",
        code: "workflow.credential_type_unknown",
        message: `Unknown credential type "${credentialType}" for schema source ${schemaContext.source}.`,
        path: `${path}.credentials.${credentialType}`
      });
    }
  }
}

function result(issues: ValidationIssue[], source: SchemaSourceKind): ValidationResult {
  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    checkedAt: new Date().toISOString(),
    source,
    issues
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
