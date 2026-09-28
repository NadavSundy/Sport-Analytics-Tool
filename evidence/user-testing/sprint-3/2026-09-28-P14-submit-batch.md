# P14 — Season and Multi-Season Back-Catalogue User Testing

## Session details

| Field                        | Value                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| User-feedback issue          | #604 — Season and multi-season back-catalogue ingestion    |
| Scenario                     | `S3-BATCH-01`                                              |
| Date                         | 2026-09-28                                                 |
| Participant                  | P14 (anonymous)                                            |
| Participant role             | Approved submitter; reviewer/admin workflow where required |
| Environment                  | `https://sport-analytics-tool-web.pages.dev/`              |
| Browser/device               | Desktop browser — exact browser/device not recorded        |
| Coaching                     | No coaching recorded                                       |
| Linked implementation issues | #586; #587; #588; #589                                     |

> **Privacy note:** The application report displayed the submitter's real account name. This evidence uses only P14 and does not reproduce the participant's name.

## 1. Test inputs

| Task   | Package                                                        | Purpose                                        |
| ------ | -------------------------------------------------------------- | ---------------------------------------------- |
| BAT-01 | `BAT-01-season-acc-womens-premier-cup-2026.json`               | Normal Season upload                           |
| BAT-02 | `BAT-02-back-catalogue-acc-mens-challenger-cup-2024-2026.json` | Multi-season Back Catalogue upload             |
| BAT-04 | `BAT-04-invalid-acc-womens-premier-cup-2026.json`              | Invalid package for failure/correction testing |

Competitions available to the participant:

- Asian Cricket Council Women's Premier Cup
- Asian Cricket Council Men's Challenger Cup

---

# 2. Task results

## BAT-01 — Upload a Season Package

**Input:** `BAT-01-season-acc-womens-premier-cup-2026.json`

**Outcome: Success**

The Women's Premier Cup upload was successful and easy to understand. The participant could understand what was being uploaded and complete the submission without difficulty.

**Finding:** None.

---

## BAT-02 — Upload a Back Catalogue

**Input:** `BAT-02-back-catalogue-acc-mens-challenger-cup-2024-2026.json`

**Outcome: Success**

The Men's Challenger Cup Back Catalogue upload was successful and easy to understand. The participant could distinguish the Back Catalogue upload from the normal Season upload and complete the upload without difficulty.

A later Results page showed that two submitted records could not be resolved to existing fixture references. That result is recorded under BAT-03 and did not prevent the participant from completing the initial upload.

**Finding for upload interaction:** None.

---

## BAT-03 — Find Batch Progress and Results

**Batch:** `cd46ac6a-cf79-4964-8ac3-bd6c0816f94a`

**Source:** `BAT-02-back-catalogue-acc-mens-challenger-cup-2024-2026.json`

**Status:** Awaiting review

**Observed status summary:**

| Result     |  Count |
| ---------- | -----: |
| Total      |      2 |
| Accepted   |      0 |
| Rejected   |      2 |
| Unresolved |      2 |
| Duplicates |      0 |
| Conflicts  |      0 |
| Processed  | 2 of 2 |

The Results page showed **Reference could not be matched (2)** and the technical error `REFERENCE_RESOLUTION_FAILED`.

The report explained that the submitted fixture references could not be matched to existing records. It also explained that innings and participant records could not be resolved because their fixture reference did not resolve.

**Outcome: Partial**

The report was partially clear about what needed changing. The participant could see that the batch had been processed, that both items were unresolved/rejected, and that reference matching had failed. However, the user-facing recovery instruction could be much clearer: the page explains the technical problem, but does not make the next action immediately obvious to a normal user.

### Finding P14-F01

**Severity: S3 — Medium**

**Finding:** Reference-resolution failure is visible, but the user-facing recovery/action guidance could be clearer.

**Evidence:** Batch `cd46ac6a-cf79-4964-8ac3-bd6c0816f94a`, source `BAT-02-back-catalogue-acc-mens-challenger-cup-2024-2026.json`.

**Decision:** Deferred — UX/error-message follow-up required.

---

## BAT-04 — Understand a Failed/Correction-Required Batch

**Input:** `BAT-04-invalid-acc-womens-premier-cup-2026.json`

The application displayed:

> **Submission rejected**

and:

> **The package does not match the selected fixture. Check its date and both team names.**

**Outcome: Success**

The message was very clear. It immediately explained that the submission was rejected and told the participant exactly what to check: the date and both team names.

The participant could understand what needed to be corrected without a technical explanation.

**Finding:** None.

---

## BAT-05 — Download a Complete Batch Report

The Results page displayed:

**Download JSON report**

When the participant selected the download control, the application displayed:

> **The complete report is temporarily unavailable. Try the download again.**

The complete report could not be downloaded during the session.

**Outcome: Failure**

The control itself was easy to find and its purpose was clear, but the requested report was unavailable when selected.

### Finding P14-F02

**Severity: S2 — High**

**Finding:** The complete batch report could not be downloaded during the user-testing session. The control is discoverable, but the report was unavailable when selected.

**Evidence:** Results page for batch `cd46ac6a-cf79-4964-8ac3-bd6c0816f94a`.

**Decision:** Deferred — implementation follow-up required to ensure the complete report is available through the download action.

---

## Cross-cutting usability finding — P14-F03

While using the search/select control, when the search text was fully backspaced/cleared, the control automatically selected the top option instead of returning to a blank/unselected state.

**Outcome:** Non-blocking usability finding.

**Severity: S4 — Minor**

**Finding:** Clearing all search text should leave the search/select control blank rather than automatically selecting the first/top option. Automatically selecting the top option can make the current selection less obvious and may cause an unintended choice.

**Decision:** Deferred — non-blocking UX improvement; carry to the Sprint 3 close-out follow-up.

**Evidence:** Observed during the P14 user-testing session while using the search/select control.

---

# 3. Task outcome summary

| Task   | Description                                 | Outcome     | Findings |
| ------ | ------------------------------------------- | ----------- | -------- |
| BAT-01 | Upload a Season Package                     | **Success** | None     |
| BAT-02 | Upload a Back Catalogue                     | **Success** | None     |
| BAT-03 | Find Batch Progress and Results             | **Partial** | P14-F01  |
| BAT-04 | Understand Failed/Correction-Required Batch | **Success** | None     |
| BAT-05 | Download a Complete Batch Report            | **Failure** | P14-F02  |

- **Total attempts:** 5
- **Success:** 3
- **Partial:** 1
- **Failure:** 1

---

# 4. Findings and decisions

| Finding | Task          | Severity    | Observation                                                                                                                       | Decision                                       |
| ------- | ------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| P14-F01 | BAT-03        | S3 — Medium | Reference-resolution failure is visible, but recovery/action guidance could be clearer.                                           | Deferred — UX/error-message follow-up required |
| P14-F02 | BAT-05        | S2 — High   | Download JSON report is discoverable, but the complete report was unavailable.                                                    | Deferred — implementation follow-up required   |
| P14-F03 | Cross-cutting | S4 — Minor  | Clearing all search text automatically selects the top option instead of leaving the control blank. Non-blocking usability issue. | Deferred — non-blocking UX follow-up           |

No S1 finding was observed.

---

# 5. Evidence references

### BAT-01

- Package: `BAT-01-season-acc-womens-premier-cup-2026.json`
- Competition: Asian Cricket Council Women's Premier Cup
- Result: successful upload
- Observation: easy to understand

### BAT-02

- Package: `BAT-02-back-catalogue-acc-mens-challenger-cup-2024-2026.json`
- Competition: Asian Cricket Council Men's Challenger Cup
- Seasons represented: 2024 and 2026
- Result: successful upload
- Observation: easy to understand

### BAT-03 / BAT-05

- Batch: `cd46ac6a-cf79-4964-8ac3-bd6c0816f94a`
- Source: `BAT-02-back-catalogue-acc-mens-challenger-cup-2024-2026.json`
- Status: Awaiting review
- Total: 2
- Accepted: 0
- Rejected: 2
- Unresolved: 2
- Error: `REFERENCE_RESOLUTION_FAILED`
- Download message: "The complete report is temporarily unavailable. Try the download again."

### BAT-04

- Package: `BAT-04-invalid-acc-womens-premier-cup-2026.json`
- Result: Submission rejected
- Message: "The package does not match the selected fixture. Check its date and both team names."
- Observation: very clear

---

# 6. Retesting

No retest was performed during this session.

Retest after follow-up changes:

1. BAT-03 — verify that a user can understand exactly how to recover from an unresolved reference.
2. BAT-05 — verify that the complete JSON report downloads successfully.

---

# 7. Post-session assessment

The session demonstrated that the core upload workflow was understandable for both a normal Season Package and a multi-season Back Catalogue.

The BAT-04 failure/correction message was also clear and actionable.

Three usability limitations/follow-ups were identified:

1. BAT-03 results were only partially clear from a user-recovery perspective.
2. BAT-05 could not download the complete report.
3. P14-F03: clearing all search text automatically selected the top option instead of leaving the control blank. This was non-blocking.

**Proposed session-level assessment: Accepted with documented limitations**

This reflects the actual P14 results: 3 Success, 1 Partial, and 1 Failure.

---

# 8. Facilitator/intervention record

| Task   | Intervention  | Effect                                                |
| ------ | ------------- | ----------------------------------------------------- |
| BAT-01 | None recorded | None                                                  |
| BAT-02 | None recorded | None                                                  |
| BAT-03 | None recorded | Participant experienced the Results page as presented |
| BAT-04 | None recorded | Participant could understand the rejection message    |
| BAT-05 | None recorded | Participant encountered the report-download error     |

---

# 9. Linked implementation issue closure

This session provides user-feedback evidence for the #604 feature-level gate.

The technical implementation issues remain separate from this user-testing record. Their implementation/review/deployment status must be verified before #604 is closed.

This session does not claim that #586, #587, #588, or #589 are closed merely because the user-testing tasks were performed.

---

# 10. Evidence review checklist

- [x] Scenario ID recorded
- [x] Date recorded
- [x] Anonymous participant ID recorded
- [x] Participant role recorded
- [x] Environment recorded
- [x] Test packages recorded
- [x] BAT-01 outcome recorded
- [x] BAT-02 outcome recorded
- [x] BAT-03 outcome recorded
- [x] BAT-04 outcome recorded
- [x] BAT-05 outcome recorded
- [x] Findings have severity
- [x] Actionable findings have decisions
- [x] Non-blocking cross-cutting usability finding recorded
- [x] No participant personal information included
- [x] No credentials, tokens, or API keys included
- [ ] Retest completed — not performed in this session

---

# 11. AI declaration

This evidence document was prepared with assistance from ChatGPT. The task outcomes, observations, messages, batch identifier, and findings were supplied from the actual P14 user-testing session and were not invented by the AI.