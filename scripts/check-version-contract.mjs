#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const root = JSON.parse(await readFile("package.json", "utf8"));
const cli = JSON.parse(await readFile("packages/cli/package.json", "utf8"));
const core = JSON.parse(await readFile("packages/core/package.json", "utf8"));
const action = JSON.parse(await readFile("packages/action/package.json", "utf8"));
const source = await readFile("packages/cli/src/bin.ts", "utf8");
const versions = new Set([root.version, cli.version, core.version, action.version]);

if (versions.size !== 1) throw new Error(`workspace versions differ: ${[...versions].join(", ")}`);
const version = cli.version;
if (!source.includes(`const cliVersion = "${version}";`)) throw new Error(`CLI --version must match ${version}`);

console.log(JSON.stringify({ ok: true, version, node: ">=22.0.0" }, null, 2));
