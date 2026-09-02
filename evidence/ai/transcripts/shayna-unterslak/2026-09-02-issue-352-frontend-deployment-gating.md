# Continue Issue 10 CI Troubleshooting

**User:** Anonymous  
**Created:** 9/2/2026 10:31:43  
**Updated:** 9/2/2026 14:56:09  
**Exported:** 9/2/2026 14:56:34  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a97debf-34f8-83ea-a2a3-4d7eb8c24433](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a97debf-34f8-83ea-a2a3-4d7eb8c24433)  

## Response:
9/2/2026, 2:27:07 PM

> **Inspecting Deployment Workflow and Failing Test**
>
>
> **Diagnosing deployment failure**
>
> I’m distinguishing the successful merge from the failed frontend deployment. The merge appears complete; the deployment is failing during a flaky asynchronous navigation test, likely triggered broadly by a root package metadata change.
>
> **Diagnosed deployment failure**
>
> 
>
> **Inspecting Submission Test Failure and Merge Status**
>
>
> **Stabilizing the test**
>
> I’m treating this as a deployment-time test flake, not a merge failure. The likely fix is extending the asynchronous heading assertion timeout, then rerunning deployment before opening a separate issue.
>
> **Stabilized the test**
>
> 
>
> **Inspected deployment workflow, test failures, merge status, and authentication redirect**
>
> 
>
> Worked for 1m 9s

Yes - **it definitely merged**. The first screenshot shows merge commit `b822821157` on `main`. The red ❌ is the **post-merge frontend deployment**, not the merge itself.

What happened is:

```text
PR CI ✅
PR approved ✅
MERGED TO MAIN ✅
        ↓
Deploy Frontend starts
        ↓
Verify frontend workspace ❌
        ↓
Build/deploy/smoke-check never ran
```

The failure is now only **1 flaky frontend test out of 115**:

```text
SubmissionPage.test.tsx
directs an anonymous user to sign in without loading application data
```

114 tests passed. The test timed out waiting for the `"Login or Sign up"` heading while the DOM already showed the application had reached the signed-out state/navigation. `Pasted markdown.md`

So this is **not the React `NODE_ENV` problem again**. That fix worked - all the other React tests passed.

### Do this first

Click:

**Re-run all jobs**

on that failed frontend deployment.

I expect there is a decent chance it simply passes this time, because:

- it passed locally;
- it passed in the PR CI;
- 114/115 passed here;
- this exact test is asynchronous navigation and is using Testing Library's relatively short default wait.

If the rerun goes green → **you are done for now**. The current frontend will deploy.

### But we should fix the flake properly

Even if rerun passes, I would create a small bug because we don't want Azure deployment randomly failing because a route transition took slightly longer on a shared runner.

**Title:**
```text
Stabilise anonymous submission redirect test on hosted runners
```

**Labels:** `type: bug`, `area: frontend`, `area: infrastructure`, `severity: low`

The likely fix is tiny. Currently:

```tsx
await screen.findByRole('heading', {
  level: 1,
  name: 'Login or Sign up',
});
```

I'd make this specific async navigation assertion tolerate the hosted runner:

```tsx
await screen.findByRole(
  'heading',
  { level: 1, name: 'Login or Sign up' },
  { timeout: 5000 },
);
```

We are **not weakening what the test proves**. It must still navigate and render the sign-in page; we're just not requiring the shared Wits runner to complete that React Router transition within ~1 second.

### One more thing this exposed

Your frontend deployment is doing:

```text
npm ci
contracts checks
frontend lint
frontend typecheck
ALL 115 frontend unit tests
build
deploy
smoke check
```

after PR CI has **already validated the code before merge**.

That means one flaky unit test can stop CD even though the PR quality gate passed.

Longer-term, I would change the deployment philosophy to:

```text
PR:
full/change-aware verification
        ↓
merge

Deployment:
install → build production artifact → deploy → smoke check
```

rather than **re-running the unit test suite during deployment**. That's both faster and less flaky.

But don't change that right now. **Hit Re-run all jobs first.**

And yes: if your **Sport Analytics CI on `main` is green**, #348 and #259 can still be closed. This failed workflow is the separate `Deploy Frontend` workflow, after the merge.

## Prompt:
9/2/2026, 2:29:42 PM

should i make it a bug? also, should our ci//cd not check if its gonna make deploy fail or soemthing?

## Response:
9/2/2026, 2:29:50 PM

> **Classifying the failure**
>
> I’m treating this as a CI/CD bug, not an application defect: a flaky post-merge test is blocking deployment after earlier checks passed. I’ll explain the distinction and suggest preventing duplicate, inconsistent validation.
>
> **Classified the failure**
>
> 
>
> Worked for 11s

Yes - I would make this a **bug**, but the bug is not “frontend deployment is broken.” The bug is:

> **the deployment workflow can fail because it re-runs a flaky frontend unit test after the exact change already passed CI.**

That is incorrect CI/CD behaviour because it creates a false deployment failure. Your merge was valid; the post-merge deploy got blocked by 1 flaky test out of 115. `Pasted markdown.md`

And yes: your CI/CD should be structured so that it catches deploy-breaking problems **before merge as far as possible**. It cannot prove Azure itself will deploy until it actually talks to Azure, but it can prove almost everything else.

The better flow is:

```text
PR
 ↓
change-aware CI
 - lint
 - typecheck
 - unit/API tests
 - production build
 - relevant E2E
 - hygiene
 ↓
required quality ✅
 ↓
merge
 ↓
main CI validates the merge commit ✅
 ↓
DEPLOYMENT
 - package/build deployable artifact
 - deploy to Azure
 - smoke check deployed site
```

What I **would not** do is this:

```text
PR CI runs 115 frontend tests ✅
       ↓
merge
       ↓
deployment runs same 115 tests AGAIN ❌
       ↓
Azure never even attempted
```

That is exactly what happened.

So I would create a bug now.

**Title**

```text
Prevent duplicate flaky frontend tests from blocking post-merge deployment
```

**Labels**
- `type: bug`
- `area: infrastructure`
- `area: frontend`
- `severity: medium`

I’d use **Medium**, not Low, because this actually blocks production deployment after a valid merge.

Use your bug template like this:

```md
## Summary

The post-merge Azure frontend deployment workflow re-runs the complete frontend
unit-test suite during `Verify frontend workspace`.

A merge that successfully passed the required Pull Request CI quality gate was
subsequently prevented from deploying because one frontend unit test failed
flakily on the hosted runner.

The Azure build, deployment and smoke-check stages were never reached.

## Motivation and Impact

The deployment workflow currently duplicates validation that has already been
performed by the required CI quality gate.

This creates a false deployment-failure path where an already validated merge
can fail to deploy because a repeated unit test is flaky or slower on the shared
hosted runner.

It also increases hosted-runner execution time unnecessarily.

CI should establish whether the commit is suitable for deployment. The
deployment workflow should then focus on producing the deployment artifact,
deploying it and verifying the deployed application.

## Environment

- **Application or service:** Frontend / Azure App Service deployment
- **Environment:** Wits-hosted Gitea Actions runner
- **Browser or client:** Gitea Actions
- **Version or commit:** merge commit `b822821157`

## Steps to Reproduce

1. Merge PR #349 after the required `Sport Analytics CI / quality` check passes.
2. Allow the `Deploy Frontend` workflow to run on `main`.
3. Observe the `Verify frontend workspace` step.
4. The workflow re-runs the full frontend unit-test suite.
5. One asynchronous submission-page test fails while the remaining 114 tests pass.
6. Build, deployment and deployed smoke-check steps are skipped.

## Expected Behaviour

The required CI quality process should validate frontend tests and production
build correctness before merge.

After a validated commit reaches `main`, the deployment workflow should perform
only the validation necessary for deployment, then build/package, deploy and
smoke-check the resulting application.

A duplicated flaky unit test should not prevent an otherwise valid merge from
reaching the Azure deployment stage.

## Actual Behaviour

The post-merge deployment workflow runs the full frontend unit-test suite again.

One test failed:

`SubmissionPage.test.tsx > directs an anonymous user to sign in without loading application data`

114 of 115 frontend tests passed.

The failure occurred while waiting for the `Login or Sign up` heading and
prevented the production bundle, Azure deployment and smoke-check steps from
running.

## Severity

- [ ] Critical
- [ ] High
- [x] Medium
- [ ] Low

## Affected Area

- [ ] API
- [ ] Backend
- [ ] Data
- [ ] Database
- [ ] Documentation
- [x] Frontend
- [x] Infrastructure
- [ ] Other

## Acceptance Criteria

- [ ] The deployment workflow no longer unnecessarily duplicates the full frontend unit-test suite already enforced by CI.
- [ ] Pull Request CI continues to run the required frontend tests for relevant changes.
- [ ] Relevant frontend changes are validated with a production build before merge.
- [ ] A successful `main` quality result is required before normal frontend deployment.
- [ ] The frontend deployment workflow builds or consumes the validated deployable artifact.
- [ ] Azure deployment executes after successful validation.
- [ ] The deployed frontend smoke check remains mandatory.
- [ ] The currently flaky anonymous-submission redirect test is stabilised if it can still fail within the authoritative CI suite.
- [ ] Existing tests continue to pass.
- [ ] CI/CD documentation is updated to describe the separation between validation and deployment.
- [ ] No unrelated behaviour is changed.

## Dependencies

- #348 - change-aware hosted CI
- #17 - frontend Azure deployment foundation
- PR #349

## Evidence

Attach:

- the successful PR CI result for #349;
- the failed post-merge frontend deployment run;
- the `Verify frontend workspace` output showing 114/115 tests passed;
- successful deployment verification after the fix.

## Resolution

_To be completed when a fix has been implemented._

## Verification

_To be completed before the bug is closed._

## AI Declaration

> The preceding issue was planned and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

There is one architectural improvement I’d make when fixing this bug: **main CI should be the gate for deployment**. Ideally:

```text
push main
   ↓
quality
   ↓ only if green
deploy frontend/backend affected by this commit
```

Then deployment doesn't need to rediscover whether the code is good. CI has already answered that question.

The deployment workflow should still check things that are **deployment-specific** - secrets exist, deployable bundle builds, Azure accepts it, public URL responds - because PR CI cannot guarantee those.

So: **yes, bug it; and yes, your instinct is correct that CI should catch code/build failures before deployment, while CD should concentrate on actually deploying and verifying the live result.**

## Prompt:
9/2/2026, 2:35:26 PM

u were right, it passed mnoew, k, letys do the big now

# [Bug] Prevent duplicate flaky frontend tests from blocking post-merge deployment #352

## Response:
9/2/2026, 2:35:27 PM

> **Inspecting Repository And Prior Patches**
>
>
> **Inspected repository, prior patches, status, and CI workflows**
>
> 
>
> **Searching the web**
>
> [Frequently Asked Questions | Gitea Documentation](https://docs.gitea.com/usage/actions/faq/)
>
> **Evaluating deployment triggers**
>
> I’m considering a deployment workflow that runs after the main CI workflow succeeds, filters for pushes to `main`, checks the completed commit, and detects frontend changes before deploying to avoid duplicate testing.
>
> **Evaluated deployment triggers**
>
> 
>
> **Searching the web**
>
> [Webhooks | Gitea Documentation](https://docs.gitea.com/usage/repository/webhooks)
>
> **Refining workflow logic**
>
> I’m narrowing the change to frontend deployment: trigger after successful pushes to `main`, preserve manual runs, and add a path check so unrelated commits don’t deploy. I’m also reviewing documentation and tests for consistency.
>
> **Choosing workflow architecture**
>
> I’m comparing a separate post-CI workflow with integrating frontend deployment into the existing CI pipeline. Keeping deployment in the same workflow gives direct dependency on successful validation and preserves accurate path filtering.
>
> **Refined workflow logic**
>
> 
>
> **Searching the web**
>
> [Get a workflow | Gitea Documentation](https://docs.gitea.com/api/1.24/operations/actions-get-workflow/)
>
> **Balancing workflow complexity**
>
> I’m weighing a reusable deployment workflow against a post-CI trigger. The simplest stable option appears to be a separate workflow that follows successful CI, then performs lightweight path detection before allocating deployment work.
>
> **Assessing path detection**
>
> I’m checking whether the completed CI run exposes enough commit information for reliable frontend path filtering. If not, I’ll favor a simpler, robust workflow design over a more intricate optimization.
>
> **Selecting a safe fix**
>
> I’m using the current repository state as the baseline and avoiding a deployment that can race ahead of CI. The fix should preserve manual recovery, prevent duplicate checks, and ensure only validated frontend changes are released.
>
> **Assessed path detection and selected a safe workflow fix**
>
> 
>
> **Searched 1 website**
>
> 
>
> **Inspecting Frontend Build Configuration**
>
>
> **Updated frontend deployment CI, documentation, tests, formatting, and recovery controls**
>
> 
>
> Worked for 9m 13s

Yep - I’ve done #352 as the **proper architectural fix**, not just “increase the flaky test timeout.”

The bug really was that the post-merge deployment re-ran all 115 frontend tests even though CI had already validated them; one transient redirect test failed 114/115 and stopped deployment before the bundle was even built. `Pasted markdown.md`

[Download the #352 patch](sandbox:/mnt/data/issue-352-frontend-deployment-gating.patch)

### New flow

```text
PR
 ↓
change-aware CI
 ↓
quality ✅ REQUIRED
 ↓
merge
 ↓
main change-aware CI
 ↓
quality ✅
 ↓
ONLY if deployed frontend actually changed
 ↓
build with Azure/Vite secrets
 ↓
Azure deploy
 ↓
live smoke check
```

So **automatic frontend deployment is now actually part of the CI/CD chain**, rather than being an independent workflow racing alongside main CI.

The patch does all of this:

- adds a new `deployFrontend` planner output separate from `frontend`;
- frontend **implementation** changes deploy;
- shared-contract changes deploy;
- relevant package/root changes deploy;
- frontend **test-only** changes do **not** deploy;
- docs/evidence changes do not deploy;
- CI-only changes do not deploy;
- automatic frontend deployment waits for `quality`;
- the deployment stage **does not rerun `npm run test:frontend`**;
- it still does `npm ci`, secret validation, contracts build, production frontend build, Azure deploy and smoke check;
- `.gitea/workflows/deploy-frontend.yml` becomes **manual recovery only**;
- the flaky anonymous redirect test still gets a 5-second async allowance, so it remains meaningful in authoritative CI;
- adds regression tests preventing someone from accidentally putting duplicate frontend tests back into CD;
- updates your CI/CD, Azure frontend, deployment overview and recovery methodology docs;
- adds `evidence/validation/issue-352-frontend-deployment-gating.md`.

I verified the patch itself against the #348 state: **patch apply check passes**, both workflow YAML files parse, CI routing is **12/12**, and deployment regression/smoke tests are **7/7**.

### Apply it

Since #349 is merged:

```powershell
git switch main
git pull
git switch -c fix/352-frontend-deployment-gating
```

Put the patch in the repo root, then:

```powershell
git apply --check .\issue-352-frontend-deployment-gating.patch
```

No output = good.

Then:

```powershell
git apply .\issue-352-frontend-deployment-gating.patch
```

Delete the patch afterward:

```powershell
Remove-Item .\issue-352-frontend-deployment-gating.patch
```

Then run:

```powershell
npm.cmd run format
npm.cmd run test:ci-routing
npm.cmd run test:deployment
npm.cmd run test:frontend
npm.cmd run check
python -m mkdocs build --strict
git diff --check
```

We want everything green.

One particularly important difference: **this PR modifies CI, but `deployFrontend` should remain false for CI-only changes**. So when #352 itself eventually merges, it should **not unnecessarily redeploy the frontend just because `ci.yml` changed**. That distinction is now regression-tested too.

Don’t commit yet after applying - send me the test results. Then I’ll give you the AI evidence row + exact commit + PR for #352.

## Prompt:
9/2/2026, 2:45:25 PM

b4 i pattch that, a deploy docs workflow has been added, shukd i give that to u or is this sage

## Response:
9/2/2026, 2:45:31 PM

Yes — **give me the new docs deployment workflow before you apply #352**.

The patch will probably still apply mechanically if the docs workflow is just a new file, but I don’t want to risk us designing the frontend CD gate in a way that clashes with the new docs CD flow.

Best option: give me the **latest repo zip again** now that docs deployment has been added. Then I can rebase #352 against the actual current state and make sure the three deployment paths are consistent:

```text
main quality ✅
   ├─ frontend changed → Azure frontend deploy
   ├─ backend changed  → Azure backend deploy
   └─ docs changed     → Cloudflare docs deploy
```

I specifically want to check:

```text
.gitea/workflows/ci.yml
.gitea/workflows/deploy-frontend.yml
.gitea/workflows/deploy-backend.yml
.gitea/workflows/deploy-docs.yml   ← new one
scripts/ci-change-plan.mjs
docs/development/ci-cd.md
docs/deployment/**
```

So **don’t apply the #352 patch yet**. Send the latest zip (or at minimum the new docs workflow + current `ci.yml`) and I’ll regenerate #352 safely on top of it.

## Prompt:
9/2/2026, 2:47:49 PM

[Attachment: Pasted markdown(20260902-124745).md]

## Response:
9/2/2026, 2:47:50 PM

> **Reviewing deployment changes**
>
> I’m assessing the pasted workflow before regenerating the patch. The deployment still appears to mix authentication, artifact handling, and hosting assumptions, so I’m checking the repository state and updating #352 against the newer documentation changes.
>
> **Reviewed deployment changes**
>
> 
>
> **Resolving workflow overlap**
>
> I’m comparing the frontend deployment fix with the newly added documentation workflow. The safest update is keeping documentation deployment separate while removing conflicting overview edits, then regenerating the patch against the latest repository state.
>
> **Resolved workflow overlap**
>
> 
>
> **Creating a Docs-Compatible Frontend Gating Patch**
>
>
> **Inspected CI/CD patches, created frontend gating patch, and checked ZIP archive contents**
>
> 
>
> Worked for 1m 50s

Good you sent it. **Don’t use the previous #352 patch** - PR #351 changes `docs/deployment/overview.md`, which the old patch also edited, so you’d risk a conflict and muddled deployment docs.

The new docs workflow itself looks sound: it is path-scoped to docs-related changes, builds MkDocs strictly, deploys to Cloudflare, and smoke-checks the live site. `Pasted markdown.md`

I’ve made a **docs-compatible #352 patch** that leaves the new docs workflow and its deployment documentation alone:

[Download revised #352 patch](sandbox:/mnt/data/issue-352-frontend-deployment-gating-docs-compatible.patch)

Use **this one instead**.

### One architectural note

After #352, your deployment picture will be:

```text
Frontend
PR CI → merge → main quality ✅ → Azure frontend deploy
                              ↑ gated

Docs
PR CI → merge → separate path-filtered docs workflow → Cloudflare
                              ↑ currently independent

Backend
separate Azure workflow / #346 work
```

So #352 fixes the specific frontend bug properly without hijacking Liora’s #29 work.

The docs workflow **does still run independently of the `main` quality job**. That is not the same flaky-test bug because it does not re-run 115 frontend tests; its strict MkDocs build is also what actually creates the `site/` artifact it deploys. But if we later want a perfectly uniform architecture, we can make docs deployment quality-gated too in a separate small issue rather than scope-creeping #352.

### Before applying

Make sure Liora’s #351 is actually merged into the `main` you pull:

```powershell
git switch main
git pull
git log --oneline -5
```

Then:

```powershell
git switch -c fix/352-frontend-deployment-gating
```

Put the **new revised patch** in the repo root and run:

```powershell
git apply --check .\issue-352-frontend-deployment-gating-docs-compatible.patch
```

If that prints nothing:

```powershell
git apply .\issue-352-frontend-deployment-gating-docs-compatible.patch
```

Then remove it:

```powershell
Remove-Item .\issue-352-frontend-deployment-gating-docs-compatible.patch
```

And run the same verification:

```powershell
npm.cmd run format
npm.cmd run test:ci-routing
npm.cmd run test:deployment
npm.cmd run test:frontend
npm.cmd run check
python -m mkdocs build --strict
git diff --check
```

So yes: **very good call giving me #351 first. Use the revised patch, not the old one.**

## Prompt:
9/2/2026, 2:54:54 PM

[Attachment: Pasted text(20260902-125436).txt]

## Response:
9/2/2026, 2:54:56 PM

Yep - **this is clean. #352 is locally verified and ready to commit.** `Pasted text.txt`

Everything important passed:

- CI routing: **12/12**
- deployment regression tests: **7/7**
- frontend: **115/115**
- full `npm run check`: ✅
- backend unit: **104/104**
- API: **114/114**
- contracts: **75/75**
- production frontend build: ✅
- strict MkDocs build: ✅
- `git diff --check`: no output = ✅

The MkDocs 2.0 message and Vite chunk-size message are warnings only; they do **not** block #352.

Before committing, add/update your AI register row for this issue:

```csv
"2026-09-02","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","CI/CD architecture; code and workflow assistance; testing; documentation","Issue #352: prevent duplicate flaky frontend tests from blocking post-merge deployment","Redesigned frontend CD so automatic deployment is gated by successful main CI quality rather than re-running the full frontend unit-test suite; added production-impact routing, preserved manual recovery deployment, stabilised the anonymous submission redirect assertion, added deployment regression tests, and updated CI/CD and Azure frontend methodology documentation","Reviewed and applied generated changes; ran CI-routing tests, deployment regression tests, frontend tests, full repository checks and strict MkDocs build locally; all passed before push","evidence/validation/issue-352-frontend-deployment-gating.md; Issue #352; forthcoming PR"
```

Then check exactly what changed:

```powershell
git status --short
```

Do **not** stage `site/` if MkDocs generated it, and do not stage any patch file.

Then stage the #352 implementation:

```powershell
git add .gitea/workflows/ci.yml
git add .gitea/workflows/deploy-frontend.yml
git add scripts/ci-change-plan.mjs
git add tests/ci/change-plan.test.mjs
git add tests/deployment/frontend-workflow.test.mjs
git add apps/frontend/src/features/submissions/SubmissionPage.test.tsx
git add docs/development/ci-cd.md
git add docs/deployment/azure-fronted.md
git add evidence/validation/issue-352-frontend-deployment-gating.md
git add evidence/ai/registers/shayna-unterslak.csv
```

If `git status --short` shows another modified #352 documentation file, send me the status before committing rather than guessing.

Then commit:

```powershell
git commit -m "fix(ci): gate frontend deployment on validated main CI" `
  -m "Remove duplicate frontend unit testing from post-merge deployment, add production-impact routing, and retain deployment smoke verification." `
  -m "Fixes #352" `
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Then:

```powershell
git push -u origin fix/352-frontend-deployment-gating
```

After that I’ll give you the PR.

## Prompt:
9/2/2026, 2:55:41 PM

giv e me
pr
what i should call this transcript

## Response:
9/2/2026, 2:55:49 PM

### PR title

```text
fix(ci): gate frontend deployment on validated main CI
```

### PR description

```md
## Summary

Fix the post-merge frontend deployment flow so that Azure deployment is gated by
successful `main` CI validation instead of re-running the complete frontend unit-test
suite during deployment.

This prevents an already validated merge from being blocked by a duplicated flaky
frontend test while preserving deployment-specific build and smoke verification.

## Changes

- gate automatic frontend deployment behind successful `main` CI quality;
- add explicit production-impact detection for frontend deployment;
- deploy automatically only when production frontend behaviour is affected;
- do not deploy for:
  - frontend test-only changes;
  - documentation-only changes;
  - evidence-only changes;
  - CI-only changes;
- remove the duplicate full frontend unit-test suite from post-merge deployment;
- retain:
  - reproducible dependency installation;
  - shared-contract preparation;
  - production frontend build;
  - Azure deployment;
  - deployed-site smoke verification;
- retain the standalone frontend deployment workflow for manual recovery;
- stabilise the anonymous submission redirect test without weakening its assertion;
- add regression tests covering CI-to-deployment gating;
- update CI/CD and Azure deployment methodology documentation;
- record validation evidence for #352.

## CI/CD Flow

The frontend flow is now:

`Pull Request`
→ change-aware CI
→ required `Sport Analytics CI / quality`
→ merge to `main`
→ successful main quality validation
→ deploy only when production frontend code is affected
→ Azure deployment
→ live smoke check

Frontend unit tests remain authoritative in CI and are no longer unnecessarily
repeated inside the deployment stage.

## Verification

Local verification completed successfully:

- `npm run test:ci-routing` — 12/12 passed
- `npm run test:deployment` — 7/7 passed
- `npm run test:frontend` — 115/115 passed
- `npm run check` — passed
- `python -m mkdocs build --strict` — passed
- `git diff --check` — passed

## Regression Protection

Regression tests verify that:

- automatic frontend deployment waits for successful quality validation;
- only production-impacting frontend changes trigger deployment;
- CI-only changes do not trigger frontend deployment;
- the deployment workflow does not repeat the authoritative frontend unit-test suite;
- manual deployment remains available for recovery.

## Issue

Closes #352

## AI Declaration

The preceding implementation and documentation were developed and reviewed with
the assistance of ChatGPT-Web[GPT-5.6 Sol].

AI assistance included CI/CD architecture, workflow changes, regression-test
generation, hosted failure analysis and documentation support.

All generated changes were reviewed and verified locally before submission.
```

Branch:

```text
fix/352-frontend-deployment-gating
```

### Transcript filename

Call it:

```text
2026-09-02-issue-352-frontend-deployment-gating.md
```

and put it here:

```text
evidence/ai/transcripts/shayna-unterslak/2026-09-02-issue-352-frontend-deployment-gating.md
```

That matches the naming style you’ve been using and makes it immediately obvious which issue the transcript belongs to.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)