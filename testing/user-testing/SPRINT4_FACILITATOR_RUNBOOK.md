# Sprint 4 facilitator-only runbook - Issue #803

**Keep this guide private during active tasks.** Participants receive only the selected section of [canonical participant sheets](SPRINT4_PARTICIPANT_TASKS.md). This pack is preparation; no participant has completed a Sprint 4 session.

## Workspace and environments

Actual isolated workspace:

`C:\Uni\Semester_2\SDP\Project\Sport-Analytics-Tool\.worktrees\issue-803`

Application: <https://sport-analytics-tool-web.pages.dev/>. Documentation: <https://sports-analytics-tool.pages.dev/testing/>. These are different sites. Both loaded in Chrome during technical preparation on 2026-10-05. Frontend/API/worker deployed SHAs are not exposed by the inspected UI and remain unverified. Local preparation base e4cd199e is not proof of deployment identity.

All relative paths below are relative to this isolated workspace. Completed evidence belongs in `evidence/user-testing/sprint-4/`; raw anonymised notes in `raw/`, screenshots/inputs in `supporting/`, retests in `retests/`. Use actual dates and anonymous IDs in filenames. No credentials or participant names in retained files/chat.

## Readiness and account matrix

| Role label          | Required actual state                         | What is established                                                     | Remaining verification                                                             |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Public              | Signed out                                    | Sign in navigation shown; public fixture/statistics/comparison readable | Recheck immediately before session; actual build identity                          |
| viewer-test         | Authenticated viewer; no submitter scope      | Label requirement only                                                  | Existence; role; scope; login                                                      |
| submitter-test      | Approved submitter for disposable competition | Label requirement only                                                  | Existence; backend role/scope; writable fixture; packages; reset                   |
| reviewer-admin-test | Actual admin role for review/publication      | Backend/docs require admin; competition-scoped submitter cannot review  | Existence; authoritative admin capability; safe staged/publishable batches; reset  |
| api-consumer-test   | Active consumer; known quota/rate-limit       | Label requirement only                                                  | Existence; non-secret consumer ID/configuration; successful representative request |

Do not infer application accounts from Gitea login or historical account labels. If a role is unavailable, stop that workflow's setup and request the responsible administrator's help. Grants of privileged access require the applicable confirmation; account labels never constitute credentials. Enter existing credentials directly in browser, separately from Git/chat. Codex will not operate Google/Supabase authentication dialogs.

Source routes checked in `apps/frontend/src/App.tsx`: `/`, `/competitions`, `/fixtures`, `/fixtures/:fixtureId`, `/fixtures/:fixtureId/statistics`, `/competitors`, `/participants`, `/participants/compare`, `/sign-in`, `/account/overview`, `/submissions/new`, `/submissions/batches`, `/reviews/batches`, `/admin/users`, `/api`. A source route is not verification of the authenticated UI or role.

## Before recruiting and starting

Facilitator supplied configured-database account/consumer IDs and candidate fixture 14233 in the [technical record](../../evidence/user-testing/sprint-4/technical-preparation.md). These remain reported metadata: test-label mapping, deployed database equivalence and reset are unresolved. They do not release mutating tasks. Exact deployed SHAs remain unknown; local base e4cd199e is not deployment evidence.

1. **Facilitator:** recruit a person representative of the role who did not implement/substantially design that workflow. For a team member, document absence of implementation/design involvement and why prior knowledge will not invalidate the task. Record general experience, not identifying details.
2. Check retained IDs P01-P14 plus concurrent facilitator allocations; P15 is next candidate, not assigned. For the same returning participant retain their existing ID. Keep any identity mapping outside the repository.
3. Explain: “We are testing the application, not you. There are no right or wrong answers. Please work through the tasks as naturally as possible. If something is confusing, say what you are thinking. I will normally not tell you where to click or how to complete a task because we want to see whether the interface communicates that successfully.”
4. Ask explicit consent before recording audio/video. No recording is necessary. Record consent category without personal signatures/details in Git. If consent is absent, use written notes only.
5. Privately complete [scenario record](sprint-4-scenario-record.md): real environment URL, actual frontend/API/worker build or verified limitation, selected tasks, account state, data IDs/checksums, starting state, expected results and demonstrated reset.
6. Use a separate clean browser window/profile or signed-out state. Do not clear another person's unrelated browsing data. Close/hide setup tabs, answer tables and this guide before the participant arrives. Record browser version/device.
7. Copy the role's blank session template. Keep date/participant fields blank until actual scheduling/attendance. Do not manufacture a reviewer batch while a participant waits.

## A. Facilitator-only public setup: S4-PUBLIC

**Who:** facilitator, before Session 1. **Role:** Public, signed out. **Environment:** deployed application, read-only. **Files:** no upload file needed. Template shortcut:

```powershell
ii 'C:\Uni\Semester_2\SDP\Project\Sport-Analytics-Tool\.worktrees\issue-803\evidence\user-testing\sprint-4\templates\public-session-template.md'
```

Privately verify these paths; do not demonstrate them to the participant:

1. Open <https://sport-analytics-tool-web.pages.dev/>. Verify heading “The game, measured ball by ball.” and “Sign in” in Account navigation. “Browse fixtures”, “Explore competitions”, “Browse players”, “Browse teams”, “API” and footer “API Explorer” / “API Documentation” were observed.
2. Select “Browse fixtures”. At <https://sport-analytics-tool-web.pages.dev/fixtures>, verified controls are “Competition”, “Season”, “Team”, “Gender”, “Starting on or after”, “Starting on or before”, “Records per page”, “Apply filters” and “Clear filters”. Wait for “Loading fixtures” to finish. For a private narrowing check, set both date bounds to `2020-02-29` and select “Apply filters”: four records and Active filters were observed, including fixture 5. Select “Clear filters”: blank date bounds and 50 default records were restored. Record errors or inability to load. A fresh load may take time; no latency measurement is claimed.
3. Reference-only check: <https://sport-analytics-tool-web.pages.dev/fixtures/5>. Heading “Thailand vs Singapore”; “Overview”, “Statistics” and “Players” links; competition ACC Eastern Region T20, season 2019/20, 29 Feb 2020. Select “Statistics” to <https://sport-analytics-tool-web.pages.dev/fixtures/5/statistics>. Expected observed score Singapore 139/7 (20.0 overs), Thailand 96/10 (19.0), Singapore won by 43 runs. This fixture is never a successful write/publication target.
4. Comparison readiness: <https://sport-analytics-tool-web.pages.dev/participants/compare>. Select the visible “Fixture” option “New Zealand vs Australia” (observed ID 8937); after player statistics load, select “Player A” = RT Ponting, “Player B” = AC Gilchrist, then “Compare performances”. Observed current-fixture comparison: Ponting 98 runs/55 balls/SR 178.18; Gilchrist 1 run/3 balls/SR 33.33; both “Did not bowl”. Record source IDs/expected values privately. No answer is supplied to participant.
5. The fixture-5 “Compare player performances” link navigates to `/participants/compare?fixtureId=5`, but the inspected UI left “Select a fixture” selected and fixture 5 was absent from the listed first 100 options. Treat this as a technical preparation limitation, not a human finding. The verified 8937 comparison provides ready data without pretending fixture-5 context is retained.
6. Return to landing URL, clear any task-specific filter via “Clear filters”, and hide all setup/expected-answer tabs. Participant chooses their own fixture/analysis; do not tell them which controls or navigation to use. If they choose data with unavailable statistics, record actual behaviour and blockers rather than redirecting them into success.

**Observe:** discoverability, interpretation/units/scope, narrowing, navigation and trust; hesitation/errors; assistance requested and given. **Capture:** one outcome per PUB-01/PUB-02/PUB-03/PUB-06; redacted relevant screens; verbatim comments only when actually recorded. **Save:** actual `YYYY-MM-DD-PXX-public.md` at evidence root; raw notes in raw/; supporting filenames with same prefix and Task ID. **Return:** metadata, four independent task blocks, six post-test responses, evidence paths and blockers using the format below.

**Failure/reset:** if preflight cannot retrieve data, record exact URL/time/visible error and send it to Codex before relying on the workflow. Do not score an unattempted task. Public tasks do not change server records; return to landing and clear test filters for the next participant.

## B. Participant task sheet and Session 1 procedure

Use only the public section of `SPRINT4_PARTICIPANT_TASKS.md` (canonical wording). Start at <https://sport-analytics-tool-web.pages.dev/> signed out. Read PUB-01, then PUB-02, PUB-03 and PUB-06 individually, without revealing setup navigation. A screenshot should show what the participant actually saw, never a recreated “participant” screen.

The facilitator may repeat a task, clarify unfamiliar domain words and resolve unrelated environmental problems. Do not point to controls, direct navigation or explain the intended workflow during scoring. If intervention is necessary, retain its exact content and score Partial/Failure as appropriate. Preserve the original attempted result even if the participant later completes it with help.

Success: completes intended goal without assistance. Partial: meaningful progress but incomplete goal or facilitator intervention. Failure: cannot complete goal. “Not attempted” is attempt status with reason, not a fourth outcome and not success. Missing/uncertain outcome remains pending until clarified.

After tasks, ask the exact six questions:

1. What was the most confusing part of the application?
2. Was there anything you expected to be able to do but could not find?
3. Was any wording or terminology unclear?
4. Which part felt easiest or most intuitive?
5. If you could change one thing, what would you change?
6. Would you feel comfortable performing these tasks again without assistance?

Review/redact source material before sending it to Codex. Codex drafts the factual session record, identifies ambiguities and proposes severity/decisions; facilitator confirms interpretation and team decisions. No absent answer or paraphrase becomes a quote.

## C. Submitter setup: S4-SINGLE (blocked pending safe state)

**Who:** facilitator prepares; participant performs AUTH-01/AUTH-02/SUB-01/SUB-02/SUB-03/SUB-04. **Start:** application landing, signed out. **Account:** approved submitter-test scoped to actual disposable competition. **Private preflight URLs:** `/sign-in`, `/account/overview`, `/submissions/new`, `/submissions/batches` on the agreed staging/local origin. Full staging/local URL remains pending; do not substitute production for a mutating test.

Deployed `/submissions/new` while signed out shows “Login or Sign up”, “Supabase managed authentication” and button “Sign in with Google”. Facilitator/participant performs Google/Supabase login directly; never send credentials to Codex. Verify role and approved competition scope on the actual account UI before the session. Authenticated controls are **source-verified only**, not live-verified: “Single fixture”, “Season”, “Back catalogue”, “Advanced technical JSON”, “Fixture package”, “Competition” and “Fixture”. Resolve exact remaining upload/receipt/reset click sequence in browser after a suitable account/environment is provided; do not rely on guessed controls.

Prepare from current `apps/frontend/public/season-upload-template.json` (contractVersion 1.0, existing-fixture matching), or current CSV/manifest when needed. Do not use old Basic wrappers or technical events arrays for guided tasks. Fill actual competition/country/season/date/teams/player names from disposable target, preserve chosen package/event identities appropriately, and verify readable references resolve. It must contain one fixture, writable unique delivery slots and no existing publication conflicts.

Prepared starters (not ready to upload; target references are still placeholders) are in `testing/user-testing/sprint-4-inputs/`. Follow that directory's README and release gate. Final non-secret files go in `evidence/user-testing/sprint-4/supporting/`: `S4-SINGLE-valid.json`, `S4-SINGLE-invalid.json`, `S4-SINGLE-corrected.json`. Their **absolute paths** are this workspace path plus those filenames. The invalid package differs only by unsupported contract version; corrected replacement restores it. If a cricket-rule validation scenario is chosen instead, document exactly one deliberate error and verify that no earlier unrelated check masks it.

Use independent fresh disposable targets/namespaces for successful SUB-02 and SUB-04 where acceptance/replay would otherwise collide. Before tasks record baseline events/statistics, durable batch state, expected receipt and reset/recreate script/operator. Privately dry-run valid acceptance, invalid rejection and corrected recovery on disposable state, restore/recreate it, record real checksums and then permit participant testing. Expected receipt is stored/staged processing, not an assertion of automatic publication.

Observe whether access, upload, validation, receipt and recovery are understood; capture per-task outcomes, actual validation text, durable references, assistance and file checksums. Save submitter session/raw/supporting evidence using actual date/ID/Task ID. Send those records and source paths to Codex. If role/scope/contract/reference/worker/reset preflight fails, pause this session and report blocker. Never use fixture 5; never silently classify conflict/idempotent replay as new-write success. Reset/recreate only documented disposable target and associated batches through approved tooling, recording before/after state. No verified environment-specific reset command exists yet.

## D. Reviewer setup: S4-REVIEW (blocked pending safe state)

**Who:** facilitator prepares; participant performs AUTH-01/REV-01/REV-02/REV-04. **Start:** agreed staging/local landing signed out. **Role:** reviewer-admin-test with actual authoritative admin role. **Private URLs:** full origin plus `/reviews/batches`, `/reviews/batches/<actual-reference>` and `/submissions/batches/<actual-reference>`; IDs and full staging origin pending.

Prepare a staged `awaiting_review` batch that has passed checks and a publishable disposable batch (may be the same batch if it satisfies both). Record worker progression, validation/rejection/reference information, expected accepted event count, baseline fixture/public statistics and exact publication delta. Record the target's reset/recreate method and demonstrate it before participants arrive. Submitter scope alone is insufficient review authority.

Authenticated review controls such as source “Approve and publish” and reason/confirmation are **not live-verified**. Once logged in, privately inspect actual queue, batch detail, validation/reference sections, reason entry, confirmation and resulting public state; record exact labels/click sequence before relying on them. Do not perform publication merely to discover controls on production. The facilitator then hides setup and gives only the canonical participant tasks; no intended decision path is coached.

Observe queue discovery, evaluation of staged content and publication confidence/effect. Capture per-task outcome, assistance, actual batch status before/after, public-state comparison and redacted screenshots in reviewer record/raw/supporting files. Send source paths and actual state changes to Codex. If the batch remains Stored/Validating, no eligible item exists, capability fails or reset is not reliable, stop preflight and report environmental blocker. Publication changes server/public state; restore/recreate documented disposable fixture/events/batches using approved method before repeat/retest. Reset commands remain pending actual environment.

## E. API setup: S4-API (recommended; key/configuration pending)

Live anonymous operation preflight succeeded: open the API URL, select “Load interactive API Explorer” when shown, verify server `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io - Deployed development API`, expand “GET /api/v1/participants/{participantId}/statistics Get a participant's season, competition and career aggregates”, select “Try it out”, enter participantId `127`, select scope `career`, then “Execute”. HTTP 200 returned Sidhant Singh, complete career scope, 193 runs/155 balls/SR124.52 and 9 wickets/180 legal balls/economy7.97, super overs excluded, no warnings. Request URL: <https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1/participants/127/statistics?scope=career>. Those are observed values, not independently recalculated expectations. For the actual consumer preflight, have the facilitator enter the designated existing key directly via “Authorize” and verify the rendered response privately without exposing it to Codex/screenshots. Keyed access and configured quota remain unverified. Hide this answer/sequence before participants arrive.

**Who:** facilitator prepares; participant performs PUB-05/API-01/API-02. **Role:** active api-consumer-test; no secrets in notes/screenshots. **Start:** application landing; discovery path to `/api` and documentation footer. **Private preflight:** <https://sport-analytics-tool-web.pages.dev/api> and <https://sports-analytics-tool.pages.dev/api/overview/>.

Verify an active test consumer with non-secret identifier, quota/rate-limit configuration and reset/retry expectations. Supply its key privately/directly in browser; redact all authorisation values. Recheck API Explorer controls and the selected bounded operation before the session, recording exact backend URL, method, parameters, source scope/units and response. The anonymous preflight above establishes operation availability; keyed consumer access still requires verification. Do not invent an endpoint from old App Service addresses.

Capture discovery, authentication/key placement comprehension, quota versus credential failures, aggregate result interpretation and assistance. Save actual session and redacted request/response/header evidence with API Task IDs, without raw keys. Return non-secret request parameters, response outcomes, quota state and paths. Aggregate reads need no dataset reset, but consume quota and may create usage telemetry/jobs; record expected usage and use an approved consumer/reset schedule. Never force production quota exhaustion. Missing credentials/configuration or unusable operation blocks setup; report exact issue before selecting it.

## Copy-and-fill return format

```text
Participant ID / role / relevant experience:
Not an implementer/designer of tested workflow (basis):
Actual date/time/timezone:
Environment + exact URL:
Frontend/API/worker build (or what is unavailable):
Browser/version + device:
Facilitator/observer:
Recording: none / explicit consent obtained:
Scenario + account label/role/scope (no secrets):
Prepared IDs/files/checksums + reset method:

Repeat for each selected Task ID:
Task ID + exact wording used:
Attempted: yes/no (if no, reason):
Outcome: Success/Partial/Failure (if actually attempted):
Observed actions / hesitation / errors / positive observations:
Assistance requested:
Assistance given (exact words/action):
Participant comments: verbatim quote / paraphrase:
Screenshot/file paths:
Environmental blockers:

Post-test responses Q1-Q6 (mark missing responses explicitly):
Raw anonymised notes path:
Open ambiguities / factual corrections:
```

## Analysis, fixes and close-out

Use canonical S1-S4 impact ratings and Accept/Defer/Reject/Pending fields in the decision table. Every meaningful finding gets explicit outcome/reason; check existing issues before creating duplicates and trace recurring findings. No change is automatically accepted because it was suggested. A code fix requires meaningful RED/GREEN regression evidence, adjacent checks and browser verification where applicable; substantial defects remain separate scoped work. Accepted S1/S2 changes require actual human retest on the corrected build using the same canonical task, without revealing changed controls.

Preparation-only PR uses Refs #803 and draft status. Git methodology does not authorise normal partial integration without an approved scope decision. No closing issue/Done state until actual sessions, decisions, retests, AI export/register and required checks/review are satisfied. Missing transcript import is described in the AI handoff.

## AI Declaration

This runbook was planned and generated with the assistance of Codex[GPT-6]. Browser observations are technical preparation. Human sessions, factual review and authenticated setup remain pending.
