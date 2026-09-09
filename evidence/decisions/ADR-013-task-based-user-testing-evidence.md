# ADR-013: Task-based formal user testing with repository-retained evidence

- **Status:** Accepted
- **Date:** 2026-09-09
- **Participants:** Project team
- **Related issues:** #264, #416, #417, #418, #444
- **Related pull requests:** #317, #432, #433

## Context

Sprint 2 requires formal user testing with evidence that feedback was collected, evaluated and
integrated. PR #317 established a task-based process where representative users attempt independent
role-specific tasks and each task receives its own outcome and findings.

PRs #432 and #433 later introduced an automated feedback-publication path built around Microsoft
Forms, Power Automate, OneDrive, `rclone`, JSON ingestion and generated MkDocs pages. That pipeline
added useful evidence-processing automation, but it also created a second user-testing model and
coupled documentation deployment to external feedback storage.

The team needs a process that can be run quickly across the public/analyst, submission/batch and
review/administration flows while preserving enough detail to show which exact task produced a
finding, what decision was made, which issue or fix followed and whether the change was retested.
The retained evidence must also remain reproducible from repository history.

## Decision

Use the task-based process established by Issue #264 / PR #317 as the canonical formal user-testing
method for Sprint 2.

The process will:

- select a small set of independent Task IDs appropriate to each participant role;
- record Success / Partial / Failure separately for every attempted task;
- retain observations, assistance and participant comments at task level;
- link every actionable finding back to the Task ID that produced it;
- classify findings by severity and record Accept / Defer / Reject decisions with reasons;
- trace accepted findings to Gitea issues, fixes and retest evidence where applicable;
- keep reviewed and anonymised session evidence under `evidence/user-testing/` in Git; and
- keep documentation deployment repository-driven rather than retrieving live feedback from an
  external store.

The Microsoft Forms -> Power Automate -> OneDrive -> `rclone` -> generated Markdown path introduced
through #432/#433 is retired as the canonical collection/publication mechanism. Historical evidence,
AI records and unrelated implementation work from those PRs remain part of repository history.

A version-controlled facilitator pack under `testing/user-testing/` provides reusable safe reference
inputs, environment-preparation guidance and mappings from prepared state to the formal Task IDs.
Credentials remain outside the repository.

## Alternatives considered

### Keep the Forms/OneDrive automation as the primary process

Rejected for Sprint 2. The automation stores a coarse response around an overall workflow and adds
external infrastructure to documentation deployment. Preserving independent task outcomes and
multiple findings per session would require further schema and workflow work before formal sessions
could start.

### Keep #317 but publish evidence dynamically from OneDrive

Rejected. Dynamic retrieval means the same repository commit can publish different evidence
according to external folder state and makes unrelated docs deployment dependent on external
credentials and availability.

### Run informal walkthroughs and summarise them afterwards

Rejected because this weakens reproducibility and makes it difficult to demonstrate formal
collection, evaluation, integration and retesting against the Sprint 2 rubric.

### Force every participant through one complete end-to-end script

Rejected because long sessions create fatigue and make findings harder to attribute to a specific
workflow. Focused role-based sessions provide cleaner evidence and allow #416, #417 and #418 to run
in parallel.

## Advantages

- Starts real user testing with minimal operational setup.
- Preserves task-level evidence and finding-level traceability.
- Allows public, submitter, batch, reviewer and administrator flows to be tested independently.
- Keeps Sprint evidence reproducible from Git history.
- Makes accepted feedback easy to trace through issue, fix and retest.
- Removes OneDrive and `rclone` from the docs deployment critical path.
- Allows AI to assist with anonymised note organisation and issue drafting without replacing human
  observation or severity/decision ownership.

## Disadvantages

- Facilitators must review and commit session notes manually.
- Environment-specific states such as a publishable batch, an unresolved reference or a disposable
  correction target still need to be prepared before a session.
- The team loses automatic ingestion/publication of Forms responses unless that approach is revisited
  later with a task-level data model.

## Consequences

- `docs/testing/user-testing-protocol.md` and `docs/testing/user-testing-task-bank.md` are the
  canonical procedure and task source.
- `testing/user-testing/` is the facilitator-preparation and reusable-data pack.
- `evidence/user-testing/sprint-2/` stores reviewed Sprint 2 sessions and the consolidated summary.
- #416, #417 and #418 remain the execution issues for the three main workflow areas.
- S1/S2 accepted changes are retested and linked to the original finding where practical.
- Documentation CI/CD builds repository content only and does not require feedback-ingestion secrets.

## Verification and review date

Verify this decision during Sprint 2 closeout by checking that:

1. #416, #417 and #418 contain representative session evidence;
2. task outcomes and findings remain independently traceable;
3. accepted findings link to implementation/retest evidence; and
4. documentation deployment remains reproducible without external feedback retrieval.

Review again at Sprint 3 planning if the team wants to reintroduce automated feedback collection.

## AI Declaration

The preceding decision record was planned and generated with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
