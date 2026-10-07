# Issue #611 advanced aggregate-query gap analysis

## Conclusion

There is no remaining product capability gap to implement for issue #611. The
smallest meaningful Advanced aggregate question identified by the issue is
already served directly by the existing aggregate API:

```http
GET /api/v1/statistics/leaderboards?scope=competition&competitionId=10&metric=most_runs&limit=10
```

The response ranks participants for one explicit competition (or one explicit
season). It is a question-oriented aggregate result, not a participant-record
lookup: “Who are the top ten run scorers in this competition?”

The remaining gap is traceability only: issue #611 did not previously record
that the implementation was already delivered by issue #635 / PR #665. Adding
a second endpoint, a parallel aggregation pipeline, comparison logic, or a
new pagination mode would duplicate a shipped contract and risk divergent
aggregate correctness.

## Audit evidence

The available `origin/main` reference is `bb336fff` and includes merge commit
`c70d048d` (PR #665), whose implementation commit is `2056cc37`.

| #611 requirement                     | Existing evidence                                                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meaningful aggregate question        | `GET /api/v1/statistics/leaderboards` ranks a season or competition by totals or qualified rate metrics.                                                                                                                              |
| Existing aggregation reuse           | `leaderboards.repository.ts` uses one set-based PostgreSQL statement over accepted-current, standard-innings data; it does not loop over participants or call the participant endpoint once per player.                               |
| Correctness and provenance           | The implementation reads current delivery revisions, uses the shared standard-innings predicate, and documents correction visibility.                                                                                                 |
| Bounded performance                  | `limit` is required by the contract to be 1–50 (default 10) and is applied in the SQL query. Database coverage asserts one statement irrespective of participant count over six reference fixtures (about 1,500 standard deliveries). |
| Filtering/grouping/sorting semantics | `scope=season` requires opaque `seasonId`; `scope=competition` requires `competitionId`; `metric` is allow-listed. Totals/rate directions, qualification rules, and stable tie-breakers are documented.                               |
| OpenAPI and user documentation       | `docs/api/openapi.yaml`, `docs/api/overview.md`, and `docs/statistics/participant-aggregates.md` define parameters, response metadata, examples, bounds, qualification, and ordering.                                                 |
| Automated coverage                   | API tests cover success, validation and 404; unit tests cover scope parsing and invalid identifiers; database tests cover data correctness, qualifications, scope isolation, bound, ties, current corrections, and statement count.   |

## TDD assessment

TDD requires a failing test to demonstrate a missing behavior. No such test is
valid here: the focused leaderboard contract and service tests already pass
against the existing behavior. Creating an intentionally failing test for an
already satisfied contract, or changing the contract merely to manufacture a
gap, would not be evidence-based development. This record therefore preserves
the existing tests as the regression contract and makes no production behavior
change.

## Prerequisites and closure gates

- #593 is closed in Gitea and the aggregate provenance surface is present;
  its stable contributor identifiers and source-submission trace are an
  available technical prerequisite.
- #598 subsequently completed with an authoritative **PASS**, satisfying the
  deployed Basic/Intermediate acceptance prerequisite for selected Advanced
  work. No additional aggregate API capability was required for #611.
- The #612 user-feedback dependency subsequently completed. P13 successfully
  completed `API-02` on the deployed build, independently locating and
  interpreting aggregate cricket statistics after a neutral clarification of
  the term `aggregate`. The final #612 gate closed as **Accepted with documented
  limitations**.

## Verification record

On 2026-09-27, the contracts build passed. Focused leaderboard service tests
passed (3/3) and focused public-read contract tests passed (20/20). The API
test could not collect because this checkout lacks the local
`node_modules/@sport-analytics/object-storage` workspace link; after the
repository's contracts-preparation command rebuilt all three workspace
packages, Vite still could not resolve that missing link. This is an
environment/dependency-layout blocker, not a leaderboard assertion failure;
no API test result is claimed as passing here.

## Privacy review

This record contains no credentials, tokens, cookies, production data, or
personal user-testing observations.

## AI Declaration

The preceding document was generated and edited with the assistance of
Codex[GPT-5], and later reviewed, reconciled and edited for final-state accuracy
with the assistance of ChatGPT-Web[GPT-5.6 Sol].
