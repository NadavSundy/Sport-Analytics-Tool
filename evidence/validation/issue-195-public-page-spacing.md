# Issue #195 public page spacing verification

- **Date:** 2026-08-19
- **Branch:** `fix/195-public-page-spacing`

## Scope

The public collection, detail, and statistics page spacing was tightened through the existing
semantic layout classes. The landing-page hero, global navigation, typography, colour palette,
themes, brand identity, component structure, and application-data flow are unchanged.

## Spacing changes

All revised values are on the approved four-pixel spacing scale.

| Layout relationship                          | Previous desktop | Revised desktop | Previous mobile | Revised mobile |
| -------------------------------------------- | ---------------: | --------------: | --------------: | -------------: |
| Collection heading top / bottom padding      |       56 / 40 px |      32 / 24 px |      40 / 32 px |     24 / 16 px |
| Collection filter-to-results gap             |            48 px |           32 px |           48 px |          24 px |
| Detail page top padding                      |            40 px |           32 px |           32 px |          24 px |
| Detail heading top / bottom padding          |       40 / 32 px |      16 / 16 px |      40 / 32 px |     16 / 16 px |
| Detail fact vertical padding                 |            24 px |           16 px |           24 px |          16 px |
| First related/statistics section top spacing |            48 px |           32 px |           48 px |          32 px |

The compact detail spacing keeps back navigation, the page heading, record facts, and the first
related section visually grouped. Collection headings now lead directly into filters, and the
smaller content gap keeps filters associated with their results.

## Browser verification

The focused Playwright checks run in desktop Chromium and the Pixel 7 profile. They verify:

- the exact collection, detail, fact, related-section, and fixture-summary spacing values;
- every measured value is divisible by four;
- the same layout measurements are retained after switching from Day Match to Night Match;
- collection, fixture-detail, fixture-statistics, and statistic-trace content remains visible;
- desktop and mobile pages have no horizontal overflow; and
- a desktop layout emulating 200% browser zoom reflows to the responsive layout without clipping,
  horizontal overflow, or loss of the page heading.

The public collection and statistics checks continue to include keyboard navigation and serious or
critical Axe violation checks.

## Before screenshots

These existing screenshots record the unchanged pre-correction spacing and are reused as the before
evidence:

- [Collection — desktop Day Match](issue-48-public-browsing-desktop.png)
- [Collection — mobile Night Match](issue-48-public-browsing-mobile.png)
- [Fixture statistics — desktop Day Match](issue-54-public-statistics-desktop.png)
- [Fixture statistics — mobile Day Match](issue-54-public-statistics-mobile.png)

## After screenshots

- [Collection — desktop Day Match](issue-195-collection-after-desktop.png)
- [Collection — mobile Night Match](issue-195-collection-after-mobile.png)
- [Fixture statistics — desktop Day Match](issue-195-statistics-after-desktop.png)
- [Fixture statistics — mobile Night Match](issue-195-statistics-after-mobile.png)

All screenshots use mocked public fixture and statistics data. They contain no account, submitter,
or private submission data.

## Automated verification

| Check                                                      | Result                          |
| ---------------------------------------------------------- | ------------------------------- |
| Changed-file Prettier check                                | Passed                          |
| Repository structure check                                 | Passed                          |
| Repository lint                                            | Passed                          |
| Repository type-check                                      | Passed                          |
| Unit, frontend, API, contract, and deployment-helper tests | Passed: 315 tests               |
| OpenAPI lint                                               | Passed                          |
| Contracts, backend, and frontend builds                    | Passed                          |
| Strict MkDocs build                                        | Passed                          |
| Focused spacing Playwright checks                          | Passed: 4 desktop/mobile tests  |
| Full Playwright suite with `--workers=1`                   | Passed: 28 desktop/mobile tests |

The focused checks were run once for verification and again with
`CAPTURE_ISSUE_195_EVIDENCE=1` to produce the after screenshots. Both runs passed. The screenshots
were visually inspected for spacing, overlap, clipping, and theme consistency.

`npm run check` passed the repository structure check and then stopped because the pre-existing and
unchanged local `AGENTS.override.md` does not satisfy Prettier. That unrelated instruction file was
not modified. The changed-file Prettier check and every remaining constituent quality command were
run independently and passed.

The frontend production build retained the existing non-failing warning that the main JavaScript
chunk exceeds 500 kB.

## Remaining Definition of Done steps

- Human review
- Pull Request creation and linkage
- Peer approval
- Merge into `main`
- Gitea issue closure

These steps are not performed by this implementation session.

## AI Declaration

The implementation verification record was generated with the assistance of Codex[GPT-5.6 Sol].
