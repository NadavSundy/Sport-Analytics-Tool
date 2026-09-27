# User Testing Overview

Formal user testing uses the task-based process established through Issue #264 / PR #317 and retained in ADR-013. Sprint 3 continues that process through dedicated feature-level user-feedback tasks (#601–#607 and #612). These testing issues collect validation evidence independently; they are not automatic Gitea or CI closure gates for implementation work.

The process is designed to preserve evidence at individual task level so that separate product workflows can be tested, evaluated, fixed and retested independently.

## Process at a glance

1. **Prepare the session**
   - Review the [User Testing Protocol](user-testing-protocol.md).
   - Prepare the required accounts, test data and environment using the facilitator pack.

2. **Select tasks**
   - Choose only the relevant tasks from the [User Testing Task Bank](user-testing-task-bank.md).
   - Do not require one participant to test the entire application.

3. **Run the session**
   - Present goal-based tasks without coaching.
   - Record Success / Partial / Failure separately for every Task ID.

4. **Record evidence**
   - Retain observations, assistance, participant comments and findings in the repository session template.
   - Link each finding to the task that produced it.

5. **Evaluate findings**
   - Assign severity.
   - Accept, defer or reject each finding with a reason.
   - Create a Gitea issue for accepted findings where implementation work is required.

6. **Fix and retest**
   - Link implementation PRs/commits to the finding.
   - Retest accepted S1/S2 findings and other changes where appropriate.

7. **Consolidate Sprint evidence**
   - Summarise participant coverage, task outcomes, findings, integrated changes and retest results in the Sprint 2 user-testing summary.

The evidence chain should remain:

`task -> observation -> finding -> decision -> issue/fix -> retest`

## Sprint 2 execution

Formal sessions are tracked separately so that different user journeys can be targeted independently:

- **#416** — public and analyst workflows
- **#417** — submission, batch ingestion and correction workflows
- **#418** — review and administration workflows

## Sprint 3 feature-level user-feedback tasks

Sprint 3 does not introduce a new survey or evidence pipeline. Each user goal has a dedicated user-feedback issue (#601–#607 and #612). These issues are separate validation/evidence activities: an implementation issue may close when its own Definition of Done and genuine technical/process dependencies are satisfied, even if the related user-feedback issue is still open.

The `Cannot Begin Until` lists retained on user-feedback issues are **testing-readiness checklists**, not Gitea dependency or implementation-closure rules. They identify the functionality that must be deployed and usable before a representative-user session can produce meaningful evidence.

Each user-feedback task follows the same evidence chain:

`task -> observation -> finding -> decision -> issue/fix -> retest -> user-feedback issue close`

Use `testing/user-testing/SPRINT3_SCENARIOS.md` for the safe scenario catalogue and retain Sprint 3 evidence under `evidence/user-testing/sprint-3/`.

## Where the artefacts live

| Artefact               | Purpose                                                 | Location                                                          |
| ---------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| User Testing Overview  | Entry point and process map                             | `docs/testing/user-testing-overview.md`                           |
| User Testing Protocol  | Rules for running formal sessions                       | `docs/testing/user-testing-protocol.md`                           |
| User Testing Task Bank | Independently selectable user tasks                     | `docs/testing/user-testing-task-bank.md`                          |
| Facilitator Pack       | Accounts, environment and test-data preparation         | `testing/user-testing/`                                           |
| Session Template       | Per-participant task outcomes and findings              | `evidence/user-testing/session-template.md`                       |
| Sprint 2 Summary       | Consolidated formal-testing evidence                    | `evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md` |
| Sprint 3 Summary       | User-feedback coverage, findings, decisions and retests | `evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md` |
| Sprint 3 Scenarios     | Safe accounts/data/state preparation catalogue          | `testing/user-testing/SPRINT3_SCENARIOS.md`                       |
| ADR-013                | Motivation for the selected testing/evidence approach   | `evidence/decisions/ADR-013-task-based-user-testing-evidence.md`  |

The published documentation contains the methodology. Facilitator materials and retained evidence stay as version-controlled repository artefacts rather than being generated dynamically during documentation deployment.

## Decision record

The decision to use task-based, repository-retained evidence and retire the Microsoft Forms / Power Automate / OneDrive ingestion pipeline is recorded in **ADR-013** and indexed through the project Decisions page.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
