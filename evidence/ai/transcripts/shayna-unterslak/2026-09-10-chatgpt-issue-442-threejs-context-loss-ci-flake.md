# Fix Flaky CI Test

**User:** Anonymous  
**Created:** 9/10/2026 9:43:36  
**Updated:** 9/10/2026 10:18:40  
**Exported:** 9/10/2026 10:18:52  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6aa25fa7-180c-83ea-bc97-ab2df88e9a75](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6aa25fa7-180c-83ea-bc97-ab2df88e9a75)  

## Prompt:
9/10/2026, 10:01:48 AM

# test(e2e): Three.js context-loss test intermittently times out in hosted CI #442

**svgOpen**

opened 13 hours ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [13 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/442#issue-2234)

**Member**

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/442#description)Description

The hosted Playwright suite intermittently fails the Three.js context-loss homepage test before passing on automatic retry.

Observed during [#364](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/364) validation:

`tests/e2e/homepage.spec.ts:181`
`Three.js enhancement reveals the fallback during context loss and restores in place`

The initial run timed out waiting 5 seconds for:

`[data-hero-enhancement="three"]`

while the component remained:

`data-hero-enhancement="fallback"`

The automatic retry passed and the overall CI job succeeded.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/442#expected)Expected

The test should reliably wait for the Three.js enhancement to initialise, or safely skip/contextualise the context-loss assertion when WebGL initialisation is delayed in hosted CI.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/442#actual)Actual

Hosted CI can remain in the fallback state for longer than the test's fixed 5-second expectation.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/442#scope)Scope

This appears to be E2E timing/flakiness rather than a product regression. It is unrelated to the Intermediate ingestion pipeline.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/442#acceptance-criteria)Acceptance Criteria

- Determine whether the fixed 5-second wait is appropriate.
- Make the context-loss test deterministic under hosted CI load.
- Preserve meaningful validation of fallback and WebGL context restoration.
- Do not hide genuine Three.js failures by simply increasing retries.
- Hosted browser suite passes repeatedly without this test requiring retry.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/442#ai-declaration)AI Declaration

> The preceding issue was planned and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sprint 2** milestone 13 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**priority: low**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=39)

[**severity: low**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=225)

[**bug**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=1)

[**type: testing**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=40)

 labels 13 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sport Analytics - Bug Tracker** project 13 hours ago

svg[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=56)) [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/441#issuecomment-17570)[13 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/442#event-17571)

[**test(ingestion): verify intermediate pipeline acceptance**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/441)[ #441](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/441)

is this issue easy and quick to fix?

## Response:
9/10/2026, 10:01:52 AM

Yes — this looks like a **fairly easy, contained fix**, probably similar in spirit to #446.

The important clue is that the test **passes on retry**, while the first run sometimes stays in `data-hero-enhancement="fallback"` for longer than the hard-coded 5 seconds. That strongly suggests the product is behaving correctly and the test is racing Three.js/WebGL startup under a slower hosted runner.

I’d expect this to be a **test-only change**, not a production change. The likely fix is to make the Playwright test wait for the actual enhancement readiness condition in a more deterministic way, while still failing if Three.js genuinely never initializes. We should not just bump retries, and I’d avoid blindly changing 5 seconds to 15 seconds unless the component gives us no better synchronisation point.

Send me these and I can probably fix it quickly:

- `tests/e2e/homepage.spec.ts`
- the homepage Three.js enhancement component/file used by that test — probably something like `HeroThree...tsx`, `HomePage.tsx`, or the file that sets `data-hero-enhancement="three"` / `"fallback"`

If you’re not sure which file, just send `homepage.spec.ts` first. I’ll inspect the imports/selectors and tell you exactly what else I need.

## Prompt:
9/10/2026, 10:02:49 AM

[Attachment: homepage.spec.ts]

## Response:
9/10/2026, 10:02:52 AM

Yep - this confirms the issue is probably small.

The flaky line is this:

```ts
await expect(visual).toHaveAttribute('data-hero-enhancement', 'three');
```

and because no timeout is specified, Playwright is only giving the enhancement its normal expectation window before failing. `homepage.spec.ts`

The rest of the test is actually good: once Three.js is running, it deliberately triggers `WEBGL_lose_context`, checks the fallback/lost state, restores the same context, and confirms the **original renderer/canvas remains in place**. So I don't want to weaken any of that. `homepage.spec.ts`

Before changing the test, I want to see how the homepage decides when to switch:

```text
data-hero-enhancement="fallback"
```

to:

```text
data-hero-enhancement="three"
```

### Send me one production file

In PowerShell run:

```powershell
git grep -n "data-hero-enhancement"
```

Send me whichever `.tsx`/`.ts` file that command shows.

If it gives multiple files, send the one containing the code that sets `"fallback"` and `"three"`.

I **suspect** the clean fix will be one of these:

- wait explicitly for the actual Three.js readiness state rather than relying on the generic 5-second expect timeout; or
- first detect whether WebGL is available (as the previous E2E test already does), then wait for the canvas/context `ready` state with a deliberately justified startup window.

What I **won't** do is just increase retries or put in a random `waitForTimeout(10000)`.

This should be a quick one once I see that component.

## Prompt:
9/10/2026, 10:03:39 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git grep -n "data-hero-enhancement"
apps/frontend/src/features/home/HomeHero.tsx:117:          data-hero-enhancement={sceneReady ? 'three' : 'fallback'}
apps/frontend/src/features/home/HomePage.test.tsx:98:    expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
evidence/ai/transcripts/shayna-unterslak/2026-08-30-issue-272-basic-e2e-acceptance.md:1038:   await expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
tests/e2e/homepage.spec.ts:83:  const visual = page.locator('[data-hero-enhancement]');
tests/e2e/homepage.spec.ts:84:  await expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
tests/e2e/homepage.spec.ts:105:  await expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
tests/e2e/homepage.spec.ts:147:  const visual = page.locator('[data-hero-enhancement]');
tests/e2e/homepage.spec.ts:161:  await expect(visual).toHaveAttribute('data-hero-enhancement', 'three');
tests/e2e/homepage.spec.ts:188:  const visual = page.locator('[data-hero-enhancement]');
tests/e2e/homepage.spec.ts:190:  await expect(visual).toHaveAttribute('data-hero-enhancement', 'three');
tests/e2e/homepage.spec.ts:207:  await expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
tests/e2e/homepage.spec.ts:217:  await expect(visual).toHaveAttribute('data-hero-enhancement', 'three');
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/10/2026, 10:03:45 AM

Great — that narrows it down.

Send me:

```text
apps/frontend/src/features/home/HomeHero.tsx
```

That is the production file controlling the exact transition from:

```ts
data-hero-enhancement="fallback"
```

to:

```ts
data-hero-enhancement="three"
```

I don’t need `HomePage.test.tsx` yet.

Once I see `HomeHero.tsx`, I can tell whether the best fix is purely in `tests/e2e/homepage.spec.ts` or whether there’s a cleaner readiness signal already available that we should wait on. My expectation is still a **small E2E-only fix**.

## Prompt:
9/10/2026, 10:04:25 AM

[Attachment: HomeHero.tsx]

## Response:
9/10/2026, 10:04:29 AM

> **Planning a reliable test**
>
> I’m using the hero’s explicit readiness marker rather than a fixed delay. I’ll wait for the enhancement state with a bounded timeout, then verify context-loss recovery; if initialization stays unavailable, the test should report that clearly instead of silently passing.
>
> **Planned a reliable test**
>
> 
>
> **Refining readiness checks**
>
> I’m distinguishing slow startup from failed recovery. The initial Three.js transition needs a longer, explicit readiness budget, while context restoration should use a shorter bounded assertion so genuine regressions remain visible.
>
> Worked for 48s

Yes - this confirms #442 is a small **E2E-only fix**.

`HomeHero` deliberately starts in fallback, schedules the dynamic `HeroScene` import with `setTimeout(..., 0)`, and only switches `data-hero-enhancement` to `"three"` after the child actually invokes `onReady`. `HomeHero.tsx` So the existing context-loss test is effectively treating Playwright’s generic 5-second expectation timeout as a Three.js startup requirement, even though the application defines no such 5-second requirement. `homepage.spec.ts`

I’ve made the patch:

[Download the #442 patch](sandbox:/mnt/data/issue-442-three-context-loss-ci.patch)

The fix does three useful things. It factors the existing WebGL capability check into a helper, uses that same check in the flaky context-loss test so an actually unsupported runtime skips for the correct reason, and then waits specifically for the canvas to reach:

```text
data-context-state="ready"
```

with a bounded 15-second initialization allowance. Only after that does it assert:

```text
data-hero-enhancement="three"
```

This is better than just changing the original line from 5 seconds to 15 seconds because the test is now synchronised to the **actual Three.js readiness signal**. It still fails if the browser reports WebGL support but the scene never becomes ready. It does not add retries or sleeps, and all of the meaningful context-loss/restoration assertions remain unchanged. `homepage.spec.ts`

Start from updated main:

```powershell
git switch main
git pull
git switch -c fix/442-three-context-loss-ci
```

Put the patch in the repo root, then:

```powershell
git apply --check .\issue-442-three-context-loss-ci.patch
git apply .\issue-442-three-context-loss-ci.patch

git diff --check
git diff
```

First run just that Playwright file:

```powershell
npx.cmd playwright test tests/e2e/homepage.spec.ts
```

If your repo normally wraps Playwright through npm, this is also fine:

```powershell
npm.cmd run test:e2e -- tests/e2e/homepage.spec.ts
```

Then I want to specifically stress the flaky test. Playwright supports `--grep`, so run:

```powershell
1..10 | ForEach-Object {
    Write-Host "`n===== RUN $_ ====="
    npx.cmd playwright test tests/e2e/homepage.spec.ts --grep "context loss and restores in place"
    if ($LASTEXITCODE -ne 0) { break }
}
```

Then full E2E:

```powershell
npm.cmd run test:e2e
```

If those pass, send me the output like you did for #446 and I’ll give you the **AI CSV line, transcript filename, commits, and PR** for #442.

## Prompt:
9/10/2026, 10:17:59 AM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git diff --check
>> git diff
diff --git a/tests/e2e/homepage.spec.ts b/tests/e2e/homepage.spec.ts
index ddc5f11..704f40a 100644
--- a/tests/e2e/homepage.spec.ts
+++ b/tests/e2e/homepage.spec.ts
@@ -9,6 +9,18 @@ async function expectNoHorizontalOverflow(page: Page) {
   ).toBe(false);
 }
 
+const THREE_INITIALISATION_TIMEOUT_MS = 15_000;
+
+async function hasWebGL(page: Page) {
+  return page.evaluate(() => {
+    if (typeof window.WebGLRenderingContext === 'undefined') {
+      return false;
+    }
+    const testCanvas = document.createElement('canvas');
+    return Boolean(testCanvas.getContext('webgl2') ?? testCanvas.getContext('webgl'));
+  });
+}
+
 test(
   'homepage presents the public event-to-statistic journey in both themes',
   { tag: '@mobile' },
@@ -146,13 +158,7 @@ test('Three.js enhancement pauses off-screen and unmounts without page errors',
 
   const visual = page.locator('[data-hero-enhancement]');
   const canvas = visual.locator('canvas');
-  const webglAvailable = await page.evaluate(() => {
-    if (typeof window.WebGLRenderingContext === 'undefined') {
-      return false;
-    }
-    const testCanvas = document.createElement('canvas');
-    return Boolean(testCanvas.getContext('webgl2') ?? testCanvas.getContext('webgl'));
-  });
+  const webglAvailable = await hasWebGL(page);
 
   if (!webglAvailable) {
     test.skip(true, 'WebGL is unavailable in this browser runtime.');
@@ -185,8 +191,18 @@ test('Three.js enhancement reveals the fallback during context loss and restores
   page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
   await page.goto('/');
 
+  const webglAvailable = await hasWebGL(page);
+  test.skip(!webglAvailable, 'WebGL is unavailable in this browser runtime.');
+
   const visual = page.locator('[data-hero-enhancement]');
   const canvas = visual.locator('.hero-scene');
+
+  await expect(
+    canvas,
+    'Three.js should initialise when the browser runtime reports WebGL support.',
+  ).toHaveAttribute('data-context-state', 'ready', {
+    timeout: THREE_INITIALISATION_TIMEOUT_MS,
+  });
   await expect(visual).toHaveAttribute('data-hero-enhancement', 'three');
 
   const canSimulateContextLoss = await canvas.evaluate((element) => {
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npx.cmd playwright test tests/e2e/homepage.spec.ts
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 6 tests using 6 workers

  ✓  1 …mium] › tests\e2e\homepage.spec.ts:91:5 › homepage remains complete with reduced motion and without WebGL (1.8s)
  ✓  2 …ests\e2e\homepage.spec.ts:139:5 › Three.js enhancement pauses off-screen and unmounts without page errors (8.2s)
  ✓  3 [desktop-chromium] › tests\e2e\homepage.spec.ts:122:5 › primary homepage journey works from the keyboard (5.0s)
  ✓  4 …e\homepage.spec.ts:24:5 › homepage presents the public event-to-statistic journey in both themes @mobile (11.9s)
  ✓  5 …e\homepage.spec.ts:24:5 › homepage presents the public event-to-statistic journey in both themes @mobile (12.1s)
  ✓  6 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (4.8s)

  6 passed (25.2s)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 1..10 | ForEach-Object {
>>     Write-Host "`n===== RUN $_ ====="
>>     npx.cmd playwright test tests/e2e/homepage.spec.ts --grep "context loss and restores in place"
>>     if ($LASTEXITCODE -ne 0) { break }
>> }

===== RUN 1 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.2s)

  1 passed (10.5s)

===== RUN 2 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.3s)

  1 passed (10.5s)

===== RUN 3 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.0s)

  1 passed (10.3s)

===== RUN 4 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.2s)

  1 passed (10.4s)

===== RUN 5 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.1s)

  1 passed (10.2s)

===== RUN 6 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.1s)

  1 passed (10.3s)

===== RUN 7 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.1s)

  1 passed (10.3s)

===== RUN 8 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …page.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (932ms)

  1 passed (11.3s)

===== RUN 9 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.1s)

  1 passed (10.4s)

===== RUN 10 =====
[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 1 test using 1 worker

  ✓  1 …epage.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (1.1s)

  1 passed (10.4s)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd run test:e2e

> sport-analytics-tool@0.1.0 test:e2e
> playwright test

[WebServer] 
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

Running 42 tests using 8 workers

  ✓   1 …m] › tests\e2e\authentication.spec.ts:88:5 › OAuth cancellation returns a safe signed-out callback state (2.0s)
      2 …essibility.spec.ts:4:5 › public and authentication page themes have no serious accessibility violations @mobile
  ✓   3 …min-users.spec.ts:63:5 › administrator finds and safely manages a user across responsive layouts @mobile (7.3s)
  ✓   4 …thentication.spec.ts:44:5 › signed-out authentication pages are responsive and keyboard operable @mobile (7.4s)
  ✓   5 …e2e\authentication.spec.ts:132:5 › stored Supabase identity completes the callback and opens the account (1.1s)
  ✓   6 … › tests\e2e\authentication.spec.ts:151:5 › stored Supabase identity updates navigation and can sign out (1.8s)
  ✓   7 …ests\e2e\authentication.spec.ts:112:5 › OAuth provider failure returns a safe recoverable callback state (1.7s)
  ✓   8 ….ts:30:5 › administrator rejects a pending submitter request with accessible responsive feedback @mobile (4.2s)
  ✓   9 …s\e2e\batch-review-workspace.spec.ts:51:5 › reviewer inspects and safely rejects a staged batch @mobile (13.5s)
  ✓  10 …ctions.spec.ts:132:5 › authorised submitter corrects an event by keyboard and sees refreshed statistics (20.8s)
  ✓  11 … tests\e2e\corrections.spec.ts:235:5 › correction validation remains associated with the relevant input (12.0s)
  ✓  12 …sts\e2e\corrections.spec.ts:302:5 › viewer is denied submission and is never offered a correction action (1.9s)
  ✓  13 …\homepage.spec.ts:24:5 › homepage presents the public event-to-statistic journey in both themes @mobile (19.9s)
  ✓  14 …um] › tests\e2e\homepage.spec.ts:91:5 › homepage remains complete with reduced motion and without WebGL (10.3s)
  ✓  15 [desktop-chromium] › tests\e2e\homepage.spec.ts:122:5 › primary homepage journey works from the keyboard (14.3s)
  ✓  16 …ts\e2e\homepage.spec.ts:139:5 › Three.js enhancement pauses off-screen and unmounts without page errors (13.5s)
  ✓  17 …page.spec.ts:187:5 › Three.js enhancement reveals the fallback during context loss and restores in place (8.9s)
     18 …iew.spec.ts:173:5 › player overview presents multiple matches, partial data, and unavailable statistics @mobile
     19 …tests\e2e\public-browsing.spec.ts:87:5 › competition, season, and team overviews embed readable related records
  ✓  20 …\e2e\public-browsing.spec.ts:330:5 › readable filter combobox supports routed selection and keyboard use (3.9s)
  ✓  21 …rowsing.spec.ts:518:5 › anonymous browsing preserves filters, pagination and keyboard navigation @mobile (3.3s)
  ✓  22 …2e\smoke.spec.ts:3:5 › public landing page is responsive and supports persisted keyboard theme selection (1.5s)
  ✓  23 …atistics.spec.ts:73:5 › anonymous users open the responsive match overview and calculation trace @mobile (2.6s)
  ✓  24 …s\e2e\submissions.spec.ts:95:5 › the account Submit events action opens the unified submission workflow (754ms)
  ✓  25 …ium] › tests\e2e\submissions.spec.ts:108:5 › submitter completes the responsive workflow with a keyboard (1.9s)
  ✓   2 …ty.spec.ts:4:5 › public and authentication page themes have no serious accessibility violations @mobile (26.1s)
  ✓  26 …s\e2e\submissions.spec.ts:163:5 › validation results remain associated with the editor and receive focus (1.1s)
  ✓  27 …ions.spec.ts:197:5 › submitter uploads a readable fixture package and receives a durable receipt @mobile (2.1s)
  ✓  28 …bmissions.spec.ts:277:5 › file validation identifies a rejected CSV row and returns focus to the result (666ms)
  ✓  29 …ns.spec.ts:315:5 › submitter uploads and resolves a batch through the responsive guided workflow @mobile (2.2s)
  ✓  30 …tter-access.spec.ts:30:5 › eligible user requests access and reloads the persisted pending state @mobile (1.8s)
  ✓  31 …ity.spec.ts:4:5 › public and authentication page themes have no serious accessibility violations @mobile (3.2s)
  ✓  32 ….ts:30:5 › administrator rejects a pending submitter request with accessible responsive feedback @mobile (3.3s)
  ✓  33 …min-users.spec.ts:63:5 › administrator finds and safely manages a user across responsive layouts @mobile (3.0s)
  ✓  34 …thentication.spec.ts:44:5 › signed-out authentication pages are responsive and keyboard operable @mobile (6.7s)
  ✓  19 …e\public-browsing.spec.ts:87:5 › competition, season, and team overviews embed readable related records (12.1s)
  ✓  35 …ts\e2e\batch-review-workspace.spec.ts:51:5 › reviewer inspects and safely rejects a staged batch @mobile (3.6s)
  ✓  36 …e\homepage.spec.ts:24:5 › homepage presents the public event-to-statistic journey in both themes @mobile (4.5s)
  ✓  18 ….ts:173:5 › player overview presents multiple matches, partial data, and unavailable statistics @mobile (16.0s)
  ✓  37 …atistics.spec.ts:73:5 › anonymous users open the responsive match overview and calculation trace @mobile (3.0s)
  ✓  38 …c.ts:173:5 › player overview presents multiple matches, partial data, and unavailable statistics @mobile (5.6s)
  ✓  39 …ions.spec.ts:197:5 › submitter uploads a readable fixture package and receives a durable receipt @mobile (2.5s)
  ✓  40 …ns.spec.ts:315:5 › submitter uploads and resolves a batch through the responsive guided workflow @mobile (2.8s)
  ✓  41 …rowsing.spec.ts:518:5 › anonymous browsing preserves filters, pagination and keyboard navigation @mobile (2.6s)
  ✓  42 …tter-access.spec.ts:30:5 › eligible user requests access and reloads the persisted pending state @mobile (1.6s)

  42 passed (49.3s)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/10/2026, 10:18:08 AM

Perfect - #442 is ready to commit. The flaky test passed **10/10 repeated runs**, the complete homepage E2E file passed **6/6**, and the full browser suite passed **42/42** with no retry needed.

### AI CSV line

Add this as one line to `evidence/ai/registers/shayna-unterslak.csv`:

```csv
2026-09-10,Shayna Unterslak,ChatGPT-Web,GPT-5.6 Sol,"Code generation, debugging, review and documentation","Investigated hosted-CI flakiness in the Three.js homepage context-loss E2E test and generated a deterministic readiness-based fix that checks WebGL capability and waits for the canvas context-ready signal before context-loss assertions.","Updated tests/e2e/homepage.spec.ts and drafted verification, commit and pull-request guidance.","Reviewed the generated patch before applying it; verified the homepage E2E file passes 6/6; repeated the previously flaky context-loss test 10 consecutive times successfully; ran the full Playwright suite with 42/42 tests passing.","Issue #442; evidence/ai/transcripts/shayna-unterslak/2026-09-10-chatgpt-issue-442-threejs-context-loss-ci-flake.md"
```

### Transcript

Call it:

```text
2026-09-10-chatgpt-issue-442-threejs-context-loss-ci-flake.md
```

Path:

```text
evidence/ai/transcripts/shayna-unterslak/2026-09-10-chatgpt-issue-442-threejs-context-loss-ci-flake.md
```

### Commits

First commit the test fix:

```powershell
git add tests/e2e/homepage.spec.ts

git commit -m "test(e2e): stabilise Three.js context-loss setup" -m "Synchronise the homepage context-loss test with actual WebGL readiness before exercising context loss and restoration.

Reuse the WebGL capability check, skip unsupported browser runtimes explicitly, and allow the Three.js canvas a bounded startup window without adding retries or arbitrary sleeps.

Refs #442

Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

That `Assisted-by` line is appropriate because the course policy requires tool/model attribution for AI-generated code. `ai_policy_20_jul.pdf`

Then add the evidence:

```powershell
git add evidence/ai/registers/shayna-unterslak.csv
git add evidence/ai/transcripts/shayna-unterslak/2026-09-10-chatgpt-issue-442-threejs-context-loss-ci-flake.md

git commit -m "docs(ai): record issue 442 assistance"
```

Then:

```powershell
git status
git log --format="%h %s" origin/main..HEAD
git push -u origin fix/442-three-context-loss-ci
```

### PR

**Title**

```text
test(e2e): stabilise Three.js context-loss setup
```

**Body**

```markdown
## Summary

Fixes #442.

The homepage context-loss E2E test could intermittently time out in hosted CI
while waiting for the Three.js enhancement to initialise. The browser remained
in the valid fallback state beyond Playwright's default expectation timeout,
although the automatic retry subsequently passed.

This change synchronises the test with the actual WebGL/Three.js readiness
state rather than relying on generic startup timing.

## Changes

- extract the existing WebGL capability check into a reusable helper;
- use the same capability check in the context-loss test;
- explicitly skip the context-loss scenario when WebGL is unavailable;
- wait for the Three.js canvas to report `data-context-state="ready"` before
  beginning context-loss assertions;
- use a bounded 15-second initialisation window for hosted runner load;
- retain validation of fallback behaviour during context loss;
- retain validation that the same renderer/canvas is restored in place;
- add no arbitrary sleeps or additional retries.

## Verification

Homepage E2E file:

- 6/6 tests passed

Previously flaky context-loss test:

- 10/10 consecutive runs passed

Full Playwright suite:

- 42/42 tests passed
- no retry required for the context-loss test

Hosted CI will provide the final validation under runner load.

## AI Usage

AI assistance is recorded in the repository AI register and transcript
evidence.

Closes #442
```

This one is nicely scoped: only `homepage.spec.ts` changes; production Three.js behaviour stays untouched.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)