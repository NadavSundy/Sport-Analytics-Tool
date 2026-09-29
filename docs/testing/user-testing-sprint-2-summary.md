# Sprint 2 User Feedback Summary

This page provides a public summary of the formal user testing completed during Sprint 2.

The detailed session records and consolidated evidence remain the authoritative source. This page
publishes the main outcomes, decisions, improvements and remaining risks without reproducing
unnecessary participant information.

[View the canonical Sprint 2 user-testing evidence](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md).

## Coverage

| Workstream              | Participants                         | Main tasks covered                     | Result                                                                                                                                        |
| ----------------------- | ------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Public / analyst        | P01, P02; P03 supplementary evidence | `PUB-01` to `PUB-05`                   | Formal testing completed. Users could find published cricket data, but several interpretation, filtering and export problems were identified. |
| Submission / batch      | P05, P06                             | `AUTH-01`, `AUTH-02`, `SUB-*`, `BAT-*` | Formal testing completed. Changes made after P05 were exercised again by P06 and several improvements were confirmed.                         |
| Review / administration | P04                                  | `REV-01`, `REV-02`, `REV-05`, `ADM-02` | Completed after an initial deployed ingestion blocker was fixed and retested.                                                                 |

P03 is retained as supplementary public/analyst evidence. It contributes findings but is not counted
as an additional formal task attempt because the standard task script, facilitator metadata and formal
Success / Partial / Failure outcomes were not retained.

## Main outcomes

Public users were able to find a fixture and understand its result. Both formal `PUB-01` attempts
succeeded, including a participant without cricket knowledge.

The more detailed analysis journeys exposed usability gaps. Neither formal `PUB-03` attempt resulted
in the participant being able to narrow the information to the exact subset they wanted.

The underlying derived cricket figures were found to reconcile correctly during the domain-competent
participant's checks. The major problems were instead around presentation, discoverability and taking
the data out of the application in a reliable form.

The submission workflow improved between the P05 and P06 sessions. Terminology, access-scope
discovery, success messaging and tested rejection feedback were clearer after the accepted P05
findings were implemented.

The reviewer workflow initially failed because prepared batches remained in `Stored` state and never
appeared in the review queue. That deployment problem was fixed under #463, after which P04 repeated
`REV-01` successfully and completed the remaining selected reviewer tasks.

## Key findings and actions

| Finding                                                                                            | Decision / action            | Evidence state                                            |
| -------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| Exported event data omitted the names and context needed to interpret it away from the application | Accepted under #468          | Implemented in PR #474 and retested                       |
| Large innings exports silently omitted data beyond the export limit                                | Accepted under #467          | Outstanding at Sprint 2 close-out; retest required        |
| Competition search did not find competitions beyond the first paginated result set                 | Accepted under #469          | Outstanding at Sprint 2 close-out                         |
| Player presentation did not expose already-available career aggregates                             | Accepted under #476          | Outstanding at Sprint 2 close-out                         |
| Reviewer batches remained `Stored` and did not reach the review queue                              | Accepted under #463          | Fixed and successfully retested                           |
| Submission terminology and next-step messaging were unclear                                        | Accepted under #498 and #520 | Improved and externally retested by P06                   |
| Validation feedback was too technical                                                              | Accepted under #499          | Improved; the tested rejection path was understood by P06 |
| Additional competition scope was difficult to request                                              | Accepted under #501 and #519 | Implemented and successfully rediscovered by P06          |
| A guided submitter could not clearly create a genuinely new fixture                                | Recorded from P06            | Remained a blocking workflow gap at Sprint 2 close-out    |

## Finding severity

The public/analyst evidence recorded:

| Severity | Count | Accepted | Deferred | Pending | Resolved after retest |
| -------- | ----: | -------: | -------: | ------: | --------------------: |
| S1       |     1 |        1 |        0 |       0 |                     0 |
| S2       |    12 |        4 |        7 |       1 |                     2 |
| S3       |    37 |       12 |       25 |       0 |                     1 |
| S4       |     9 |        2 |        7 |       0 |                     2 |

The submission/batch workstream separately recorded:

| Severity | Count | Accepted | Deferred | Pending | Resolved after retest |
| -------- | ----: | -------: | -------: | ------: | --------------------: |
| S1       |     0 |        0 |        0 |       0 |                     0 |
| S2       |     4 |        3 |        0 |       1 |                     1 |
| S3       |     5 |        2 |        0 |       3 |                     2 |
| S4       |     0 |        0 |        0 |       0 |                     0 |

Across the reviewed Sprint 2 public, submission and reviewer evidence, the consolidated evidence
records twenty-five accepted findings, thirty-nine deferred findings, no rejected findings and five
findings still pending a final decision at Sprint close-out.

## Repeated themes

Several themes appeared across otherwise independent sessions:

- exported data needed to be complete and understandable outside the web application;
- frontend pagination needed to be handled consistently rather than treating the first page as the
  complete result set;
- cricket statistics were generally calculated correctly but required clearer domain presentation;
- users needed better ways to narrow large fixture and participant views;
- player and team pages needed more useful aggregate summaries;
- submitter terminology, access requests and next-step guidance materially affected whether users
  understood the ingestion workflow; and
- deployed asynchronous processing was a critical dependency of the reviewer experience.

## Improvements verified by users

Sprint 2 did not only collect feedback. Several accepted findings were changed and then exercised
again.

P06 confirmed improvements to upload-mode terminology, additional-scope discovery, season-upload
success messaging and the tested rejection-feedback experience after the P05 findings were acted on.

P04 successfully repeated the previously blocked reviewer task after the worker and Service Bus
processing path was restored.

The export context changes under #468 were also retested after implementation.

## Remaining risks at Sprint 2 close-out

The most serious remaining public-data concern was #467: a large innings export could silently return
an incomplete dataset while appearing successful.

The submission workflow still lacked a clear guided path for creating and submitting a completely new
fixture, preventing the intended follow-on submission tasks from being exercised during P06's session.

Several public presentation and discoverability findings were also intentionally deferred or remained
outstanding for later work.

## Evidence

The complete evidence, including task-level outcomes, finding IDs, decisions, issue links and retest
records, is retained under
[`evidence/user-testing/sprint-2/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2).

The canonical consolidated record is
[`sprint-2-user-testing-summary.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md).

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
