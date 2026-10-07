# Sprint 3 User Feedback Summary

This page provides a public summary of the formal user-feedback activities completed during Sprint 3.

The detailed participant records and consolidated evidence remain the authoritative source. This page
provides a privacy-safe view of the coverage, findings, decisions, integrated changes and remaining
limitations.

[View the canonical Sprint 3 user-testing evidence](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md){ target="_blank" rel="noopener" }.

## Coverage

Sprint 3 retained the task-based testing process established earlier in the project. Each user goal had
a dedicated feedback issue and representative task set.

| Feedback issue | User goal                                              | Session | Recorded gate state                                                 |
| -------------- | ------------------------------------------------------ | ------- | ------------------------------------------------------------------- |
| #601           | Navigation, authentication and overall frontend flow   | P07     | Accepted with documented limitations                                |
| #602           | Public statistics and fixture analytics                | P08     | In progress in the consolidated coverage table                      |
| #603           | New-fixture submission and reviewer onboarding         | P11     | Accepted with documented limitations                                |
| #604           | Season and multi-season back-catalogue ingestion       | P14     | Accepted with documented limitations                                |
| #605           | Corrections, stable identity and statistics provenance | P12     | Not accepted                                                        |
| #606           | Versioned dataset release and reproducibility          | P10     | Accepted                                                            |
| #607           | API consumer keys, quotas and rate limits              | P09     | Accepted with documented limitations                                |
| #612           | Advanced API consumer capabilities                     | P13     | Accepted with documented limitations in the later final-gate record |

The consolidated evidence still shows #612 as `In progress` in its earlier coverage table. A later
final-gate section in the same evidence records #612 as **Accepted with documented limitations**
after #783 was implemented and the deployed `PUB-05` experience was retested. This page preserves
that distinction rather than silently treating the two records as identical.

## Finding severity

Sprint 3 recorded the following finding distribution:

| Severity | Count | Accepted | Deferred | Rejected | Pending | Resolved after retest |
| -------- | ----: | -------: | -------: | -------: | ------: | --------------------: |
| S1       |     2 |        0 |        2 |        0 |       0 |                     0 |
| S2       |    10 |        2 |        8 |        0 |       0 |                     1 |
| S3       |     6 |        3 |        3 |        0 |       0 |                     1 |
| S4       |     2 |        0 |        2 |        0 |       0 |                     0 |

## Key findings and decisions

| Finding                                                                                     | Decision / action   | Result                                                        |
| ------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------- |
| P07-F01: account `Settings` naming was unclear                                              | Accepted under #713 | Non-blocking S3 follow-up                                     |
| P07-F02: approved competition scopes were difficult to discover                             | Accepted under #714 | Non-blocking S3 follow-up                                     |
| P08-F01: no obvious player-comparison workflow                                              | Accepted under #716 | S2 change requiring implementation and retest                 |
| P09-F01: browser/OpenAPI consumers could not see safe rate-limit and retry headers          | Accepted under #743 | Fix deployed and technically retested successfully            |
| P11-F01: reviewer onboarding accepted a player name where a durable identifier was required | Deferred under #770 | Non-blocking follow-up retained                               |
| P12-F01: no discoverable way to correct data submitted in an earlier session                | Deferred to #613    | S1 issue; no Sprint 3 fix attempted                           |
| P12-F10: deployed page loads were slow enough to appear broken to the participant           | Deferred to #613    | S1 issue; no Sprint 3 fix attempted                           |
| P13-F01: an external API consumer could not determine how to request access or obtain a key | Accepted under #783 | Implemented in PR #787 and passed deployed participant retest |
| P14-F01: batch-reference recovery instructions could be clearer                             | Deferred to #613    | Non-blocking S3 follow-up                                     |
| P14-F02: the complete JSON batch report was temporarily unavailable                         | Deferred to #613    | S2 issue retained for follow-up                               |
| P14-F03: clearing searchable selectors automatically selected the top option                | Deferred to #613    | Non-blocking S4 follow-up                                     |

## Integrated changes and retests

### API rate-limit visibility

P09 identified that the interactive browser/OpenAPI experience did not expose the response headers
needed to understand rate limits and retry timing.

The finding became #743. After the change was deployed, the browser/OpenAPI experience visibly
exposed the expected rate and quota metadata on a successful response and the rate-limit and
`Retry-After` information on a `429 RATE_LIMIT_EXCEEDED` response.

The retained limitation is that the correction was technically retested in the deployed Swagger
experience rather than through a second participant run of the original `API-01` task.

### External API consumer onboarding

P13 successfully completed the selected Advanced API operations but initially could not determine how
a legitimate external consumer should obtain an API key.

The accepted S2 finding became #783. PR #787 added public onboarding guidance covering anonymous
access, administrator-issued consumer keys, the access-request model, `X-API-Key` use, rate and quota
expectations and secure handling.

After deployment, `PUB-05` was repeated and the participant was satisfied with the revised guidance.
The historical original result remains Partial in the evidence; the successful retest is retained
separately rather than rewriting the original observation.

## Correction and provenance gate

The #605 correction/provenance session was **not accepted**.

The participant could successfully correct a delivery that had been submitted moments earlier, but
could not discover a way to correct data from an earlier submission. Submission-history entries were
difficult to distinguish, item lists did not expose enough event information to find the target, and
the older published-data correction journey had no usable path.

The same session also recorded significant deployed latency and weaknesses in navigating provenance
between batches, fixtures, events and statistics.

Two S1 findings from this session, including correction discoverability and deployed page-load
performance, were deferred to #613 for Sprint close-out rather than fixed during Sprint 3.

## Batch-ingestion feedback

P14 successfully completed the season upload, multi-season upload and invalid-package tasks.

Reference-resolution reporting was understandable but could provide clearer recovery instructions.
The complete JSON report download was temporarily unavailable during `BAT-05`, producing a deferred
S2 finding. A smaller selector-clearing usability issue was also retained as a deferred S4 finding.

The #604 gate was therefore accepted with documented limitations rather than treated as having no
remaining concerns.

## Remaining concerns at Sprint 3 close-out

The concerns below record the state at Sprint 3 close-out. Later implementation
work does not rewrite the original participant outcomes or finding decisions.

The most consequential retained issues at Sprint 3 close-out include:

- the S1 correction-discoverability problem recorded by P12;
- the S1 deployed-performance finding recorded by P12;
- implementation and retest of the accepted player-comparison finding #716;
- the durable-identifier onboarding follow-up #770;
- batch-report recovery guidance and report availability raised by P14; and
- several non-blocking navigation and scope-discoverability improvements.

Deferred findings remain visible in the evidence and are not treated as resolved merely because their
related implementation issues or Sprint ended.

## Evidence

The complete Sprint 3 evidence is retained under
[`evidence/user-testing/sprint-3/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3){ target="_blank" rel="noopener" }.

The canonical consolidated record is
[`sprint-3-user-testing-summary.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md){ target="_blank" rel="noopener" }.

## Post-Sprint 3 disposition

Later repository work changed the implementation state of two retained findings
without changing their original Sprint 3 testing outcomes:

- **P08-F01 / #716:** the player-comparison workflow was subsequently implemented
  and merged. Repository evidence includes the implementation and automated
  regression coverage. No retained participant rerun of `PUB-06` on the corrected
  build was found, so the original Partial outcome remains the historical
  user-testing result.
- **P11-F01 / #770:** the durable-identifier validation defect was subsequently
  fixed and merged in PR #773 with frontend regression coverage for valid and
  invalid identifiers. No independent participant rerun of `REV-06` is retained,
  so the original Partial/deferred Sprint 3 outcome is not rewritten.

Issue closure or later implementation therefore does not, by itself, replace the
recorded participant-session result.

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
