# Issue #808 — independent re-audit: first-pass findings

**Date:** 2026-10-09 (Africa/Johannesburg)
**Auditor:** Shayna Unterslak
**Authoritative Gitea checkout revision at first patch:** `7c97b9451a1ebd7755a391e37116675855e0386d`
**GitHub mirror snapshot independently reviewed:** `7c97b9451a1ebd7755a391e37116675855e0386d`
**Status:** IN PROGRESS — first pass only; not final independent sign-off.

## Independence and scope

This is an independent, marker-facing second-pass review. It does not supplant the
specialist verification owners, prove final production readiness or confer a passing
status on unfinished work. Trivial, clearly evidenced documentation corrections
are handled under #808; substantial implementation and specialist evidence gaps
remain assigned to their original owners. Final deployment, release/tag and approval
remain under #810.

The first pass compared 20 primary documentation pages, relevant specialist
verification records, the release traceability matrix, and the repository tree at
the GitHub mirror snapshot above. The static scan checked 345 relative Markdown
links across those 20 pages against the mirror's tracked file inventory; all 345
resolved to existing repository files. This **does not establish live external-link,
anchor, deployed documentation, or Gitea/mirror parity verification**.

This patch deliberately changes no application code, test result, issue status,
production configuration or release artifact.

## Initial findings and disposition

| Ref     | Evidence / assessment                                                                                                                                                                                                             | Severity and status                                            | Action / accountability                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A808-01 | The Sprint 4 user-testing summary linked to a temporary `graz/test/803-final-structured-user-testing` branch despite the corresponding source files existing on mirror `main`.                                                    | Low — fixed by this patch; recheck on Gitea.                   | #808: update both evidence links to `main` and verify docs build.                                                                                                                                              |
| A808-02 | The final-system-verification summary linked #877 evidence on the `test/877-final-quality-audit` branch despite that evidence file existing on mirror `main`.                                                                     | Low — fixed by this patch; recheck on Gitea.                   | #808: use the stable main-branch evidence link.                                                                                                                                                                |
| A808-03 | `docs/development/testing.md` described hosted PostgreSQL CI as a separate lane. The current `.gitea/workflows/ci.yml` and `docs/development/ci-cd.md` integrate applicable PostgreSQL checks into the `validation` job.          | Low — fixed by this patch; CI itself unchanged.                | #808: align explanatory documentation with current CI implementation.                                                                                                                                          |
| A808-04 | Verification bank lists #874 (API/consumer/integration) and #876 (performance/accessibility/responsiveness) as `NOT RUN`. The team confirms these specialist issues are still in progress.                                        | Tracking item — no new defect concluded.                       | Original #874 and #876 owners complete their evidence; #808 independently reconciles it afterward. No reassignment.                                                                                            |
| A808-05 | #877 retained evidence shows successful local quality checks but marks exact-candidate hosted CI as blocked/pending; the verification summary likewise records no final hosted pass.                                              | Release-evidence dependency — pending.                         | #877 owner supplies exact hosted CI evidence. #808 checks any summary/status claims against it.                                                                                                                |
| A808-06 | Final production component smoke, verified release artifact SHAs and tag remain pending in the verification bank.                                                                                                                 | Release gate — pending.                                        | #810 owns deployment and release approval. #808 does not mark these PASS.                                                                                                                                      |
| A808-07 | #809 traceability matrix identifies an 8 Oct evidence cut-off and requires final deployed revision, CI, known-limitation and user-feedback refresh before release.                                                                | Release handoff — pending, not grounds to redo completed #809. | #810 performs release-time refresh; #808 checks internal accuracy and discoverability.                                                                                                                         |
| A808-08 | #803 Sprint 4 summary distinguishes one reviewed public human session, one user-confirmed assisted local submitter/reviewer session, and an AI simulation (not a human participant). It explicitly retains incomplete acceptance. | Partial evidence — no invented pass.                           | Continue #803 with existing ownership; review genuine evidence, feedback/dispositions and any explicit team scope decision. The course Milestone 4 rubric does not itself prescribe a three-session threshold. |
| A808-09 | #797 Lighthouse record qualifies the universal ≥90 acceptance claim: static public-page results passed, but four parameterised mobile routes were below target and protected pages were not verified.                             | Acceptance gap — pending.                                      | Original #797 owner addresses performance or records an authorised, reasoned limitation; #808 reviews the result, rather than silently treating hosted baseline CI as universal ≥90 proof.                     |

## Completion and release handoff checklist

- [ ] Recheck authoritative Gitea `main` and GitHub mirror equality; the recorded mirror snapshot alone does not prove parity.
- [ ] Independently inspect current marker-facing hosted documentation and production URLs.
- [ ] Review all completed specialist evidence and confirm relevant #874 and #876 outcomes after they are published.
- [ ] Review #803 final outcome and any documented team acceptance decision; do not count AI simulation as human feedback.
- [ ] Verify that #797 resolution, user-testing evidence and all `Partial` / `Not implemented` classifications match the actual release candidate.
- [ ] Review #905 AI historical exceptions and current attribution evidence without rewriting old records.
- [ ] Verify the strict MkDocs build and repo checks on the Gitea issue branch and retain command output/PR evidence.
- [ ] Confirm that all audit findings are resolved, accepted with reason, or passed to an identified owner.
- [ ] Handoff final deployment SHA, CI state, smoke tests, tag and submission proof to #810.
- [ ] Record final #808 independent audit outcome and close only after agreed acceptance criteria are met.

## First-pass validation boundaries

- Relative link-target existence: **345/345** for the 20 selected files in the GitHub mirror repository tree. This checks presence, not live site navigation or URL response.
- Deployed frontend/API/worker/database readiness: **NOT VERIFIED in this pass**.
- Current authoritative Gitea hosted CI: **NOT VERIFIED in this pass**.
- Final acceptance of #874, #876 and #803: **NOT CLAIMED**.
- Gitea versus mirror commit parity: **NOT VERIFIED in this pass**.

## AI declaration

This evidence record, link-check review, issue-classification discussion and
initial documentation corrections were planned and drafted with the assistance
of ChatGPT-Web[GPT-6]. The auditor remains responsible for checking the output
against the authoritative repository, CI, hosted documentation and actual team decisions.
