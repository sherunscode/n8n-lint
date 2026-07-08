#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const failures = [];
let strategyCurrentTruth = "not present; ignored local planning artifact";

const trackedFiles = listTrackedFiles();
const scannedFiles = trackedFiles.filter(isScannableTextFile);

const globalForbiddenClaims = [
  {
    name: "old n8nproof owner path",
    pattern: /\bn8nproof\/n8n-lint\b/i
  },
  {
    name: "invalid nested sherunscode path",
    pattern: /github\.com\/sherunscode\/n8nproof/i
  },
  {
    name: "old n8nproof org checklist item",
    pattern: /Repo created under `n8nproof` org/i
  },
  {
    name: "public report placeholder URL",
    pattern: /PUBLIC_REPORT_URL/i
  },
  {
    name: "not-public-on-main stale disclaimer",
    pattern: /not public on main yet/i
  }
];

const activeLiveRestClaimPatterns = [
  {
    name: "actual running instance validation",
    pattern: /validates?[^.\n]{0,180}ACTUAL running n8n instance/i
  },
  {
    name: "live node schemas via REST API",
    pattern: /live node schemas via the (?:real )?REST API/i
  },
  {
    name: "fetching live node schemas",
    pattern: /fetching live node schemas/i
  },
  {
    name: "actual instance live schemas",
    pattern: /actual n8n instance's live node schemas/i
  },
  {
    name: "live schema fetch via n8n REST API",
    pattern: /live schema fetch via n8n REST API/i
  },
  {
    name: "actual REST API schemas",
    pattern: /validates your n8n workflow JSON against the actual REST API schemas/i
  }
];

function listTrackedFiles() {
  const result = spawnSync("git", ["ls-files"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`git ls-files failed with exit ${result.status}\n${output}`);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isScannableTextFile(filePath) {
  if (filePath === "package-lock.json" || filePath === "docs/benchmark-zie619-report.json") {
    return false;
  }

  return /\.(?:md|json|ya?ml|mjs|ts|js)$/.test(filePath) || filePath === "action.yml" || filePath === "tool.json";
}

async function expectStrategyCurrentTruth() {
  const strategy = await readOptionalFile("STRATEGY.md");
  if (strategy === null) {
    return;
  }

  strategyCurrentTruth = "present";
  const requiredPhrases = [
    "## Current implementation truth (2026-07-08)",
    "Canonical public repo: `sherunscode/n8n-lint`.",
    "Verified schema source: bundled `n8n-nodes-base@2.29.6` plus a pinned",
    "Not claimed yet: npm registry publication, live REST schema validation,"
  ];

  for (const phrase of requiredPhrases) {
    if (!strategy.includes(phrase)) {
      failures.push(`STRATEGY.md must include current-truth phrase: ${phrase}`);
    }
  }
}

async function readOptionalFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function scanGlobalForbiddenClaims() {
  for (const filePath of scannedFiles) {
    const text = await readFile(filePath, "utf8");
    for (const claim of globalForbiddenClaims) {
      if (claim.pattern.test(text)) {
        failures.push(`${filePath} contains forbidden claim/path: ${claim.name}`);
      }
    }
  }
}

async function scanActiveLiveRestClaims() {
  const activeClaimFiles = scannedFiles.filter((filePath) => filePath !== "STRATEGY.md");

  for (const filePath of activeClaimFiles) {
    const text = await readFile(filePath, "utf8");
    for (const claim of activeLiveRestClaimPatterns) {
      if (claim.pattern.test(text)) {
        failures.push(`${filePath} contains present-tense live REST claim: ${claim.name}`);
      }
    }
  }
}

await expectStrategyCurrentTruth();
await scanGlobalForbiddenClaims();
await scanActiveLiveRestClaims();

if (failures.length > 0) {
  throw new Error(`claims hygiene check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        strategyCurrentTruth,
        scannedFiles: scannedFiles.length,
        globalForbiddenClaims: globalForbiddenClaims.map((claim) => claim.name),
        activeLiveRestClaims: activeLiveRestClaimPatterns.map((claim) => claim.name)
      }
    },
    null,
    2
  )
);
