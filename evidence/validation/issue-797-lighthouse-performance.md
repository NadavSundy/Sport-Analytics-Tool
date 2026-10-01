# Issue #797 — Lighthouse performance evidence and closeout

## Scope and evidence boundary

This record covers the public-route Lighthouse work completed on
`perf/797-lighthouse-performance` and the accepted hosted-CI regression gate. Production
Performance >=90 acceptance evidence is deliberately distinct from the shared hosted-CI gate:
the former is recorded in the production-preview evidence below, while the latter detects
meaningful regressions against approved hosted-CI route/profile floors.

A green hosted baseline run is not, by itself, proof that every production route/profile achieves
Performance >=90. The production evidence available in this record is stated route by route below;
unmeasured protected routes and below-90 parameterised mobile results are retained as known
limitations, not relabelled as baseline-gate passes.

Earlier Lighthouse measurements below used a production Vite preview, corrected Lighthouse
profiles and three-run median aggregation. Those local report files are retained under
`artifacts/`; the final hosted evidence is separately recorded in the final execution section.

## Retained changes and regression coverage

- Public route modules are loaded on demand; the Swagger explorer and optional Three.js home
  enhancement are deferred without removing their accessible fallbacks.
- WOFF2-only Latin font assets use `font-display: swap`.
- `PublicShell` renders only the current theme's wordmark SVG. It preserves the wordmark's
  dimensions, alt text and theme switching while avoiding the inactive 34 KB or 69 KB wordmark
  request. The focused shell component suite passed 8/8 after that change.
- The Lighthouse runner has an explicit route inventory, legitimate OAuth storage-state support,
  representative-route preflight, per-run JSON reports, median aggregation, corrected profiles,
  smoke checks and bounded Chrome cleanup.

## Benchmark correction

Earlier desktop measurements inherited mobile-like throttling and are not valid desktop evidence.
The corrected desktop profile uses Lighthouse's desktop form factor, 1x CPU slowdown, 40 ms RTT,
10,240 Kbps throughput, a 1350 x 940 viewport and a desktop user agent. Mobile uses the standard
simulated mobile profile (4x CPU slowdown, 412 x 823 viewport and Android user agent).

## Historical public static-route investigation

The corrected desktop evidence predates the retained wordmark change, so it is a valid corrected
benchmark but not a current-build desktop regression check. All nine desktop medians passed the
strict thresholds in that earlier build.

| Route               | Desktop Performance | Desktop LCP | Desktop status                  |
| ------------------- | ------------------: | ----------: | ------------------------------- |
| `/`                 |                 100 |       654ms | strict pass; pre-wordmark build |
| `/api`              |                  99 |      1018ms | strict pass; pre-wordmark build |
| `/competitions`     |                  99 |       736ms | strict pass; pre-wordmark build |
| `/seasons`          |                  99 |       761ms | strict pass; pre-wordmark build |
| `/fixtures`         |                  99 |       735ms | strict pass; pre-wordmark build |
| `/competitors`      |                 100 |       729ms | strict pass; pre-wordmark build |
| `/participants`     |                  99 |       748ms | strict pass; pre-wordmark build |
| `/dataset-releases` |                 100 |       708ms | strict pass; pre-wordmark build |
| `/sign-in`          |                 100 |       723ms | strict pass; pre-wordmark build |

These retained mobile medians were captured before the final accepted baseline-gate architecture.
They explain the wordmark experiment and the decision not to use shared-runner strict thresholds;
they are not the final hosted-CI gate result.

| Route               | Performance |    LCP |   TBT |   CLS | Strict status             |
| ------------------- | ----------: | -----: | ----: | ----: | ------------------------- |
| `/`                 |          88 | 2945ms | 193ms | 0.047 | fail: Performance and LCP |
| `/api`              |          86 | 3697ms |  48ms | 0.012 | fail: Performance and LCP |
| `/competitions`     |          89 | 3319ms | 137ms | 0.007 | fail: Performance and LCP |
| `/seasons`          |          89 | 3234ms |  52ms | 0.007 | fail: Performance and LCP |
| `/fixtures`         |          89 | 3242ms |  27ms | 0.007 | fail: Performance and LCP |
| `/competitors`      |          89 | 3231ms |  57ms | 0.007 | fail: Performance and LCP |
| `/participants`     |          89 | 3217ms |  99ms | 0.007 | fail: Performance and LCP |
| `/dataset-releases` |          91 | 3129ms |  59ms | 0.007 | fail: LCP                 |
| `/sign-in`          |          90 | 3225ms |  59ms | 0.007 | fail: LCP                 |

The active-wordmark change improved mobile LCP on every public static route measured. It was
retained after the full nine-route mobile comparison because no material regression was observed.

## Latest bounded investigation

The remaining light wordmark is a 92,307-byte SVG wrapper containing a 69,008-byte PNG. The PNG
contains only `IHDR`, `IDAT` and `IEND` chunks, so it has no safe metadata removal opportunity.
It transfers as 69,365 bytes and is not part of the home or API LCP critical-request chain. The
LCP element is text; Lighthouse attributes approximately 84% of home LCP and 88% of API LCP to
render delay. No further safe first-paint candidate was identified. No fabricated post-change
metrics are recorded for that non-experiment.

## Merged CI regression gate

The `lighthouse` Gitea Actions job:

- runs only for frontend-changing pull-request/workflow-dispatch validation, never deployment;
- builds contracts and the production frontend, then serves a local production Vite preview;
- runs the nine public static routes for desktop and mobile, three times each, and records medians;
- writes `artifacts/lighthouse-ci/summary.md`, `summary.json` and individual JSON reports;
- uploads that directory as a 30-day artifact using `if: always()`; and
- uses `LIGHTHOUSE_GATE_MODE=baseline`, not the production-style `strict` gate.

`scripts/lighthouse-ci-baseline.mjs` persists a Performance floor for every representative
route/profile pair. The final floors were recalibrated from verified hosted Gitea Lighthouse run
19132 at commit `374044d1d0dbc911c18113eafa6a02bd086c2ab7`, using each hosted route/profile
median less a three-point shared-runner variance allowance. This protects against false positives
from runner noise while still detecting meaningful route/profile Performance regression.

The recalibration did not change the aggregation algorithm: the runner still performs three runs
per route/profile, calculates the median of those three runs, then compares that median with the
persisted route/profile floor. It does not use an arithmetic average. The previous Run 1563 floors
are retained below as superseded historical calibration evidence, not as the accepted configuration.

| Route               | Previous desktop/mobile | Final desktop/mobile |
| ------------------- | ----------------------: | -------------------: |
| `/`                 |                100 / 81 |              97 / 90 |
| `/api`              |                 99 / 84 |              96 / 89 |
| `/competitions`     |                 99 / 88 |              96 / 87 |
| `/seasons`          |                 99 / 87 |              96 / 86 |
| `/fixtures`         |                 99 / 88 |              96 / 87 |
| `/competitors`      |                 99 / 89 |              96 / 87 |
| `/participants`     |                 99 / 88 |              96 / 87 |
| `/dataset-releases` |                 99 / 90 |              96 / 88 |
| `/sign-in`          |                 99 / 90 |              96 / 88 |

Missing baseline entries fail closed. The gate is therefore a stable shared-runner regression
signal, while production Performance >=90 remains the separate Issue #797 acceptance criterion.
`strict` and `report` modes remain available for their existing local/diagnostic uses. The
Lighthouse unit tests cover median aggregation, baseline acceptance/rejection, missing-floor
failure, route/profile coverage and the retained strict/report modes; the CI-routing test confirms
baseline mode, three runs and unconditional report upload.

## Historical local root-cause remediation run

At that historical production-preview investigation stage, public pages did not wait for OAuth
session resolution before mounting their main content. Instead, the shared entry script was the first
mobile bottleneck: it transferred 155,638 bytes and completed at about 2.25 seconds in the
controlled browser trace. Authenticated profile retrieval and its contract validator were imported
even for an anonymous visitor. The profile client is now loaded only after a real session is known.
The current root entry transfers 123,465 bytes and completed at about 2.02 seconds in the same
trace. This change preserved the signed-in shell tests and reduced the `/` median LCP from 2945ms
to 2862ms and TBT from 193ms to 33ms.

The API route had an additional real-content boundary: its header/description became the final LCP
only after the lazy API chunk arrived. The route now renders that meaningful, accessible heading and
description before the API fetch/parser/interactive content chunk. The focused regression test was
red against the generic loading state and green after the route frame was added. `/api` median LCP
improved from 3697ms to 3164ms; Performance reached 90, TBT was 27ms and CLS was 0.007.

At this earlier local-investigation stage, the nine-route mobile set was **0/9 strict passes**
because all LCP medians exceeded 2.5 seconds. The remaining browse routes were 3076–3318ms:
their initial generic loading state was replaced by the final route description after the lazy browse
and shared validator chunks arrived. Homepage LCP was 2862ms. The retained report directories are
`artifacts/lighthouse-api-route-frame/` for `/` and `/api`, and
`artifacts/lighthouse-current-mobile-remaining/` for the other seven routes.

## Auth-only shared-entry remediation

Source-map inspection found that the shared entry constructed a full `@supabase/supabase-js`
client even though frontend startup uses only its Auth methods. That retained Storage, PostgREST,
Realtime and Functions client code on every public route. The application now constructs the
equivalent `GoTrueClient` directly with the same Auth endpoint, publishable `apikey`, persistent
session, automatic token refresh and OAuth callback detection settings. The focused client test was
red against the full-client export and green after the auth-only client was introduced.

The normal production entry reduced from 419.6KB (123.3KB gzip) to 304.9KB (90.9KB gzip). Three-run
standard-mobile medians from the fresh production preview improved across all public static routes:

| Route               | Before performance/LCP | After performance/LCP | After TBT | After CLS | Strict status |
| ------------------- | ---------------------: | --------------------: | --------: | --------: | ------------- |
| `/`                 |            90 / 2862ms |           94 / 2614ms |      95ms |     0.047 | fail: LCP     |
| `/api`              |            90 / 3164ms |           91 / 3021ms |      42ms |     0.007 | fail: LCP     |
| `/competitions`     |            89 / 3318ms |           91 / 3096ms |      60ms |     0.007 | fail: LCP     |
| `/seasons`          |            89 / 3312ms |           90 / 3184ms |     104ms |     0.007 | fail: LCP     |
| `/fixtures`         |            89 / 3313ms |           91 / 3105ms |      64ms |     0.007 | fail: LCP     |
| `/competitors`      |            89 / 3318ms |           91 / 3096ms |      13ms |     0.007 | fail: LCP     |
| `/participants`     |            90 / 3229ms |           91 / 3148ms |      12ms |     0.007 | fail: LCP     |
| `/dataset-releases` |            91 / 3076ms |           92 / 2982ms |     104ms |     0.007 | fail: LCP     |
| `/sign-in`          |            89 / 3245ms |           91 / 3120ms |      18ms |     0.007 | fail: LCP     |

The final LCP elements remain real text: the home heading, browse description and API description.
For the median-like second runs, Lighthouse still attributes 2203ms, 2615ms and 2566ms respectively
to text render delay after approximately 457ms TTFB. This demonstrates that the shared entry was a
causal contributor but not the sole remaining LCP blocker. Current report directories are
`artifacts/lighthouse-auth-only-critical-path/` and
`artifacts/lighthouse-auth-only-remaining-mobile/`. Targeted current-build desktop controls for
`/` and `/competitions` both scored 100 with LCP below 700ms; the later hosted baseline execution
is the final CI verification recorded below.

## Deferred coverage and remaining acceptance work

## Current user-facing route inventory

The router contains 32 material user-facing route patterns after excluding redirects/aliases that
render no distinct page (`/account` and `/submissions/batches/new`). Public static routes have
current three-run desktop/mobile evidence where shown below. A representative detail route is not
treated as coverage for a distinct list, statistic, comparison or protected template.

| Route pattern                                                                                                                             | Access/template                     | Representative data or session needed                        | Latest evidence | Status                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------ |
| `/`                                                                                                                                       | public home                         | none                                                         | desktop/mobile  | VERIFIED                                                                 |
| `/api`                                                                                                                                    | public API explorer                 | backend OpenAPI endpoint                                     | desktop/mobile  | VERIFIED                                                                 |
| `/competitions`, `/seasons`, `/fixtures`, `/competitors`, `/participants`                                                                 | public list templates               | public API                                                   | desktop/mobile  | VERIFIED                                                                 |
| `/dataset-releases`                                                                                                                       | public release catalogue            | public API                                                   | desktop/mobile  | VERIFIED                                                                 |
| `/sign-in`                                                                                                                                | public OAuth entry                  | public Supabase configuration                                | desktop/mobile  | VERIFIED                                                                 |
| `/competitions/:competitionId`, `/seasons/:seasonId`, `/competitors/:competitorId`, `/participants/:participantId`                        | public record details               | current representative public IDs                            | none            | BLOCKED: no deterministic IDs                                            |
| `/fixtures/:fixtureId`, `/fixtures/:fixtureId/players`, `/fixtures/:fixtureId/statistics`, `/fixtures/:fixtureId/statistics/:statisticId` | public fixture/statistics templates | fixture and statistic IDs                                    | none            | BLOCKED: no deterministic IDs                                            |
| `/participants/compare`                                                                                                                   | public comparison template          | fixture/player query values                                  | none            | BLOCKED: no deterministic query state                                    |
| `/dataset-releases/:version`                                                                                                              | public release detail               | published release version                                    | none            | BLOCKED: no deterministic version                                        |
| `/auth/callback`                                                                                                                          | OAuth restoration                   | real approved-origin OAuth callback                          | none            | BLOCKED: no legitimate callback state                                    |
| `/account/:section`                                                                                                                       | signed-in account                   | legitimate viewer session                                    | none            | BLOCKED: `LIGHTHOUSE_VIEWER_STORAGE_STATE` absent                        |
| `/submissions/new`, `/submissions/batches`, `/submissions/batches/:batchReference`                                                        | submitter workflow                  | legitimate submitter session; batch reference for detail     | none            | BLOCKED: `LIGHTHOUSE_SUBMITTER_STORAGE_STATE` and batch reference absent |
| `/admin`, `/admin/users`, `/admin/api-consumers`, `/admin/api-consumers/:consumerId`, `/admin/dataset-releases/new`                       | administrator templates             | legitimate administrator session; consumer ID where required | none            | BLOCKED: `LIGHTHOUSE_ADMIN_STORAGE_STATE` and consumer ID absent         |
| `/reviews/batches`, `/reviews/batches/:batchReference`                                                                                    | reviewer/admin workflow             | legitimate administrator session and batch reference         | none            | BLOCKED: administrator state and review batch reference absent           |
| `*`                                                                                                                                       | public not-found template           | none                                                         | none            | PENDING: distinct error template not audited                             |

## Current-build desktop public-static matrix

All current-build desktop reports use the corrected desktop profile, three runs and median
aggregation. The `/` and `/competitions` controls were captured from the identical retained build;
the remaining seven reports are in `artifacts/lighthouse-current-desktop-remaining/`.

| Route | Performance | FCP | LCP | TBT | CLS | Primary >=90 |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 100 | 481ms | 611ms | 0ms | 0.001 | pass |
| `/api` | 99 | 541ms | 765ms | 0ms | 0.001 | pass |
| `/competitions` | 100 | 525ms | 683ms | 0ms | 0.001 | pass |
| `/seasons` | 100 | 532ms | 683ms | 0ms | 0.001 | pass |
| `/fixtures` | 100 | 519ms | 673ms | 0ms | 0.001 | pass |
| `/competitors` | 100 | 531ms | 678ms | 0ms | 0.001 | pass |
| `/participants` | 100 | 517ms | 675ms | 0ms | 0.001 | pass |
| `/dataset-releases` | 100 | 544ms | 695ms | 0ms | 0.001 | pass |
| `/sign-in` | 100 | 554ms | 709ms | 2ms | 0.001 | pass |

Desktop public-static result: **9/9 Performance >=90**. Mobile public-static result remains
**9/9 Performance >=90**, with **0/9** satisfying the optional LCP <=2.5s composite gate.

## Public parameterised and not-found verification (current production build)

The current production Vite bundle (`index-9wIDyUgE.js`) was served through the locally configured
`http://localhost:5173` preview origin. This origin matters: the local team API explicitly permits
that origin, while a `127.0.0.1` preview origin correctly receives browser CORS failures. All
representatives below were read from the supported, unauthenticated team HTTP API at
`http://127.0.0.1:3001/api/v1`; no database SDK, private credential, mock storage state or
placeholder identifier was used.

| Actual route pattern                           | Required representative IDs/query                                               | Valid-data source                                                             | Expected page content                 | Readiness  |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------- | ---------- |
| `/competitions/:competitionId`                 | `competitionId=1`                                                               | `GET /competitions/1`                                                         | Asian Games Men's Cricket Competition | smoke pass |
| `/seasons/:seasonId`                           | `seasonId=season_eyJjb21wZXRpdGlvbklkIjoiMSIsImxhYmVsIjoiMjAxNC8xNSJ9`          | `GET /seasons/:seasonId`; its `competitionId=1` matches `GET /competitions/1` | 2014/15                               | smoke pass |
| `/fixtures/:fixtureId`                         | `fixtureId=493`                                                                 | `GET /fixtures/493`; fixture belongs to competition `1` and that season       | South Korea vs Malaysia               | smoke pass |
| `/fixtures/:fixtureId/players`                 | `fixtureId=493`                                                                 | same fixture response                                                         | South Korea vs Malaysia player roster | smoke pass |
| `/fixtures/:fixtureId/statistics`              | `fixtureId=493`                                                                 | `GET /fixtures/493/statistics`                                                | Match statistics                      | smoke pass |
| `/fixtures/:fixtureId/statistics/:statisticId` | `fixtureId=493`; `statisticId=stat_Z0mv03tenc9xHfC7E6vvyNOHwLBSXMrluA3ubEpIDoQ` | statistic from that fixture's statistics response                             | South Korea innings 0 total           | smoke pass |
| `/competitors/:competitorId`                   | `competitorId=985`                                                              | competitor referenced by fixture 493; `GET /competitors/985`                  | South Korea                           | smoke pass |
| `/participants/compare`                        | `fixtureId=493`; `playerA=158`; `playerB=159`                                   | distinct participant statistics from fixture 493                              | Compare players                       | smoke pass |
| `/participants/:participantId`                 | `participantId=158`                                                             | participant from fixture 493 statistics; `GET /participants/158`              | Ahmed Faiz                            | smoke pass |
| `/dataset-releases/:version`                   | `version=2026.09.14v1`                                                          | `GET /dataset-releases`; `GET /dataset-releases/2026.09.14v1`                 | Dataset 2026.09.14v1                  | smoke pass |
| `*`                                            | `/__lighthouse-not-found__`                                                     | deliberate unmatched public path                                              | This public page does not exist       | smoke pass |

The representative resolver was corrected to use the API's typed identifiers (`competitionId`,
`seasonId`, `fixtureId`, `competitorId`, `participantId` and `statisticId`) and preserve the
`/api/v1` base path. It also derives two distinct fixture participants for the comparison template.
Focused resolver and wildcard-inventory tests passed after their red cases. The runner's individual
reports, smoke records and three-run medians are in
`artifacts/lighthouse-public-parameterised-current/`.

| Template / sample URL                                                        | Desktop Perf | Mobile Perf | Mobile LCP | Mobile TBT | Mobile CLS | >=90 both? |
| ---------------------------------------------------------------------------- | -----------: | ----------: | ---------: | ---------: | ---------: | ---------- |
| `*` / `/__lighthouse-not-found__`                                            |          100 |          91 |     3072ms |       15ms |      0.007 | pass       |
| `/competitions/:competitionId` / `/competitions/1`                           |          100 |          90 |     3231ms |       43ms |      0.045 | pass       |
| `/seasons/:seasonId` / encoded representative above                          |           99 |          90 |     3238ms |       37ms |      0.034 | pass       |
| `/fixtures/:fixtureId` / `/fixtures/493`                                     |          100 |          88 |     3533ms |       37ms |      0.008 | **fail**   |
| `/fixtures/:fixtureId/players` / `/fixtures/493/players`                     |          100 |          91 |     3075ms |       16ms |      0.007 | pass       |
| `/fixtures/:fixtureId/statistics` / `/fixtures/493/statistics`               |          100 |          91 |     3122ms |       74ms |      0.008 | pass       |
| `/fixtures/:fixtureId/statistics/:statisticId` / fixture 493 statistic above |          100 |          90 |     3164ms |      108ms |      0.008 | pass       |
| `/competitors/:competitorId` / `/competitors/985`                            |           94 |          79 |     3169ms |       19ms |      0.236 | **fail**   |
| `/participants/compare` / fixture 493 players 158 and 159                    |          100 |          90 |     3068ms |      113ms |      0.008 | pass       |
| `/participants/:participantId` / `/participants/158`                         |           93 |          86 |     3164ms |      130ms |      0.125 | **fail**   |
| `/dataset-releases/:version` / `/dataset-releases/2026.09.14v1`              |           99 |          84 |     3244ms |      155ms |      0.101 | **fail**   |

There is no like-for-like historical parameterised-route baseline, so before values are **MISSING**.
The primary Performance criterion is met for 7 of these 11 templates (six parameterised templates
and the not-found template). All eleven desktop medians are >=90. Mobile LCP remains above the
issue's **"Target healthy Lighthouse metrics where applicable"** target of 2.5 seconds on every
newly measured template; this is recorded independently and does not relabel a >=90 Performance
median as a Performance failure. Mobile CLS also exceeds 0.1 for competitor detail, participant
detail and release detail.

The four real Performance regressions are route-specific, not generic error pages:

- `/fixtures/493` mobile median is 88. Its representative run shows a 3.53s text LCP, about 1.2s
  main-thread work (418ms style/layout and 395ms script evaluation), 45KiB unused initial entry
  JavaScript and 600ms estimated render-blocking stylesheet savings.
- `/competitors/985` mobile median is 79 with CLS 0.236. The representative run has a 3.17s LCP,
  375ms script evaluation, 316ms style/layout, the same 45KiB unused initial entry JavaScript and
  the shared render-blocking stylesheet. Detail content layout shift is the immediate additional
  investigation target.
- `/participants/158` mobile median is 86 with CLS 0.125. One of three runs scored 59 with 1511ms
  TBT; the median-selected report has 867ms script evaluation and 731ms style/layout. This is a
  reproducible variance/long-task follow-up rather than a passing result.
- `/dataset-releases/2026.09.14v1` mobile median is 84 with CLS 0.101. Its representative report
  has 900ms script evaluation, 785ms style/layout and 45KiB unused initial JavaScript; the
  route-specific release detail module is the next data-backed profiling target.

These exploratory parameterised measurements are retained as historical diagnostic evidence; they
are not the final hosted-CI representative matrix. Protected routes and the OAuth callback remain
**DEFERRED / UNVERIFIED** because they require genuine approved-origin OAuth/session state. They
are not counted as audited or passed by the final gate.

## Final hosted Lighthouse execution

PR #829's hosted Lighthouse run is the final CI evidence for the accepted regression gate:

- commit: `374044d1d0dbc911c18113eafa6a02bd086c2ab7` (`374044d1d0`);
- Gitea Actions run: `19132`;
- Lighthouse job: **SUCCESS** in 8m46s; it checked out the commit above;
- public audited: 18 route/profile combinations; protected audited: 0;
- gate mode: `baseline`; regression failures: 0; and
- retained artifact: `lighthouse-public-baseline-374044d1d0dbc911c18113eafa6a02bd086c2ab7`
  (ID `225910`, 3,731,098 bytes, SHA-256
  `8b2a52fd0374901cfb001c1dddb54896f186b3f2d15b6129b959ca0aa7f0fd81`), available from
  [Gitea Actions artifact 225910](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/19132/artifacts/225910).

The runner performed three runs for each representative public route/profile and applied its
existing median aggregation. The final hosted aggregate Performance results were:

| Route               | Desktop | Mobile | Baseline gate |
| ------------------- | ------: | -----: | ------------- |
| `/`                 |     100 |     93 | pass          |
| `/api`              |      99 |     92 | pass          |
| `/competitions`     |      99 |     90 | pass          |
| `/seasons`          |      99 |     89 | pass          |
| `/fixtures`         |      99 |     90 | pass          |
| `/competitors`      |      99 |     90 | pass          |
| `/participants`     |      99 |     90 | pass          |
| `/dataset-releases` |      99 |     91 | pass          |
| `/sign-in`          |      99 |     91 | pass          |

The final summary's `Strict >=90 failures: 9` is diagnostic output only. It is not a CI failure:
the configured shared-runner gate is `LIGHTHOUSE_GATE_MODE=baseline`. Strict absolute thresholds
were rejected for hosted CI because production-style absolute scores were not stable in that shared
environment. Production Performance >=90 remains the separate acceptance evidence; baseline mode
protects the representative hosted-CI signal without reinterpreting it as production evidence.

Run 19132 therefore proves that the blocking hosted regression gate operated correctly, including
artifact retention and zero baseline failures. It does not prove production Performance >=90 for every
route/profile: `/seasons` mobile had a hosted median of 89, and hosted CI audits public routes only.

The baseline architecture covers the nine representative public routes above in both desktop and
mobile profiles. It uses persisted per-route/profile Performance floors from
`scripts/lighthouse-ci-baseline.mjs`; a missing entry fails closed. JSON route reports and the
summary are uploaded with `if: always()` even if the gate fails.

Local automated verification completed on 1 October 2026:

- `node --test tests/ci/*.test.mjs`: 68 passed; 0 failed.
- `node --test scripts/lighthouse-*.test.mjs`: 17 passed; 0 failed.
- `git diff --check`: passed.
- `npx --no-install prettier --check evidence/validation/issue-797-lighthouse-performance.md`:
  could not run because this checkout has no local Prettier package; the command deliberately did
  not download one. No formatting-pass claim is made.

The recalibration followed a focused Red-to-Green documentation-supported test update: the complete
expected-floor matrix failed against the prior persisted values, then passed after the final floor
matrix was stored. The tests now pin all 18 route/profile floors and verify that every profile
rejects a Performance score one point below its configured floor.

## Final closeout status

| Acceptance item                        | Status    | Evidence                                                                                                                                                |
| -------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Performance >=90 evidence   | QUALIFIED | Public static routes: 9/9 desktop and mobile >=90; parameterised mobile: 7/11 >=90; protected routes unverified.                                        |
| Desktop and mobile production evidence | QUALIFIED | Public static production-preview evidence covers both; parameterised mobile has four <90 results; protected routes have no legitimate session evidence. |
| Representative public-route CI gate    | PASS      | Nine routes in PR #829 run 19132.                                                                                                                       |
| Desktop and mobile CI profiles         | PASS      | 18 public route/profile audits.                                                                                                                         |
| Three-run median aggregation           | PASS      | Final runner execution and implementation evidence.                                                                                                     |
| Persisted baseline regression floors   | PASS      | Final Run 19132 median-minus-3 matrix recorded above.                                                                                                   |
| Recalibration floor-matrix tests       | PASS      | All 18 floors pass at floor and reject one point below.                                                                                                 |
| Missing-baseline fail-closed behaviour | PASS      | Lighthouse unit coverage and merged implementation.                                                                                                     |
| Final hosted Lighthouse execution      | PASS      | Run 19132; Lighthouse job SUCCESS.                                                                                                                      |
| Zero baseline regression failures      | PASS      | Final runner summary: 0.                                                                                                                                |
| Retained JSON-report artifact          | PASS      | Artifact ID 225910.                                                                                                                                     |
| Automated Lighthouse and CI tests      | PASS      | 68 CI tests and 17 Lighthouse tests passed.                                                                                                             |
| Evidence documentation                 | PASS      | This record.                                                                                                                                            |

## Known limitations and follow-up

The following retained observations do not change the hosted-CI result and are non-blocking for
#797 closeout: the historical mobile production-preview medians for `/fixtures/493`,
`/competitors/985`, `/participants/158` and `/dataset-releases/2026.09.14v1` were respectively
88, 79, 86 and 84; protected routes were not audited because no legitimate session evidence was
available. Any further route optimisation or authenticated-route measurement belongs in separately
scoped follow-up work. This record does not claim those routes were re-tested or that every route
universally meets Performance >=90.

## AI assistance and review status

This evidence record was drafted with Codex assistance. It records the supplied final hosted
Gitea evidence and does not claim protected-route auditing or any authentication bypass.
