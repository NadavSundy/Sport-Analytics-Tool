# Issue #67 public-events API validation

## Implemented evidence

- Anonymous list and detail routes expose current accepted cricket delivery events beneath a
  fixture.
- The repository selects the latest accepted revision for each delivery natural key and orders the
  result by innings ordinal, innings sequence and stable event identifier.
- Cursor pagination is fixture-bound and uses the shared `data` plus `pagination.nextCursor`
  response contract.
- Filters cover innings, batting competitor, participant roles, over number and wicket kind.
- Event projections include stable fixture, competitor and participant identifiers without
  submission ownership, source identifiers, revisions or audit timestamps.
- Shared Zod contracts, OpenAPI operations/schemas and public API examples document the implemented
  behavior.

## Automated coverage

- Contract tests validate the event response and cricket filter query contract.
- API tests cover anonymous access, filter coercion, stable detail reads, pagination metadata,
  validation failures, not-found responses and the absence of private fields.
- Service tests prove deterministic cursor creation, continuation and cross-fixture cursor
  rejection.
- Repository tests verify accepted-only revision selection, every documented filter, deterministic
  SQL ordering, stable detail scoping and limit-plus-one pagination.
- A PostgreSQL-backed API test covers accepted/pending/rejected selection, actual cursor
  continuation, the combined filters, nested wicket/fielding output and privacy-safe detail reads.

## Verification results

The following checks passed on 16 August 2026:

```text
npm run check                               passed
repository structure                       passed
repository formatting                      passed
workspace lint                             passed
workspace type-check                       passed
backend unit tests                         39 passed
frontend tests                             60 passed
backend API tests                          67 passed
shared contract tests                      66 passed
OpenAPI lint                               valid
backend/contracts/frontend builds          passed
```

The full gate was run with
`VITE_API_BASE_URL=http://localhost:3000/api/v1`, the documented test default, because the ignored
local frontend `.env` points development requests at port 3001.

The PostgreSQL-backed test was attempted locally but the configured isolated database was not
running at `localhost:5433`, so it could not execute in this checkout. The test remains part of the
database suite for an environment with the documented isolated test database. No development or
production database was contacted.

## Examples and contract evidence

- Example filtered request and response: `docs/api/public-read.md`
- Machine-readable paths and schemas: `docs/api/openapi.yaml`
- Shared runtime schemas: `packages/contracts/src/public-read.ts`

## Known limitations

- This Basic endpoint exposes cricket delivery events only; future event types require new
  discriminated contracts.
- `competitorId` filters by the innings batting competitor because both fixture competitors take
  part in every delivery.
- `bowlingCompetitorId` is nullable when incomplete fixture reference data does not identify an
  opposing team.
- Local PostgreSQL-backed verification requires the isolated database service on port 5433.

## Pull Request evidence

- Branch: `feat/67-public-events-api`
- Pull Request: `https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/159`
- Reviewer decision and CI result are pending and must be recorded before issue closure.

## AI Declaration

The implementation and this validation record were generated and verified with the assistance of
Codex[GPT-5].
