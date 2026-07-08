#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const hookPath = ".githooks/pre-commit";
const failures = [];
const shellCommand = resolveShellCommand();

const gitMode = spawnSync("git", ["ls-files", "--stage", hookPath], {
  cwd: process.cwd(),
  encoding: "utf8"
});
if (gitMode.status !== 0) {
  failures.push(`git ls-files failed for ${hookPath}: ${gitMode.stderr || gitMode.stdout}`);
} else if (!gitMode.stdout.startsWith("100755 ")) {
  failures.push(`${hookPath} must be tracked executable as mode 100755`);
}

const tempDirectory = await mkdtemp(".precommit-check-");
const fakeBinForShellPath = basename(tempDirectory);
try {
  const fakeNpmPath = join(tempDirectory, "npm");
  await writeFile(
    fakeNpmPath,
    ["#!/bin/sh", "echo fake npm stdout", "echo fake npm stderr >&2", 'exit "${N8N_LINT_FAKE_NPM_EXIT:-0}"', ""].join(
      "\n"
    ),
    "utf8"
  );
  await chmod(fakeNpmPath, 0o755);

  const success = runHook(fakeBinForShellPath, "0");
  if (success.status !== 0) {
    failures.push(`success simulation exited ${success.status}`);
  }
  if (success.stdout !== "" || success.stderr !== "") {
    failures.push("pre-commit hook must be quiet on success");
  }

  const failure = runHook(fakeBinForShellPath, "17");
  if (failure.status !== 17) {
    failures.push(`failure simulation exited ${failure.status}, expected 17`);
  }
  if ((failure.stdout ?? "") !== "") {
    failures.push("pre-commit hook must write failure details to stderr, not stdout");
  }
  if (!(failure.stderr ?? "").includes("fake npm stdout") || !(failure.stderr ?? "").includes("fake npm stderr")) {
    failures.push("pre-commit hook must replay captured quality output on failure");
  }
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}

if (failures.length > 0) {
  throw new Error(`pre-commit hook check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      hook: hookPath,
      checked: [
        "tracked executable mode",
        "quiet success path",
        "failure exit code propagation",
        "failure output replay to stderr"
      ]
    },
    null,
    2
  )
);

function runHook(fakeBinDirectoryForShellPath, exitCode) {
  if (shellCommand === undefined) {
    failures.push("No POSIX shell found to simulate the Git hook");
    return { status: 127, stdout: "", stderr: "" };
  }

  return spawnSync(shellCommand, [hookPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeBinDirectoryForShellPath}:/usr/bin:/bin:/mingw64/bin:${process.env.PATH ?? ""}`,
      N8N_LINT_FAKE_NPM_EXIT: exitCode
    }
  });
}

function resolveShellCommand() {
  const candidates =
    process.platform === "win32"
      ? ["sh", "C:/Program Files/Git/usr/bin/sh.exe", "C:/Program Files/Git/bin/sh.exe"]
      : ["sh"];

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-c", "exit 0"], {
      encoding: "utf8"
    });
    if (result.status === 0) {
      return candidate;
    }
  }

  return undefined;
}
