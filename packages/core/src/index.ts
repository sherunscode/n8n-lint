import {
  createLocalPlaceholderSchemaSource,
  type SchemaSource,
  type SchemaSourceKind
} from "./schema-source.js";

export type {
  BundledN8nPackageSelection,
  BundledN8nPackageSchemaSourceConfig,
  BundledN8nPackageVersion,
  LiveRestSchemaSourceConfig,
  SchemaEntityKind,
  SchemaEntityMetadata,
  SchemaPackageInfo,
  SchemaSnapshot,
  SchemaSource,
  SchemaSourceKind
} from "./schema-source.js";
export {
  bundledN8nPackageSelections,
  bundledN8nPackageSelection,
  bundledN8nPackageVersions,
  createBundledN8nPackageSchemaSource,
  defaultBundledN8nPackageVersion,
  createLiveRestSchemaSource,
  createLocalPlaceholderSchemaSource,
  isBundledN8nPackageVersion
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
  nodeParameterNames?: ReadonlyMap<string, ReadonlySet<string>>;
  triggerNodeTypes?: ReadonlySet<string>;
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

  const nodeParameterEntries = Object.entries(snapshot.nodeParameterNames);
  if (nodeParameterEntries.length > 0) {
    schemaContext.nodeParameterNames = new Map(
      nodeParameterEntries.map(([nodeType, names]) => [nodeType, new Set(names)])
    );
  }

  if (snapshot.triggerNodeTypes.length > 0) {
    schemaContext.triggerNodeTypes = new Set(snapshot.triggerNodeTypes);
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

  if (Array.isArray(candidate.nodes) && isRecord(candidate.connections)) {
    validateTriggerConnections(candidate.nodes, candidate.connections, issues, schemaContext);
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

    validateWorkflowNodeParameters(node, nodeType, path, issues, schemaContext);
    validateWorkflowNodeCredentials(node, path, issues, schemaContext);
    validateTriggerNodeShape(node, nodeType, path, issues, schemaContext);
  });
}

function validateWorkflowNodeParameters(
  node: Record<string, unknown>,
  nodeType: string,
  path: string,
  issues: ValidationIssue[],
  schemaContext: SchemaValidationContext | undefined
): void {
  if (node.parameters == null) {
    return;
  }

  if (!isRecord(node.parameters)) {
    issues.push({
      severity: "error",
      code: "workflow.node_parameters_invalid",
      message: "Workflow node parameters must be an object when present.",
      path: `${path}.parameters`
    });
    return;
  }

  const allowedParameters = schemaContext?.nodeParameterNames?.get(nodeType);
  if (allowedParameters === undefined) {
    return;
  }

  for (const parameterName of Object.keys(node.parameters)) {
    if (!allowedParameters.has(parameterName)) {
      issues.push({
        severity: "error",
        code: "workflow.node_parameter_unknown",
        message: `Unknown or dead parameter "${parameterName}" for node type "${nodeType}".`,
        path: `${path}.parameters.${parameterName}`
      });
    }
  }
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
        message: `Unknown or renamed credential type "${credentialType}" for schema source ${schemaContext.source}.`,
        path: `${path}.credentials.${credentialType}`
      });
    }
  }
}

function validateTriggerNodeShape(
  node: Record<string, unknown>,
  nodeType: string,
  path: string,
  issues: ValidationIssue[],
  schemaContext: SchemaValidationContext | undefined
): void {
  if (!schemaContext?.triggerNodeTypes?.has(nodeType)) {
    return;
  }

  if (typeof node.typeVersion !== "number") {
    issues.push({
      severity: "error",
      code: "workflow.trigger_type_version_missing",
      message: `Trigger node "${nodeType}" must include a numeric typeVersion to avoid stale trigger-shape ambiguity.`,
      path: `${path}.typeVersion`
    });
  }
}

function validateTriggerConnections(
  nodes: unknown[],
  connections: Record<string, unknown>,
  issues: ValidationIssue[],
  schemaContext: SchemaValidationContext | undefined
): void {
  if (schemaContext?.triggerNodeTypes === undefined) {
    return;
  }

  const triggerNodeNames = new Set<string>();
  for (const node of nodes) {
    if (!isRecord(node) || typeof node.name !== "string" || typeof node.type !== "string") {
      continue;
    }

    if (schemaContext.triggerNodeTypes.has(node.type.trim()) && node.name.trim() !== "") {
      triggerNodeNames.add(node.name.trim());
    }
  }

  if (triggerNodeNames.size === 0) {
    return;
  }

  for (const [sourceNodeName, connectionShape] of Object.entries(connections)) {
    visitConnectionTargets(connectionShape, `$.connections.${sourceNodeName}`, (targetName, path) => {
      if (triggerNodeNames.has(targetName)) {
        issues.push({
          severity: "error",
          code: "workflow.trigger_incoming_connection",
          message: `Trigger node "${targetName}" has an incoming connection, which indicates a stale trigger graph shape.`,
          path
        });
      }
    });
  }
}

function visitConnectionTargets(
  value: unknown,
  path: string,
  onTarget: (targetName: string, path: string) => void
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitConnectionTargets(item, `${path}[${index}]`, onTarget));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (typeof value.node === "string" && value.node.trim() !== "") {
    onTarget(value.node.trim(), `${path}.node`);
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "node") {
      continue;
    }

    visitConnectionTargets(child, `${path}.${key}`, onTarget);
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
