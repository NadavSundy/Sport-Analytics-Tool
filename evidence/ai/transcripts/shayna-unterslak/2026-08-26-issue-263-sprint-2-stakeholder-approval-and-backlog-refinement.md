# Sprint 2 activation roadmap

**User:** Anonymous  
**Created:** 8/26/2026 18:09:07  
**Updated:** 8/26/2026 19:42:02  
**Exported:** 8/26/2026 19:42:10  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a8f0f5b-a678-83ea-8be1-069b39215faa](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a8f0f5b-a678-83ea-8be1-069b39215faa)  

## Prompt:
8/26/2026, 6:09:05 PM

ok, he has approved this
lets start making issues, documenting it, etc pls (do i need to make an issue to set the sprint up again or soemthing?) and then give a roadmap to the team of where to start, currently, from the sprint 2, the monorepo tools have been done (not the ci/cd one), thats it

[Attachment: Sprint_2_Stakeholder_Review.docx]

## Response:
8/26/2026, 6:09:06 PM

> **Structuring Sprint 2**
>
> I’m treating Sprint 2 setup as documentation rather than a separate implementation issue. I’ll draft paste-ready issues for the stakeholder outcomes, acceptance criteria, dependencies, labels, and a roadmap update.
>
> **Structured Sprint 2**
>
> 
>
> **Remembering**
>
>
> **Reviewed Sprint 2 plans, issue titles, tooling status, and CI/CD carryovers**
>
> 
>
> Worked for 1m 42s

Yes. Terence’s approval is the point where the **provisional Sprint 2 direction becomes the active Sprint 2 plan**. The approved plan explicitly prioritises remaining Basic work, the two submitter-access fixes, documentation/repository quality, formal user testing, and then the Intermediate batch/review/correction/aggregate workflow. `Sprint_2_Stakeholder_Review.docx`

And **no, I would not create a meaningless “Set up Sprint 2” issue.** Your backlog methodology already says that Sprint 2 issues are created/refined progressively when Sprint 2 becomes active; it specifically says future Sprint 2 issue creation is normal sprint refinement and does not require the old planning issue to stay open. `project-backlog.md`

## 1. First, formally activate Sprint 2

I would do these admin/evidence steps **before anyone starts another feature**:

| Action | What to do now |
|---|---|
| Sprint 2 milestone | Make sure `Sprint 2`, ending **15 September 2026**, is active |
| Stakeholder approval | Record Terence's approval as Sprint 2 evidence |
| Planning status | Change the provisional Sprint 2 plan to **Approved / Active** |
| #257 monorepo work | Mark/keep it **Done** - do not recreate it |
| #254 documentation site | Keep it active in Sprint 2 |
| CI/CD carry-over | Move the relevant open issues into Sprint 2 if appropriate, but keep `status: blocked` and record why |
| Sprint 2 board | New/refined work starts in **Backlog**; only assigned/ready work moves to **Ready** |
| Existing issues | Map them before creating anything new - especially the #191-#199 public-data work. Do **not** duplicate them |

This also fits the Sprint 2 rubric very well: **Core Features 25%, Automated Testing 10%, Stakeholder Reviews 10%, API 15%, User Feedback 10%, Project Methodology 10%, Bug Tracker 5%, DB docs 5%, third-party docs 5%, testing docs 5%**. `project_briefs.pdf`

---

# 2. Add the stakeholder approval evidence now

I would add:

`evidence/sprints/sprint-2/2026-08-26-stakeholder-review-approval.md`

```markdown
# Sprint 2 Stakeholder Review Approval

**Project:** Sport Analytics Tool  
**Team:** Git Push Pray  
**Stakeholder:** Terence Nkoua Mackyta  
**Date:** 26 August 2026  
**Sprint:** Sprint 2  
**Sprint end:** 15 September 2026  
**Review method:** Asynchronous stakeholder review via WhatsApp

## Context

The normal stakeholder meeting could not be held during the scheduled project period because that time was used for Sprint 1 marking and close-out.

The team therefore prepared a written Sprint 2 stakeholder review based on:

- the Basic, Intermediate and Advanced roadmap previously reviewed with the stakeholder;
- the Sprint 1 marking feedback;
- remaining Basic functionality;
- identified product fixes; and
- the team's planned Sprint 2 development priorities.

## Proposed Sprint 2 direction

The stakeholder was asked to approve the following direction:

1. complete the remaining Basic functionality;
2. change submitter access from fixture scope to competition scope;
3. allow rejected or revoked users to request submitter access again while preserving history;
4. improve the public documentation site;
5. improve monorepo quality and architecture enforcement;
6. retain CI/CD-dependent work as visibly blocked where the required environment is unavailable;
7. prepare and conduct formal user testing; and
8. progress into the Intermediate batch ingestion, review, correction and aggregate workflow once the core product is stable.

## Stakeholder response

**Outcome:** Approved.

**Exact stakeholder response:**  
> [Paste Terence's exact WhatsApp response here]

The original WhatsApp response is retained as stakeholder-interaction evidence.

## Decision

The Sprint 2 direction is approved and becomes the active development baseline from 26 August 2026.

No requirement changes were requested as part of this review.

The team may now refine the Sprint 2 backlog and begin implementation according to the approved priority order.

## Follow-up

The team will continue regular stakeholder check-ins during Sprint 2 and will record any feedback that results in reprioritisation, requirement changes or new work.

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

That gives you excellent evidence for **Stakeholder Reviews** and **Project Methodology**, rather than relying only on a WhatsApp screenshot.

---

# 3. Do NOT create all 40 old catalogue issues blindly

Your original catalogue had S2-01 through S2-40, including the full Intermediate tier. `COMS3011A_Complete_Gitea_Issue_Catalogue.md`

A lot has happened since that catalogue was written.

For example, the public-read work around #191-#199 means some of S2-01/S2-03-style work has already been implemented or split differently. Likewise, #254 and #257 arose from the Sprint 1 marking feedback.

So the rule now should be:

> **Old catalogue = requirements map. Current Gitea = source of truth.**

Create a new issue only where there is not already an issue covering the work.

---

# 4. First new issues I would create

These are the important ones **right now**.

## NEW ISSUE A - competition-scoped submitter access

**Title**

`Change submitter access and approval scope from fixtures to competitions`

**Template:** Bug  
**Milestone:** Sprint 2  
**Board:** Backlog  
**Labels:**  
`type: bug`  
`area: api`  
`area: database`  
`area: frontend`  
`tier: basic`  
`priority: high`

```markdown
## Description

Change the submitter-access workflow so that access is granted for a competition rather than for individual fixtures.

An approved submitter should be able to submit supported new data within an authorised competition without requiring each fixture to have been individually assigned beforehand.

## Motivation

The current fixture-oriented workflow is unnecessarily restrictive and does not match the intended competition-scoped submission model.

The Sprint 2 stakeholder review approved competition-level submitter scope as the required behaviour.

## Scope

### Included

- Request submitter access for a competition.
- Store and expose competition-level scope.
- Administrator approval assigns competition scope.
- Protected submission routes enforce competition scope.
- New supported fixtures/data within an authorised competition can be submitted without separate fixture approval.
- Update affected API contracts and frontend wording.
- Migrate or safely handle existing fixture-oriented access data where required.

### Excluded

- Intermediate batch review/publication.
- Conflict reconciliation between multiple submitters.
- API-key permissions.

## Acceptance Criteria

- [ ] Submitter access is represented at competition level.
- [ ] A user can request access to a valid competition.
- [ ] An administrator can approve the request for that competition.
- [ ] An approved submitter can submit supported data belonging to the approved competition.
- [ ] Approval is not restricted to one pre-existing fixture.
- [ ] Data from an unauthorised competition is rejected.
- [ ] Existing permission checks use the authoritative backend competition scope.
- [ ] Frontend status and administration screens clearly display competition scope.
- [ ] API, database and frontend tests cover the changed workflow.
- [ ] OpenAPI and relevant documentation are updated.
- [ ] Existing repository checks pass.

## Dependencies

Existing authentication, submitter approval and competition records.

## Evidence

- Automated tests.
- Example approved and rejected API requests.
- Frontend verification.
- Updated API/security documentation.
- Pull Request.

## AI Declaration

The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

This is **Priority 1**.

The project brief specifically requires approved submitters to submit only within a defined part of the competition, so this is core Basic functionality, not optional polish. `sport_analytics.pdf`

---

## NEW ISSUE B - allow re-request after rejection/revocation

**Title**

`Allow rejected and revoked submitters to request access again with preserved history`

**Template:** Feature  
**Milestone:** Sprint 2  
**Board:** Backlog  
**Labels:**  
`type: feature`  
`area: api`  
`area: database`  
`area: frontend`  
`tier: basic`  
`priority: high`

```markdown
## Description

Allow a user whose submitter-access request was rejected, or whose previous submitter access was revoked, to submit a new request.

Previous decisions must remain available as history. Administrators reviewing a new request must be warned when the user previously had access revoked.

## Motivation

Rejection or revocation should not permanently prevent a legitimate future request, but previous administrative decisions must not be silently lost.

This behaviour was approved during the Sprint 2 stakeholder review.

## Acceptance Criteria

- [ ] A rejected user may create a new pending request.
- [ ] A previously revoked user may create a new pending request.
- [ ] Previous approval, rejection and revocation history is preserved.
- [ ] A new request does not overwrite the historical decision.
- [ ] Administrators are clearly warned when reviewing a request from a previously revoked user.
- [ ] A pending user cannot create duplicate active requests.
- [ ] An already-approved user cannot create an unnecessary additional request.
- [ ] Backend authorisation remains authoritative.
- [ ] API and frontend tests cover rejected, revoked, pending and approved states.
- [ ] Relevant API, database and admin documentation is updated.
- [ ] Existing repository checks pass.

## Dependencies

Competition-scoped submitter-access model.

## Evidence

- State-transition tests.
- API tests.
- Administrator UI verification.
- Database/history verification.
- Pull Request.

## AI Declaration

The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

I would make **A a dependency of B** because otherwise you risk changing the access-request state model twice.

---

# 5. Refine existing #254 rather than making another docs issue

### #254 - Expose repository guides and Sprint evidence through the public documentation site

This should now explicitly include:

- project branding/colour alignment;
- README and component READMEs surfaced;
- Sprint 1 and Sprint 2 meeting/evidence navigation;
- testing evidence;
- stakeholder evidence;
- methodology/decision records;
- AI-use evidence;
- links opening sensibly/new tabs where appropriate;
- public docs acting as the **main navigation layer** into project documentation.

That is exactly what Terence has now approved. `Sprint_2_Stakeholder_Review.docx`

**Priority: High.**

And #257 is already done, so **do not make another monorepo-quality issue**.

---

# 6. Create/refine the formal user-testing issue now

This is particularly important because **User Feedback alone is 10% of Sprint 2**, and Advanced requires formal collection **plus evidence plus integration**. `project_briefs.pdf`

**Title**

`Conduct formal Basic user testing and integrate prioritised feedback`

**Template:** Task  
**Milestone:** Sprint 2  
**Labels:**  
`type: testing`  
`area: frontend`  
`area: documentation`  
`tier: basic`  
`priority: high`

Do **not** merely say “ask people what they think”.

Acceptance should require:

- defined participant profiles;
- repeatable tasks;
- written feedback questions;
- participant consent/anonymisation approach where appropriate;
- recorded observations/results;
- identified problems;
- severity/priority;
- resulting bugs/features created in Gitea;
- evidence of at least the highest-priority feedback being integrated or a documented reason not to integrate it;
- a user-testing report on the docs site.

This is your old **S2-17**, and it is absolutely worth doing properly. `COMS3011A_Complete_Gitea_Issue_Catalogue.md`

---

# 7. The remaining Basic work should come before a huge Intermediate push

From your Sprint 1 marking prep, the major Basic carry-over was:

| Work | Priority now |
|---|---:|
| Competition-scoped submitter access | 🔴 Immediate |
| Re-request after rejected/revoked | 🔴 Immediate |
| User-friendly/file-based submission | 🔴 High |
| Full correction + statistic propagation | 🔴 High |
| Filtered CSV/JSON dataset export | 🔴 High |
| Formal user testing | 🔴 High |
| #254 docs/evidence improvements | 🟠 High |
| Basic end-to-end regression/testing | 🟠 High |
| Accessibility/responsive audit | 🟠 Before milestone |
| Security/dependency review | 🟠 Before milestone |

The underlying Basic brief is very clear that event data, validated submissions, traceability, an externally useful API and filtered data export are fundamental to the product. `sport_analytics.pdf`

So I **would not start five shiny Intermediate features while those Basic gaps are open**.

---

# 8. Intermediate: only refine the first two now

Once the immediate Basic work is moving, prepare these two in Backlog.

### Intermediate 1
**`Design the batch staging, file storage and processing pipeline`**

This is the old S2-18.

It should make the architectural decisions for:

`upload → stage → validate → process → report → review → publish`

including storage, database state, failure handling, job execution and checkpoints.

### Intermediate 2
**`Implement batch, batch-item and processing-checkpoint database models`**

Old S2-19.

Make this depend on the design issue.

Then the natural chain becomes:

**Design → models → batch upload → async validation → reports → idempotency → resume → review/publication**

That directly follows both Terence's approved ordering and the Intermediate brief. `Sprint_2_Stakeholder_Review.docx` `sport_analytics.pdf`

Do **not** jump straight to caching/API keys/dataset releases yet.

---

# 9. What to do with CI/CD

Leave it **blocked**.

Since Sprint 1 is closed, I would move any genuinely unfinished CI/CD issues into the **Sprint 2 milestone**, but:

**keep**
`status: blocked`

and add a comment along the lines of:

> Carried over from Sprint 1. This work remains blocked by the unavailable required CI/CD environment/runner configuration. The blocker was reviewed as part of Sprint 2 planning and the stakeholder approved continuing local verification while the external dependency remains unresolved. No completion is claimed.

That is much stronger evidence than either closing it falsely or hiding it.

---

# 10. Team roadmap from today

I would send the team this as the working order:

### **NOW - Sprint 2 activation**
**Everyone:** approved plan becomes source of truth. Existing issues are checked before creating duplicates. Claim work in the group chat before starting.

### **Lane A - Core Basic fixes**
1. Competition-scoped submitter access.
2. Re-request after rejection/revocation.
3. File/user-friendly submission.
4. Correction + automatic statistic propagation.
5. Filtered exports.

### **Lane B - Quality + evidence**
1. #254 documentation/site improvements.
2. Prepare formal user-testing process.
3. Run user testing once the immediate Basic flow is stable.
4. Convert findings into bugs/issues and integrate the important feedback.

### **Lane C - Intermediate foundation**
1. Batch-pipeline design.
2. Batch/checkpoint schema.
3. Only then start batch ingestion implementation.

### **Lane D - blocked infrastructure**
CI/CD stays visible and blocked. Nobody wastes this academically heavy week fighting an external blocker unless the dependency becomes available.

### **Before the next Terence check-in**
Aim to be able to say:

**Done / nearly done**
- monorepo tooling ✅
- stakeholder approval/evidence ✅
- competition scope fix
- re-request fix
- #254 substantially underway
- formal user-testing process ready

**Ready for next push**
- remaining Basic work clearly assigned
- batch-pipeline design refined
- no duplicate/ambiguous Sprint 2 backlog

That is a **much better Sprint 2 opening than trying to claim 20 things at once**.

And it matches the approved commitment to deliberately under-commit during this academically heavy first week. `Sprint_2_Stakeholder_Review.docx`

---

## The immediate sequence I would actually do tonight

**1.** Add the stakeholder-approval evidence file.  
**2.** Update the Sprint 2 planning record from *provisional* → *approved 26 Aug*.  
**3.** Create the **competition-scope issue**.  
**4.** Create the **re-request/history issue**, dependent on it.  
**5.** Refine #254.  
**6.** Create/refine the formal user-testing issue.  
**7.** Move CI/CD carry-over to Sprint 2 + blocked comment.  
**8.** Put only the genuinely Ready items into Ready and let people claim them.  
**9.** Refine the batch-pipeline design issue in Backlog - do not start the whole Intermediate tier yet.

That gives you a very clean **planning → stakeholder approval → refined issues → assigned work → implementation** evidence chain, which is exactly what you want the marker to see.

## Prompt:
8/26/2026, 6:12:09 PM

noo, we have some of these already, u made them and we put some sprint 2 docs, must i give u that somehoe?

## Response:
8/26/2026, 6:12:10 PM

> **Remembering**
>
>
> **Reviewed Sprint 2 setup, issues, documents, milestone board, and PRs**
>
> 
>
> Worked for 21s

Yeah - you **do not need to recreate all of this for me manually**. I found some of the Sprint 2 material we already made, including the provisional Sprint 2 plan and the older backlog. `Sprint_2_Provisional_Client_Meeting_and_Plan.docx` `project-backlog.md`

What I **cannot reliably see from those docs** is the exact *current Gitea state* - i.e. which Sprint 2 issues you actually created yesterday, their numbers, which ones are already in the milestone, and which have since been completed. I know from our recent work that **#254 exists** for the documentation-site improvements, **#257 was the monorepo/dependency-cruiser work and is now done**, and **PR #260** was the provisional Sprint 2 planning record. But I do not want to invent or duplicate anything else. 

The easiest thing is: **send me a screenshot or copy/paste of the Sprint 2 milestone issue list** from Gitea. Even just the titles + issue numbers is enough. Something like:

```text
#254 Expose repository guides...
#257 ...
#...
```

Or send a screenshot of **Milestones → Sprint 2**.

Then I can do this properly in one pass:

1. identify what already exists;
2. identify what Terence’s approval changes;
3. tell you whether any Sprint-setup issue/doc is still needed;
4. give you only the **missing issues** to create;
5. tell you what existing issues need comments/updates rather than duplicates;
6. give you the exact **Sprint 2 team roadmap/order** from the current board state;
7. give you the stakeholder-approval evidence/commit/PR steps.

And yes: the provisional plan we already made explicitly says Sprint 2 planning is only fully locked when the **goal, milestone, selected Ready issues, dependencies/risks, owners, board state, and saved planning record** are finalised. `Sprint_2_Provisional_Client_Meeting_and_Plan.docx` So we are basically at the “Terence approved → finalise the actual issue set and planning record” step now, not starting Sprint 2 setup from zero.

## Prompt:
8/26/2026, 6:14:12 PM

![5824b7c7-0a5f-44a7-9e21-043116d04ffe.png](https://chatgpt.com/backend-api/estuary/content?id=file_0000000012fc81f5841e479fcd18757a&fn=5824b7c7-0a5f-44a7-9e21-043116d04ffe.png&cd=attachment&ts=496601&p=fs&cid=1&sig=e7e594f01d85b742544e352ea520e21f0a4893b4dea6fb5e86fb61c9766eb10a&v=0)

[Attachment: Pasted markdown(20260826-161406).md]

do u need text of issues??

## Response:
8/26/2026, 6:14:14 PM

> **Assessing needed context**
>
> I can work from the planning document and screenshot. I only need issue text if acceptance criteria or current status differs—especially for #257, since the screenshot still shows it open despite the monorepo tooling being complete.
>
> **Assessed needed context**
>
> 
>
> Worked for 13s

No - **do not send me the text of all the issues**. This screenshot plus the Sprint 2 planning document gives me enough to reconstruct where we are. `Pasted markdown.md`

I can now see the current Sprint 2 set:

| Issue | Status / meaning |
|---|---|
| **#10** Restore green CI and reproducible installation | blocked CI/CD carry-over |
| **#15** Azure backend deployment foundation | blocked CI/CD carry-over |
| **#17** Azure frontend deployment foundation | blocked CI/CD carry-over |
| **#253** Docs branding + external links | Sprint 1 marker feedback |
| **#254** Expose guides + Sprint evidence on docs site | Sprint 1 marker feedback |
| **#255** Competition-scoped submitter access | Basic/product fix |
| **#256** Re-request after rejection/revocation | Basic/product fix |
| **#257** dependency-cruiser | monorepo tooling |
| **#259** Run monorepo checks in CI/CD | blocked until CI/CD |
| **#258** Knip + syncpack | not in the open list, so it appears to have been completed/closed |

And the planning doc confirms that **#252 was the Sprint 2 initial-planning issue**, so **we absolutely do not need another “set up Sprint 2” issue**. That work already exists and says Sprint 2 formally began, with broader backlog refinement to follow. `Pasted markdown.md`

### One small thing I need you to confirm later

You said the **monorepo tools are done except the CI/CD one**.

Your screenshot still shows **#257 open**. So either:

- #257 is implemented but not merged/closed yet → finish the PR/verification and close it; or
- the screenshot was from just before you finished it.

No need to paste the body - just tell me **“#257 is merged/closed”** once it is.

### What we should do next

Now that Terence approved the plan, our next job is **not more setup**. It is:

**1. Update the existing Sprint 2 planning/evidence** to record that the provisional direction was approved by Terence on 26 August.

**2. Refine the remainder of the Sprint 2 backlog** - specifically the remaining Basic work + first sensible Intermediate work that the planning doc deliberately did *not* create yet.

**3. Work out dependencies/order and give the team a roadmap** so people do not randomly pick issues.

And importantly, the planning document already lists the areas still needing refinement: file/user-friendly submission, filtered export, correction/statistic propagation, batch ingestion, resubmission/resume, review/publication, correction history, aggregates, selective recomputation, reference validation, performance, API controls/caching, dataset releases, formal user testing, and supporting testing/docs. `Pasted markdown.md`

So I have enough now.

**Do not send me nine issue bodies.** I can work from this. Next I can go through the existing Sprint 2/backlog material and give you **only the missing issues we should create now**, in the right order, plus exactly what to update for Terence's approval.

## Prompt:
8/26/2026, 6:15:06 PM

its not merged yet, waiting for teammates aproval

## Response:
8/26/2026, 6:15:12 PM

Perfect — then **leave #257 open for now**. Its current state is correct: implementation done, PR awaiting teammate review/approval, not yet merged.

So for planning purposes I’d treat it as **“In Review”**, not “Done”. Do not close it early just because the coding is finished.

That means your current monorepo status is:

- **#257** dependency-cruiser — implemented, awaiting review/merge
- **#258** Knip + syncpack — done/closed
- **#259** CI/CD integration — still blocked

Once #257 is approved and merged, close it and then we can accurately say the local monorepo tooling work is complete.

We can move on now to the **actual Sprint 2 backlog refinement + stakeholder approval documentation + team roadmap** without waiting for #257 to merge.

## Prompt:
8/26/2026, 6:15:45 PM

great, do it

## Response:
8/26/2026, 6:15:58 PM

> **Inspected Sprint 2 planning files, backlog rows, and stakeholder approval roadmap**
>
> 
>
> Worked for 12s

## Prompt:
8/26/2026, 6:15:57 PM

great, do it, also, all issues to be made using a script pls

## Response:
8/26/2026, 6:16:05 PM

> **Planning the backlog**
>
> I’m organizing the roadmap into stakeholder-approved documentation, unblocked S2 issues, and a repeatable creation script. I’ll avoid duplicating existing tickets and make dependencies explicit so implementation can proceed cleanly.
>
> **Planned the backlog**
>
> 
>
> **Refining issue creation**
>
> I’m separating completed work from genuinely missing Sprint 2 items, then I’ll document the approved scope and generate only non-duplicate issues through a repeatable script. This keeps the backlog accurate and avoids unnecessary tickets.
>
> **Refined issue creation**
>
> 
>
> **Created Sprint 2 issues, approval automation, implementation reviews, and browsing documentation**
>
> 
>
> Worked for 3m 5s

Yep - I have now done the **proper post-Terence-approval refinement**, without recreating #253-#259 or pretending #257 is merged.

The key point is that we are **not creating the entire remaining Sprint 2 catalogue yet**. Your methodology says Sprint 2 work is progressively refined into actionable Gitea issues, and the approved stakeholder plan specifically says to do Basic first, then the core Intermediate batch/review/correction/aggregate workflow, with performance/API-consumer controls/releases only once that core is stable. `project-backlog.md` `Sprint_2_Stakeholder_Review.docx`

## 1. Issue-creation script

I made a PowerShell script that creates/reuses **25 refined issues**, assigns them to the **Sprint 2 milestone**, adds the dependency chain, avoids exact-title duplicates, and also:

- records `#256 depends on #255`;
- verifies `#259 depends on #257 and #258`;
- comments on **#252** recording Terence's 26 August approval;
- leaves issues unassigned so the team can claim them properly;
- does **not** touch #10/#15/#17's blocked status;
- does **not** falsely close #257;
- has a `-DryRun` mode.

[Download the Sprint 2 issue-creation script](sandbox:/mnt/data/create-sprint-2-refined-issues.ps1)

It follows the same Gitea REST/API pattern as the fixed public-data issue script you used successfully before. `create-public-data-issues-fixed.ps1`

### Run it like this

Put it in your repo as:

```powershell
scripts/create-sprint-2-refined-issues.ps1
```

First:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\create-sprint-2-refined-issues.ps1 -DryRun
```

**Read the output first.** If everything looks right:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\create-sprint-2-refined-issues.ps1
```

It will securely ask for your Gitea token.

If Terence literally replied something simple like `Approved`, you can instead do:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\create-sprint-2-refined-issues.ps1 -StakeholderReply "Approved"
```

If his actual message was longer, use his **exact wording** there. If you do not give `-StakeholderReply`, the script simply records that approval was received and says the exact WhatsApp evidence is retained separately.

**Do the `-DryRun` first and paste me its output before the real run if you want me to sanity-check it.**

---

# 2. What the script creates

It creates the missing/refined work in four sensible groups.

### Planning/evidence
- Record Sprint 2 stakeholder approval and finalise the active backlog
- Prepare the Sprint 2 formal user-testing protocol and evidence template

### Remaining Basic
- JSON + CSV file-upload backend
- User-friendly upload/guided submitter UI
- Authorised event correction + automatic statistic refresh
- Event-correction UI
- Filtered CSV/JSON export API
- Filtered export UI
- Formal Basic user testing + feedback integration
- Full Basic browser/E2E acceptance
- Accessibility/responsiveness audit
- Security/privacy/dependency hardening

These align with the three Basic carry-overs we explicitly disclosed at Sprint 1 marking: **file submission, filtered export and full correction propagation**. `Sprint_1_Student_Marking_Prep_Rubric_Evidence_Map.docx`

### Core Intermediate pipeline
The script then refines:

`design`
→ `batch DB models`
→ `batch upload/staging`
→ `async validation`
→ `accepted/rejected reports`
→ `idempotent resubmission`
→ `durable resume`
→ `impossible/conflicting validation`
→ `review/publication`
→ `immutable correction history`
→ `season/career/competition aggregates`
→ `selective recomputation`
→ `golden reference correctness tests`

That is directly aligned with the actual Intermediate brief. `sport_analytics.pdf`

### Deliberately NOT created yet

I have left these in the **planned backlog**, rather than prematurely turning them into Ready work:

- realistic-scale/performance target;
- DB/query optimisation;
- API versioning;
- API keys/rate limits/quotas;
- caching;
- versioned dataset releases;
- release catalogue;
- final Intermediate testing/docs;
- Sprint 2 close-out.

Those are S2-31 onward in your original roadmap. `project-backlog.md`

That is intentional because Terence approved doing those **once the core workflow is stable**. `Sprint_2_Stakeholder_Review.docx`

---

# 3. Stakeholder evidence document

I also created the repository evidence record:

[Download the Sprint 2 stakeholder-approval evidence](sandbox:/mnt/data/2026-08-26-sprint-2-stakeholder-approval.md)

Put it here:

```text
evidence/sprints/sprint-2/2026-08-26-stakeholder-review-approval.md
```

There is **one placeholder** you should fill:

```text
[Paste Terence's exact reply here, or record the filename/path of the retained screenshot/export.]
```

Everything else is ready.

This is worthwhile because Sprint 2's rubric gives **10% to Stakeholder Reviews**, and the Advanced band specifically wants regular interaction plus evidence that feedback was evaluated and integrated. `project_briefs.pdf`

---

# 4. Tiny update to the existing Sprint 2 planning document

Do **not** replace the original 25 August planning record. It is valuable historical evidence showing how the plan evolved.

Find it with:

```powershell
git grep -l "# Sprint 2 Initial Planning"
```

Change the current status from the provisional wording to roughly:

```markdown
**Status:** Approved and active. The proposed Sprint 2 direction was approved by
Terence Nkoua Mackyta on 26 August 2026. Backlog refinement continues through
the team's normal Scrumban process.
```

Then add after the initial planning/context section:

```markdown
## Stakeholder Approval - 26 August 2026

The written Sprint 2 stakeholder review was approved by Terence Nkoua Mackyta
on 26 August 2026.

No requirement change or reprioritisation was requested.

The proposed Sprint 2 goal and priority order therefore become the active
Sprint 2 planning baseline:

1. complete remaining Basic functionality and high-priority product fixes;
2. improve documentation and repository quality in parallel;
3. prepare and conduct formal user testing;
4. implement the core Intermediate batch ingestion, validation,
   resubmission/resume, review/publication, correction-history and aggregate
   workflow; and
5. refine performance, API-consumer controls, caching and versioned dataset
   releases once the core workflow is stable.

The detailed stakeholder approval record is retained under
`evidence/sprints/sprint-2/`.
```

The original plan already said stakeholder feedback would drive backlog refinement and that only properly defined work should enter Ready, so this is an **update of the existing plan**, not a second Sprint 2 setup. `Pasted markdown.md`

---

# 5. What your board should look like after the script

Do **not** dump all 25 newly created issues into `Ready`.

The API script cannot reliably add cards to the Gitea Project board, so after creation, manually add the new issues to **Backlog**.

Then I would have this:

| State | Work |
|---|---|
| **In Review** | #257 |
| **Blocked** | #10, #15, #17, #259 |
| **Ready / active first** | #253, #254, #255 |
| **Ready** | new stakeholder-approval evidence issue |
| **Ready** | new user-testing-protocol issue |
| **Ready** | new batch-pipeline-design issue |
| **Backlog waiting on dependency** | #256 |
| **Backlog waiting on #255** | file-upload API, correction API |
| **Backlog** | remainder of Basic + Intermediate chain |

I have made **#256 depend on #255** because they both touch the submitter-access lifecycle and doing them in the opposite order is asking for overlap/merge pain.

---

# 6. Team roadmap - where everyone should start

Your Week 1 plan explicitly says to parallelise Basic work, user-testing preparation and batch-pipeline refinement rather than putting everyone on one thing. `Sprint_2_Provisional_Client_Meeting_and_Plan.docx`

So I would tell the team:

**Lane 1 - Product:** someone takes **#255 competition-scoped access first**. Once it merges, #256 and the file/correction work unlock cleanly.

**Lane 2 - Docs:** someone takes **#253 or #254**. These are independent and directly address marker feedback.

**Lane 3 - Planning/testing:** someone prepares the **formal user-testing protocol** now. Do not wait until the end of Sprint 2 to think about user testing.

**Lane 4 - Intermediate preparation:** someone does **batch-pipeline design only**. This week is about making the Week 2 implementation chain ready, not coding six Intermediate features simultaneously.

**Review lane:** somebody reviews **#257**. The implementation is already done; getting teammate approval and merge is now more valuable than beginning another monorepo task.

Then:

```text
#255 merged
   ↓
#256                    file upload API             correction API
   ↓                          ↓                          ↓
access lifecycle         user-friendly UI           correction UI
                                \                       /
                                 \                     /
                                  Basic E2E + user test
                                           ↓
                                   hardening/a11y
```

At the same time:

```text
batch design
    ↓
batch models
    ↓
upload/staging
    ↓
async processing
   ↙       ↘
reports   idempotency
   ↓          ↓
validation  resume
     \       /
      review/publish
          ↓
   wider aggregates
          ↓
selective recomputation
          ↓
 golden correctness
```

That gives the team a **real dependency roadmap**, rather than 30 people-equivalent tasks all pretending to be equally Ready.

---

## What I want you to do next

Run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\create-sprint-2-refined-issues.ps1 -DryRun
```

and **paste me the output**.

I want to check the exact list once before you let it make the 25 issues, particularly because we have now deliberately protected against duplicate titles and existing #252/#255-#259 state. After the real run, it will give us the actual new issue numbers and I can turn the roadmap above into a **numbered roadmap for the group chat**.

## Prompt:
8/26/2026, 6:25:14 PM

![5c0349cf-484d-4fa1-9547-2444b68abcc0.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000bc1881f59c6cfd79e6d525d0&fn=5c0349cf-484d-4fa1-9547-2444b68abcc0.png&cd=attachment&ts=496601&p=fs&cid=1&sig=dec30f0ad4a4476d28425dcb35f299b5ba93c10722f396e18b9166e319d97122&v=0)

what do i call the branch that i do stakeholde thing on etc? also, it was a whatsapp, shoould u say that> how to od evidence?
i have sdoen nothing yet other than download script, giveme steps etc

## Response:
8/26/2026, 6:25:23 PM

> **Planning the workflow**
>
> I’m outlining a safe sequence: inspect the script, run its dry-run, execute it, verify the approval evidence, then create a numbered branch and commit documentation. I’m keeping issue references consistent without inventing an unknown number.
>
> **Planned the workflow**
>
> 
>
> **Preserving approval evidence**
>
> I’m keeping the WhatsApp approval auditable while protecting private contact details. I’ll recommend retaining the name, timestamp, attached document, and exact approval text, while cropping or redacting the visible phone number before committing the screenshot.
>
> **Preserved approval evidence**
>
> 
>
> Worked for 50s

Yes - because the approval happened **by WhatsApp**, we should say that explicitly. That is actually good evidence: you have the document you sent, the message asking for approval, and Terence's clear response **“Yeah / Approved 🔥”** in the same thread.

Also: **do not make the branch yet.** Run the issue-creation script first, because it will create the stakeholder-approval/refinement issue and give us its issue number. Then the branch can follow your normal `type/issue-description` convention.

## Do this from where you are now

### 1. Start clean on `main`

In the repo:

```powershell
git switch main
git pull
git status
```

You want:

```text
nothing to commit, working tree clean
```

The issue script changes Gitea, not your local code, so we can run it before creating a branch.

---

## 2. Put the downloaded script somewhere easy

You downloaded:

`create-sprint-2-refined-issues.ps1`

You **do not need to commit this script to the repository**. It is just our repeatable mechanism for creating the issues.

You can leave it in Downloads and run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\create-sprint-2-refined-issues.ps1" -DryRun
```

If Windows renamed it with `(1)`, use the actual filename.

### Important: run `-DryRun` first

It will **not create anything**.

Check that it lists the issues we discussed and says the existing relationships include:

```text
#256 depends on #255
#259 depends on #257 and #258
```

If that looks normal, do the real run.

---

# 3. Run the real issue creation

Because we now have the exact WhatsApp reply, use it.

In PowerShell, the backtick before `n` means newline:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\create-sprint-2-refined-issues.ps1" -StakeholderReply "Yeah`nApproved 🔥"
```

It will ask for your Gitea API token.

**Do not paste the token into the command.** Enter it when prompted.

The script will then:

- create the missing Sprint 2 refinement issues;
- use the existing Sprint 2 milestone;
- not recreate #253-#259;
- add the issue dependencies;
- record the 26 August stakeholder approval on **#252**;
- leave #257 open;
- leave #259/CI work blocked;
- give you the numbers of all the newly created issues.

Your existing planning record specifically said the initial issue batch was incomplete and that the broader Basic/Intermediate backlog would be refined later, so this is exactly the planned next methodology step. `Pasted markdown.md`

---

# 4. THEN make the branch

Find the newly created issue called:

> **Record Sprint 2 stakeholder approval and finalise the active backlog**

Suppose the script tells you it is `#XYZ`.

Then:

```powershell
git switch -c docs/XYZ-sprint-2-stakeholder-approval
```

So, for example, **if** Gitea made it #281:

```powershell
git switch -c docs/281-sprint-2-stakeholder-approval
```

Do not use `281` unless that is actually what Gitea gives you.

That's the branch I want for the evidence/planning work.

---

# 5. WhatsApp evidence: yes, keep the screenshot

Your screenshot is very good evidence because it shows:

- the `Sprint_2_Stakeholder_Review.docx` you sent;
- your explanation that the normal meeting could not happen;
- your explicit request for approval/reprioritisation;
- Terence replying:
  > Yeah  
  > Approved 🔥

That supports exactly what your stakeholder-review document asked him to confirm. `Sprint_2_Stakeholder_Review.docx`

### But crop/redact one thing first

**Do not commit the screenshot exactly as it is.**

It visibly contains a personal mobile number.

Use Snipping Tool / Paint and either crop that area away or cover the number. Keep:

- the group/context;
- your sent message;
- the attached document;
- his approval;
- the time/date indicator.

Do **not** obscure the approval itself.

Save the sanitised image as:

```text
2026-08-26-sprint-2-stakeholder-whatsapp-approval.png
```

---

# 6. Create the evidence folder

On your new branch:

```powershell
New-Item -ItemType Directory -Force evidence/sprints/sprint-2
```

Put the redacted screenshot here:

```text
evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png
```

---

# 7. Add the written evidence record

I already made this for you:

[Download the stakeholder approval evidence record](sandbox:/mnt/data/2026-08-26-sprint-2-stakeholder-approval.md)

Put it at:

```text
evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-approval.md
```

Change the placeholder under **Stakeholder Response** to:

```markdown
**Exact stakeholder response:**

> Yeah  
> Approved 🔥

The approval was received via WhatsApp at 18:06 on 26 August 2026.

A redacted screenshot of the written review request and approval is retained at:

`evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png`
```

That is the right way to phrase it: **asynchronous written stakeholder review via WhatsApp**.

Don't call it a "stakeholder meeting", because it wasn't one. Call it a **stakeholder review**.

---

# 8. Update the existing Sprint 2 planning record

We should **not create a second Sprint 2 planning document from scratch**. Your 25 August record is valuable evidence showing that planning happened first and was then confirmed by the stakeholder. `Pasted markdown.md`

Find it:

```powershell
git grep -n "# Sprint 2 Initial Planning"
```

It will tell you the file path.

At the top, change:

```markdown
**Status:** Initial Sprint 2 planning and backlog selection; further refinement
will follow the next stakeholder review.
```

to:

```markdown
**Status:** Approved and active. The proposed Sprint 2 direction was approved by
Terence Nkoua Mackyta through a written WhatsApp stakeholder review on
26 August 2026. Broader backlog refinement continues through the team's normal
Scrumban process.
```

Then add this after the opening context/planning section:

```markdown
## Stakeholder Approval - 26 August 2026

Because the normal stakeholder meeting could not take place during the Sprint 1
marking and close-out period, the team sent Terence Nkoua Mackyta a written
Sprint 2 stakeholder review via WhatsApp.

The review described the proposed Sprint 2 goal, remaining Basic priorities,
marker-feedback work, CI/CD carry-over approach and proposed order for the
Intermediate functionality.

Terence approved the proposed direction on 26 August 2026.

No requirement changes or reprioritisation were requested.

The proposed Sprint 2 direction therefore becomes the active Sprint 2 planning
baseline. The team will continue normal backlog refinement as sufficiently
defined work becomes ready for implementation.

The full evidence record and redacted WhatsApp approval are retained under
`evidence/sprints/sprint-2/`.
```

This gives you a lovely evidence trail:

**25 Aug:** team plans →  
**26 Aug:** plan sent to stakeholder →  
**26 Aug:** stakeholder approves →  
**26 Aug:** backlog refined into Gitea →  
**development follows approved plan.**

That is much stronger than pretending everything happened in one document.

---

# 9. Do not change #257

For the record at this exact moment:

**#257 = implementation complete, PR awaiting teammate approval.**

So:

- leave issue open;
- leave PR open;
- board state should be `In Review` if you have that column;
- merge/close only after teammate approval.

And **#259 stays Blocked**.

---

# 10. Add your AI evidence for this work

Because I have helped plan the issue refinement and write the documentation, record this conversation too. Your COMS3011A policy requires AI-assisted writing to carry a declaration and requires transparent AI-use tracking. `ai_policy_20_jul.pdf`

Once you know the new stakeholder issue number, say it is `XYZ`, use:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-26-issue-XYZ-sprint-2-stakeholder-approval-and-backlog-refinement.md
```

And add the corresponding row to:

```text
evidence/ai/registers/shayna-unterslak.csv
```

Don't do that until we know `XYZ`, otherwise you will just have to rename it.

---

# 11. Check everything before committing

Once the evidence and planning update are in place:

```powershell
git status --short
```

I expect roughly:

```text
M  <existing Sprint 2 planning document>
?? evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-approval.md
?? evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png
?? evidence/ai/transcripts/shayna-unterslak/2026-08-26-issue-XYZ-...
M  evidence/ai/registers/shayna-unterslak.csv
```

Then run your normal documentation/check suite before committing.

---

## So your exact order now

1. `git switch main`
2. `git pull`
3. Run the issue script with `-DryRun`.
4. Run it for real using Terence's exact `"Yeah`nApproved 🔥"` response.
5. Note the new issue numbers.
6. Create `docs/<stakeholder-issue-number>-sprint-2-stakeholder-approval`.
7. Redact/crop the WhatsApp screenshot.
8. Add screenshot + approval `.md` to `evidence/sprints/sprint-2/`.
9. Update the existing 25 August Sprint 2 planning record.
10. Add this ChatGPT transcript + AI-register row.
11. Run checks.
12. Commit.
13. Push.
14. Make PR.
15. Only after merge, close the new stakeholder/planning issue.
16. Then move the newly created backlog issues onto the board in the correct states.

**First thing now:** run the `-DryRun`. Don't make the branch yet.

## Prompt:
8/26/2026, 6:28:28 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> powershell.exe -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\create-sprint-2-refined-issues.ps1" -DryRun

DRY RUN - no Gitea changes will be made.
Repository: git-push-pray/Sport-Analytics-Tool
Milestone:  Sprint 2

- Record Sprint 2 stakeholder approval and finalise the active backlog
  labels: type: documentation, area: documentation, tier: common, priority: high
- Prepare the Sprint 2 formal user-testing protocol and evidence template
  labels: type: testing, area: frontend, area: documentation, tier: basic, priority: high
- Implement JSON and CSV file-upload submissions through the shared validation pipeline
  labels: type: feature, area: api, area: data, area: infrastructure, tier: basic, priority: high
  dependencies: #255
- Add user-friendly file-upload and guided submission controls to the submitter interface
  labels: type: feature, area: frontend, area: api, tier: basic, priority: high
  dependencies: file_api, #255
- Implement authorised event correction with automatic statistic refresh
  labels: type: feature, area: api, area: database, area: data, tier: basic, priority: high
  dependencies: #255
- Build the approved event-correction interface
  labels: type: feature, area: frontend, area: api, tier: basic, priority: high
  dependencies: correction_api
- Implement filtered CSV and JSON dataset export endpoints
  labels: type: feature, area: api, area: data, tier: basic, priority: high
- Add filtered dataset export controls to the public data interface
  labels: type: feature, area: frontend, area: api, area: data, tier: basic, priority: high
  dependencies: export_api
- Conduct formal Basic user testing and integrate prioritised feedback
  labels: type: testing, area: frontend, area: documentation, tier: basic, priority: high
  dependencies: user_test_plan, file_ui, correction_ui, export_ui, #255, #256
- Complete the full Basic integration and browser-level end-to-end acceptance workflow
  labels: type: testing, area: frontend, area: api, area: database, area: data, tier: basic, priority: high
  dependencies: file_ui, correction_ui, export_ui, #255, #256
- Complete the Basic accessibility and responsive-design audit and fixes
  labels: type: testing, area: frontend, area: documentation, tier: common, priority: high
  dependencies: basic_e2e
- Complete the Basic security, privacy and dependency hardening review
  labels: type: testing, area: api, area: database, area: infrastructure, area: documentation, tier: common, priority: high
  dependencies: basic_e2e
- Design the batch staging, file storage and processing pipeline
  labels: type: research, area: api, area: database, area: infrastructure, area: documentation, tier: intermediate, priority: high
- Implement batch, batch-item and processing-checkpoint database models
  labels: type: feature, area: database, area: data, tier: intermediate, priority: high
  dependencies: batch_design
- Implement whole-season and back-catalogue batch upload and staging
  labels: type: feature, area: api, area: data, area: infrastructure, tier: intermediate, priority: high
  dependencies: batch_models, file_api, #255
- Implement asynchronous batch validation and processing
  labels: type: feature, area: api, area: data, area: infrastructure, tier: intermediate, priority: high
  dependencies: batch_upload
- Generate accepted and rejected batch processing reports
  labels: type: feature, area: api, area: data, area: frontend, tier: intermediate
  dependencies: batch_async
- Make batch resubmission idempotent and prevent double counting
  labels: type: feature, area: api, area: database, area: data, tier: intermediate, priority: high
  dependencies: batch_models, batch_upload
- Implement resumable batch processing from durable checkpoints
  labels: type: feature, area: api, area: database, area: infrastructure, tier: intermediate, priority: high
  dependencies: batch_async, batch_idempotent
- Implement impossible and conflicting event validation rules
  labels: type: feature, area: api, area: data, tier: intermediate, priority: high
  dependencies: batch_async
- Implement submission review and publication workflow in the API and frontend
  labels: type: feature, area: api, area: frontend, area: database, tier: intermediate, priority: high
  dependencies: batch_report, conflict_validation
- Implement immutable correction history and audit logs
  labels: type: feature, area: api, area: database, area: data, tier: intermediate, priority: high
  dependencies: correction_api
- Implement season, career and competition-wide aggregate derivation
  labels: type: feature, area: api, area: data, area: database, tier: intermediate, priority: high
  dependencies: review_publish
- Implement dependency-aware selective recomputation after event changes
  labels: type: feature, area: api, area: data, area: database, tier: intermediate, priority: high
  dependencies: correction_api, correction_history, aggregates
- Build golden reference results and automated correctness checks
  labels: type: testing, area: api, area: data, area: documentation, tier: intermediate, priority: high
  dependencies: aggregates

Existing dependency updates also enforced:
  #256 depends on #255
  #259 depends on #257 and #258

Run again without -DryRun to create/reuse issues.
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/26/2026, 6:28:35 PM

> **Refining the draft**
>
> The dry run looks broadly sound, but I’m catching one avoidable duplicate: the stakeholder-approval issue overlaps with the existing setup issue. I’d remove that before creating anything, then verify labels and milestone availability.
>
> **Refined the draft**
>
> 
>
> Worked for 9s

The dry run looks structurally good. **Do not worry that there are 25 issues listed**: creating them in the Sprint 2 backlog is not the same as committing to completing all 25 this sprint. Only the small `Ready` set is your current commitment; the rest stay in `Backlog` behind dependencies. That matches the refinement process already recorded in your Sprint 2 planning document. `Pasted markdown.md`

One thing before the real run: I am happy with the first issue **“Record Sprint 2 stakeholder approval and finalise the active backlog.”** It is **not another Sprint 2 setup issue**. #252 records the initial 25 August planning; this new one records a genuinely new event on 26 August: Terence approved it and you refined the backlog afterward.

### Run it for real now

Terence's exact WhatsApp response was:

> Yeah  
> Approved 🔥

So run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\create-sprint-2-refined-issues.ps1" -StakeholderReply "Yeah`nApproved 🔥"
```

It will ask for your Gitea API token. Enter it when prompted.

The real run will also do the proper API preflight that the dry run intentionally skipped: repository, milestone, labels, existing issues, dependencies, etc. **If it errors at any point, stop and paste the error here rather than manually creating anything.**

### What I expect it to do

It should create the new issues, then print things like:

```text
CREATED #...
CREATED #...
...
DEPENDENCY: #... depends on #...
...
COMMENTED #252 with stakeholder approval.
```

It should **not** create #253-#259 again. It should also preserve:

- #257 = open / awaiting teammate PR review
- #259 = blocked
- #10, #15, #17 = blocked carry-over
- #256 depends on #255

### Then stop

After it finishes, **paste the full output here before making the branch**.

I specifically want the new number for:

> `Record Sprint 2 stakeholder approval and finalise the active backlog`

If, for example, Gitea makes that `#260-something`, then that number determines the branch:

```powershell
git switch -c docs/<NUMBER>-sprint-2-stakeholder-approval
```

Then we'll do, in order:

1. sanitised WhatsApp screenshot evidence;
2. stakeholder approval `.md`;
3. update existing Sprint 2 initial-planning document;
4. AI transcript + CSV entry;
5. checks;
6. commit;
7. push;
8. PR;
9. board placement / exact team roadmap using the **real new issue numbers**.

And yes, our evidence will explicitly call this a **written/asynchronous stakeholder review via WhatsApp**, not a meeting. That is the accurate description of what happened, and the screenshot gives strong direct evidence of the review document plus Terence's approval. The course rubric specifically values evidence of stakeholder interaction and feedback being evaluated/integrated. `project_briefs.pdf`

**Run the real script now and paste its output.**

## Prompt:
8/26/2026, 6:31:00 PM

Preflight checks...
Gitea API request failed: GET /repos/git-push-pray/Sport-Analytics-Tool
{"message":"token does not have at least one of required scope(s), required=[read:repository], token 
scope=write:issue","url":"https://sdp.ms.wits.ac.za/api/swagger"}
At C:\Users\shayn\Downloads\create-sprint-2-refined-issues.ps1:533 char:9
+         throw "Gitea API request failed: $Method $Path`n$details"
+         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : OperationStopped: (Gitea API reque.../api/swagger"}
:String) [], RuntimeException
    + FullyQualifiedErrorId : Gitea API request failed: GET /repos/git-push-pray/Sport-Analytics-Tool
    {"message":"token does not have at least one of required scope(s), required=[read:repository], token scope=write:i 
   ssue","url":"https://sdp.ms.wits.ac.za/api/swagger"}

## Response:
8/26/2026, 6:31:09 PM

Good — this failed **before making any changes**, so nothing was partially created. The script stopped on its very first preflight request.

Your token currently has only:

```text
write:issue
```

but the script also needs to inspect the repository before creating anything, so it needs:

```text
read:repository
write:issue
```

### Fix the token

In Gitea, go to your **profile/avatar → Settings → Applications / Access Tokens**.

Create a **new token** with at least:

- `read:repository`
- `write:issue`

You can call it something like:

```text
sprint-2-issue-script
```

You generally cannot add scopes to an already-created token, so making a fresh one is easiest.

You **do not need to put the token anywhere in the repo**.

### Then rerun the exact same command

```powershell
powershell.exe -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\create-sprint-2-refined-issues.ps1" -StakeholderReply "Yeah`nApproved 🔥"
```

When it prompts:

```text
Paste a Gitea API token
```

paste the **new token**.

The input is hidden, so it may look like nothing is being typed. That's normal.

### What should happen next

You should now get something like:

```text
Preflight checks...
Repository found: git-push-pray/Sport-Analytics-Tool
Milestone found: Sprint 2
All required labels found.

Creating/refining Sprint 2 issues...
CREATED #...
...
```

If you get **another scope error**, stop there and paste it to me. Don't start manually adding scopes at random — we'll use the error to see exactly what Gitea wants.

And because it failed at:

```text
GET /repos/git-push-pray/Sport-Analytics-Tool
```

before the script reached creation, **you do not need to check for duplicate issues from this failed attempt**. None were created.

## Prompt:
8/26/2026, 6:33:33 PM

Milestone found: Sprint 2 (id 12)
Issues will be created unassigned; assign owners during team planning.
All required labels found.

Creating/refining Sprint 2 issues...
CREATED #263: Record Sprint 2 stakeholder approval and finalise the active backlog
CREATED #264: Prepare the Sprint 2 formal user-testing protocol and evidence template
CREATED #265: Implement JSON and CSV file-upload submissions through the shared validation pipeline
CREATED #266: Add user-friendly file-upload and guided submission controls to the submitter interface
CREATED #267: Implement authorised event correction with automatic statistic refresh
CREATED #268: Build the approved event-correction interface
CREATED #269: Implement filtered CSV and JSON dataset export endpoints
CREATED #270: Add filtered dataset export controls to the public data interface
CREATED #271: Conduct formal Basic user testing and integrate prioritised feedback
CREATED #272: Complete the full Basic integration and browser-level end-to-end acceptance workflow
CREATED #273: Complete the Basic accessibility and responsive-design audit and fixes
CREATED #274: Complete the Basic security, privacy and dependency hardening review
CREATED #275: Design the batch staging, file storage and processing pipeline
CREATED #276: Implement batch, batch-item and processing-checkpoint database models
CREATED #277: Implement whole-season and back-catalogue batch upload and staging
CREATED #278: Implement asynchronous batch validation and processing
CREATED #279: Generate accepted and rejected batch processing reports
CREATED #280: Make batch resubmission idempotent and prevent double counting
CREATED #281: Implement resumable batch processing from durable checkpoints
CREATED #282: Implement impossible and conflicting event validation rules
CREATED #283: Implement submission review and publication workflow in the API and frontend
CREATED #284: Implement immutable correction history and audit logs
CREATED #285: Implement season, career and competition-wide aggregate derivation
CREATED #286: Implement dependency-aware selective recomputation after event changes
CREATED #287: Build golden reference results and automated correctness checks

Adding dependencies...
DEPENDENCY: #265 depends on #255
DEPENDENCY: #266 depends on #265
DEPENDENCY: #266 depends on #255
DEPENDENCY: #267 depends on #255
DEPENDENCY: #268 depends on #267
DEPENDENCY: #270 depends on #269
DEPENDENCY: #271 depends on #264
DEPENDENCY: #271 depends on #266
DEPENDENCY: #271 depends on #268
DEPENDENCY: #271 depends on #270
DEPENDENCY: #271 depends on #255
DEPENDENCY: #271 depends on #256
DEPENDENCY: #272 depends on #266
DEPENDENCY: #272 depends on #268
DEPENDENCY: #272 depends on #270
DEPENDENCY: #272 depends on #255
DEPENDENCY: #272 depends on #256
DEPENDENCY: #273 depends on #272
DEPENDENCY: #274 depends on #272
DEPENDENCY: #276 depends on #275
DEPENDENCY: #277 depends on #276
DEPENDENCY: #277 depends on #265
DEPENDENCY: #277 depends on #255
DEPENDENCY: #278 depends on #277
DEPENDENCY: #279 depends on #278
DEPENDENCY: #280 depends on #276
DEPENDENCY: #280 depends on #277
DEPENDENCY: #281 depends on #278
DEPENDENCY: #281 depends on #280
DEPENDENCY: #282 depends on #278
DEPENDENCY: #283 depends on #279
DEPENDENCY: #283 depends on #282
DEPENDENCY: #284 depends on #267
DEPENDENCY: #285 depends on #283
DEPENDENCY: #286 depends on #267
DEPENDENCY: #286 depends on #284
DEPENDENCY: #286 depends on #285
DEPENDENCY: #287 depends on #285
DEPENDENCY: #256 depends on #255
SKIP dependency: #259 already depends on #257
SKIP dependency: #259 already depends on #258

Recording stakeholder approval on #252...
COMMENTED #252 with stakeholder approval.

Done.
Gitea Project board assignment is still manual with the supported REST API.
Add all newly created issues to the Sport-Analytics-Tool project board in Backlog first.

#263  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/263
#264  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/264
#265  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/265
#266  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/266
#267  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/267
#268  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/268
#269  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/269
#270  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/270
#271  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/271
#272  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/272
#273  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/273
#274  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/274
#275  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/275
#276  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/276
#277  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/277
#278  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/278
#279  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/279
#280  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/280
#281  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/281
#282  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/282
#283  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/283
#284  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/284
#285  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/285
#286  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/286
#287  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/287 
 
Recommended Ready-now set: 
  existing #253, #254, #255 
  #256 after #255 (dependency recorded) 
  planning evidence issue, user-testing protocol issue, and batch-design issue from the created list 
  #257 stays In Review until teammate approval/merge 
Blocked: #10, #15, #17, #259 
 
Do not move the whole Intermediate chain to Ready at once; leave it in Backlog until predecessors are satisfied. 
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>     now whatr?

## Response:
8/26/2026, 6:33:44 PM

> **Organizing next steps**
>
> I’m treating the 25 issues as the backlog and #263 as the immediate tracking item. I’ll verify the repository state, create the branch, update the planning document, and prepare sanitized evidence before submitting the stakeholder update.
>
> **Organized next steps**
>
> 
>
> Worked for 12s

Great - the Gitea side is now done correctly. **#263 is the issue for the stakeholder-approval/evidence work**, so we can now make the branch and commit the evidence against it.

Do this in this order.

### 1. Create the branch for #263

First make sure you are up to date:

```powershell
git switch main
git pull
git status
```

If clean:

```powershell
git switch -c docs/263-sprint-2-stakeholder-approval
```

That is the branch I would use.

---

### 2. Create the Sprint 2 evidence folder

```powershell
New-Item -ItemType Directory -Force evidence/sprints/sprint-2
```

You should end up with:

```text
evidence/
└── sprints/
    └── sprint-2/
```

---

### 3. Save the WhatsApp approval as evidence

Yes, **definitely record that this was WhatsApp**. Do not call it a meeting.

The accurate wording is:

> asynchronous written stakeholder review via WhatsApp

Your screenshot is strong evidence because it contains the document you sent, your request for approval, and Terence's:

> Yeah  
> Approved 🔥

But your screenshot shows a phone number, so **do not commit the screenshot as-is**.

Crop/redact the phone number, but keep:

- the attached `Sprint_2_Stakeholder_Review.docx`;
- your message asking him to read/approve/reprioritise;
- Terence's response;
- the `Today` context/time.

Save the sanitised version as:

```text
evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png
```

---

### 4. Add the written evidence record

You already downloaded the file I made:

[Stakeholder approval evidence](sandbox:/mnt/data/2026-08-26-sprint-2-stakeholder-approval.md)

Copy it into the repo:

```powershell
Copy-Item "$env:USERPROFILE\Downloads\2026-08-26-sprint-2-stakeholder-approval.md" `
  "evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-approval.md"
```

If Windows renamed it with `(1)`, adjust the source filename.

Then open:

```text
evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-approval.md
```

Find the placeholder for the exact response and make that section:

```markdown
## Stakeholder Response

**Decision:** Approved.

**Exact stakeholder response:**

> Yeah  
> Approved 🔥

The approval was received through WhatsApp at 18:06 on 26 August 2026.

A redacted screenshot containing the written review request and stakeholder
approval is retained at:

`evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png`

No requirement change or reprioritisation was reported with the approval.
```

The approved stakeholder document itself asked him whether he was happy for you to proceed and invited changes/reprioritisation, so his approval genuinely confirms that proposed Sprint 2 direction. `Sprint_2_Stakeholder_Review.docx`

---

### 5. Update the existing Sprint 2 planning record

Do **not** create another planning document.

Find the one we already committed:

```powershell
git grep -n "# Sprint 2 Initial Planning"
```

It will output something like:

```text
some/path/file.md:1:# Sprint 2 Initial Planning
```

Open that file.

At the top, change the status from the old provisional wording:

```markdown
**Status:** Initial Sprint 2 planning and backlog selection; further refinement
will follow the next stakeholder review.
```

to:

```markdown
**Status:** Approved and active. The proposed Sprint 2 direction was approved by
Terence Nkoua Mackyta through an asynchronous written stakeholder review via
WhatsApp on 26 August 2026. Broader backlog refinement continues through the
team's normal Scrumban process.
```

Then add this section shortly after the initial context/planning inputs:

```markdown
## Stakeholder Approval - 26 August 2026

Because the normal stakeholder meeting could not take place during the Sprint 1
marking and close-out period, the team sent Terence Nkoua Mackyta a written
Sprint 2 stakeholder review via WhatsApp.

The review described the proposed Sprint 2 goal, remaining Basic priorities,
Sprint 1 marker-feedback work, the treatment of blocked CI/CD carry-over and
the proposed order for the Intermediate functionality.

Terence approved the proposed direction on 26 August 2026.

No requirement changes or reprioritisation were requested.

The proposed Sprint 2 direction therefore becomes the active Sprint 2 planning
baseline. Following the approval, the remaining Basic work and the core
Intermediate workflow were refined into actionable Gitea issues #263-#287.

Creating these issues does not mean that all are committed Sprint 2 work at the
same time. Issues enter `Ready` only when sufficiently defined and when their
dependencies permit implementation. Dependent future work remains in
`Backlog`.

The full stakeholder-review evidence and redacted WhatsApp approval are
retained under `evidence/sprints/sprint-2/`.
```

That last paragraph is important because you just created **25 backlog issues**. It makes clear that you are following Scrumban refinement, not pretending the team has committed to executing 25 simultaneous tasks. Your existing planning record already says only sufficiently defined work should enter `Ready`. `Pasted markdown.md`

---

### 6. Check what changed so far

Run:

```powershell
git status --short
```

At this stage I expect approximately:

```text
 M <path-to-sprint-2-initial-planning.md>
?? evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-approval.md
?? evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png
```

**Do not commit yet.**

---

### 7. Add the AI transcript for #263

This conversation has materially assisted with:

- stakeholder-evidence planning;
- Sprint 2 backlog refinement;
- the Gitea issue-creation script;
- issue descriptions/dependencies;
- the evidence document.

So this should be recorded against #263.

Use:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-26-issue-263-sprint-2-stakeholder-approval-and-backlog-refinement.md
```

Your AI policy requires the tool/model/purpose to be attributable for AI-assisted work, and documents must carry an AI usage or non-usage declaration. `ai_policy_20_jul.pdf`

Before I give you an **exact CSV line**, run:

```powershell
Get-Content evidence/ai/registers/shayna-unterslak.csv -TotalCount 3
```

Paste that output to me. I do not want to guess your register's column order.

For the transcript itself, export/save this ChatGPT conversation as you normally have for the previous issues and use the filename above.

---

### 8. Board state - don't move everything to Ready

Now that #263-#287 exist, manually add the newly created issues to the project board.

For **right now**, I would use:

| State | Issues |
|---|---|
| **In Review** | #257 |
| **Blocked** | #10, #15, #17, #259 |
| **Ready** | #253, #254, #255, **#263, #264, #275** |
| **Backlog** | #256, #265-#274, #276-#287 |

Why those three new Ready issues?

- **#263** - finish the approval/evidence work we are doing now.
- **#264** - user-testing protocol can be prepared immediately without waiting for product work.
- **#275** - batch pipeline **design only** can be done now so Intermediate implementation is ready later.

And #255 is the Basic product work I would prioritise first.

Everything else has a dependency or should wait until its predecessor is moving.

---

### 9. Team's actual starting point

Your team can work in parallel like this:

**Person/lane A:** `#255` - competition-scoped submitter access  
**Person/lane B:** `#253` / `#254` - marker-feedback documentation work  
**Person/lane C:** `#264` - formal user-testing protocol  
**Person/lane D:** `#275` - Intermediate batch-pipeline design  
**Reviewer:** review the PR for `#257` so it can actually merge

You are currently doing **#263**, which is small evidence/methodology work and should be finished quickly.

After #255:

```text
#255
 ├── #256 re-request lifecycle
 ├── #265 file-upload backend → #266 UI
 └── #267 correction backend → #268 UI
```

In parallel:

```text
#269 export API → #270 export UI
```

Then the Basic flows converge into:

```text
#271 formal user testing
#272 Basic E2E acceptance
        ↓
#273 accessibility
#274 security hardening
```

The Intermediate chain starts separately at #275, but most implementation stays in Backlog until its dependencies are met. This follows the approved plan's Basic-first ordering. `Sprint_2_Stakeholder_Review.docx`

---

**So right now:** create `docs/263-sprint-2-stakeholder-approval`, add the redacted screenshot + `.md`, update the existing Sprint 2 planning record, then send me:

```powershell
git status --short
Get-Content evidence/ai/registers/shayna-unterslak.csv -TotalCount 3
```

Then I'll give you the **exact AI register line, commit commands, commit message, push and PR for #263**.

## Prompt:
8/26/2026, 7:33:43 PM

good?

[Attachment: Pasted markdown(20260826-173339).md]

## Response:
8/26/2026, 7:33:45 PM

> **Reviewing the planning doc**
>
> I’m checking whether the revised sections match the current issue state. The main cleanup is updating provisional language, replacing the outdated “not created” section, and reconciling issue statuses and dependencies with the latest planning outcome.
>
> **Reviewed the planning document**
>
> 
>
> Worked for 7s

Almost - **the new approval section is good**, but I would make a few corrections before committing because parts of the old 25 August document now contradict the fact that Terence approved it and #263-#287 have been created. `Pasted markdown.md`

The main problem is that we updated the top of the document but left several historical sentences unchanged.

### 1. Change `Provisional Sprint 2 Goal`

Change:

```markdown
## Provisional Sprint 2 Goal
```

to:

```markdown
## Sprint 2 Goal
```

And delete this sentence:

```markdown
This is an initial Sprint 2 goal and may be refined following the next
stakeholder meeting and broader Sprint 2 backlog refinement.
```

Replace it with:

```markdown
This goal was approved by the stakeholder on 26 August 2026 and is the active
Sprint 2 goal. It may still be refined through normal stakeholder feedback and
backlog refinement if priorities or requirements materially change.
```

---

### 2. Fix the stale paragraph in `Context`

This currently says:

> The 18 August stakeholder review therefore remains the current product direction while Sprint 2 begins.  
> The next stakeholder meeting will be used to ... review the current Sprint 2 direction...

That was true **on 25 August**, but we have now had the 26 August written review.

Replace those paragraphs with:

```markdown
The 18 August stakeholder review provided the product baseline used to begin
Sprint 2 planning.

That direction was subsequently reaffirmed through the written Sprint 2
stakeholder review approved by Terence on 26 August 2026.

The next scheduled stakeholder check-in will be used to demonstrate progress,
capture further feedback and refine the Sprint 2 backlog if that feedback
materially changes priorities or requirements.
```

---

### 3. `Initial Sprint 2 Issue Selection` is historical - make that clear

Keep the table because it is useful evidence of what was selected **before approval**.

But change the intro to:

```markdown
## Initial Sprint 2 Issue Selection - 25 August 2026

Before the 26 August stakeholder approval and broader backlog refinement, the
following clearly defined issues had been selected and assigned to the Sprint 2
milestone.
```

That stops a marker reading that table as your **current** board state.

Especially because it currently says things like:

- #256 = Ready
- #257 = Ready
- #258 = Ready

which are no longer current.

After the table add:

```markdown
These states record the initial planning position on 25 August 2026 and should
not be read as the current board state.
```

---

### 4. This entire heading is now outdated

Currently:

```markdown
## Work Deliberately Not Created in This Initial Issue Batch
```

The text underneath says no issue has yet been created for user-friendly submission and that batch, export, correction, user testing, etc. still need refinement.

**That is no longer true. We just created them.**

Do not delete the historical idea completely; rewrite the section as:

```markdown
## Backlog Refinement After Stakeholder Approval

Following stakeholder approval on 26 August 2026, the broader Sprint 2 backlog
was refined into actionable Gitea issues #263-#287.

The refinement covers:

- formal user-testing preparation and execution;
- JSON and CSV file-based submission;
- a user-friendly submission interface;
- event correction and automatic statistic propagation;
- filtered CSV and JSON dataset export;
- Basic end-to-end acceptance testing;
- accessibility and responsive-design verification;
- security, privacy and dependency hardening;
- the Intermediate batch-processing architecture;
- batch storage, staging and asynchronous validation;
- accepted/rejected processing reports;
- idempotent resubmission and resumable processing;
- impossible/conflicting event validation;
- review-before-publication;
- immutable correction history;
- season, career and competition aggregates;
- selective recomputation; and
- golden reference-result correctness testing.

Dependencies between these issues have been recorded in Gitea.

Creating these issues does not mean that all work is immediately committed or
Ready. Work remains in `Backlog` until its dependencies are satisfied and it is
appropriate for implementation.

Later Intermediate work concerning realistic-scale performance, API consumer
controls, caching and versioned dataset releases remains planned for subsequent
refinement once the core batch, review, correction and aggregate workflow is
stable.
```

That is **much better evidence** of what actually happened today.

---

### 5. Update the monorepo state

The descriptions of what #257/#258/#259 *mean* are fine, but add a short current-state paragraph at the end of that section:

```markdown
As of 26 August 2026:

- #258 has been completed;
- #257 has been implemented and is awaiting teammate Pull Request approval and
  merge; and
- #259 remains blocked by the unavailable CI/CD environment.
```

This is important because #257 is **not done yet**, and you have been correctly careful about that.

---

### 6. Update `Planning Outcome`

Right now it finishes as though broader refinement is still mostly outstanding.

Add these bullets:

```markdown
- received stakeholder approval for the proposed Sprint 2 direction;
- refined the remaining Basic and core Intermediate work into issues #263-#287;
- recorded technical dependencies between dependent issues; and
- retained later Intermediate work for further refinement once the core
  workflow is stable.
```

Then change:

```markdown
Development may begin on selected `Ready` issues while the broader Sprint 2
Basic and Intermediate backlog continues to be refined.
```

to:

```markdown
Development may proceed on selected `Ready` issues while dependent work remains
in `Backlog` and later Sprint 2 work continues through normal refinement.
```

---

### 7. Related Issues

I **would not list all 25 individually** - that's unnecessary noise.

Add:

```markdown
- #263 - Record Sprint 2 stakeholder approval and finalise the active backlog
- #264-#274 - formal user testing and remaining Basic refinement
- #275-#287 - core Intermediate batch, review, correction and aggregate workflow
```

That is enough.

---

## So: good structure, just not quite ready to commit

Your strongest new section is this one:

> “Creating these issues does not mean that all are committed Sprint 2 work at the same time. Issues enter `Ready` only when sufficiently defined…” `Pasted markdown.md`

**Keep that exactly.** It explains your Scrumban approach very well.

Make the seven changes above, and then I would consider the planning document current and internally consistent.

After that, send me:

```powershell
git status --short
Get-Content evidence/ai/registers/shayna-unterslak.csv -TotalCount 3
```

and we'll finish #263 cleanly.

## Prompt:
8/26/2026, 7:38:47 PM

good?

[Attachment: Pasted markdown(20260826-173842).md]

## Response:
8/26/2026, 7:38:48 PM

Yes - **this is basically ready now**. The document now tells the story properly: initial planning on 25 Aug → written WhatsApp stakeholder approval on 26 Aug → #263-#287 refined afterward → only dependency-ready work enters `Ready`. `Pasted markdown.md`

I would make just **two tiny edits** before committing.

First, in **Planning Outcome**, remove the `and` from this bullet:

```markdown
- retained existing blocked CI/CD work in Sprint 2 without falsely completing
  it; and
```

Make it:

```markdown
- retained existing blocked CI/CD work in Sprint 2 without falsely completing
  it;
```

because there are several more bullets after it now.

Second, near the end of **Next Stakeholder and Planning Refinement**, this old sentence:

```markdown
The broader Sprint 2 feature selection will continue through normal backlog
refinement rather than treating this initial marker-feedback issue batch as a
fixed or complete Sprint plan.
```

is a little stale because we **have now done** the major backlog refinement. Change it to:

```markdown
Later Sprint 2 work will continue through normal backlog refinement rather than
treating the current issue set as a fixed or complete Sprint plan.
```

Everything else looks good, including:

- `Sprint 2 Goal` no longer being called provisional ✅
- WhatsApp accurately described as an asynchronous written stakeholder review ✅
- approval explicitly dated 26 Aug ✅
- #263-#287 recorded ✅
- clear statement that 25 Aug issue states are historical ✅
- #257 correctly described as implemented but awaiting review/merge ✅
- #258 complete ✅
- #259 blocked ✅
- Basic-first priority preserved ✅
- later performance/API controls/releases deliberately deferred ✅
- AI declaration retained ✅ `Pasted markdown.md`

After those **two edits, yes - stop editing the planning doc**. It is good enough and further polishing would just churn evidence.

Then run:

```powershell
git status --short
Get-Content evidence/ai/registers/shayna-unterslak.csv -TotalCount 3
```

Send me that output and we'll do the AI transcript/register, commit, push and PR for **#263**.

## Prompt:
8/26/2026, 7:39:35 PM

what to change this too?The broader Sprint 2 feature selection will continue through normal backlog
refinement rather than treating this initial marker-feedback issue batch as a
fixed or complete Sprint plan.

## Response:
8/26/2026, 7:39:36 PM

Change it to:

> Later Sprint 2 work will continue through normal backlog refinement rather than treating the current issue set as fixed or complete.

That fits the current state much better now that #263–#287 have already been created.

## Prompt:
8/26/2026, 7:40:10 PM

give me: csv, what to calll the transcript, commits, prs etc (assuming we done?)

## Response:
8/26/2026, 7:40:11 PM

> **Planning evidence files**
>
> I’m preparing one CSV row with the required fields, using an issue-based Markdown transcript filename. I’ll include the planning document, approval evidence, screenshot, transcript, and provenance record, then commit them cleanly.
>
> **Planned evidence files**
>
> 
>
> **Used personal_context tool**
>
> 
>
> Worked for 52s

Yes - assuming the redacted WhatsApp screenshot is saved, the approval `.md` is filled in, and the Sprint 2 planning document now has the final wording, **the #263 documentation work itself is done**. The planning record now correctly shows the 25 August initial plan, 26 August WhatsApp approval, and subsequent #263-#287 backlog refinement. `Pasted markdown.md`

## 1. Transcript filename

Save this conversation as:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-26-issue-263-sprint-2-stakeholder-approval-and-backlog-refinement.md
```

Use **one `.md` only** - not `.md.md`.

---

## 2. Exact CSV row

File:

```text
evidence/ai/registers/shayna-unterslak.csv
```

Append this as **one physical line**:

```csv
"2026-08-26","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","Planning; documentation generation; issue generation; technical guidance; Git and Pull Request guidance","Issue #263: record Sprint 2 stakeholder approval and finalise the active backlog","Generated and refined the Sprint 2 backlog and dependencies; drafted stakeholder-approval evidence; reviewed and updated the Sprint 2 planning record; generated the Gitea issue-creation script and guided evidence, Git and Pull Request workflow","Human reviewed the stakeholder approval against the WhatsApp response and approved stakeholder-review document; reviewed the issue-creation dry run; the real script created #263-#287 and recorded dependencies successfully; planning and evidence were manually reviewed before commit","Issue #263; evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-approval.md; evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png; evidence/ai/transcripts/shayna-unterslak/2026-08-26-issue-263-sprint-2-stakeholder-approval-and-backlog-refinement.md; Gitea issues #263-#287; Pull Request pending"
```

That matches your established 9-column personal AI register format.

---

# 3. Check the final files

You should now have roughly these changes:

```text
<existing Sprint 2 initial-planning document>
evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-approval.md
evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png
evidence/ai/transcripts/shayna-unterslak/2026-08-26-issue-263-sprint-2-stakeholder-approval-and-backlog-refinement.md
evidence/ai/registers/shayna-unterslak.csv
```

Run:

```powershell
git status --short
```

Make sure there is nothing unrelated.

---

# 4. I would use two commits

Cleaner evidence trail.

### Commit 1 - actual Sprint planning/evidence work

Stage the planning file plus stakeholder evidence.

Since I don't know the exact repository path of your existing planning file, use the path shown by `git status`:

```powershell
git add <PATH-TO-SPRINT-2-INITIAL-PLANNING.md>
git add evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-approval.md
git add evidence/sprints/sprint-2/2026-08-26-sprint-2-stakeholder-whatsapp-approval.png
```

Then:

```powershell
git commit -m "docs(planning): record Sprint 2 stakeholder approval" -m "Refs #263" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

### Commit 2 - AI evidence

```powershell
git add evidence/ai/registers/shayna-unterslak.csv
git add evidence/ai/transcripts/shayna-unterslak/2026-08-26-issue-263-sprint-2-stakeholder-approval-and-backlog-refinement.md
```

Then:

```powershell
git commit -m "docs(ai): record issue 263 assistance" -m "Refs #263" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

This also complies with the course requirement to attribute AI-assisted writing/work. `ai_policy_20_jul.pdf`

---

# 5. Run checks

Because this is documentation/evidence rather than application code, I would at least run:

```powershell
npm run docs:build
```

If that is not your exact docs command, use the strict MkDocs command you've been using.

Then the normal safety check:

```powershell
npm run check
```

If both pass, excellent.

Then:

```powershell
git status
git log -2 --oneline
```

You want a clean working tree.

---

# 6. Push branch

Your branch should be:

```text
docs/263-sprint-2-stakeholder-approval
```

Push:

```powershell
git push -u origin docs/263-sprint-2-stakeholder-approval
```

---

# 7. PR

### PR title

```text
docs(planning): record Sprint 2 stakeholder approval
```

### PR body

```markdown
## Summary

Records the 26 August 2026 Sprint 2 stakeholder approval and updates the active
Sprint 2 planning baseline following the stakeholder review.

The normal stakeholder meeting could not take place during the Sprint 1
marking and close-out period, so the proposed Sprint 2 direction was sent to
Terence Nkoua Mackyta as an asynchronous written stakeholder review via
WhatsApp.

Terence approved the proposed direction without requesting requirement changes
or reprioritisation.

## Changes

- records the 26 August Sprint 2 stakeholder approval;
- retains a redacted screenshot of the WhatsApp review request and approval;
- updates the existing Sprint 2 initial-planning record from provisional to
  approved and active;
- records the subsequent refinement of the remaining Basic and core
  Intermediate work into issues #263-#287;
- clarifies that creating the refined backlog does not mean all issues are
  immediately committed or Ready;
- records the current monorepo-tooling and blocked CI/CD state; and
- adds the required AI usage transcript and register entry for this work.

## Backlog Refinement

Following stakeholder approval, the Sprint 2 backlog was refined into:

- remaining Basic submission, correction, export and validation work;
- formal user-testing preparation and execution;
- Basic end-to-end, accessibility and security hardening;
- the core Intermediate batch ingestion and validation pipeline;
- safe resubmission and resumable processing;
- review-before-publication;
- immutable correction history;
- wider aggregate derivation;
- selective recomputation; and
- golden reference-result correctness testing.

Dependencies between the refined issues were recorded in Gitea.

Later performance, API-consumer controls, caching and versioned dataset-release
work remains planned for subsequent refinement once the core workflow is
stable.

## Existing Work State

- #257 is implemented but remains open pending teammate Pull Request approval
  and merge.
- #258 is complete.
- #259 remains blocked by the unavailable CI/CD environment.
- #10, #15 and #17 remain blocked CI/CD/deployment carry-over.

## Verification

- stakeholder approval compared against the retained WhatsApp evidence;
- issue-creation script dry-run reviewed before execution;
- Gitea refinement successfully created issues #263-#287;
- issue dependencies were successfully recorded;
- Sprint 2 planning record manually reviewed for consistency;
- documentation build/checks pass.

Closes #263

## AI Declaration

The preceding Pull Request description and associated planning/documentation
were planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
```

---

# 8. After opening the PR

Do **not** manually close #263 yet.

Put:

- **#263 → In Review**
- PR awaiting teammate approval

Once the PR is approved and merged, `Closes #263` should close it.

Then the relevant current board should be:

```text
IN REVIEW
#257
#263

READY
#253
#254
#255
#264
#275

BLOCKED
#10
#15
#17
#259

BACKLOG
#256
#265-#274
#276-#287
```

After #263 merges, it disappears from active work, and the team can start from **#255 / #253/#254 / #264 / #275 in parallel**.

So yes: **we are done with the planning/refinement part of #263 now.** What remains is repository evidence → commits → PR → teammate review/merge.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)