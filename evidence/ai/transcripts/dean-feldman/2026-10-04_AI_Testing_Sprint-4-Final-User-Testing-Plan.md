# Testing Direction Plan

**User:** Anonymous  
**Created:** 10/4/2026 21:29:08  
**Updated:** 10/4/2026 21:35:50  
**Exported:** 10/4/2026 21:37:58  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ac2a904-57e4-83ea-a307-ac15fd26ea65](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ac2a904-57e4-83ea-a307-ac15fd26ea65)  

## Prompt:
10/4/2026, 9:29:47 PM

Logo\
Issues\
Pull Requests\
Milestones\
Explore\
git-push-pray\
/\
Sport-Analytics-Tool\
Internal\
Code\
Issues\
12\
Pull Requests\
1\
Actions\
1\
Packages\
Projects\
2\
Releases\
Wiki\
Activity\
Settings\
test(user): run final structured user testing and integrate feedback #803\
Open\
opened 5 days ago by Shayna · 0 comments\
\
Shayna commented 5 days ago\
Member\
Description\
Run a final structured user-testing round against the near-final production-equivalent application.\
\
Earlier user-testing infrastructure and documentation should be reused rather than inventing a new informal process for Sprint 4.\
\
The goal is to collect evidence about the final product, evaluate the feedback, implement important fixes where practical, and explicitly record any feedback that is not implemented.\
\
Scope\
Use the existing user-testing protocol, facilitator guidance, task bank and evidence structure.\
\
The final sessions should exercise representative workflows such as:\
\
discovering statistics as a public user;\
navigating competitions/fixtures/players or teams;\
using analytics/statistics views;\
authentication where relevant;\
submission workflows for an approved submitter;\
review/admin workflows where appropriate; and\
API discovery/API Explorer where suitable for the participant.\
Capture:\
\
session date;\
participant/user type;\
tasks attempted;\
observed difficulties;\
participant feedback;\
severity/importance;\
resulting issue or fix;\
decision where feedback is not implemented; and\
retest result for important fixes.\
Acceptance Criteria\
A final structured user-testing round is completed.\
At least 3 completed final-stage user-testing sessions are recorded.\
More than one relevant user/workflow type is represented where practical.\
The existing formal feedback process is used.\
Raw/session evidence is retained in the repository's established evidence structure.\
Findings are evaluated rather than merely listed.\
Actionable findings are linked to fixes/issues.\
Important fixes are retested where practical.\
Feedback that is deliberately not implemented has a recorded reason.\
A final summary identifies recurring findings and resulting changes.\
Documentation clearly distinguishes Sprint 4 testing from earlier rounds.\
Required AI attribution is retained in generated/edited documentation.\
AI Declaration\
The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].\
\
&#x20;Shayna added this to the Sprint 4 milestone 5 days ago\
&#x20;Shayna added the \
area: testing\
priority: high\
&#x20;labels 5 days ago\
&#x20;Shayna added a new dependency 5 days ago\
\#800 ux(frontend): final UI/UX, accessibility and responsive polish\
&#x20;Shayna added a new dependency 5 days ago\
\#801 fix(submissions): improve submission feedback and JSON upload guidance\
&#x20;Shayna added a new dependency 5 days ago\
\#802 feat(frontend): add lightweight personalisation for authenticated users\
&#x20;Shayna added a new dependency 5 days ago\
\#810 release: final production deployment, rubric audit and project close-out\
&#x20;Shayna added this to the Sport-Analytics-Tool-Proj project 5 days ago\
&#x20;Dean moved this to Ready in  Sport-Analytics-Tool-Proj on 4 days ago\
&#x20;Dean self-assigned this 4 minutes ago\
&#x20;Dean removed their assignment now\
\
Write\
Preview\
Leave a comment\
\
Drop files or click here to upload.\
area: testing\
priority: high\
Sprint 4\
Sport-Analytics-Tool-Proj\
No Assignees\
1 Participants\
\
Notifications\
Due Date\
No due date set.\
\
yyyy/mm/dd\
Blocks\
\#810 release: final production deployment, rubric audit and project close-out\
git-push-pray/Sport-Analytics-Tool\
Depends on\
\#800 ux(frontend): final UI/UX, accessibility and responsive polish\
git-push-pray/Sport-Analytics-Tool\
\#801 fix(submissions): improve submission feedback and JSON upload guidance\
git-push-pray/Sport-Analytics-Tool\
\#802 feat(frontend): add lightweight personalisation for authenticated users\
git-push-pray/Sport-Analytics-Tool\
Reference: git-push-pray/Sport-Analytics-Tool#803\
&#x20;\
Powered by Gitea\
Version: 1.24.7 Page:\
141ms\
Template:\
34ms\
Licenses\
API

help me add a comment to this to give it more direction
codex cant solve this as it is curently [https://sports-analytics-tool.pages.dev/testing/](https://sports-analytics-tool.pages.dev/testing/)

## Response:
10/4/2026, 9:29:48 PM · gpt-5-6-thinking

> **Searching the web**
>
> 
>
> **Planning the testing work**
>
> I’m framing this as an implementation plan: inspect existing testing docs, add repeatable manual and automated protocols, and avoid inventing session evidence. Human testing remains necessary before finalizing results.
>
> **Planned the testing work**
>
> 
>
> **Searched project files for canonical user-testing documentation**
>
> 
>
> Worked for 36s

Add this as a **direction-setting comment** on #803. The key change is to make explicit that Codex must **prepare the final testing round and integrate real evidence, not invent user-testing sessions**. That also matches the marking emphasis on extensive user testing, formal feedback collection, and evidence of integration. `project_briefs (6).pdf`

```md
## Implementation Direction / Execution Plan

This issue is **not intended to be solved by generating hypothetical user-testing results**.

The existing testing documentation should be treated as the baseline:

https://sports-analytics-tool.pages.dev/testing/

The required work is split into two stages:

### Stage 1 - Prepare the Sprint 4 final user-testing round

Before changing documentation, inspect the existing testing documentation and repository structure and reuse the established process, terminology, templates, and evidence locations.

Do **not** create a second independent testing methodology.

Prepare the repository/docs so that three real final-stage sessions can be run consistently.

Required preparation:

- Identify the existing:
  - user-testing protocol;
  - facilitator instructions;
  - task bank;
  - feedback/evaluation format;
  - evidence directory/naming convention;
  - previous Sprint 2/3 user-testing summaries.
- Add a clearly separated **Sprint 4 / Final User Testing** section to the existing testing documentation.
- Define at least 3 final sessions covering more than one user/workflow type.

Use these session profiles as the target:

1. **Public / analytics user**
   - Find a competition or fixture.
   - Navigate statistics/analytics.
   - Locate player/team information.
   - Attempt to understand/export/use available data where appropriate.

2. **Authenticated submitter**
   - Sign in.
   - Navigate the submission workflow.
   - Submit or upload representative fixture/event data.
   - Interpret validation/error feedback.
   - Locate the resulting submission/batch status.

3. **Reviewer/admin/API-oriented user**
   - Review a submitted batch where permissions allow; and/or
   - navigate API documentation/API Explorer;
   - find an endpoint;
   - understand required parameters/authentication;
   - execute or understand a representative API request.

Do not force a task where the participant reasonably would not use that workflow.

### Stage 2 - Run sessions manually and integrate REAL evidence

The actual sessions must be performed by team members with real participants.

**Codex must not fabricate:**
- participant quotes;
- participant behaviour;
- dates/times;
- task completion results;
- severity ratings;
- screenshots;
- observations;
- user feedback;
- retest results.

Where real session evidence does not yet exist, create the required template/placeholders and stop there.

Each completed session must record:

| Field | Required |
| --- | --- |
| Session date | Yes |
| Participant identifier/type | Yes - anonymised where appropriate |
| Workflow/user type | Yes |
| Tasks attempted | Yes |
| Completed / partially completed / failed | Yes |
| Observed difficulty | Yes |
| Participant feedback | Yes |
| Severity/importance | Yes |
| Proposed action | Yes |
| Linked Gitea issue/PR/fix | Where actionable |
| Decision if not implemented | Required |
| Reason for non-implementation | Required |
| Retest result | Required for important implemented fixes where practical |

### Finding evaluation

Do not simply list feedback.

Every finding must end in one of:

- **Implemented** - link the issue/PR/fix and record retest evidence.
- **Issue created** - link the new issue.
- **Accepted / no change required** - explain why.
- **Deferred** - explain the technical/time/scope reason.
- **Rejected** - explain why the feedback conflicts with product requirements, evidence, accessibility, security, or project scope.

For recurring findings, consolidate them rather than opening duplicate issues.

### Evidence structure

Reuse the repository's existing evidence structure.

Do not invent a new top-level evidence convention unless no suitable existing structure exists.

Sprint 4 evidence must nevertheless be clearly distinguishable from previous rounds, for example through the existing equivalent of:

`Sprint 4 -> Final User Testing -> Session <n>`

Keep raw evidence separate from the final evaluation/summary.

### Required final documentation

Once the three sessions have actually been completed, update the testing documentation with a **Final User Testing / Sprint 4** section containing:

1. Objective and scope.
2. Reference to the existing testing methodology.
3. Participants/user types.
4. Workflows/tasks exercised.
5. Session evidence links.
6. Findings table.
7. Issues/fixes created from findings.
8. Feedback deliberately not implemented + reasoning.
9. Retest results.
10. Recurring/cross-session findings.
11. Final conclusion describing what changed because of this testing round.

The existing `/testing/` documentation page should remain the main entry point rather than creating an isolated documentation area.

### Important constraint

This issue is complete only when **real testing evidence exists**.

A code/documentation agent may prepare the protocol, templates, directory structure, links and summaries, but it must **not mark the issue complete based solely on generated documentation**.

If the repository does not yet contain the three required completed sessions, finish Stage 1, clearly report what human testing is still required, and wait for the session evidence before performing Stage 2.

### Definition of Done

- [ ] Existing testing methodology was reused rather than replaced.
- [ ] Sprint 4 is clearly distinguished from previous testing rounds.
- [ ] Final-session protocol/templates are present.
- [ ] At least 3 **real** completed sessions are stored.
- [ ] More than one user/workflow type is represented where practical.
- [ ] Raw/session evidence is retained.
- [ ] Every meaningful finding has an explicit evaluation/decision.
- [ ] Actionable findings link to issues/fixes.
- [ ] Important implemented fixes have retest evidence where practical.
- [ ] Non-implemented feedback has a recorded reason.
- [ ] Final cross-session summary identifies recurring findings and resulting changes.
- [ ] `/testing/` documentation links to the final testing evidence.
- [ ] Required AI declarations are retained in generated/edited documentation.
- [ ] Documentation lint/build succeeds.

### Codex execution rule

Start by inspecting the repository and current testing documentation. Do not make changes until the existing testing/evidence conventions have been identified.

Then implement **Stage 1 only** unless genuine Sprint 4 session evidence is already present in the repository.
```

This is a better shape for Codex because it separates **software-agent work** from **human research work**. The brief specifically rewards extensive user testing and evidence of feedback gathering/integration, so generated “sessions” would defeat the point of the requirement. `project_briefs (6).pdf` The final marking also examines testing quality and coverage as part of the submission. `project_briefs (6).pdf`

Also keep the attribution requirement: COMS3011A permits AI-assisted writing, but requires the tool, model, and purpose to be documented, and the team remains responsible for generated material. `ai_policy.pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
10/4/2026, 9:31:07 PM

which tests are they from the testing bank in the testing docs

## Response:
10/4/2026, 9:31:10 PM · gpt-5-6-thinking

> **Searching the web**
>
> 
>
> **Searched project files for task bank documentation**
>
> 
>
> **Fetching Testing Docs via Direct URL**
>
>
> **Fetched testing docs via direct URL**
>
> 
>
> **Searched 8 websites**
>
> 
>
> **Listed project conversation files**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 1m 1s

The three session profiles I suggested are **not yet mapped to exact task-bank IDs**, because I can’t currently retrieve the live `/testing/` page or the repository’s task-bank file from this environment. I should not invent task names or IDs.

From #803, the correct approach is to choose existing bank tasks that cover these three areas:

1. **Public/statistics workflow**
   - competition discovery
   - fixture navigation
   - player/team navigation
   - statistics/analytics views
   - dataset/export discovery if one already exists in the bank

2. **Approved submitter workflow**
   - authentication/sign-in if included
   - submission creation/upload
   - validation/error interpretation
   - checking submitted batch/submission status

3. **Reviewer/Admin/API workflow**
   - batch review/publish workflow for a reviewer/admin **or**
   - API documentation/API Explorer discovery and representative endpoint use

That is the right coverage because the project brief expects extensive user testing and formal feedback collection/integration, rather than just informal observations. `project_briefs (6).pdf`

For #803, **do not create new tests unless the existing task bank genuinely lacks coverage**. The issue itself explicitly says to reuse the task bank.

If you paste the **Task Bank section** from `/testing/` here, I can give you the exact answer in this form:

```md
Session 1 - Public user
- UT-XX - [exact task name]
- UT-XX - [exact task name]
- UT-XX - [exact task name]

Session 2 - Approved submitter
- UT-XX - [exact task name]
- UT-XX - [exact task name]

Session 3 - Reviewer / API user
- UT-XX - [exact task name]
- UT-XX - [exact task name]
```

and I’ll also tell you which ones are **mandatory for #803**, which are optional, and whether any important workflow is missing from the current bank.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
10/4/2026, 9:32:52 PM

[Attachment: Pasted text.txt]

## Response:
10/4/2026, 9:32:54 PM · gpt-5-6-thinking

> **Selecting task sets**
>
> I’m mapping the bank into three focused sessions: public discovery, authenticated submission, and reviewer/API workflows. I’d use existing IDs rather than inventing tasks, while keeping each session reasonably sized.
>
> **Selected task sets**
>
> 
>
> Worked for 14s

For #803, I’d use these **exact existing Task Bank tests**. Do **not** invent new tests unless Sprint 4 uncovers a genuine gap. The Task Bank itself says to select only the tasks needed for the workflow and keep sessions focused rather than making one participant do everything. `Pasted text.txt` `Pasted text.txt`

### Recommended minimum 3 sessions

| Session | User type | Exact Task Bank tests |
|---|---|---|
| **1 - Public / analyst** | Public user | **PUB-01 Discover Data**, **PUB-02 Find Statistics**, **PUB-03 Narrow the Data**, **PUB-06 Compare Meaningful Performance** |
| **2 - Approved submitter** | Authenticated submitter | **AUTH-01 Sign In or Sign Up**, **AUTH-02 Understand Submission Access**, **SUB-01 Access Submitter Functionality**, **SUB-02 Valid Single-Fixture Package**, **SUB-03 Invalid Single-Fixture Package**, **SUB-04 Recover From Package Validation Failure** |
| **3 - Reviewer** | Reviewer/admin user | **AUTH-01 Sign In or Sign Up**, **AUTH-02 Understand Submission Access**, **REV-01 Find Work Awaiting Review**, **REV-02 Evaluate a Staged Batch**, **REV-04 Approve and Publish** |

That gives you three real, distinct workflows without bloating the sessions.

For the **public/analyst session**, those tasks directly test discovering a fixture, finding statistics, filtering/narrowing data, and making a meaningful player/fixture comparison. `Pasted text.txt` `Pasted text.txt`

For the **submitter session**, AUTH-01/02 establish authentication and submission permissions, while SUB-01 through SUB-04 test finding submission functionality, successfully uploading a fixture package, understanding validation failures, and recovering from them. `Pasted text.txt` `Pasted text.txt`

For the **reviewer session**, REV-01/02/04 cover finding staged work, understanding validation/rejection/reference information, and making the final approval/publication decision. `Pasted text.txt`

### Optional 4th session - API consumer

I would actually add this if you have time, because your product is heavily API-focused:

| Session | Exact tests |
|---|---|
| **4 - API consumer** | **PUB-05 API Discovery**, **API-01 Use a Consumer Key and Understand Quota State**, **API-02 Retrieve and Understand Aggregate Data** |

PUB-05 checks whether someone can even find enough information to start using the API. API-01 then tests authenticated API use and quota/rate-limit understanding, while API-02 tests retrieving aggregate data. `Pasted text.txt` `Pasted text.txt`

### I would not use these by default for #803

Unless you specifically want to validate those advanced flows, I would leave out:

- `SUB-05/06` - advanced technical JSON
- `SUB-07` - genuinely new fixture
- `BAT-01..05` - batch/back-catalogue ingestion
- `COR-01` - correction journey
- `REV-03/05/06` - ambiguous mapping, reject/return, new-fixture onboarding
- `ADM-01/02` - admin-specific access/provenance
- `DATA-01/02` - dataset release reproducibility
- `API-03/04` - deprecation and per-consumer usage

Those are valuable but make the final round much larger. The Task Bank explicitly supports focused task sets rather than exhaustive sessions. `Pasted text.txt`

So I would update my previous #803 comment to specify:

```md
### Required Sprint 4 task-bank selection

Use the existing task bank; do not invent replacement tasks.

Minimum final sessions:

**Session 1 - Public / Analyst**
- PUB-01 - Discover Data
- PUB-02 - Find Statistics
- PUB-03 - Narrow the Data
- PUB-06 - Compare Meaningful Performance

**Session 2 - Approved Submitter**
- AUTH-01 - Sign In or Sign Up
- AUTH-02 - Understand Submission Access
- SUB-01 - Access Submitter Functionality
- SUB-02 - Valid Single-Fixture Package
- SUB-03 - Invalid Single-Fixture Package
- SUB-04 - Recover From Package Validation Failure

**Session 3 - Reviewer**
- AUTH-01 - Sign In or Sign Up
- AUTH-02 - Understand Submission Access
- REV-01 - Find Work Awaiting Review
- REV-02 - Evaluate a Staged Batch
- REV-04 - Approve and Publish

**Recommended additional API session**
- PUB-05 - API Discovery
- API-01 - Use a Consumer Key and Understand Quota State
- API-02 - Retrieve and Understand Aggregate Data

The facilitator may reduce a session where appropriate, but must record
which Task IDs were actually attempted and why any planned task was omitted.
Do not require one participant to execute every task in the bank.
```

That gives Codex a **precise, existing test selection** instead of the vague “representative workflows” wording currently in #803.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
10/4/2026, 9:34:05 PM

give the full comment

## Response:
10/4/2026, 9:34:15 PM · gpt-5-6-thinking

```md
## Implementation Direction / Execution Plan

This issue is **not intended to be solved by generating hypothetical user-testing results**.

The existing formal user-testing process must be reused:

https://sports-analytics-tool.pages.dev/testing/

The repository already has a formal **User Testing Protocol**, **Task Bank**, facilitator guidance, Sprint 2/Sprint 3 feedback summaries, and an established evidence structure. Sprint 4 should extend this process rather than introduce a new methodology.

The Task Bank explicitly states that tasks are independent and that the facilitator should select only the tasks needed for the workflow being evaluated. Participants should **not** be made to complete the whole task bank in one session.

---

# Stage 1 - Prepare Sprint 4 Final User Testing

Before editing or creating documentation:

1. Inspect the existing:
   - `User Testing Overview`;
   - `User Testing Protocol`;
   - `User Testing Task Bank`;
   - facilitator setup/guidance;
   - Sprint 2 user-feedback documentation;
   - Sprint 3 user-feedback documentation;
   - existing user-testing evidence directories and naming conventions.

2. Reuse the existing:
   - Task IDs;
   - task wording;
   - outcome classification;
   - facilitator rules;
   - finding/severity format;
   - evidence structure.

3. Add a clearly separated **Sprint 4 / Final User Testing** section rather than replacing the current testing documentation.

4. Prepare the session templates/evidence locations required for the sessions below.

Do **not** invent replacement tasks where the existing Task Bank already provides coverage.

---

# Required Sprint 4 Task-Bank Selection

At least **3 real completed sessions** are required.

The following task sets should be the planned baseline.

## Session 1 - Public / Analyst User

Use:

- `PUB-01 - Discover Data`
- `PUB-02 - Find Statistics`
- `PUB-03 - Narrow the Data`
- `PUB-06 - Compare Meaningful Performance`

### Purpose

Evaluate whether a first-time/public user can:

- discover available cricket data;
- locate a fixture;
- understand the fixture information presented;
- locate useful player/team statistics;
- understand derived statistics;
- narrow/filter the available information;
- compare meaningful player/fixture performance;
- navigate without facilitator coaching.

This session should primarily evaluate:

- discoverability;
- terminology;
- navigation;
- statistical comprehension;
- filtering;
- meaningful analysis;
- overall public-user UX.

---

## Session 2 - Approved Submitter

Use:

- `AUTH-01 - Sign In or Sign Up`
- `AUTH-02 - Understand Submission Access`
- `SUB-01 - Access Submitter Functionality`
- `SUB-02 - Valid Single-Fixture Package`
- `SUB-03 - Invalid Single-Fixture Package`
- `SUB-04 - Recover From Package Validation Failure`

### Purpose

Evaluate whether an approved contributor can:

- authenticate successfully;
- understand their role/access state;
- determine whether they can submit data;
- locate the submission workflow;
- successfully upload a valid fixture package;
- understand confirmation/receipt/status information;
- recognise an invalid submission;
- understand validation messages;
- identify what needs to be corrected;
- recover from a failed submission without facilitator coaching.

The facilitator must prepare the safe valid/invalid fixture packages using the repository's existing facilitator guidance.

The participant should **not** be told which controls to click or where to navigate while a task is active.

---

## Session 3 - Reviewer

Use:

- `AUTH-01 - Sign In or Sign Up`
- `REV-01 - Find Work Awaiting Review`
- `REV-02 - Evaluate a Staged Batch`
- `REV-04 - Approve and Publish`

`AUTH-02 - Understand Submission Access` may also be included if account-role/access-state clarity is relevant to the prepared reviewer scenario.

### Purpose

Evaluate whether a reviewer can:

- authenticate;
- discover the review workspace;
- find work awaiting review;
- identify the correct staged batch;
- understand validation/rejection/reference information;
- distinguish valid/rejected/unresolved content;
- determine whether sufficient information exists to make a decision;
- confidently approve/publish appropriate data;
- understand the effect of publication on public state.

Use a disposable or explicitly approved test batch prepared according to the existing facilitator setup documentation.

---

# Recommended Additional Session - API Consumer

Where practical, run a fourth session because the API is a major part of the product.

Use:

- `PUB-05 - API Discovery`
- `API-01 - Use a Consumer Key and Understand Quota State`
- `API-02 - Retrieve and Understand Aggregate Data`

### Purpose

Evaluate whether an external developer/API consumer can:

- discover the API documentation;
- understand how API access begins;
- understand endpoint/example documentation;
- use the supplied test consumer credentials;
- understand where API authentication belongs;
- distinguish authentication failures from quota/rate-limit behaviour;
- understand quota/reset/retry information;
- locate aggregate operations;
- execute a representative aggregate request;
- understand the resulting response.

**Never retain the API consumer key in screenshots, transcripts or testing evidence.**

---

# Optional Task Expansion

The following existing Task Bank tasks should only be added where there is a specific Sprint 4 validation reason.

### Advanced submission

- `SUB-05 - Use Advanced Technical JSON`
- `SUB-06 - Understand Advanced Validation Errors`
- `SUB-07 - Submit a Genuinely New Fixture`

### Batch ingestion

- `BAT-01 - Upload a Season Package`
- `BAT-02 - Upload a Back Catalogue`
- `BAT-03 - Find Batch Progress and Results`
- `BAT-04 - Understand a Failed or Correction-Required Batch`
- `BAT-05 - Download a Complete Batch Report`

### Correction

- `COR-01 - Correct Previously Published Event Data`

### Additional reviewer/admin

- `REV-03 - Resolve an Ambiguous Reference`
- `REV-05 - Return or Reject`
- `REV-06 - Review and Onboard a Genuinely New Fixture`
- `ADM-01 - Review Submitter Access`
- `ADM-02 - Trace Submitted Data`

### Dataset releases

- `DATA-01 - Find and Understand a Versioned Dataset Release`
- `DATA-02 - Judge Whether a Release Is Reproducible`

### Advanced API

- `API-03 - Follow a Deprecation Path`
- `API-04 - Find a Consumer's API Usage`

Do **not** make one participant complete all of these.

Focused sessions are preferred because findings can then be attributed to individual workflows/tasks.

---

# Stage 2 - Run REAL Sessions and Integrate Evidence

The actual sessions must be carried out with real participants.

**Codex must not fabricate:**

- participants;
- participant quotes;
- session dates/times;
- behaviours;
- task completion outcomes;
- screenshots;
- observations;
- severity ratings;
- feedback;
- issue links;
- retest results.

If real Sprint 4 evidence is not present in the repository, Codex should complete **Stage 1 only**, prepare the required session templates/structure, and clearly report which human testing still needs to be performed.

Do not mark #803 complete based only on generated documentation.

---

# Required Session Record

For every completed session, record at minimum:

| Field | Required |
| --- | --- |
| Session date | Yes |
| Participant identifier | Yes - anonymised where appropriate |
| Participant/user type | Yes |
| Task IDs attempted | Yes |
| Task outcome | Yes |
| Observed difficulties | Yes |
| Participant feedback | Yes |
| Severity/importance | Yes |
| Assistance given by facilitator | Where applicable |
| Proposed action | Yes |
| Resulting Gitea issue | Where actionable |
| Resulting PR/fix | Where implemented |
| Decision if not implemented | Required |
| Reason for non-implementation | Required |
| Retest result | Required for important fixes where practical |

Task outcomes should follow the repository's existing formal testing convention.

If facilitator assistance becomes necessary, record exactly what assistance was provided and classify the task as Partial/Failure where required by the existing protocol.

---

# Facilitator Rules

Continue to follow the existing Task Bank rules.

The facilitator may:

- repeat the task;
- explain unfamiliar cricket/domain terminology contained in the task;
- resolve an environmental problem unrelated to the product.

The facilitator must **not**:

- point to the correct control;
- tell the participant where to navigate;
- explain the intended workflow while the task is active;
- turn a failed task into a successful task through coaching.

If assistance is required, record it as part of the evidence.

---

# Finding Evaluation

Do not simply produce a list of comments.

Every meaningful finding must end in one of the following states:

### Implemented

A change was made.

Record:

- finding;
- severity;
- linked issue;
- linked PR/fix;
- retest result where practical.

### Issue Created

The finding is actionable but cannot be completed directly as part of #803.

Create/link the relevant issue.

### Accepted / No Change Required

Record why the observed behaviour is acceptable.

### Deferred

Record the reason, for example:

- insufficient time before final submission;
- disproportionate implementation risk;
- dependency on another unresolved issue;
- outside agreed Sprint 4 scope.

### Rejected

Record why the feedback should not be implemented, for example:

- conflicts with project requirements;
- creates an accessibility regression;
- creates a security problem;
- misunderstands the intended product behaviour;
- would weaken data correctness;
- conflicts with API/product architecture.

Do not ignore feedback without recording a decision.

---

# Recurring Findings

After all sessions are completed, compare findings across participants.

The final Sprint 4 summary must explicitly identify:

- findings occurring in more than one session;
- recurring navigation/usability problems;
- recurring terminology confusion;
- repeated validation/error-message problems;
- repeated trust/comprehension issues around statistics;
- repeated authentication/role confusion;
- repeated API/documentation problems;
- resulting changes made because of recurring feedback.

Avoid opening duplicate issues for the same underlying finding.

---

# Evidence Structure

Reuse the repository's existing user-testing evidence convention.

Do **not** create a new top-level evidence methodology unless the repository genuinely has no suitable location.

Sprint 4 evidence must nevertheless be clearly distinguishable from Sprint 2 and Sprint 3.

Use the existing equivalent of:

`Sprint 4 -> Final User Testing -> Session <n>`

Keep:

- raw evidence;
- completed session record;
- findings/evaluation;
- retest evidence;

clearly distinguishable.

Do not overwrite earlier Sprint 2/Sprint 3 evidence.

---

# Required Final Documentation

Once at least three genuine sessions are complete, update the existing `/testing/` documentation.

Add a **Sprint 4 / Final User Testing** section containing:

1. Objective and scope.
2. Reference to the existing User Testing Protocol.
3. Exact Task Bank IDs selected.
4. Participants/user types represented.
5. Sessions performed.
6. Tasks attempted and outcomes.
7. Evidence links.
8. Findings and severity.
9. Issues/fixes created from findings.
10. Feedback deliberately not implemented.
11. Reasons for non-implementation.
12. Retest results.
13. Recurring/cross-session findings.
14. Resulting product changes.
15. Final conclusion.

The existing testing documentation should remain the primary entry point.

Do not create an isolated parallel testing site/process.

---

# Codex Execution Rules

Start by inspecting the repository and existing testing documentation.

Before changing files, identify:

- existing testing documentation paths;
- task bank source file;
- facilitator setup files;
- Sprint 2 evidence layout;
- Sprint 3 evidence layout;
- existing session templates;
- AI attribution format.

Then:

1. prepare Sprint 4 session structure/templates;
2. reference the exact Task IDs listed above;
3. reuse existing evidence conventions;
4. update navigation/links as needed;
5. run docs lint/build checks;
6. stop if genuine human session evidence does not yet exist.

**Do not generate fake session evidence to satisfy the acceptance criteria.**

Once real session evidence is later added, integrate it into the summary and evaluate each finding.

---

# Definition of Done

- [ ] Existing user-testing methodology reused.
- [ ] Existing Task Bank reused.
- [ ] Sprint 4 testing clearly distinguished from Sprint 2/Sprint 3.
- [ ] Sprint 4 session templates/evidence locations prepared.
- [ ] Public/Analyst task set uses `PUB-01`, `PUB-02`, `PUB-03`, `PUB-06`.
- [ ] Submitter task set uses `AUTH-01`, `AUTH-02`, `SUB-01`, `SUB-02`, `SUB-03`, `SUB-04`.
- [ ] Reviewer task set uses `AUTH-01`, `REV-01`, `REV-02`, `REV-04`.
- [ ] API session using `PUB-05`, `API-01`, `API-02` completed where practical.
- [ ] At least 3 **real** completed final-stage sessions recorded.
- [ ] More than one user/workflow type represented.
- [ ] Raw/session evidence retained.
- [ ] Exact Task IDs attempted recorded per session.
- [ ] Facilitator assistance recorded where applicable.
- [ ] Every meaningful finding evaluated.
- [ ] Actionable findings linked to Gitea issues/fixes.
- [ ] Important fixes retested where practical.
- [ ] Feedback deliberately not implemented includes a reason.
- [ ] Recurring findings identified across sessions.
- [ ] Final summary records resulting product changes.
- [ ] `/testing/` documentation links to final Sprint 4 evidence.
- [ ] Previous Sprint 2/Sprint 3 evidence remains intact.
- [ ] Required AI attribution retained.
- [ ] Documentation lint/build succeeds.

## Important Completion Constraint

#803 is **not complete** merely because the Sprint 4 documentation/templates have been created.

Completion requires the real user-testing evidence required by the acceptance criteria.

If the three completed sessions are not yet present, Codex should complete the preparation work, report the remaining manual testing requirements, and leave the issue open.
```

This direction is consistent with the existing Task Bank: it explicitly says tasks should be selected for the workflow under evaluation and that focused sessions are preferable to forcing every participant through the entire bank. `Pasted text.txt` `Pasted text.txt` The exact public, submitter, reviewer, and API tasks above are all existing bank tasks rather than newly invented scenarios. `Pasted text.txt` `Pasted text.txt` `Pasted text.txt` `Pasted text.txt`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
10/4/2026, 9:35:39 PM

ai assitance thing to add to the end

## Response:
10/4/2026, 9:35:44 PM · gpt-5-6-thinking

```md
### AI Declaration

The preceding issue comment was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)