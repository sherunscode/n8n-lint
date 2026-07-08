#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const failures = [];
const owner = "sherunscode";
const repo = "n8n-lint";
const prNumber = 5;
const failingRunId = 28957583303;
const failingJobId = 85920525638;
const codeqlRunId = 28957583576;
const proofCommitPrefix = "2925418";
const proofBranch = "codex/pr-merge-gate-proof";
const assetPath = "docs/assets/github-pr-merge-gate-proof.png";
const proofPath = "docs/github-pr-merge-gate-proof.md";

const packageJson = await readJson("package.json");
const proofDoc = await readText(proofPath);
const readme = await readText("README.md");
const deepAudit = await readText("docs/deep-audit-2026-07-08.md");
const launchContentPack = await readText("docs/launch-content-pack.md");
const screenshot = await readFile(assetPath);

expect(
  packageJson.scripts?.["check:github-pr-gate-proof"] === "node scripts/check-github-pr-gate-proof.mjs",
  "package.json must expose check:github-pr-gate-proof"
);
expect(
  typeof packageJson.scripts?.quality === "string" &&
    packageJson.scripts.quality.includes("npm run check:github-pr-gate-proof"),
  "package.json quality gate must include check:github-pr-gate-proof"
);

const png = parsePngHeader(screenshot);
expect(png.ok, "merge-gate proof asset must be a PNG");
expect(screenshot.length > 50_000, "merge-gate proof PNG must be a real screenshot-sized asset");
expect(png.width >= 1200, "merge-gate proof PNG width must be at least 1200px");
expect(png.height >= 900, "merge-gate proof PNG height must be at least 900px");

for (const phrase of [
  "real GitHub PR checks tab screenshot",
  `https://github.com/${owner}/${repo}/pull/${prNumber}`,
  `https://github.com/${owner}/${repo}/actions/runs/${failingRunId}`,
  `https://github.com/${owner}/${repo}/actions/runs/${failingRunId}/job/${failingJobId}`,
  "quality",
  "FAILURE",
  "CodeQL",
  "SUCCESS",
  "UNSTABLE",
  "Remote proof branch deleted",
  assetPath,
  proofCommitPrefix,
  "proof-only PR",
  "must not be merged"
]) {
  expect(hasPhrase(proofDoc, phrase), `proof doc must include: ${phrase}`);
}

for (const target of [
  { label: "README", text: readme },
  { label: "deep audit", text: deepAudit },
  { label: "launch content pack", text: launchContentPack }
]) {
  for (const phrase of [assetPath, "npm run check:github-pr-gate-proof"]) {
    expect(hasPhrase(target.text, phrase), `${target.label} must include PR gate proof phrase: ${phrase}`);
  }
}

const [pullRequest, failingRun, failingJob, codeqlRun] = await Promise.all([
  fetchGitHubJson(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`),
  fetchGitHubJson(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${failingRunId}`),
  fetchGitHubJson(`https://api.github.com/repos/${owner}/${repo}/actions/jobs/${failingJobId}`),
  fetchGitHubJson(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${codeqlRunId}`)
]);
const proofBranchResponse = await fetchGitHub(
  `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${proofBranch}`
);

expect(pullRequest.number === prNumber, "proof PR number must match");
expect(pullRequest.title === "Proof: failing merge gate capture", "proof PR title must match");
expect(pullRequest.state === "closed", "proof PR must remain closed after capture");
expect(pullRequest.mergeable_state === "unstable", "proof PR mergeable_state must remain unstable from failed check");
expect(
  hasPhrase(pullRequest.body ?? "", "Proof-only PR used to capture a real GitHub merge-gate failure screenshot"),
  "proof PR body must explain the intentional failure"
);
expect(proofBranchResponse.status === 404, "remote proof branch must remain deleted after capture");

expect(failingRun.name === "CI", "failing proof run must be the CI workflow");
expect(failingRun.event === "pull_request", "failing proof run must be a pull_request event");
expect(failingRun.conclusion === "failure", "failing proof run must have failure conclusion");
expect(failingRun.head_sha?.startsWith(proofCommitPrefix), "failing proof run must use proof commit");

expect(failingJob.name === "quality", "failing proof job must be the quality job");
expect(failingJob.conclusion === "failure", "failing proof job must have failure conclusion");
expect(
  failingJob.html_url === `https://github.com/${owner}/${repo}/actions/runs/${failingRunId}/job/${failingJobId}`,
  "failing proof job URL must match proof doc"
);

expect(codeqlRun.name === "CodeQL", "CodeQL proof run must be CodeQL");
expect(codeqlRun.event === "pull_request", "CodeQL proof run must be a pull_request event");
expect(codeqlRun.conclusion === "success", "CodeQL proof run must have success conclusion");
expect(codeqlRun.head_sha?.startsWith(proofCommitPrefix), "CodeQL proof run must use proof commit");

if (failures.length > 0) {
  throw new Error(`GitHub PR gate proof check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      asset: assetPath,
      proof: proofPath,
      pullRequest: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
      failingRun: `https://github.com/${owner}/${repo}/actions/runs/${failingRunId}`,
      failingJob: failingJob.html_url,
      checked: [
        "real PNG screenshot dimensions",
        "proof document evidence",
        "live public PR metadata",
        "live failed CI run metadata",
        "live failed quality job metadata",
        "live successful CodeQL run metadata",
        "deleted proof branch",
        "README/audit/launch references"
      ]
    },
    null,
    2
  )
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function fetchGitHubJson(url) {
  const response = await fetchGitHub(url);

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} ${url}`);
  }

  return response.json();
}

async function fetchGitHub(url) {
  return fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "sherunscode-n8n-lint-proof-check"
    }
  });
}

function parsePngHeader(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    return { ok: false, width: 0, height: 0 };
  }

  return {
    ok: true,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function hasPhrase(text, phrase) {
  return normalizeWhitespace(String(text)).includes(normalizeWhitespace(String(phrase)));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}
