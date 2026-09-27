# Issue #551 verification

Date: 2026-09-14. Branch: `fix/551-failed-batch-active-limit`.
Implementation commit: `046b42a`. Current main (`4782a64`) was merged as `e86d08e`.

## Regression evidence

With the new tests present and both production predicates restored to their original
form, the failed-batch regression failed: the count helper returned 3 instead of 1
for one publishing batch and two failed batches. After adding `failed` to both
exclusion predicates, the PostgreSQL suite passed.

The repository tests verify creation of a new receipt and validation job despite
two failed batches; rejection of a fourth active batch without creating a batch or
job; replay of the original receipt at the active limit without duplicate validation
work; and agreement with the count helper. Existing correction/replacement and
publication tests remain in the suite.

## Automated results

- Initial disposable PostgreSQL run after the fix: 169 passed; 2 skipped.
- User-run Docker PostgreSQL workflow: 169 passed; 2 skipped.
- After merging main: `npm.cmd run test:database` passed with exit code 0;
  170 passed; 2 skipped, including all 48 batch repository tests. The additional
  test comes from the merged main branch.
- `npm.cmd run hygiene`: passed after merging main.
- `npm.cmd run check`: completed with exit code 0 after merging main, including
  structure, formatting, lint, type checks, unit/API/frontend/worker/contracts and
  deployment/CI-routing tests, OpenAPI validation, and all production builds.
  Backend unit tests: 247 passed; API tests: 173 passed.

Non-fatal output included React test `act` warnings, PostgreSQL client-query
deprecation warnings, and Vite's large-chunk warning. No check failed.

The two skipped tests are the optional representative performance query-plan suite.

## Manual SQL evidence

Gabriel supplied these screenshots from the isolated Docker database
`sport_analytics_test`:

- [One publishing batch and two failed batches](551-db-01-publishing-and-two-failed.png).
- [Corrected exclusion predicate returns one active batch](551-db-02-failed-excluded-count-one.png).

These screenshots verify the SQL counting rule. They do not demonstrate a browser
upload, receipt creation, or validation-job insertion; those are covered by the
automated repository tests. The screenshots show an open transaction. Gabriel
reported completing rollback, but a zero-row cleanup query result was not supplied.

## AI evidence

The user-pasted [chat transcript](../../ai/transcripts/gabriel-raz/2026-09-14-issue-551-failed-batch-active-limit.md)
was imported verbatim from the original checkout. It records the implementation
and manual-test discussion up to the user's export. Its historical statements
about pending work are retained as conversation evidence.

This verification note was prepared with assistance from Codex[GPT-6].
