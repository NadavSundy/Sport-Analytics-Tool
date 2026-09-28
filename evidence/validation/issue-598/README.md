# Issue #598 deployed Basic and Intermediate acceptance

This directory holds the reproducible acceptance record for Issue #598. It is an
acceptance artefact, not a product implementation. A failed step is recorded as
`FAIL`, linked to its owning issue where known, and not worked around here.

The initial authoritative batch, receipt `ed797e8a-9645-4a39-b1b1-228250e00e43`,
reached review with 251 events and 23 onboarding tasks. The tester/issue owner
accepted the supplied PDFs, deployed logs and manual deployed verification as
sufficient final acceptance evidence: corrected receipt
`e1707304-da3a-4ad7-aa16-e9cd3084d1b2` published with `ballsPerOver: 6`, correct
statistics, unchanged-replay idempotency and resolvable correction history.

**Final result: PASS.** See the [authoritative closure addendum](acceptance-record.md#authoritative-closure-addendum-2026-09-28) for the deployed-revision boundary, complete scenario ledger, fixed-and-retested blockers, and explicit #770/evidence limitations. This record may be referenced by #613.

The test package is generated from the supplied Cricsheet source with:

```text
node scripts/issue-598-cricsheet-package.mjs <source.json> packages/1552923-v1.1.json
```

Validate the generated package with the real contract before it is submitted.
The interactive guide never receives credentials and does not call deployed
mutation endpoints. The facilitator performs each authenticated action in the
browser only after confirming the exact step.

## AI declaration

This acceptance scaffolding was prepared with the assistance of Codex[GPT-5].
