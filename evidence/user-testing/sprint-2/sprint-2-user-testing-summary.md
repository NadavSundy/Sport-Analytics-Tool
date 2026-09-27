# Sprint 2 User Testing Summary

> Complete this document from reviewed session evidence after #416, #417 and #418 are run. Do not invent results for tasks that have not been tested.

## Testing Scope

| Area                     | Tracking issue                 | Sessions completed | Task IDs covered                                                                 | Status                                                                                       |
| ------------------------ | ------------------------------ | -----------------: | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Authentication / account | #416 / #417 / #418 as selected |                  2 | AUTH-01, AUTH-02                                                                 | #417-selected authentication/access tasks complete across P05 and P06                        |
| Public / analyst         | #416                           |                  2 | PUB-01, PUB-02, PUB-03, PUB-04, PUB-05                                           | 2 formal sessions + 1 supplementary P03 evidence record; other decisions/retests outstanding |
| Submission / batch       | #417                           |                  2 | AUTH-01, AUTH-02, SUB-01, SUB-02, SUB-03, SUB-04, BAT-01, BAT-03, BAT-04, BAT-05 | 2 formal sessions complete; P05 accepted fixes retested; P06 decisions/issues outstanding    |
| Review / administration  | #418                           |                  1 | REV-01, REV-02, REV-05, ADM-02                                                   | Complete; S1 blocker F01/#463 fixed and successfully retested                                |

AUTH-04 was selected for neither public/analyst session. Both public participants remained signed out throughout, so the task had no starting state.

## Participants

| Participant ID | Role                     | Relevant experience                                                                                                                         | Session evidence              |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| P01            | Public / analyst         | Follows cricket closely and reads scorecards fluently. Comfortable in spreadsheets. Does not write code.                                    | `2026-09-10-P01-public.md`    |
| P02            | Public / analyst         | Has never watched a game of cricket. Uses websites and applications daily. No data-analysis experience. Unfamiliar with CSV, JSON and APIs. | `2026-09-10-P02-public.md`    |
| P03            | Public / analyst         | Demonstrates familiarity with cricket scorecards and conventions; further background was not recorded.                                      | `2026-09-07-P03-public.md`    |
| P04            | Reviewer / administrator | External participant who did not build the system; further background was not recorded.                                                     | `2026-09-10-P04-reviewer.md`  |
| P05            | Submitter                | Medical student with high general technical confidence; unfamiliar with this system.                                                        | `2026-09-11-P05-submitter.md` |
| P06            | Submitter                | External participant who did not build the system; further background was not recorded.                                                     | `2026-09-15-P06-submitter.md` |

P01 and P02 are external to the development team. Both reviewed and confirmed the account of their own formal public/analyst session before it was committed.

P03 is supplementary evidence reconstructed from a written feedback document with screenshots. The source does not retain the standard task script, formal Success / Partial / Failure outcomes, facilitator metadata or participant confirmation. P03 is therefore included in the findings/decision evidence but is not counted as an additional formal task attempt.

P04 is the external reviewer/administrator participant for #418. The initial `REV-01` attempt failed because the deployed worker path had not progressed the prepared batch into the review queue. That S1 finding became #463. After the worker/Service Bus path was restored, P04 repeated `REV-01` successfully and completed `REV-02`, `REV-05` and `ADM-02`.

P05 and P06 are the two external submitter participants for #417. P05 exposed terminology, validation, identifier and scope-request problems. P06 repeated the same workstream after those changes and verified improvement in terminology, additional-scope discovery, season-upload messaging and batch rejection feedback, while also identifying a separate blocker around creating a completely new fixture.

The P01/P02 pairing was deliberate. P01 tests whether the platform serves someone who knows the domain and wants to work with the data; P02 tests whether it is intelligible to someone who does not. P03 independently reinforces several cricket-reader findings, which is noted where it occurs.

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
| AUTH-01 |        2 |       2 |       0 |       0 | —                                      |
| AUTH-02 |        2 |       1 |       1 |       0 | P05-F04; P06-F02, P06-F03              |
| SUB-01  |        2 |       2 |       0 |       0 | P05-F05                                |
| SUB-02  |        2 |       0 |       0 |       2 | P05-F03; P06-F01, P06-F02              |
| SUB-03  |        1 |       0 |       1 |       0 | P05-F02                                |
| SUB-04  |        1 |       0 |       1 |       0 | P05-F02                                |
| BAT-01  |        2 |       1 |       1 |       0 | P05-F01, P05-F05; P06-F04              |
| BAT-03  |        2 |       2 |       0 |       0 | P05-F05                                |
| BAT-04  |        1 |       1 |       0 |       0 | —                                      |
| BAT-05  |        2 |       2 |       0 |       0 | —                                      |

PUB-05 was not attempted by P02, who does not know what an API is and is not building an application. The protocol permits selecting tasks appropriate to the participant; the omission is recorded rather than scored.

P03 findings map to PUB-01 and PUB-02, but the source does not retain formal task outcomes. P03 therefore does not increase the Attempts / Success / Partial / Failure counts above.

For #417, P05 did not attempt BAT-04. P06 did not attempt SUB-03 or SUB-04 because the single-fixture workflow was blocked earlier at SUB-02. Those omissions are recorded rather than scored.

No facilitator coaching was given during the P01/P02 public sessions or the P05/P06 submitter sessions.

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

### Submission / batch (#417) findings

| Finding ID | Session | Task ID              | Finding                                                                                                            | Severity | Decision    | Gitea issue | Retest result                                  |
| ---------- | ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- | ----------- | ----------- | ---------------------------------------------- |
| P05-F01    | P05     | BAT-01               | Season versus batch terminology was unclear                                                                        | S3       | Accept      | #498        | Verified improved by P06                       |
| P05-F02    | P05     | SUB-03, SUB-04       | Validation errors were too technical and code-like                                                                 | S2       | Accept      | #499        | Partially verified by P06 batch rejection path |
| P05-F03    | P05     | SUB-02               | Guided submission exposed or required internal database identifiers                                                | S2       | Accept      | #500        | Not verified; P06 was blocked earlier          |
| P05-F04    | P05     | AUTH-02              | Approved submitter could not request additional competition scope                                                  | S2       | Accept      | #501, #519  | Verified improved by P06                       |
| P05-F05    | P05     | SUB-01/BAT-01/BAT-03 | Submission area did not clearly explain receipt, processing state or next steps                                    | S3       | Accept      | #498, #520  | Verified improved for season/batch by P06      |
| P06-F01    | P06     | SUB-02               | Guided single-fixture workflow has no clear path to submit a completely new fixture; it only selects existing ones | S2       | **Pending** |             | Outstanding                                    |
| P06-F02    | P06     | AUTH-02, SUB-02      | Large competition and fixture selectors need search/filtering                                                      | S3       | **Pending** |             | Outstanding                                    |
| P06-F03    | P06     | AUTH-02              | Existing competition scopes should be shown where additional scope is requested                                    | S3       | **Pending** |             | Outstanding                                    |
| P06-F04    | P06     | BAT-01               | Upload workflow depends on pre-existing competition scope/context                                                  | S3       | **Pending** |             | Outstanding                                    |

P05's five accepted findings were linked to implementation work before P06 ran. P06 provides external retest evidence for four of those findings, with P05-F03 remaining unverified because the P06 single-fixture task was blocked before identifier resolution could be exercised.

The four P06 findings remain Pending until the team records an explicit Accept / Defer / Reject decision with a reason.

## Severity Summary

| Severity | Count | Accepted | Deferred | Rejected | Resolved after retest |
| -------- | ----: | -------: | -------: | -------: | --------------------: |
| S1       |     1 |        1 |        0 |        0 |                     0 |
| S2       |    12 |        4 |        7 |        0 |                     2 |
| S3       |    37 |       12 |       25 |        0 |                     1 |
| S4       |     9 |        2 |        7 |        0 |                     2 |

This table covers the P01, P02 and P03 public/analyst findings only. P04 reviewer findings and P05/P06 submission/batch findings are recorded separately.

### Submission / batch (#417) severity summary

| Severity | Count | Accepted | Deferred | Rejected | Pending | Resolved after retest |
| -------- | ----: | -------: | -------: | -------: | ------: | --------------------: |
| S1       |     0 |        0 |        0 |        0 |       0 |                     0 |
| S2       |     4 |        3 |        0 |        0 |       1 |                     1 |
| S3       |     5 |        2 |        0 |        0 |       3 |                     2 |
| S4       |     0 |        0 |        0 |        0 |       0 |                     0 |

The P05 findings are accepted and linked to implementation issues. The P06 findings are not counted as accepted, deferred or rejected until the team records decisions.

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

### Submission / batch (#417) integrated changes

| Finding ID | Decision / rationale                                                                                 | Issue      | Implementation evidence                                          | Retest evidence                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| P05-F01    | Accepted because unclear ingestion terminology interfered with a core upload choice.                 | #498       | Submission terminology and next-step copy updated before P06.    | P06 said Single fixture, Season and Back catalogue were clear and easy to find.                                   |
| P05-F02    | Accepted because validation recovery must be understandable without reading code-like errors.        | #499       | Plain-language validation guidance implemented before P06.       | P06 clearly understood the tested rejected-batch error; exact single-fixture validation path remains unverified.  |
| P05-F03    | Accepted because guided submitters should not need internal database identifiers.                    | #500       | Readable-name resolution implemented before P06.                 | Not verified because P06 was blocked earlier by the new-fixture workflow.                                         |
| P05-F04    | Accepted because an approved submitter needs an in-product way to request another competition scope. | #501, #519 | Additional-scope request workflow/modal implemented before P06.  | P06 found the request path easily.                                                                                |
| P05-F05    | Accepted because users need clear receipt, processing-state and next-step feedback.                  | #498, #520 | Receipt/next-step copy and state refresh implemented before P06. | P06 said the season-upload success message was clear and found the resulting submission state without assistance. |

At least one accepted #417 finding was therefore integrated before Sprint 2 close-out and externally retested. P05-F01, P05-F04 and the season/batch portion of P05-F05 were verified improved by P06; P05-F02 was partially verified; P05-F03 remains unverified.

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

8. **The submitter workflow improved materially between P05 and P06.** P05 could not clearly distinguish season/batch terminology, could not find an additional-scope request, and found receipt/error feedback unclear. After #498, #499, #501/#519 and #520, P06 described the upload modes, access-request path, success message and tested rejection feedback as clear.

9. **Creating a genuinely new fixture remains a blocking gap.** P06 could find the single-fixture workflow but could only select an existing fixture, so SUB-02 failed and SUB-03/SUB-04 could not be exercised. The same session also identified search/filtering needs for large fixture and competition selectors.

## Remaining Concerns

1. **#417 formal submitter testing is complete, but P06 decisions still need team close-out.** Two external submitter sessions are now recorded. P05 produced five accepted findings, implementation evidence and cross-session retest evidence from P06. P06 produced four new findings, including the S2 new-fixture blocker P06-F01; those four findings still require explicit Accept / Defer / Reject decisions and issue links where applicable.

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

Public and analyst formal testing is complete for #416, with P03 retained as supplementary public/analyst feedback evidence. Reviewer/administrator formal testing is complete for #418. Submission/batch formal testing is now also complete for #417 with two external submitter sessions, P05 and P06. P05's accepted findings were implemented before P06, and P06 supplied external retest evidence for the terminology, scope-request, receipt/next-step and tested rejection-feedback improvements.

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

Across the submission/batch workstream, P05 exposed five issues in terminology, validation feedback, identifier handling, scope requests and next-step communication. All five were accepted and linked to implementation work. P06 then found the revised upload modes and messages clear and successfully completed season upload, status/rejection interpretation and report retrieval. The main remaining #417 risk is P06-F01: the guided single-fixture flow still provides no clear way to submit a completely new fixture, which blocked the intended new-fixture task and prevented the follow-on invalid/recovery tasks from being exercised.

Across the reviewer/admin workstream, P04 first failed `REV-01` because the prepared batch never reached the queue. That finding was accepted as S1, implemented under #463, and then verified when P04 repeated `REV-01` successfully and completed `REV-02`, `REV-05` and `ADM-02`. No additional actionable reviewer finding was recorded.

Twenty-five findings are accepted and thirty-nine deferred across the reviewed public evidence plus the #417 and #418 formal sessions. None was rejected. Five findings remain Pending: public finding P02-F12 and the four P06 submission/batch findings.

P03 independently reinforces the existing batting-order, dismissal-context and
venue findings, and adds accepted work to distinguish did-not-bat and not-out
states correctly. These supplementary findings do not alter the formal task
success/partial/failure totals.

Usability risk carried forward: the #418 reviewer blocker is resolved and retested, and #417 now has successful cross-session retest evidence for several accepted P05 findings. The remaining #417 blocker is the lack of a clear guided path for submitting a completely new fixture. Separately, until #467 is fixed and retested, any figure a user derives from an exported innings of more than one hundred deliveries is wrong.

## AI Declaration

Severity assignments and pre-existing Accept / Defer decisions were retained from the reviewed evidence. The four P06 findings remain Pending rather than having decisions invented by an AI tool.

The preceding document was generated with the assistance of the following: Claude-Web[Claude Opus 5].

The preceding document was edited with the assistance of the following: ChatGPT-Web[GPT-5.6 Sol].
