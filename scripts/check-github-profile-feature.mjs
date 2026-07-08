#!/usr/bin/env node

const failures = [];
const profileUrl = "https://raw.githubusercontent.com/sherunscode/.github/main/profile/README.md";
const orgUrl = "https://github.com/sherunscode";
const repoUrl = "https://github.com/sherunscode/n8n-lint";
const profile = await fetchText(profileUrl);

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

await expectHttpOk(orgUrl, "She Runs Code org page must be public");
await expectHttpOk(repoUrl, "n8n-lint repo URL from profile must be public");

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
  const response = await fetch(url, {
    headers: {
      "User-Agent": "sherunscode-n8n-lint-profile-check",
      Accept: "text/plain, text/html, */*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.text();
}

async function expectHttpOk(url, message) {
  try {
    await fetchText(url);
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
