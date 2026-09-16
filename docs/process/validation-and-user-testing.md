# Testing & Validation Evidence

This page indexes requirements traceability, verification/validation evidence and formal
user-testing evidence. For testing **strategy and procedures**, see
[Automated & end-to-end testing](../development/testing.md),
[User testing protocol](../testing/user-testing-protocol.md),
[User testing task bank](../testing/user-testing-task-bank.md) and
[Bug tracking](../testing/bug-tracking.md) and the
[Intermediate ingestion integrated acceptance](../testing/intermediate-ingestion-acceptance.md) runbook.

## Requirements traceability

- [Sprint 1 requirements traceability](../planning/sprint-1-requirements-traceability.md)
- [Sprint 2 requirements and rubric traceability](../planning/sprint-2-requirements-traceability.md)
- [Project backlog and milestone plan](../planning/project-backlog.md)

## Verification and validation evidence

Command-output summaries and sanitised verification records linked to individual issues are kept
under
[`evidence/validation/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation).
There are more than 70 dated, issue-referenced records in that folder (Markdown summaries and
screenshots); they are not duplicated here. Notable examples include:

- [Issue #10 — pre-CI readiness](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-10-pre-ci-readiness.md)
- [Issue #44 — authorisation tests](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-44-authorisation-tests.md)
- [Issue #105 — endpoint response times](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-105-endpoint-response-times.md)
- [Issue #257 — dependency-cruiser verification](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-257-dependency-cruiser-verification.md)
- [Issue #273 — accessibility and responsive-design audit](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-273-accessibility-responsive-audit.md)
- [Issue #274 — security/privacy/dependency audit](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-274-security-privacy-dependency-audit.md)
- [Issue #329 — Vite/Vitest toolchain migration](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-329-vite-vitest-toolchain-migration.md)
- [Issue #578 — repository-wide code coverage](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-578-repository-code-coverage.md)

Browse the [full validation folder](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation)
for a record tied to a specific issue number.

## Formal user testing

The canonical Sprint 2 process is the task-based protocol established for Issue #264 / PR #317 and recorded in [ADR-013](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-013-task-based-user-testing-evidence.md). Each attempted Task ID receives its own Success / Partial / Failure outcome, and findings retain task-level traceability through decision, issue/fix and retest.

Session records follow the
[user-testing evidence README](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/README.md)
and the [session template](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/session-template.md). Sprint 2 sessions are retained under
[`evidence/user-testing/sprint-2/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2), with the consolidated result recorded in
[`sprint-2-user-testing-summary.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md).

Facilitators prepare environment-specific accounts, fixtures, batches and reusable validation/reference inputs from `testing/user-testing/`. The pack deliberately keeps credentials out of Git and separates safe fixture-5 validation/reference data from writable success/correction scenarios that require disposable test state.

Sprint 3 continues the same protocol and evidence model through feature-level feedback gates #601–#607 and #612. A group of implementation issues that collectively delivers one user goal stays open in **In Review / awaiting user validation** until its gate closes. The implementation issues use the gate as a closure dependency; the gate itself avoids a hard dependency cycle by listing deployed/in-Review implementation work under `Cannot Begin Until`.

Sprint 3 session evidence is retained under [`evidence/user-testing/sprint-3/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3) and consolidated in `sprint-3-user-testing-summary.md`. Facilitator scenarios are prepared from `testing/user-testing/SPRINT3_SCENARIOS.md`; credentials and API keys remain outside Git.

The execution work remains split by workflow so findings can be attributed cleanly:

- #416 — public / analyst;
- #417 — submission / batch;
- #418 — review / administration.

| Date             | Session                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 23 Aug 2026      | [Issue #199 — public data journeys](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/2026-08-23-issue-199-public-data-journeys.md)                                                                                                                                                                         |
| 7 Sep 2026       | [P03 — supplementary public/analyst evidence](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/2026-09-07-P03-public.md) — retained as supplementary evidence; it is not counted as a formal task attempt because the standard facilitator metadata/outcomes were not retained.                   |
| 10 Sep 2026      | [P01 — formal public/analyst session](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/2026-09-10-P01-public.md) and [P02 — formal public/analyst session](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/2026-09-10-P02-public.md). |
| 10 & 13 Sep 2026 | [Issue #418 — reviewer / administrator P04](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/2026-09-10-P04-reviewer.md) — initial `REV-01` failure exposed #463; the same task succeeded after the fix, followed by `REV-02`, `REV-05` and `ADM-02`.                                             |
| 11 Sep 2026      | [Issue #417 — P05 submitter](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/2026-09-11-P05-submitter.md) — first external submitter session; accepted findings were linked to implementation work before the second session.                                                                    |
| 15 Sep 2026      | [Issue #417 — P06 submitter](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/2026-09-15-P06-submitter.md) — second external submitter session; retested several P05 improvements and recorded four new findings that remain explicitly pending team disposition.                                 |

Sprint 2 formal user testing is complete for the three tracked workstreams. The consolidated summary remains authoritative for finding decisions, issue links and retest status; unresolved or pending findings are carried visibly rather than treated as missing test evidence.

### Reviewer / administration traceability

Issue #418 exercises the reviewer/admin workflow implemented through #283 and #362 and supplies the representative-user evidence reused by #364. The initial P04 session exposed #463 when the prepared batch remained `Stored` and never appeared in the review queue. #463 restored the deployed worker/Service Bus path; P04 then repeated `REV-01` successfully and completed `REV-02`, `REV-05` and `ADM-02`.

Related engineering defects from the same wider ingestion/review audit include #465, #471, #479, #480, #481, #482, #483, #484, #485, #486, #487 and #488. Those issues are retained as engineering context and are not attributed to P04 unless the participant independently observed them during a recorded task.

The preceding page was planned and drafted with the assistance of Claude[Claude Sonnet 5] and reviewed and edited with ChatGPT-Web[GPT-5.6 Sol], resolving issue #254 and the Sprint 2 user-testing process update.
