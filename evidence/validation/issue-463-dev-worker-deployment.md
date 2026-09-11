# Issue #463 - Dev batch worker deployment and live acceptance

**Dates:** 10-11 September 2026
**Issue:** #463 - Provision dev batch worker and Service Bus pipeline
**Merged via:** PR #464

## Problem observed

Deployed season/back-catalogue batch submissions remained in `stored` state with zero accepted and rejected items because the development Azure environment did not contain the asynchronous worker and Service Bus resources required to process queued `batch.validate` jobs.

The repository already contained the batch worker, outbox/queue architecture and infrastructure definitions, but the development environment had not been provisioned and the deployment path had not yet been exercised end to end.

## Root causes and fixes

### Development worker infrastructure had not been provisioned

The initial #463 work provisioned and verified the development worker path:

- Azure Container App worker;
- Service Bus namespace and `batch-ingestion` queue;
- staged-ingestion Blob access;
- managed identities and RBAC;
- Key Vault database reference;
- Azure Container Registry image deployment; and
- hosted/manual worker deployment workflow.

### Deployment-path defects

The first live deployment exposed several deployment defects, all corrected under #463:

- Gitea runner did not provide Azure CLI;
- Bicep cross-scope references prevented role-assignment deployment;
- generated Service Bus namespace used a reserved suffix;
- ACR Tasks were unavailable on the student subscription, so the worker image is built on the Gitea runner and pushed to ACR;
- the active-revision health query selected the wrong projection;
- deployment health checks now wait for the active revision to become healthy; and
- Docker layer caching was introduced to make repeated hosted worker builds practical.

### Runtime defect: Service Bus publication

The worker initially logged repeated publish failures while the queue remained empty.

Manual checks proved:

- the runtime managed identity had sender/receiver roles;
- Service Bus connectivity from the worker succeeded;
- the queued outbox commands were structurally valid; and
- the queue had partitioning and duplicate detection enabled.

The worker was publishing multiple distinct messages in one broker batch. With the deployed queue configuration, this failed.

The runtime dependency was changed to publish each outbox command individually.

After deployment, logs showed successful command publication and delivery receipt. Previously stored commands were recovered and processed **without resubmitting their source batches**.

### Runtime defect: batch finalisation enum cast

Once messages were delivered, batch validation reached finalisation but failed repeatedly.

A rollback-only SQL reproduction isolated PostgreSQL error `42804`: the mapping-decision `CASE` expression returned text while the destination column uses the `batch_reference_mapping_state` enum.

The finalisation query was corrected with explicit enum casts:

```sql
THEN 'applied'::batch_reference_mapping_state
ELSE 'failed'::batch_reference_mapping_state
```

After deployment, fresh invalid batches ended deterministically as `rejected` rather than exhausting retries and becoming `failed`.

## Azure dependency verification

Live checks from the worker proved:

- PostgreSQL connectivity succeeded repeatedly;
- staged Blob access succeeded;
- Service Bus send succeeded;
- outbox commands were published;
- queue deliveries were received; and
- the worker could finalise jobs successfully.

The active feature-branch worker image used for live functional acceptance was:

```text
Revision: statsthegame-dev-batch-worker--0000004
Health: Healthy
Provisioning: Provisioned
Image SHA: 17b8244c7f4a07d6a30dc5646c71d1ab4483a4aa
```

That commit contains the accepted #463 runtime fixes and is part of the merged history.

### Post-merge deployment from `main`

**Status:** PASS

After #463 was merged, the worker deployment workflow was rerun from `main`.

Observed active revision:

```text
Revision: statsthegame-dev-batch-worker--0000005
Health: Healthy
Provisioning: Provisioned
Image: .../sport-analytics-worker:06815e9f725056db14c090139b5785a08b09723c
```

Azure Container Apps reported `activeRevisionsMode = Single`. The new `main` revision was healthy and active.

This closes the final deployment gate: the live worker is healthy and is running an immutable image built from `main`.

## Live functional acceptance

### 1. Reference-resolution/conflict validation

Batch:

```text
3b072768-b7bf-4308-b2b3-ac8ad22b0794
```

resolved the fixture, competition, innings and all participant references successfully.

The item was then correctly rejected as:

```text
PUBLISHED_DELIVERY_CONFLICT
```

because the staged event occupied the same canonical delivery position as published delivery `4157` but had different run/extras content.

This proved the worker was no longer failing at infrastructure/finalisation and was enforcing cricket-content conflict validation.

### 2. Positive staged-batch acceptance

A corrected package was generated from the known published delivery at innings `41`, over `0`, position `0`.

Batch:

```text
f65118c3-3367-47d8-9d2d-5f29469225ff
```

Live UI result:

```text
Awaiting review
1 accepted
0 rejected
```

The batch appeared in the global reviewer queue.

This satisfies the original #463 acceptance requirement that a valid stored batch can progress through the asynchronous worker and become reviewable.

### 3. Reviewer report regression found and corrected

Opening the newly accepted review initially failed with:

```text
This review could not be loaded.
```

Azure API logs proved the report endpoint itself returned HTTP `200`.

The frontend shared report contract incorrectly required:

```ts
positionInOver: z.number().int().positive().nullable()
```

while cricket delivery positions are zero-based and the accepted event used `positionInOver: 0`.

The report contract was corrected to `nonnegative()` with regression coverage. After deployment, the existing awaiting-review batch loaded successfully without resubmission.

This defect was tracked/fixed separately and did not require changes to the worker pipeline.

### 4. Review and publication

The accepted batch was approved through the reviewer workspace.

Database evidence:

```text
batch.state = published
review.decision = approved
batch_item.state = duplicate_skipped
batch_item.published_event_id = 4157
```

Approval note:

```text
#463 acceptance test - valid staged batch using an existing published delivery.
```

The validation result recorded:

```text
EXACT_PUBLISHED_DUPLICATE
severity = warning
```

### 5. Duplicate-safe publication

The live canonical query for innings `41`, over `0`, position `0` returned exactly one delivery:

```text
deliveryId = 4157
ballNumber = 0.1
offBat = 0
extras = 1
total = 1
wides = 1
```

Live delivery count:

```text
1
```

Therefore approval of the exact published duplicate did **not** create a second canonical delivery or double-count the event.

## Acceptance matrix

| Criterion | Result | Evidence |
| --- | --- | --- |
| Worker exists and runs in dev | PASS | Healthy Container App revision |
| Service Bus queue exists | PASS | `batch-ingestion` queue provisioned and used |
| PostgreSQL reachable from worker | PASS | repeated live DB connectivity checks |
| Staged Blob reachable from worker | PASS | live Blob access check |
| Outbox commands publish | PASS | worker logs showed successful command publication |
| Worker receives validation jobs | PASS | live delivery receipt logs |
| Existing stored work recovers without resubmission | PASS | pending outbox commands processed after runtime fix |
| Validation executes and finalises | PASS | conflict batch ended `rejected`, job `succeeded`, one attempt |
| Valid batch reaches review | PASS | batch `f65118c3-...` reached `awaiting_review`, 1 accepted / 0 rejected |
| Global reviewer queue contains batch | PASS | deployed reviewer queue displayed the batch |
| Reviewer report loads | PASS after separate regression fix | zero-based report contract corrected |
| Approval is recorded | PASS | `batch_review_decision = approved` |
| Publication completes | PASS | batch state `published` |
| Equivalent published delivery is not duplicated | PASS | item `duplicate_skipped`, `published_event_id = 4157`, live count = 1 |
| Post-merge worker deployment from `main` | PASS | `statsthegame-dev-batch-worker--0000005` / `06815e9f725056db14c090139b5785a08b09723c` |

## Follow-up observations

The live database contained two active `EXACT_PUBLISHED_DUPLICATE` warning rows for the same source ordinal after the acceptance run. This did not affect state or publication safety, but should be logged separately as a validation-result persistence/idempotency defect.

Additional submission/review workflow issues identified during the broader post-#463 audit are intentionally tracked as separate issues rather than expanding #463 scope.

## Acceptance decision

**PASS - Issue #463 acceptance complete.**

The development environment now has a healthy asynchronous worker and Service Bus pipeline. Live acceptance demonstrated stored-batch recovery, queue processing, reference resolution, validation, administrator review visibility, approval, publication and duplicate-safe canonical persistence. The worker was then redeployed from `main` and verified healthy.

## AI Declaration

The preceding validation record was prepared and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol]. Live Azure, browser and PostgreSQL observations were executed and reviewed by the student before being recorded.
