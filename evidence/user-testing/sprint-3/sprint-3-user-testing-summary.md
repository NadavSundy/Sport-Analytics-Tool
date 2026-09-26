# Sprint 3 User Testing Summary

> **Pre-test scaffold for Issue #600.** Populate only from reviewed Sprint 3 session evidence. Do not infer or invent task outcomes, findings, decisions or retest results.

## User-Feedback Coverage

| User-feedback issue | User goal                                                | Planned primary Task IDs                                               | Linked implementation issues | Formal session evidence        | Testing status                       |
| ------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- | ------------------------------ | ------------------------------------ |
| #601                | Navigation, authentication and overall frontend flow     | `AUTH-*` + representative navigation                                   | #580; #581                   | `2026-09-24-P07-multi-role.md` | Accepted with documented limitations |
| #602                | Public statistics and fixture analytics                  | `PUB-01`–`PUB-06`                                                      | #582; #513; #590             | `2026-09-24-P08-public.md`     | In progress                          |
| #603                | Genuinely new fixture submission and reviewer onboarding | `AUTH-01`, `AUTH-02`, `SUB-01`, `SUB-07`, `REV-01`, `REV-02`, `REV-06` |                              |                                | Not started                          |
| #604                | Season and multi-season back-catalogue ingestion         | `BAT-01`–`BAT-05`                                                      |                              |                                | Not started                          |
| #605                | Corrections, stable identity and statistics provenance   | `COR-01`, `ADM-02`, selected `PUB-*`                                   |                              |                                | Not started                          |
| #606                | Versioned dataset release and reproducibility            | `DATA-01`, `DATA-02`                                                   |                              |                                | Not started                          |
| #607                | API consumer keys, quotas and rate limits                | `PUB-05`, `API-01`                                                     | #594; #595                   | `2026-09-26-P09-api-consumer.md` | In progress                          |
| #612                | Selected Advanced API consumer capabilities              | `API-02`, `API-03`, `API-04`                                           |                              |                                | Not started                          |

`Testing status` must reflect retained user-testing evidence, not implementation-issue state.

## Participants

| Participant ID | Role                                              | Relevant experience | User-feedback issue(s) | Session evidence               |
| -------------- | ------------------------------------------------- | ------------------- | ---------------------- | ------------------------------ |
| P07            | Public/viewer; approved submitter; reviewer/admin | Not recorded        | #601                   | `2026-09-24-P07-multi-role.md` |
| P08            | Not recorded                                      | Not recorded        | #602                   | `2026-09-24-P08-public.md`     |
| P09            | Technically competent API consumer                 | Competent API consumer | #607                 | `2026-09-26-P09-api-consumer.md` |

Participant names, personal email addresses and credentials must not appear here.

## Task Outcomes

Record outcomes per attempted Task ID. Leave unattempted tasks at zero rather than manufacturing results.

| Task ID | Attempts | Success | Partial | Failure | Finding IDs |
| ------- | -------: | ------: | ------: | ------: | ----------- |
| AUTH-01 |        1 |       1 |       0 |       0 |             |
| AUTH-02 |        1 |       1 |       0 |       0 |             |
| AUTH-03 |        0 |       0 |       0 |       0 |             |
| AUTH-04 |        1 |       0 |       1 |       0 | P07-F01     |
| PUB-01  |        2 |       2 |       0 |       0 |             |
| PUB-02  |        1 |       1 |       0 |       0 |             |
| PUB-03  |        1 |       1 |       0 |       0 |             |
| PUB-04  |        0 |       0 |       0 |       0 |             |
| PUB-05  |        1 |       0 |       1 |       0 |             |
| PUB-06  |        1 |       0 |       1 |       0 | P08-F01     |
| SUB-01  |        1 |       0 |       1 |       0 | P07-F02     |
| SUB-02  |        0 |       0 |       0 |       0 |             |
| SUB-03  |        0 |       0 |       0 |       0 |             |
| SUB-04  |        0 |       0 |       0 |       0 |             |
| SUB-05  |        0 |       0 |       0 |       0 |             |
| SUB-06  |        0 |       0 |       0 |       0 |             |
| SUB-07  |        0 |       0 |       0 |       0 |             |
| BAT-01  |        0 |       0 |       0 |       0 |             |
| BAT-02  |        0 |       0 |       0 |       0 |             |
| BAT-03  |        0 |       0 |       0 |       0 |             |
| BAT-04  |        0 |       0 |       0 |       0 |             |
| BAT-05  |        0 |       0 |       0 |       0 |             |
| COR-01  |        0 |       0 |       0 |       0 |             |
| REV-01  |        1 |       1 |       0 |       0 |             |
| REV-02  |        0 |       0 |       0 |       0 |             |
| REV-03  |        0 |       0 |       0 |       0 |             |
| REV-04  |        0 |       0 |       0 |       0 |             |
| REV-05  |        0 |       0 |       0 |       0 |             |
| REV-06  |        0 |       0 |       0 |       0 |             |
| ADM-01  |        0 |       0 |       0 |       0 |             |
| ADM-02  |        0 |       0 |       0 |       0 |             |
| DATA-01 |        0 |       0 |       0 |       0 |             |
| DATA-02 |        0 |       0 |       0 |       0 |             |
| API-01  |        1 |       0 |       1 |       0 | P09-F01     |
| API-02  |        0 |       0 |       0 |       0 |             |
| API-03  |        0 |       0 |       0 |       0 |             |
| API-04  |        0 |       0 |       0 |       0 |             |

## Findings and Decisions

Every S1/S2 or otherwise actionable finding must have a recorded decision.

| Finding ID | Session | User-feedback issue | Task ID | Finding                                                                                             | Severity | Decision | Decision reason                                                       | Gitea issue | Fix PR / commit | Retest                               |
| ---------- | ------- | ------------------- | ------- | --------------------------------------------------------------------------------------------------- | -------- | -------- | --------------------------------------------------------------------- | ----------- | --------------- | ------------------------------------ |
| P07-F01    | P07     | #601                | AUTH-04 | `Settings` did not clearly communicate its account purpose; participant suggested `Manage account`. | S3       | Accept   | Non-blocking navigation improvement is tracked separately.            | #713        | Not applicable  | Not required for accepted S3 finding |
| P07-F02    | P07     | #601                | SUB-01  | Participant wanted a clear way to view approved competition scopes.                                 | S3       | Accept   | Non-blocking scope-discoverability improvement is tracked separately. | #714        | Not applicable  | Not required for accepted S3 finding |
| P08-F01    | P08     | #602                | PUB-06  | Participant could not identify an obvious workflow for comparing two players.                       | S2       | Accept   | Player-comparison improvement accepted and tracked separately.        | #716        | Not applicable  | Required after accepted change       |
| P09-F01    | P09     | #607                | API-01  | Interactive OpenAPI showed `RATE_LIMIT_EXCEEDED` but did not expose `RateLimit-*` / `Retry-After` headers to the browser participant. | S3       | Accept   | Backend returns the headers over direct HTTP; browser-based consumers need the safe response headers exposed through CORS. | Pending creation | Not applicable | Recommended after fix; not required for accepted S3 finding |

Allowed final decisions are `Accept`, `Defer`, or `Reject`. `Pending` is temporary and prevents user-feedback issue close-out for an S1/S2 or otherwise actionable finding.

## Severity Summary

| Severity | Count | Accepted | Deferred | Rejected | Pending | Resolved after retest |
| -------- | ----: | -------: | -------: | -------: | ------: | --------------------: |
| S1       |     0 |        0 |        0 |        0 |       0 |                     0 |
| S2       |     1 |        1 |        0 |        0 |       0 |                     0 |
| S3       |     3 |        3 |        0 |        0 |       0 |                     0 |
| S4       |     0 |        0 |        0 |        0 |       0 |                     0 |

## Integrated Changes and Retests

| Finding ID | Decision / rationale | Issue | PR / commit | Automated regression coverage where appropriate | Retest evidence | Result |
| ---------- | -------------------- | ----- | ----------- | ----------------------------------------------- | --------------- | ------ |
|            |                      |       |             |                                                 |                 |        |

Accepted S1/S2 changes require retest. Prefer the same Task ID against the corrected build.

## Deferred / Rejected Findings

| Finding ID | Decision | Reason                                                          | Revisit trigger, if any          |
| ---------- | -------- | --------------------------------------------------------------- | -------------------------------- |
| P07-F01    | Accept   | Non-blocking navigation improvement tracked in #713.            | Issue #713 implementation/review |
| P07-F02    | Accept   | Non-blocking scope-discoverability improvement tracked in #714. | Issue #714 implementation/review |

## User-Feedback Issue Close-Out Checklist

| User-feedback issue | Readiness satisfied before testing                  | Formal session(s) linked       | All attempted tasks scored | Actionable findings decided | Accepted S1/S2 retested                            | Summary current | Issue may close                         |
| ------------------- | --------------------------------------------------- | ------------------------------ | -------------------------- | --------------------------- | -------------------------------------------------- | --------------- | --------------------------------------- |
| #601                | Deployed app recorded; exact URL/commit unavailable | `2026-09-24-P07-multi-role.md` | Yes                        | Yes                         | Not applicable; no accepted S1/S2 finding          | Yes             | Yes                                     |
| #602                | Deployed app recorded; exact URL/commit unavailable | `2026-09-24-P08-public.md`     | Yes                        | Yes; P08-F01 accepted       | No; #716 implementation and PUB-06 retest required | Yes             | No; accepted S2 retest remains required |
| #603                |                                                     |                                |                            |                             |                                                    |                 |                                         |
| #604                |                                                     |                                |                            |                             |                                                    |                 |                                         |
| #605                |                                                     |                                |                            |                             |                                                    |                 |                                         |
| #606                |                                                     |                                |                            |                             |                                                    |                 |                                         |
| #607                | Deployed API/docs and commit recorded; `S3-API-01` prepared | `2026-09-26-P09-api-consumer.md` | Yes | Yes; P09-F01 accepted, issue link pending | Not applicable; no accepted S1/S2 finding | Yes | No; follow-up issue link and unassisted PUB-05 retest pending |
| #612                |                                                     |                                |                            |                             |                                                    |                 |                                         |

## Remaining Concerns

- #601 is accepted with documented limitations: P07 completed the selected multi-role navigation tasks; two non-blocking S3 improvements are tracked in #713 and #714.
- #580 and #581 were already closed when this gate was finalised; this record notes their closed status and does not change either issue.
- #602 has one retained public-statistics session. P08-F01 is an accepted S2 player-comparison finding tracked by #716; #602 cannot close until implementation and PUB-06 retest are complete.
- #607 has one retained API-consumer session. P09-F01 is an accepted S3 browser/OpenAPI response-header visibility finding awaiting a Gitea bug link. PUB-05 also needs a short unassisted retest because bearer-token assistance was recorded during the task.

## Issue #601 Final Gate Result

**Accepted with documented limitations.**

P07 completed all six selected tasks across public/viewer, approved-submitter and reviewer/admin contexts without a recorded failure. `AUTH-04` and `SUB-01` were Partial because of two non-blocking S3 discoverability/wording findings. Both have an explicit accepted outcome and are tracked in #713 and #714 respectively. No S1/S2 finding was accepted, so no retest is required.

The linked implementation issues #580 and #581 were already closed. This gate records that status only; it does not perform or imply any further change to those issues.

## Evidence Integrity Checklist

- [ ] Every formal session uses `YYYY-MM-DD-PXX-ROLE.md`.
- [ ] Every attempted Task ID has its own Success / Partial / Failure outcome.
- [ ] Every finding links to a Task ID.
- [ ] S1–S4 is assigned by impact.
- [ ] Every S1/S2 or otherwise actionable finding has a final outcome before the relevant user-feedback issue closes.
- [ ] Accepted S1/S2 findings have retest evidence.
- [ ] Participant names are absent from Gitea issues and retained evidence.
- [ ] Passwords, tokens and API keys are absent from retained evidence.
- [ ] User-feedback issues are tracked independently from implementation closure; any `Cannot Begin Until` list is used only as testing readiness.
- [ ] All session links and implementation issue/PR links resolve.

## AI Declaration

The preceding Sprint 3 evidence scaffold was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
