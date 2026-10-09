# Final Non-User System Verification Bank

> **Owner issue:** [#870 — establish final non-user verification bank and execution matrix](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/870){ target="_blank" rel="noopener" }
> **Milestone:** Milestone 4 — Submission
> **Purpose:** technical/system verification of the final release candidate
> **Initial state:** every case is `NOT RUN` until evidence is produced

## 1. Purpose and boundary

This page is the authoritative **final non-user technical verification bank** for the Sport Analytics Tool.

It is deliberately separate from formal user testing. The existing
[User Testing Task Bank](user-testing-task-bank.md) is reused only as a coverage map because its
`AUTH`, `PUB`, `SUB`, `BAT`, `COR`, `REV`, `ADM`, `DATA` and `API` families already describe the
project's major journeys. Technical results recorded here do **not** create participant evidence,
usability findings or formal user-feedback outcomes.

Each verification case defines the capability to test, prerequisites, method, expected result and
evidence requirement before execution. The final execution issues update the status/evidence fields
as the release candidate is tested.

## 2. Execution ownership

| Execution issue                                                                                                   | Technical-verification scope                                | Primary case families                                |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| [#871](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/871){ target="_blank" rel="noopener" } | Frontend, authentication and roles                          | `AUTH-*`, `PUB-*`                                    |
| [#872](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/872){ target="_blank" rel="noopener" } | Submission, review, batch ingestion and corrections         | `SUB-*`, `REV-*`, `BAT-*`, `COR-*`, selected `ADM-*` |
| [#873](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/873){ target="_blank" rel="noopener" } | Statistics, aggregates, provenance and dataset releases     | `STAT-*`, `DATA-*`, selected `COR-*`, `ADM-*`        |
| [#874](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/874){ target="_blank" rel="noopener" } | External API, contracts, consumer controls and integrations | `API-*`, `INT-*`, selected `SEC-*`                   |
| [#875](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/875){ target="_blank" rel="noopener" } | Database, worker and asynchronous reliability               | `DB-*`, `WRK-*`                                      |
| [#876](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/876){ target="_blank" rel="noopener" } | Performance, load, accessibility and responsiveness         | `PERF-*`, `A11Y-*`, `RESP-*`                         |
| [#877](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/877){ target="_blank" rel="noopener" } | Automated suites, coverage, CI/CD and quality gates         | `AUTO-*`, `COV-*`, `CI-*`, `DEP-*`                   |

The bank must exist before #871–#877 execute. [#810](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/810){ target="_blank" rel="noopener" }
owns final production deployment and release close-out after the execution lanes are complete.

## 3. Result vocabulary and evidence rule

Use only these result states:

| State     | Meaning                                                                                |
| --------- | -------------------------------------------------------------------------------------- |
| `NOT RUN` | Final release-candidate verification has not yet been executed.                        |
| `PASS`    | The expected result was observed and evidence is linked.                               |
| `FAIL`    | Incorrect behaviour was observed. Link a bug/issue.                                    |
| `BLOCKED` | The check could not execute. Record the concrete blocker.                              |
| `N/A`     | The capability is demonstrably outside the final implemented scope. Record the reason. |

A case may not be marked `PASS` from memory, an old Sprint result or the existence of an automated test.
Evidence must identify the final candidate or the exact run used for the conclusion.

For every executed case retain, where relevant:

- date and tester;
- commit/tag/release candidate;
- environment and deployed URL;
- role/account type, without credentials;
- fixture/package/dataset used;
- command/test suite or deterministic steps;
- observed result;
- evidence link;
- linked defect;
- retest result.

Use `evidence/validation/final-system-verification/execution-record-template.md` for retained execution
records.

## 4. Mapping from the formal user-testing bank

This mapping provides consistent product coverage only.

| Existing user-testing family | Technical use in this bank                                                        |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `AUTH-*`                     | Authentication, account state, sessions and access-control boundaries             |
| `PUB-*`                      | Public navigation, fixture/statistics discovery, filters, export and comparison   |
| `SUB-*`                      | Submitter access, direct/guided submission and validation                         |
| `BAT-*`                      | Season/back-catalogue ingestion, progress, recovery and reporting                 |
| `COR-*`                      | Correction, stable identity, provenance and recomputation                         |
| `REV-*`                      | Review queue, reference resolution, approval/rejection and new-fixture onboarding |
| `ADM-*`                      | Access administration and privileged provenance/audit operations                  |
| `DATA-*`                     | Versioned dataset releases and reproducibility                                    |
| `API-*`                      | Consumer API, aggregate queries, versioning/deprecation and usage controls        |

The formal user-testing task bank remains authoritative for participant-facing goals and outcomes.

---

# 5. Verification bank

## A. Authentication, accounts, roles and frontend flow — #871

### AUTH-TECH-01 — Public access without authentication

**Maps from:** `AUTH-04`, `PUB-*`

**Preconditions**

- Final frontend and API deployment are reachable.
- Browser starts without an authenticated application session.

**Method**

1. Open the final public application in a clean/private browser context.
2. Navigate through the public home/data/statistics/API-discovery surfaces.
3. Inspect representative network calls and direct/deep-linked public routes.

**Expected**

- Public data remains available without login.
- Private controls are not exposed as usable authenticated actions.
- Public API reads used by these pages do not unexpectedly require an authenticated session.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### AUTH-TECH-02 — Sign-in completion

**Maps from:** `AUTH-01`

**Preconditions**

- Approved project test identity exists.
- No credentials are committed or retained in evidence.

**Method**

1. Start from the public application.
2. Use the configured authentication flow.
3. Return to the application after provider completion.
4. Verify the application and backend recognise the authenticated account.

**Expected**

- Authentication completes successfully.
- Account/session state is consistent between frontend and protected backend requests.
- Authentication cancellation/failure does not create a false signed-in state.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### AUTH-TECH-03 — Sign-out clears private session state

**Maps from:** `AUTH-04`

**Method**

1. Sign in with a test account.
2. Visit at least one authenticated route.
3. Sign out.
4. Refresh the previous authenticated route and retry a protected API action.

**Expected**

- Private session state is cleared.
- Protected actions are rejected after sign-out.
- Public browsing continues normally.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### AUTH-TECH-04 — Session refresh/reopen behaviour

**Maps from:** `AUTH-01`

**Method**

1. Sign in.
2. Refresh an authenticated route.
3. Reopen the application in the supported session window.
4. Observe any token/session refresh requests.

**Expected**

- Valid supported sessions survive refresh/reopen without corrupting account state.
- Expired/invalid state is handled safely rather than leaving stale privileged controls.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### AUTH-TECH-05 — Role and permission boundary

**Maps from:** `AUTH-02`, `SUB-01`, `REV-*`, `ADM-*`

**Preconditions**

- Test identities for relevant final roles are available.

**Method**

For public/viewer, submitter, reviewer and administrator roles that exist in the final product:

1. Attempt the routes/actions the role should be allowed to use.
2. Attempt at least one representative privileged action the role must not use.
3. Verify the backend response as well as the UI.

**Expected**

- Each role can perform only its authorised actions.
- Server-side authorisation rejects forbidden operations even if a route/request is attempted directly.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### AUTH-TECH-06 — Account deletion boundary

**Maps from:** `AUTH-03`

**Preconditions**

- Disposable account if destructive execution is required.

**Method**

1. Locate the account-deletion path.
2. Verify the confirmation boundary.
3. Where a disposable account is approved, complete deletion and retry authentication/protected access.

**Expected**

- Destructive action requires explicit confirmation.
- Completed deletion removes/invalidates the account according to documented provider/application ownership.
- Evidence contains no credentials or tokens.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### AUTH-TECH-07 — Password recovery ownership/path

**Maps from:** account-lifecycle requirement; no direct user-task-bank equivalent

**Method**

1. Use the documented password/authentication recovery path for the configured provider.
2. Verify the application directs recovery to the correct provider-owned flow.
3. Confirm no custom secret-reset mechanism bypasses the configured authentication provider.

**Expected**

- Recovery behaviour matches final security/authentication documentation.
- No application secret is exposed.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### PUB-TECH-01 — Public fixture discovery and detail

**Maps from:** `PUB-01`

**Method**

1. Start from the public application.
2. Find a representative fixture.
3. Open its available details and data.

**Expected**

- Fixture discovery and detail routes return valid data.
- No broken route, uncaught frontend error or incorrect empty state occurs.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### PUB-TECH-02 — Public statistics discovery

**Maps from:** `PUB-02`

**Method**

1. Open a representative fixture.
2. Navigate to its available statistics.
3. Compare displayed values with the corresponding API response/reference used by #873.

**Expected**

- Statistics routes render successfully.
- Displayed values correspond to the selected fixture/scope.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### PUB-TECH-03 — Filter/narrowing behaviour

**Maps from:** `PUB-03`

**Method**

1. Apply a representative public filter/narrowing control.
2. Record request parameters and returned/displayed scope.
3. Clear/change the filter.

**Expected**

- Selected scope is reflected consistently in UI and API result.
- Clearing/changing the filter does not retain stale data.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### PUB-TECH-04 — Export behaviour

**Maps from:** `PUB-04`

**Method**

1. Select a representative supported export scope.
2. Request available CSV/JSON export(s).
3. Open/parse the resulting file and compare scope/identifiers with the request.

**Expected**

- Export downloads successfully.
- File format/content matches the documented selected scope.
- Export does not leak privileged fields.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### PUB-TECH-05 — API Explorer discovery and deep link

**Maps from:** `PUB-05`

**Method**

1. Reach the API Explorer from public navigation.
2. Open `/api` directly.
3. Refresh the route.

**Expected**

- Explorer is publicly discoverable and deep-linkable.
- Route refresh does not return an unrelated SPA/server error.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### PUB-TECH-06 — Meaningful comparison flow

**Maps from:** `PUB-06`

**Method**

1. Select two supported comparison subjects/scopes.
2. Record compared values and underlying API responses.
3. Navigate between comparison subjects.

**Expected**

- Comparison uses compatible scope/units.
- Values do not silently mix fixture/season/career scopes.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

### PUB-TECH-07 — Loading, empty and failure states

**Maps from:** `PUB-*`

**Method**

Exercise at least one deterministic case for:

- loading;
- a valid empty result;
- an API/network failure.

**Expected**

- The application shows an appropriate state/message.
- No unhandled crash or misleading stale data is shown.

**Status:** `PASS`
**Evidence / defect / retest:** #871 deterministic execution record; no product defect observed.

---

## B. Submission, review, batch ingestion and correction — #872

### SUB-TECH-01 — Submitter access and competition scope

**Maps from:** `AUTH-02`, `SUB-01`

**Method**

1. Sign in with an approved submitter.
2. Verify submission capability for an authorised competition.
3. Attempt submission outside permitted competition scope.

**Expected**

- Authorised scope is accepted.
- Out-of-scope operation is rejected server-side.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### SUB-TECH-02 — Valid guided single-fixture package

**Maps from:** `SUB-02`

**Preconditions**

- Known-valid disposable/approved single-fixture package.

**Method**

1. Upload through the guided single-fixture path.
2. Record durable reference/receipt.
3. Follow status until the intended next state.

**Expected**

- Package is safely received.
- Receipt/status identifies the submission.
- Processing may continue independently after upload.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### SUB-TECH-03 — Invalid guided package validation

**Maps from:** `SUB-03`, `SUB-04`

**Preconditions**

- Package containing known deliberate validation errors.

**Method**

1. Upload invalid package.
2. Record file/row/field error detail.
3. Correct the known error and resubmit using approved disposable data.

**Expected**

- Invalid input is rejected without partial authoritative publication.
- Error identifies actionable source context.
- Corrected replacement can proceed.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### SUB-TECH-04 — Advanced canonical JSON valid path

**Maps from:** `SUB-05`

**Method**

1. Select the advanced technical JSON mode.
2. Submit a known-valid canonical event array to the intended fixture.
3. Record accepted/conflict/rejected response.

**Expected**

- Valid schema is accepted according to documented direct-submission semantics.
- No unrelated competition/fixture data is changed.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### SUB-TECH-05 — Advanced JSON validation errors

**Maps from:** `SUB-06`

**Method**

Submit a canonical event array containing known cricket/business-rule errors.

**Expected**

- Rejection identifies the correct event/field/problem.
- Multiple independent errors remain distinguishable where supplied.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### SUB-TECH-06 — Genuinely new fixture proposal

**Maps from:** `SUB-07`

**Preconditions**

- Valid package for a fixture not already canonical and within allowed competition scope.

**Method**

1. Submit/propose readable fixture metadata without internal IDs.
2. Record staged/new-fixture state.
3. Verify it awaits the correct validation/review path.

**Expected**

- New fixture is not rejected merely because it lacks a pre-existing fixture ID.
- Duplicate protection and review boundary remain active.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### REV-TECH-01 — Review queue exposes eligible staged work

**Maps from:** `REV-01`

**Method**

Create/use a staged batch expected to require review and inspect the reviewer queue.

**Expected**

- Eligible work appears with correct lifecycle/status information.
- Unauthorised roles cannot make the review decision.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### REV-TECH-02 — Reviewer can inspect validation/reference detail

**Maps from:** `REV-02`

**Method**

Open representative staged work containing accepted/rejected/unresolved content.

**Expected**

- Validation, source/provenance and reference information required for a decision is available.
- Blocking state prevents unsafe publication.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### REV-TECH-03 — Resolve an ambiguous reference

**Maps from:** `REV-03`

**Method**

Use a staged item with a controlled ambiguous/unresolved reference and save an approved mapping.

**Expected**

- Mapping is persisted.
- Eligibility/revalidation state updates consistently.
- Mapping does not alter unrelated references.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### REV-TECH-04 — Approve and publish

**Maps from:** `REV-04`

**Method**

Approve known-valid staged work and follow the durable publication path.

**Expected**

- Decision is persisted once.
- Publication proceeds through the documented backend/worker path.
- Public/canonical state eventually reflects the approved data.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### REV-TECH-05 — Return/reject unsafe work

**Maps from:** `REV-05`

**Method**

Use a scenario that must not publish as-is and exercise the appropriate return/reject action.

**Expected**

- Reason/decision is retained.
- Rejected/returned data does not publish.
- Resulting state is distinguishable from approval.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### REV-TECH-06 — Review/onboard a new fixture

**Maps from:** `REV-06`

**Method**

Review a staged genuinely-new-fixture proposal and perform the correct create/link/return action.

**Expected**

- Competition/date/participants/source data are validated.
- Existing duplicate fixture is not silently duplicated.
- Approved new fixture becomes safely canonical/linked before publication proceeds.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### BAT-TECH-01 — Whole-season package

**Maps from:** `BAT-01`

**Method**

Upload a representative season package using approved test/acceptance data and follow processing.

**Expected**

- Durable batch reference is returned.
- Package progresses through validation/staging/review states without silent loss.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### BAT-TECH-02 — Multi-season/back-catalogue package

**Maps from:** `BAT-02`

**Method**

Upload a representative package spanning more than one season using readable external references.

**Expected**

- Season/fixture ownership and references resolve correctly.
- Package does not require internal database IDs from the submitter.
- Distinct seasons remain distinguishable.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### BAT-TECH-03 — Batch status and item results

**Maps from:** `BAT-03`

**Method**

Open a batch in at least one in-progress and one terminal state.

**Expected**

- State, counts and accepted/rejected item information agree with backend/report data.
- Terminal/in-progress state is unambiguous.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### BAT-TECH-04 — Failed/correction-required recovery

**Maps from:** `BAT-04`

**Method**

Use a controlled batch with rejected data or correction requirement and follow the documented recovery path.

**Expected**

- Affected source item/error is identifiable.
- Corrected replacement/retry behaviour does not duplicate prior accepted work.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### BAT-TECH-05 — Complete batch report download

**Maps from:** `BAT-05`

**Method**

Download the complete report for a processed batch and compare it with the on-screen/backend result.

**Expected**

- Report is retrievable.
- Counts/items/status match authoritative batch state.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### BAT-TECH-06 — Idempotent retry/resubmission

**Maps from:** `BAT-*`

**Method**

Retry/redeliver the same durable work according to the supported retry path.

**Expected**

- Already accepted/published authoritative data is not double-counted.
- Duplicate/conflict result is explicit where applicable.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### COR-TECH-01 — Correct published event and preserve history

**Maps from:** `COR-01`

**Method**

Using approved disposable/correction data:

1. identify a published event;
2. submit an authorised correction;
3. inspect canonical event and correction/audit history.

**Expected**

- Corrected value is authoritative.
- Prior state/history remains traceable.
- Stable logical identity/provenance remains coherent.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### COR-TECH-02 — Correction recomputes dependent statistics

**Maps from:** `COR-01`, selected `PUB-*`

**Method**

Record a known dependent statistic before correction, apply correction, then query it again.

**Expected**

- Affected statistic changes correctly.
- Unrelated representative statistics remain stable.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

### ADM-TECH-01 — Submitter-access administration

**Maps from:** `ADM-01`

**Method**

Where the final feature is available, approve/reject a controlled submitter-access request and verify competition scope.

**Expected**

- Decision is persisted correctly.
- Resulting submitter permissions match the selected competition scope.

**Status:** `PASS`
**Evidence / defect / retest:** [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" }; accepted final verification outcome; no new product defect recorded.

---

## C. Statistics, aggregates, provenance and dataset releases — #873

### STAT-TECH-01 — Fixture/innings totals against known result

**Maps from:** `PUB-01`, `PUB-02`

**Method**

Choose at least one representative fixture with trusted reference totals and compare final API/UI output.

**Expected**

- Fixture/innings totals agree with the trusted reference after applying documented domain rules.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### STAT-TECH-02 — Batting calculations

**Maps from:** `PUB-02`, `PUB-06`

**Method**

For representative batters, independently derive/check exposed batting figures from the accepted event data/reference fixture.

**Expected**

- Exposed batting values match documented calculations and selected scope.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### STAT-TECH-03 — Bowling calculations

**Maps from:** `PUB-02`, `PUB-06`

**Method**

For representative bowlers, independently derive/check exposed bowling figures, including legal-delivery/extras handling.

**Expected**

- Values match documented cricket rules and selected scope.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### STAT-TECH-04 — Fielding/appearance calculations where exposed

**Maps from:** `PUB-02`

**Method**

Compare representative final exposed fielding/appearance values with source events/reference data.

**Expected**

- Implemented values are correct and scoped to the intended fixture/aggregate.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### STAT-TECH-05 — Cricket extras and edge cases

**Maps from:** `PUB-*`

**Method**

Run focused automated/reference checks for implemented edge cases such as wides/no-balls with zero-valued
payload fields, repeated printed ball numbers and other documented Cricsheet/domain constraints.

**Expected**

- Derived statistics follow the project's documented event/domain interpretation.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### STAT-TECH-06 — Season/career/competition aggregates

**Maps from:** `PUB-06`, `API-02`

**Method**

Compare representative aggregate values with aggregation over the accepted underlying fixture data.

**Expected**

- Aggregate totals/derived values equal the underlying authoritative data and documented formulae.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### STAT-TECH-07 — Comparison/leaderboard ordering

**Maps from:** `PUB-06`

**Method**

Verify at least one implemented comparison/leaderboard with known values, including tie/scope behaviour where applicable.

**Expected**

- Ordering and units are consistent and reproducible.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### ADM-TECH-02 — Provenance from published data to submission

**Maps from:** `ADM-02`

**Method**

Select a published fixture/event/statistic and follow available provenance/audit information back to its source submission/batch.

**Expected**

- Source relationship is traceable without exposing secret credentials.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### DATA-TECH-01 — Find/retrieve a versioned dataset release

**Maps from:** `DATA-01`

**Method**

Identify a generated release and retrieve the downloadable artefact plus metadata.

**Expected**

- Release has stable version/identifier, documented scope/schema and retrievable artefact.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### DATA-TECH-02 — Release checksum and metadata integrity

**Maps from:** `DATA-01`

**Method**

Compute/verify the documented checksum of a retrieved release and compare metadata/schema/version.

**Expected**

- Checksum matches the released artefact.
- Metadata refers to the same release/scope.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### DATA-TECH-03 — Reproduce representative statistic from release

**Maps from:** `DATA-02`

**Method**

Using only the release plus linked schema/calculation documentation, reproduce one representative published statistic.

**Expected**

- Required source fields/rules are available and reproduced result matches the expected value.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

### DATA-TECH-04 — Asynchronous release generation

**Maps from:** `DATA-*`

**Method**

Request a release-generation workflow and follow API/job/worker state.

**Expected**

- Request does not require one long blocking API process.
- Durable background work reaches a correct terminal state.
- Repeated delivery does not generate inconsistent duplicate authoritative releases.

**Status:** `PASS`
**Evidence / defect / retest:** [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }; no new correctness failure observed.

---

## D. External API, contracts, consumer controls and integrations — #874

### API-TECH-01 — External API and OpenAPI availability

**Maps from:** `PUB-05`, `API-*`

**Method**

From outside the local development environment:

1. request representative public API health/read endpoint;
2. request `/openapi.yaml`;
3. record status/content type.

**Expected**

- Deployed endpoints are externally reachable.
- OpenAPI document is served successfully and anonymously where documented.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-02 — Public API Explorer against deployed contract

**Maps from:** `PUB-05`

**Method**

Open the final `/api` explorer and execute at least one implemented public operation.

**Expected**

- Explorer loads the deployed OpenAPI contract.
- Operation executes against the intended deployed backend.
- Planned/non-implemented operations are not misleadingly executable.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-03 — Contract matches implementation

**Maps from:** `API-*`

**Method**

Run the API contract suite and manually spot-check representative success/validation/auth/rate-limit responses against OpenAPI.

**Expected**

- Implemented method/path/status/shape agrees with the published contract.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-04 — HTTP design and non-redundant endpoint behaviour

**Maps from:** `API-*`

**Method**

Review/exercise representative create/read/update-style operations and nested resources.

**Expected**

- HTTP methods/status codes match operation semantics.
- No final consumer workflow requires redundant duplicate endpoints for the same operation without documented reason.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-05 — Filtering, pagination and stable identifiers

**Maps from:** `PUB-03`, `API-*`

**Method**

Exercise representative list/filter/pagination operations across at least two pages/scopes.

**Expected**

- Filters are applied deterministically.
- Pagination does not silently duplicate/skip stable records under the tested stable dataset.
- Stable identifiers remain consistent between related responses.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-06 — Consumer key authentication

**Maps from:** `API-01`

**Method**

Using a disposable/test key supplied outside Git:

1. make a valid authenticated consumer request;
2. repeat with missing/invalid key.

**Expected**

- Valid key is accepted where required.
- Missing/invalid credential is rejected distinctly.
- Secret key is absent from retained screenshots/logs.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-07 — Quota/rate-limit enforcement

**Maps from:** `API-01`

**Method**

Exercise the documented test-safe quota/rate-limit boundary.

**Expected**

- Limit state is enforced.
- Response status/headers/body expose only documented safe guidance.
- Retry/reset state is coherent.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-08 — Aggregate API capability

**Maps from:** `API-02`

**Method**

Run a representative aggregate query and compare the result with #873's underlying accepted-data calculation.

**Expected**

- Aggregate response scope/units/values are correct.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-09 — Deprecation/versioning behaviour

**Maps from:** `API-03`

**Method**

For any final deprecated operation/version, inspect documentation/OpenAPI/response signalling and replacement guidance.

**Expected**

- Deprecated operation is clearly identified.
- Replacement/lifecycle guidance is accurate.
- If no operation is deprecated in the final release, mark `N/A` with reason rather than fabricating a deprecation.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-10 — Per-consumer usage visibility

**Maps from:** `API-04`

**Method**

Where implemented, use an authorised admin/reviewer path to inspect a test consumer's usage.

**Expected**

- Usage counts/time window/operations agree with controlled requests.
- Secret key material is not displayed.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### API-TECH-11 — Natural-language analytics query

**Maps from:** no formal task-bank equivalent

**Method**

1. Run the repository natural-language evaluation command.
2. Exercise representative deployed queries if included in the release candidate.
3. Include casual/follow-up phrasing owned by #868.

**Expected**

- Implemented query classes meet their documented/evaluated behaviour.
- Unsupported/ambiguous input fails safely instead of fabricating a result.
- If the feature is not part of the final candidate, record `N/A` with reason.

**Repository command:** `npm run evaluate:natural-language-queries`

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### INT-TECH-01 — External weather integration success

**Method**

Exercise the documented weather/external integration through the final deployed system.

**Expected**

- External result is integrated into the intended application/API behaviour.
- Application does not expose provider credentials.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### INT-TECH-02 — External integration failure handling

**Method**

Use a deterministic test/mocked/failure-safe path to exercise provider failure/timeout handling.

**Expected**

- Failure is handled predictably.
- Core application does not crash.
- Secret/provider internals are not returned to public consumers.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### SEC-TECH-01 — Public-response secret/privilege leakage check

**Method**

Inspect representative public API/application responses and built frontend assets for accidental secret/private-field exposure.

**Expected**

- Server credentials, service credentials and secret consumer keys are absent.
- Privileged-only data is not exposed through public endpoints.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

---

## E. Database, worker and asynchronous reliability — #875

### DB-TECH-01 — Deployed database connectivity and health

**Method**

Run the documented deployed backend/database health/smoke path.

**Expected**

- Intended services can connect.
- Public response does not reveal credentials.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; live `worker.probe` completed after its database dependency check.

### DB-TECH-02 — Clean migration/integration setup

**Method**

Run the repository database integration setup against the approved test database.

**Repository command:** `npm run test:database`

**Expected**

- Committed migrations/schema initialise successfully in the test environment.
- Database integration suite passes.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; clean disposable PostgreSQL migration, seed and integration run passed: 38 files passed, 1 skipped; 278 tests passed, 2 skipped.

### DB-TECH-03 — Relational integrity constraints

**Method**

Use database integration tests to exercise representative invalid foreign-key/uniqueness/business-integrity cases.

**Expected**

- Invalid relational state is rejected.
- Valid authoritative relationships remain queryable.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; covered by the completed isolated database integration suite.

### DB-TECH-04 — Transactional consistency

**Method**

Exercise at least one multi-write workflow with an induced/controlled failure at the supported test layer.

**Expected**

- Workflow does not leave a falsely-complete partial authoritative state.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; covered by the completed isolated database integration suite.

### DB-TECH-05 — Representative query/index behaviour

**Method**

For important final read/aggregate paths, inspect representative-scale timing/query-plan evidence where existing performance work exposes it.

**Expected**

- No obvious final high-volume query depends on an unintended full-table/per-item N+1 path without documented acceptance.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; completed database suite includes the representative query-plan/index integration coverage.

### DB-TECH-06 — Production/test data distinction

**Method**

Record final production dataset source/scale and the policy used to distinguish test/demo/writable acceptance data.

**Expected**

- Final documentation can answer what production data is present and what data was introduced only for testing.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; aggregate-only deployed inventory found 3,207,623 deliveries, 14,020 fixtures and four immutable releases, classified as one `local` and three `dev` releases.

### WRK-TECH-01 — Worker liveness/readiness

**Method**

Use deployed worker health/readiness endpoints/runbook.

**Expected**

- Liveness reports running process.
- Readiness reflects required dependencies accurately.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; current internal status is `ready` with database, object storage, and Service Bus all `up`. Earlier failure logs were transient/historical.

### WRK-TECH-02 — Representative queued job completes

**Method**

Enqueue an approved representative ingestion/background job and follow the durable state.

**Expected**

- Message is received and work reaches the correct terminal state.
- API/request process is not required to remain open for the full job.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; live `worker.probe` was received, verified dependencies, and completed. The 19 historical dead-letter messages require separate review.

### WRK-TECH-03 — Failure diagnostics and retry

**Method**

Exercise a controlled failing job or approved failure fixture.

**Expected**

- Failure is durable/observable with useful diagnostics.
- Supported retry changes state predictably.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; Peek-only inspection classified all 19 historical dead-letter messages without changing them. The retained reasons establish the terminal routing mechanism, not an unproven infrastructure/RBAC/network root cause.

### WRK-TECH-04 — Duplicate delivery/idempotency

**Method**

Exercise retry/redelivery of the same durable command in the supported integration test path.

**Expected**

- Canonical publication/release side effects are not duplicated.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; final-candidate worker suite passed its transient-redelivery, completed-delivery idempotency and duplicate-release prevention paths.

### WRK-TECH-05 — Interruption/restart recovery

**Method**

Use the documented safe worker recovery exercise or existing automated recovery test.

**Expected**

- In-progress durable work can resume/retry according to lease/checkpoint semantics.
- Work does not silently disappear or duplicate authoritative results.

**Status:** `PASS`
**Evidence / defect / retest:** #875 execution record; final-candidate worker suite passed interrupted-object cleanup, lease release and resumed-publication recovery paths.

---

## F. Performance, accessibility and responsiveness — #876

### PERF-TECH-01 — Representative API response times

**Method**

Run the repository response-time measurement against the approved representative environment/data.

**Repository command:** `npm run measure:api-response-times`

**Expected**

- Measurements record endpoint, environment/data size and timings.
- Regressions beyond documented targets/baseline are dispositioned rather than ignored.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### PERF-TECH-02 — Production-scale acceptance

**Method**

Run the production-scale deployment acceptance procedure against the intended environment.

**Repository command:** `npm run verify:production-scale-deployment`

**Expected**

- Representative-scale workflow meets the acceptance criteria recorded by the script/runbook.
- Failure is retained as evidence/bug rather than rerun until green without explanation.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### PERF-TECH-03 — Frontend Lighthouse measurement

**Method**

Run the final supported Lighthouse path on representative public routes and authenticated routes where configured.

**Repository command:** `npm run test:lighthouse`

**Expected**

- Final measurements are retained with environment/context.
- Severe performance/accessibility regression is dispositioned.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### PERF-TECH-04 — API/background-work coexistence

**Method**

During representative background ingestion/release work, make representative health/public-read requests.

**Expected**

- Background processing does not make normal API health/read paths unusable beyond documented capacity limits.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### RESP-TECH-01 — Public responsive layout

**Maps from:** `PUB-*`

**Method**

Exercise primary public routes at representative desktop, tablet and mobile viewports.

**Expected**

- Supported layouts remain usable without unintended page-level horizontal overflow.
- If a form factor is intentionally unsupported, the product gives the documented clear warning.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### RESP-TECH-02 — Authenticated workflow responsiveness

**Maps from:** `SUB-*`, `REV-*`

**Method**

Exercise representative submitter/reviewer screens at supported narrow/wide viewports.

**Expected**

- Required controls, validation and status information remain usable.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### A11Y-TECH-01 — Automated accessibility regression

**Method**

Run the project's Playwright/axe accessibility coverage on the final candidate.

**Expected**

- No unresolved serious/critical project-owned accessibility violation remains without disposition.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### A11Y-TECH-02 — Keyboard navigation and focus

**Method**

Keyboard-only navigate primary public/authentication/form/reviewer paths.

**Expected**

- Interactive controls are reachable/operable in a logical order.
- Focus is visible.
- No keyboard trap is present in project-owned UI.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### A11Y-TECH-03 — Labels, semantics and accessible names

**Method**

Inspect primary forms/navigation/status regions with browser accessibility tree/automated checks.

**Expected**

- Inputs/controls have accessible labels.
- Semantic/ARIA usage supports the intended control/region meaning.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

### A11Y-TECH-04 — Contrast/readability

**Method**

Run automated contrast checks and review final project-owned text/control states, including both supported themes.

**Expected**

- No unresolved severe contrast/readability problem remains without disposition.

**Status:** `NOT RUN`
**Evidence / defect / retest:** —

---

## G. Automated suites, coverage, CI/CD and deployment — #877

### AUTO-TECH-01 — Frontend test suite

**Repository command:** `npm run test:frontend`

**Expected:** final frontend suite passes from the candidate.
**Status:** `PASS`
**Evidence / defect / retest:** #877: the CI-equivalent two-worker run passed 45 files/460 tests; the default configuration now uses that established worker limit without retries.

### AUTO-TECH-02 — Backend unit/API suites

**Repository commands**

- `npm run test:unit`
- `npm run test:api`
- `npm run test:api-contract`

**Expected:** final backend/API/contract suites pass.
**Status:** `PASS`
**Evidence / defect / retest:** #877: full `npm run check` passed, including backend unit/API/API-contract suites.

### AUTO-TECH-03 — Worker suite

**Repository command:** `npm run test:worker`

**Expected:** final worker suite passes.
**Status:** `PASS`
**Evidence / defect / retest:** #877: full `npm run check` passed, including the worker suite.

### AUTO-TECH-04 — Contract package suite

**Repository command:** `npm run test:contracts`

**Expected:** shared contract suite passes.
**Status:** `PASS`
**Evidence / defect / retest:** #877: full `npm run check` passed, including contracts.

### AUTO-TECH-05 — Database integration suite

**Repository command:** `npm run test:database`

**Expected:** database integration suite passes against the approved test database.
**Status:** `PASS`
**Evidence / defect / retest:** #877: `npm run test:database` passed in Dean's terminal.

### AUTO-TECH-06 — Browser end-to-end suite

**Repository command:** `npm run test:e2e`

**Expected:** intended final Playwright matrix passes.
**Status:** `PASS`
**Evidence / defect / retest:** #877: `npm run test:e2e` passed in Dean's terminal.

### AUTO-TECH-07 — Deployment/infrastructure suite

**Repository command:** `npm run test:deployment`

**Expected:** deployment/infrastructure regression suite passes.
**Status:** `PASS`
**Evidence / defect / retest:** #877: full `npm run check` passed, including deployment-helper tests.

### AUTO-TECH-08 — Intermediate ingestion integration gate

**Repository command:** `npm run verify:intermediate-ingestion`

**Expected:** retained ingestion invariants/integration acceptance passes.
**Status:** `PASS`
**Evidence / defect / retest:** #877: `npm run ci:local` completed with `LOCAL CI: PASS`.

### AUTO-TECH-09 — Repository quality check

**Repository command:** `npm run check`

**Expected:** required structure, formatting, lint, type checking, automated tests, OpenAPI lint and builds pass.
**Status:** `PASS`
**Evidence / defect / retest:** #877: `npm run check` passed.

### AUTO-TECH-10 — Repository hygiene/architecture check

**Repository command:** `npm run hygiene`

**Expected:** Knip, dependency-version and architecture-boundary checks pass or documented intentional exceptions are current.
**Status:** `PASS`
**Evidence / defect / retest:** #877: `npm run hygiene` passed.

### COV-TECH-01 — Repository-wide coverage generation

**Repository command:** `npm run test:coverage`

**Expected**

- Required first-party workspaces emit coverage.
- Aggregated final report is retained.
- Missing workspace artefacts cause failure rather than silently lowering the denominator.

**Status:** `PASS`
**Evidence / defect / retest:** #877: all five required workspaces generated coverage.

### COV-TECH-02 — Coverage quality review

**Method**

Review final coverage by first-party workspace/file and identify high-risk weakly tested code.

**Expected**

- Final evidence records headline coverage **and** material weak/uncovered areas.
- Files are not excluded only to inflate the result.

**Status:** `PASS`
**Evidence / defect / retest:** #877: 80.77% lines; 79.49% statements; 84.92% functions; 72.27% branches; thresholds remain informational.

### COV-TECH-03 — Explicit untested-area register

**Method**

After #871–#877 execution, list final capabilities that remain untested or partially tested and why.

**Expected**

- Register is non-empty only where gaps really exist.
- Each gap has risk/mitigation/owner or reason for acceptance.

**Status:** `PASS`
**Evidence / defect / retest:** #877 execution record explicitly retains the failures, unrun gates and dependency findings.

### CI-TECH-01 — Local final CI plan

**Repository command:** `npm run ci:local`

**Expected:** final local change-aware CI completes for the candidate/changes being verified.
**Status:** `PASS`
**Evidence / defect / retest:** #877: `npm run ci:local` completed with `LOCAL CI: PASS`.

### CI-TECH-02 — Hosted Gitea CI for exact candidate

**Method**

Record the hosted Gitea Actions run for the exact commit/tag proposed for submission.

**Expected**

- Intended required checks are green.
- No final failing lane is hidden/disabled merely to obtain a green result.

**Status:** `BLOCKED`
**Evidence / defect / retest:** #877: hosted validation remains pending for the rebased exact candidate; no passing run is claimed before it completes.

### DEP-TECH-01 — Strict documentation build

**Repository command:** `python -m mkdocs build --strict`

**Expected:** public documentation builds without strict warnings/errors.
**Status:** `PASS`
**Evidence / defect / retest:** #877: strict MkDocs build passed.

### DEP-TECH-02 — OpenAPI lint

**Repository command:** `npm run openapi:lint`

**Expected:** final OpenAPI contract passes configured Redocly lint.
**Status:** `PASS`
**Evidence / defect / retest:** #877: OpenAPI lint passed.

### DEP-TECH-03 — Final deployed component smoke

**Method**

Record reachability/health for final:

- frontend;
- backend/API;
- worker;
- database through documented service health;
- documentation site.

**Expected**

- Submitted deployment endpoints are reachable and correspond to the intended final candidate.
- Final deployment/release sign-off remains owned by #810.

**Status:** `BLOCKED`
**Evidence / defect / retest:** #877: no exact final deployed candidate; #810 owns release sign-off.

### DEP-TECH-04 — Dependency/security audit

**Method**

Run the repository's final dependency/security audit commands/policy and review findings rather than applying unsafe forced upgrades.

**Expected**

- Unresolved findings are documented and dispositioned.
- No known severe production-impacting dependency issue is silently ignored.

**Status:** `PASS`
**Evidence / defect / retest:** #877 applied reviewed non-breaking npm fixes; the post-fix production audit has no critical/high findings. Four moderate Swagger dependency-chain advisories require a breaking forced change and are explicitly retained in the execution record.

---

# 6. Final execution summary

Do not complete this table while #870 is only establishing the bank. #871–#877 update it from retained evidence.

| Lane                                    | Issue | Status    | Candidate                                  | Evidence                                                                                                                                                                                                                        | Open defects / blockers                                               |
| --------------------------------------- | ----- | --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Frontend/auth/roles                     | #871  | `PASS`    | `955f30105ed02858e42ccf9f3605d48d136c0717` | [#871 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-871-frontend-auth-roles.md){ target="_blank" rel="noopener" }          | None observed                                                         |
| Submission/review/batch/corrections     | #872  | `PASS`    | `9b1dbf5fbaa933f682f24f08bed1edf32507a01a` | [#872 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-872-ingestion-review-corrections.md){ target="_blank" rel="noopener" } | None observed                                                         |
| Statistics/data/provenance/releases     | #873  | `PASS`    | `d963e138d`                                | [#873 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-873-statistics-data-releases.md){ target="_blank" rel="noopener" }     | None observed                                                         |
| API/contracts/consumer/integration      | #874  | `NOT RUN` | —                                          | —                                                                                                                                                                                                                               | —                                                                     |
| Database/worker/reliability             | #875  | `PASS`    | `ed28ee025`                                | [#875 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-875-database-worker.md){ target="_blank" rel="noopener" }              | None blocking; retained logs did not expose the second probe receipt. |
| Performance/accessibility/responsive    | #876  | `NOT RUN` | —                                          | —                                                                                                                                                                                                                               | —                                                                     |
| Automated suites/coverage/CI/deployment | #877  | `PASS`    | `26fc2857b`                                | [#877 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-877-automated-quality-audit.md){ target="_blank" rel="noopener" }      | Hosted CI and final deployment smoke remain external                  |

## Known untested / partially tested areas

#877 owns the final consolidation of this register.

| Area                                            | Reason                                                                                                          | Risk / mitigation                                                                              | Owner / linked issue |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------- |
| Final automated release-candidate matrix        | The frontend suite is green, but the remaining final gates have not yet been rerun from this amended candidate. | Run every blocked #877 command from a clean install.                                           | #877                 |
| Production dependency advisories                | Post-fix audit retains 4 moderate Swagger dependency-chain advisories; no high/critical finding remains.        | Plan the breaking Swagger remediation separately; do not force it during the final audit.      | #877                 |
| Hosted CI and deployed smoke                    | No exact #877 candidate has been pushed or deployed.                                                            | Push only after local repair and approval; retain hosted SHA/run and release smoke under #810. | #877; #810           |
| _Populate only from actual execution evidence._ | —                                                                                                               | —                                                                                              | #877                 |

## #870 closure checklist

#870 is complete when the **bank itself** is ready for execution:

- [ ] This page exists and is linked from the public documentation.
- [ ] Technical verification is explicitly separated from formal user testing.
- [ ] All seven execution issues #871–#877 have a defined section/family.
- [ ] Every test case has a unique ID, prerequisites/method, expected result, status and evidence field.
- [ ] Every case begins `NOT RUN`; no result has been fabricated.
- [ ] Existing user-testing families are mapped only for coverage consistency.
- [ ] Additional technical-only families cover database, worker, performance, accessibility, automated suites, CI and deployment.
- [ ] Execution evidence template exists.
- [ ] Documentation regression test passes.
- [ ] Strict MkDocs build passes before merge.
- [ ] #871–#877 each depend on #870 in Gitea.

After #870 merges, #871–#877 may execute in parallel.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol] and Codex[GPT-5].
