#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];
const rootNotice = await read("THIRD_PARTY_NOTICES.md");
const packageNotice = await read("packages/core/THIRD_PARTY_NOTICES.md");
const upstreamLicense = await read("packages/core/LICENSE_N8N_SUSTAINABLE_USE.md");
const corePackage = JSON.parse(await read("packages/core/package.json"));
const releaseChecklist = await read("docs/release-checklist.md");

for (const [label, text] of [
  ["root notice", rootNotice],
  ["core notice", packageNotice]
]) {
  expect(text.includes("n8n-nodes-base"), `${label} names upstream package`);
  expect(text.includes("Sustainable Use License"), `${label} names upstream license`);
  expect(text.includes("does not relicense"), `${label} separates MIT and upstream licensing`);
  expect(text.includes("not affiliated with or endorsed by n8n GmbH"), `${label} includes affiliation boundary`);
}

for (const phrase of ["Copyright License", "Limitations", "Notices", "Termination", "No Liability"]) {
  expect(upstreamLicense.includes(phrase), `upstream license includes ${phrase}`);
}

for (const file of ["THIRD_PARTY_NOTICES.md", "LICENSE_N8N_SUSTAINABLE_USE.md"]) {
  expect(corePackage.files?.includes(file), `core package ships ${file}`);
}

expect(
  releaseChecklist.includes("written n8n licensing confirmation"),
  "release checklist blocks publish on licensing approval"
);

if (failures.length > 0)
  throw new Error(`license boundary check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
console.log(JSON.stringify({ ok: true, publishStatus: "BLOCKED_PENDING_UPSTREAM_LICENSE_CONFIRMATION" }, null, 2));

async function read(filePath) {
  return readFile(filePath, "utf8");
}
function expect(condition, message) {
  if (!condition) failures.push(message);
}
