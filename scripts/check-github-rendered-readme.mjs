#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const owner = "sherunscode";
const repo = "n8n-lint";
const repositoryUrl = `https://github.com/${owner}/${repo}`;
const failures = [];

const localHead = git(["rev-parse", "HEAD"]);
const publicCommit = await fetchPublicMainCommit();
const sameCommit = publicCommit === localHead;
const localReadmeScopeClean = sameCommit && git(["status", "--porcelain", "--", "README.md", "docs/assets"]) === "";
const readme = localReadmeScopeClean
  ? await readFile("README.md", "utf8")
  : await fetchText(rawUrl(publicCommit, "README.md"));
const pageHtml = await fetchText(repositoryUrl);
const readmeWithoutFences = stripCodeFences(readme);
const imageTargets = extractMarkdownImages(readmeWithoutFences).filter(isLocalTarget);
const linkTargets = extractMarkdownLinks(readmeWithoutFences).filter(
  (target) => isLocalTarget(target) && !isImageTarget(target)
);

expect(publicCommit.length === 40, "public main commit must be a full SHA");
expect(pageHtml.includes("markdown-body"), "GitHub page must include a rendered Markdown body");
expect(
  pageHtml.includes("Validate n8n workflow JSON before it reaches production."),
  "GitHub page must render README copy"
);
expect(!pageHtml.includes("&lt;svg"), "GitHub page must not show escaped raw SVG markup in the README area");
expect(!pageHtml.includes("&lt;img"), "GitHub page must not show escaped raw image markup in the README area");

for (const target of imageTargets) {
  const normalized = normalizeTargetPath(target);
  if (normalized === null) {
    failures.push(`README image target is invalid: ${target}`);
    continue;
  }

  expect(pageHtml.includes(normalized), `GitHub-rendered README must reference image target ${normalized}`);
  await expectHttpOk(rawUrl(publicCommit, normalized), `README image must resolve from public commit: ${normalized}`, [
    "image/svg+xml",
    "image/png",
    "image/jpeg",
    "image/gif"
  ]);
}

for (const target of linkTargets) {
  const { targetPath, fragment } = splitTarget(target);
  const normalized = normalizeTargetPath(targetPath);
  if (normalized === null) {
    failures.push(`README link target is invalid: ${target}`);
    continue;
  }

  await expectHttpOk(
    blobUrl(publicCommit, normalized),
    `README local link must resolve on GitHub-rendered public commit: ${target}`
  );

  if (fragment !== "") {
    expect(
      pageHtml.includes(`id="${escapeHtml(fragment)}"`) || pageHtml.includes(`#${escapeHtml(fragment)}`),
      `GitHub-rendered README must expose or link anchor #${fragment}`
    );
  }
}

if (failures.length > 0) {
  throw new Error(`GitHub-rendered README check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      repository: repositoryUrl,
      publicCommit,
      localHead,
      scope: localReadmeScopeClean ? "local-head-is-public-main" : "public-main-rendered-page",
      checked: [
        "GitHub repository page HTTP 200",
        "rendered README body",
        "README image targets resolve from public commit",
        "README local links resolve on GitHub",
        "no escaped raw image/SVG markup"
      ],
      counts: {
        images: imageTargets.length,
        localLinks: linkTargets.length
      }
    },
    null,
    2
  )
);

async function fetchPublicMainCommit() {
  const data = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/commits/main`);
  const sha = data?.sha;
  if (typeof sha !== "string") {
    throw new Error("GitHub commits/main response did not include a SHA");
  }
  return sha;
}

async function fetchJson(url) {
  const response = await fetchWithHeaders(url);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Expected JSON from ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchText(url) {
  const response = await fetchWithHeaders(url);
  return response.text();
}

async function fetchWithHeaders(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "sherunscode-n8n-lint-render-check",
      Accept: "application/vnd.github+json, text/html, text/plain;q=0.9, */*;q=0.8"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response;
}

async function expectHttpOk(url, message, allowedContentTypes = []) {
  try {
    const response = await fetchWithHeaders(url);
    if (allowedContentTypes.length === 0) {
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!allowedContentTypes.some((allowed) => contentType.toLowerCase().includes(allowed))) {
      failures.push(`${message}; unexpected content-type ${contentType || "(missing)"}`);
    }
  } catch (error) {
    failures.push(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function extractMarkdownImages(markdown) {
  const targets = [];
  const pattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of markdown.matchAll(pattern)) {
    if (match[1] !== undefined) {
      targets.push(match[1]);
    }
  }
  return targets;
}

function extractMarkdownLinks(markdown) {
  const targets = [];
  const pattern = /]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of markdown.matchAll(pattern)) {
    if (match[1] !== undefined) {
      targets.push(match[1]);
    }
  }
  return targets;
}

function isImageTarget(target) {
  return /\.(?:svg|png|jpe?g|gif)(?:#.*)?$/i.test(target);
}

function isLocalTarget(target) {
  return !target.startsWith("#") && !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith("//");
}

function splitTarget(target) {
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) {
    return { targetPath: target, fragment: "" };
  }

  return {
    targetPath: target.slice(0, hashIndex),
    fragment: target.slice(hashIndex + 1)
  };
}

function normalizeTargetPath(target) {
  const { targetPath } = splitTarget(target);
  let decoded;
  try {
    decoded = decodeURIComponent(targetPath);
  } catch {
    return null;
  }

  const normalized = path.posix.normalize(decoded.replaceAll("\\", "/"));
  if (normalized.startsWith("../") || normalized === ".." || path.posix.isAbsolute(normalized)) {
    return null;
  }

  return normalized === "." ? "README.md" : normalized;
}

function rawUrl(commit, target) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${encodePath(target)}`;
}

function blobUrl(commit, target) {
  return `https://github.com/${owner}/${repo}/blob/${commit}/${encodePath(target)}`;
}

function encodePath(target) {
  return target
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function stripCodeFences(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${[result.stdout, result.stderr].join("\n").trim()}`);
  }

  return result.stdout.trim();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
