# Launch Drafts

These drafts are not posted. They are owner-review material for launch channels
after npm publication, a semver tag, and final claim review are complete.

Current verified claims:

- Public repo: `https://github.com/sherunscode/n8n-lint`
- CI and CodeQL are green on `main`.
- Local package dry-runs are clean.
- Current validator checks workflow structure, node types, credential types,
  top-level parameters, structured nested collection/fixedCollection/filter
  parameter keys, trigger graph/type-version shape, batch inputs, badges, a
  two-version schema matrix, and human-gated repair patches.
- Benchmark report checked 2,066 workflow inputs from `Zie619/n8n-workflows`;
  762 passed, 1,304 failed, and 11 non-workflow JSON files were skipped.

Do not add npm install claims until `n8n-lint` is published and a clean-machine
registry install has passed.

## X Short Post

I shipped the first public She Runs Code tool:

`n8n-lint` checks n8n workflow JSON before it breaks in production.

It already found 1,304 failing workflows in a real 2,066-workflow benchmark run.

Repo: https://github.com/sherunscode/n8n-lint

## X Thread

1/ I shipped `n8n-lint`, the first tool in the She Runs Code `n8nproof` line.

It validates n8n workflow JSON with real checked artifacts, CI gates, batch
checks, compatibility matrix output, badges, and human-gated repair patches.

2/ Why build it?

n8n workflows can silently drift when node parameters, credential types, or
trigger shapes change across versions.

Finding that out during production automation is the bad path.

3/ The benchmark is the launch hook:

I ran it against `Zie619/n8n-workflows`.

- 2,066 workflow inputs checked
- 762 passed
- 1,304 failed
- 11 non-workflow JSON files skipped

The report is in the repo.

4/ Boundaries matter:

This is not a hosted SaaS, dashboard, marketplace, MCP server, or fake star
play.

It is a focused CLI and CI gate. Every public number comes from a reproducible
run.

5/ Repo:

https://github.com/sherunscode/n8n-lint

If you maintain n8n workflow JSON in Git, I want this to catch the break before
your users do.

## Hacker News

Title:

Show HN: n8n-lint - validate n8n workflow JSON before it breaks

Post:

I built `n8n-lint`, a TypeScript CLI for checking n8n workflow JSON in Git and
CI.

The current version validates workflow structure, bundled node and credential
types, top-level node parameters, structured nested collection/fixedCollection/filter
parameter keys, trigger graph/type-version shape, batch inputs, badge output,
two pinned n8n schema artifacts, and conservative human-gated repair patches.

The launch benchmark is against `Zie619/n8n-workflows`: 2,066 workflow inputs
checked, 762 passed, 1,304 failed, and 11 ordinary JSON files skipped. The raw
report and methodology are checked into the repo.

It does not execute workflows or claim live REST validation yet. It also is not
a hosted SaaS, dashboard, marketplace, or MCP server. The point is a small,
repeatable CI gate for workflow JSON compatibility.

Repo: https://github.com/sherunscode/n8n-lint

## n8n Community Forum

Title:

I built `n8n-lint` to catch workflow JSON drift before production

Post:

I have been running n8n in production and wanted a simple way to catch workflow
JSON drift before it reaches users.

`n8n-lint` is a CLI that checks workflow JSON for structure, unknown node types,
unknown credential types, dead top-level parameters, structured nested
parameter-key drift, and stale trigger graph/type-version shapes. It also has
batch mode, JSON output for CI, local badge generation, a pinned two-version
schema matrix, and conservative repair patches that require human approval
before mutation.

I also ran a reproducible benchmark against `Zie619/n8n-workflows`: 2,066
workflow inputs checked, 762 passed, 1,304 failed, and 11 non-workflow JSON
files skipped.

Repo: https://github.com/sherunscode/n8n-lint

I would especially like feedback from people maintaining workflow JSON in Git or
template repositories.

## Reddit r/n8n

Title:

I built a CLI to catch stale n8n workflow JSON before it hits production

Post:

I built `n8n-lint`, a small open-source CLI for validating n8n workflow JSON in
Git/CI.

It currently checks structure, unknown node types, unknown credential types,
dead top-level parameters, structured nested parameter-key drift, stale trigger
shapes, batch folders, local badges, two pinned n8n schema artifacts, and
human-gated repair patches.

I ran it against a real public workflow corpus and saved the report:

- 2,066 workflow inputs checked
- 762 passed
- 1,304 failed
- 11 ordinary JSON files skipped

Repo: https://github.com/sherunscode/n8n-lint

It does not execute workflows or claim live REST validation yet. I am keeping
the scope narrow and proof-backed.
