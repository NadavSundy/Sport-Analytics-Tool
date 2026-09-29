\# Create documentation issue



\*\*User:\*\* Anonymous  

\*\*Created:\*\* 9/29/2026 12:01:23  

\*\*Updated:\*\* 9/29/2026 12:16:44  

\*\*Exported:\*\* 9/29/2026 12:17:00  

\*\*Link:\*\* \[https://chatgpt.com/g/g-p-6a71d5cd12fc819195485e086282990c-sdp-project/c/6abb8c71-a18c-83e9-b68c-8042ad2f810a](https://chatgpt.com/g/g-p-6a71d5cd12fc819195485e086282990c-sdp-project/c/6abb8c71-a18c-83e9-b68c-8042ad2f810a)  



\## Prompt:

9/29/2026, 12:01:39 PM



help me create an issue to put the user feedback sumamry's onto the doc site



\## Response:

9/29/2026, 12:01:40 PM · gpt-5-6-thinking



> \*\*Drafting an issue\*\*

>

> I’m interpreting this as creating a clear issue for consolidating user-feedback summaries on the documentation site. I’ll first align the wording with the project’s documentation guidance and issue conventions, then prepare the issue without changing code.

>

> \*\*Drafted an issue\*\*

>

> 

>

> \*\*Searched Drive for project guidelines, AGENTS files, and sport analytics folders\*\*

>

> 

>

> \*\*Shaping issue scope\*\*

>

> I’m outlining documentation pages for feedback summaries, navigation updates, privacy-conscious evidence links, AI-use disclosure, and a strict documentation build check. I’m also preserving the distinction between published summaries and retained raw research evidence.

>

> \*\*Shaped issue scope\*\*

>

> 

>

> \*\*Created user-testing documentation and drafted Sprint 3 feedback issues\*\*

>

> 

>

> Worked for 2m 23s



I’d create the issue like this. I checked the current docs structure: the user-testing methodology is already published, while the Sprint 2 and Sprint 3 summaries currently live under `evidence/user-testing/`. This also directly supports the Sprint 3 rubric, which awards user-feedback gathering, evidence of integrating feedback, and comprehensive documentation. `project\_briefs (1).pdf` `project\_briefs (1).pdf`



\### Title

\*\*Publish user feedback summaries on documentation site\*\*



\### Description



```md

\## Description



Publish the existing user-testing / user-feedback summaries on the public documentation site so that the project's user-testing results, findings and resulting improvements are easy to review.



The repository currently retains the canonical summaries at:



\- `evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md`

\- `evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md`



The documentation site already explains the user-testing methodology, protocol and task-based evidence process, but the consolidated results should also be available from the documentation site.



The raw participant/session evidence should remain in `evidence/user-testing/`. The documentation site should expose a curated, public-safe summary rather than publishing every raw session artefact.



\## Motivation



User feedback is an important part of the project evaluation and we should make the evidence of testing, findings and subsequent improvements visible from the documentation site.



Publishing these summaries will also make it easier to demonstrate the full feedback lifecycle:



`testing -> finding -> decision -> implementation -> retest`



\## Acceptance Criteria



\- \[ ] Add a User Feedback / User Testing Results section to the documentation site.

\- \[ ] Publish a Sprint 2 user-testing summary based on `evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md`.

\- \[ ] Publish a Sprint 3 user-testing summary based on `evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md`.

\- \[ ] Summaries include participant/task coverage, major findings, decisions taken, changes implemented and relevant retest results.

\- \[ ] Deferred or unresolved findings are clearly identified where applicable.

\- \[ ] Do not expose personally identifying participant information or unnecessary raw session data.

\- \[ ] Keep the files in `evidence/user-testing/` as the canonical evidence/source material.

\- \[ ] Update `docs/testing/user-testing-overview.md` so that it links to the published feedback summaries.

\- \[ ] Add the new pages to the appropriate Testing/User Testing section of `mkdocs.yml`.

\- \[ ] Ensure navigation between the testing methodology, protocol, task bank and results is clear.

\- \[ ] Any links to repository evidence are valid.

\- \[ ] Documentation formatting is consistent with the existing site.

\- \[ ] Documentation build/checks pass successfully.



\## Out of Scope



This issue does not change the user-testing methodology or modify historical participant/session evidence. It only publishes and organises the consolidated feedback results on the documentation site.



\## AI Declaration



The preceding issue was planned and generated with the assistance of ChatGPT-Web\[GPT-5.6 Sol].

```



Including the AI declaration is consistent with the course policy's requirement to declare AI assistance in writing. `ai\_policy.pdf`



A good branch name when you implement it would be \*\*`docs/user-feedback-summaries`\*\*.



\## Prompt:

9/29/2026, 12:06:08 PM



it is issue #793, lets implement it. helop me create the branch and give the the what to place and where. when makinging a chnage to a file give me a poersheell command to do it. we also neeed to make sure we update the ai registry's



\## Response:

9/29/2026, 12:06:16 PM · gpt-5-6-thinking



> \*\*Reviewed policies, registries, and testing documentation\*\*

>

> 

>

> \*\*Planning documentation changes\*\*

>

> I’m organizing this into a focused documentation branch: adding Sprint 2 and Sprint 3 user-testing pages, linking them from the overview, updating the AI register consistently, and providing PowerShell commands for each file change.

>

> \*\*Planned documentation changes\*\*

>

> 

>

> \*\*Refining registry updates\*\*

>

> I’m keeping the per-member register authoritative, while treating the shared register as legacy. I’ll avoid inventing transcript details; the new entry should reference an exported transcript, with a pending note until that file exists.

>

> \*\*Refined registry updates\*\*

>

> 

>

> \*\*Published user-testing summaries and updated documentation links\*\*

>

> 

>

> Worked for 5m 12s



Yes. We should implement this as a documentation-only branch and keep the canonical raw evidence under `evidence/user-testing/`. The public docs will contain concise, privacy-safe Sprint 2 and Sprint 3 summaries with links back to the full evidence.



The repository now uses the per-member AI register as the active register; the shared `evidence/ai/ai-usage-register.csv` is legacy and being retired, so for this issue we should update `evidence/ai/registers/nadav-sundy.csv`, retain a transcript, and put AI declarations in the new documentation pages. This is consistent with the course requirement that AI-assisted writing carries an AI declaration. `ai\_policy.pdf`



Run everything below from the repository root in \*\*PowerShell\*\*.



\### 1. Create the branch



First make sure `origin` is your \*\*Wits Gitea repo\*\*, not the GitHub mirror:



```powershell

git remote -v

```



You should see the Wits/Gitea repository, such as `sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool`. Do \*\*not\*\* push this work to the GitHub mirror.



Then:



```powershell

git switch main

git pull origin main

git switch -c docs/793-publish-user-feedback-summaries

```



Confirm:



```powershell

git branch --show-current

```



It should print:



```text

docs/793-publish-user-feedback-summaries

```



\---



\## 2. Add the Sprint 2 public summary



Create:



`docs/testing/user-testing-sprint-2-summary.md`



Run this PowerShell command:



```powershell

@'

\# Sprint 2 User Feedback Summary



This page provides a public summary of the formal user testing completed during Sprint 2.



The detailed session records and consolidated evidence remain the authoritative source. This page

publishes the main outcomes, decisions, improvements and remaining risks without reproducing

unnecessary participant information.



\[View the canonical Sprint 2 user-testing evidence](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md).



\## Coverage



| Workstream | Participants | Main tasks covered | Result |

| ---------- | ------------ | ------------------ | ------ |

| Public / analyst | P01, P02; P03 supplementary evidence | `PUB-01` to `PUB-05` | Formal testing completed. Users could find published cricket data, but several interpretation, filtering and export problems were identified. |

| Submission / batch | P05, P06 | `AUTH-01`, `AUTH-02`, `SUB-\*`, `BAT-\*` | Formal testing completed. Changes made after P05 were exercised again by P06 and several improvements were confirmed. |

| Review / administration | P04 | `REV-01`, `REV-02`, `REV-05`, `ADM-02` | Completed after an initial deployed ingestion blocker was fixed and retested. |



P03 is retained as supplementary public/analyst evidence. It contributes findings but is not counted

as an additional formal task attempt because the standard task script, facilitator metadata and formal

Success / Partial / Failure outcomes were not retained.



\## Main outcomes



Public users were able to find a fixture and understand its result. Both formal `PUB-01` attempts

succeeded, including a participant without cricket knowledge.



The more detailed analysis journeys exposed usability gaps. Neither formal `PUB-03` attempt resulted

in the participant being able to narrow the information to the exact subset they wanted.



The underlying derived cricket figures were found to reconcile correctly during the domain-competent

participant's checks. The major problems were instead around presentation, discoverability and taking

the data out of the application in a reliable form.



The submission workflow improved between the P05 and P06 sessions. Terminology, access-scope

discovery, success messaging and tested rejection feedback were clearer after the accepted P05

findings were implemented.



The reviewer workflow initially failed because prepared batches remained in `Stored` state and never

appeared in the review queue. That deployment problem was fixed under #463, after which P04 repeated

`REV-01` successfully and completed the remaining selected reviewer tasks.



\## Key findings and actions



| Finding | Decision / action | Evidence state |

| ------- | ----------------- | -------------- |

| Exported event data omitted the names and context needed to interpret it away from the application | Accepted under #468 | Implemented in PR #474 and retested |

| Large innings exports silently omitted data beyond the export limit | Accepted under #467 | Outstanding at Sprint 2 close-out; retest required |

| Competition search did not find competitions beyond the first paginated result set | Accepted under #469 | Outstanding at Sprint 2 close-out |

| Player presentation did not expose already-available career aggregates | Accepted under #476 | Outstanding at Sprint 2 close-out |

| Reviewer batches remained `Stored` and did not reach the review queue | Accepted under #463 | Fixed and successfully retested |

| Submission terminology and next-step messaging were unclear | Accepted under #498 and #520 | Improved and externally retested by P06 |

| Validation feedback was too technical | Accepted under #499 | Improved; the tested rejection path was understood by P06 |

| Additional competition scope was difficult to request | Accepted under #501 and #519 | Implemented and successfully rediscovered by P06 |

| A guided submitter could not clearly create a genuinely new fixture | Recorded from P06 | Remained a blocking workflow gap at Sprint 2 close-out |



\## Finding severity



The public/analyst evidence recorded:



| Severity | Count | Accepted | Deferred | Pending | Resolved after retest |

| -------- | ----: | -------: | -------: | ------: | --------------------: |

| S1 | 1 | 1 | 0 | 0 | 0 |

| S2 | 12 | 4 | 7 | 1 | 2 |

| S3 | 37 | 12 | 25 | 0 | 1 |

| S4 | 9 | 2 | 7 | 0 | 2 |



The submission/batch workstream separately recorded:



| Severity | Count | Accepted | Deferred | Pending | Resolved after retest |

| -------- | ----: | -------: | -------: | ------: | --------------------: |

| S1 | 0 | 0 | 0 | 0 | 0 |

| S2 | 4 | 3 | 0 | 1 | 1 |

| S3 | 5 | 2 | 0 | 3 | 2 |

| S4 | 0 | 0 | 0 | 0 | 0 |



Across the reviewed Sprint 2 public, submission and reviewer evidence, the consolidated evidence

records twenty-five accepted findings, thirty-nine deferred findings, no rejected findings and five

findings still pending a final decision at Sprint close-out.



\## Repeated themes



Several themes appeared across otherwise independent sessions:



\- exported data needed to be complete and understandable outside the web application;

\- frontend pagination needed to be handled consistently rather than treating the first page as the

&#x20; complete result set;

\- cricket statistics were generally calculated correctly but required clearer domain presentation;

\- users needed better ways to narrow large fixture and participant views;

\- player and team pages needed more useful aggregate summaries;

\- submitter terminology, access requests and next-step guidance materially affected whether users

&#x20; understood the ingestion workflow; and

\- deployed asynchronous processing was a critical dependency of the reviewer experience.



\## Improvements verified by users



Sprint 2 did not only collect feedback. Several accepted findings were changed and then exercised

again.



P06 confirmed improvements to upload-mode terminology, additional-scope discovery, season-upload

success messaging and the tested rejection-feedback experience after the P05 findings were acted on.



P04 successfully repeated the previously blocked reviewer task after the worker and Service Bus

processing path was restored.



The export context changes under #468 were also retested after implementation.



\## Remaining risks at Sprint 2 close-out



The most serious remaining public-data concern was #467: a large innings export could silently return

an incomplete dataset while appearing successful.



The submission workflow still lacked a clear guided path for creating and submitting a completely new

fixture, preventing the intended follow-on submission tasks from being exercised during P06's session.



Several public presentation and discoverability findings were also intentionally deferred or remained

outstanding for later work.



\## Evidence



The complete evidence, including task-level outcomes, finding IDs, decisions, issue links and retest

records, is retained under

\[`evidence/user-testing/sprint-2/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2).



The canonical consolidated record is

\[`sprint-2-user-testing-summary.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md).



\## AI Declaration



The preceding document was planned and generated with the assistance of ChatGPT-Web\[GPT-5.6 Sol].

'@ | Set-Content -Path "docs/testing/user-testing-sprint-2-summary.md" -Encoding UTF8

```



\---



\## 3. Add the Sprint 3 public summary



Create:



`docs/testing/user-testing-sprint-3-summary.md`



```powershell

@'

\# Sprint 3 User Feedback Summary



This page provides a public summary of the formal user-feedback activities completed during Sprint 3.



The detailed participant records and consolidated evidence remain the authoritative source. This page

provides a privacy-safe view of the coverage, findings, decisions, integrated changes and remaining

limitations.



\[View the canonical Sprint 3 user-testing evidence](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md).



\## Coverage



Sprint 3 retained the task-based testing process established earlier in the project. Each user goal had

a dedicated feedback issue and representative task set.



| Feedback issue | User goal | Session | Recorded gate state |

| -------------- | --------- | ------- | ------------------- |

| #601 | Navigation, authentication and overall frontend flow | P07 | Accepted with documented limitations |

| #602 | Public statistics and fixture analytics | P08 | In progress in the consolidated coverage table |

| #603 | New-fixture submission and reviewer onboarding | P11 | Accepted with documented limitations |

| #604 | Season and multi-season back-catalogue ingestion | P14 | Accepted with documented limitations |

| #605 | Corrections, stable identity and statistics provenance | P12 | Not accepted |

| #606 | Versioned dataset release and reproducibility | P10 | Accepted |

| #607 | API consumer keys, quotas and rate limits | P09 | Accepted with documented limitations |

| #612 | Advanced API consumer capabilities | P13 | Accepted with documented limitations in the later final-gate record |



The consolidated evidence still shows #612 as `In progress` in its earlier coverage table. A later

final-gate section in the same evidence records #612 as \*\*Accepted with documented limitations\*\*

after #783 was implemented and the deployed `PUB-05` experience was retested. This page preserves

that distinction rather than silently treating the two records as identical.



\## Finding severity



Sprint 3 recorded the following finding distribution:



| Severity | Count | Accepted | Deferred | Rejected | Pending | Resolved after retest |

| -------- | ----: | -------: | -------: | -------: | ------: | --------------------: |

| S1 | 2 | 0 | 2 | 0 | 0 | 0 |

| S2 | 10 | 2 | 8 | 0 | 0 | 1 |

| S3 | 6 | 3 | 3 | 0 | 0 | 1 |

| S4 | 2 | 0 | 2 | 0 | 0 | 0 |



\## Key findings and decisions



| Finding | Decision / action | Result |

| ------- | ----------------- | ------ |

| P07-F01: account `Settings` naming was unclear | Accepted under #713 | Non-blocking S3 follow-up |

| P07-F02: approved competition scopes were difficult to discover | Accepted under #714 | Non-blocking S3 follow-up |

| P08-F01: no obvious player-comparison workflow | Accepted under #716 | S2 change requiring implementation and retest |

| P09-F01: browser/OpenAPI consumers could not see safe rate-limit and retry headers | Accepted under #743 | Fix deployed and technically retested successfully |

| P11-F01: reviewer onboarding accepted a player name where a durable identifier was required | Deferred under #770 | Non-blocking follow-up retained |

| P12-F01: no discoverable way to correct data submitted in an earlier session | Deferred to #613 | S1 issue; no Sprint 3 fix attempted |

| P12-F10: deployed page loads were slow enough to appear broken to the participant | Deferred to #613 | S1 issue; no Sprint 3 fix attempted |

| P13-F01: an external API consumer could not determine how to request access or obtain a key | Accepted under #783 | Implemented in PR #787 and passed deployed participant retest |

| P14-F01: batch-reference recovery instructions could be clearer | Deferred to #613 | Non-blocking S3 follow-up |

| P14-F02: the complete JSON batch report was temporarily unavailable | Deferred to #613 | S2 issue retained for follow-up |

| P14-F03: clearing searchable selectors automatically selected the top option | Deferred to #613 | Non-blocking S4 follow-up |



\## Integrated changes and retests



\### API rate-limit visibility



P09 identified that the interactive browser/OpenAPI experience did not expose the response headers

needed to understand rate limits and retry timing.



The finding became #743. After the change was deployed, the browser/OpenAPI experience visibly

exposed the expected rate and quota metadata on a successful response and the rate-limit and

`Retry-After` information on a `429 RATE\_LIMIT\_EXCEEDED` response.



The retained limitation is that the correction was technically retested in the deployed Swagger

experience rather than through a second participant run of the original `API-01` task.



\### External API consumer onboarding



P13 successfully completed the selected Advanced API operations but initially could not determine how

a legitimate external consumer should obtain an API key.



The accepted S2 finding became #783. PR #787 added public onboarding guidance covering anonymous

access, administrator-issued consumer keys, the access-request model, `X-API-Key` use, rate and quota

expectations and secure handling.



After deployment, `PUB-05` was repeated and the participant was satisfied with the revised guidance.

The historical original result remains Partial in the evidence; the successful retest is retained

separately rather than rewriting the original observation.



\## Correction and provenance gate



The #605 correction/provenance session was \*\*not accepted\*\*.



The participant could successfully correct a delivery that had been submitted moments earlier, but

could not discover a way to correct data from an earlier submission. Submission-history entries were

difficult to distinguish, item lists did not expose enough event information to find the target, and

the older published-data correction journey had no usable path.



The same session also recorded significant deployed latency and weaknesses in navigating provenance

between batches, fixtures, events and statistics.



Two S1 findings from this session, including correction discoverability and deployed page-load

performance, were deferred to #613 for Sprint close-out rather than fixed during Sprint 3.



\## Batch-ingestion feedback



P14 successfully completed the season upload, multi-season upload and invalid-package tasks.



Reference-resolution reporting was understandable but could provide clearer recovery instructions.

The complete JSON report download was temporarily unavailable during `BAT-05`, producing a deferred

S2 finding. A smaller selector-clearing usability issue was also retained as a deferred S4 finding.



The #604 gate was therefore accepted with documented limitations rather than treated as having no

remaining concerns.



\## Remaining concerns



The most consequential retained issues at Sprint 3 close-out include:



\- the S1 correction-discoverability problem recorded by P12;

\- the S1 deployed-performance finding recorded by P12;

\- implementation and retest of the accepted player-comparison finding #716;

\- the durable-identifier onboarding follow-up #770;

\- batch-report recovery guidance and report availability raised by P14; and

\- several non-blocking navigation and scope-discoverability improvements.



Deferred findings remain visible in the evidence and are not treated as resolved merely because their

related implementation issues or Sprint ended.



\## Evidence



The complete Sprint 3 evidence is retained under

\[`evidence/user-testing/sprint-3/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3).



The canonical consolidated record is

\[`sprint-3-user-testing-summary.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md).



\## AI Declaration



The preceding document was planned and generated with the assistance of ChatGPT-Web\[GPT-5.6 Sol].

'@ | Set-Content -Path "docs/testing/user-testing-sprint-3-summary.md" -Encoding UTF8

```



\---



\## 4. Link the summaries from the User Testing Overview



We don't want to replace the current methodology page. Add a published-results section immediately before `## Where the artefacts live`.



Run:



```powershell

$path = "docs/testing/user-testing-overview.md"

$text = Get-Content $path -Raw



if ($text -notmatch "## Published results") {

&#x20;   $block = @'

\## Published results



The documentation site provides concise public summaries of the retained formal user-testing evidence:



\- \[Sprint 2 User Feedback Summary](user-testing-sprint-2-summary.md)

\- \[Sprint 3 User Feedback Summary](user-testing-sprint-3-summary.md)



These pages provide the main coverage, findings, decisions, integrated changes, retests and remaining

limitations. The records under `evidence/user-testing/` remain the canonical task-level evidence.



'@



&#x20;   $text = $text.Replace("## Where the artefacts live", "$block## Where the artefacts live")

&#x20;   Set-Content -Path $path -Value $text -Encoding UTF8

}

```



\---



\## 5. Make the results discoverable from the Testing landing page



Add a row to `docs/testing/index.md`.



```powershell

$path = "docs/testing/index.md"

$text = Get-Content $path -Raw



$old = "| What tasks can participants be given?                | \[User testing task bank](user-testing-task-bank.md)                                 |"

$new = @'

| What tasks can participants be given?                | \[User testing task bank](user-testing-task-bank.md)                                 |

| What did formal user testing find?                   | \[Sprint 2 summary](user-testing-sprint-2-summary.md) and \[Sprint 3 summary](user-testing-sprint-3-summary.md) |

'@



if ($text.Contains($old) -and $text -notmatch "Sprint 2 summary") {

&#x20;   $text = $text.Replace($old, $new.TrimEnd())

&#x20;   Set-Content -Path $path -Value $text -Encoding UTF8

}

```



\---



\## 6. Add both pages to MkDocs navigation



Under \*\*Testing \& Quality → User Testing\*\*, the navigation should become:



```yaml

&#x20;     - User Testing:

&#x20;         - User Testing Overview: testing/user-testing-overview.md

&#x20;         - User Testing Protocol: testing/user-testing-protocol.md

&#x20;         - User Testing Task Bank: testing/user-testing-task-bank.md

&#x20;         - Sprint 2 User Feedback Summary: testing/user-testing-sprint-2-summary.md

&#x20;         - Sprint 3 User Feedback Summary: testing/user-testing-sprint-3-summary.md

```



Use this PowerShell command:



```powershell

$path = "mkdocs.yml"

$lines = \[System.Collections.Generic.List\[string]](Get-Content $path)



$sprint2 = "          - Sprint 2 User Feedback Summary: testing/user-testing-sprint-2-summary.md"

$sprint3 = "          - Sprint 3 User Feedback Summary: testing/user-testing-sprint-3-summary.md"



if (-not $lines.Contains($sprint2)) {

&#x20;   $needle = "          - User Testing Task Bank: testing/user-testing-task-bank.md"

&#x20;   $index = $lines.IndexOf($needle)



&#x20;   if ($index -lt 0) {

&#x20;       throw "Could not find the User Testing Task Bank navigation entry."

&#x20;   }



&#x20;   $lines.Insert($index + 1, $sprint2)

&#x20;   $lines.Insert($index + 2, $sprint3)

&#x20;   Set-Content -Path $path -Value $lines -Encoding UTF8

}

```



\---



\## 7. AI evidence



There are \*\*three things\*\* to do for this issue: the new pages already contain their AI declarations; retain this ChatGPT session as transcript evidence; and add the task to your personal register.



The policy requires AI-assisted writing to declare the tool/model used, while the repository's own evidence process goes further by retaining task-level usage records. `ai\_policy.pdf`



\### Transcript



Use this target:



```text

evidence/ai/transcripts/nadav-sundy/2026-09-29-issue-793-publish-user-feedback-summaries.md

```



Open it with:



```powershell

notepad "evidence/ai/transcripts/nadav-sundy/2026-09-29-issue-793-publish-user-feedback-summaries.md"

```



Paste the \*\*unedited Issue #793 ChatGPT conversation\*\* into it and save it. If your exported transcript is another format, preserve that format and use the actual filename in the register instead.



Do \*\*not\*\* fabricate or summarise the transcript as if it were the raw interaction.



\### AI register



Do this \*\*after we run the validation checks below successfully\*\*.



Append to:



`evidence/ai/registers/nadav-sundy.csv`



```powershell

@'

"2026-09-29","Nadav Sundy","ChatGPT-Web","GPT-5.6 Sol","Documentation; user-testing evidence publication; information architecture; AI compliance","Issue #793: publish the Sprint 2 and Sprint 3 user-feedback summaries on the public documentation site","Public Sprint 2 and Sprint 3 user-feedback summary pages; User Testing Overview links; Testing index link; MkDocs navigation updates; AI evidence guidance","Compared the public summaries against the retained Sprint 2 and Sprint 3 canonical evidence; preserved finding, decision and retest state; excluded unnecessary participant information; strict MkDocs build and repository diff checks passed; human review completed before commit","Issue #793; branch docs/793-publish-user-feedback-summaries; evidence/ai/transcripts/nadav-sundy/2026-09-29-issue-793-publish-user-feedback-summaries.md; Pull Request and commit references pending"

'@ | Add-Content -Path "evidence/ai/registers/nadav-sundy.csv" -Encoding UTF8

```



I would \*\*not update `evidence/ai/ai-usage-register.csv`\*\* for this task. The current repository documentation explicitly treats that as the old shared register and makes `evidence/ai/registers/nadav-sundy.csv` your active task-level register.



\---



\## 8. Review what changed



Before testing:



```powershell

git status --short

```



You should have these changes:



```text

M  docs/testing/index.md

M  docs/testing/user-testing-overview.md

M  mkdocs.yml

M  evidence/ai/registers/nadav-sundy.csv

?? docs/testing/user-testing-sprint-2-summary.md

?? docs/testing/user-testing-sprint-3-summary.md

?? evidence/ai/transcripts/nadav-sundy/2026-09-29-issue-793-publish-user-feedback-summaries.md

```



Then inspect the diff:



```powershell

git diff -- docs/testing/index.md docs/testing/user-testing-overview.md docs/testing/user-testing-sprint-2-summary.md docs/testing/user-testing-sprint-3-summary.md mkdocs.yml

```



For the AI register:



```powershell

Get-Content "evidence/ai/registers/nadav-sundy.csv" -Tail 3

```



\### Validation



Run:



```powershell

python -m mkdocs build --strict

```



Then:



```powershell

git diff --check

```



And the repository check:



```powershell

npm run check

```



If those pass, we can commit with:



```powershell

git add docs/testing/index.md docs/testing/user-testing-overview.md docs/testing/user-testing-sprint-2-summary.md docs/testing/user-testing-sprint-3-summary.md mkdocs.yml evidence/ai/registers/nadav-sundy.csv evidence/ai/transcripts/nadav-sundy/2026-09-29-issue-793-publish-user-feedback-summaries.md



git commit -m "docs(testing): publish user feedback summaries" -m "Refs #793" -m "Assisted-by: ChatGPT-Web\[GPT-5.6 Sol]"

```



\*\*Don't commit yet.\*\* Make the files first and send me the output of `python -m mkdocs build --strict` and `git status --short`; I'll check it before we commit.







\---

Powered by \[ChatGPT Exporter](https://www.chatgptexporter.com)

