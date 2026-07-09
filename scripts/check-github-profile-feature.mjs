#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const failures = [];
const profileUrl = "https://raw.githubusercontent.com/sherunscode/.github/main/profile/README.md";
const profileApiUrl = "https://api.github.com/repos/sherunscode/.github/contents/profile/README.md?ref=main";
const orgApiUrl = "https://api.github.com/orgs/sherunscode";
const repoApiUrl = "https://api.github.com/repos/sherunscode/n8n-lint";
let cachedGithubToken;
const profile = await fetchProfileReadme();

for (const phrase of [
  "# She Runs Code",
  "We verify automation code before it fails in production.",
  "public builder brand for `n8nproof`",
  "## Flagship",
  "[`n8n-lint`](https://github.com/sherunscode/n8n-lint)",
  "Validates n8n workflow JSON",
  "two-version matrix",
  "human-gated repair patches",
  "`n8n-lint` is the only active public product",
  "No fake stars, fake followers, bought engagement, bots, or spam.",
  "ashley@sherunscode.com",
  "https://x.com/sherunscode"
]) {
  expect(hasPhrase(profile, phrase), `She Runs Code profile README must include: ${phrase}`);
}

await expectJsonOk(orgApiUrl, "She Runs Code org API record must be public");
await expectJsonOk(repoApiUrl, "n8n-lint repo API record from profile must be public");

if (failures.length > 0) {
  throw new Error(`GitHub profile feature check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      profile: profileUrl,
      checked: [
        "She Runs Code profile README is public",
        "n8n-lint is featured as flagship",
        "n8nproof positioning is present",
        "real-growth proof rules are present",
        "email and X handle are present"
      ]
    },
    null,
    2
  )
);

async function fetchText(url) {
  const response = await fetchWithHeaders(url, "text/plain, text/html, */*;q=0.8");

  return response.text();
}

async function fetchJson(url) {
  const response = await fetchWithHeaders(url, "application/vnd.github+json");
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Expected JSON from ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchWithHeaders(url, accept) {
  const headers = {
    "User-Agent": "sherunscode-n8n-lint-profile-check",
    Accept: accept
  };
  const token = githubToken();
  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-GitHub-Api-Version"] = "2022-11-28";
  }

  const response = await fetch(url, {
    headers
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response;
}

async function fetchProfileReadme() {
  if (githubToken() !== null) {
    const data = await fetchJson(profileApiUrl);
    if (data?.type !== "file" || data.encoding !== "base64" || typeof data.content !== "string") {
      throw new Error("She Runs Code profile README API response did not include base64 file content");
    }
    return Buffer.from(data.content.replace(/\s+/g, ""), "base64").toString("utf8");
  }

  return fetchText(profileUrl);
}

async function expectJsonOk(url, message) {
  try {
    await fetchJson(url);
  } catch (error) {
    failures.push(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function hasPhrase(text, phrase) {
  return text.replace(/\s+/g, " ").includes(phrase.replace(/\s+/g, " "));
}

function githubToken() {
  if (cachedGithubToken !== undefined) {
    return cachedGithubToken;
  }

  const envToken = process.env.GITHUB_TOKEN;
  if (typeof envToken === "string" && envToken.trim() !== "") {
    cachedGithubToken = envToken.trim();
    return cachedGithubToken;
  }

  const result = spawnSync("gh", ["auth", "token"], {
    encoding: "utf8",
    stdio: "pipe"
  });

  cachedGithubToken = result.status === 0 && result.stdout.trim() !== "" ? result.stdout.trim() : null;
  return cachedGithubToken;
}
