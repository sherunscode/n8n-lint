#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];

const gitignore = await readText(".gitignore");
const buildLoopStatus = await readOptionalText("docs/BUILD_LOOP_STATUS.md");
const deepAudit = await readText("docs/deep-audit-2026-07-08.md");
const packageJson = JSON.parse(await readText("package.json"));

expect(
  gitignore.includes("docs/BUILD_LOOP_STATUS.md"),
  ".gitignore must keep local build-loop status notes out of the public repo"
);

if (buildLoopStatus !== null) {
  expect(
    hasPhrase(buildLoopStatus, "Historical note only"),
    "BUILD_LOOP_STATUS must explicitly say it is historical only"
  );
  expect(
    hasPhrase(buildLoopStatus, "Current authority: `docs/deep-audit-2026-07-08.md`"),
    "BUILD_LOOP_STATUS must point to the current deep audit authority"
  );
  expect(
    hasPhrase(buildLoopStatus, "Current executable gate: `npm run check:audit-report`"),
    "BUILD_LOOP_STATUS must point to the current audit-report gate"
  );
  expect(
    hasPhrase(buildLoopStatus, "Do not use the remaining non-claims below as current project status."),
    "BUILD_LOOP_STATUS must warn that old non-claims are not current status"
  );

  for (const historicalPhrase of [
    "No GitHub push was attempted",
    "No GitHub CI run was triggered",
    "No public benchmark was run or claimed",
    "entries: 8",
    "entries: 4"
  ]) {
    if (buildLoopStatus.includes(historicalPhrase)) {
      expect(
        hasPhrase(buildLoopStatus, "The old command proof is intentionally preserved for ERL-33 provenance."),
        `BUILD_LOOP_STATUS must explain preserved historical phrase: ${historicalPhrase}`
      );
    }
  }
}

expect(
  deepAudit.includes("`npm run check:audit-report` now enforces"),
  "deep audit must document the audit-report gate"
);
expect(
  deepAudit.includes("npm publish and registry-backed `npx n8n-lint`"),
  "deep audit must retain current owner-gated npm release blocker"
);
expect(
  typeof packageJson.scripts?.quality === "string" && packageJson.scripts.quality.includes("npm run check:status-docs"),
  "quality script must include status-docs gate"
);

if (failures.length > 0) {
  throw new Error(`status docs check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      localBuildLoopStatus: buildLoopStatus === null ? "absent" : "checked",
      checked: [
        "local proof artifact ignore policy",
        "BUILD_LOOP_STATUS historical-only warning when present",
        "current deep-audit pointer when present",
        "audit-report gate pointer when present",
        "preserved historical proof explanation when present",
        "quality gate inclusion"
      ]
    },
    null,
    2
  )
);

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readOptionalText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function hasPhrase(text, phrase) {
  return normalizeWhitespace(text).includes(normalizeWhitespace(phrase));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}
