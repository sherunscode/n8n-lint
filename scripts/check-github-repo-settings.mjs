#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const owner = "sherunscode";
const repo = "n8n-lint";
const repository = `${owner}/${repo}`;
const expectedDescription = "Validate n8n workflow JSON with artifact-backed schema checks.";
const expectedTopics = [
  "automation-testing",
  "ci-cd",
  "cli",
  "continuous-integration",
  "developer-tools",
  "devops",
  "github-actions",
  "linter",
  "n8n",
  "n8n-nodes",
  "n8n-workflow",
  "pre-commit",
  "rest-api",
  "schema-validation",
  "self-hosted",
  "typescript",
  "validation",
  "workflow-automation"
];
const failures = [];

const packageJson = await readJson("package.json");
const qualityRunner = await readText("scripts/run-quality-group.mjs");
const audit = await readText("docs/deep-audit-2026-07-11.md");

expect(
  packageJson.scripts?.["check:github-repo-settings"] === "node scripts/check-github-repo-settings.mjs",
  "package.json must expose check:github-repo-settings"
);
expect(
  packageJson.scripts?.["quality:remote"] === "node scripts/run-quality-group.mjs remote" &&
    qualityRunner.includes('"check:github-repo-settings"'),
  "package.json quality gate must include check:github-repo-settings"
);

const [restRepo, graphRepo, protection] = await Promise.all([
  fetchRepoRest(),
  fetchRepoGraphql(),
  fetchJson(`https://api.github.com/repos/${repository}/branches/main/protection`)
]);

expect(restRepo.full_name === repository, "GitHub REST repo full_name must match canonical repo");
expect(restRepo.visibility === "public" && restRepo.private === false, "GitHub repo must be public");
expect(restRepo.description === expectedDescription, "GitHub repo description must match launch positioning");

const topics = Array.isArray(restRepo.topics) ? restRepo.topics : [];
for (const topic of expectedTopics) {
  expect(topics.includes(topic), `GitHub repo topics must include ${topic}`);
}
expect(topics.length === expectedTopics.length, "GitHub repo topics must match the strategy topic count exactly");

expect(restRepo.delete_branch_on_merge === true, "automatic branch deletion must be enabled");
expect(restRepo.allow_update_branch === true, "update-branch support must be enabled");
expect(restRepo.allow_merge_commit === false, "merge commits must be disabled");
expect(restRepo.allow_squash_merge === true, "squash merging must remain enabled");
expect(restRepo.has_wiki === false, "unused Wiki must be disabled");
expect(restRepo.has_projects === false, "unused Projects must be disabled");
expect(restRepo.has_issues === true, "Issues must remain enabled");
expect(restRepo.has_discussions === true, "Discussions must remain enabled");
for (const feature of ["secret_scanning", "secret_scanning_push_protection", "dependabot_security_updates"]) {
  expect(restRepo.security_and_analysis?.[feature]?.status === "enabled", `${feature} must be enabled`);
}

expect(graphRepo.nameWithOwner === repository, "GitHub GraphQL repo nameWithOwner must match canonical repo");
expect(graphRepo.openGraphImageUrl.startsWith("https://"), "Open Graph image URL must resolve");
expect(graphRepo.usesCustomOpenGraphImage === true, "custom Open Graph image must be active");
expect(
  hasPhrase(audit, "GitHub custom social preview configured in repository settings"),
  "deep audit must record the configured social preview"
);

const requiredContexts = protection.required_status_checks?.contexts ?? [];
for (const context of ["quality", "action-smoke", "Analyze JavaScript and TypeScript"]) {
  expect(requiredContexts.includes(context), `branch protection must require ${context}`);
}
expect(protection.required_status_checks?.strict === true, "required checks must use up-to-date branches");
expect(protection.enforce_admins?.enabled === true, "branch protection must enforce admins");
expect(protection.required_linear_history?.enabled === true, "linear history must be required");
expect(protection.required_conversation_resolution?.enabled === true, "conversations must be resolved");
expect(protection.allow_force_pushes?.enabled === false, "force pushes must be disabled");
expect(protection.allow_deletions?.enabled === false, "branch deletion must be disabled");

if (failures.length > 0) {
  throw new Error(`GitHub repo settings check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      repository,
      visibility: restRepo.visibility,
      topics: expectedTopics,
      socialPreview: {
        status: "custom",
        usesCustomOpenGraphImage: graphRepo.usesCustomOpenGraphImage,
        openGraphImageUrl: graphRepo.openGraphImageUrl
      },
      checked: [
        "public repository identity",
        "launch description",
        "repository topics",
        "Open Graph image status",
        "custom social preview active",
        "security and dependency controls",
        "merge and repository feature policy",
        "admin-enforced required checks"
      ]
    },
    null,
    2
  )
);

async function fetchRepoRest() {
  return fetchJson(`https://api.github.com/repos/${repository}`, "application/vnd.github+json");
}

async function fetchRepoGraphql() {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken()}`,
      "Content-Type": "application/json",
      "User-Agent": "sherunscode-n8n-lint-repo-settings-check"
    },
    body: JSON.stringify({
      query: `
        query($owner:String!, $repo:String!) {
          repository(owner:$owner, name:$repo) {
            nameWithOwner
            openGraphImageUrl
            usesCustomOpenGraphImage
          }
        }
      `,
      variables: { owner, repo }
    })
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub GraphQL repository settings request failed with HTTP ${response.status}`);
  }

  const payload = JSON.parse(body);
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error(`GitHub GraphQL repository settings request returned ${payload.errors.length} errors`);
  }

  return payload.data?.repository ?? {};
}

async function fetchJson(url, accept) {
  const response = await fetch(url, {
    headers: {
      Accept: accept ?? "application/json",
      Authorization: `Bearer ${githubToken()}`,
      "User-Agent": "sherunscode-n8n-lint-repo-settings-check"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub repository settings request failed with HTTP ${response.status}`);
  }

  return response.json();
}

function githubToken() {
  const envToken = process.env.GITHUB_TOKEN?.trim();
  if (envToken) {
    return envToken;
  }

  const gh = spawnSync("gh", ["auth", "token"], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true
  });
  const token = gh.stdout.trim();
  if (gh.status === 0 && token !== "") {
    return token;
  }

  throw new Error("check:github-repo-settings needs GITHUB_TOKEN or authenticated `gh` CLI access");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
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
