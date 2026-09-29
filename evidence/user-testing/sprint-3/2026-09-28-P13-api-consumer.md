# Sprint 3 User-Testing Session â€” P13 â€” Advanced API Consumer

## Session Metadata

| Field                                  | Record                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Date                                   | 2026-09-28                                                                                       |
| Participant ID                         | `P13`                                                                                            |
| Role                                   | Technically competent API consumer                                                               |
| Relevant Experience                    | Computer Science student with development experience                                             |
| Facilitator                            | Not recorded in supplied notes                                                                   |
| Observer                               | Not recorded in supplied notes                                                                   |
| Environment                            | Deployed Stat'sTheGame / Sport Analytics Tool environment                                        |
| Frontend URL                           | `https://sport-analytics-tool-web.pages.dev/`                                                    |
| Documentation / API Explorer URL       | `https://sport-analytics-tool-web.pages.dev/api`                                                 |
| API URL                                | `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1` |
| Commit / Release                       | `12d27d80e073a15aea1189a7858243e24e9de92f`                                                       |
| Browser                                | Chrome                                                                                           |
| Device                                 | Windows 11                                                                                       |
| Scenario                               | `S3-API-ADV-01`                                                                                  |
| Workflow focus                         | Advanced API consumer capabilities                                                               |
| User-feedback issue                    | #612                                                                                             |
| Prepared consumer safe label           | `S3 API Advanced Test`                                                                           |
| Known supporting implementation issues | #775, #776, #783                                                                                 |
| Participant independence               | Confirmed not part of the project team and did not implement/substantially design the workflow   |
| API consumer credentials               | Supplied out-of-band                                                                             |
| Administrator credentials              | Supplied out-of-band                                                                             |

This session covers `PUB-05`, `API-02`, `API-03`, and `API-04`.

## Privacy Checklist

- [x] Participant is identified only by anonymous ID in retained evidence.
- [x] No password, bearer token, API key, authentication cookie, or personal email address is retained.
- [x] API consumer credentials were supplied out-of-band.
- [x] Administrator credentials were supplied out-of-band.
- [x] Only the safe consumer label `S3 API Advanced Test` is retained.
- [x] No raw credential material was observed in the supplied session notes.

---

# Task â€” `PUB-05` â€” API Discovery

**Task goal**

> You are building another application and want to use the Sport Analytics Tool's data.
>
> Find enough information to determine how you would begin accessing the API.

## Outcome

**Partial**

## Observations

**Navigation / approach:** The participant found the API documentation page without difficulty and was able to browse available operations and understand the kinds of responses exposed.

**Confusion / hesitation:** The participant could not find any explanation of how an external API consumer requests access or obtains an API key.

**Errors:** No functional error was reported.

**Assistance requested:** None.

**Assistance given:** None.

**Participant comments:** The participant described the API page itself as easy to see and navigate, but said there was no apparent way to request access or information about obtaining a key.

**Positive observations:** Discoverability of the API page and browsing of the operation catalogue were straightforward.

## Finding

### P13-F01

**Description:** A technically experienced prospective API consumer could discover the API documentation and available operations, but could not determine how to request consumer access or obtain an API key. The same problem was independently identified again in post-test feedback.

**Severity:** **S2 â€” High**

**Severity rationale:** The API itself remains discoverable and understandable, but a new external consumer cannot independently complete the onboarding path needed to make authenticated consumer requests. This is a major obstacle in an important API workflow, although access can currently be supplied out-of-band.

**Decision:** **Accept**

**Decision reason:** The participant independently discovered the API surface but could not determine how a legitimate external consumer obtains the credentials required to use authenticated consumer operations. The same concern was repeated in the post-test feedback. This blocks self-service understanding of an important API onboarding step and is consistent with the existing administrator-issued key model, so the finding is accepted for a documentation/UX fix rather than treated as expected participant error.

**Suggested follow-up:** UX/documentation improvement, or link an existing consumer-onboarding issue if one already covers this gap.

---

# Task â€” `API-02` â€” Retrieve and Understand Aggregate Data

**Task goal**

> You want an aggregate answer rather than a list of raw records.
>
> Use the API documentation and supplied consumer key to retrieve an aggregate cricket result and explain what the response means.

## Outcome

**Success**

## Observations

**Navigation / approach:** The participant first made a successful request returning fixture records. When asked about an aggregate result, they indicated that the task wording was unclear. After the term `aggregate` was clarified in ordinary language, they continued independently and located player-level statistics.

**Confusion / hesitation:** The word `aggregate` was initially unclear. The clarification did not identify an endpoint, navigation path, control, filter, or intended workflow.

**Errors:** None after the intended aggregate operation was found. The participant reported HTTP `200`.

**Assistance requested:** Clarification of the term `aggregate`.

**Assistance given:** Ordinary-language clarification only. No endpoint, navigation path, operation, or control was identified.

**Participant comments:** The eventual response included values such as batting average, runs scored, balls faced, and related performance information. The participant understood these as describing the player's history/performance across the fixtures represented by the query.

**Positive observations:** Once the concept was understood, the participant independently located, retrieved, and interpreted aggregate cricket statistics.

**Finding:** No product finding recorded. The initial confusion related to the test-task term rather than demonstrated product behaviour.

---

# Task â€” `API-03` â€” Follow a Deprecation Path

**Task goal**

> You are maintaining an API client and discover that an operation you use is deprecated.
>
> Determine what is being retired, when or how the deprecation applies, and which replacement operation your client should use.

## Outcome

**Success**

## Observations

**Navigation / approach:** The participant found a deprecated fixture-event export operation and called it successfully. They observed a response containing a successor link pointing toward the replacement operation.

**Confusion / hesitation:** The participant initially did not see information about retirement timing.

**Errors:** None reported.

**Assistance requested:** None.

**Assistance given:** None.

**Participant comments:** After continuing independently, the participant found that the API documentation states that no sunset date has been set.

**Positive observations:** Both the deprecated state and replacement path were discoverable, and the absence of a sunset date was documented sufficiently for the participant to find it.

**Finding:** None.

---

# Task â€” `API-04` â€” Find a Consumer's API Usage

**Task goal**

> Using the administrator/reviewer scenario supplied by the facilitator, find what a particular test API consumer has used and explain the usage information shown.

## Outcome

**Success**

## Observations

**Navigation / approach:** The participant located the prepared `S3 API Advanced Test` consumer through the administrator interface.

**Confusion / hesitation:** None reported.

**Errors:** None reported.

**Assistance requested:** None.

**Assistance given:** None.

**Participant comments:** The participant could see whether a key was active, whether previous keys existed, when it was created, usage by operation/endpoint, response status classes, a date-range filter, total request counts, and applicable limits. They specifically observed that the full API key was not displayed.

**Positive observations:** The participant described the administration workflow as easy to navigate and demonstrated understanding of both usage information and the separation between consumer identity/metadata and the secret API key.

**Finding:** None.

---

# Task Results

| Task ID  | Outcome     | Assistance requested         | Assistance given                       | Findings  |
| -------- | ----------- | ---------------------------- | -------------------------------------- | --------- |
| `PUB-05` | **Partial** | No                           | None                                   | `P13-F01` |
| `API-02` | **Success** | Clarification of `aggregate` | Neutral terminology clarification only | None      |
| `API-03` | **Success** | No                           | None                                   | None      |
| `API-04` | **Success** | No                           | None                                   | None      |

**Overall:** 3 Success, 1 Partial, 0 Failure.

Each task is scored independently in accordance with the project user-testing protocol.

---

# Post-Test Questions

## 1. What was the most confusing part of the application?

Where/how to request an API key as a consumer.

## 2. Was there anything you expected to be able to do but could not find?

The API-key request/access process described above.

## 3. Was any wording or terminology unclear?

No.

## 4. Which part felt easiest or most intuitive?

The administrator task was easy to navigate.

## 5. If you could change one thing, what would you change?

Nothing additional.

## 6. Would you feel comfortable performing these tasks again without assistance?

Yes.

---

# Findings Summary and Decisions

| Finding ID | Task ID  | Finding                                                                              | Severity | Decision   | Reason                                                                                                        | Gitea issue | Fix PR / commit  | Retest                                                                                                                      |
| ---------- | -------- | ------------------------------------------------------------------------------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------- | ----------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `P13-F01`  | `PUB-05` | Prospective API consumer cannot discover how to request access or obtain an API key. | S2       | **Accept** | Onboarding for authenticated consumer operations is not discoverable; concern repeated in post-test feedback. | #783        | #787 / `14c203c` | **Passed — deployed PUB-05 retest completed on 2026-09-28; participant was satisfied with the revised onboarding guidance** |

No additional findings are recorded from this session.

---

# Follow-Up Gitea Issue

## P13-F01 â€” #783

**Title:** Document how external API consumers request access and obtain an API key

**Participant:** P13

**Task ID:** `PUB-05`

**Severity:** S2 â€” High

**Description:** During Sprint 3 formal user testing, a technically experienced API consumer could easily locate the API Explorer and understand the available operations, but could not find any documented path for requesting API access or obtaining a consumer key.

**Reproduction / observation:** Starting from the deployed frontend, navigate naturally to the public API documentation as a prospective external developer. The available API operations are discoverable, but the participant could not locate instructions or a workflow explaining how a new consumer requests access or receives an API key.

**Expected user goal:** A developer discovering the public API should be able to determine what access model applies and what they need to do to obtain the credentials required to begin consuming authenticated API operations.

**Evidence:** `evidence/user-testing/sprint-3/2026-09-28-P13-api-consumer.md`

**Gitea issue:** #783

**Decision:** **Accept**

**Decision reason:** The participant independently discovered the API surface but could not determine how a legitimate external consumer obtains the credentials required to use authenticated consumer operations. The same concern was repeated in the post-test feedback. This blocks self-service understanding of an important API onboarding step and is consistent with the existing administrator-issued key model, so the finding is accepted for a documentation/UX fix rather than treated as expected participant error.

---

# Retest — `P13-F01` / `PUB-05`

| Field                  | Record                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Date                   | 2026-09-28                                                                                    |
| Finding                | `P13-F01`                                                                                     |
| Task                   | `PUB-05`                                                                                      |
| Related implementation | #783                                                                                          |
| Pull Request           | #787                                                                                          |
| Implementation commit  | `14c203c1781b0f12e4b1aacd43b8d0ac7d80966a`                                                    |
| Main merge commit      | `34bca4d0a8ff442092808434c3e022016844fcc7`                                                    |
| Environment            | Deployed Stat'sTheGame API Explorer containing the #783 onboarding change                     |
| Exact deployment SHA   | Not separately recorded in the supplied retest note                                           |
| Assistance             | No workflow assistance was reported in the supplied retest note                               |
| Outcome                | **Passed**                                                                                    |
| Participant feedback   | The participant was satisfied with `PUB-05` and the revised API-consumer onboarding guidance. |
| Finding status         | **Resolved**                                                                                  |

The historical first-run `PUB-05` outcome remains **Partial**. The retest does not rewrite the original observation; it records that the accepted S2 finding was corrected and successfully re-evaluated on the deployed product.

---

# Credential / Privacy Review

No API key, bearer token, password, authentication cookie, personal email address, or other secret appears in the retained session notes.

The participant referred only to the safe consumer label `S3 API Advanced Test`, public deployment URLs, API route information, and the deployed commit identifier.

---

# Gate Status

**Accepted with documented limitations**

The original session provides evidence for all four selected tasks. `API-02`, `API-03`, and `API-04` were completed successfully.

`PUB-05` was initially Partial because the participant could not determine how a prospective external consumer should request access or obtain an API key. That produced accepted S2 finding `P13-F01`, tracked by #783.

#783 was implemented through PR #787. The implementation commit is `14c203c1781b0f12e4b1aacd43b8d0ac7d80966a` and it was merged to `main` in `34bca4d0a8ff442092808434c3e022016844fcc7`.

After the corrected API onboarding experience was deployed, `PUB-05` was retested. The participant was satisfied with the revised guidance and the finding is considered resolved.

The exact deployment SHA and a separate assistance field were not retained in the supplied retest note; this is recorded as a limitation rather than inferred.

All #612 findings now have final decisions, the accepted S2 change has been retested successfully, and no unresolved #612 finding remains.

**Issue #612 may close with the final result: Accepted with documented limitations.**

---

# Facilitator Sign-Off

- [x] Every attempted Task ID has an individual outcome.
- [x] Every finding links to the Task ID that produced it.
- [x] Severity is assigned by impact.
- [x] `P13-F01` has a final team decision: **Accept**.
- [x] Gitea implementation issue #783 has been created and linked for `P13-F01`.
- [ ] `PUB-05` retest evidence is complete after the accepted S2 fix is deployed.
- [x] Participant name is absent from retained evidence.
- [x] Passwords, tokens, and API keys are absent from retained evidence.
- [x] Formal participant results have not been fabricated.

## AI Declaration

The preceding anonymised session evidence was organised and drafted with the assistance of ChatGPT-Web[GPT-5.6 Sol] based on facilitator/participant notes. The project team remains responsible for verifying observations, task outcomes, severity, decisions and retained evidence.

The #783 deployed PUB-05 retest close-out and #612 gate update were organised and drafted with the assistance of ChatGPT-Web[GPT-5.6 Sol] from the supplied participant retest result and repository evidence.
