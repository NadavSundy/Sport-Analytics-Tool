# Issue #364 - Intermediate ingestion integrated acceptance

**Issue:** #364 - Verify the complete Intermediate ingestion pipeline, recovery behavior and usability  
**Acceptance exercise dates:** 9-14 September 2026  
**Environment:** deployed development environment  
**Status:** OPEN - representative validation passed; representative publication failed the approved performance target

## Purpose

Issue #364 is the final integrated verification exercise for the Intermediate ingestion path.

It does not introduce a new ingestion format or workflow. It verifies that the already implemented API, database, worker, review, correction, provenance and frontend behaviours operate together at representative scale, and records narrowly scoped defects discovered during that exercise.

The acceptance criteria require evidence that:

- an authorised submitter can upload a representative whole season without application database IDs;
- back-catalogue/proposed-fixture data stages safely;
- invalid data produces a complete actionable report;
- ambiguous references require explicit resolution;
- equivalent uploads and publication replays are idempotent;
- changed content under a reused idempotency key is rejected;
- validation/publication can recover and resume;
- concurrent processing does not duplicate work;
- staged data remains private before approval;
- only intended accepted records are published;
- correction history and provenance are retained;
- representative season-scale throughput meets the approved target;
- logging, accessibility, responsive behaviour and documentation requirements are satisfied; and
- the wider Intermediate project brief remains mapped to verification evidence.

## Automated verification

Run:

```text
npm run verify:intermediate-ingestion
npm run ci:local
```

Observed 2026-09-09 local result for `npm run verify:intermediate-ingestion`: **PASS**.

The run verified all required retained evidence references and worker log-safety checks, then passed:

- 135 shared-contract tests;
- 181 backend unit tests;
- 153 backend API tests;
- 22 worker tests;
- 125 frontend unit tests;
- 145 PostgreSQL integration tests, with the two normal performance-query-plan tests skipped;
- 13 focused Playwright submission/review/correction tests; and
- OpenAPI linting.

`npm run ci:local` also passed for the first #364 verification PR, and its hosted Pull Request quality run passed all required validation and browser jobs.

One unrelated Three.js context-loss browser test needed the configured automatic retry and then passed; that flake was logged separately and did not affect ingestion acceptance.

A follow-up #364 CI-routing change integrates future Intermediate ingestion changes into the existing required validation/browser/quality gate instead of retaining a duplicate manual acceptance workflow.

## Acceptance evidence matrix

| Acceptance criterion                                                          | Evidence / observation                                                                                                                                                                                                   | Status                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Authorized submitter uploads representative whole season without database IDs | Guided season package used readable cricket context only; representative IPL 2013 package contained 70 fixtures / 16,713 events and zero application reference source IDs.                                               | **PASS**                                                   |
| Back catalogue with proposed fixtures can be staged                           | Resolver stages unknown fixture/reference context rather than silently creating canonical rows; automated coverage retained.                                                                                             | automated coverage present                                 |
| Invalid events produce a complete actionable report                           | Paginated report and full JSON download contain rule code, message, source context and rejected-item detail. Live representative run produced 781 retained rejected events.                                              | **PASS**                                                   |
| Ambiguous participants require explicit mapping                               | Ambiguous/unresolved references remain blocking until explicitly resolved. Live run exposed two unresolved substitute references and prevented approval.                                                                 | **PASS**                                                   |
| Equivalent re-upload does not duplicate batch/event/statistic                 | Same key/checksum and publication replay idempotency are covered by automated/database tests; #463 live acceptance confirmed duplicate-safe canonical publication.                                                       | automated + live evidence                                  |
| Reused key with changed content is rejected                                   | Same key/different checksum returns conflict in batch service tests.                                                                                                                                                     | automated coverage present                                 |
| Validation/publication resume after worker termination                        | Worker redelivery, durable validation checkpoints, publication lease reclaim and Azure worker recovery procedures are covered. #463 demonstrated recovery of stored/pending work after runtime repair.                   | automated + operational evidence                           |
| Concurrent workers do not duplicate work                                      | Live leases exclude competing worker ownership and completed publication replay is a deterministic no-op.                                                                                                                | automated coverage present                                 |
| Staged data is never public before approval                                   | Database tests observe zero canonical delivery rows while staged and reject premature publication.                                                                                                                       | automated coverage present                                 |
| Approval publishes intended accepted items; rejection publishes nothing       | Review/publication tests cover accepted-only writes. Live #364 UI correctly identified 15,932 publishable records while retaining 781 rejected records unpublished. Publication itself did not finish within the target. | **PARTIAL - selection PASS, publication performance FAIL** |
| Corrections retain history and update dependent statistics                    | Correction database/API/browser tests retained. Live season exercise also exercised return-for-correction and corrected resubmission, exposing separate linkage defect #539.                                             | automated + live workflow evidence                         |
| Statistic-to-submitter provenance demonstrated                                | Protected provenance API from #363 and `evidence/validation/issue-363-provenance.md`.                                                                                                                                    | automated coverage present                                 |
| Representative season-scale throughput meets approved target                  | Deployed IPL 2013 exercise: 70 fixtures / 16,713 events. Validation completed in 4m27s against <=15m target. Publication remained `publishing` beyond 15m.                                                               | **FAIL - validation PASS; publication FAIL**               |
| Payloads/credentials absent from logs                                         | Safe-scalar worker logger, structured-log audit and security documentation. No credentials were included in retained acceptance evidence.                                                                                | automated coverage present                                 |
| Accessibility/responsive checks pass                                          | Focused ingestion/review/correction Playwright plus normal CI accessibility coverage.                                                                                                                                    | local and hosted browser validation passed                 |
| #417/#418 representative-user evidence                                        | #418 reviewer/admin evidence: `evidence/user-testing/sprint-2/2026-09-10-P04-reviewer.md`. #417 submitter evidence remains to be consolidated unless completed separately.                                               | **#418 complete; #417 pending**                            |
| Architecture/API/database/deployment/testing/user docs current                | `docs/testing/intermediate-ingestion-acceptance.md` indexes current source documentation; strict MkDocs remains in change-aware CI.                                                                                      | verifier/local/hosted quality evidence present             |
| Every Intermediate brief requirement maps to evidence                         | Intermediate requirements remain mapped through the acceptance guide and evidence records.                                                                                                                               | mapped                                                     |

## Intermediate brief cross-check

The issue-specific acceptance exercise must retain evidence for:

- batch ingestion, review and corrections;
- participant aggregates;
- dependency-aware recomputation;
- reference figures;
- representative-scale performance;
- API versioning;
- consumer keys, rate limits and quotas;
- caching;
- reproducible dataset releases; and
- formal representative-user evidence.

The detailed source/test mapping is maintained in `docs/testing/intermediate-ingestion-acceptance.md` rather than duplicated here.

The representative-scale requirement is particularly important because the Intermediate project brief requires the platform to be exercised at the size it is intended to serve rather than relying only on parser/unit timings.

## Live development integration evidence - 11 September 2026

Issue #463 supplied a real deployed-development integration exercise for the batch path documented by this acceptance record.

A controlled season package progressed through:

```text
upload
-> stored batch
-> transactional outbox
-> Service Bus batch.validate
-> worker validation/reference resolution
-> awaiting_review
-> global reviewer queue
-> approved
-> published
```

Batch:

`f65118c3-3367-47d8-9d2d-5f29469225ff`

reached `awaiting_review` with one accepted and zero rejected items.

The reviewer opened the report, approved the batch, and the persisted batch state became `published`.

The staged event exactly matched published delivery `4157`.

Publication therefore marked the batch item:

`duplicate_skipped`

and linked it to delivery `4157`.

A live canonical query confirmed the natural delivery position still contained exactly one delivery.

This supplies deployed evidence for:

- review-before-publication;
- global reviewer visibility;
- durable review decision;
- successful small-batch publication; and
- duplicate-safe replay.

The same #463 exercise also demonstrated recovery of previously stored/pending outbox commands after the worker/Service Bus runtime path was repaired, without resubmitting those source batches.

See:

`evidence/validation/issue-463-dev-worker-deployment.md`

for the full operational record.

## Representative season-scale deployed acceptance - 14 September 2026

A deployed-development acceptance exercise was performed against a representative real T20 season workload to close the remaining Intermediate scale evidence gap.

### Workload selection

Indian Premier League 2013 was selected from the deployed catalogue.

The deployed season contained 76 fixtures.

Exactly 70 fixtures were selected for the representative acceptance workload.

Those fixtures contained:

```text
fixtures:             70
published deliveries: 16,713
average per fixture:  238.8
minimum per fixture:  100
maximum per fixture:  261
```

This gave a realistic season-sized workload of approximately 16.7k T20 delivery events.

### Synthetic benchmark cross-check

Before using deployed canonical data, the repository representative-corpus generator was also exercised with:

```text
fixtures:               70
deliveries per fixture: 240
deliveries:             16,800
```

The real IPL selection of 16,713 deliveries was therefore very close to the locked representative 16,800-delivery workload.

## Package construction

The season package was constructed from deployed fixture/event exports using readable cricket context rather than application database identifiers.

The package used:

- competition name;
- season label;
- fixture date;
- team names;
- innings ordinal;
- participant names;
- delivery sequence/context; and
- cricket event data.

No application reference source IDs were embedded.

### Initial package

```text
file:     issue-364-ipl2013-season-scale.json
size:     6.52 MB
fixtures: 70
innings:  144
events:   16,713
SHA-256:  16D21BC566D9F14CDBB3E65681DFA835424FA64A97E43FEDDBEF854FBA6AAA14
```

Contract validation before deployment:

```text
SCHEMA VALIDATION: PASS
CONTRACT VERSION:  1.0
FIXTURES:          70
INNINGS:           144
EVENTS:            16713
REFERENCE SOURCE IDS: 0
PACKAGE ID:        issue364:package:ipl2013-70-fixtures-16713-events-20260914
```

This confirmed the representative package was valid against the real `seasonUploadPackageSchema`.

## First deployed season-scale validation

Initial batch reference:

`802ab396-2064-4a94-b005-1d25abbe8460`

The package was uploaded through the deployed submitter web interface using:

- workflow: Season;
- competition: Indian Premier League;
- guided readable-name upload; and
- a submitter authorised for the competition.

Server receipt:

`2026-09-14 08:10:22 +02:00`

Validation completed:

`2026-09-14 08:13:00 +02:00`

Measured deployed validation duration:

**2 minutes 38 seconds**

Final validation state:

```text
total:      16,713
accepted:   15,929
rejected:   784
unresolved: 2
duplicates: 0
conflicts:  0
```

The validation path therefore processed the full representative workload comfortably inside the approved 15-minute target.

### Unresolved references

The two unresolved references were:

1. `DT Christian`
   - fixture 6693
   - Royal Challengers Bangalore vs Kolkata Knight Riders
   - event `issue364:delivery:ipl2013-f012-i0-s106`

2. `BB McCullum`
   - fixture 6714
   - Kolkata Knight Riders vs Mumbai Indians
   - event `issue364:delivery:ipl2013-f033-i1-s66`

Both were fielders represented in the source as:

```text
substitute: true
participant: named substitute
```

Neither participant could be resolved against the fixture squad.

Both had no safe automatic candidate.

The backend correctly prevented approval while these references remained unresolved.

## Defect #537 discovered during unresolved review

The admin batch summary correctly showed:

```text
Unresolved: 2
```

and correctly blocked approval.

However, the admin **References requiring attention** section said:

> All displayed references are resolved.

The unresolved records were located at ordinals 2739 and 7888, outside the initially loaded report result slice.

The admin would therefore have had to page through thousands of ordinary report items before reaching records that actively blocked approval.

This was logged as:

**#537 - Admin batch review hides approval-blocking items outside the initially loaded report slice**

The scope of #537 was later broadened when the same defect was reproduced for published-delivery conflicts.

## Correction workflow

The source package was normalised using the contract-supported unidentified-substitute representation for exactly those two substitute fielders:

```text
substitute=true
participant=false
```

Exactly two references changed.

### Corrected V2 package

```text
file:     issue-364-ipl2013-season-scale-v2.json
size:     6.52 MB
fixtures: 70
events:   16,713
SHA-256:  FBADF1C97E35C38EC986BFD2F7AC43B52CB12E9DEFC8DB181037E0CD082E2712
```

Contract validation:

```text
SCHEMA VALIDATION: PASS
TOTAL EVENTS: 16713

issue364:delivery:ipl2013-f012-i0-s106:
substitute=true, participant=false

issue364:delivery:ipl2013-f033-i1-s66:
substitute=true, participant=false
```

The original batch was returned for correction by an administrator.

Reviewer reason:

> Two named substitute fielders could not be resolved against the recorded fixture squads. Replace them with valid unidentified-substitute references and resubmit the corrected season package.

The original batch reached:

`Correction requested`

at approximately:

`08:35:43 +02:00`

## Defect #539 discovered during corrected resubmission

The submitter uploaded the corrected package using the normal replacement workflow.

New batch:

`486d496e-8abd-47d7-9988-cebd8fd01095`

The original batch remained:

`Correction requested`

and the replacement appeared as an independent submission.

No visible replacement/supersession relationship connected the new batch to the original batch.

This was logged as:

**#539 - Correction resubmission creates an unlinked batch instead of superseding the returned batch**

This is retained as a separate correction-lifecycle defect rather than expanding #364 scope.

## Corrected deployed validation run

Replacement batch:

`486d496e-8abd-47d7-9988-cebd8fd01095`

Server receipt:

`2026-09-14 08:41:39 +02:00`

Validation completed:

`2026-09-14 08:46:06 +02:00`

Measured deployed validation duration:

**4 minutes 27 seconds**

This remained comfortably inside the approved **<=15-minute** validation target.

Post-validation state:

```text
total:      16,713
accepted:   15,930
rejected:   783
unresolved: 0
duplicates: 0
conflicts:  2
```

The corrected package therefore removed both unresolved references.

## Published-delivery conflicts

The two corrected substitute-fielder deliveries now conflicted with their already-published canonical equivalents.

The published records retained richer substitute participant identities.

The report contained exactly two:

`PUBLISHED_DELIVERY_CONFLICT`

records.

The review summary correctly showed:

```text
Conflicts: 2
Unresolved references: 0
Approval blocked: true
Reason: Conflicting records remain.
```

## #537 reproduced for conflicts

The same admin-pagination defect was reproduced for published-delivery conflicts.

The admin summary correctly showed:

```text
Conflicts: 2
```

but the conflict section did not show either conflict-resolution card because both conflict records were outside the initially loaded `report.items` slice.

Instead, the UI only offered generic report pagination.

Repository inspection confirmed that the product already implements per-conflict controls:

- `Keep published delivery`
- `Approve submitted correction`

and uses the supported endpoint:

```text
/batches/{batchReference}/conflicts/resolve
```

The missing controls were therefore not an absent feature.

They were inaccessible because #537 restricted the conflict renderer to the currently loaded general report slice.

The #537 description was broadened to cover **all approval-blocking review items**, including unresolved references and published-delivery conflicts.

## Conflict resolution

Because #537 prevented access to the existing conflict controls in the web UI, the application's own authenticated conflict-resolution API was invoked using the same payload the hidden UI control would have sent.

No database manipulation or unsupported state change was performed.

### Conflict 1

```text
item ordinal:         2739
existing delivery ID: 1530377
decision:             use_existing
```

Reason:

> Keep canonical published delivery; it preserves the identified substitute fielder.

After resolution:

```text
conflicts:  2 -> 1
duplicates: 0 -> 1
accepted:   15,930 -> 15,931
rejected:   783 -> 782
```

### Conflict 2

```text
item ordinal:         7888
existing delivery ID: 1535544
decision:             use_existing
```

Reason:

> Keep canonical published delivery; it preserves the identified substitute fielder.

After resolution:

```text
accepted:        15,932
rejected:        781
duplicates:      2
conflicts:       0
unresolved:      0
blocking errors: 0
```

The batch was now eligible for review approval.

## Accepted-subset publication decision

The admin UI correctly stated:

> Only the accepted subset will publish.

Immediately before approval:

```text
total:           16,713
accepted:        15,932
rejected:        781
duplicates:      2
conflicts:       0
unresolved:      0
blocking errors: 0
```

The UI also explicitly stated that the 781 rejected records would remain unpublished and retained in the report.

This is useful evidence that the review workflow correctly distinguishes publishable and rejected records before canonical publication.

## Publication acceptance run

Reviewer reason:

> Issue #364 season-scale acceptance: publish accepted subset after resolving all blocking conflicts.

Local publication timing start:

`2026-09-14T09:07:55.5952559+02:00`

Backend persisted the approval decision at:

`2026-09-14T07:07:59.830Z`

Equivalent local time:

`2026-09-14T09:07:59.830+02:00`

Direct authenticated API verification later confirmed:

```text
HTTP:           200
BACKEND STATUS: publishing
REVIEW DECISION: approved
```

The persisted review object contained:

- decision: `approved`;
- the correct reviewer;
- the correct reason; and
- the approval timestamp.

The global admin batch history independently showed:

```text
issue-364-ipl2013-season-scale-v2.json
Publishing · 15932 accepted · 781 rejected
```

The approval therefore definitely succeeded server-side.

## False admin failure state

Although approval was durably recorded and the batch transitioned to `publishing`, the admin review page remained in a long-running saving state.

It later displayed:

> The review decision could not be saved. Try again.

This message was false.

At the same time:

- the backend reported `publishing`;
- the review decision was `approved`;
- the reviewer reason was persisted; and
- the admin queue showed the batch as `Publishing`.

The browser console also showed the review request failing from the frontend/network perspective with `net::ERR_FAILED` and a CORS-style error response.

The reviewer controls remained visible even though the batch had already left `awaiting_review`.

This created a dangerous UI state because the reviewer could reasonably have attempted to approve, return or reject the batch again.

## Review/publication execution finding

Repository inspection identified the execution boundary behind the long-running review request.

`apps/backend/src/modules/batches/batch.service.ts` performs:

```ts
const decision = await repository.applyReviewDecision({
  batchId: batch.batchId,
  actorId: account.accountId,
  decision: request.decision,
  reason: request.reason,
});

if (decision.resumePublication) {
  await repository.publishAcceptedItems(batch.batchId, `reviewer:${account.accountId}`);
}
```

The review HTTP request therefore synchronously waits for:

`repository.publishAcceptedItems(...)`

after the approval decision has already been persisted and the batch has transitioned to `publishing`.

For this representative run, that publication subset contained approximately 15,932 accepted records.

This explains why:

- approval was durable;
- the backend state became `publishing`;
- the browser remained blocked;
- the request eventually appeared to fail to the frontend; and
- the UI falsely told the reviewer that the decision had not been saved.

The review-decision request and the long-running publication execution should be decoupled.

The review endpoint should return once the approval and durable `publishing` transition are committed, while publication continues through a durable asynchronous/resumable mechanism.

However, asynchronous dispatch alone is not sufficient to close #364: the actual publication operation must also satisfy the representative performance target.

## Representative publication throughput result

Approved publication start:

`2026-09-14T09:07:55.5952559+02:00`

Approved 15-minute cutoff:

`2026-09-14T09:22:55.5952559+02:00`

Check immediately before cutoff:

`2026-09-14T09:22:36.6615151+02:00`

The batch was still:

`publishing`

after the cutoff.

Failure observation:

`2026-09-14T09:24:49.9540160+02:00`

The representative publication criterion therefore failed.

Result:

```text
representative validation target:
PASS - 4m27s <= 15m

representative publication target:
FAIL - still publishing after 15m
```

The batch remained in `publishing` during subsequent investigation.

No duplicate approval was attempted.

No restart or destructive recovery action was performed during the acceptance measurement.

## Azure investigation

Historical App Service application-console logs were not available in Log Analytics for the publication window.

Queries against `AppServiceConsoleLogs` returned no records.

Azure platform metrics remained available.

Around the publication window, the backend showed elevated response time/resource activity but no sustained HTTP 5xx storm.

This is consistent with a long-running or resource-intensive publication path, but it does not by itself establish the deeper performance bottleneck inside `publishAcceptedItems()`.

The precise reason publication remained beyond the <=15-minute target requires follow-up implementation investigation.

Possible causes must be investigated from evidence rather than assumed, including database round trips, transaction behaviour, checkpoint/lease behaviour or other publication-path scaling costs.

## Defects discovered during the representative run

### #537 - Admin batch review hides approval-blocking items outside the initially loaded report slice

Reproduced for:

- unresolved references; and
- published-delivery conflicts.

The batch-level summary correctly detects blockers, but blocking controls are rendered only for items currently present in the paginated general result slice.

Impact:

- reviewer cannot immediately locate the records blocking approval;
- existing resolution controls become inaccessible at season scale;
- repeated generic pagination or manual API use becomes necessary.

### #539 - Correction resubmission creates an unlinked batch instead of superseding the returned batch

Observed sequence:

```text
original batch
-> correction requested
-> corrected V2 uploaded
-> new independent batch created
```

The original remained `Correction requested`.

No visible correction/replacement relationship linked the two batches.

Impact:

- correction provenance is unclear;
- reviewers cannot easily identify the replacement;
- submitters retain a stale-looking correction request;
- multiple correction attempts could become ambiguous.

### Season-scale review/publication defect

A separate publication defect was logged from this acceptance run.

Confirmed root-cause finding:

```text
review approval
-> applyReviewDecision()
-> await publishAcceptedItems()
-> HTTP request remains open for season-scale publication
```

Observed consequences:

- approval succeeds;
- backend enters `publishing`;
- browser remains blocked;
- frontend eventually reports a false review-save failure;
- review controls remain visible;
- representative publication remains active beyond the <=15-minute target.

The exact internal performance cause inside `publishAcceptedItems()` remains to be remediated and retested.

## Live acceptance summary

| Stage                                      | Result                                    | Evidence                                       |
| ------------------------------------------ | ----------------------------------------- | ---------------------------------------------- |
| Representative package construction        | PASS                                      | 70 fixtures / 16,713 events / 6.52 MB          |
| No application DB reference IDs in package | PASS                                      | contract inspection: 0 reference source IDs    |
| Contract validation                        | PASS                                      | `seasonUploadPackageSchema`                    |
| Deployed upload through submitter UI       | PASS                                      | durable batch receipt                          |
| V1 deployed validation                     | PASS                                      | 2m38s                                          |
| Unresolved-reference blocking              | PASS                                      | 2 unresolved prevented approval                |
| Admin unresolved-item usability            | FAIL                                      | defect #537                                    |
| Return for correction                      | PASS                                      | reviewer reason persisted                      |
| Corrected package contract validation      | PASS                                      | exactly 2 substitute references changed        |
| Correction linkage                         | FAIL                                      | defect #539                                    |
| V2 deployed validation                     | PASS                                      | 4m27s                                          |
| Unresolved references after correction     | PASS                                      | 0                                              |
| Published-data conflict detection          | PASS                                      | 2 conflicts                                    |
| Admin conflict usability                   | FAIL                                      | defect #537                                    |
| Explicit conflict resolution               | PASS via supported authenticated endpoint | both `use_existing`                            |
| Final review blockers                      | PASS                                      | 0 conflicts / 0 unresolved / 0 blocking errors |
| Accepted/rejected subset separation        | PASS                                      | 15,932 accepted / 781 rejected                 |
| Reviewer approval persistence              | PASS                                      | backend decision `approved`                    |
| Admin approval-response UX                 | FAIL                                      | false "decision could not be saved" state      |
| Representative validation <=15m            | **PASS**                                  | 4m27s                                          |
| Representative publication <=15m           | **FAIL**                                  | still `publishing` after cutoff                |

## Relationship to #463

The #463 live deployment exercise remains valid evidence that the deployed pipeline can:

- recover stored work;
- process queue commands;
- validate a batch;
- expose it to reviewers;
- publish a small approved batch; and
- safely skip an already-published equivalent delivery.

The #364 season-scale run extends that evidence to a realistic workload.

The two results are not contradictory:

- #463 proved functional deployed publication on a small controlled batch;
- #364 exposed a scale problem in the review/publication path when publishing approximately 15.9k accepted records.

## Remaining close-out gates

Issue #364 is **not ready to close**.

The representative season-scale throughput exercise has now been performed and documented.

Validation throughput passed.

Publication throughput failed.

Before #364 can close:

1. the season-scale review/publication defect must be remediated;
2. the representative publication run must be repeated successfully against the approved <=15-minute target;
3. any required #417 submitter formal-user evidence must be consolidated if it remains outstanding;
4. the acceptance record must be updated with the successful publication retest; and
5. normal verification/CI must pass for the remediation.

## Final decision

**FAIL / OPEN - Issue #364 is not ready to close.**

The representative season-scale validation requirement is now proven in the deployed environment:

```text
70 fixtures
16,713 events
4m27s validation
target <=15m
PASS
```

The representative publication requirement is not yet satisfied:

```text
15,932 accepted records selected for publication
publication still active beyond 15 minutes
FAIL
```

This run nevertheless provides substantial live Intermediate acceptance evidence for:

- guided whole-season upload without application database IDs;
- durable batch receipt;
- season-scale asynchronous validation;
- complete rejected-item reporting;
- blocking unresolved references;
- return-for-correction workflow;
- corrected season resubmission;
- conflict detection;
- explicit conflict resolution;
- duplicate-safe use of richer canonical deliveries;
- reviewer approval of only the accepted subset;
- retained rejected records;
- durable reviewer provenance; and
- direct representative-scale validation/publication measurement.

The defects discovered during the exercise are intentionally tracked separately rather than hidden inside #364.

Issue #364 should remain open until publication remediation and the successful representative retest are complete.

AI Declaration: The preceding validation plan, live acceptance investigation and evidence record were generated and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol]. All browser, PowerShell, Azure and deployed-system observations recorded as live evidence were executed and reviewed by the student.
