#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const trackedFiles = listTrackedFiles();
const trackedFileSet = new Set(trackedFiles);
const markdownFiles = trackedFiles.filter((filePath) => filePath.endsWith(".md"));
const failures = [];
let checkedLinks = 0;

for (const markdownFile of markdownFiles) {
  const markdown = await readFile(markdownFile, "utf8");
  const anchors = markdownFile.endsWith(".md") ? collectHeadingAnchors(markdown) : new Set();

  for (const link of extractMarkdownLinks(markdown)) {
    if (shouldSkipTarget(link.target)) {
      continue;
    }

    checkedLinks += 1;
    await checkLocalTarget(markdownFile, link, anchors);
  }
}

if (failures.length > 0) {
  throw new Error(`markdown link check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        markdownFiles: markdownFiles.length,
        localLinks: checkedLinks
      }
    },
    null,
    2
  )
);

function listTrackedFiles() {
  const result = spawnSync("git", ["ls-files"], {
    cwd: process.cwd(),
    encoding: "utf8"
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

function extractMarkdownLinks(markdown) {
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, "");
  const links = [];
  const pattern = /\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;

  for (const match of withoutFences.matchAll(pattern)) {
    const target = match[1];
    if (target !== undefined) {
      links.push({ target });
    }
  }

  return links;
}

function shouldSkipTarget(target) {
  return (
    target.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(target) ||
    target.startsWith("//") ||
    target.startsWith("<") ||
    target.startsWith("{")
  );
}

async function checkLocalTarget(markdownFile, link, sourceAnchors) {
  const { targetPath, fragment } = splitTarget(link.target);
  const normalizedTarget = normalizeMarkdownTarget(markdownFile, targetPath);

  if (normalizedTarget === null) {
    failures.push(`${markdownFile} contains an invalid local link target: ${link.target}`);
    return;
  }

  const targetExists = trackedFileSet.has(normalizedTarget) || (await pathExists(normalizedTarget));
  if (!targetExists) {
    failures.push(`${markdownFile} links to missing local target: ${link.target}`);
    return;
  }

  if (fragment === "") {
    return;
  }

  const anchorFile = normalizedTarget === "" ? markdownFile : normalizedTarget;
  if (!anchorFile.endsWith(".md")) {
    failures.push(`${markdownFile} links to an anchor in a non-Markdown target: ${link.target}`);
    return;
  }

  const targetAnchors =
    anchorFile === markdownFile ? sourceAnchors : collectHeadingAnchors(await readFile(anchorFile, "utf8"));
  if (!targetAnchors.has(fragment)) {
    failures.push(`${markdownFile} links to missing anchor #${fragment} in ${anchorFile}`);
  }
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

function normalizeMarkdownTarget(markdownFile, targetPath) {
  const baseDir = path.posix.dirname(markdownFile.replaceAll("\\", "/"));
  const decodedTarget = decodeTarget(targetPath);
  if (decodedTarget === null) {
    return null;
  }

  const resolved = path.posix.normalize(path.posix.join(baseDir, decodedTarget));
  if (resolved.startsWith("../") || resolved === ".." || path.posix.isAbsolute(resolved)) {
    return null;
  }

  return resolved === "." ? "" : resolved;
}

function decodeTarget(targetPath) {
  try {
    return decodeURIComponent(targetPath);
  } catch {
    return null;
  }
}

async function pathExists(targetPath) {
  if (targetPath === "") {
    return true;
  }

  try {
    const targetStat = await stat(targetPath);
    if (!targetStat.isDirectory()) {
      return true;
    }

    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function collectHeadingAnchors(markdown) {
  const anchors = new Set();
  const slugCounts = new Map();

  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match === null) {
      continue;
    }

    const baseSlug = slugifyHeading(match[2] ?? "");
    const seenCount = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, seenCount + 1);
    anchors.add(seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount}`);
  }

  return anchors;
}

function slugifyHeading(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
