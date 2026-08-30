# User Testing Protocol

## Purpose

This document defines the formal user-testing process used by the Sport Analytics Tool.

The purpose of user testing is to observe whether representative users can complete important workflows without being coached through the interface, identify usability and functional problems, record those findings consistently, and ensure important findings are either acted on or consciously rejected with a documented reason.

This protocol is intended to be repeatable across Sprint 2 and later project iterations.

---

## Scope

Testing covers three principal user journeys:

1. **Public / analyst user**
   - Finds fixtures, events and statistics.
   - Filters or explores relevant cricket data.
   - Exports data where available.
   - Understands how to access the public API or datasets.

2. **Approved submitter**
   - Authenticates using an approved test account.
   - Submits event data.
   - Understands validation results.
   - Recovers from an invalid submission.
   - Uses correction functionality where available.

3. **Administrator**
   - Performs administrative workflows available in the current build.
   - Reviews or manages authorised submitters where applicable.
   - Reviews submitted data.
   - Performs correction or review workflows where applicable.

Only functionality available in the build being tested should be included in a testing session.

---

## Participant Selection

Participants must not be developers who implemented the workflow being tested.

Suitable participants may include:

- students outside the development team;
- friends or family members unfamiliar with the interface;
- technically experienced participants acting as analysts/API consumers;
- other individuals representative of the intended public, submitter or administrator roles.

A team member may only participate where they did not implement or substantially design the workflow under test and their prior knowledge will not invalidate the test.

### Suggested Participant Mix

Sprint 2 should aim to test all three major roles.

A useful minimum target is:

- at least 2 public/analyst sessions;
- at least 2 submitter sessions;
- at least 1 administrator session.

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
- role being tested.

The facilitator should verify that the system is operational before starting but should not demonstrate the workflow that will be tested.

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

---

### 2. Run Tasks

Tasks are selected from the project's user-testing task bank.

Tasks should:

- describe a goal rather than a sequence of clicks;
- avoid naming interface controls unless necessary;
- avoid giving away navigation paths;
- represent realistic user intentions;
- be appropriate for the participant role;
- only test functionality present in the current build.

Example:

**Good**

> You want to find the statistics for a particular fixture and then narrow the information to the part you are interested in. Show us how you would do that.

**Avoid**

> Click Fixtures, select the first fixture, open Statistics and use the filter dropdown.

---

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
- notable positive observations.

The facilitator should not correct behaviour simply because it differs from the intended workflow.

---

## Task Outcome

Each task receives one outcome:

### Success

The participant completed the intended goal without assistance.

### Partial

The participant made meaningful progress but could not complete the entire goal, or required facilitator intervention.

### Failure

The participant could not complete the goal.

Where intervention occurs, the evidence should record what assistance was required.

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
6. **No change**

Where an issue is created, it should include:

- participant identifier;
- affected task;
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

Where practical, the same task should be repeated:

- against the corrected build;
- without telling the participant exactly what changed;
- using the same or another representative participant.

Retest evidence records:

- original finding;
- related Gitea issue/PR;
- build or commit tested;
- new outcome;
- whether the finding is considered resolved.

S3 and S4 findings may also be retested where appropriate.

---

## Evidence Storage

Sprint 2 evidence is stored under:

`evidence/user-testing/sprint-2/`

Session evidence uses:

`YYYY-MM-DD-PXX-ROLE.md`

Examples:

- `2026-09-03-P01-public.md`
- `2026-09-04-P02-submitter.md`
- `2026-09-05-P03-admin.md`

Supporting screenshots use the same prefix:

- `2026-09-03-P01-public-task-01.png`

The overall Sprint 2 summary is:

`evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md`

Evidence should link to relevant Gitea issues and pull requests where applicable.

---

## Sprint Summary

After the testing round, the team should summarise:

- number of participants;
- participant-role distribution;
- tasks tested;
- success/partial/failure counts;
- S1–S4 findings;
- Gitea issues created;
- findings implemented;
- findings rejected and why;
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

## AI Declaration

The preceding document was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
