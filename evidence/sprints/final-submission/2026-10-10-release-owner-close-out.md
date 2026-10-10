# Milestone 4 — final-submission release-owner close-out reflection

| Field         | Record                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Prepared      | 10 October 2026 (SAST)                                                                                                |
| Milestone     | COMS3011A Milestone 4 — Submission (11 October deadline)                                                              |
| Related issue | #810                                                                                                                  |
| Prepared by   | Shayna Unterslak, release owner, with ChatGPT-Web[GPT-6] drafting assistance                                          |
| Nature        | Evidence-based, release-owner reflection; **not** minutes of a team meeting, a formal Sprint retrospective, or a vote |
| Status        | Close-out reflection drafted; final approval, tag and submission remain subject to #810 verification                  |

## Why this is a milestone close-out, not a fourth formal Sprint retrospective

The 2026 project brief names Milestones 1–3 as _Sprint 1_, _Sprint 2_ and _Sprint 3_; Milestone 4 is _Submission_. The [methodology-in-practice index](../../../docs/process/sprint-evidence.md) already distinguishes the Final Submission period from the three formal Sprints. The #810 issue uses the phrase "Sprint 4 retrospective and close-out" as an internal acceptance criterion. The release owner has chosen this written **Milestone 4 project close-out reflection** to address the close-out intent without arranging a separate retrospective meeting. **No team retrospective meeting was held or represented by this document.** Team-wide approval of these reflections is not claimed.

## Outcome against the final-submission goal

The final period prioritised stability, deployment, demonstrability, usability, evidence quality and traceability rather than another open-ended feature Sprint. The implementation and retained evidence cover the event-to-statistic path; role-controlled submission/review; asynchronous ingestion and dataset releases; public browsing and exports; a versioned consumer API; natural-language questions over published data; and a weather integration. The independent #808 audit merged through [PR #950](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/950); its improvements include the criterion-level Milestone 4 rubric crosswalk.

Release-owner checks observed the public frontend, Swagger Explorer and documentation responding with HTTP 200, a healthy backend API and a database-backed competition read. The active Azure API and worker revisions were each **Healthy** and used immutable images tagged `98bb853f2135619c194421770a56eb7919750f53`. The observed Gitea `main` run for `6338bd46` passed the required `plan` and `quality` jobs, the documentation deployment and repository coverage; the coverage generator explicitly succeeded at 81.10% lines and 72.75% branches (informational thresholds). A prior Gitea `98bb853f` run verified both Azure deployments and the frontend deployment; a later `74cf6827` CI run also recorded a successful frontend deployment. See [#810's dated release-readiness record](../../validation/issue-810-release-readiness-2026-10-10.md) for precise scope and qualifications.

## What worked in the process

- **Change-aware CI and deployment:** historical Git revisions, required quality status, and per-component deployment jobs allow the team to verify relevant changes without needlessly redeploying unaffected services.
- **Specialist technical verification:** the #871–#877 bank separates passing checks from failed, blocked or release-dependent checks, making final risk assessment possible without repeating every specialist test.
- **Independent evidence review:** #808 corrected obsolete links and status claims, reconciled security/hosting documentation, and made the 20 weighted marking criteria directly traceable to supporting evidence.
- **Issue-based workflow:** the reviewed merge history and mirrored repository SHA give a reproducible route from work item through Pull Request to a proposed release commit.

## What remained difficult or limited

- **Performance/environment evidence:** #797's relative CI Lighthouse baseline is not the absolute all-route >=90 acceptance criterion. Four #876 performance checks were blocked or had target misses; hosted representative-load acceptance was not established. Keep these as accepted, documented release risks only if the final release owner explicitly approves that disposition.
- **Consumer contract accuracy:** #874 detected an additive but undocumented `totalRecords` field on public participant list records (`API-TECH-03` FAIL). The specialist considered it non-submission-blocking; it is not a PASS or a code fix.
- **Final human testing:** the team approved a two-session target for #803; P15 public and LOCAL-01 assisted evidence have different success/partial outcomes and retained limitations. AI browser simulation is supporting technical evidence, not another human participant.
- **Revision proof:** Azure's active image SHAs were independently viewed. A successful Cloudflare build/deploy/smoke and HTTP 200 do not independently identify the _current_ frontend production bundle commit without Cloudflare deployment metadata.
- **Time-bound release coordination:** documentation and specialist lanes had different evidence cut-offs and commit SHAs. The final release gate must prevent these dates being silently conflated with a single end-to-end release pass.

## Decisions, handoff and finish line

This record does **not** approve the final release. #810 remains responsible for reviewing any new critical/severe issues, accepting or rejecting the documented residual limitations, checking the final `main`/mirror SHA and required CI, choosing an approved version tag from `main`, and confirming the submitted version. The [issue #810 evidence record](../../validation/issue-810-release-readiness-2026-10-10.md) is the live source for observed release state. The future tag and final post-merge revision are intentionally not invented here.

The next-project lesson is to collect environment-tagged proof and participant context as each test is run, and to define strict performance and deployment acceptance separately from regression baselines before the final week. This is a **release-owner interpretation**, not a claim of team-wide retrospective consensus.

## AI Declaration

This release-owner reflection was structured and drafted with ChatGPT-Web[GPT-6] from the documented source evidence and Shayna's observed release checks. AI did not attend a team retrospective, perform new technical tests, create the final tag or establish team consensus.
