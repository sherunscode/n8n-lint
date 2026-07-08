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
  nodeParameterPaths?: ReadonlyMap<string, ParameterPathNode>;
  triggerNodeTypes?: ReadonlySet<string>;
}

interface ParameterPathNode {
  children: Map<string, ParameterPathNode>;
  arrayItem?: ParameterPathNode;
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

  const nodeParameterPathEntries = Object.entries(snapshot.nodeParameterPaths);
  if (nodeParameterPathEntries.length > 0) {
    schemaContext.nodeParameterPaths = new Map(
      nodeParameterPathEntries.map(([nodeType, paths]) => [nodeType, buildParameterPathTree(paths)])
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

  const parameterPathTree = schemaContext?.nodeParameterPaths?.get(nodeType);
  if (parameterPathTree === undefined) {
    return;
  }

  validateNestedParameterObject(node.parameters, parameterPathTree, `${path}.parameters`, issues, nodeType);
}

function validateNestedParameterObject(
  value: Record<string, unknown>,
  pathNode: ParameterPathNode,
  path: string,
  issues: ValidationIssue[],
  nodeType: string
): void {
  for (const [parameterName, parameterValue] of Object.entries(value)) {
    const childNode = pathNode.children.get(parameterName);
    if (childNode === undefined) {
      continue;
    }

    validateNestedParameterValue(parameterValue, childNode, `${path}.${parameterName}`, issues, nodeType);
  }
}

function validateNestedParameterValue(
  value: unknown,
  pathNode: ParameterPathNode,
  path: string,
  issues: ValidationIssue[],
  nodeType: string
): void {
  if (Array.isArray(value)) {
    if (pathNode.arrayItem === undefined) {
      return;
    }

    value.forEach((item, index) => validateNestedParameterValue(item, pathNode.arrayItem as ParameterPathNode, `${path}[${index}]`, issues, nodeType));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (pathNode.children.size === 0) {
    return;
  }

  for (const [childName, childValue] of Object.entries(value)) {
    const childNode = pathNode.children.get(childName);
    if (childNode === undefined) {
      issues.push({
        severity: "error",
        code: "workflow.node_parameter_nested_unknown",
        message: `Unknown or dead nested parameter "${childName}" for node type "${nodeType}".`,
        path: `${path}.${childName}`
      });
      continue;
    }

    validateNestedParameterValue(childValue, childNode, `${path}.${childName}`, issues, nodeType);
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

function buildParameterPathTree(paths: readonly string[]): ParameterPathNode {
  const root = createParameterPathNode();
  for (const path of paths) {
    let current = root;
    for (const segment of path.split(".").filter((item) => item.trim() !== "")) {
      const isArraySegment = segment.endsWith("[]");
      const key = isArraySegment ? segment.slice(0, -2) : segment;
      if (key === "") {
        continue;
      }

      let child = current.children.get(key);
      if (child === undefined) {
        child = createParameterPathNode();
        current.children.set(key, child);
      }

      if (isArraySegment) {
        if (child.arrayItem === undefined) {
          child.arrayItem = createParameterPathNode();
        }

        current = child.arrayItem;
      } else {
        current = child;
      }
    }
  }

  return root;
}

function createParameterPathNode(): ParameterPathNode {
  return {
    children: new Map()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
