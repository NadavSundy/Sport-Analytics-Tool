# Issue #598 deployed Basic and Intermediate acceptance

This directory holds the reproducible acceptance record for Issue #598. It is an
acceptance artefact, not a product implementation. A failed step is recorded as
`FAIL`, linked to its owning issue where known, and not worked around here.

The active deployed acceptance batch is receipt
`ed797e8a-9645-4a39-b1b1-228250e00e43`: the unchanged authoritative
`1552923-season-upload-schema-extras-fixed.json` package reached `Awaiting review`
with 251 events and 23 onboarding tasks. #598 is currently blocked because the
onboarding POST returned HTTP 422 `VALIDATION_FAILED`; its root cause and owning
issue remain under investigation.

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
