#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const failures = [];

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

expectRequiredIssueFields("bug_report.yml", bugTemplate, ["n8n_lint_version", "n8n_version", "repro"]);
expectRequiredIssueFields("feature_request.yml", featureTemplate, [
  "n8n_lint_version",
  "n8n_version",
  "reproduction",
  "proposal"
]);
expect(issueConfig.includes("blank_issues_enabled: false"), "blank issues must stay disabled");
expect(
  issueConfig.includes("https://github.com/sherunscode/n8n-lint/discussions"),
  "Discussions contact link required"
);
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
        "security contact and API-key boundaries"
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
