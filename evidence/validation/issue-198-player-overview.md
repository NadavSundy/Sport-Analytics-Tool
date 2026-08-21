# Issue #198: Public player overview validation

**Date:** 2026-08-20  
**Branch:** `feat/198-player-overview`  
**Approved design:** [ADR-007 public cricket information architecture](../decisions/ADR-007-public-information-architecture.md)

## Scope and dependencies

The implementation expands the existing player detail route using the approved player journey,
the current related-collection state and cursor-pagination pattern, and the existing fixture
batting and bowling metric presentation. It continues to request application data only through the
handwritten public API.

The participant fixture-history endpoint and readable relationship summaries were already
available on `main`, as was issue #197's complete fixture overview with inline statistics. No
backend endpoint, shared contract, database schema, dependency, or application architecture was
changed.

## Acceptance-criteria verification

| Acceptance criterion                                  | Verification                                                                                                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Match history appears immediately                     | The player detail mounts the history request below the player's name without a separate browse action.                                                                                                          |
| Readable match context                                | Every card shows named opponents, competition, season, player team, date, match type, and readable squad role.                                                                                                  |
| Batting and bowling figures                           | The fixture-statistics player metric component is reused for the authoritative figures supplied by each history entry.                                                                                          |
| Complete match links                                  | Each named opponent pairing links directly to the issue #197 fixture overview.                                                                                                                                  |
| No visible technical references                       | Identifiers remain confined to request URLs, route values, keys, and link targets; visible identity uses supplied names.                                                                                        |
| Loading, empty, partial, error, and retry             | Focused page tests cover independently loading history, failed history while the player remains visible, retry, no matches, partial warnings, and no published figures.                                         |
| No browser-side aggregates                            | Match cards render only API-provided fixture-level values and do not derive career or season totals.                                                                                                            |
| Three-interaction reachability                        | The browser journey reaches the player in one keyboard activation and the complete fixture overview in a second.                                                                                                |
| Responsive and accessible interaction                 | The browser test runs at desktop and Pixel 7 sizes, uses keyboard and mobile touch input, checks both themes, 200 percent desktop-equivalent reflow, horizontal overflow, and serious or critical Axe findings. |
| Multiple, partial, and no-statistics browser coverage | One browser fixture presents three matches covering complete batting and bowling, partial batting with missing bowling, and no published figures.                                                               |

## Automated verification

| Check                                                 | Result                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Changed-file Prettier and `git diff --check`          | Passed                                                                                           |
| Repository lint and type-check                        | Passed                                                                                           |
| Focused API-client, statistics, and public-page tests | Passed: 30 tests                                                                                 |
| Frontend production build                             | Passed; Vite retained its existing non-failing large-chunk warning                               |
| Backend unit, API, contract, and deployment tests     | Passed: 88, 91, 71, and 4 tests respectively                                                     |
| Contract and backend builds                           | Passed                                                                                           |
| Repository structure check                            | Passed                                                                                           |
| OpenAPI lint                                          | Passed                                                                                           |
| Strict MkDocs build                                   | Passed to a temporary output directory                                                           |
| Focused player-overview Playwright suite              | Passed in desktop and mobile Chromium                                                            |
| Full Playwright suite with one worker                 | 30 passed; 4 unchanged submission-workflow cases failed before rendering their stale mocked form |
| Repository `npm run check`                            | Structure passed; stopped at 11 pre-existing formatting failures outside this branch             |

The complete frontend suite passed all 87 tests outside the submission feature and four of the
eight unchanged submission tests. Its remaining four failures use stale current-user response
mocks and fail before their submission form renders. The full browser suite's four failures are the
corresponding unchanged submission workflows in desktop and mobile Chromium. These limitations are
recorded in the issue #194, #196, and #197 validation history and were not changed because the
submission workflow is outside issue #198.

Database tests were not applicable because this branch changes only frontend presentation,
frontend and browser tests, and their documentation.

## Remaining Definition of Done steps

- Human review
- Pull Request creation
- Peer approval
- Merge into `main`
- Gitea issue closure

## AI Declaration

This implementation validation record was generated with the assistance of Codex[GPT-5.6 Sol].
