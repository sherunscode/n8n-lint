#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = await mkdtemp(join(tmpdir(), "n8n-lint-action-dist-"));
try {
  const result = spawnSync(process.execPath, ["scripts/build-action.mjs", "--output", tempRoot], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.status !== 0) throw new Error(`action build exited ${result.status}`);
  const expected = await readFile("action-dist/manifest.json", "utf8");
  const actual = await readFile(join(tempRoot, "manifest.json"), "utf8");
  if (expected !== actual) throw new Error("Committed action-dist is stale; run npm run build:action.");
  console.log(JSON.stringify({ ok: true, runtime: "node24", consumerInstallRequired: false }, null, 2));
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
