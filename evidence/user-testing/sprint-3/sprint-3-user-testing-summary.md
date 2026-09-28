# Sprint 3 User Testing Summary

> **Pre-test scaffold for Issue #600.** Populate only from reviewed Sprint 3 session evidence. Do not infer or invent task outcomes, findings, decisions or retest results.

## User-Feedback Coverage

| User-feedback issue | User goal                                                | Planned primary Task IDs                                               | Linked implementation issues                               | Formal session evidence          | Testing status                       |
| ------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------- | ------------------------------------ |
| #601                | Navigation, authentication and overall frontend flow     | `AUTH-*` + representative navigation                                   | #580; #581                                                 | `2026-09-24-P07-multi-role.md`   | Accepted with documented limitations |
| #602                | Public statistics and fixture analytics                  | `PUB-01`â€“`PUB-06`                                                    | #582; #513; #590                                           | `2026-09-24-P08-public.md`       | In progress                          |
| #603                | Genuinely new fixture submission and reviewer onboarding | `AUTH-01`, `AUTH-02`, `SUB-01`, `SUB-07`, `REV-01`, `REV-02`, `REV-06` | #571; #583; #483; #584; #585; #586; #587; #705; #708; #770 | `2026-09-28-P11-new-fixture.md`  | Accepted with documented limitations |
| #604                | Season and multi-season back-catalogue ingestion         | `BAT-01`â€“`BAT-05`                                                    | #586; #587; #588; #589                                     | `2026-09-28-P14-submit-batch.md` | Accepted with documented limitations |
| #605                | Corrections, stable identity and statistics provenance   | `COR-01`, `ADM-02`, selected `PUB-*`                                   | #591; #592; #593                                           | `2026-09-28-P12-admin.md`        | Not accepted                         |
| #606                | Versioned dataset release and reproducibility            | `PUB-04`, `DATA-01`, `DATA-02`                                         | #562; #596; #597                                           | `2026-09-25-P10-admin.md`        | Accepted                             |
| #607                | API consumer keys, quotas and rate limits                | `PUB-05`, `API-01`                                                     | #594; #595; #743                                           | `2026-09-26-P09-api-consumer.md` | Accepted with documented limitations |
| #612                | Selected Advanced API consumer capabilities              | `API-02`, `API-03`, `API-04`                                           | #775; #776; #783                                           | `2026-09-28-P13-api-consumer.md` | In progress                          |

`Testing status` must reflect retained user-testing evidence, not implementation-issue state.

## Participants

| Participant ID | Role                                              | Relevant experience                                  | User-feedback issue(s) | Session evidence                 |
| -------------- | ------------------------------------------------- | ---------------------------------------------------- | ---------------------- | -------------------------------- |
| P07            | Public/viewer; approved submitter; reviewer/admin | Not recorded                                         | #601                   | `2026-09-24-P07-multi-role.md`   |
| P08            | Not recorded                                      | Not recorded                                         | #602                   | `2026-09-24-P08-public.md`       |
| P09            | Technically competent API consumer                | Competent API consumer                               | #607                   | `2026-09-26-P09-api-consumer.md` |
| P10            | Administrator; analyst/data-oriented participant  | Not separately recorded                              | #606                   | `2026-09-25-P10-admin.md`        |
| P11            | Submitter; reviewer                               | Not supplied                                         | #603                   | `2026-09-28-P11-new-fixture.md`  |
| P12            | Administrator                                     | Not supplied                                         | #605                   | `2026-09-28-P12-admin.md`        |
| P13            | Technically competent API consumer                | Computer Science student with development experience | #612                   | `2026-09-28-P13-api-consumer.md` |
| P14            | Approved submitter; reviewer/admin where required | Not separately recorded                              | #604                   | `2026-09-28-P14-submit-batch.md` |

Participant names, personal email addresses and credentials must not appear here.

## Task Outcomes

Record outcomes per attempted Task ID. Leave unattempted tasks at zero rather than manufacturing results.

| Task ID | Attempts | Success | Partial | Failure | Finding IDs                                                   |
| ------- | -------: | ------: | ------: | ------: | ------------------------------------------------------------- |
| AUTH-01 |        2 |       2 |       0 |       0 |                                                               |
| AUTH-02 |        2 |       2 |       0 |       0 |                                                               |
| AUTH-03 |        0 |       0 |       0 |       0 |                                                               |
| AUTH-04 |        1 |       0 |       1 |       0 | P07-F01                                                       |
| PUB-01  |        2 |       2 |       0 |       0 |                                                               |
| PUB-02  |        1 |       1 |       0 |       0 |                                                               |
| PUB-03  |        1 |       1 |       0 |       0 |                                                               |
| PUB-04  |        1 |       1 |       0 |       0 |                                                               |
| PUB-05  |        2 |       1 |       1 |       0 | P13-F01                                                       |
| PUB-06  |        1 |       0 |       1 |       0 | P08-F01                                                       |
| SUB-01  |        2 |       1 |       1 |       0 | P07-F02                                                       |
| SUB-02  |        0 |       0 |       0 |       0 |                                                               |
| SUB-03  |        1 |       1 |       0 |       0 |                                                               |
| SUB-04  |        1 |       1 |       0 |       0 |                                                               |
| SUB-05  |        0 |       0 |       0 |       0 |                                                               |
| SUB-06  |        0 |       0 |       0 |       0 |                                                               |
| SUB-07  |        1 |       1 |       0 |       0 |                                                               |
| BAT-01  |        1 |       1 |       0 |       0 |                                                               |
| BAT-02  |        1 |       1 |       0 |       0 |                                                               |
| BAT-03  |        1 |       0 |       1 |       0 | P14-F01                                                       |
| BAT-04  |        1 |       1 |       0 |       0 |                                                               |
| BAT-05  |        1 |       0 |       0 |       1 | P14-F02                                                       |
| COR-01  |        2 |       1 |       0 |       1 | P12-F01; P12-F02; P12-F03; P12-F04; P12-F05; P12-F06; P12-F07 |
| REV-01  |        2 |       2 |       0 |       0 |                                                               |
| REV-02  |        1 |       1 |       0 |       0 |                                                               |
| REV-03  |        0 |       0 |       0 |       0 |                                                               |
| REV-04  |        0 |       0 |       0 |       0 |                                                               |
| REV-05  |        0 |       0 |       0 |       0 |                                                               |
| REV-06  |        1 |       0 |       1 |       0 | P11-F01                                                       |
| ADM-01  |        0 |       0 |       0 |       0 |                                                               |
| ADM-02  |        1 |       0 |       1 |       0 | P12-F08; P12-F09                                              |
| DATA-01 |        1 |       1 |       0 |       0 |                                                               |
| DATA-02 |        1 |       1 |       0 |       0 |                                                               |
| API-01  |        1 |       0 |       1 |       0 | P09-F01                                                       |
| API-02  |        1 |       1 |       0 |       0 |                                                               |
| API-03  |        1 |       1 |       0 |       0 |                                                               |
| API-04  |        1 |       1 |       0 |       0 |                                                               |

`COR-01` carries two attempts from one P12 session because the task bank's wording covers two situations the product treats differently: correcting data submitted in an earlier session failed, and correcting a submission made moments before succeeded. `2026-09-28-P12-admin.md` scores each separately.

No `PUB-*` task was attempted for #605. The session covered `COR-01` and `ADM-02` only, and the gate's selected `PUB-*` tasks were not exercised, so the `PUB-*` counts above carry no #605 attempt. `P12-F10` and `P12-F11` are cross-cutting findings not attributable to a single Task ID.

## Findings and Decisions

Every S1/S2 or otherwise actionable finding must have a recorded decision.

| Finding ID | Session | User-feedback issue | Task ID       | Finding                                                                                                                                                                                                                                                   | Severity | Decision | Decision reason                                                                                                                       | Gitea issue | Fix PR / commit  | Retest                                                                                                    |
| ---------- | ------- | ------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| P07-F01    | P07     | #601                | AUTH-04       | `Settings` did not clearly communicate its account purpose; participant suggested `Manage account`.                                                                                                                                                       | S3       | Accept   | Non-blocking navigation improvement is tracked separately.                                                                            | #713        | Not applicable   | Not required for accepted S3 finding                                                                      |
| P07-F02    | P07     | #601                | SUB-01        | Participant wanted a clear way to view approved competition scopes.                                                                                                                                                                                       | S3       | Accept   | Non-blocking scope-discoverability improvement is tracked separately.                                                                 | #714        | Not applicable   | Not required for accepted S3 finding                                                                      |
| P08-F01    | P08     | #602                | PUB-06        | Participant could not identify an obvious workflow for comparing two players.                                                                                                                                                                             | S2       | Accept   | Player-comparison improvement accepted and tracked separately.                                                                        | #716        | Not applicable   | Required after accepted change                                                                            |
| P09-F01    | P09     | #607                | API-01        | Interactive OpenAPI showed `RATE_LIMIT_EXCEEDED` but did not expose `RateLimit-*` / `Retry-After` headers to the browser participant.                                                                                                                     | S3       | Accept   | Browser-based consumers needed the safe rate/quota response headers exposed through CORS.                                             | #743        | Not recorded     | Passed â€” deployed Swagger showed rate/quota headers on `200` and `RateLimit-*` / `Retry-After` on `429` |
| P11-F01    | P11     | #603                | REV-06        | Participant onboarding accepted a player name as a durable identifier and submitted an invalid request.                                                                                                                                                   | S3       | Defer    | The supported new-fixture workflow reached review, onboarding and publication; #770 remains a non-blocking validation/UX follow-up.   | #770        | Not applicable   | Not required for deferred S3 finding; independent #770 retest pending                                     |
| P12-F01    | P12     | #605                | COR-01 (1)    | No discoverable way to correct data submitted in an earlier session; participant abandoned the task and would have contacted support.                                                                                                                     | S1       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F02    | P12     | #605                | COR-01 (1)    | Submission history entries all show the same name and cannot be told apart in the list.                                                                                                                                                                   | S2       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F03    | P12     | #605                | COR-01 (1)    | Submission item list omits run values, so the delivery needing correction cannot be identified.                                                                                                                                                           | S2       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F04    | P12     | #605                | COR-01 (2)    | Correction history is promised in the interface but unreachable; the endpoint has no UI.                                                                                                                                                                  | S2       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F05    | P12     | #605                | COR-01 (2)    | An accepted direct submission appears in no submission list afterwards.                                                                                                                                                                                   | S2       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F06    | P12     | #605                | COR-01 (2)    | No warning or guard before an out-of-range over number reaches published statistics.                                                                                                                                                                      | S2       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F07    | P12     | #605                | COR-01 (2)    | `non-boundary runs` wording unclear to a domain-competent user.                                                                                                                                                                                           | S4       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F08    | P12     | #605                | ADM-02        | The reviewer workspace does not show who decided a batch, though the submitter-facing report does.                                                                                                                                                        | S3       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F09    | P12     | #605                | ADM-02        | No navigation between a batch and the fixtures, events or statistics it produced, in either direction.                                                                                                                                                    | S2       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F10    | P12     | #605                | Cross-cutting | Deployed page loads slow enough to read as failure rather than latency; corroborates #599 section 10.                                                                                                                                                     | S1       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P12-F11    | P12     | #605                | Cross-cutting | The administrator fixture selector loads every fixture in the database, about 141 sequential requests.                                                                                                                                                    | S2       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint.        | #613        | Not applicable   | Not required for a deferred finding; carried to #613                                                      |
| P13-F01    | P13     | #612                | PUB-05        | Prospective external API consumer could discover the API and understand its operations but could not determine how to request access or obtain an API key.                                                                                                | S2       | Accept   | Authenticated-consumer onboarding is not independently discoverable; the participant repeated the same concern in post-test feedback. | #783        | #787 / `14c203c` | Passed — deployed PUB-05 retest completed on 2026-09-28; participant satisfied with revised guidance      |
| P14-F01    | P14     | #604                | BAT-03        | The submission report clearly showed that the two source items were unresolved because their fixture references could not be matched, but the recovery/action guidance could be clearer about exactly what the submitter needs to change before retrying. | S3       | Defer    | Non-blocking clarity improvement; recorded and carried to #613 for the Sprint 3 close-out.                                            | #613        | Not applicable   | Not required for deferred S3 finding; carried to #613                                                     |
| P14-F02    | P14     | #604                | BAT-05        | The â€œDownload JSON Reportâ€ control was discoverable, but selecting it displayed â€œThe complete report is temporarily unavailable. Try the download again.â€ The participant could not obtain the complete report.                                     | S2       | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the Sprint 3 close-out; no fix attempted within this sprint.      | #613        | Not applicable   | Not required for deferred S2 finding; carried to #613                                                     |
| P14-F03    | P14     | #604                | Cross-cutting | When all search text is backspaced/cleared, the search/select control automatically selects the top option instead of returning to a blank state. This was a non-blocking usability issue.                                                                | S4       | Defer    | Minor non-blocking UX improvement; recorded and carried to #613 for the Sprint 3 close-out.                                           | #613        | Not applicable   | Not required for deferred S4 finding; carried to #613                                                     |

Allowed final decisions are `Accept`, `Defer`, or `Reject`. `Pending` is temporary and prevents user-feedback issue close-out for an S1/S2 or otherwise actionable finding.

## Severity Summary

| Severity | Count | Accepted | Deferred | Rejected | Pending | Resolved after retest |
| -------- | ----: | -------: | -------: | -------: | ------: | --------------------: |
| S1       |     2 |        0 |        2 |        0 |       0 |                     0 |
| S2       |    10 |        2 |        8 |        0 |       0 |                     1 |
| S3       |     6 |        3 |        3 |        0 |       0 |                     1 |
| S4       |     2 |        0 |        2 |        0 |       0 |                     0 |

## Integrated Changes and Retests

| Finding ID | Decision / rationale                                                   | Issue | PR / commit  | Automated regression coverage where appropriate                            | Retest evidence                                                                | Result |
| ---------- | ---------------------------------------------------------------------- | ----- | ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| P09-F01    | Accept â€” browser/OpenAPI header visibility defect fixed and deployed | #743  | Not recorded | `api-consumers.test.ts` regression covers exposed browser response headers | `2026-09-26-P09-api-consumer.md` plus deployed `200`/`429` Swagger screenshots | Passed |

Accepted S1/S2 changes require retest. Prefer the same Task ID against the corrected build.

## Deferred / Rejected Findings

| Finding ID | Decision | Reason                                                                                                                                                                                          | Revisit trigger, if any                |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| P07-F01    | Accept   | Non-blocking navigation improvement tracked in #713.                                                                                                                                            | Issue #713 implementation/review       |
| P07-F02    | Accept   | Non-blocking scope-discoverability improvement tracked in #714.                                                                                                                                 | Issue #714 implementation/review       |
| P11-F01    | Defer    | #770 is a non-blocking durable-identifier validation/UX follow-up; the supported workflow completed.                                                                                            | #770 completion and independent retest |
| P12-F01    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S1)                                                             | #613 Sprint 3 close-out                |
| P12-F02    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S2)                                                             | #613 Sprint 3 close-out                |
| P12-F03    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S2)                                                             | #613 Sprint 3 close-out                |
| P12-F04    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S2)                                                             | #613 Sprint 3 close-out                |
| P12-F05    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S2)                                                             | #613 Sprint 3 close-out                |
| P12-F06    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S2)                                                             | #613 Sprint 3 close-out                |
| P12-F07    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S4)                                                             | #613 Sprint 3 close-out                |
| P12-F08    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S3)                                                             | #613 Sprint 3 close-out                |
| P12-F09    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S2)                                                             | #613 Sprint 3 close-out                |
| P12-F10    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S1)                                                             | #613 Sprint 3 close-out                |
| P12-F11    | Defer    | Sprint 3 closes 29 September 2026. Recorded and carried to #613 for the sprint close-out; no fix attempted within this sprint. (S2)                                                             | #613 Sprint 3 close-out                |
| P14-F01    | Defer    | BAT-03 reference-resolution messaging was understandable at a technical level but could provide clearer recovery/action guidance. Recorded and carried to #613 for the Sprint 3 close-out. (S3) | #613 Sprint 3 close-out                |
| P14-F02    | Defer    | The Download JSON Report control was available, but the complete report was temporarily unavailable when selected. Recorded and carried to #613 for the Sprint 3 close-out. (S2)                | #613 Sprint 3 close-out                |
| P14-F03    | Defer    | Clearing all search text automatically selects the top option instead of leaving the search/select control blank. Non-blocking usability follow-up carried to #613. (S4)                        | #613 Sprint 3 close-out                |

## User-Feedback Issue Close-Out Checklist

| User-feedback issue | Readiness satisfied before testing                                                                                                                                                                                   | Formal session(s) linked         | All attempted tasks scored | Actionable findings decided                                  | Accepted S1/S2 retested                                                           | Summary current | Issue may close                                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #601                | Deployed app recorded; exact URL/commit unavailable                                                                                                                                                                  | `2026-09-24-P07-multi-role.md`   | Yes                        | Yes                                                          | Not applicable; no accepted S1/S2 finding                                         | Yes             | Yes                                                                                                                                                                                      |
| #602                | Deployed app recorded; exact URL/commit unavailable                                                                                                                                                                  | `2026-09-24-P08-public.md`       | Yes                        | Yes; P08-F01 accepted                                        | No; #716 implementation and PUB-06 retest required                                | Yes             | No; accepted S2 retest remains required                                                                                                                                                  |
| #603                | Facilitator reported #571; #583; #483; #584; #585; #586; #587; #705 and #708 deployed/usable; deployment SHA unavailable                                                                                             | `2026-09-28-P11-new-fixture.md`  | Yes                        | Yes; P11-F01 deferred to #770                                | Not applicable; deferred S3 finding                                               | Yes             | Yes; Accepted with documented limitations: coached Partial REV-06; #770 deferred; deployment SHA/reset plan unavailable                                                                  |
| #604                | Prepared season and multi-season/back-catalogue packages were available; valid Women's Premier Cup and Men's Challenger Cup packages were used during the session; deployed environment recorded in session evidence | `2026-09-28-P14-submit-batch.md` | Yes                        | Yes; P14-F01, P14-F02 and P14-F03 all have final decisions   | Not applicable; all P14 findings were deferred rather than accepted S1/S2 changes | Yes             | Yes; Accepted with documented limitations: BAT-03 recovery wording could be clearer, BAT-05 report download was unavailable, and P14-F03 is a non-blocking search/select usability issue |
| #605                | Prepared `S3-COR-01` package validated against the submission contract; deployed environment recorded; commit unavailable                                                                                            | `2026-09-28-P12-admin.md`        | Yes                        | Yes; all eleven findings deferred to #613                    | Not applicable; no finding was accepted                                           | Yes             | No; Not accepted â€” two S1 findings remain unfixed                                                                                                                                      |
| #606                | Immutable version/checksum and documented public metadata/artifact paths recorded; deployed commit unavailable                                                                                                       | `2026-09-25-P10-admin.md`        | Yes                        | No findings reported                                         | Not applicable                                                                    | Yes             | Yes; Accepted with documented limitation that deployed commit and P10's exact field-name list were not retained                                                                          |
| #607                | Deployed API/docs and commit recorded; `S3-API-01` prepared                                                                                                                                                          | `2026-09-26-P09-api-consumer.md` | Yes                        | Yes; P09-F01 accepted, issue link pending                    | Not applicable; no accepted S1/S2 finding                                         | Yes             | No; follow-up issue link and unassisted PUB-05 retest pending                                                                                                                            |
| #612                | Initial deployed frontend/API/docs and commit `12d27d80e073a15aea1189a7858243e24e9de92f` recorded; #783 subsequently implemented and deployed; PUB-05 retest completed                                               | `2026-09-28-P13-api-consumer.md` | Yes                        | Yes; P13-F01 accepted, implemented through #783 and resolved | Yes; deployed PUB-05 retest passed                                                | Yes             | Yes; Accepted with documented limitations — exact retest deployment SHA was not separately retained                                                                                      |

## Remaining Concerns

- #601 is accepted with documented limitations: P07 completed the selected multi-role navigation tasks; two non-blocking S3 improvements are tracked in #713 and #714.

- #580 and #581 were already closed when this gate was finalised; this record notes their closed status and does not change either issue.

- #602 has one retained public-statistics session. P08-F01 is an accepted S2 player-comparison finding tracked by #716; #602 cannot close until implementation and PUB-06 retest are complete.

- #607 has one retained API-consumer session. PUB-05 is Success because the bearer-token assistance occurred only after that task had completed. API-01 remains Partial as the historical participant outcome. P09-F01 is linked to #743; the deployed fix passed browser/OpenAPI technical retest. The gate is Accepted with documented limitations because no participant rerun on the corrected build is recorded.

- #612 has one retained Advanced API-consumer session. P13 completed `API-02`, `API-03` and `API-04` successfully. `PUB-05` was initially Partial and produced accepted S2 finding `P13-F01`. #783 implemented the missing consumer-onboarding guidance through PR #787. After deployment, `PUB-05` was retested and the participant was satisfied with the revised guidance. `P13-F01` is resolved. The exact retest deployment SHA and a separate assistance field were not retained, so the final gate is Accepted with documented limitations.

- #605 has one retained correction/provenance session and is **Not accepted**. `COR-01` produced two outcomes: correcting data submitted in an earlier session failed with no workaround, and correcting a submission made moments before succeeded. `ADM-02` was Partial. Eleven findings, including two S1, are deferred to #613 with no fix attempted this sprint.

- No `PUB-*` task was attempted for #605. The session covered `COR-01` and `ADM-02` only, and the gate's selected `PUB-*` tasks were not exercised, so the gate's planned coverage is only partly evidenced.

- #591, #592 and #593 were already closed when this gate ran, so the gate reported on work it was meant to release rather than gating it. This record notes their closed status and does not change any of them. How the Sprint 3 user-feedback gates operated in practice against how they were designed â€” issues closing on technical completion rather than waiting for the gate â€” is carried to #613 for the close-out narrative.

- #603 has one retained new-fixture session. P11's valid package reached review and was onboarded and approved/published. `REV-06` was Partial after facilitator intervention for deferred S3 finding P11-F01/#770. The deployed SHA and reset/recreate procedure were not retained.

- #604 has one retained season/back-catalogue ingestion session. P14 completed BAT-01, BAT-02 and BAT-04 successfully. BAT-03 was Partial because the unresolved-reference report was technically informative but could provide clearer recovery/action guidance. BAT-05 was a Failure because the Download JSON Report control was available but the complete report was temporarily unavailable. P14-F01 and P14-F02 were deferred to #613. P14-F03 records a separate non-blocking usability issue where clearing all search text automatically selects the top option rather than leaving the control blank. #604 is Accepted with documented limitations.

## Issue #601 Final Gate Result

**Accepted with documented limitations.**

P07 completed all six selected tasks across public/viewer, approved-submitter and reviewer/admin contexts without a recorded failure. `AUTH-04` and `SUB-01` were Partial because of two non-blocking S3 discoverability/wording findings. Both have an explicit accepted outcome and are tracked in #713 and #714 respectively. No S1/S2 finding was accepted, so no retest is required.

The linked implementation issues #580 and #581 were already closed. This gate records that status only; it does not perform or imply any further change to those issues.

## Issue #607 Final Gate Result

**Accepted with documented limitations.**

P09 completed `PUB-05` without facilitator coaching and independently discovered the API documentation and the distinction between public and consumer-controlled routes. The later bearer-token assistance occurred only after PUB-05 had already completed.

`API-01` remains Partial as the historical participant-session outcome because the original browser/OpenAPI client did not expose the retry/reset response headers. That produced accepted S3 finding `P09-F01`, tracked by #743. The #743 fix was subsequently deployed and passed facilitator technical retest: Swagger visibly exposed `RateLimit-*` / `X-Quota-*` metadata on a successful request and `RateLimit-*` plus `Retry-After` on `429 RATE_LIMIT_EXCEEDED`.

No accepted S1/S2 finding exists for #607. The only retained limitation is that no participant rerun of API-01 on the corrected build is recorded.

## Issue #603 Final Gate Result

**Accepted with documented limitations.**

P11, an anonymous non-developer participant, completed the selected authentication, submitter, validation, new-fixture and review-discovery tasks.

The valid submission reached review; the fixture was onboarded and approved/published. `REV-06` was Partial because the facilitator explained and bypassed the documented durable-identifier issue #770.

P11-F01 is a deferred S3 validation/UX follow-up, not an accepted S1/S2 change.

Its independent completion and retest remain tracked in #770. The retained limitations are the coached Partial result, unavailable deployed SHA, and an unrecorded reset/recreate procedure. This user-feedback result releases #571, #583, #483, #584, #585, #586, #587, #705 and #708 for closure only if each issue independently satisfies its remaining technical Definition of Done.

## Issue #605 Final Gate Result

**Not accepted.**

`COR-01`'s first half failed. P12, an administrator, could not find any way to

correct data submitted in an earlier session: submission history entries were

indistinguishable, the item list carried no run values, no edit control existed

on the submission or on the match, and the participant concluded they would give

up and contact support. They stated they came away "worried that once data is in,

I can't fix my own mistakes". No workaround was available, and correction of

previously published data is the subject of this gate.

`COR-01`'s second half succeeded. Correcting a delivery submitted moments earlier

was straightforward, and derived statistics updated immediately and correctly.

That is the narrower situation the product actually supports.

`ADM-02` was Partial. Submitter, timestamp, lifecycle status and rejection

reasons were all clear, but the deciding reviewer was not visible in the

workspace used, and provenance could not be followed from a batch to the fixtures

and deliveries it produced or back again.

Two S1 findings remain unfixed: `P12-F01`, the absence of any discoverable

correction path for previously submitted data, and `P12-F10`, deployed page loads

slow enough that the participant twice judged the site broken and would have

abandoned it. `P12-F10` corroborates section 10 of

`evidence/sprints/sprint-3/issue-599-performance-revalidation.md`, which measured

five of five deployed read operations failing their targets on 2026-09-25.

All eleven findings are deferred to #613 rather than fixed, because Sprint 3

closes on 29 September 2026. No `PUB-*` task was attempted, so the gate's planned

coverage is only partly evidenced.

**This gate releases no implementation issue for closure.** #591, #592 and #593

were already closed on technical completion before this session ran, so there was

nothing left for the gate to release; this record notes that status and does not

change any of those issues. The observation that the Sprint 3 user-feedback gates

ran after the work they were designed to gate is carried to #613.

## Issue #612 Final Gate Result

**Accepted with documented limitations.**

P13, a technically competent API consumer who was independent of the project team, completed `API-02`, `API-03` and `API-04` successfully during the original formal session.

`PUB-05` was initially Partial. The participant found the API page and understood the available operations but could not determine how a legitimate prospective external consumer should request access or obtain an API key. The same concern was repeated in post-test feedback.

That observation became accepted S2 finding `P13-F01`, tracked by #783.

#783 added public API onboarding guidance explaining anonymous public access, administrator-issued consumer keys, the access-request model, `X-API-Key` usage, quota/rate-limit expectations, secure handling, and the distinction between consumer and application/admin authentication. The change was implemented in PR #787 with implementation commit `14c203c1781b0f12e4b1aacd43b8d0ac7d80966a` and merged to `main` in `34bca4d0a8ff442092808434c3e022016844fcc7`.

After the corrected experience was deployed, `PUB-05` was retested. The participant was satisfied with the revised onboarding guidance, and `P13-F01` is considered resolved.

The historical original `PUB-05` outcome remains Partial; the successful retest is retained separately rather than rewriting the original observation.

The exact deployment SHA and a separate assistance field were not retained in the supplied retest note. These are documented evidence limitations and are not inferred.

All #612 task evidence is present, every actionable finding has a final decision, and the accepted S2 finding has been implemented and successfully retested.

**Issue #612 may close.**

## Issue #604 Final Gate Result

**Accepted with documented limitations.**

P14 completed all five selected batch-ingestion tasks.

`BAT-01` was successful: the Women's Premier Cup season upload was completed successfully and the workflow was easy to understand.

`BAT-02` was successful: the Men's Challenger Cup upload was completed successfully and the workflow was easy to understand.

`BAT-03` was Partial. The submission report clearly identified two unresolved source items and showed that their fixture references could not be matched. However, the recovery/action guidance could be clearer about exactly what the submitter needs to change before retrying. This produced deferred S3 finding `P14-F01`.

`BAT-04` was successful. The participant received the clear message: "The package does not match the selected fixture. Check its date and both team names."

`BAT-05` was a Failure. The `Download JSON Report` control was discoverable, but selecting it displayed "The complete report is temporarily unavailable. Try the download again." The complete report could therefore not be obtained. This produced deferred S2 finding `P14-F02`.

A separate cross-cutting usability observation, `P14-F03`, records that clearing all search text automatically selected the top option rather than returning the search/select control to a blank state. This was non-blocking and was recorded as S4 and deferred to #613.

All P14 findings have final decisions. No S1/S2 finding was accepted as a change requiring participant retest. The retained limitations are the BAT-03 recovery wording, the unavailable BAT-05 report download, and the non-blocking search/select behaviour.

**This gate is Accepted with documented limitations.**

## Evidence Integrity Checklist

- [ ] Every formal session uses `YYYY-MM-DD-PXX-ROLE.md`.

- [ ] Every attempted Task ID has its own Success / Partial / Failure outcome.

- [ ] Every finding links to a Task ID.

- [ ] S1â€“S4 is assigned by impact.

- [ ] Every S1/S2 or otherwise actionable finding has a final outcome before the relevant user-feedback issue closes.

- [ ] Accepted S1/S2 findings have retest evidence.

- [ ] Participant names are absent from Gitea issues and retained evidence.

- [ ] Passwords, tokens and API keys are absent from retained evidence.

- [ ] User-feedback issues are tracked independently from implementation closure; any `Cannot Begin Until` list is used only as testing readiness.

- [ ] All session links and implementation issue/PR links resolve.

## AI Declaration

The preceding Sprint 3 evidence scaffold was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].

The #605 coverage, P12 participant, task-outcome, finding, deferral and gate-result entries were added with the assistance of Claude-Code[Claude Opus 5].

The #612/P13 coverage, task outcomes, accepted `P13-F01`/#783 finding, and current gate state were organised and drafted with the assistance of ChatGPT-Web[GPT-5.6 Sol].

The #783 implementation references, deployed PUB-05 retest result, P13-F01 resolution and final #612 gate state were organised and drafted with the assistance of ChatGPT-Web[GPT-5.6 Sol].
