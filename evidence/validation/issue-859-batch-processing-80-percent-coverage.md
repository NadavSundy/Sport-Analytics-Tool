# Issue #859 — Batch-processing Direct Coverage Above 80 Percent

**Date:** 2026-10-05  
**Issue:** #859  
**Status:** IMPLEMENTATION READY; broad coverage/check limitation recorded below

## Purpose

Increase direct behavioral coverage of `@sport-analytics/batch-processing` without changing
production behavior, reducing the coverage denominator, excluding production files, or adding ignore
directives.

## Coverage measurements

The untouched package baseline and final package report used
`npm run test:coverage --workspace=@sport-analytics/batch-processing`.

| Metric     | Baseline       | Final            | Change        |
| ---------- | -------------- | ---------------- | ------------- |
| Lines      | 12/495 (2.42%) | 442/495 (89.29%) | +86.87 points |
| Statements | 13/527 (2.46%) | 467/527 (88.61%) | +86.15 points |
| Functions  | 4/112 (3.57%)  | 106/112 (94.64%) | +91.07 points |
| Branches   | 4/442 (0.90%)  | 346/442 (78.28%) | +77.38 points |

Final line coverage was 84.53% for `reference-resolver.ts`, 95.53% for
`batch-publication.ts`, and 100% for `statistics-refresh.ts`. The existing statistics-refresh tests
were preserved; publication behavior exercised the remaining lines.

The repository-wide coverage command did not produce a combined after-result. Its frontend lane
passed at 82.55% lines, 81.10% statements, 87.11% functions and 75.97% branches. The backend lane then
failed because two existing API tests exceeded their 5-second timeout under coverage instrumentation,
so the runner stopped before producing `coverage/combined/coverage-summary.json`. The same two API
files passed without coverage (27/27 tests in 2.53 seconds). No repository-wide percentage is claimed.

## Tests added

### Reference resolution

`reference-resolver.test.ts` directly exercises `resolvePackageReferences()` with contract-valid
packages and a deterministic query executor. It protects:

- exact competition/team names; Cricsheet and application fixture identifiers; innings ordinals and
  application identifiers; participant application/source identifiers; exact squad names and aliases;
- mixed participant roles, wickets and fielders in one package;
- fixture natural-key resolution and provenance for an ignored incomparable template identifier;
- deterministic package/item outcomes and readable provenance;
- ambiguous natural keys and participant names, unresolved scoped descendants, unsupported/malformed
  identifiers and out-of-scope fixture conflicts;
- valid authorized overrides, manual provenance and rejection of a conflicting override; and
- final item roll-up states and canonical innings identifiers.

### Batch publication

`batch-publication.test.ts` directly exercises `publishAcceptedBatchChunk()` at its query boundary.
It protects:

- normal/multi-item publication with semantic assertions over submitted rows;
- wickets, fielders, authoritative powerplays, fixture cache versions, participant versions, final
  batch state and transition writes;
- exact-duplicate replay and conflicting published deliveries without new submission side effects;
- already-published and empty chunks, checkpoint continuation and competing-worker leases;
- reviewed correction target lookup, delivery/wicket replacement, correction history, dependency
  journaling and item publication;
- missing reviewer provenance and vanished/out-of-scope correction targets; and
- invalid options, malformed staged payloads, invalid state and concurrent-cardinality failure.

## Intentionally uncovered behavior

The remaining lines are small defensive paths: malformed wicket/fielders that normal staged-payload
validation rejects, an accepted item without a canonical innings, ambiguous duplicate aliases, a
duplicate internal reference-path guard, and a fixture with neither identifier nor context. They were
not executed merely to inflate the metric. Transactions are caller-owned, so direct fake-boundary tests
verify failures stop later publication/finalization operations rather than pretending to prove database
rollback.

## Verification record

| Command                                                                                                                                                            | Result                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm exec --workspace=@sport-analytics/batch-processing -- vitest run` (baseline)                                                                                  | PASS — 1 file, 2 tests                                                                                                                     |
| `npm run test:coverage --workspace=@sport-analytics/batch-processing` (baseline)                                                                                   | PASS — lines 2.42%, statements 2.46%, functions 3.57%, branches 0.90%                                                                      |
| `npm exec --workspace=@sport-analytics/batch-processing -- vitest run src/reference-resolver.test.ts`                                                              | PASS — 9 tests                                                                                                                             |
| `npm exec --workspace=@sport-analytics/batch-processing -- vitest run src/batch-publication.test.ts src/reference-resolver.test.ts src/statistics-refresh.test.ts` | PASS — 3 files, 24 tests                                                                                                                   |
| `npm run lint --workspace=@sport-analytics/batch-processing`                                                                                                       | PASS                                                                                                                                       |
| `npm run typecheck --workspace=@sport-analytics/batch-processing`                                                                                                  | PASS                                                                                                                                       |
| `npx prettier --check packages/batch-processing/src/reference-resolver.test.ts packages/batch-processing/src/batch-publication.test.ts`                            | PASS                                                                                                                                       |
| `npm run test:coverage --workspace=@sport-analytics/batch-processing` (final)                                                                                      | PASS — lines 89.29%, statements 88.61%, functions 94.64%, branches 78.28%                                                                  |
| `npm run test:coverage`                                                                                                                                            | FAIL — frontend passed; backend coverage timed out in `openapi.test.ts` and `public-read.test.ts`; no combined report                      |
| `npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/openapi.test.ts tests/api/public-read.test.ts`                                              | PASS — 2 files, 27 tests in 2.53 seconds                                                                                                   |
| `npm run check`                                                                                                                                                    | FAIL — structure, format, lint, typechecks, 450 backend unit tests and 418 frontend tests passed; API phase timed out in `openapi.test.ts` |
| `npm run hygiene`                                                                                                                                                  | PASS — Knip, syncpack and dependency-cruiser; no issues                                                                                    |

The Gitea fetch and direct issue/API lookup were attempted before implementation. Both were blocked by
rejected local credentials (the first fetch also exposed an untrusted server CA). The branch was
created from the existing `origin/main` tracking ref at
`4b3cef95dca99db59131e5e11ee04b7a1380677b` (2026-10-05 09:49:43Z). A fresh remote-main comparison
could not be claimed.

## Bugs discovered

No batch-processing production defect was discovered. The broad-suite OpenAPI timeout is an existing
test/runtime stability limitation: it occurs only under broader suite load here, while the focused API
files pass. It was not changed under Issue #859.

## Coverage-integrity confirmation

No production source changed. No coverage exclusion, `coverage.include` change, Istanbul/C8 ignore
directive, private-helper export, assertion weakening or production restructuring was added.

## AI Declaration

The behavioral tests and this validation record were produced with the assistance of Codex[GPT-5].
They were checked with the focused suite, package coverage, formatting, lint, typecheck, hygiene and
the broad commands recorded above. Human review is pending.
