# Issue #873 Statistics, Provenance and Dataset-Release Verification

## Metadata

| Field                   | Value                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| Execution issue         | #873                                                                             |
| Tester                  | Dean Feldman with Codex assistance                                               |
| Date/time               | 2026-10-07, Africa/Johannesburg                                                  |
| Candidate commit/tag    | `d963e138d`                                                                      |
| Environment             | Local isolated disposable PostgreSQL 16; no production data or credentials used  |
| Frontend URL            | Not exercised; this is deterministic backend/data verification                   |
| API URL                 | In-process Supertest API coverage                                                |
| Worker/release context  | Database migration; deterministic seed; release service/API tests                |
| Test role(s)            | Test-only administrator; submitter; public read fixtures                         |
| Fixture/package/dataset | Reference fixtures 729307; 423788; 1399114; 1462921; deterministic database seed |

## Results

| Verification ID | Result (`PASS` / `FAIL` / `BLOCKED` / `N/A`) | Evidence / observation                                                                                                                                                   | Linked bug / blocker | Retest     |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ---------- |
| STAT-TECH-01    | PASS                                         | Independently published scorecard figures for reference fixtures 1399114 and 1462921 matched derived fixture and innings totals; `reference-figures.database.test.ts`.   | —                    | Not needed |
| STAT-TECH-02    | PASS                                         | Reference fixture and aggregate tests matched batting runs; dismissals; averages; milestones; ducks; and scope.                                                          | —                    | Not needed |
| STAT-TECH-03    | PASS                                         | Reference and aggregate tests matched legal-delivery; extras; bowling dismissal-credit; rate; haul; and best-bowling rules.                                              | —                    | Not needed |
| STAT-TECH-04    | PASS                                         | Aggregate tests verified catches; stumpings; run-out involvement; and an appearance with no delivery activity.                                                           | —                    | Not needed |
| STAT-TECH-05    | PASS                                         | Reference and edge-case tests covered zero-valued extras; wide/no-ball accounting; super-over exclusion; seven-ball overs; and repeated/printed ball-number constraints. | —                    | Not needed |
| STAT-TECH-06    | PASS                                         | Participant aggregate database tests reconciled season; competition; and career results to fixture derivation/history.                                                   | —                    | Not needed |
| STAT-TECH-07    | PASS                                         | Aggregate grouping and scope tests verified person-identifier grouping and scope-consistent derived values; no separate public leaderboard is implemented.               | —                    | Not needed |
| ADM-TECH-02     | PASS                                         | Provenance API/service coverage followed fixture statistic and participant aggregate contributors through stable event and submission relationships.                     | —                    | Not needed |
| DATA-TECH-01    | PASS                                         | Dataset-release API/service coverage verified creation; metadata retrieval; version lookup; and downloadable JSON artefact response.                                     | —                    | Not needed |
| DATA-TECH-02    | PASS                                         | Dataset-release tests verified immutable release metadata; format/schema version; scope; snapshot; event count; and SHA-256 checksum contract.                           | —                    | Not needed |
| DATA-TECH-03    | PASS                                         | Release event schema plus calculation/provenance tests retain the source event fields required to reproduce representative figures.                                      | —                    | Not needed |
| DATA-TECH-04    | PASS                                         | Dataset-release API/service/database coverage verified queued asynchronous generation; progress lookup; immutable existing-release reuse; and artifact retrieval.        | —                    | Not needed |

## Commands / deterministic steps

```text
npm.cmd run test:database
  disposable PostgreSQL 16; migrations; deterministic seed
  38 files passed; 278 tests passed; 1 file skipped; 2 tests skipped

npm.cmd run test:unit
  57 files passed; 535 tests passed

npm.cmd run test:api
  27 files passed; 269 tests passed
```

## Findings and disposition

No new correctness failure was observed. Therefore no failure retest was required.

The reference-fixture policy already records two source-versus-scorecard divergences: the legal-delivery count for fixture 1462921 and the super-over ball count for fixture 423788. Their affected assertions remain intentionally suspended under `docs/development/reference-fixtures.md`; neither was masked, changed, nor treated as a pass by this execution.

The database run emitted existing `pg` deprecation warnings while exercising concurrent-query paths. They did not fail the run and are not a statistics/reproducibility correctness finding; no product code changed in this issue.

## Evidence

- Final verification matrix: `docs/testing/final-system-verification.md`
- Independent scorecard inputs: `docs/development/reference-fixtures.md` and `evidence/validation/*-published-figures.md`
- Database verification: `apps/backend/tests/database/reference-figures.database.test.ts`; `fixture-statistics.database.test.ts`; `participant-aggregates.database.test.ts`; `participant-aggregate-selective-refresh.database.test.ts`; `statistics-data-versions.database.test.ts`
- Provenance and release contract verification: `apps/backend/tests/api/provenance.test.ts`; `dataset-releases.test.ts`; `apps/backend/tests/unit/provenance.service.test.ts`; `dataset-release.service.test.ts`

## AI Declaration

This execution record, matrix updates, and documentation regression check were prepared with the assistance of Codex[GPT-5]. The commands and results above were observed during this execution; no participant evidence or deployed/manual verification is claimed.
