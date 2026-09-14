# Implement Or Document Bug

**User:** Anonymous  
**Created:** 9/14/2026 6:31:10  
**Updated:** 9/14/2026 7:09:20  
**Exported:** 9/14/2026 7:09:38  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6aa7788d-b0b4-83ea-b8d2-785c2f2872d0](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6aa7788d-b0b4-83ea-b8d2-785c2f2872d0)  

## Prompt:
9/14/2026, 6:31:35 AM

this bug... should it be implemented? or should we document why we not implement9ing it bstead an dif ppl change things, they must manually run it?

[Attachment: Pasted markdown(20260914-043116).md]

## Response:
9/14/2026, 6:31:40 AM

> **Evaluating the fix**
>
> I recommend implementing the bug fix, not merely documenting a manual process. Version skew can create unreconcilable batches, so automation should prevent it; retain manual runs as a recovery path and document that workflow.
>
> **Evaluated the fix**
>
> 
>
> Worked for 10s

I would **implement this bug**, not close it by saying “developers must manually redeploy the worker.”

The reason is that this is not merely an operational convenience. The bug has already produced a **functionally incompatible deployed system**: frontend/backend were updated while the stale worker continued creating results in an older format, ultimately leaving a batch impossible to reconcile through the application. `Pasted markdown.md` That makes it a genuine deployment correctness problem.

It also aligns strongly with your marking requirements. The general project brief explicitly requires **CI/CD processes for both collaboration and deployment**, and Sprint 2 assesses core-feature stability, automated testing, methodology, and bug-tracker use. `project_briefs.pdf` A manual instruction saying “remember to run this workflow whenever worker code changes” is precisely the sort of human-dependent deployment process CI/CD is supposed to remove.

What I would do is **implement the smallest correct version**, rather than over-engineering #524:

1. On successful `main`, determine whether worker-affecting files changed.
2. If yes, build the worker image using the **current commit SHA** as the tag.
3. Deploy that image to the Container App.
4. Wait/check that the new revision is healthy and that its image tag matches the SHA.
5. Keep the existing **manual worker deployment workflow** as an emergency/recovery option.
6. Ensure docs-only changes do **not** deploy the worker.

That is actually exactly the intended model already written into #524: automatic deployment normally, **manual deployment retained for recovery/operations**. `Pasted markdown.md`

So I would **not** replace #524 with documentation saying people must manually run it. You *should* document the manual procedure, but as the fallback:

> Automatic worker deployment occurs when worker-affecting changes reach `main`. The manual deployment workflow remains available for recovery or operational redeployment.

If you are worried this is going to become a massive CI job right before Sprint 2 closes, I also wouldn't try to make the change detector perfect. We can make a conservative list of worker-affecting paths so that it occasionally deploys unnecessarily rather than risk another stale worker.

**My vote: implement #524.** It fixes a demonstrated production bug and gives you quite good CI/CD/deployment evidence for marking at the same time.

## Prompt:
9/14/2026, 6:33:01 AM

buit before u told me not to add it to ci/cd? there is a workflpow for it on gitea etc.. itsw just not integrated to run on pushed? u told me not to b4?

## Response:
9/14/2026, 6:33:09 AM

> **Remembering**
>
>
> **Clarified CI/CD deployment guidance and connected Issue #524**
>
> 
>
> Worked for 14s

Yes - you remember correctly. I **did previously tell you not to make the worker deploy as part of the ordinary CI pipeline**, and there was a reason for that.

At that stage, you already had a separate **Gitea worker deployment workflow**. We deliberately treated it as a deployment/release action rather than something that should happen on every CI run, because the worker deployment involved Azure CLI/Bicep/ACR/Container Apps steps and had already been relatively slow and occasionally awkward on the runner. The plan was essentially: CI validates the code; the worker deployment workflow is run deliberately when needed. 

The important distinction now is:

**I still would NOT make the worker deploy on every push/PR/normal CI run.**

What #524 is proposing is narrower: when a change has been **merged successfully into `main`** and that change affects the worker, automatically invoke the **existing deployment workflow**. Your existing separation between CI and worker deployment can stay intact.

So conceptually:

```text
PR / branch push
    ↓
normal CI tests
    ↓
NO worker deployment

merge to main
    ↓
change detection
    ↓
worker affected?
   yes → trigger existing worker-deploy workflow
   no  → do nothing
```

That is different from putting Azure deployment directly into your general CI job.

And #524 exists because you've now got evidence that the previous manual approach has an actual weakness: someone merged several worker-affecting changes, frontend/backend advanced, but nobody reran the worker deployment. The deployed worker therefore stayed on `06815e9...` while `main` was at `63ef67e...`, which is what caused the version skew described in the bug. `Pasted markdown.md`

So I would slightly correct my previous answer:

**Don't rebuild your CI/CD architecture. Don't move the worker deployment into every CI execution. But do implement #524 by wiring the existing worker-deploy workflow to successful relevant merges to `main`. Keep its manual trigger too.**

That gives you both:

> **Automatic:** relevant `main` merge → existing worker deployment workflow  
> **Manual:** button/manual dispatch → same deployment workflow for recovery

So your earlier setup was sensible; **the bug isn't that you made the worker deployment separate. The bug is that nothing currently guarantees that separate workflow gets invoked when `main` changes in a way that requires it.** 

If we take #524, I would keep the implementation very small and modify the existing Gitea workflow/change-plan logic rather than create some huge new deployment system.

## Prompt:
9/14/2026, 6:34:19 AM

k, lets do it (if u 100 percent sure its the right call- we short on time and need to prioritise).. what files do u need from me?

## Response:
9/14/2026, 6:34:36 AM

Yes - **high confidence this is worth prioritising**, but I wouldn’t claim literal 100% until I see the current workflows. #524 is a demonstrated deployment bug, not hypothetical, and your project brief explicitly expects CI/CD for deployment. `Pasted markdown.md` `project_briefs.pdf` The key is to keep the fix **small**: wire your existing worker deployment into relevant successful `main` changes, not redesign deployment.

This looks **bounded**, so once I see the existing flow I’ll give you a short design before we touch anything.

Send me these first:

- **All files in `.gitea/workflows/`** - easiest if you just upload the whole folder. I especially need:
  - normal CI workflow
  - frontend/backend deployment workflow
  - existing **worker deployment workflow**
  - any change-detection/change-plan workflow
- Any **script used by CI to decide which components changed**. If you aren’t sure which one, send the relevant `scripts/` files or a screenshot/list of the `scripts` directory.
- The worker **Dockerfile / container build file**.
- Root `package.json` and the worker’s `package.json` if it has one.

**Don’t send Azure/Bicep/etc. yet** unless the worker deployment workflow calls files there. Once I read the workflow, I’ll tell you if I need one or two additional files.

If easiest, run this in PowerShell and paste the result first:

```powershell
Get-ChildItem .gitea\workflows -File | Select-Object Name
```

and:

```powershell
Get-ChildItem scripts -Recurse -File |
Where-Object { $_.Name -match 'change|deploy|ci|worker|plan' } |
Select-Object FullName
```

Then upload the matching files. **We should aim to alter the existing workflow, not create a whole new deployment system.**

## Prompt:
9/14/2026, 6:36:52 AM

tell me exact;y what to do.. follow project methodology

[Attachment: ci(4).yml]

[Attachment: deploy-backend(3).yml]

[Attachment: deploy-docs(3).yml]

[Attachment: deploy-frontend(3).yml]

[Attachment: deploy-worker.yml]

## Response:
9/14/2026, 6:36:56 AM

> **Planning CI changes**
>
> I’m identifying the smallest implementation: update the change plan, expose worker routing, add worker deployment and coverage checks, and preserve existing manual behavior. I’m verifying shared dependencies and infrastructure paths before editing.
>
> **Planned CI changes**
>
> 
>
> **Requesting missing files**
>
> I’m pausing before implementation because the design still needs confirmation and several files are missing. Please upload the change-plan script, CI tests, worker package metadata, and worker infrastructure configuration so I can map paths accurately.
>
> **Used personal_context tool**
>
> 
>
> Worked for 36s

Yes. Having now seen the workflows, I’m **more confident this should be done**. This is not a large new CI/CD feature; it is a **small wiring gap in an architecture you already have**.

Your main CI already has change-aware planning and a `worker` output, and it already automatically routes frontend, backend and docs deployments after a successful `main` push. It simply has **no equivalent worker deployment job**. `ci.yml` Meanwhile, your separate worker workflow already does almost everything #524 needs: tests/builds the worker, uses `${{ github.sha }}` as the immutable image tag, deploys the Container App, and waits for a healthy revision. `deploy-worker.yml`

So this is **bounded work**, not an architectural redesign.

### We follow your project methodology exactly

The intended implementation is:

```text
Issue #524
   ↓
issue branch
   ↓
tests FIRST for deployment routing
   ↓
make tests fail
   ↓
implement smallest change
   ↓
targeted verification
   ↓
full npm run check / diff checks
   ↓
documentation
   ↓
AI transcript + register
   ↓
commit with Assisted-by
   ↓
PR
   ↓
merge
   ↓
REAL main deployment evidence
   ↓
Azure verification + #522 regression
   ↓
close #524
```

And the **small design** I want us to use is:

```text
PRs / branches
    ↓
normal CI validation
    ↓
NO deployment

merge/push to main
    ↓
ci-change-plan.mjs
    ↓
worker-affecting change?
    ↓ yes
deploy_worker job
    ↓
build image :<exact github.sha>
    ↓
deploy existing Container App
    ↓
wait Healthy
    ↓
VERIFY active image == exact expected SHA
```

The existing manual `deploy-worker.yml` stays available for recovery. We are **not** making every CI run deploy Azure, and we are **not** deleting the manual workflow. This also matches #524's acceptance criteria. `Pasted markdown.md`

Before I give you a single edit, I need the files that control the change-plan, because **TDD means our first code change should be the tests**, not `ci.yml`.

Run this from the repo root:

```powershell
git status
git branch --show-current
git pull origin main

Get-ChildItem tests\ci -File | Select-Object FullName
```

Then upload me:

```text
scripts/ci-change-plan.mjs
ALL files under tests/ci/
apps/worker/package.json
apps/worker/Dockerfile
```

Also run:

```powershell
Get-ChildItem docs -Recurse -File |
Select-String -Pattern "worker deployment|deploy-worker|Container Apps|batch worker" |
Select-Object -ExpandProperty Path -Unique
```

Send me whichever documentation file(s) that finds. **Don't edit anything yet.**

Once I have those, we will do this in order: create `fix/524-auto-deploy-worker` → add the failing #524 routing tests → prove they fail → implement the minimum change → verify locally → docs/evidence → push PR. That preserves the issue-driven, test/evidence-first methodology you've been using. 

**Design approval gate:** if the flow above is exactly what you want, say **yes** and upload those files. Then I'll take you command-by-command from the branch creation onwards.

## Prompt:
9/14/2026, 6:39:09 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> Get-ChildItem docs -Recurse -File |
>> Select-String -Pattern "worker deployment|deploy-worker|Container Apps|batch worker" |
>> Select-Object -ExpandProperty Path -Unique
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\environment.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\adr\0003-azure-hosting.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\architecture\batch-ingestion-pipeline.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\architecture\overview.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\architecture\system-architecture.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\deployment\azure-backend.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\deployment\azure-worker.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\deployment\azure.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\deployment\overview.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\development\technology-stack.md
C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\docs\testing\intermediate-ingestion-acceptance.md
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

[Attachment: ci-change-plan(3).mjs]

[Attachment: Dockerfile]

[Attachment: package(1).json]

[Attachment: browser-strategy.test(1).mjs]

[Attachment: change-plan.test(3).mjs]

[Attachment: intermediate-ingestion-acceptance.test.mjs]

[Attachment: local-ci.test.mjs]

## Response:
9/14/2026, 6:39:13 AM

> **Designing worker deployment tests**
>
> I’m following the repository’s existing pattern rather than introducing reusable-workflow complexity. I’ll add tests covering worker code, shared contracts, dependencies, infrastructure, and documentation-only changes, then update the routing logic accordingly.
>
> **Designed worker deployment tests**
>
> 
>
> **Inspecting worker deployment-affecting paths**
>
>
> **Refining deployment scope**
>
> I’m narrowing automatic worker deployment to worker code, dependencies, contracts, Docker configuration, and worker infrastructure. I’m leaving workflow-definition edits non-triggering, matching the project’s existing deployment philosophy and avoiding unnecessary redeployments.
>
> **Refined deployment scope**
>
> 
>
> **Inspected worker deployment-affecting paths**
>
> 
>
> Worked for 1m 1s

Yes. I’ve now checked the actual files, and the gap is very clear:

- `ci-change-plan.mjs` already knows when `worker: true`, but there is **no `deployWorker` deployment decision**. `ci-change-plan.mjs`
- `ci.yml` already automatically deploys frontend/backend/docs after a qualifying `main` push, but there is **no `deploy_worker` job**. `ci.yml`
- `deploy-worker.yml` already contains the real Azure worker deployment machinery, but it is **manual `workflow_dispatch` only**. `deploy-worker.yml`
- The worker explicitly depends on both `@sport-analytics/contracts` and `@sport-analytics/batch-processing`, so those shared-package changes genuinely can require a new worker image. `package.json`

So we are fixing the correct thing, and we’ll follow your methodology: **issue → branch → RED test → GREEN implementation → regression tests → docs → evidence → AI register/transcript → PR → merge → live Azure evidence.**

### Step 1 - create the issue branch

**Do not edit anything yet.** Run:

```powershell
git status --short
git branch --show-current
```

If `git status --short` is completely blank, then run:

```powershell
git switch main
git pull --ff-only origin main
git switch -c fix/524-auto-deploy-worker
```

Then:

```powershell
git branch --show-current
git status --short
```

It should say:

```text
fix/524-auto-deploy-worker
```

and status should be blank.

### Step 2 - TDD RED: add only the first failing test

We are **not touching `ci-change-plan.mjs` or `ci.yml` yet**.

Open:

```text
tests/ci/change-plan.test.mjs
```

At the bottom, add exactly:

```javascript
test('worker runtime changes request automatic worker deployment', () => {
  const plan = classifyChangedFiles(['apps/worker/src/index.ts']);

  assert.equal(plan.worker, true);
  assert.equal(plan.deployWorker, true);
});
```

This captures the first acceptance criterion: a real worker change must select deployment.

Now run **only this test file**:

```powershell
node --test tests/ci/change-plan.test.mjs
```

It **must fail**. We expect something broadly like:

```text
Expected values to be strictly equal:

+ actual - expected

+ undefined
- true
```

That is the correct RED failure because `deployWorker` does not exist yet.

Then run:

```powershell
git diff --check
git diff -- tests/ci/change-plan.test.mjs
```

### Stop there

Send me the output of:

```powershell
node --test tests/ci/change-plan.test.mjs
git diff -- tests/ci/change-plan.test.mjs
```

**Do not fix the failing test yet.** Once I see the correct RED state, I'll give you the exact minimal GREEN change.

After that we'll add the remaining acceptance tests one-by-one for:

```text
apps/worker/**                 → deploy worker
packages/batch-processing/**   → deploy worker
packages/contracts/**          → deploy worker
package.json / package-lock    → deploy worker
infra/azure/worker/**          → deploy worker
docs-only                      → DO NOT deploy worker
```

Then we'll wire `deploy_worker` into the existing `main` deployment flow and add the **exact active-image SHA check** that the current manual worker workflow is actually missing. So we won't merely make it automatic; we'll satisfy #524's verification requirement properly. `Pasted markdown.md`

For documentation, **don't upload all 11 files**. Later I only want `docs/deployment/azure-worker.md` and `docs/deployment/overview.md`.

## Prompt:
9/14/2026, 6:41:36 AM

Switched to a new branch 'fix/524-auto-deploy-worker'
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> node --test tests/ci/change-plan.test.mjs
✔ AI register CSV changes use the lightweight evidence path (1.2654ms)
✔ documentation changes request strict docs validation without application suites (0.1618ms)
✔ OpenAPI documentation also requests OpenAPI linting (0.1251ms)
✔ frontend implementation changes run frontend and browser validation without PostgreSQL (0.2139ms)
✔ frontend unit-test-only changes do not force Playwright (0.1947ms)
✔ browser-suite changes request browser validation without production deployment (0.1158ms)
✔ unrelated backend source changes conservatively include database integration without browser work (0.1077ms)
✔ worker changes select the Intermediate ingestion merge gate plus deployment validation (0.1105ms)
✔ shared contracts validate both applications and browser integration (0.1171ms)
✔ root dependency changes select full CI (0.2152ms)
✔ CI workflow changes select full validation without redeploying unchanged application code (0.1355ms)
✔ full validation still preserves deployment impacts from other changed files (0.0929ms)
✔ backend test-only changes validate backend without redeploying production (0.187ms)
✔ published MkDocs changes validate and deploy documentation only (0.0988ms)
✔ non-published root documentation does not redeploy the MkDocs site (0.142ms)
✔ backend deployment helpers request backend deployment without unrelated targets (0.1061ms)
✔ unknown files fail safely to full CI (0.0586ms)
✔ main pushes preserve deployment routing without repeating coverage suites (0.0947ms)
✔ manual workflow dispatch always selects full CI (0.0812ms)
✔ local CI Docker infrastructure changes select full validation (0.0948ms)
✖ worker runtime changes request automatic worker deployment (0.9298ms)
ℹ tests 21
ℹ suites 0
ℹ pass 20
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 109.2611

✖ failing tests:

test at tests\ci\change-plan.test.mjs:217:1
✖ worker runtime changes request automatic worker deployment (0.9298ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + undefined
  - true
  
      at TestContext.<anonymous> (file:///C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/tests/ci/change-plan.test.mjs:221:10)
      at Test.runInAsyncScope (node:async_hooks:228:14)
      at Test.run (node:internal/test_runner/test:1118:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:787:18)
      at Test.postRun (node:internal/test_runner/test:1247:19)
      at Test.run (node:internal/test_runner/test:1175:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:787:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: true,
    operator: 'strictEqual',
    diff: 'simple'
  }
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git diff --check
>> git diff -- tests/ci/change-plan.test.mjs
diff --git a/tests/ci/change-plan.test.mjs b/tests/ci/change-plan.test.mjs
index de69c3d9..1a5f6358 100644
--- a/tests/ci/change-plan.test.mjs
+++ b/tests/ci/change-plan.test.mjs
@@ -213,3 +213,10 @@ test('local CI Docker infrastructure changes select full validation', () => {
   assert.equal(plan.e2e, true);
   assert.equal(plan.hygiene, true);
 });
+
+test('worker runtime changes request automatic worker deployment', () => {
+  const plan = classifyChangedFiles(['apps/worker/src/index.ts']);
+
+  assert.equal(plan.worker, true);
+  assert.equal(plan.deployWorker, true);
+});
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/14/2026, 6:41:47 AM

> **Clarifying deployment semantics**
>
> I’m distinguishing validation lanes from deployment impact: `worker: true` can be required for ingestion checks without implying a worker deployment. I’ll add a separate `deployWorker` signal, starting with the failing worker-scope case.
>
> **Clarified deployment semantics**
>
> 
>
> **Choosing deployment structure**
>
> I’m avoiding conflating validation with deployment. The CI workflow currently duplicates deployment jobs, so I’ll add a matching worker job while treating worker workflow changes as deployment-affecting.
>
> Worked for 16s

Perfect - this is the **correct RED state**. The test failed for exactly the reason we wanted: `deployWorker` does not exist yet. So TDD is clean.

Now do the **smallest GREEN change only**. Do **not** touch `ci.yml` yet.

Open:

```text
scripts/ci-change-plan.mjs
```

First, inside `emptyPlan()`, find:

```javascript
deployFrontend: false,
deployBackend: false,
deployDocs: false,
needsNpm: false,
```

Change it to:

```javascript
deployFrontend: false,
deployBackend: false,
deployWorker: false,
deployDocs: false,
needsNpm: false,
```

Then find the existing worker block:

```javascript
if (file.startsWith('apps/worker/')) {
  plan.worker = true;
  plan.database = true;
  plan.deployment = true;
  plan.hygiene = true;
  plan.needsNpm = true;
  return;
}
```

Change **only that block** to:

```javascript
if (file.startsWith('apps/worker/')) {
  plan.worker = true;
  plan.database = true;
  plan.deployment = true;
  plan.deployWorker = true;
  plan.hygiene = true;
  plan.needsNpm = true;
  return;
}
```

Do **not** set `deployWorker` automatically whenever `plan.worker === true`. That would be wrong because your Intermediate-ingestion gate deliberately sets `worker = true` for validation even when only backend/UI code changed. `ci-change-plan.mjs` Deployment impact and validation impact need to remain separate.

Now run:

```powershell
node --test tests/ci/change-plan.test.mjs
git diff --check
git diff -- scripts/ci-change-plan.mjs tests/ci/change-plan.test.mjs
```

We expect **21/21 passing**.

Then we immediately start the next RED cycle. **Don't add it until the first GREEN passes.**

Send me those outputs and I’ll give you the next failing test for `packages/batch-processing/**`. That one matters because the worker directly depends on that shared package. `package.json`

## Prompt:
9/14/2026, 6:44:52 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> node --test tests/ci/change-plan.test.mjs
>> git diff --check
>> git diff -- scripts/ci-change-plan.mjs tests/ci/change-plan.test.mjs
✔ AI register CSV changes use the lightweight evidence path (1.2601ms)
✔ documentation changes request strict docs validation without application suites (0.1755ms)
✔ OpenAPI documentation also requests OpenAPI linting (0.1571ms)
✔ frontend implementation changes run frontend and browser validation without PostgreSQL (0.3785ms)
✔ frontend unit-test-only changes do not force Playwright (0.2261ms)
✔ browser-suite changes request browser validation without production deployment (0.1243ms)
✔ unrelated backend source changes conservatively include database integration without browser work (0.1229ms)
✔ worker changes select the Intermediate ingestion merge gate plus deployment validation (0.1571ms)
✔ shared contracts validate both applications and browser integration (0.505ms)
✔ root dependency changes select full CI (0.3644ms)
✔ CI workflow changes select full validation without redeploying unchanged application code (0.2628ms)
✔ full validation still preserves deployment impacts from other changed files (0.1627ms)
✔ backend test-only changes validate backend without redeploying production (0.3323ms)
✔ published MkDocs changes validate and deploy documentation only (1.2434ms)
✔ non-published root documentation does not redeploy the MkDocs site (0.1597ms)
✔ backend deployment helpers request backend deployment without unrelated targets (0.1145ms)
✔ unknown files fail safely to full CI (0.0592ms)
✔ main pushes preserve deployment routing without repeating coverage suites (0.1169ms)
✔ manual workflow dispatch always selects full CI (0.132ms)
✔ local CI Docker infrastructure changes select full validation (0.1546ms)
✔ worker runtime changes request automatic worker deployment (0.1145ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1449.6364
diff --git a/scripts/ci-change-plan.mjs b/scripts/ci-change-plan.mjs
index b95e5627..723530e4 100644
--- a/scripts/ci-change-plan.mjs
+++ b/scripts/ci-change-plan.mjs
@@ -62,6 +62,7 @@ function emptyPlan() {
     coverage: false,
     deployFrontend: false,
     deployBackend: false,
+    deployWorker: false,
     deployDocs: false,
     needsNpm: false,
   };
@@ -289,6 +290,7 @@ function applyPath(plan, file) {
     plan.worker = true;
     plan.database = true;
     plan.deployment = true;
+    plan.deployWorker = true;
     plan.hygiene = true;
     plan.needsNpm = true;
     return;
diff --git a/tests/ci/change-plan.test.mjs b/tests/ci/change-plan.test.mjs
index de69c3d9..1a5f6358 100644
--- a/tests/ci/change-plan.test.mjs
+++ b/tests/ci/change-plan.test.mjs
@@ -213,3 +213,10 @@ test('local CI Docker infrastructure changes select full validation', () => {
   assert.equal(plan.e2e, true);
   assert.equal(plan.hygiene, true);
 });
+
+test('worker runtime changes request automatic worker deployment', () => {
+  const plan = classifyChangedFiles(['apps/worker/src/index.ts']);
+
+  assert.equal(plan.worker, true);
+  assert.equal(plan.deployWorker, true);
+});
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/14/2026, 6:45:05 AM

> **Continuing implementation**
>
> I’m adding the next failing test for batch-processing changes: they must trigger both worker and backend deployment. The current plan only marks backend, so this should expose the missing worker flag before I update implementation.
>
> **Continued implementation**
>
> 
>
> Worked for 10s

Great - first GREEN is clean: **21/21 passing**, and `git diff --check` is clean. We now move to the **second RED cycle**.

Your `packages/batch-processing/**` code is consumed directly by the worker, but its current change-plan block only requests `deployBackend`; it does **not** request a worker deployment. `ci-change-plan.mjs`

### Step 3 - RED for shared batch-processing

At the **bottom** of `tests/ci/change-plan.test.mjs`, add exactly:

```javascript
test('shared batch-processing changes request worker deployment', () => {
  const plan = classifyChangedFiles(['packages/batch-processing/src/index.ts']);

  assert.equal(plan.worker, true);
  assert.equal(plan.deployBackend, true);
  assert.equal(plan.deployWorker, true);
});
```

Then run:

```powershell
node --test tests/ci/change-plan.test.mjs
```

We expect the new test to fail with:

```text
actual: undefined/false
expected: true
```

specifically for `deployWorker`.

Then run:

```powershell
git diff --check
git diff -- tests/ci/change-plan.test.mjs
```

**Do not fix it yet.**

Send me the output of:

```powershell
node --test tests/ci/change-plan.test.mjs
```

Once we have the expected RED, I’ll give you the one-line GREEN change.

## Prompt:
9/14/2026, 6:45:59 AM

>> git diff -- tests/ci/change-plan.test.mjs
diff --git a/tests/ci/change-plan.test.mjs b/tests/ci/change-plan.test.mjs
index de69c3d9..5597b98a 100644
--- a/tests/ci/change-plan.test.mjs
+++ b/tests/ci/change-plan.test.mjs
@@ -213,3 +213,18 @@ test('local CI Docker infrastructure changes select full validation', () => {
   assert.equal(plan.e2e, true);
   assert.equal(plan.hygiene, true);
 });
+
+test('worker runtime changes request automatic worker deployment', () => {
+  const plan = classifyChangedFiles(['apps/worker/src/index.ts']);
+
+  assert.equal(plan.worker, true);
+  assert.equal(plan.deployWorker, true);
+});
+
+test('shared batch-processing changes request worker deployment', () => {
+  const plan = classifyChangedFiles(['packages/batch-processing/src/index.ts']);
+
+  assert.equal(plan.worker, true);
+  assert.equal(plan.deployBackend, true);
+  assert.equal(plan.deployWorker, true);
+});
\ No newline at end of file
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> node --test tests/ci/change-plan.test.mjs
✔ AI register CSV changes use the lightweight evidence path (1.3449ms)
✔ documentation changes request strict docs validation without application suites (0.2212ms)
✔ OpenAPI documentation also requests OpenAPI linting (0.1845ms)
✔ frontend implementation changes run frontend and browser validation without PostgreSQL (0.306ms)
✔ frontend unit-test-only changes do not force Playwright (0.2292ms)
✔ browser-suite changes request browser validation without production deployment (0.1486ms)
✔ unrelated backend source changes conservatively include database integration without browser work (0.1666ms)
✔ worker changes select the Intermediate ingestion merge gate plus deployment validation (0.1847ms)
✔ shared contracts validate both applications and browser integration (0.1723ms)
✔ root dependency changes select full CI (0.3179ms)
✔ CI workflow changes select full validation without redeploying unchanged application code (0.2007ms)
✔ full validation still preserves deployment impacts from other changed files (0.1802ms)
✔ backend test-only changes validate backend without redeploying production (0.2959ms)
✔ published MkDocs changes validate and deploy documentation only (1.0291ms)
✔ non-published root documentation does not redeploy the MkDocs site (0.0968ms)
✔ backend deployment helpers request backend deployment without unrelated targets (0.1316ms)
✔ unknown files fail safely to full CI (0.0568ms)
✔ main pushes preserve deployment routing without repeating coverage suites (0.1027ms)
✔ manual workflow dispatch always selects full CI (0.1474ms)
✔ local CI Docker infrastructure changes select full validation (0.1203ms)
✔ worker runtime changes request automatic worker deployment (0.0579ms)
✖ shared batch-processing changes request worker deployment (0.8607ms)
ℹ tests 22
ℹ suites 0
ℹ pass 21
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 116.6931

✖ failing tests:

test at tests\ci\change-plan.test.mjs:224:1
✖ shared batch-processing changes request worker deployment (0.8607ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  false !== true
  
      at TestContext.<anonymous> (file:///C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/tests/ci/change-plan.test.mjs:229:10)
      at Test.runInAsyncScope (node:async_hooks:228:14)
      at Test.run (node:internal/test_runner/test:1118:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:787:18)
      at Test.postRun (node:internal/test_runner/test:1247:19)
      at Test.run (node:internal/test_runner/test:1175:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:787:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: 'strictEqual',
    diff: 'simple'
  }
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 
(how many red cycles are there?)

## Response:
9/14/2026, 6:46:11 AM

> **Estimating remaining cycles**
>
> I’m counting roughly five to seven RED/GREEN cycles: routing coverage, dependency and lockfile paths, infrastructure changes, documentation exclusions, workflow wiring, and image verification. I can combine closely related assertions to save time.
>
> **Estimated remaining cycles**
>
> 
>
> Worked for 12s

You’re on **RED cycle 2** right now.

Given the issue scope and your time pressure, I would **not** make you do a dozen tiny RED/GREEN loops. We can stay faithful to TDD while grouping closely related behaviour. I’d do **6 cycles total**:

1. `apps/worker/**` → deploy worker ✅ done  
2. `packages/batch-processing/**` → deploy worker ← **you are here**
3. Other worker-affecting dependencies in one table-driven test: `packages/contracts/**`, `package.json`, `package-lock.json`, `infra/azure/worker/**`
4. Negative routing: docs-only/backend-only/frontend-only changes must **not** deploy worker
5. `ci.yml` wiring: `deployWorker` output exists and `deploy_worker` runs only on qualifying `main` pushes
6. Deployment verification: workflow must verify the **active image is exactly `${github.sha}`**, not merely “Healthy”

Then full regression + docs + evidence. So after this one, **4 more RED cycles**. That is enough to satisfy #524 without wasting time. `Pasted markdown.md`

For **this GREEN**, open `scripts/ci-change-plan.mjs` and find:

```javascript
if (file.startsWith('packages/batch-processing/')) {
  plan.backend = true;
  plan.worker = true;
  plan.database = true;
  plan.deployment = true;
  plan.deployBackend = true;
  plan.hygiene = true;
  plan.needsNpm = true;
  return;
}
```

Change it to:

```javascript
if (file.startsWith('packages/batch-processing/')) {
  plan.backend = true;
  plan.worker = true;
  plan.database = true;
  plan.deployment = true;
  plan.deployBackend = true;
  plan.deployWorker = true;
  plan.hygiene = true;
  plan.needsNpm = true;
  return;
}
```

Also your diff says:

```text
\ No newline at end of file
```

So in `tests/ci/change-plan.test.mjs`, just press **Enter once after the final `});`** and save.

Then run:

```powershell
node --test tests/ci/change-plan.test.mjs
git diff --check
```

We expect:

```text
tests 22
pass 22
fail 0
```

Once that’s green, send me the output. Then I’ll give you **cycle 3 as one compact table-driven test**, so we move much faster.

## Prompt:
9/14/2026, 6:47:26 AM

passed

## Response:
9/14/2026, 6:47:30 AM

Great — cycle 2 is GREEN. We’re at **cycle 3 of 6**.

Add this single table-driven test at the bottom of `tests/ci/change-plan.test.mjs`:

```javascript
test('worker-affecting shared and infrastructure changes request worker deployment', () => {
  const workerAffectingFiles = [
    'packages/contracts/src/api.ts',
    'package.json',
    'package-lock.json',
    'infra/azure/worker/main.bicep',
  ];

  for (const file of workerAffectingFiles) {
    const plan = classifyChangedFiles([file]);

    assert.equal(
      plan.deployWorker,
      true,
      `${file} must request worker deployment`,
    );
  }
});
```

Then run:

```powershell
node --test tests/ci/change-plan.test.mjs
```

This should **fail**, probably on the first unsupported case (`packages/contracts/src/api.ts`).

Then run:

```powershell
git diff --check
```

Do **not** change `ci-change-plan.mjs` yet.

Send me just the failing output, and I’ll give you the minimal GREEN changes for all four paths at once.

## Prompt:
9/14/2026, 6:48:05 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> node --test tests/ci/change-plan.test.mjs
✔ AI register CSV changes use the lightweight evidence path (1.1782ms)
✔ documentation changes request strict docs validation without application suites (0.1836ms)
✔ OpenAPI documentation also requests OpenAPI linting (0.1144ms)
✔ frontend implementation changes run frontend and browser validation without PostgreSQL (0.23ms)
✔ frontend unit-test-only changes do not force Playwright (0.1763ms)
✔ browser-suite changes request browser validation without production deployment (0.1078ms)
✔ unrelated backend source changes conservatively include database integration without browser work (0.1088ms)
✔ worker changes select the Intermediate ingestion merge gate plus deployment validation (0.1836ms)
✔ shared contracts validate both applications and browser integration (0.1218ms)
✔ root dependency changes select full CI (0.2253ms)
✔ CI workflow changes select full validation without redeploying unchanged application code (0.1702ms)
✔ full validation still preserves deployment impacts from other changed files (0.0953ms)
✔ backend test-only changes validate backend without redeploying production (0.2144ms)
✔ published MkDocs changes validate and deploy documentation only (0.2144ms)
✔ non-published root documentation does not redeploy the MkDocs site (0.1018ms)
✔ backend deployment helpers request backend deployment without unrelated targets (0.0903ms)
✔ unknown files fail safely to full CI (0.0583ms)
✔ main pushes preserve deployment routing without repeating coverage suites (0.1317ms)
✔ manual workflow dispatch always selects full CI (0.1927ms)
✔ local CI Docker infrastructure changes select full validation (0.1087ms)
✔ worker runtime changes request automatic worker deployment (0.0653ms)
✔ shared batch-processing changes request worker deployment (0.0661ms)
✖ worker-affecting shared and infrastructure changes request worker deployment (0.8147ms)
ℹ tests 23
ℹ suites 0
ℹ pass 22
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 115.0846

✖ failing tests:

test at tests\ci\change-plan.test.mjs:232:1
✖ worker-affecting shared and infrastructure changes request worker deployment (0.8147ms)
  AssertionError [ERR_ASSERTION]: packages/contracts/src/api.ts must request worker deployment
  
  false !== true
  
      at TestContext.<anonymous> (file:///C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/tests/ci/change-plan.test.mjs:243:12)
      at Test.runInAsyncScope (node:async_hooks:228:14)
      at Test.run (node:internal/test_runner/test:1118:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:787:18)
      at Test.postRun (node:internal/test_runner/test:1247:19)
      at Test.run (node:internal/test_runner/test:1175:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:787:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: 'strictEqual',
    diff: 'simple'
  }
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git diff --check
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/14/2026, 6:48:14 AM

> **Evaluating CI changes**
>
> I’m checking how dependency, worker, and infrastructure changes map to deployment flags. Root manifests should trigger worker deployment, while unrelated configuration should not; worker-specific infrastructure needs its own explicit handling.
>
> Worked for 7s

Perfect - cycle 3 is correctly RED. The failure is exactly where expected: `packages/contracts/**` does not yet request worker deployment.

Now make the **minimal GREEN changes for all four cases in this test**.

In `scripts/ci-change-plan.mjs`:

### 1. Shared contracts

Find the `packages/contracts/` block and add:

```javascript
plan.deployWorker = true;
```

So it becomes:

```javascript
if (file.startsWith('packages/contracts/')) {
  plan.contracts = true;
  plan.deployFrontend = true;
  plan.deployBackend = true;
  plan.deployWorker = true;
  plan.frontend = true;
  plan.backend = true;
  plan.e2e = true;
  if (!intermediateIngestion) plan.e2eFull = true;
  plan.hygiene = true;
  plan.openapi = true;
  plan.needsNpm = true;
  return;
}
```

That is correct because the worker package directly depends on `@sport-analytics/contracts`. `package.json`

### 2. Root `package.json` / `package-lock.json`

Find:

```javascript
if (FULL_ROOT_FILES.has(file)) {
  markFull(plan);
  if (file === 'package.json' || file === 'package-lock.json') {
    plan.deployFrontend = true;
    plan.deployBackend = true;
    plan.deployDocs = true;
  } else if (file === 'tsconfig.base.json') {
```

Change just that inner section to:

```javascript
if (FULL_ROOT_FILES.has(file)) {
  markFull(plan);
  if (file === 'package.json' || file === 'package-lock.json') {
    plan.deployFrontend = true;
    plan.deployBackend = true;
    plan.deployWorker = true;
    plan.deployDocs = true;
  } else if (file === 'tsconfig.base.json') {
```

Do **not** put `deployWorker = true` inside `markFull()`. Things like ESLint/config changes should validate the worker, but they should not redeploy production.

### 3. Worker infrastructure

Before the generic block:

```javascript
if (file.startsWith('infra/') || file.startsWith('database/')) {
```

insert:

```javascript
if (file.startsWith('infra/azure/worker/')) {
  plan.worker = true;
  plan.database = true;
  plan.deployment = true;
  plan.deployWorker = true;
  plan.hygiene = true;
  plan.needsNpm = true;
  return;
}
```

So worker Bicep/config gets treated specifically rather than falling into generic infrastructure.

### 4. Run the test

Now:

```powershell
node --test tests/ci/change-plan.test.mjs
git diff --check
```

We expect:

```text
tests 23
pass 23
fail 0
```

If it passes, **cycle 3 is done**.

Then don’t change anything else yet. Tell me `23/23 passed`, and we’ll do **cycle 4**, which is the important safety test proving docs/backend/frontend-only changes **do not accidentally deploy the worker**.

## Prompt:
9/14/2026, 6:50:36 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> node --test tests/ci/change-plan.test.mjs
>> git diff --check
✔ AI register CSV changes use the lightweight evidence path (1.2558ms)
✔ documentation changes request strict docs validation without application suites (0.3007ms)
✔ OpenAPI documentation also requests OpenAPI linting (0.161ms)
✔ frontend implementation changes run frontend and browser validation without PostgreSQL (0.2329ms)
✔ frontend unit-test-only changes do not force Playwright (0.1767ms)
✔ browser-suite changes request browser validation without production deployment (0.1091ms)
✔ unrelated backend source changes conservatively include database integration without browser work (0.1238ms)
✔ worker changes select the Intermediate ingestion merge gate plus deployment validation (0.1182ms)
✔ shared contracts validate both applications and browser integration (0.1133ms)
✔ root dependency changes select full CI (0.2623ms)
✔ CI workflow changes select full validation without redeploying unchanged application code (0.1857ms)
✔ full validation still preserves deployment impacts from other changed files (0.1938ms)
✔ backend test-only changes validate backend without redeploying production (1.2308ms)
✔ published MkDocs changes validate and deploy documentation only (0.1663ms)
✔ non-published root documentation does not redeploy the MkDocs site (0.1583ms)
✔ backend deployment helpers request backend deployment without unrelated targets (0.1276ms)
✔ unknown files fail safely to full CI (0.1023ms)
✔ main pushes preserve deployment routing without repeating coverage suites (0.1633ms)
✔ manual workflow dispatch always selects full CI (0.1507ms)
✔ local CI Docker infrastructure changes select full validation (0.1066ms)
✔ worker runtime changes request automatic worker deployment (0.1454ms)
✔ shared batch-processing changes request worker deployment (0.0944ms)
✔ worker-affecting shared and infrastructure changes request worker deployment (0.1291ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 114.3483
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/14/2026, 6:50:49 AM

> **Refining the test plan**
>
> I’m preserving the existing negative behavior: worker deployment stays disabled for empty, docs-only, and frontend-only plans. Because this already passes, I’m treating it as a regression lock rather than forcing a failing test.
>
> **Refined the test plan**
>
> 
>
> Worked for 11s

Great - **23/23 GREEN**. Change-plan routing for worker-affecting files is now correct.

One correction to our earlier “6 RED cycles”: the negative safety behaviour already exists, so we **shouldn’t pretend it is a RED cycle**. We’ll lock it with a regression test, then immediately add the next genuinely missing behaviour and watch that fail.

### Step 4A - lock the existing safety behaviour

At the bottom of `tests/ci/change-plan.test.mjs`, add:

```javascript
test('unrelated application and documentation changes do not request worker deployment', () => {
  const unrelatedFiles = [
    'docs/deployment/overview.md',
    'apps/frontend/src/App.tsx',
    'apps/backend/src/modules/weather/weather.service.ts',
  ];

  for (const file of unrelatedFiles) {
    const plan = classifyChangedFiles([file]);

    assert.equal(
      plan.deployWorker,
      false,
      `${file} must not request worker deployment`,
    );
  }
});
```

Run:

```powershell
node --test tests/ci/change-plan.test.mjs
```

This one **should pass immediately**. That is fine: we are preserving an already-correct safety property, not implementing new behaviour.

You should now get:

```text
tests 24
pass 24
fail 0
```

---

### Step 4B - actual RED: CI must expose and use `deployWorker`

Now edit the imports at the top of the same file.

Currently you have:

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyChangedFiles } from '../../scripts/ci-change-plan.mjs';
```

Change to:

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { classifyChangedFiles } from '../../scripts/ci-change-plan.mjs';
```

Then add this test at the bottom:

```javascript
test('main CI exposes worker deployment routing and owns an automatic worker deployment job', () => {
  const workflow = readFileSync('.gitea/workflows/ci.yml', 'utf8');

  assert.match(
    workflow,
    /deployWorker:\s+\$\{\{\s*steps\.plan\.outputs\.deployWorker\s*\}\}/,
  );

  assert.match(workflow, /\n  deploy_worker:\n/);

  assert.match(
    workflow,
    /needs\.plan\.outputs\.deployWorker == 'true'/,
  );

  assert.match(
    workflow,
    /github\.event_name == 'push'/,
  );

  assert.match(
    workflow,
    /github\.ref == 'refs\/heads\/main'/,
  );
});
```

Now run:

```powershell
node --test tests/ci/change-plan.test.mjs
```

This **must fail** because `ci.yml` currently exports frontend/backend/docs deployment decisions but not `deployWorker`, and it has no `deploy_worker` job. `ci.yml`

Then:

```powershell
git diff --check
```

### Stop there

Send me the failing output from:

```powershell
node --test tests/ci/change-plan.test.mjs
```

Then I’ll give you the exact GREEN edit to `ci.yml`.

We are now at the important wiring point - and still **not** duplicating the Azure deployment code unnecessarily. After this, the last major behaviour is verifying that Azure is not merely “Healthy”, but is healthy on the **exact `${{ github.sha }}` image**, which #524 explicitly requires. `Pasted markdown.md`

## Prompt:
9/14/2026, 6:52:26 AM

[Attachment: Pasted text(20260914-045222).txt]

## Response:
9/14/2026, 6:52:32 AM

> **Reviewing deployment changes**
>
> I’m weighing whether automated main deployments should rerun worker tests after validation before merge. I’m also checking worker-affecting paths, including shared packages, infrastructure, lockfiles, and build configuration, while noting a possible missing base TypeScript configuration dependency.
>
> **Reviewed deployment changes**
>
> 
>
> Worked for 38s

Perfect - this is the **correct RED** for the CI wiring. The failure is exactly because `ci.yml` does not yet expose `deployWorker` or own a `deploy_worker` job. `ci-change-plan.mjs`

Now do the GREEN implementation. We’ll reuse the already-working worker deployment steps rather than invent anything new.

### 1. Expose `deployWorker` from the plan job

Open:

```text
.gitea/workflows/ci.yml
```

Find:

```yaml
      deployFrontend: ${{ steps.plan.outputs.deployFrontend }}
      deployBackend: ${{ steps.plan.outputs.deployBackend }}
      deployDocs: ${{ steps.plan.outputs.deployDocs }}
```

Change to:

```yaml
      deployFrontend: ${{ steps.plan.outputs.deployFrontend }}
      deployBackend: ${{ steps.plan.outputs.deployBackend }}
      deployWorker: ${{ steps.plan.outputs.deployWorker }}
      deployDocs: ${{ steps.plan.outputs.deployDocs }}
```

### 2. Add the automatic worker deployment job

Your separate `deploy-worker.yml` already contains a working deployment job. `deploy-worker.yml`

In `ci.yml`, insert a new job **after `deploy_backend` and before `deploy_docs`**.

The easiest/safest way:

Copy everything under:

```yaml
jobs:
  deploy:
```

from `.gitea/workflows/deploy-worker.yml`.

Paste it into `ci.yml`, but replace its job header:

```yaml
  deploy:
    runs-on: ubuntu-24.04
    timeout-minutes: 45
```

with:

```yaml
  deploy_worker:
    needs:
      - plan
      - quality
    if: >-
      github.event_name == 'push' &&
      github.ref == 'refs/heads/main' &&
      needs.plan.outputs.deployWorker == 'true'
    runs-on: ubuntu-24.04
    timeout-minutes: 45
```

Then leave **all the existing worker deployment steps underneath unchanged for now**:

```text
Check out repository
Set up Node.js
Install dependencies
Verify worker
Validate deployment secrets
Install Azure CLI
Sign in to Azure
Provision worker infrastructure
Verify Docker npm registry connectivity
Build immutable worker image...
Deploy worker revision
Verify active revision and health
```

Do **not modify `.gitea/workflows/deploy-worker.yml` yet**. We want to preserve the working manual recovery workflow.

So structurally `ci.yml` should now end up like:

```yaml
  deploy_backend:
    ...
    ...

  deploy_worker:
    needs:
      - plan
      - quality
    if: >-
      github.event_name == 'push' &&
      github.ref == 'refs/heads/main' &&
      needs.plan.outputs.deployWorker == 'true'
    runs-on: ubuntu-24.04
    timeout-minutes: 45

    steps:
      # copied worker deployment steps

  deploy_docs:
    ...
```

### 3. Test GREEN

Run:

```powershell
node --test tests/ci/change-plan.test.mjs
git diff --check
```

We expect:

```text
tests 25
pass 25
fail 0
```

Then also run all CI-policy tests because we have now changed the actual workflow:

```powershell
node --test tests/ci/*.test.mjs
```

### 4. Show me the relevant diff

Run:

```powershell
git diff -- .gitea/workflows/ci.yml scripts/ci-change-plan.mjs tests/ci/change-plan.test.mjs
```

Send me the output of the tests plus that diff.

**Don’t commit yet.** After this passes, we have one important functional RED left: right now the worker workflow proves only that an active revision is `Healthy`; it does **not prove that the healthy revision is actually `${{ github.sha }}`**. #524 explicitly requires that exact-image verification. `Pasted markdown.md`

After that we’ll cover the one routing edge we spotted (`deploy-worker.yml` itself is worker deployment configuration), docs, full checks, AI evidence, commit and PR.

## Prompt:
9/14/2026, 6:56:47 AM

[Attachment: Pasted text(20260914-045642).txt]

## Response:
9/14/2026, 6:56:50 AM

> **Reviewing deployment changes**
>
> I’m checking the pasted diff for accidental line breaks, workflow placement, and consistency between automatic and manual worker deployments. The passing tests help, but I’m also verifying exact image handling and deployment configuration before concluding.
>
> **Reviewed deployment changes**
>
> 
>
> **Planning deployment checks**
>
> I’m confirming the full CI suite before adding the next failing test. Then I’m checking that both deployment paths validate the exact image digest and that the worker workflow routes changes correctly.
>
> **Planned deployment checks**
>
> 
>
> Worked for 30s

Good - the CI wiring is GREEN. Your pasted diff shows `deploy_worker` at the end rather than between backend/docs; **that is completely fine** because job order in the YAML file does not determine execution order. The `needs:` graph does. `Pasted text.txt`

Before the final behaviour, do one quick regression run because we changed the real workflow:

```powershell
node --test tests/ci/*.test.mjs
```

If that passes, we do the **last meaningful RED/GREEN cycle**. This one will also ensure that **this very PR triggers a worker deployment when merged**, giving us the live evidence #524 asks for.

### Final RED - worker deployment config + exact SHA verification

At the bottom of `tests/ci/change-plan.test.mjs`, add:

```javascript
test('worker deployment workflow changes request worker deployment', () => {
  const plan = classifyChangedFiles(['.gitea/workflows/deploy-worker.yml']);

  assert.equal(plan.deployWorker, true);
});

test('worker deployment workflows verify the active healthy image matches the validated commit', () => {
  const workflows = [
    '.gitea/workflows/ci.yml',
    '.gitea/workflows/deploy-worker.yml',
  ];

  for (const path of workflows) {
    const workflow = readFileSync(path, 'utf8');

    assert.match(
      workflow,
      /EXPECTED_IMAGE=.*sport-analytics-worker:\$\{\{ github\.sha \}\}/,
      `${path} must identify the exact commit-SHA worker image`,
    );

    assert.match(
      workflow,
      /properties\.template\.containers\[0\]\.image/,
      `${path} must inspect the deployed Container Apps image`,
    );

    assert.match(
      workflow,
      /MATCHING_REVISION/,
      `${path} must require a healthy active revision for the expected image`,
    );
  }
});
```

Run:

```powershell
node --test tests/ci/change-plan.test.mjs
git diff --check
```

It should fail. Most likely the **first failure** will be:

```text
worker deployment workflow changes request worker deployment
false !== true
```

That is expected.

Send me that failing output. Then I’ll give you the final GREEN changes to:

1. route `.gitea/workflows/deploy-worker.yml` as worker-affecting;
2. strengthen **both** automatic and manual workflows from “some revision is healthy” to “the `${{ github.sha }}` image is active **and** healthy.”

That is important because the current workflow only checks health; a stale worker could theoretically still satisfy that test - exactly the class of problem #524 exists to prevent. `Pasted markdown.md`

After that: **docs → full verification → transcript/register → commit → PR → merge → watch the automatic worker deployment → Azure evidence → close #524.**

## Prompt:
9/14/2026, 6:58:42 AM

[Attachment: Pasted text(20260914-045838).txt]

## Response:
9/14/2026, 6:58:45 AM

> **Planning workflow fixes**
>
> I’m identifying the two required changes: point the plan workflow at the correct deployment workflow, then verify the active healthy revision is running the exact commit-tagged image.
>
> **Planned workflow fixes**
>
> 
>
> Worked for 14s

Exactly right - **both final RED tests are failing for the intended reasons**: the worker deployment workflow itself is not classified as worker-affecting, and both deployment paths currently check only “Healthy”, not “Healthy + exact `${{ github.sha }}` image.” `Pasted text.txt`

Now make the final GREEN changes.

### 1. Make changes to `deploy-worker.yml` trigger worker deployment

Open:

```text
scripts/ci-change-plan.mjs
```

Find:

```javascript
if (file === '.gitea/workflows/ci.yml') {
  markFull(plan);
  return;
}

if (file.startsWith('.gitea/workflows/')) {
  markFull(plan);
  return;
}
```

Change it to:

```javascript
if (file === '.gitea/workflows/ci.yml') {
  markFull(plan);
  return;
}

if (file === '.gitea/workflows/deploy-worker.yml') {
  markFull(plan);
  plan.deployWorker = true;
  return;
}

if (file.startsWith('.gitea/workflows/')) {
  markFull(plan);
  return;
}
```

This keeps ordinary workflow changes from deploying production unnecessarily, but correctly recognises the worker deployment workflow itself as worker-affecting.

---

### 2. Strengthen the automatic worker verification

In:

```text
.gitea/workflows/ci.yml
```

Find the entire existing step beginning:

```yaml
      - name: Verify active revision and health
```

through its final:

```yaml
          exit 1
```

Replace that whole step with:

```yaml
      - name: Verify active revision image and health
        env:
          RESOURCE_GROUP: ${{ secrets.AZURE_WORKER_RESOURCE_GROUP }}
        run: |
          EXPECTED_IMAGE="$ACR_SERVER/sport-analytics-worker:${{ github.sha }}"

          echo "Expected worker image: $EXPECTED_IMAGE"

          for attempt in {1..12}; do
            MATCHING_REVISION=$(az containerapp revision list \
              --name statsthegame-dev-batch-worker \
              --resource-group "$RESOURCE_GROUP" \
              --query "[?properties.active && properties.healthState=='Healthy' && properties.template.containers[0].image=='$EXPECTED_IMAGE'] | [0].name" \
              -o tsv)

            echo "Worker verification $attempt/12"

            az containerapp revision list \
              --name statsthegame-dev-batch-worker \
              --resource-group "$RESOURCE_GROUP" \
              --query "[?properties.active].{Revision:name,Health:properties.healthState,Image:properties.template.containers[0].image}" \
              -o table

            if [ -n "$MATCHING_REVISION" ]; then
              echo "Verified healthy active worker revision: $MATCHING_REVISION"
              echo "Verified worker image: $EXPECTED_IMAGE"
              exit 0
            fi

            sleep 10
          done

          echo "::error::Expected worker image $EXPECTED_IMAGE did not become active and healthy within 120 seconds."
          exit 1
```

The important difference is that a random old healthy revision can no longer make deployment pass.

---

### 3. Make the manual recovery workflow equally safe

Open:

```text
.gitea/workflows/deploy-worker.yml
```

Find its existing:

```yaml
      - name: Verify active revision and health
```

and replace that whole step with **the exact same block** above:

```yaml
      - name: Verify active revision image and health
        env:
          RESOURCE_GROUP: ${{ secrets.AZURE_WORKER_RESOURCE_GROUP }}
        run: |
          EXPECTED_IMAGE="$ACR_SERVER/sport-analytics-worker:${{ github.sha }}"

          echo "Expected worker image: $EXPECTED_IMAGE"

          for attempt in {1..12}; do
            MATCHING_REVISION=$(az containerapp revision list \
              --name statsthegame-dev-batch-worker \
              --resource-group "$RESOURCE_GROUP" \
              --query "[?properties.active && properties.healthState=='Healthy' && properties.template.containers[0].image=='$EXPECTED_IMAGE'] | [0].name" \
              -o tsv)

            echo "Worker verification $attempt/12"

            az containerapp revision list \
              --name statsthegame-dev-batch-worker \
              --resource-group "$RESOURCE_GROUP" \
              --query "[?properties.active].{Revision:name,Health:properties.healthState,Image:properties.template.containers[0].image}" \
              -o table

            if [ -n "$MATCHING_REVISION" ]; then
              echo "Verified healthy active worker revision: $MATCHING_REVISION"
              echo "Verified worker image: $EXPECTED_IMAGE"
              exit 0
            fi

            sleep 10
          done

          echo "::error::Expected worker image $EXPECTED_IMAGE did not become active and healthy within 120 seconds."
          exit 1
```

The existing workflow already writes `ACR_SERVER` into `$GITHUB_ENV`, so this step can use it. `deploy-worker.yml`

### 4. Run the final GREEN check

Now run:

```powershell
node --test tests/ci/change-plan.test.mjs
git diff --check
```

We want:

```text
tests 27
pass 27
fail 0
```

Then immediately:

```powershell
node --test tests/ci/*.test.mjs
```

If that passes, run:

```powershell
git diff --check
git status --short
```

Send me those outputs.

After that, **the actual implementation is essentially finished**. We will not add more RED/GREEN cycles. Next is project-methodology close-out: docs → full local verification → AI transcript/register → commit → PR. Then, after merge, we use the automatic deployment itself as #524's live acceptance evidence.

## Prompt:
9/14/2026, 7:01:46 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> node --test tests/ci/change-plan.test.mjs
>> git diff --check
✔ AI register CSV changes use the lightweight evidence path (1.2519ms)
✔ documentation changes request strict docs validation without application suites (0.1708ms)
✔ OpenAPI documentation also requests OpenAPI linting (0.1041ms)
✔ frontend implementation changes run frontend and browser validation without PostgreSQL (0.1803ms)
✔ frontend unit-test-only changes do not force Playwright (0.1551ms)
✔ browser-suite changes request browser validation without production deployment (0.0961ms)
✔ unrelated backend source changes conservatively include database integration without browser work (0.1313ms)
✔ worker changes select the Intermediate ingestion merge gate plus deployment validation (0.1114ms)
✔ shared contracts validate both applications and browser integration (0.1319ms)
✔ root dependency changes select full CI (0.2139ms)
✔ CI workflow changes select full validation without redeploying unchanged application code (0.1088ms)
✔ full validation still preserves deployment impacts from other changed files (1.0444ms)
✔ backend test-only changes validate backend without redeploying production (0.2643ms)
✔ published MkDocs changes validate and deploy documentation only (0.1261ms)
✔ non-published root documentation does not redeploy the MkDocs site (0.098ms)
✔ backend deployment helpers request backend deployment without unrelated targets (0.0858ms)
✔ unknown files fail safely to full CI (0.2629ms)
✔ main pushes preserve deployment routing without repeating coverage suites (0.1116ms)
✔ manual workflow dispatch always selects full CI (0.058ms)
✔ local CI Docker infrastructure changes select full validation (0.4228ms)
✔ worker runtime changes request automatic worker deployment (0.1235ms)
✔ shared batch-processing changes request worker deployment (0.0592ms)
✔ worker-affecting shared and infrastructure changes request worker deployment (0.0936ms)
✔ unrelated application and documentation changes do not request worker deployment (0.0663ms)
✔ main CI exposes worker deployment routing and owns an automatic worker deployment job (0.5953ms)
✔ worker deployment workflow changes request worker deployment (0.0757ms)
✔ worker deployment workflows verify the active healthy image matches the validated commit (0.585ms)
ℹ tests 27
ℹ suites 0
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 114.8096
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git diff --check
>> git status --short
 M .gitea/workflows/ci.yml
 M .gitea/workflows/deploy-worker.yml
 M scripts/ci-change-plan.mjs
 M tests/ci/change-plan.test.mjs
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/14/2026, 7:02:06 AM

> **Running next steps**
>
> Your focused change-plan tests are green: 27/27 passed, and the diff check is clean. I’m now running the full CI test suite with `node --test tests/ci/*.test.mjs`; afterward, please provide the two deployment docs for review.
>
> **Ran next steps**
>
> 
>
> Worked for 25s

Your **focused change-routing suite is green: 27/27**, and `git diff --check` is clean. `Pasted text.txt` We are not committing yet; next is the broader regression gate.

Run exactly:

```powershell
node --test tests/ci/*.test.mjs
```

If **anything fails**, stop and send me the output.

If everything passes, run:

```powershell
git diff --check
git status --short
```

Then upload these two files:

```text
docs/deployment/azure-worker.md
docs/deployment/overview.md
```

Don’t edit them yourself yet.

After I see them, we’ll do the remaining methodology in this order:

```text
1. Update deployment docs for #524
2. Run MkDocs strict build
3. Run the authoritative local CI/regression command
4. Review the complete diff against #524 acceptance criteria
5. Add AI transcript
6. Add AI-register CSV row
7. Commit with Assisted-by declaration
8. Push branch
9. Create PR referencing #524
10. Let hosted PR CI pass
11. Merge
12. Confirm main automatically launches deploy_worker
13. Capture Azure active revision + exact commit-SHA image evidence
14. Regression-check the #522 ingestion/review path
15. Add close-out evidence/comment and close #524
```

So **right now only run**:

```powershell
node --test tests/ci/*.test.mjs
```

and, if green:

```powershell
git diff --check
git status --short
```

Then send me the output + those two docs.

## Prompt:
9/14/2026, 7:03:14 AM

[Attachment: azure-worker.md]

[Attachment: overview(2).md]

## Response:
9/14/2026, 7:03:18 AM

> **Updating deployment documentation**
>
> I’m treating the uploaded documents as ready for review, but I’m not claiming CI passed without its output. I’m checking references to manual worker deployment and will replace them with automatic-on-main behavior while preserving manual recovery guidance.
>
> **Updated deployment documentation**
>
> 
>
> Worked for 19s

These are the right two docs. They currently still describe the worker as **manual-only**, so they need updating to match #524 before we do final verification. `Pasted text.txt` `overview.md`

Do these exact edits.

### 1. `docs/deployment/azure-worker.md`

Find the start of the **Deployment** section:

```markdown
## Deployment

The manual worker deployment workflow provisions the supporting Azure resources, builds an immutable commit-tagged worker image on the Gitea runner, pushes the image to Azure Container Registry, deploys the Container App revision and waits for the active revision to become healthy.
```

Replace it with:

```markdown
## Deployment

Worker deployment is automatic for worker-affecting changes merged to `main`. The change-aware `Sport Analytics CI` workflow selects the worker deployment path when the merged change affects the worker runtime, shared packages consumed by the worker, worker infrastructure or worker build dependencies.

The automatic deployment:

1. checks out the merged `main` commit;
2. verifies and builds the worker;
3. provisions the supporting Azure resources idempotently;
4. builds an immutable worker image tagged with the exact Git commit SHA;
5. pushes that image to Azure Container Registry;
6. deploys the corresponding Azure Container Apps revision; and
7. waits until an active healthy revision is using that exact commit-SHA image.

Documentation-only and unrelated frontend/backend changes do not select worker deployment.

The standalone `Sport Analytics - Provision and Deploy Batch Worker` workflow remains available through manual dispatch for recovery and deliberate operational redeployment. The manual path uses the same immutable commit-SHA image and active-revision verification requirements as the automatic path.
```

Leave the secrets list immediately underneath it unchanged.

---

### 2. `docs/deployment/overview.md`

Find:

```markdown
The versioned Bicep target
and manual deployment workflow are defined under `infra/azure/worker/` and
`.gitea/workflows/deploy-worker.yml`; repository definitions are not evidence that a live Azure
deployment has succeeded.
```

Replace with:

```markdown
The versioned Bicep target is defined under `infra/azure/worker/`. Worker-affecting changes merged to
`main` are deployed automatically by the change-aware `Sport Analytics CI` workflow, while
`.gitea/workflows/deploy-worker.yml` remains available for manual recovery or deliberate redeployment.
Repository definitions are not evidence that a live Azure deployment has succeeded; the deployed
revision and exact commit-SHA image must still be verified.
```

Then find this bullet:

```markdown
- Deploy the worker manually from a reviewed commit; verify its active revision, dependencies,
  recovery and scaling before recording it as operational.
```

Replace with:

```markdown
- Automatically deploy the worker after a validated worker-affecting change reaches `main`; require the
  active healthy Container Apps revision to use the exact commit-SHA image. Retain the manual worker
  workflow for recovery and deliberate operational redeployment.
```

Then find:

```markdown
The automatic validation and affected-target deployments run through `Sport Analytics CI`. The standalone `Sport Analytics - Deploy Frontend`, `Sport Analytics - Deploy Backend` and `Sport Analytics - Deploy Docs` workflows use the same runner only for manual recovery/redeployment.
```

Replace with:

```markdown
The automatic validation and affected-target deployments run through `Sport Analytics CI`. The standalone `Sport Analytics - Deploy Frontend`, `Sport Analytics - Deploy Backend`, `Sport Analytics - Deploy Docs` and `Sport Analytics - Provision and Deploy Batch Worker` workflows use the same runner for manual recovery/redeployment.
```

Finally find baseline item 6:

```markdown
6. affected frontend, backend and documentation deployment paths can execute after validated `main` quality
```

Change it to:

```markdown
6. affected frontend, backend, worker and documentation deployment paths can execute after validated `main` quality
```

### 3. Save, then verify docs

Run:

```powershell
git diff --check
python -m mkdocs build --strict
```

If MkDocs passes, run the complete CI policy tests again:

```powershell
node --test tests/ci/*.test.mjs
```

Then the broader local verification:

```powershell
npm run ci:local
```

**If `npm run ci:local` fails, stop there and send me the failure.** Do not commit around it.

If everything exits cleanly, run:

```powershell
git diff --check
git status --short
git diff --stat
```

and:

```powershell
git diff -- `
  .gitea/workflows/ci.yml `
  .gitea/workflows/deploy-worker.yml `
  scripts/ci-change-plan.mjs `
  tests/ci/change-plan.test.mjs `
  docs/deployment/azure-worker.md `
  docs/deployment/overview.md
```

Send me the outputs from **MkDocs, `tests/ci/*.test.mjs`, `npm run ci:local`, and `git status --short`**. Then we do the acceptance-criteria audit and AI evidence before committing.

## Prompt:
9/14/2026, 7:08:09 AM

passed, send me ai csv, what tp cll transcript, commits, pr

## Response:
9/14/2026, 7:08:22 AM

> **Remembering**
>
>
> **Reviewed Shayna register format, Sport Analytics columns, examples, and filename convention**
>
> 
>
> Worked for 28s

Yes. Since all local verification passed, package it now in **two commits**: implementation/docs first, AI evidence second. Do **not** use `Closes #524` yet because the final acceptance requires the post-merge automatic deployment and Azure SHA evidence. Use `Refs #524`; close the issue after live verification. 

### AI CSV row

Add this to:

```text
evidence/ai/registers/shayna-unterslak.csv
```

```csv
2026-09-14,Shayna Unterslak,ChatGPT Web,GPT-5.6 Sol,"Review, debugging, implementation planning and verification","Issue #524: automatically deploy the Azure batch worker for worker-affecting changes merged to main and verify the active healthy revision uses the exact commit-SHA image","Used guidance to add deployWorker change routing, automatic main worker deployment, exact image/revision verification, regression tests and deployment documentation","Implemented incrementally with RED/GREEN tests; verified worker and non-worker change routing; ran node --test tests/ci/*.test.mjs, python -m mkdocs build --strict, npm run ci:local and git diff --check successfully; live main/Azure deployment verification remains post-merge acceptance evidence","Issue #524; evidence/ai/transcripts/shayna-unterslak/2026-09-14-issue-524-auto-deploy-worker.md"
```

That follows your established register columns. 

### Transcript name

Save/export **this full conversation** as:

```text
evidence/ai/transcripts/shayna-unterslak/2026-09-14-issue-524-auto-deploy-worker.md
```

Don't clean up or rewrite the transcript; keep the conversation as the evidence.

Then check:

```powershell
git status --short
git diff --check
```

### Commit 1 - implementation

Stage everything **except** the AI register/transcript:

```powershell
git add `
  .gitea/workflows/ci.yml `
  .gitea/workflows/deploy-worker.yml `
  scripts/ci-change-plan.mjs `
  tests/ci/change-plan.test.mjs `
  docs/deployment/azure-worker.md `
  docs/deployment/overview.md
```

Then:

```powershell
git commit -m "fix(ci): auto-deploy batch worker from main" -m "Refs #524" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

### Commit 2 - AI evidence

After adding the CSV row and transcript:

```powershell
git add `
  evidence/ai/registers/shayna-unterslak.csv `
  evidence/ai/transcripts/shayna-unterslak/2026-09-14-issue-524-auto-deploy-worker.md
```

Then:

```powershell
git commit -m "docs(ai): record Issue 524 implementation session" -m "Refs #524" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Now:

```powershell
git status --short
git log --oneline -2
git push -u origin fix/524-auto-deploy-worker
```

Status should be clean.

## PR

**Title:**

```text
#524 Automatically deploy batch worker from main
```

**Body:**

```markdown
## Purpose

Fix #524 by preventing the deployed Azure batch worker from falling behind worker-affecting changes that have already been merged to `main`.

Previously the worker had a separate manual deployment workflow, so frontend/backend deployments could advance while the active worker remained on an older application revision.

## Changes

- added a dedicated `deployWorker` decision to the change-aware CI plan
- select worker deployment for:
  - `apps/worker/**`
  - `packages/batch-processing/**`
  - `packages/contracts/**`
  - root dependency / lockfile changes
  - `infra/azure/worker/**`
  - worker deployment workflow changes
- retain no worker deployment for unrelated frontend, backend and documentation-only changes
- added an automatic `deploy_worker` job for qualifying pushes to `main`
- retained the existing manual worker deployment workflow for recovery and deliberate redeployment
- build and deploy immutable worker images tagged with the exact Git commit SHA
- require the active Azure Container Apps revision to be both healthy and running the expected commit-SHA image
- added regression coverage for worker-affecting and non-worker-affecting change routing
- updated worker and deployment documentation for automatic and manual deployment behaviour

## Testing

Local verification completed successfully:

- `node --test tests/ci/change-plan.test.mjs` - 27/27 passed
- `node --test tests/ci/*.test.mjs` - passed
- `python -m mkdocs build --strict` - passed
- `npm run ci:local` - passed
- `git diff --check` - passed

The implementation was developed using RED/GREEN regression tests for the new deployment-routing and exact-image verification behaviour.

## Known Limitations

The final production acceptance evidence cannot be produced on the feature branch because automatic worker deployment intentionally occurs only after a qualifying push to `main`.

After merge we still need to verify:

1. the `main` workflow automatically selects `deploy_worker`
2. the worker image is built with the merged commit SHA
3. Azure reports an active healthy worker revision using that exact image
4. the ingestion/review workflow affected by #522 still behaves correctly

These checks will be recorded against #524 before the issue is closed.

## Related Issue

Refs #524

Related:
- #522 - published delivery conflict reconciliation
- #523 - ingestion reconciliation implementation

## AI Declaration

Implementation planning, review, debugging and documentation were completed with assistance from ChatGPT-Web[GPT-5.6 Sol]. Usage is recorded in the project AI register and transcript evidence.
```

One important thing after you create the PR: **don’t close #524 just because the PR passes CI**. Merge first, then we watch the `main` run and capture the automatic worker deployment + exact Azure image SHA. That is the strongest evidence that this bug is actually fixed.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)