# Issue #803 technical preparation - not human user-testing evidence

Inspection date: 2026-10-05 (Africa/Johannesburg). This records Codex repository/browser preparation only. No participants, quotes, task outcomes, human findings or human retests are claimed.

## Requirements and repository inspection

Read live #803 description and all visible comments/history in logged-in Chrome; supplied issue PDF agrees with the core criteria. Assignee GabeRaz (Gabriel Raz), Sprint 4, area: testing, priority: high. Live #800 open/unassigned, #801 closed (PR #842), #802 closed (PR #841), #810 open; #803 depends on #800/#801/#802 and blocks #810. Issue #810 explicitly requires final deployment, green CI, exact submitted version and Sprint 4 evidence; #803 is only one part of that gate.

No applicable AGENTS.md found in repository/worktree or checked ancestors. Read CONTRIBUTING, Git/project methodologies, canonical protocol/task bank/overview, validation/evidence index, facilitator setup/scenarios/record, session/evidence templates, ADR-013, Sprint 2/3 summaries and representative P04/P08 records, AI evidence/member-register/transcript guidance/course policy and PR template. Existing earlier rounds retain limitations; their sessions do not count as Sprint 4. Fetched main adds P11-P14 beyond the original checkout's P01-P10; P15 is candidate only, pending concurrent allocation check.

Original checkout remains on feat/611-advanced-aggregate-query-support, 958c4314 with unrelated untracked work. Existing worktrees were inventoried and preserved. Fetch advanced origin/main to e4cd199e; isolated `.worktrees/issue-803` uses `graz/test/803-final-structured-user-testing` (environment namespace plus repository convention). All new evidence is preparation-only.

## Reusable artefacts and work remaining

Reuse canonical goal wording/Task IDs, per-task Success/Partial/Failure, S1-S4 impact definitions, facilitator rules, six post-test questions, privacy review, F01-style findings, Accept/Defer/Reject decisions and issue/fix/retest links. Reuse current guided JSON/CSV/manifest contract starters and safe read-only fixture-5 reference. Earlier Basic wrappers are not active guided inputs.

Sprint 4 had no retained pack/session evidence on fetched main before this work. Prepared pack includes four uncompleted session templates, separated facilitator/task sheets, scenario template, input drafts, capture checklist, decision/retest tables and final-summary skeleton, plus docs navigation. Still required: actual account/data/build readiness; at least three human sessions; facilitator-validated records/decisions; necessary fixes and accepted S1/S2 human retests; recurring findings/product changes; AI transcript import; independent review and CI.

## Deployed browser observations and readiness

Chrome browser, existing viewport; signed-out application, Night Match. No Google/Supabase dialog was automated. No server write/publication performed. Browser snapshots and visual fixture inspection establish only the observed public state; no broad accessibility/mobile/latency claim.

| Surface / planned tasks             | Observed behaviour                                                                                                                                | Readiness / limits                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Application landing / PUB-01        | Correct heading and Browse fixtures/Explore competitions/Browse players/Browse teams links; Sign in shown                                         | Read-only workflow available; participant not yet tested                                       |
| Documentation `/testing/`           | Testing & Quality, protocol/task bank and Sprint 2/3 summaries load                                                                               | Correct separate documentation site; new Sprint 4 page not yet deployed                        |
| `/fixtures` / PUB-01, PUB-03        | 50 default records, first New Zealand vs Australia ID 8937; filter controls present                                                               | Date narrowing exercised; canonical participant task remains independent                       |
| Date filter, 2020-02-29 both bounds | Apply filters yields 4 records, including Thailand vs Singapore ID 5; Active filters shown                                                        | Clear filters restores blank date fields and 50 records                                        |
| `/fixtures/5` / PUB-01              | Thailand vs Singapore overview, ACC Eastern Region T20, 2019/20, 29 Feb 2020                                                                      | Reference/read-only only                                                                       |
| `/fixtures/5/statistics` / PUB-02   | Singapore 139/7, Thailand 96/10, win by 43 runs; scorecards, definitions/calculation detail areas                                                 | Read-only fixture statistics available                                                         |
| `/participants/compare` / PUB-06    | Fixture 8937 New Zealand vs Australia; select RT Ponting and AC Gilchrist; Compare performances yields current-fixture batting/bowling comparison | Meaningful public comparison available: 98/55/SR178.18 versus 1/3/SR33.33, both Did not bowl   |
| Fixture-5 comparison context        | Statistics link navigates to `?fixtureId=5` but Select a fixture remains selected; ID 5 absent from first 100 listed options                      | Technical limitation to track; not a participant finding; use actual available comparable data |
| `/submissions/new` signed out       | Login or Sign up / Supabase managed authentication / Sign in with Google                                                                          | Only sign-in boundary verified; approved role/scope/data/acceptance/recovery/reset unresolved  |
| `/reviews/batches` signed out       | Same login boundary                                                                                                                               | Admin capability, awaiting-review and publication state/reset unresolved                       |
| `/api` / PUB-05                     | API discovery, access guidance, X-API-Key distinction, Load interactive API Explorer, Authorize; implemented operations rendered                  | Discovery UI available; actual consumer/quota/aggregate execution pending                      |

Public source routes verified in App.tsx; live authenticated routes/controls cannot be inferred from source. Accounts viewer-test/submitter-test/reviewer-admin-test/api-consumer-test are requirements, **existence not established**. Backend role for review is admin; submitter competition scope does not confer review permission. Staging/local mutating environment and reset method remain missing; no production write is authorised by a reference fixture.

Exact deployed frontend/API/worker build is not established by inspected UI. Record release/SHAs from actual deployment evidence before a formal session, or explicitly validate/document an unavoidable limitation with the responsible facilitator. Do not infer deployed SHA from local main or a historical URL.

## Facilitator-supplied setup metadata (not independently verified)

During preparation the facilitator supplied the following non-secret checks. They are retained as reported metadata, not Codex verification of accounts, deployment identity or reset readiness:

- Application responds; API health passes at `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1`. Frontend asset observed by facilitator: `index-DqZnpOHl.js`. Exact deployed frontend/API commits remain unconfirmed. `e4cd199e26d8ca1c6ee806486a942ca3cc78acc8` is the local base commit, not a verified deployed or new preparation commit.
- Local frontend `http://localhost:5173` and API `http://localhost:3000/api/v1` are not running.
- Configured backend database metadata: viewers 2/872 with no competition scopes; approved submitter 142 scoped to competitions 4/5/20 and 718 scoped to competition 5; administrator 8. Mapping to test account labels and equivalence to deployed API database remain unconfirmed. IDs alone do not prove browser identity/capability.
- API consumers 1/2: 5 per minute and 20 per day; 3/4: 10 per minute and 100 per day; 5/6: 20 per minute and 10,000 per day; 7: 60 per minute and 10,000 per day. Each reportedly has one unrevoked key. Designated consumer, key availability and deployed configuration remain unconfirmed; no keys are retained here.
- Fictional fixture candidate 14233, competition 5 (ACC Eastern Region T20), date 2031-03-14. No demonstrated reset found. It is **not released for mutation testing**; fixture 5 remains read-only.
- No actual P15+ allocations found by facilitator; reserve an ID only when a real participant is arranged and concurrent allocations are rechecked.

Next setup evidence: authoritative release/SHAs (or agreed recorded limitation), browser account mappings/capabilities, database/environment equivalence, and demonstrated disposable reset. Public read-only testing does not require these authenticated mappings; mutating sessions do.

## Local validation results

API browser preparation additionally executed one anonymous read using the rendered deployed development server: `GET https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1/participants/127/statistics?scope=career`. HTTP 200; Sidhant Singh; status complete; superOversIncluded false; no warnings; career batting 193 runs/155 balls, average 21.44, strike rate 124.52; bowling 9 wickets/180 legal balls, economy 7.97. Rendered response headers showed rate limit 30, remaining 29. This verifies operation availability and observable response only, not independent recalculation, keyed consumer identity/quota or human API task completion. Browser console warning/error inspection before execution was empty; a transient browser snapshot timeout was resolved without changing application state.

Required commands: npm run hygiene; npm run check; isolated Python equivalent of python -m mkdocs build --strict. CI is change-aware; stable required status is Sport Analytics CI / quality (pull_request). Draft/partial work cannot be merged based solely on local checks.

Dependency preparation: initial sandbox npm cache access denied; approved retry found missing cached yauzl, then normal locked npm ci --ignore-scripts --no-audit --no-fund succeeded (979 packages). No lockfile/dependency source change. Bundled/system Python lacked MkDocs; an isolated .venv uses requirements-docs.txt. Checks/results are updated below as actually completed.

- Focused canonical wording: 17 participant task blocks and all four session templates match the current bank; templates have no completed checkboxes. Initial 61 relative links checked in changed Markdown resolve. Codex staged review found only explicitly selected preparation files, no generated output, completed participant records or credential patterns; facilitator/member factual review remains pending.
- Contract starter/schema check: valid and corrected draft shapes accepted by compiled current contract; invalid draft rejected with exactly one issue at contractVersion. Target references remain unresolved and files are not ready for upload. Shipped template tests passed 4/4.
- npm run hygiene: knip and syncpack passed; dependency-cruiser architecture step failed with its unusual baseDir error on the Windows worktree while reading contracts/dist/index.js. No architecture/dependency configuration was changed or weakened.
- npm run check: structure, whole-repository formatting, workspace lint/typechecks, contracts build and backend unit tests (435/435) passed. Two full attempts stopped in unchanged frontend tests: PublicBrowsePages “loads competitions anonymously and exposes their public records” (resolveRequest is not a function); the second also failed App “carries a protected internal deep link into the managed OAuth callback”. Focused PublicBrowsePages rerun passed 35/35; a later frontend-suite rerun passed 389/389; focused App/PublicBrowsePages with direct Vitest --maxWorkers=1 passed 56/56. The root frontend rerun's --maxWorkers flag was consumed by npm rather than passed to Vitest, so it is not claimed as serial execution. These timing-sensitive results do not turn either failed full check into a pass. Source/tests/lockfile are unchanged from the base. Remaining test suites, OpenAPI lint and builds are checked separately below.
- Strict MkDocs build: passed using isolated .venv Python; existing INFO-only unlisted validation pages noted (issues 608/610/611). No strict warning/error. New Sprint 4 summary is in nav.
- Separately completed remaining check stages: API tests 261/261; API contract 89/89; worker 106/106; contracts 292/292; deployment 46/46; CI-routing 69/69; OpenAPI lint passed; all workspace production builds passed. Existing Vite large-chunk warning remains informational. Commands: npm run test:api; npm run test:api-contract; npm run test:worker; npm run test:contracts; npm run test:deployment; npm run test:ci-routing; npm run openapi:lint; npm run build. These do not waive failed aggregate check/hygiene commands.
- Hosted CI / independent team review: not run / pending.
- Human sessions / retests: zero / pending.

## AI Declaration

This technical preparation record was generated with the assistance of Codex[GPT-6]. Actual human verification and transcript import remain pending.
