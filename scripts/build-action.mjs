#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const outputIndex = process.argv.indexOf("--output");
const outputRoot = outputIndex >= 0 ? process.argv[outputIndex + 1] : join(repoRoot, "action-dist");
if (!outputRoot) throw new Error("--output requires a directory.");

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const nccCli = join(repoRoot, "node_modules", "@vercel", "ncc", "dist", "ncc", "cli.js");
run(process.execPath, [nccCli, "build", "packages/action/dist/index.js", "-o", outputRoot, "--minify", "--no-cache"]);

await copyJsDirectory(join(repoRoot, "packages", "cli", "dist"), join(outputRoot, "cli"));
await writeFile(join(outputRoot, "cli", "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`);

const coreRoot = join(outputRoot, "node_modules", "@n8nproof", "core");
await copyJsDirectory(join(repoRoot, "packages", "core", "dist"), join(coreRoot, "dist"));
await cp(join(repoRoot, "packages", "core", "schema"), join(coreRoot, "schema"), { recursive: true });
await cp(join(repoRoot, "packages", "core", "LICENSE"), join(coreRoot, "LICENSE"));
await cp(join(repoRoot, "packages", "core", "THIRD_PARTY_NOTICES.md"), join(coreRoot, "THIRD_PARTY_NOTICES.md"));
await cp(
  join(repoRoot, "packages", "core", "LICENSE_N8N_SUSTAINABLE_USE.md"),
  join(coreRoot, "LICENSE_N8N_SUSTAINABLE_USE.md")
);
await writeFile(
  join(coreRoot, "package.json"),
  `${JSON.stringify({ name: "@n8nproof/core", version: "0.0.0", type: "module", exports: { ".": { default: "./dist/index.js" } } }, null, 2)}\n`
);

const files = (await listFiles(outputRoot)).filter((file) => file !== "manifest.json");
const hashes = {};
for (const file of files)
  hashes[file] = createHash("sha256")
    .update(await readFile(join(outputRoot, file)))
    .digest("hex");
await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify({ schemaVersion: 1, files: hashes }, null, 2)}\n`);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
}

async function copyJsDirectory(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".js")) await cp(join(source, entry.name), join(destination, entry.name));
  }
}

async function listFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const fullPath = join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, fullPath)));
    else if (entry.isFile()) files.push(relative(root, fullPath).replace(/\\/g, "/"));
  }
  return files.sort((left, right) => left.localeCompare(right));
}
