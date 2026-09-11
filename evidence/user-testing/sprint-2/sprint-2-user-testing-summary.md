# Sprint 2 User Testing Summary

> Complete this document from reviewed session evidence after #416, #417 and #418 are run. Do not invent results for tasks that have not been tested.

## Testing Scope

| Area                     | Tracking issue                 | Sessions completed | Task IDs covered | Status      |
| ------------------------ | ------------------------------ | -----------------: | ---------------- | ----------- |
| Authentication / account | #416 / #417 / #418 as selected |                  0 | —                | Not started |
| Public / analyst         | #416                           |                  2 | PUB-01, PUB-02, PUB-03, PUB-04, PUB-05 | Sessions complete; decisions and retests outstanding |
| Submission / batch       | #417                           |                  0 | —                | Not started |
| Review / administration  | #418                           |                  0 | —                | Not started |

AUTH-04 was selected for neither session. Both participants remained signed out
throughout, so the task had no starting state.

## Participants

| Participant ID | Role | Relevant experience | Session evidence |
| -------------- | ---- | ------------------- | ---------------- |
| P01 | Public / analyst | Follows cricket closely and reads scorecards fluently. Comfortable in spreadsheets. Does not write code. | `2026-09-10-P01-public.md` |
| P02 | Public / analyst | Has never watched a game of cricket. Uses websites and applications daily. No data-analysis experience. Unfamiliar with CSV, JSON and APIs. | `2026-09-10-P02-public.md` |

Both participants are external to the development team. Both reviewed and
confirmed the account of their own session before it was committed.

The pairing was deliberate. P01 tests whether the platform serves someone who
knows the domain and wants to work with the data; P02 tests whether it is
intelligible to someone who does not. Several findings were reported
independently by both, which is noted where it occurs.

## Task Outcomes

Record outcomes per Task ID rather than one result per participant/session.

| Task ID | Attempts | Success | Partial | Failure | Finding IDs |
| ------- | -------: | ------: | ------: | ------: | ----------- |
| PUB-01 | 2 | 2 | 0 | 0 | P01-F01 to P01-F08; P02-F01 to P02-F05 |
| PUB-02 | 2 | 1 | 1 | 0 | P01-F09 to P01-F15; P02-F06 to P02-F14 |
| PUB-03 | 2 | 0 | 2 | 0 | P01-F16 to P01-F19; P02-F15, P02-F16 |
| PUB-04 | 2 | 1 | 1 | 0 | P01-F20 to P01-F26; P02-F17 to P02-F22 |
| PUB-05 | 1 | 0 | 1 | 0 | P01-F27, P01-F28 |

PUB-05 was not attempted by P02, who does not know what an API is and is not
building an application. The protocol permits selecting tasks appropriate to the
participant; the omission is recorded rather than scored.

No assistance was given during any task in either session.

## Findings

Fifty findings were recorded across the two sessions. The complete list, with
observations and context, is in the individual session records. Reproduced below
are every S1 and S2 finding and every finding already accepted.

| Finding ID | Session | Task ID | Finding | Severity | Decision | Gitea issue | Fix PR / commit | Retest result |
| ---------- | ------- | ------- | ------- | -------- | -------- | ----------- | --------------- | ------------- |
| P02-F17 | P02 | PUB-04 | Export silently truncates at 100 rows; the participant's file totals 132 runs against the 179 displayed | S1 | Accept | #467 | | Outstanding |
| P01-F05 | P01 | PUB-01 | Innings totals show runs only, with no wickets and no overs | S2 | Defer | | | |
| P01-F06 | P01 | PUB-01 | No dismissal information exists anywhere: no fall of wickets, no record of how any batter was out | S2 | Defer | | | |
| P01-F15 | P01 | PUB-02 | Players listing and an individual player page failed to load, recovering after approximately one minute | S2 | Defer | | | |
| P01-F16 | P01 | PUB-03 | A competition cannot be found by typing its exact name | S2 | Accept | #469 | | Outstanding |
| P01-F20 / P02-F20 | Both | PUB-04 | The export contains no participant, team or competition names | S2 | Accept | #468 | | Outstanding |
| P01-F27 | P01 | PUB-05 | No API or Developers entry exists in the navigation or the footer | S2 | Accept | #475 | | Outstanding |
| P01-F28 | P01 | PUB-05 | API paths are listed with no base address, no authentication information and no examples | S2 | Defer | | | |
| P02-F05 / P02-F10 | P02 | PUB-01, PUB-02 | Domain vocabulary and statistical labels are presented with no explanation of what they measure | S2 | Defer | | | |
| P02-F12 | P02 | PUB-02 | The batters' runs do not sum to the innings total and nothing accounts for the difference | S2 | **Pending** | | | |
| P01-F09 / P02-F06 | Both | PUB-02 | Player cards are not grouped by team and are not in batting order | S3 | Accept | #475 | | Outstanding |
| P01-F12 / P02-F22 | Both | PUB-02, PUB-04 | An uninterpretable flag is displayed on every delivery and exported on every row | S3 | Accept | #475 | | Outstanding |
| P01-F14 | P01 | PUB-02 | Player pages carry no career totals, although the aggregates exist at the API under #285 | S3 | Accept | #476 | | Outstanding |
| P01-F21 | P01 | PUB-04 | The export's innings ordinal disagrees with the innings number displayed | S3 | Accept | #468 | | |
| P01-F22 | P01 | PUB-04 | Two exports from one fixture collide on filename and neither identifies its trace | S3 | Accept | #468 | | |
| P01-F24 / P02-F18 | Both | PUB-04 | No confirmation is given that a download has occurred | S3 | Accept | #475 | | Outstanding |
| P01-F23 / P02-F21 | Both | PUB-04 | Inapplicable columns export as blank rather than zero | S4 | Accept | #468 | | |

## Severity Summary

| Severity | Count | Accepted | Deferred | Rejected | Resolved after retest |
| -------- | ----: | -------: | -------: | -------: | --------------------: |
| S1       |     1 |        1 |        0 |        0 |                     0 |
| S2       |    11 |        4 |        6 |        0 |                     0 |
| S3       |    31 |        9 |       22 |        0 |                     0 |
| S4       |     7 |        2 |        5 |        0 |                     0 |

Counts are of findings as recorded per session. Several findings were reported
independently by both participants and are counted once in each session record;
they appear once in the tables above, identified by both IDs.

One S2 finding — P02-F12 — is deliberately left Pending and is not counted as
accepted, deferred or rejected. It is not included in the S2 accepted or deferred
figures, which is why that row sums to ten rather than eleven.

No finding was rejected. Every deferred finding carries a written reason in its
session record.

## Integrated Changes

For each accepted finding, record why the change was made, the implementation evidence and the retest outcome.

| Finding ID | Decision / rationale | Issue | PR / commit | Automated regression coverage | Retest evidence |
| ---------- | -------------------- | ----- | ----------- | ----------------------------- | --------------- |
| P02-F17 | Accepted. The export does not fail or appear incomplete, so a user analysing the file obtains a wrong total with no reason to doubt it. Silently incorrect analytical output is acted upon rather than retried. | #467 | Not yet implemented | Required: exported row count must equal displayed event count for an innings exceeding the maximum page size | Outstanding |
| P01-F16 | Accepted. Competitions beyond the first page of an alphabetical list cannot be found by name, and the interface reports that they do not exist. | #469 | Not yet implemented | Required: a competition beyond the first page must be findable by name | Outstanding |
| P01-F20 / P02-F20 | Accepted. Both participants independently reached the same conclusion: the exported file cannot be interpreted without the application open beside it. | #468 | In progress on `fix/468-readable-event-exports` | To be confirmed | Outstanding |
| P01-F21, P01-F22, P01-F23 / P02-F21 | Accepted alongside the above as part of the same export deficiency. | #468 | In progress on `fix/468-readable-event-exports` | To be confirmed | Outstanding |
| P01-F14 | Accepted. The career, season and competition-wide aggregates already exist at the API under #285. The player page presents match-by-match figures and does not use them, so a participant asking for career totals was asking for something already built. | #476 | Not yet implemented | Required: the player page requests and renders the career aggregate | Outstanding |
| P01-F09 / P02-F06 | Accepted. Both participants independently could not read one team's players together, because the cards are neither grouped by team nor in batting order. | #475 | Not yet implemented | To be confirmed | Outstanding |
| P01-F12 / P02-F22 | Accepted. The `runsNonBoundary` flag is displayed on every delivery and exported on every row, is effectively always the same value, and neither participant could interpret it. | #475 | Not yet implemented | To be confirmed | Outstanding |
| P01-F24 / P02-F18 | Accepted. P02 clicked the download and could not tell whether anything had happened. | #475 | Not yet implemented | To be confirmed | Outstanding |
| P01-F27 | Accepted. The participant searched the navigation and the footer for API information and found none; the only route to it is the site logo. | #475 | Not yet implemented | To be confirmed | Outstanding |

## Deferred or Rejected Findings

Thirty-three findings were deferred. Each carries its individual reason in the
session record; they are grouped here by the reason for deferral.

| Finding ID | Decision | Reason |
| ---------- | -------- | ------ |
| P01-F05, P01-F06, P01-F03 | Defer | Additions to the domain model rather than defects. Section 7 of the domain definition is draft pending stakeholder sign-off under #37, and these figures cannot be added before that is settled. |
| P01-F07, P01-F11, P02-F01, P02-F05, P02-F10, P02-F11, P02-F13, P02-F16 | Defer | Explanatory content across every page. The largest group in the set and the least contained; Sprint 3 work. |
| P01-F13, P01-F19, P02-F14, P02-F15 | Defer | Features that do not exist yet — team-level aggregation and in-fixture narrowing — rather than defects in what does. |
| P01-F10, P02-F04, P02-F07, P02-F09 | Defer | Presentation and navigation changes affecting shared components. |
| P01-F01, P01-F02 | Defer | Browse and list improvements. A date filter and a team filter already provide workarounds, both of which the participant used successfully. |
| P01-F04, P02-F02, P02-F03 | Defer | Require investigation before a decision can be made honestly. The missing competition name may be absent in the source data rather than dropped by the platform. |
| P01-F08, P01-F17, P01-F18, P02-F08 | Defer | Cosmetic. No effect on task completion. |
| P01-F25, P02-F19 | Defer | Folded into the wording review under #468 rather than fixed separately. |
| P01-F15 | Defer | Not reproducible on retry and no cause established. Monitor rather than guess at a fix. |
| P01-F26 | Defer | Verified accurate. No dataset release has been published, so the message is correct. Raise with the owner of #294. |
| P01-F28 | Defer | Requires written API documentation. Larger than this sprint. |

No finding was rejected. One finding, P02-F12, is deliberately held Pending; see
Remaining Concerns.

## Repeated Themes

Summarise themes only after comparing the underlying task-level evidence. Keep links/IDs back to the original findings.

1. **The export is not usable outside the application.** Both participants
   reached this independently and from opposite directions — P01 because he
   wanted to work with the data in a spreadsheet and could not identify anyone in
   it, P02 because the file was unintelligible to her entirely. P01-F20 /
   P02-F20, P01-F21 to P01-F23, P02-F21, and the truncation at P02-F17.

2. **Pagination is not followed by the frontend, and it appears on more than one
   surface.** P02-F17 is the export stopping at 100 of 125 events; P01-F16 is the
   competition filter never seeing past the first 50 of an alphabetical list.
   Same root cause, two unrelated features. Any paged list in the application
   should be treated as suspect until checked.

3. **The platform cannot express a cricket score.** P01-F05 and P01-F06. Innings
   totals carry runs but no wickets and no overs, and no dismissal information
   exists anywhere. The participant who follows cricket identified this within a
   minute of opening his first fixture. Verified at the API: the innings metrics
   are `deliveryRuns`, `penaltyRuns` and `totalRuns` only.

4. **Derived figures are correct; their labels are not explained.** P01 checked
   the arithmetic throughout and found it right — batting figures, bowling
   figures, strike rate, economy, extras and bowler credit all reconciled. P02
   could not tell what most of the same figures measured. P02-F05, P02-F10,
   P02-F11, P02-F13, P01-F07, P01-F11, P01-F12.

5. **The interface cannot be narrowed below a whole fixture.** Both participants
   wanted a subset — one bowler's over, one team's players — and neither could
   get it. Both said they would use the browser's find-in-page instead.
   P01-F19, P02-F15.

6. **Player and team pages present lists rather than summaries.** Neither team
   pages nor player pages carry aggregate figures. P01-F13, P01-F14, P02-F14.

## Remaining Concerns

1. **#417 and #418 have not started and have no owner.** The Sprint 2 milestone
   is 15 September. Both require substantial preparation before a session can
   run: approved submitter and reviewer accounts, a writable fixture, valid
   season and back-catalogue packages, batch references in specific states, a
   staged batch, a deliberately ambiguous reference, a publishable batch and a
   returnable one. That preparation, not participant recruitment, is the
   constraint.

2. **No accepted finding has been implemented.** Five issues were raised from
   these sessions — #467, #468, #469, #475 and #476 — and only #468 has work in
   progress. Every retest remains outstanding, and #416 requires at least one
   accepted finding to be integrated and verified before Sprint 2 closes on
   15 September.

3. **P01-F15 could not be reproduced.** The Players listing and an individual
   player page failed with "Failed to fetch" and recovered unaided after
   approximately one minute. A retry on 11 September returned normally. It is
   recorded as observed once and not currently reproducible, and no cause is
   claimed.

4. **P02-F12 is unresolved.** The batters' runs sum to 173 against an innings
   total of 179. The difference is consistent with extras, which the innings
   total includes and the player cards do not display, but this has not been
   verified.

5. **The deployed environment reports no build identity.** `GET /api/v1/health`
   returns status, service name and a timestamp, with no version, commit or
   release field. The commit under test for these sessions was recovered from the
   deployment run rather than from the environment. The facilitator checklist
   requires recording the commit under test; at present it cannot be read back
   afterwards.

6. **No dataset release has been published.** `GET /api/v1/dataset-releases`
   returns an empty collection, so the Downloads section is empty and the "use or
   export a dataset" path in PUB-04 is unavailable to users. The feature shipped
   under #294; nothing has been released through it.

## Sprint 2 Conclusion

Complete after the formal testing round. Summarise whether representative users could complete the required workflows, the most consequential changes integrated from feedback, and any known usability risk carried forward.

Public and analyst testing is complete for #416. Submission, batch, review and
administration testing has not begun.

**Both participants could find published cricket data. Neither could reliably
interpret it or take it away.** Every PUB-01 attempt succeeded: both participants
reached a fixture of their choosing and read its result correctly, including one
with no knowledge of the sport. No PUB-03 attempt succeeded: neither participant
could narrow the information to the part they wanted. PUB-04 produced a file in
both cases, but one file was silently missing a fifth of its content and neither
contained a single name.

The most consequential finding is P02-F17. A participant exported an innings and
received a file totalling 132 runs where the page showed 179, with no warning
anywhere. Silently incorrect analytical output is the most damaging failure this
product can produce, because it is acted upon rather than retried. It is raised
as #467 and a retest is required.

The most encouraging finding is that the derivation is correct. The participant
who reads scorecards fluently checked the figures himself and found them right
throughout — batting, bowling, strike rate, economy, extras and bowler credit all
reconciled against his own arithmetic, and he confirmed unprompted that nine of
ten wickets were credited to bowlers with the run out correctly uncredited. The
platform computes what it claims to compute. What it does not yet do is explain
those figures to a reader, express them as a cricket score, or let anyone take
them away intact.

Sixteen findings were accepted and thirty-three deferred, each with a written
reason. None was rejected. One is deliberately held open pending verification.

Usability risk carried forward: no accepted finding has yet been implemented or
retested. Until #467 is fixed and retested, any figure a user derives from an
exported innings of more than one hundred deliveries is wrong.

## AI Declaration

The preceding template was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

This summary was compiled from the two reviewed session records with the
assistance of Claude-Web[Claude Opus 5], as permitted by the AI-assisted analysis
provision of `docs/testing/user-testing-protocol.md`. Findings P01-F16, P01-F20
to P01-F23, P02-F17, P02-F20 and P02-F21, and the statements about the innings
metrics, the health endpoint and the dataset releases, were verified by the
facilitator against the deployed API. Severity assignments and decisions are the
team's, not the tool's.
