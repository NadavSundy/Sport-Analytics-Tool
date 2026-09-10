# Fix Flaky CI Test

**User:** Anonymous  
**Created:** 9/10/2026 9:43:36  
**Updated:** 9/10/2026 9:57:49  
**Exported:** 9/10/2026 9:57:54  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6aa25fa7-180c-83ea-bc97-ab2df88e9a75](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6aa25fa7-180c-83ea-bc97-ab2df88e9a75)  

## Prompt:
9/10/2026, 9:43:47 AM

[Logo](https://sdp.ms.wits.ac.za/) ([image](https://sdp.ms.wits.ac.za/assets/img/logo.svg))[Issues](https://sdp.ms.wits.ac.za/issues)[Pull Requests](https://sdp.ms.wits.ac.za/pulls)[Milestones](https://sdp.ms.wits.ac.za/milestones)[Explore](https://sdp.ms.wits.ac.za/explore/repos)

[svg](https://sdp.ms.wits.ac.za/notifications)

svg

[**git-push-pray**](https://sdp.ms.wits.ac.za/git-push-pray)**/**[**Sport-Analytics-Tool**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool)

**Internal**

[svgCode](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/)[**svgIssues16**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues)[svgPull Requests](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[**1**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[svgActions](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[**1**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[svgPackages](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/packages)[svgProjects](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[**2**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[svgReleases](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/releases)[svgWiki](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/wiki)[svgActivity](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/activity)[svgSettings](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/settings)

# bug: BatchReportsPage all-accepted summary test is flaky in hosted CI #446

**svgOpen**

opened 10 hours ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [10 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#issue-2241)

**Member**

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#description)Description

The frontend unit test:

`src/features/submissions/BatchReportsPage.test.tsx`

intermittently fails in hosted CI for:

`batch report view > shows a clear all-accepted batch summary`

The failure occurred because the page was still displaying the authentication/loading state:

`Checking access`

when the test attempted to find the `Batch summary` heading.

The other tests in the same file passed in the same hosted run.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#observed-ci-failure)Observed CI failure

Hosted frontend verification reported:

- 15/16 test files passed
- 124/125 tests passed
- only the all-accepted batch-summary test failed

Failure:

`TestingLibraryElementError: Unable to find role="heading" and name "Batch summary"`

At failure time the rendered page was still showing:

`Checking access`

rather than the batch report.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#local-reproduction-attempt)Local reproduction attempt

The affected test file was run directly:

`npm run test --workspace=@sport-analytics/frontend -- src/features/submissions/BatchReportsPage.test.tsx`

Result:

- 6/6 tests passed

It was then repeated five additional times consecutively.

Results:

- Run 1: 6/6 passed
- Run 2: 6/6 passed
- Run 3: 6/6 passed
- Run 4: 6/6 passed
- Run 5: 6/6 passed

The affected all-accepted summary test completed locally in approximately 0.3–0.4 seconds on the repeated runs.

This currently appears to be a timing/race condition exposed under hosted CI load rather than a deterministic application regression.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#expected-behaviour)Expected behaviour

The test should deterministically wait for the mocked authenticated/application-account state to resolve before asserting on the loaded batch report.

Hosted CI load should not determine whether the test passes.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#actual-behaviour)Actual behaviour

Occasionally, the test reaches the Testing Library query timeout while the component is still in its `Checking access` state.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#investigation)Investigation

Review the authentication/account setup used by `renderReport()` and the affected test.

Prefer synchronising the test with the actual state transition or mocked authentication resolution rather than adding an arbitrary sleep.

Check whether:

- the authentication mock is resolved deterministically before report assertions;
- the test depends on asynchronous state shared with surrounding tests;
- mocked fetch/auth state is reset correctly between tests;
- the current default `findByRole` timeout is exposing a genuine race under slower hosted runners.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#acceptance-criteria)Acceptance Criteria

- The affected test deterministically reaches the authenticated batch-report state before report assertions.
- Do not fix the issue with an arbitrary sleep.
- All six `BatchReportsPage` tests pass repeatedly locally.
- The full frontend test suite passes.
- Hosted CI passes without the intermittent `Checking access` timeout.
- Existing authentication/loading-state behaviour remains covered.

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**severity: medium**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=224)

[**bug**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=1)

[**type: testing**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=40)

 labels 10 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sport Analytics - Bug Tracker** project 10 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) self-assigned this now

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

**Write**Preview

Drop files or click here to upload.

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**bug**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=1)

[**severity: medium**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=224)

[**type: testing**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=40)

No Milestone

[svgSport Analytics - Bug Tracker](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/32)

[ShaynaShayna](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/446#) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=40))

**1 Participants**

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=40))

**Notifications**

**Due Date**

No due date set.

**Dependencies**

No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#446

[Powered by Gitea](https://about.gitea.com/)Version: 1.24.7 Page:**97ms**Template:**20ms**

[Licenses](https://sdp.ms.wits.ac.za/assets/licenses.txt)[API](https://sdp.ms.wits.ac.za/api/swagger)

do this for me.. what files do u need, ill send them

## Response:
9/10/2026, 9:43:51 AM

Yep. I can fix #446. Send me these **from your current branch/main**, and I should be able to give you the exact edits rather than guessing:

1. `apps/frontend/src/features/submissions/BatchReportsPage.test.tsx`
2. `apps/frontend/src/features/submissions/BatchReportsPage.tsx`
3. Whatever auth/account hook or component `BatchReportsPage.tsx` imports — likely files with names such as:
   - `useAuth...`
   - `useCurrentUser...`
   - `useApplicationAccount...`
   - `AuthProvider...`
4. Your frontend test setup file, probably something like:
   - `apps/frontend/src/test/setup.ts`
   - `apps/frontend/src/setupTests.ts`
   - or whatever is configured under `setupFiles` in Vitest
5. `apps/frontend/vite.config.ts` / `vitest.config.ts` if the test configuration is separate.

**Easiest option:** send me `BatchReportsPage.test.tsx` and `BatchReportsPage.tsx` first. I can inspect their imports and tell you exactly which additional file(s) I need.

Once you send them, I'll give you the **actual fix**, tests to run repeatedly, full frontend test command, AI evidence row/text if needed, commit message, and PR for **#446**.

## Prompt:
9/10/2026, 9:45:52 AM

[Attachment: BatchReportsPage.test.tsx]

[Attachment: BatchReportsPage.tsx]

[Attachment: setup.ts]

[Attachment: index.html]

[Attachment: package.json]

[Attachment: README(1).md]

[Attachment: tsconfig.app.json]

[Attachment: tsconfig.json]

[Attachment: tsconfig.node.json]

[Attachment: tsconfig.node.tsbuildinfo]

[Attachment: vite.config.ts]

## Response:
9/10/2026, 9:45:55 AM

> **Requesting missing context**
>
> I’m reviewing the supplied test and component, but the failure likely depends on the authentication provider’s loading lifecycle. I need `AuthProvider.tsx` and its session API wrapper to identify the smallest reliable fix.
>
> **Requested missing context**
>
> 
>
> **Refining test synchronization**
>
> I’m narrowing this to the test’s authentication-loading transition. The supplied files suggest replacing the fragile default query timeout with an explicit wait for the loading state to finish, while keeping the test assertion unchanged.
>
> **Refined test synchronization**
>
> 
>
> **Investigated AuthProvider files and debugged batch authentication test failures**
>
> 
>
> Worked for 1m 16s

Perfect - I’ve gone through these. I can already see the likely cause: `BatchReportsPage.test.tsx` renders the real `AuthProvider`, whose mocked `getSession()` resolves asynchronously, and the test immediately relies on the default `findByRole` wait to get past that transition. `BatchReportsPage.test.tsx` Meanwhile, `BatchReportsPage` deliberately remains on **“Checking access”** for as long as `isLoading` is true. `BatchReportsPage.tsx` Your test setup does not add any special async synchronisation or timeout handling, `setup.ts` and the Vitest config is also using the normal jsdom setup. `vite.config.ts`

So I **do not want to change the production page** just to make CI happy. This looks like a test-synchronisation problem, exactly as #446 suspected.

Send me just these two now:

1. `apps/frontend/src/features/auth/AuthProvider.tsx`
2. `apps/frontend/src/features/auth/AuthProvider.test.tsx`

Then I can match the batch-report test to the provider's actual session lifecycle and make the fix deterministic - ideally by explicitly controlling/resolving the mocked initial session inside `act`, rather than adding a sleep or blindly increasing the timeout.

After that I’ll give you the exact change/patch, repeated-test commands, full frontend gate, AI evidence, commit message with the required `Assisted-by: ChatGPT-Web[GPT-5.6 Sol]` attribution, and the PR for **#446**. Your course policy specifically requires that attribution when AI is used for code generation. `ai_policy_20_jul.pdf`

## Prompt:
9/10/2026, 9:47:46 AM

[Attachment: AuthProvider.test.tsx]

[Attachment: AuthProvider.tsx]

## Response:
9/10/2026, 9:47:50 AM

> **Diagnosing the timeout**
>
> I’m tracing the mocked authentication flow. The test renders before the session promise resolves, so I’m making that timing explicit: render the loading state, resolve authentication inside `act`, then wait for the report content.
>
> **Diagnosed the timeout**
>
> 
>
> **Refining the test flow**
>
> I’m avoiding timing assumptions by explicitly controlling session resolution. Each test will render first, resolve authentication within `act`, and await the resulting report state instead of relying on a timeout.
>
> **Refined the test flow**
>
> 
>
> Worked for 1m 19s

Yep - this is enough. I found the clean fix, and **we do not need to touch production code**.

The issue is exactly what #446 suspected. `BatchReportsPage` intentionally renders **“Checking access”** until `AuthProvider` resolves its initial `getSession()` request. `BatchReportsPage.tsx` The current batch-report test gives `getSession()` an immediately resolved Promise and then starts the `findByRole('Batch summary')` timeout straight away, so under a slow hosted runner that timeout includes both authentication startup and report loading. `BatchReportsPage.test.tsx`

Your existing `AuthProvider.test.tsx` already contains the correct pattern: use a deferred session Promise and explicitly resolve it inside `act()`. `AuthProvider.test.tsx` I reused that exact approach for #446. This also means the test now explicitly proves the page initially shows **Checking access**, then resolves authentication, and only afterwards starts its report assertions. That matches the actual provider lifecycle. `AuthProvider.tsx`

I made both versions for you:

[Download the #446 patch](sandbox:/mnt/data/issue-446-auth-sync.patch)

[Download the complete fixed BatchReportsPage.test.tsx](sandbox:/mnt/data/BatchReportsPage.test.issue-446.tsx)

From your repo root in PowerShell, make the branch and apply the patch:

```powershell
git switch main
git pull
git switch -c fix/446-batch-report-auth-test

git apply --check .\issue-446-auth-sync.patch
git apply .\issue-446-auth-sync.patch

git diff --check
git diff
```

Then run the affected test once:

```powershell
npm.cmd run test --workspace=@sport-analytics/frontend -- src/features/submissions/BatchReportsPage.test.tsx
```

If that passes, hammer it repeatedly:

```powershell
1..10 | ForEach-Object {
    Write-Host "`n===== RUN $_ ====="
    npm.cmd run test --workspace=@sport-analytics/frontend -- src/features/submissions/BatchReportsPage.test.tsx
    if ($LASTEXITCODE -ne 0) { break }
}
```

Then the full frontend suite:

```powershell
npm.cmd run test:frontend
```

And I would also run:

```powershell
npm.cmd run typecheck --workspace=@sport-analytics/frontend
npm.cmd run lint --workspace=@sport-analytics/frontend
```

### What the patch changes

It does **not** increase a timeout and does **not** add a sleep. It changes the test harness from:

```ts
getSession: vi.fn().mockResolvedValue(...)
```

to an explicitly controlled deferred session. `renderReport()` now:

```ts
expect(screen.getByRole('heading', { name: 'Checking access' })).toBeInTheDocument();

await act(async () => {
  deferredSession.resolve({ data: { session: session() } });
  await deferredSession.promise;
});

expect(screen.queryByRole('heading', { name: 'Checking access' })).not.toBeInTheDocument();
```

All six report tests now do:

```ts
await renderReport();
```

before looking for report content.

That directly satisfies the important acceptance criteria: deterministic authentication resolution, no arbitrary sleep, and loading behaviour remains tested.

When the tests pass, commit with:

```powershell
git add apps/frontend/src/features/submissions/BatchReportsPage.test.tsx

git commit -m "fix(frontend): stabilise batch report auth test" -m "Synchronise the BatchReportsPage tests with explicit initial session resolution so report assertions begin only after authentication leaves the loading state.

Closes #446

Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

That `Assisted-by` line matters because the COMS3011A AI policy requires tool/model attribution in the commit when AI is used for code generation. `ai_policy_20_jul.pdf`

**PR title:**

```text
fix(frontend): stabilise batch report auth test
```

**PR body:**

```markdown
## Summary

Fixes #446.

The BatchReportsPage tests previously relied on the mocked Supabase
`getSession()` promise resolving quickly enough for the page to leave
`Checking access` before the Testing Library report query timed out.

Hosted CI occasionally exposed that timing dependency even though the test
passed repeatedly locally.

This change makes authentication resolution explicit in the test harness:

- uses a deferred initial session;
- verifies that the page begins in `Checking access`;
- resolves the authenticated session inside `act()`;
- verifies that the authentication loading state has cleared before report
  assertions begin; and
- keeps the existing production authentication and loading behaviour unchanged.

No arbitrary sleep or increased timeout is used.

## Testing

- [ ] `BatchReportsPage.test.tsx` passes
- [ ] affected test file passes repeatedly
- [ ] full frontend test suite passes
- [ ] frontend typecheck passes
- [ ] frontend lint passes
- [ ] hosted CI passes

Closes #446.
```

Run the first test command now and send me the output. If it's green, we'll do the repeated run and full suite before committing.

## Prompt:
9/10/2026, 9:55:45 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd run test:frontend

> sport-analytics-tool@0.1.0 test:frontend
> npm run test --workspace=@sport-analytics/frontend


> @sport-analytics/frontend@0.1.0 test
> vitest run


 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/frontend

 ✓ src/App.test.tsx (15) 1227ms
 ✓ src/api/client.test.ts (5)
 ✓ src/api/public-read.test.ts (3)
 ✓ src/components/ComponentBaseline.test.tsx (2)
 ✓ src/pages/PublicBrowsePages.test.tsx (25) 1775ms
 ✓ src/features/admin/AdminUsersPage.test.tsx (11) 1168ms
 ✓ src/features/reviews/BatchReviewWorkspacePage.test.tsx (3) 612ms
 ✓ src/features/browse/NameCombobox.test.tsx (4) 1039ms
 ✓ src/features/home/HomePage.test.tsx (3) 522ms
 ✓ src/features/statistics/StatisticsPages.test.tsx (9) 1032ms
 ✓ src/features/auth/AuthProvider.test.tsx (4) 799ms
 ✓ src/features/submissions/BatchReportsPage.test.tsx (6) 715ms
 ✓ src/features/submissions/BatchUploadPage.test.tsx (5) 662ms
 ✓ src/features/submissions/single-fixture-package.test.ts (4)
 ✓ src/features/submissions/SubmissionPage.test.tsx (16) 1817ms
 ✓ src/features/submitter-access/SubmitterAccessPanel.test.tsx (12) 1056ms

 Test Files  16 passed (16)
      Tests  127 passed (127)
   Start at  09:54:57
   Duration  7.36s (transform 5.56s, setup 3.43s, collect 30.49s, tests 12.77s, environment 25.49s, prepare 5.05s)

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd run typecheck --workspace=@sport-analytics/frontend
>> npm.cmd run lint --workspace=@sport-analytics/frontend

> @sport-analytics/frontend@0.1.0 typecheck
> tsc --noEmit


> @sport-analytics/frontend@0.1.0 lint
> eslint src --ext .ts,.tsx

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 
give me csv line dfo ai, what to call transcript, then commits and pr

[Attachment: Pasted text(20260910-075453).txt]

## Response:
9/10/2026, 9:55:48 AM

> **Remembering**
>
>
> **Recording assistance details**
>
> I’m preparing a concise AI-use register entry: today’s date, the named contributor, ChatGPT Web with the specified model, the authentication-test diagnosis and patch, validation results, and transcript evidence tied to issue #446.
>
> **Recorded assistance details**
>
> 
>
> **Reviewed project conventions, transcript filenames, commit format, and issue wording**
>
> 
>
> Worked for 29s

Yep - you’re ready. The fix passed the affected file **10/10 repeated runs**, the full frontend suite **127/127**, plus clean typecheck and lint. `Pasted text.txt`

### 1. AI CSV line

For `evidence/ai/registers/shayna-unterslak.csv`, add this as **one line**:

```csv
2026-09-10,Shayna Unterslak,ChatGPT-Web,GPT-5.6 Sol,"Code generation, debugging, review and documentation","Investigated hosted-CI flakiness in BatchReportsPage authentication setup and generated a deterministic test synchronisation fix using a deferred mocked Supabase session rather than sleeps or increased timeouts.","Updated apps/frontend/src/features/submissions/BatchReportsPage.test.tsx and drafted test, commit and pull-request guidance.","Reviewed the generated patch before applying it; verified the affected test independently and across 10 consecutive runs; ran the full frontend suite with 127/127 tests passing and confirmed frontend typecheck and lint pass.","Issue #446; evidence/ai/transcripts/shayna-unterslak/2026-09-10-chatgpt-issue-446-batch-report-auth-test-flake.md"
```

### 2. Transcript name

Call it:

```text
2026-09-10-chatgpt-issue-446-batch-report-auth-test-flake.md
```

Put it here:

```text
evidence/ai/transcripts/shayna-unterslak/2026-09-10-chatgpt-issue-446-batch-report-auth-test-flake.md
```

### 3. Code commit

First commit the actual fix:

```powershell
git add apps/frontend/src/features/submissions/BatchReportsPage.test.tsx

git commit -m "test(frontend): stabilise batch report auth setup" -m "Synchronise batch report tests with explicit initial-session resolution so assertions begin only after authentication leaves the loading state.

Refs #446

Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

The `Assisted-by` declaration is required because AI generated code used in the repository must be attributed in the commit. `ai_policy_20_jul.pdf`

Then add your CSV and transcript and make the evidence commit:

```powershell
git add evidence/ai/registers/shayna-unterslak.csv
git add evidence/ai/transcripts/shayna-unterslak/2026-09-10-chatgpt-issue-446-batch-report-auth-test-flake.md

git commit -m "docs(ai): record issue 446 assistance"
```

Then:

```powershell
git status
git log --format="%h %s" origin/main..HEAD
git push -u origin fix/446-batch-report-auth-test
```

### 4. PR

**Title**

```text
test(frontend): stabilise batch report auth setup
```

**Body**

```markdown
## Summary

Fixes #446.

Removes the timing dependency in the `BatchReportsPage` tests that could leave
the page in `Checking access` until the Testing Library query timed out under
hosted CI load.

The test harness now explicitly controls the initial Supabase session
resolution and waits for the authentication loading transition before report
assertions begin.

## Changes

- use a deferred mocked initial authentication session;
- verify that the page initially renders `Checking access`;
- resolve the authenticated session explicitly inside `act()`;
- verify that the loading state has cleared before batch-report assertions;
- update all batch-report tests to await the authenticated render helper;
- leave production authentication behaviour unchanged;
- do not introduce arbitrary sleeps or increased query timeouts.

## Verification

Affected test file:

- 6/6 tests passed
- repeated 10 consecutive times successfully

Full frontend suite:

- 16/16 test files passed
- 127/127 tests passed

Additional checks:

- frontend typecheck passed
- frontend lint passed

Hosted CI will provide the final verification that the intermittent runner
failure is resolved.

## AI Usage

AI assistance is recorded in the repository AI register and transcript
evidence.

Closes #446
```

That is a very clean bug fix: **one production-neutral test change, deterministic synchronisation, and direct coverage of the `Checking access` transition that was actually failing in CI.**



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)