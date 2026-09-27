# Complete Issue According Docs

**User:** Anonymous  
**Created:** 9/24/2026 9:28:13  
**Updated:** 9/24/2026 14:40:30  
**Exported:** 9/26/2026 13:12:36  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ab4d10c-bfc8-83ea-b17a-c9c8d754821f](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ab4d10c-bfc8-83ea-b17a-c9c8d754821f)  

## Prompt:
9/24/2026, 9:29:07 AM

how do we complete this issue according to our docs https://sports-analytics-tool.pages.dev

[Attachment: Pasted markdown.md]

## Response:
9/24/2026, 9:29:09 AM

> **Searching the web**
>
> 
>
> **Searched project files for task bank and evidence content**
>
> 
>
> **Fetching Sports Analytics Documentation**
>
>
> **Planning QA completion**
>
> I’m basing the plan on the issue’s explicit gates: confirm prerequisites, test AUTH-01 through AUTH-04 with representative roles, record severity and dispositions, retest fixes, preserve evidence, and link implementation issues before closing.
>
> **Planned QA completion**
>
> 
>
> **Fetched sports analytics documentation**
>
> 
>
> Worked for 1m 15s

To complete **#601**, treat it as a **user-testing closure gate**, not an implementation issue. The correct sequence is: verify prerequisites → run the six prescribed tasks with representative users → record task outcomes/findings → create or link follow-up issues → retest accepted serious findings → commit sanitized evidence → post the final gate decision → close #601. The issue explicitly says it validates the complete user workflow rather than individual technical changes. `Pasted markdown.md`

I could not fetch `sports-analytics-tool.pages.dev` from the current environment, so I am not going to invent any additional requirements from pages I cannot verify. The plan below is grounded in **#601 itself and the official COMS3011A brief**.

## 1. First verify that testing is actually allowed to start

Do **not** start the participant sessions yet unless all of these are true:

| Check | Required state |
|---|---|
| #600 Sprint 3 task-bank/facilitator setup | Complete |
| #580 Google OAuth branding | Deployed to Sprint 3 test environment + technically reviewed + **In Review / Ready for User Testing** |
| #581 navigation/role journeys | Deployed + technically reviewed + **In Review / Ready for User Testing** |
| Relevant automated tests | Passing |
| Test build | Record exact commit SHA/environment |

Those prerequisites are explicitly required by #601. `Pasted markdown.md` The issue also clarifies that the formal Gitea dependency structure intentionally avoids circular dependencies, so #580/#581 may not appear as hard dependencies even though you **must not execute the test before they are ready**. `Pasted markdown.md`

At the moment, the issue shows **#600 as its remaining formal dependency**. `Pasted markdown.md`

---

## 2. Use representative users

You need to exercise the workflow from the roles listed by the gate:

- public/viewer
- approved submitter
- reviewer/admin where the changed role navigation applies

Do not put participant real names into committed/Gitea findings; use IDs such as `P01`, `P02`, `P03`. `Pasted markdown.md`

A practical minimum execution would therefore be:

| Participant | Role |
|---|---|
| `P01` | Public/viewer |
| `P02` | Approved submitter |
| `P03` | Reviewer/admin |

More participants would strengthen the evidence, but the issue does not specify a mandatory numeric sample size, so don't invent one as an acceptance criterion.

---

## 3. Run exactly the task-bank tasks

Use the task wording from the **Sprint 3 task bank created by #600**. Do not improvise different tasks if those already exist.

#601 requires these six IDs:

| Task | Purpose |
|---|---|
| `AUTH-01` | Sign In or Sign Up |
| `AUTH-02` | Understand Submission Access |
| `AUTH-04` | Sign Out and Continue Public Browsing |
| `PUB-01` | Discover Data |
| `SUB-01` | Access Submitter Functionality |
| `REV-01` | Find Work Awaiting Review |

These are the exact task IDs named by the gate. `Pasted markdown.md`

### Important facilitator rule

**Do not coach them.**

You should give them the task-bank prompt and observe what they do. If you have to tell them where to click or explain the interface, record that intervention and consider the task `Partial` or `Failure`. `Pasted markdown.md`

Observe specifically:

- primary-navigation discoverability
- authentication hand-off and signed-in state
- role-specific navigation
- public browsing after sign-out
- confusing names/tabs/dead ends
- responsive/accessibility problems

Those are exactly the observation areas #601 asks for. `Pasted markdown.md`

---

## 4. Record every task individually

For **every attempted task**, record exactly one:

`Success`, `Partial`, or `Failure`. `Pasted markdown.md`

I would record sessions approximately like this:

```md
# Sprint 3 User Test - P02

## Session Metadata

- Participant: P02
- Role: Approved submitter
- Environment: Sprint 3 deployed test environment
- Commit: <exact SHA>
- Date: 2026-09-XX
- Facilitator: <team member>

## Task Results

| Task ID | Result | Intervention | Observation |
|---|---|---|---|
| AUTH-01 | Success | None | Participant located sign-in without assistance. |
| AUTH-02 | Partial | None | Participant initially expected submission access under another menu. |
| AUTH-04 | Success | None | Public data remained discoverable after sign-out. |
| PUB-01 | Success | None | Participant found fixture data independently. |
| SUB-01 | Success | None | Submitter functionality located independently. |

## Findings

| Finding | Task | Severity | Outcome |
|---|---|---|---|
| F-601-01 | AUTH-02 | S3 | Linked to #XXX |
```

Don't fabricate observations like those examples; replace them with what actually happens.

---

## 5. Severity-rate every finding

Each usability/functional finding must be classified:

- `S1 - Critical`
- `S2 - High`
- `S3 - Medium`
- `S4 - Low`

And every `S1`, `S2`, **or otherwise actionable finding** needs a documented disposition. `Pasted markdown.md`

That disposition can be:

- new bug
- UX improvement
- feature issue
- existing issue
- fixed immediately
- deferred with reason
- rejected/no-change with reason

If you create a Gitea issue, #601 requires it to contain the anonymised participant ID, Task ID, observation, severity, reproduction details where appropriate, and evidence path. `Pasted markdown.md`

For example:

```md
## User-testing provenance

- Parent gate: #601
- Participant: P02
- Task: AUTH-02
- Severity: S2
- Evidence: `evidence/user-testing/sprint-3/601-navigation-auth/sessions/P02.md`

## Observation

<anonymised factual observation>

## Reproduction

1. ...
2. ...
3. ...
```

---

## 6. Fix and retest accepted S1/S2 findings

This is important: **finding the problem is not enough**.

If you accept an `S1` or `S2` change:

1. create/link the implementation issue;
2. fix it;
3. deploy the corrected build;
4. rerun the affected Task ID;
5. record the retest result.

The issue specifically requires accepted S1/S2 changes to be retested, preferably against the same task. `Pasted markdown.md`

An unresolved accepted S1/S2 means the gate is not ready for a clean `Accepted` result.

---

## 7. Commit the evidence

#601 specifically requires reviewed evidence under:

```text
evidence/user-testing/sprint-3/
```

`Pasted markdown.md`

I suggest this structure:

```text
evidence/
└── user-testing/
    └── sprint-3/
        └── 601-navigation-auth/
            ├── README.md
            ├── sessions/
            │   ├── P01-viewer.md
            │   ├── P02-submitter.md
            │   └── P03-reviewer-admin.md
            ├── findings.md
            └── retests.md
```

`README.md` should summarize:

```md
# #601 - Navigation, Authentication and Frontend Flow

## Build Under Test

- Environment:
- Frontend URL:
- Commit:
- Test dates:

## Participants

| ID | Role |
|---|---|
| P01 | Public/viewer |
| P02 | Approved submitter |
| P03 | Reviewer/admin |

## Task Summary

| Task | Participant | Result |
|---|---|---|
| AUTH-01 | P01 | Success |
| AUTH-02 | P02 | Partial |
| AUTH-04 | P01 | Success |
| PUB-01 | P01 | Success |
| SUB-01 | P02 | Success |
| REV-01 | P03 | Success |

## Findings

| ID | Task | Severity | Outcome | Issue |
|---|---|---|---|---|
| F-01 | AUTH-02 | S3 | Accepted for improvement | #XXX |

## Serious Finding Retests

| Finding | Build | Result |
|---|---|---|
| - | - | No accepted S1/S2 findings |

## Gate Decision

Accepted / Accepted with documented limitations / Not accepted

## Linked implementation issues released for closure

- #580
- #581
```

The evidence must contain participant identifier/role, environment/build/commit, Task IDs, outcome, findings, severity, linked issue/PR, decision and retest results where required. `Pasted markdown.md`

Before committing, remove passwords, email addresses, OAuth details, access tokens and participant-identifying information. The acceptance criteria explicitly require evidence to be reviewed for credentials/personal information. `Pasted markdown.md`

---

## 8. Post the final #601 closure comment

Once the evidence PR is merged, I would use this format:

```md
## Sprint 3 User-Feedback Gate Result

**Result:** Accepted

### Build Tested

- Environment: <environment>
- Commit: `<sha>`
- Evidence: `evidence/user-testing/sprint-3/601-navigation-auth/`

### Participants

- P01 - public/viewer
- P02 - approved submitter
- P03 - reviewer/admin

### Task Results

| Task ID | Result |
|---|---|
| AUTH-01 | Success |
| AUTH-02 | Success |
| AUTH-04 | Success |
| PUB-01 | Success |
| SUB-01 | Success |
| REV-01 | Success |

### Findings

- S1: 0
- S2: 0
- S3: <n>
- S4: <n>

All actionable findings have a recorded disposition and are linked
from the committed evidence.

### Retesting

No accepted S1/S2 findings required retesting.

<!-- OR list each accepted S1/S2 finding and its successful retest. -->

### Closure

The authentication/navigation user goal has been exercised with
representative users without facilitator coaching.

Evidence has been reviewed for credentials and personal information
and committed in <PR link>.

The following linked implementation issues are released from the
user-feedback gate:

- #580
- #581

Their closure remains subject to their own remaining technical
acceptance criteria.
```

Change `Accepted` to either **`Accepted with documented limitations`** or **`Not accepted`** if that is what the actual evidence supports. Those are the three gate outcomes explicitly required by #601. `Pasted markdown.md`

---

## 9. Then close #601 - and only then release #580/#581

The Definition of Done is not simply “we did user testing.” It requires:

**complete user goal exercised → actionable feedback dispositioned → accepted serious findings retested → evidence committed.** `Pasted markdown.md`

Closing #601 then releases **#580 and #581** from this user-feedback gate, but those implementation issues can close only if their own technical acceptance criteria are also complete. `Pasted markdown.md`

This is also exactly the kind of evidence the course rubric rewards: formal user feedback collection **with evidence of collection and integration**, rather than informal testing. `project_briefs (4).pdf` Sprint 3 itself is due **29 September**, so with the current date of 24 September this should be executed now rather than left until the final submission phase. `project_briefs (4).pdf`

### Therefore your immediate next action

**Check #600, #580 and #581 first.** If #600 is complete and the #580/#581 builds are deployed and marked ready for user testing, create the `601-navigation-auth` evidence folder, recruit the three representative role users, and run the six task-bank tasks without coaching. That is the shortest compliant route to closing #601.

If you send me the contents of **#600** (or its task-bank docs), I can turn this into the **exact P01/P02/P03 facilitator script and ready-to-commit evidence files**, using your repository's existing Sprint 3 format rather than inventing any task wording.

## Prompt:
9/24/2026, 9:32:46 AM

can we get codex to set this all up and then it iwll propmt us for input to fill into the dcos

## Response:
9/24/2026, 9:33:03 AM

Yes. The cleanest approach is to have Codex build an **interactive evidence-capture CLI** for #601. It should create the evidence structure and templates automatically, then prompt you during each real user-testing session and write the answers into the correct Markdown files.

Codex should **not invent the testing results**. It should only automate setup, validation, formatting, and evidence generation. #601 requires every attempted task to receive `Success`, `Partial`, or `Failure`, findings to receive `S1-S4`, and actionable findings to have a recorded outcome. `Pasted markdown.md` It also requires build/commit, participant role, task IDs, findings, linked work, decisions, and retest results to be recorded under `evidence/user-testing/sprint-3/`. `Pasted markdown.md`

### Give Codex this prompt

```text
You are working in the Sport-Analytics-Tool repository.

Goal:
Set up the complete evidence-capture workflow required to close Gitea issue #601:
"test(user): validate navigation, authentication and overall frontend flow"

IMPORTANT:
This task is infrastructure/documentation tooling only.
Do NOT fabricate any participant responses, observations, task outcomes,
severities, findings, or acceptance decisions.

The finished workflow must interactively prompt the team for real test
results and write those results into version-controlled Markdown evidence.

Before changing anything:
1. Inspect the repository's existing user-testing documentation.
2. Inspect all Sprint 2 and Sprint 3 evidence structures.
3. Inspect the implementation associated with issue #600 and locate the
   authoritative Sprint 3 task bank / facilitator instructions.
4. Reuse the existing repository conventions instead of creating an
   incompatible testing format.
5. Do not alter existing completed testing evidence unless necessary for
   shared tooling.
6. Follow the repository's current package manager, TypeScript, lint,
   formatting, and testing conventions.

Issue #601 requirements that the tooling must support:

Tasks:
- AUTH-01
- AUTH-02
- AUTH-04
- PUB-01
- SUB-01
- REV-01

The authoritative wording/instructions for those tasks MUST be loaded from
the existing Sprint 3 task bank created under #600. Do not invent replacement
task wording.

Participant roles:
- public/viewer
- approved submitter
- reviewer/admin where applicable

Every attempted task must record:
- Success / Partial / Failure
- whether facilitator intervention occurred
- factual observation
- notes if applicable

Every finding must record:
- anonymised participant identifier
- Task ID
- factual/anonymised observation
- S1 / S2 / S3 / S4 severity
- reproduction detail where relevant
- evidence path
- disposition/outcome
- linked Gitea issue/PR where applicable

Accepted S1/S2 findings must support recording:
- corrected build/commit
- retested Task ID
- retest result
- retest notes

The overall gate must support exactly these outcomes:
- Accepted
- Accepted with documented limitations
- Not accepted

The final gate summary must explicitly identify which linked implementation
issues are released for closure:
- #580
- #581

Implementation
==============

Create an interactive CLI using the repository's existing Node/TypeScript
toolchain.

Preferred location:

scripts/user-testing/issue-601.ts

Add an npm script at the appropriate root package.json location:

"user-test:601": "<command matching repository TS execution conventions>"

Do not introduce a new CLI dependency if the repository already has an
appropriate prompting/input dependency.

If no prompt library exists, prefer Node's standard readline/promises API
rather than adding unnecessary production dependencies.

Evidence Structure
==================

Create or initialise:

evidence/user-testing/sprint-3/601-navigation-auth/
  README.md
  sessions/
  findings.md
  retests.md

Do not overwrite existing populated files.

README.md
---------

Generate a summary document containing:

# #601 - Navigation, Authentication and Overall Frontend Flow

## Gate Metadata
- environment
- frontend URL
- commit SHA
- test period
- facilitator(s)

## Prerequisite Verification
Capture whether:
- #600 task-bank/facilitator setup is complete
- #580 is deployed / technically ready for user testing
- #581 is deployed / technically ready for user testing
- applicable automated tests are passing

The CLI must clearly warn if prerequisites are recorded as incomplete.
Do not silently claim that testing is valid.

## Participants
An anonymised table of participant ID and role.

## Task Results
Aggregate results from the generated session files.

## Findings
Aggregate/link findings recorded in findings.md.

## Retests
Aggregate/link accepted S1/S2 retests.

## Gate Decision
Must remain "Pending" until explicitly completed using the CLI.

## Linked Implementation Issues
- #580
- #581

Session Workflow
================

Running:

npm run user-test:601

should present a small menu such as:

1. Start participant session
2. Record/add finding
3. Record serious-finding retest
4. Regenerate summary
5. Finalise gate
6. Exit

START PARTICIPANT SESSION

Prompt for:
- anonymised participant ID, e.g. P01
- participant role
- environment
- tested commit SHA
- date/time
- facilitator identifier

Determine which #601 task IDs apply to the selected role using the repository's
existing task-bank rules.

For every applicable task:
1. display the authoritative task prompt from the existing task bank;
2. wait for the facilitator to run the real usability task;
3. ask for Result:
   Success / Partial / Failure;
4. ask whether intervention was required;
5. ask for factual observation;
6. ask for optional notes.

Write:

sessions/<participant-id>-<role>.md

Use deterministic formatting and safe filenames.

Do not permit a real participant name or email to be required.
Explicitly remind the facilitator not to enter credentials or personally
identifying information.

FINDING WORKFLOW

Allow a finding to be attached to:
- participant
- Task ID

Prompt for:
- observation
- severity S1-S4
- reproduction details
- outcome/disposition

Allowed disposition values should cover:
- bug issue
- UX improvement issue
- feature issue
- existing issue
- accepted/fixed immediately
- deferred with reason
- rejected/no-change with reason

Where applicable prompt for:
- linked issue number
- linked PR number
- reasoning

Write/update findings.md.

The CLI must validate that every S1/S2 finding has a non-empty disposition.

RETEST WORKFLOW

Show unresolved accepted S1/S2 findings.

Prompt for:
- finding ID
- corrected build SHA
- deployment/environment
- Task ID being rerun
- Success / Partial / Failure
- factual notes

Write/update retests.md.

A serious finding should only count as successfully retested when its recorded
retest satisfies the project's existing policy.

FINALISE GATE

Before allowing finalisation, programmatically validate the evidence.

Check:
- required tasks have been exercised by representative participants
- every attempted task has an allowed result
- every finding has a severity
- every actionable finding has a disposition
- every accepted S1/S2 finding has a retest
- participant identifiers are anonymised
- environment/build commit is recorded
- evidence files exist

Do not automatically choose the gate result.

Prompt the team to explicitly choose:
- Accepted
- Accepted with documented limitations
- Not accepted

If requirements are incomplete, print the validation failures and require
explicit acknowledgement before permitting anything other than
"Not accepted" or leaving the gate Pending.

Generate a ready-to-copy Gitea closure comment in:

evidence/user-testing/sprint-3/601-navigation-auth/closure-comment.md

The comment should contain:
- result
- environment
- commit
- participants by anonymised ID/role
- task outcome summary
- S1/S2/S3/S4 counts
- actionable finding dispositions
- retest summary
- evidence path
- evidence PR placeholder/link if known
- explicit statement concerning #580 and #581 release from this gate

Never claim that #580/#581 themselves are technically complete merely because
the user-feedback gate passes.

Privacy / Safety
================

Add validation/warnings against accidentally recording obvious:
- passwords
- bearer tokens
- API keys
- OAuth tokens

Do not collect participant email addresses or real names.

Testing
=======

Add automated unit tests for the evidence-generation/validation logic.

At minimum test:
- valid Success/Partial/Failure parsing
- invalid outcome rejection
- S1/S2 without disposition rejected
- accepted S1/S2 without retest detected
- valid finalised gate accepted by validator
- incomplete gate remains Pending / validation fails
- evidence files are not overwritten unexpectedly
- sanitised participant IDs / filenames

Separate interactive input/output from the pure evidence logic so the latter
is easy to unit test.

Run the relevant:
- formatter
- lint
- typecheck
- unit tests

Do not claim success unless they pass.

Documentation
=============

Update the appropriate testing documentation to explain:

npm run user-test:601

Document:
- what it creates
- when to run it
- prerequisites
- privacy rules
- how finalisation works
- where evidence is committed

Keep documentation aligned with existing repository style.

AI Attribution
==============

Because this implementation uses AI-generated code, follow the COMS3011A AI
policy and the repository's existing AI attribution conventions.

Commit guidance must include an Assisted-by attribution consistent with the
course policy.

Deliverable
===========

After implementation, report:

1. files created/changed
2. exact command to start a #601 session
3. tests executed and results
4. any assumptions made
5. anything that still requires human input
6. whether the evidence validator currently considers #601 ready, incomplete,
   or Pending

Do not generate fake evidence in order to make the validator pass.
```

Then your actual workflow becomes:

```bash
git checkout main
git pull
git checkout -b test/601-user-feedback-evidence-workflow

# Let Codex implement the prompt above.

npm run user-test:601
```

Ideally, running that command would feel roughly like:

```text
#601 User Feedback Evidence

Current gate: PENDING
Build: not recorded

Select action:
> Start participant session

Participant ID: P01

Role:
> Public / Viewer

Environment:
> Production Sprint 3

Commit SHA:
> 81bde63...

Loading task bank...

PUB-01 - Discover Data
--------------------------------------------------
<actual task-bank instructions from #600>

Press ENTER when participant begins...

Result:
> Success

Did the facilitator intervene?
> No

Observation:
> Participant opened Fixtures from the primary navigation and
> located the requested match without assistance.

Finding identified?
> No

AUTH-01 - Sign In or Sign Up
--------------------------------------------------
...
```

After the session, Codex's tooling should write the Markdown itself instead of you manually maintaining tables:

```text
evidence/user-testing/sprint-3/601-navigation-auth/
├── README.md
├── closure-comment.md
├── findings.md
├── retests.md
└── sessions/
    ├── P01-public-viewer.md
    ├── P02-approved-submitter.md
    └── P03-reviewer-admin.md
```

This is preferable to asking Codex to simply generate blank templates because it reduces inconsistent evidence, missing severities, forgotten retests, malformed task IDs, and accidental gate closure. It also preserves the important boundary that **the human facilitator supplies the observations and acceptance decision**.

The approach is well aligned with the course marking criteria because Sprint 2 already defines the stronger user-feedback standard as a formal collection process with evidence **and integration**, and Sprint 3 again allocates 10% to user feedback. `project_briefs (4).pdf` `project_briefs (4).pdf`

One other important requirement: because Codex would generate code for this tooling, your commits need the required AI attribution. The COMS3011A policy explicitly requires AI code-generation attribution in the commit using an `Assisted-by:` line. `ai_policy.pdf`

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 9:36:11 AM

does it know what the tasks are?

## Response:
9/24/2026, 9:36:21 AM

> **Searching the web**
>
> 
>
> Worked for 8s

It knows the **task IDs and high-level purpose** from #601, but **not necessarily the exact facilitator wording** unless that wording already exists in your repo from #600.

From #601, Codex can safely know these tasks:

| Task ID | Purpose |
|---|---|
| `AUTH-01` | Sign In or Sign Up |
| `AUTH-02` | Understand Submission Access |
| `AUTH-04` | Sign Out and Continue Public Browsing |
| `PUB-01` | Discover Data |
| `SUB-01` | Access Submitter Functionality |
| `REV-01` | Find Work Awaiting Review |

Those are explicitly listed in the issue. `Pasted markdown.md`

The important part is that #601 says to **reuse the existing Task IDs where they already cover the goal**, and that any new Sprint 3 tasks must come through the Sprint 3 task-bank setup issue. `Pasted markdown.md` So Codex should not make up prompts like “click Sign In and log in.” It should inspect the repository for the task bank produced by **#600** and use the exact existing task definitions.

That is why I included this in the Codex prompt:

```text
Inspect the implementation associated with issue #600 and locate the
authoritative Sprint 3 task bank / facilitator instructions.

The authoritative wording/instructions for those tasks MUST be loaded from
the existing Sprint 3 task bank created under #600. Do not invent replacement
task wording.
```

So the intended behaviour is:

```text
npm run user-test:601

Loading Sprint 3 task bank...

AUTH-01 - Sign In or Sign Up
<exact wording already stored in repo>

AUTH-02 - Understand Submission Access
<exact wording already stored in repo>
```

If Codex searches the repository and **cannot find the actual #600 task definitions**, it should stop and tell you that rather than inventing them.

I would strengthen the Codex prompt with this block:

```text
TASK-BANK SAFETY REQUIREMENT

Before implementing the CLI, locate and report the exact repository file(s)
containing the definitions for:

- AUTH-01
- AUTH-02
- AUTH-04
- PUB-01
- SUB-01
- REV-01

Print the discovered filepath(s) in your implementation report.

Do not hard-code task wording based only on issue #601's task titles.

If any required Task ID cannot be found in the repository's authoritative
Sprint 3 task bank:
- do not invent its instructions;
- do not create a substitute task;
- report the missing Task ID;
- keep the #601 workflow incomplete until the task-bank source is resolved.

The CLI must source the task title/instructions from the existing task-bank
data/documentation wherever practical, or copy them exactly into a typed
configuration with a source-path comment if runtime loading would make the
tool unnecessarily fragile.
```

That makes it much safer. **Codex knows which six tasks it needs; it must inspect #600/repo docs to learn exactly what participants are supposed to be asked to do.**

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 9:38:19 AM

can we cghange it so it just majes the docs that need to be filled in
then youll prompt me in web to give the asnwers and feedback adnt thne we give that to codex to fill in and get ready for the issue 
Skip to content
logo
Sport Analytics Tool
User Testing Task Bank

Search

 Git Push Pray / Sport Analytics Tool
Home
Getting Started
Design
Deployment
Methodology
Testing
AI Use
Project Process & Evidence
Testing
Automated Testing Strategy
Repository-wide Code Coverage
CI/CD & Quality Gates
Local CI
User Testing Overview
User Testing Protocol
User Testing Task Bank
Intermediate Ingestion Acceptance
Bug Tracking
Representative-scale Performance Baseline
Table of contents
Suggested Sprint 2 task sets
Suggested Sprint 3 user-feedback task sets
User Testing Task Bank¶
User-testing trail: Overview -> Protocol -> Task Bank

This document contains representative tasks for formal user-testing sessions.

The facilitator should select only the tasks needed for the workflow being evaluated. Tasks are intentionally independent: each Task ID receives its own outcome and may produce its own findings.

Tasks describe user goals rather than interface instructions.

Suggested Sprint 2 task sets¶
Execution issue	Primary task groups	Purpose
#416	PUB-*, optional AUTH-04	Public browsing, statistics, export, API discovery and public access after sign-out
#417	AUTH-01, AUTH-02, SUB-*, BAT-*, COR-*	Authentication, submission, batch ingestion, failure recovery and correction
#418	AUTH-01, AUTH-02, REV-*, ADM-*, selected COR-*	Authentication, review, reference resolution, publication decisions and administration
Suggested Sprint 3 user-feedback task sets¶
User-feedback issue	Primary task groups	Purpose
#601	AUTH-* plus representative cross-feature navigation	Navigation, authentication, account state and overall frontend flow
#602	PUB-01 to PUB-06	Public discovery, fixture/statistics understanding, filtering, export and meaningful comparison
#603	AUTH-01, AUTH-02, SUB-01, SUB-07, REV-01, REV-02, REV-06	Propose a fixture that does not yet exist and review/onboard it safely
#604	BAT-01 to BAT-05	Season and multi-season back-catalogue ingestion, progress, recovery and reporting
#605	COR-01, ADM-02, selected PUB-*	Correction, provenance and the visible effect on derived statistics
#606	DATA-01, DATA-02	Versioned dataset release discovery and reproducibility
#607	PUB-05, API-01	API discovery, consumer-key state, quota and rate-limit understanding
#612	API-02, API-03, API-04	Aggregate API use, deprecation/replacement and per-consumer usage visibility
A user-feedback session begins only after the functionality needed by the selected tasks is deployed and usable and the facilitator has prepared the safe scenario described in testing/user-testing/SPRINT3_SCENARIOS.md. Any Cannot Begin Until list on the Gitea testing issue is a readiness checklist rather than an implementation-closure dependency.

Do not make one participant complete every task. A focused session of related tasks is preferable to one long end-to-end session where individual usability problems become difficult to attribute.

Before running a prepared-data task, use testing/user-testing/FACILITATOR_SETUP.md. Reusable reference and validation inputs are documented under testing/user-testing/, but environment-specific successful submissions, publication decisions and corrections must use disposable or explicitly approved test data.

Authentication / Account Journey¶
AUTH-01 — Sign In or Sign Up¶
You need to use an account-only feature of the platform.

Starting from the public application, sign in using the project test identity supplied by the facilitator and determine when the application considers you signed in.

Observe¶
Discoverability of the login/sign-up entry point.
Whether the Google/Supabase authentication hand-off is understandable.
Whether the participant understands when authentication has completed.
Recovery behaviour if authentication is cancelled or fails.
AUTH-02 — Understand Submission Access¶
Using the signed-in account, determine what access the account currently has and whether it can submit cricket data.

If the supplied scenario uses a viewer account, explain what you would do to request submitter access.

Observe¶
Whether account role/access state is understandable.
Whether competition-scoped submission access is clear.
Discoverability of the request-access path where applicable.
Whether pending/approved/rejected/revoked states communicate the next action.
AUTH-03 — Find the Account-Deletion Boundary¶
You want to understand how to permanently remove your account.

Find the account-deletion control and explain what you believe will happen. Stop before the irreversible confirmation unless the facilitator has explicitly supplied a disposable account for destructive testing.

Observe¶
Discoverability of account deletion.
Whether the destructive nature of the action is clear.
Whether confirmation wording and consequences are understandable.
Whether the participant can distinguish signing out from deleting the account.
AUTH-04 — Sign Out and Continue Public Browsing¶
Sign out of the account and then continue using the public cricket-data experience.

Observe¶
Discoverability and clarity of sign-out.
Whether the participant understands that the private session has ended.
Whether public browsing remains understandable after sign-out.
Any stale authenticated controls or confusing account state.
Public / Analyst Journey¶
PUB-01 — Discover Data¶
You are interested in analysing cricket data.

Starting from the application, find a fixture that interests you and show the information available about it.

Observe¶
Can the participant identify where fixtures are available?
Do they understand the information displayed?
Do they know where to continue for more detail?
PUB-02 — Find Statistics¶
Choose a fixture and find useful statistics about its players or teams.

Explain what you believe the information is showing you.

Observe¶
Discoverability of statistics.
Whether labels make sense.
Whether derived data is understandable.
Navigation difficulties.
PUB-03 — Narrow the Data¶
You are only interested in a particular part of the available fixture/statistical information.

Narrow the information to the part relevant to your analysis.

Observe¶
Discoverability of available filtering/narrowing controls.
Whether the selected scope is obvious.
Whether the participant understands the resulting data.
PUB-04 — Export Data¶
You want to continue analysing the fixture data using another tool.

Find a way to obtain the relevant event data for use outside the application.

Observe¶
Discoverability of export functionality.
Understanding of CSV/JSON choices.
Whether the downloaded result matches the participant's expectation.
Whether the current filter/scope is reflected in the export where applicable.
PUB-05 — API Discovery¶
You are building another application and want to use the Sport Analytics Tool's data.

Find enough information to determine how you would begin accessing the API.

Observe¶
Ability to find API documentation.
Whether the API's purpose is understandable.
Whether examples and endpoint information are sufficient.
PUB-06 — Compare Meaningful Performance¶
You want to compare the performance of two players or two fixtures for a real analysis question.

Find the relevant statistics, make the comparison and explain which performance appears stronger and why.

Observe¶
Whether the comparison route is discoverable without coaching.
Whether the participant can tell which fixture/season/career scope is being compared.
Whether labels and units support a meaningful comparison.
Whether the participant can move between the two subjects without losing context.
Whether the participant trusts that the values are comparable rather than unrelated totals.
Submitter — Direct Submission¶
SUB-01 — Access Submitter Functionality¶
You have been approved to contribute cricket data to the platform.

Using the provided test account, find where you would submit data.

Observe¶
Whether the participant understands their role.
Discoverability of submission functionality.
Authentication/navigation problems.
SUB-02 — Valid Single-Fixture Package¶
You have been given a completed single-fixture package for the selected fixture.

Upload it and determine whether the platform has safely received it and what you should do next.

Observe¶
Whether the guided single-fixture workflow is understandable.
Whether fixture/package matching is clear.
Whether the durable receipt is communicated clearly.
Whether the participant understands that processing can continue after upload.
SUB-03 — Invalid Single-Fixture Package¶
You have been given another single-fixture package, but this one contains a problem.

Attempt to submit it and determine what needs to be corrected.

Observe¶
Whether rejection is obvious.
Quality of file, row and field validation messages.
Whether the participant understands what is wrong.
Whether the participant knows what to do next.
SUB-04 — Recover From Package Validation Failure¶
Using the information provided by the system after the failed single-fixture upload, determine how you would correct the problem and try again.

Observe¶
Whether error information is actionable.
Whether corrected replacement/resubmission is intuitive.
Whether unchanged retry/idempotency guidance is understandable where shown.
Whether previous failure state creates confusion.
SUB-05 — Use Advanced Technical JSON¶
You have event data in the platform's canonical delivery schema and already know the fixture it belongs to.

Find the advanced submission option, submit the supplied event array and explain the result.

Observe¶
Discoverability of the advanced mode without confusing it with the guided package path.
Whether the participant understands that only the events array is pasted.
Whether fixture selection and schema guidance are clear.
Whether accepted, conflicting or rejected behaviour is understandable.
SUB-06 — Understand Advanced Validation Errors¶
The facilitator will provide an advanced event array containing one or more deliberate cricket-data errors.

Attempt the submission and explain what would need to change before you tried again.

Observe¶
Whether event/field validation identifies the actual problem.
Whether multiple independent problems can be distinguished where supplied.
Whether the participant knows which event needs correction.
Whether the participant understands how to retry after editing the data.
SUB-07 — Submit a Genuinely New Fixture¶
You have a valid package for a fixture that does not yet exist in the platform, within a competition you are approved to submit for.

Work out how to submit or propose the new fixture and determine what state it is in and what should happen next.

Observe¶
Whether the participant can distinguish selecting an existing fixture from proposing a new one.
Whether readable fixture metadata can be supplied without internal database identifiers.
Whether competition scope and permission boundaries are understandable.
Whether the participant understands that the new fixture must pass validation/review before publication.
Whether receipt/status and the next reviewer step are clear.
Whether duplicate-fixture protection is understandable if the proposed fixture resembles existing data.
Submitter — Batch Ingestion¶
BAT-01 — Upload a Season Package¶
You have been given a package containing a season of cricket data for a competition you are authorised to submit for.

Upload the package and determine whether the platform has safely received it for processing.

Observe¶
Discoverability of season/back-catalogue upload within the submission experience.
Understanding of competition/season context.
File/template guidance.
Whether the durable batch reference and next step are clear.
BAT-02 — Upload a Back Catalogue¶
You have been given a package containing historical data spanning more than one season.

Work out how to submit it without being given database IDs or an internal schema walkthrough.

Observe¶
Whether the participant can distinguish season and back-catalogue scope.
Whether readable references and package guidance are sufficient.
Whether terminology is understandable without internal database knowledge.
BAT-03 — Find Batch Progress and Results¶
A package has already been uploaded and you want to know what happened to it.

Find the batch and explain its current state, including what was accepted or rejected.

Observe¶
Discoverability of batch reports.
Understanding of lifecycle/status wording.
Whether accepted/rejected counts and item results make sense.
Whether the participant knows whether processing is finished or still continuing.
BAT-04 — Understand a Failed or Correction-Required Batch¶
The facilitator will give you a batch containing rejected data or a reviewer correction request.

Use the report to explain what went wrong and what you would do next.

Observe¶
Whether error groups and item-level errors are actionable.
Whether the participant can identify the affected source item.
Whether the difference between retrying unchanged content and submitting a corrected replacement is understandable.
Whether the participant can work out the recovery path without coaching.
BAT-05 — Download a Complete Batch Report¶
You need to keep or inspect the full result outside the web interface.

Find a way to obtain the complete batch report.

Observe¶
Discoverability of report download.
Whether the participant understands what the report contains.
Whether downloaded information matches what they expected from the on-screen report.
Correction Journey¶
COR-01 — Correct Previously Published Event Data¶
You discover that previously supplied event information is incorrect.

Find how you would correct that information and determine what the system says will happen next.

Observe¶
Discoverability of correction controls.
Whether the participant understands the effect of the correction.
Whether confirmation/history information is clear.
Whether the participant expects dependent statistics to update.
Reviewer Journey¶
REV-01 — Find Work Awaiting Review¶
Using the provided reviewer account, find a staged batch that is waiting for a decision.

Observe¶
Discoverability of the review workspace.
Whether the queue's scope and status are understandable.
Whether the participant knows which batch to inspect.
REV-02 — Evaluate a Staged Batch¶
Open the supplied staged batch and decide whether you have enough information to make a review decision.

Explain what the validation, rejection and reference information is telling you.

Observe¶
Understanding of validation summary and fixture/item information.
Whether blocking problems are clear.
Whether source/provenance information is sufficient.
Whether the participant can distinguish valid, rejected and unresolved content.
REV-03 — Resolve an Ambiguous Reference¶
The facilitator will provide a staged batch containing a reference that needs reviewer attention.

Resolve the reference using the information available in the review workspace.

Observe¶
Discoverability of candidate mappings.
Confidence that the selected candidate is correct.
Feedback after saving a mapping.
Whether the participant knows when the batch becomes eligible for approval.
REV-04 — Approve and Publish¶
The facilitator will provide a batch that has passed the checks required for publication.

Review it and approve it when you are satisfied that publication is appropriate.

Observe¶
Confidence before publishing.
Clarity of the reason/confirmation step.
Whether the participant understands that approval changes public state.
Feedback after the decision.
REV-05 — Return or Reject¶
The facilitator will provide a scenario where a batch should not be published as-is.

Choose the appropriate action and explain why you selected it.

Observe¶
Whether the participant understands the difference between return-for-correction and rejection.
Whether reason entry is clear.
Confidence before committing the decision.
Feedback after the decision.
REV-06 — Review and Onboard a Genuinely New Fixture¶
The facilitator will provide a staged submission proposing a fixture that is not yet present in the platform.

Review the proposal, determine whether the fixture information is sufficient and safe to onboard, and take the appropriate action so the submission can proceed or be returned.

Observe¶
Whether a new-fixture proposal is distinguishable from an ordinary existing-fixture submission.
Whether competition, date, teams/participants and source/provenance information are sufficient for the decision.
Whether the reviewer can recognise possible duplicate fixtures before creating/onboarding one.
Whether create/link/return decisions and their consequences are clear.
Whether the participant understands the resulting review/publication state.
Administrator Journey¶
ADM-01 — Review Submitter Access¶
Where access-request functionality is available:

A user has requested permission to submit data.

Review the request and decide what action to take using the scenario supplied by the facilitator.

Observe¶
Discoverability of pending requests.
Whether available information supports the decision.
Clarity of approval/rejection controls and competition scope.
ADM-02 — Trace Submitted Data¶
Find a submitted fixture or batch and determine who supplied it and what information can be traced back to the submission.

Observe¶
Discoverability of provenance/audit information available to the role.
Whether the relationship between submission, events and statistics is understandable.
Navigation or permission problems.
Dataset Release Journey¶
DATA-01 — Find and Understand a Versioned Dataset Release¶
You want a stable dataset snapshot for an analysis that must be repeatable later.

Find an available dataset release and determine its version, scope, schema/documentation, checksum and how to obtain it.

Observe¶
Discoverability of dataset releases.
Whether version and release scope are clear.
Whether schema, field descriptions and checksum are easy to find.
Whether the participant can distinguish a versioned release from an ad-hoc export.
Whether download/use instructions are sufficient.
DATA-02 — Judge Whether a Release Is Reproducible¶
Using the supplied analysis question and a versioned release, determine whether the release contains enough documented information to reproduce the requested statistic later.

Explain which release artefacts or fields you would rely on.

Observe¶
Whether schema and field documentation answer the participant's questions.
Whether the participant can identify the event data needed for the statistic.
Whether version/checksum information gives confidence that the same snapshot can be reused.
Whether any hidden assumptions or undocumented fields block reproducibility.
Whether provenance or calculation documentation is discoverable where relevant.
API Consumer Journey¶
API-01 — Use a Consumer Key and Understand Quota State¶
You are an external API consumer. Using the test consumer credentials supplied separately by the facilitator, determine how to make an authenticated API request and work out the consumer's current quota/rate-limit state.

Do not copy the key into retained notes or screenshots.

Observe¶
Whether API-key placement and authentication instructions are understandable.
Whether success/failure responses distinguish invalid credentials from quota/rate-limit problems.
Whether remaining quota, reset timing or retry guidance is understandable where exposed.
Whether the participant knows how to avoid exposing the key.
Whether API documentation and the actual response headers/body agree.
API-02 — Retrieve and Understand Aggregate Data¶
You want an aggregate answer rather than a list of raw records.

Use the API documentation and supplied consumer key to retrieve an aggregate cricket result and explain what the response means.

Observe¶
Discoverability of aggregate operations.
Whether filtering/grouping inputs are understandable.
Whether response fields, scope and units are clear.
Whether pagination/job behaviour is understandable if the request is too large for an immediate response.
Whether the participant can relate the aggregate to the underlying public data.
API-03 — Follow a Deprecation Path¶
You are maintaining an API client and discover that an operation you use is deprecated.

Determine what is being retired, when or how the deprecation applies, and which replacement operation your client should use.

Observe¶
Whether deprecation is visible in API documentation and/or responses.
Whether a replacement is named unambiguously.
Whether migration guidance is actionable.
Whether the participant can distinguish a deprecated operation from one that has already been removed.
Whether version compatibility expectations are clear.
API-04 — Find a Consumer's API Usage¶
Using the administrator/reviewer scenario supplied by the facilitator, find what a particular test API consumer has used and explain the usage information shown.

Observe¶
Discoverability of per-consumer usage/audit information.
Whether operation, time window, request counts and quota relationship are understandable.
Whether the participant can distinguish consumer identity from secret key material.
Whether usage information is sufficient to investigate a quota/support question.
Whether sensitive credential material is appropriately absent.
Facilitator Rules¶
The facilitator may:

repeat the task;
explain unfamiliar cricket/domain terminology contained in the task;
resolve an environmental problem unrelated to the product.
The facilitator must not:

point to the correct control;
tell the participant where to navigate;
explain the intended workflow while the task is active;
turn a failed task into a success by coaching the participant.
If assistance is necessary, record exactly what assistance was given and mark the individual task Partial or Failure as appropriate.

AI Declaration¶
The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].

Previous
User Testing Protocol
Next
Intermediate Ingestion Acceptance
Made with Material for MkDocs 
https://sports-analytics-tool.pages.dev/testing/user-testing-task-bank/

## Response:
9/24/2026, 9:38:32 AM

> **Reframing the workflow**
>
> Yes. I’m treating Codex as a documentation-template generator only. I’ll conduct the web-based sessions, collect responses and facilitator feedback here, then prepare a structured results packet for Codex to insert into the issue-ready documents.
>
> **Reframed the workflow**
>
> 
>
> Worked for 12s

Yes. **This is cleaner than building a CLI.** Codex should only create the evidence/document structure with the authoritative #601 tasks already embedded. Then you run the real tests, and **I will interview you here in ChatGPT Web task-by-task**, turn your answers into structured evidence, and finally give you one completed Markdown packet for Codex to insert into the repo.

For #601, the required task set is already clear: `AUTH-01`, `AUTH-02`, `AUTH-04`, `PUB-01`, `SUB-01`, and `REV-01`. `Pasted markdown.md` The evidence ultimately needs the participant role/ID, environment/build/commit, task outcomes, findings, severities, linked issue/PR, decisions and retest results. `Pasted markdown.md`

### New workflow

```text
1. Codex
   ↓
Creates ONLY blank #601 evidence docs/templates

2. You perform user testing
   ↓
Come back to ChatGPT Web

3. ChatGPT Web
   ↓
I prompt you:
- participant details
- AUTH-01 result
- observations
- AUTH-02 result
- observations
- findings/severity
- etc.

4. ChatGPT Web
   ↓
I produce a complete structured results packet

5. Codex
   ↓
Takes that packet
→ fills the repo documentation
→ validates completeness
→ formats it
→ prepares the #601 closure comment

6. You review it
   ↓
Commit / PR / close #601
```

This keeps the **human testing and interpretation here**, while Codex just handles repository/document mechanics.

## Give Codex this prompt now

```text
You are working in the Sport-Analytics-Tool repository.

Task:
Prepare the documentation/evidence structure required to execute and later
close Gitea issue #601:

"test(user): validate navigation, authentication and overall frontend flow"

IMPORTANT:
This task is DOCUMENTATION SETUP ONLY.

Do NOT:
- build an interactive CLI;
- create a new script;
- prompt for participant input;
- fabricate participant results;
- fabricate findings;
- choose severity values;
- decide whether the gate passes;
- claim that testing has occurred;
- create fake evidence.

The team will conduct the tests manually and collect the real results using
ChatGPT Web. A later Codex task will receive the completed results and populate
these documents.

Before editing:
1. Inspect the existing user-testing documentation.
2. Inspect Sprint 2 user-testing evidence.
3. Inspect existing Sprint 3 user-testing evidence.
4. Inspect:
   - testing/user-testing/
   - testing/user-testing/SPRINT3_SCENARIOS.md
   - testing/user-testing/FACILITATOR_SETUP.md
   - the User Testing Task Bank
5. Reuse the repository's existing evidence conventions wherever possible.
6. Do not modify completed historical testing evidence.

Issue #601 Task Set
===================

Prepare evidence for exactly these tasks:

- AUTH-01 - Sign In or Sign Up
- AUTH-02 - Understand Submission Access
- AUTH-04 - Sign Out and Continue Public Browsing
- PUB-01 - Discover Data
- SUB-01 - Access Submitter Functionality
- REV-01 - Find Work Awaiting Review

Use the authoritative wording from the repository's User Testing Task Bank.
Do not rewrite or invent task instructions.

The current task-bank definitions are expected to correspond to:

AUTH-01 - Sign In or Sign Up
Goal:
You need to use an account-only feature of the platform.

Starting from the public application, sign in using the project test identity
supplied by the facilitator and determine when the application considers you
signed in.

Observe:
- Discoverability of the login/sign-up entry point.
- Whether the Google/Supabase authentication hand-off is understandable.
- Whether the participant understands when authentication has completed.
- Recovery behaviour if authentication is cancelled or fails.

AUTH-02 - Understand Submission Access
Goal:
Using the signed-in account, determine what access the account currently has
and whether it can submit cricket data.

If the supplied scenario uses a viewer account, explain what you would do to
request submitter access.

Observe:
- Whether account role/access state is understandable.
- Whether competition-scoped submission access is clear.
- Discoverability of the request-access path where applicable.
- Whether pending/approved/rejected/revoked states communicate the next action.

AUTH-04 - Sign Out and Continue Public Browsing
Goal:
Sign out of the account and then continue using the public cricket-data
experience.

Observe:
- Discoverability and clarity of sign-out.
- Whether the participant understands that the private session has ended.
- Whether public browsing remains understandable after sign-out.
- Any stale authenticated controls or confusing account state.

PUB-01 - Discover Data
Goal:
You are interested in analysing cricket data.

Starting from the application, find a fixture that interests you and show the
information available about it.

Observe:
- Can the participant identify where fixtures are available?
- Do they understand the information displayed?
- Do they know where to continue for more detail?

SUB-01 - Access Submitter Functionality
Goal:
You have been approved to contribute cricket data to the platform.

Using the provided test account, find where you would submit data.

Observe:
- Whether the participant understands their role.
- Discoverability of submission functionality.
- Authentication/navigation problems.

REV-01 - Find Work Awaiting Review
Goal:
Using the provided reviewer account, find a staged batch that is waiting for
a decision.

Observe:
- Discoverability of the review workspace.
- Whether the queue's scope and status are understandable.
- Whether the participant knows which batch to inspect.

Facilitator Rules
=================

Include the existing facilitator rules in the evidence instructions.

The facilitator MAY:
- repeat the task;
- explain unfamiliar cricket/domain terminology contained in the task;
- resolve an environmental problem unrelated to the product.

The facilitator MUST NOT:
- point to the correct control;
- tell the participant where to navigate;
- explain the intended workflow while the task is active;
- turn a failed task into a success by coaching.

If assistance is required, the evidence must record exactly what assistance
was given and the task must be marked Partial or Failure as appropriate.

Evidence Structure
==================

Create, or adapt to the existing equivalent repository structure:

evidence/user-testing/sprint-3/601-navigation-auth/
├── README.md
├── sessions/
│   └── SESSION_TEMPLATE.md
├── findings.md
├── retests.md
└── closure-comment.md

Do not create fake participant session files.

If the repository already uses a different established naming/layout
convention, follow that convention instead and explain the mapping.

README.md
=========

Prepare a gate-summary template containing:

# #601 - Navigation, Authentication and Overall Frontend Flow

## Status

Pending - user testing has not yet been executed.

## Gate Metadata

- Environment: [TO BE COMPLETED]
- Frontend URL: [TO BE COMPLETED]
- Commit SHA: [TO BE COMPLETED]
- Test date(s): [TO BE COMPLETED]
- Facilitator(s): [TO BE COMPLETED]

## Prerequisite Verification

| Requirement | Status | Evidence |
| --- | --- | --- |
| #600 task-bank/facilitator setup complete | [TO BE COMPLETED] | |
| #580 deployed and ready for user testing | [TO BE COMPLETED] | |
| #581 deployed and ready for user testing | [TO BE COMPLETED] | |
| Applicable automated tests passing | [TO BE COMPLETED] | |

## Participants

Empty table containing:
- anonymised participant ID
- role
- session evidence path

## Required Task Coverage

List:

- AUTH-01
- AUTH-02
- AUTH-04
- PUB-01
- SUB-01
- REV-01

Do not mark any as complete.

## Task Result Summary

Empty table containing:
- Task ID
- Participant
- Result
- Intervention
- Finding IDs

## Findings Summary

Leave Pending.

## Serious Finding Retests

Leave Pending.

## Gate Decision

Pending

Allowed eventual values:
- Accepted
- Accepted with documented limitations
- Not accepted

## Linked Implementation Issues

- #580
- #581

Explain that passing #601 only releases these issues from the user-feedback
gate; it does not automatically certify all of their technical acceptance
criteria.

SESSION_TEMPLATE.md
===================

Create a reusable session template.

Metadata:

- Participant ID:
- Participant role:
- Environment:
- Frontend URL:
- Commit SHA:
- Date/time:
- Facilitator:

Include a privacy reminder:

Do not record:
- participant real name unless repository policy explicitly requires it;
- personal email addresses;
- passwords;
- access tokens;
- API keys;
- OAuth credentials or secrets.

For every applicable task include:

## <TASK-ID> - <Task title>

### Participant Goal

Use the exact authoritative task wording from the task bank.

### Observe

Use the exact observation list from the task bank.

### Result

[TO BE COMPLETED: Success / Partial / Failure]

### Facilitator Intervention

[TO BE COMPLETED]

### Observation

[TO BE COMPLETED]

### Participant Feedback

[TO BE COMPLETED]

### Findings Raised

[TO BE COMPLETED]

### Notes

[TO BE COMPLETED]

Include the six #601 tasks in the template, clearly noting that each
participant should only be given the relevant focused subset.

findings.md
===========

Create an empty findings register

## Prompt:
9/24/2026, 9:47:02 AM

![4643696b-32aa-486d-915e-df1b106d4a9e.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000daac8211b73099d115b45e5e&ts=497339&p=fs&cid=1&sig=3b301c6a835bbf508c47490e3fa8b314ecc0807e8e72493818dbe1a4681385a6&v=0)

how can this top bar be rearranged to look more appealing

## Response:
9/24/2026, 9:47:12 AM

> **Rearranging the header**
>
> I’m keeping the logo and primary navigation together, then separating utility actions on the right:
> 
> Logo · Explore Data ▾ · Downloads · API　　　　　　　　 Theme toggle · Sign in
> 
> I’d use consistent spacing, a centered max-width container, and an outlined Sign in button for stronger hierarchy.
>
> **Rearranged the header**
>
> 
>
> Worked for 11s

A cleaner structure would be:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Stat'sTheGame   Explore Data ▾   Downloads   API           ◐ Theme   Sign in │
└──────────────────────────────────────────────────────────────────────────────┘
```

The main problem in the current version is that the three areas feel disconnected: the logo is pinned hard-left, navigation floats around the middle, and `Sign in + THEME + toggle + Night Match` becomes crowded on the right.

### Recommended arrangement

**Left:** logo followed by the primary navigation.  
**Right:** theme control followed by a clearly identifiable `Sign in` action.

I would specifically use:

```text
[ Stat'sTheGame ]  [ Explore Data ▾ ] [ Downloads ] [ API ]     [ ◐ Theme ] [ Sign in ]
```

Changes I would make:

- Move `Explore Data`, `Downloads`, and `API` closer to the logo.
- Use the remaining space as a flexible spacer rather than manually centering the navigation.
- Put **Sign in at the far right** because it is the primary account action.
- Replace the current `THEME [toggle] Night Match` combination with either:
  - `☾ Night mode` + toggle, or
  - a simple sun/moon icon button.
- Give `Sign in` slightly more visual prominence, such as a subtle outlined button.
- Constrain the contents to a centered `max-width`, rather than spreading everything across the entire monitor.
- Keep all controls vertically aligned with one consistent navbar height.

For your current design, something around **72px high**, with a **1200–1400px max-width**, would work well.

### CSS structure

```tsx
<header className="topbar">
  <div className="topbar__inner">
    <a className="brand" href="/">
      Stat'sTheGame
    </a>

    <nav className="primary-nav" aria-label="Primary navigation">
      <a href="/explore">
        Explore Data <span aria-hidden="true">▾</span>
      </a>
      <a href="/downloads">Downloads</a>
      <a href="/api">API</a>
    </nav>

    <div className="topbar__actions">
      <button
        className="theme-toggle"
        type="button"
        aria-label="Toggle colour theme"
      >
        <span aria-hidden="true">☾</span>
        <span>Theme</span>
      </button>

      <a className="sign-in" href="/login">
        Sign in
      </a>
    </div>
  </div>
</header>
```

```css
.topbar {
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.topbar__inner {
  width: min(100% - 2rem, 1360px);
  height: 4.5rem;
  margin-inline: auto;

  display: flex;
  align-items: center;
  gap: 2rem;
}

.brand {
  flex-shrink: 0;
  font-size: 1.75rem;
  font-weight: 800;
  text-decoration: none;
}

.primary-nav {
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.topbar__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.theme-toggle,
.sign-in {
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.sign-in {
  padding-inline: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}
```

Visually, I think this would be a significant improvement:

```text
CURRENT
──────────────────────────────────────────────────────────────────────────────
LOGO                  Explore     Downloads    API             Sign in THEME ● Night
                       ↑ lots of dead space                      ↑ crowded

BETTER
──────────────────────────────────────────────────────────────────────────────
LOGO    Explore ▾   Downloads   API                           ☾ Theme   Sign in
        ↑ cohesive navigation                               ↑ cohesive actions
```

I would **not center the navigation independently**. For an analytics application, keeping the brand and primary navigation together makes the hierarchy much easier to scan, while the right side becomes exclusively account/application controls.

On smaller widths, collapse `Explore Data / Downloads / API` into a menu before allowing the items to wrap; wrapping a navbar onto two lines would make the UI noticeably worse.

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 9:51:15 AM

[**Skip to main content**](https://sport-analytics-tool-web.pages.dev/account/overview#main-content)

[Stat'sTheGame](https://sport-analytics-tool-web.pages.dev/) ([image](https://sport-analytics-tool-web.pages.dev/brand/statsthegame-wordmark-dark.svg))

**Explore Data ▾**

[**Downloads**](https://sport-analytics-tool-web.pages.dev/dataset-releases)[**API**](https://sport-analytics-tool-web.pages.dev/api)

**Manage Submission▾**

[**Account**](https://sport-analytics-tool-web.pages.dev/account)

**ThemeNight Match**

1. Account

**Identity and access**

# Account

[**Overview**](https://sport-analytics-tool-web.pages.dev/account/overview)[**Access**](https://sport-analytics-tool-web.pages.dev/account/access)[**Settings**](https://sport-analytics-tool-web.pages.dev/account/security)

## Overview

**Email**

**dean.feldman05\@gmail.com**

**Role**

**submitter**

**Submission access**

**approved**

**Competition scopes**

**7**

[Stat'sTheGame](https://sport-analytics-tool-web.pages.dev/brand/statsthegame-wordmark-dark.svg)[**API Explorer**](https://sport-analytics-tool-web.pages.dev/api)[**API Documentation**](https://sports-analytics-tool.pages.dev/api/overview/)

The game, measured ball by ball.

would u redesign these pages?

## Response:
9/24/2026, 9:51:20 AM

> **Redesigning account pages**
>
> Yes—I’d redesign them around clearer hierarchy and task-focused layouts. I’d consolidate account sections into consistent tabs, group related fields, improve spacing and labels, add inline validation, and make submission status more prominent.
>
> **Redesigned account pages**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 10s

Yes. I would redesign the **Account area**, but mostly at the information-architecture and presentation level rather than rebuilding the whole flow.

The current page is functionally correct, but it reads like raw account metadata:

```text
Account
Overview | Access | Settings

Email
dean...

Role
submitter

Submission access
approved

Competition scopes
7
```

For a production-facing analytics platform, the important states-**who am I, what can I do, where can I submit, and what account actions are available?**-should be much more obvious.

### Recommended Account structure

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Account                                                              │
│ Manage your identity, permissions and security.                      │
│                                                                      │
│  Overview        Access        Security                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Account overview                                                    │
│                                                                      │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐   │
│  │ Identity                    │  │ Submission access            │   │
│  │                             │  │                              │   │
│  │ dean.feldman05@...          │  │ ● Approved                  │   │
│  │                             │  │ Submitter                    │   │
│  │ Signed in with Google       │  │                              │   │
│  └─────────────────────────────┘  │ 7 competition scopes        │   │
│                                   │ View access →                │   │
│                                   └──────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Quick actions                                                  │  │
│  │                                                                │  │
│  │ Manage access     Manage submissions     Account security      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

The biggest improvement is turning things like `submitter`, `approved`, and `7` from disconnected values into **meaningful account state**.

For example:

```text
Submission access
● Approved

You can submit cricket data for 7 competitions.

[View competition access]
```

That is much clearer than:

```text
Submission access
approved

Competition scopes
7
```

### Overview page

I would make `/account/overview` a genuine dashboard with three sections: **Identity**, **Submission access**, and **Quick actions**.

The role should use a badge:

```text
Role
[ Submitter ]
```

and status should be semantically differentiated:

```text
● Approved
○ Pending
× Rejected
- Revoked
```

Don't rely on colour alone-keep the text label for accessibility.

Also, if the email is just informational, it should visually look like metadata rather than a giant bold value.

---

### Access page

This page should probably receive the biggest redesign.

Rather than just telling the user they have seven scopes, show them.

```text
Access

Submission access                         [ Approved ]

You have permission to submit data for the following competitions.

┌─────────────────────────────────────────────────────────────┐
│ Competition                     Access             Status    │
├─────────────────────────────────────────────────────────────┤
│ ICC Men's T20 World Cup          Submit             Approved │
│ Indian Premier League            Submit             Approved │
│ SA20                             Submit             Approved │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

Need access to another competition?

[Request additional competition access]
```

That directly supports `AUTH-02`, because your task bank specifically asks users to determine their current access and whether they can submit cricket data.

It also makes:

> "competition-scoped submission access"

much easier for a participant to understand.

For a viewer:

```text
Submission access

You currently have viewer access.

You can browse all public cricket data, but you cannot submit data.

[Request submitter access]
```

For pending:

```text
Submission request
◷ Pending

Your request for SA20 submission access is awaiting review.

Requested: 22 September 2026
```

Those states would dramatically improve the user-testing outcome for `AUTH-02`.

---

### Security / Settings page

I would also rename **Settings → Security** if the actual route is `/account/security`.

Right now:

```text
Overview | Access | Settings
```

while the URL says:

```text
/account/security
```

That mismatch is unnecessary.

Use:

```text
Overview | Access | Security
```

Then structure it:

```text
Security

Authentication
────────────────────────────────────────

Signed in with
Google

Account email
dean.feldman05@...

[Sign out]

Account management
────────────────────────────────────────

Delete account

Permanently delete your account and associated account information.
This action cannot be undone.

[Delete account]
```

Destructive actions should be visually separated from routine settings.

This is also useful for the compulsory brief requirement that users can delete their accounts.

---

### Navigation

I'd also slightly restructure the authenticated header you showed:

```text
Stat'sTheGame   Explore Data ▾   Downloads   API   Manage Submission ▾
                                                       Account ▾
```

Rather than having:

```text
Manage Submission ▾    Account    Theme Night Match
```

all competing as independent controls, make the authenticated side feel like a distinct cluster:

```text
Stat'sTheGame   Explore Data ▾   Downloads   API

                            Manage Submission ▾   ☾ Theme   Account ▾
```

And make `Account ▾` contain:

```text
Account overview
Access
Security
────────────
Sign out
```

This means users can still use the dedicated Account pages, but common account operations don't require unnecessary navigation.

---

### One thing I would remove

This:

```text
1. Account

Identity and access

# Account
```

is too much repeated hierarchy.

You effectively have three introductions to the same page.

I'd reduce it to:

```text
Account
Manage your identity, submission access and security.

Overview | Access | Security
```

Then immediately show the content.

Similarly, I would probably remove the **"Identity and access"** eyebrow unless it has a useful breadcrumb/navigation purpose.

### Final target

I would aim for this visual hierarchy:

```text
ACCOUNT
Manage your identity, permissions and security.

Overview     Access     Security
────────

Account overview

┌─────────────────────────┐  ┌─────────────────────────────┐
│ Identity                │  │ Submission access           │
│                         │  │                             │
│ dean.feldman05@...      │  │ ● Approved                 │
│ [Submitter]             │  │ 7 competition scopes       │
│                         │  │                             │
│ Google account          │  │ View access →              │
└─────────────────────────┘  └─────────────────────────────┘

Quick actions

[Manage access]   [Manage submissions]   [Security]
```

So **yes, I would redesign it**, especially before #601 user testing. The underlying routes are already sensible; the opportunity is to make **account state and role permissions immediately understandable** without users having to interpret backend terminology.

I would **keep `Overview / Access / Security` as tabs**, rather than introducing an account sidebar. Three sections aren't enough to justify consuming permanent horizontal space with a sidebar, and the tabs will adapt much better to mobile.

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 9:54:51 AM

https://sport-analytics-tool-web.pages.dev/submissions/new

helo with an issue to get this page centered looking like the others

## Response:
9/24/2026, 9:54:58 AM

> **Searching the web**
>
> 
>
> Worked for 8s

Use this as the Gitea issue. The change should be **layout-only**: constrain and center the `/submissions/new` workspace using the same page/container convention as the rest of the application, without altering the submission workflow.

```md
# fix(frontend): centre new-submission page and align content width with application layout

## Description

The **New Submission** page at:

`/submissions/new`

does not currently align with the visual layout used by the other main application pages.

The submission workspace stretches/anchors across the available viewport rather than being contained within the same centred content area used elsewhere in the application. This makes the page feel visually disconnected from pages such as Account and other primary application views.

## Current Behaviour

- `/submissions/new` does not use a consistent centred page container.
- Content can appear offset or excessively wide on large displays.
- The page does not visually align with the header/navigation content and other application pages.
- Excess horizontal whitespace makes the submission workflow harder to scan.

## Expected Behaviour

The page should use the application's existing responsive page/container convention.

On desktop:

- the main submission content should be horizontally centred;
- content should have a sensible maximum width;
- left/right spacing should be balanced;
- headings, forms and submission controls should align consistently;
- the layout should visually match other centred application pages.

On smaller screens:

- the page should continue to use the available width;
- appropriate horizontal padding should remain;
- no horizontal scrolling should be introduced;
- submission controls must remain usable and accessible.

## Scope

This issue is intended to be a **layout consistency fix only**.

Do not redesign or change:

- submission behaviour;
- fixture selection;
- package upload behaviour;
- validation;
- API requests;
- authentication/permissions;
- submission state management.

Reuse the existing application layout/container component or CSS convention where possible instead of introducing a page-specific duplicate.

## Acceptance Criteria

- [ ] `/submissions/new` uses the same centred content/container convention as comparable application pages.
- [ ] Main page content is horizontally centred on large displays.
- [ ] A sensible application-consistent maximum width is applied.
- [ ] Horizontal padding is consistent with the rest of the frontend.
- [ ] Heading, introductory content and submission workspace align to the same content boundary.
- [ ] The page remains responsive at mobile, tablet and desktop widths.
- [ ] No unintended horizontal scrollbar is introduced.
- [ ] Existing submission functionality is unchanged.
- [ ] Existing loading, error, validation and success states continue to render correctly.
- [ ] Keyboard navigation and focus behaviour remain unaffected.
- [ ] Relevant frontend tests continue to pass.
- [ ] Add/update a regression test where appropriate to protect the page-layout/container behaviour.

## Verification

Verify manually at representative widths:

- mobile (~375px)
- tablet (~768px)
- desktop (~1440px)
- wide desktop (>1920px)

Compare `/submissions/new` against an existing application page that already uses the intended centred container.

Confirm:

1. equal/balanced page margins on desktop;
2. consistent maximum content width;
3. correct responsive padding;
4. no horizontal overflow;
5. all submission functionality still operates as before.

## Suggested Implementation Approach

Before making changes, identify the existing shared page-shell/container abstraction used by the other centred frontend pages.

Prefer:

`existing shared layout/container → /submissions/new`

over introducing a new hard-coded `max-width` implementation specifically for this page.

If the page already uses the shared component, investigate which nested submission workspace element is escaping or overriding the container width.

## Definition of Done

`/submissions/new` visually aligns with the rest of the application, remains responsive and accessible, and the change introduces no behavioural regression to the submission journey.
```

I would label it approximately **`type: bug`**, **`area: frontend`**, **`priority: medium`**, and Sprint 3. Since this is a visual inconsistency rather than new functionality, I would keep it in the **bug tracker**, not make it a feature issue.

I couldn't reliably fetch the live route from the web environment just now, so I intentionally kept the issue focused on the layout problem you identified rather than claiming specific DOM/CSS causes.

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 10:10:07 AM

## PUB-06 — Compare Meaningful Performance[¶](https://sports-analytics-tool.pages.dev/testing/user-testing-task-bank/#pub-06-compare-meaningful-performance "Permanent link")

You want to compare the performance of two players or two fixtures for a real analysis question.

Find the relevant statistics, make the comparison and explain which performance appears stronger and why.

### Observe[¶](https://sports-analytics-tool.pages.dev/testing/user-testing-task-bank/#observe_9 "Permanent link")

- Whether the comparison route is discoverable without coaching.
- Whether the participant can tell which fixture/season/career scope is being compared.
- Whether labels and units support a meaningful comparison.
- Whether the participant can move between the two subjects without losing context.
- Whether the participant trusts that the values are comparable rather than unrelated totals.

what does this mean

## Response:
9/24/2026, 10:10:15 AM

It means the tester should prove that your app lets a normal user make a **fair, understandable comparison between two performances**, not just view two unrelated stat pages.

For cricket, a test could be:

> “Compare Player A and Player B in the same fixture and decide who had the stronger batting performance.”

The participant should then be able to find the relevant stats, understand what they mean, compare them, and explain something like:

> “Player A performed better because they scored 72 runs at a strike rate of 148, while Player B scored 41 at a strike rate of 112.”

The five things you observe mean:

- **Comparison route discoverable:** Can they work out how to compare without you telling them where to click?
- **Scope is clear:** Do they know whether they are comparing one fixture, a season, or a whole career?
- **Labels and units make sense:** For example, `Runs`, `Strike Rate`, `Average`, `Overs`, `Economy`, etc. are clearly named and understandable.
- **Can move between subjects without losing context:** If they open Player A then Player B, do they still know what fixture/season they are looking at, or do they get lost?
- **Values are actually comparable:** The user should not accidentally compare something like Player A's career total against Player B's single-match total and think that is meaningful.

A good concrete PUB-06 test for your app could therefore be:

> “Using the same fixture, compare the batting performance of two players and tell me which player had the stronger performance and why.”

Or for bowling:

> “Compare two bowlers from the same fixture and explain which bowling performance you think was stronger.”

You **do not necessarily need a dedicated side-by-side comparison page** for PUB-06 to pass. If users can navigate between two players while the fixture/season context remains obvious and make a meaningful comparison, the task can still succeed.

A dedicated comparison screen would make the task stronger, for example:

```text
Player A                 Player B
72 Runs                  41 Runs
48 Balls                 36 Balls
150.0 Strike Rate        113.9 Strike Rate
6 Fours                  3 Fours
2 Sixes                  0 Sixes

Scope: Fixture — SA vs NZ, 18 Sep 2026
```

The key requirement is really: **can the user confidently answer a real sporting comparison question using your data, without being misled by different scopes or unrelated totals?**

## Prompt:
9/24/2026, 10:11:03 AM

> **Comparison route discoverable:** Can they work out how to compare without you telling them where to click?

should this be a button?

## Response:
9/24/2026, 10:11:11 AM

Yes — **if you want PUB-06 to be clearly discoverable, an explicit `Compare` action is the strongest UX choice.**

But the task itself does **not require a button**. It only requires that users can find a sensible comparison route without being coached.

A good implementation would be:

```text
Player A
Runs: 72
Strike Rate: 148.3

[ Compare ]
```

Then after clicking:

```text
Select another player to compare
```

and finally:

```text
Player A              Player B
72 runs               41 runs
148.3 SR              113.9 SR

Scope: Same fixture
```

For your app, I would recommend either:

- a **`Compare` button** on player/fixture cards, or
- a **`Compare players` / `Compare fixtures`** action near the statistics section.

That makes the “comparison route” obvious and gives you much stronger evidence for PUB-06.

What I would avoid is forcing the tester to manually open one player, remember the numbers, go back, open another player, and compare mentally. That technically might work, but it is weaker UX and could easily produce a `Partial` result during user testing.

So: **yes, I would add a Compare button if comparison is a feature you intend to support.**

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 10:11:42 AM

go to the web page and find where this is implemented https://sport-analytics-tool-web.pages.dev/

## Response:
9/24/2026, 10:11:48 AM

> **Searching the web**
>
> 
>
> **Fetching Website Source with Requests**
>
>
> **Fetched website source with requests**
>
> 
>
> **Searched 1 website**
>
> 
>
> **Inspected project files and searched the Sport Analytics Tool archive**
>
> 
>
> **Checking the implementation**
>
> I’m trying to locate the relevant task page and source references, but the provided site content isn’t currently accessible enough to inspect reliably. I’m avoiding guesses and would need usable page text or repository access to identify the implementation.
>
> **Searching the web**
>
> 
>
> Worked for 1m 18s

I tried the live deployment and the public docs URL, but this environment cannot currently fetch either Cloudflare Pages site, so I can’t truthfully tell you which live route/component implements PUB-06 from the website alone.

From the task itself, the implementation you are looking for should be wherever users can **compare two players or two fixtures while keeping the same fixture/season/career scope visible**. That could be a dedicated compare page, a `Compare` action on player/fixture views, or a statistics page that lets users switch between subjects without losing context.

The fastest way to locate it in your repo is to run these searches from the repository root:

```bash
grep -RniE \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  'compare|comparison|Compare|PUB-06' \
  apps/frontend src tests docs
```

Then specifically search likely UI labels/routes:

```bash
grep -RniE \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  'player.*compare|fixture.*compare|compare.*player|compare.*fixture|comparison' \
  apps/frontend
```

And inspect the frontend route definitions:

```bash
grep -RniE \
  --exclude-dir=node_modules \
  'path:|Route|routes|fixture|player|statistics|stats' \
  apps/frontend/src
```

What I would expect to find is one of these patterns:

```text
/fixtures/:fixtureId
/players/:playerId
/statistics
/compare
/players/compare
/fixtures/compare
```

If those searches return **no compare-related UI at all**, then PUB-06 is probably **not explicitly implemented as a comparison feature**. In that case, the current intended route may simply be:

```text
Explore Data
→ Fixture
→ Player/statistics
→ inspect Player A
→ return/switch
→ inspect Player B
```

That can technically support PUB-06, but it is weaker UX because the participant has to remember values and maintain scope mentally.

Send me the output of:

```bash
grep -RniE \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  'compare|comparison|PUB-06' \
  apps/frontend tests docs
```

and I can tell you **exactly which file/route currently implements PUB-06, or whether it is actually missing**.

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 10:14:31 AM

[Attachment: Pasted text.txt]

## Response:
9/24/2026, 10:14:33 AM

> **Located PUB-06 comparison UI implementation and analyzed uploaded files**
>
> 
>
> Worked for 34s

Yes - from your grep output, **PUB-06 is partially implemented, but there is no dedicated “Compare” route or button**.

The strongest current implementation is in the statistics UI:

- `apps/frontend/src/features/statistics/FixtureScorecards.tsx`
  - innings comparison
  - Powerplay comparison
  - match leaders
  - batting scorecards
  - bowling scorecards
  - multiple players shown in the same fixture context `Pasted text.txt`
- `apps/frontend/src/features/statistics/ParticipantAggregateView.tsx`
  - career statistics
  - competition statistics
  - season statistics
  - scope tabs for a player `Pasted text.txt`

Your own frontend documentation also describes the feature as providing an **“innings comparison”** and **“participant scope comparisons.”** `Pasted text.txt`

However, the route table has:

```text
/fixtures/:fixtureId/statistics
/fixtures/:fixtureId/players
/participants/:participantId
```

but **no `/compare`, `/players/compare`, or `/fixtures/compare` route**. `Pasted text.txt`

So right now PUB-06 appears to work like this:

```text
Explore Data
    ↓
Fixtures
    ↓
Open fixture
    ↓
Statistics
    ↓
Batting / Bowling scorecards
    ↓
Compare Player A and Player B in the same table
```

That is actually a valid implementation for the **fixture-level** part of PUB-06.

For example, if this table exists:

```text
Batting

Player             Runs   Balls   4s   6s   SR
------------------------------------------------
A Player              72      48    6    2   150
B Player              41      36    3    0   114
C Player              18      14    2    0   129
```

the participant can directly compare Player A and Player B because:

- they are in the **same fixture**;
- they use the **same metrics and units**;
- they appear in the **same table**;
- fixture context is preserved.

That satisfies a large part of PUB-06 much better than making the user open two separate pages.

### Where I think PUB-06 should be tested

Use:

```text
/fixtures/<fixture>/statistics
```

Specifically the scorecards implemented by:

```text
apps/frontend/src/features/statistics/FixtureScorecards.tsx
```

Your tests also already confirm that fixture statistics expose player links and that players are grouped into their teams and batting order. `Pasted text.txt`

### What is currently missing

There appears to be **no explicit comparison affordance**.

The grep for:

```text
player.*compare
fixture.*compare
compare.*player
compare.*fixture
```

only found documentation references and sorting code; it did not reveal a comparison component or action. `Pasted text.txt`

So I would describe your state as:

| PUB-06 concern | Current state |
|---|---|
| Compare two players in one fixture | ✅ Strong - scorecards |
| Same scope obvious | ✅ Fixture page keeps same fixture |
| Same units/labels | ✅ Tables |
| Move between players | ✅ Both can appear together |
| Career/season scope available | ✅ Participant aggregate views |
| Explicit comparison discovery | ⚠️ Weak |
| Dedicated `Compare` button | ❌ None found |
| Dedicated comparison page | ❌ None found |
| Compare two arbitrary players across same season/career side-by-side | ⚠️ Not evident |

The specific task-bank wording matters here: PUB-06 asks whether **“the comparison route is discoverable without coaching.”** `Pasted text.txt`

That's the weakness I would expect user testing to expose. A user may not realise that **“open fixture → Statistics → inspect scorecard”** is intended to be the comparison workflow.

### I would not build an entire comparison system yet

Before adding a new `/compare` feature, I'd make the existing capability discoverable.

A very small improvement could be on the fixture page:

```text
Statistics

[ View match statistics ]
Compare batting and bowling performances for this fixture
```

Or rename the action:

```text
[ View & compare player statistics ]
```

Then your route stays exactly the same:

```text
/fixtures/:fixtureId/statistics
```

and the existing scorecard remains the comparison UI.

You could also add a section heading:

```text
Player performance comparison

Compare batting and bowling figures for players in this fixture.
```

above the existing scorecards.

That is much smaller and lower-risk than building:

```text
/compare?playerA=...&playerB=...
```

right before Sprint 3 stabilisation.

So for **PUB-06 testing now**, I would give the participant something concrete like:

> **Using this fixture, compare the batting performances of two players and explain which performance appears stronger and why.**

Then do **not** tell them to click Statistics. See whether they discover the existing statistics/scorecard route themselves.

If they do, PUB-06 can succeed with the implementation you already have. If several users cannot find the comparison route, that becomes a legitimate UX finding and then an explicit Compare affordance would be justified by your user-testing evidence.

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 10:16:14 AM

so is it a bug that needs sortinf case we cant test PUB 06?

## Response:
9/24/2026, 10:16:24 AM

No - **PUB-06 is testable now, so I would not block testing by creating a pre-emptive bug.**

Your current implementation already exposes multiple players’ batting/bowling figures together on the fixture statistics page, which gives participants a real route for comparing performances. `Pasted text.txt`

The task is specifically testing whether the participant can **discover that comparison route without coaching**. `Pasted text.txt` That means failure to find it is actually useful user-testing evidence.

Use PUB-06 like this:

> “Using this fixture, compare the performance of two players and explain which performance appears stronger and why.”

Then do not tell them where to go.

If they find:

```text
Fixture
→ Statistics
→ Batting/Bowling scorecards
→ compare two players
```

and can explain the comparison, record `Success`.

If they eventually work it out but struggle, record `Partial`.

If they cannot find a meaningful way to compare without you directing them, record `Failure`.

Then create a UX bug/improvement such as:

```md
# fix(frontend): make player performance comparison discoverable from fixture analytics

## User-testing provenance

- Task: PUB-06
- Finding: participant could not discover how to compare player performances without facilitator assistance
- Severity: S3
- Evidence: <session evidence path>

## Problem

Fixture statistics contain comparable player batting and bowling figures,
but the interface does not clearly communicate that this is the route for
comparing performances.

## Expected behaviour

A user looking to compare player performance should be able to discover
the comparison route without coaching.

## Possible solution

Improve the existing fixture statistics affordance, for example:

- "Compare player performances"
- "View & compare statistics"
- explanatory copy above the scorecards

Prefer improving the existing statistics workflow over introducing a
new comparison system unless user feedback demonstrates that a dedicated
comparison view is necessary.
```

The key distinction is:

```text
Can't perform comparison at all
→ implementation/feature bug before meaningful testing

Can perform it, but users may not discover it
→ test PUB-06 first
→ let user testing determine whether it becomes a UX bug
```

Your repo search shows **no dedicated comparison route/button**, but it does show the existing scorecard/statistics implementation. `Pasted text.txt`

So for #602/PUB-06: **run the test as-is first. Do not “fix” discoverability before measuring whether users actually struggle with it.**

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 10:20:44 AM

so there is testable stuiff here https://sport-analytics-tool-web.pages.dev/fixtures/20/statistics

but no explicit wayto compare each pwerson on their own, must i raise an issue?

## Response:
9/24/2026, 10:20:56 AM

> **Assessing issue severity**
>
> I wouldn’t raise a bug yet. The current comparison workflow may satisfy same-fixture testing, while broader player-versus-player navigation appears like a possible UX enhancement. I’d run the test first; file an improvement only if users can’t compare independently without losing context.
>
> **Assessed issue severity**
>
> 
>
> Worked for 11s

You **do not need to raise a blocking bug before testing PUB-06**, because `/fixtures/20/statistics` already gives users a legitimate way to compare players in the same fixture through batting/bowling scorecards. The implementation renders multiple players under the same fixture context and common metrics. `Pasted text.txt`

What is missing is an **explicit comparison workflow**. Your route search shows fixture statistics, fixture players and individual participant pages, but no dedicated compare route. `Pasted text.txt` The targeted comparison search also did not find a player/fixture comparison UI. `Pasted text.txt`

For PUB-06, that is actually something you should test. The task explicitly asks whether the comparison route is **discoverable without coaching** and whether users can preserve the comparison scope. `Pasted text.txt`

So I would handle it like this:

| Situation | Action |
|---|---|
| User finds fixture → Statistics and compares two players successfully | `Success`; no issue required |
| User eventually finds it but struggles / needs minor assistance | `Partial`; raise UX improvement |
| User cannot work out how to compare players | `Failure`; raise UX issue |
| You specifically want side-by-side arbitrary player comparison as a product feature | Raise an **enhancement**, not a bug |

I would therefore **run PUB-06 first** with wording like:

> “Using this fixture, compare the performance of two players and explain which performance appears stronger and why.”

Do not mention the Statistics tab.

If the participant cannot discover the route, then create something like:

```md
# enhancement(frontend): make player performance comparison explicit and discoverable

## User-testing provenance

- Task: PUB-06 - Compare Meaningful Performance
- Finding: Users could view multiple player statistics within a fixture, but could
  not identify an obvious workflow for comparing two players.
- Severity: [S2/S3/S4 based on observed impact]

## Problem

Fixture statistics expose comparable batting and bowling figures, but there is
no explicit comparison affordance.

Users must infer that the scorecard is the intended comparison interface.

## Expected Behaviour

Users should be able to discover how to compare player performances without
facilitator coaching.

The interface should clearly communicate:
- which players are being compared;
- the fixture/season/career scope;
- the metrics and units being compared.

## Potential Scope

Prefer improving the existing statistics experience first, for example:

- "Compare player performances" affordance;
- "View & compare statistics" navigation copy;
- selectable players within the statistics page;
- side-by-side comparison where appropriate.

A dedicated comparison route should only be introduced if the existing
statistics workflow cannot support a clear and usable comparison experience.
```

So: **there is a possible UX enhancement here, but don't pre-emptively classify it as a bug. PUB-06 is specifically the test that should tell you whether it actually needs fixing.**

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 10:25:15 AM

for this test
its hard to find where togo to compare

not sure if we can implement like an explicit compare section/button @Nadav Sundy CS  where it will allow us to choose players/stats/etc.. to compare things

right now there is stuff there but you have to go to fixtures/comp/stats to find it which is hard for a user to find if they arent aware of the app

whats app message to the others to see thioer inpout

## Response:
9/24/2026, 10:25:18 AM

Hey guys, for **PUB-06 (Compare Meaningful Performance)** I think we may have a discoverability problem.

Right now the comparison data exists, but to get to it you basically have to already know to go through **Fixtures → competition/fixture → Statistics**, which isn’t obvious for a new user.

Do you guys think we should add a more explicit **Compare** section/button where a user can choose things like:
- players to compare
- fixture/season/career scope
- stats/metrics to compare

@Nadav Sundy CS especially keen to hear your thoughts on whether this is worth implementing now, or whether we should keep the existing flow and let the PUB-06 user testing determine if it’s actually a problem.

My concern is that a user who doesn’t already know the app may not discover the current comparison route without help.

## Prompt:
9/24/2026, 10:25:39 AM

/human

## Response:
9/24/2026, 10:25:42 AM

Hey guys, for **PUB-06 (Compare Meaningful Performance)** I think we might have a bit of a UX issue.

At the moment the comparison info is there, but you kind of have to know where to look for it already — basically going through **Fixtures → fixture → Statistics**. I’m not sure a new user would find that easily on their own.

Do you think it would be worth adding a more obvious **Compare** button/section where you can choose players, stats, maybe the scope like fixture/season/career, and compare them directly?

@Nadav Sundy CS keen to hear what you think as well. Not sure if we should implement something now, or first see if PUB-06 user testing confirms that people struggle to find it.

## Prompt:
9/24/2026, 12:19:59 PM

## PUB-03 — Narrow the Data[¶](https://sports-analytics-tool.pages.dev/testing/user-testing-task-bank/#pub-03-narrow-the-data "Permanent link")

You are only interested in a particular part of the available fixture/statistical information.

Narrow the information to the part relevant to your analysis.

### Observe[¶](https://sports-analytics-tool.pages.dev/testing/user-testing-task-bank/#observe_6 "Permanent link")

- Discoverability of available filtering/narrowing controls.
- Whether the selected scope is obvious.
- Whether the participant understands the resulting data.

how woudl you do this

## Response:
9/24/2026, 12:20:11 PM

> **Designing the test**
>
> I’d test the existing `/fixtures` filters: ask the user to select a competition, season, and team, then verify the fixture list narrows correctly. I’d record completion, errors, and whether results feel clear.
>
> **Designed the test**
>
> 
>
> Worked for 11s

For your app, I’d make **PUB-03 a filtering task on the Fixtures page**, because you already have narrowing controls there for **Competition, Season, and Team**. `Pasted text.txt`

A good test prompt would be:

> “You’re only interested in fixtures from the 2026 season involving a specific team. Narrow the fixture list so you’re only looking at relevant matches.”

Do **not** tell them where the filters are or which controls to use.

Then observe three things: whether they can find the filters, whether it is obvious what filters are currently active, and whether they understand that the resulting fixture list is now limited to that scope.

Your current fixture route already preserves filter state in the routed interface and uses URLs like filtered `/fixtures?...`, so this is a proper test of the existing implementation rather than inventing a new workflow. `Pasted text.txt`

You could also run a stats-oriented version using the player aggregate view, because that already has scope tabs for player statistics such as career/competition/season. `Pasted text.txt`

For PUB-03 specifically, though, I’d use the fixtures version because it is simpler and easier to judge:

```text
PUB-03

Task:
You are only interested in matches from a particular season and team.

Starting from the public app, narrow the available fixtures so that only
the matches relevant to that analysis are shown.

Do not coach the participant.

Observe:
- Can they find the filters?
- Can they tell which filters are active?
- Do they understand why the list changed?
- Can they clear/change the filters without getting confused?
```

If they find and use the filters correctly: `Success`.

If they find them but don’t understand the active scope or need minor help: `Partial`.

If they cannot find a way to narrow the data without coaching: `Failure`.

So yes, **PUB-03 is definitely testable with what you already have**.

## Prompt:
9/24/2026, 2:25:01 PM

[**Dean**](https://sdp.ms.wits.ac.za/Dean) commented [1 hour ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/716#issue-3739)

**Member**

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/716#user-testing-provenance)User-testing provenance

- Source: [svg test(user): validate public statistics and fixture analytics experience (#602)](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/602)
- Participant: P08 (anonymous)
- Task: PUB-06 — Compare Meaningful Performance
- Finding: Users could view multiple player statistics within a fixture, but could not identify an obvious workflow for comparing two players.
- Severity: S2

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/716#problem)Problem

Fixture statistics expose comparable batting and bowling figures, but there is no explicit comparison affordance. Users must infer that the scorecard is the intended comparison interface.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/716#expected-behaviour)Expected Behaviour

Users should be able to discover how to compare player performances without facilitator coaching. The interface should clearly communicate:

- which players are being compared;
- the fixture, season, or career scope;
- the metrics and units being compared.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/716#potential-scope)Potential Scope

Prefer improving the existing statistics experience first:

- a “Compare player performances” affordance;
- “View & compare statistics” navigation copy;
- selectable players within the statistics page;
- side-by-side comparison where appropriate.

A dedicated comparison route should only be introduced if the existing statistics workflow cannot support a clear and usable comparison experience.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/716#acceptance-criteria)Acceptance criteria

- Player comparison workflow is discoverable without coaching.
- Comparison identifies players, relevant scope, and metrics/units.
- Existing fixture statistics remain readable and accessible.
- Relevant automated coverage is updated.
- The P08 PUB-06 task is retested once implemented.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/716#evidence)Evidence

`evidence/user-testing/sprint-3/2026-09-24-P08-public.md`

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/716#related)Related

Follow-up from [#602](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/602).

HOW SHOULD THIS GET DONE

## Response:
9/24/2026, 2:25:12 PM

> **Planning comparison mode**
>
> I’m recommending a frontend-only enhancement inside the existing fixture statistics page: let users select two participants, then show aligned batting and bowling metrics side by side. I’m reusing existing statistics data, avoiding a new endpoint, and adding focused tests plus updated evidence.
>
> **Planned comparison mode**
>
> 
>
> Worked for 13s

Implement #716 as a **frontend-only comparison mode inside the existing fixture statistics page**. Do **not** build a new `/compare` route or new backend endpoint for this issue.

You already load all fixture-level participant statistics in `FixtureAnalytics`, and the scorecards render multiple players from the same fixture. `Pasted text.txt` The existing route is already `/fixtures/:fixtureId/statistics`, so this can be added without changing routing or API design. `Pasted text.txt`

### Recommended UX

Add an obvious action near the top of the statistics page:

```text
Match statistics

[ Compare player performances ]

Overview / existing statistics...
```

When clicked:

```text
Compare player performances

Scope
Fixture: Wanderers vs Strikers
This comparison uses statistics from this fixture only.

Player A                         Player B
[ Select player ▾ ]             [ Select player ▾ ]

              Batting
---------------------------------------------------------
Runs             72                  41
Balls            48                  36
Fours             6                   3
Sixes             2                   0
Strike rate     150.0               113.9

              Bowling
---------------------------------------------------------
Overs            4.0                 4.0
Runs conceded     22                  35
Wickets            3                   1
Economy           5.50                8.75
```

That directly resolves the P08 problem: there is now an explicit comparison affordance, the two players are named, the scope is clear, and the metrics/units are shown side-by-side.

I would **not add season/career comparison to #716 yet**. The finding came from `PUB-06` against fixture statistics. Expanding this into a universal player comparison system would make an S2 usability fix much larger than necessary. Career/season aggregates already exist separately in `ParticipantAggregateView`. `Pasted text.txt`

| Task Description | Owner Placeholder | Priority (H/M/L) | Dependencies | Acceptance Criteria | Verification Evidence | Target Milestone |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Add failing tests for comparison discoverability | Developer | H | Existing fixture statistics tests | Test expects an explicit `Compare player performances` control and comparison UI | Vitest failure before implementation, passing after | Sprint 3 |
| Add comparison affordance to fixture statistics | Developer | H | `FixtureAnalytics` | Clearly visible button/control available without navigating elsewhere | Component test + manual screenshot | Sprint 3 |
| Add two-player selection state | Developer | H | Fixture participant statistics | User can select two different players; same player cannot be compared with itself | Unit/component tests | Sprint 3 |
| Render comparable batting metrics | Developer | H | Existing participant fixture batting data | Runs, balls, boundaries and strike rate display side-by-side with clear labels | Automated test | Sprint 3 |
| Render comparable bowling metrics | Developer | H | Existing participant fixture bowling data | Overs, runs, wickets, economy and other existing metrics display consistently | Automated test | Sprint 3 |
| Make comparison scope explicit | Developer | H | Existing fixture metadata | UI clearly states comparison is for the current fixture | Component assertion | Sprint 3 |
| Handle missing statistics | Developer | M | Existing nullable batting/bowling fields | `Did not bat`, `Did not bowl`, or `-` shown without misleading values | Automated tests | Sprint 3 |
| Ensure responsive/accessibility behaviour | Developer | H | Existing frontend styles | Keyboard-selectable controls, labelled fields, mobile layout stacks cleanly | Accessibility/manual verification | Sprint 3 |
| Run frontend quality gates | Developer | H | Implementation complete | Tests, lint, typecheck and formatting pass | CI/local output | Sprint 3 |
| Retest PUB-06 with P08 | Tester | H | #716 deployed | Participant discovers comparison without coaching and completes PUB-06 | Updated user-testing evidence | Sprint 3 |
| Update #716/#602 evidence | Tester | H | Successful retest | Retest result and evidence path linked back to finding | Gitea comment/evidence commit | Sprint 3 |

### Suggested code structure

I would keep the existing `FixtureScorecards.tsx` from becoming too large by extracting the new feature:

```text
apps/frontend/src/features/statistics/
├── FixtureScorecards.tsx
├── PlayerComparison.tsx
├── PlayerComparison.test.tsx
├── StatisticsPages.tsx
└── statistics.css
```

`FixtureAnalytics` already builds the participant array:

```tsx
const players = statistics.statistics.filter(
  (statistic): statistic is ParticipantFixtureStatistic =>
    statistic.scope === 'participant',
);
```

That data is already used by the match leaders and batting/bowling scorecards. `Pasted text.txt` So the new component should receive that same collection:

```tsx
<PlayerComparison
  fixtureLabel={...}
  players={players}
/>
```

No second API request should be necessary.

### Comparison component behaviour

Keep its state simple:

```ts
type ComparisonSelection = {
  leftParticipantId: string;
  rightParticipantId: string;
};
```

Then derive:

```ts
const leftPlayer = players.find(
  (player) => player.participantId === selection.leftParticipantId,
);

const rightPlayer = players.find(
  (player) => player.participantId === selection.rightParticipantId,
);
```

Do **not** calculate new cricket statistics in the frontend. The project architecture expects published statistics to come from the event-derived backend; the frontend should only present the already-returned values. The project brief explicitly makes event-derived statistics central to the platform. `sport_analytics (1).pdf`

### Tests I would require

Your existing statistics tests already cover fixture statistics and scorecard presentation extensively. `Pasted text.txt` Extend them with cases for:

```text
✓ renders Compare player performances
✓ opens comparison UI
✓ lists players from current fixture
✓ prevents selecting same player twice
✓ compares two batting performances
✓ compares two bowling performances
✓ shows clear fixture scope
✓ handles player who did not bat
✓ handles player who did not bowl
✓ works with partial statistics
✓ comparison controls have accessible labels
```

The critical test for the issue is something conceptually like:

```tsx
expect(
  screen.getByRole('button', {
    name: 'Compare player performances',
  }),
).toBeVisible();
```

followed by selecting two players and asserting that their metrics appear under clearly identified columns.

### Do not overbuild #716

I would explicitly keep these **out of scope**:

```text
❌ new backend comparison endpoint
❌ new database tables
❌ dedicated /compare route
❌ comparing arbitrary players from unrelated fixtures
❌ career-vs-career comparison
❌ season-vs-season comparison
❌ custom chart builder
❌ user-saved comparisons
```

Those could become a later enhancement if user testing demonstrates a need.

For #716, the minimum strong fix is:

```text
Fixture statistics
      ↓
[Compare player performances]
      ↓
Choose Player A + Player B
      ↓
Same-scope side-by-side statistics
      ↓
P08 retest PUB-06
```

That directly addresses the evidence-backed S2 finding without destabilising the statistics architecture five days before the Sprint 3 milestone.

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 2:26:14 PM

is it a lot of work for 1 issue? or can it be done in 1 go

## Response:
9/24/2026, 2:26:19 PM

Yes - **this is reasonable to complete in one issue and one PR**.

It is not a large feature because the important data already exists on the fixture statistics page. `FixtureAnalytics` already extracts participant statistics and renders player batting/bowling data, so #716 is mainly a **presentation + interaction change**, not a backend/data-model change. `Pasted text.txt`

I’d keep the implementation to roughly:

```text
1. Add "Compare player performances" button
2. Add PlayerComparison component
3. Allow Player A + Player B selection
4. Show existing batting/bowling stats side-by-side
5. Clearly show "Scope: current fixture"
6. Add responsive/accessibility styling
7. Add/update tests
8. Run lint/typecheck/tests
9. Deploy
10. Retest P08 PUB-06
```

That should probably touch only something like:

```text
apps/frontend/src/features/statistics/
├── FixtureScorecards.tsx          # small integration change
├── PlayerComparison.tsx           # new
├── PlayerComparison.test.tsx      # new
└── statistics.css                 # styling
```

Potentially `StatisticsPresentation.test.tsx` instead of a separate test file, depending on your existing convention.

The key reason it stays manageable is that you **should not** add:

```text
new API endpoints
new database tables
new comparison calculations
new /compare route
season/career comparison
saved comparisons
charts
```

The current application already has the fixture statistics route and participant statistics required for the comparison. `Pasted text.txt`

So I’d treat #716 as approximately:

> **small-to-medium frontend issue, suitable for one Codex run/PR**

The only part that happens after the implementation PR is the **P08 retest**, because the acceptance criteria explicitly require the user-testing finding to be retested once deployed.

If you give Codex a tightly scoped prompt saying **“implement exactly #716, TDD, no backend changes and no scope expansion”**, it should be very feasible to do in one go.

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 2:26:54 PM

make a comment to add to the issue to act as a guidline to what to do

## Response:
9/24/2026, 2:26:58 PM

```md
## Implementation guideline

Keep this issue focused on making the existing fixture-level comparison workflow explicit and discoverable.

### Recommended implementation

Implement the comparison inside the existing fixture statistics experience rather than creating a new backend/API workflow.

Suggested flow:

1. Add a clear **Compare player performances** action on the fixture statistics page.
2. Allow the user to select:
   - Player A
   - Player B
3. Show both players side-by-side using the statistics already loaded for the current fixture.
4. Clearly display the comparison scope, for example:
   - `Scope: Current fixture`
5. Present comparable batting/bowling metrics with consistent labels and units.
6. Handle incomplete data clearly, e.g.:
   - `Did not bat`
   - `Did not bowl`
   - `—` where a value is unavailable
7. Ensure the comparison remains usable on mobile and keyboard accessible.

### Scope constraint

This should remain a focused frontend usability fix.

Do **not** expand this issue into:

- a new backend comparison endpoint;
- new database structures;
- a dedicated `/compare` route;
- saved comparisons;
- arbitrary cross-fixture comparison;
- season/career comparison;
- chart-building functionality.

Those can be separate enhancements if later user testing shows they are needed.

### Suggested code structure

Prefer extracting the UI into a reusable component rather than making the existing scorecard file significantly larger.

Example:

```text
apps/frontend/src/features/statistics/
├── FixtureScorecards.tsx
├── PlayerComparison.tsx
├── PlayerComparison.test.tsx
└── statistics.css
```

Reuse the existing participant fixture statistics already available to the fixture statistics page. Do not recalculate cricket statistics in the frontend.

### Testing expectations

Use TDD where practical.

Cover at minimum:

- comparison action is visible/discoverable;
- comparison UI opens correctly;
- two different players can be selected;
- the same player cannot be selected twice;
- batting metrics render correctly;
- bowling metrics render correctly;
- current fixture scope is visible;
- partial/missing statistics are handled safely;
- controls have accessible labels;
- responsive behaviour does not regress.

Run the relevant frontend:
- tests;
- lint;
- typecheck;
- formatting.

### User-testing closure

Once deployed, rerun **P08 / PUB-06** without coaching.

The issue should only be considered fully closed once the retest confirms that the participant can discover and use the comparison workflow without facilitator guidance, and the updated evidence is linked back to #602.
```

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 2:28:28 PM

![be09010c-1c8f-4802-b320-b919c3fffaee.png](https://chatgpt.com/backend-api/estuary/content?id=file_000000006ec88208a5dbed3e333e49d4&ts=497339&p=fs&cid=1&sig=d7d1f5a4067dba35df8e7097526663b56be2ea48b00eb4ac6f8707109b490d22&v=0)

should we not add the button to the player page[**Skip to main content**](https://sport-analytics-tool-web.pages.dev/participants#main-content)

[Stat'sTheGame](https://sport-analytics-tool-web.pages.dev/) ([image](https://sport-analytics-tool-web.pages.dev/brand/statsthegame-wordmark-dark.svg))

**Explore Data ▾**

[**Downloads**](https://sport-analytics-tool-web.pages.dev/dataset-releases)[**API**](https://sport-analytics-tool-web.pages.dev/api)

**Manage Submission▾**

[**Administration**](https://sport-analytics-tool-web.pages.dev/admin)[**Account**](https://sport-analytics-tool-web.pages.dev/account)

**ThemeNight Match**

**Players**

# Players

Browse players in the published fixture and team record.

## Filter records

[**Clear filters**](https://sport-analytics-tool-web.pages.dev/participants)

**Fixture**

▾

**Team**

▾

**Player name**

▾

**Records per page**2550100

**Apply filters**

## Published players

50 records on this page

- Player
  ### [A Adams](https://sport-analytics-tool-web.pages.dev/participants/18904)
- Player
  ### [A Adekunle](https://sport-analytics-tool-web.pages.dev/participants/123637)
- Player
  ### [A Adetoro](https://sport-analytics-tool-web.pages.dev/participants/194790)
- Player
  ### [A Adey](https://sport-analytics-tool-web.pages.dev/participants/75457)
- Player
  ### [A Ahmadhel](https://sport-analytics-tool-web.pages.dev/participants/18880)
- Player
  ### [A Aikenhead](https://sport-analytics-tool-web.pages.dev/participants/90148)
- Player
  ### [A Aitken-Drummond](https://sport-analytics-tool-web.pages.dev/participants/33516)
- Player
  ### [A Akhigbe](https://sport-analytics-tool-web.pages.dev/participants/123793)
- Player
  ### [A Akurut](https://sport-analytics-tool-web.pages.dev/participants/193408)
- Player
  ### [A Alexander](https://sport-analytics-tool-web.pages.dev/participants/17958)
- Player
  ### [A Alfonso](https://sport-analytics-tool-web.pages.dev/participants/34596)
- Player
  ### [A Amado](https://sport-analytics-tool-web.pages.dev/participants/117997)
- Player
  ### [A Amburose](https://sport-analytics-tool-web.pages.dev/participants/140227)
- Player
  ### [A Amuzu](https://sport-analytics-tool-web.pages.dev/participants/233198)
- Player
  ### [A Andrews](https://sport-analytics-tool-web.pages.dev/participants/114821)
- Player
  ### [A Andriani](https://sport-analytics-tool-web.pages.dev/participants/10131)
- Player
  ### [A Aravinddaraj](https://sport-analytics-tool-web.pages.dev/participants/283353)
- Player
  ### [A Argyropoulou](https://sport-analytics-tool-web.pages.dev/participants/54834)
- Player
  ### [A Ashish Reddy](https://sport-analytics-tool-web.pages.dev/participants/175662)
- Player
  ### [A Ashok](https://sport-analytics-tool-web.pages.dev/participants/231724)
- Player
  ### [A Ashokan](https://sport-analytics-tool-web.pages.dev/participants/68247)
- Player
  ### [A Askari](https://sport-analytics-tool-web.pages.dev/participants/278229)
- Player
  ### [A Athanaze](https://sport-analytics-tool-web.pages.dev/participants/62667)
- Player
  ### [A Augastin](https://sport-analytics-tool-web.pages.dev/participants/98081)
- Player
  ### [A Awasthi](https://sport-analytics-tool-web.pages.dev/participants/76284)
- Player
  ### [A Awasthi](https://sport-analytics-tool-web.pages.dev/participants/294591)
- Player
  ### [A Ayre](https://sport-analytics-tool-web.pages.dev/participants/53359)
- Player
  ### [A Badoni](https://sport-analytics-tool-web.pages.dev/participants/157871)
- Player
  ### [A Bagai](https://sport-analytics-tool-web.pages.dev/participants/142736)
- Player
  ### [A Balbirnie](https://sport-analytics-tool-web.pages.dev/participants/25639)
- Player
  ### [A Barnes](https://sport-analytics-tool-web.pages.dev/participants/76498)
- Player
  ### [A Barty](https://sport-analytics-tool-web.pages.dev/participants/350826)
- Player
  ### [A Begg](https://sport-analytics-tool-web.pages.dev/participants/18832)
- Player
  ### [A Bengeri](https://sport-analytics-tool-web.pages.dev/participants/159796)
- Player
  ### [A Beresford-Peirse](https://sport-analytics-tool-web.pages.dev/participants/76285)
- Player
  ### [A Bester](https://sport-analytics-tool-web.pages.dev/participants/130431)
- Player
  ### [A Bhadauria](https://sport-analytics-tool-web.pages.dev/participants/68397)
- Player
  ### [A Bhagwat](https://sport-analytics-tool-web.pages.dev/participants/107611)
- Player
  ### [A Bhargava](https://sport-analytics-tool-web.pages.dev/participants/207226)
- Player
  ### [A Bharwad](https://sport-analytics-tool-web.pages.dev/participants/294833)
- Player
  ### [A Bhattarai](https://sport-analytics-tool-web.pages.dev/participants/92327)
- Player
  ### [A Bidari](https://sport-analytics-tool-web.pages.dev/participants/127469)
- Player
  ### [A Bierwisch](https://sport-analytics-tool-web.pages.dev/participants/88611)
- Player
  ### [A Bishnoi](https://sport-analytics-tool-web.pages.dev/participants/35309)
- Player
  ### [A Bohara](https://sport-analytics-tool-web.pages.dev/participants/134)
- Player
  ### [A Bonora](https://sport-analytics-tool-web.pages.dev/participants/143100)
- Player
  ### [A Bosch](https://sport-analytics-tool-web.pages.dev/participants/33700)
- Player
  ### [A Bose](https://sport-analytics-tool-web.pages.dev/participants/12011)
- Player
  ### [A Bramble](https://sport-analytics-tool-web.pages.dev/participants/56590)
- Player
  ### [A Brindle](https://sport-analytics-tool-web.pages.dev/participants/85481)

**Previous page**[**Next page**](https://sport-analytics-tool-web.pages.dev/participants?cursor=eyJkaXNwbGF5TmFtZSI6IkEgQnJpbmRsZSIsInBhcnRpY2lwYW50SWQiOiI4NTQ4MSJ9\&page=2)

[Stat'sTheGame](https://sport-analytics-tool-web.pages.dev/brand/statsthegame-wordmark-dark.svg)[**API Explorer**](https://sport-analytics-tool-web.pages.dev/api)[**API Documentation**](https://sports-analytics-tool.pages.dev/api/overview/)

The game, measured ball by ball.

annd add a button somewhere here

## Response:
9/24/2026, 2:28:36 PM

Yes — **the Players area is probably the better entry point for comparison discoverability**.

Right now a user naturally goes:

```text
Explore Data
→ Players
```

If they want to compare players, this is where they will expect to find it. Making them first discover a fixture, open statistics, and infer that the scorecard is the comparison mechanism is less intuitive.

I would adjust #716 so comparison is **accessible from both places**, but still implemented as one underlying frontend feature.

On `/participants`, add a clear action near the page heading:

```text
Players

Browse players in the published fixture and team record.

[ Compare players ]
```

Then the flow becomes:

```text
Players
→ Compare players
→ Select Player A
→ Select Player B
→ Select scope
→ Compare
```

A sensible UI would be:

```text
Compare players

Player A
[ Select player ▾ ]

Player B
[ Select player ▾ ]

Scope
[ Fixture ▾ ]

Fixture
[ Select fixture ▾ ]

[ Compare performances ]
```

For the **first version**, I would still keep the actual comparison restricted to a **shared fixture**, because that data already exists and avoids a much larger implementation.

So:

```text
Scope: Fixture
Player A: A Balbirnie
Player B: A Athanaze
Fixture: <fixture both participated in>
```

Then show:

```text
Batting
------------------------------------------------
                     A Balbirnie    A Athanaze
Runs                     72             41
Balls                    48             36
Strike rate             150.0          113.9
Fours                     6              3
Sixes                     2              0

Bowling
------------------------------------------------
Overs                     —              4.0
Wickets                   —              2
Economy                   —              6.25
```

### I would also add it to player detail pages

On:

```text
/participants/:participantId
```

add something like:

```text
A Balbirnie

[ Compare with another player ]
```

That is extremely natural UX because the user already has Player A selected.

Clicking it could preselect the current player:

```text
Compare players

Player A
A Balbirnie

Player B
[ Select another player ▾ ]
```

This would be even stronger for PUB-06.

### Best structure

I would use three entry points into the **same comparison component**:

```text
/participants
    [Compare players]
          │
          ▼

/participants/:id
    [Compare with another player]
          │
          ▼

/fixtures/:id/statistics
    [Compare player performances]
          │
          ▼

      PlayerComparison
```

So you're not building three implementations.

The comparison state/component can just receive optional defaults:

```ts
type PlayerComparisonProps = {
  initialPlayerId?: string;
  fixtureId?: string;
};
```

That keeps it maintainable.

### What I would change in #716

I would slightly widen the issue from:

> make fixture statistics comparison discoverable

to:

> **make player-performance comparison discoverable from the public player and fixture-statistics journeys**

That still directly addresses the P08 finding, but gives users a much more obvious route.

A revised acceptance criterion could be:

```md
- A public user can discover player comparison from the Players experience
  without first knowing which fixture-statistics route contains comparable data.
- A player detail page provides an obvious "Compare with another player" action.
- Fixture statistics may also expose a "Compare player performances" action.
- All entry points reuse the same comparison implementation.
- The comparison clearly identifies both players, the shared scope, and the
  metrics/units being compared.
```

I think this is better than putting the button **only** on the fixture statistics page. For a user thinking **“I want to compare players”**, `Explore Data → Players → Compare players` is much more predictable.

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 2:29:14 PM

give the comment to add to the issue

## Response:
9/24/2026, 2:29:19 PM

```md
## Implementation guidance

To improve discoverability, the comparison workflow should not be exposed only from the fixture statistics page.

A user who wants to compare players is likely to start from **Explore Data → Players**, so the comparison feature should be reachable from the public player journey as well as from fixture statistics.

### Recommended entry points

Provide a shared comparison experience from:

- `/participants`
  - Add a clear **Compare players** action near the page heading.
- `/participants/:participantId`
  - Add **Compare with another player**.
  - Preselect the current player as Player A where practical.
- `/fixtures/:fixtureId/statistics`
  - Add **Compare player performances**.
  - Preselect the current fixture scope where practical.

All entry points should reuse the same underlying comparison component/state rather than implementing separate comparison flows.

### Recommended initial scope

Keep the first implementation focused on **fixture-level player comparison**.

Suggested flow:

1. Select Player A.
2. Select Player B.
3. Select or confirm the shared fixture.
4. Display both players side-by-side using the existing published fixture statistics.
5. Clearly show the comparison scope, e.g.:
   - `Scope: Current fixture`
6. Present comparable batting/bowling metrics with consistent labels and units.

Example:

```text
Compare players

Player A
[ A Balbirnie ]

Player B
[ Select player ▾ ]

Scope
[ Fixture ]

Fixture
[ Select shared fixture ▾ ]

[ Compare performances ]
```

### Comparison output

Present comparable values side-by-side, for example:

```text
Batting
------------------------------------------------
                     Player A       Player B
Runs                    72             41
Balls                   48             36
Strike rate            150.0          113.9
Fours                    6              3
Sixes                    2              0
```

Handle unavailable statistics clearly with values such as:

- `Did not bat`
- `Did not bowl`
- `—`

Do not calculate new cricket statistics in the frontend; reuse the existing published participant/fixture statistics.

### Scope constraint

Do not expand this issue into:

- a new backend comparison endpoint;
- new database structures;
- saved comparisons;
- custom chart builders;
- arbitrary cross-fixture comparison;
- full career/season comparison unless required to satisfy the existing acceptance criteria.

Those can be follow-up enhancements if later user testing shows they are needed.

### Updated acceptance guidance

The implementation should satisfy the following:

- A public user can discover player comparison from the **Players** experience without already knowing that comparable data exists under fixture statistics.
- A player detail page provides an obvious **Compare with another player** action.
- Fixture statistics may also expose **Compare player performances**.
- All entry points reuse the same comparison implementation.
- The comparison clearly identifies:
  - both players;
  - the comparison scope;
  - the relevant metrics and units.
- Existing fixture/player statistics remain readable and accessible.
- Relevant automated coverage is updated.
- P08 / PUB-06 is retested after deployment without facilitator coaching.
```

**Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.**

## Prompt:
9/24/2026, 2:39:28 PM

md file

## Response:
9/24/2026, 2:39:36 PM

[Download the Markdown file](sandbox:/mnt/data/issue-716-implementation-guidance.md)



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)