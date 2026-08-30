# CI!CD Readiness Sweep

**User:** Anonymous  
**Created:** 8/28/2026 15:39:14  
**Updated:** 8/28/2026 16:31:27  
**Exported:** 8/28/2026 16:31:34  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a918f60-8004-83e9-a8cb-e5ad559ec299](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a918f60-8004-83e9-a8cb-e5ad559ec299)  

## Prompt:
8/28/2026, 3:39:11 PM

ci/cd will apapprentmy be up this weekend, should we do a general sweeep for issue #10 b4 it comes up to try avoid any disasters that are avoidable?

## Response:
8/28/2026, 3:39:13 PM

> **Remembering**
>
>
> **Planning a readiness sweep**
>
> Yes—I'm treating issue #10 as a pre-CI readiness checkpoint, not something to close prematurely. I’ll review scripts, environment assumptions, test commands, workflow expectations, and deployment documentation, then record concrete evidence and remaining blockers.
>
> **Planned a readiness sweep**
>
> 
>
> **Reviewed Sport Analytics issue #10 requirements and CI/CD blockers**
>
> 
>
> Worked for 27s

Yes - I think we **absolutely should do a pre-CI/CD readiness sweep for #10 before the CI/CD environment comes online this weekend**.

The project brief explicitly requires CI/CD for both collaboration **and deployment**, so once the infrastructure is available, we want #10 to become an integration/configuration job - **not spend the weekend discovering unrelated repo problems**. `project_briefs.pdf`

I’d keep **#10 blocked** for now, but do everything underneath it that does **not actually require the CI/CD server**.

### Pre-CI/CD sweep I’d do

| Check | Why now? |
|---|---|
| `npm ci` from a clean checkout | Proves dependencies install deterministically |
| `npm run check` | Catch lint/type/unit/contract/etc. problems |
| `npm run test:database:local` | Ensure DB integration suite is still clean |
| Playwright E2E | Catch UI/backend integration failures CI will expose |
| Frontend production build | CI usually builds production, not dev mode |
| Backend production build | Same reason |
| MkDocs strict build | Stops docs deployment unexpectedly killing pipeline |
| Architecture/hygiene checks | Especially now that dependency-cruiser is included |
| Review Node/npm versions | CI needs to use the same supported version |
| Check `package-lock.json` is committed/current | Prevent install discrepancies |
| Audit required environment-variable **names** | Know exactly what CI secrets need configuring |
| Check `.env.example` | CI setup becomes much easier if requirements are obvious |
| Secret scan / quick repo search | Make sure no actual credentials accidentally landed in Git |
| Check scripts don't depend on Windows paths | CI runner is likely to expose these |
| Check tests don't rely on local machine state | Ports, installed browsers, existing DBs, cached files, etc. |
| Note any external-service dependencies | Supabase/Azure/Cloudflare/etc. need deliberate CI handling |

And I would specifically run as much as possible from a **fresh state**, rather than from your normal working environment. That's where things such as “works because Shayna already has X installed” tend to show themselves.

### Then when CI/CD comes online

The workflow becomes much cleaner:

**CI available → unblock #10 → configure pipeline → add secrets → run pipeline → fix CI-specific failures → verify deployment → collect evidence → close #10.**

So we're not pretending #10 is done before the blocker disappears. We're just removing all the avoidable landmines first.

Also, this is very worthwhile from the marking perspective. Sprint 2 expects you to be moving toward a **stable product through testing and reviews**, and automated testing itself is 10% of the Sprint 2 rubric. `project_briefs.pdf` CI/CD is also one of the explicit requirements applying to every project. `project_briefs.pdf`

### I think we should actually do this before more feature work

Not a massive audit - maybe **30-60 minutes**. We already had a very strong Sprint 1 local closeout, so I wouldn't reopen everything. I'd basically rerun the known-good gates and inspect the CI-sensitive stuff.

If you want, **send me the current text of issue #10**, and we can go through the sweep together now and I’ll tell you **exactly what commands to run, one at a time**, and what evidence we should save so that when CI/CD appears we can attack #10 immediately.

## Prompt:
8/28/2026, 3:42:51 PM

yes, lets do it all, even make the pipelines (or fix them) and document, so when it comes up we see sta=raught away where we stand?

# Restore green CI and reproducible installation #10

**svgOpen**

opened 3 weeks ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 3 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#issue-12)

**Member**

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#description)Description

Investigate the current queued Gitea Actions workflow and establish a reproducible installation, test and build process for the repository.

The existing workflow must be checked against the available Wits Gitea Actions runner configuration. The local and automated processes must use the same dependency installation and repository checks where possible.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#motivation)Motivation

The repository currently contains a CI workflow, but the workflow remains queued and has not produced a successful result.

A reliable CI process is necessary to detect build, test, linting, formatting and type-checking problems before changes are merged into `main`. A reproducible installation is also required so that all team members and the CI runner use the same dependency versions.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#scope)Scope

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#included)Included

- investigating why the current CI workflow remains queued;
- confirming which runner labels are available;
- establishing a reproducible dependency installation;
- verifying the existing repository check scripts;
- updating the CI workflow where necessary;
- documenting the CI process and any external blocker.

### [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#excluded)Excluded

- application deployment to Azure;
- Cloudflare Pages deployment;
- product-specific automated tests;
- sport-specific implementation.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#acceptance-criteria)Acceptance Criteria

- The reason the current Gitea Actions workflow remains queued is confirmed
- The available or required runner label is documented
- Any server-side runner dependency is recorded clearly
- A root `package-lock.json` exists and is committed
- A clean installation succeeds using the committed lockfile
- CI uses `npm ci` rather than `npm install`
- `npm run check` succeeds locally from a clean installation
- The frontend tests pass
- The backend tests pass
- Linting, formatting, type-checking and production builds pass
- `.gitea/workflows/ci.yml` is updated where required
- The CI process is documented in the repository
- At least one successful CI run is recorded, unless the Wits server has no available runner
- If a server-side runner is unavailable, the issue is moved to `Blocked` with the required blocker information
- Required status checks are only enabled on `main` after a successful CI run is available
- No unrelated application features are added

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#dependencies)Dependencies

Access to, or information from, the Wits Gitea administrator may be required to confirm runner availability and supported runner labels.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#evidence)Evidence

Evidence must include:

- the updated CI workflow;
- the committed lockfile;
- local `npm run check` results;
- the Gitea Actions result or screenshot;
- CI documentation;
- any administrator response or documented blocker;
- the linked Pull Request.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#ai-declaration)AI Declaration

The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sprint 1** milestone 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**type: infrastructure**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=29)

 label 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sport-Analytics-Tool-Proj** project 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**area: infrastructure**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=30)

 label 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) moved this to Ready in svg [Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2) on 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) self-assigned this 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) moved this to In Progress in svg [Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2) on 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-142)

svg[style: align repository formatting](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/a0b94a882d71b763455828b59eb09572d720d6ea)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-143)

svg[build: lock reproducible dependency versions](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/632d3777ee1246161c5edd83d6c0e24e81617cf9)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-144)

svg[chore(lint): allow intentionally unused parameters](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/4fcf34a0485b25799464a8599c29b0124234dcd9)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-145)

svg[fix(frontend): handle optional abort signal](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/b49de6a824c7c2efc7742452adb67a9252a33d78)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-146)

svg[ci: use reproducible dependency installation](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/f824cec53b556cd7d8a8641f394985d7e74f29c9)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-147)

svg[docs: record reproducible CI workflow](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/e8b803173a88f45136c1a95501e5d6d2dfc980ad)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) ~~[**Shayna**](https://sdp.ms.wits.ac.za/Shayna)~~~~ ~~~~[referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/16)~~~~[3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-148)~~

[**ci: restore green CI and reproducible installation**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/16)[ #16](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/16)

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#issuecomment-150)

**Author**

**Member**

Local CI restoration is complete. A clean `npm ci` installation followed by the full `npm run check` pipeline passes, including formatting, linting, type checking, tests and production builds.

The Gitea Actions workflow is currently blocked by infrastructure: repository Settings → Actions → Runners shows 0 available runners, and all workflow runs remain waiting at 0 seconds.

The Pull Request will remain open until an approved organisation or instance runner is provisioned and the workflow completes successfully.

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) moved this to In Review in svg [Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2) on 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) moved this to Blocked in svg [Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2) on 3 weeks ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/16)[3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-155)

[**ci: restore green CI and reproducible installation**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/16)[ #16](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/16)

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#issuecomment-171)

**Author**

**Member**

The CI configuration and repository fixes have been completed and verified locally. A clean `npm ci` installation followed by `npm run check` passes successfully.

The Pull Request has been merged, but this issue will remain open and blocked until the Gitea Actions runner is available and the workflow completes successfully online.

The lecturer has confirmed that runners are being arranged, although this may take one to two weeks.

svg[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz) ([image](https://sdp.ms.wits.ac.za/avatars/2277e53fd9c58f67ada0020e27e7079b?size=56)) [**BenSwartz**](https://sdp.ms.wits.ac.za/BenSwartz) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-177)

svg[style: align repository formatting](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/4a39832dc7b7ac2e7689d7158bdb553c7b715a2f)

svg[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz) ([image](https://sdp.ms.wits.ac.za/avatars/2277e53fd9c58f67ada0020e27e7079b?size=56)) [**BenSwartz**](https://sdp.ms.wits.ac.za/BenSwartz) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-178)

svg[build: lock reproducible dependency versions](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/192dc66456de297903606465f504f1f38b08f5f6)

svg[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz) ([image](https://sdp.ms.wits.ac.za/avatars/2277e53fd9c58f67ada0020e27e7079b?size=56)) [**BenSwartz**](https://sdp.ms.wits.ac.za/BenSwartz) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-179)

svg[chore(lint): allow intentionally unused parameters](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/018079af8674c1ff58c7b90368b7f8b50502231e)

svg[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz) ([image](https://sdp.ms.wits.ac.za/avatars/2277e53fd9c58f67ada0020e27e7079b?size=56)) [**BenSwartz**](https://sdp.ms.wits.ac.za/BenSwartz) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-180)

svg[fix(frontend): handle optional abort signal](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/9971c5731a78249f7eb952b383810d8c80f56da1)

svg[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz) ([image](https://sdp.ms.wits.ac.za/avatars/2277e53fd9c58f67ada0020e27e7079b?size=56)) [**BenSwartz**](https://sdp.ms.wits.ac.za/BenSwartz) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-181)

svg[ci: use reproducible dependency installation](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/27c58c4284642b8cdd64c4f07570d9212ba93d2c)

svg[BenSwartz](https://sdp.ms.wits.ac.za/BenSwartz) ([image](https://sdp.ms.wits.ac.za/avatars/2277e53fd9c58f67ada0020e27e7079b?size=56)) [**BenSwartz**](https://sdp.ms.wits.ac.za/BenSwartz) referenced this issue from a commit [3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-182)

svg[docs: record reproducible CI workflow](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/c1eeaf2d1e901d722fa65a1a5b63ec8bb02da0bb)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/29)[3 weeks ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-578)

[**Deploy MkDocs documentation to Cloudflare Pages using Wrangler**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/29)[ #29](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/29)

svg[brendan](https://sdp.ms.wits.ac.za/brendan) ([image](https://sdp.ms.wits.ac.za/avatars/647625bf0653758d14d34065ce9bc3ff9534952eeec07bed0d95b576b50c33a2?size=56)) [**brendan**](https://sdp.ms.wits.ac.za/brendan) was assigned by **Dean** 3 days ago

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [3 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#issuecomment-11731)

**Author**

**Member**

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#sprint-2-carry-over)Sprint 2 carry-over

This issue was not completed during Sprint 1 because the required CI/CD
environment/setup dependency remains unavailable.

It was explicitly recorded as incomplete/blocked in the Sprint 1 close-out and
was not represented as completed Sprint 1 work.

The issue is carried into the Sprint 2 milestone and remains `Blocked` until
the CI/CD dependency is available.

When the blocker is resolved, the issue will be re-evaluated and moved to
`Ready` or `In Progress` as appropriate.

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) modified the milestone from **Sprint 1** to **Sprint 2** 3 days ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/260)[3 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-11812)

[**docs(planning): record initial Sprint 2 plan**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/260)[ #260](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/260)

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/288)[2 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/10#event-12695)

[**docs(planning): record Sprint 2 stakeholder approval**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/288)[ #288](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/288)

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

**Write**Preview

## Response:
8/28/2026, 3:43:00 PM

> **Reviewing the implementation**
>
> I can take this through architecture, migrations, tests, containerization, CI/CD, and documentation. I’m first checking the actual repository structure; without access, I can’t safely invent file paths or claim changes are complete.
>
> **Reviewed the implementation**
>
> 
>
> **Searching the web**
>
>
> **Starting repository checks**
>
> I’m beginning with the smallest safe step: confirm the baseline branch, working-tree status, and repository contents. I’ll then use that output to give the next exact command, avoiding assumptions about your project layout.
>
> **Confirming the scope**
>
> I’m treating this as an end-to-end CI-readiness pass: inspect first, then implement, test, document, and report evidence. Deployment workflows remain separate unless the repository already includes them in this issue’s scope.
>
> **Started repository checks and confirmed scope**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 42s

Yes. That is exactly what I’d do now.

But I **wouldn’t rewrite #10 from scratch**. Most of #10 was already completed three weeks ago; the only reason it stayed open was the missing runner. Since the repo has changed substantially since then, we should now do a **fresh pre-runner readiness pass against current `main`**, repair any drift, update the workflow/docs, and leave the repo in a state where the moment Wits turns the runner on we immediately learn whether CI is genuinely green.

That also keeps us aligned with the brief: CI/CD is an explicit project requirement, while Sprint 2 specifically rewards automated testing and a stable product. `project_briefs.pdf`

One important boundary: **#10 explicitly excludes Azure/Cloudflare deployment and product-specific automated tests.** So for this issue we'll make the **core CI pipeline excellent**. We can inspect/prepare CD too, but deployment fixes should stay attached to their proper issues rather than quietly expanding #10.

### What we're going to do

We’ll work through this in roughly this order:

1. Get a clean branch from current `main`.
2. Audit the current CI-sensitive repo state.
3. Re-run a truly clean `npm ci`.
4. Run the full current quality gate.
5. Run frontend/backend tests and production builds explicitly if useful.
6. Re-run DB integration separately.
7. Re-run Playwright separately.
8. Strict-build the docs.
9. Audit Node/npm versions and lockfile consistency.
10. Audit `.env.example`, required env-variable names and accidental secrets.
11. Audit Windows/local-machine assumptions.
12. Inspect `.gitea/workflows/ci.yml`.
13. Simplify/fix the pipeline so it mirrors local commands.
14. Make runner-label assumptions explicit in documentation.
15. Add/update CI troubleshooting documentation.
16. Create fresh verification evidence for #10.
17. Commit it with the required AI attribution.
18. Open a PR linked to #10.
19. When the runner appears: run it immediately, record the result and only then configure required checks on `main`.

Because I'm helping with code/configuration and documentation, we should continue your normal AI evidence process. The course policy requires AI-assisted code generation to be attributed in the commit, and AI-assisted documents need their declaration too. `ai_policy_20_jul.pdf`

### Step 1 - let's start from a known clean current `main`

Don't make any files yet.

From the repo root, run:

```powershell
git status
git switch main
git pull
git status
git log -5 --oneline
```

Paste the **whole output** here.

If `git status` shows local work before the switch, stop there - don't stash or discard anything yet.

Once I see that, we'll create something like:

```text
chore/10-pre-ci-readiness
```

and then I'll have you dump the **actual current** `package.json`, `.gitea/workflows/ci.yml`, Node config and relevant scripts so we fix what exists rather than inventing a pipeline from assumptions.

And yes: by the end I want a proper evidence file along the lines of:

```text
evidence/validation/issue-10-pre-ci-readiness.md
```

with a checklist showing **PASS / BLOCKED BY RUNNER / NOT APPLICABLE**, so when the runner comes alive this weekend there is almost no ambiguity about where we stand.

## Prompt:
8/28/2026, 3:47:09 PM

[ci/10-restore-green-ci](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/ci/10-restore-green-ci)   this branch exists from weeks ago, should we use it? or make a new one?
also, why is site pushedd???
is it measnt to be?

[Attachment: Pasted text(20260828-134615).txt]

[Attachment: Pasted text (2)(1).txt]

## Response:
8/28/2026, 3:47:10 PM

> **Interpreting deployment files**
>
> I’m assessing whether generated `site/` output belongs in version control. Because Cloudflare Pages can build and deploy from source, I’m leaning toward removing generated files while preserving documentation source and deployment configuration.
>
> **Interpreted deployment files**
>
> 
>
> Worked for 26s

Yes - **make a new branch from current `main`**. Don’t reuse `ci/10-restore-green-ci`.

That old branch did its job: PR #16 was merged, and #10 stayed open only because the runner did not exist. Since then `main` has changed enormously - your pull just brought in **114 changed files and 32k+ insertions**. `Pasted text.txt` Reusing a three-week-old branch would mix the old CI restoration work with our new Sprint 2 readiness verification and make the history harder to understand.

Use:

```powershell
git switch -c ci/10-pre-runner-readiness
```

It is completely fine for **one issue to have more than one PR over its lifetime**. In fact, that gives us a clean story:

> PR #16 = initial CI restoration, blocked by infrastructure  
> New PR = revalidate current repository immediately before runner availability

## About `site/` - yes, I noticed that too

Your pull shows things like:

```text
site/api/weather/index.html
site/design/frontend-component-baseline/index.html
site/design/information-architecture-and-wireframes/index.html
site/planning/sprint-1-requirements-traceability/index.html
site/security/password-recovery/index.html
```

being **committed into `main`**. `Pasted text.txt`

For MkDocs, `site/` is normally the **generated build output**.

You have:

```text
docs/
mkdocs.yml
```

as the source, and then:

```text
mkdocs build
```

generates:

```text
site/
```

### In your setup, I do NOT think `site/` should be committed

Especially because you're deploying the docs to Cloudflare Pages. The sensible lifecycle is:

```text
docs/ + mkdocs.yml
        ↓
    mkdocs build
        ↓
      site/
        ↓
Wrangler / Cloudflare Pages
```

`site/` should therefore ordinarily be **ephemeral build output**, not source-controlled content.

The project requirement is that your documentation website is publicly available and statically deployed; it doesn't require generated HTML to live in Git. `project_briefs.pdf`

And committing it has some annoying consequences:

- every documentation edit can produce thousands of generated-line changes;
- stale pages can remain in Git;
- PR diffs become huge;
- merge conflicts become more likely;
- repository size balloons;
- generated output can disagree with the actual `docs/` source;
- CI/CD becomes less reproducible because it's unclear whether CI should trust committed `site/` or rebuild it.

The fact that your pull just included thousands of lines such as generated `index.html` files is exactly the sort of thing we want to catch in this CI sweep. `Pasted text.txt`

### But don't delete it yet

First let's establish **why it is tracked**, because I see your pull also changed `.gitignore`. It is possible someone added `site/` to `.gitignore` **after it had already been committed**.

Important Git behaviour:

> `.gitignore` does **not** stop tracking files that are already tracked.

So you can have:

```gitignore
site/
```

and Git will happily continue committing the existing `site/*` files.

---

## Do this now

First make our new branch:

```powershell
git switch -c ci/10-pre-runner-readiness
```

Then run these:

```powershell
Write-Host "`n--- SITE IGNORE RULE ---"
git check-ignore -v --no-index site/api/weather/index.html

Write-Host "`n--- TRACKED SITE FILE COUNT ---"
git ls-files site | Measure-Object

Write-Host "`n--- FIRST TRACKED SITE FILES ---"
git ls-files site | Select-Object -First 20

Write-Host "`n--- GITIGNORE ---"
Get-Content .gitignore

Write-Host "`n--- RECENT SITE HISTORY ---"
git log --oneline -10 -- site
```

Paste all of that.

### What I expect we'll probably find

Something like:

```text
.gitignore:XX:site/    site/api/weather/index.html
```

**and simultaneously**

```text
Count : [many files]
```

If so, that confirms:

> `site/` is now correctly ignored, but somebody previously committed the generated MkDocs build and Git therefore continues tracking it.

Then as part of **#10's reproducibility cleanup**, I think we should remove the generated artifact from source control with:

```powershell
git rm -r --cached site
```

while leaving `site/` on your actual computer and keeping:

```gitignore
site/
```

in `.gitignore`.

But **don't run the `git rm` yet**. Show me the five outputs above first so we confirm there isn't some deliberate reason your repo is using committed `site/`.

This is already exactly why doing the sweep before the runner appears was a good idea. 😭

## Prompt:
8/28/2026, 3:49:27 PM

6a52339 (HEAD -> main, origin/main, origin/HEAD) Merge pull request '#275 Add the batch ingestion pipeline design' (#308) from docs/275-batch-pipeline-design into main
5ae543c Merge branch 'main' into docs/275-batch-pipeline-design
987e8c0 Merge pull request 'docs(site): align MkDocs theme with brand guidelines' (#307) from docs/253-align-docs-branding into main
d416e9f Merge branch 'main' into docs/253-align-docs-branding
50f2c09 Merge pull request 'feat(submissions): add guided file upload' (#306) from feat/266-guided-file-submission into main
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git switch -c ci/10-pre-runner-readiness
Switched to a new branch 'ci/10-pre-runner-readiness'
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- SITE IGNORE RULE ---"
>> git check-ignore -v --no-index site/api/weather/index.html
>> 
>> Write-Host "`n--- TRACKED SITE FILE COUNT ---"
>> git ls-files site | Measure-Object
>> 
>> Write-Host "`n--- FIRST TRACKED SITE FILES ---"
>> git ls-files site | Select-Object -First 20
>> 
>> Write-Host "`n--- GITIGNORE ---"
>> Get-Content .gitignore
>> 
>> Write-Host "`n--- RECENT SITE HISTORY ---"
>> git log --oneline -10 -- site

--- SITE IGNORE RULE ---
.gitignore:180:/site/   site/api/weather/index.html

--- TRACKED SITE FILE COUNT ---


Count    : 17
Average  : 
Sum      : 
Maximum  : 
Minimum  : 
Property : 


--- FIRST TRACKED SITE FILES ---
site/api/weather/index.html
site/design/assets/wireframes/admin-users-desktop.svg
site/design/assets/wireframes/admin-users-mobile.svg
site/design/assets/wireframes/fixture-detail-desktop.svg
site/design/assets/wireframes/fixture-detail-mobile.svg
site/design/assets/wireframes/fixtures-desktop.svg
site/design/assets/wireframes/fixtures-mobile.svg
site/design/assets/wireframes/home-desktop.svg
site/design/assets/wireframes/home-mobile.svg
site/design/assets/wireframes/signin-desktop.svg
site/design/assets/wireframes/signin-mobile.svg
site/design/assets/wireframes/submission-desktop.svg
site/design/assets/wireframes/submission-mobile.svg
site/design/frontend-component-baseline/index.html
site/design/information-architecture-and-wireframes/index.html
site/planning/sprint-1-requirements-traceability/index.html
site/security/password-recovery/index.html

--- GITIGNORE ---
node_modules/
dist/
build/
coverage/
.venv/
.env
.env.*
!.env.example
*.log
.DS_Store
.vscode/
.idea/
*.local

playwright-report/
test-results/
coverage/
test-results/

# ---> Node
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# Snowpack dependency directory (https://snowpack.dev/)
web_modules/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and not Next.js
# https://nextjs.org/blog/next-9-1#public-directory-support
# public

# vuepress build output
.vuepress/dist

# vuepress v2.x temp and cache directory
.temp
.cache

# vitepress build output
**/.vitepress/dist

# vitepress cache directory
**/.vitepress/cache

# Docusaurus cache and generated files
.docusaurus

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*


# Downloaded Cricsheet data
data/cricsheet/downloads/
data/cricsheet/matches/
data/cricsheet/manifest.json
data/cricsheet/summary.json

# Python-generated files
__pycache__/
*.py[cod]

# Local Gitea issue snapshots (may contain internal project information)
/gitea-export/
/.gitea-export.tmp.*/

# Generated Azure deployment artifacts
/.deployment/

# Allow the documented database-test environment template
!apps/backend/.env.test.example

# Generated MkDocs output
/site/
# Local Codex instructions
/AGENTS.md
AGENTS.md

--- RECENT SITE HISTORY ---
b2d9312 chore(ai): resolve Dean evidence register conflict
0a80aaf docs(ai): add recent Dean ChatGPT evidence
c05ea15 (origin/chore/ignore-mkdocs-site, chore/ignore-mkdocs-site) chore(docs): ignore generated MkDocs site
57ea6e1 (origin/chore/245-remove-generated-site, chore/245-remove-generated-site) chore(docs): remove generated site output
b544337 update Issue #12 onboarding verification and AI evidence
eacc837 integrate Open-Meteo external API and add weather endpoint
62b11f3 docs: deploy MkDocs documentation to Cloudflare Pages


PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 3:49:37 PM

> **Assessing repository state**
>
> I’m seeing that ignore rules exist, but the generated site remains tracked, so Git keeps recording it. Earlier cleanup work appears to have been undone or followed by later changes. I’m checking the history before proposing the safest untracking step.
>
> **Assessed repository state**
>
> 
>
> Worked for 13s

Yep - this confirms it. **`site/` is generated MkDocs output and it should not be tracked.**

The important combination is:

```text
.gitignore:180:/site/
```

but:

```text
Count : 17
```

So Git is being explicitly told to ignore future `site/` output, while **17 old generated files are still tracked**. Your history also tells the story:

```text
57ea6e1 chore(docs): remove generated site output
c05ea15 chore(docs): ignore generated MkDocs site
0a80aaf docs(ai): add recent Dean ChatGPT evidence
b2d9312 chore(ai): resolve Dean evidence register conflict
```

That strongly suggests the repo **correctly removed and ignored `site/`, then later work accidentally reintroduced some tracked generated files**-likely through merges from branches created before the cleanup. Once a file becomes tracked again, `.gitignore` doesn't protect it. That is exactly the sort of repo drift this #10 sweep should catch.

### Fix it now

You're on the correct fresh branch. Run:

```powershell
git rm -r --cached site
```

This removes the 17 files **from Git tracking only**; it should not delete your local generated docs.

Then verify:

```powershell
Write-Host "`n--- TRACKED SITE FILES AFTER CLEANUP ---"
git ls-files site

Write-Host "`n--- LOCAL SITE STILL EXISTS ---"
Test-Path site
Test-Path site/api/weather/index.html

Write-Host "`n--- STATUS ---"
git status --short
```

What we want is:

```text
--- TRACKED SITE FILES AFTER CLEANUP ---
```

with **nothing underneath it**,

and:

```text
True
True
```

for the local files.

`git status` should show the 17 generated files as deletions from the repository. **Don't commit yet** - we'll bundle this into the proper #10 readiness PR after checking everything else.

### And I want to prevent this happening again

Once `site/` is no longer tracked, the existing `/site/` ignore rule should normally be enough. But as part of the CI sweep, we'll also check whether your repository-hygiene tooling can detect accidentally tracked generated output. Given that you've now got dependency-cruiser/knip/syncpack hygiene checks, a tiny generated-artifact check may be worthwhile rather than discovering this again three weeks from now. 

After those commands, our **next step is the important one**: inspect the actual current CI workflow and root scripts before running anything.

So after the verification above, also run:

```powershell
Write-Host "`n--- CI WORKFLOW ---"
Get-Content .gitea/workflows/ci.yml

Write-Host "`n--- ROOT PACKAGE.JSON ---"
Get-Content package.json

Write-Host "`n--- NODE VERSION FILES ---"
Get-ChildItem -Force .nvmrc,.node-version,.tool-versions -ErrorAction SilentlyContinue |
    ForEach-Object {
        Write-Host "`n### $($_.Name)"
        Get-Content $_.FullName
    }

Write-Host "`n--- PACKAGE MANAGER / ENGINE REFERENCES ---"
Select-String -Path package.json -Pattern '"engines"','"packageManager"'
```

Paste that output too.

Then we'll review the pipeline **line by line against current `main`** before doing the clean install. This is already our first genuine #10 finding: **PASS: MkDocs output ignore rule exists; FIX REQUIRED: generated output had regressed into source control.** `Pasted text.txt`

## Prompt:
8/28/2026, 3:50:54 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git rm -r --cached site
rm 'site/api/weather/index.html'
rm 'site/design/assets/wireframes/admin-users-desktop.svg'
rm 'site/design/assets/wireframes/admin-users-mobile.svg'
rm 'site/design/assets/wireframes/fixture-detail-desktop.svg'
rm 'site/design/assets/wireframes/fixture-detail-mobile.svg'
rm 'site/design/assets/wireframes/fixtures-desktop.svg'
rm 'site/design/assets/wireframes/fixtures-mobile.svg'
rm 'site/design/assets/wireframes/home-desktop.svg'
rm 'site/design/assets/wireframes/home-mobile.svg'
rm 'site/design/assets/wireframes/signin-desktop.svg'
rm 'site/design/assets/wireframes/signin-mobile.svg'
rm 'site/design/assets/wireframes/submission-desktop.svg'
rm 'site/design/assets/wireframes/submission-mobile.svg'
rm 'site/design/frontend-component-baseline/index.html'
rm 'site/design/information-architecture-and-wireframes/index.html'
rm 'site/planning/sprint-1-requirements-traceability/index.html'
rm 'site/security/password-recovery/index.html'
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- TRACKED SITE FILES AFTER CLEANUP ---"
>> git ls-files site
>> 
>> Write-Host "`n--- LOCAL SITE STILL EXISTS ---"
>> Test-Path site
>> Test-Path site/api/weather/index.html
>> 
>> Write-Host "`n--- STATUS ---"
>> git status --short

--- TRACKED SITE FILES AFTER CLEANUP ---

--- LOCAL SITE STILL EXISTS ---
True
True

--- STATUS ---
D  site/api/weather/index.html
D  site/design/assets/wireframes/admin-users-desktop.svg
D  site/design/assets/wireframes/admin-users-mobile.svg
D  site/design/assets/wireframes/fixture-detail-desktop.svg
D  site/design/assets/wireframes/fixture-detail-mobile.svg
D  site/design/assets/wireframes/fixtures-desktop.svg
D  site/design/assets/wireframes/fixtures-mobile.svg
D  site/design/assets/wireframes/home-desktop.svg
D  site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- CI WORKFLOW ---"
>> Get-Content .gitea/workflows/ci.yml
>> 
>> Write-Host "`n--- ROOT PACKAGE.JSON ---"
>> Get-Content package.json
>> 
>> Write-Host "`n--- NODE VERSION FILES ---"
>> Get-ChildItem -Force .nvmrc,.node-version,.tool-versions -ErrorAction SilentlyContinue |
>>     ForEach-Object {
>>         Write-Host "`n### $($_.Name)"
>>         Get-Content $_.FullName
>>     }
>> 
>> Write-Host "`n--- PACKAGE MANAGER / ENGINE REFERENCES ---"
>> Select-String -Path package.json -Pattern '"engines"','"packageManager"'

--- CI WORKFLOW ---
name: Continuous Integration

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 25

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: sport_analytics_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U test_user -d sport_analytics_test"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    env:
      NODE_ENV: test
      DATABASE_URL_TEST: postgresql://test_user:test_password@localhost:5432/sport_analytics_test
      SUPABASE_URL: https://example.invalid
      SUPABASE_PUBLISHABLE_KEY: test-publishable-key

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Reset and migrate test database
        run: |
          npm run db:test:reset --workspace=@sport-analytics/backend
          npm run db:test:migrate --workspace=@sport-analytics/backend

      - name: Seed test database
        run: npm run db:test:seed --workspace=@sport-analytics/backend

      - name: Run repository checks
        run: npm run check

      - name: Run database integration tests
        run: npm run test:database

      - name: Run browser and accessibility tests
        run: npm run test:e2e

      - name: Generate coverage
        run: npm run test:coverage

--- ROOT PACKAGE.JSON ---
{
  "name": "sport-analytics-tool",
  "version": "0.1.0",
  "private": true,
  "description": "Event-driven sports analytics platform for COMS3011A.",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "node scripts/run-development-app.mjs",
    "dev:frontend": "node scripts/run-development-app.mjs frontend",
    "dev:backend": "node scripts/run-development-app.mjs backend",
    "build": "npm run build --workspace=@sport-analytics/contracts && npm run build --workspace=@sport-analytics/backend && npm run build --workspace=@sport-analytics/frontend",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test:unit && npm run test:frontend && npm run test:api && npm run test:contracts && npm run test:deployment",
    "test:backend": "npm run test --workspace=@sport-analytics/backend && npm run test:database",
    "test:backend:local": "npm run test --workspace=@sport-analytics/backend && npm run test:database:local",
    "test:unit": "npm run test:unit --workspace=@sport-analytics/backend",
    "test:frontend": "npm run test --workspace=@sport-analytics/frontend",
    "test:api": "npm run test:api --workspace=@sport-analytics/backend",
    "test:database": "npm run test:database --workspace=@sport-analytics/backend",
    "test:contracts": "npm run test --workspace=@sport-analytics/contracts",
    "test:deployment": "node --test tests/deployment/*.test.mjs",
    "test:e2e": "playwright test",
    "test:coverage": "npm run test:coverage --workspaces --if-present",
    "test:ci": "npm run test && npm run test:database && npm run test:e2e",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "structure:check": "node scripts/check-required-files.mjs",
    "openapi:lint": "redocly lint docs/api/openapi.yaml",
    "deploy:prepare:backend": "node scripts/prepare-backend-deployment.mjs",
    "check": "npm run structure:check && npm run format:check && npm run lint && npm run build --workspace=@sport-analytics/contracts && npm run typecheck && npm run test && npm run openapi:lint && npm run build",
    "test:database:local": "node scripts/test-database-local.mjs",
    "hygiene:knip": "knip",
    "hygiene:dependencies": "syncpack lint",
    "hygiene": "npm run hygiene:knip && npm run hygiene:dependencies && npm run hygiene:architecture",
    "hygiene:architecture": "depcruise --config .dependency-cruiser.cjs apps/frontend/src apps/backend/src packages/contracts/src"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.12.1",
    "@playwright/test": "^1.62.1",
    "@redocly/cli": "^2.46.0",
    "@typescript-eslint/eslint-plugin": "^7.18.0",
    "@typescript-eslint/parser": "^7.18.0",
    "@vitest/coverage-v8": "^2.1.9",
    "dependency-cruiser": "^18.2.0",
    "eslint": "^8.57.1",
    "eslint-plugin-react-hooks": "^4.6.2",
    "knip": "^6.32.2",
    "prettier": "^3.3.3",
    "syncpack": "^15.3.3",
    "typescript": "5.5.4",
    "wrangler": "^4.119.0"
  }
}

--- NODE VERSION FILES ---

--- PACKAGE MANAGER / ENGINE REFERENCES ---

package.json:10:  "engines": {


PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 3:51:05 PM

Good - the `site/` cleanup is exactly right. It is still present locally, but **zero `site/` files are tracked now**, so that finding is fixed on our branch.

And the CI workflow is actually a pretty good starting point. I would **not rewrite it yet**. There are a few things I want to verify because they are precisely the sort of things that could make the first runner execution explode even though everything works locally.

### What I see already

**✅ Good**
- `npm ci` is already used.
- PostgreSQL 16 is declared as a CI service.
- Test DB credentials are CI-only fake credentials.
- The pipeline explicitly runs DB tests, E2E and coverage.
- `npm run check` covers structure, formatting, linting, contracts build, typecheck, tests, OpenAPI linting and production builds.
- `package-lock.json` exists.
- `site/` is correctly ignored now.
- The workflow has a sensible 25-minute timeout.

**⚠️ Things we need to resolve before the runner arrives**

The biggest one is **Node version consistency**.

Your repo says:

```json
"engines": {
  "node": ">=20"
}
```

while CI hardcodes:

```yaml
node-version: 20
```

and there is **no `.nvmrc`, `.node-version`, or `packageManager` declaration**.

That means the project currently does *not* really define one reproducible development runtime. `npm ci` reproduces packages, but one developer can use Node 20, another Node 24/25, while CI uses 20. That is an avoidable source of “but it works on my computer.”

I don't want to pick a version blindly yet. We'll see what you're actually running and what your docs currently promise.

There's another potentially important issue: CI manually does:

```text
reset database
migrate database
seed database
```

and **then runs `npm run test:database`**.

We need to inspect what `test:database` itself does. We made a `test:database:local` wrapper specifically around safe DB setup, so we should ensure CI isn't duplicating initialization or depending on assumptions that have changed.

Likewise, we need to inspect Playwright's `webServer` setup before assuming:

```yaml
npm run test:e2e
```

will actually work on a clean Linux runner.

And one more thing: your new repository hygiene checks:

```text
knip
syncpack
dependency-cruiser
```

are **not currently part of CI**.

That may be intentional, but since the purpose of those checks is to prevent repository drift, this is exactly the place where we should decide whether `npm run hygiene` belongs in CI. My inclination is **yes**, assuming it is stable.

---

## Next diagnostic pass

Don't change `package.json` or `ci.yml` yet.

Run this from the branch you're currently on:

```powershell
Write-Host "`n--- LOCAL RUNTIME ---"
node --version
npm --version

Write-Host "`n--- LOCKFILE HEADER ---"
Get-Content package-lock.json -TotalCount 30

Write-Host "`n--- BACKEND PACKAGE ---"
Get-Content apps/backend/package.json

Write-Host "`n--- FRONTEND PACKAGE ---"
Get-Content apps/frontend/package.json

Write-Host "`n--- CONTRACTS PACKAGE ---"
Get-Content packages/contracts/package.json

Write-Host "`n--- PLAYWRIGHT CONFIG ---"
Get-ChildItem -Path . -Filter "playwright.config.*" -File |
    ForEach-Object {
        Write-Host "`n### $($_.FullName)"
        Get-Content $_.FullName
    }

Write-Host "`n--- EXISTING CI DOCUMENTATION ---"
Get-ChildItem docs -Recurse -File |
    Select-String -Pattern "Continuous Integration|CI/CD|Gitea Actions|npm ci|ubuntu-latest" |
    Select-Object -First 80

Write-Host "`n--- WORKFLOW FILES ---"
Get-ChildItem .gitea/workflows -File |
    Select-Object Name,Length,LastWriteTime

Write-Host "`n--- CURRENT CHANGES ---"
git status --short
```

Paste that output.

### Then we're going to do the destructive-but-safe reproducibility test

Once I've checked those scripts, we'll do the important test:

```text
delete node_modules everywhere
→ npm ci
→ verify lockfile didn't change
→ npm run check
→ npm run hygiene
→ DB integration
→ E2E
→ coverage
→ strict MkDocs build
```

We specifically **won't use your existing installed dependencies** for the first test. We want to emulate a brand-new CI machine as closely as we can.

After that we'll modify the workflow based on actual failures rather than guesses.

### I also want one small CI design improvement

Once we've verified everything, I think #10 should leave behind an explicit **preflight/verification document** recording:

| Area | Current result |
|---|---|
| Generated `site/` output | ✅ fixed - untracked and ignored |
| Lockfile | ⏳ verify |
| Clean `npm ci` | ⏳ |
| Runtime version | ⚠️ currently not pinned consistently |
| `npm run check` | ⏳ |
| Hygiene | ⏳ |
| PostgreSQL integration | ⏳ |
| Playwright | ⏳ |
| Coverage | ⏳ |
| MkDocs strict build | ⏳ |
| Linux/Gitea runner | 🚫 infrastructure-blocked |
| Runner label | 🚫 awaiting Wits runner |
| Online CI result | 🚫 awaiting Wits runner |

That means when the runner turns on, we'll know whether a failure is a **real CI environment issue** rather than wondering whether the repo itself was already broken.

And removing the accidentally committed MkDocs output is very much consistent with #10's stated goal of a reproducible build process; the public documentation itself is supposed to be built/deployed, not maintained as generated HTML in Git. `project_briefs.pdf`

Send me that diagnostic output and we'll keep going.

## Prompt:
8/28/2026, 3:53:52 PM

![69da73c0-18e1-4772-b703-b22ead75f6fb.png](https://chatgpt.com/backend-api/estuary/content?id=file_0000000065d081f4a2ec1f4aca786d2b&fn=69da73c0-18e1-4772-b703-b22ead75f6fb.png&cd=attachment&ts=496646&p=fs&cid=1&sig=212c1c3b63121cbf943f6ee2a91b4cac28c31e53cc6d8690b261b47e84ac30b0&v=0)

[Attachment: Pasted markdown(20260828-135348).md]

dif issue
aLSO, I KNWO IVE DOEN SOMETHING B4 with node and enabling 24 or 25 or somehting? also dont want to break ppls local

## Response:
8/28/2026, 3:53:54 PM

> **Remembering**
>
>
> **Checking runtime consistency**
>
> I’m comparing the current runtime, package engine requirement, CI version, and remembered context. Node 24.14.0 is active locally, while CI uses Node 20; I’m not finding evidence that pinning to Node 24 or 25 is required.
>
> **Checked runtime consistency**
>
> 
>
> **Tracing prior changes**
>
> I’m checking whether the repository previously pinned Node 24 or 25, rather than relying on memory. I’ll review documentation, workflow configuration, package metadata, and history before recommending any runtime change.
>
> **Traced prior changes**
>
> 
>
> **Reviewed Sport Analytics Node decisions and teammate environments**
>
> 
>
> Worked for 36s

Yes - **#259 changes our plan slightly, and that is good.** We should keep the issue boundaries clean.

For **#10**, we should verify that `npm run hygiene` passes locally as part of our pre-CI sweep, but **do not add Knip / syncpack / dependency-cruiser to `ci.yml` under #10**. That automation is explicitly the job of **#259**. When the runner is operational, #259 can add those checks as its own PR with its own evidence. That avoids #10 quietly swallowing another Sprint 2 issue.

On Node: your current evidence is actually useful. Your machine is running **Node v24.14.0**, while CI currently requests **Node 20**, and the repository only requires `"node": ">=20"`. There is no `.nvmrc`, `.node-version`, or `packageManager` field currently pinning everyone to one exact runtime. `Pasted markdown.md`

### So I do **not** want to pin everyone to Node 24 yet

That could unnecessarily disrupt teammates who are happily developing on Node 20/22/etc.

Likewise, I would **not choose Node 25** for CI. If we eventually standardise on a newer major, **24 is the sensible line**, not 25. But we first need to establish what you changed previously and what the project's docs already promise.

There are really two different concepts here:

```text
package-lock.json
→ exact dependency versions
→ MUST be reproducible

Node engine
→ runtime compatibility
→ does not necessarily have to be identical on every developer laptop
```

So having:

```json
"engines": {
  "node": ">=20"
}
```

doesn't inherently violate #10. What matters is that we have **a documented CI runtime** and that supported local runtimes work.

And your current Node 24 installation is actually valuable: if everything passes on Node 24 while CI is configured for 20, we've already got evidence of some cross-version compatibility.

One caveat: your `npm --version` failure is **not a Node problem**. PowerShell blocked `npm.ps1` because of your execution policy. We've previously been using the Windows executable form in situations like this, so for diagnostics use:

```powershell
npm.cmd --version
```

We're not changing your PowerShell policy just to make `npm` work.

## Let's find the Node 24/25 thing you remember

Rather than guessing what happened three weeks ago, let's ask Git. Run this:

```powershell
Write-Host "`n--- NPM VERSION ---"
npm.cmd --version

Write-Host "`n--- NODE REFERENCES IN DOCS ---"
Get-ChildItem README.md,docs,apps -Recurse -File |
    Select-String -Pattern "Node.js 20","Node 20","Node.js 22","Node 22","Node.js 24","Node 24","Node.js 25","Node 25","20+","24+" |
    Select-Object Path,LineNumber,Line

Write-Host "`n--- HISTORY OF NODE ENGINE ---"
git log --all --oneline -S '"node":' -- package.json

Write-Host "`n--- HISTORY OF CI NODE VERSION ---"
git log --all --oneline -S "node-version:" -- .gitea/workflows

Write-Host "`n--- CI NODE VERSION BLAME ---"
git blame .gitea/workflows/ci.yml | Select-String "node-version"

Write-Host "`n--- PACKAGE ENGINE BLAME ---"
git blame package.json | Select-String '"node"'

Write-Host "`n--- ALL WORKFLOW NODE VERSIONS ---"
Get-ChildItem .gitea/workflows -File |
    ForEach-Object {
        Write-Host "`n### $($_.Name)"
        Select-String -Path $_.FullName -Pattern "node-version"
    }
```

That should tell us **exactly where Node 20 came from, whether you previously changed it, and whether your Azure deployment workflows are using a different version.**

### What I expect our eventual policy to look like

Unless Git history reveals another deliberate decision, I'd lean toward:

- keep `"node": ">=20"` for now so we **don't break team members' local setups**;
- select **one explicit Node version for CI**;
- document that as the CI reference runtime;
- verify your existing Node 24 environment passes;
- do **not** introduce an exact local Node requirement unless there's a genuine reason;
- handle hygiene enforcement separately in #259.

We may ultimately change CI from:

```yaml
node-version: 20
```

to:

```yaml
node-version: 24
```

because you're already developing successfully on 24 and it gives us a more current reference runtime. **But don't change it yet.** I want the Git history first.

Also, our scope is now cleaner:

**#10:** installation → core checks → DB → E2E → coverage → builds → CI workflow → runner → green result.

**#259:** Knip → syncpack → dependency-cruiser → automated PR enforcement.

We can run the second set locally today, but we won't steal #259's implementation. That's exactly the kind of disciplined issue separation you want the marker to see.

## Prompt:
8/28/2026, 3:55:50 PM

[Attachment: Pasted text(20260828-135545).txt]

## Response:
8/28/2026, 3:55:51 PM

> **Inspected attached files and analyzed backend database test references**
>
> 
>
> **Interpreting NPM Audit Output**
>
>
> **Interpreted NPM audit output**
>
> 
>
> **Verifying repository history**
>
> I’m narrowing the search to tracked files because the earlier output included generated dependencies and was formatted ambiguously. I’m checking package metadata, CI workflows, deployment settings, and commit history for explicit Node-version changes.
>
> **Verified repository history**
>
> 
>
> **Used personal_context tool**
>
> 
>
> **Interpreting the findings**
>
> The tracked history doesn’t show a committed switch to Node 24 or 25; the earlier search was polluted by generated files. I’m keeping the package minimum unchanged, updating CI documentation only if the workflow actually changes, and separating deployment settings.
>
> **Interpreted the findings**
>
> 
>
> Worked for 1m 4s

Good - this output gives us a useful answer, and we can stop chasing the noisy search.

The giant wall of `node_modules`, `dist`, tests, etc. came from the recursive text search scanning generated/local files. **Ignore that entire section.** It doesn't indicate a problem. `Pasted text.txt`

What matters is the bottom:

```text
--- HISTORY OF NODE ENGINE ---

--- HISTORY OF CI NODE VERSION ---
c59b667 ci: add Azure deployment workflows
449095d chore(repo): establish initial project structure
```

That tells us there is **no Git history showing that the root Node engine was later changed to 24/25**. The Node requirement came from the original repo setup, while workflow Node configuration was touched when the Azure workflows were added. `Pasted text.txt`

So the thing you remember doing with Node 24/25 was very likely **your local/runtime/deployment environment**, not a committed change to the repository's supported Node range. I couldn't find evidence that we deliberately made the whole team move to 24/25.

There is, however, one important 2026 fact that changes my recommendation: **Node 20 is now EOL**. Node's official release table currently lists Node 24 and 22 as LTS, while Node 20 and Node 25 are EOL. ([Node.js](https://nodejs.org/en/about/eol?utm_source=chatgpt.com))

So we definitely should **not move CI to 25**. Your current machine is already on:

```text
v24.14.0
```

and Node 24 is LTS through April 2028. ([Node.js](https://nodejs.org/en/blog/migrations/v22-to-v24?utm_source=chatgpt.com))

### I think the safest setup is

Keep this for now:

```json
"engines": {
  "node": ">=20"
}
```

That means **we don't suddenly break any teammate's local setup** during Sprint 2.

But change the CI reference runtime from:

```yaml
node-version: 20
```

to:

```yaml
node-version: 24
```

That doesn't force anyone locally onto Node 24. It simply says:

> Our automated clean reference environment uses a currently supported LTS release.

Then later, once everyone has confirmed their version, we could raise the minimum engine to `>=22` or `>=24` - but that does **not need to happen under #10**.

Also, since #10 excludes Azure deployment, I don't want to casually change both deployment YAML files under this PR merely because they also mention Node. We'll record that they currently need review and deal with deployment runtime consistency under the deployment/CI-CD work. #10's concern is the **PR CI pipeline**.

## Now let's stop inspecting and actually stress-test it

We have enough information to begin the real clean-install test.

Before deleting anything, record what npm you're actually using:

```powershell
npm.cmd --version
```

Then save a hash of the lockfile so we can prove `npm ci` does not modify it:

```powershell
$lockBefore = (Get-FileHash package-lock.json -Algorithm SHA256).Hash
Write-Host "Lockfile before: $lockBefore"
```

Now remove **installed dependencies only**.

Because this is a workspace repo, use:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps/backend/node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps/frontend/node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages/contracts/node_modules -ErrorAction SilentlyContinue
```

Don't delete `.env`, databases, source files, or `package-lock.json`.

Then:

```powershell
npm.cmd ci
```

When that finishes:

```powershell
$lockAfter = (Get-FileHash package-lock.json -Algorithm SHA256).Hash

Write-Host "`n--- LOCKFILE CHECK ---"
Write-Host "Before: $lockBefore"
Write-Host "After:  $lockAfter"
Write-Host "Unchanged:" ($lockBefore -eq $lockAfter)

Write-Host "`n--- GIT STATUS ---"
git status --short
```

### What we want

Ideally:

```text
Unchanged: True
```

and the only Git changes remain our intentional `site/` removals.

If `npm ci` fails, **do not fix anything yet**. Paste the failure. That's exactly the sort of failure we're trying to expose before the runner gets switched on.

If it succeeds, our next command will be:

```powershell
npm.cmd run check
```

and *then* we'll test DB/E2E/coverage individually.

After those are green, we'll make the small Node 24 CI change, update the CI documentation from Node 20 → Node 24, create the #10 readiness evidence, and leave #259's hygiene automation untouched.

---

**Sources:**

- [Node.js — End-Of-Life](https://nodejs.org/en/about/eol?utm_source=chatgpt.com)

## Prompt:
8/28/2026, 3:58:15 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd ci
npm error code EUSAGE
npm error
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
npm error
npm error Missing: @emnapi/runtime@1.11.3 from lock file
npm error Missing: @emnapi/core@1.11.3 from lock file
npm error
npm error Clean install a project
npm error
npm error Usage:
npm error npm ci
npm error
npm error Options:
npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts]
npm error [--allow-git <all|none|root>] [--no-audit] [--no-bin-links] [--no-fund]
npm error [--dry-run]
npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
npm error [--workspaces] [--include-workspace-root] [--install-links]
npm error
npm error aliases: clean-install, ic, install-clean, isntall-clean
npm error
npm error Run "npm help ci" for more info
npm notice
npm notice New minor version of npm available! 11.9.0 -> 11.19.1
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.19.1
npm notice To update run: npm install -g npm@11.19.1
npm notice
npm error A complete log of this run can be found in: C:\Users\shayn\AppData\Local\npm-cache\_logs\2026-08-28T13_57_51_168Z-debug-0.log
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 3:58:32 PM

Perfect - **this is exactly the kind of avoidable CI failure we wanted to find before the runner came online.**

Right now #10 is **not CI-ready**, despite the earlier clean result from three weeks ago:

```text
npm ci
❌ FAIL
Missing: @emnapi/runtime@1.11.3 from lock file
Missing: @emnapi/core@1.11.3 from lock file
```

That means the current `package.json`/workspace dependency graph and committed `package-lock.json` have drifted out of sync. If the runner appeared right now, it would fail immediately at **Install dependencies**, before any tests even ran.

Do **not** update npm globally, and don't change Node versions yet. The `11.9.0 → 11.19.1` notice is unrelated to this failure.

### Safest repair

Because we've deliberately deleted `node_modules`, I don't want to run a normal `npm install` and then wonder what else it changed. First repair **only the lockfile**:

```powershell
npm.cmd install --package-lock-only --ignore-scripts
```

Then **do not run `npm ci` yet**. Immediately show me exactly what changed:

```powershell
Write-Host "`n--- LOCKFILE DIFF SUMMARY ---"
git diff --stat package-lock.json

Write-Host "`n--- LOCKFILE DIFF ---"
git diff -- package-lock.json

Write-Host "`n--- STATUS ---"
git status --short
```

Paste that output.

What I'm looking for is ideally a small, explainable change adding the missing `@emnapi/core` / `@emnapi/runtime` dependency records. If it suddenly rewrites hundreds of unrelated dependencies, we investigate before accepting it.

And yes - this is now a **real #10 evidence item**:

> Fresh clean-install verification on 28 August 2026 initially failed because the committed lockfile was inconsistent with the current workspace manifests. The issue was discovered during the pre-runner readiness sweep rather than by the CI runner.

That is actually excellent evidence of why reproducible-install checks matter. `npm ci` is doing exactly what #10 was designed to make it do.

## Prompt:
8/28/2026, 3:59:34 PM

[Attachment: Pasted text(20260828-135929).txt]

## Response:
8/28/2026, 3:59:35 PM

> **Reviewing lockfile changes**
>
> I’m seeing dependency versions remain unchanged while npm rewrites peer-dependency metadata and restores a few missing entries. That looks like lockfile normalization, not an application dependency upgrade.
> 
> I’d verify with `npm ci` locally and in the Node 20 CI environment before committing.
>
> **Reviewed lockfile changes**
>
> 
>
> Worked for 14s

This repair looks **reasonable**, but I would **not commit it yet**.

The important part is exactly what we hoped to see: the two genuinely missing lockfile entries were added:

```text
@emnapi/core@1.11.3
@emnapi/runtime@1.11.3
```

The rest of the 58-line diff is mostly npm recalculating `"peer": true` metadata on existing packages; I don't see evidence in this diff of broad dependency-version upgrades. `Pasted text.txt`

That said, because your local environment is **Node 24 + npm 11.9.0**, while the current CI workflow is **Node 20**, I want to prove the repaired lockfile is actually usable before we bless it. This is also why I don't want us randomly updating npm to 11.19.1 now.

### Next: retry the exact thing that failed

You still have no installed dependencies from our clean-state test, so run:

```powershell
npm.cmd ci
```

If it succeeds, immediately run:

```powershell
Write-Host "`n--- LOCKFILE STATUS AFTER NPM CI ---"
git diff --stat package-lock.json

Write-Host "`n--- INSTALL RESULT ---"
Test-Path node_modules

Write-Host "`n--- GIT STATUS ---"
git status --short
```

The important thing is that **`npm ci` must not modify the repaired lockfile further**.

Then, assuming it passes, we'll do:

```powershell
npm.cmd run check
```

### One thing I want to test after that

Before we change CI from Node 20 → 24, I want to test the lockfile with the npm generation that Node 20 CI is likely to use too. We don't need to change your installed Node or break anyone's environment; we can test compatibility separately.

That will tell us whether:

**A.** the lockfile was simply stale and now works everywhere, or  
**B.** npm 10 vs npm 11 is producing materially different lockfile semantics.

If B happens, we should standardise/document the package-manager version rather than letting CI surprise us.

So for now: **the diff is acceptable enough to proceed, but not yet accepted as the final lockfile.**

And this is now our second concrete #10 finding:

> **Reproducible installation regression:** current `main` could not perform `npm ci` because two transitive packages were missing from the committed lockfile. The lockfile was regenerated for verification; clean-install compatibility is being re-tested before commit.

Run `npm.cmd ci` and paste the result.

## Prompt:
8/28/2026, 4:00:46 PM

S C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd ci
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 616 packages, and audited 620 packages in 24s

133 packages are looking for funding
  run `npm fund` for details

11 vulnerabilities (5 moderate, 4 high, 2 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- LOCKFILE STATUS AFTER NPM CI ---"
>> git diff --stat package-lock.json
>> 
>> Write-Host "`n--- INSTALL RESULT ---"
>> Test-Path node_modules
>> 
>> Write-Host "`n--- GIT STATUS ---"
>> git status --short

--- LOCKFILE STATUS AFTER NPM CI ---
 package-lock.json | 58 ++++++++++++++++++++++++++++++++-----------------------
 1 file changed, 34 insertions(+), 24 deletions(-)

--- INSTALL RESULT ---
True

--- GIT STATUS ---
 M package-lock.json
D  site/api/weather/index.html
D  site/design/assets/wireframes/admin-users-desktop.svg
D  site/design/assets/wireframes/admin-users-mobile.svg
D  site/design/assets/wireframes/fixture-detail-desktop.svg
D  site/design/assets/wireframes/fixture-detail-mobile.svg
D  site/design/assets/wireframes/fixtures-desktop.svg
D  site/design/assets/wireframes/fixtures-mobile.svg
D  site/design/assets/wireframes/home-desktop.svg
D  site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:01:00 PM

Excellent - **the clean install is now reproducible again**.

`npm.cmd ci` completed from the deliberately cleared dependency state and installed 616 packages successfully. The Git status also shows no surprise source changes: only our repaired `package-lock.json` plus the intentional removal of generated `site/` files from tracking. The lockfile diff is still the same 58-line repair we inspected, so `npm ci` did not create a second wave of changes.

The **11 audit vulnerabilities are worth recording**, especially the 2 critical ones, but **do not run `npm audit fix` or `--force` now**. That could introduce unrelated/breaking dependency upgrades. We should inspect them later and route remediation to the security/dependency work rather than contaminate #10.

### Now run the main CI gate

This is the important next test:

```powershell
npm.cmd run check
```

Let it run completely. **If anything fails, don't fix it yet** - paste the failure/output and we'll diagnose it in context.

If it passes, immediately run this so we have a concise state snapshot:

```powershell
Write-Host "`n--- CHECK COMPLETE ---"

Write-Host "`n--- NODE / NPM ---"
node --version
npm.cmd --version

Write-Host "`n--- GIT STATUS ---"
git status --short

Write-Host "`n--- LOCKFILE DIFF SUMMARY ---"
git diff --stat package-lock.json
```

### Current #10 status

So far we've already found and addressed two genuine CI-readiness regressions:

| Check | Result |
|---|---|
| Generated MkDocs `site/` output | ✅ Found accidentally tracked; removed from Git while retained locally and ignored |
| Clean `npm ci` from current `main` | ❌ initially failed |
| Cause | ✅ stale/incomplete lockfile |
| Lockfile repair | ✅ small, explainable repair |
| Clean `npm ci` after repair | ✅ **PASS** |
| `npm run check` | ⏳ next |
| DB integration | ⏳ |
| Playwright E2E | ⏳ |
| Coverage | ⏳ |
| Docs strict build | ⏳ |
| CI runtime compatibility | ⏳ |
| Online Gitea run | 🚫 awaiting runner |

And this is already proving the value of doing this now: **if Wits had enabled the runner this morning, CI would have failed at `npm ci` before even reaching a single test.**

Run `npm.cmd run check` next.

## Prompt:
8/28/2026, 4:02:09 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd run check

> sport-analytics-tool@0.1.0 check
> npm run structure:check && npm run format:check && npm run lint && npm run build --workspace=@sport-analytics/contracts && npm run typecheck && npm run test && npm run openapi:lint && npm run build


> sport-analytics-tool@0.1.0 structure:check
> node scripts/check-required-files.mjs

Repository structure check passed (30 required files).

> sport-analytics-tool@0.1.0 format:check
> prettier --check .

Checking formatting...
[warn] docs/javascripts/external-links.js
[warn] docs/README.md
[warn] docs/stylesheets/extra.css
[warn] mkdocs.yml
[warn] Code style issues found in 4 files. Run Prettier with --write to fix.
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 
doesnt pass format for some reacon (format failed so tests dont contiue- maybe we should change that too?) shoudl we fix them and this is to make ci clean so counts no?

## Response:
8/28/2026, 4:02:24 PM

Yes - **fix the four formatting failures under #10**. That is directly in scope because #10 explicitly requires formatting and `npm run check` to pass. We are not adding unrelated features; we're restoring the quality gate on current `main`.

But **I would not change `npm run check` so it keeps going after a failure.** Fail-fast is desirable for the canonical CI gate:

```text
structure → format → lint → typecheck → tests → OpenAPI → build
              ❌
              stop
```

A red formatting check means the repository hasn't passed the gate. Making it continue can produce more diagnostic output, but it doesn't make CI any greener. If later we want Gitea to show several independent failures at once, we can split CI into separate jobs/steps once we know the runner capacity. For #10, keeping one deterministic `npm run check` is simpler and safer.

### Fix only the four reported files

Don't run `npm run format`, because that could rewrite lots of unrelated files. Run Prettier specifically on these four:

```powershell
npx.cmd prettier --write `
  docs/javascripts/external-links.js `
  docs/README.md `
  docs/stylesheets/extra.css `
  mkdocs.yml
```

Then inspect exactly what Prettier changed:

```powershell
Write-Host "`n--- FORMAT DIFF SUMMARY ---"
git diff --stat -- `
  docs/javascripts/external-links.js `
  docs/README.md `
  docs/stylesheets/extra.css `
  mkdocs.yml

Write-Host "`n--- FORMAT DIFF ---"
git diff -- `
  docs/javascripts/external-links.js `
  docs/README.md `
  docs/stylesheets/extra.css `
  mkdocs.yml

Write-Host "`n--- WHITESPACE ERRORS ---"
git diff --check

Write-Host "`n--- STATUS ---"
git status --short
```

Send me that.

If it's purely formatting, we accept it and rerun:

```powershell
npm.cmd run check
```

### This is now finding #3 from the sweep

So far current `main` would have failed CI twice before reaching the later tests:

1. ❌ `npm ci` - stale/incomplete lockfile  
   → repaired; clean install now ✅

2. ❌ `prettier --check .` - four files don't match repository formatting  
   → fixing now

3. ⏳ lint/typecheck/unit/API/contracts/build/OpenAPI  
4. ⏳ DB integration  
5. ⏳ E2E  
6. ⏳ coverage  
7. ⏳ docs strict build  
8. ⏳ actual Gitea runner

This is precisely what #10 is for. And I prefer discovering each failure sequentially like this rather than weakening the gate to let CI plough past failures.

## Prompt:
8/28/2026, 4:04:26 PM

> sport-analytics-tool@0.1.0 check
> npm run structure:check && npm run format:check && npm run lint && npm run build --workspace=@sport-analytics/contracts && npm run typecheck && npm run test && npm run openapi:lint && npm run build


> sport-analytics-tool@0.1.0 structure:check
> node scripts/check-required-files.mjs

Repository structure check passed (30 required files).

> sport-analytics-tool@0.1.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!

> sport-analytics-tool@0.1.0 lint
> npm run lint --workspaces --if-present


> @sport-analytics/backend@0.1.0 lint
> eslint src tests --ext .ts


> @sport-analytics/frontend@0.1.0 lint
> eslint src --ext .ts,.tsx


> @sport-analytics/contracts@0.1.0 lint
> eslint src --ext .ts


> @sport-analytics/contracts@0.1.0 build
> tsc -p tsconfig.json


> sport-analytics-tool@0.1.0 typecheck
> npm run typecheck --workspaces --if-present


> @sport-analytics/backend@0.1.0 typecheck
> tsc --noEmit


> @sport-analytics/frontend@0.1.0 typecheck
> tsc --noEmit


> @sport-analytics/contracts@0.1.0 typecheck
> tsc --noEmit


> sport-analytics-tool@0.1.0 test
> npm run test:unit && npm run test:frontend && npm run test:api && npm run test:contracts && npm run test:deployment


> sport-analytics-tool@0.1.0 test:unit
> npm run test:unit --workspace=@sport-analytics/backend


> @sport-analytics/backend@0.1.0 test:unit
> vitest run tests/unit


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/backend

 ✓ tests/unit/account-deletion.repository.test.ts (3)
 ✓ tests/unit/account-deletion.service.test.ts (12)
 ✓ tests/unit/account.repository.test.ts (10)
 ✓ tests/unit/admin-access-policy.test.ts (11)
 ✓ tests/unit/admin.service.test.ts (5)
 ✓ tests/unit/database-errors.test.ts (4)
 ✓ tests/unit/domain-builders.test.ts (1)
 ✓ tests/unit/environment.test.ts (3)
 ✓ tests/unit/event.repository.test.ts (2)
 ✓ tests/unit/fixture-statistics.derivation.test.ts (4)
 ✓ tests/unit/fixture-statistics.repository.test.ts (1)
 ✓ tests/unit/public-read.service.test.ts (6)
 ✓ tests/unit/submitter-access.repository.test.ts (6)
 ✓ tests/unit/submitter-access.service.test.ts (3)
 ✓ tests/unit/supabase-auth.test.ts (3)
 ✓ tests/unit/test-database-safety.test.ts (9)
 ✓ tests/unit/weather.service.test.ts (7)

 Test Files  17 passed (17)
      Tests  90 passed (90)
   Start at  16:03:21
   Duration  4.54s (transform 5.25s, setup 0ms, collect 17.40s, tests 192ms, environment 4ms, prepare 12.58s)


> sport-analytics-tool@0.1.0 test:frontend
> npm run test --workspace=@sport-analytics/frontend


> @sport-analytics/frontend@0.1.0 test
> vitest run


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/frontend

 ✓ src/App.test.tsx (15) 887ms
 ✓ src/api/client.test.ts (5)
 ✓ src/api/public-read.test.ts (3)
 ✓ src/components/ComponentBaseline.test.tsx (2)
 ✓ src/pages/PublicBrowsePages.test.tsx (23) 1515ms
 ✓ src/features/admin/AdminUsersPage.test.tsx (20) 1096ms
 ✓ src/features/browse/NameCombobox.test.tsx (4) 300ms
 ✓ src/features/statistics/StatisticsPages.test.tsx (4) 568ms
 ✓ src/features/auth/AuthProvider.test.tsx (4)
 ✓ src/features/submissions/SubmissionPage.test.tsx (10) 891ms
 ✓ src/features/submitter-access/SubmitterAccessPanel.test.tsx (12) 769ms

 Test Files  11 passed (11)
      Tests  102 passed (102)
   Start at  16:03:27
   Duration  9.05s (transform 1.50s, setup 7.87s, collect 12.65s, tests 6.37s, environment 48.95s, prepare 2.19s)


> sport-analytics-tool@0.1.0 test:api
> npm run test:api --workspace=@sport-analytics/backend


> @sport-analytics/backend@0.1.0 test:api
> vitest run tests/api tests/auth.test.ts tests/authorization.test.ts tests/health.test.ts


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/backend

stderr | tests/auth.test.ts > GET /api/v1/auth/me > returns a safe server error when account status cannot be resolved
Internal database detail

 ✓ tests/auth.test.ts (13)
 ✓ tests/authorization.test.ts (8)
 ✓ tests/health.test.ts (1)
 ✓ tests/api/account-deletion.test.ts (9)
 ✓ tests/api/admin-users.test.ts (18)
 ✓ tests/api/fixture-statistics.test.ts (4)
 ✓ tests/api/public-read.test.ts (16)
 ✓ tests/api/submissions.test.ts (20) 505ms
 ✓ tests/api/submitter-access-request.test.ts (8)
 ✓ tests/api/weather.test.ts (7)

 Test Files  10 passed (10)
      Tests  104 passed (104)
   Start at  16:03:38
   Duration  3.11s (transform 4.45s, setup 0ms, collect 17.10s, tests 2.02s, environment 4ms, prepare 1.97s)


> sport-analytics-tool@0.1.0 test:contracts
> npm run test --workspace=@sport-analytics/contracts


> @sport-analytics/contracts@0.1.0 test
> vitest run


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/packages/contracts

 ✓ src/tests/api.test.ts (11)
 ✓ src/tests/auth.test.ts (29)
 ✓ src/tests/health.test.ts (2)
 ✓ src/tests/public-read.test.ts (11)
 ✓ src/tests/submissions.test.ts (20)

 Test Files  5 passed (5)
      Tests  73 passed (73)
   Start at  16:03:42
   Duration  1.15s (transform 1.72s, setup 0ms, collect 2.01s, tests 113ms, environment 1ms, prepare 846ms)


> sport-analytics-tool@0.1.0 test:deployment
> node --test tests/deployment/*.test.mjs

✔ accepts a successful response containing the expected marker (26.3477ms)
✔ retries a failed response before succeeding (0.7599ms)
✔ reports the final HTTP failure after exhausting retries (0.9898ms)
✔ rejects unsupported URL protocols before making a request (0.2952ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 128.3753

> sport-analytics-tool@0.1.0 openapi:lint
> redocly lint docs/api/openapi.yaml


    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║  A new version of Redocly CLI (2.48.0) is available.  ║
    ║  Update now: `npm i -g @redocly/cli@latest`.          ║
    ║  Changelog: https://redocly.com/docs/cli/changelog/   ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝

validating docs\api\openapi.yaml...
docs\api\openapi.yaml: validated in 90ms

Woohoo! Your API description is valid. 🎉
1 problem is explicitly ignored.



> sport-analytics-tool@0.1.0 build
> npm run build --workspace=@sport-analytics/contracts && npm run build --workspace=@sport-analytics/backend && npm run build --workspace=@sport-analytics/frontend


> @sport-analytics/contracts@0.1.0 build
> tsc -p tsconfig.json


> @sport-analytics/backend@0.1.0 build
> tsc -p tsconfig.json


> @sport-analytics/frontend@0.1.0 build
> tsc -b && vite build

vite v5.4.21 building for production...
✓ 153 modules transformed.
dist/index.html                   0.63 kB │ gzip:   0.36 kB
dist/assets/index-DiER9R7-.css   37.49 kB │ gzip:   6.96 kB
dist/assets/index-CyMI4Whi.js   581.78 kB │ gzip: 157.59 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 2.05s
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- CHECK COMPLETE ---"
>> 
>> Write-Host "`n--- NODE / NPM ---"
>> node --version
>> npm.cmd --version
>> 
>> Write-Host "`n--- GIT STATUS ---"
>> git status --short
>> 
>> Write-Host "`n--- LOCKFILE DIFF SUMMARY ---"
>> git diff --stat package-lock.json

--- CHECK COMPLETE ---

--- NODE / NPM ---
v24.14.0
11.9.0

--- GIT STATUS ---
 M docs/README.md
 M docs/javascripts/external-links.js
 M docs/stylesheets/extra.css
 M mkdocs.yml
 M package-lock.json
D  site/api/weather/index.html
D  site/design/assets/wireframes/admin-users-desktop.svg
D  site/design/assets/wireframes/admin-users-mobile.svg
D  site/design/assets/wireframes/fixture-detail-desktop.svg
D  site/design/assets/wireframes/fixture-detail-mobile.svg
D  site/design/assets/wireframes/fixtures-desktop.svg
D  site/design/assets/wireframes/fixtures-mobile.svg
D  site/design/assets/wireframes/home-desktop.svg
D  site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html

--- LOCKFILE DIFF SUMMARY ---
 package-lock.json | 58 ++++++++++++++++++++++++++++++++-----------------------
 1 file changed, 34 insertions(+), 24 deletions(-)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:04:38 PM

That is a **very good result**. The main repository gate is now green on a genuinely clean install.

Your current evidence is strong:

- structure check ✅
- Prettier ✅
- linting across backend/frontend/contracts ✅
- TypeScript builds/typechecks ✅
- backend unit tests: **90/90** ✅
- frontend tests: **102/102** ✅
- API tests: **104/104** ✅
- contracts tests: **73/73** ✅
- deployment-helper tests: **4/4** ✅
- OpenAPI lint ✅
- backend/frontend/contracts production builds ✅

The `"Internal database detail"` stderr is coming from a test whose name explicitly checks safe handling of an internal database error, so it is not a failing condition. Likewise, the Vite >500 kB chunk message is a **performance warning**, not a CI failure. I’d record it, not change it under #10.

Also, I’m revising one earlier suggestion: **let’s not touch the Node requirement or change CI from Node 20 → 24 yet.** Your clean verification passed on Node `24.14.0` / npm `11.9.0`, but there is no need to risk disturbing teammates or introduce another variable before the runner appears. We can document the runtime we validated on, keep `"node": ">=20"` as-is, and only alter the CI runtime if the actual runner gives us a reason.

## Next we test the things `npm run check` does **not** cover

The current Gitea workflow runs these after `check`:

```text
database integration
E2E/browser/accessibility
coverage
```

So let's mirror that.

First DB integration, using the safe local wrapper we've already established:

```powershell
npm.cmd run test:database:local
```

If that passes, run:

```powershell
npm.cmd run test:e2e
```

And then:

```powershell
npm.cmd run test:coverage
```

Don't run all three in one chained command - I want to know exactly which layer fails, if any.

### Then docs

After those, we'll do the strict MkDocs build. First let's see how your environment invokes MkDocs:

```powershell
python --version
python -m mkdocs --version
```

If the second command works, we'll use:

```powershell
python -m mkdocs build --strict
```

That will regenerate the local ignored `site/` directory, which is exactly what we want: **generated locally, not committed**.

### And yes, we'll still run hygiene

But only as a **readiness observation for #10**, not change CI for it, because #259 owns automation of Knip/syncpack/dependency-cruiser:

```powershell
npm.cmd run hygiene
```

If hygiene fails, we record it and decide whether it belongs to #259 rather than casually expanding #10.

## Where #10 stands now

| Area | State |
|---|---|
| Generated MkDocs output tracked | ✅ Fixed |
| Lockfile consistency | ✅ Fixed |
| Clean `npm ci` | ✅ PASS |
| Lockfile stable after `npm ci` | ✅ PASS |
| Repository structure | ✅ |
| Formatting | ✅ Fixed + PASS |
| Lint | ✅ |
| Typecheck | ✅ |
| Unit/API/frontend/contracts tests | ✅ **369 tests total** |
| Deployment helper tests | ✅ 4 |
| OpenAPI | ✅ |
| Production builds | ✅ |
| DB integration | **next** |
| E2E/accessibility | pending |
| Coverage | pending |
| MkDocs strict | pending |
| Hygiene | pending / #259-owned automation |
| Actual Gitea runner | blocked |

This is exactly the state we wanted before CI infrastructure arrives: we're systematically removing repository-side reasons for the first run to fail.

Run **`npm.cmd run test:database:local`** next and send me the result.

## Prompt:
8/28/2026, 4:07:21 PM

[Attachment: Pasted text(20260828-140716).txt]

## Response:
8/28/2026, 4:07:22 PM

Great - the three big CI layers all pass now. `Pasted text.txt`

The results are:

- Database integration: **52/52 passed** across 10 files, including the newest Sprint 2 migrations and submission provenance work. `Pasted text.txt`
- Playwright E2E/accessibility: **38/38 passed** across desktop and mobile Chromium. `Pasted text.txt`
- Backend coverage run: **194/194 tests passed**. Overall statement coverage is about **49%**, but there is currently no coverage threshold configured, so this is not a CI failure. `Pasted text.txt`

The repeated Vite >500 kB warning is still just a performance warning. I would record it for later optimisation rather than touch it under #10.

So our remaining local readiness sweep is now basically:

1. strict MkDocs build;
2. hygiene run as an observation only, because #259 owns its CI integration;
3. quick env/secret sanity check;
4. inspect/fix `ci.yml` only if these checks expose something;
5. write the #10 evidence/doc update;
6. commit + PR;
7. wait for the Wits runner and see the real online result.

Run these next:

```powershell
Write-Host "`n--- PYTHON / MKDOCS ---"
python --version
python -m mkdocs --version

Write-Host "`n--- STRICT DOCS BUILD ---"
python -m mkdocs build --strict
```

If that passes, then:

```powershell
Write-Host "`n--- REPOSITORY HYGIENE ---"
npm.cmd run hygiene
```

And after that, I want one quick sanity check for tracked env/secrets:

```powershell
Write-Host "`n--- TRACKED ENV FILES ---"
git ls-files | Select-String '(^|/)\.env($|\.)'

Write-Host "`n--- ENV EXAMPLES ---"
Get-ChildItem -Recurse -Force -File -Filter "*.env*" |
  Where-Object { $_.FullName -notmatch 'node_modules|dist|site' } |
  Select-Object FullName

Write-Host "`n--- CURRENT STATUS ---"
git status --short
```

Don’t paste any actual secret values if you notice real `.env` files in that output; filenames are enough.

At this point #10 is looking very healthy locally. The original problem has changed from “we think CI should work” to “the current repo has actually been stress-tested from a clean install and is green except for the real external runner dependency.”

## Prompt:
8/28/2026, 4:08:33 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- PYTHON / MKDOCS ---"
>> python --version
>> python -m mkdocs --version
>> 
>> Write-Host "`n--- STRICT DOCS BUILD ---"
>> python -m mkdocs build --strict

--- PYTHON / MKDOCS ---
Python 3.14.3
python -m mkdocs, version 1.6.1 from C:\Users\shayn\AppData\Roaming\Python\Python314\site-packages\mkdocs (Python 3.14)

--- STRICT DOCS BUILD ---

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
INFO    -  Documentation built in 4.60 seconds
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- REPOSITORY HYGIENE ---"
>> npm.cmd run hygiene

--- REPOSITORY HYGIENE ---

> sport-analytics-tool@0.1.0 hygiene
> npm run hygiene:knip && npm run hygiene:dependencies && npm run hygiene:architecture


> sport-analytics-tool@0.1.0 hygiene:knip
> knip

Unused files (1)
docs/javascripts/external-links.js
Unused exported types (1)
CorrectionTarget  interface  apps/backend/src/modules/submissions/submission.repository.ts:38:18
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- TRACKED ENV FILES ---"
>> git ls-files | Select-String '(^|/)\.env($|\.)'
>> 
>> Write-Host "`n--- ENV EXAMPLES ---"
>> Get-ChildItem -Recurse -Force -File -Filter "*.env*" |
>>   Where-Object { $_.FullName -notmatch 'node_modules|dist|site' } |
>>   Select-Object FullName
>> 
>> Write-Host "`n--- CURRENT STATUS ---"
>> git status --short

--- TRACKED ENV FILES ---

apps/backend/.env.example
apps/backend/.env.test.example
apps/frontend/.env.example

--- ENV EXAMPLES ---

FullName : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\.env


FullName : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\.env.example


FullName : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\.env.test


FullName : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\.env.test.example


FullName : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\frontend\.env


FullName : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\frontend\.env.example


--- CURRENT STATUS ---
 M docs/README.md
 M docs/javascripts/external-links.js
 M docs/stylesheets/extra.css
 M mkdocs.yml
 M package-lock.json
D  site/api/weather/index.html
D  site/design/assets/wireframes/admin-users-desktop.svg
D  site/design/assets/wireframes/admin-users-mobile.svg
D  site/design/assets/wireframes/fixture-detail-desktop.svg
D  site/design/assets/wireframes/fixture-detail-mobile.svg
D  site/design/assets/wireframes/fixtures-desktop.svg
D  site/design/assets/wireframes/fixtures-mobile.svg
D  site/design/assets/wireframes/home-desktop.svg
D  site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html


PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:08:43 PM

> **Reviewing next steps**
>
> I’m separating hygiene findings from the infrastructure work. The docs asset warning likely belongs with #259, while the unused export may be a genuine cleanup. I’m checking workflow compatibility and database-test behavior before proposing changes to #10.
>
> **Reviewed next steps**
>
> 
>
> Worked for 12s

Great - this gives us a very clean picture.

The **MkDocs strict build passes**, and the tracked-env check is exactly what we want: only `.env.example` / `.env.test.example` files are tracked; your real `.env` files exist locally but are not tracked. So there is no obvious env-file leak from this check.

The MkDocs 2.0 message is just an upstream future-compatibility warning. It did **not** make `--strict` fail, so for #10 that is ✅ PASS.

The only red item is `npm run hygiene`, and I would **not fix those two findings inside #10** because #259 owns repository-hygiene enforcement.

One of the findings is very likely a false positive:

```text
docs/javascripts/external-links.js
```

Knip understands JS/TS dependency graphs, but it may not know that MkDocs loads a JavaScript file through `mkdocs.yml`.

The other may be real:

```text
CorrectionTarget
apps/backend/src/modules/submissions/submission.repository.ts
```

So let's verify both and then record them against #259.

Run:

```powershell
Write-Host "`n--- MKDOCS EXTERNAL JS REFERENCE ---"
Select-String -Path mkdocs.yml -Pattern "external-links","extra_javascript" -Context 3,3

Write-Host "`n--- CORRECTIONTARGET REFERENCES ---"
Get-ChildItem apps/backend/src -Recurse -File -Filter "*.ts" |
  Select-String -Pattern '\bCorrectionTarget\b' |
  Select-Object Path,LineNumber,Line

Write-Host "`n--- DATABASE CI SCRIPT ---"
Get-Content apps/backend/scripts/run-database-tests.ts

Write-Host "`n--- CI DOCUMENTATION SECTION ---"
Get-Content docs/architecture/system-architecture.md |
  Select-Object -Skip 390 -First 70
```

The last two are for #10: I want to make sure our actual CI database steps still match what the backend script expects, and that the CI documentation hasn't drifted.

### Current #10 readiness

| Area | Status |
|---|---|
| Clean lockfile install | ✅ |
| `npm run check` | ✅ |
| Unit/frontend/API/contracts tests | ✅ |
| Production builds | ✅ |
| OpenAPI | ✅ |
| PostgreSQL integration | ✅ **52/52** |
| E2E + accessibility | ✅ **38/38** |
| Coverage execution | ✅ **194/194** |
| MkDocs `--strict` | ✅ |
| Real `.env` files tracked | ✅ No |
| Generated `site/` tracked | ✅ fixed |
| Hygiene | ⚠️ 2 findings - **#259**, not #10 |
| Actual Gitea runner | 🚫 still external blocker |

So locally, **#10 is essentially green now**. The only things left before we package this PR are the CI-workflow/documentation consistency review and creation of the evidence file.

Also, I would put a short comment on #259 once we verify those two findings, something like:

```markdown
## Pre-CI readiness observation

During the Issue #10 pre-runner CI readiness sweep, `npm run hygiene`
currently reports two findings:

- `docs/javascripts/external-links.js` as unused - likely a Knip false
  positive if it is loaded through `mkdocs.yml`;
- exported `CorrectionTarget` in
  `apps/backend/src/modules/submissions/submission.repository.ts` as unused.

No hygiene changes were made under #10 because CI enforcement and remediation
of Knip/syncpack/dependency-cruiser findings are owned by this issue.
```

But let's verify them first.

## Prompt:
8/28/2026, 4:09:28 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- MKDOCS EXTERNAL JS REFERENCE ---"
>> Select-String -Path mkdocs.yml -Pattern "external-links","extra_javascript" -Context 3,3
>> 
>> Write-Host "`n--- CORRECTIONTARGET REFERENCES ---"
>> Get-ChildItem apps/backend/src -Recurse -File -Filter "*.ts" |
>>   Select-String -Pattern '\bCorrectionTarget\b' |
>>   Select-Object Path,LineNumber,Line
>> 
>> Write-Host "`n--- DATABASE CI SCRIPT ---"
>> Get-Content apps/backend/scripts/run-database-tests.ts
>> 
>> Write-Host "`n--- CI DOCUMENTATION SECTION ---"
>> Get-Content docs/architecture/system-architecture.md |
>>   Select-Object -Skip 390 -First 70

--- MKDOCS EXTERNAL JS REFERENCE ---

  mkdocs.yml:37:extra_css:
  mkdocs.yml:38:  - stylesheets/extra.css
  mkdocs.yml:39:
> mkdocs.yml:40:extra_javascript:
> mkdocs.yml:41:  - javascripts/external-links.js
  mkdocs.yml:42:
  mkdocs.yml:43:nav:
  mkdocs.yml:44:  - Home: index.md

--- CORRECTIONTARGET REFERENCES ---

Path       : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission.repository.ts
LineNumber : 38
Line       : export interface CorrectionTarget {


Path       : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission.repository.ts
LineNumber : 53
Line       :   findCorrectionTarget(eventId: string): Promise<CorrectionTarget | null>;


Path       : C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission.repository.ts
LineNumber : 86
Line       : interface CorrectionTargetRow extends CorrectionTarget {


--- DATABASE CI SCRIPT ---
import { spawn } from 'node:child_process';
import { rm, mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import EmbeddedPostgres from 'embedded-postgres';

const backendDirectory = new URL('..', import.meta.url);
const databaseName = 'sport_analytics_test';
const databaseUser = 'test_user';
const databasePassword = 'test_password';

async function findAvailablePort(): Promise<number> {
  const server = createServer();

  return await new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a port for the disposable PostgreSQL server.'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function runNpmScript(script: string, environment: NodeJS.ProcessEnv): Promise<void> {
  const npmExecutable = process.env.npm_execpath;

  if (!npmExecutable) {
    throw new Error('The database test runner must be started through an npm script.');
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [npmExecutable, 'run', script], {
      cwd: backendDirectory,
      env: environment,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${script} exited with ${
            code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`
          }.`,
        ),
      );
    });
  });
}

async function runConfiguredDatabaseTests(): Promise<void> {
  console.log('Using the configured isolated PostgreSQL test database.');
  await runNpmScript('test:database:run', {
    ...process.env,
    NODE_ENV: 'test',
  });
}

async function runDisposableDatabaseTests(): Promise<void> {
  const port = await findAvailablePort();
  const databaseDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-postgres-'));
  const verbose = process.env.DATABASE_TEST_VERBOSE === '1';
  const postgres = new EmbeddedPostgres({
    databaseDir: databaseDirectory,
    user: databaseUser,
    password: databasePassword,
    port,
    persistent: false,
    onLog: verbose ? console.log : () => undefined,
    onError: verbose ? console.error : () => undefined,
  });

  console.log(`Starting disposable PostgreSQL 16 for database tests on port ${port}.`);

  try {
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase(databaseName);

    const testEnvironment = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL_TEST: `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/${databaseName}`,
    };

    await runNpmScript('db:test:reset', testEnvironment);
    await runNpmScript('db:test:migrate', testEnvironment);
    await runNpmScript('db:test:seed', testEnvironment);
    await runNpmScript('test:database:run', testEnvironment);
  } finally {
    await postgres.stop().catch((error: unknown) => {
      console.error('Failed to stop the disposable PostgreSQL server cleanly.', error);
    });
    await rm(databaseDirectory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  if (process.env.DATABASE_URL_TEST) {
    await runConfiguredDatabaseTests();
    return;
  }

  await runDisposableDatabaseTests();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown database test runner error.');
  process.exitCode = 1;
});

--- CI DOCUMENTATION SECTION ---
licensed reliable feed; and custom statistics depend on an approved safe definition model.

## 10. Deployment and CI/CD

```mermaid
flowchart LR
    Dev[Short-lived branch] --> PR[Gitea Pull Request]
    PR --> CI[CI: install, structure, format,<br/>lint, typecheck, test, build]
    CI --> Review[Peer review and approval]
    Review --> Main[Protected main branch]
    Main --> FE[Frontend deployment<br/>Azure App Service]
    Main --> BE[Backend deployment<br/>Azure App Service]
    Main --> Docs[MkDocs build and<br/>Cloudflare Pages deployment]
    Migration[Reviewed SQL migrations] --> DB[(Supabase-hosted PostgreSQL)]
    BE --> DB
    FE --> BE
    Secrets[Environment-specific secret stores] -.-> FE
    Secrets -.-> BE
```

### Environments and deployment units

- **Local:** Vite frontend on port 5173 and Express API on port 3000 run as separate
  processes. Developers use safe environment placeholders and either shared development
  services or an approved isolated local stack.
- **Development:** the frontend and backend currently target separate Azure App Services.
  PostgreSQL is hosted by Supabase in Frankfurt and reached by the backend over the TLS
  Supavisor session pooler. The documentation site is deployed separately to Cloudflare
  Pages.
- **Preview/test:** Pull Requests always receive CI verification. Automated per-PR application
  previews are desirable but not yet established.
- **Production:** service names, database plan/region, storage, secrets, observability,
  backups, and rollback procedures require a production decision record before release.

Frontend configuration contains only browser-safe API and auth settings. Backend settings
contain `DATABASE_URL`, auth verification settings, allowed origins, external API keys, and
future queue/storage credentials. Gitea Action secrets or platform secret stores provide
deployment credentials. Real secrets are never committed.

### Pipeline controls

The existing Pull Request workflow uses Node.js 20, runs `npm ci`, then `npm run check`. The
repository check verifies required files, formatting, lint, TypeScript, automated tests, and
all workspace builds. Before deployment is considered reliable, the pipeline must also:

1. build MkDocs with `mkdocs build --strict`;
2. correct the frontend/backend deployment path and workspace references so they match
   `apps/frontend` and `apps/backend`;
3. make deployments depend on the same green quality checks used for Pull Requests;
4. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
5. deploy immutable build output to the correct application;
6. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
7. record release identity and support rollback to the previous application version; and
8. keep destructive migration changes backward-compatible across the deployment window.

Path filters should deploy only affected units, while changes to contracts, root lockfiles,
or shared configuration must trigger every dependent unit. Production approval gates may be
added without changing application architecture.

## 11. Development roadmap

The roadmap is outcome-based and follows the project's lightweight Scrumban methodology.
Issues move into active development only when their dependencies are understood, an assignee
is available, and they satisfy the Definition of Ready.

The team is targeting:

- a working Basic vertical slice during Sprint 1;
- complete Basic and Intermediate functionality by the end of Sprint 2;


PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:09:39 PM

> **Assessing readiness**
>
> I’m treating the issue as largely satisfied: coverage, database, and end-to-end checks are present, while docs validation and the exported type remain cleanup items. I’m checking the documentation dependencies next before proposing a precise CI change.
>
> **Assessed readiness**
>
> 
>
> Worked for 14s

Good - we’ve now resolved the two hygiene findings conceptually, and we found one **real CI/documentation gap**.

`docs/javascripts/external-links.js` is definitely a **Knip false positive**: MkDocs loads it explicitly through `extra_javascript` in `mkdocs.yml`. `CorrectionTarget` is different: it is used inside its own module, but nothing outside that module imports the exported type. So Knip is correctly saying **the `export` is unnecessary**, not that the interface itself is unused. That cleanup belongs to #259, not #10.

The database side is also good. Your CI currently resets/migrates/seeds the PostgreSQL service itself, then calls `npm run test:database`. Because `DATABASE_URL_TEST` exists, `run-database-tests.ts` detects the configured CI database and runs only the actual DB tests. So there is **no accidental second reset/migration cycle**. That part of `ci.yml` is coherent.

The interesting finding is the docs:

```text
The existing Pull Request workflow uses Node.js 20, runs `npm ci`,
then `npm run check`.
```

That still matches the current core workflow.

But the architecture doc then explicitly says the pipeline still needs to:

```text
1. build MkDocs with `mkdocs build --strict`;
```

and we have just proven that strict build passes locally.

So I think we should now add **strict MkDocs verification to CI under #10**. That is not Cloudflare deployment; it is simply another reproducible build/quality check. It fits the goal of making the runner come online to a clean repository, and your own architecture documentation already says it belongs in the pipeline.

Before editing `ci.yml`, though, we need to know the **authoritative Python/MkDocs dependency installation method**. We cannot put `pip install mkdocs-material` into CI from memory if the repo already has a requirements file or documented versioning.

Run this:

```powershell
Write-Host "`n--- PYTHON DEPENDENCY FILES ---"
Get-ChildItem -Force `
  requirements*.txt,pyproject.toml,poetry.lock,Pipfile,Pipfile.lock `
  -ErrorAction SilentlyContinue |
  Select-Object Name,FullName

Write-Host "`n--- MKDOCS INSTALL IN DOCS ---"
Get-ChildItem README.md,docs -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\site\\' } |
  Select-String -Pattern "pip install","mkdocs-material","requirements.txt","mkdocs build --strict" |
  Select-Object -First 100 Path,LineNumber,Line

Write-Host "`n--- DEPLOY WORKFLOW NODE/PYTHON SETUP ---"
Get-Content .gitea/workflows/deploy-backend.yml
Get-Content .gitea/workflows/deploy-frontend.yml
```

We are **not changing the deploy workflows here**; I just want to confirm what runtime assumptions they currently make.

Once you paste that, I expect our #10 code change to be quite small: likely add Python setup + deterministic docs dependency install + `mkdocs build --strict` to `ci.yml`, update the CI documentation to describe what the workflow *actually* verifies, and create the readiness evidence.

For #259, you can later record:

```markdown
## Finding from Issue #10 readiness sweep

`npm run hygiene` currently reports:

- `docs/javascripts/external-links.js` as unused. This is a Knip false
  positive because the file is loaded through `mkdocs.yml` via
  `extra_javascript`.
- `CorrectionTarget` as an unused exported type. The interface is used
  internally by `submission.repository.ts`, but its export appears unnecessary.

No hygiene implementation changes were made under #10. These findings are
left for #259, which owns repository-hygiene enforcement.
```

And I would **not remove `CorrectionTarget`'s export on this branch**, even though it looks straightforward. Keeping the issue boundaries clean is better evidence than squeezing every discovered cleanup into #10.

## Prompt:
8/28/2026, 4:10:17 PM

Get-Content .gitea/workflows/deploy-frontend.yml

--- PYTHON DEPENDENCY FILES ---


--- MKDOCS INSTALL IN DOCS ---
Name                  FullName                                                                  
----                  --------                                                                  
requirements-docs.txt C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\requirements-docs.txt
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                
                                                                                                

--- DEPLOY WORKFLOW NODE/PYTHON SETUP ---
name: Deploy backend

on:
  push:
    branches:
      - main
    paths:
      - 'apps/backend/**'
      - 'packages/contracts/**'
      - 'scripts/prepare-backend-deployment.mjs'
      - 'scripts/smoke-check-backend-artifact.mjs'
      - 'scripts/smoke-check-deployment.mjs'
      - 'package.json'
      - 'package-lock.json'
      - 'tsconfig.base.json'
      - '.gitea/workflows/deploy-backend.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      BACKEND_URL: https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install root workspace dependencies
        run: npm ci

      - name: Validate deployment secret
        env:
          AZURE_BACKEND_PUBLISH_PROFILE: ${{ secrets.AZURE_BACKEND_PUBLISH_PROFILE }}
        run: |
          if [ -z "$AZURE_BACKEND_PUBLISH_PROFILE" ]; then
            echo "::error::Required Gitea secret AZURE_BACKEND_PUBLISH_PROFILE is not configured."
            exit 1
          fi

      - name: Verify shared contracts
        run: |
          npm run lint --workspace=@sport-analytics/contracts
          npm run typecheck --workspace=@sport-analytics/contracts
          npm run test:contracts
          npm run build --workspace=@sport-analytics/contracts

      - name: Verify backend workspace
        run: |
          npm run lint --workspace=@sport-analytics/backend
          npm run typecheck --workspace=@sport-analytics/backend
          npm run test:unit
          npm run test:api
          npm run build --workspace=@sport-analytics/backend

      - name: Prepare backend deployment artifact
        run: npm run deploy:prepare:backend

      - name: Smoke check backend deployment artifact
        run: node scripts/smoke-check-backend-artifact.mjs

      - name: Deploy backend
        uses: azure/webapps-deploy@v3
        with:
          app-name: statsthegame-api-dev
          publish-profile: ${{ secrets.AZURE_BACKEND_PUBLISH_PROFILE }}
          package: .deployment/backend
          clean: true
          restart: true

      - name: Smoke check deployed backend health
        env:
          SMOKE_CHECK_ATTEMPTS: 18
          SMOKE_CHECK_DELAY_MS: 10000
          SMOKE_CHECK_TIMEOUT_MS: 15000
        run: >-
          node scripts/smoke-check-deployment.mjs
          "deployed backend health"
          "$BACKEND_URL/api/v1/health"
          "sport-analytics-api"

      - name: Smoke check deployed database access
        env:
          SMOKE_CHECK_ATTEMPTS: 6
          SMOKE_CHECK_DELAY_MS: 5000
          SMOKE_CHECK_TIMEOUT_MS: 15000
        run: >-
          node scripts/smoke-check-deployment.mjs
          "deployed backend database access"
          "$BACKEND_URL/api/v1/competitions?limit=1"
          "pagination"
name: Deploy frontend

on:
  push:
    branches:
      - main
    paths:
      - 'apps/frontend/**'
      - 'packages/contracts/**'
      - 'scripts/smoke-check-deployment.mjs'
      - 'package.json'
      - 'package-lock.json'
      - 'tsconfig.base.json'
      - '.gitea/workflows/deploy-frontend.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    env:
      FRONTEND_URL: https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install root workspace dependencies
        run: npm ci

      - name: Validate deployment secrets
        env:
          AZURE_FRONTEND_PUBLISH_PROFILE: ${{ secrets.AZURE_FRONTEND_PUBLISH_PROFILE }}
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        run: |
          missing=0
          for name in AZURE_FRONTEND_PUBLISH_PROFILE VITE_API_BASE_URL VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY; do
            if [ -z "${!name}" ]; then
              echo "::error::Required Gitea secret $name is not configured."
              missing=1
            fi
          done
          exit "$missing"

      - name: Verify shared contracts
        run: |
          npm run lint --workspace=@sport-analytics/contracts
          npm run typecheck --workspace=@sport-analytics/contracts
          npm run test:contracts
          npm run build --workspace=@sport-analytics/contracts

      - name: Verify frontend workspace
        run: |
          npm run lint --workspace=@sport-analytics/frontend
          npm run typecheck --workspace=@sport-analytics/frontend
          npm run test:frontend

      - name: Build frontend deployment bundle
        run: npm run build --workspace=@sport-analytics/frontend
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Deploy frontend
        uses: azure/webapps-deploy@v3
        with:
          app-name: statsthegame-web-dev
          publish-profile: ${{ secrets.AZURE_FRONTEND_PUBLISH_PROFILE }}
          package: apps/frontend/dist
          clean: true
          restart: true

      - name: Smoke check deployed frontend
        env:
          SMOKE_CHECK_ATTEMPTS: 18
          SMOKE_CHECK_DELAY_MS: 10000
          SMOKE_CHECK_TIMEOUT_MS: 15000
        run: >-
          node scripts/smoke-check-deployment.mjs
          "deployed frontend"
          "$FRONTEND_URL"
          "<title>Stat'sTheGame</title>"


PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:10:28 PM

Great - this gives us two clear decisions.

First, `requirements-docs.txt` exists, so we **do have an authoritative docs dependency file**. That is exactly what we should use in CI rather than inventing a `pip install` command.

Second, there is now a real runtime inconsistency:

```text
CI workflow:          Node 20
backend deployment:  Node 22
frontend deployment: Node 22
your local machine:  Node 24.14.0
package.json:         >=20
```

I think the cleanest fix under #10 is now to make the **CI reference runtime Node 22**, not 24.

That does **not** force anyone locally to upgrade. We leave:

```json
"engines": {
  "node": ">=20"
}
```

unchanged.

So teammates on Node 20/22/24 are not broken. We're merely making the automated verification environment match the deployment workflows instead of having CI test one major and deployment use another.

And importantly: we do **not** touch either deployment workflow in this PR. They're already both consistently on 22.

Before editing, just show me the docs dependency file and the relevant docs-install instructions:

```powershell
Write-Host "`n--- DOCS REQUIREMENTS ---"
Get-Content requirements-docs.txt

Write-Host "`n--- DOCS SETUP REFERENCES ---"
Get-ChildItem README.md,docs -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\site\\' } |
  Select-String -Pattern "requirements-docs.txt","mkdocs build --strict","pip install" |
  Select-Object Path,LineNumber,Line
```

Assuming that looks sane, I expect the #10 workflow change to be approximately:

```yaml
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm

- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.12'

- name: Install dependencies
  run: npm ci

- name: Install documentation dependencies
  run: python -m pip install -r requirements-docs.txt

...

- name: Build documentation strictly
  run: python -m mkdocs build --strict
```

I deliberately would **not use Python 3.14 in CI just because that's what your laptop has**. For CI, a stable explicit Python version like 3.12 is safer unless `requirements-docs.txt` or your docs specify something else.

Also, the docs should change from:

> The existing Pull Request workflow uses Node.js 20...

to something like:

> The Pull Request workflow uses Node.js 22, installs JavaScript dependencies reproducibly with `npm ci`, installs the pinned documentation dependencies from `requirements-docs.txt`, runs the repository quality gate, database integration tests, browser/accessibility tests, coverage, and a strict MkDocs build.

That would make the architecture document describe the real pipeline rather than an older Sprint 1 version.

So send me the output of those two commands. Then I'll give you the **exact edits** for `.gitea/workflows/ci.yml` and the documentation, without touching anybody's local Node setup.

## Prompt:
8/28/2026, 4:10:58 PM

b4 this, must i comment on 259?

## Response:
8/28/2026, 4:11:09 PM

Yes - I’d comment on **#259 now**, before we continue #10. It gives a clean audit trail showing that the hygiene findings were discovered during the CI readiness sweep but deliberately left for the correct issue.

Use this:

```markdown
## Finding from Issue #10 pre-runner CI readiness sweep

While validating the repository before Gitea Actions runners become available, `npm run hygiene` was run locally.

Current Knip findings:

- `docs/javascripts/external-links.js` is reported as unused. This appears to be a false positive because the file is explicitly loaded by MkDocs through `mkdocs.yml` under `extra_javascript`.
- `CorrectionTarget` in `apps/backend/src/modules/submissions/submission.repository.ts` is reported as an unused exported type. The interface is used internally by the repository, but the `export` itself appears unnecessary.

No hygiene implementation changes were made under #10 because repository-hygiene remediation and CI enforcement are owned by this issue.

Refs #10
```

I would **not close or otherwise change #259** just from this. It's simply useful evidence/input for whoever does #259.

Once you've posted that, we carry straight on with #10.

## Prompt:
8/28/2026, 4:12:04 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Write-Host "`n--- DOCS REQUIREMENTS ---"
>> Get-Content requirements-docs.txt
>> 
>> Write-Host "`n--- DOCS SETUP REFERENCES ---"
>> Get-ChildItem README.md,docs -Recurse -File |
>>   Where-Object { $_.FullName -notmatch '\\site\\' } |
>>   Select-String -Pattern "requirements-docs.txt","mkdocs build --strict","pip install" |
>>   Select-Object Path,LineNumber,Line

--- DOCS REQUIREMENTS ---
mkdocs-material>=9,<10

--- DOCS SETUP REFERENCES ---

Path                                                                LineNumber Line                                                    
----                                                                ---------- ----                                                    
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         17 - the packages listed in `requirements-docs.txt`; and   
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         29 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         37 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         57 python -m mkdocs build --strict                         
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         87 Run `python -m mkdocs build --strict` after any themi...
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\README.md             149 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\README.md             154 validate them with `python -m mkdocs build --strict`.   
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\README.md             205 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\README.md             248 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\README.md             249 python -m mkdocs build --strict                         
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         17 - the packages listed in `requirements-docs.txt`; and   
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         29 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         37 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         57 python -m mkdocs build --strict                         
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\README.md         87 Run `python -m mkdocs build --strict` after any themi...
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\archit...        436 1. build MkDocs with `mkdocs build --strict`;           
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\deploy...         13 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\deploy...         21 python -m mkdocs build --strict                         
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\deploy...         74    python -m mkdocs build --strict                      
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\develo...         21 - `requirements-docs.txt` defines the Python document...
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\develo...        358 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\develo...        367 python -m pip install -r requirements-docs.txt          
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\develo...        380 python -m mkdocs build --strict                         
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\develo...        583 python -m pip install -r requirements-docs.txt          


PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:12:13 PM

> **Updating CI setup**
>
> I’m treating this as a repository-editing task. I’m going to inspect the current workflow and dependency files first, then make the smallest changes needed for deterministic installs and documentation builds, while preserving the existing Node deployment behavior.
>
> **Updated CI setup**
>
> 
>
> **Refining CI changes**
>
> I’m aligning the CI workflow with deployment by using Node 22, adding dependency-aware caching, installing the documentation dependency explicitly, and running a strict documentation build before browser tests.
>
> **Refined CI changes**
>
> 
>
> Worked for 1m 4s

Yep - this confirms we can safely add the docs build to CI using the repo's **existing documented mechanism**:

```text
requirements-docs.txt
→ mkdocs-material>=9,<10

python -m pip install -r requirements-docs.txt
python -m mkdocs build --strict
```

So we are not inventing a new setup. And for Node, I still recommend **CI → Node 22**, because both deployment workflows already use 22. We leave `"engines": { "node": ">=20" }` unchanged, so this does **not** break anyone's local environment.

Let's change **only `ci.yml` first**, inspect it, and then update the docs/evidence.

Run this in PowerShell:

```powershell
@'
name: Continuous Integration

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 25

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: sport_analytics_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U test_user -d sport_analytics_test"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    env:
      NODE_ENV: test
      DATABASE_URL_TEST: postgresql://test_user:test_password@localhost:5432/sport_analytics_test
      SUPABASE_URL: https://example.invalid
      SUPABASE_PUBLISHABLE_KEY: test-publishable-key

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
          cache-dependency-path: requirements-docs.txt

      - name: Install dependencies
        run: npm ci

      - name: Install documentation dependencies
        run: python -m pip install -r requirements-docs.txt

      - name: Run repository checks
        run: npm run check

      - name: Build documentation strictly
        run: python -m mkdocs build --strict

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Reset and migrate test database
        run: |
          npm run db:test:reset --workspace=@sport-analytics/backend
          npm run db:test:migrate --workspace=@sport-analytics/backend

      - name: Seed test database
        run: npm run db:test:seed --workspace=@sport-analytics/backend

      - name: Run database integration tests
        run: npm run test:database

      - name: Run browser and accessibility tests
        run: npm run test:e2e

      - name: Generate coverage
        run: npm run test:coverage
'@ | python -c "import sys; from pathlib import Path; Path('.gitea/workflows/ci.yml').write_text(sys.stdin.read(), encoding='utf-8', newline='\n')"
```

A small improvement I've made here is moving the expensive Playwright installation **after** `npm run check` and the strict docs build. So if formatting/lint/tests/docs are broken, CI fails quickly rather than downloading Chromium first.

Now **don't commit yet**. Run:

```powershell
Write-Host "`n--- CI DIFF ---"
git diff -- .gitea/workflows/ci.yml

Write-Host "`n--- CI FORMAT CHECK ---"
npx.cmd prettier --check .gitea/workflows/ci.yml

Write-Host "`n--- STATUS ---"
git status --short
```

Paste that.

If it looks right, next we'll update `system-architecture.md` so it no longer says Node 20 or that strict MkDocs is still outstanding, then create the actual **#10 pre-runner readiness evidence file**. After that we'll rerun the relevant checks once more before committing.

## Prompt:
8/28/2026, 4:14:04 PM

>> Write-Host "`n--- CI FORMAT CHECK ---"
>> npx.cmd prettier --check .gitea/workflows/ci.yml
>> 
>> Write-Host "`n--- STATUS ---"
>> git status --short

--- CI DIFF ---
diff --git a/.gitea/workflows/ci.yml b/.gitea/workflows/ci.yml
index 79fa4c4..797ac56 100644
--- a/.gitea/workflows/ci.yml
+++ b/.gitea/workflows/ci.yml
@@ -39,12 +39,29 @@ jobs:
       - name: Set up Node.js
         uses: actions/setup-node@v4
         with:
-          node-version: 20
+          node-version: 22
           cache: npm
+          cache-dependency-path: package-lock.json
+
+      - name: Set up Python
+        uses: actions/setup-python@v5
+        with:
+          python-version: '3.12'
+          cache: pip
+          cache-dependency-path: requirements-docs.txt
 
       - name: Install dependencies
         run: npm ci
 
+      - name: Install documentation dependencies
+        run: python -m pip install -r requirements-docs.txt
+
+      - name: Run repository checks
+        run: npm run check
+
+      - name: Build documentation strictly
+        run: python -m mkdocs build --strict
+
       - name: Install Playwright Chromium
         run: npx playwright install --with-deps chromium
 
@@ -56,9 +73,6 @@ jobs:
       - name: Seed test database
         run: npm run db:test:seed --workspace=@sport-analytics/backend
 
-      - name: Run repository checks
-        run: npm run check
-
       - name: Run database integration tests
         run: npm run test:database
 

--- CI FORMAT CHECK ---
Checking formatting...
All matched files use Prettier code style!

--- STATUS ---
 M .gitea/workflows/ci.yml
 M docs/README.md
 M docs/javascripts/external-links.js
 M docs/stylesheets/extra.css
 M mkdocs.yml
 M package-lock.json
D  site/api/weather/index.html
D  site/design/assets/wireframes/admin-users-desktop.svg
D  site/design/assets/wireframes/admin-users-mobile.svg
D  site/design/assets/wireframes/fixture-detail-desktop.svg
D  site/design/assets/wireframes/fixture-detail-mobile.svg
D  site/design/assets/wireframes/fixtures-desktop.svg
D  site/design/assets/wireframes/fixtures-mobile.svg
D  site/design/assets/wireframes/home-desktop.svg
D  site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:14:35 PM

> **Drafting validation evidence**
>
> I’m outlining a concise evidence document covering CI scope, baseline, findings, verification results, environment differences, limitations, security observations, routed hygiene issues, build warnings, and the required AI declaration.
>
> **Drafted validation evidence**
>
> 
>
> Worked for 39s

The CI diff looks good. I’d make **one small ordering improvement before we document it**: run the JavaScript repository gate immediately after `npm ci`, and only then spend time setting up Python/MkDocs. That way a formatting/lint/test failure exits before Python installation.

Use this targeted edit:

```powershell
python -c @'
from pathlib import Path

p = Path(".gitea/workflows/ci.yml")
text = p.read_text(encoding="utf-8")

old = """      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
          cache-dependency-path: requirements-docs.txt

      - name: Install dependencies
        run: npm ci

      - name: Install documentation dependencies
        run: python -m pip install -r requirements-docs.txt

      - name: Run repository checks
        run: npm run check

      - name: Build documentation strictly
        run: python -m mkdocs build --strict
"""

new = """      - name: Install dependencies
        run: npm ci

      - name: Run repository checks
        run: npm run check

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
          cache-dependency-path: requirements-docs.txt

      - name: Install documentation dependencies
        run: python -m pip install -r requirements-docs.txt

      - name: Build documentation strictly
        run: python -m mkdocs build --strict
"""

if old not in text:
    raise SystemExit("Expected CI block not found; no changes made.")

p.write_text(text.replace(old, new), encoding="utf-8", newline="\n")
'@
```

Now update the architecture documentation so it describes the **new actual CI**, and removes MkDocs from the “still outstanding” list:

```powershell
python -c @'
from pathlib import Path

p = Path("docs/architecture/system-architecture.md")
text = p.read_text(encoding="utf-8")

old = """The existing Pull Request workflow uses Node.js 20, runs `npm ci`, then `npm run check`. The
repository check verifies required files, formatting, lint, TypeScript, automated tests, and
all workspace builds. Before deployment is considered reliable, the pipeline must also:

1. build MkDocs with `mkdocs build --strict`;
2. correct the frontend/backend deployment path and workspace references so they match
   `apps/frontend` and `apps/backend`;
3. make deployments depend on the same green quality checks used for Pull Requests;
4. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
5. deploy immutable build output to the correct application;
6. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
7. record release identity and support rollback to the previous application version; and
8. keep destructive migration changes backward-compatible across the deployment window.
"""

new = """The Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly
with `npm ci`. It runs the repository quality gate, builds the MkDocs documentation strictly
from the documented Python dependency set, resets and migrates an isolated PostgreSQL 16 test
database, runs database integration tests, runs Playwright browser and accessibility tests,
and generates coverage. Before deployment is considered reliable, deployment automation must
still:

1. correct the frontend/backend deployment path and workspace references so they match
   `apps/frontend` and `apps/backend`;
2. make deployments depend on the same green quality checks used for Pull Requests;
3. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
4. deploy immutable build output to the correct application;
5. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
6. record release identity and support rollback to the previous application version; and
7. keep destructive migration changes backward-compatible across the deployment window.
"""

if old not in text:
    raise SystemExit("Expected architecture block not found; no changes made.")

p.write_text(text.replace(old, new), encoding="utf-8", newline="\n")
'@
```

Then let's create the **actual #10 readiness evidence** now:

```powershell
@'
# Issue #10 - Pre-runner CI readiness verification

**Date:** 28 August 2026  
**Branch:** `ci/10-pre-runner-readiness`  
**Purpose:** Revalidate the current repository before Gitea Actions runners become available and remove repository-side causes of CI failure.

## Summary

The repository was tested from a clean JavaScript dependency installation and the current CI-equivalent checks were exercised locally.

Several regressions were identified and corrected before the server-side runner became available:

- generated MkDocs `site/` output had been reintroduced into Git despite `/site/` being ignored;
- the committed `package-lock.json` was inconsistent with the current workspace dependency graph, causing `npm ci` to fail;
- four documentation/theme files failed the repository Prettier gate;
- the CI workflow still used Node.js 20 while both Azure deployment workflows use Node.js 22;
- strict MkDocs validation was documented as required but was not part of the Pull Request CI workflow.

The server-side Gitea runner remains the only blocker to obtaining an actual hosted CI result.

## Reproducible installation

Initial clean-install verification:

```text
npm ci
FAIL
Missing: @emnapi/runtime@1.11.3 from lock file
Missing: @emnapi/core@1.11.3 from lock file
```

The lockfile was regenerated without installing package contents and the resulting change was reviewed. It added the missing dependency records and associated npm lockfile metadata.

A subsequent clean installation succeeded:

```text
added 616 packages
npm ci: PASS
```

The installation was performed with:

- Node.js `v24.14.0`
- npm `11.9.0`

The repository continues to declare Node.js `>=20` for local compatibility. CI is configured to use Node.js 22, matching the existing frontend and backend deployment workflows without forcing developers to change their local runtime.

## Repository quality gate

`npm run check` passed after correcting formatting drift in:

- `docs/javascripts/external-links.js`
- `docs/README.md`
- `docs/stylesheets/extra.css`
- `mkdocs.yml`

Successful checks included:

- repository structure verification;
- Prettier formatting;
- backend, frontend and contracts linting;
- TypeScript type checking;
- contracts build;
- 90 backend unit tests;
- 102 frontend tests;
- 104 API/authentication/authorization tests;
- 73 contracts tests;
- 4 deployment helper tests;
- OpenAPI validation;
- backend, frontend and contracts production builds.

## Database integration

`npm run test:database:local` started an isolated PostgreSQL 16 container, reset the database, applied all current migrations, loaded the deterministic test seed and executed the database integration suite.

Result:

```text
Test Files  10 passed (10)
Tests       52 passed (52)
DATABASE INTEGRATION TESTS: PASS
```

## Browser and accessibility testing

`npm run test:e2e` executed Playwright tests against desktop and mobile Chromium configurations.

Result:

```text
38 passed
```

The suite includes responsive behaviour, keyboard interaction and accessibility checks.

## Coverage execution

`npm run test:coverage` completed successfully.

Result:

```text
Test Files  27 passed (27)
Tests       194 passed (194)
Statements  49.07%
Branches    75.74%
Functions   67.82%
Lines       49.07%
```

Coverage generation currently has no repository-wide failure threshold; this verification records successful execution rather than asserting a new threshold.

## Documentation build

The documentation was validated locally with:

```text
python -m mkdocs build --strict
```

using Python `3.14.3` and MkDocs `1.6.1`.

Result:

```text
Documentation built successfully.
```

CI now installs the repository's documented `requirements-docs.txt` dependency set using Python 3.12 and runs the same strict MkDocs build.

Generated `/site/` output is ignored and is no longer tracked by Git.

## Environment-file check

Tracked environment files are limited to templates:

```text
apps/backend/.env.example
apps/backend/.env.test.example
apps/frontend/.env.example
```

Local `.env` and `.env.test` files were present but were not tracked.

## Repository hygiene observation

`npm run hygiene` currently reports:

- `docs/javascripts/external-links.js` as unused; this is a Knip false positive because MkDocs loads it through `extra_javascript` in `mkdocs.yml`;
- `CorrectionTarget` as an unused exported type; the interface is used internally but its export appears unnecessary.

These findings were recorded against Issue #259. They were not remediated under Issue #10 because repository-hygiene remediation and CI enforcement are owned by #259.

## Other observations

`npm ci` reported dependency audit findings and the frontend production build reported a chunk larger than 500 kB. Neither condition currently fails the repository CI gate. They are recorded for the appropriate dependency/security and performance work rather than expanded into Issue #10.

## Remaining server-side verification

The following acceptance evidence cannot be completed until the Wits Gitea Actions infrastructure is available:

- confirm the runner is online;
- confirm the runner exposes the label expected by `runs-on`;
- execute the Pull Request workflow on the actual runner;
- capture the successful Gitea Actions result;
- diagnose any runner-specific incompatibility if the hosted execution differs from local verification;
- enable required `main` status checks only after a successful hosted run.

Until those items are complete, Issue #10 should remain blocked by the external runner dependency rather than being closed.

Refs #10

The preceding document was generated with the assistance of: ChatGPT-Web[GPT-5.6 Sol]
'@ | Set-Content -Path evidence/validation/issue-10-pre-ci-readiness.md -Encoding utf8
```

Then format and inspect everything:

```powershell
npx.cmd prettier --write `
  .gitea/workflows/ci.yml `
  docs/architecture/system-architecture.md `
  evidence/validation/issue-10-pre-ci-readiness.md

Write-Host "`n--- DIFF SUMMARY ---"
git diff --stat

Write-Host "`n--- CI DIFF ---"
git diff -- .gitea/workflows/ci.yml

Write-Host "`n--- ARCHITECTURE DIFF ---"
git diff -- docs/architecture/system-architecture.md

Write-Host "`n--- EVIDENCE ---"
Get-Content evidence/validation/issue-10-pre-ci-readiness.md

Write-Host "`n--- WHITESPACE CHECK ---"
git diff --check

Write-Host "`n--- STATUS ---"
git status --short
```

Paste that output before we commit. I particularly want to inspect the architecture diff and evidence file once before the final validation run.

## Prompt:
8/28/2026, 4:15:38 PM

>> '@
  File "<string>", line 6
    old = "
          ^
SyntaxError: unterminated string literal (detected at line 6)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> python -c @'
>> from pathlib import Path
>> 
>> p = Path(".gitea/workflows/ci.yml")
>> text = p.read_text(encoding="utf-8")
>> 
>> old = """      - name: Set up Python
>>         uses: actions/setup-python@v5
>>         with:
>>           python-version: '3.12'
>>           cache: pip
>>           cache-dependency-path: requirements-docs.txt
>> 
>>       - name: Install dependencies
>>         run: npm ci
>> 
>>       - name: Install documentation dependencies
>>         run: python -m pip install -r requirements-docs.txt
>> 
>>       - name: Run repository checks
>>         run: npm run check
>> 
>>       - name: Build documentation strictly
>>         run: python -m mkdocs build --strict
>> """
>> 
>> new = """      - name: Install dependencies
>>         run: npm ci
>> 
>>       - name: Run repository checks
>>         run: npm run check
>> 
>>       - name: Set up Python
>>         uses: actions/setup-python@v5
>>         with:
>>           python-version: '3.12'
>>           cache: pip
>>           cache-dependency-path: requirements-docs.txt
>> 
>>       - name: Install documentation dependencies
>>         run: python -m pip install -r requirements-docs.txt
>> 
>>       - name: Build documentation strictly
>>         run: python -m mkdocs build --strict
>> """
>> 
>> if old not in text:
>>     raise SystemExit("Expected CI block not found; no changes made.")
>> 
>> p.write_text(text.replace(old, new), encoding="utf-8", newline="\n")
>> '@
  File "<string>", line 6
    old = "
          ^
SyntaxError: unterminated string literal (detected at line 6)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:15:48 PM

> **Fixing the replacement**
>
> I’m correcting the command by piping the here-string into Python’s standard input. The previous form passed the script incorrectly, so it produced no visible result.
>
> **Fixed the replacement**
>
> 
>
> Worked for 11s

Yep — that error is just from the way PowerShell passes a here-string to `python -c`. **Nothing was changed by those failed commands.**

Rather than fight the quoting, let's use the safer approach: rewrite the CI file directly to the final version we want.

Run this exactly:

```powershell
@'
name: Continuous Integration

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 25

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: sport_analytics_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U test_user -d sport_analytics_test"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    env:
      NODE_ENV: test
      DATABASE_URL_TEST: postgresql://test_user:test_password@localhost:5432/sport_analytics_test
      SUPABASE_URL: https://example.invalid
      SUPABASE_PUBLISHABLE_KEY: test-publishable-key

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run repository checks
        run: npm run check

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
          cache-dependency-path: requirements-docs.txt

      - name: Install documentation dependencies
        run: python -m pip install -r requirements-docs.txt

      - name: Build documentation strictly
        run: python -m mkdocs build --strict

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Reset and migrate test database
        run: |
          npm run db:test:reset --workspace=@sport-analytics/backend
          npm run db:test:migrate --workspace=@sport-analytics/backend

      - name: Seed test database
        run: npm run db:test:seed --workspace=@sport-analytics/backend

      - name: Run database integration tests
        run: npm run test:database

      - name: Run browser and accessibility tests
        run: npm run test:e2e

      - name: Generate coverage
        run: npm run test:coverage
'@ | Set-Content .gitea/workflows/ci.yml -Encoding utf8
```

Then normalize it with Prettier and inspect:

```powershell
npx.cmd prettier --write .gitea/workflows/ci.yml

Write-Host "`n--- CI DIFF ---"
git diff -- .gitea/workflows/ci.yml

Write-Host "`n--- CI FORMAT CHECK ---"
npx.cmd prettier --check .gitea/workflows/ci.yml

Write-Host "`n--- STATUS ---"
git status --short
```

What we want is the same substantive diff as before, except the order should now be:

```text
checkout
→ Node 22
→ npm ci
→ npm run check
→ Python 3.12
→ docs dependencies
→ MkDocs strict
→ Playwright install
→ DB
→ E2E
→ coverage
```

That ordering is better because if `npm ci` or the main repository gate fails, CI stops before spending time setting up Python or downloading Chromium.

Paste the diff after this and then we'll do the architecture/evidence edits using PowerShell-safe commands rather than the troublesome `python -c @'...'@` form.

## Prompt:
8/28/2026, 4:17:08 PM

>>     env:
>>       NODE_ENV: test
>>       DATABASE_URL_TEST: postgresql://test_user:test_password@localhost:5432/sport_analytics_test
>>       SUPABASE_URL: https://example.invalid
>>       SUPABASE_PUBLISHABLE_KEY: test-publishable-key
>> 
>>     steps:
>>       - name: Check out repository
>>         uses: actions/checkout@v4
>> 
>>       - name: Set up Node.js
>>         uses: actions/setup-node@v4
>>         with:
>>           node-version: 22
>>           cache: npm
>>           cache-dependency-path: package-lock.json
>> 
>>       - name: Install dependencies
>>         run: npm ci
>> 
>>       - name: Run repository checks
>>         run: npm run check
>> 
>>       - name: Set up Python
>>         uses: actions/setup-python@v5
>>         with:
>>           python-version: '3.12'
>>           cache: pip
>>           cache-dependency-path: requirements-docs.txt
>> 
>>       - name: Install documentation dependencies
>>         run: python -m pip install -r requirements-docs.txt
>> 
>>       - name: Build documentation strictly
>>         run: python -m mkdocs build --strict
>> 
>>       - name: Install Playwright Chromium
>>         run: npx playwright install --with-deps chromium
>> 
>>       - name: Reset and migrate test database
>>         run: |
>>           npm run db:test:reset --workspace=@sport-analytics/backend
>>           npm run db:test:migrate --workspace=@sport-analytics/backend
>> 
>>       - name: Seed test database
>>         run: npm run db:test:seed --workspace=@sport-analytics/backend
>> 
>>       - name: Run database integration tests
>>         run: npm run test:database
>> 
>>       - name: Run browser and accessibility tests
>>         run: npm run test:e2e
>> 
>>       - name: Generate coverage
>>         run: npm run test:coverage
>> '@ | Set-Content .gitea/workflows/ci.yml -Encoding utf8
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npx.cmd prettier --write .gitea/workflows/ci.yml
>> 
>> Write-Host "`n--- CI DIFF ---"
>> git diff -- .gitea/workflows/ci.yml
>> 
>> Write-Host "`n--- CI FORMAT CHECK ---"
>> npx.cmd prettier --check .gitea/workflows/ci.yml
>> 
>> Write-Host "`n--- STATUS ---"
>> git status --short
.gitea/workflows/ci.yml 35ms

--- CI DIFF ---
warning: in the working copy of '.gitea/workflows/ci.yml', CRLF will be replaced by LF the next time Git touches it
diff --git a/.gitea/workflows/ci.yml b/.gitea/workflows/ci.yml
index 79fa4c4..10156fc 100644
--- a/.gitea/workflows/ci.yml
+++ b/.gitea/workflows/ci.yml
@@ -1,4 +1,4 @@
-name: Continuous Integration
+name: Continuous Integration
 
 on:
   push:
@@ -39,12 +39,29 @@ jobs:
       - name: Set up Node.js
         uses: actions/setup-node@v4
         with:
-          node-version: 20
+          node-version: 22
           cache: npm
+          cache-dependency-path: package-lock.json
 
       - name: Install dependencies
         run: npm ci
 
+      - name: Run repository checks
+        run: npm run check
+
+      - name: Set up Python
+        uses: actions/setup-python@v5
+        with:
+          python-version: '3.12'
+          cache: pip
+          cache-dependency-path: requirements-docs.txt
+
+      - name: Install documentation dependencies
+        run: python -m pip install -r requirements-docs.txt
+
+      - name: Build documentation strictly
+        run: python -m mkdocs build --strict
+
       - name: Install Playwright Chromium
         run: npx playwright install --with-deps chromium
 
@@ -56,9 +73,6 @@ jobs:
       - name: Seed test database
         run: npm run db:test:seed --workspace=@sport-analytics/backend
 
-      - name: Run repository checks
-        run: npm run check
-
       - name: Run database integration tests
         run: npm run test:database
 

--- CI FORMAT CHECK ---
Checking formatting...
All matched files use Prettier code style!

--- STATUS ---
 M .gitea/workflows/ci.yml
 M docs/README.md
 M docs/javascripts/external-links.js
 M docs/stylesheets/extra.css
 M mkdocs.yml
 M package-lock.json
D  site/api/weather/index.html
D  site/design/assets/wireframes/admin-users-desktop.svg
D  site/design/assets/wireframes/admin-users-mobile.svg
D  site/design/assets/wireframes/fixture-detail-desktop.svg
D  site/design/assets/wireframes/fixture-detail-mobile.svg
D  site/design/assets/wireframes/fixtures-desktop.svg
D  site/design/assets/wireframes/fixtures-mobile.svg
D  site/design/assets/wireframes/home-desktop.svg
D  site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:17:18 PM

> **Removing unintended markers**
>
> I’m correcting the workflow file’s encoding before continuing. The diff suggests an invisible byte-order mark and line-ending normalization, so I’m rewriting it as clean UTF-8 with consistent line endings, then I’ll recheck the diff.
>
> **Removed unintended markers**
>
> 
>
> Worked for 11s

The substantive CI diff is good. There is just **one tiny encoding issue to fix before we touch the docs**.

This line:

```diff
-name: Continuous Integration
+name: Continuous Integration
```

even though the text looks identical means `Set-Content` introduced an invisible UTF-8 BOM at the start of the file. We don't want that noise in the PR.

Run this first:

```powershell
$path = ".gitea/workflows/ci.yml"
$text = [System.IO.File]::ReadAllText((Resolve-Path $path))
$text = $text.TrimStart([char]0xFEFF)
$text = $text.Replace("`r`n", "`n")
[System.IO.File]::WriteAllText(
    (Resolve-Path $path),
    $text,
    [System.Text.UTF8Encoding]::new($false)
)

git diff -- .gitea/workflows/ci.yml
```

The phantom first-line change should disappear. The remaining CI diff should only show the meaningful changes:

```text
Node 20 → Node 22
+ cache-dependency-path
+ npm check moved earlier
+ Python 3.12
+ requirements-docs.txt install
+ MkDocs --strict
```

Then we can update the architecture docs safely with PowerShell rather than the `python -c` quoting mess.

Run:

```powershell
$path = "docs/architecture/system-architecture.md"
$text = [System.IO.File]::ReadAllText((Resolve-Path $path))

$old = @'
The existing Pull Request workflow uses Node.js 20, runs `npm ci`, then `npm run check`. The
repository check verifies required files, formatting, lint, TypeScript, automated tests, and
all workspace builds. Before deployment is considered reliable, the pipeline must also:

1. build MkDocs with `mkdocs build --strict`;
2. correct the frontend/backend deployment path and workspace references so they match
   `apps/frontend` and `apps/backend`;
3. make deployments depend on the same green quality checks used for Pull Requests;
4. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
5. deploy immutable build output to the correct application;
6. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
7. record release identity and support rollback to the previous application version; and
8. keep destructive migration changes backward-compatible across the deployment window.
'@

$new = @'
The Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly
with `npm ci`. It runs the repository quality gate, builds the MkDocs documentation strictly
from the documented Python dependency set, resets and migrates an isolated PostgreSQL 16 test
database, runs database integration tests, runs Playwright browser and accessibility tests,
and generates coverage. Before deployment is considered reliable, deployment automation must
still:

1. correct the frontend/backend deployment path and workspace references so they match
   `apps/frontend` and `apps/backend`;
2. make deployments depend on the same green quality checks used for Pull Requests;
3. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
4. deploy immutable build output to the correct application;
5. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
6. record release identity and support rollback to the previous application version; and
7. keep destructive migration changes backward-compatible across the deployment window.
'@

if (-not $text.Contains($old)) {
    throw "Expected architecture block was not found. No change made."
}

$text = $text.Replace($old, $new)
$text = $text.Replace("`r`n", "`n")

[System.IO.File]::WriteAllText(
    (Resolve-Path $path),
    $text,
    [System.Text.UTF8Encoding]::new($false)
)
```

Then format and inspect:

```powershell
npx.cmd prettier --write `
  .gitea/workflows/ci.yml `
  docs/architecture/system-architecture.md

Write-Host "`n--- CI DIFF ---"
git diff -- .gitea/workflows/ci.yml

Write-Host "`n--- ARCHITECTURE DIFF ---"
git diff -- docs/architecture/system-architecture.md

Write-Host "`n--- WHITESPACE ---"
git diff --check
```

Send me that output.

After that we'll create the #10 evidence file. I want to do it **after** these diffs are clean, because the evidence should describe the final version of the pipeline rather than one we're still modifying.

## Prompt:
8/28/2026, 4:18:30 PM

site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> $path = ".gitea/workflows/ci.yml"
>> $text = [System.IO.File]::ReadAllText((Resolve-Path $path))
>> $text = $text.TrimStart([char]0xFEFF)
>> $text = $text.Replace("`r`n", "`n")
>> [System.IO.File]::WriteAllText(
>>     (Resolve-Path $path),
>>     $text,
>>     [System.Text.UTF8Encoding]::new($false)
>> )
>> 
>> git diff -- .gitea/workflows/ci.yml
diff --git a/.gitea/workflows/ci.yml b/.gitea/workflows/ci.yml
index 79fa4c4..4c427e8 100644
--- a/.gitea/workflows/ci.yml
+++ b/.gitea/workflows/ci.yml
@@ -39,12 +39,29 @@ jobs:
       - name: Set up Node.js
         uses: actions/setup-node@v4
         with:
-          node-version: 20
+          node-version: 22
           cache: npm
+          cache-dependency-path: package-lock.json
 
       - name: Install dependencies
         run: npm ci
 
+      - name: Run repository checks
+        run: npm run check
+
+      - name: Set up Python
+        uses: actions/setup-python@v5
+        with:
+          python-version: '3.12'
+          cache: pip
+          cache-dependency-path: requirements-docs.txt
+
+      - name: Install documentation dependencies
+        run: python -m pip install -r requirements-docs.txt
+
+      - name: Build documentation strictly
+        run: python -m mkdocs build --strict
+
       - name: Install Playwright Chromium
         run: npx playwright install --with-deps chromium
 
@@ -56,9 +73,6 @@ jobs:
       - name: Seed test database
         run: npm run db:test:seed --workspace=@sport-analytics/backend
 
-      - name: Run repository checks
-        run: npm run check
-
       - name: Run database integration tests
         run: npm run test:database
 
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> $path = "docs/architecture/system-architecture.md"
>> $text = [System.IO.File]::ReadAllText((Resolve-Path $path))
>> 
>> $old = @'
>> The existing Pull Request workflow uses Node.js 20, runs `npm ci`, then `npm run check`. The
>> repository check verifies required files, formatting, lint, TypeScript, automated tests, and
>> all workspace builds. Before deployment is considered reliable, the pipeline must also:
>> 
>> 1. build MkDocs with `mkdocs build --strict`;
>> 2. correct the frontend/backend deployment path and workspace references so they match
>>    `apps/frontend` and `apps/backend`;
>> 3. make deployments depend on the same green quality checks used for Pull Requests;
>> 4. run reviewed database migrations as an explicit, observable, and recoverable step rather
>>    than on application startup;
>> 5. deploy immutable build output to the correct application;
>> 6. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
>> 7. record release identity and support rollback to the previous application version; and
>> 8. keep destructive migration changes backward-compatible across the deployment window.
>> '@
>> 
>> $new = @'
>> The Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly
>> with `npm ci`. It runs the repository quality gate, builds the MkDocs documentation strictly
>> from the documented Python dependency set, resets and migrates an isolated PostgreSQL 16 test
>> database, runs database integration tests, runs Playwright browser and accessibility tests,
>> and generates coverage. Before deployment is considered reliable, deployment automation must
>> still:
>> 
>> 1. correct the frontend/backend deployment path and workspace references so they match
>>    `apps/frontend` and `apps/backend`;
>> 2. make deployments depend on the same green quality checks used for Pull Requests;
>> 3. run reviewed database migrations as an explicit, observable, and recoverable step rather
>>    than on application startup;
>> 4. deploy immutable build output to the correct application;
>> 5. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
>> 6. record release identity and support rollback to the previous application version; and
>> 7. keep destructive migration changes backward-compatible across the deployment window.
>> '@
>> 
>> if (-not $text.Contains($old)) {
>>     throw "Expected architecture block was not found. No change made."
>> }
>> 
>> $text = $text.Replace($old, $new)
>> $text = $text.Replace("`r`n", "`n")
>> 
>> [System.IO.File]::WriteAllText(
>>     (Resolve-Path $path),
>>     $text,
>>     [System.Text.UTF8Encoding]::new($false)
>> )
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npx.cmd prettier --write `
>>   .gitea/workflows/ci.yml `
>>   docs/architecture/system-architecture.md
>> 
>> Write-Host "`n--- CI DIFF ---"
>> git diff -- .gitea/workflows/ci.yml
>> 
>> Write-Host "`n--- ARCHITECTURE DIFF ---"
>> git diff -- docs/architecture/system-architecture.md
>> 
>> Write-Host "`n--- WHITESPACE ---"
>> git diff --check
.gitea/workflows/ci.yml 43ms (unchanged)
docs/architecture/system-architecture.md 229ms (unchanged)

--- CI DIFF ---
diff --git a/.gitea/workflows/ci.yml b/.gitea/workflows/ci.yml
index 79fa4c4..4c427e8 100644
--- a/.gitea/workflows/ci.yml
+++ b/.gitea/workflows/ci.yml
@@ -39,12 +39,29 @@ jobs:
       - name: Set up Node.js
         uses: actions/setup-node@v4
         with:
-          node-version: 20
+          node-version: 22
           cache: npm
+          cache-dependency-path: package-lock.json
 
       - name: Install dependencies
         run: npm ci
 
+      - name: Run repository checks
+        run: npm run check
+
+      - name: Set up Python
+        uses: actions/setup-python@v5
+        with:
+          python-version: '3.12'
+          cache: pip
+          cache-dependency-path: requirements-docs.txt
+
+      - name: Install documentation dependencies
+        run: python -m pip install -r requirements-docs.txt
+
+      - name: Build documentation strictly
+        run: python -m mkdocs build --strict
+
       - name: Install Playwright Chromium
         run: npx playwright install --with-deps chromium
 
@@ -56,9 +73,6 @@ jobs:
       - name: Seed test database
         run: npm run db:test:seed --workspace=@sport-analytics/backend
 
-      - name: Run repository checks
-        run: npm run check
-
       - name: Run database integration tests
         run: npm run test:database
 

--- ARCHITECTURE DIFF ---
diff --git a/docs/architecture/system-architecture.md b/docs/architecture/system-architecture.md
index 27d77c5..102dae4 100644
--- a/docs/architecture/system-architecture.md
+++ b/docs/architecture/system-architecture.md
@@ -429,20 +429,22 @@ deployment credentials. Real secrets are never committed.
 
 ### Pipeline controls
 
-The existing Pull Request workflow uses Node.js 20, runs `npm ci`, then `npm run check`. The
-repository check verifies required files, formatting, lint, TypeScript, automated tests, and
-all workspace builds. Before deployment is considered reliable, the pipeline must also:
-
-1. build MkDocs with `mkdocs build --strict`;
-2. correct the frontend/backend deployment path and workspace references so they match
+The Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly
+with `npm ci`. It runs the repository quality gate, builds the MkDocs documentation strictly
+from the documented Python dependency set, resets and migrates an isolated PostgreSQL 16 test
+database, runs database integration tests, runs Playwright browser and accessibility tests,
+and generates coverage. Before deployment is considered reliable, deployment automation must
+still:
+
+1. correct the frontend/backend deployment path and workspace references so they match
    `apps/frontend` and `apps/backend`;
-3. make deployments depend on the same green quality checks used for Pull Requests;
-4. run reviewed database migrations as an explicit, observable, and recoverable step rather
+2. make deployments depend on the same green quality checks used for Pull Requests;
+3. run reviewed database migrations as an explicit, observable, and recoverable step rather
    than on application startup;
-5. deploy immutable build output to the correct application;
-6. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
-7. record release identity and support rollback to the previous application version; and
-8. keep destructive migration changes backward-compatible across the deployment window.
+4. deploy immutable build output to the correct application;
+5. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
+6. record release identity and support rollback to the previous application version; and
+7. keep destructive migration changes backward-compatible across the deployment window.
 
 Path filters should deploy only affected units, while changes to contracts, root lockfiles,
 or shared configuration must trigger every dependent unit. Production approval gates may be

--- WHITESPACE ---
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:18:44 PM

> **Reviewing documentation accuracy**
>
> I’m noticing the architecture document may contain a stale deployment-path note. Since current workflows already use the expected workspace paths, I’m considering correcting that documentation while avoiding unrelated deployment changes.
>
> **Reviewed documentation accuracy**
>
> 
>
> **Refining evidence wording**
>
> I’m adjusting the documentation language to distinguish the configured Node.js version from runner availability. I’m also recording the validation results, dependency issue, formatting fixes, audit findings, and the required AI-use declaration.
>
> **Refined evidence wording**
>
> 
>
> Worked for 24s

Yes - these diffs are clean now, and `git diff --check` is empty. The CI workflow change itself looks right.

I want **one accuracy fix in the architecture text before we freeze the evidence**: the current backend/frontend deployment workflows you showed already point at `apps/backend` and `apps/frontend`, so the outstanding bullet saying those paths still need correcting is stale. Also, because the Gitea runner is still unavailable, “the Pull Request workflow uses…” is slightly stronger than what we have actually proven; “the configured Pull Request workflow…” is better.

Run this small docs-only correction:

```powershell
$path = "docs/architecture/system-architecture.md"
$text = [System.IO.File]::ReadAllText((Resolve-Path $path))

$text = $text.Replace(
    "The Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly",
    "The configured Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly"
)

$text = $text.Replace(
@'
1. correct the frontend/backend deployment path and workspace references so they match
   `apps/frontend` and `apps/backend`;
2. make deployments depend on the same green quality checks used for Pull Requests;
3. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
4. deploy immutable build output to the correct application;
5. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
6. record release identity and support rollback to the previous application version; and
7. keep destructive migration changes backward-compatible across the deployment window.
'@,
@'
1. make deployments depend on the same green quality checks used for Pull Requests;
2. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
3. deploy immutable build output to the correct application;
4. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
5. record release identity and support rollback to the previous application version; and
6. keep destructive migration changes backward-compatible across the deployment window.
'@
)

$text = $text.Replace("`r`n", "`n")

[System.IO.File]::WriteAllText(
    (Resolve-Path $path),
    $text,
    [System.Text.UTF8Encoding]::new($false)
)

npx.cmd prettier --write docs/architecture/system-architecture.md
```

Then let's create the actual #10 readiness evidence. This uses BOM-free UTF-8 too:

```powershell
$evidencePath = "evidence/validation/issue-10-pre-ci-readiness.md"

$evidence = @'
# Issue #10 - Pre-runner CI readiness verification

**Date:** 28 August 2026  
**Branch:** `ci/10-pre-runner-readiness`  
**Issue:** #10 - Restore green CI and reproducible installation

## Purpose

Revalidate the current repository before Gitea Actions runners become available and remove repository-side causes that would prevent the CI workflow from succeeding.

Hosted Gitea Actions execution remains blocked by the external runner dependency.

## Findings and remediation

### 1. Generated MkDocs output had returned to source control

The repository already ignores `/site/`, but 17 generated MkDocs files were still tracked.

They were removed from Git tracking while remaining available locally as generated output.

Verification:

```text
git ls-files site
<no output>
```

The `/site/` ignore rule remains in `.gitignore`.

### 2. Clean installation initially failed

A clean installation using `npm ci` initially failed because the committed lockfile did not contain two required transitive package records:

```text
Missing: @emnapi/runtime@1.11.3 from lock file
Missing: @emnapi/core@1.11.3 from lock file
```

The lockfile was regenerated using:

```text
npm install --package-lock-only --ignore-scripts
```

The resulting diff was reviewed before retrying installation.

The subsequent clean installation succeeded:

```text
added 616 packages
npm ci: PASS
```

Local verification runtime:

- Node.js `v24.14.0`
- npm `11.9.0`

The root package continues to support Node.js `>=20`, avoiding an unnecessary change to developers' local environments.

The configured CI reference runtime is now Node.js 22, matching the existing backend and frontend deployment workflows.

### 3. Repository formatting drift

The first `npm run check` attempt stopped at the Prettier gate.

Formatting drift was found in:

- `docs/javascripts/external-links.js`
- `docs/README.md`
- `docs/stylesheets/extra.css`
- `mkdocs.yml`

Only the reported files were formatted.

A subsequent complete repository check passed.

## Core repository quality gate

`npm run check` completed successfully.

Verified:

- repository structure;
- Prettier formatting;
- backend linting;
- frontend linting;
- contracts linting;
- TypeScript type checking;
- contracts build;
- OpenAPI validation;
- backend production build;
- frontend production build;
- contracts production build.

Automated tests executed by the gate:

```text
Backend unit tests:    90 passed
Frontend tests:       102 passed
API tests:            104 passed
Contracts tests:       73 passed
Deployment tests:       4 passed
```

## Database integration

`npm run test:database:local` started an isolated PostgreSQL 16 test database, reset it, applied all current migrations, loaded the deterministic seed, and executed the database suite.

Result:

```text
Test Files  10 passed (10)
Tests       52 passed (52)

DATABASE INTEGRATION TESTS: PASS
```

The current CI workflow uses its PostgreSQL 16 service, explicitly resets, migrates and seeds that database, and then runs the configured database integration suite.

## Browser and accessibility verification

`npm run test:e2e` completed successfully.

Result:

```text
38 passed
```

The Playwright suite exercised desktop and mobile Chromium and includes responsive, keyboard and accessibility behaviour.

## Coverage execution

`npm run test:coverage` completed successfully.

Result:

```text
Test Files  27 passed (27)
Tests       194 passed (194)

Statements  49.07%
Branches    75.74%
Functions   67.82%
Lines       49.07%
```

No new coverage threshold was introduced under Issue #10. This verification confirms that coverage generation executes successfully.

## Documentation verification

The documentation was built locally using:

```text
python -m mkdocs build --strict
```

Local environment:

- Python `3.14.3`
- MkDocs `1.6.1`

Result:

```text
Documentation built successfully.
```

The CI workflow now:

- configures Python 3.12;
- installs the documented dependency set from `requirements-docs.txt`;
- runs `python -m mkdocs build --strict`.

This verifies documentation generation without committing `/site/` output.

## Environment-file verification

Tracked environment files are limited to templates:

```text
apps/backend/.env.example
apps/backend/.env.test.example
apps/frontend/.env.example
```

Local `.env` and `.env.test` files were present but were not tracked.

## Repository hygiene observation

`npm run hygiene` was run as an additional readiness observation.

Knip reported:

- `docs/javascripts/external-links.js` as unused. This is a false positive because MkDocs loads the file through `extra_javascript` in `mkdocs.yml`.
- `CorrectionTarget` as an unused exported type. The interface is used internally by `submission.repository.ts`, but its export appears unnecessary.

These findings were recorded against Issue #259.

No hygiene implementation or CI-enforcement changes were made under Issue #10 because that work belongs to Issue #259.

## Other observations

`npm ci` reported existing dependency audit findings:

```text
11 vulnerabilities
5 moderate
4 high
2 critical
```

No automated `npm audit fix` or forced dependency upgrade was performed under Issue #10 because that could introduce unrelated or breaking dependency changes.

The frontend production build also reports a bundle chunk larger than 500 kB. This is a non-failing performance warning and is not changed under Issue #10.

## CI workflow changes

The configured Pull Request CI workflow now:

1. checks out the repository;
2. uses Node.js 22;
3. installs the workspace using `npm ci`;
4. runs `npm run check`;
5. configures Python 3.12;
6. installs documentation dependencies from `requirements-docs.txt`;
7. runs a strict MkDocs build;
8. installs Playwright Chromium;
9. resets, migrates and seeds PostgreSQL 16;
10. runs database integration tests;
11. runs browser and accessibility tests; and
12. generates coverage.

The main repository check is deliberately run before Python and Playwright setup so ordinary source-quality failures stop the workflow before more expensive CI setup.

## Remaining blocker

The following acceptance evidence cannot be completed until the Wits Gitea Actions runner is available:

- confirm an Actions runner is online;
- confirm its runner labels;
- confirm `runs-on: ubuntu-latest` matches an available runner;
- execute the workflow on the hosted runner;
- capture the successful Gitea Actions result;
- resolve any runner-specific incompatibility revealed by hosted execution;
- enable required `main` status checks only after a successful hosted run.

Issue #10 must therefore remain blocked by the server-side runner dependency until hosted verification is complete.

Refs #10

The preceding document was generated with the assistance of: ChatGPT-Web[GPT-5.6 Sol]
'@

$evidence = $evidence.Replace("`r`n", "`n")

[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) $evidencePath),
    $evidence,
    [System.Text.UTF8Encoding]::new($false)
)

npx.cmd prettier --write $evidencePath
```

Then give me one final inspection before we commit:

```powershell
Write-Host "`n--- DIFF SUMMARY ---"
git diff --stat

Write-Host "`n--- ARCHITECTURE DIFF ---"
git diff -- docs/architecture/system-architecture.md

Write-Host "`n--- EVIDENCE FILE ---"
Get-Content evidence/validation/issue-10-pre-ci-readiness.md

Write-Host "`n--- WHITESPACE CHECK ---"
git diff --check

Write-Host "`n--- STATUS ---"
git status --short
```

After that, we should do **one final `npm.cmd run check` + strict MkDocs build** on the exact final tree, then AI evidence/transcript/CSV, commit, push and PR.

## Prompt:
8/28/2026, 4:19:28 PM

your powershel got curt off, try again

## Response:
8/28/2026, 4:19:35 PM

Yep - here it is again, split into smaller PowerShell blocks so nothing gets cut off.

First, make the small architecture accuracy fix:

```powershell
$path = "docs/architecture/system-architecture.md"
$text = [System.IO.File]::ReadAllText((Resolve-Path $path))

$text = $text.Replace(
    "The Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly",
    "The configured Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly"
)

$old = @'
1. correct the frontend/backend deployment path and workspace references so they match
   `apps/frontend` and `apps/backend`;
2. make deployments depend on the same green quality checks used for Pull Requests;
3. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
4. deploy immutable build output to the correct application;
5. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
6. record release identity and support rollback to the previous application version; and
7. keep destructive migration changes backward-compatible across the deployment window.
'@

$new = @'
1. make deployments depend on the same green quality checks used for Pull Requests;
2. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
3. deploy immutable build output to the correct application;
4. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
5. record release identity and support rollback to the previous application version; and
6. keep destructive migration changes backward-compatible across the deployment window.
'@

if (-not $text.Contains($old)) {
    throw "Expected deployment-control block was not found. No change made."
}

$text = $text.Replace($old, $new)
$text = $text.Replace("`r`n", "`n")

[System.IO.File]::WriteAllText(
    (Resolve-Path $path),
    $text,
    [System.Text.UTF8Encoding]::new($false)
)

npx.cmd prettier --write docs/architecture/system-architecture.md
```

Now create the #10 evidence file:

```powershell
New-Item -ItemType Directory -Force -Path "evidence/validation" | Out-Null

$evidencePath = "evidence/validation/issue-10-pre-ci-readiness.md"

$evidence = @'
# Issue #10 - Pre-runner CI readiness verification

**Date:** 28 August 2026  
**Branch:** `ci/10-pre-runner-readiness`  
**Issue:** #10 - Restore green CI and reproducible installation

## Purpose

Revalidate the current repository before Gitea Actions runners become available and remove repository-side causes that would prevent the CI workflow from succeeding.

Hosted Gitea Actions execution remains blocked by the external runner dependency.

## Findings and remediation

### 1. Generated MkDocs output had returned to source control

The repository already ignores `/site/`, but 17 generated MkDocs files were still tracked.

They were removed from Git tracking while remaining available locally as generated output.

Verification:

```text
git ls-files site
<no output>
```

The `/site/` ignore rule remains in `.gitignore`.

### 2. Clean installation initially failed

A clean installation using `npm ci` initially failed because the committed lockfile did not contain two required transitive package records:

```text
Missing: @emnapi/runtime@1.11.3 from lock file
Missing: @emnapi/core@1.11.3 from lock file
```

The lockfile was regenerated using:

```text
npm install --package-lock-only --ignore-scripts
```

The resulting diff was reviewed before retrying installation.

The subsequent clean installation succeeded:

```text
added 616 packages
npm ci: PASS
```

Local verification runtime:

- Node.js `v24.14.0`
- npm `11.9.0`

The root package continues to support Node.js `>=20`, avoiding an unnecessary change to developers' local environments.

The configured CI reference runtime is now Node.js 22, matching the existing backend and frontend deployment workflows.

### 3. Repository formatting drift

The first `npm run check` attempt stopped at the Prettier gate.

Formatting drift was found in:

- `docs/javascripts/external-links.js`
- `docs/README.md`
- `docs/stylesheets/extra.css`
- `mkdocs.yml`

Only the reported files were formatted.

A subsequent complete repository check passed.

## Core repository quality gate

`npm run check` completed successfully.

Verified:

- repository structure;
- Prettier formatting;
- backend linting;
- frontend linting;
- contracts linting;
- TypeScript type checking;
- contracts build;
- OpenAPI validation;
- backend production build;
- frontend production build;
- contracts production build.

Automated tests executed by the gate:

```text
Backend unit tests:    90 passed
Frontend tests:       102 passed
API tests:            104 passed
Contracts tests:       73 passed
Deployment tests:       4 passed
```

## Database integration

`npm run test:database:local` started an isolated PostgreSQL 16 test database, reset it, applied all current migrations, loaded the deterministic seed, and executed the database suite.

Result:

```text
Test Files  10 passed (10)
Tests       52 passed (52)

DATABASE INTEGRATION TESTS: PASS
```

The current CI workflow uses its PostgreSQL 16 service, explicitly resets, migrates and seeds that database, and then runs the configured database integration suite.

## Browser and accessibility verification

`npm run test:e2e` completed successfully.

Result:

```text
38 passed
```

The Playwright suite exercised desktop and mobile Chromium and includes responsive, keyboard and accessibility behaviour.

## Coverage execution

`npm run test:coverage` completed successfully.

Result:

```text
Test Files  27 passed (27)
Tests       194 passed (194)

Statements  49.07%
Branches    75.74%
Functions   67.82%
Lines       49.07%
```

No new coverage threshold was introduced under Issue #10. This verification confirms that coverage generation executes successfully.

## Documentation verification

The documentation was built locally using:

```text
python -m mkdocs build --strict
```

Local environment:

- Python `3.14.3`
- MkDocs `1.6.1`

Result:

```text
Documentation built successfully.
```

The CI workflow now:

- configures Python 3.12;
- installs the documented dependency set from `requirements-docs.txt`;
- runs `python -m mkdocs build --strict`.

This verifies documentation generation without committing `/site/` output.

## Environment-file verification

Tracked environment files are limited to templates:

```text
apps/backend/.env.example
apps/backend/.env.test.example
apps/frontend/.env.example
```

Local `.env` and `.env.test` files were present but were not tracked.

## Repository hygiene observation

`npm run hygiene` was run as an additional readiness observation.

Knip reported:

- `docs/javascripts/external-links.js` as unused. This is a false positive because MkDocs loads the file through `extra_javascript` in `mkdocs.yml`.
- `CorrectionTarget` as an unused exported type. The interface is used internally by `submission.repository.ts`, but its export appears unnecessary.

These findings were recorded against Issue #259.

No hygiene implementation or CI-enforcement changes were made under Issue #10 because that work belongs to Issue #259.

## Other observations

`npm ci` reported existing dependency audit findings:

```text
11 vulnerabilities
5 moderate
4 high
2 critical
```

No automated `npm audit fix` or forced dependency upgrade was performed under Issue #10 because that could introduce unrelated or breaking dependency changes.

The frontend production build also reports a bundle chunk larger than 500 kB. This is a non-failing performance warning and is not changed under Issue #10.

## CI workflow changes

The configured Pull Request CI workflow now:

1. checks out the repository;
2. uses Node.js 22;
3. installs the workspace using `npm ci`;
4. runs `npm run check`;
5. configures Python 3.12;
6. installs documentation dependencies from `requirements-docs.txt`;
7. runs a strict MkDocs build;
8. installs Playwright Chromium;
9. resets, migrates and seeds PostgreSQL 16;
10. runs database integration tests;
11. runs browser and accessibility tests; and
12. generates coverage.

The main repository check is deliberately run before Python and Playwright setup so ordinary source-quality failures stop the workflow before more expensive CI setup.

## Remaining blocker

The following acceptance evidence cannot be completed until the Wits Gitea Actions runner is available:

- confirm an Actions runner is online;
- confirm its runner labels;
- confirm `runs-on: ubuntu-latest` matches an available runner;
- execute the workflow on the hosted runner;
- capture the successful Gitea Actions result;
- resolve any runner-specific incompatibility revealed by hosted execution;
- enable required `main` status checks only after a successful hosted run.

Issue #10 must therefore remain blocked by the server-side runner dependency until hosted verification is complete.

Refs #10

The preceding document was generated with the assistance of: ChatGPT-Web[GPT-5.6 Sol]
'@

$evidence = $evidence.Replace("`r`n", "`n")

[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) $evidencePath),
    $evidence,
    [System.Text.UTF8Encoding]::new($false)
)

npx.cmd prettier --write $evidencePath
```

Then do the inspection:

```powershell
Write-Host "`n--- DIFF SUMMARY ---"
git diff --stat

Write-Host "`n--- CI DIFF ---"
git diff -- .gitea/workflows/ci.yml

Write-Host "`n--- ARCHITECTURE DIFF ---"
git diff -- docs/architecture/system-architecture.md

Write-Host "`n--- EVIDENCE FILE ---"
Get-Content evidence/validation/issue-10-pre-ci-readiness.md

Write-Host "`n--- WHITESPACE CHECK ---"
git diff --check

Write-Host "`n--- STATUS ---"
git status --short
```

Paste that output before committing. After we approve it, we'll do the **final exact-tree validation**, then the AI transcript/register entry, commit, push and PR.

## Prompt:
8/28/2026, 4:20:10 PM

the /sitei. ignore rule... got cut off b4 then

## Response:
8/28/2026, 4:20:19 PM

> **Resending the continuation**
>
> I’m treating the cutoff as occurring immediately after the `/site/` ignore-rule note. I’ll resend only the remaining evidence section in smaller pieces so it’s easier to copy without truncation.
>
> **Resent the continuation**
>
> 
>
> Worked for 10s

Yep - the big evidence block got cut around the **`/site/` ignore rule** section. Let's redo **only the evidence file**, in smaller safe chunks so it won't truncate.

If your PowerShell prompt is currently showing `>>` instead of `PS ...>`, press **Ctrl+C** once first.

### 1. Create the first half of the evidence file

```powershell
$evidencePath = "evidence/validation/issue-10-pre-ci-readiness.md"
New-Item -ItemType Directory -Force -Path "evidence/validation" | Out-Null

$part1 = @'
# Issue #10 - Pre-runner CI readiness verification

**Date:** 28 August 2026  
**Branch:** `ci/10-pre-runner-readiness`  
**Issue:** #10 - Restore green CI and reproducible installation

## Purpose

Revalidate the current repository before Gitea Actions runners become available and remove repository-side causes that would prevent the CI workflow from succeeding.

Hosted Gitea Actions execution remains blocked by the external runner dependency.

## Findings and remediation

### 1. Generated MkDocs output had returned to source control

The repository already ignores `/site/`, but 17 generated MkDocs files were still tracked.

They were removed from Git tracking while remaining available locally as generated output.

Verification:

```text
git ls-files site
<no output>
```

The `/site/` ignore rule remains in `.gitignore`.

### 2. Clean installation initially failed

A clean installation using `npm ci` initially failed because the committed lockfile did not contain two required transitive package records:

```text
Missing: @emnapi/runtime@1.11.3 from lock file
Missing: @emnapi/core@1.11.3 from lock file
```

The lockfile was regenerated using:

```text
npm install --package-lock-only --ignore-scripts
```

The resulting diff was reviewed before retrying installation.

The subsequent clean installation succeeded:

```text
added 616 packages
npm ci: PASS
```

Local verification runtime:

- Node.js `v24.14.0`
- npm `11.9.0`

The root package continues to support Node.js `>=20`, avoiding an unnecessary change to developers' local environments.

The configured CI reference runtime is now Node.js 22, matching the existing backend and frontend deployment workflows.

### 3. Repository formatting drift

The first `npm run check` attempt stopped at the Prettier gate.

Formatting drift was found in:

- `docs/javascripts/external-links.js`
- `docs/README.md`
- `docs/stylesheets/extra.css`
- `mkdocs.yml`

Only the reported files were formatted.

A subsequent complete repository check passed.

## Core repository quality gate

`npm run check` completed successfully.

Verified:

- repository structure;
- Prettier formatting;
- backend linting;
- frontend linting;
- contracts linting;
- TypeScript type checking;
- contracts build;
- OpenAPI validation;
- backend production build;
- frontend production build;
- contracts production build.

Automated tests executed by the gate:

```text
Backend unit tests:    90 passed
Frontend tests:       102 passed
API tests:            104 passed
Contracts tests:       73 passed
Deployment tests:       4 passed
```

## Database integration

`npm run test:database:local` started an isolated PostgreSQL 16 test database, reset it, applied all current migrations, loaded the deterministic seed, and executed the database suite.

Result:

```text
Test Files  10 passed (10)
Tests       52 passed (52)

DATABASE INTEGRATION TESTS: PASS
```

The current CI workflow uses its PostgreSQL 16 service, explicitly resets, migrates and seeds that database, and then runs the configured database integration suite.
'@

$part1 = $part1.Replace("`r`n", "`n")

[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) $evidencePath),
    $part1,
    [System.Text.UTF8Encoding]::new($false)
)
```

### 2. Append the testing/docs section

```powershell
$part2 = @'

## Browser and accessibility verification

`npm run test:e2e` completed successfully.

Result:

```text
38 passed
```

The Playwright suite exercised desktop and mobile Chromium and includes responsive, keyboard and accessibility behaviour.

## Coverage execution

`npm run test:coverage` completed successfully.

Result:

```text
Test Files  27 passed (27)
Tests       194 passed (194)

Statements  49.07%
Branches    75.74%
Functions   67.82%
Lines       49.07%
```

No new coverage threshold was introduced under Issue #10. This verification confirms that coverage generation executes successfully.

## Documentation verification

The documentation was built locally using:

```text
python -m mkdocs build --strict
```

Local environment:

- Python `3.14.3`
- MkDocs `1.6.1`

Result:

```text
Documentation built successfully.
```

The CI workflow now:

- configures Python 3.12;
- installs the documented dependency set from `requirements-docs.txt`;
- runs `python -m mkdocs build --strict`.

This verifies documentation generation without committing `/site/` output.

## Environment-file verification

Tracked environment files are limited to templates:

```text
apps/backend/.env.example
apps/backend/.env.test.example
apps/frontend/.env.example
```

Local `.env` and `.env.test` files were present but were not tracked.

## Repository hygiene observation

`npm run hygiene` was run as an additional readiness observation.

Knip reported:

- `docs/javascripts/external-links.js` as unused. This is a false positive because MkDocs loads the file through `extra_javascript` in `mkdocs.yml`.
- `CorrectionTarget` as an unused exported type. The interface is used internally by `submission.repository.ts`, but its export appears unnecessary.

These findings were recorded against Issue #259.

No hygiene implementation or CI-enforcement changes were made under Issue #10 because that work belongs to Issue #259.
'@

$part2 = $part2.Replace("`r`n", "`n")

[System.IO.File]::AppendAllText(
    (Join-Path (Get-Location) $evidencePath),
    $part2,
    [System.Text.UTF8Encoding]::new($false)
)
```

### 3. Append the final CI/blocker section

```powershell
$part3 = @'

## Other observations

`npm ci` reported existing dependency audit findings:

```text
11 vulnerabilities
5 moderate
4 high
2 critical
```

No automated `npm audit fix` or forced dependency upgrade was performed under Issue #10 because that could introduce unrelated or breaking dependency changes.

The frontend production build also reports a bundle chunk larger than 500 kB. This is a non-failing performance warning and is not changed under Issue #10.

## CI workflow changes

The configured Pull Request CI workflow now:

1. checks out the repository;
2. uses Node.js 22;
3. installs the workspace using `npm ci`;
4. runs `npm run check`;
5. configures Python 3.12;
6. installs documentation dependencies from `requirements-docs.txt`;
7. runs a strict MkDocs build;
8. installs Playwright Chromium;
9. resets, migrates and seeds PostgreSQL 16;
10. runs database integration tests;
11. runs browser and accessibility tests; and
12. generates coverage.

The main repository check is deliberately run before Python and Playwright setup so ordinary source-quality failures stop the workflow before more expensive CI setup.

## Remaining blocker

The following acceptance evidence cannot be completed until the Wits Gitea Actions runner is available:

- confirm an Actions runner is online;
- confirm its runner labels;
- confirm `runs-on: ubuntu-latest` matches an available runner;
- execute the workflow on the hosted runner;
- capture the successful Gitea Actions result;
- resolve any runner-specific incompatibility revealed by hosted execution;
- enable required `main` status checks only after a successful hosted run.

Issue #10 must therefore remain blocked by the server-side runner dependency until hosted verification is complete.

Refs #10

The preceding document was generated with the assistance of: ChatGPT-Web[GPT-5.6 Sol]
'@

$part3 = $part3.Replace("`r`n", "`n")

[System.IO.File]::AppendAllText(
    (Join-Path (Get-Location) $evidencePath),
    $part3,
    [System.Text.UTF8Encoding]::new($false)
)

npx.cmd prettier --write $evidencePath
```

Then verify that the whole thing exists:

```powershell
Write-Host "`n--- EVIDENCE START ---"
Get-Content evidence/validation/issue-10-pre-ci-readiness.md -TotalCount 40

Write-Host "`n--- EVIDENCE END ---"
Get-Content evidence/validation/issue-10-pre-ci-readiness.md | Select-Object -Last 35

Write-Host "`n--- DIFF SUMMARY ---"
git diff --stat

Write-Host "`n--- WHITESPACE ---"
git diff --check

Write-Host "`n--- STATUS ---"
git status --short
```

This way the `/site/` section and everything after it definitely gets written.

## Prompt:
8/28/2026, 4:20:50 PM

nooooo, your rendering is wrong... u got ```text
git ls-files site
<no output> and then u stoio in powershel bash

## Response:
8/28/2026, 4:20:59 PM

> **Fixing the rendering**
>
> You’re right—the inner triple backticks are closing the outer PowerShell fence. I’m switching the outer fence to four backticks so the Markdown inside renders literally and remains copyable.
>
> **Fixed the rendering**
>
> 
>
> Worked for 11s

You're right — the inner Markdown fence:

```text
git ls-files site
<no output>
```

was closing my outer PowerShell code block. My formatting was broken.

I’ll use **four backticks around the PowerShell**, so the triple-backtick Markdown that we are writing *into the evidence file* stays intact.

First, overwrite/create the evidence file with part 1:

````powershell
$evidencePath = "evidence/validation/issue-10-pre-ci-readiness.md"
New-Item -ItemType Directory -Force -Path "evidence/validation" | Out-Null

$part1 = @'
# Issue #10 — Pre-runner CI readiness verification

**Date:** 28 August 2026  
**Branch:** `ci/10-pre-runner-readiness`  
**Issue:** #10 — Restore green CI and reproducible installation

## Purpose

Revalidate the current repository before Gitea Actions runners become available and remove repository-side causes that would prevent the CI workflow from succeeding.

Hosted Gitea Actions execution remains blocked by the external runner dependency.

## Findings and remediation

### 1. Generated MkDocs output had returned to source control

The repository already ignores `/site/`, but 17 generated MkDocs files were still tracked.

They were removed from Git tracking while remaining available locally as generated output.

Verification:

```text
git ls-files site
<no output>
```

The `/site/` ignore rule remains in `.gitignore`.

### 2. Clean installation initially failed

A clean installation using `npm ci` initially failed because the committed lockfile did not contain two required transitive package records:

```text
Missing: @emnapi/runtime@1.11.3 from lock file
Missing: @emnapi/core@1.11.3 from lock file
```

The lockfile was regenerated using:

```text
npm install --package-lock-only --ignore-scripts
```

The resulting diff was reviewed before retrying installation.

The subsequent clean installation succeeded:

```text
added 616 packages
npm ci: PASS
```

Local verification runtime:

- Node.js `v24.14.0`
- npm `11.9.0`

The root package continues to support Node.js `>=20`, avoiding an unnecessary change to developers' local environments.

The configured CI reference runtime is now Node.js 22, matching the existing backend and frontend deployment workflows.

### 3. Repository formatting drift

The first `npm run check` attempt stopped at the Prettier gate.

Formatting drift was found in:

- `docs/javascripts/external-links.js`
- `docs/README.md`
- `docs/stylesheets/extra.css`
- `mkdocs.yml`

Only the reported files were formatted.

A subsequent complete repository check passed.

## Core repository quality gate

`npm run check` completed successfully.

Verified:

- repository structure;
- Prettier formatting;
- backend linting;
- frontend linting;
- contracts linting;
- TypeScript type checking;
- contracts build;
- OpenAPI validation;
- backend production build;
- frontend production build;
- contracts production build.

Automated tests executed by the gate:

```text
Backend unit tests:    90 passed
Frontend tests:       102 passed
API tests:            104 passed
Contracts tests:       73 passed
Deployment tests:       4 passed
```

## Database integration

`npm run test:database:local` started an isolated PostgreSQL 16 test database, reset it, applied all current migrations, loaded the deterministic seed, and executed the database suite.

Result:

```text
Test Files  10 passed (10)
Tests       52 passed (52)

DATABASE INTEGRATION TESTS: PASS
```

The current CI workflow uses its PostgreSQL 16 service, explicitly resets, migrates and seeds that database, and then runs the configured database integration suite.
'@

$part1 = $part1.Replace("`r`n", "`n")

[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) $evidencePath),
    $part1,
    [System.Text.UTF8Encoding]::new($false)
)
````

Then append part 2:

````powershell
$part2 = @'

## Browser and accessibility verification

`npm run test:e2e` completed successfully.

Result:

```text
38 passed
```

The Playwright suite exercised desktop and mobile Chromium and includes responsive, keyboard and accessibility behaviour.

## Coverage execution

`npm run test:coverage` completed successfully.

Result:

```text
Test Files  27 passed (27)
Tests       194 passed (194)

Statements  49.07%
Branches    75.74%
Functions   67.82%
Lines       49.07%
```

No new coverage threshold was introduced under Issue #10. This verification confirms that coverage generation executes successfully.

## Documentation verification

The documentation was built locally using:

```text
python -m mkdocs build --strict
```

Local environment:

- Python `3.14.3`
- MkDocs `1.6.1`

Result:

```text
Documentation built successfully.
```

The CI workflow now:

- configures Python 3.12;
- installs the documented dependency set from `requirements-docs.txt`;
- runs `python -m mkdocs build --strict`.

This verifies documentation generation without committing `/site/` output.

## Environment-file verification

Tracked environment files are limited to templates:

```text
apps/backend/.env.example
apps/backend/.env.test.example
apps/frontend/.env.example
```

Local `.env` and `.env.test` files were present but were not tracked.

## Repository hygiene observation

`npm run hygiene` was run as an additional readiness observation.

Knip reported:

- `docs/javascripts/external-links.js` as unused. This is a false positive because MkDocs loads the file through `extra_javascript` in `mkdocs.yml`.
- `CorrectionTarget` as an unused exported type. The interface is used internally by `submission.repository.ts`, but its export appears unnecessary.

These findings were recorded against Issue #259.

No hygiene implementation or CI-enforcement changes were made under Issue #10 because that work belongs to Issue #259.
'@

$part2 = $part2.Replace("`r`n", "`n")

[System.IO.File]::AppendAllText(
    (Join-Path (Get-Location) $evidencePath),
    $part2,
    [System.Text.UTF8Encoding]::new($false)
)
````

Then append the final section:

````powershell
$part3 = @'

## Other observations

`npm ci` reported existing dependency audit findings:

```text
11 vulnerabilities
5 moderate
4 high
2 critical
```

No automated `npm audit fix` or forced dependency upgrade was performed under Issue #10 because that could introduce unrelated or breaking dependency changes.

The frontend production build also reports a bundle chunk larger than 500 kB. This is a non-failing performance warning and is not changed under Issue #10.

## CI workflow changes

The configured Pull Request CI workflow now:

1. checks out the repository;
2. uses Node.js 22;
3. installs the workspace using `npm ci`;
4. runs `npm run check`;
5. configures Python 3.12;
6. installs documentation dependencies from `requirements-docs.txt`;
7. runs a strict MkDocs build;
8. installs Playwright Chromium;
9. resets, migrates and seeds PostgreSQL 16;
10. runs database integration tests;
11. runs browser and accessibility tests; and
12. generates coverage.

The main repository check is deliberately run before Python and Playwright setup so ordinary source-quality failures stop the workflow before more expensive CI setup.

## Remaining blocker

The following acceptance evidence cannot be completed until the Wits Gitea Actions runner is available:

- confirm an Actions runner is online;
- confirm its runner labels;
- confirm `runs-on: ubuntu-latest` matches an available runner;
- execute the workflow on the hosted runner;
- capture the successful Gitea Actions result;
- resolve any runner-specific incompatibility revealed by hosted execution;
- enable required `main` status checks only after a successful hosted run.

Issue #10 must therefore remain blocked by the server-side runner dependency until hosted verification is complete.

Refs #10

The preceding document was generated with the assistance of: ChatGPT-Web[GPT-5.6 Sol]
'@

$part3 = $part3.Replace("`r`n", "`n")

[System.IO.File]::AppendAllText(
    (Join-Path (Get-Location) $evidencePath),
    $part3,
    [System.Text.UTF8Encoding]::new($false)
)

npx.cmd prettier --write $evidencePath
````

Then inspect it:

```powershell
Write-Host "`n--- EVIDENCE START ---"
Get-Content evidence/validation/issue-10-pre-ci-readiness.md -TotalCount 45

Write-Host "`n--- EVIDENCE END ---"
Get-Content evidence/validation/issue-10-pre-ci-readiness.md |
    Select-Object -Last 45

Write-Host "`n--- DIFF SUMMARY ---"
git diff --stat

Write-Host "`n--- WHITESPACE CHECK ---"
git diff --check

Write-Host "`n--- STATUS ---"
git status --short
```

This time the ` ```text ` sections are **literally part of the PowerShell here-string** and won't break the command rendering.

## Prompt:
8/28/2026, 4:22:11 PM

>> Write-Host "`n--- EVIDENCE END ---"
>> Get-Content evidence/validation/issue-10-pre-ci-readiness.md |
>>     Select-Object -Last 45
>> 
>> Write-Host "`n--- DIFF SUMMARY ---"
>> git diff --stat
>> 
>> Write-Host "`n--- WHITESPACE CHECK ---"
>> git diff --check
>> 
>> Write-Host "`n--- STATUS ---"
>> git status --short

--- EVIDENCE START ---
# Issue #10 â€” Pre-runner CI readiness verification

**Date:** 28 August 2026  
**Branch:** `ci/10-pre-runner-readiness`  
**Issue:** #10 â€” Restore green CI and reproducible installation

## Purpose

Revalidate the current repository before Gitea Actions runners become available and remove repository-side causes that would prevent the CI workflow from succeeding.

Hosted Gitea Actions execution remains blocked by the external runner dependency.

## Findings and remediation

### 1. Generated MkDocs output had returned to source control

The repository already ignores `/site/`, but 17 generated MkDocs files were still tracked.

They were removed from Git tracking while remaining available locally as generated output.

Verification:

```text
git ls-files site
<no output>
```

The `/site/` ignore rule remains in `.gitignore`.

### 2. Clean installation initially failed

A clean installation using `npm ci` initially failed because the committed lockfile did not contain two required transitive package records:

```text
Missing: @emnapi/runtime@1.11.3 from lock file
Missing: @emnapi/core@1.11.3 from lock file
```

The lockfile was regenerated using:

```text
npm install --package-lock-only --ignore-scripts
```

The resulting diff was reviewed before retrying installation.

--- EVIDENCE END ---
5 moderate
4 high
2 critical
```

No automated `npm audit fix` or forced dependency upgrade was performed under Issue #10 because that could introduce unrelated or breaking dependency changes.

The frontend production build also reports a bundle chunk larger than 500 kB. This is a non-failing performance warning and is not changed under Issue #10.

## CI workflow changes

The configured Pull Request CI workflow now:

1. checks out the repository;
2. uses Node.js 22;
3. installs the workspace using `npm ci`;
4. runs `npm run check`;
5. configures Python 3.12;
6. installs documentation dependencies from `requirements-docs.txt`;
7. runs a strict MkDocs build;
8. installs Playwright Chromium;
9. resets, migrates and seeds PostgreSQL 16;
10. runs database integration tests;
11. runs browser and accessibility tests; and
12. generates coverage.

The main repository check is deliberately run before Python and Playwright setup so ordinary source-quality failures stop the workflow before more expensive CI setup.

## Remaining blocker

The following acceptance evidence cannot be completed until the Wits Gitea Actions runner is available:

- confirm an Actions runner is online;
- confirm its runner labels;
- confirm `runs-on: ubuntu-latest` matches an available runner;
- execute the workflow on the hosted runner;
- capture the successful Gitea Actions result;
- resolve any runner-specific incompatibility revealed by hosted execution;
- enable required `main` status checks only after a successful hosted run.

Issue #10 must therefore remain blocked by the server-side runner dependency until hosted verification is complete.

Refs #10

The preceding document was generated with the assistance of: ChatGPT-Web[GPT-5.6 Sol]

--- DIFF SUMMARY ---
 .gitea/workflows/ci.yml                  | 22 +++++++++---
 docs/README.md                           |  2 +-
 docs/architecture/system-architecture.md | 26 +++++++-------
 docs/javascripts/external-links.js       | 29 +++++++---------
 docs/stylesheets/extra.css               | 12 +++----
 mkdocs.yml                               |  4 +--
 package-lock.json                        | 58 +++++++++++++++++++-------------
 7 files changed, 86 insertions(+), 67 deletions(-)

--- WHITESPACE CHECK ---

--- STATUS ---
 M .gitea/workflows/ci.yml
 M docs/README.md
 M docs/architecture/system-architecture.md
 M docs/javascripts/external-links.js
 M docs/stylesheets/extra.css
 M mkdocs.yml
 M package-lock.json
D  site/api/weather/index.html
D  site/design/assets/wireframes/admin-users-desktop.svg
D  site/design/assets/wireframes/admin-users-mobile.svg
D  site/design/assets/wireframes/fixture-detail-desktop.svg
D  site/design/assets/wireframes/fixture-detail-mobile.svg
D  site/design/assets/wireframes/fixtures-desktop.svg
D  site/design/assets/wireframes/fixtures-mobile.svg
D  site/design/assets/wireframes/home-desktop.svg
D  site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html
?? evidence/validation/issue-10-pre-ci-readiness.md
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:22:21 PM

> **Checking repository status**
>
> I’m noticing two likely issues: PowerShell may be displaying UTF-8 punctuation incorrectly, and ordinary `git diff` won’t show staged deletions or untracked evidence. I’m verifying encoding and reviewing all three change categories separately.
>
> **Checked repository status**
>
> 
>
> Worked for 12s

Good - the evidence file itself is probably fine. The `â€”` is almost certainly **PowerShell displaying a BOM-less UTF-8 file with the wrong encoding**, not corruption in the file. We wrote it as UTF-8 without BOM on purpose.

Also, your `git diff --stat` is currently **not showing the whole change set**:
- the `site/` removals are staged from `git rm --cached`, so they live in `git diff --cached`;
- the evidence file is untracked, so ordinary `git diff` does not show it yet.

Let's verify both properly before staging anything else.

Run:

```powershell
Write-Host "`n--- EVIDENCE WITH UTF-8 DECODING ---"
Get-Content evidence/validation/issue-10-pre-ci-readiness.md -Encoding utf8 -TotalCount 15

Write-Host "`n--- UTF-8 BYTE CHECK ---"
$bytes = [System.IO.File]::ReadAllBytes(
    (Resolve-Path "evidence/validation/issue-10-pre-ci-readiness.md")
)
Write-Host "Starts with UTF-8 BOM:" (
    $bytes.Length -ge 3 -and
    $bytes[0] -eq 0xEF -and
    $bytes[1] -eq 0xBB -and
    $bytes[2] -eq 0xBF
)

Write-Host "`n--- ARCHITECTURE CURRENT SECTION ---"
Get-Content docs/architecture/system-architecture.md -Encoding utf8 |
    Select-Object -Skip 428 -First 32

Write-Host "`n--- STAGED SITE CLEANUP ---"
git diff --cached --stat
git diff --cached --name-status

Write-Host "`n--- TRACKED SITE COUNT ---"
git ls-files site | Measure-Object

Write-Host "`n--- IGNORE RULE ---"
git check-ignore -v --no-index site/api/weather/index.html
```

What I expect:

```text
# Issue #10 - Pre-runner CI readiness verification
```

displayed correctly with `-Encoding utf8`.

And:

```text
Starts with UTF-8 BOM: False
```

That is okay - UTF-8 does not require a BOM.

For the site checks, we want:
- 17 staged deletions;
- tracked site count = **0**;
- `.gitignore` reporting `/site/`.

### One important thing before commit

Your current ordinary diff has:

```text
7 files changed
```

but the true PR also includes:
- 17 staged generated-site deletions;
- 1 new evidence file.

So before the final commit we'll deliberately stage **everything together** and review the complete staged diff. We haven't lost anything.

If the encoding and site output above look correct, then do the final exact-tree verification:

```powershell
Write-Host "`n--- FINAL REPOSITORY CHECK ---"
npm.cmd run check

Write-Host "`n--- FINAL STRICT DOCS BUILD ---"
python -m mkdocs build --strict

Write-Host "`n--- FINAL WHITESPACE CHECK ---"
git diff --check
git diff --cached --check

Write-Host "`n--- SITE STILL UNTRACKED AFTER BUILD ---"
git ls-files site | Measure-Object

Write-Host "`n--- STATUS ---"
git status --short
```

We **do not need to rerun the 52 DB tests, 38 E2Es and 194 coverage tests again** just because we changed CI YAML/documentation/evidence after they passed - no application/database/test code has changed since those successful runs. We will preserve those results in the evidence.

After this final check, we'll do the AI transcript/register, then stage and inspect the **complete** PR before committing.

## Prompt:
8/28/2026, 4:22:55 PM

>> 
>> Write-Host "`n--- ARCHITECTURE CURRENT SECTION ---"
>> Get-Content docs/architecture/system-architecture.md -Encoding utf8 |
>>     Select-Object -Skip 428 -First 32
>> 
>> Write-Host "`n--- STAGED SITE CLEANUP ---"
>> git diff --cached --stat
>> git diff --cached --name-status
>> 
>> Write-Host "`n--- TRACKED SITE COUNT ---"
>> git ls-files site | Measure-Object
>> 
>> Write-Host "`n--- IGNORE RULE ---"
>> git check-ignore -v --no-index site/api/weather/index.html

--- EVIDENCE WITH UTF-8 DECODING ---
# Issue #10 — Pre-runner CI readiness verification

**Date:** 28 August 2026  
**Branch:** `ci/10-pre-runner-readiness`  
**Issue:** #10 — Restore green CI and reproducible installation

## Purpose

Revalidate the current repository before Gitea Actions runners become available and remove repository-side causes that would prevent the CI workflow from succeeding.

Hosted Gitea Actions execution remains blocked by the external runner dependency.

## Findings and remediation

### 1. Generated MkDocs output had returned to source control

--- UTF-8 BYTE CHECK ---
Starts with UTF-8 BOM: False

--- ARCHITECTURE CURRENT SECTION ---

### Pipeline controls

The configured Pull Request workflow uses Node.js 22 and installs the JavaScript workspace reproducibly
with `npm ci`. It runs the repository quality gate, builds the MkDocs documentation strictly
from the documented Python dependency set, resets and migrates an isolated PostgreSQL 16 test
database, runs database integration tests, runs Playwright browser and accessibility tests,
and generates coverage. Before deployment is considered reliable, deployment automation must
still:

1. make deployments depend on the same green quality checks used for Pull Requests;
2. run reviewed database migrations as an explicit, observable, and recoverable step rather
   than on application startup;
3. deploy immutable build output to the correct application;
4. smoke-test frontend, API health, CORS, authentication callback, and database connectivity;
5. record release identity and support rollback to the previous application version; and
6. keep destructive migration changes backward-compatible across the deployment window.

Path filters should deploy only affected units, while changes to contracts, root lockfiles,
or shared configuration must trigger every dependent unit. Production approval gates may be
added without changing application architecture.

## 11. Development roadmap

The roadmap is outcome-based and follows the project's lightweight Scrumban methodology.
Issues move into active development only when their dependencies are understood, an assignee
is available, and they satisfy the Definition of Ready.

The team is targeting:

- a working Basic vertical slice during Sprint 1;
- complete Basic and Intermediate functionality by the end of Sprint 2;

--- STAGED SITE CLEANUP ---
 site/api/weather/index.html                        | 2578 -----------------
 .../assets/wireframes/admin-users-desktop.svg      |   56 -
 .../assets/wireframes/admin-users-mobile.svg       |   47 -
 .../assets/wireframes/fixture-detail-desktop.svg   |   99 -
 .../assets/wireframes/fixture-detail-mobile.svg    |   44 -
 site/design/assets/wireframes/fixtures-desktop.svg |   95 -
 site/design/assets/wireframes/fixtures-mobile.svg  |   40 -
 site/design/assets/wireframes/home-desktop.svg     |   42 -
 site/design/assets/wireframes/home-mobile.svg      |   28 -
 site/design/assets/wireframes/signin-desktop.svg   |   19 -
 site/design/assets/wireframes/signin-mobile.svg    |   17 -
 .../assets/wireframes/submission-desktop.svg       |   37 -
 .../design/assets/wireframes/submission-mobile.svg |   22 -
 site/design/frontend-component-baseline/index.html | 2363 ---------------
 .../index.html                                     | 3014 --------------------
 .../sprint-1-requirements-traceability/index.html  | 2929 -------------------
 site/security/password-recovery/index.html         | 2557 -----------------
 17 files changed, 13987 deletions(-)
D       site/api/weather/index.html
D       site/design/assets/wireframes/admin-users-desktop.svg
D       site/design/assets/wireframes/admin-users-mobile.svg
D       site/design/assets/wireframes/fixture-detail-desktop.svg
D       site/design/assets/wireframes/fixture-detail-mobile.svg
D       site/design/assets/wireframes/fixtures-desktop.svg
D       site/design/assets/wireframes/fixtures-mobile.svg
D       site/design/assets/wireframes/home-desktop.svg
D       site/design/assets/wireframes/home-mobile.svg
D       site/design/assets/wireframes/signin-desktop.svg
D       site/design/assets/wireframes/signin-mobile.svg
D       site/design/assets/wireframes/submission-desktop.svg
D       site/design/assets/wireframes/submission-mobile.svg
D       site/design/frontend-component-baseline/index.html
D       site/design/information-architecture-and-wireframes/index.html
D       site/planning/sprint-1-requirements-traceability/index.html
D       site/security/password-recovery/index.html

--- TRACKED SITE COUNT ---


Count    : 0
Average  : 
Sum      : 
Maximum  : 
Minimum  : 
Property : 


--- IGNORE RULE ---
.gitignore:180:/site/   site/api/weather/index.html


PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:23:04 PM

> **Finalizing validation**
>
> I’m running the last lightweight checks now: verifying the diff, confirming only the intended site deletion is staged, and ensuring the workflow, documentation, and evidence file are all present and clean.
>
> **Finalized validation**
>
> 
>
> Worked for 20s

Perfect. This is now exactly what we wanted:

- UTF-8 evidence file is correct; `â€”` was only PowerShell display encoding.
- No BOM issue.
- Architecture section is accurate.
- `site/` tracked count = **0**.
- `/site/` is actively ignored.
- The scary **13,987 deletions** are only generated MkDocs output being removed from Git history going forward; the generated files still exist locally and can be recreated by MkDocs.

So **do not undo those deletions**.

Now do the final validation on the exact working tree:

```powershell
Write-Host "`n--- FINAL REPOSITORY CHECK ---"
npm.cmd run check

Write-Host "`n--- FINAL STRICT DOCS BUILD ---"
python -m mkdocs build --strict

Write-Host "`n--- CI YAML PARSE ---"
python -c "from pathlib import Path; import yaml; yaml.safe_load(Path('.gitea/workflows/ci.yml').read_text(encoding='utf-8')); print('CI YAML parse: PASS')"

Write-Host "`n--- WHITESPACE CHECKS ---"
git diff --check
git diff --cached --check

Write-Host "`n--- SITE TRACKING CHECK ---"
git ls-files site | Measure-Object

Write-Host "`n--- FINAL STATUS ---"
git status --short
```

What we want:

```text
npm run check                    PASS
mkdocs build --strict            PASS
CI YAML parse                    PASS
git diff --check                 no output
git diff --cached --check        no output
site tracked count               0
```

We **do not need to rerun** the 52 DB integration tests, 38 Playwright tests, and 194 coverage tests again: nothing in application/database/test code changed after those successful runs. Their results are already captured in the evidence.

Once this final block passes, **don't commit yet**. Next we'll do the AI transcript/register entry, stage the complete change set (including the already-staged `site/` deletions), review the final staged PR diff, then commit/push/PR.

## Prompt:
8/28/2026, 4:24:41 PM

-- FINAL REPOSITORY CHECK ---

> sport-analytics-tool@0.1.0 check
> npm run structure:check && npm run format:check && npm run lint && npm run build --workspace=@sport-analytics/contracts && npm run typecheck && npm run test && npm run openapi:lint && npm run build


> sport-analytics-tool@0.1.0 structure:check
> node scripts/check-required-files.mjs

Repository structure check passed (30 required files).

> sport-analytics-tool@0.1.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!

> sport-analytics-tool@0.1.0 lint
> npm run lint --workspaces --if-present


> @sport-analytics/backend@0.1.0 lint
> eslint src tests --ext .ts


> @sport-analytics/frontend@0.1.0 lint
> eslint src --ext .ts,.tsx


> @sport-analytics/contracts@0.1.0 lint
> eslint src --ext .ts


> @sport-analytics/contracts@0.1.0 build
> tsc -p tsconfig.json


> sport-analytics-tool@0.1.0 typecheck
> npm run typecheck --workspaces --if-present


> @sport-analytics/backend@0.1.0 typecheck
> tsc --noEmit


> @sport-analytics/frontend@0.1.0 typecheck
> tsc --noEmit


> @sport-analytics/contracts@0.1.0 typecheck
> tsc --noEmit


> sport-analytics-tool@0.1.0 test
> npm run test:unit && npm run test:frontend && npm run test:api && npm run test:contracts && npm run test:deployment


> sport-analytics-tool@0.1.0 test:unit
> npm run test:unit --workspace=@sport-analytics/backend


> @sport-analytics/backend@0.1.0 test:unit
> vitest run tests/unit


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/backend

 ✓ tests/unit/account-deletion.repository.test.ts (3)
 ✓ tests/unit/account-deletion.service.test.ts (12)
 ✓ tests/unit/account.repository.test.ts (10)
 ✓ tests/unit/admin-access-policy.test.ts (11)
 ✓ tests/unit/admin.service.test.ts (5)
 ✓ tests/unit/database-errors.test.ts (4)
 ✓ tests/unit/domain-builders.test.ts (1)
 ✓ tests/unit/environment.test.ts (3)
 ✓ tests/unit/event.repository.test.ts (2)
 ✓ tests/unit/fixture-statistics.derivation.test.ts (4)
 ✓ tests/unit/fixture-statistics.repository.test.ts (1)
 ✓ tests/unit/public-read.service.test.ts (6)
 ✓ tests/unit/submitter-access.repository.test.ts (6)
 ✓ tests/unit/submitter-access.service.test.ts (3)
 ✓ tests/unit/supabase-auth.test.ts (3)
 ✓ tests/unit/test-database-safety.test.ts (9)
 ✓ tests/unit/weather.service.test.ts (7)

 Test Files  17 passed (17)
      Tests  90 passed (90)
   Start at  16:23:58
   Duration  2.60s (transform 5.78s, setup 0ms, collect 12.68s, tests 186ms, environment 5ms, prepare 3.76s)


> sport-analytics-tool@0.1.0 test:frontend
> npm run test --workspace=@sport-analytics/frontend


> @sport-analytics/frontend@0.1.0 test
> vitest run


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/frontend

 ✓ src/App.test.tsx (15) 877ms
 ✓ src/api/client.test.ts (5)
 ✓ src/api/public-read.test.ts (3)
 ✓ src/components/ComponentBaseline.test.tsx (2)
 ✓ src/pages/PublicBrowsePages.test.tsx (23) 1595ms
 ✓ src/features/admin/AdminUsersPage.test.tsx (20) 1061ms
 ✓ src/features/submissions/SubmissionPage.test.tsx (10) 920ms
 ✓ src/features/auth/AuthProvider.test.tsx (4)
 ✓ src/features/browse/NameCombobox.test.tsx (4)
 ✓ src/features/statistics/StatisticsPages.test.tsx (4) 561ms
 ✓ src/features/submitter-access/SubmitterAccessPanel.test.tsx (12) 814ms

 Test Files  11 passed (11)
      Tests  102 passed (102)
   Start at  16:24:02
   Duration  5.18s (transform 1.40s, setup 3.47s, collect 6.71s, tests 6.48s, environment 18.53s, prepare 2.09s)


> sport-analytics-tool@0.1.0 test:api
> npm run test:api --workspace=@sport-analytics/backend


> @sport-analytics/backend@0.1.0 test:api
> vitest run tests/api tests/auth.test.ts tests/authorization.test.ts tests/health.test.ts


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/backend

stderr | tests/auth.test.ts > GET /api/v1/auth/me > returns a safe server error when account status cannot be resolved
Internal database detail

 ✓ tests/auth.test.ts (13)
 ✓ tests/authorization.test.ts (8)
 ✓ tests/health.test.ts (1)
 ✓ tests/api/account-deletion.test.ts (9)
 ✓ tests/api/admin-users.test.ts (18)
 ✓ tests/api/fixture-statistics.test.ts (4)
 ✓ tests/api/public-read.test.ts (16)
 ✓ tests/api/submissions.test.ts (20) 474ms
 ✓ tests/api/submitter-access-request.test.ts (8)
 ✓ tests/api/weather.test.ts (7)

 Test Files  10 passed (10)
      Tests  104 passed (104)
   Start at  16:24:08
   Duration  2.92s (transform 4.07s, setup 0ms, collect 16.10s, tests 1.91s, environment 3ms, prepare 1.97s)


> sport-analytics-tool@0.1.0 test:contracts
> npm run test --workspace=@sport-analytics/contracts


> @sport-analytics/contracts@0.1.0 test
> vitest run


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/packages/contracts

 ✓ src/tests/api.test.ts (11)
 ✓ src/tests/auth.test.ts (29)
 ✓ src/tests/health.test.ts (2)
 ✓ src/tests/public-read.test.ts (11)
 ✓ src/tests/submissions.test.ts (20)

 Test Files  5 passed (5)
      Tests  73 passed (73)
   Start at  16:24:13
   Duration  1.17s (transform 1.50s, setup 0ms, collect 1.81s, tests 115ms, environment 1ms, prepare 874ms)


> sport-analytics-tool@0.1.0 test:deployment
> node --test tests/deployment/*.test.mjs

✔ accepts a successful response containing the expected marker (31.3034ms)
✔ retries a failed response before succeeding (0.8853ms)
✔ reports the final HTTP failure after exhausting retries (1.0279ms)
✔ rejects unsupported URL protocols before making a request (0.2837ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 122.8053

> sport-analytics-tool@0.1.0 openapi:lint
> redocly lint docs/api/openapi.yaml


    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║  A new version of Redocly CLI (2.49.0) is available.  ║
    ║  Update now: `npm i -g @redocly/cli@latest`.          ║
    ║  Changelog: https://redocly.com/docs/cli/changelog/   ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝

validating docs\api\openapi.yaml...
docs\api\openapi.yaml: validated in 107ms

Woohoo! Your API description is valid. 🎉
1 problem is explicitly ignored.



> sport-analytics-tool@0.1.0 build
> npm run build --workspace=@sport-analytics/contracts && npm run build --workspace=@sport-analytics/backend && npm run build --workspace=@sport-analytics/frontend


> @sport-analytics/contracts@0.1.0 build
> tsc -p tsconfig.json


> @sport-analytics/backend@0.1.0 build
> tsc -p tsconfig.json


> @sport-analytics/frontend@0.1.0 build
> tsc -b && vite build

vite v5.4.21 building for production...
✓ 153 modules transformed.
dist/index.html                   0.63 kB │ gzip:   0.36 kB
dist/assets/index-DiER9R7-.css   37.49 kB │ gzip:   6.96 kB
dist/assets/index-CyMI4Whi.js   581.78 kB │ gzip: 157.59 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 2.12s

--- FINAL STRICT DOCS BUILD ---

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
INFO    -  Documentation built in 2.20 seconds

--- CI YAML PARSE ---
CI YAML parse: PASS

--- WHITESPACE CHECKS ---

--- SITE TRACKING CHECK ---


Count    : 0
Average  : 
Sum      : 
Maximum  : 
Minimum  : 
Property : 


--- FINAL STATUS ---
 M .gitea/workflows/ci.yml
 M docs/README.md
 M docs/architecture/system-architecture.md
 M docs/javascripts/external-links.js
 M docs/stylesheets/extra.css
 M mkdocs.yml
 M package-lock.json
D  site/api/weather/index.html
D  site/design/assets/wireframes/admin-users-desktop.svg
D  site/design/assets/wireframes/admin-users-mobile.svg
D  site/design/assets/wireframes/fixture-detail-desktop.svg
D  site/design/assets/wireframes/fixture-detail-mobile.svg
D  site/design/assets/wireframes/fixtures-desktop.svg
D  site/design/assets/wireframes/fixtures-mobile.svg
D  site/design/assets/wireframes/home-desktop.svg
D  site/design/assets/wireframes/home-mobile.svg
D  site/design/assets/wireframes/signin-desktop.svg
D  site/design/assets/wireframes/signin-mobile.svg
D  site/design/assets/wireframes/submission-desktop.svg
D  site/design/assets/wireframes/submission-mobile.svg
D  site/design/frontend-component-baseline/index.html
D  site/design/information-architecture-and-wireframes/index.html
D  site/planning/sprint-1-requirements-traceability/index.html
D  site/security/password-recovery/index.html
?? evidence/validation/issue-10-pre-ci-readiness.md


PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/28/2026, 4:24:51 PM

> **Preparing evidence**
>
> I’m ready to document this AI run in the established transcript and register, then stage only those files. I’ll verify the diff, commit with the project’s convention, push the branch, and open a PR.
>
> **Prepared evidence**
>
> 
>
> Worked for 10s

Perfect - the **exact final tree passes** the repository gate, strict MkDocs build, YAML parse, whitespace checks, and `site/` remains untracked. The only remaining #10 blocker is the actual Gitea runner.

Now we should do the **AI evidence before staging/committing**.

First, show me the current register format and most recent transcript naming so I don’t guess a CSV column order:

```powershell
Write-Host "`n--- AI REGISTER HEADER + LAST ENTRIES ---"
Get-Content evidence/ai/registers/shayna-unterslak.csv |
    Select-Object -First 2

Get-Content evidence/ai/registers/shayna-unterslak.csv |
    Select-Object -Last 5

Write-Host "`n--- RECENT AI TRANSCRIPTS ---"
Get-ChildItem evidence/ai/transcripts/shayna-unterslak -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 8 Name
```

Paste that output.

Then I’ll give you:

1. the exact `2026-08-28-issue-10-...md` transcript;
2. the exact CSV line matching your existing schema;
3. commands to stage **everything**, including the 17 generated-site deletions;
4. a final staged-diff review;
5. the commit with the correct `Assisted-by: ChatGPT-Web[GPT-5.6 Sol]` trailer;
6. push + PR text.

And yes: **don’t rerun the tests again now**. They’ve passed on the final tree.

## Prompt:
8/28/2026, 4:26:00 PM

k wait

1. did we fix the npm install issue?
2. does our ci make snese? is it doing unnecessary work? like should we have a backend and frontend oen and only the changed one is truiggered or something?

## Response:
8/28/2026, 4:26:12 PM

> **Assessing CI changes**
>
> Yes—the install issue is fixed in the working tree: regenerating the lockfile made clean installs pass. I’m not calling it complete until the lockfile is committed and hosted CI confirms it.
> 
> **Splitting pipeline responsibilities**
> 
> The current all-in-one quality job is heavier than necessary. I’d split it into fast checks, backend, frontend, docs, and optional E2E jobs, using path-based conditions where reliable.
>
> **Assessed CI changes**
>
> 
>
> **Weighing pipeline design**
>
> I’m reconsidering the split: parallel jobs duplicate installs and may overload a single self-hosted runner. The current sequential job is simpler and efficient, though coverage reruns tests and could move to main-branch or scheduled validation.
>
> **Weighed pipeline design**
>
> 
>
> Worked for 27s

1. **Yes - the `npm ci` problem is fixed in your working tree.** The cause was a stale/incomplete `package-lock.json`; after regenerating the lockfile, a clean `npm ci` succeeded. The only caveat is that we **haven’t committed the fix yet**, so it is fixed locally/on this branch, not on `main` yet. The hosted runner also still needs to prove the same install succeeds there. 

2. **Your CI makes sense, but it is deliberately more comprehensive than strictly necessary.** I would **not split it into backend/frontend workflows yet**, before we have even had one successful real runner execution.

Right now the workflow is basically:

```text
PR
 │
 ├─ npm ci
 ├─ full repository check
 │    ├─ format
 │    ├─ lint
 │    ├─ typecheck
 │    ├─ unit tests
 │    ├─ frontend tests
 │    ├─ API tests
 │    ├─ contracts tests
 │    ├─ OpenAPI
 │    └─ production builds
 │
 ├─ strict docs build
 ├─ PostgreSQL integration tests
 ├─ Playwright desktop/mobile/accessibility
 └─ coverage
```

For your project, that's a **sensible first green CI baseline**. The frontend, backend and contracts are coupled in a monorepo, so a backend-looking change can break shared contracts or frontend assumptions, and vice versa. Running everything gives you confidence that a PR hasn't broken another part of the system.

There **is some unnecessary work**, though. The biggest examples are that coverage reruns tests you've already executed, Playwright runs even for a docs-only change, database integration runs even for a frontend-only CSS change, and the frontend suite runs for a truly backend-only implementation change.

So your instinct is right: a more mature pipeline could look like this:

```text
                           PR
                            │
                   ┌────────▼────────┐
                   │ Shared checks   │
                   │ format/lint/etc │
                   └────────┬────────┘
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
 backend/contracts      frontend/contracts      docs
 changed?               changed?                changed?
        │                   │                    │
        ▼                   ▼                    ▼
 Backend tests         Frontend tests       MkDocs strict
 DB integration        Frontend build
        │                   │
        └──────────┬────────┘
                   │
          Full-stack affected?
                   │
                   ▼
               Playwright
```

But I **wouldn't implement that as part of #10 right now**.

Why? Because path-aware CI introduces new complexity precisely while we're trying to establish whether the Gitea runner works at all. We'd have to correctly handle things like `packages/contracts/**`, `package-lock.json`, root configs and scripts triggering both sides. More importantly, skipped required checks can behave awkwardly depending on the CI platform. We haven't yet verified how your Wits Gitea runner behaves.

There is also an efficiency trade-off: if we split this into several independent jobs, each job may need its **own checkout + Node setup + `npm ci`**. With one university self-hosted runner, that can actually make CI *slower*, not faster.

### What I recommend

**For #10:** keep the current single comprehensive workflow. Its purpose is basically:

> “Can a clean checkout of our repository install reproducibly and prove the whole system is healthy?”

That's exactly the question #10 needs to answer.

Once the runner comes online:

1. Run this pipeline.
2. Get it green.
3. Record how long each step takes.
4. Only then decide whether optimization is worthwhile.

If, for example, we discover:

```text
npm ci                 25 sec
npm run check           1 min
MkDocs                  3 sec
Playwright install      2 min
DB tests                20 sec
E2E                     50 sec
coverage                15 sec
```

then the obvious target would be **Playwright installation/path-triggering**, not arbitrarily splitting backend and frontend.

I would actually make CI optimization a **separate small issue after #10**, something like:

> **Optimise CI execution using change-aware jobs without weakening required quality gates**

That keeps #10 very defensible: **restore reproducible install → establish green comprehensive CI → then optimize measured bottlenecks.**

One thing I *would* question in the current pipeline is **coverage on every PR**, because it reruns a substantial amount of testing without currently enforcing a coverage threshold. That may ultimately be better on pushes to `main`, nightly, or as a separate job. But I'd wait until we see actual runner timings before changing it.

## Prompt:
8/28/2026, 4:28:46 PM

ok, make a comment for me or something on that so i remeber later once it working, and then give me line for csv, what to call this transcript, commits, prs, ect

## Response:
8/28/2026, 4:28:47 PM

> **Used personal_context tool**
>
> 
>
> Worked for 23s

Yes. First, add a **small comment to #10** so future-you remembers not to over-engineer CI before we have runner timings:

```markdown
## Follow-up after CI is green

Once the Gitea Actions runner is available and this workflow has completed successfully, review CI execution time before optimising it.

Possible follow-up improvements:

- investigate change-aware backend/frontend/docs jobs;
- avoid database integration tests for clearly frontend-only changes where safe;
- avoid Playwright installation/E2E for documentation-only changes;
- review whether coverage needs to run on every PR, since it currently reruns tests without enforcing a repository-wide threshold;
- preserve shared-contract and root-config changes as triggers for all affected areas.

Do not split the workflow purely for structure. First capture actual runner timings and optimise measured bottlenecks without weakening required quality gates.

Refs #10
```

I would **not make this a separate issue yet**. Once CI is actually green and you have timings, then create the optimisation issue if it is worth doing.

### AI transcript

Call this transcript:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-28-issue-10-pre-runner-ci-readiness.md
```

That matches your existing date-first convention.

For the transcript content, save/export **this Issue #10 conversation/session** into that file. Since this has been a long continuation of #10, include the part covering the readiness sweep, lockfile diagnosis, generated `site/` cleanup, CI review, test verification, and MkDocs integration.

### CSV line

Your register columns are:

```text
Date,Team member,Tool,Model,Purpose,Brief task,Output used,Verification or adaptation,Related evidence
```

Append this row:

```csv
"2026-08-28","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","CI/CD review; debugging; documentation","Revalidated Issue #10 before Gitea Actions runner availability; diagnosed and repaired reproducible npm installation, reviewed and refined the CI workflow, removed generated MkDocs output from Git tracking, added strict documentation validation, and prepared readiness evidence.","AI-assisted CI configuration, troubleshooting commands, architecture documentation updates, validation evidence, and review guidance were used and adapted.","All changes were reviewed locally. Clean npm ci succeeded; npm run check passed; 52 database integration tests passed; 38 Playwright tests passed; coverage completed with 194 tests passing; python -m mkdocs build --strict passed; CI YAML parsed successfully; git diff --check passed; generated site output remained ignored and untracked. Hosted CI remains blocked pending runner availability.","evidence/ai/transcripts/shayna-unterslak/2026-08-28-issue-10-pre-runner-ci-readiness.md; evidence/validation/issue-10-pre-ci-readiness.md; Issue #10; Issue #259"
```

You already had an older #10 AI entry from when you first worked on this issue. **Keep it.** This new row records today's substantial follow-up session rather than replacing the old one.

### Commits

I would use **three clean commits**. That gives the marker a very understandable history.

First, stage the actual repository/CI repair:

```powershell
git add `
  .gitea/workflows/ci.yml `
  package-lock.json `
  docs/README.md `
  docs/javascripts/external-links.js `
  docs/stylesheets/extra.css `
  mkdocs.yml `
  site
```

`site` is already staged for deletion, so that is fine.

Check:

```powershell
git diff --cached --stat
git diff --cached --check
```

Then:

```powershell
git commit `
  -m "ci: restore reproducible pre-runner readiness" `
  -m "Repair the lockfile, remove generated MkDocs output from tracking, restore formatting compliance, and align CI verification with the deployment runtime." `
  -m "Refs #10" `
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Second, documentation/evidence:

```powershell
git add `
  docs/architecture/system-architecture.md `
  evidence/validation/issue-10-pre-ci-readiness.md

git diff --cached --check
```

Then:

```powershell
git commit `
  -m "docs(ci): record issue 10 readiness verification" `
  -m "Document the current CI controls, local verification results, and remaining Gitea runner blocker." `
  -m "Refs #10" `
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Third, after you have saved the transcript and appended the CSV row:

```powershell
git add `
  evidence/ai/transcripts/shayna-unterslak/2026-08-28-issue-10-pre-runner-ci-readiness.md `
  evidence/ai/registers/shayna-unterslak.csv

git diff --cached --check
```

Then:

```powershell
git commit `
  -m "docs(ai): record issue 10 readiness assistance" `
  -m "Refs #10"
```

I wouldn't add an `Assisted-by` trailer to that last commit because it is **recording the AI evidence itself**, rather than introducing AI-generated implementation.

### Push

Your branch is already:

```text
ci/10-pre-runner-readiness
```

So:

```powershell
git status
git log -3 --oneline

git push -u origin ci/10-pre-runner-readiness
```

### PR

Use:

**Title**

```text
ci: restore reproducible pre-runner readiness
```

**Body**

```markdown
## Summary

Revalidates and prepares Issue #10 before the Gitea Actions runner becomes available.

This PR:

- repairs the root lockfile so a clean `npm ci` succeeds;
- removes generated MkDocs `/site/` output that had been reintroduced into Git tracking;
- restores repository formatting compliance;
- aligns CI with the Node.js 22 runtime already used by the backend and frontend deployment workflows;
- adds strict MkDocs validation to CI using the existing `requirements-docs.txt`;
- moves the main repository quality gate earlier so inexpensive failures stop before Python and Playwright setup;
- updates the architecture documentation to describe the configured CI pipeline; and
- records local pre-runner readiness evidence.

## Verification

Local verification completed successfully:

- `npm ci` - PASS
- `npm run check` - PASS
  - 90 backend unit tests
  - 102 frontend tests
  - 104 API/auth tests
  - 73 contract tests
  - 4 deployment helper tests
- `npm run test:database:local` - 52 tests PASS
- `npm run test:e2e` - 38 tests PASS
- `npm run test:coverage` - 194 tests PASS during coverage execution
- `python -m mkdocs build --strict` - PASS
- CI workflow YAML parse - PASS
- `git diff --check` - PASS
- tracked `/site/` files - 0

Repository hygiene observations discovered during the sweep were recorded on #259 and deliberately not remediated here.

## Remaining blocker

A hosted CI result cannot yet be produced because the Gitea Actions runner is still unavailable.

Once the runner is available we still need to:

- confirm the available runner label matches `ubuntu-latest`;
- execute the workflow on the hosted runner;
- resolve any runner-specific issues;
- capture the successful CI result; and
- only then enable required status checks on `main`.

Therefore this PR improves #10 readiness but **does not close #10 yet**.

Refs #10
```

Once the PR is open, leave **#10 blocked**, not done. When the runner comes online, this branch/PR becomes the perfect test case: run it, capture the real CI evidence, make any runner-specific adjustment, and only then close #10.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)