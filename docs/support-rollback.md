# Support and Rollback Plan

This plan covers the first 48 hours after any owner-approved public npm release
or launch post.

## Owner-Gated Start

Do not use this plan as permission to publish. npm publication, tags, GitHub
releases, and public launch posts require owner approval.

## Watch Windows

For the first 48 hours after launch:

- Check GitHub Issues at least twice daily.
- Watch the latest GitHub Actions runs for `main`.
- Re-run `npm run quality` before any patch release.
- Reproduce reported failures with sanitized workflow fixtures before changing
  validator behavior.

## Severity

| Severity | Definition | Target response |
|---|---|---|
| P0 | Package install is broken, CLI cannot start, or published package exposes secrets. | Stop promotion, acknowledge, patch or deprecate immediately. |
| P1 | False positive on common valid workflows or incorrect benchmark claim. | Triage same day, publish patch or corrected docs. |
| P2 | Docs mismatch, unclear error, edge-case fixture gap. | Queue for next patch or documentation update. |
| P3 | Feature request outside MVP scope. | Route to roadmap or close with scope explanation. |

## Rollback

Prefer forward patches over unpublish.

If a release is unsafe or materially misleading:

1. Stop public promotion.
2. Open a GitHub issue describing the failure and affected version.
3. If already published to npm, use `npm deprecate` with a clear replacement
   version or mitigation.
4. Patch, run `npm run quality`, run package dry-runs, run fresh-install smoke,
   and verify CI for the exact commit.
5. Publish a patch only after owner approval.
6. Update the GitHub release notes with the incident and mitigation.

## Patch Gate

Before a patch release:

```bash
npm ci
npm run quality
npm pack --workspace packages/core --dry-run
npm pack --workspace packages/cli --dry-run
```

Then run the fresh-install smoke from `docs/release-checklist.md`.
