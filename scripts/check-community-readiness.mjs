#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";

const failures = [];
const discussionUrl = "https://github.com/sherunscode/n8n-lint/discussions/8";

await expectFile(".github/ISSUE_TEMPLATE/bug_report.yml");
await expectFile(".github/ISSUE_TEMPLATE/feature_request.yml");
await expectFile(".github/ISSUE_TEMPLATE/config.yml");
await expectFile(".github/PULL_REQUEST_TEMPLATE.md");
await expectFile("CODE_OF_CONDUCT.md");
await expectFile("CONTRIBUTING.md");
await expectFile("SECURITY.md");

const bugTemplate = await readText(".github/ISSUE_TEMPLATE/bug_report.yml");
const featureTemplate = await readText(".github/ISSUE_TEMPLATE/feature_request.yml");
const issueConfig = await readText(".github/ISSUE_TEMPLATE/config.yml");
const prTemplate = await readText(".github/PULL_REQUEST_TEMPLATE.md");
const contributing = await readText("CONTRIBUTING.md");
const codeOfConduct = await readText("CODE_OF_CONDUCT.md");
const security = await readText("SECURITY.md");
const readme = await readText("README.md");

expectRequiredIssueFields("bug_report.yml", bugTemplate, ["n8n_lint_version", "n8n_version", "repro"]);
expectRequiredIssueFields("feature_request.yml", featureTemplate, [
  "n8n_lint_version",
  "n8n_version",
  "reproduction",
  "proposal"
]);
expect(issueConfig.includes("blank_issues_enabled: false"), "blank issues must stay disabled");
expect(hasExactUrl(issueConfig, discussionUrl), "Questions contact link must target the support/badge discussion");
expect(issueConfig.includes("mailto:ashley@sherunscode.com"), "private security contact link required");

expect(prTemplate.includes("npm run quality"), "PR template must require npm run quality verification");
expect(/Linked issue or rationale/i.test(prTemplate), "PR template must require linked issue or rationale");

expect(contributing.includes("npm ci"), "CONTRIBUTING.md must include local install command");
expect(contributing.includes("npm run quality"), "CONTRIBUTING.md must include quality command");
expect(/72-hour/i.test(contributing), "CONTRIBUTING.md must state the 72-hour triage target");
expect(/do not include secrets/i.test(contributing), "CONTRIBUTING.md must warn against secrets");

expect(/Contributor Covenant/i.test(codeOfConduct), "CODE_OF_CONDUCT.md must name Contributor Covenant");
expect(/Redact secrets/i.test(codeOfConduct), "CODE_OF_CONDUCT.md must require secret redaction");

expect(security.includes("ashley@sherunscode.com"), "SECURITY.md must include security contact email");
expect(/Do not pass n8n API keys as CLI arguments/i.test(security), "SECURITY.md must forbid API keys as CLI args");
expect(
  /does\s+not\s+require\s+an\s+n8n\s+API\s+key/i.test(security),
  "SECURITY.md must state current MVP does not need an API key"
);

expect(hasExactUrl(readme, discussionUrl), "README must link the support/badge discussion");
expect(
  /Do not post secrets, n8n API keys, credentials, customer workflow\s+data, or private workflow JSON/i.test(readme),
  "README community section must warn against public secrets or private workflow data"
);

await expectDiscussionChannel();

if (failures.length > 0) {
  throw new Error(`community readiness check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "bug issue template",
        "feature issue template",
        "issue routing",
        "pull request template",
        "contributing guide",
        "code of conduct",
        "security contact and API-key boundaries",
        "live GitHub support/badge discussion"
      ]
    },
    null,
    2
  )
);

function expectRequiredIssueFields(label, template, fieldIds) {
  for (const fieldId of fieldIds) {
    const fieldPattern = new RegExp(
      `id:\\s*${escapeRegExp(fieldId)}[\\s\\S]*?validations:\\s*\\n\\s+required:\\s*true`,
      "m"
    );
    expect(fieldPattern.test(template), `${label} must require ${fieldId}`);
  }
}

async function expectDiscussionChannel() {
  const token = githubToken();
  const query = `
    query($owner:String!,$name:String!,$number:Int!) {
      repository(owner:$owner,name:$name) {
        hasDiscussionsEnabled
        discussion(number:$number) {
          number
          title
          url
          category { name slug }
          bodyText
        }
      }
    }
  `;
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "sherunscode-n8n-lint-community-check"
    },
    body: JSON.stringify({
      query,
      variables: { owner: "sherunscode", name: "n8n-lint", number: 8 }
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    failures.push(`GitHub Discussion proof request failed with HTTP ${response.status}`);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    failures.push("GitHub Discussion proof response was not JSON");
    return;
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    failures.push(`GitHub Discussion proof returned GraphQL errors: ${payload.errors.length}`);
    return;
  }

  const repository = payload.data?.repository;
  const discussion = repository?.discussion;
  expect(repository?.hasDiscussionsEnabled === true, "GitHub Discussions must be enabled");
  expect(discussion?.number === 8, "support/badge discussion number must be #8");
  expect(discussion?.title === "Ask questions and share verified badges", "support/badge discussion title must match");
  expect(discussion?.url === discussionUrl, "support/badge discussion URL must match");
  expect(discussion?.category?.slug === "q-a", "support/badge discussion must live in Q&A");

  const bodyText = String(discussion?.bodyText ?? "");
  for (const phrase of [
    "questions about n8n-lint",
    "verified badges generated from real checks",
    "not published to npm yet",
    "Do not post secrets",
    "does not claim live REST schema validation or workflow execution",
    "ashley@sherunscode.com"
  ]) {
    expect(hasPhrase(bodyText, phrase), `support/badge discussion must include: ${phrase}`);
  }

  for (const forbidden of [
    "npm install n8n-lint",
    "npm i n8n-lint",
    "npx n8n-lint",
    "live REST validation is supported",
    "executes workflows"
  ]) {
    expect(
      !hasPhrase(bodyText, forbidden),
      `support/badge discussion must not include unsupported claim: ${forbidden}`
    );
  }
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

  throw new Error("check:community needs GITHUB_TOKEN or authenticated `gh` CLI access for GitHub Discussions proof");
}

async function expectFile(filePath) {
  try {
    await access(filePath);
  } catch {
    failures.push(`${filePath} must exist`);
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function hasPhrase(text, phrase) {
  return normalizeWhitespace(String(text)).includes(normalizeWhitespace(String(phrase)));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function hasExactUrl(text, expectedUrl) {
  const expected = new URL(expectedUrl);
  const urlPattern = /https:\/\/[^\s)>\]]+/g;
  for (const match of String(text).matchAll(urlPattern)) {
    const candidate = match[0]?.replace(/[.,;:]+$/u, "");
    if (candidate === undefined) {
      continue;
    }

    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }

    if (
      parsed.protocol === expected.protocol &&
      parsed.hostname === expected.hostname &&
      parsed.pathname === expected.pathname &&
      parsed.search === expected.search &&
      parsed.hash === expected.hash
    ) {
      return true;
    }
  }

  return false;
}
