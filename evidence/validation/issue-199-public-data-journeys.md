# Issue #199: Connected public-data journey validation

**Date:** 2026-08-23  
**Branch:** `test/199-public-data-journeys`  
**Approved design:** [ADR-007 public cricket information architecture](../decisions/ADR-007-public-information-architecture.md)

## Scope and dependencies

Issues #194 through #198 and the approved public-data design are present on `main`. This issue
adapts their browser tests and records connected verification evidence; it does not change
production application behavior, the handwritten API, shared contracts, database, or dependencies.

## Interaction matrix

Measurement starts after the relevant public navigation entry page loads. Scrolling, reading,
waiting, moving focus, changing theme, and browser Back do not count as purposeful interactions, in
accordance with ADR-007.

| Required information               | Entry point  | Purposeful activation sequence                                            | Count | Automated evidence                |
| ---------------------------------- | ------------ | ------------------------------------------------------------------------- | ----: | --------------------------------- |
| Competition                        | Competitions | Open `Premier Cricket League`                                             |     1 | Public-browsing connected journey |
| Season                             | Competitions | Open competition; open `2026 season`                                      |     2 | Public-browsing connected journey |
| Fixture and inline statistics      | Competitions | Open competition; open season; open `Wanderers vs Strikers`               |     3 | Public-browsing connected journey |
| Fixture by readable filter         | Fixtures     | Choose readable competition suggestion; apply filters; open named fixture |     3 | Public-browsing filter journey    |
| Team                               | Teams        | Open `Wanderers`                                                          |     1 | Public-browsing connected journey |
| Team fixture and statistics        | Teams        | Open team; open `Wanderers vs Strikers`                                   |     2 | Public-browsing connected journey |
| Player and fixture performance     | Players      | Open `A Player`                                                           |     1 | Player-overview connected journey |
| Player match and inline statistics | Players      | Open player; open `Wanderers vs Strikers`                                 |     2 | Player-overview connected journey |
| Calculation trace                  | Players      | Open player; open match; open `View calculation trace`                    |     3 | Player-overview connected journey |

The fixture overview reached from either competition, team, or player context displays the named
competition and season, match facts, outcome, completeness, innings totals, player batting/bowling
statistics, participating players, and calculation-trace links without another primary-statistics
action.

## Automated coverage

The adapted `public-browsing.spec.ts` journey:

- starts at the readable Competition name filter;
- completes competition to season to fixture using keyboard activation;
- confirms inline outcome, innings totals, player figures, and participating-player links;
- starts a separate Team task and reaches the complete fixture in two activations; and
- checks Day Match and Night Match independently at desktop and mobile sizes.

The adapted `player-overview.spec.ts` journey:

- starts at the readable Player name filter;
- covers multiple matches, partial data, a missing discipline, and no published figures;
- opens a named match and confirms its outcome, innings total, and player statistics;
- opens the innings calculation trace as the third keyboard activation; and
- verifies named contributing players and related records in both themes and viewports.

On every representative view, the tests read the complete visible `main` content. They reject known
opaque values, `... ID` and `... reference` labels, backend `competitor` and `participant`
terminology, and visible cursors. This covers headings, labels, facts, filters, links, buttons, and
state messages while permitting readable cricket concepts such as competition, fixture, and event.

## Theme, layout, and accessibility checks

| Check                                            | Desktop Chromium | Pixel 7 Chromium |
| ------------------------------------------------ | ---------------- | ---------------- |
| Day Match content and technical-language audit   | Passed           | Passed           |
| Night Match content and technical-language audit | Passed           | Passed           |
| Unintended horizontal overflow                   | None found       | None found       |
| Keyboard-only representative journeys            | Passed           | Passed           |
| Serious or critical Axe findings                 | None found       | None found       |

## Representative screenshots

| View                                          | Evidence                                                     |
| --------------------------------------------- | ------------------------------------------------------------ |
| Complete fixture overview, desktop Day Match  | [Screenshot](issue-199-competition-journey-desktop-day.png)  |
| Complete fixture overview, mobile Night Match | [Screenshot](issue-199-competition-journey-mobile-night.png) |
| Player match history, desktop Day Match       | [Screenshot](issue-199-player-journey-desktop-day.png)       |
| Calculation trace, mobile Night Match         | [Screenshot](issue-199-player-journey-mobile-night.png)      |

The screenshots were generated by the passing deterministic Playwright journeys and inspected for
visible hierarchy, readable names, partial/unavailable state clarity, clipping, and theme
consistency:

- competition desktop Day Match: 1280 x 2022;
- competition mobile Night Match: 1082 x 8187 device pixels;
- player desktop Day Match: 1280 x 1490; and
- player trace mobile Night Match: 1082 x 4539 device pixels.

## Usability review

The repository-format walkthrough is stored in
[the issue #199 public-data usability record](../user-testing/2026-08-23-issue-199-public-data-journeys.md).
It records the reviewer limitation, tasks, procedure, observations, feedback, decisions,
motivation, retesting, and deliberately deferred follow-up.

## Follow-up work not implemented

Explicit focus placement and route-change announcement after client-side public navigation should
be evaluated in a separate accessibility issue. It affects shared shell/router behavior and is not
silently added to this verification-only issue.

## Automated results

| Check                                        | Result                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Focused connected Playwright suite           | Passed: 8 desktop/mobile tests                                                                  |
| Evidence-capture Playwright run              | Passed: the same 8 tests; four screenshots retained and inspected                               |
| Repository structure check                   | Passed                                                                                          |
| Changed-file Prettier and `git diff --check` | Passed during the final audit                                                                   |
| Repository lint and type-check               | Passed                                                                                          |
| Backend unit tests                           | Passed: 88                                                                                      |
| Frontend tests                               | Passed: 97                                                                                      |
| API tests                                    | Passed: 91                                                                                      |
| Contract tests                               | Passed: 71                                                                                      |
| Deployment-helper tests                      | Passed: 4                                                                                       |
| OpenAPI lint                                 | Passed                                                                                          |
| Contracts, backend, and frontend builds      | Passed; Vite retained its existing non-failing large-chunk warning                              |
| Strict MkDocs build                          | Passed to a temporary output directory                                                          |
| Full Playwright suite with one worker        | 30 passed; 4 unchanged submission-workflow cases failed before their stale mocked form rendered |
| Repository `npm run check`                   | Structure passed; stopped at 5 pre-existing formatting failures outside this branch             |

The full Playwright limitations are confined to `tests/e2e/submissions.spec.ts` in desktop and
mobile Chromium. The two submission scenarios fail before finding their fixture selector or JSON
editor because their current-user mocks are stale. The connected public browsing, player,
statistics, accessibility, authentication, administration, smoke, and submitter-access scenarios
all passed. Submission workflow repair is unrelated to issue #199 and was not implemented.

The five repository formatting failures are the unchanged `AGENTS.override.md`, component-baseline
test, `TextField` component, frontend stylesheet, and component-baseline design document. Every file
changed for issue #199 passes Prettier. Database tests were not applicable because this branch
changes browser verification and evidence only.

## Remaining Definition of Done steps

- Human review
- Pull Request creation
- Peer approval
- Merge into `main`
- Gitea issue closure

## AI Declaration

This interaction matrix and validation record were generated from the executed browser journeys
with the assistance of Codex[GPT-5.6 Sol].
