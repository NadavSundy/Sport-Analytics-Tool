# Issue #192 validation — readable public API relationship summaries

## Scope

Issue #192 enriches the existing handwritten public-read API with readable competition, season,
team and player relationship information while retaining stable technical identifiers for routing
and machine-readable relationships.

The implementation follows the approved public information architecture recorded in
`evidence/decisions/ADR-007-public-information-architecture.md`.

No second backend, direct frontend database access or database migration was introduced.

## Implementation evidence

### Seasons

Season responses retain `seasonId` and `competitionId` and additionally expose
`competitionName`.

### Fixtures

Fixture responses retain their existing fields and additionally expose:

- `competitionName`;
- `seasonLabel`; and
- ordered `competitors` summaries containing `competitorId` and `name`.

This provides sufficient readable context for consumers to present fixture identities such as
`Team One vs Team Two` without separate name-resolution requests.

### Fixture statistics

Fixture-statistics responses additionally expose:

- `competitorName` for innings/team statistics;
- `participantName` and `competitorName` for participant statistics;
- `winnerCompetitorName` and `eliminatorCompetitorName` for outcomes; and
- `strikerParticipantName` and `bowlerParticipantName` in calculation traces.

The names are resolved through the existing repository/database queries rather than frontend joins
or per-record service lookup requests.

### Compatibility

The changes are additive. Existing identifiers, endpoints, filters and established response fields
remain available.

The implementation was reconciled with the participant fixture-history work from Issue #193 so its
embedded shared fixture resources satisfy the enriched fixture contract.

## Manual API verification

A local request to:

`GET /api/v1/fixtures/8937/statistics`

returned readable relationships including:

- winner `Australia`;
- innings teams `Australia` and `New Zealand`; and
- readable player names including `BB McCullum`.

A local request to:

`GET /api/v1/fixtures/8937`

returned:

- `seasonLabel: "2004/05"`; and
- named competitor summaries for `New Zealand` and `Australia`.

That historical fixture has no associated competition relationship, so `competitionId` and
`competitionName` correctly remain `null`.

## Automated verification

The following Issue #192 checks passed:

- shared contract tests: 71 passed;
- TypeScript type-check: passed;
- backend unit tests: 81 passed;
- backend API tests: 84 passed;
- PostgreSQL integration tests: 9 test files and 39 tests passed;
- dedicated PostgreSQL public-read tests verified readable season competition names and fixture
  competitor summaries;
- PostgreSQL fixture-statistics coverage verified readable team, player, outcome and trace data;
- OpenAPI validation: passed;
- `git diff --check`: passed.

The PostgreSQL suite was run using:

`npm.cmd run test:database:local`

## Repository-wide quality-gate note

`npm.cmd run check` is not fully green because frontend submission-page tests fail while checking
submitter access. The failing page renders `Submission access could not be checked` before the
`Delivery events JSON` editor is available.

Issue #192 does not modify `apps/frontend`, and:

`git diff --name-only origin/main -- apps/frontend`

returns no files.

The Issue #192 contract, type-check, backend unit, backend API, PostgreSQL and OpenAPI checks listed
above pass.

## Related evidence

- Issue #191
- Issue #192
- `evidence/decisions/ADR-007-public-information-architecture.md`
- `docs/api/public-read.md`
- `docs/api/openapi.yaml`
- `docs/statistics/fixture-statistics.md`
- `evidence/ai/transcripts/shayna-unterslak/2026-08-19-issue-192-readable-public-api-summaries.pdf`

## AI Declaration

The preceding validation record was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
