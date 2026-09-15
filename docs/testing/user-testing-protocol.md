# User Testing Protocol

> **User-testing trail:** [Overview](user-testing-overview.md) -> **Protocol** -> [Task Bank](user-testing-task-bank.md)

## Purpose

This document defines the canonical formal user-testing process used by the Sport Analytics Tool.

The purpose of user testing is to observe whether representative users can complete important workflows without being coached through the interface, identify usability and functional problems, record those findings consistently, and ensure important findings are either acted on or consciously rejected with a documented reason.

Sprint 2 established the task-based process through Issue #264 / PR #317 and ADR-013. Sprint 3 continues the same authoritative process; feature-level feedback gates add a closure convention, not a replacement feedback workflow. User-testing evidence is retained in the repository after facilitator review; Microsoft Forms, Power Automate, OneDrive retrieval and generated evidence pages are not required parts of the process.

---

## Scope

Testing is split into independently selectable workflow groups so that a participant only attempts tasks relevant to the role and functionality being evaluated:

1. **Authentication / account**
   - Signs in through the managed Google/Supabase flow.
   - Understands account and submitter-access state.
   - Finds sign-out and account-deletion boundaries without destructive testing unless a disposable account is supplied.

2. **Public / analyst**
   - Finds fixtures, events and statistics.
   - Filters or explores relevant cricket data.
   - Exports data where available.
   - Understands how to access the public API or datasets.

3. **Approved submitter — direct submission**
   - Authenticates using an approved test account.
   - Submits event data.
   - Understands validation results.
   - Recovers from an invalid submission.
   - Uses correction functionality where available.

4. **Approved submitter — batch ingestion**
   - Uploads a season or back-catalogue package.
   - Understands the durable receipt and processing state.
   - Finds and interprets the batch report.
   - Understands accepted, rejected and correction-required outcomes.

5. **Reviewer**
   - Finds staged batches awaiting review.
   - Interprets validation and reference-resolution information.
   - Resolves references where required.
   - Approves, returns or rejects a batch using the supplied scenario.

6. **Administrator**
   - Manages submitter access where applicable.
   - Uses administrative/correction functionality available in the build.

Only functionality available in the build being tested should be included in a testing session.

### Sprint 2 execution issues

The task bank is deliberately reusable across the existing Sprint 2 execution issues:

- **#416** — public and analyst workflows;
- **#417** — submission and batch workflows;
- **#418** — review and administration workflows.

A session does not need to test every task in a group. Select a small set of related tasks that answers the question being investigated.

---

## Sprint 3 Feature-Level Feedback Gates

Sprint 3 uses dedicated user-feedback issues as **closure gates** for groups of implementation issues that collectively deliver one user goal.

The rule is:

1. Implementation work may proceed while the linked feedback-gate issue is open.
2. When an implementation issue is technically complete, deploy it to the intended test environment and move it to **In Review / awaiting user validation**.
3. Keep the implementation issue open until its linked feedback gate closes.
4. The implementation issue may depend on the feedback gate as a **closure gate**.
5. The feedback-gate issue must **not** hard-depend on those implementation issues. Instead, its `Cannot Begin Until` section lists the implementation work that must be deployed and in Review before the formal session starts.
6. A feedback gate may begin only when the required build, facilitator account/state and safe scenario data are ready.
7. A feedback gate closes only after the retained session evidence has been evaluated, every S1/S2 or otherwise actionable finding has an explicit outcome, and every accepted S1/S2 change has the required retest evidence.

This direction avoids circular Gitea dependencies while preventing technically complete implementation issues from skipping representative-user validation.

### Sprint 3 gate map

| Feedback gate | User goal                                                | Primary task coverage                                                  |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| #601          | Navigation, authentication and overall frontend flow     | `AUTH-*` plus representative cross-feature navigation                  |
| #602          | Public statistics and fixture analytics                  | `PUB-01` to `PUB-06`                                                   |
| #603          | Genuinely new fixture submission and reviewer onboarding | `AUTH-01`, `AUTH-02`, `SUB-01`, `SUB-07`, `REV-01`, `REV-02`, `REV-06` |
| #604          | Season and multi-season back-catalogue ingestion         | `BAT-01` to `BAT-05`                                                   |
| #605          | Corrections, stable identity and statistics provenance   | `COR-01`, `ADM-02`, selected `PUB-*` validation                        |
| #606          | Versioned dataset release and reproducibility            | `DATA-01`, `DATA-02`                                                   |
| #607          | API consumer keys, quotas and rate-limit experience      | `PUB-05`, `API-01`                                                     |
| #612          | Selected Advanced API consumer capabilities              | `API-02`, `API-03`, `API-04`                                           |

The table is a starting map, not a requirement that one participant attempt every listed task. Each session still records only the Task IDs actually attempted.

## Participant Selection

Participants must not be developers who implemented the workflow being tested.

Suitable participants may include:

- students outside the development team;
- friends or family members unfamiliar with the interface;
- technically experienced participants acting as analysts/API consumers;
- other individuals representative of the intended public, submitter, reviewer or administrator roles.

A team member may only participate where they did not implement or substantially design the workflow under test and their prior knowledge will not invalidate the test.

### Suggested Participant Mix

Sprint 2 should aim to cover all three execution areas (#416–#418), rather than forcing every participant through the entire application.

A useful qualitative target is:

- at least 2 public/analyst sessions;
- at least 2 submitter sessions, including batch ingestion;
- at least 1 reviewer/administrator session.

Additional participants should be used where practical.

These numbers are project targets rather than statistical claims. The purpose is qualitative discovery of usability problems.

---

## Participant Identification and Privacy

Participants are recorded using anonymous identifiers:

- `P01`
- `P02`
- `P03`
- etc.

The retained evidence must not contain:

- participant surnames;
- personal email addresses;
- passwords;
- personal authentication tokens;
- API keys;
- unrelated personal information.

Where screenshots are retained, personally identifying information and credentials must be removed or obscured.

Testing should use project test accounts wherever possible.

Audio or video recordings must not be retained unless the participant has explicitly agreed to recording.

A participant's role and general technical familiarity may be recorded where relevant, for example:

> P03 — Public/analyst — university student with moderate technical experience.

---

## Test Environment

Before a session, the facilitator records:

- date;
- deployed environment or URL;
- application version, commit or release where available;
- browser/device;
- participant identifier;
- role/workflow being tested.

The facilitator should verify that the system is operational before starting but should not demonstrate the workflow that will be tested.

Where a task depends on prepared data, the facilitator should also record the fixture/package/test file used so that the result can be reproduced.

Use the version-controlled facilitator pack in `testing/user-testing/` before a prepared-data session. It defines reusable reference/error inputs, state prerequisites and safety boundaries for destructive or production-affecting tasks. Credentials are supplied separately and must never be committed.

Successful submissions, corrections, approvals, rejections and account deletion can mutate state. Run those tasks only against disposable/staging data or a production test target that the team has explicitly approved and can restore. The published fixture-5 reference pack is safe for read-only comparison and deliberate validation/conflict checks; it is not a writable success target.

---

## Session Procedure

### 1. Introduction

Tell the participant:

> We are testing the application, not you. There are no right or wrong answers.
>
> Please work through the tasks as naturally as possible. If something is confusing, say what you are thinking.
>
> I will normally not tell you where to click or how to complete a task because we want to see whether the interface communicates that successfully.

The facilitator may repeat or clarify the wording of a task but must not explain how the interface works during the task.

### 2. Select Tasks

Tasks are selected from the [User Testing Task Bank](user-testing-task-bank.md).

Tasks should:

- describe a goal rather than a sequence of clicks;
- avoid naming interface controls unless necessary;
- avoid giving away navigation paths;
- represent realistic user intentions;
- be appropriate for the participant role;
- only test functionality present in the current build;
- be recorded individually so that one workflow result does not hide another.

Example:

**Good**

> You want to find the statistics for a particular fixture and then narrow the information to the part you are interested in. Show us how you would do that.

**Avoid**

> Click Fixtures, select the first fixture, open Statistics and use the filter dropdown.

### 3. Observe Without Coaching

During each task, the observer records:

- whether the task was completed;
- obvious hesitation or confusion;
- unexpected navigation;
- errors encountered;
- misleading terminology;
- functionality the participant expected but could not find;
- comments made by the participant;
- assistance requested;
- assistance actually given;
- notable positive observations.

The facilitator should not correct behaviour simply because it differs from the intended workflow.

---

## Task Outcome

Every attempted task receives its **own** outcome. Do not assign one outcome to an entire session or combine several tasks into one result.

### Success

The participant completed the intended goal without assistance.

### Partial

The participant made meaningful progress but could not complete the entire goal, or required facilitator intervention.

### Failure

The participant could not complete the goal.

Where intervention occurs, the evidence must record what assistance was required.

---

## Findings

A session may produce zero, one or many findings. Every finding receives a unique session-local ID such as `F01`, and must link back to the Task ID that produced it.

A finding should record:

- Finding ID;
- related Task ID;
- concise anonymised description;
- severity;
- decision (`accept`, `defer`, `reject`, or `pending`);
- decision reason;
- Gitea issue where applicable;
- implementation PR/commit where applicable;
- retest requirement and result where applicable.

Positive observations may also be retained, but they do not require severity or follow-up work.

---

## Finding Severity

Each usability or functional finding should be assigned a severity.

### S1 — Critical

Prevents completion of a core workflow, causes data corruption, presents a security/privacy risk, or makes the tested functionality effectively unusable.

### S2 — High

Causes a major obstacle or repeated failure in an important workflow, but a workaround may exist.

### S3 — Medium

Creates significant confusion or unnecessary effort but does not normally prevent task completion.

### S4 — Low

Minor usability issue, wording problem, cosmetic problem or improvement suggestion.

Severity should be based on impact rather than how easy the issue is to fix.

---

## Post-Test Questions

After the tasks, ask the participant the same core questions:

1. What was the most confusing part of the application?
2. Was there anything you expected to be able to do but could not find?
3. Was any wording or terminology unclear?
4. Which part felt easiest or most intuitive?
5. If you could change one thing, what would you change?
6. Would you feel comfortable performing these tasks again without assistance?

Role-specific follow-up questions may be added where useful.

---

## Turning Findings Into Work

Every S1, S2 or otherwise actionable finding must have a recorded outcome.

Possible outcomes are:

1. **Bug issue created**
2. **UX improvement issue created**
3. **Feature request created**
4. **Existing Gitea issue linked**
5. **Accepted and fixed immediately**
6. **Deferred**
7. **Rejected / no change**

Where an issue is created, it should include:

- participant identifier;
- affected Task ID;
- anonymised observation;
- severity;
- reproduction information where relevant;
- link/path to the user-testing evidence.

Participant names must not be included in Gitea issues.

### Documented Non-Changes

Feedback does not have to be implemented automatically.

If the team decides not to act on a finding, the user-testing summary must record:

- the finding;
- the decision;
- the reason for the decision.

Examples include:

- outside project scope;
- conflicts with stakeholder requirements;
- disproportionately expensive relative to its severity;
- issue could not be reproduced;
- participant expectation conflicts with the intended product behaviour.

This ensures feedback is evaluated rather than silently ignored.

---

## Retesting

S1 and S2 findings that result in an accepted change must be retested.

Where practical, repeat the same Task ID:

- against the corrected build;
- without telling the participant exactly what changed;
- using the same or another representative participant.

Retest evidence records:

- original finding;
- related Task ID;
- related Gitea issue/PR;
- build or commit tested;
- new outcome;
- whether the finding is considered resolved.

S3 and S4 findings may also be retested where appropriate.

---

## Evidence Storage

Reviewed evidence is stored by Sprint:

- Sprint 2: `evidence/user-testing/sprint-2/`
- Sprint 3: `evidence/user-testing/sprint-3/`

Session evidence uses the same naming convention in both Sprints:

`YYYY-MM-DD-PXX-ROLE.md`

Examples:

- `2026-09-10-P01-public.md`
- `2026-09-10-P02-submitter.md`
- `2026-09-10-P03-reviewer.md`
- `2026-09-20-P07-api-consumer.md`

Supporting screenshots use the same prefix:

- `2026-09-10-P01-public-PUB-02.png`
- `2026-09-20-P07-api-consumer-API-01.png`

The consolidated summaries are:

- `evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md`
- `evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md`

Before committing session evidence, the facilitator must review it for credentials, personal information and unnecessary identifying detail.

Evidence should link to relevant Gitea issues and pull requests where applicable. The committed evidence is the authoritative retained record for the Sprint; documentation deployment does not retrieve or regenerate user feedback from an external service.

---

## Sprint Summary

After the testing round, the team should summarise:

- number of participants;
- participant-role distribution;
- tasks tested;
- Success / Partial / Failure counts by Task ID;
- S1–S4 findings;
- accepted, deferred and rejected findings;
- Gitea issues created;
- findings implemented;
- retest results;
- remaining concerns.

This summary provides the traceability between collected user feedback and changes to the product.

---

## Relationship to Automated Testing

User testing and automated testing serve different purposes.

Automated tests verify expected system behaviour repeatedly.

User testing observes whether real users can understand and successfully use that behaviour.

A user-testing finding that exposes a reproducible functional defect should normally result in an automated regression test where appropriate.

---

## AI-Assisted Analysis

AI may be used to help organise anonymised facilitator notes, identify repeated themes, draft Gitea issues, compare task outcomes and prepare summaries. The team remains responsible for checking the analysis against the original session evidence and for making severity, scope and implementation decisions.

Do not provide participant credentials, unreviewed personal information or other restricted data to an AI tool.

---

## AI Declaration

The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
