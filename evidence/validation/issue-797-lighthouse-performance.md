# Issue #797 — Lighthouse performance evidence and remote-CI handoff

## Scope and evidence boundary

This record covers the public static-route Lighthouse work on
`perf/797-lighthouse-performance`. It is not proof that every user-facing route meets the
issue target. The original requirement of Performance >=90 across all frontend pages remains
open.

All Lighthouse measurements below used a production Vite preview, corrected Lighthouse profiles,
and three-run median aggregation. Local report files are retained under `artifacts/` while the
branch is being prepared; they are not committed evidence and do not represent a remote Gitea run.

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

## Authoritative public static-route results

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

The current-build mobile medians are authoritative for the retained wordmark change. All nine
routes pass TBT <=200ms and CLS <=0.1, but all fail the strict gate because LCP exceeds 2.5 seconds.
Performance alone is not a strict pass.

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

## CI implementation and remote verification

The `lighthouse` Gitea Actions job:

- runs only for frontend-changing pull-request/workflow-dispatch validation, never deployment;
- builds contracts and the production frontend, then serves a local production Vite preview;
- runs the nine public static routes for desktop and mobile, three times each, and records medians;
- writes `artifacts/lighthouse-ci/summary.md`, `summary.json` and individual JSON reports;
- uploads that directory as a 30-day artifact; and
- uses `LIGHTHOUSE_GATE_MODE=report`, which only treats median Performance below 40 as a
  catastrophic regression. It is not >=90 enforcement and is not part of the deployment gate.

Local runner, profile, aggregation, timeout/cleanup and CI-routing tests have passed during this
branch's work. Remote Gitea execution and artifact upload are still **pending**: no remote result
is claimed here.

## Current root-cause remediation run

The current production-preview trace shows that public pages do not wait for OAuth session
resolution before mounting their main content. Instead, the shared entry script was the first
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

These fixes do not complete the issue. The current nine-route mobile set remains **0/9 strict
passes** because all LCP medians exceed 2.5 seconds. The remaining browse routes are 3076–3318ms:
their initial generic loading state is replaced by the final route description after the lazy browse
and shared validator chunks arrive. Homepage LCP is 2862ms. Current report directories are
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
`/` and `/competitions` both scored 100 with LCP below 700ms; full current-build desktop coverage is
still required before final issue signoff.

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

Accordingly, **16/20 public templates** currently have both desktop and mobile Performance >=90:
the previously verified nine static templates, six parameterised templates and the public
not-found template. Fixture detail, competitor detail, participant detail and dataset-release detail
remain unverified against the primary Performance target. This does not complete Issue #797.

The 10 public parameterised templates and the public not-found template are measured above.
Protected routes and the OAuth callback remain **DEFERRED / UNVERIFIED**: they require genuine
approved-origin OAuth/session state, and no mock storage state, credential or bypass is committed.
They must not be counted as passes.

Remaining Issue #797 acceptance work:

1. Run a current-build desktop regression check before declaring the corrected desktop result
   current.
2. Resolve the shared simulated-mobile text-LCP render-delay problem so all required profiles meet
   Performance >=90, LCP <=2.5s, TBT <=200ms and CLS <=0.1.
3. Capture legitimate authenticated and parameterised route evidence with representative data.
4. Push the branch and verify the real Gitea `lighthouse` job, including its uploaded artifact.
5. Obtain team review and decide whether a future strict CI gate is appropriate only after the full
   legitimate profile matrix passes.

Suggested follow-up issues, if the team chooses to split the work, are: (a) investigate and
remediate shared simulated-mobile text-LCP render delay; (b) establish repeatable legitimate
OAuth/representative-data Lighthouse coverage; and (c) enable a strict Lighthouse CI gate after
all required profiles pass.

## AI assistance and review status

This evidence record was drafted with Codex assistance. It does not claim human/team review,
remote Gitea validation, deployment validation or issue completion.
