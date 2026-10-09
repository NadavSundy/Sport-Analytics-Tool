# Issue #894: align final wireframes and design documentation with the implemented product

Session log, Thursday 8 October 2026. Prepared with Claude Web (Claude Opus 5.5). This is a
structured record of the session prepared by the assistant at the author's request; it is not a
verbatim export of the chat.

---

## 1. Request

> Give me a separate branch to complete this issue. We using gitea and not github so give me git add
> and commits so I can push locally. Remember Test Driven Development

**Issue summary (#894, opened by Shayna):** update the final wireframes, information architecture and
design documentation so they reflect the implemented Sport Analytics Tool at Milestone 4; preserve
superseded artefacts in a labelled historical location with a README; add a concise design-evolution
section; do not present planned screens as implemented; keep `python -m mkdocs build --strict` and
`git diff --check` passing and retain AI attribution. Depends on #800 and #878, both already merged.

---

## 2. Investigation

| Step                                                  | Finding                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read `CLAUDE.md`, `CONTRIBUTING.md`, Git methodology  | Branch `docs/<issue>-<description>`; `Refs #894` in every commit; `Assisted-by` trailer; per-member AI register.                                                                                                                                             |
| Compared IA document with `App.tsx` and `PublicShell` | The IA lacked `/participants/compare`, `/account/api-access`, `/privacy`, `/terms`, `/accessibility`, the Pinned menu and the API access section; it still showed Squads/Timeline tabs, the #56 open questions and a "do not implement before review" gate. |
| Inspected the 12 issue #56 SVG wireframes             | All superseded: flat Competitors/Participants header, JSON-paste submission, one Manage users page, tabs that were never built.                                                                                                                              |
| Read feature pages for exact labels                   | Fixture sections, account sections, administration areas, submission scopes, review decisions ("Approve and publish", "Return for correction", "Reject batch"), API Explorer headings.                                                                      |
| Traced design changes to evidence                     | Merge history and the Sprint 2–4 user-testing summaries linked changes to #191/ADR-007, #499, #581, #713, #714, #716, #743, #770 and others; P15-F01/F03 have no recorded fix or human retest.                                                              |
| Checked brand guidelines against the code             | Themes, fonts, assets and motion tokens are implemented; there are no charts and none of the live-scoring signature animations; the Google sign-in button follows Google's styling.                                                                         |

---

## 3. Test-driven slices

Each slice added failing documentation tests in `tests/deployment/final-design-documentation.test.mjs`
(run by `npm run test:deployment`), confirmed they failed for the intended reason, then changed the
documentation until they passed.

| Slice                 | Red (tests added)                                                                                           | Green (change)                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1. Legacy archive     | 6 tests: archive location, removal from docs assets, visible labels, README register, evidence index        | `git mv` of the 12 SVGs to `evidence/design/legacy-wireframes/`, watermark and `<title>`, README, evidence index   |
| 2. Final IA           | 8 tests derived from `App.tsx`, `PublicShell.tsx`, account, administration and fixture pages; wireframes    | Rewritten IA (site map, navigation, role areas, 7 journeys, states, responsive rules) and 10 final SVG wireframes |
| 3. Design evolution   | 5 tests: per-area table with issues, evidence links, honesty about retests, length cap, attribution         | Section 8 with eight areas, two unbuilt ideas and open feedback stated plainly                                     |
| 4. Components & brand | 3 tests: every shared export documented, baseline framed as final, brand implementation-status table        | Component inventory with accessibility contracts; brand "Implementation status at Milestone 4" table              |
| 5. Navigation         | 3 tests: MkDocs Product & API placement, product overview link, reference index separation                  | Nav move, overview section, reference-index note pointing to the archive                                           |

Two test defects were corrected during slice 2 before committing the red tests: `/` normalised to an
empty string, and concrete paths such as `/account/overview` had to match the `/account/:section`
pattern.

---

## 4. Corrections made during the session

- The first mobile watermark clipped at the frame edge; it was resized after rendering.
- Wireframe affordances suggesting collapsible review and statistics sections were removed after the
  source showed those sections are not generally collapsible.
- Review buttons and the API Explorer and Compare players headings were changed to the exact labels
  in the source.
- A blanket attribution rename briefly modified two existing transcripts; both were restored from Git
  before any commit, and transcripts are unchanged on the branch.
- Attribution was normalised to `Claude-Web[Claude Opus 5.5]` to match the author's register.

---

## 5. Verification run by the assistant

- `node --test tests/deployment/final-design-documentation.test.mjs` — 25 passed.
- `npm run test:deployment` — 82 passed.
- `python -m mkdocs build --strict` — passed; 8 Mermaid diagrams and all 10 final wireframes present.
- `git diff --check`, `npx prettier --check .` and `npm run structure:check` — passed.
- `npm run verify:intermediate-ingestion:invariants` — passed (it requires the IA file to exist).

## 6. Limitations

- Wireframes were drawn from the frontend source and labels, not from screenshots of a running
  deployment; the author should compare them with the live application.
- Mermaid diagrams were checked for presence in the build, not rendered in a browser.
- The design-evolution claims rely on merge history and retained testing summaries; team review is
  still required before the Pull Request is merged.
