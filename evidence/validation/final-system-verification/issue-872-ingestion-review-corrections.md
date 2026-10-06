# Issue #872 — Submission, review, batch ingestion and correction verification

## Metadata

| Field | Value |
| --- | --- |
| Execution issue | #872 |
| Tester | Dean Feldman; automated local execution assisted by Codex[GPT-5] |
| Date/time | 2026-10-06, Africa/Johannesburg |
| Candidate commit/tag | `9b1dbf5fbaa933f682f24f08bed1edf32507a01a` |
| Environment | Local isolated test environment; disposable PostgreSQL 16 for database tests; Playwright Chromium desktop and mobile projects |
| Test roles | Submitter; reviewer; administrator; viewer fixtures supplied by automated suites |
| Fixture/package/dataset | Repository deterministic fixtures; guided submission packages; correction and batch-review test data |

No passwords, bearer tokens, OAuth credentials, API keys or service secrets were retained.

## Results

| Verification ID | Result | Evidence / observation | Linked bug / blocker | Retest |
| --- | --- | --- | --- | --- |
| SUB-TECH-01 | PASS | Backend unit/API and worker scope coverage passed; the focused browser journey also denies a viewer submission/correction action. | — | — |
| SUB-TECH-02 | PASS | Focused Playwright verified readable fixture-package upload and durable receipt. | — | — |
| SUB-TECH-03 | PASS | Focused Playwright verified actionable rejected CSV-row validation and technical JSON schema validation. | — | — |
| SUB-TECH-04 | PASS | Focused Playwright verified advanced technical JSON staging. | — | — |
| SUB-TECH-05 | PASS | Focused Playwright verified editor-associated JSON validation errors. | — | — |
| SUB-TECH-06 | PASS | Focused Playwright verified a new-fixture proposal reaches reviewer resolution. | — | — |
| REV-TECH-01 to REV-TECH-03 | PASS | Batch-review browser journeys covered queue decisions, validation detail and participant/reference onboarding; database and worker suites passed. | — | — |
| REV-TECH-04 to REV-TECH-06 | PASS | Browser journeys verified accepted-subset publication, immutable conflict correction and reviewer onboarding; database suite passed. | — | — |
| BAT-TECH-01 to BAT-TECH-06 | PASS | Contract, worker, database and browser suites covered season/package references, reports, recovery and idempotent publication semantics. | — | — |
| COR-TECH-01 | PASS | Browser and database coverage verified immutable correction handling and history. | — | — |
| COR-TECH-02 | PASS | Focused Playwright verified corrected statistics refresh; database suite passed. | — | — |
| ADM-TECH-01 | PASS | Authenticated backend API coverage passed, including controlled access-management routes and scoped authorisation. | — | — |

## Commands and evidence

- `npm.cmd run test:contracts` — 18 files, 316 tests passed.
- `npm.cmd run test:unit` — 57 files, 535 tests passed.
- `npm.cmd run test:api` — completed successfully; expected API error-path logs were emitted by tests.
- `npm.cmd run test:worker` — 17 files, 125 tests passed.
- `npm.cmd run test:database` — 38 files passed, 1 file skipped; 278 tests passed, 2 skipped; isolated PostgreSQL 16 was migrated and seeded.
- `npm.cmd run test:e2e -- tests/e2e/submissions.spec.ts tests/e2e/batch-review-workspace.spec.ts tests/e2e/corrections.spec.ts` — 21 Playwright journeys passed in 57.1 seconds across desktop and mobile Chromium.
- `npm.cmd run openapi:lint` — passed; three documented ignores remain.

The initial direct harness invocation could not spawn esbuild in the restricted Windows shell. Reruns used `cmd.exe` with explicit process waiting; this is an execution-host constraint, not a product failure. No product finding failed during the recorded runs, so no bug or retest was required.

## Untested / partial coverage

This record proves the final candidate in deterministic local integration and browser environments. It does not replace a final deployed-environment run using a real submitter/reviewer account, worker deployment, or representative live multi-season data. Those operational checks remain required before release sign-off and must retain their own candidate-specific evidence.

## AI Declaration

Codex[GPT-5] was used to execute and summarise the automated technical verification and prepare this retained record.
