# Issue #808 — independent re-audit: first-pass findings

**Date:** 2026-10-09 (Africa/Johannesburg)
**Auditor:** Shayna Unterslak
**Authoritative Gitea checkout revision at first patch:** `7c97b9451a1ebd7755a391e37116675855e0386d`
**GitHub mirror snapshot independently reviewed:** `7c97b9451a1ebd7755a391e37116675855e0386d`
**Status:** FINAL INDEPENDENT AUDIT RECONCILED (10 October 2026); documentation findings dispositioned, release acceptance remains with #810. Closing PR and required hosted review/CI are separate from this audit record.

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

| Ref     | Evidence / assessment                                                                                                                                                                                                             | Severity and status                                                              | Action / accountability                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A808-01 | The Sprint 4 user-testing summary linked to a temporary `graz/test/803-final-structured-user-testing` branch despite the corresponding source files existing on mirror `main`.                                                    | Low — fixed by this patch; recheck on Gitea.                                     | #808: update both evidence links to `main` and verify docs build.                                                                                                                                              |
| A808-02 | The final-system-verification summary linked #877 evidence on the `test/877-final-quality-audit` branch despite that evidence file existing on mirror `main`.                                                                     | Low — fixed by this patch; recheck on Gitea.                                     | #808: use the stable main-branch evidence link.                                                                                                                                                                |
| A808-03 | `docs/development/testing.md` described hosted PostgreSQL CI as a separate lane. The current `.gitea/workflows/ci.yml` and `docs/development/ci-cd.md` integrate applicable PostgreSQL checks into the `validation` job.          | Low — fixed by this patch; CI itself unchanged.                                  | #808: align explanatory documentation with current CI implementation.                                                                                                                                          |
| A808-04 | Verification bank lists #874 (API/consumer/integration) and #876 (performance/accessibility/responsiveness) as `NOT RUN`. The team confirms these specialist issues are still in progress.                                        | Tracking item — no new defect concluded.                                         | Original #874 and #876 owners complete their evidence; #808 independently reconciles it afterward. No reassignment.                                                                                            |
| A808-05 | #877 retained evidence shows successful local quality checks but marks exact-candidate hosted CI as blocked/pending; the verification summary likewise records no final hosted pass.                                              | Release-evidence dependency — pending.                                           | #877 owner supplies exact hosted CI evidence. #808 checks any summary/status claims against it.                                                                                                                |
| A808-06 | Final production component smoke, verified release artifact SHAs and tag remain pending in the verification bank.                                                                                                                 | Release gate — pending.                                                          | #810 owns deployment and release approval. #808 does not mark these PASS.                                                                                                                                      |
| A808-07 | #809 traceability matrix identifies an 8 Oct evidence cut-off and requires final deployed revision, CI, known-limitation and user-feedback refresh before release.                                                                | Release handoff — pending, not grounds to redo completed #809.                   | #810 performs release-time refresh; #808 checks internal accuracy and discoverability.                                                                                                                         |
| A808-08 | #803 Sprint 4 summary distinguishes one reviewed public human session, one user-confirmed assisted local submitter/reviewer session, and an AI simulation (not a human participant). It explicitly retains incomplete acceptance. | Partial evidence — no invented pass.                                             | Continue #803 with existing ownership; review genuine evidence, feedback/dispositions and any explicit team scope decision. The course Milestone 4 rubric does not itself prescribe a three-session threshold. |
| A808-09 | #797 Lighthouse record qualifies the universal ≥90 acceptance claim: static public-page results passed, but four parameterised mobile routes were below target and protected pages were not verified.                             | Acceptance gap — pending.                                                        | Original #797 owner addresses performance or records an authorised, reasoned limitation; #808 reviews the result, rather than silently treating hosted baseline CI as universal ≥90 proof.                     |
| A808-10 | The final-submission index omitted direct app/API/repository entry points, linked only to verification procedures rather than the execution summary, and routed final user-testing outcomes through the generic overview.         | Low — corrected in this audit chunk; hosted URLs not yet independently verified. | #808 adds documented reviewer entry points and direct evidence links. #810 remains responsible for confirming actual deployed revisions/availability.                                                          |

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

## Chunk 2 — reviewer navigation audit

Reviewed `docs/index.md`, `docs/final-submission.md`, `mkdocs.yml`, the final system-verification bank and the requirements matrix in the GitHub mirror. The page edits introduce no additional product or test-result claims. They improve the marker's path to documented endpoints, recorded final verification outcomes and the actual Sprint 4 testing summary. External URL availability and deployed release identity remain **NOT VERIFIED** until the authoritative release check.

AI assistance: ChatGPT-Web[GPT-6] — scope analysis, targeted page edits and findings-register wording.

## Chunk 3 — Authentication requirement/source cross-check

### A808-11 — Google-owned password recovery wording

**Assessment:** Low-severity documentation accuracy correction; no product defect established.

**Evidence:** `docs/security/password-recovery.md` previously stated that the application
"directs" users to Google's password-recovery process. Source inspection of
`apps/frontend/src/features/auth/AuthPages.tsx` found Google OAuth sign-in, but no
in-app password-recovery control or direct link. The auditor confirmed this behaviour
in the signed-out application; Google's recovery remains external and provider-owned.

**Disposition / responsibility:** #808 corrects the description of the existing design.
No second password method or application feature is requested. No real password reset
was performed and no end-to-end account-recovery success is claimed. Whether the
provider-managed path fulfils the course rubric is a separate interpretation issue,
not proof of an implementation failure.

**Other source checks:** The mirror source contains account-deletion services and the
handwritten weather API router. The documented account-deletion operation can return
`501 ACCOUNT_DELETION_UNAVAILABLE` without the optional server-side Supabase secret.
These observations are source checks only, not production smoke-test results.

#874 and #876 remain with their original owners pending specialist verification.
#803 remains with the existing team and will be progressed without reassignment.

**AI assistance:** ChatGPT-Web[GPT-6] — independent source/documentation review,
wording correction and audit-record drafting.

## Chunk 5 — Architecture, security and deployment documentation checks

**Source inspected:** GitHub mirror `main` at `7c97b9451a1ebd7755a391e37116675855e0386d` (9 October 2026); authoritative Gitea revision should be rechecked before merge.

### A808-12 — Supabase Auth client vs generated Data API restriction

**Severity:** Low documentation consistency. The security overview's statement that the Supabase client library must not be used in any workspace conflicted with the same page's description of Supabase Auth and with the backend `@supabase/supabase-js` dependency and Auth implementation. **#808 action:** restrict the documented prohibition to generated Supabase application-data access, while explicitly permitting the existing managed authentication clients. No authentication behaviour was modified.

### A808-13 — Historical App Service reference in worker documentation

**Severity:** Low outdated hosting terminology. The opening of `docs/deployment/azure-worker.md` still described the separate backend as an Express App Service, while the documented current backend is an Azure Container App. **#808 action:** correct the worker introduction to name the present backend target. The historical App Service record remains intact elsewhere.

**Audit qualification:** These are code-versus-documentation checks, not an independent live Azure configuration audit. No production revision, deployment health or backend database credentials were inspected. Those release-specific checks remain with #810. Specialist verification #874 and #876 remains pending; #803 remains with the existing team without reassignment.

**AI assistance:** ChatGPT-Web[GPT-6] — source comparison, documentation changes and audit finding descriptions.

## Chunk 6 — Methodology, stakeholder and AI-evidence discoverability

**Scope / source:** Reviewed project methodology, Sprint/stakeholder indexes, README AI declaration, AI register/transcript navigation, and existing #891/#905 attribution audit records against the read-only GitHub mirror `main` at `7c97b9451a1ebd7755a391e37116675855e0386d`. Gitea remains authoritative; current hosted evidence and issue state must be rechecked before close-out.

### A808-14 — Final Submission evidence index link (corrected in #808)

`docs/process/sprint-evidence.md` linked a nonexistent `evidence/sprints/sprint-4/README.md` and displayed a mismatched path. The repository retains `evidence/sprints/final-submission/README.md` as its current Final Submission index. Corrected the documentation link and label without moving or rewriting historical Sprint evidence. The static audit checked 31 same-repository Gitea target paths in this one index against the mirror tree: 30 existed, and this one was missing before the correction. This is a target-existence check, not a live click-through or Gitea parity result.

### A808-15 — 6 October stakeholder evidence missing from final-submission chronology (handoff: #804)

`evidence/stakeholder-meetings/2026-10-06-natural-language-query-demonstration.md` exists, accurately distinguishes reconstructed-from-recollection feedback from a contemporaneous transcript, and does not claim to be formal participant testing. Neither `docs/process/sprint-evidence.md`'s Final Submission chronology nor `evidence/sprints/final-submission/README.md` currently indexes that record in the reviewed mirror snapshot. Refer to the existing #804 stakeholder/process-evidence owner for navigation and later status reconciliation; do **not** fabricate attendance, minutes, or an additional meeting. The Gitea comment must be posted/confirmed separately by the issue owner or auditor; this patch does not assert it has been posted.

### AI attribution boundary

The README distinguishes code generation, inline/autocomplete and code-review uses. Marker-facing AI declarations, six member register/transcript directories and the #891 attribution-audit record are discoverable. Historical format exceptions are already tracked under #905; #808 does not rewrite history or duplicate #905's classification. Recheck current Gitea source and final disposition as part of final reconciliation.

**AI assistance:** ChatGPT-Web[GPT-6] — cross-source comparison, link correction, finding documentation and owner handoff drafting. The human auditor remains responsible for verifying the authoritative branch and final outcomes.

## Chunk 7 — Testing, coverage, security and Milestone 4 rubric cross-check

**Audit basis:** Inspected documentation, coverage configuration, package source/test files, security guidance and retained #805/#877/#797 evidence in the read-only GitHub mirror `main` at `7c97b9451a1ebd7755a391e37116675855e0386d`. Compared the Milestone 4 rubric table in the official 2026 COMS3011A project brief. Gitea is authoritative for current revisions, hosted CI and issue disposition. No new tests, Lighthouse runs, deployment or security scans were executed in this chunk.

### A808-16 — Batch-processing direct test documentation (corrected under #808)

`docs/testing/code-coverage.md` incorrectly stated that `packages/batch-processing` had no direct test suite. The reviewed source contains `src/batch-publication.test.ts`, `src/reference-resolver.test.ts` and `src/statistics-refresh.test.ts`. The package's `test:coverage` still uses `vitest run --coverage --passWithNoTests` and its Vitest configuration explicitly includes `src/**/*.ts` as coverable production source. Updated the description without changing or inventing measured coverage percentages or suggesting previously untested production paths are now fully covered. The previously documented weak direct package coverage remains a legitimate follow-up concern; new current percentages require a fresh observed run.

### A808-17 — Milestone 4 weighted rubric discoverability (handoff: #810 release refresh)

The course's Milestone 4 rubric lists **20 separately weighted criteria**: Database (data, deployment, structure); API (availability, architecture, deployment, performance, design); Application (accessibility, aesthetics, user experience, deployment, performance, features, responsiveness, structure); and Miscellaneous (Git methodology, integration, testing, tools). The `docs/planning/final-requirements-rubric-traceability.md` marker map currently groups these into seven broad rows: Database, API, Application, Git methodology, Integration, Testing and Tools. The grouped map does not individually direct a reviewer to evidence for the weighted API-performance, app-performance, accessibility, responsiveness, UX, or deployment subcriteria.

This is an **evidence navigation/granularity issue**, not proof that implementation or underlying test evidence is absent. #809 is already complete; #808 does not reopen or rewrite it. Ask the #810 final-release owner to add or link a compact weighted-criterion crosswalk during the authorised final SHA/evidence refresh. Separate unresolved #874, #876 and #877 execution/release checks must remain qualified, not marked PASS merely because the broad criterion says Implemented.

### Scope and non-findings

The code-coverage guide and #877 results explicitly identify local historical coverage (including 80.77% lines and 72.27% branches for the recorded run) with informational thresholds; they are not current hosted-CI claims. The #797 Lighthouse document distinguishes a relative hosted performance baseline from stricter Performance >=90 acceptance and discloses limited/unmeasured routes. This review found no newly established security vulnerability or executed test failure. #874 and #876 stay with their specialist owners; #877 remains for its original owner to reconcile; #810 owns final release verification; #803 formal human testing remains separate.

**AI assistance:** ChatGPT-Web[GPT-6] — source/rubric comparison, narrowly scoped documentation correction, audit register and handoff drafting. The human auditor must verify the authoritative Gitea branch and validate the correction before review.

## Chunk 8 — Team-approved two-session final user-testing scope (9 October 2026)

**A808-18 — RESOLVED SCOPE CHANGE (#803):** The team unanimously approved reducing its internally selected three-session final-testing target to **two real sessions** because of submission time constraints (approval reported by the student auditor; a contemporaneous team vote/transcript was not independently inspected). This is not a course-rubric numerical minimum. Verified retained outcomes: P15 one real human public session with four facilitator-approved `Success` outcomes based on participant self-reports; LOCAL-01 one real assisted human submitter/reviewer session with nine `Partial` outcomes; AI-SIM-01 excluded. **Two human session events satisfy the revised target**. No third session is requested and no issue is opened/reopened by this audit.

**A808-19 — DISCLOSED LIMITATIONS, NOT EXTRA SESSION REQUIREMENTS:** Participant identity/experience and post-session feedback for LOCAL-01 remain unverified, original chat export and five account-bearing screenshots remain subject to privacy/review precautions, and the local test build was older than current main. The accepted two-session scope does not create absent proof or authorise publishing unredacted materials. Document these as factual final-submission limitations. Technical release evidence remains for #810; do not treat local tests as deployed final smoke.

**A808-20 — RETAINED FINDING TRACEABILITY:** P15 F01 and F03 are accepted context/scroll concerns linked to #800 without specific human retests; F02 has an approved no-change disposition; F04 has a reported implemented #869/#903 follow-up but no human retest. These outcomes remain unchanged. AI observations do not count as a second human report. Existing issue ownership is unchanged; no implementation defect or evidence fabrication was established in this read-only review.

**Method:** inspected the retained human/AI session records, source notes, existing #803 completion audit and public/testing navigation against read-only mirror `main` as of 9 October. The team's approval comes from the student auditor's direct statement, not from independently observed Gitea votes. **AI assistance:** ChatGPT-Web[GPT-6].

## Final re-audit — Chunk 1 (10 October 2026): completed-lane status and stakeholder evidence

**Review basis:** GitHub mirror `main` commit `a8b24a733ea8bb4b8e696efd9b11fa5726dd1c63`
(10 October 2026); original specialist records and the issue-status screenshot
provided by the auditor. Gitea is authoritative, and main/mirror parity and final
hosted candidate evidence have not been independently established by this patch.

### A808-21 — #876 status correction (resolved documentation contradiction)

The final requirements/rubric traceability page still called #876 `NOT RUN`.
The retained [#876 execution record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-876-performance-accessibility-responsive.md)
shows an owner-approved **closed-with-limitations** disposition dated 9 October:
six local accessibility/responsive checks `PASS` and four performance-related
checks `BLOCKED`. Both local response-time reports missed the configured #289
targets; approved representative load, production-scale operation, protected
Lighthouse and all-route Performance ≥90 were not established. The final
verification bank already retains these per-case outcomes. Corrected the stale
rubric summary without changing underlying results, #876 ownership or #810's
final release responsibilities.

### A808-22 — 6 October stakeholder demonstration navigation (corrected)

Indexed the existing, retained
[6 October stakeholder demonstration](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/stakeholder-meetings/2026-10-06-natural-language-query-demonstration.md)
from both the final-submission evidence index and marker-facing chronological
Sprint evidence page. It records recollected stakeholder feedback and explicitly
states that contemporaneous meeting minutes and attendance were not retained.
No new meeting, participant test, attendance or stakeholder statement was created.
This reconciles the earlier A808-15 handoff with the actual existing source file.

### Carry-forward boundary — #874 and #810

#874 is still in progress as shown by the auditor's 10 October issue snapshot;
its API/consumer/integration technical lane remains `NOT RUN` in the retained
execution bank until Ben's actual evidence is published. #810 remains open and
owns current hosted CI, deployment revisions, production smoke and release/tag
approval. These are not implied by the corrections in this chunk.

**AI declaration:** ChatGPT-Web[GPT-6] assisted the cross-record analysis,
corrective documentation and audit write-up. Execution of the patch, verification
and Gitea status confirmation remain with the human auditor.

## Final re-audit — Chunk 2 (10 October 2026): complete weighted-rubric crosswalk

### A808-23 — The exact 20 weighted rubric criteria are now individually discoverable

Reviewed the **COMS3011A 2026 Project Brief §3.4** against the final
requirements/rubric traceability page. It has 20 criteria with combined weight
100%: Database 10%, API 25%, App 40% and Misc 25%. The existing compact
seven-row category overview remained useful but did not individually expose
marker evidence and limitations for performance, deployment, accessibility,
user experience, responsiveness and the other weighted checks.

Added a **20-row criterion-specific evidence crosswalk** under
`docs/planning/final-requirements-rubric-traceability.md` without changing the
original #809 status definitions or historical date. The crosswalk maps each
actual criterion to retained primary documentation or issue-owned evidence,
and distinguishes reviewed source/automated results from final deployment proof.

**Current specialist boundary at this cut-off:** #876 was explicitly closed
with **six local accessibility/responsive `PASS` and four performance
`BLOCKED`** cases; the local API timing target comparisons missed. #877 has
local PASS evidence but exact-candidate hosted CI/deployed smoke remain blocked
until #810. #797 relative Lighthouse CI baselines are not universal
Performance ≥90 acceptance. #803's accepted two-session human-testing scope
preserves four participant-reported `Success` outcomes and nine coached
`Partial` outcomes. #874 is **NOT RUN in the retained final technical bank**
until Ben's genuine execution record arrives. Neither a PR close nor a broad
`Implemented` label substitutes for these outcomes.

**Provenance:** Independent source comparison used read-only GitHub mirror
`main` `a8b24a733ea8bb4b8e696efd9b11fa5726dd1c63` on 10 October. The PDF rubric and source-linked evidence were
reviewed; **no tests, hosted deployment, Gitea issue action or new live API
request** were performed by this patch. Gitea remains authoritative, and
mirror/Gitea parity is still a separate final check.

**AI declaration:** ChatGPT-Web[GPT-6] assisted rubric extraction, evidence
mapping, documentation correction and independent audit drafting.

## Final re-audit — Chunk 3 (10 October 2026): merged #874 and contract finding

**Source and revision:** authoritative Gitea `origin/main` successfully fetched and
fast-forwarded by the auditor to `b75df6b46d0548e4e5769a9021cfde7c0e9b076a`;
that matches the reviewed GitHub mirror `main` commit for PR #949 at this checkpoint.
Read-only review of [#874's retained execution](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/final-system-verification/issue-874-external-api-contracts-integrations.md),
its merged verification bank, the requirements/rubric map and API versioning page.
No new deployed/API test was executed under #808.

### A808-24 — #874 status and provenance reconciled (documentation updated)

Ben's 10 October verification merged through Gitea PR #949 and records
**13 passing/partially suite-supported technical cases and one failed case**, so
its summary correctly reads **`PASS WITH ONE FAIL`**. The scope includes
anonymous deployed API/OpenAPI/Explorer/weather requests and specified local suites;
it does not establish deployed authenticated key lifecycle, quota exhaustion or
multi-replica limiter behaviour. The #808 rubric status and weighted crosswalk
previously said #874 was still `NOT RUN`/pending. Updated these stale descriptions,
without altering Ben's test outcomes, ownership or release approval.

### A808-25 — API-TECH-03 contract failure retained for explicit follow-up

Deployed `GET /api/v1/participants` includes `totalRecords` in individual
`data` items while the served `Participant` OpenAPI schema has
`additionalProperties: false` and lacks that field. Ben's deployed-schema
validation found **6 of 7 representative operations passed, 1 failed**.
This is a real, non-sensitive contract-accuracy issue; the owner regards it as
non-submission-blocking, not as fixed. No implementation change, Gitea defect
issue number or deployed retest is evidenced by the merged #874 record.
**#808 action:** fill the verification-bank summary's previously empty defect
cell, cross-reference the test record in the rubric, and hand the concrete
follow-up/accepted-limitation decision to #810 or the relevant implementation
owner. Do **not** report full #874 PASS, invent a retest, or treat the merge as
a bug fix. The withdrawn F2 frontend-vs-doc-site claim remains withdrawn.

### A808-26 — Minor deprecation and automated-verification status consistency

The #874 record observed `Deprecation` and successor `Link` headers even on an
unauthenticated `401` alias response, whereas `docs/api/versioning.md` only
mentioned successful deprecated responses. Corrected the wording to describe
the middleware behaviour without inventing a new version or retirement date.
The final-system-verification bank also contained a historical description
saying the other local #877 gates had not yet been rerun even though the final
#877 record reports local quality, database, browser and coverage checks PASS
for candidate `26fc2857b`. Aligned that summary; its **hosted CI** and
**final deployed smoke** remain `BLOCKED` under #810, and no release approval
is inferred.

**Unchanged boundaries:** #876's four performance checks remain `BLOCKED`,
#803's team-approved two-session count retains the original assisted `Partial`
outcomes, #797 universal Performance >=90 remains unproven for some routes,
and #810 still owns final exact-revision CI, deployment, smoke and release tag.

**AI declaration:** ChatGPT-Web[GPT-6] assisted comparison of merged evidence,
source-document consistency and patch drafting. The student must review the
audit and execute the actual repository checks before review or merge.

## Final independent reconciliation and #810 handoff — 10 October 2026

### Evidence cut-off and independent review scope

At this checkpoint the auditor fetched Gitea `origin/main` to
`b75df6b46d0548e4e5769a9021cfde7c0e9b076a` and fast-forwarded the active #808 audit branch to that revision.
The read-only GitHub mirror `main` was independently inspected at the same
revision. This establishes **source revision agreement at this checkpoint**,
not a deployed frontend/backend/worker image identity or a future release tag.

The independent review covered the marker-facing submission index, the original
and final requirements/rubric traceability, architectural and security claims,
AI policy/register discovery, stakeholder and Sprint records, formal participant
versus AI simulation evidence, repository coverage strategy, all seven final
technical verification lanes, and specialist audit/known-limitation records.
The added 20-row Milestone 4 weighted rubric crosswalk accounts for **100%** of
the rubric, with separate performance, accessibility, responsiveness and
release/deployment qualifications rather than broad implied PASS claims.

A read-only GitHub mirror path-inventory check resolved **283 same-repository
relative / Gitea-main links across 17 primary audit documents** before this
closing correction. The closing patch independently checked **336
local/Gitea-main link targets across those same 17 documents**, including the
updated rubric and final audit; zero missing targets is a path-existence check
only. Neither test validates fragments, redirects, current external URL response,
user authentication, hosted CI or actual production deployment. The auditor's
prior `git diff --check`, Prettier and strict MkDocs runs passed after audit
chunks 1–3; the final patch requires a fresh run and a reviewed PR/CI.

### A808-27 — All technical lanes reviewed, including merged #874

- **#871, #872, #873, #875:** retain candidate-scoped `PASS` evidence.
- **#874:** merged 10 October via PR #949; **13 PASS or suite-supported cases
  and API-TECH-03 `FAIL`**. Deployed `/api/v1/participants` carries an
  undocumented `totalRecords` field in each item despite an OpenAPI schema
  forbidding unspecified properties. The source-backed discrepancy is real,
  explicitly retained and regarded as non-submission-blocking by its tester;
  **no implementation fix or passing retest has been observed**. The #810
  release owner or implementation owner must document the follow-up/accepted
  limitation, not silently promote this check to PASS.
- **#876:** closed on owner-approved limited scope; six accessibility/
  responsiveness checks `PASS`, four performance/hosted checks `BLOCKED`.
  Local representative timing comparisons missed their configured targets.
  All-route Lighthouse >=90, scale/load, protected-role and hosted coverage
  are not thereby established.
- **#877:** local automated tests/coverage PASS for its tested candidate;
  exact final hosted-CI verification (`CI-TECH-02`) and deployed smoke
  (`DEP-TECH-03`) remain `BLOCKED` pending #810 release work.

### A808-28 — User testing, stakeholder and AI evidence reconciled

The final #803 **team-approved two-human-session** scope is documented,
with one reviewed public participant's four facilitator-approved `Success`
outcomes and one assisted submitter/reviewer session's nine `Partial`
outcomes. AI simulation is excluded from human totals. The historical
three-session plan and genuine metadata, feedback, build and privacy/export
limitations remain visible without claiming a third session or a human retest.

The 6 October stakeholder demonstration is discoverable from the final
submission chronology and retains its explicit recollection/attendance limits.
The #891 AI attribution audit and #905 historical follow-up are indexed and
not duplicated. This #808 session is separately recorded in
`evidence/ai/registers/shayna-unterslak.csv` as ChatGPT-Web[GPT-6]; **the actual transcript import is
PENDING**, to be added after #810 subject to privacy review. No transcript
file/path or PR number has been fabricated.

### Final #808 finding disposition and release handoff

**Independent audit assessment: COMPLETE WITH DOCUMENTED, ASSIGNED
EXCEPTIONS.** The review found and corrected documentation defects, preserved
genuine technical results including failures, provided marker-facing weighted
rubric traceability, and indexed the retained evidence. Outstanding issues
are not disguised as passed checks or treated as a reason to redo closed
specialist work.

**Release-only checks explicitly handed off to #810:** authenticate and verify
the exact final deployed frontend/API/worker revision and SHA, confirm current
required hosted CI and production smoke, reconcile all partial/blocked results,
record the explicit disposition of #874 API-TECH-03 and #876 performance
limitations, verify release-time user testing/AI-evidence status and approve the
submission tag. This final independent #808 audit is **not** that release sign-off.

**Independent review/merge boundary:** all final edits require fresh local
format/link/strict-MkDocs checks, normal Gitea review and required hosted PR CI.
The final PR should use `Closes #808` only after these pass and the responsible
reviewer accepts the documented exceptions. #810 stays open until its actual
release requirements are complete.

**AI declaration:** This closing section, source-vs-evidence reconciliation,
link-check procedure and CSV entry were drafted with ChatGPT-Web[GPT-6].
The auditor remains responsible for inspecting the diff, running checks and
correcting any factual error before merge.
