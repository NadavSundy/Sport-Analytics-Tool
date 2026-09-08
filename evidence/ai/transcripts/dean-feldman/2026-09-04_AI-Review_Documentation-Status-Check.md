# Check Documentation Status

**User:** Anonymous  
**Created:** 9/8/2026 8:52:29  
**Updated:** 9/8/2026 13:27:04  
**Exported:** 9/8/2026 16:55:35  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a9fb0ad-0010-83ea-afc7-5705627bd57f](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a9fb0ad-0010-83ea-afc7-5705627bd57f)  

## Prompt:
9/8/2026, 8:52:28 AM

![51083660-de0c-4186-94d4-bfc6e4774123.png](https://chatgpt.com/backend-api/estuary/content?id=file_000000002dac821183b83b1a04620dbd&ts=496910&p=fs&cid=1&sig=3794330d8debb09f04362cc70623cdf8c16270134c3ec1c6b23253bd4beda18e&v=0)

[Attachment: Sport-Analytics-Tool-main (12).zip]

is this docuemented / implemented?

## Response:
9/8/2026, 8:52:31 AM

> **Inspecting repository documentation and implementation**
>
>
> **Inspected repository documentation and searched for user feedback evidence**
>
> 
>
> Worked for 1m 2s

**Status: Partially implemented/documented - enough evidence exists for stakeholder interaction, but the specific Sprint 2 "User Feedback" rubric item is not fully satisfied yet.**

The rubric requirement shown is:

> **User Feedback (10%)**
> - Advanced: Extensive user testing - formal feedback collection processes, evidence of collection and integration.
> - Intermediate: Some user testing - formal feedback collection process, evidence of collection, but no integration.
> - Basic: No user testing / non-formal collection.  
`project_briefs (4).pdf`

## Current evidence found in the repository

### ✅ Documented

You already have:

- `evidence/user-testing/README.md`
  - Defines the expected user testing evidence format.
  - Includes:
    - procedure
    - observations
    - quantitative results
    - feedback themes
    - accepted/rejected changes
    - retesting evidence

- `evidence/user-testing/session-template.md`
  - Template for formal sessions.

- `evidence/user-testing/2026-08-23-issue-199-public-data-journeys.md`
  - A usability review record.
  - Includes tasks, observations, and decisions.

- Sprint stakeholder evidence:
  - `evidence/sprints/sprint-1/*stakeholder-meeting.md`
  - `evidence/sprints/sprint-2/*stakeholder-review*.md`

This means **stakeholder feedback is documented**.

---

## ❌ Missing for the Advanced User Feedback mark

The rubric specifically wants **user testing**, not only stakeholder meetings.

Currently missing:

| Requirement | Status |
|---|---|
| Formal user testing protocol | ✅ Exists |
| Actual completed user sessions | ⚠️ Limited |
| Real users/test participants | ❌ Not clearly evidenced |
| Collected feedback forms/results | ❌ Missing |
| Prioritised feedback list | ⚠️ Partial |
| Code/features changed because of feedback | ⚠️ Some evidence, but not tied to user testing |
| Retesting after changes | ❌ Missing |

---

## Expected mark right now

I would estimate:

### Sprint 2 User Feedback: **Intermediate at best (50-80%)**

Reason:
- Documentation infrastructure exists.
- Some usability review exists.
- Stakeholder interaction exists.

But it does **not yet prove**:

> "Extensive User testing - Formal Feedback collection processes, evidence of collection and integration"

which is the Advanced requirement. `project_briefs (4).pdf`

---

## To make it Advanced before Milestone 2

Create:

```
evidence/user-testing/
├── session-001.md
├── session-002.md
├── feedback-summary.md
└── implemented-changes.md
```

Each session should contain:

```md
# User Testing Session 001

Date:
Participant:
Role:

## Tasks Tested
1. Register/login
2. Browse statistics
3. Submit fixture data
4. Export dataset

## Observations
- User struggled with...
- User expected...

## Feedback
Priority:
- High:
- Medium:
- Low:

## Resulting Changes
Issue:
PR:
Implementation:

## Retest
Confirmed fixed:
```

Then link each feedback item to:
- Gitea issue
- commit/PR
- screenshot/video evidence if possible

---

**Conclusion:** The project has the framework for user feedback, but the actual evidence of formal user testing + integration is the missing piece. It should be treated as an open Sprint 2 deliverable, not complete.

## Prompt:
9/8/2026, 8:55:10 AM

so if we make a google form and get a script to scrape the dawta and convert it to MD ?

## Response:
9/8/2026, 8:55:13 AM

Yes. That is actually the right approach if you want to push this from **Intermediate → Advanced** for the User Feedback rubric.

The rubric specifically wants:

> "Formal Feedback collection processes, evidence of collection and integration"  
`project_briefs (4).pdf`

A Google Form + automated evidence generation gives you **repeatable, auditable evidence**.

Recommended implementation:

## User Feedback Pipeline

```
User Tester
    |
    v
Google Form
    |
    v
Google Sheets Responses
    |
    v
Export Script (Python/Node)
    |
    v
Markdown Evidence Files
    |
    v
Repository evidence/user-testing/
    |
    v
Git Commit + Issue Links
```

---

## Google Form Structure

Create:

`Sport Analytics Tool - User Testing Feedback`

Fields:

### Participant Information

```
Tester ID:
Role:
Experience with sport analytics:
Date:
```

Avoid collecting personal information unless needed.

---

### Task Completion

Use multiple choice:

```
Task:
[ ] Completed
[ ] Completed with difficulty
[ ] Failed

Tasks:
1. Register/login
2. Browse competitions
3. View fixture statistics
4. View player statistics
5. Submit event data
6. Export data/API usage
```

---

### Usability Rating

```
How easy was this task?

1 - Very difficult
2
3
4
5 - Very easy
```

---

### Open Feedback

```
What worked well?

What was confusing?

What should be improved?

Any bugs encountered?
```

---

### Feature Requests

```
Priority:

Critical
High
Medium
Low

Suggested improvement:
```

---

## Generated Markdown Example

Your script converts:

Google Sheet row:

```
Tester 01
Fixture page confusing
Difficulty 2/5
Requested filtering
```

into:

`evidence/user-testing/session-001.md`

```md
# User Testing Session 001

Date:
2026-09-08

Participant:
Tester 01

## Tasks Tested

| Task | Result | Rating |
|-|-|-|
| View fixture statistics | Completed with difficulty | 2/5 |

## Feedback

### Positive

- Statistics displayed correctly.

### Problems

- Fixture filtering was difficult to find.

### Suggested Improvements

- Add clearer filtering controls.

## Integration

Created issue:
#XXX Improve fixture filtering UX

Implemented:
- Added filter controls
- Updated navigation labels

Retest:
Pending
```

---

## Script Options

I would use Node since your repo is already JS/TS:

```
scripts/
└── generate-user-feedback-md.ts
```

Flow:

1. Download Google Sheet CSV.
2. Parse rows.
3. Generate Markdown.
4. Save into:

```
docs/evidence/user-testing/
```

5. Commit:

```
docs: add formal user testing evidence

Assisted-by: ChatGPT-Web[GPT-5.5]
```

---

## For Advanced Rubric Evidence, add one more file

```
docs/evidence/user-testing/feedback-integration-log.md
```

Example:

```md
# Feedback Integration Log

| Feedback | Issue | Status |
|-|-|-|
| Users struggled with filters | #412 | Completed |
| API docs unclear | #413 | Completed |
| Dashboard slow | #414 | Planned |
```

This proves:

✅ feedback collected  
✅ feedback analysed  
✅ feedback integrated  
✅ changes traceable  

---

This would align strongly with the Advanced requirement because it turns user feedback from "we asked people" into a **formal engineering process with evidence**. `project_briefs (4).pdf`

AI Attribution:
Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/8/2026, 8:56:28 AM

but how should the testing be done?
is this done by an external user or us as the developers?

## Response:
9/8/2026, 8:56:32 AM

For the **User Feedback rubric**, it should ideally be done by **external users/testers**, not only the developers. The wording matters:

> "Extensive User testing - Formal Feedback collection processes, evidence of collection and integration"  
`project_briefs (4).pdf`

A developer testing their own app is closer to **internal QA/usability checking**, not genuine user feedback.

## Recommended testing structure

### 1. Recruit external testers

Good candidates:

- classmates not on the development team
- friends who follow sport
- students interested in analytics
- your project client/tutor (stakeholder feedback)
- potential API consumers (if available)

Aim for:

- Minimum: 5 users
- Strong evidence: 8-15 users

You do not need hundreds.

---

## 2. Give them tasks, don't explain everything

Do not say:

> "Click here to view statistics"

Instead:

Give them scenarios:

### Example User Test Script

```md
Scenario:
You are a sports analyst who wants to compare two players.

Task 1:
Find the statistics for Player A.

Task 2:
Compare Player A and Player B.

Task 3:
Export the statistics dataset.

Task 4:
Find the API documentation.
```

Observe:

- Did they complete it?
- How long did it take?
- Where did they struggle?
- What did they expect?

---

## 3. Tester fills Google Form afterwards

The form should collect:

### Task success

```
Could you complete the task?

○ Yes
○ Yes, but with difficulty
○ No
```

### Difficulty

```
Rate difficulty:

1 2 3 4 5
Easy        Hard
```

### Feedback

```
What was confusing?

What would you improve?

What feature would you like added?
```

---

## 4. Developers should NOT be the primary testers

Developers can do:

✅ Bug testing  
✅ Regression testing  
✅ Automated testing  
✅ Accessibility testing  

But for this rubric:

| Testing type | Counts as User Feedback? |
|-|-|
| Developer clicking through app | ❌ Weak |
| Automated Playwright tests | ❌ No |
| Tutor/client review | ✅ Yes |
| External student testing | ✅ Strong |
| Target audience testing | ✅ Best |

---

## 5. How to prove integration

The important part is closing the loop.

Example:

### Feedback collected

> "I cannot easily find player statistics."

↓

Create issue:

```
#421 Improve player statistics navigation
```

↓

Implement:

```
commit:
feat(ui): improve player statistics discovery
```

↓

Retest:

```
Tester completed task successfully after update.
```

---

## Evidence folder

I would structure it like:

```
docs/
└── evidence/
    └── user-testing/
        ├── testing-plan.md
        ├── google-form-export.csv
        ├── session-001.md
        ├── session-002.md
        ├── session-003.md
        ├── feedback-summary.md
        └── feedback-integration-log.md
```

---

## Best approach for your project

Given you are building a **Sport Analytics Tool**, I would test with:

1. **Sports fan**
   - Can they browse statistics?

2. **Analyst-type user**
   - Can they find/export data?

3. **Submitter-type user**
   - Can they submit events?

4. **Developer/API consumer**
   - Can they understand API docs?

That maps directly to your product users.

So: **do not have the team fill the Google Form.** Have external people perform structured tasks, collect responses, then show how you changed the system based on their feedback. That is what moves it into the Advanced category. `project_briefs (4).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/8/2026, 8:57:52 AM

is this worthy of an issue, if so what would it be

## Response:
9/8/2026, 8:57:55 AM

Yes. This is absolutely worthy of an issue.

It directly targets the **Milestone 2 User Feedback (10%)** criterion, where the Advanced requirement is:

> "Extensive User testing - Formal Feedback collection processes, evidence of collection and integration."  
`project_briefs (4).pdf`

Currently you have stakeholder reviews and some usability evidence, but this issue formalises the missing process: **external user testing → feedback collection → documented changes → retesting**.

Create it as a documentation/process issue, not a feature issue.

---

# Issue: Establish Formal User Testing and Feedback Integration Process

## Labels

Suggested:

```
documentation
testing
enhancement
milestone-2
user-feedback
```

---

## Title

```
Establish formal user testing process with feedback collection and integration evidence
```

---

## Description

## Summary

The project requires formal user testing evidence to demonstrate that user feedback has been collected, evaluated, and integrated into the Sport Analytics Tool.

Currently, stakeholder reviews and internal testing exist, but there is no complete external user testing workflow that captures:

- user tasks
- tester feedback
- usability observations
- identified improvements
- implemented changes
- retesting results

A formal user feedback pipeline should be created to satisfy the COMS3011A Milestone 2 User Feedback requirements.

---

## Motivation

The Milestone 2 rubric awards Advanced marks for:

> "Extensive User testing - Formal Feedback collection processes, evidence of collection and integration."

The project needs traceable evidence showing that real users interacted with the system and that their feedback influenced development decisions.

---

## Proposed Solution

Create a structured user testing process:

1. Design user testing scenarios based on key application journeys.
2. Recruit external testers who are not part of the development team.
3. Collect feedback using a formal feedback mechanism (Google Forms or equivalent).
4. Export responses into version-controlled documentation.
5. Convert feedback into actionable development tasks.
6. Track implemented improvements.
7. Perform follow-up testing after changes.

---

## User Testing Scenarios

Testers should evaluate major user journeys:

### Public User

- Browse competitions
- View fixtures
- View player/team statistics
- Navigate the platform

### Analyst User

- Access API documentation
- Retrieve statistics
- Export datasets

### Submitter User

- Authenticate
- Submit event data
- Handle validation errors

### Administrator User

- Manage users
- Review submissions
- Correct invalid data

---

## Evidence To Produce

Add:

```
docs/evidence/user-testing/
├── testing-plan.md
├── feedback-summary.md
├── session-001.md
├── session-002.md
├── integration-log.md
└── exported-feedback.csv
```

Each session should include:

- tester role
- tasks performed
- completion status
- usability issues
- suggestions
- severity/prioritisation

---

## Acceptance Criteria

- [ ] User testing plan documented.
- [ ] External testers recruited.
- [ ] At least 5 completed user testing sessions recorded.
- [ ] Feedback collected through a formal process.
- [ ] Feedback stored as version-controlled evidence.
- [ ] Feedback issues linked to Gitea issues.
- [ ] At least some feedback results in implemented changes.
- [ ] Changes are retested with users.
- [ ] Final feedback summary included in documentation site.

---

## Verification Evidence

Provide:

- Google Form responses/export.
- Screenshots of testing sessions (where appropriate).
- Markdown testing reports.
- Linked Gitea issues/PRs.
- Before/after screenshots for UI changes.
- Commit history showing implementation.

---

## Priority

High

Reason:

Required evidence for achieving Advanced level in Milestone 2 User Feedback criterion.

---

This issue fits well because it is not just "write docs"; it creates a **repeatable engineering process** and gives you evidence for marking. It should probably be scheduled before Milestone 2 submission. `project_briefs (4).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/8/2026, 8:58:33 AM

i think this is the one already made

[Logo](https://sdp.ms.wits.ac.za/) ([image](https://sdp.ms.wits.ac.za/assets/img/logo.svg))[Issues](https://sdp.ms.wits.ac.za/issues)[Pull Requests](https://sdp.ms.wits.ac.za/pulls)[Milestones](https://sdp.ms.wits.ac.za/milestones)[Explore](https://sdp.ms.wits.ac.za/explore/repos)

[svg](https://sdp.ms.wits.ac.za/notifications)

svg

[**git-push-pray**](https://sdp.ms.wits.ac.za/git-push-pray)**/**[**Sport-Analytics-Tool**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool)

**Internal**

[svgCode](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/)[**svgIssues19**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues)[svgPull Requests](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[svgActions](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[svgPackages](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/packages)[svgProjects](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[**2**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[svgReleases](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/releases)[svgWiki](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/wiki)[svgActivity](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/activity)[svgSettings](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/settings)

# Conduct Sprint 2 user testing for public and analyst workflows #416

**svgOpen**

opened 17 hours ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [17 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#issue-2093)

**Member**

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#roadmap-mapping)Roadmap mapping

S2-17 — formal user feedback and integration: public/analyst workstream.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#description)Description

Conduct formal Sprint 2 user testing with representative public/analyst users using the approved user-testing protocol.

Focus on workflows used by someone consuming published sport data rather than submitting or reviewing it.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#motivation)Motivation

The Sprint 2 rubric requires formal user feedback collection, evidence of the results and integration of appropriate feedback.

Public and analyst users represent a distinct workflow from submitters and administrators and should be evaluated separately.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#acceptance-criteria)Acceptance Criteria

- Test with at least 2 external participants who did not build the system.
- Use anonymous participant identifiers.
- Participants exercise representative public/analyst tasks, including where available:
  - finding fixtures;
  - viewing fixture/event information;
  - viewing derived statistics;
  - filtering/paging data;
  - using or exporting a dataset;
  - understanding provenance/source information.
- For each participant record:
  - tasks attempted;
  - task success/failure;
  - observations;
  - participant comments;
  - usability problems;
  - positive findings.
- Consolidate findings after the sessions.
- Assign severity/priority to significant findings.
- Each significant finding receives an explicit accept, defer or reject decision with a reason.
- Accepted defects/usability problems are created as linked bug/feature issues where appropriate.
- At least one appropriate accepted finding is integrated before Sprint 2 close-out where feasible.
- Implemented feedback is retested or otherwise verified.
- Evidence is linked from [#271](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271) and the Sprint 2 evidence/traceability documentation.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#testing-evidence)Testing Evidence

Store completed session records and consolidated findings using the existing Sprint 2 user-testing format.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#documentation)Documentation

Include the required AI usage/non-usage declaration on created testing documents.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#ai-declaration)AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sprint 2** milestone 17 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**type: testing**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=40)

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

 labels 17 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)[17 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#event-16413)

[**Coordinate Sprint 2 formal user testing and integrate prioritised feedback**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)[ #271](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added a new dependency 17 hours ago

svg[#271 Coordinate Sprint 2 formal user testing and integrate prioritised feedback](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sport-Analytics-Tool-Proj** project 17 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/298)[16 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#event-16537)

[**Conduct Sprint 2 stakeholder closeout, retrospective and milestone tag**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/298)[ #298](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/298)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) moved this to Ready in svg [Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2) on 15 hours ago

[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=80))

**Write**Preview

Drop files or click here to upload.

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[**type: testing**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=40)

[svgSprint 2](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/12)

[svgSport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)

No Assignees

**1 Participants**

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=40))

**Notifications**

**Due Date**

No due date set.

**Blocks**

[#271 Coordinate Sprint 2 formal user testing and integrate prioritised feedback](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)

git-push-pray/Sport-Analytics-Tool

svg

Reference: git-push-pray/Sport-Analytics-Tool#416

[Powered by Gitea](https://about.gitea.com/)Version: 1.24.7 Page:**116ms**Template:**30ms**

[Licenses](https://sdp.ms.wits.ac.za/assets/licenses.txt)[API](https://sdp.ms.wits.ac.za/api/swagger)

## Response:
9/8/2026, 8:58:42 AM

Yes. **This is already the issue. Do not create another one.**

Issue **#416: "Conduct Sprint 2 user testing for public and analyst workflows"** already covers the missing Advanced User Feedback requirement. It is actually better scoped than the issue I suggested because it is tied directly to the Sprint 2 rubric.

It already includes the important parts:

| Rubric Requirement | Covered by #416 |
|---|---|
| Formal testing process | ✅ "approved user-testing protocol" |
| External users | ✅ "at least 2 external participants who did not build the system" |
| Representative workflows | ✅ public + analyst workflows |
| Evidence collection | ✅ session records + consolidated findings |
| Task success/failure | ✅ required per participant |
| User comments | ✅ required |
| Prioritisation | ✅ severity/priority assignment |
| Integration | ✅ accepted findings become issues |
| Retesting | ✅ required |
| Documentation | ✅ linked from #271 + Sprint 2 evidence |

This maps directly to the rubric:

> Advanced: "Extensive User testing - Formal Feedback collection processes, evidence of collection and integration"  
`project_briefs (4).pdf`

---

The only thing I would check is whether **#416 is being executed**, because right now it is only the plan.

To actually get the marks, you need the evidence artifacts.

The remaining work is probably:

```
#416
 |
 ├── Run sessions with 2+ external testers
 |
 ├── Save evidence:
 │
 ├── docs/evidence/user-testing/
 │     ├── session-001.md
 │     ├── session-002.md
 │     ├── findings-summary.md
 │     └── integration-log.md
 |
 ├── Create issues for accepted findings
 |
 ├── Implement at least one improvement
 |
 └── Link evidence back to #416/#271
```

---

One small concern: the issue says:

> "at least 2 external participants"

That is enough for the acceptance criteria, but for an **Advanced** score I would personally aim for **5+ testers** if possible. Two proves compliance; more makes the evidence stronger.

Also, the issue is labelled:

```
tier: basic
```

I would consider changing that label. This is not a "basic" task from the rubric perspective. It is directly targeting the **Advanced Sprint 2 User Feedback** criterion.

Suggested label:

```
tier: advanced
```

or remove the tier label if your team uses it to indicate feature tiers rather than rubric targets.

No new issue needed. Work on #416. It is already the correct implementation path.

## Prompt:
9/8/2026, 8:59:15 AM

ya it hasnt been implemented, that is the goal

## Response:
9/8/2026, 8:59:19 AM

Correct - then **#416 is the implementation task**, not just documentation. It is already the right issue. The goal is to execute it and produce the evidence.

The implementation plan should be:

## #416 Execution Plan

### 1. Prepare testing materials

Create:

```
docs/evidence/user-testing/
├── testing-plan.md
├── session-001.md
├── session-002.md
├── findings-summary.md
└── feedback-integration-log.md
```

`testing-plan.md` should define:

- purpose
- target users
- tasks
- metrics collected
- feedback process

---

### 2. Create Google Form

Use the form only as the collection mechanism.

Questions:

**Participant**
- Anonymous ID
- User type:
  - Sport fan
  - Analyst
  - Developer/API consumer

**Task evaluation**

For each task:

```
Task:
Did you complete it?
- Yes
- Yes with difficulty
- No

Difficulty:
1-5

Comments:
```

Tasks should map directly to #416:

- Find fixtures
- View fixture/event information
- View derived statistics
- Filter/paginate data
- Export dataset
- Understand provenance/source information

---

### 3. Run sessions

Do not guide them through the UI.

Give them only scenarios:

Example:

> "You are an analyst preparing a report. Find the top-performing player in a competition and export the relevant data."

Record:

- where they got stuck
- unexpected behaviour
- suggestions
- successful flows

---

### 4. Convert results into evidence

Example:

`session-001.md`

```md
# User Testing Session 001

Participant:
Tester-001

Role:
Analyst

## Tasks

| Task | Result |
|-|-|
| Find fixture | Success |
| Export dataset | Difficulty |

## Observations

- User expected export action near statistics table.
- User struggled to identify API documentation.

## Feedback

Improve dataset export discoverability.
```

---

### 5. Create issues from findings

Example:

Feedback:

> "I could not find the export button."

Create:

```
Improve dataset export discoverability #XXX
```

Link:

```
#416
```

---

### 6. Implement at least one change

The issue acceptance criteria already requires:

> "At least one appropriate accepted finding is integrated before Sprint 2 close-out where feasible."

So you need:

Feedback → Issue → PR → Retest evidence

---

### 7. Close the loop

Update:

`feedback-integration-log.md`

Example:

```md
| Feedback | Action | Status |
|-|-|-|
| Export unclear | Added export button near dataset controls | Completed |
| API docs difficult | Improved API examples | Completed |
```

---

So the flow is:

```
#416
 |
Google Form
 |
External testers
 |
Markdown evidence
 |
Findings
 |
New issues
 |
Feature fixes
 |
Retest
 |
Close #416
```

This is exactly what the rubric is asking for: **formal feedback collection + evidence + integration**. `project_briefs (4).pdf`

No new issue needed. #416 is the parent execution issue.

## Prompt:
9/8/2026, 9:00:11 AM

![2f4b1f74-c8d0-426f-92ef-a107eb34a7ad.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000a7a48211b35b8642e8cb7625&ts=496910&p=fs&cid=1&sig=66c396f8319845cee5c346e4c62bd1bf76de2b6518fe5126b003fcba081ed225&v=0)

these 3 are the ones for that part of the rubric

## Response:
9/8/2026, 9:00:17 AM

Yes. These **three issues are the correct breakdown** for that rubric section. They collectively cover the major user journeys rather than creating one oversized testing task.

The Sprint 2 rubric asks for:

> "Extensive User testing - Formal Feedback collection processes, evidence of collection and integration"  
`project_briefs (4).pdf`

Your breakdown maps like this:

| Issue | Workflow Tested | Rubric Coverage |
|---|---|---|
| #416 Public and analyst workflows | Consumers of published sport data | Public UX, browsing, analytics, datasets/API |
| #417 Submission and batch workflows | Data providers | Submitter journey, validation, ingestion |
| #418 Review and administration workflows | Platform operators | Admin/reviewer workflows |

This is actually a stronger structure than one generic user testing issue because it covers the different personas in your system.

---

## Recommended execution order

### 1. #416 Public + Analyst (highest priority)

Why:
- External users will most likely fit here.
- Easiest to recruit.
- Covers the public-facing product.

Test:

```
User:
Sport analyst

Tasks:
✓ Find a competition
✓ Find fixtures
✓ View player statistics
✓ Filter results
✓ Export dataset
✓ Understand data provenance
```

---

### 2. #417 Submission + Batch

Test with:

- someone acting as a submitter
- ideally someone unfamiliar with the workflow

Tasks:

```
✓ Login
✓ Upload event data
✓ Trigger validation errors
✓ Correct submission
✓ Submit batch
✓ Understand failures
```

Important because the project brief specifically requires:

- approved submitters
- event validation
- meaningful rejection feedback  
`sport_analytics (1).pdf`

---

### 3. #418 Review + Administration

Test:

```
✓ Admin login
✓ Review submission
✓ Approve/reject data
✓ Manage users
✓ Inspect corrections
```

This proves your privileged workflows are usable.

---

## One thing I would change

The labels:

```
#416 tier: basic
#417 tier: intermediate
#418 tier: intermediate
```

are slightly misleading.

These are not feature tiers. They are **rubric evidence tasks**.

I would either:

### Option A (recommended)
Remove tier labels entirely.

or:

### Option B
Create a label:

```
rubric: user-feedback
```

and use:

```
milestone: sprint-2
type: testing
priority: high
```

because the whole group of issues is targeting the same marking criterion.

---

## What is still missing

The issues are created, but the marking evidence only exists after execution.

You still need:

```
#416
 └── session evidence

#417
 └── submission tester evidence

#418
 └── admin tester evidence
```

Then:

```
feedback-summary.md
        |
        v
issues created from findings
        |
        v
PR fixes
        |
        v
retest evidence
```

Once those three issues have completed evidence, you can reasonably argue the Advanced User Feedback requirement is met. `project_briefs (4).pdf`

So yes - **these are the right three issues. Do not create another user-testing issue.**

## Prompt:
9/8/2026, 9:01:35 AM

yes so how do we do the formal feedback collection part of them

## Response:
9/8/2026, 9:01:39 AM

For these three issues, the **formal feedback collection** should be a shared process, not three separate random approaches.

The goal is to create an auditable pipeline:

```
External Tester
      |
      v
User Testing Session
      |
      v
Formal Feedback Form
      |
      v
Collected Results
      |
      v
Analysis + Prioritisation
      |
      v
Issue / PR / Retest Evidence
```

This directly satisfies:

> "Formal Feedback collection processes, evidence of collection and integration."  
`project_briefs (4).pdf`

---

# 1. Create a Google Form template

Create one form:

**Sport Analytics Tool - Sprint 2 User Testing Feedback**

Reuse it for #416, #417, and #418.

---

## Section 1 - Participant Details

Do not collect names.

```
Participant ID:
UT-001

Role:
○ Public user
○ Sport analyst
○ Data submitter
○ Administrator/reviewer

Previous experience:
○ None
○ Some
○ Experienced
```

This gives anonymous evidence.

---

# 2. Section 2 - Task Testing

Each issue gets its own task list.

Example for #416:

## Public/Analyst Workflow

### Task 1

```
Find a competition and view its fixtures.

Result:
○ Completed
○ Completed with difficulty
○ Failed

Time taken:
○ <1 min
○ 1-3 min
○ 3+ min

Comments:
__________
```

---

### Task 2

```
Find player statistics.

Result:
○ Completed
○ Completed with difficulty
○ Failed

What was confusing?
__________
```

---

### Task 3

```
Export or consume available data.

Result:
○ Completed
○ Completed with difficulty
○ Failed

Feedback:
__________
```

---

For #417:

Tasks:

```
Submit event data
Handle validation errors
Upload batch
Understand failed submission
```

For #418:

Tasks:

```
Review submission
Approve/reject data
Manage users
Correct issues
```

---

# 3. Add SUS-style usability questions

At the end of every form:

Use 1-5 scale:

```
The system was easy to use.

1 2 3 4 5

I could complete tasks without assistance.

1 2 3 4 5

The information presented was clear.

1 2 3 4 5
```

This gives quantitative evidence.

---

# 4. Store the raw evidence

Export Google Forms responses:

```
docs/evidence/user-testing/raw/
```

Example:

```
docs/
└── evidence/
    └── user-testing/
        ├── raw/
        │   ├── feedback-416.csv
        │   ├── feedback-417.csv
        │   └── feedback-418.csv
```

Do not edit these manually.

---

# 5. Convert results into Markdown reports

Create:

```
docs/evidence/user-testing/
├── public-analyst-findings.md
├── submission-findings.md
└── admin-findings.md
```

Example:

```md
# Public Analyst Testing Findings

Participants:
UT-001
UT-002
UT-003

## Task Results

| Task | Success Rate |
|-|-|
| Find fixtures | 3/3 |
| View statistics | 2/3 |
| Export dataset | 1/3 |

## Problems Found

### Finding 1
Severity:
High

Problem:
Users could not locate dataset export.

Evidence:
UT-002, UT-003

Decision:
Accepted

Action:
Create issue #XXX
```

---

# 6. Link feedback → development work

This is the part many groups miss.

Example:

Feedback:

> "Export button is difficult to find."

Create:

```
Issue #430
Improve dataset export discoverability
```

Then:

```
#416
   |
   └── #430
          |
          └── PR #450
                 |
                 └── Retest
```

---

# 7. Final evidence for each issue

Each issue should end with something like:

## #416

Comment:

```
Completed user testing with 5 external participants.

Evidence:
docs/evidence/user-testing/public-analyst-findings.md

Key findings:
- 2 users struggled with dataset export
- 1 user requested clearer provenance information

Implemented:
- Improved export placement (#430)
- Added provenance explanation (#431)

Retested:
All affected tasks completed successfully.
```

---

## Minimum viable effort

To satisfy the rubric, I would do:

- 5 external testers total
- each tester completes one workflow
- Google Form responses
- Markdown summary
- 2-3 improvements implemented
- retest

You do **not** need 5 testers per issue.

Example:

| Issue | Testers |
|-|-|
| #416 | 5 analysts/public users |
| #417 | 2 submitter-style testers |
| #418 | 2 admin-style testers |

That gives strong evidence without becoming a project on its own.

## Prompt:
9/8/2026, 9:04:05 AM

K i want you to give me what the form(s) shoudl have
tell em what to do
also help me with a script so that whenever deployment of docs takes place, it will get the dta from the form and convert them to md files

## Response:
9/8/2026, 9:04:08 AM

Do this as a **single formal user-testing evidence pipeline** supporting #416, #417, and #418.

The important point: the **Google Form is the collection mechanism**, but the repository contains the **immutable evidence** (CSV export + generated Markdown). The docs deployment should regenerate the Markdown automatically.

---

# 1. Create Google Forms

Create **3 forms**, because the personas are different.

Do not create one huge form. It will become messy.

---

# Form 1 - Public / Analyst User Testing (#416)

Name:

```
Sport Analytics Tool - Public and Analyst User Testing
```

## Section A - Participant

Questions:

### Participant ID
Type: Short answer

Example:

```
UT-001
```

Required.

---

### User Role

Type: Multiple choice

```
Public viewer
Sport analyst
Developer/API consumer
Other
```

---

### Experience with sport analytics

Type: Multiple choice

```
None
Beginner
Intermediate
Advanced
```

---

# Section B - Task Testing

## Task 1

Title:

```
Find a competition and view fixtures
```

Description:

```
You are analysing a competition. Find the competition and locate relevant fixtures.
```

Questions:

### Completion

```
Completed successfully?
```

Options:

```
Yes
Yes, with difficulty
No
```

---

### Difficulty

Linear scale:

```
1 - Very difficult
5 - Very easy
```

---

### Comments

Paragraph:

```
What worked well?
What was confusing?
```

---

Repeat for:

## Task 2

```
View fixture and event information
```

## Task 3

```
View derived statistics
```

## Task 4

```
Filter and paginate results
```

## Task 5

```
Export or consume available data
```

## Task 6

```
Understand data provenance/source information
```

---

# Section C - Overall Feedback

Questions:

## Overall usability

Scale:

```
1 2 3 4 5
```

Question:

```
How easy was the system to use?
```

---

## Most valuable feature

Paragraph:

```
What feature was most useful?
```

---

## Improvements

Paragraph:

```
What would you improve?
```

---

## Bugs

Paragraph:

```
Did you encounter any bugs?
Describe them.
```

---

---

# Form 2 - Submission and Batch Workflow (#417)

Name:

```
Sport Analytics Tool - Submitter Testing
```

Same participant section.

Tasks:

---

## Task 1

```
Authenticate as a submitter
```

---

## Task 2

```
Submit valid event data
```

---

## Task 3

```
Submit invalid event data
```

Check:

```
Was the validation feedback understandable?
```

---

## Task 4

```
Upload a batch submission
```

---

## Task 5

```
Understand rejected submissions
```

---

Additional:

```
Did you understand why a submission failed?
```

Options:

```
Yes
Partially
No
```

---

# Form 3 - Review and Administration (#418)

Name:

```
Sport Analytics Tool - Admin and Reviewer Testing
```

Tasks:

---

## Task 1

```
Review submitted data
```

---

## Task 2

```
Approve or reject submissions
```

---

## Task 3

```
Manage users
```

---

## Task 4

```
Correct invalid data
```

---

## Task 5

```
Understand audit history/provenance
```

---

# 2. Google Sheet setup

Each form automatically creates:

```
Responses
```

sheet.

Rename tabs:

```
public_analyst_responses
submitter_responses
admin_responses
```

---

# 3. Repository structure

Create:

```
docs/
└── evidence/
    └── user-testing/
        |
        ├── raw/
        │   ├── public-analyst.csv
        │   ├── submitter.csv
        │   └── admin.csv
        |
        ├── generated/
        │   ├── public-analyst.md
        │   ├── submitter.md
        │   └── admin.md
        |
        └── README.md
```

---

# 4. Automation design

Do NOT fetch Google Forms during MkDocs build.

Bad:

```
MkDocs build
    |
    fetch Google
    |
    generate docs
```

Builds should be deterministic.

Better:

```
CI/CD
 |
 ├── Fetch Google Sheet CSV
 |
 ├── Generate Markdown
 |
 ├── MkDocs build
 |
 └── Deploy
```

---

# 5. Add script

Location:

```
scripts/generate-user-feedback-docs.ts
```

Dependencies:

```bash
npm install csv-parse
npm install -D tsx
```

---

Environment variables:

```
USER_FEEDBACK_PUBLIC_CSV_URL=
USER_FEEDBACK_SUBMITTER_CSV_URL=
USER_FEEDBACK_ADMIN_CSV_URL=
```

These are Google Sheet published CSV URLs.

Example:

```
https://docs.google.com/spreadsheets/d/<id>/export?format=csv
```

---

Script responsibilities:

1. Download CSV.
2. Parse rows.
3. Group by participant.
4. Generate Markdown.
5. Write into docs folder.

---

Pseudo output:

Input:

```
UT-001
Task: View statistics
Result: Yes
Difficulty: 5
Comment: Easy to find
```

Output:

```md
# Public Analyst User Testing

## Participant UT-001

Role:
Sport analyst

## Tasks

| Task | Result | Difficulty |
|-|-|-|
| View statistics | Success | 5 |

## Feedback

Easy to find
```

---

# 6. CI/CD integration

In your docs workflow:

Before:

```yaml
- name: Build docs
  run: mkdocs build
```

Change to:

```yaml
- name: Generate user testing evidence
  run: npm run generate:user-feedback

- name: Build docs
  run: mkdocs build
```

package.json:

```json
{
  "scripts": {
    "generate:user-feedback": "tsx scripts/generate-user-feedback-docs.ts"
  }
}
```

---

# 7. Evidence chain for marking

Your final evidence becomes:

```
Google Form
    |
    v
CSV export
    |
    v
Generated Markdown
    |
    v
MkDocs public documentation
    |
    v
Issue #416/#417/#418
    |
    v
Fix PRs
    |
    v
Retesting evidence
```

This is exactly what the Sprint 2 rubric wants: formal collection + evidence + integration. `project_briefs (4).pdf`

I would implement this as a small tooling task under #416/#417/#418 rather than another issue, because it supports all three.

## Prompt:
9/8/2026, 9:05:24 AM

here s each issue
[Logo](https://sdp.ms.wits.ac.za/) ([image](https://sdp.ms.wits.ac.za/assets/img/logo.svg))[Issues](https://sdp.ms.wits.ac.za/issues)[Pull Requests](https://sdp.ms.wits.ac.za/pulls)[Milestones](https://sdp.ms.wits.ac.za/milestones)[Explore](https://sdp.ms.wits.ac.za/explore/repos)

[svg](https://sdp.ms.wits.ac.za/notifications)

svg

[**git-push-pray**](https://sdp.ms.wits.ac.za/git-push-pray)**/**[**Sport-Analytics-Tool**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool)

**Internal**

[svgCode](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/)[**svgIssues19**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues)[svgPull Requests](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[svgActions](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[svgPackages](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/packages)[svgProjects](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[**2**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[svgReleases](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/releases)[svgWiki](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/wiki)[svgActivity](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/activity)[svgSettings](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/settings)

# Conduct Sprint 2 user testing for public and analyst workflows #416

**svgOpen**

opened 17 hours ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [17 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#issue-2093)

**Member**

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#roadmap-mapping)Roadmap mapping

S2-17 — formal user feedback and integration: public/analyst workstream.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#description)Description

Conduct formal Sprint 2 user testing with representative public/analyst users using the approved user-testing protocol.

Focus on workflows used by someone consuming published sport data rather than submitting or reviewing it.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#motivation)Motivation

The Sprint 2 rubric requires formal user feedback collection, evidence of the results and integration of appropriate feedback.

Public and analyst users represent a distinct workflow from submitters and administrators and should be evaluated separately.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#acceptance-criteria)Acceptance Criteria

- Test with at least 2 external participants who did not build the system.
- Use anonymous participant identifiers.
- Participants exercise representative public/analyst tasks, including where available:
  - finding fixtures;
  - viewing fixture/event information;
  - viewing derived statistics;
  - filtering/paging data;
  - using or exporting a dataset;
  - understanding provenance/source information.
- For each participant record:
  - tasks attempted;
  - task success/failure;
  - observations;
  - participant comments;
  - usability problems;
  - positive findings.
- Consolidate findings after the sessions.
- Assign severity/priority to significant findings.
- Each significant finding receives an explicit accept, defer or reject decision with a reason.
- Accepted defects/usability problems are created as linked bug/feature issues where appropriate.
- At least one appropriate accepted finding is integrated before Sprint 2 close-out where feasible.
- Implemented feedback is retested or otherwise verified.
- Evidence is linked from [#271](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271) and the Sprint 2 evidence/traceability documentation.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#testing-evidence)Testing Evidence

Store completed session records and consolidated findings using the existing Sprint 2 user-testing format.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#documentation)Documentation

Include the required AI usage/non-usage declaration on created testing documents.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#ai-declaration)AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sprint 2** milestone 17 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**type: testing**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=40)

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

 labels 17 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)[17 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#event-16413)

[**Coordinate Sprint 2 formal user testing and integrate prioritised feedback**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)[ #271](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added a new dependency 17 hours ago

svg[#271 Coordinate Sprint 2 formal user testing and integrate prioritised feedback](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sport-Analytics-Tool-Proj** project 17 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/298)[16 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/416#event-16537)

[**Conduct Sprint 2 stakeholder closeout, retrospective and milestone tag**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/298)[ #298](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/298)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) moved this to Ready in svg [Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2) on 15 hours ago

[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=80))

**Write**Preview

Drop files or click here to upload.

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[**type: testing**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=40)

[svgSprint 2](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/12)

[svgSport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)

No Assignees

**1 Participants**

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=40))

**Notifications**

**Due Date**

No due date set.

**Blocks**

[#271 Coordinate Sprint 2 formal user testing and integrate prioritised feedback](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271)

git-push-pray/Sport-Analytics-Tool

svg

Reference: git-push-pray/Sport-Analytics-Tool#416

[Powered by Gitea](https://about.gitea.com/)Version: 1.24.7 Page:**131ms**Template:**33ms**

[Licenses](https://sdp.ms.wits.ac.za/assets/licenses.txt)[API](https://sdp.ms.wits.ac.za/api/swagger)

[Attachment: Pasted markdown.md]

[Attachment: Pasted markdown (2).md]

## Response:
9/8/2026, 9:05:27 AM

Looking at the three issues, **do not make three separate Google Forms**. The issues are already split by workflow, but the evidence process should be shared.

The correct architecture is:

```text
                Google Form
                    |
                    |
        -----------------------------
        |             |             |
       #416          #417          #418
 Public/Analyst   Submitter     Admin/Reviewer
        |             |             |
        -----------------------------
                    |
                    v
          Generated Markdown Evidence
                    |
                    v
          MkDocs Documentation Site
```

The issues already define what must be tested:

- **#416** → public/analyst users consuming data (fixtures, stats, datasets, provenance). `Pasted markdown.md`
- **#417** → submitter workflow (submission, validation errors, batch processing, recovery). `Pasted markdown (2).md`
- **#418** → reviewer/admin workflow (review, validation info, approval/rejection, publication history). `Pasted markdown (2).md`

---

# Create ONE Google Form

Title:

```
Sport Analytics Tool Sprint 2 User Testing
```

The first question determines which issue it belongs to.

---

# Section 1 - Tester Information

## Participant ID

Short answer

Example:

```
UT-001
```

Required.

---

## Tested Workflow

Multiple choice:

```
Which workflow are you testing?

○ Public / Analyst (#416)
○ Submitter / Batch (#417)
○ Reviewer / Administrator (#418)
```

---

## User Background

Multiple choice:

```
Your experience:

○ Never used sports analytics software
○ Some experience
○ Experienced user
```

---

# Section 2 - Task Testing

Make this a repeated structure.

Every task has:

## Task name

Example:

```
Find a fixture and view match information
```

## Completion

Multiple choice:

```
Result:

○ Completed successfully
○ Completed with difficulty
○ Failed
```

## Difficulty

Linear scale:

```
1 = Very difficult
5 = Very easy
```

## Time taken

Multiple choice:

```
○ Under 1 minute
○ 1-3 minutes
○ More than 3 minutes
```

## Comments

Paragraph:

```
What worked?
What was confusing?
```

---

# Task bank

The form should show different tasks depending on workflow.

## If #416 selected

### Task 1

```
Find a competition and locate fixtures
```

### Task 2

```
View fixture/event information
```

### Task 3

```
Find derived statistics
```

### Task 4

```
Filter or paginate data
```

### Task 5

```
Export or consume a dataset
```

### Task 6

```
Identify data provenance/source information
```

These map directly to #416 acceptance criteria. `Pasted markdown.md`

---

## If #417 selected

### Task 1

```
Locate the submission workflow
```

### Task 2

```
Submit valid event data
```

### Task 3

```
Submit invalid data and understand errors
```

### Task 4

```
Upload/stage a batch or season
```

### Task 5

```
Interpret accepted/rejected batch results
```

### Task 6

```
Recover from failed submission
```

These map directly to #417. `Pasted markdown (2).md`

---

## If #418 selected

### Task 1

```
Locate pending reviews
```

### Task 2

```
Examine validation information
```

### Task 3

```
Identify problematic data
```

### Task 4

```
Approve/reject publication
```

### Task 5

```
Check publication history
```

These map directly to #418. `Pasted markdown (2).md`

---

# Final section - Overall Feedback

## What was easiest?

Paragraph.

---

## What was hardest?

Paragraph.

---

## What would you improve?

Paragraph.

---

## Did you find any bugs?

Paragraph.

---

## Overall usability rating

Scale:

```
1-5
```

Question:

```
How easy was the system to use?
```

---

# Repository evidence generation

The form should feed:

```
docs/evidence/user-testing/
```

Structure:

```
docs/
└── evidence/
    └── user-testing/
        |
        ├── raw/
        │   └── responses.csv
        |
        ├── generated/
        │   ├── issue-416-public-analyst.md
        │   ├── issue-417-submitters.md
        │   └── issue-418-admin-review.md
        |
        ├── findings-summary.md
        └── feedback-integration-log.md
```

---

# Generated Markdown example

The script converts:

Google row:

```
UT-001
Workflow: #416
Task: Find fixtures
Result: Completed with difficulty
Difficulty: 3
Comment: Took me a while to find filtering
```

into:

```md
# Sprint 2 User Testing - #416 Public Analyst

## Participant UT-001

Role:
Analyst

## Task Results

| Task | Result | Difficulty |
|-|-|-|
| Find fixtures | Difficulty | 3/5 |

## Feedback

User struggled to find filtering controls.

## Finding

Severity:
Medium

Decision:
Accepted

Action:
Create usability issue.
```

---

# Automation

Do **not** scrape during MkDocs runtime.

Use CI:

```text
GitHub/Gitea Actions
        |
        v
Download Google Sheet CSV
        |
        v
Run TypeScript generator
        |
        v
MkDocs build
        |
        v
Deploy docs
```

The script becomes a reusable evidence generator.

---

# One extra thing

The issues already require:

- anonymous IDs
- task success/failure
- observations
- comments
- usability problems
- positive findings
- prioritisation
- accept/defer/reject decisions
- retesting evidence

So your Markdown generator should generate those sections automatically. 

This approach will make #416/#417/#418 all satisfy the same formal evidence requirement instead of having three disconnected testing processes.

## Prompt:
9/8/2026, 9:06:44 AM

give me all the steps adn all the stuff i  need to do and create
also i thik there ust be an issue for this cause its not actually doing the testsing, rather setting up the pipleine

## Response:
9/8/2026, 9:06:50 AM

Yes, you are thinking about it correctly.

The existing issues **#416/#417/#418 are the actual testing execution issues**. They assume the testing process exists.

You need a separate issue first:

> **Create the formal user testing evidence pipeline**

This issue creates the infrastructure:
- Google Form(s)
- response storage
- CSV export
- Markdown generation
- docs integration
- CI/CD automation

Then #416/#417/#418 consume that pipeline.

The dependency should be:

```text
#XXX Setup formal user testing evidence pipeline
                  |
                  v
        ----------------------
        |          |         |
       #416       #417      #418
```

---

# New Issue

## Title

```
Create formal user testing feedback collection and evidence generation pipeline
```

---

## Labels

```
type: documentation
type: testing
priority: high
area: docs
tier: intermediate
```

---

## Description

```md
## Summary

Create a reusable formal user testing feedback pipeline to support Sprint 2 user testing activities (#416, #417, #418).

The pipeline should provide a consistent method for collecting external user feedback, storing evidence, generating documentation artifacts, and linking feedback findings to implemented improvements.

## Motivation

The Sprint 2 rubric requires:

- formal user feedback collection;
- evidence of collected feedback;
- evidence that feedback was evaluated and integrated.

The existing user testing issues define the workflows to test, but there is currently no standard mechanism for collecting and publishing evidence.

## Scope

Create:

1. Formal feedback collection forms.
2. Version-controlled evidence storage.
3. Automated conversion of feedback responses into Markdown documentation.
4. Documentation site integration.
5. Feedback traceability workflow.

## Acceptance Criteria

- [ ] Create formal user testing feedback form(s).
- [ ] Form collects anonymous participant identifiers.
- [ ] Form captures:
  - tested workflow;
  - tasks attempted;
  - success/failure;
  - observations;
  - comments;
  - usability issues;
  - positive findings.
- [ ] Store exported responses in a reproducible format.
- [ ] Create script to convert responses into Markdown evidence.
- [ ] Generated Markdown is included in documentation builds.
- [ ] CI/CD automatically regenerates testing evidence before docs deployment.
- [ ] Generated evidence links findings to related issues.
- [ ] Documentation includes required AI attribution.

## Dependencies

Blocks:
- #416 Conduct Sprint 2 user testing for public and analyst workflows
- #417 Conduct Sprint 2 user testing for submission and batch workflows
- #418 Conduct Sprint 2 user testing for review and administration workflows
```

---

# Implementation Steps

## Phase 1 - Create Google Form

Create:

```
Sport Analytics Tool Sprint 2 User Testing
```

Do NOT create three forms.

Use one form.

---

## Form Structure

## Section 1: Participant

### Participant ID

Type:

```
Short answer
```

Example:

```
UT-001
```

---

### Workflow Tested

Multiple choice:

```
Public / Analyst (#416)

Submitter / Batch (#417)

Reviewer / Administrator (#418)
```

---

### User Background

Multiple choice:

```
Sport fan

Sport analyst

Developer/API user

Data submitter

Administrator
```

---

# Section 2: Task Feedback

For every task:

## Task

Example:

```
Find a competition fixture
```

---

## Result

Multiple choice:

```
Completed successfully

Completed with difficulty

Failed
```

---

## Difficulty

Scale:

```
1-5
```

---

## Time Taken

```
<1 minute

1-3 minutes

3+ minutes
```

---

## Comments

Paragraph:

```
What worked?
What was confusing?
```

---

# Section 3: Overall Feedback

Questions:

```
What did you like?

What frustrated you?

What should be improved?

Did you find any bugs?

Would you use this system?
```

---

# Phase 2 - Repository Setup

Create:

```
docs/
└── evidence/
    └── user-testing/
        |
        ├── raw/
        |
        ├── generated/
        |
        ├── findings/
        |
        └── README.md
```

---

Create:

```
docs/evidence/user-testing/README.md
```

Contents:

```md
# User Testing Evidence

This directory contains formal user testing evidence.

Process:

1. External users complete testing sessions.
2. Feedback is collected anonymously.
3. Responses are exported.
4. Responses are converted into Markdown.
5. Findings are prioritised.
6. Accepted findings become development issues.
7. Changes are retested.
```

---

# Phase 3 - Google Sheet

Google Forms automatically creates:

```
Responses Sheet
```

Publish it:

Google Sheets:

```
File
 ↓
Share
 ↓
Publish to Web
 ↓
CSV
```

You get:

```
https://docs.google.com/.../export?format=csv
```

---

# Phase 4 - Markdown Generator

Create:

```
scripts/generate-user-feedback.ts
```

Responsibilities:

```
Download CSV
      |
Parse responses
      |
Group by workflow
      |
Generate Markdown
      |
Save docs/evidence/user-testing/generated/
```

Output:

```
generated/
├── public-analyst.md
├── submitter.md
└── admin-review.md
```

---

# Phase 5 - package.json

Add:

```json
{
  "scripts": {
    "generate:user-feedback": "tsx scripts/generate-user-feedback.ts"
  }
}
```

Install:

```bash
npm install csv-parse
npm install -D tsx
```

---

# Phase 6 - Environment Variables

Create:

```
USER_FEEDBACK_CSV_URL=
```

Do NOT commit.

Add to:

```
.env.example
```

---

# Phase 7 - CI/CD Integration

Your docs workflow currently probably has:

```yaml
mkdocs build
```

Change:

```yaml
- name: Generate user testing evidence
  run: npm run generate:user-feedback

- name: Build documentation
  run: mkdocs build
```

Flow:

```
Deployment triggered
        |
        v
Fetch feedback
        |
        v
Generate Markdown
        |
        v
Build MkDocs
        |
        v
Deploy
```

---

# Phase 8 - Testing Execution

After the pipeline exists:

## #416

Run:
- 2-5 external public/analyst testers

Generate:

```
generated/public-analyst.md
```

---

## #417

Run:
- 2 submitter testers

Generate:

```
generated/submitter.md
```

---

## #418

Run:
- 2 admin/reviewer testers

Generate:

```
generated/admin-review.md
```

---

# Phase 9 - Feedback Integration

Create:

```
docs/evidence/user-testing/findings-summary.md
```

Format:

```md
| Finding | Severity | Decision | Issue |
|-|-|-|-|
| Export difficult to find | High | Accepted | #430 |
| Validation message unclear | Medium | Accepted | #431 |
```

---

# Final Evidence Chain

Your marker sees:

```
Formal Form
      |
      v
Raw Responses
      |
      v
Generated Markdown
      |
      v
Public Documentation
      |
      v
Issues
      |
      v
PRs
      |
      v
Retesting
```

This is exactly what the rubric is looking for: formal feedback collection, evidence, and integration. `project_briefs (4).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/8/2026, 9:10:58 AM

> ### Participant ID

dont use the particiapnt ID - its not importanc, we need to be anon

## Response:
9/8/2026, 9:11:01 AM

Correct. Remove the **Participant ID** field.

The requirement from #416/#417/#418 is:

> "Use anonymous participant identifiers."  
`Pasted markdown.md`

The purpose is **not to identify users**, it is only to avoid collecting personal information while still allowing you to distinguish separate test sessions.

However, you do not actually need the tester to provide an ID. The form system already timestamps submissions and the generated evidence can anonymise them.

Use this instead:

---

# Updated Form Section 1 - Tester Information

## Testing Date

Automatically collected by Google Forms.

No question needed.

---

## Workflow Tested

Multiple choice:

```
Which workflow are you testing?

○ Public / Analyst (#416)
○ Submitter / Batch (#417)
○ Reviewer / Administrator (#418)
```

---

## Tester Background

Multiple choice:

```
Which best describes you?

○ Sports fan / general user
○ Sports analyst
○ Developer / API consumer
○ Data submitter
○ Administrator / reviewer
○ Other
```

---

## Previous Experience

Multiple choice:

```
Experience with sport analytics systems:

○ None
○ Some experience
○ Regular user
```

---

# Anonymous Session Handling

The script should generate anonymous references automatically.

Example:

Google Forms response:

```
Timestamp:
2026-09-08 10:15

Workflow:
Public / Analyst

Task:
View statistics

Result:
Completed
```

Generated Markdown:

```md
## Anonymous Test Session 1

Workflow:
Public / Analyst

Tasks:

| Task | Result |
|-|-|
| View statistics | Completed |

Feedback:

"The statistics page was easy to understand."
```

No names.
No emails.
No IDs.

---

# Google Form Settings

Important:

Disable:

```
Collect email addresses ❌
Require sign-in ❌
```

Enable:

```
Allow anonymous responses ✅
```

---

# Evidence Output

Instead of:

```
Participant UT-001
```

Use:

```
Anonymous Session 1
Anonymous Session 2
Anonymous Session 3
```

The evidence still satisfies:

- external participants
- anonymous testing
- repeatable sessions
- traceable findings

without storing unnecessary personal data.

---

Also update the issue acceptance interpretation:

For #416/#417/#418:

```md
For each anonymous session record:
- tasks attempted;
- task success/failure;
- observations;
- participant comments;
- usability problems;
- positive findings.
```

This is cleaner from a privacy/security perspective and better aligned with the project requirements.

## Prompt:
9/8/2026, 9:13:20 AM

## Summary

Create a reusable formal user testing feedback pipeline to support Sprint 2 user testing activities (#416, #417, #418).

The pipeline should provide a consistent method for collecting external user feedback, storing evidence, generating documentation artifacts, and linking feedback findings to implemented improvements.

## Motivation

The Sprint 2 rubric requires:

- formal user feedback collection;
- evidence of collected feedback;
- evidence that feedback was evaluated and integrated.

The existing user testing issues define the workflows to test, but there is currently no standard mechanism for collecting and publishing evidence.

## Scope

Create:

1. Formal feedback collection forms.
2. Version-controlled evidence storage.
3. Automated conversion of feedback responses into Markdown documentation.
4. Documentation site integration.
5. Feedback traceability workflow.

## Acceptance Criteria

- [ ] Create formal user testing feedback form(s).
- [ ] Form collects anonymous participant identifiers.
- [ ] Form captures:
  - tested workflow;
  - tasks attempted;
  - success/failure;
  - observations;
  - comments;
  - usability issues;
  - positive findings.
- [ ] Store exported responses in a reproducible format.
- [ ] Create script to convert responses into Markdown evidence.
- [ ] Generated Markdown is included in documentation builds.
- [ ] CI/CD automatically regenerates testing evidence before docs deployment.
- [ ] Generated evidence links findings to related issues.
- [ ] Documentation includes required AI attribution.

add ai declaration to this

## Response:
9/8/2026, 9:13:24 AM

Add this section at the bottom of the issue:

```md
## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].
```

Also update the acceptance criterion because we removed participant identifiers:

Replace:

```md
- [ ] Form collects anonymous participant identifiers.
```

with:

```md
- [ ] Form collects anonymous responses without storing personally identifiable information.
```

The final bottom section should be:

```md
## Acceptance Criteria

- [ ] Create formal user testing feedback form(s).
- [ ] Form collects anonymous responses without storing personally identifiable information.
- [ ] Form captures:
  - tested workflow;
  - tasks attempted;
  - success/failure;
  - observations;
  - comments;
  - usability issues;
  - positive findings.
- [ ] Store exported responses in a reproducible format.
- [ ] Create script to convert responses into Markdown evidence.
- [ ] Generated Markdown is included in documentation builds.
- [ ] CI/CD automatically regenerates testing evidence before docs deployment.
- [ ] Generated evidence links findings to related issues.
- [ ] Documentation includes required AI attribution.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].
```

This aligns better with the privacy requirement while still satisfying the testing issue requirement for anonymous participants. `Pasted markdown.md`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/8/2026, 12:23:29 PM

Logo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
20
Pull Requests
1
Actions
Packages
Projects
2
Releases
Wiki
Activity
Settings
docs(testing): add formal user testing protocol #317
Merged
Dean merged 1 commits from docs/264-user-testing-protocol into main last week
Conversation
1
Commits
1
Files Changed
6
+2227

Shayna commented last week
Member
Summary
Closes #264.

Adds the formal Sprint 2 user-testing process and reusable evidence structure.

Changes
added the formal user-testing protocol;
defined participant selection and anonymisation requirements;
added public, submitter and administrator testing tasks;
defined success, partial and failure outcomes;
defined S1-S4 finding severity levels;
documented how findings become Gitea bugs/features or justified non-changes;
added retesting requirements for accepted high-priority findings;
added a reusable user-testing session evidence template;
documented evidence locations and naming conventions;
added the user-testing documentation to the MkDocs navigation.
Verification
npm run check
reviewed against all Issue #264 acceptance criteria;
confirmed the protocol is ready to use for Sprint 2 user testing.
Follow-up
Actual user-testing sessions and collected evidence will be completed separately under #271.

AI Assistance
Documentation was prepared with assistance from ChatGPT-Web[GPT-5.6 Sol].

Shayna added 1 commit last week

docs(testing): add formal user testing protocol
48fec1e467
Dean approved these changes last week
&#x20;Dean merged commit 787c8335f2 into main last week
&#x20;Dean deleted branch docs/264-user-testing-protocol last week
&#x20;Dean referenced this issue from a commit last week
Merge pull request 'docs(testing): add formal user testing protocol' (#317) from docs/264-user-testing-protocol into main

Write
Preview
Leave a comment

Drop files or click here to upload.
Dean
No Label
No Milestone
No project
No Assignees
2 Participants


Notifications
Due Date
No due date set.

yyyy/mm/dd
Dependencies
No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#317
&#x20;
Powered by Gitea
Version: 1.24.7 Page:
191ms
Template:
25ms
Licenses
API
Logo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
20
Pull Requests
1
Actions
Packages
Projects
2
Releases
Wiki
Activity
Settings
Prepare the Sprint 2 formal user-testing protocol and evidence template #264
Closed
opened 2 weeks ago by Shayna · 0 comments

Shayna commented 2 weeks ago
Member
Roadmap mapping
Sprint 2 Week 1 preparation; supports S2-17 and the Sprint 2 User Feedback rubric.

Description
Prepare a repeatable formal user-testing process for the public, submitter and administrator journeys before testing begins.

Motivation
The Sprint 2 rubric gives user feedback its own weighting. Preparing the protocol now allows testing to start early enough for important feedback to be implemented and retested before the milestone.

Acceptance Criteria
Participant profiles are defined and exclude the developers who built the tested flows.
Representative public, submitter and administrator tasks are written without coaching users through the interface.
A consistent observation and feedback form is created.
The process records task success, confusion points, errors, severity and suggested follow-up.
A privacy/anonymisation approach is defined for retained evidence.
The process defines how findings become Gitea bugs/features or documented non-changes.
A retest step is defined for accepted high-priority changes.
Evidence locations and naming conventions are documented.
The protocol is ready to run before the next stakeholder check-in.
AI Declaration
The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

&#x20;Shayna added this to the Sprint 2 milestone 2 weeks ago
&#x20;Shayna added the&#x20;
area: documentation
area: frontend
type: testing
tier: basic
priority: high
&#x20;labels 2 weeks ago
&#x20;Shayna added a new dependency 2 weeks ago
\#271 Coordinate Sprint 2 formal user testing and integrate prioritised feedback
&#x20;Shayna added this to the Sport-Analytics-Tool-Proj project 2 weeks ago
&#x20;Shayna self-assigned this 2 weeks ago
&#x20;Shayna moved this to Ready in  Sport-Analytics-Tool-Proj on 2 weeks ago
&#x20;Shayna referenced this issue from a commit last week
docs(testing): add formal user testing protocol
&#x20;Shayna referenced a pull request that will close this issue last week
docs(testing): add formal user testing protocol #317
&#x20;Shayna moved this to In Review in  Sport-Analytics-Tool-Proj on last week
&#x20;Dean closed this issue last week
&#x20;Dean moved this to Done in  Sport-Analytics-Tool-Proj on last week

Write
Preview
Leave a comment

Drop files or click here to upload.
area: documentation
area: frontend
priority: high
tier: basic
type: testing
Sprint 2
Sport-Analytics-Tool-Proj

Shayna
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Blocks
\#271 Coordinate Sprint 2 formal user testing and integrate prioritised feedback
git-push-pray/Sport-Analytics-Tool
Reference: git-push-pray/Sport-Analytics-Tool#264
&#x20;
Powered by Gitea
Version: 1.24.7 Page:
115ms
Template:
29ms
Licenses
APILogo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
20
Pull Requests
1
Actions
Packages
Projects
2
Releases
Wiki
Activity
Settings
Prepare the Sprint 2 formal user-testing protocol and evidence template #264
Closed
opened 2 weeks ago by Shayna · 0 comments

Shayna commented 2 weeks ago
Member
Roadmap mapping
Sprint 2 Week 1 preparation; supports S2-17 and the Sprint 2 User Feedback rubric.

Description
Prepare a repeatable formal user-testing process for the public, submitter and administrator journeys before testing begins.

Motivation
The Sprint 2 rubric gives user feedback its own weighting. Preparing the protocol now allows testing to start early enough for important feedback to be implemented and retested before the milestone.

Acceptance Criteria
Participant profiles are defined and exclude the developers who built the tested flows.
Representative public, submitter and administrator tasks are written without coaching users through the interface.
A consistent observation and feedback form is created.
The process records task success, confusion points, errors, severity and suggested follow-up.
A privacy/anonymisation approach is defined for retained evidence.
The process defines how findings become Gitea bugs/features or documented non-changes.
A retest step is defined for accepted high-priority changes.
Evidence locations and naming conventions are documented.
The protocol is ready to run before the next stakeholder check-in.
AI Declaration
The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

&#x20;Shayna added this to the Sprint 2 milestone 2 weeks ago
&#x20;Shayna added the&#x20;
area: documentation
area: frontend
type: testing
tier: basic
priority: high
&#x20;labels 2 weeks ago
&#x20;Shayna added a new dependency 2 weeks ago
\#271 Coordinate Sprint 2 formal user testing and integrate prioritised feedback
&#x20;Shayna added this to the Sport-Analytics-Tool-Proj project 2 weeks ago
&#x20;Shayna self-assigned this 2 weeks ago
&#x20;Shayna moved this to Ready in  Sport-Analytics-Tool-Proj on 2 weeks ago
&#x20;Shayna referenced this issue from a commit last week
docs(testing): add formal user testing protocol
&#x20;Shayna referenced a pull request that will close this issue last week
docs(testing): add formal user testing protocol #317
&#x20;Shayna moved this to In Review in  Sport-Analytics-Tool-Proj on last week
&#x20;Dean closed this issue last week
&#x20;Dean moved this to Done in  Sport-Analytics-Tool-Proj on last week

Write
Preview
Leave a comment

Drop files or click here to upload.
area: documentation
area: frontend
priority: high
tier: basic
type: testing
Sprint 2
Sport-Analytics-Tool-Proj

Shayna
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Blocks
\#271 Coordinate Sprint 2 formal user testing and integrate prioritised feedback
git-push-pray/Sport-Analytics-Tool
Reference: git-push-pray/Sport-Analytics-Tool#264
&#x20;
Powered by Gitea
Version: 1.24.7 Page:
115ms
Template:
29ms
Licenses
API

this is already there on the websie and done, so we must adapt our current one to this that is already implementesd

## Response:
9/8/2026, 12:23:34 PM

Correct. We need to **adapt**, not create a parallel system.

You already have:

- **#264** → created the formal testing protocol and evidence template.
- **#317** → implemented that protocol into the docs.
- **#271** → parent/coordinator for actual testing execution.

From the merged issue:

> "Adds the formal Sprint 2 user-testing process and reusable evidence structure."  
> "Actual user-testing sessions and collected evidence will be completed separately under #271."

So the pipeline **already exists**. 

The new issue I suggested ("create formal user testing feedback pipeline") would duplicate completed work. Do not create it.

---

## What is actually missing now

You only need to execute the existing process.

The flow should now be:

```
#264
  |
  | creates protocol/template
  v
#317
  |
  | docs implementation complete
  v
#271
  |
  | coordinates testing
  |
  +------------+
  |            |
  v            v
#416         #417         #418
Public      Submitter    Admin
testing     testing      testing
```

---

## Adapt #416/#417/#418 to use existing infrastructure

Do not talk about:

- creating forms
- creating templates
- creating evidence structure
- creating anonymisation rules

Those are already done.

Instead the execution issues should say:

### #416

Use existing:

```
docs/testing/user-testing/
```

or whatever location #317 created.

Tasks:

- recruit external public/analyst testers
- run sessions
- fill existing session template
- record observations
- create findings
- link fixes

---

### #417

Same process.

Test:

- submitter workflow
- validation feedback
- batch upload
- recovery

Use existing:

- observation template
- severity model
- evidence naming convention

---

### #418

Same process.

Test:

- admin/reviewer workflow
- approval/rejection
- publication state
- history

---

# The only new issue I would create now

Actually, only if you need it:

## Title

```
Automate user testing evidence generation and documentation publishing
```

This is different from #264.

Why?

Because #264/#317 created the **manual process**.

This would create optional automation:

```
Google Forms
      |
      v
CSV export
      |
      v
Markdown generation
      |
      v
MkDocs
```

---

## But check first

The existing protocol may already define:

- evidence templates
- naming conventions
- storage locations
- manual workflow

If so, automation is a nice-to-have, not required for the rubric.

The rubric cares about:

> formal feedback collection, evidence, and integration.  
`project_briefs (4).pdf`

It does **not** require automated scraping.

---

## My recommendation

Do this:

1. **Close the idea of creating a pipeline issue.**
2. Use existing #271 → #416/#417/#418.
3. Run the tests using the existing templates.
4. Generate:
   - session records
   - findings summary
   - integration log
5. Only create automation if someone has time.

The next action is not coding. The next action is:

**Open the docs added by #317 and identify the exact user-testing template location and format, then fill it for #416/#417/#418.**

## Prompt:
9/8/2026, 12:24:40 PM

no, im just sayinbg, to adapt this to take note and adavantage of wehat is doner already&#x20;
Logo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
20
Pull Requests
1
Actions
Packages
Projects
2
Releases
Wiki
Activity
Settings
Create formal user testing feedback collection and evidence generation pipeline #428
Open
opened 3 hours ago by Dean · 0 comments

Dean commented 3 hours ago
Member
Summary
Create a reusable formal user testing feedback pipeline to support Sprint 2 user testing activities (#416, #417, #418).

The pipeline should provide a consistent method for collecting external user feedback, storing evidence, generating documentation artifacts, and linking feedback findings to implemented improvements.

Motivation
The Sprint 2 rubric requires:

formal user feedback collection;
evidence of collected feedback;
evidence that feedback was evaluated and integrated.
The existing user testing issues define the workflows to test, but there is currently no standard mechanism for collecting and publishing evidence.

Scope
Create:

Formal feedback collection forms.
Version-controlled evidence storage.
Automated conversion of feedback responses into Markdown documentation.
Documentation site integration.
Feedback traceability workflow.
Acceptance Criteria
Create formal user testing feedback form(s).
Form collects anonymous participant identifiers.
Form captures:
tested workflow;
tasks attempted;
success/failure;
observations;
comments;
usability issues;
positive findings.
Store exported responses in a reproducible format.
Create script to convert responses into Markdown evidence.
Generated Markdown is included in documentation builds.
CI/CD automatically regenerates testing evidence before docs deployment.
Generated evidence links findings to related issues.
Documentation includes required AI attribution.
AI Declaration
The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

&#x20;Dean added this to the Sprint 2 milestone 3 hours ago
&#x20;Dean added the&#x20;
area: documentation
priority: high
type: documentation
type: testing
tier: intermediate
&#x20;labels 3 hours ago
&#x20;Dean self-assigned this 3 hours ago
&#x20;Dean added this to the Sport-Analytics-Tool-Proj project 3 hours ago
&#x20;Dean added a new dependency 3 hours ago
\#416 Conduct Sprint 2 user testing for public and analyst workflows
&#x20;Dean removed a dependency 3 hours ago
\#416 Conduct Sprint 2 user testing for public and analyst workflows
&#x20;Dean added a new dependency 3 hours ago
\#416 Conduct Sprint 2 user testing for public and analyst workflows
&#x20;Dean added a new dependency 3 hours ago
\#417 Conduct Sprint 2 user testing for submission and batch workflows
&#x20;Dean added a new dependency 3 hours ago
\#418 Conduct Sprint 2 user testing for review and administration workflows
&#x20;Dean moved this to In Progress in  Sport-Analytics-Tool-Proj on 3 hours ago

Write
Preview
Leave a comment

Drop files or click here to upload.
area: documentation
priority: high
tier: intermediate
type: documentation
type: testing
Sprint 2
Sport-Analytics-Tool-Proj

Dean
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Blocks
\#416 Conduct Sprint 2 user testing for public and analyst workflows
git-push-pray/Sport-Analytics-Tool
\#417 Conduct Sprint 2 user testing for submission and batch workflows
git-push-pray/Sport-Analytics-Tool
\#418 Conduct Sprint 2 user testing for review and administration workflows
git-push-pray/Sport-Analytics-Tool
Reference: git-push-pray/Sport-Analytics-Tool#428
&#x20;
Powered by Gitea
Version: 1.24.7 Page:
110ms
Template:
24ms
Licenses
API

## Response:
9/8/2026, 12:24:45 PM

Yes, understood. The issue **#428 is still valid**, but the wording needs to be adapted so it **extends #264/#317 instead of pretending the protocol does not exist**.

Right now the problem statement is inaccurate:

> "there is currently no standard mechanism for collecting and publishing evidence."

That is false because #264/#317 already created:
- formal user-testing protocol;
- participant selection/anonymisation;
- task definitions;
- feedback form/template;
- severity levels;
- evidence locations;
- naming conventions;
- retesting process. `Pasted markdown.md`

So #428 should become the **automation and integration layer** on top of the existing process.

---

## Change #428 to:

# Title

```text
Automate Sprint 2 user testing evidence collection and documentation generation
```

---

## Updated Summary

```md
## Summary

Extend the existing Sprint 2 user-testing protocol (#264/#317) by adding automation around evidence collection, transformation, and documentation publishing.

The existing protocol defines the required testing process, evidence structure, anonymisation approach, findings workflow, and retesting requirements.

This issue focuses on reducing manual evidence handling by providing a reusable pipeline that converts collected feedback data into version-controlled documentation artifacts and integrates the results into the documentation site.
```

---

## Updated Motivation

```md
## Motivation

The Sprint 2 rubric requires:

- formal user feedback collection;
- evidence of collected feedback;
- evidence that feedback was evaluated and integrated.

The formal testing process and evidence templates have already been implemented through #264/#317.

The remaining challenge is ensuring that collected feedback can be consistently transformed into documentation evidence and traced through the development lifecycle.

Automating this workflow improves reproducibility, reduces manual formatting effort, and ensures user testing evidence remains synchronized with the public documentation site.
```

---

## Updated Scope

```md
## Scope

Extend the existing user-testing process by implementing:

1. Feedback response ingestion from the chosen collection mechanism.
2. Automated generation of Markdown evidence files using the existing user-testing templates.
3. Integration of generated evidence into the MkDocs documentation workflow.
4. Traceability between findings, Gitea issues, implemented changes, and retesting evidence.

The issue does not replace the existing user-testing protocol. It builds on the process established in #264/#317.
```

---

## Updated Acceptance Criteria

Replace the current acceptance criteria with:

```md
## Acceptance Criteria

- [ ] Reuse the existing user-testing protocol and evidence structure from #264/#317.
- [ ] Create a reproducible method for importing completed feedback responses.
- [ ] Preserve anonymous testing evidence requirements.
- [ ] Generate Markdown evidence matching the existing user-testing documentation format.
- [ ] Generated evidence includes:
  - tested workflow;
  - tasks attempted;
  - success/failure outcomes;
  - observations;
  - participant comments;
  - usability problems;
  - positive findings.
- [ ] Generated Markdown is included in the documentation build.
- [ ] CI/CD can regenerate testing evidence before documentation deployment.
- [ ] Findings can be traced from user feedback → Gitea issue → implementation → retesting evidence.
- [ ] Documentation includes required AI attribution.
```

---

## Dependency structure

Your current dependencies are correct:

```text
#428
 |
 +--> #416 Public/Analyst testing
 |
 +--> #417 Submitter testing
 |
 +--> #418 Admin testing
```

But semantically:

- #428 provides the **tooling**
- #416/#417/#418 provide the **data**

So I would keep:

```text
#428 blocks #416
#428 blocks #417
#428 blocks #418
```

because testers need the pipeline ready before generating evidence.

---

## One more correction

Remove:

```md
Form collects anonymous participant identifiers.
```

because #264 already defines anonymisation and you decided not to collect IDs.

Use:

```md
Preserve anonymous testing evidence requirements without storing personally identifiable information.
```

This aligns with the existing protocol instead of duplicating it.

---

This makes #428 a genuinely new contribution:

**#264/#317 = define the process**  
**#428 = automate the process**  
**#416/#417/#418 = execute the process**

That is the cleanest architecture.

## Prompt:
9/8/2026, 12:26:21 PM

give the new issue

## Response:
9/8/2026, 12:26:27 PM

```md
# Automate Sprint 2 user testing evidence collection and documentation generation

## Summary

Extend the existing Sprint 2 user-testing process established in #264/#317 by adding automation around feedback ingestion, evidence generation, and documentation publishing.

The existing user-testing protocol already defines:

- participant selection and anonymisation;
- representative testing tasks;
- feedback collection requirements;
- severity classification;
- finding prioritisation;
- retesting expectations;
- evidence structure and naming conventions.

This issue focuses on creating a reusable pipeline that transforms completed user-testing feedback into version-controlled Markdown evidence and integrates it into the documentation workflow.

## Motivation

The Sprint 2 rubric requires:

- formal user feedback collection;
- evidence of collected feedback;
- evidence that feedback was evaluated and integrated.

The formal testing process has already been implemented through #264/#317. However, collected feedback still requires a consistent and reproducible process for:

- importing feedback responses;
- generating evidence documents;
- publishing evidence through the documentation site;
- maintaining traceability between feedback findings and implemented changes.

Automating this workflow reduces manual formatting, improves reproducibility, and ensures user-testing evidence remains consistent across #416, #417, and #418.

## Scope

Extend the existing user-testing workflow by implementing:

1. Feedback response ingestion from the selected collection mechanism.
2. Automated generation of Markdown evidence using the existing user-testing templates.
3. Documentation site integration for generated evidence.
4. Traceability between:
   - user feedback;
   - identified findings;
   - Gitea issues;
   - implemented changes;
   - retesting evidence.

This issue does not replace the existing user-testing protocol. It builds on the process created in #264/#317.

## Acceptance Criteria

- [ ] Reuse the existing user-testing protocol and evidence structure from #264/#317.
- [ ] Create a reproducible method for importing completed feedback responses.
- [ ] Preserve anonymous testing evidence requirements without storing personally identifiable information.
- [ ] Generate Markdown evidence matching the existing user-testing documentation format.
- [ ] Generated evidence includes:
  - tested workflow;
  - tasks attempted;
  - success/failure outcomes;
  - observations;
  - participant comments;
  - usability problems;
  - positive findings.
- [ ] Generated Markdown is included in the MkDocs documentation build.
- [ ] CI/CD automatically regenerates user-testing evidence before documentation deployment.
- [ ] Generated findings can be traced from:
  - feedback response;
  - generated evidence;
  - Gitea issue;
  - implementation;
  - retesting evidence.
- [ ] Documentation includes the required AI attribution.

## Dependencies

Depends on:

- #264 Prepare the Sprint 2 formal user-testing protocol and evidence template
- #317 Add formal user-testing protocol documentation

Blocks:

- #416 Conduct Sprint 2 user testing for public and analyst workflows
- #417 Conduct Sprint 2 user testing for submission and batch workflows
- #418 Conduct Sprint 2 user testing for review and administration workflows

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].
```

This version correctly positions #428 as **automation on top of the completed #264/#317 process**, not as a replacement for the testing protocol.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)