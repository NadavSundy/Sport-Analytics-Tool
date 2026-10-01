# Sprint 4 Issue Outline

**User:** Anonymous  
**Created:** 9/30/2026 5:23:42  
**Updated:** 10/1/2026 6:09:25  
**Exported:** 10/1/2026 6:09:31  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6abc80bc-8e18-83e9-9d9f-27ef47cf3671](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6abc80bc-8e18-83e9-9d9f-27ef47cf3671)  

## Prompt:
9/30/2026, 5:27:15 AM

![image(5).png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000a95c820ab0dbc1e90138fdd3&fn=image%285%29.png&cd=attachment&ts=497452&p=fs&cid=1&sig=e6b1a155a2cc5a36e7ae1368b6b05d7993ac7aca427d71d4601e4827e2773b77&v=0)

![image(6).png](https://chatgpt.com/backend-api/estuary/content?id=file_0000000011ac820a9bc2e5658640d9dd&fn=image%286%29.png&cd=attachment&ts=497452&p=fs&cid=1&sig=3d3cdc693e65a4c5892bd7ab12c9a1926b35eff5457c11d73fdbcf27d516cf2a&v=0)

k, we need to make issues for final sprint.. soprint 4!! check rubric- but also, heres feedback (the long message is our sprint plaaning... btw-make an issue for that ofc)
ove given u whats been added... also-if we need user feedback etc add those (and a coverage one if we need).. anything thast in sprint 1,2,3 needs to be done in 4 too and end of project.. i guess check end of project rubric.. ill ad it here.. also have 1 for documentingt stakeholder meetings and scrums
make it into a script thingpls (but first give me outline and let me aprove it)

perf: achieve Lighthouse Performance score ≥90 across all frontend pages #797
Open
opened 12 hours ago by Dean · 0 comments

Dean commented 12 hours ago
Member
Description
Sprint 3 has concluded, so this issue forms part of final stabilisation before submission.

Current Chrome Lighthouse testing shows that frontend page performance is below the desired production standard on one or more routes.

Audit and optimise every user-facing frontend page so that the application achieves a green Lighthouse Performance score of at least 90 consistently when tested against a production build.

Optimisation must address the actual Lighthouse bottlenecks rather than artificially increasing the score or disabling functionality.

This work directly supports the COMS3011A final rubric's App Performance (5%) criterion, which evaluates application load time and responsiveness to input.

Scope
Investigate page-level and shared frontend performance, including:

JavaScript bundle size
Route/component loading
Expensive React renders
Images and static assets
Fonts
Unnecessary network requests
API request duplication
Client-side caching
Render-blocking resources
Third-party dependencies
Large chart/data libraries
Components or datasets loaded eagerly when they can be deferred
Where appropriate, introduce:

Route-level code splitting
React.lazy / dynamic imports
Asset optimisation
Request deduplication
Memoisation
Caching
Removal of unused dependencies/code
Production bundle optimisation
Testing must be performed against the production build or deployed application, not the development server.

Acceptance Criteria
Create an inventory of all normal user-facing frontend routes, including authenticated routes.
Record a before-optimisation Lighthouse baseline for every route.
Identify the primary Lighthouse performance bottleneck for every route scoring below 90.
Implement performance improvements without removing required application functionality.
Introduce route/component lazy loading where large components are unnecessarily included in the initial bundle.
Reduce unnecessary JavaScript and identify unusually large production chunks.
Optimise large images, static assets and fonts where applicable.
Eliminate unnecessary duplicate API/network requests during initial page load.
Prevent avoidable expensive React re-renders or calculations where identified.
Preserve existing responsive and accessible behaviour.
Every tested page achieves Lighthouse Performance ≥90 (green) on Chrome using a production build.
Validate both desktop and mobile Lighthouse profiles, with mobile treated as the stricter performance check.
Target healthy Lighthouse metrics where applicable:
LCP ≤ 2.5s
CLS ≤ 0.1
TBT ≤ 200ms
Re-run the existing frontend unit/integration/E2E test suite and confirm no regressions.
Record before vs after Lighthouse evidence for every tested route.
Document significant performance decisions or optimisations in the project documentation.
Where practical, add a Lighthouse/Lighthouse CI regression check so future changes cannot silently reintroduce severe performance regressions.
PR contains screenshots/reports showing all frontend pages meeting the performance target.
Verification Evidence
Include a table in the PR similar to:

Page / Route	Before	After	LCP	CLS	TBT	Status
/example	72	94	2.1s	0.04	120ms	✅
Also attach or store relevant Lighthouse HTML/JSON reports where practical.

Definition of Done
The issue is complete when:

Every normal user-facing page scores Lighthouse Performance ≥90.
Testing is performed in a production-equivalent environment.
Existing application functionality is preserved.
Frontend automated tests and E2E tests pass.
Before/after Lighthouse evidence is included in the PR.
Significant optimisation decisions are documented.
No major Lighthouse performance regression remains unresolved.
Tool: ChatGPT Web | Model: GPT-5.6 Thinking

 Dean added the 
area: frontend
area: infrastructure
priority: high
 labels 12 hours ago
 Dean added this to the Sport-Analytics-Tool-Proj project 12 hours ago
 Dean added this to the Sprint 4 milestone 12 hours ago
 Dean self-assigned this 12 hours ago

Write
Preview
Leave a comment

Drop files or click here to upload.
area: frontend
area: infrastructure
priority: high
Sprint 4
Sport-Analytics-Tool-Proj

Dean
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Dependencies
No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#797
 
Powered by Gitea
Version: 1.24.7 Page:
151ms
Template:
24ms

Add Privacy Notice, Terms of Use and Accessibility Statement to public site #798
Open
opened 12 hours ago by NadavSundy · 0 comments

NadavSundy commented 12 hours ago
Member
Description
Add the approved Stat’sTheGame public policy documents to the web application and make them accessible from the global site footer.

The application should provide three public policy pages:

Privacy Notice
Terms of Use
Accessibility Statement
The policy content should be based on the reviewed policy drafts prepared for Stat’sTheGame and must accurately reflect the current application architecture and data practices.

The policies should be publicly accessible without authentication.

Policy structure
Privacy Notice
Add a public Privacy Notice covering, among other applicable content:

the Stat’sTheGame Student Project Team as the responsible party;
project privacy contact: statsthegame@gmail.com;
correspondence address: Private Bag 3, Wits, 2050, South Africa;
the fact that Wits is not the operator or controller of application data;
Google OAuth and Supabase Auth;
Supabase-hosted PostgreSQL;
Microsoft Azure infrastructure and private object storage;
Cloudflare frontend hosting;
account and submitter information;
API-consumer information where linked to a person;
browser local storage used for:
theme preference; and
Supabase authentication-session persistence;
no current advertising or analytics tracking cookies;
third-party authentication cookies where applicable;
the 18+ requirement for authenticated accounts;
90-day retention of raw private batch source files;
retained non-identifying provenance and audit information;
account deletion and tombstoning behaviour;
international processing;
POPIA data-subject rights;
security-incident handling;
Information Regulator complaint information; and
contact and update information.
A separate Cookie Notice should not be added. Cookie and browser-storage information belongs within the Privacy Notice.

A cookie-consent banner should not be introduced unless the application's tracking behaviour changes to require one.

Terms of Use
Add a public Terms of Use page covering:

the academic/student-project status of Stat’sTheGame;
18+ requirement for authenticated accounts;
account and credential security;
roles and scoped permissions;
acceptable use;
submitter responsibilities;
rights required to process submitted cricket data;
API usage rules;
API-key security;
rate-limit and quota compliance;
public dataset and API-output reuse;
attribution requirements;
third-party data and licence limitations;
intellectual property and branding;
accuracy and availability disclaimers;
security and responsible vulnerability disclosure;
suspension/revocation of accounts or API credentials;
third-party services;
governing law in South Africa; and
project contact details.
API Terms, Dataset Licence/usage conditions and Responsible Disclosure should remain sections of the Terms of Use rather than being separate footer policies.

Public Stat’sTheGame data should be permitted for use, analysis, transformation, copying and redistribution, including commercial use, provided reasonable attribution is given and applicable third-party source-data rights and licence conditions are respected.

Accessibility Statement
Add a public Accessibility Statement which:

states that Stat’sTheGame aims to conform to WCAG 2.2 Level AA;
does not claim complete WCAG 2.2 AA conformance unless a complete conformance assessment has actually been performed;
describes the project's accessibility measures, including:
semantic HTML;
accessible labels;
keyboard operation;
focus visibility;
form and status feedback;
colour contrast;
avoiding colour-only meaning;
Day Match and Night Match themes;
responsive layouts;
zoom/reflow;
reduced-motion support;
Axe testing; and
manual accessibility testing;
explains the current assessment limitations;
provides statsthegame@gmail.com for accessibility feedback; and
explains how users can request assistance when an accessibility issue prevents them from completing a task.
Routes
Expose the policies through stable public routes:

/privacy
/terms
/accessibility
The routes must not require authentication.

Footer
Update the global site footer so that all normal public and authenticated pages provide links to:

Privacy Notice
Terms of Use
Accessibility
Also display or otherwise make the project contact address available:

statsthegame@gmail.com

Do not add separate footer links for:

Cookie Policy;
API Terms;
Dataset Licence; or
Responsible Disclosure.
Those subjects are incorporated into the Privacy Notice or Terms of Use.

Accessibility and UX requirements
The policy pages and footer must:

use semantic HTML;
have a clear heading hierarchy;
be fully keyboard accessible;
expose descriptive link text;
provide visible keyboard focus;
maintain appropriate colour contrast in both application themes;
reflow correctly on representative mobile widths;
remain usable at increased browser zoom;
avoid unintended horizontal overflow; and
match the existing Stat’sTheGame visual design rather than introducing a separate legal-page style.
The policy pages should prioritise readable long-form text with an appropriate maximum content width and spacing.

Documentation
Update relevant project documentation where necessary so that the published policy routes and legal/accessibility approach match the implemented application.

The policy documents must retain the required AI declaration in accordance with the project AI policy.

Tests
Add or update automated tests covering at least:

each policy route renders without authentication;
the footer exposes all three policy links;
each footer link navigates to the correct route;
policy pages render their expected primary heading;
keyboard access to footer links;
no obvious serious/critical Axe accessibility violations on the policy pages; and
representative mobile layout does not introduce horizontal overflow.
Existing application tests must continue to pass.

Acceptance Criteria
/privacy publicly renders the approved Stat’sTheGame Privacy Notice.
/terms publicly renders the approved Stat’sTheGame Terms of Use.
/accessibility publicly renders the approved Stat’sTheGame Accessibility Statement.
None of the three routes requires authentication.
The global footer links to all three policy pages.
statsthegame@gmail.com is available as the project contact.
No standalone Cookie Policy is added.
No unnecessary cookie-consent banner is introduced.
API-use terms are contained within the Terms of Use.
Dataset-use and attribution conditions are contained within the Terms of Use.
Responsible vulnerability disclosure is contained within the Terms of Use.
The Privacy Notice accurately describes the application's current use of browser local storage and absence of advertising/analytics tracking.
The Privacy Notice records the 90-day raw batch-upload retention period and retained provenance model.
The authenticated-account age requirement is stated as 18+.
Public-data reuse permits commercial use subject to attribution and applicable third-party rights.
The Accessibility Statement targets WCAG 2.2 AA without making an unsupported full-conformance claim.
Policy pages are responsive and keyboard accessible in Day Match and Night Match themes.
Automated routing, footer-navigation and accessibility tests are included.
Relevant documentation is updated.
Required AI attribution is retained.
Lint, type-check, relevant frontend tests and production build pass.
AI Declaration
The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

 NadavSundy added this to the Sprint 4 milestone 12 hours ago
 NadavSundy added the 
area: frontend
type: feature
 labels 12 hours ago
 NadavSundy self-assigned this 12 hours ago
 NadavSundy added this to the Sport-Analytics-Tool-Proj project 12 hours ago

Write
Preview
Leave a comment

Drop files or click here to upload.
area: frontend
type: feature
Sprint 4
Sport-Analytics-Tool-Proj

NadavSundy
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Dependencies
No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#798
 
Powered by Gitea
Version: 1.24.7 Page:
123ms
Template:
24ms

Also add depedencies etc

## Response:
9/30/2026, 5:27:17 AM · gpt-5-6-thinking

> **Planning final issues**
>
> I’m reviewing the rubric, existing issues, user feedback, and remaining sprint work. I’ll map unresolved requirements into final issues covering implementation, testing, documentation, stakeholder meetings, scrums, dependencies, and project completion.
>
> **Planned final issues**
>
> 
>
> **Searching the web**
>
> 
>
> **Testing GitHub Repository Connectivity**
>
>
> **Mapping final work**
>
> I’m aligning the milestone-four issues with every rubric area, avoiding duplicates with #797 and #798. I’m also including the AI integration, testing, documentation, meetings, scrum evidence, dependencies, and a clear project-end checklist.
>
> **Mapped final work**
>
> 
>
> **Tested GitHub repository connectivity**
>
> 
>
> Worked for 2m 27s

Yes - I would **not** just make a few random final-sprint feature issues. Sprint 4 is the **project-submission milestone**, and the brief says it is assessed **holistically across the whole development cycle**: whether the product works well, whether the methodology was consistently followed, and how the requirements/plans evolved. `project_briefs.pdf`

I also checked the actual final rubric. The big buckets are **Database 10%, API 25%, App 40%, and Misc 25%**, with App Features worth 10%, API Design 10%, Testing 8%, Integration 7%, and the other categories spread across accessibility, UX, performance, responsiveness, Git methodology, tools, etc. `project_briefs.pdf` `project_briefs.pdf`

So this is the Sprint 4 issue set I propose. **I have not made the script yet** - approve/change this first, then I’ll turn the approved set into one PowerShell bootstrap script that creates them, adds them to Sprint 4/project, and wires up dependencies.

### Keep the two already created

**#797 - `perf: achieve Lighthouse Performance score ≥90 across all frontend pages`**  
Dean owns this. Keep it. This directly targets **App Performance 5%**. I would make its final verification wait until the main frontend changes and new policy pages are in, otherwise Dean could get everything green and then have new routes/components invalidate the evidence.

**#798 - `Add Privacy Notice, Terms of Use and Accessibility Statement to public site`**  
Nadav owns this. Keep it. It supports accessibility, UX, professionalism and final release quality. One important dependency consideration: if Ben's AI integration sends any user/query/data information to an external AI provider, the privacy/terms wording must reflect that before #798 closes.

---

## Proposed new Sprint 4 issues

| # | Proposed issue | Why I think we need it |
|---|---|---|
| **1** | **`docs(process): record Sprint 4 planning, scope and ownership`** | This is the issue for the **long WhatsApp sprint-planning message you showed me**. Record the 12-day sprint, assignments, planned work, priorities, risks, dependencies and what was deliberately deferred. This is evidence that methodology/work tracking continued into Sprint 4 rather than stopping after Sprint 3. |
| **2** | **`feat(integration): add AI-powered analytics integration`** | **Ben's issue.** This captures “AI API - Ben wants to work on it”. It should be a proper external-service integration: server-side credentials, graceful failure, tests, documentation, no secret exposure, and outputs grounded in platform data. This is particularly useful because **Integration is 7%** in the final rubric. |
| **3** | **`ux(frontend): final UI/UX, aesthetics, accessibility and responsive polish`** | **Liora's “frontend redo” issue.** Route-by-route final polish covering visual consistency, navigation, forms, loading/error/empty states, keyboard access, focus, contrast, mobile/reflow, etc. This directly attacks **Accessibility 5%, Aesthetics 3%, UX 5%, Responsiveness 5%, and App Structure 5%** without duplicating Dean's Lighthouse issue. |
| **4** | **`fix(submissions): improve submission feedback and update JSON upload guidance/templates`** | Combines the two planning notes **“messages from submissions (things Liora said last night)” + “JSON template update”** because they are the same user workflow. Clear validation/rejection messages, usable copy/paste JSON guidance, templates matching the actual current contract, correct fixture/season/history behaviour, and tests. I prefer one coherent issue rather than two tiny overlapping ones. |
| **5** | **`test(user): run final structured user testing and integrate feedback`** | **Yes, absolutely include this.** Sprint 2 explicitly expected formal user-feedback collection and integration, and Sprint 3 again had User Feedback as 10%. `project_briefs.pdf` `project_briefs.pdf` Final round should preserve raw evidence, record findings, link each finding to a fix/issue or motivated deferral, and retest important fixes. |
| **6** | **`docs(process): record Sprint 4 scrums, stakeholder interactions and feedback decisions`** | This is the **specific issue you asked for for documenting stakeholder meetings and scrums**. Every scrum/client interaction gets date, attendees, discussion, feedback, decision/action, evidence and links to resulting issues/PRs. Include the final client review here too. Stakeholder evidence was explicitly assessed earlier, so we should not stop documenting it now. |
| **7** | **`test: final automated-test, coverage and regression audit`** | **This is how I would handle coverage.** I would *not* make another arbitrary “raise coverage to X%” issue because you already implemented coverage gating in Sprint 3. Instead: verify existing gates still work, record final backend/frontend/API/contracts/DB/E2E coverage, identify critical untested paths, add meaningful tests, and run full regression. Testing is **8% in the final rubric**, and automated testing was a repeated Sprint 2/3 criterion. `project_briefs.pdf` `project_briefs.pdf` |
| **8** | **`chore(api): final API design, architecture, availability and performance audit`** | The API alone is **25% of final marking**, so I do not want us relying on “we worked on it in Sprint 3”. Audit public availability, OpenAPI/API Explorer, versioning, endpoint design, pagination/filtering, errors, stable identifiers, auth/API keys/rate limits where applicable, production deployment and representative-load response times. The project-specific brief explicitly requires a usable external API and, at higher tiers, versioning, rate limits/quotas/caching. `sport_analytics.pdf` `sport_analytics.pdf` |
| **9** | **`chore(database): final database data, structure and deployment audit`** | The database is another **10%**. Verify the production schema/migrations, FKs/constraints/indexes, representative data, integrity, reproducible deployment, and that docs/ERD match reality. This also preserves the database-documentation work assessed in Sprint 2. |
| **10** | **`docs: final documentation, methodology and tooling audit`** | One final cleanup of the **public docs site + README + Getting Started + architecture + tech stack motivations + DB/API/testing docs + third-party-code documentation + methodology/Git workflow + CI/CD/tooling + AI declarations**. This preserves all the things that mattered in Sprints 1-3 rather than treating them as “done months ago”. |
| **11** | **`chore(requirements): verify final feature completeness and requirements traceability`** | This is important. Build a matrix of **course-wide requirements + Sport Analytics basic/intermediate/advanced requirements → implementation → tests → docs/evidence**. It should catch forgotten basics such as signup/sign-in/password reset/account deletion, accessibility/responsiveness, CI/CD, hand-written API, external integration and public docs site. Those are explicit course-wide requirements. `project_briefs.pdf` It should also verify the event-driven submission/statistics/API requirements from the sport brief. `sport_analytics.pdf` |
| **12** | **`release: final production deployment, rubric audit and project close-out`** | **Last issue closed.** Clean production deploy, frontend/API/worker/database/docs smoke tests, actual production URLs, final rubric evidence matrix, unresolved-issue review, Sprint 4 retrospective, final release/tag, evidence preservation, and confirm no critical known defects. This becomes your single final “are we actually ready to submit?” gate. |

### One optional issue I would **not** automatically create yet

**`feat(frontend): add personalization for authenticated users`**

Nadav's idea is perfectly reasonable, but right now it is vague and **not a direct rubric gap**. With only 12 days from Sprint 3 close to submission on 11 October, I would make this a **stretch issue only** after defining what “personalization” actually means. The official timeline gives Sprint 4 exactly that short final window. `project_briefs.pdf`

If you want it, I can include it as `priority: low` and make it non-blocking. Otherwise I would spend the time getting the already substantial product fully polished and evidenced.

---

## Dependency plan

I would wire them roughly like this rather than simply dumping 12 unrelated issues into the milestone:

**AI integration (#2)** → final **API audit (#8)**, and #798 must be rechecked against it if privacy/data-processing changes.

**Frontend polish (#3)** + **submission UX/templates (#4)** + **#798 policy pages** → **#797 Lighthouse final verification**.

**#2 + #3 + #4 + #797 + #798** → **final user testing (#5)** and **final stakeholder review/evidence (#6)**, because we want the final people testing the near-final product, not yesterday's version.

The **requirements audit (#11)** starts immediately and stays open while gaps are closed. It can create small bug issues if it finds real missing functionality.

The **testing/coverage audit (#7)** runs throughout, but cannot close until the feature work is merged.

The **documentation audit (#10)** should be finalised after the functional/API/database changes so the docs describe what actually shipped.

Then **#12 final production deployment/rubric audit** depends on **everything**, including existing #797 and #798. That is the last Sprint 4 issue.

### Why I'm keeping the process issues

Sprint 4 isn't isolated from the earlier rubrics. The brief explicitly says final marking looks at the project **over the entire development cycle**, including consistency of methodology and evolution of plans. `project_briefs.pdf` So I want the final sprint to visibly continue the habits you were marked on before: work tracker, stakeholder interaction, user feedback, testing, documentation, bug tracking and methodology.

And because I'm generating these issue descriptions for you, every generated description in the script will include the required AI declaration. The course policy requires documenting the tool, model and purpose of AI-assisted writing. `ai_policy_20_jul.pdf` The policy also gives the document-level declaration format. `ai_policy_20_jul.pdf` I'll use:

`AI Declaration: The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].`

**My proposed script therefore creates 12 new core issues, keeps #797/#798, and optionally creates the personalization stretch issue.** It will also add Sprint 4, project membership, labels, known assignees, and the dependency graph above.

If you're happy with this set, say **“yes, make the script”** - or tell me which one(s) you want added/removed/combined, and then I'll give you the copy-paste PowerShell script.

## Prompt:
9/30/2026, 5:32:50 AM

1. dont need to add ownership/./ we haventt done that for any other sprines
2. ( i think leave AI- ill ask ben what he wants and tell him to send to me/make his own issues)

add personlisation issue thing too

k-give me script..

## Response:
9/30/2026, 5:32:59 AM · gpt-5-6-thinking

> **Planning issue script**
>
> I’m preparing a PowerShell script for the existing repository and Sprint 4 milestone. I’m keeping the planning issue without ownership language, retaining the AI issue, and adding personalization plus the newly requested work items.
>
> **Planned an issue script**
>
> 
>
> **Structuring issue backlog**
>
> I’m organizing twelve new Sprint 4 issues around documentation, testing, API and database audits, requirements traceability, production closeout, and personalization. I’m also preserving the existing issues and planning dependency links after creation.
>
> **Structured issue backlog**
>
> 
>
> **Refining script behavior**
>
> I’m designing the script to reuse existing labels and milestone metadata, create issues in sequence, capture their numbers, and then add dependency relationships. I’m checking the repository’s established conventions so the result remains compatible.
>
> **Refined script behavior**
>
> 
>
> **Finalizing backlog automation**
>
> I’m preparing a self-contained PowerShell script that creates the twelve issues, applies Sprint 4 metadata, preserves existing issues 797 and 798, and adds dependencies without assigning ownership.
>
> **Finalized backlog automation**
>
> 
>
> **Adding safeguards**
>
> I’m including token validation, metadata lookup, duplicate-title checks, dry-run support, and clear output. The script will avoid assignments, reuse existing issues when possible, and only create missing backlog items.
>
> **Added safeguards**
>
> 
>
> **Assembling automation**
>
> I’m assembling the final script with duplicate detection, metadata reuse, dry-run support, and dependency handling. It will keep existing issues 797 and 798, create only missing items, and avoid assigning ownership.
>
> **Documenting backlog automation**
>
> I’m finalizing a PowerShell script that preserves existing Sprint 4 issues, creates missing work items, applies shared metadata, and links dependencies while leaving ownership unassigned.
>
> **Assembled and documented backlog automation**
>
> 
>
> **Searched 1 website**
>
> 
>
> Worked for 3m 4s

Yep - adjusted:

- **No ownership/assignee stuff.**
- **No AI/API feature issue** - Ben can define his own.
- **Personalisation added** as a lightweight authenticated-user feature.
- Sprint-planning issue stays, but it records **planning/scope/decisions**, not ownership.
- Dependencies are included.
- It uses **#797 and #798 as the two existing Sprint 4 issues**, rather than recreating them.
- The final audit issues cover the actual Milestone 4 database/API/app/testing/integration/tooling areas. `project_briefs.pdf`
- I kept the AI declaration on the generated issue descriptions because the course policy requires tool/model attribution for AI-assisted writing. `ai_policy_20_jul.pdf` `ai_policy_20_jul.pdf`

Save this as **`create-sprint4-issues.ps1`**.

```powershell
param(
    [string]$Token = $env:GITEA_TOKEN,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ============================================================
# Sprint 4 / Final Submission issue bootstrap
# Repository: git-push-pray/Sport-Analytics-Tool
# Existing Sprint 4 issues:
#   #797 - Lighthouse/frontend performance
#   #798 - Privacy/Terms/Accessibility
#
# This script:
#   - creates the remaining Sprint 4 issues
#   - adds them to Sprint 4
#   - adds them to Sport-Analytics-Tool-Proj
#   - applies existing labels where available
#   - DOES NOT assign issues to anyone
#   - adds issue dependencies
#   - safely reuses an issue if an exact-title match already exists
# ============================================================

$BaseUrl        = "https://sdp.ms.wits.ac.za/api/v1"
$Owner          = "git-push-pray"
$Repo           = "Sport-Analytics-Tool"
$MilestoneTitle = "Sprint 4"
$ProjectTitle   = "Sport-Analytics-Tool-Proj"

if ([string]::IsNullOrWhiteSpace($Token)) {
    throw @"
No Gitea token was found.

Set it first, for example:

    `$env:GITEA_TOKEN = "YOUR_TOKEN"

Then run:

    .\create-sprint4-issues.ps1 -DryRun

and, once happy:

    .\create-sprint4-issues.ps1
"@
}

$Headers = @{
    Authorization = "token $Token"
    Accept        = "application/json"
}

function Invoke-Gitea {
    param(
        [Parameter(Mandatory)]
        [ValidateSet("GET", "POST", "PATCH", "DELETE")]
        [string]$Method,

        [Parameter(Mandatory)]
        [string]$Path,

        [object]$Body = $null
    )

    $params = @{
        Method      = $Method
        Uri         = "$BaseUrl$Path"
        Headers     = $Headers
        ContentType = "application/json; charset=utf-8"
    }

    if ($null -ne $Body) {
        $params.Body = $Body | ConvertTo-Json -Depth 20
    }

    return Invoke-RestMethod @params
}

function Get-LabelIds {
    param(
        [string[]]$Names
    )

    $ids = @()

    foreach ($name in $Names) {
        if ($script:LabelMap.ContainsKey($name)) {
            $ids += [int64]$script:LabelMap[$name]
        }
        else {
            Write-Warning "Label '$name' does not exist. Issue will be created without that label."
        }
    }

    return @($ids)
}

function Find-IssueByExactTitle {
    param(
        [Parameter(Mandatory)]
        [string]$Title
    )

    $encoded = [uri]::EscapeDataString($Title)

    $results = @(
        Invoke-Gitea `
            -Method GET `
            -Path "/repos/$Owner/$Repo/issues?state=all&type=issues&q=$encoded&limit=50"
    )

    return $results |
        Where-Object { $_.title -eq $Title } |
        Select-Object -First 1
}

function Add-IssueDependency {
    param(
        [Parameter(Mandatory)]
        [int]$IssueNumber,

        [Parameter(Mandatory)]
        [int]$DependsOnNumber
    )

    if ($IssueNumber -eq $DependsOnNumber) {
        return
    }

    $existingDependencies = @(
        Invoke-Gitea `
            -Method GET `
            -Path "/repos/$Owner/$Repo/issues/$IssueNumber/dependencies"
    )

    $alreadyExists = $existingDependencies |
        Where-Object { [int]$_.number -eq $DependsOnNumber } |
        Select-Object -First 1

    if ($alreadyExists) {
        Write-Host "  dependency already exists: #$IssueNumber -> #$DependsOnNumber"
        return
    }

    $body = @{
        owner = $Owner
        repo  = $Repo
        index = $DependsOnNumber
    }

    [void](Invoke-Gitea `
        -Method POST `
        -Path "/repos/$Owner/$Repo/issues/$IssueNumber/dependencies" `
        -Body $body)

    Write-Host "  added dependency: #$IssueNumber depends on #$DependsOnNumber"
}

# ------------------------------------------------------------
# Verify authentication
# ------------------------------------------------------------

$me = Invoke-Gitea -Method GET -Path "/user"
Write-Host ""
Write-Host "Sprint 4 issue bootstrap"
Write-Host "Repository: $Owner/$Repo"
Write-Host "Authenticated as: $($me.login)"
Write-Host "Dry run: $DryRun"
Write-Host ""

# ------------------------------------------------------------
# Resolve Sprint 4 milestone
# ------------------------------------------------------------

$milestones = @(
    Invoke-Gitea `
        -Method GET `
        -Path "/repos/$Owner/$Repo/milestones?state=open&limit=100"
)

$milestone = $milestones |
    Where-Object { $_.title -eq $MilestoneTitle } |
    Select-Object -First 1

if (-not $milestone) {
    throw "Could not find open milestone '$MilestoneTitle'."
}

Write-Host "Milestone: $($milestone.title) [id=$($milestone.id)]"

# ------------------------------------------------------------
# Resolve project
# ------------------------------------------------------------

$projects = @(
    Invoke-Gitea `
        -Method GET `
        -Path "/repos/$Owner/$Repo/projects?state=open&limit=100"
)

$project = $projects |
    Where-Object { $_.title -eq $ProjectTitle } |
    Select-Object -First 1

if (-not $project) {
    throw "Could not find project '$ProjectTitle'."
}

Write-Host "Project: $($project.title) [id=$($project.id)]"

# ------------------------------------------------------------
# Load repository labels
# ------------------------------------------------------------

$labels = @(
    Invoke-Gitea `
        -Method GET `
        -Path "/repos/$Owner/$Repo/labels?limit=100"
)

$script:LabelMap = @{}

foreach ($label in $labels) {
    $script:LabelMap[$label.name] = [int64]$label.id
}

Write-Host "Loaded $($labels.Count) repository labels."
Write-Host ""

# ------------------------------------------------------------
# Verify the two Sprint 4 issues already created
# ------------------------------------------------------------

foreach ($existingNumber in @(797, 798)) {
    try {
        $existing = Invoke-Gitea `
            -Method GET `
            -Path "/repos/$Owner/$Repo/issues/$existingNumber"

        Write-Host "Found existing #$existingNumber - $($existing.title)"
    }
    catch {
        throw "Expected existing Sprint 4 issue #$existingNumber was not found."
    }
}

Write-Host ""

# ============================================================
# ISSUE DEFINITIONS
# ============================================================

$issues = @(

    # --------------------------------------------------------
    # S4-PLAN
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "planning"
        Title  = "docs(process): record Sprint 4 planning and final submission scope"
        Labels = @(
            "area: documentation"
        )
        Body   = @'
## Description

Record the Sprint 4 planning decisions and final-submission scope in the repository so that the final sprint has the same traceable methodology evidence as the earlier development cycle.

Sprint 4 is the final stabilisation and submission sprint. The planning record should capture the agreed work for the period leading to the 11 October 2026 submission rather than leaving the plan only in WhatsApp or informal discussion.

The record should reflect the decisions made during Sprint 4 planning, including the work already represented by:

- #797 frontend/Lighthouse performance;
- #798 Privacy Notice, Terms of Use and Accessibility Statement;
- final frontend UX and responsive polish;
- submission feedback and JSON upload/template improvements;
- authenticated-user personalisation;
- final user testing and feedback integration;
- final automated testing and coverage verification;
- final API and database audits;
- documentation review;
- Sprint 4 scrum and stakeholder evidence; and
- final production/rubric close-out.

Any scope added, changed or deliberately deferred during Sprint 4 should be recorded with a short reason.

## Scope

Create or update the Sprint 4 planning documentation to record:

- sprint goal;
- final submission date;
- work selected for the sprint;
- links to the relevant Sprint 4 issues;
- important dependencies;
- known risks;
- carried-over work where applicable;
- planned final validation activities;
- scope changes made during the sprint; and
- motivated deferrals where work is not completed.

This issue is for documenting the plan and evolution of the sprint. It does not need to assign or document individual ownership.

## Acceptance Criteria

- Sprint 4 planning is recorded in the repository.
- The document links to the Sprint 4 milestone/issues.
- #797 and #798 are included as existing Sprint 4 work.
- Final testing, user feedback, stakeholder interaction and submission preparation are represented.
- Any important carried-over work is identified.
- Scope changes or deferrals made during the sprint can be traced to a reason.
- The documentation matches the work actually being tracked in Gitea.
- Documentation build/checks pass.
- Required AI attribution is included.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-FRONTEND
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "frontendPolish"
        Title  = "ux(frontend): final UI/UX, accessibility and responsive polish"
        Labels = @(
            "area: frontend",
            "priority: high"
        )
        Body   = @'
## Description

Perform a final route-by-route frontend quality pass before project submission.

The purpose of this issue is to make the application feel consistent, understandable and production-ready across normal public and authenticated workflows.

This is primarily a UI/UX, accessibility, responsiveness and visual-consistency issue.

Performance optimisation belongs to #797 and should not be duplicated here.

## Scope

Review all normal user-facing routes, including applicable:

- public pages;
- authentication flows;
- statistics/analytics pages;
- competition, fixture and player/team views;
- submission workflows;
- review/admin workflows;
- API Explorer;
- account/profile areas;
- error/not-found states; and
- new policy pages from #798.

Review both Day Match and Night Match themes.

Check:

- navigation consistency;
- page hierarchy and headings;
- spacing and visual rhythm;
- typography;
- buttons and interactive controls;
- loading states;
- empty states;
- error states;
- success/status feedback;
- forms and validation feedback;
- focus visibility;
- keyboard operation;
- semantic structure;
- colour contrast;
- colour-only meaning;
- mobile layouts;
- tablet layouts;
- browser zoom/reflow;
- horizontal overflow;
- chart/table readability; and
- consistency between related workflows.

Do not redesign functioning pages merely for the sake of changing them. Prioritise observable usability, accessibility and consistency problems.

## Acceptance Criteria

- All normal user-facing frontend routes are reviewed.
- Major visual inconsistencies are corrected.
- Navigation and common page structure are consistent.
- Loading, empty, error and success states are clear where applicable.
- Forms expose understandable validation and error feedback.
- Keyboard navigation works through primary workflows.
- Visible focus is preserved.
- No known serious/critical Axe violations remain on reviewed pages.
- Representative mobile widths do not introduce unintended horizontal overflow.
- Content remains usable with increased browser zoom.
- Both application themes remain usable.
- Required functionality is not removed.
- Existing frontend unit/integration/E2E tests pass.
- Relevant new regression tests are added for fixes introduced here.
- Important before/after evidence is included in the PR.
- Any remaining known UX/accessibility limitations are documented.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-SUBMISSIONS
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "submissionUx"
        Title  = "fix(submissions): improve submission feedback and JSON upload guidance"
        Labels = @(
            "area: frontend",
            "area: backend",
            "priority: high"
        )
        Body   = @'
## Description

Perform a final usability and correctness pass over the submission workflow, particularly the issues observed during recent manual testing around upload choices, JSON input/templates and rejection feedback.

The UI should only offer submission options that are actually supported by the underlying contract and should clearly explain what the submitter is expected to provide.

When a submission fails validation or reference resolution, the user should receive useful information that helps them correct the data rather than a generic failure.

## Scope

Review the end-to-end submission flow for the supported submission modes.

Pay particular attention to:

- Advanced JSON upload/paste behaviour;
- whether the UI presents fixture, competition, season or historical/back-catalogue options correctly;
- JSON templates/examples;
- fixture and season fields;
- multi-season support where applicable;
- staging and review behaviour;
- validation errors;
- reference-resolution failures;
- batch rejection messages;
- review status information;
- resubmission guidance; and
- consistency between the frontend guidance and the current contracts/backend behaviour.

Templates and examples must represent data that is valid against the current contract rather than stale documentation.

## Acceptance Criteria

- Every visible submission mode maps to a supported backend workflow.
- Misleading or unsupported submission options are removed or corrected.
- JSON template/example content matches the current contract.
- A user can clearly tell whether they are submitting a fixture, batch, season or other supported package type.
- Required and optional fields are explained accurately.
- Validation failures provide actionable feedback.
- Reference-resolution failures expose useful information about unresolved references.
- Error messages do not silently hide useful server information.
- Review/rejection status is understandable to the submitter.
- Successful submission behaviour remains unchanged where no fix is required.
- Relevant frontend/backend/contracts tests are added or updated.
- At least one valid and one invalid representative JSON submission are manually verified.
- Existing submission and review tests pass.
- User-facing documentation is updated where necessary.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-PERSONALISATION
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "personalization"
        Title  = "feat(frontend): add lightweight personalisation for authenticated users"
        Labels = @(
            "area: frontend",
            "type: feature"
        )
        Body   = @'
## Description

Add a small, useful layer of personalisation for authenticated users so that repeat use of Stat'sTheGame feels less generic.

This should remain a lightweight final-sprint feature rather than becoming a new account/preferences subsystem.

The personalisation must improve the user's experience beyond simply displaying their email address.

## Scope

Implement one or more small user-scoped preferences that make repeat use more convenient.

Suitable examples include:

- remembering a preferred/default competition;
- remembering a preferred/default season;
- restoring a useful last-selected analytics context;
- choosing an appropriate authenticated landing context; or
- another similarly small preference that fits the existing product.

The implementation may use an appropriate existing persistence mechanism, but it must remain scoped to the authenticated user.

Anonymous users must continue to receive sensible defaults.

Do not introduce behavioural profiling, advertising personalisation or unnecessary collection of personal information.

If this changes browser storage, profile metadata or other stored user information, the implementation must be reflected in the Privacy Notice work in #798.

## Acceptance Criteria

- At least one useful preference is available to authenticated users.
- The feature provides value beyond merely greeting the user by name/email.
- The preference persists appropriately between relevant sessions.
- User-specific preferences are not exposed across accounts.
- Anonymous users continue to receive sensible default behaviour.
- The feature does not interfere with authentication/session handling.
- A user can return to a valid default if a previously stored competition/season/resource no longer exists.
- Both application themes remain supported.
- Representative mobile layouts remain usable.
- Relevant unit/integration/E2E tests are added.
- Existing frontend tests pass.
- Any new user information or browser storage introduced by this feature is documented and reflected in #798 where applicable.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-USER-TESTING
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "userTesting"
        Title  = "test(user): run final structured user testing and integrate feedback"
        Labels = @(
            "area: testing",
            "priority: high"
        )
        Body   = @'
## Description

Run a final structured user-testing round against the near-final production-equivalent application.

Earlier user-testing infrastructure and documentation should be reused rather than inventing a new informal process for Sprint 4.

The goal is to collect evidence about the final product, evaluate the feedback, implement important fixes where practical, and explicitly record any feedback that is not implemented.

## Scope

Use the existing user-testing protocol, facilitator guidance, task bank and evidence structure.

The final sessions should exercise representative workflows such as:

- discovering statistics as a public user;
- navigating competitions/fixtures/players or teams;
- using analytics/statistics views;
- authentication where relevant;
- submission workflows for an approved submitter;
- review/admin workflows where appropriate; and
- API discovery/API Explorer where suitable for the participant.

Capture:

- session date;
- participant/user type;
- tasks attempted;
- observed difficulties;
- participant feedback;
- severity/importance;
- resulting issue or fix;
- decision where feedback is not implemented; and
- retest result for important fixes.

## Acceptance Criteria

- A final structured user-testing round is completed.
- At least 3 completed final-stage user-testing sessions are recorded.
- More than one relevant user/workflow type is represented where practical.
- The existing formal feedback process is used.
- Raw/session evidence is retained in the repository's established evidence structure.
- Findings are evaluated rather than merely listed.
- Actionable findings are linked to fixes/issues.
- Important fixes are retested where practical.
- Feedback that is deliberately not implemented has a recorded reason.
- A final summary identifies recurring findings and resulting changes.
- Documentation clearly distinguishes Sprint 4 testing from earlier rounds.
- Required AI attribution is retained in generated/edited documentation.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-INTERACTIONS
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "interactions"
        Title  = "docs(process): record Sprint 4 scrums and stakeholder interactions"
        Labels = @(
            "area: documentation"
        )
        Body   = @'
## Description

Maintain complete evidence of Scrum/process activity and stakeholder interaction throughout Sprint 4.

The final sprint should continue the same traceable project methodology used earlier in the semester rather than leaving meetings, WhatsApp discussions and decisions outside the repository.

This issue covers both internal Sprint 4 Scrum evidence and client/stakeholder interaction.

## Scope

Record Sprint 4 interactions using the project's existing documentation/evidence conventions.

For each relevant interaction, record where applicable:

- date;
- interaction type;
- attendees/participants;
- purpose;
- important discussion points;
- stakeholder feedback;
- questions asked;
- decisions made;
- resulting actions;
- links to related issues/PRs; and
- follow-up/result.

Async stakeholder interaction such as WhatsApp may be documented as an interaction where it is substantive.

Do not manufacture meetings or unnecessary ceremony purely for evidence.

## Acceptance Criteria

- Sprint 4 Scrum/process interactions are documented.
- Sprint 4 stakeholder/client interactions are documented.
- Substantive WhatsApp/async stakeholder feedback is captured where relevant.
- Feedback is linked to resulting decisions/issues where applicable.
- The evidence shows whether feedback was implemented, deferred or rejected with a reason.
- A final stakeholder review/check-in is recorded before submission where practical.
- Documentation dates and content accurately reflect interactions that actually occurred.
- Relevant Sprint 4 evidence is linked from the project's process documentation.
- No important final-sprint stakeholder decision exists only in chat without repository evidence.
- Required AI attribution is retained where documentation was AI-assisted.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-TESTING
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "testing"
        Title  = "test: final automated testing, coverage and regression audit"
        Labels = @(
            "area: testing",
            "priority: high"
        )
        Body   = @'
## Description

Perform the final automated-testing, code-coverage and regression audit for the submitted product.

Sprint 3 already introduced coverage reporting/gating. Sprint 4 should verify that the existing process still operates correctly and improve meaningful test gaps rather than replacing the existing policy with an arbitrary new coverage percentage.

This issue is the final automated quality gate after Sprint 4 feature and stabilisation work.

## Scope

Run and review the complete applicable automated test portfolio, including:

- backend unit tests;
- frontend unit/component/integration tests;
- API tests;
- contract tests;
- database integration tests;
- worker/batch-processing tests;
- E2E tests;
- deployment/infrastructure tests; and
- production-build checks.

Review current coverage by package/application and identify important untested behaviour, particularly around code added or changed during Sprint 4.

Verify that existing coverage thresholds/gates have not been weakened.

## Acceptance Criteria

- The final automated test suites are inventoried.
- All required suites pass on the final candidate.
- Existing coverage gates remain active.
- Coverage thresholds are not reduced simply to make CI pass.
- Final coverage results are recorded for relevant packages/applications.
- Significant newly introduced or high-risk untested paths are identified.
- Meaningful tests are added for material gaps found during the audit.
- New Sprint 4 functionality has appropriate automated regression coverage.
- E2E coverage includes the most important public/authenticated workflows.
- Submission and review workflows remain covered.
- API contract/deployment checks pass.
- Database integration checks pass.
- CI clearly fails when a required quality gate fails.
- No known flaky/failing test is silently ignored without documented motivation.
- Final test/coverage evidence is stored or linked from the project documentation.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-API
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "apiAudit"
        Title  = "chore(api): final API design, architecture, availability and performance audit"
        Labels = @(
            "area: api",
            "area: backend",
            "priority: high"
        )
        Body   = @'
## Description

Perform a final audit of the public API against the implemented Sport Analytics requirements and the Milestone 4 API criteria.

The API is a core product surface and should be verified independently of whether individual API features were completed in earlier sprints.

The audit should test the deployed API rather than relying only on local behaviour.

## Scope

Review:

- production API availability;
- correct production base URLs;
- OpenAPI specification availability;
- public API Explorer;
- endpoint architecture;
- resource naming;
- stable identifiers;
- filtering;
- pagination;
- error responses;
- validation;
- statistics endpoints;
- fixtures/events access;
- authentication/authorisation where applicable;
- API keys;
- rate limits/quotas where implemented;
- versioning;
- caching where implemented;
- deprecation behaviour where implemented;
- representative response times; and
- consistency between documentation and deployed behaviour.

Use representative production-like data when measuring behaviour.

## Acceptance Criteria

- The deployed API is externally reachable.
- `/openapi.yaml` is reachable at the intended backend origin.
- The API Explorer loads the deployed specification successfully.
- Documented production API URLs are correct.
- Public endpoints return API responses rather than frontend HTML.
- Core resources and statistics required by the implemented product are available.
- Filtering and pagination operate correctly where documented.
- Error responses are structured and useful.
- Stable identifiers remain resolvable through expected workflows.
- Authentication/API-key behaviour matches the documentation.
- Implemented rate-limit/quota/versioning behaviour is verified.
- Representative API performance is measured and recorded.
- Observed performance is compared with the project's documented response-time expectations.
- Important API regressions discovered during the audit are fixed or logged.
- API/OpenAPI automated tests pass.
- Relevant API architecture/design documentation matches the final implementation.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-DATABASE
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "databaseAudit"
        Title  = "chore(database): final database data, structure and deployment audit"
        Labels = @(
            "area: backend",
            "area: documentation",
            "priority: high"
        )
        Body   = @'
## Description

Perform a final audit of the production database design, data integrity, deployment and documentation.

The final submission should demonstrate that the database is intentionally structured for the Sport Analytics workload and that the deployed schema matches what the documentation claims.

## Scope

Review:

- production PostgreSQL deployment;
- migrations;
- schema structure;
- primary and foreign keys;
- unique constraints;
- referential integrity;
- indexes;
- event ordering/data relationships;
- fixture/competition/season relationships;
- submissions and provenance;
- review/audit history;
- statistics/derived-data storage where applicable;
- representative dataset integrity;
- deployment configuration;
- test database reproducibility; and
- database documentation/ERD.

Also verify that indexes and schema decisions support the actual API/query patterns used by the application.

## Acceptance Criteria

- Production database deployment is documented and verified.
- Migrations recreate/upgrade the expected schema reliably.
- Schema documentation matches the final database.
- ERD/schema diagrams are current.
- Important relationships and constraints are enforced.
- Duplicate/inconsistent data is prevented where the model requires it.
- Relevant indexes exist for important query patterns.
- Representative production-like data can be loaded and queried successfully.
- Submission/provenance relationships remain traceable.
- Database integration tests pass.
- Any schema/index change introduced by this issue has migration coverage.
- Database design decisions are motivated in documentation.
- No known critical data-integrity issue remains unresolved at submission.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-DOCS
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "docsAudit"
        Title  = "docs: final documentation, methodology and tooling audit"
        Labels = @(
            "area: documentation",
            "priority: high"
        )
        Body   = @'
## Description

Perform the final documentation audit across the repository and public documentation website.

Documentation accumulated across Sprints 1-3 should be checked against the application that will actually be submitted so that stale architecture, deployment, testing or workflow information is not presented as current.

This issue also ensures continued evidence of project methodology, Git practices, third-party tooling and AI usage.

## Scope

Review at least:

- repository README;
- Getting Started/development guides;
- architecture documentation;
- frontend/backend/worker structure;
- technology stack and motivations;
- API documentation;
- OpenAPI/API Explorer documentation;
- database schema/deployment/motivation;
- testing strategy;
- code coverage policy;
- user-testing process;
- CI/CD and deployment;
- production environment URLs;
- third-party code/dependencies and motivations;
- Git methodology;
- project methodology;
- tools used during development;
- AI usage/attribution;
- security/authentication;
- submission pipeline;
- dataset/statistics documentation; and
- public policy routes from #798.

Check the public documentation site itself for broken navigation or stale pages.

## Acceptance Criteria

- Public documentation builds and deploys successfully.
- README accurately describes the final repository/project.
- Getting Started instructions remain usable.
- Architecture docs match the final architecture.
- Technology choices are listed and meaningfully motivated.
- API documentation matches deployed API behaviour.
- Database documentation matches the final schema/deployment.
- Testing and coverage documentation matches actual CI behaviour.
- User-testing process/evidence is discoverable.
- CI/CD and deployment documentation matches final environments.
- Third-party code/tools are documented and motivated where required.
- Git/project methodology documentation reflects actual practice.
- Required AI usage declarations are complete and consistent with the course policy.
- Production links are correct.
- Broken internal documentation links are corrected.
- Obviously stale or contradictory documentation is corrected or clearly archived.
- Documentation site is ready for marker use without requiring repository knowledge.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-TRACEABILITY
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "requirements"
        Title  = "chore(requirements): verify final requirements and rubric traceability"
        Labels = @(
            "area: documentation",
            "priority: high"
        )
        Body   = @'
## Description

Create a final traceability audit showing where the project's requirements are implemented, tested and documented.

The final submission is assessed holistically, so features completed in earlier sprints should not simply be assumed to remain correct.

The purpose of this issue is to expose any forgotten requirement before submission and provide a clear evidence map for final review.

## Scope

Create a requirements/evidence matrix covering:

### Course-wide requirements

- version control;
- responsiveness;
- accessibility;
- CI/CD;
- non-monolithic frontend/backend architecture;
- hand-written API;
- authentication;
- sign up;
- sign in;
- password reset;
- account deletion;
- external integration;
- public documentation website.

### Sport Analytics requirements

Audit applicable Basic, Intermediate and Advanced requirements, including:

- event-derived data/statistics;
- approved submitters;
- scoped submissions;
- validation;
- traceability/provenance;
- fixtures/events/statistics API;
- stable identifiers;
- filtering/pagination;
- data export;
- batch/season submission;
- staging;
- review/publication;
- idempotency/resume behaviour;
- correction history;
- aggregate statistics;
- incremental recomputation;
- reference-result validation;
- representative-scale operation;
- API versioning;
- API keys;
- rate limits/quotas;
- caching;
- reproducible dataset releases;
- advanced statistics/definitions where implemented;
- live/disordered events where implemented;
- historical/as-of/change behaviour where implemented;
- deprecation/contract behaviour where implemented.

### Final rubric

Map the final Milestone 4 criteria to evidence for:

- database;
- API;
- application;
- Git methodology;
- integration;
- testing; and
- tools.

## Acceptance Criteria

- A final requirements/rubric traceability matrix exists.
- Every listed requirement has a status.
- Statuses distinguish implemented, partial, not implemented and not applicable.
- Implemented items link to meaningful code/test/docs/evidence.
- Partial or missing requirements are not falsely marked complete.
- Material gaps discovered during the audit are logged as issues or explicitly motivated.
- Course-wide requirements are all checked.
- Sport Analytics tier requirements are checked against the actual final implementation.
- Milestone 4 rubric criteria are mapped to evidence.
- The matrix is updated immediately before final submission.
- Markers can use the matrix to find the relevant evidence quickly.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    },

# --------------------------------------------------------
    # S4-RELEASE
    # --------------------------------------------------------
    [PSCustomObject]@{
        Key    = "release"
        Title  = "release: final production deployment, rubric audit and project close-out"
        Labels = @(
            "area: infrastructure",
            "area: testing",
            "priority: high"
        )
        Body   = @'
## Description

Perform the final production deployment and project close-out for the COMS3011A submission.

This issue is the final Sprint 4 gate and should only close when the application, API, worker, database and documentation represent the version that will actually be submitted.

It is not a substitute for the detailed API/database/testing/documentation issues. It is the final verification that those pieces work together.

## Scope

Complete a final release candidate and verify:

- frontend deployment;
- backend/API deployment;
- worker deployment;
- database connectivity;
- documentation deployment;
- production configuration/secrets;
- anonymous workflows;
- authenticated workflows;
- submitter workflows;
- admin/reviewer workflows;
- statistics/analytics workflows;
- API/OpenAPI/API Explorer;
- final tests;
- final rubric evidence;
- known defects;
- final release/tag; and
- Sprint 4 close-out/retrospective.

## Acceptance Criteria

- Default branch contains the intended final submission candidate.
- Required CI jobs are green.
- Frontend production URL loads successfully.
- Backend/API production URL loads successfully.
- Worker/dependent background processing is operational.
- Production database connectivity is healthy.
- Public documentation site is available.
- Authentication works in the deployed environment.
- Core public statistics workflows pass smoke testing.
- Submission and review workflows pass final smoke testing.
- API/OpenAPI/API Explorer pass final smoke testing.
- No known critical/severe regression remains unresolved.
- Remaining known non-critical limitations are documented.
- Final Milestone 4 rubric/evidence matrix is reviewed.
- Sprint 4 user/stakeholder/testing evidence is present.
- Final documentation describes the system that is actually deployed.
- A final release/tag is created for the submitted version.
- Sprint 4 retrospective/close-out is recorded.
- Submission evidence identifies the exact commit/tag deployed.

## Definition of Done

This is the last Sprint 4 issue to close.

The project is ready for submission when the released version is deployed, tested, documented, traceable to evidence and no unresolved issue prevents normal use of a required workflow.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
'@
    }
)

# ============================================================
# CREATE / REUSE ISSUES
# ============================================================

$IssueNumbers = @{
    perf     = 797
    policies = 798
}

Write-Host "Issues to create/reuse: $($issues.Count)"
Write-Host ""

foreach ($spec in $issues) {

    Write-Host "[$($spec.Key)] $($spec.Title)"

    if ($DryRun) {
        Write-Host "  labels: $($spec.Labels -join ', ')"
        Write-Host "  would add to milestone '$MilestoneTitle'"
        Write-Host "  would add to project '$ProjectTitle'"
        Write-Host ""
        continue
    }

    $existing = Find-IssueByExactTitle -Title $spec.Title

    if ($existing) {
        Write-Host "  already exists as #$($existing.number) - reusing"
        $IssueNumbers[$spec.Key] = [int]$existing.number
        Write-Host ""
        continue
    }

    $labelIds = @(Get-LabelIds -Names $spec.Labels)

    $payload = @{
        title     = $spec.Title
        body      = $spec.Body
        labels    = $labelIds
        milestone = [int64]$milestone.id
        projects  = @([int64]$project.id)
    }

    $created = Invoke-Gitea `
        -Method POST `
        -Path "/repos/$Owner/$Repo/issues" `
        -Body $payload

    $IssueNumbers[$spec.Key] = [int]$created.number

    Write-Host "  created #$($created.number)"
    Write-Host ""
}

# ============================================================
# DEPENDENCIES
#
# Direction:
#     A -> B
# means:
#     A DEPENDS ON B
# ============================================================

if ($DryRun) {

    Write-Host ""
    Write-Host "Dry run complete."
    Write-Host "No issues or dependencies were created."
    Write-Host ""
    Write-Host "Run without -DryRun when ready:"
    Write-Host "  .\create-sprint4-issues.ps1"
    exit 0
}

Write-Host ""
Write-Host "Adding dependencies..."
Write-Host ""

# ------------------------------------------------------------
# #798 policy wording must reflect personalisation/storage.
# ------------------------------------------------------------

Add-IssueDependency `
    -IssueNumber $IssueNumbers["policies"] `
    -DependsOnNumber $IssueNumbers["personalization"]

# ------------------------------------------------------------
# #797 final Lighthouse evidence should run after frontend
# routes/features have stabilised.
# ------------------------------------------------------------

Add-IssueDependency `
    -IssueNumber $IssueNumbers["perf"] `
    -DependsOnNumber $IssueNumbers["frontendPolish"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["perf"] `
    -DependsOnNumber $IssueNumbers["submissionUx"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["perf"] `
    -DependsOnNumber $IssueNumbers["personalization"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["perf"] `
    -DependsOnNumber $IssueNumbers["policies"]

# ------------------------------------------------------------
# Final user testing should use the near-final functional UX.
# ------------------------------------------------------------

Add-IssueDependency `
    -IssueNumber $IssueNumbers["userTesting"] `
    -DependsOnNumber $IssueNumbers["frontendPolish"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["userTesting"] `
    -DependsOnNumber $IssueNumbers["submissionUx"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["userTesting"] `
    -DependsOnNumber $IssueNumbers["personalization"]

# ------------------------------------------------------------
# Final automated testing/coverage closes after main code work.
# ------------------------------------------------------------

Add-IssueDependency `
    -IssueNumber $IssueNumbers["testing"] `
    -DependsOnNumber $IssueNumbers["perf"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["testing"] `
    -DependsOnNumber $IssueNumbers["policies"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["testing"] `
    -DependsOnNumber $IssueNumbers["apiAudit"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["testing"] `
    -DependsOnNumber $IssueNumbers["databaseAudit"]

# ------------------------------------------------------------
# Final docs should describe the final product and evidence.
# ------------------------------------------------------------

Add-IssueDependency `
    -IssueNumber $IssueNumbers["docsAudit"] `
    -DependsOnNumber $IssueNumbers["policies"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["docsAudit"] `
    -DependsOnNumber $IssueNumbers["personalization"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["docsAudit"] `
    -DependsOnNumber $IssueNumbers["submissionUx"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["docsAudit"] `
    -DependsOnNumber $IssueNumbers["apiAudit"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["docsAudit"] `
    -DependsOnNumber $IssueNumbers["databaseAudit"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["docsAudit"] `
    -DependsOnNumber $IssueNumbers["interactions"]

# ------------------------------------------------------------
# Final release is the ultimate Sprint 4 gate.
# ------------------------------------------------------------

Add-IssueDependency `
    -IssueNumber $IssueNumbers["release"] `
    -DependsOnNumber $IssueNumbers["planning"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["release"] `
    -DependsOnNumber $IssueNumbers["perf"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["release"] `
    -DependsOnNumber $IssueNumbers["policies"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["release"] `
    -DependsOnNumber $IssueNumbers["userTesting"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["release"] `
    -DependsOnNumber $IssueNumbers["interactions"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["release"] `
    -DependsOnNumber $IssueNumbers["testing"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["release"] `
    -DependsOnNumber $IssueNumbers["docsAudit"]

Add-IssueDependency `
    -IssueNumber $IssueNumbers["release"] `
    -DependsOnNumber $IssueNumbers["requirements"]

# ============================================================
# SUMMARY
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host "SPRINT 4 ISSUE BOOTSTRAP COMPLETE"
Write-Host "============================================================"
Write-Host ""
Write-Host "Existing:"
Write-Host "  #797  Lighthouse/frontend performance"
Write-Host "  #798  Privacy / Terms / Accessibility"
Write-Host ""
Write-Host "Created/reused:"

foreach ($spec in $issues) {
    $number = $IssueNumbers[$spec.Key]
    Write-Host "  #$number  $($spec.Title)"
}

Write-Host ""
Write-Host "Milestone: $MilestoneTitle"
Write-Host "Project:   $ProjectTitle"
Write-Host ""
Write-Host "No assignees were added."
Write-Host "Dependencies were added."
Write-Host ""
```

Run the preview first:

```powershell
$env:GITEA_TOKEN = "YOUR_TOKEN"
.\create-sprint4-issues.ps1 -DryRun
```

If that output looks right:

```powershell
.\create-sprint4-issues.ps1
```

One thing I deliberately did with **personalisation**: **#798 depends on it**, because #798 currently says exactly what you store in browser storage/user data. If the new feature stores a preferred competition/season/etc., Nadav's Privacy Notice needs to describe the actual final behaviour rather than becoming inaccurate immediately after it is merged.

## Prompt:
9/30/2026, 5:40:02 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> .\create-sprint4-issues.ps1 -DryRun
.\create-sprint4-issues.ps1 : File C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\create-sprint4-issues.ps1
cannot be loaded because running scripts is disabled on this system. For more information, see
about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:1 char:1
+ .\create-sprint4-issues.ps1 -DryRun
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/30/2026, 5:40:07 AM · gpt-5-6-thinking

That’s just Windows blocking `.ps1` scripts - the script itself hasn’t run yet.

Use the **temporary, safest option for just this PowerShell window**:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Press `Y` if it asks.

Then run:

```powershell
.\create-sprint4-issues.ps1 -DryRun
```

This only changes the policy for the **current PowerShell session**. When you close the window, it goes back to normal.

If it then complains that the file is blocked, run:

```powershell
Unblock-File .\create-sprint4-issues.ps1
```

and then:

```powershell
.\create-sprint4-issues.ps1 -DryRun
```

Send me the output from the dry run before you run the real one.

## Prompt:
9/30/2026, 5:41:15 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Unblock-File .\create-sprint4-issues.ps1
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> .\create-sprint4-issues.ps1 -DryRun

Sprint 4 issue bootstrap
Repository: git-push-pray/Sport-Analytics-Tool
Authenticated as: Shayna
Dry run: True

Milestone: Sprint 4 [id=84]
Invoke-RestMethod : 404 page not found
At C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\create-sprint4-issues.ps1:77 char:12
+     return Invoke-RestMethod @params
+            ~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-RestMethod], WebExc
   eption
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeRestMethodCommand
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/30/2026, 5:41:24 AM · gpt-5-6-thinking

> **Remembering**
>
>
> **Reviewed Sport-Analytics-Tool scripts, endpoints, API patterns, and request bodies**
>
> 
>
> **Fixing project assignment**
>
> I’m identifying the 404 as the repository-project lookup, not authentication or labels. I’ll remove that lookup, use the known project ID `2` directly, and preserve project assignment through the issue-creation request.
>
> **Fixed project assignment**
>
> 
>
> Worked for 45s

Yep - found it. **The script is fine up to the project lookup.** The 404 is from this call:

```powershell
/repos/$Owner/$Repo/projects
```

Your Gitea instance doesn't expose the project board through that repository-list endpoint. We already know **`Sport-Analytics-Tool-Proj` is project ID `2`**, so there is no reason to look it up dynamically. The issue-create API accepts project IDs directly, so this is cleaner anyway. ([Gitea Documentation](https://docs.gitea.com/api/next/operations/issue-create-issue/?utm_source=chatgpt.com))

Make these **3 tiny changes**:

1. Near the top, find:

```powershell
$ProjectTitle   = "Sport-Analytics-Tool-Proj"
```

Replace it with:

```powershell
$ProjectTitle   = "Sport-Analytics-Tool-Proj"
$ProjectId      = 2
```

2. Find this **whole section**:

```powershell
# ------------------------------------------------------------
# Resolve project
# ------------------------------------------------------------

$projects = @(
    Invoke-Gitea `
        -Method GET `
        -Path "/repos/$Owner/$Repo/projects?state=open&limit=100"
)

$project = $projects |
    Where-Object { $_.title -eq $ProjectTitle } |
    Select-Object -First 1

if (-not $project) {
    throw "Could not find project '$ProjectTitle'."
}

Write-Host "Project: $($project.title) [id=$($project.id)]"
```

Replace the whole thing with:

```powershell
# ------------------------------------------------------------
# Project
# ------------------------------------------------------------

# Gitea project board is known to be project ID 2.
# The repo-level project listing endpoint is not available
# on this Gitea instance, so use the known ID directly.

Write-Host "Project: $ProjectTitle [id=$ProjectId]"
```

3. Later, inside `$payload`, find:

```powershell
projects  = @([int64]$project.id)
```

Replace it with:

```powershell
projects  = @([int64]$ProjectId)
```

That's all.

Then rerun:

```powershell
.\create-sprint4-issues.ps1 -DryRun
```

You should now get past:

```text
Milestone: Sprint 4 [id=84]
Project: Sport-Analytics-Tool-Proj [id=2]
Loaded ... repository labels.

Found existing #797 ...
Found existing #798 ...

Issues to create/reuse: ...
```

**Don't run the real one yet** - paste me the next dry-run output. I also checked the dependency endpoint used later in the script; `/issues/{index}/dependencies` is a valid Gitea API route, so that part is okay. ([Gitea Documentation](https://docs.gitea.com/api/operations/issue-create-issue-dependencies/?utm_source=chatgpt.com))

---

**Sources:**

- [Create an issue. If using deadline only the date will be taken into account, and time of day ignored. | Gitea Documentation](https://docs.gitea.com/api/next/operations/issue-create-issue/?utm_source=chatgpt.com)

## Prompt:
9/30/2026, 5:43:41 AM

COME ONNNN
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> .\create-sprint4-issues.ps1 -DryRun

Sprint 4 issue bootstrap
Repository: git-push-pray/Sport-Analytics-Tool
Authenticated as: Shayna
Dry run: True

Milestone: Sprint 4 [id=84]
Project: Sport-Analytics-Tool-Proj [id=2]
Cannot convert the "System.Object[]" value of type "System.Object[]" to type "System.Int64".
At C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\create-sprint4-issues.ps1:219 char:5
+     $script:LabelMap[$label.name] = [int64]$label.id
+     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : ConvertToFinalInvalidCastException

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/30/2026, 5:43:52 AM · gpt-5-6-thinking

> **Fixing label handling**
>
> I’m replacing the label lookup with explicit response flattening and numeric ID validation, so nested arrays cannot reach the issue-creation request. I’m also keeping label names mapped separately to avoid accidental object-to-integer conversion.
>
> **Fixed label handling**
>
> 
>
> **Remembering**
>
>
> **Flattening API results**
>
> I’m correcting the PowerShell array handling: the response can arrive as one nested array, making each label ID an array. I’ll enumerate the returned labels explicitly, then validate each ID before creating issues.
>
> **Flattened API results**
>
> 
>
> **Reviewed Sprint 3 scripts, labels, milestones, projects, and dependencies**
>
> 
>
> Worked for 1m 2s

Yep - this one is on me. The problem is the `@(...)` wrapper around the Gitea labels response in Windows PowerShell; it can leave the whole returned label array nested as one object, so `$label.id` becomes **an array of IDs** instead of one ID.

Don’t patch around it with weird conversions. Replace the **entire “Load repository labels” section** with this:

```powershell
# ------------------------------------------------------------
# Load repository labels
# ------------------------------------------------------------

$labels = Invoke-Gitea `
    -Method GET `
    -Path "/repos/$Owner/$Repo/labels?limit=100"

# Windows PowerShell can preserve REST JSON arrays as a nested Object[].
# Explicitly flatten the response before building the name -> id map.
$labels = @($labels | ForEach-Object {
    if ($_ -is [System.Array]) {
        $_
    }
    else {
        $_
    }
})

$script:LabelMap = @{}

foreach ($label in $labels) {
    $id = $label.id

    if ($id -is [System.Array]) {
        throw "Unexpected label response for '$($label.name)': id contained multiple values: $($id -join ', ')"
    }

    $script:LabelMap[[string]$label.name] = [int64]$id
}

Write-Host "Loaded $($labels.Count) repository labels."
Write-Host ""
```

But I want to fix the **same Windows PowerShell array issue everywhere now**, rather than have you hit the next one five lines later.

Also replace your `Find-IssueByExactTitle` function with:

```powershell
function Find-IssueByExactTitle {
    param(
        [Parameter(Mandatory)]
        [string]$Title
    )

    $encoded = [uri]::EscapeDataString($Title)

    $rawResults = Invoke-Gitea `
        -Method GET `
        -Path "/repos/$Owner/$Repo/issues?state=all&type=issues&q=$encoded&limit=50"

    $results = @($rawResults | ForEach-Object {
        if ($_ -is [System.Array]) {
            $_
        }
        else {
            $_
        }
    })

    return $results |
        Where-Object { $_.title -eq $Title } |
        Select-Object -First 1
}
```

And replace the beginning of `Add-IssueDependency` where it loads existing dependencies:

### Find

```powershell
$existingDependencies = @(
    Invoke-Gitea `
        -Method GET `
        -Path "/repos/$Owner/$Repo/issues/$IssueNumber/dependencies"
)
```

### Replace with

```powershell
$rawDependencies = Invoke-Gitea `
    -Method GET `
    -Path "/repos/$Owner/$Repo/issues/$IssueNumber/dependencies"

$existingDependencies = @($rawDependencies | ForEach-Object {
    if ($_ -is [System.Array]) {
        $_
    }
    else {
        $_
    }
})
```

Then run:

```powershell
.\create-sprint4-issues.ps1 -DryRun
```

You **do not** need to change the milestone bit - it already successfully resolved:

```text
Milestone: Sprint 4 [id=84]
Project: Sport-Analytics-Tool-Proj [id=2]
```

Also, I checked back against the Sprint 3 automation we used: that script handled labels individually rather than building this particular all-label map, which is why we never hit this Windows PowerShell nesting issue then. So I should have reused that safer pattern from the start. 

Send me the next output.

## Prompt:
9/30/2026, 5:47:01 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> .\create-sprint4-issues.ps1 -DryRun

Sprint 4 issue bootstrap
Repository: git-push-pray/Sport-Analytics-Tool
Authenticated as: Shayna
Dry run: True

Milestone: Sprint 4 [id=84]
Project: Sport-Analytics-Tool-Proj [id=2]
Loaded 39 repository labels.

Found existing #797 - perf: achieve Lighthouse Performance score ≥90 across all frontend pages
Found existing #798 - Add Privacy Notice, Terms of Use and Accessibility Statement to public site

Issues to create/reuse: 12

[planning] docs(process): record Sprint 4 planning and final submission scope
  labels: area: documentation
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[frontendPolish] ux(frontend): final UI/UX, accessibility and responsive polish
  labels: area: frontend, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[submissionUx] fix(submissions): improve submission feedback and JSON upload guidance
  labels: area: frontend, area: backend, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[personalization] feat(frontend): add lightweight personalisation for authenticated users
  labels: area: frontend, type: feature
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[userTesting] test(user): run final structured user testing and integrate feedback
  labels: area: testing, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[interactions] docs(process): record Sprint 4 scrums and stakeholder interactions
  labels: area: documentation
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[testing] test: final automated testing, coverage and regression audit
  labels: area: testing, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[apiAudit] chore(api): final API design, architecture, availability and performance audit
  labels: area: api, area: backend, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[databaseAudit] chore(database): final database data, structure and deployment audit
  labels: area: backend, area: documentation, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[docsAudit] docs: final documentation, methodology and tooling audit
  labels: area: documentation, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[requirements] chore(requirements): verify final requirements and rubric traceability
  labels: area: documentation, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'

[release] release: final production deployment, rubric audit and project close-out
  labels: area: infrastructure, area: testing, priority: high
  would add to milestone 'Sprint 4'
  would add to project 'Sport-Analytics-Tool-Proj'


Dry run complete.
No issues or dependencies were created.

Run without -DryRun when ready:
  .\create-sprint4-issues.ps1
PS C:\Users\shayn\One

## Response:
9/30/2026, 5:47:10 AM · gpt-5-6-thinking

> **Searched 1 website**
>
> 
>
> Worked for 6s

This dry run is now exactly what we want.

It successfully verified:

- authentication as **Shayna**
- **Sprint 4 milestone id 84**
- project **id 2**
- all **39 labels**
- existing **#797** and **#798**
- all **12 new Sprint 4 issues**
- correct labels/milestone/project targets

And I double-checked the two parts that matter for the real run: Gitea supports `projects: [id]` directly when creating an issue, and the dependency endpoint we use is valid. ([Gitea Documentation](https://docs.gitea.com/api/next/operations/issue-create-issue/?utm_source=chatgpt.com))

So now run:

```powershell
.\create-sprint4-issues.ps1
```

This time it will actually create the issues and then wire the dependencies.

When it finishes, paste me the final output - especially the created issue numbers and dependency section - and I’ll check that everything landed correctly.

---

**Sources:**

- [Create an issue. If using deadline only the date will be taken into account, and time of day ignored. | Gitea Documentation](https://docs.gitea.com/api/next/operations/issue-create-issue/?utm_source=chatgpt.com)

## Prompt:
10/1/2026, 5:51:44 AM

![image(7).png](https://chatgpt.com/backend-api/estuary/content?id=file_000000004044820a8a029e2581f253ab&fn=image%287%29.png&cd=attachment&ts=497452&p=fs&cid=1&sig=5b79067e36a47f4c56976adb93a7b39e58bcc6f3984b7d5dac003534b4a51db3&v=0)

here other issues created by others.. now lest do sproint palnning issue together pls
its issue #799

## Response:
10/1/2026, 5:51:53 AM · gpt-5-6-thinking

> **Planning the sprint**
>
> I’m interpreting the planning date as September 29, 2026, with Sprint 4 ending October 11. I’ll prioritize release hardening, verification, documentation, and selected enhancements over adding another major feature.
>
> **Planned the sprint**
>
> 
>
> **Planned Sprint Issue #799 milestones and resolution roadmap**
>
> 
>
> Worked for 35s

Yes - now we can do **#799 properly**, and the other issues in your screenshot should absolutely be part of the Sprint 4 planning baseline.

Your earlier roadmap already says the final submission phase is primarily **verification, defects, documentation, evidence and release preparation**, not another giant feature sprint. `Pasted markdown(3).md` But Sprint 4 can still contain selected enhancements where the team has deliberately chosen them, which is exactly what has happened with the natural-language query work and API-consumer UX.

For **#799**, I would record the plan as of **29 September 2026**, with Gitea remaining authoritative as issues continue to be added/refined. That matches how you handled Sprint 2/3 planning: planning docs capture the baseline, while the tracker holds live state. `Pasted markdown(20260826-173339).md`

### What I want #799 to produce

We should create:

```text
evidence/sprints/sprint-4/2026-09-29-planning.md
```

and then add it to:

```text
docs/process/sprint-evidence.md
```

I would also update the **Final Submission section** in:

```text
docs/planning/project-backlog.md
```

so it says the previously planned F-01-F-10 work has now been refined into actual Sprint 4 issues.

The planning record should include the issues we know about now:

- **#797** Lighthouse/frontend performance
- **#798** Privacy, Terms and Accessibility
- **#799** Sprint 4 planning
- our final frontend polish issue
- submission feedback/JSON issue
- personalisation
- final user testing
- Scrum/stakeholder evidence
- automated testing + coverage
- API final audit
- database final audit
- docs/methodology/tooling audit
- requirements/rubric traceability
- final production/release close-out
- **#813** Evaluate query definitions deterministically
- **#815** Expose natural-language query endpoint
- **#816** Build natural-language query page
- **#817** Document/evidence natural-language query feature
- **#821** Unify anonymous and API-key consumer read flow
- **#822** User-requested API consumer access/key management
- **#827** Make unresolved batch validation errors understandable

And importantly, we **do not pretend these were all present at the exact first planning conversation**. We can say the baseline was established during planning and then refined as teammates created concrete issues immediately afterwards. That is actually good Scrumban evidence.

### Sprint 4 goal

I would use this:

> **Release a stable, polished and demonstrable final Stat’sTheGame product by 11 October 2026, prioritising final rubric coverage, release-blocking defects, production performance, usability, testing, documentation and evidence, while completing selected user-facing/API enhancements that fit within the remaining delivery window.**

That is much better than claiming Sprint 4 is simply another feature sprint.

And the priority order should be:

1. Release blockers / defects
2. Mandatory course and final-rubric gaps
3. Deployment, performance, testing and accessibility
4. User/stakeholder feedback
5. Documentation/evidence/traceability
6. Selected enhancements already accepted into Sprint 4
7. Optional polish/stretch work

That also matches the project's established prioritisation model. `project-backlog.md`

### Before I generate the patch

I only need **one thing**, because I don't want to guess the issue numbers for the 11 issues our script created after #799.

Run:

```powershell
gitea issues list --milestones "Sprint 4"
```

If you don't have the Gitea CLI, easiest is just paste/screenshot the part of the issue list containing **#799 through your final release issue**.

I already know the teammate issues from this screenshot, so once I have those numbers I'll give you **one `apply_issue_799.py` script** that:

- creates the Sprint 4 planning evidence,
- updates the project backlog,
- updates the Sprint evidence index,
- adds the AI declaration/register entry,
- preserves your existing docs structure,
- and then I'll give you the exact verification → commit → PR commands.

No more guessing issue numbers.

## Prompt:
10/1/2026, 5:54:01 AM

[UX] Make unresolved batch validation errors understandable to end users\
area: frontend\
bug\
priority: medium\
severity: medium\
\#827\
opened\
8 hours ago\
by\
Dean\
Sport Analytics - Bug Tracker\
0 / 12\
Add user-requested API consumer access and key management\
area: frontend\
type: feature\
\#822\
opened\
17 hours ago\
by\
NadavSundy\
Sport-Analytics-Tool-Proj\
0 / 66\
\
Unify anonymous and API-key consumer read flow\
area: backend\
type: feature\
\#821\
opened\
17 hours ago\
by\
NadavSundy\
Sport-Analytics-Tool-Proj\
0 / 27\
\
Document and evidence the natural-language query feature\
area: documentation\
type: documentation\
\#817\
opened\
19 hours ago\
by\
BenSwartz\
Sport-Analytics-Tool-Proj\
0 / 9\
\
Build the natural-language query page\
area: frontend\
type: feature\
\#816\
opened\
19 hours ago\
by\
BenSwartz\
Sport-Analytics-Tool-Proj\
0 / 6\
\
Expose the natural-language query endpoint\
area: api\
priority: high\
type: feature\
\#815\
opened\
19 hours ago\
by\
BenSwartz\
Sport-Analytics-Tool-Proj\
0 / 8\
\
Evaluate query definitions deterministically\
area: api\
type: feature\
\#813\
opened\
19 hours ago\
by\
BenSwartz\
Sport-Analytics-Tool-Proj\
0 / 6\
\
release: final production deployment, rubric audit and project close-out\
area: infrastructure\
area: testing\
priority: high\
\#810\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
\
chore(requirements): verify final requirements and rubric traceability\
area: documentation\
priority: high\
\#809\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
docs: final documentation, methodology and tooling audit\
area: documentation\
priority: high\
\#808\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
chore(database): final database data, structure and deployment audit\
area: backend\
area: documentation\
priority: high\
\#807\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
chore(api): final API design, architecture, availability and performance audit\
area: api\
area: backend\
priority: high\
\#806\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
test: final automated testing, coverage and regression audit\
area: testing\
priority: high\
\#805\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
docs(process): record Sprint 4 scrums and stakeholder interactions\
area: documentation\
\#804\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
\
test(user): run final structured user testing and integrate feedback\
area: testing\
priority: high\
\#803\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
feat(frontend): add lightweight personalisation for authenticated users\
area: frontend\
type: feature\
\#802\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
fix(submissions): improve submission feedback and JSON upload guidance\
area: backend\
area: frontend\
priority: high\
\#801\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
\
ux(frontend): final UI/UX, accessibility and responsive polish\
area: frontend\
priority: high\
\#800\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
docs(process): record Sprint 4 planning and final submission scope\
area: documentation\
\#799\
opened\
yesterday\
by\
Shayna\
Sport-Analytics-Tool-Proj\
\
Add Privacy Notice, Terms of Use and Accessibility Statement to public site\
area: frontend\
type: feature\
\#798\
opened\
2 days ago\
by\
NadavSundy\
Sport-Analytics-Tool-Proj\
0 / 21\
[**perf: achieve Lighthouse Performance score ≥90 across all frontend pages**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/797)
[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=open\&labels=35\&assignee=\&poster=)
[**area: infrastructure**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=open\&labels=30\&assignee=\&poster=)
[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=open\&labels=37\&assignee=\&poster=)
[#797](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/797)opened2 days agoby[Dean](https://sdp.ms.wits.ac.za/Dean)[Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)0 / 21
[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=40))
[1](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/797)
[First](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84)[Previous1](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?page=1)2NextLast

## Response:
10/1/2026, 5:54:09 AM · gpt-5-6-thinking

> **Planning repository updates**
>
> I’m preparing a concise implementation script that creates Sprint 4 evidence, records AI attribution, updates backlog/process documentation, and adds an issue-specific pull-request note without assuming unknown register schemas.
>
> **Planned repository updates**
>
> 
>
> **Refining sprint scope**
>
> I’m distinguishing the 30 September planning snapshot from later refinements, avoiding ownership assignments, and mapping the listed issues to database, API, application, testing, tooling, and integration work.
>
> **Refined sprint scope**
>
> 
>
> **Implemented Sprint 4 planning evidence script and patch for Issue 799**
>
> 
>
> Worked for 1m 40s

Perfect - now we have the **actual Sprint 4 backlog**, including the issues created after our first planning pass. I’d implement **#799** as a planning baseline dated **30 September 2026**, with a current-refinement snapshot that includes the later #813-#827 issues. That avoids pretending every issue existed at the exact kickoff.

It also fits your existing roadmap: Final Submission was always intended to focus mainly on hardening, evidence, documentation and release preparation, with detailed issues refined after Sprint 3. `project-backlog.md` The official deadline is **11 October 2026**, leaving the 12-day final window. `project_briefs.pdf`

First:

```powershell
git status --short
git switch main
git pull --ff-only
git switch -c docs/799-sprint-4-planning
```

Then create **`apply_issue_799.py`** in the repo root and paste this:

```python
from __future__ import annotations

import argparse
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent

ISSUE = 799

PLANNING_PATH = "evidence/sprints/sprint-4/2026-09-30-planning.md"
SPRINT4_README_PATH = "evidence/sprints/sprint-4/README.md"
BACKLOG_PATH = "docs/planning/project-backlog.md"
SPRINT_EVIDENCE_PATH = "docs/process/sprint-evidence.md"
AI_REGISTER_PATH = "evidence/ai/registers/shayna-unterslak.csv"
PR_BODY_PATH = "issue-799-pr.md"

PLANNING = r"""# Sprint 4 Planning and Final Submission Scope

**Sprint:** Sprint 4 / Milestone 4 - Project Submission  
**Initial planning date:** 30 September 2026  
**Current refinement snapshot:** 1 October 2026  
**Sprint end:** 11 October 2026  
**Team:** Git Push Pray  
**Related issue:** #799  
**Status:** Active planning baseline

## Purpose

Sprint 4 is the final product-delivery period for Stat'sTheGame.

The sprint is not intended to become another unrestricted feature-development sprint.
The primary goal is to convert the near-complete Sprint 3 product into a stable,
well-tested, well-documented and demonstrable final submission.

The active Sprint 4 backlog is maintained in Gitea. This document records the
planning baseline, scope rationale, sequencing, risks and relationship between
the previously planned Final Submission backlog and the concrete Sprint 4 issues.

Gitea remains authoritative for current issue status, dependencies, labels,
Pull Requests and completion evidence.

## Context

Sprint 3 concluded on 29 September 2026.

The formal project submission deadline is 11 October 2026, leaving a short final
delivery window. Sprint 4 therefore prioritises release quality and evidence over
uncontrolled expansion of scope.

The Final Submission roadmap established earlier in the project already identified
the need to:

- resolve release-blocking defects;
- verify production deployment and database readiness;
- complete final performance, security, accessibility and browser checks;
- complete requirements traceability;
- finalise technical/testing/AI documentation;
- preserve demonstrable data and workflows; and
- create the final release state and tag.

Sprint 4 planning refines that roadmap against the actual system state after
Sprint 3.

The issue list below represents the current refined Sprint 4 scope as of
1 October 2026. Some issues were created immediately after the initial planning
discussion as teammates refined selected work into actionable tasks. Their inclusion
here does not imply that every issue already existed at the first planning meeting.

## Planning Inputs

Sprint 4 planning considered:

1. the Sprint 3 close-out and known remaining work;
2. the COMS3011A Milestone 4 rubric;
3. the existing Final Submission roadmap;
4. known defects and usability findings;
5. recent user and stakeholder feedback;
6. production performance and deployment evidence;
7. testing and coverage status;
8. documentation and evidence requirements;
9. work proposed during the team Sprint 4 planning discussion; and
10. issues subsequently refined into the Sprint 4 milestone.

## Sprint 4 Goal

Release a stable, polished and demonstrable final Stat'sTheGame product by
11 October 2026, prioritising final rubric coverage, release-blocking defects,
production performance, usability, testing, documentation and evidence, while
completing selected user-facing and API enhancements that fit safely within the
remaining delivery window.

## Prioritisation

Sprint 4 work is prioritised in this order:

1. release-blocking defects and regressions;
2. mandatory project requirements and final-rubric gaps;
3. deployment, performance, testing, accessibility and data integrity;
4. user and stakeholder feedback affecting important workflows;
5. documentation, methodology evidence and requirements traceability;
6. selected enhancements already accepted into the Sprint 4 milestone; and
7. optional polish that does not put the release candidate at risk.

Selected enhancements must not displace required final verification or leave
previously working functionality unstable.

## Refined Sprint 4 Backlog

### Release quality, UX and production hardening

| Issue | Work | Planning purpose |
| --- | --- | --- |
| #797 | Lighthouse Performance >=90 across frontend pages | Final application-performance hardening and evidence. |
| #798 | Privacy Notice, Terms of Use and Accessibility Statement | Public policy/accessibility readiness and final-release professionalism. |
| #800 | Final UI/UX, accessibility and responsive polish | Application-wide usability, aesthetics, accessibility and responsive quality pass. |
| #801 | Improve submission feedback and JSON upload guidance | Correct misleading submission options/templates and improve actionable submission feedback. |
| #827 | Make unresolved batch validation errors understandable to end users | Resolve the specific batch-validation UX defect discovered during final testing. |

#801 and #827 overlap in the submission experience but are not duplicates.
#801 covers the broader submission workflow, supported package guidance and JSON
templates. #827 is the narrower defect involving unresolved batch-validation errors.
Changes should be coordinated so the two issues do not implement conflicting error
presentation.

### Selected user-facing and API enhancements

| Issue | Work | Planning purpose |
| --- | --- | --- |
| #802 | Lightweight personalisation for authenticated users | Small repeat-user UX improvement without creating a new large preferences subsystem. |
| #813 | Evaluate query definitions deterministically | Foundation for the selected natural-language/query-definition workflow. |
| #815 | Expose the natural-language query endpoint | Make the query capability available through the API. |
| #816 | Build the natural-language query page | Provide a usable frontend for the query capability. |
| #817 | Document and evidence the natural-language query feature | Ensure the new feature is understandable, demonstrable and evidenced. |
| #821 | Unify anonymous and API-key consumer read flow | Simplify and harden consumer API behaviour. |
| #822 | Add user-requested API consumer access and key management | Deliver the requested frontend/API-consumer management workflow. |

These are deliberately bounded Sprint 4 enhancements. Their implementation must not
prevent completion of the release, testing and documentation gates.

The natural-language query work should be treated as one coherent feature slice.
The expected implementation sequence is:

`#813 -> #815 -> #816 -> #817`

This is a planning sequence based on the current issue scopes. Gitea remains
authoritative for any formal dependency edges.

The API-consumer refinement is similarly expected to stabilise the backend read
flow in #821 before or alongside the user-facing consumer-management work in #822.

### Validation, evidence and release management

| Issue | Work | Planning purpose |
| --- | --- | --- |
| #799 | Record Sprint 4 planning and final submission scope | Preserve this final-sprint planning baseline and roadmap refinement. |
| #803 | Final structured user testing and feedback integration | Test the near-final product formally and integrate or explicitly disposition findings. |
| #804 | Record Sprint 4 scrums and stakeholder interactions | Preserve methodology and stakeholder evidence throughout the final sprint. |
| #805 | Final automated testing, coverage and regression audit | Confirm required suites and coverage processes remain healthy after final changes. |
| #806 | Final API design, architecture, availability and performance audit | Verify the API against the complete final product and rubric. |
| #807 | Final database data, structure and deployment audit | Verify final schema, integrity, representative data and production deployment. |
| #808 | Final documentation, methodology and tooling audit | Reconcile public/repository documentation with what is actually shipped. |
| #809 | Verify final requirements and rubric traceability | Map final requirements/rubric categories to implementation, tests and evidence. |
| #810 | Final production deployment, rubric audit and project close-out | Final release gate, deployment smoke test, evidence review and submitted tag/state. |

## Execution and Dependency Strategy

### Work that can begin immediately

The following work can proceed in parallel:

- #800 frontend quality review;
- #801 submission workflow corrections;
- #802 personalisation;
- #804 Scrum/stakeholder evidence;
- #806 API audit;
- #807 database audit;
- #809 requirements/rubric traceability;
- #813 natural-language query definition work;
- #821 API-consumer read-flow work; and
- defects such as #827.

### Frontend performance gate

Final Lighthouse evidence under #797 should be captured only after routes and
substantial frontend changes from #798, #800, #801 and #802 have stabilised.

This avoids collecting a final performance result and then invalidating it through
subsequent route or bundle changes.

### User-testing gate

Final structured user testing under #803 should exercise the near-final product.

Major user-facing work should therefore be sufficiently stable before the final
sessions, particularly:

- #800;
- #801;
- #802;
- #816;
- #822; and
- #827 where the affected workflow is included.

Feedback discovered during #803 must either:

- be implemented;
- be linked to an existing issue;
- become a new tracked issue; or
- be explicitly deferred with a reason.

### Testing and documentation gates

#805 is the final regression/coverage audit and should close only after the
important final implementation and audit work has landed.

#808 should describe the actual final system rather than documenting intended
behaviour that has not shipped.

#809 may begin immediately but remains a living traceability record until the
release candidate is stable.

### Final release gate

#810 is the final Sprint 4 gate.

It should close only once:

- release-blocking defects have been resolved or explicitly dispositioned;
- production deployment is healthy;
- final testing evidence is current;
- API/database/application audits are complete;
- documentation describes the deployed product;
- final user/stakeholder evidence has been captured;
- requirements/rubric traceability is current; and
- the exact final release commit/tag is recorded.

## Milestone 4 Rubric Traceability

Sprint 4 planning explicitly covers the Milestone 4 rubric categories.

| Final rubric area | Primary Sprint 4 evidence/work |
| --- | --- |
| Database - data | #807, #809 |
| Database - deployment | #807, #810 |
| Database - structure | #807, #809 |
| API - availability | #806, #810 |
| API - architecture | #806, #809 |
| API - deployment | #806, #810 |
| API - performance | #806 |
| API - design | #806, plus applicable API feature issues |
| App - accessibility | #798, #800 |
| App - aesthetics | #800 |
| App - user experience | #800, #801, #802, #816, #822, #827 |
| App - deployment | #810 |
| App - performance | #797 |
| App - features | #801, #802, #813, #815, #816, #821, #822 and existing completed functionality |
| App - responsiveness | #800 |
| App - structure | #800, #808 |
| Misc - Git methodology | #804, #808, #809 |
| Misc - integration | #808 and #809 verification against the final implemented system |
| Misc - testing | #803, #805 |
| Misc - tools | #808, #809 |

The traceability table identifies where evidence should come from. It does not
replace the detailed final requirements/rubric matrix maintained under #809.

## Refinement of the Original Final Submission Roadmap

The original Final Submission roadmap identified F-01 through F-10 before the
detailed final-sprint issues existed.

Sprint 4 planning refines those items as follows.

| Planned item | Sprint 4 disposition |
| --- | --- |
| F-01 - release-blocking defects | Active through bug tracking, #801, #827 and any new final defects. |
| F-02 - production database migration/backup/restore verification | Primarily #807. Any backup/restore gap discovered by #807 must be explicitly resolved or tracked. |
| F-03 - production secrets/configuration/deployments | Primarily #810, supported by #806 and #807. |
| F-04 - performance/security/accessibility/cross-browser audits | Performance: #797/#806; accessibility/responsiveness: #798/#800. Security and cross-browser verification must remain explicit in final release evidence; create a separate issue if existing final audits cannot evidence them cleanly. |
| F-05 - requirements traceability/limitations/acceptance | #809, with final release confirmation under #810. |
| F-06 - database/third-party/testing/AI documentation | #808, supported by #805/#807. |
| F-07 - reproducible demonstration data and scripted demonstration | Final product should retain representative demonstrable data/workflows through #807/#809/#810. Presentation-specific scripting may continue after the product submission where appropriate. |
| F-08 - group presentation | Formal presentation occurs after the 11 October product submission and is not treated as a Sprint 4 product implementation blocker. |
| F-09 - group/individual reports and peer review | These have later formal deadlines and are outside the Sprint 4 product implementation scope. |
| F-10 - release notes/tag/submission package | #810. |

This refinement records an intentional evolution of the original roadmap rather
than silently deleting or pretending to complete planned work.

## Important Final-Sprint Risks

### Short release window

Sprint 4 has substantially less development time than the earlier milestones.

Mitigation:

- prioritise required release work first;
- keep enhancements bounded;
- avoid late architectural rewrites unless required by a blocking defect.

### Late feature regression

The natural-language query, API-consumer and personalisation work introduce changes
late in the project.

Mitigation:

- require relevant regression tests;
- keep #805 as a final full regression gate;
- do not weaken existing tests merely to merge late work.

### Submission-workflow overlap

#801 and #827 affect related submission error behaviour.

Mitigation:

- cross-reference the implementations;
- use one consistent error presentation model;
- avoid duplicate/conflicting frontend handling.

### Documentation drift

Sprint 4 contains several features and production changes after major documentation
work already occurred.

Mitigation:

- #808 remains open until final functionality is stable;
- #817 owns documentation for the natural-language query feature;
- #809 verifies final traceability.

### Performance evidence becoming stale

New frontend routes or components can change Lighthouse results.

Mitigation:

- perform final #797 evidence after major frontend work stabilises.

### User testing occurring too late

If formal user testing is postponed until the final day, actionable findings cannot
reasonably be integrated.

Mitigation:

- run #803 as soon as the principal user-facing Sprint 4 flows are testable;
- record and triage findings immediately.

### Privacy/policy drift

Personalisation, authentication-related UI or API-consumer changes may alter the
information the application stores or presents.

Mitigation:

- re-check #798 against the final implementation before closure;
- do not state data practices in policy pages that differ from the shipped product.

## Scope Control

Sprint 4 remains a release-focused milestone.

New work may enter the milestone when it:

- fixes a real defect;
- addresses material stakeholder/user feedback;
- closes a rubric or project-requirement gap;
- is required for deployment/release;
- provides necessary documentation/evidence; or
- is a bounded enhancement the team deliberately accepts without risking required work.

New work must not be hidden inside unrelated issues merely to avoid tracking it.

Material scope changes should be recorded through Gitea and, where they affect the
Sprint 4 plan, reflected in this evidence during close-out.

## Definition of Sprint 4 Done

Sprint 4 can close when:

- the intended final product is deployed;
- core public, authenticated, submission, review and API workflows operate normally;
- no known release-blocking defect remains unresolved;
- final application and API performance evidence is current;
- final accessibility/responsiveness checks are complete;
- final automated regression/coverage evidence is current;
- structured final user testing has been completed and findings dispositioned;
- stakeholder/Scrum evidence is current;
- database and API audits are complete;
- public and repository documentation match the shipped system;
- final requirements/rubric traceability is complete;
- known limitations are explicit;
- the exact release commit is agreed; and
- the final submission tag/state is recorded.

## Planning Maintenance

This document is a planning baseline, not a replacement for Gitea.

During Sprint 4:

- routine status changes remain in Gitea;
- new defects are tracked as issues;
- dependencies remain authoritative in Gitea;
- significant scope changes are recorded with their reason; and
- close-out evidence will reconcile this plan against what was actually delivered.

## AI Declaration

The preceding document was planned, generated and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].

The team remains responsible for reviewing the planning record against the actual
Sprint 4 milestone and final repository state.
"""

SPRINT4_README = r"""# Sprint 4 Evidence

This directory contains the repository evidence for Sprint 4 / the final project
submission milestone.

Gitea remains authoritative for live issue status, dependencies and Pull Requests.

| Record | Related issue | Purpose |
| --- | --- | --- |
| [`2026-09-30-planning.md`](2026-09-30-planning.md) | #799 | Sprint 4 planning baseline, scope refinement, sequencing, risks and final-submission traceability. |

Additional Sprint 4 Scrum, stakeholder, user-testing and close-out evidence should be
linked here as it is completed.

## AI Declaration

The Issue #799 Sprint 4 planning evidence and index were planned, generated and
edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
"""

BACKLOG_REFINEMENT = r"""
### Sprint 4 Refinement - 30 September 2026

The Final Submission backlog above was intentionally created before detailed final
issues existed.

Following Sprint 3 close-out, that roadmap has now been refined into the active
Sprint 4 milestone.

The current planning baseline is recorded in
`evidence/sprints/sprint-4/2026-09-30-planning.md` under Issue #799.

The refined Sprint 4 work includes:

- frontend performance and release hardening (#797);
- public privacy/terms/accessibility material (#798);
- Sprint 4 planning and methodology evidence (#799, #804);
- final UX/accessibility/responsive polish (#800);
- submission usability and validation feedback (#801, #827);
- bounded authenticated-user personalisation (#802);
- final structured user testing (#803);
- final testing/coverage regression verification (#805);
- final API and database audits (#806, #807);
- final documentation/tooling/methodology audit (#808);
- final requirements and rubric traceability (#809);
- final production deployment and project close-out (#810);
- selected natural-language query functionality (#813, #815, #816, #817); and
- API-consumer read-flow and user-requested key-management work (#821, #822).

This refinement does not rewrite the historical roadmap. It records how the
previously planned Final Submission work was converted into actionable issues after
Sprint 3 and how selected late enhancements were accepted into the final milestone.

Gitea remains authoritative for current issue state and dependencies.
"""

SPRINT_EVIDENCE_BLOCK = r"""
## Sprint 4

Sprint 4 is the final project-submission milestone.

| Date | Record |
| --- | --- |
| 30 Sep 2026 | [Sprint 4 planning and final-submission scope](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-4/2026-09-30-planning.md) |

Repository index:
[`evidence/sprints/sprint-4/README.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-4/README.md)

The planning record captures the refined final-submission backlog, sequencing,
scope decisions, known risks and relationship between the original roadmap and the
current Sprint 4 Gitea milestone.

Current issue status and dependencies remain authoritative in Gitea.

The Issue #799 Sprint 4 planning navigation update was planned, generated and
edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
"""

PR_BODY = r"""## Summary

Implements #799 by recording the Sprint 4 / final-submission planning baseline.

### Added

- Sprint 4 planning evidence under `evidence/sprints/sprint-4/`
- Sprint 4 evidence index
- current refined backlog covering #797-#810 and subsequently refined Sprint 4 work
  (#813, #815-#817, #821-#822, #827)
- final-rubric traceability baseline
- sequencing/dependency strategy
- risk and scope-control decisions
- mapping from the original F-01-F-10 Final Submission roadmap to current work

### Updated

- `docs/planning/project-backlog.md`
- `docs/process/sprint-evidence.md`
- Shayna AI-use register

### Planning note

The record distinguishes the 30 September planning baseline from issues refined
immediately afterwards. It does not claim that every currently listed issue existed
at the exact first planning discussion.

Gitea remains authoritative for live issue status and dependencies.

## Verification

- `python apply_issue_799.py --verify`
- `git diff --check`
- `python -m mkdocs build --strict`

## AI Declaration

The preceding Pull Request description was planned and generated with the
assistance of ChatGPT-Web[GPT-5.6 Sol].

Closes #799
"""

EXPECTED_AI_HEADER = [
    "Date",
    "Team member",
    "Tool",
    "Model",
    "Purpose",
    "Brief task",
    "Output used",
    "Verification or adaptation",
    "Related evidence",
]

def fail(message: str) -> None:
    raise RuntimeError(message)

def read(rel: str) -> str:
    path = ROOT / rel
    if not path.exists():
        fail(f"Expected repository file not found: {rel}")
    return path.read_text(encoding="utf-8-sig")

def write(rel: str, content: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8", newline="\n")

def update_backlog() -> None:
    text = read(BACKLOG_PATH)

    marker = "### Sprint 4 Refinement - 30 September 2026"

    if marker in text:
        return

    anchor = "### Final Submission Expected Outcome"

    if anchor not in text:
        fail(
            f"Could not update {BACKLOG_PATH}: "
            f"expected anchor {anchor!r} was not found."
        )

    text = text.replace(
        anchor,
        BACKLOG_REFINEMENT.strip() + "\n\n" + anchor,
        1,
    )

    write(BACKLOG_PATH, text)

def update_sprint_evidence() -> None:
    text = read(SPRINT_EVIDENCE_PATH)

    if "## Sprint 4" in text:
        if "2026-09-30-planning.md" in text:
            return
        fail(
            f"{SPRINT_EVIDENCE_PATH} already has a Sprint 4 section "
            "but not the Issue #799 planning link. Review manually rather "
            "than allowing the patch to guess its structure."
        )

    block = SPRINT_EVIDENCE_BLOCK.strip() + "\n\n"

    possible_anchors = [
        "\n## Future Sprints",
        "\n## How to add future Sprint evidence",
        "\n## AI Declaration",
    ]

    positions = [
        text.find(anchor)
        for anchor in possible_anchors
        if text.find(anchor) >= 0
    ]

    if positions:
        pos = min(positions)
        text = text[:pos].rstrip() + "\n\n" + block + text[pos:].lstrip("\n")
    else:
        text = text.rstrip() + "\n\n" + block

    write(SPRINT_EVIDENCE_PATH, text)

def append_ai_register() -> None:
    path = ROOT / AI_REGISTER_PATH

    if not path.exists():
        fail(f"Expected repository file not found: {AI_REGISTER_PATH}")

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))

    if not rows:
        fail(f"{AI_REGISTER_PATH} is empty.")

    if rows[0] != EXPECTED_AI_HEADER:
        fail(
            "AI register header has changed.\n"
            f"Expected: {EXPECTED_AI_HEADER}\n"
            f"Actual:   {rows[0]}\n"
            "Review the register before appending."
        )

    for row in rows[1:]:
        if len(row) >= 6 and "Issue #799" in row[5]:
            return

    new_row = [
        "2026-10-01",
        "Shayna Unterslak",
        "ChatGPT Web",
        "GPT-5.6 Sol",
        "Sprint planning; backlog refinement; documentation; rubric traceability; review",
        (
            "Issue #799: establish the Sprint 4/final-submission planning baseline, "
            "refine the historical Final Submission roadmap against the current "
            "Sprint 4 milestone, and document sequencing, risks, scope decisions "
            "and final-rubric traceability."
        ),
        (
            "Generated the Sprint 4 planning record, Sprint 4 evidence index, "
            "Final Submission roadmap-refinement section, public sprint-evidence "
            "navigation update, verification script and Pull Request draft."
        ),
        (
            "Shayna supplied and reviewed the current Sprint 4 issue list. "
            "The generated planning record distinguishes the initial planning "
            "baseline from issues refined afterwards. Repository diff, strict "
            "documentation build and teammate review remain required before merge."
        ),
        (
            "Issue #799; "
            "evidence/sprints/sprint-4/2026-09-30-planning.md; "
            "evidence/sprints/sprint-4/README.md; "
            "docs/planning/project-backlog.md; "
            "docs/process/sprint-evidence.md"
        ),
    ]

    with path.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(new_row)

def verify() -> None:
    required_files = [
        PLANNING_PATH,
        SPRINT4_README_PATH,
        BACKLOG_PATH,
        SPRINT_EVIDENCE_PATH,
        AI_REGISTER_PATH,
        PR_BODY_PATH,
    ]

    missing = [
        rel for rel in required_files
        if not (ROOT / rel).exists()
    ]

    if missing:
        fail("Missing expected files: " + ", ".join(missing))

    planning = read(PLANNING_PATH)

    required_issue_numbers = [
        "#797",
        "#798",
        "#799",
        "#800",
        "#801",
        "#802",
        "#803",
        "#804",
        "#805",
        "#806",
        "#807",
        "#808",
        "#809",
        "#810",
        "#813",
        "#815",
        "#816",
        "#817",
        "#821",
        "#822",
        "#827",
    ]

    for issue_number in required_issue_numbers:
        if issue_number not in planning:
            fail(
                f"Verification failed: {issue_number} missing "
                f"from {PLANNING_PATH}"
            )

    planning_needles = [
        "Sprint 4 Goal",
        "Prioritisation",
        "Execution and Dependency Strategy",
        "Milestone 4 Rubric Traceability",
        "Refinement of the Original Final Submission Roadmap",
        "Important Final-Sprint Risks",
        "Scope Control",
        "Definition of Sprint 4 Done",
        "ChatGPT-Web[GPT-5.6 Sol]",
    ]

    for needle in planning_needles:
        if needle not in planning:
            fail(
                f"Verification failed: {needle!r} missing "
                f"from {PLANNING_PATH}"
            )

    backlog = read(BACKLOG_PATH)

    for needle in [
        "### Sprint 4 Refinement - 30 September 2026",
        "2026-09-30-planning.md",
        "#827",
    ]:
        if needle not in backlog:
            fail(
                f"Verification failed: {needle!r} missing "
                f"from {BACKLOG_PATH}"
            )

    sprint_evidence = read(SPRINT_EVIDENCE_PATH)

    for needle in [
        "## Sprint 4",
        "2026-09-30-planning.md",
        "Issue #799",
    ]:
        if needle not in sprint_evidence:
            fail(
                f"Verification failed: {needle!r} missing "
                f"from {SPRINT_EVIDENCE_PATH}"
            )

    with (ROOT / AI_REGISTER_PATH).open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        rows = list(csv.reader(f))

    if not any(
        len(row) >= 6 and "Issue #799" in row[5]
        for row in rows[1:]
    ):
        fail("Verification failed: Issue #799 AI register row missing.")

    print("")
    print("Issue #799 Sprint 4 planning applied and verified.")
    print("")
    print("Created/updated:")
    print(f"  {PLANNING_PATH}")
    print(f"  {SPRINT4_README_PATH}")
    print(f"  {BACKLOG_PATH}")
    print(f"  {SPRINT_EVIDENCE_PATH}")
    print(f"  {AI_REGISTER_PATH}")
    print(f"  {PR_BODY_PATH}")
    print("")
    print("Next:")
    print("  git diff --check")
    print("  python -m mkdocs build --strict")
    print("  git status --short")
    print("  git diff")

def apply() -> None:
    write(PLANNING_PATH, PLANNING)

    if not (ROOT / SPRINT4_README_PATH).exists():
        write(SPRINT4_README_PATH, SPRINT4_README)
    else:
        existing = read(SPRINT4_README_PATH)
        if "2026-09-30-planning.md" not in existing:
            existing = existing.rstrip() + "\n\n" + (
                "## Issue #799 planning record\n\n"
                "- [`2026-09-30-planning.md`](2026-09-30-planning.md) - "
                "Sprint 4 planning baseline and final-submission scope.\n\n"
                "The Issue #799 evidence-index update was planned, generated "
                "and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol]."
            )
            write(SPRINT4_README_PATH, existing)

    update_backlog()
    update_sprint_evidence()
    append_ai_register()
    write(PR_BODY_PATH, PR_BODY)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Apply the Issue #799 documentation and verify the result.",
    )
    args = parser.parse_args()

    apply()

    if args.verify:
        verify()
    else:
        print("Issue #799 Sprint 4 planning applied.")
        print("Run: python apply_issue_799.py --verify")

if __name__ == "__main__":
    main()
```

Then run:

```powershell
python .\apply_issue_799.py --verify
```

If that passes:

```powershell
git diff --check
python -m mkdocs build --strict
git status --short
git diff
```

**Don’t commit yet** - send me those outputs/diff summary and I’ll check it before we do the commit/PR.

One useful thing this planning pass surfaced: your original final roadmap explicitly included **security + cross-browser verification** and **database backup/restore verification**. `project-backlog.md` None of the new issue titles cleanly owns the first of those, so I deliberately recorded it in #799 as something that must either be evidenced through the existing final audits or turned into another issue rather than quietly disappearing. That is exactly the kind of roadmap evolution #799 should capture.

## Prompt:
10/1/2026, 5:57:35 AM

[**Define consumer API access model and API-key purpose**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/820)
[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=42\&assignee=\&poster=)
[**type: feature**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=46\&assignee=\&poster=)
[#820](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/820)by[NadavSundy](https://sdp.ms.wits.ac.za/NadavSundy)was closed16 hours ago[Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)0 / 18
[NadavSundy](https://sdp.ms.wits.ac.za/NadavSundy) ([image](https://sdp.ms.wits.ac.za/avatars/48ad195ab86e0c781914deeba5b552cc?size=40))
[**Integrate an LLM provider through a server-side adapter**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/814)
[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=42\&assignee=\&poster=)
[**area: infrastructure**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=30\&assignee=\&poster=)
[**type: feature**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=46\&assignee=\&poster=)
[#814](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/814)by[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz)was closed12 hours ago[Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)0 / 7
[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz) ([image](https://sdp.ms.wits.ac.za/avatars/2277e53fd9c58f67ada0020e27e7079b?size=40))
[1](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/814)
[**Bound database statement execution time**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/812)
[**area: database**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=32\&assignee=\&poster=)
[**area: infrastructure**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=30\&assignee=\&poster=)
[**type: infrastructure**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=29\&assignee=\&poster=)
[#812](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/812)by[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz)was closed16 hours ago[Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)0 / 6
[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz) ([image](https://sdp.ms.wits.ac.za/avatars/2277e53fd9c58f67ada0020e27e7079b?size=40))
[**Define the analytics query-definition contract**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/811)
[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=42\&assignee=\&poster=)
[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=37\&assignee=\&poster=)
[**type: feature**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/84?q=\&type=all\&state=closed\&labels=46\&assignee=\&poster=)
[#811](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/811)by[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz)was closed17 hours ago[Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)0

missed these closed ones... oops.. redo adding themk pls

## Response:
10/1/2026, 5:57:50 AM · gpt-5-6-thinking

> **Updating the issue plan**
>
> I’m incorporating the four missed closed issues: query contracts, database timeouts, the server-side LLM adapter, and consumer API access. I’ll place them in dependency order and distinguish completed groundwork from remaining work.
>
> **Updated the issue plan**
>
> 
>
> **Applying planning updates**
>
> I’m adding the four completed issues to the roadmap, dependency order, traceability matrix, verification set, backlog-refinement list, and pull-request summary. I’m marking them as completed foundation rather than remaining work.
>
> Worked for 19s

Yep - those **definitely belong in #799**. Since they are already closed, we should record them as **early Sprint 4 foundation/hardening work that was refined and completed immediately after planning**, not leave them out just because they moved to Done quickly.

You do **not** need the whole giant script again. Make these exact changes to the `apply_issue_799.py` I gave you **before you run it**.

### 1. Add this section before `### Selected user-facing and API enhancements`

Find:

```python
### Selected user-facing and API enhancements
```

Replace it with:

```python
### Early Sprint 4 foundation and hardening already completed

Several Sprint 4 items were refined into actionable issues and completed during the
first part of the milestone before this planning record was finalised.

They remain part of the Sprint 4 scope and evidence even though they are already
closed in Gitea.

| Issue | Work | Planning purpose |
| --- | --- | --- |
| #811 | Define the analytics query-definition contract | Establish the explicit contract used by the selected analytics/natural-language query workflow. |
| #812 | Bound database statement execution time | Add production-safety protection against unbounded database statement execution during final hardening. |
| #814 | Integrate an LLM provider through a server-side adapter | Provide the isolated server-side external-service integration required by the natural-language query workflow without exposing provider credentials to the frontend. |
| #820 | Define consumer API access model and API-key purpose | Establish the intended anonymous/API-key consumer model before the final consumer-management workflow is completed. |

These closed issues must not disappear from Sprint 4 evidence merely because they
were completed quickly. Their implementation and Pull Requests form part of the
final milestone history.

### Selected user-facing and API enhancements
```

---

### 2. Replace the selected-enhancements table

Replace:

```python
| Issue | Work | Planning purpose |
| --- | --- | --- |
| #802 | Lightweight personalisation for authenticated users | Small repeat-user UX improvement without creating a new large preferences subsystem. |
| #813 | Evaluate query definitions deterministically | Foundation for the selected natural-language/query-definition workflow. |
| #815 | Expose the natural-language query endpoint | Make the query capability available through the API. |
| #816 | Build the natural-language query page | Provide a usable frontend for the query capability. |
| #817 | Document and evidence the natural-language query feature | Ensure the new feature is understandable, demonstrable and evidenced. |
| #821 | Unify anonymous and API-key consumer read flow | Simplify and harden consumer API behaviour. |
| #822 | Add user-requested API consumer access and key management | Deliver the requested frontend/API-consumer management workflow. |
```

with:

```python
| Issue | Work | Planning purpose |
| --- | --- | --- |
| #802 | Lightweight personalisation for authenticated users | Small repeat-user UX improvement without creating a new large preferences subsystem. |
| #813 | Evaluate query definitions deterministically | Execute validated analytics query definitions predictably and safely. |
| #815 | Expose the natural-language query endpoint | Make the completed query pipeline available through the API. |
| #816 | Build the natural-language query page | Provide a usable frontend for the query capability. |
| #817 | Document and evidence the natural-language query feature | Ensure the new feature is understandable, demonstrable and evidenced. |
| #821 | Unify anonymous and API-key consumer read flow | Implement the consumer access model defined under #820 consistently in the backend. |
| #822 | Add user-requested API consumer access and key management | Deliver the requested frontend/API-consumer management workflow. |
```

---

### 3. Replace the natural-language sequence

Find:

```python
The natural-language query work should be treated as one coherent feature slice.
The expected implementation sequence is:

`#813 -> #815 -> #816 -> #817`

This is a planning sequence based on the current issue scopes. Gitea remains
authoritative for any formal dependency edges.

The API-consumer refinement is similarly expected to stabilise the backend read
flow in #821 before or alongside the user-facing consumer-management work in #822.
```

Replace with:

```python
The natural-language query work should be treated as one coherent feature slice.

Its refined Sprint 4 structure is:

`#811 -> (#813 + #814) -> #815 -> #816 -> #817`

where:

- #811 defines the analytics query-definition contract;
- #813 evaluates those definitions deterministically;
- #814 isolates LLM-provider interaction behind a server-side adapter;
- #815 exposes the completed capability through the API;
- #816 provides the user-facing query page; and
- #817 documents and evidences the final feature.

#811 and #814 were already completed during early Sprint 4 refinement.

The API-consumer work similarly begins with the access model established under
#820, followed by backend/read-flow and user-facing implementation:

`#820 -> (#821 + #822)`

#820 was already completed during early Sprint 4 refinement.

These sequences describe the planning relationship between the issues. Gitea
remains authoritative for formal dependency edges and live issue status.
```

---

### 4. Update the rubric table

Find:

```python
| API - architecture | #806, #809 |
| API - deployment | #806, #810 |
| API - performance | #806 |
| API - design | #806, plus applicable API feature issues |
```

Replace with:

```python
| API - architecture | #806, #811, #814, #820, #809 |
| API - deployment | #806, #810 |
| API - performance | #806, with database execution protection from #812 supporting bounded backend behaviour |
| API - design | #806, #811, #813, #815, #820, #821, #822 |
```

Then find:

```python
| Misc - integration | #808 and #809 verification against the final implemented system |
```

Replace with:

```python
| Misc - integration | #814, with final integration documentation/verification under #808 and #809 |
```

---

### 5. Update the Final Submission refinement mapping

In the `F-04` row, replace:

```python
| F-04 - performance/security/accessibility/cross-browser audits | Performance: #797/#806; accessibility/responsiveness: #798/#800. Security and cross-browser verification must remain explicit in final release evidence; create a separate issue if existing final audits cannot evidence them cleanly. |
```

with:

```python
| F-04 - performance/security/accessibility/cross-browser audits | Frontend performance: #797; API performance: #806; bounded database execution: #812; accessibility/responsiveness: #798/#800. Security and cross-browser verification must remain explicit in final release evidence; create a separate issue if existing final audits cannot evidence them cleanly. |
```

---

### 6. Update `BACKLOG_REFINEMENT`

Find this part:

```python
- final production deployment and project close-out (#810);
- selected natural-language query functionality (#813, #815, #816, #817); and
- API-consumer read-flow and user-requested key-management work (#821, #822).
```

Replace with:

```python
- final production deployment and project close-out (#810);
- analytics query-definition contract and query execution (#811, #813);
- bounded database statement execution (#812);
- server-side LLM-provider integration (#814);
- natural-language query API, frontend and documentation (#815, #816, #817);
- consumer API-access model (#820); and
- API-consumer read-flow and user-requested key-management work (#821, #822).
```

---

### 7. Update the verifier

In:

```python
required_issue_numbers = [
```

make the whole list:

```python
required_issue_numbers = [
    "#797",
    "#798",
    "#799",
    "#800",
    "#801",
    "#802",
    "#803",
    "#804",
    "#805",
    "#806",
    "#807",
    "#808",
    "#809",
    "#810",
    "#811",
    "#812",
    "#813",
    "#814",
    "#815",
    "#816",
    "#817",
    "#820",
    "#821",
    "#822",
    "#827",
]
```

---

### 8. Update the PR summary

Find:

```python
- current refined backlog covering #797-#810 and subsequently refined Sprint 4 work
  (#813, #815-#817, #821-#822, #827)
```

Replace with:

```python
- current refined backlog covering #797-#822 and #827, including early-completed
  Sprint 4 foundation work (#811, #812, #814 and #820)
```

That now gives us the **proper story**:

```text
Sprint planning
      ↓
query contract #811 ✅
DB safety #812 ✅
LLM adapter #814 ✅
consumer access model #820 ✅
      ↓
remaining implementation / UX / testing / release work
      ↓
final audits
      ↓
#810 release
```

And importantly, #799 won't accidentally make it look like Sprint 4 only consists of what is **currently open**. It records what the team actually planned and did, including things already completed.

After those replacements, run:

```powershell
python .\apply_issue_799.py --verify
git diff --check
python -m mkdocs build --strict
git status --short
```

Send me that output before we commit.

## Prompt:
10/1/2026, 5:59:15 AM

just give me now the issue to implement in full woith both comboned(so i can kinda copy paste and not add here and there (also a branch name)

## Response:
10/1/2026, 5:59:26 AM · gpt-5-6-thinking

> **Preparing implementation bundle**
>
> I’d provide the branch name plus one complete, copy-pasteable implementation script covering the Sprint 4 planning issues, documentation, CI checks, roadmap updates, and verification steps.
>
> **Prepared implementation bundle**
>
> 
>
> Worked for 9s

Use this branch:

```powershell
git switch main
git pull --ff-only
git switch -c docs/799-sprint-4-planning
```

Then create **`apply_issue_799.py`** in the repo root and paste this whole thing. This is the **combined version**, including #811, #812, #814 and #820.

```python
from __future__ import annotations

import argparse
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent

PLANNING_PATH = "evidence/sprints/sprint-4/2026-09-30-planning.md"
SPRINT4_README_PATH = "evidence/sprints/sprint-4/README.md"
BACKLOG_PATH = "docs/planning/project-backlog.md"
SPRINT_EVIDENCE_PATH = "docs/process/sprint-evidence.md"
AI_REGISTER_PATH = "evidence/ai/registers/shayna-unterslak.csv"
PR_BODY_PATH = "issue-799-pr.md"

PLANNING = r"""# Sprint 4 Planning and Final Submission Scope

**Sprint:** Sprint 4 / Milestone 4 - Project Submission  
**Initial planning date:** 30 September 2026  
**Current refinement snapshot:** 1 October 2026  
**Sprint end:** 11 October 2026  
**Team:** Git Push Pray  
**Related issue:** #799  
**Status:** Active planning baseline

## Purpose

Sprint 4 is the final product-delivery period for Stat'sTheGame.

The sprint is not intended to become another unrestricted feature-development
sprint. Its primary purpose is to convert the near-complete Sprint 3 product
into a stable, tested, documented and demonstrable final submission.

The active Sprint 4 backlog is maintained in Gitea. This document records the
planning baseline, scope rationale, sequencing, risks and relationship between
the previously planned Final Submission roadmap and the concrete Sprint 4
issues.

Gitea remains authoritative for current issue status, formal dependencies,
labels, Pull Requests and completion evidence.

## Context

Sprint 3 concluded on 29 September 2026.

The project submission deadline is 11 October 2026, leaving a short final
delivery window.

Sprint 4 therefore prioritises:

- release quality;
- unresolved defects;
- production performance;
- usability;
- accessibility;
- testing;
- documentation;
- requirements traceability;
- stakeholder and user evidence; and
- final production verification.

The Final Submission roadmap established earlier in the project already
identified the need to:

- resolve release-blocking defects;
- verify production deployment and database readiness;
- complete final performance, security, accessibility and browser checks;
- complete requirements traceability;
- finalise technical, testing and AI-use documentation;
- preserve reproducible and demonstrable workflows; and
- create the final release state and tag.

Sprint 4 planning refines that roadmap against the actual system state after
Sprint 3.

The issue list below represents the refined Sprint 4 scope as of 1 October
2026.

Some issues were created and completed immediately after the initial Sprint 4
planning discussion as team members refined selected work into actionable
tasks. Their inclusion here does not imply that every issue already existed at
the first planning conversation.

## Planning Inputs

Sprint 4 planning considered:

1. the Sprint 3 close-out and remaining known work;
2. the COMS3011A Milestone 4 rubric;
3. the existing Final Submission roadmap;
4. known defects and usability findings;
5. recent user and stakeholder feedback;
6. production performance and deployment evidence;
7. testing and coverage status;
8. documentation and evidence requirements;
9. work proposed during the team Sprint 4 planning discussion; and
10. issues subsequently refined into the Sprint 4 milestone.

## Sprint 4 Goal

Release a stable, polished and demonstrable final Stat'sTheGame product by
11 October 2026, prioritising final rubric coverage, release-blocking defects,
production performance, usability, testing, documentation and evidence, while
completing selected user-facing and API enhancements that fit safely within
the remaining delivery window.

## Prioritisation

Sprint 4 work is prioritised in this order:

1. release-blocking defects and regressions;
2. mandatory project requirements and final-rubric gaps;
3. deployment, performance, testing, accessibility and data integrity;
4. user and stakeholder feedback affecting important workflows;
5. documentation, methodology evidence and requirements traceability;
6. selected enhancements already accepted into the Sprint 4 milestone; and
7. optional polish that does not put the release candidate at risk.

Selected enhancements must not displace required final verification or leave
previously working functionality unstable.

## Refined Sprint 4 Backlog

### Release quality, UX and production hardening

| Issue | Work | Planning purpose |
| --- | --- | --- |
| #797 | Lighthouse Performance >=90 across frontend pages | Final application-performance hardening and evidence. |
| #798 | Privacy Notice, Terms of Use and Accessibility Statement | Public policy/accessibility readiness and final-release professionalism. |
| #800 | Final UI/UX, accessibility and responsive polish | Application-wide usability, aesthetics, accessibility and responsive quality pass. |
| #801 | Improve submission feedback and JSON upload guidance | Correct misleading submission options/templates and improve actionable submission feedback. |
| #827 | Make unresolved batch validation errors understandable to end users | Resolve the specific batch-validation UX defect discovered during final testing. |

#801 and #827 overlap in the submission experience but are not duplicates.

#801 covers the broader submission workflow, supported package guidance,
templates and submission feedback.

#827 is the narrower defect involving unresolved batch-validation errors.

The implementations should use a consistent error-presentation approach and
avoid conflicting frontend behaviour.

### Early Sprint 4 foundation and hardening already completed

Several Sprint 4 items were refined into actionable issues and completed during
the first part of the milestone before this planning record was finalised.

They remain part of the Sprint 4 scope and evidence even though they are
already closed in Gitea.

| Issue | Work | Planning purpose |
| --- | --- | --- |
| #811 | Define the analytics query-definition contract | Establish the explicit contract used by the selected analytics/natural-language query workflow. |
| #812 | Bound database statement execution time | Add production-safety protection against unbounded database statement execution during final hardening. |
| #814 | Integrate an LLM provider through a server-side adapter | Provide isolated server-side external-service integration without exposing provider credentials to the frontend. |
| #820 | Define consumer API access model and API-key purpose | Establish the intended anonymous/API-key consumer model before the final consumer-management workflow. |

These closed issues must remain visible in Sprint 4 evidence rather than
disappearing from the milestone history simply because they were completed
quickly.

### Selected user-facing and API enhancements

| Issue | Work | Planning purpose |
| --- | --- | --- |
| #802 | Lightweight personalisation for authenticated users | Small repeat-user UX improvement without creating a large preferences subsystem. |
| #813 | Evaluate query definitions deterministically | Execute validated analytics query definitions predictably and safely. |
| #815 | Expose the natural-language query endpoint | Make the completed query capability available through the API. |
| #816 | Build the natural-language query page | Provide a usable frontend for the query capability. |
| #817 | Document and evidence the natural-language query feature | Ensure the new feature is understandable, demonstrable and evidenced. |
| #821 | Unify anonymous and API-key consumer read flow | Implement the consumer access model consistently in the backend. |
| #822 | Add user-requested API consumer access and key management | Deliver the requested frontend/API-consumer management workflow. |

These are deliberately bounded Sprint 4 enhancements.

Their implementation must not prevent completion of the release, testing and
documentation gates.

#### Natural-language analytics flow

The natural-language query work should be treated as one coherent feature
slice.

Its refined Sprint 4 structure is:

`#811 -> (#813 + #814) -> #815 -> #816 -> #817`

where:

- #811 defines the analytics query-definition contract;
- #813 evaluates those definitions deterministically;
- #814 isolates LLM-provider interaction behind a server-side adapter;
- #815 exposes the completed capability through the API;
- #816 provides the user-facing query page; and
- #817 documents and evidences the final feature.

#811 and #814 were already completed during early Sprint 4 refinement.

This sequence represents the planning relationship between the tasks. Gitea
remains authoritative for formal dependency edges.

#### API-consumer flow

The API-consumer work begins with the access model established under #820,
followed by the backend/read-flow and user-facing implementation:

`#820 -> (#821 + #822)`

#820 was already completed during early Sprint 4 refinement.

### Validation, evidence and release management

| Issue | Work | Planning purpose |
| --- | --- | --- |
| #799 | Record Sprint 4 planning and final submission scope | Preserve this final-sprint planning baseline and roadmap refinement. |
| #803 | Final structured user testing and feedback integration | Test the near-final product formally and integrate or explicitly disposition findings. |
| #804 | Record Sprint 4 scrums and stakeholder interactions | Preserve methodology and stakeholder evidence throughout the final sprint. |
| #805 | Final automated testing, coverage and regression audit | Confirm required suites and coverage processes remain healthy after final changes. |
| #806 | Final API design, architecture, availability and performance audit | Verify the API against the complete final product and rubric. |
| #807 | Final database data, structure and deployment audit | Verify final schema, integrity, representative data and production deployment. |
| #808 | Final documentation, methodology and tooling audit | Reconcile public/repository documentation with what is actually shipped. |
| #809 | Verify final requirements and rubric traceability | Map final requirements/rubric categories to implementation, tests and evidence. |
| #810 | Final production deployment, rubric audit and project close-out | Final release gate, deployment smoke test, evidence review and submitted tag/state. |

## Execution and Dependency Strategy

### Work that can begin immediately

The following categories can proceed in parallel:

- frontend quality review;
- submission workflow corrections;
- personalisation;
- Scrum and stakeholder evidence;
- API audit work;
- database audit work;
- requirements/rubric traceability;
- natural-language query implementation;
- API-consumer implementation; and
- final defects such as #827.

### Frontend performance gate

Final Lighthouse evidence under #797 should be captured after routes and
substantial frontend changes from #798, #800, #801, #802 and other new
user-facing Sprint 4 work have stabilised.

This avoids collecting final performance evidence and then invalidating it
through later route, dependency or bundle changes.

### User-testing gate

Final structured user testing under #803 should exercise the near-final
product.

Important user-facing work should therefore be sufficiently stable before the
final sessions, particularly:

- #800;
- #801;
- #802;
- #816;
- #822; and
- #827 where the affected workflow is included.

Feedback discovered during #803 must either:

- be implemented;
- be linked to an existing issue;
- become a new tracked issue; or
- be explicitly deferred with a reason.

### Testing and documentation gates

#805 is the final regression and coverage audit.

It should close only after the important final implementation work has landed
and the final candidate can be exercised as a whole.

#808 should describe the actual final system rather than documenting intended
behaviour that has not shipped.

#809 may begin immediately but remains a living traceability record until the
release candidate is stable.

### Final release gate

#810 is the final Sprint 4 release gate.

It should close only once:

- release-blocking defects have been resolved or explicitly dispositioned;
- production deployment is healthy;
- final testing evidence is current;
- API, database and application audits are complete;
- documentation describes the deployed product;
- final user and stakeholder evidence has been captured;
- requirements/rubric traceability is current; and
- the exact final release commit/tag is recorded.

## Milestone 4 Rubric Traceability

Sprint 4 planning explicitly covers the Milestone 4 rubric categories.

| Final rubric area | Primary Sprint 4 evidence/work |
| --- | --- |
| Database - data | #807, #809 |
| Database - deployment | #807, #810 |
| Database - structure | #807, #809 |
| API - availability | #806, #810 |
| API - architecture | #806, #811, #814, #820, #809 |
| API - deployment | #806, #810 |
| API - performance | #806, with database execution protection from #812 supporting bounded backend behaviour |
| API - design | #806, #811, #813, #815, #820, #821, #822 |
| App - accessibility | #798, #800 |
| App - aesthetics | #800 |
| App - user experience | #800, #801, #802, #816, #822, #827 |
| App - deployment | #810 |
| App - performance | #797 |
| App - features | #801, #802, #811, #813, #814, #815, #816, #821, #822 and previously completed functionality |
| App - responsiveness | #800 |
| App - structure | #800, #808 |
| Misc - Git methodology | #804, #808, #809 |
| Misc - integration | #814, with final integration documentation/verification under #808 and #809 |
| Misc - testing | #803, #805 |
| Misc - tools | #808, #809 |

The table identifies where evidence should come from.

It does not replace the detailed final requirements/rubric matrix maintained
under #809.

## Refinement of the Original Final Submission Roadmap

The original Final Submission roadmap identified F-01 through F-10 before the
detailed final-sprint issues existed.

Sprint 4 planning refines those items as follows.

| Planned item | Sprint 4 disposition |
| --- | --- |
| F-01 - release-blocking defects | Active through the bug tracker, #801, #827 and any new final defects. |
| F-02 - production database migration/backup/restore verification | Primarily #807. Any backup/restore gap discovered under #807 must be resolved or explicitly tracked. |
| F-03 - production secrets/configuration/deployments | Primarily #810, supported by #806 and #807. |
| F-04 - performance/security/accessibility/cross-browser audits | Frontend performance: #797; API performance: #806; bounded database execution: #812; accessibility/responsiveness: #798/#800. Security and cross-browser verification must remain explicit in final release evidence; create a separate issue if existing final audits cannot evidence them cleanly. |
| F-05 - requirements traceability/limitations/acceptance | #809, with final release confirmation under #810. |
| F-06 - database/third-party/testing/AI documentation | #808, supported by #805 and #807. |
| F-07 - reproducible demonstration data and scripted demonstration | Final product should retain representative demonstrable data/workflows through #807/#809/#810. Presentation-specific scripting may continue after the product submission where appropriate. |
| F-08 - group presentation | The formal presentation occurs after the 11 October product submission and is not treated as a Sprint 4 product implementation blocker. |
| F-09 - group/individual reports and peer review | These have later formal deadlines and are outside the Sprint 4 product implementation scope. |
| F-10 - release notes/tag/submission package | #810. |

This refinement records an intentional evolution of the original roadmap rather
than silently deleting or pretending to complete planned work.

## Important Final-Sprint Risks

### Short release window

Sprint 4 has substantially less development time than the earlier milestones.

Mitigation:

- prioritise required release work first;
- keep enhancements bounded;
- avoid late architectural rewrites unless required by a blocking defect.

### Late feature regression

The natural-language query, API-consumer and personalisation work introduce
changes late in the project.

Mitigation:

- require relevant regression tests;
- keep #805 as the final full regression gate;
- do not weaken existing tests merely to merge late work.

### Submission-workflow overlap

#801 and #827 affect related submission error behaviour.

Mitigation:

- cross-reference the implementations;
- use one consistent error-presentation model;
- avoid duplicate or conflicting frontend handling.

### Documentation drift

Sprint 4 contains several features and production changes after substantial
documentation work has already occurred.

Mitigation:

- #808 remains open until final functionality is stable;
- #817 owns documentation for the natural-language query feature;
- #809 verifies final traceability.

### Performance evidence becoming stale

New frontend routes or components can change Lighthouse results.

Mitigation:

- perform final #797 evidence after major frontend work stabilises.

### User testing occurring too late

If formal user testing is postponed until the final day, actionable findings
cannot reasonably be integrated.

Mitigation:

- run #803 as soon as the principal user-facing Sprint 4 flows are testable;
- record and triage findings immediately.

### Privacy and policy drift

Personalisation, authentication-related UI, API-consumer functionality or other
new data handling may alter information stored or processed by the application.

Mitigation:

- re-check #798 against the final implementation before closure;
- ensure public policy pages describe the product that actually ships.

### External integration risk

#814 adds an external LLM-provider integration.

Mitigation:

- keep provider credentials server-side;
- isolate provider-specific code behind the adapter;
- handle provider failure safely;
- ensure final documentation accurately describes the integration.

## Scope Control

Sprint 4 remains a release-focused milestone.

New work may enter the milestone when it:

- fixes a real defect;
- addresses material stakeholder or user feedback;
- closes a rubric or project-requirement gap;
- is required for deployment or release;
- provides necessary documentation or evidence; or
- is a bounded enhancement the team deliberately accepts without risking
  required work.

New work must not be hidden inside unrelated issues merely to avoid tracking
it.

Material scope changes should be recorded through Gitea and, where they affect
the Sprint 4 plan, reflected in close-out evidence.

## Definition of Sprint 4 Done

Sprint 4 can close when:

- the intended final product is deployed;
- core public, authenticated, submission, review and API workflows operate
  normally;
- no known release-blocking defect remains unresolved;
- final application and API performance evidence is current;
- final accessibility and responsiveness checks are complete;
- final automated regression and coverage evidence is current;
- structured final user testing has been completed and findings dispositioned;
- stakeholder and Scrum evidence is current;
- database and API audits are complete;
- public and repository documentation match the shipped system;
- final requirements and rubric traceability is complete;
- known limitations are explicit;
- the exact release commit is agreed; and
- the final submission tag/state is recorded.

## Planning Maintenance

This document is a planning baseline, not a replacement for Gitea.

During Sprint 4:

- routine status changes remain in Gitea;
- new defects are tracked as issues;
- formal dependencies remain authoritative in Gitea;
- significant scope changes are recorded with their reason; and
- close-out evidence will reconcile this plan against what was actually
  delivered.

## AI Declaration

The preceding document was planned, generated and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].

The team remains responsible for reviewing the planning record against the
actual Sprint 4 milestone and final repository state.
"""

SPRINT4_README = r"""# Sprint 4 Evidence

This directory contains repository evidence for Sprint 4 / the final project
submission milestone.

Gitea remains authoritative for live issue status, formal dependencies and
Pull Requests.

| Record | Related issue | Purpose |
| --- | --- | --- |
| [`2026-09-30-planning.md`](2026-09-30-planning.md) | #799 | Sprint 4 planning baseline, scope refinement, sequencing, risks and final-submission traceability. |

Additional Sprint 4 Scrum, stakeholder, user-testing and close-out evidence
should be linked here as it is completed.

## AI Declaration

The Issue #799 Sprint 4 planning evidence and index were planned, generated and
edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
"""

BACKLOG_REFINEMENT = r"""
### Sprint 4 Refinement - 30 September 2026

The Final Submission backlog above was intentionally created before detailed
final issues existed.

Following Sprint 3 close-out, that roadmap has now been refined into the active
Sprint 4 milestone.

The current planning baseline is recorded in
`evidence/sprints/sprint-4/2026-09-30-planning.md` under Issue #799.

The refined Sprint 4 work includes:

- frontend performance and release hardening (#797);
- public privacy, terms and accessibility material (#798);
- Sprint 4 planning and methodology evidence (#799, #804);
- final UX, accessibility and responsive polish (#800);
- submission usability and validation feedback (#801, #827);
- bounded authenticated-user personalisation (#802);
- final structured user testing (#803);
- final testing and coverage regression verification (#805);
- final API and database audits (#806, #807);
- final documentation, tooling and methodology audit (#808);
- final requirements and rubric traceability (#809);
- final production deployment and project close-out (#810);
- analytics query-definition contract and query execution (#811, #813);
- bounded database statement execution (#812);
- server-side LLM-provider integration (#814);
- natural-language query API, frontend and documentation (#815, #816, #817);
- consumer API-access model (#820); and
- API-consumer read-flow and user-requested key-management work (#821, #822).

Several of these issues were refined and completed immediately after the Sprint
4 planning discussion. They remain part of the final milestone history even
where Gitea now records them as closed.

This refinement does not rewrite the historical roadmap.

It records how the previously planned Final Submission work was converted into
actionable issues after Sprint 3 and how selected late enhancements were
accepted into the final milestone.

Gitea remains authoritative for current issue state and formal dependencies.
"""

SPRINT_EVIDENCE_BLOCK = r"""
## Sprint 4

Sprint 4 is the final project-submission milestone.

| Date | Record |
| --- | --- |
| 30 Sep 2026 | [Sprint 4 planning and final-submission scope](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-4/2026-09-30-planning.md) |

Repository index:
[`evidence/sprints/sprint-4/README.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-4/README.md)

The planning record captures the refined final-submission backlog, early
completed Sprint 4 work, sequencing, scope decisions, known risks and the
relationship between the original roadmap and the current Gitea milestone.

Current issue status and formal dependencies remain authoritative in Gitea.

The Issue #799 Sprint 4 planning navigation update was planned, generated and
edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
"""

PR_BODY = r"""## Summary

Implements #799 by recording the Sprint 4 / final-submission planning baseline.

### Added

- Sprint 4 planning evidence under `evidence/sprints/sprint-4/`
- Sprint 4 evidence index
- refined backlog covering #797-#822 and #827
- early-completed Sprint 4 foundation work (#811, #812, #814 and #820)
- final-rubric traceability baseline
- sequencing and dependency strategy
- risk and scope-control decisions
- mapping from the original F-01-F-10 Final Submission roadmap to current work

### Updated

- `docs/planning/project-backlog.md`
- `docs/process/sprint-evidence.md`
- Shayna AI-use register

### Planning note

The record distinguishes the initial 30 September planning baseline from issues
refined immediately afterwards.

It does not claim that every currently listed issue existed at the exact first
planning discussion.

Already-completed Sprint 4 issues remain represented so that milestone evidence
reflects the work actually performed rather than only the issues that are still
open.

Gitea remains authoritative for live issue state and formal dependencies.

## Verification

- `python apply_issue_799.py --verify`
- `git diff --check`
- `python -m mkdocs build --strict`

## AI Declaration

The preceding Pull Request description was planned and generated with the
assistance of ChatGPT-Web[GPT-5.6 Sol].

Closes #799
"""

EXPECTED_AI_HEADER = [
    "Date",
    "Team member",
    "Tool",
    "Model",
    "Purpose",
    "Brief task",
    "Output used",
    "Verification or adaptation",
    "Related evidence",
]

def fail(message: str) -> None:
    raise RuntimeError(message)

def read(rel: str) -> str:
    path = ROOT / rel

    if not path.exists():
        fail(f"Expected repository file not found: {rel}")

    return path.read_text(encoding="utf-8-sig")

def write(rel: str, content: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        content.rstrip() + "\n",
        encoding="utf-8",
        newline="\n",
    )

def update_backlog() -> None:
    text = read(BACKLOG_PATH)

    marker = "### Sprint 4 Refinement - 30 September 2026"

    if marker in text:
        return

    anchor = "### Final Submission Expected Outcome"

    if anchor not in text:
        fail(
            f"Could not update {BACKLOG_PATH}: "
            f"expected anchor {anchor!r} was not found."
        )

    text = text.replace(
        anchor,
        BACKLOG_REFINEMENT.strip() + "\n\n" + anchor,
        1,
    )

    write(BACKLOG_PATH, text)

def update_sprint_evidence() -> None:
    text = read(SPRINT_EVIDENCE_PATH)

    if "## Sprint 4" in text:
        if "2026-09-30-planning.md" in text:
            return

        fail(
            f"{SPRINT_EVIDENCE_PATH} already has a Sprint 4 section "
            "but not the Issue #799 planning link. Review manually "
            "rather than allowing the patch to guess its structure."
        )

    block = SPRINT_EVIDENCE_BLOCK.strip() + "\n\n"

    possible_anchors = [
        "\n## Future Sprints",
        "\n## How to add future Sprint evidence",
        "\n## AI Declaration",
    ]

    positions = []

    for anchor in possible_anchors:
        position = text.find(anchor)

        if position >= 0:
            positions.append(position)

    if positions:
        pos = min(positions)

        text = (
            text[:pos].rstrip()
            + "\n\n"
            + block
            + text[pos:].lstrip("\n")
        )
    else:
        text = text.rstrip() + "\n\n" + block

    write(SPRINT_EVIDENCE_PATH, text)

def append_ai_register() -> None:
    path = ROOT / AI_REGISTER_PATH

    if not path.exists():
        fail(f"Expected repository file not found: {AI_REGISTER_PATH}")

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as handle:
        rows = list(csv.reader(handle))

    if not rows:
        fail(f"{AI_REGISTER_PATH} is empty.")

    if rows[0] != EXPECTED_AI_HEADER:
        fail(
            "AI register header has changed.\n"
            f"Expected: {EXPECTED_AI_HEADER}\n"
            f"Actual:   {rows[0]}\n"
            "Review the register before appending."
        )

    for row in rows[1:]:
        if len(row) >= 6 and "Issue #799" in row[5]:
            return

    new_row = [
        "2026-10-01",
        "Shayna Unterslak",
        "ChatGPT Web",
        "GPT-5.6 Sol",
        (
            "Sprint planning; backlog refinement; documentation; "
            "rubric traceability; review"
        ),
        (
            "Issue #799: establish the Sprint 4/final-submission planning "
            "baseline, refine the historical Final Submission roadmap "
            "against the current Sprint 4 milestone, and document "
            "sequencing, risks, scope decisions and final-rubric "
            "traceability."
        ),
        (
            "Generated the Sprint 4 planning record, Sprint 4 evidence "
            "index, Final Submission roadmap-refinement section, public "
            "sprint-evidence navigation update, verification script and "
            "Pull Request draft."
        ),
        (
            "Shayna supplied and reviewed the current Sprint 4 issue list, "
            "including already-completed issues #811, #812, #814 and #820. "
            "The generated planning record distinguishes the initial planning "
            "baseline from issues refined afterwards. Repository diff, strict "
            "documentation build and teammate review remain required before "
            "merge."
        ),
        (
            "Issue #799; "
            "evidence/sprints/sprint-4/2026-09-30-planning.md; "
            "evidence/sprints/sprint-4/README.md; "
            "docs/planning/project-backlog.md; "
            "docs/process/sprint-evidence.md"
        ),
    ]

    with path.open(
        "a",
        encoding="utf-8",
        newline="",
    ) as handle:
        writer = csv.writer(
            handle,
            lineterminator="\n",
        )
        writer.writerow(new_row)

def verify() -> None:
    required_files = [
        PLANNING_PATH,
        SPRINT4_README_PATH,
        BACKLOG_PATH,
        SPRINT_EVIDENCE_PATH,
        AI_REGISTER_PATH,
        PR_BODY_PATH,
    ]

    missing = [
        rel
        for rel in required_files
        if not (ROOT / rel).exists()
    ]

    if missing:
        fail("Missing expected files: " + ", ".join(missing))

    planning = read(PLANNING_PATH)

    required_issue_numbers = [
        "#797",
        "#798",
        "#799",
        "#800",
        "#801",
        "#802",
        "#803",
        "#804",
        "#805",
        "#806",
        "#807",
        "#808",
        "#809",
        "#810",
        "#811",
        "#812",
        "#813",
        "#814",
        "#815",
        "#816",
        "#817",
        "#820",
        "#821",
        "#822",
        "#827",
    ]

    for issue_number in required_issue_numbers:
        if issue_number not in planning:
            fail(
                f"Verification failed: {issue_number} missing "
                f"from {PLANNING_PATH}"
            )

    planning_needles = [
        "Sprint 4 Goal",
        "Prioritisation",
        "Early Sprint 4 foundation and hardening already completed",
        "#811 -> (#813 + #814) -> #815 -> #816 -> #817",
        "#820 -> (#821 + #822)",
        "Execution and Dependency Strategy",
        "Milestone 4 Rubric Traceability",
        "Refinement of the Original Final Submission Roadmap",
        "Important Final-Sprint Risks",
        "Scope Control",
        "Definition of Sprint 4 Done",
        "ChatGPT-Web[GPT-5.6 Sol]",
    ]

    for needle in planning_needles:
        if needle not in planning:
            fail(
                f"Verification failed: {needle!r} missing "
                f"from {PLANNING_PATH}"
            )

    backlog = read(BACKLOG_PATH)

    for needle in [
        "### Sprint 4 Refinement - 30 September 2026",
        "2026-09-30-planning.md",
        "#811",
        "#812",
        "#814",
        "#820",
        "#827",
    ]:
        if needle not in backlog:
            fail(
                f"Verification failed: {needle!r} missing "
                f"from {BACKLOG_PATH}"
            )

    sprint_evidence = read(SPRINT_EVIDENCE_PATH)

    for needle in [
        "## Sprint 4",
        "2026-09-30-planning.md",
        "Issue #799",
    ]:
        if needle not in sprint_evidence:
            fail(
                f"Verification failed: {needle!r} missing "
                f"from {SPRINT_EVIDENCE_PATH}"
            )

    with (ROOT / AI_REGISTER_PATH).open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as handle:
        rows = list(csv.reader(handle))

    ai_entry_exists = any(
        len(row) >= 6 and "Issue #799" in row[5]
        for row in rows[1:]
    )

    if not ai_entry_exists:
        fail(
            "Verification failed: Issue #799 AI register row missing."
        )

    print("")
    print("Issue #799 Sprint 4 planning applied and verified.")
    print("")
    print("Created/updated:")
    print(f"  {PLANNING_PATH}")
    print(f"  {SPRINT4_README_PATH}")
    print(f"  {BACKLOG_PATH}")
    print(f"  {SPRINT_EVIDENCE_PATH}")
    print(f"  {AI_REGISTER_PATH}")
    print(f"  {PR_BODY_PATH}")
    print("")
    print("Next:")
    print("  git diff --check")
    print("  python -m mkdocs build --strict")
    print("  git status --short")
    print("  git diff --stat")

def apply() -> None:
    write(
        PLANNING_PATH,
        PLANNING,
    )

    sprint4_readme = ROOT / SPRINT4_README_PATH

    if not sprint4_readme.exists():
        write(
            SPRINT4_README_PATH,
            SPRINT4_README,
        )
    else:
        existing = read(SPRINT4_README_PATH)

        if "2026-09-30-planning.md" not in existing:
            existing = (
                existing.rstrip()
                + "\n\n"
                + """## Issue #799 planning record

- [`2026-09-30-planning.md`](2026-09-30-planning.md) - Sprint 4 planning baseline and final-submission scope.

The Issue #799 evidence-index update was planned, generated and edited with
the assistance of ChatGPT-Web[GPT-5.6 Sol].
"""
            )

            write(
                SPRINT4_README_PATH,
                existing,
            )

    update_backlog()
    update_sprint_evidence()
    append_ai_register()

    write(
        PR_BODY_PATH,
        PR_BODY,
    )

def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--verify",
        action="store_true",
        help="Apply the Issue #799 documentation and verify the result.",
    )

    args = parser.parse_args()

    apply()

    if args.verify:
        verify()
    else:
        print("Issue #799 Sprint 4 planning applied.")
        print("Run: python apply_issue_799.py --verify")

if __name__ == "__main__":
    main()
```

Then run:

```powershell
python .\apply_issue_799.py --verify
```

If that passes:

```powershell
git diff --check
python -m mkdocs build --strict
git status --short
git diff --stat
```

Send me that output before committing. The combined version now includes the full Sprint 4 set you gave me: **#797-#822 plus #827 where applicable, including the already-closed #811, #812, #814 and #820**.

## Prompt:
10/1/2026, 6:06:13 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> code apply_issue_799.py
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> python .\apply_issue_799.py --verify

Issue #799 Sprint 4 planning applied and verified.

Created/updated:
  evidence/sprints/sprint-4/2026-09-30-planning.md
  evidence/sprints/sprint-4/README.md
  docs/planning/project-backlog.md
  docs/process/sprint-evidence.md
  evidence/ai/registers/shayna-unterslak.csv
  issue-799-pr.md

Next:
  git diff --check
  python -m mkdocs build --strict
  git status --short
  git diff --stat
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git diff --check
>> python -m mkdocs build --strict
>> git status --short
>> git diff --stat

 │  ⚠  Warning from the Material for MkDocs team
 │
 │  MkDocs 2.0, the underlying framework of Material for MkDocs,
 │  will introduce backward-incompatible changes, including:
 │
 │  × All plugins will stop working – the plugin system has been removed
 │  × All theme overrides will break – the theming system has been rewritten
 │  × No migration path exists – existing projects cannot be upgraded
 │  × Closed contribution model – community members can't report bugs
 │  × Currently unlicensed – unsuitable for production use
 │
 │  Our full analysis:
 │
 │  https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/

INFO    -  Cleaning site directory
INFO    -  Building documentation to directory: C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\site
INFO    -  The following pages exist in the docs directory, but are not included in the "nav" configuration:
             - validation\issue-608-api-deprecation-lifecycle-gap-analysis.md
             - validation\issue-610-api-usage-gap-analysis.md
             - validation\issue-611-advanced-aggregate-query-gap-analysis.md
INFO    -  Documentation built in 4.05 seconds
 M docs/planning/project-backlog.md
 M docs/process/sprint-evidence.md
 M evidence/ai/registers/shayna-unterslak.csv
?? apply_issue_799.py
?? evidence/sprints/sprint-4/
?? issue-799-pr.md
 docs/planning/project-backlog.md           | 44 ++++++++++++++++++++++++++++++
 docs/process/sprint-evidence.md            | 20 ++++++++++++++
 evidence/ai/registers/shayna-unterslak.csv |  1 +
 3 files changed, 65 insertions(+)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
10/1/2026, 6:06:23 AM · gpt-5-6-thinking

> **Reviewing next steps**
>
> I’m seeing a successful strict build, with only informational navigation warnings. Because new files are untracked, the diff summary omits them. I’d stage the documentation and evidence files, then commit and open the pull request.
>
> **Reviewed next steps**
>
> 
>
> Worked for 9s

Great - **#799 implementation looks clean**.

`git diff --check` passed, the **strict MkDocs build passed**, and those three “not included in nav” messages are existing informational warnings, not failures from #799.

One reason your `git diff --stat` only showed 3 files is that Git does **not include untracked files** in the normal diff yet. Your two new Sprint 4 evidence files are there; they just haven't been staged.

I would **not commit** `apply_issue_799.py` or `issue-799-pr.md` - they're local helper files, not project artefacts.

Run this:

```powershell
git add `
  docs/planning/project-backlog.md `
  docs/process/sprint-evidence.md `
  evidence/ai/registers/shayna-unterslak.csv `
  evidence/sprints/sprint-4/2026-09-30-planning.md `
  evidence/sprints/sprint-4/README.md

git status --short
git diff --cached --check
git diff --cached --stat
```

You should see the five real project files staged, while:

```text
?? apply_issue_799.py
?? issue-799-pr.md
```

remain untracked. That's fine.

Then commit:

```powershell
git commit `
  -m "docs(sprint4): record final submission planning" `
  -m "Refs #799" `
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Then:

```powershell
git push -u origin docs/799-sprint-4-planning
```

After that, send me the output and I’ll give you the **final PR title + polished PR description** for #799.

## Prompt:
10/1/2026, 6:07:40 AM

need to add csv loine and this transript

## Response:
10/1/2026, 6:07:47 AM · gpt-5-6-thinking

> **Adding transcript records**
>
> I’m preparing a CSV row that points to an unedited transcript file, plus a transcript template containing the request, response, model, timestamp, and review status. I’m keeping hidden reasoning excluded while preserving the visible exchange.
>
> **Added transcript records**
>
> 
>
> Worked for 9s

Yes - we should add the **actual transcript file** and make the CSV row point to it.

Use this filename:

```text
evidence/ai/transcripts/shayna-unterslak/2026-10-01-issue-799-sprint-4-planning.md
```

Create it:

```powershell
code .\evidence\ai\transcripts\shayna-unterslak\2026-10-01-issue-799-sprint-4-planning.md
```

Paste the **actual relevant ChatGPT conversation for #799** into that file - from when we started planning Sprint 4/issues through the final `apply_issue_799.py` work. Keep the user prompts and assistant responses as they appeared; don't rewrite it into a nicer summary. That is the safest match to the course AI-transparency requirement. `ai_policy_20_jul(1).pdf`

At the top you can add only this identifying header before the verbatim transcript:

```markdown
# AI Transcript - Issue #799 Sprint 4 Planning

**Date:** 2026-10-01  
**Team member:** Shayna Unterslak  
**Tool:** ChatGPT Web  
**Model:** GPT-5.6 Sol  
**Purpose:** Sprint 4 planning, backlog refinement, documentation, rubric traceability and implementation guidance.

---

## Verbatim Conversation

[Paste the relevant ChatGPT conversation below without rewriting it.]
```

### Fix the CSV row

Your script **already added the #799 CSV row**, so **do not add a second row**.

Open:

```powershell
code .\evidence\ai\registers\shayna-unterslak.csv
```

Find the row whose `Brief task` starts with:

```text
Issue #799: establish the Sprint 4/final-submission planning baseline
```

At the **very end of that row**, in the `Related evidence` field, add:

```text
; evidence/ai/transcripts/shayna-unterslak/2026-10-01-issue-799-sprint-4-planning.md
```

So the final `Related evidence` cell should be:

```text
Issue #799; evidence/sprints/sprint-4/2026-09-30-planning.md; evidence/sprints/sprint-4/README.md; docs/planning/project-backlog.md; docs/process/sprint-evidence.md; evidence/ai/transcripts/shayna-unterslak/2026-10-01-issue-799-sprint-4-planning.md
```

Then stage **six** project files instead of five:

```powershell
git add `
  docs/planning/project-backlog.md `
  docs/process/sprint-evidence.md `
  evidence/ai/registers/shayna-unterslak.csv `
  evidence/ai/transcripts/shayna-unterslak/2026-10-01-issue-799-sprint-4-planning.md `
  evidence/sprints/sprint-4/2026-09-30-planning.md `
  evidence/sprints/sprint-4/README.md
```

Then:

```powershell
git status --short
git diff --cached --check
git diff --cached --stat
```

Keep these **untracked**:

```text
apply_issue_799.py
issue-799-pr.md
```

Send me the `git status --short` after you've added the transcript and I'll check it before we commit.

## Prompt:
10/1/2026, 6:09:24 AM

casn u just give me whole csv row to replave



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)