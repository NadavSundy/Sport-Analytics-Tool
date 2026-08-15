# Issue #104 super-over aggregate validation

## Scope and attribution

The standard fixture-statistics implementation was originally introduced by Dean
Feldman in commit `5bb121f` for Issue #52. Issue #104 is verification and completion
work and does not claim the pre-existing implementation as new work.

## Implementation

- Standard innings are selected once using `is_super_over = false`.
- The accepted-delivery query consumes the selected standard-innings identifiers.
- Batting and bowling derivations therefore receive no super-over deliveries.
- The response reports `superOversIncluded: false`.

## Published reference fixture

Fixture `423788` is New Zealand versus Australia on 28 February 2010. The standard
innings were tied at 214 before the match was decided by a super over.

Published references:

- [New Zealand Cricket match report](https://www.nzc.nz/match-reports/archive/mccullum-southee-steer-blackcaps-to-super-win/)
- [ABC News match report](https://www.abc.net.au/news/2010-02-28/black-caps-win-super-over-thriller/345746)

The PostgreSQL integration test verifies that Brendon McCullum remains 116 from
56 balls and Tim Southee remains 0 wickets for 44 runs from four overs. It also
proves that the excluded super-over records would otherwise add 2 runs and one
ball to McCullum and 6 runs, six legal balls and one wicket to Southee.

## Stakeholder confirmation

The team currently treats super-over exclusion as the default for standard
aggregates under Issue #104. Client confirmation remains pending and must be
recorded in stakeholder-meeting evidence when obtained.

## Local validation

- Backend unit tests: 18 passed.
- Backend API tests: 34 passed.
- Frontend tests: 31 passed.
- Shared-contract tests: 23 passed.
- PostgreSQL integration tests: 18 passed, including the fixture `423788`
  published-scorecard exclusion test.
- Workspace lint and typecheck: passed.
- Contracts, backend and frontend production builds: passed.
- OpenAPI validation and repository structure check: passed.
- Changed-file formatting and whitespace checks: passed.

The combined `npm run check` command stopped at the repository-wide formatting stage because the
unrelated, pre-existing `docs/deployment/azure-app-service-recovery.md` file is not Prettier-clean.
That file was not changed under Issue #104. All subsequent check stages were run separately and
passed as recorded above. Gitea CI is currently unavailable, so this record captures the complete
local validation.

## AI Declaration

This validation record was prepared with the assistance of Codex[GPT-5].
