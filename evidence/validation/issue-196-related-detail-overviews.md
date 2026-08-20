# Issue #196 related detail-overview validation

- **Date:** 2026-08-20
- **Branch:** `feat/196-related-detail-overviews`
- **Approved design:** [ADR-007 public cricket information architecture](../decisions/ADR-007-public-information-architecture.md)

## Scope and dependencies

The implementation adapts the existing public detail layouts, record lists, state messages, and
cursor pagination. It continues to use only the handwritten public API. The readable relationship
summaries from issue #192 and compact public-page spacing from issue #195 were present on `main`
before implementation.

No backend endpoint, shared contract, database schema, dependency, theme, or application
architecture was changed.

## Acceptance-criteria verification

| Acceptance criterion                                   | Verification                                                                                                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Competition pages display seasons, fixtures, and teams | The competition overview independently requests all three relationships and groups fixture rows under readable season headings.                                                   |
| Season pages immediately display fixtures              | Fixtures are the first related section after the readable competition fact; participating teams follow.                                                                           |
| Season fixture results open complete details           | Every named fixture row links directly to `/fixtures/:fixtureId`; the fixture overview shows readable competition, season, team, date, and match facts.                           |
| Team pages display fixtures and players                | Both relationships render as independent named record lists.                                                                                                                      |
| Related sections use readable names                    | Season labels, named teams, named fixture opponents, competition names, and player display names are rendered.                                                                    |
| Technical references are not displayed                 | Identifiers remain in routes, keys, and API filters; affected headings, facts, links, and state messages use public cricket terminology and readable identity.                    |
| Independent section behaviour                          | A focused test holds seasons in loading, then fails and retries it while fixtures remain usable and teams remain empty; fixture pagination then changes only the fixture section. |
| Keyboard accessible and responsive                     | The browser journey uses keyboard activation, runs at desktop and Pixel 7 widths, checks horizontal overflow, and reports no serious or critical Axe findings.                    |
| Information is reachable within three interactions     | The browser test activates competition, season, and fixture in three counted keyboard interactions and reaches the named fixture overview.                                        |
| Frontend and browser coverage                          | The focused page suite covers competition, season, and team details; the public-browsing Playwright file runs the journeys in both configured projects.                           |

## Automated verification

| Check                                   | Result                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| Changed-file Prettier check             | Passed                                                                               |
| `git diff --check`                      | Passed before the final evidence/register update and repeated during the final audit |
| Repository structure check              | Passed                                                                               |
| Repository lint                         | Passed                                                                               |
| Repository type-check                   | Passed                                                                               |
| Focused public-page tests               | Passed: 20 tests                                                                     |
| Focused public-browsing Playwright file | Passed: 6 desktop/mobile tests                                                       |
| Frontend production build               | Passed; retained the existing non-failing large-chunk warning                        |
| OpenAPI lint                            | Passed                                                                               |
| Strict MkDocs build                     | Passed                                                                               |

`npm run check` passed the structure check and then stopped at 12 pre-existing formatting failures:
the unchanged local `AGENTS.override.md` and 11 recently merged weather/API/documentation files.
None is changed on this branch.

The full frontend suite was also attempted. All 20 affected public-page tests passed, while four
pre-existing statistics tests and four pre-existing submission tests failed because their mocks do
not satisfy the current readable public/statistics and current-user contracts. The same stale-mock
limitation was recorded before this branch in the issue #194 AI register entry.

The full Playwright attempt passed 26 of 32 configured desktop/mobile tests. Its six failures were
the corresponding pre-existing statistics and submission scenarios. The statistics browser fixture
was aligned with this issue's readable fixture overview; its focused rerun reached the statistics
route and then failed on its unchanged stale statistics-response mock. Those out-of-scope mock and
submission corrections were not implemented.

Database tests were not applicable because this branch changes only frontend presentation, frontend
tests, browser tests, and their documentation.

## Remaining Definition of Done steps

- Human review
- Pull Request creation
- Peer approval
- Merge into `main`
- Gitea issue closure

## AI Declaration

This implementation validation record was generated with the assistance of Codex[GPT-5.6 Sol].
