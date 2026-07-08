#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const failures = [];
const ignoredSecretFiles = [".env", ".env.local", ".n8nlintrc.json", ".n8n-lint.local.json", "n8n-lint.local.log"];
const tokenPatterns = [
  { name: "OpenAI API key", pattern: /(?<![A-Za-z])sk-[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub OAuth token", pattern: /gho_[A-Za-z0-9_]{20,}/ },
  {
    name: "plaintext OPENAI_API_KEY assignment",
    pattern: /OPENAI_API_KEY\s*=\s*[^*\s"']\S+/
  },
  {
    name: "plaintext ANTHROPIC_API_KEY assignment",
    pattern: /ANTHROPIC_API_KEY\s*=\s*[^*\s"']\S+/
  },
  {
    name: "plaintext GEMINI_API_KEY assignment",
    pattern: /GEMINI_API_KEY\s*=\s*[^*\s"']\S+/
  },
  {
    name: "plaintext CLOUDFLARE_API_TOKEN assignment",
    pattern: /CLOUDFLARE_API_TOKEN\s*=\s*[^*\s"']\S+/
  },
  {
    name: "plaintext N8N_API_KEY assignment",
    pattern: /N8N_API_KEY\s*=\s*[^*\s"']\S+/
  }
];

const trackedFiles = await listTrackedFiles();
const publicFiles = trackedFiles.filter((filePath) => !filePath.startsWith("docs/benchmark-zie619-report.json"));

for (const ignoredFile of ignoredSecretFiles) {
  await expectIgnored(ignoredFile);
}

for (const filePath of publicFiles) {
  await scanFileForTokenPatterns(filePath);
}

await expectNoBareApiKeyCliOption();
await expectSecurityDocs();

if (failures.length > 0) {
  throw new Error(`security hygiene check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        ignoredSecretFiles,
        scannedTrackedFiles: publicFiles.length,
        cliSurface: "no bare API key option",
        docs: ["SECURITY.md", ".gitignore"]
      }
    },
    null,
    2
  )
);

async function listTrackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files"], { encoding: "utf8" });
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

async function expectIgnored(filePath) {
  try {
    await execFileAsync("git", ["check-ignore", "--quiet", filePath]);
  } catch {
    failures.push(`${filePath} must be ignored by .gitignore`);
  }
}

async function scanFileForTokenPatterns(filePath) {
  const content = await readFile(filePath, "utf8");
  for (const { name, pattern } of tokenPatterns) {
    if (pattern.test(content)) {
      failures.push(`${filePath} contains ${name} pattern`);
    }
  }
}

async function expectNoBareApiKeyCliOption() {
  const cliSource = await readFile("packages/cli/src/bin.ts", "utf8");
  if (/--(?:api-key|token|auth-token)\b/i.test(cliSource)) {
    failures.push("CLI must not accept bare API keys or tokens as command-line arguments");
  }
}

async function expectSecurityDocs() {
  const [security, gitignore] = await Promise.all([readFile("SECURITY.md", "utf8"), readFile(".gitignore", "utf8")]);
  const requiredSecurityPhrases = [
    "Do not pass n8n API keys as CLI arguments.",
    "Future live REST validation must redact API keys"
  ];
  const requiredSecurityPatterns = [
    {
      label: "SECURITY.md must say current bundled validation does not require an n8n API key",
      pattern:
        /Current local MVP validation uses a compact bundled schema artifact[\s\S]+does\s+not require an n8n API key\./
    }
  ];
  const requiredGitignoreEntries = [".env", ".env.*", ".n8nlintrc.json", ".n8n-lint.local.json", "*.log"];

  for (const phrase of requiredSecurityPhrases) {
    if (!security.includes(phrase)) {
      failures.push(`SECURITY.md must include: ${phrase}`);
    }
  }

  for (const { label, pattern } of requiredSecurityPatterns) {
    if (!pattern.test(security)) {
      failures.push(label);
    }
  }

  for (const entry of requiredGitignoreEntries) {
    if (!gitignore.split(/\r?\n/).includes(entry)) {
      failures.push(`.gitignore must include ${entry}`);
    }
  }
}
