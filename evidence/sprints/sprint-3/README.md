# Sprint 3 evidence

Index of the evidence held in this directory. Sprint 3 requirements traceability is
issue #613's close-out deliverable and is not duplicated here.

| Record                                                                                                       | Issue | Status                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`2026-09-15-planning.md`](2026-09-15-planning.md)                                                           | #577  | Complete                                                                                                                                                                                                                                                                          |
| [`2026-09-17-standup.md`](2026-09-17-standup.md)                                                             | #577  | Complete                                                                                                                                                                                                                                                                          |
| [`issue-565-production-scale-deployment-acceptance.md`](issue-565-production-scale-deployment-acceptance.md) | #565  | **Partially complete.** The deployed asynchronous lifecycle completed on 2026-09-24 for `2026.09.24-issue-565-live` with 3,207,110 events. Automated-run output, artifact checksum, browser/authenticated journey, controlled restart and Azure capacity evidence remain pending. |
| [`issue-599-performance-revalidation.md`](issue-599-performance-revalidation.md)                             | #599  | Complete for local measurement. Does **not** include a deployed re-run.                                                                                                                                                                                                           |

## Performance re-validation, issue #599

The full record is
[`issue-599-performance-revalidation.md`](issue-599-performance-revalidation.md), and
the raw measurement output is in
[`../../validation/issue-599/`](../../validation/issue-599/).

Every stated target was met and nothing regressed against the prior local evidence
for issues #290, #410 and #592. Nine workloads were measured, five of them for the
first time: filtered and deeply paginated reads, API consumer enforcement overhead,
batch report reads, dataset release generation, and the documented cold-run
observation.

**These are local measurements** taken against a disposable embedded PostgreSQL
server over loopback. They are comparable to the earlier local runs, and they do
**not** measure the Azure Container Apps and Cloudflare Pages topology introduced in
Sprint 3 by issues #563 and #564. The recorded gap between the two is roughly 5 ms
against 183 ms on the warm path. Read section 1 of the report before quoting any
figure from it.

Three results are not simple passes and are the ones worth carrying into the #613
close-out:

1. **Deployed production-scale acceptance is still outstanding under #565.** Issue
   #599 could not discharge it: the runner needs a deployed API and worker, a
   deployed frontend origin and an administrator token. Report section 1.1.
2. **Dataset release generation is not yet repeatable.** Three runs produced
   byte-identical artefacts between 4.3 and 16.2 seconds, a 3.8x spread that was not
   explained. No target can be set for that workload until it is. Report section 8.6.
3. **The documented query-plan command does not run cleanly.** The opt-in check
   shares a database with the rest of the suite, so its 300-fixture ingest reaches
   unrelated tests. It was run in isolation and the procedure now says to do that.
   Report section 8.10.

Two findings were recorded for separate issues and deliberately not acted on: the API
is capped at one replica for a reason that #595 appears to have made obsolete (report
section 4.2), and the embedded-PostgreSQL setup block is now duplicated across five
measurement scripts (report section 9.4).
