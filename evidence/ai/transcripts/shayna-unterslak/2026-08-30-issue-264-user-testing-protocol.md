# Prepare User Testing Protocol

**User:** Anonymous  
**Created:** 8/30/2026 15:03:03  
**Updated:** 8/30/2026 15:11:16  
**Exported:** 8/30/2026 15:11:22  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a942a04-e1e8-83e9-85b6-03d374f032ad](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a942a04-e1e8-83e9-85b6-03d374f032ad)  

## Prompt:
8/30/2026, 3:03:01 PM

# Prepare the Sprint 2 formal user-testing protocol and evidence template #264

**svgOpen**

opened 4 days ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [4 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/264#issue-1542)

**Member**

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/264#roadmap-mapping)Roadmap mapping

Sprint 2 Week 1 preparation; supports S2-17 and the Sprint 2 User Feedback rubric.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/264#description)Description

Prepare a repeatable formal user-testing process for the public, submitter and administrator journeys before testing begins.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/264#motivation)Motivation

The Sprint 2 rubric gives user feedback its own weighting. Preparing the protocol now allows testing to start early enough for important feedback to be implemented and retested before the milestone.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/264#acceptance-criteria)Acceptance Criteria

- Participant profiles are defined and exclude the developers who built the tested flows.
- Representative public, submitter and administrator tasks are written without coaching users through the interface.
- A consistent observation and feedback form is created.
- The process records task success, confusion points, errors, severity and suggested follow-up.
- A privacy/anonymisation approach is defined for retained evidence.
- The process defines how findings become Gitea bugs/features or documented non-changes.
- A retest step is defined for accepted high-priority changes.
- Evidence locations and naming conventions are documented.
- The protocol is ready to run before the next stakeholder check-in.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/264#ai-declaration)AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

## Response:
8/30/2026, 3:03:02 PM

> **Planning user testing documentation**
>
> I’m treating this issue as a documentation implementation task. I’ll propose a formal protocol, participant matrix, consent/privacy guidance, feedback template, analysis method, and evidence checklist aligned with the project brief and rubric.
>
> **Planned user testing documentation**
>
> 
>
> **Structuring the protocol**
>
> I’m defining severity, finding capture, retesting, anonymized evidence filenames, participant roles, and task banks for public, submitter, and administrator journeys. The protocol will distinguish deployed features from planned ones and require outcome-based prompts.
>
> **Structured the protocol**
>
> 
>
> Worked for 25s

Yes - this issue is **preparation only**. You do **not** need to find users and run the tests to close #264. The actual testing belongs in #271. For #264, we want to leave behind a formal process that somebody could pick up tomorrow and run consistently.

That is worth doing properly because Sprint 2 gives **10% to User Feedback**, with the Advanced band explicitly requiring “Extensive User testing - Formal Feedback collection processes, evidence of collection and integration.” There is also a separate **5% Testing Documentation** criterion whose Advanced band expects extensive documentation including the formal user-feedback process and testing policy. `project_briefs.pdf`

I would implement #264 with **three small documentation files**, rather than one giant document:

```text
docs/testing/
├── user-testing-protocol.md
└── user-testing-task-bank.md

evidence/
└── user-testing/
    └── session-template.md
```

Later, #271 produces:

```text
evidence/user-testing/sprint-2/
├── 2026-09-XX-P01-public.md
├── 2026-09-XX-P02-submitter.md
├── 2026-09-XX-P03-admin.md
├── ...
└── sprint-2-user-testing-summary.md
```

The public and submitter scenarios below are directly aligned with the Sport Analytics brief: consumers need to find fixtures/events/statistics, filter/export data, while approved submitters need to submit validated event data and receive useful rejection information. `sport_analytics.pdf`

---

## 1. `docs/testing/user-testing-protocol.md`

```md
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

> P03 - Public/analyst - university student with moderate technical experience.

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

### S1 - Critical

Prevents completion of a core workflow, causes data corruption, presents a security/privacy risk, or makes the tested functionality effectively unusable.

### S2 - High

Causes a major obstacle or repeated failure in an important workflow, but a workaround may exist.

### S3 - Medium

Creates significant confusion or unnecessary effort but does not normally prevent task completion.

### S4 - Low

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
- S1-S4 findings;
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
```

That AI declaration is important: the course policy says AI-assisted writing needs a document-level declaration identifying the tool and model. `ai_policy_20_jul.pdf`

---

# 2. `docs/testing/user-testing-task-bank.md`

```md
# User Testing Task Bank

This document contains representative tasks for formal user-testing sessions.

The facilitator should select tasks appropriate to the functionality available in the build being tested.

Tasks describe user goals rather than interface instructions.

---

# Public / Analyst Journey

## PUB-01 - Discover Data

You are interested in analysing cricket data.

Starting from the application, find a fixture that interests you and show the information available about it.

### Observe

- Can the participant identify where fixtures are available?
- Do they understand the information displayed?
- Do they know where to continue for more detail?

---

## PUB-02 - Find Statistics

Choose a fixture and find useful statistics about its players or teams.

Explain what you believe the information is showing you.

### Observe

- Discoverability of statistics.
- Whether labels make sense.
- Whether derived data is understandable.
- Navigation difficulties.

---

## PUB-03 - Filter Data

You are only interested in a particular part of the available data.

Narrow the information so that it shows the data relevant to your analysis.

### Observe

- Discoverability of filters.
- Whether selected filters are obvious.
- Whether the participant understands the resulting data.

---

## PUB-04 - Export Data

You want to continue analysing this data using another tool.

Find a way to obtain the relevant data for use outside the application.

### Observe

- Discoverability of export functionality.
- Understanding of available formats.
- Whether the downloaded result matches the participant's expectation.

---

## PUB-05 - API Discovery

You are building another application and want to use the Sport Analytics Tool's data.

Find enough information to determine how you would begin accessing the API.

### Observe

- Ability to find API documentation.
- Whether the API's purpose is understandable.
- Whether examples and endpoint information are sufficient.

---

# Submitter Journey

## SUB-01 - Access Submitter Functionality

You have been approved to contribute cricket data to the platform.

Using the provided test account, find where you would submit data.

### Observe

- Whether the participant understands their role.
- Discoverability of submission functionality.
- Authentication/navigation problems.

---

## SUB-02 - Valid Submission

You have been given a valid event-data file for a fixture.

Submit the file and determine whether the platform accepted it.

### Observe

- Whether the upload workflow is understandable.
- Whether success is communicated clearly.
- Whether the participant understands what happens next.

---

## SUB-03 - Invalid Submission

You have been given another event-data file, but this one contains a problem.

Attempt to submit it and determine what needs to be corrected.

### Observe

- Whether rejection is obvious.
- Quality of validation messages.
- Whether the participant understands what is wrong.
- Whether the participant knows what to do next.

---

## SUB-04 - Recover From Validation Failure

Using the information provided by the system after the failed submission, determine how you would correct the problem and try again.

### Observe

- Whether error information is actionable.
- Whether resubmission is intuitive.
- Whether previous failure state creates confusion.

---

## SUB-05 - Correct Published/Event Data

Where correction functionality is available:

You discover that previously supplied event information is incorrect.

Find how you would correct that information.

### Observe

- Discoverability of correction controls.
- Whether the participant understands the effect of the correction.
- Whether confirmation and history information are clear.

---

# Administrator Journey

## ADM-01 - Review Access Request

Where access-request functionality is available:

A user has requested permission to submit data.

Review the request and decide what action to take using the scenario supplied by the facilitator.

### Observe

- Discoverability of pending requests.
- Whether available information supports the decision.
- Clarity of approve/reject controls.

---

## ADM-02 - Inspect Submitted Data

Find a submitted fixture or submission and determine who supplied it and what information was submitted.

### Observe

- Traceability.
- Navigation.
- Understanding of provenance information.

---

## ADM-03 - Correct Data

You have been informed that an event in an existing fixture is incorrect.

Find the appropriate administrative workflow for correcting it.

### Observe

- Discoverability.
- Confidence before committing the correction.
- Feedback after correction.
- Understanding of downstream effects.

---

# Facilitator Rules

The facilitator may:

- repeat the task;
- explain unfamiliar domain terminology contained in the task;
- resolve an environmental problem unrelated to the product.

The facilitator must not:

- point to the correct control;
- tell the participant where to navigate;
- explain the intended workflow while the task is active;
- turn a failed task into a success by coaching the participant.

If assistance is necessary, record exactly what assistance was given and mark the task Partial or Failure as appropriate.

---

## AI Declaration

The preceding document was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

---

# 3. `evidence/user-testing/session-template.md`

This is the bit that makes your later evidence **really easy to mark**.

```md
# User Testing Session

## Session Metadata

| Field | Value |
|---|---|
| Date | |
| Participant ID | PXX |
| Participant Role | Public / Submitter / Administrator |
| Relevant Experience | |
| Facilitator | |
| Observer | |
| Environment | Local / Staging / Production |
| URL | |
| Commit / Release | |
| Browser | |
| Device | |

---

## Privacy

- [ ] Participant identified only by anonymous ID in retained evidence.
- [ ] No password, token, API key or other credential retained.
- [ ] Screenshots checked for personal information.
- [ ] Participant understands the purpose of the session.
- [ ] Recording not retained, or explicit permission obtained where applicable.

---

# Tasks

## Task 1

**Task ID:**  
**Task given to participant:**

> 

### Outcome

- [ ] Success
- [ ] Partial
- [ ] Failure

### Observations

- Navigation taken:
- Confusion/hesitation:
- Errors encountered:
- Assistance requested:
- Assistance given:
- Participant comments:
- Positive observations:

### Findings

| Finding | Severity | Follow-up |
|---|---|---|
| | S1 / S2 / S3 / S4 | |

---

## Task 2

**Task ID:**  
**Task given to participant:**

>

### Outcome

- [ ] Success
- [ ] Partial
- [ ] Failure

### Observations

- Navigation taken:
- Confusion/hesitation:
- Errors encountered:
- Assistance requested:
- Assistance given:
- Participant comments:
- Positive observations:

### Findings

| Finding | Severity | Follow-up |
|---|---|---|
| | S1 / S2 / S3 / S4 | |

---

## Task 3

**Task ID:**  
**Task given to participant:**

>

### Outcome

- [ ] Success
- [ ] Partial
- [ ] Failure

### Observations

- Navigation taken:
- Confusion/hesitation:
- Errors encountered:
- Assistance requested:
- Assistance given:
- Participant comments:
- Positive observations:

### Findings

| Finding | Severity | Follow-up |
|---|---|---|
| | S1 / S2 / S3 / S4 | |

---

# Post-Test Questions

## 1. What was the most confusing part of the application?

Response:

## 2. Was there anything you expected to be able to do but could not find?

Response:

## 3. Was any wording or terminology unclear?

Response:

## 4. Which part felt easiest or most intuitive?

Response:

## 5. If you could change one thing, what would you change?

Response:

## 6. Would you feel comfortable performing these tasks again without assistance?

Response:

---

# Findings Summary

| ID | Finding | Severity | Decision | Gitea Issue |
|---|---|---|---|---|
| F01 | | | Pending | |
| F02 | | | Pending | |
| F03 | | | Pending | |

---

# Follow-Up Decisions

## F01

**Decision:** Fix / Existing issue / Feature / No change

**Reason:**

**Gitea issue/PR:**

**Retest required:** Yes / No

---

## F02

**Decision:** Fix / Existing issue / Feature / No change

**Reason:**

**Gitea issue/PR:**

**Retest required:** Yes / No

---

# Retest

Complete after an accepted high-priority finding has been addressed.

| Field | Value |
|---|---|
| Original Finding | |
| Gitea Issue | |
| Fix PR / Commit | |
| Retest Date | |
| Participant ID | |
| Outcome | Resolved / Improved / Not Resolved |

### Retest Notes

---

## AI Declaration

The preceding document was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

## Why this should close #264

It maps basically one-for-one:

| #264 acceptance criterion | Covered |
|---|---|
| Participant profiles defined; builders excluded | ✅ Protocol → Participant Selection |
| Public, submitter, admin tasks without coaching | ✅ Task bank |
| Consistent observation/feedback form | ✅ Session template |
| Success, confusion, errors, severity, follow-up | ✅ Template + protocol |
| Privacy/anonymisation | ✅ Dedicated privacy section |
| Findings become Gitea work/non-changes | ✅ Follow-up process |
| Retesting high-priority changes | ✅ Retest policy/template |
| Evidence locations/naming | ✅ Explicit file convention |
| Ready before stakeholder check-in | ✅ Immediately runnable |

And importantly, the protocol is not busywork: the project brief describes Sprint 2 as the point where the project should be moving toward stability through **testing and reviews**, and the rubric explicitly rewards both collection **and integration** of feedback. `project_briefs.pdf`

So I would **not make #264 any bigger than this**. No Google Form, ethics form, 20-person sample, statistics, or elaborate usability study. This is a CS project, not an HCI research dissertation 😭. The goal is enough formal structure that when #271 happens, you can show the marker: **here was our process → here are the raw sessions → here are the issues we raised → here are the fixes → here are the retests.**

That gives you a very clean shot at the Advanced User Feedback + Testing Documentation rubric bands.

## Prompt:
8/30/2026, 3:05:07 PM

give me branch names and steps pls, no need to regive files, ill copy from above

## Response:
8/30/2026, 3:05:14 PM

Use:

```powershell
docs/264-user-testing-protocol
```

I’d do it in this order:

```powershell
git checkout main
git pull
git checkout -b docs/264-user-testing-protocol
```

Create the folders/files:

```powershell
mkdir docs\testing -Force
mkdir evidence\user-testing -Force

New-Item docs\testing\user-testing-protocol.md -ItemType File -Force
New-Item docs\testing\user-testing-task-bank.md -ItemType File -Force
New-Item evidence\user-testing\session-template.md -ItemType File -Force
```

Then paste the three files from above into them.

After that, check what changed:

```powershell
git status
git diff
```

Run the normal repo checks before committing:

```powershell
npm run check
```

If that passes, add the documentation:

```powershell
git add docs/testing/user-testing-protocol.md
git add docs/testing/user-testing-task-bank.md
git add evidence/user-testing/session-template.md
```

Then add your AI evidence for this issue using your normal Sprint workflow: export/save this conversation under the issue-specific transcript path and update your AI register entry for #264. I’d name the transcript something like:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-30-issue-264-user-testing-protocol.md
```

Then:

```powershell
git add evidence/ai/transcripts/shayna-unterslak/2026-08-30-issue-264-user-testing-protocol.md
git add evidence/ai/registers/shayna-unterslak.csv
```

Check everything:

```powershell
git status
git diff --cached
```

Commit:

```powershell
git commit -m "docs(testing): add formal user testing protocol" -m "Refs #264" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Push:

```powershell
git push -u origin docs/264-user-testing-protocol
```

For the PR title, I’d use:

```text
docs(testing): add formal user testing protocol
```

And the PR body can be short:

```md
## Summary

Closes #264.

Adds the formal Sprint 2 user-testing preparation needed before user testing begins:

- defines participant profiles and facilitator rules;
- defines public, submitter and administrator task scenarios;
- defines task outcome and finding severity classifications;
- documents privacy and anonymisation requirements;
- defines how findings become Gitea issues or documented non-changes;
- defines retesting for accepted high-priority findings;
- adds a reusable user-testing session evidence template;
- documents evidence locations and naming conventions.

## Verification

- `npm run check`
- Reviewed protocol against all #264 acceptance criteria.

## AI Assistance

Documentation was prepared with assistance from ChatGPT-Web[GPT-5.6 Sol].
```

Once the PR is merged, you can close **#264**. **Do not actually run user tests on this branch** - that comes later under #271.

## Prompt:
8/30/2026, 3:07:02 PM

i dont have to document this process or anything anwhere??

## Response:
8/30/2026, 3:07:09 PM

You **do need to document it**, but the three files you’re creating *are* that documentation. You do **not** need another separate “we prepared a user-testing protocol” report.

For #264, I’d make sure these four things exist:

- `docs/testing/user-testing-protocol.md`
- `docs/testing/user-testing-task-bank.md`
- `evidence/user-testing/session-template.md`
- the normal **Gitea issue + PR trail** showing #264 was completed

That is enough to demonstrate the formal process required by the Sprint 2 rubric. The rubric specifically rewards a formal user-feedback process and extensive testing documentation, so these files are exactly the evidence the marker needs. `project_briefs.pdf`

There are just **two housekeeping things** I would add:

First, because these are formal docs, keep the AI declaration at the bottom of each. The course AI policy requires AI-assisted documents to state the tool/model used. `ai_policy_20_jul.pdf`

Second, I would **surface the protocol on your documentation site** if your MkDocs structure already has a Testing/Quality section. For example, add:

```yaml
- Testing:
    - User Testing Protocol: testing/user-testing-protocol.md
    - User Testing Task Bank: testing/user-testing-task-bank.md
```

to `mkdocs.yml` in the appropriate place.

That isn’t strictly necessary to satisfy the wording of #264, but since **Testing Documentation is separately marked**, having the protocol visible on the docs site makes marking much cleaner. `project_briefs.pdf`

Then later, under **#271**, you document the **actual testing sessions** in:

```text
evidence/user-testing/sprint-2/
```

So the division is:

**#264 = document how we will test.**  
**#271 = actually test people and store the evidence/results.**

You do **not** need meeting minutes, a separate process report, a video of yourselves creating the protocol, or any extra evidence document for #264. The commit/PR + these docs + your normal AI transcript/register is enough.

## Prompt:
8/30/2026, 3:08:02 PM

site_name: Sport Analytics Tool
site_description: Public documentation for the COMS3011A Sport Analytics Tool
repo_name: Git Push Pray / Sport Analytics Tool
repo_url: https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool 
 
exclude_docs: | 
  /README.md 
 
theme: 
  name: material 
  logo: design/assets/logo/statsthegame-mark-light.svg 
  favicon: design/assets/logo/statsthegame-favicon.svg 
  font: 
    text: IBM Plex Sans 
    code: IBM Plex Mono 
  palette: 
    - media: '(prefers-color-scheme: light)' 
      scheme: default 
      primary: custom 
      accent: custom 
      toggle: 
        icon: material/weather-sunny 
        name: Switch to Night Match 
    - media: '(prefers-color-scheme: dark)' 
      scheme: slate 
      primary: custom 
      accent: custom 
      toggle: 
        icon: material/weather-night 
        name: Switch to Day Match 
  features: 
    - navigation.tabs 
    - navigation.sections 
    - navigation.footer 
    - content.code.copy 
 
extra_css: 
  - stylesheets/extra.css 
 
extra_javascript: 
  - javascripts/external-links.js 
 
nav: 
  - Home: index.md 
  - Getting Started: 
      - Local Setup: development/setup.md 
      - Technology Stack: development/technology-stack.md 
      - Environment Variables: environment.md 
      - Repository Structure: architecture/repository-structure.md 
      - Testing: development/testing.md 
      - Reference Fixtures: development/reference-fixtures.md 
      - Dependencies: development/dependencies.md 
      - Gitea Issue Export: development/gitea-issue-export.md 
  - Design: 
      - Brand Guidelines: design/brand-guidelines.md 
      - Frontend Component Baseline: design/frontend-component-baseline.md 
      - Information Architecture and Wireframes: design/information-architecture-and-wireframes.md 
      - Architecture: architecture/overview.md 
      - System Architecture and Roadmap: architecture/system-architecture.md 
      - Batch Ingestion Pipeline: architecture/batch-ingestion-pipeline.md 
      - API: 
          - Overview: api/overview.md 
          - Shared Contracts: api/contracts.md 
          - Public Read API: api/public-read.md 
          - Weather API: api/weather.md 
          - Direct Event Submissions: api/submissions.md 
          - Fixture Statistic Calculations: statistics/fixture-statistics.md 
          - OpenAPI Specification: api/openapi.md 
          - Versioning and Deprecation: api/versioning.md 
      - Submission field mapping: api/submission-field-mapping.md 
      - Event to statistic mapping: api/event-statistic-mapping.md 
      - Sport Domain Definition: requirements/sport-domain-definition.md 
      - Cricsheet Data Source: data/cricsheet.md 
      - Database: 
          - Overview: database/overview.md 
          - Access and Transactions: database/access.md 
      - Event Model: database/schema.md 
      - Entity Relationships: database/erd.md 
      - Security: 
          - Overview: security/overview.md 
          - Authentication and Authorisation: security/authentication.md 
          - Password Recovery Ownership: security/password-recovery.md 
          - Privacy and Retention: security/privacy-retention.md 
          - Roles and Permissions: security/roles-and-permissions.md 
          - Provider Comparison: security/auth-provider-comparison.md 
  - Deployment: 
      - Overview: deployment/overview.md 
      - Azure Application Hosting: deployment/azure.md 
      - Azure Hosting Decision Record: adr/0003-azure-hosting.md 
      - Azure Backend: deployment/azure-backend.md 
      - Azure Frontend: deployment/azure-fronted.md 
      - Azure Deployment Recovery: deployment/azure-app-service-recovery.md 
      - Cloudflare Documentation: deployment/cloudflare_pages.md 
  - Methodology: 
      - Git Methodology: git-methodology.md 
      - Project Methodology: project_methodology.md 
      - Project Backlog and Milestone Plan: planning/project-backlog.md 
      - Sprint 1 Requirements Traceability: planning/sprint-1-requirements-traceability.md 
  - Testing: 
    - User Testing Protocol: testing/user-testing-protocol.md 
    - User Testing Task Bank: testing/user-testing-task-bank.md 
  - AI Use: ai/usage.md 
 
markdown_extensions: 
  - admonition 
  - attr_list 
  - tables 
  - toc: 
      permalink: true 
  - pymdownx.details 
  - pymdownx.highlight 
  - pymdownx.superfences: 
      custom_fences: 
        - name: mermaid 
          class: mermaid 
          format: !!python/name:pymdownx.superfences.fence_code_format 
 
plugins: 
  - search 
?

## Response:
8/30/2026, 3:08:12 PM

> **Fixing YAML nesting**
>
> I’m checking the indentation: the new `Testing` children need deeper indentation beneath `Testing:`. I’d also consider removing the duplicate Getting Started link and validating with `mkdocs build --strict`.
>
> **Fixed YAML nesting**
>
> 
>
> Worked for 10s

Almost — just fix the indentation under the new **Testing** section.

Use:

```yaml
  - Testing:
      - User Testing Protocol: testing/user-testing-protocol.md
      - User Testing Task Bank: testing/user-testing-task-bank.md
  - AI Use: ai/usage.md
```

So the bottom of your `nav:` should look like:

```yaml
  - Methodology:
      - Git Methodology: git-methodology.md
      - Project Methodology: project_methodology.md
      - Project Backlog and Milestone Plan: planning/project-backlog.md
      - Sprint 1 Requirements Traceability: planning/sprint-1-requirements-traceability.md
  - Testing:
      - User Testing Protocol: testing/user-testing-protocol.md
      - User Testing Task Bank: testing/user-testing-task-bank.md
  - AI Use: ai/usage.md
```

Your current version has:

```yaml
  - Testing:
    - User Testing Protocol: ...
```

Those child entries need the extra indentation.

One other small thing: you already have:

```yaml
- Getting Started:
    ...
    - Testing: development/testing.md
```

That's **not a problem**. I actually like keeping it there because:

- `development/testing.md` = how developers run/understand automated tests
- top-level `Testing` = formal user-testing methodology/evidence process

So I wouldn't change that right now.

Also **do not add `session-template.md` to MkDocs** — that belongs under `evidence/` and is an internal evidence template, not public documentation.

Then save `mkdocs.yml` and run:

```powershell
npm run check
```

If green, your `mkdocs.yml` change should be included in the #264 commit too:

```powershell
git add mkdocs.yml
```

So #264 will now also have the nice benefit that the formal testing process is directly visible to the marker on the docs site.

## Prompt:
8/30/2026, 3:09:14 PM

give command to format all fdcos qwe changed, and then commits etc (havent doen any yet)

## Response:
8/30/2026, 3:09:21 PM

Yep. Since you changed Markdown + `mkdocs.yml`, run Prettier across exactly those files:

```powershell
npx prettier --write docs/testing/user-testing-protocol.md docs/testing/user-testing-task-bank.md evidence/user-testing/session-template.md mkdocs.yml
```

Then verify everything:

```powershell
git status
git diff
npm run check
```

If `npm run check` is green, add the actual #264 work:

```powershell
git add docs/testing/user-testing-protocol.md
git add docs/testing/user-testing-task-bank.md
git add evidence/user-testing/session-template.md
git add mkdocs.yml
```

Then add your AI evidence. Save/export this chat as:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-30-issue-264-user-testing-protocol.md
```

Update your normal CSV register entry for #264, then stage both:

```powershell
git add evidence/ai/transcripts/shayna-unterslak/2026-08-30-issue-264-user-testing-protocol.md
git add evidence/ai/registers/shayna-unterslak.csv
```

Before committing, inspect exactly what is staged:

```powershell
git status
git diff --cached
```

Then I’d do **one commit** for this issue; the docs, template and MkDocs navigation are all one coherent change:

```powershell
git commit -m "docs(testing): add formal user testing protocol" -m "Refs #264" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Then confirm:

```powershell
git status
git log -2 --oneline
```

And push:

```powershell
git push -u origin docs/264-user-testing-protocol
```

Then PR:

```text
docs(testing): add formal user testing protocol
```

One small check before you commit: after Prettier, make sure `mkdocs.yml` still has this hierarchy:

```yaml
  - Testing:
      - User Testing Protocol: testing/user-testing-protocol.md
      - User Testing Task Bank: testing/user-testing-task-bank.md
  - AI Use: ai/usage.md
```

If `npm run check` gives you anything unexpected, paste it here before committing.

## Prompt:
8/30/2026, 3:10:27 PM

give me line to add to .csv thing

## Response:
8/30/2026, 3:10:28 PM

> **Used personal_context tool**
>
> 
>
> Worked for 20s

Yep - add this as one CSV row:

```csv
"2026-08-30","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","Planning; documentation; review; Git and Gitea guidance","Issue #264: prepare the Sprint 2 formal user-testing protocol and evidence template","Formal user-testing protocol; public, submitter and administrator task bank; reusable user-testing session evidence template; MkDocs navigation entry; Git workflow and Pull Request guidance","Reviewed and adapted the generated documentation against the Issue #264 acceptance criteria and Sprint 2 User Feedback and Testing Documentation rubric requirements; repository formatting and checks to be run before commit","evidence/ai/transcripts/shayna-unterslak/2026-08-30-issue-264-user-testing-protocol.md; Issue #264; Pull Request and commit references pending"
```

That matches your existing register column order:

`Date, Team member, Tool, Model, Purpose, Brief task, Output used, Verification or adaptation, Related evidence`.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)