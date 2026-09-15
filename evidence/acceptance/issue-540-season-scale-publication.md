# Issue #540 — Season-scale asynchronous publication acceptance

## Purpose

This evidence records the deployed acceptance and recovery testing for Issue #540, which addressed synchronous season-scale publication inside the reviewer request, stranded `publishing` batches, misleading review failures, and publication throughput above the required acceptance target.

## Original failure

The original representative season-scale batch was:

`486d496e-8abd-47d7-9988-cebd8fd01095`

The batch had already received an `approved` review decision but remained in `publishing` after the original synchronous publication attempt.

Before recovery:

- batch state: `publishing`
- no durable `batch.publish` background job existed
- 15,530 accepted items remained
- 402 items had already reached `duplicate_skipped`
- 781 items were rejected

This demonstrated that publication had partially executed before the request/process failed and that the remaining work had been stranded.

## Durable recovery acceptance

After the asynchronous publication fix was deployed, the existing approved decision was replayed idempotently.

A single durable publication job was created:

`d6ca321c-d52d-48a4-8261-eaa5bfb56018`

Observed final job state:

- job state: `succeeded`
- attempt count: `4`
- progress: `15,530 / 15,530`
- publication jobs created for the batch: `1`

The duplicate approval replay did not create a second publication job.

Final batch state:

`published`

Final item states:

- `duplicate_skipped`: 15,932
- `rejected`: 781
- `accepted`: 0

This demonstrates that the stranded batch resumed through the durable worker path and ultimately completed rather than restarting or remaining indefinitely in `publishing`.

## Publication throughput investigation

The recovered batch demonstrated that durability and retry/resume behaviour worked, but publication still exceeded the season-scale performance target.

Runtime investigation showed that duplicate and published-conflict outcomes were being persisted using sequential per-item database operations inside each publication chunk.

For an exact duplicate, the publication path performed:

1. an individual `batch_item` update; and
2. an individual `batch_validation_result` insert.

With hundreds of duplicate items per chunk, this produced an N+1 database round-trip pattern.

A regression test was added before the optimisation.

Before the fix:

- 3 exact duplicates produced 3 duplicate persistence statements;
- 3 published conflicts produced 3 conflict persistence statements.

The publication engine was then changed to accumulate duplicate and conflict classifications for the chunk and persist each outcome class using a set-based PostgreSQL statement with `jsonb_to_recordset`.

After the fix:

- exact duplicate outcome persistence is set-based per chunk;
- published-conflict outcome persistence is set-based per chunk;
- existing new-delivery bulk publication remains unchanged;
- checkpoint, lease, retry and resume semantics remain unchanged.

Focused throughput regression tests passed after the change.

The full worker suite passed with:

`63 / 63 tests`

The shared `@sport-analytics/batch-processing` package built successfully and full local CI passed.

## Final deployed season-scale acceptance

The final acceptance batch was:

`a8718ca6-848e-4e06-b07b-fc7a67ee670c`

Source package:

`issue-540-throughput-replay.json`

The package was a byte-different replay of the previously validated IPL 2013 season-scale package so that the same representative workload could be exercised without reusing the previous upload receipt.

Validation/review state before approval:

- total events: 16,713
- accepted: 15,932
- rejected: 781
- blocking errors: 0
- unresolved references: 0
- published conflicts after resolution: 0
- duplicate resolutions before publication: 2
- state: `awaiting_review`

The two published-delivery conflicts were reviewed using the existing canonical published deliveries. No submitted correction was applied.

## Final publication result

The durable publication job was:

`49144373-b401-467d-9bcc-c97c65216f3f`

Observed final job state:

- job state: `succeeded`
- attempt count: `1`
- worker progress: `15,930 / 15,930`

The worker progress total was 15,930 because two items had already been resolved as duplicate outcomes before publication began.

Final batch state:

`published`

Final item states:

- `duplicate_skipped`: 15,932
- `rejected`: 781
- `accepted`: 0

No accepted records remained stranded after publication.

## Performance result

Acceptance timer start:

`2026-09-15T09:40:16.9410651+02:00`

Completion observed:

`2026-09-15T09:43:54.1767767+02:00`

Elapsed:

`3 minutes 37.235 seconds`

`3.620595 minutes`

Required season-scale target:

`<= 15 minutes`

Result:

**PASS**

The deployed season-scale publication completed in approximately 24% of the maximum permitted acceptance time.

## Acceptance conclusion

Issue #540's primary deployed failure modes have been resolved:

- approved publication is handed to a durable asynchronous worker;
- publication work is represented by a durable background job;
- duplicate approval replay is idempotent;
- stranded publication can resume through the durable worker path;
- worker progress is checkpointed and retryable;
- no accepted records remain stranded after successful completion;
- duplicate/conflict outcome persistence is set-based rather than N+1;
- the representative season-scale workload completes within the required 15-minute target;
- the final representative batch reached `published`.

The original stranded workload also completed successfully through the recovery path, providing additional evidence that publication can resume rather than requiring the entire batch to restart.

## Related work

- Issue #540
- Issue #364
- PR #549 — durable asynchronous batch publication
- Throughput optimisation PR: #556

## AI Declaration

The preceding document was generated and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
