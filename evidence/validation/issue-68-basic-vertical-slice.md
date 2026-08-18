# Issue #68 Basic vertical-slice test validation

**Date:** 18 August 2026
**Branch:** `test/68-basic-vertical-slice`

## Acceptance-criteria coverage

| Acceptance criterion                                             | Automated evidence                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend role and scope enforcement                               | `apps/backend/tests/authorization.test.ts`, `apps/backend/tests/api/submissions.test.ts`, and `apps/backend/tests/api/admin-users.test.ts` cover anonymous, viewer, submitter, administrator, in-scope, out-of-scope, approval, revocation, and self-promotion paths.                                                                                                              |
| Valid and rejected event submissions                             | `apps/backend/tests/api/submissions.test.ts` covers accepted submissions, contract and domain validation, malformed JSON, payload limits, rate limits, and stable error details.                                                                                                                                                                                                   |
| Provenance and transaction rollback                              | `apps/backend/tests/database/submission.database.test.ts` asserts stored submitter, fixture, schema, event order, and submission identifiers, plus full rollback after a later event conflicts.                                                                                                                                                                                    |
| Reference-fixture derivation                                     | `apps/backend/tests/database/fixture-statistics.database.test.ts` ingests fixture 423788, matches its published scorecard, and proves super-over contributions are excluded. `apps/backend/tests/unit/fixture-statistics.derivation.test.ts` covers the deterministic golden fixture and incomplete data.                                                                          |
| Anonymous public fixture, event, and statistic reads             | `apps/backend/tests/api/public-read.test.ts`, `apps/backend/tests/api/fixture-statistics.test.ts`, and `apps/backend/tests/database/public-events.database.test.ts` cover anonymous reads, accepted-only event selection, deterministic paging, filters, stable identifiers, and privacy-safe projections.                                                                         |
| Frontend public access, protected upload, and validation results | `apps/frontend/src/App.test.tsx`, `apps/frontend/src/pages/PublicBrowsePages.test.tsx`, `apps/frontend/src/features/statistics/StatisticsPages.test.tsx`, and `apps/frontend/src/features/submissions/SubmissionPage.test.tsx` cover public navigation, anonymous and viewer denial, scoped fixture selection, accepted uploads, and event- and field-specific validation results. |

## Disposable PostgreSQL execution

`npm run test:database` now starts a real disposable PostgreSQL 16 cluster when no
`DATABASE_URL_TEST` is configured. The runner chooses an available loopback port, applies all
migrations, seeds the isolated database, executes the suite, and removes the temporary cluster. If
`DATABASE_URL_TEST` is explicitly configured, the same command uses that safety-checked database.

This makes database execution available on a locked-down development machine without Docker,
administrator rights, or a personal hosted database. The database suite remains explicit and
separate from the normal `npm run test` and `npm run check` commands; Pull Request CI runs it as its
own required step against the workflow's PostgreSQL 16 service.

## Automated results

Recorded locally on 18 August 2026:

```text
npm run test:database
Test Files  7 passed (7)
Tests       31 passed (31)

VITE_API_BASE_URL=http://localhost:3000/api/v1 npm run check
Backend unit tests       67 passed
Frontend tests           68 passed
Backend API tests        77 passed
Shared contract tests    68 passed
Deployment helper tests   4 passed
```

The passing database run includes the reference fixture 423788 derivation, submission provenance,
mid-transaction rollback, duplicate-event rejection, anonymous accepted-event reads, schema
constraints, account transitions, and transaction-helper behavior.

The database-independent check also passed repository structure, formatting, workspace lint,
workspace type-checking, OpenAPI lint, and the contracts, backend, and frontend production builds.
The focused database suite was rerun separately after the migration child-process cleanup and again
passed all 31 tests.

## Remaining Definition of Done steps

- Obtain peer review and passing Pull Request CI.
- Merge the Pull Request and close Issue #68.

## AI Declaration

The disposable database test workflow, acceptance mapping, and this validation record were produced
with the assistance of Codex[GPT-5].
