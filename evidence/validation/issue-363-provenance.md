# Issue #363 protected provenance validation

## Scope

Issue #363 completes the private trace from a derived fixture statistic through its current contributing
delivery revisions to direct/file submission or batch source provenance, submitter identity and the
acceptance/publication decision.

## Acceptance mapping

| Acceptance criterion                                 | Implementation evidence                                                                                                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Submitters list/inspect direct and batch submissions | `GET /api/v1/provenance/submissions` and `GET /api/v1/provenance/submissions/{reference}`; service limits ordinary submitters to their own sources.                                 |
| Reviewers inspect authorized scope                   | Administrator reviewer visibility is limited to server-owned `competitionIds`; role alone is not a bypass.                                                                          |
| Source metadata, checksum, lifecycle and decisions   | Unified submission provenance source metadata; direct/file SHA-256 persistence; batch `stored_object` metadata; `batch_state_transition` and `batch_review_decision`.               |
| Event source and revision audit                      | `GET /api/v1/provenance/events/{eventId}` resolves current/superseded revisions, source submission/batch item, checksum, decision and immutable correction audit.                   |
| Statistic contributors                               | `GET /api/v1/provenance/fixtures/{fixtureId}/statistics/{statisticId}` reuses normal derivation with contributors enabled and resolves each current delivery to source provenance.  |
| Coherent direct/file/batch model                     | Shared provenance contracts expose the same submitter/source/decision fields for all three source kinds.                                                                            |
| Raw expiry/account tombstoning                       | Batch metadata is read from retained batch/`stored_object` records rather than raw object bytes; account display names may be null while retained internal provenance links remain. |
| Public privacy                                       | Existing anonymous event/statistic routes are unchanged; private audit fields exist only under authenticated `/provenance` routes.                                                  |
| Pagination, authorization and docs tested            | Contract, service authorization and API routing tests were added; OpenAPI and MkDocs documentation updated.                                                                         |

## Verification

Change-aware local CI passed on 9 September 2026 after the implementation and follow-up fixes. The
validated path included repository structure and CI-routing checks, formatting, Knip/dependency/architecture
hygiene, contracts lint/typecheck/build/tests, backend lint/typecheck/build/unit/API tests, frontend
lint/typecheck/unit tests and production build, OpenAPI lint, strict MkDocs build, Playwright browser and
accessibility tests, and PostgreSQL 16 integration tests.

Recorded results:

- Contracts: 134 tests passed.
- Backend unit: 181 tests passed.
- Backend API: 153 tests passed, including the protected provenance API tests.
- Frontend unit: 125 tests passed.
- Browser/accessibility: 42 Playwright tests passed.
- PostgreSQL integration: 145 tests passed and 2 performance-plan tests skipped by the normal suite.
- OpenAPI: valid.
- Strict MkDocs build: passed.
- Final result: `LOCAL CI: PASS`.

AI Declaration: The preceding validation record was generated and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
