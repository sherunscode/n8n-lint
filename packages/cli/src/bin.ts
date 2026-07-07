#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  createBundledN8nPackageSchemaSource,
  createLocalPlaceholderSchemaSource,
  validateWorkflow,
  type SchemaSource,
  type SchemaSourceKind
} from "@n8nproof/core";

type CliSchemaSource = Extract<SchemaSourceKind, "bundled-n8n-package" | "local-placeholder">;

interface ParsedArgs {
  command?: string;
  filePath?: string;
  source: CliSchemaSource;
  json: boolean;
  help: boolean;
}

let parsed: ParsedArgs;
try {
  parsed = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printHelp();
  process.exit(2);
}

if (parsed.help || parsed.command !== "check" || !parsed.filePath) {
  printHelp();
  process.exitCode = parsed.help ? 0 : 2;
} else {
  try {
    const raw = await readFile(parsed.filePath, "utf8");
    const workflow = JSON.parse(raw) as unknown;
    const validation = await validateWorkflow(workflow, createSchemaSource(parsed.source));

    if (parsed.json) {
      console.log(JSON.stringify({ filePath: parsed.filePath, ...validation }, null, 2));
      process.exitCode = validation.ok ? 0 : 1;
      process.exit();
    }

    if (validation.ok) {
      console.log(`PASS ${parsed.filePath}`);
      console.log(`Schema source: ${validation.source}`);
      for (const issue of validation.issues.filter((item) => item.severity === "warning")) {
        console.log(`WARN ${issue.code}: ${issue.message}`);
      }
    } else {
      console.error(`FAIL ${parsed.filePath}`);
      console.error(`Schema source: ${validation.source}`);
      for (const issue of validation.issues) {
        console.error(`${issue.severity.toUpperCase()} ${issue.code} ${issue.path}: ${issue.message}`);
      }
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`FAIL ${parsed.filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): ParsedArgs {
  const parsedArgs: ParsedArgs = {
    source: "bundled-n8n-package",
    json: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      parsedArgs.help = true;
      continue;
    }

    if (arg === "--json") {
      parsedArgs.json = true;
      continue;
    }

    if (arg === "--source") {
      const source = args[index + 1];
      if (source !== "bundled-n8n-package" && source !== "local-placeholder") {
        throw new Error("--source must be bundled-n8n-package or local-placeholder.");
      }

      parsedArgs.source = source;
      index += 1;
      continue;
    }

    if (arg.startsWith("--source=")) {
      const source = arg.slice("--source=".length);
      if (source !== "bundled-n8n-package" && source !== "local-placeholder") {
        throw new Error("--source must be bundled-n8n-package or local-placeholder.");
      }

      parsedArgs.source = source;
      continue;
    }

    if (parsedArgs.command === undefined) {
      parsedArgs.command = arg;
      continue;
    }

    if (parsedArgs.filePath === undefined) {
      parsedArgs.filePath = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  return parsedArgs;
}

function createSchemaSource(source: CliSchemaSource): SchemaSource {
  if (source === "local-placeholder") {
    return createLocalPlaceholderSchemaSource();
  }

  return createBundledN8nPackageSchemaSource();
}

function printHelp(): void {
  console.log("Usage: n8n-lint check <workflow.json> [--source bundled-n8n-package|local-placeholder] [--json]");
}
