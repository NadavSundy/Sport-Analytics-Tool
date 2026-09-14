# Sprint 2 User Testing Summary

> Complete this document from reviewed session evidence after #416, #417 and #418 are run. Do not invent results for tasks that have not been tested.

## Testing Scope

| Area                     | Tracking issue                 | Sessions completed | Task IDs covered                       | Status                                                                                                                                 |
| ------------------------ | ------------------------------ | -----------------: | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication / account | #416 / #417 / #418 as selected |                  0 | —                                      | Not started                                                                                                                            |
| Public / analyst         | #416                           |                  2 | PUB-01, PUB-02, PUB-03, PUB-04, PUB-05 | 2 formal sessions + 1 supplementary P03 evidence record; 5 findings resolved at retest 2026-09-11; other decisions/retests outstanding |
| Submission / batch       | #417                           |                  0 | —                                      | Not started                                                                                                                            |
| Review / administration  | #418                           |                  1 | REV-01, REV-02, REV-05, ADM-02         | Complete; S1 blocker F01/#463 fixed and successfully retested                                                                          |

AUTH-04 was selected for neither session. Both participants remained signed out
throughout, so the task had no starting state.

## Participants

| Participant ID | Role                     | Relevant experience                                                                                                                         | Session evidence             |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| P01            | Public / analyst         | Follows cricket closely and reads scorecards fluently. Comfortable in spreadsheets. Does not write code.                                    | `2026-09-10-P01-public.md`   |
| P02            | Public / analyst         | Has never watched a game of cricket. Uses websites and applications daily. No data-analysis experience. Unfamiliar with CSV, JSON and APIs. | `2026-09-10-P02-public.md`   |
| P03            | Public / analyst         | Demonstrates familiarity with cricket scorecards and conventions; further background was not recorded.                                      | `2026-09-07-P03-public.md`   |
| P04            | Reviewer / administrator | External participant who did not build the system; further background was not recorded.                                                     | `2026-09-10-P04-reviewer.md` |

P01 and P02 are external to the development team. Both reviewed and confirmed
the account of their own formal session before it was committed.

P03 is supplementary evidence reconstructed from a written feedback document
with screenshots. The source does not retain the standard task script, formal
Success / Partial / Failure outcomes, facilitator metadata or participant
confirmation. P03 is therefore included in the findings/decision evidence but
is not counted as an additional formal task attempt.

P04 is the external reviewer/administrator participant for #418. The initial
`REV-01` attempt failed because the deployed worker path had not progressed the
prepared batch into the review queue. That S1 finding became #463. After the
worker/Service Bus path was restored, P04 repeated `REV-01` successfully and
completed `REV-02`, `REV-05` and `ADM-02`.

The P01/P02 pairing was deliberate. P01 tests whether the platform serves
someone who knows the domain and wants to work with the data; P02 tests whether
it is intelligible to someone who does not. P03 independently reinforces several
cricket-reader findings, which is noted where it occurs.

## Task Outcomes

Record outcomes per Task ID rather than one result per participant/session.

| Task ID | Attempts | Success | Partial | Failure | Finding IDs                            |
| ------- | -------: | ------: | ------: | ------: | -------------------------------------- |
| PUB-01  |        2 |       2 |       0 |       0 | P01-F01 to P01-F08; P02-F01 to P02-F05 |
| PUB-02  |        2 |       1 |       1 |       0 | P01-F09 to P01-F15; P02-F06 to P02-F14 |
| PUB-03  |        2 |       0 |       2 |       0 | P01-F16 to P01-F19; P02-F15, P02-F16   |
| PUB-04  |        2 |       1 |       1 |       0 | P01-F20 to P01-F26; P02-F17 to P02-F22 |
| PUB-05  |        1 |       0 |       1 |       0 | P01-F27, P01-F28                       |
| REV-01  |        2 |       1 |       0 |       1 | P04-F01                                |
| REV-02  |        1 |       1 |       0 |       0 | —                                      |
| REV-05  |        1 |       1 |       0 |       0 | —                                      |
| ADM-02  |        1 |       1 |       0 |       0 | —                                      |

PUB-05 was not attempted by P02, who does not know what an API is and is not
building an application. The protocol permits selecting tasks appropriate to the
participant; the omission is recorded rather than scored.

No assistance was given during any task in either formal session.

P03 findings map to PUB-01 and PUB-02, but the source does not retain formal task
outcomes. P03 therefore does not increase the Attempts / Success / Partial /
Failure counts above.

## Findings

Fifty findings were recorded across the two formal sessions, with nine additional
findings recorded from the supplementary P03 evidence. The complete list, with
observations and context, is in the individual session records. Reproduced below
are every S1 and S2 finding and every finding already accepted.

| Finding ID                  | Session     | Task ID        | Finding                                                                                                   | Severity | Decision    | Gitea issue | Fix PR / commit                     | Retest result                                                             |
| --------------------------- | ----------- | -------------- | --------------------------------------------------------------------------------------------------------- | -------- | ----------- | ----------- | ----------------------------------- | ------------------------------------------------------------------------- |
| P02-F17                     | P02         | PUB-04         | Export silently truncates at 100 rows; the participant's file totals 132 runs against the 179 displayed   | S1       | Accept      | #467        |                                     | Outstanding                                                               |
| P04-F01                     | P04         | REV-01         | Reviewer workflow unavailable because staged batches remained `Stored` and never entered the review queue | S1       | Accept      | #463        | PR #464; #463 live acceptance       | Resolved — REV-01 Success 2026-09-13                                      |
| P01-F05                     | P01         | PUB-01         | Innings totals show runs only, with no wickets and no overs                                               | S2       | Defer       |             |                                     |                                                                           |
| P01-F06                     | P01         | PUB-01         | No dismissal information exists anywhere: no fall of wickets, no record of how any batter was out         | S2       | Defer       |             |                                     |                                                                           |
| P03-F06                     | P03         | PUB-02         | Player statistics do not show how a batter was dismissed                                                  | S2       | Defer       |             |                                     |                                                                           |
| P01-F15                     | P01         | PUB-02         | Players listing and an individual player page failed to load, recovering after approximately one minute   | S2       | Defer       |             |                                     |                                                                           |
| P01-F16                     | P01         | PUB-03         | A competition cannot be found by typing its exact name                                                    | S2       | Accept      | #469        |                                     | Outstanding                                                               |
| P01-F20 / P02-F20           | Both        | PUB-04         | The export contains no participant, team or competition names                                             | S2       | Accept      | #468        | PR #474 (merge 58e0a3e, 2026-09-11) | Resolved — facilitator retest against the deployed environment 2026-09-11 |
| P01-F27                     | P01         | PUB-05         | No API or Developers entry exists in the navigation or the footer                                         | S2       | Accept      | #475        |                                     | Outstanding                                                               |
| P01-F28                     | P01         | PUB-05         | API paths are listed with no base address, no authentication information and no examples                  | S2       | Defer       |             |                                     |                                                                           |
| P02-F05 / P02-F10           | P02         | PUB-01, PUB-02 | Domain vocabulary and statistical labels are presented with no explanation of what they measure           | S2       | Defer       |             |                                     |                                                                           |
| P02-F12                     | P02         | PUB-02         | The batters' runs do not sum to the innings total and nothing accounts for the difference                 | S2       | **Pending** |             |                                     |                                                                           |
| P01-F09 / P02-F06 / P03-F05 | P01/P02/P03 | PUB-02         | Player cards are not grouped by team and batting position/order is not shown clearly                      | S3       | Accept      | #475        |                                     | Outstanding                                                               |
| P03-F07                     | P03         | PUB-02         | Did-not-bat state is indistinguishable from a genuine zero-score innings                                  | S3       | Accept      | TBD         |                                     | Outstanding                                                               |
| P03-F08                     | P03         | PUB-02         | Not-out state is not communicated using conventional and accessible notation                              | S3       | Accept      | TBD         |                                     | Outstanding                                                               |
| P01-F12 / P02-F22           | Both        | PUB-02, PUB-04 | An uninterpretable flag is displayed on every delivery and exported on every row                          | S3       | Accept      | #475        |                                     | Outstanding                                                               |
| P01-F14                     | P01         | PUB-02         | Player pages carry no career totals, although the aggregates exist at the API under #285                  | S3       | Accept      | #476        |                                     | Outstanding                                                               |
| P01-F21                     | P01         | PUB-04         | The export's innings ordinal disagrees with the innings number displayed                                  | S3       | Accept      | #468        | PR #474 (merge 58e0a3e, 2026-09-11) | Outstanding                                                               |
| P01-F22                     | P01         | PUB-04         | Two exports from one fixture collide on filename and neither identifies its trace                         | S3       | Accept      | #468        | PR #474 (merge 58e0a3e, 2026-09-11) | Resolved — facilitator retest against the deployed environment 2026-09-11 |
| P01-F24 / P02-F18           | Both        | PUB-04         | No confirmation is given that a download has occurred                                                     | S3       | Accept      | #475        |                                     | Outstanding                                                               |
| P01-F23 / P02-F21           | Both        | PUB-04         | Inapplicable columns export as blank rather than zero                                                     | S4       | Accept      | #468        | PR #474 (merge 58e0a3e, 2026-09-11) | Resolved — facilitator retest against the deployed environment 2026-09-11 |

## Severity Summary

| Severity | Count | Accepted | Deferred | Rejected | Resolved after retest |
| -------- | ----: | -------: | -------: | -------: | --------------------: |
| S1       |     1 |        1 |        0 |        0 |                     0 |
| S2       |    12 |        4 |        7 |        0 |                     2 |
| S3       |    37 |       12 |       25 |        0 |                     1 |
| S4       |     9 |        2 |        7 |        0 |                     2 |

This table covers the P01, P02 and P03 findings only. P04 results are recorded
separately.

Counts include the nine supplementary P03 findings. P03 does not add a formal
task attempt, but its findings are still evaluated and traceable. Several
findings were reported independently by multiple participants and are counted
once in each evidence record; repeated findings appear once in the tables above
with all relevant IDs.

One S2 finding — P02-F12 — is deliberately left Pending and is not counted as
accepted, deferred or rejected. It is not included in the S2 accepted or deferred
figures, which is why that row sums to eleven rather than twelve.

No finding was rejected. Every deferred finding carries a written reason in its
session record.

## Integrated Changes

For each accepted finding, record why the change was made, the implementation evidence and the retest outcome.

| Finding ID                          | Decision / rationale                                                                                                                                                                                                                                       | Issue | PR / commit                         | Automated regression coverage                                                                                | Retest evidence                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| P02-F17                             | Accepted. The export does not fail or appear incomplete, so a user analysing the file obtains a wrong total with no reason to doubt it. Silently incorrect analytical output is acted upon rather than retried.                                            | #467  | Not yet implemented                 | Required: exported row count must equal displayed event count for an innings exceeding the maximum page size | Outstanding                                                                                     |
| P01-F16                             | Accepted. Competitions beyond the first page of an alphabetical list cannot be found by name, and the interface reports that they do not exist.                                                                                                            | #469  | Not yet implemented                 | Required: a competition beyond the first page must be findable by name                                       | Outstanding                                                                                     |
| P01-F20 / P02-F20                   | Accepted. Both participants independently reached the same conclusion: the exported file cannot be interpreted without the application open beside it.                                                                                                     | #468  | PR #474 (merge 58e0a3e, 2026-09-11) | To be confirmed                                                                                              | Resolved                                                                                        |
| P01-F21, P01-F22, P01-F23 / P02-F21 | Accepted alongside the above as part of the same export deficiency.                                                                                                                                                                                        | #468  | PR #474 (merge 58e0a3e, 2026-09-11) | To be confirmed                                                                                              | P01-F22, P01-F23 and P02-F21: Resolved, verified 2026-09-11; P01-F21: Outstanding, not retested |
| P01-F14                             | Accepted. The career, season and competition-wide aggregates already exist at the API under #285. The player page presents match-by-match figures and does not use them, so a participant asking for career totals was asking for something already built. | #476  | Not yet implemented                 | Required: the player page requests and renders the career aggregate                                          | Outstanding                                                                                     |
| P01-F09 / P02-F06 / P03-F05         | Accepted. P01/P02 could not read one team's players together because the cards are neither grouped by team nor in batting order; P03 independently requested batting position/order.                                                                       | #475  | Not yet implemented                 | To be confirmed                                                                                              | Outstanding                                                                                     |
| P03-F07 / P03-F08                   | Accepted. A cricket scorecard must distinguish `DNB`, a genuine zero-score innings and a not-out innings; these should be implemented together so batting participation/dismissal state is internally consistent and accessible.                           | TBD   | Not yet implemented                 | Required: DNB, 0 dismissed, 0* not out and non-zero not-out states render distinctly                         | Outstanding                                                                                     |
| P01-F12 / P02-F22                   | Accepted. The `runsNonBoundary` flag is displayed on every delivery and exported on every row, is effectively always the same value, and neither participant could interpret it.                                                                           | #475  | Not yet implemented                 | To be confirmed                                                                                              | Outstanding                                                                                     |
| P01-F24 / P02-F18                   | Accepted. P02 clicked the download and could not tell whether anything had happened.                                                                                                                                                                       | #475  | Not yet implemented                 | To be confirmed                                                                                              | Outstanding                                                                                     |
| P01-F27                             | Accepted. The participant searched the navigation and the footer for API information and found none; the only route to it is the site logo.                                                                                                                | #475  | Not yet implemented                 | To be confirmed                                                                                              | Outstanding                                                                                     |

## Deferred or Rejected Findings

Thirty-three findings were deferred. Each carries its individual reason in the
session record; they are grouped here by the reason for deferral.

| Finding ID                                                                      | Decision | Reason                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P01-F05, P01-F06, P01-F03, P03-F06, P03-F09                                     | Defer    | Additions to the cricket statistic/domain presentation rather than contained defects. Keep aligned with the domain/statistic catalogue decisions; P03-F09 also requires correct bowler-vs-team extras attribution. |
| P01-F07, P01-F11, P02-F01, P02-F05, P02-F10, P02-F11, P02-F13, P02-F16, P03-F02 | Defer    | Explanatory content/statistical presentation across the public views. The largest group in the set and the least contained; Sprint 3 work.                                                                         |
| P01-F13, P01-F19, P02-F14, P02-F15, P03-F01, P03-F04                            | Defer    | Features that do not exist yet — including team-level aggregation, in-fixture narrowing, highest-scorer summary and toss context — rather than defects in what does.                                               |
| P01-F10, P02-F04, P02-F07, P02-F09, P03-F03                                     | Defer    | Presentation and navigation changes affecting shared components. P03-F03 independently reinforces P02-F04's missing-venue finding.                                                                                 |
| P01-F01, P01-F02                                                                | Defer    | Browse and list improvements. A date filter and a team filter already provide workarounds, both of which the participant used successfully.                                                                        |
| P01-F04, P02-F02, P02-F03                                                       | Defer    | Require investigation before a decision can be made honestly. The missing competition name may be absent in the source data rather than dropped by the platform.                                                   |
| P01-F08, P01-F17, P01-F18, P02-F08                                              | Defer    | Cosmetic. No effect on task completion.                                                                                                                                                                            |
| P01-F25, P02-F19                                                                | Defer    | Folded into the wording review under #468 rather than fixed separately.                                                                                                                                            |
| P01-F15                                                                         | Defer    | Not reproducible on retry and no cause established. Monitor rather than guess at a fix.                                                                                                                            |
| P01-F26                                                                         | Defer    | Verified accurate. No dataset release has been published, so the message is correct. Raise with the owner of #294.                                                                                                 |
| P01-F28                                                                         | Defer    | Requires written API documentation. Larger than this sprint.                                                                                                                                                       |

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

3. **The platform cannot express a complete cricket scorecard.** P01-F05,
   P01-F06, P03-F06, P03-F07 and P03-F08. Innings totals carry runs but no
   wickets and no overs, dismissal state is not presented, and P03 additionally
   identified that `DNB`, a genuine zero and not-out must be distinguishable.
   The participant who follows cricket identified the original gap within a
   minute of opening his first fixture. Verified at the API during the original
   sessions: the innings metrics are `deliveryRuns`, `penaltyRuns` and
   `totalRuns` only.

4. **Derived figures are correct; their labels/presentation are not always
   explained.** P01 checked the arithmetic throughout and found it right —
   batting figures, bowling figures, strike rate, economy, extras and bowler
   credit all reconciled. P02 could not tell what most of the same figures
   measured, while P03 explicitly described one innings-summary value as not
   useful. P02-F05, P02-F10, P02-F11, P02-F13, P01-F07, P01-F11, P01-F12,
   P03-F02.

5. **The interface cannot be narrowed below a whole fixture.** Both participants
   wanted a subset — one bowler's over, one team's players — and neither could
   get it. Both said they would use the browser's find-in-page instead.
   P01-F19, P02-F15.

6. **Player and team pages present lists rather than summaries.** Neither team
   pages nor player pages carry aggregate figures. P01-F13, P01-F14, P02-F14.

7. **Reviewer testing exposed a deployment dependency that made the entire workflow disappear.** P04-F01 was an S1 failure on `REV-01`: the participant could not find the prepared submission because batches remained `Stored`. The accepted finding became #463. After the worker/Service Bus path was restored, P04 repeated the same task successfully and then completed evaluation, non-publication decision and trace/history tasks.

## Remaining Concerns

1. **#418 reviewer/administrator testing is complete; #417 still requires close-out in the consolidated summary.** #418 now has one external participant, a documented S1 finding, an accepted linked defect (#463), implementation evidence and a successful same-task retest. The submission/batch workstream remains the outstanding formal-user dependency for the overall Intermediate close-out.

2. **No accepted public/analyst finding has yet been verified in this summary.** Five issues were raised from the public sessions — #467, #468, #469, #475 and #476. In contrast, the #418 S1 finding P04-F01 has been implemented through #463 and successfully retested. Public/analyst retests remain a separate #416 close-out requirement.

3. **P01-F15 could not be reproduced.** The Players listing and an individual
   player page failed with "Failed to fetch" and recovered unaided after
   approximately one minute. A retry on 11 September returned normally. It is
   recorded as observed once and not currently reproducible, and no cause is
   claimed.

4. **P02-F12 is unresolved.** The batters' runs sum to 173 against an innings
   total of 179. The difference is consistent with extras, which the innings
   total includes and the player cards do not display, but this has not been
   verified.

5. **P03 adds two accepted scorecard-state findings with no implementation issue yet.**
   P03-F07 and P03-F08 should be implemented together so `DNB`, a genuine duck,
   and not-out states are represented consistently. Create one linked issue and
   replace the `TBD` references in both the P03 record and this summary.

6. **The deployed environment reports no build identity.** `GET /api/v1/health`
   returns status, service name and a timestamp, with no version, commit or
   release field. The commit under test for these sessions was recovered from the
   deployment run rather than from the environment. The facilitator checklist
   requires recording the commit under test; at present it cannot be read back
   afterwards.

7. **No dataset release has been published.** `GET /api/v1/dataset-releases`
   returns an empty collection, so the Downloads section is empty and the "use or
   export a dataset" path in PUB-04 is unavailable to users. The feature shipped
   under #294; nothing has been released through it.

## Sprint 2 Conclusion

Complete after the formal testing round. Summarise whether representative users could complete the required workflows, the most consequential changes integrated from feedback, and any known usability risk carried forward.

Public and analyst formal testing is complete for #416, with P03 retained as supplementary public/analyst feedback evidence. Reviewer/administrator formal testing is now complete for #418. The #418 session produced one accepted S1 defect (#463), and the same reviewer task was repeated successfully after the fix. Submission/batch #417 evidence still needs to be consolidated into this summary.

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

Across the reviewer/admin workstream, P04 first failed `REV-01` because the prepared batch never reached the queue. That finding was accepted as S1, implemented under #463, and then verified when P04 repeated `REV-01` successfully and completed `REV-02`, `REV-05` and `ADM-02`. No additional actionable reviewer finding was recorded.

Twenty findings are accepted and thirty-nine deferred across the reviewed public evidence plus the #418 reviewer session, each with a written reason. None was rejected. One public finding remains deliberately held open pending verification.

P03 independently reinforces the existing batting-order, dismissal-context and
venue findings, and adds accepted work to distinguish did-not-bat and not-out
states correctly. These supplementary findings do not alter the formal task
success/partial/failure totals.

Usability risk carried forward: no accepted public/analyst finding has yet been verified by retest in this summary. The #418 reviewer blocker is resolved and retested, but until #467 is fixed and retested, any figure a user derives from an exported innings of more than one hundred deliveries is wrong.

## AI Declaration

The preceding template was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

The P03 supplementary-evidence integration and summary update were reviewed and
edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].

This summary was compiled from the two reviewed session records with the
assistance of Claude-Web[Claude Opus 5], as permitted by the AI-assisted analysis
provision of `docs/testing/user-testing-protocol.md`. Findings P01-F16, P01-F20
to P01-F23, P02-F17, P02-F20 and P02-F21, and the statements about the innings
metrics, the health endpoint and the dataset releases, were verified by the
facilitator against the deployed API. Severity assignments and decisions are the
team's, not the tool's.

The P04 reviewer-session integration and #418 close-out update were reviewed
and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
