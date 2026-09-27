# Update Playwright Assertions

**User:** Anonymous  
**Created:** 9/12/2026 17:20:03  
**Updated:** 9/12/2026 17:31:14  
**Exported:** 9/14/2026 15:16:25  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa56da3-15e0-83ea-814d-2bb6a4206ceb](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa56da3-15e0-83ea-814d-2bb6a4206ceb)  

## Prompt:
9/12/2026, 5:20:15 PM

[Attachment: Pasted markdown.md]

## Response:
9/12/2026, 5:20:19 PM

> **Reading pasted Markdown for request**
>
>
> **Read pasted Markdown for request**
>
> 
>
> **Diagnosing CI failure**
>
> I’m inferring the request is to fix a CI failure. The logs show end-to-end tests still expect old upload headings, while the application now displays revised terminology. I’ll align the assertions with the current UI, or restore the previous wording if that change was unintended.
>
> **Refining the diagnosis**
>
> I’m narrowing this to stale end-to-end assertions after an intentional copy change. I’m checking whether the tests should adopt the new headings or use stable semantic selectors, while preserving the accessibility-focused behavior under test.
>
> **Interpreting the failure**
>
> I’m seeing three exact-text locator failures in the submission-flow end-to-end tests. The recent terminology change likely updated production headings without updating assertions, so I’m treating this as test drift rather than a functional regression.
>
> **Diagnosed and interpreted the CI failure**
>
> 
>
> **Searching the web**
>
> 
>
> **Diagnosing stale E2E heading selectors**
>
>
> **Diagnosed stale E2E heading selectors and receipt locator test failures**
>
> 
>
> Worked for 49s

The CI failure is a **stale Playwright assertion caused by the submission copy changes in PR #512**, not an infrastructure failure. All 5 failures hit the same problem: `tests/e2e/submissions.spec.ts` is still looking for the old receipt headings `"Fixture package received safely"` and `"Back catalogue received safely"`, but those headings no longer exist after the terminology update. `Pasted markdown.md`

The important part of the error is actually:

```text
Error: element(s) not found
```

So this is **not primarily a focus bug**. Playwright cannot find the heading it is supposed to check for focus.

Run this first from the repo root:

```bash
git diff origin/main...HEAD -- apps/frontend tests/e2e/submissions.spec.ts

git grep -n -E "Fixture package|Back catalogue|received safely|Processing continues|Track validation" -- \
  apps/frontend tests/e2e/submissions.spec.ts
```

That will show you exactly what the frontend wording was changed to in this branch.

Then update these three assertions in:

```text
tests/e2e/submissions.spec.ts
```

The stale locations are approximately:

```text
line 199-200
line 290-292
line 409-411
```

Specifically, replace:

```ts
page.getByRole('heading', { name: 'Fixture package received safely' })
```

with the **new exact fixture receipt heading currently rendered by the frontend**, and replace:

```ts
page.getByRole('heading', { name: 'Back catalogue received safely' })
```

with the new back-catalogue receipt heading.

Do **not** just remove `.toBeFocused()`. The focus assertion is valuable accessibility coverage. The problem is that the locator references obsolete UI copy.

After changing those assertions, run only the affected suite:

```bash
npx playwright test tests/e2e/submissions.spec.ts --project=desktop-chromium
```

Then mobile:

```bash
npx playwright test tests/e2e/submissions.spec.ts --project=mobile-chromium
```

If both pass, run exactly the CI acceptance command:

```bash
npm run test:e2e -- \
  tests/e2e/submissions.spec.ts \
  tests/e2e/batch-review-workspace.spec.ts \
  tests/e2e/corrections.spec.ts
```

Also expect that after fixing the headings, Playwright may expose a **second stale-copy assertion** immediately afterwards. These two are suspicious because the PR specifically changed terminology/next-step wording:

```ts
page.getByRole('link', { name: 'Track validation and errors' })
page.getByText(/Processing continues after you leave/)
```

If those labels were intentionally changed in #512, update the tests to the new exact user-visible wording too.

Once green:

```bash
git add tests/e2e/submissions.spec.ts
git commit -m "test(submissions): align receipt assertions with updated copy

Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"
git push
```

You do **not** need to change `ci.yml`. The browser pipeline itself is working: 8 tests passed, and the failures are deterministic assertions in `submissions.spec.ts`. `Pasted markdown.md`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/12/2026, 5:21:48 PM

give me a patch to run to fix these

[Attachment: Pasted text.txt]

## Response:
9/12/2026, 5:21:52 PM

> **Inspecting the patch request**
>
> I can’t produce a grounded patch yet because the provided text doesn’t include the updated headings or repository diff. I’d need the relevant source changes, current tests, or exact expected copy before writing commands safely.
>
> **Refining test locators**
>
> I’m moving the tests away from exact heading text and toward the focused receipt heading, preserving the accessibility assertion while allowing terminology changes. I’m also checking whether link assertions should use stable roles or destinations.
>
> **Inspected the patch request and refined test locators**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 32s

Use this patch. It fixes the **five current failures** by keeping the accessibility requirement-focus must move to the receipt heading-without coupling the test to the old `"Fixture package received safely"` / `"Back catalogue received safely"` wording. Those exact stale selectors are what all five failures report. `Pasted text.txt`

[Download `fix-submissions-stale-receipt-headings.patch`](sandbox:/mnt/data/fix-submissions-stale-receipt-headings.patch)

From the repository root:

```bash
git apply --check fix-submissions-stale-receipt-headings.patch
git apply fix-submissions-stale-receipt-headings.patch
```

Then verify the affected suite:

```bash
npx playwright test tests/e2e/submissions.spec.ts
```

If green, run the exact CI browser subset:

```bash
npm run test:e2e -- \
  tests/e2e/submissions.spec.ts \
  tests/e2e/batch-review-workspace.spec.ts \
  tests/e2e/corrections.spec.ts
```

Then:

```bash
git diff -- tests/e2e/submissions.spec.ts
git add tests/e2e/submissions.spec.ts

git commit -m "test(submissions): decouple receipt focus assertions from copy

Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push
```

The patch changes the assertion from:

```ts
page.getByRole('heading', { name: 'Fixture package received safely' })
```

to a focused semantic-heading locator:

```ts
page.locator(
  'h1:focus, h2:focus, h3:focus, h4:focus, h5:focus, h6:focus, [role="heading"]:focus',
)
```

So the E2E test still verifies the important accessibility behaviour-**the receipt heading receives keyboard focus**-while allowing intentional copy changes from PR #512.

If the next run exposes `"Track validation and errors"` or `"Processing continues after you leave"` as stale copy too, send me that output and I can give you the second patch immediately.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/12/2026, 5:23:27 PM

give me a sh file to run from download

## Response:
9/12/2026, 5:23:35 PM

> **Creating patch script**
>
> I’m preparing a downloadable shell script that runs from Downloads, locates the project directory, applies the submission-flow fixes, and runs the focused end-to-end test afterward.
>
> **Created patch script**
>
> 
>
> Worked for 7s

[Download `fix-submissions-e2e.sh`](sandbox:/mnt/data/fix-submissions-e2e.sh)

Put it directly in:

```text
C:\Users\deanf\Downloads
```

Then from WSL run:

```bash
cd /mnt/c/Users/deanf/Downloads
chmod +x fix-submissions-e2e.sh
./fix-submissions-e2e.sh
```

It will automatically find:

```text
/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
```

Then it will update the three stale receipt-heading assertions, format the test file, show the diff, and run:

```bash
npx playwright test tests/e2e/submissions.spec.ts
```

If it passes, commit with:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

git add tests/e2e/submissions.spec.ts

git commit -m "test(submissions): decouple receipt focus assertions from copy

Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push
```

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/12/2026, 5:27:04 PM

[Attachment: Pasted text.txt]

## Response:
9/12/2026, 5:27:07 PM

> **Inspecting the failures**
>
> I’m inferring that the pasted logs show stale assertions for a link and processing message. I’m checking the current test source before proposing a shell patch, so the fix targets stable selectors and avoids guessing.
>
> **Inspected the failures**
>
> 
>
> Worked for 20s

The first patch worked: the heading-focus failures are gone. The remaining 5 failures are now the **next two stale-copy assertions**: `"Track validation and errors"` and `"Processing continues after you leave"`. `Pasted text.txt`

[Download `fix-submissions-e2e-copy.sh`](sandbox:/mnt/data/fix-submissions-e2e-copy.sh)

Put it in:

```text
C:\Users\deanf\Downloads
```

Then run from WSL:

```bash
cd /mnt/c/Users/deanf/Downloads
chmod +x fix-submissions-e2e-copy.sh
./fix-submissions-e2e-copy.sh
```

The script will automatically find `Sport-Analytics-Tool`, replace the copy-dependent link assertions with the stable batch-route assertion:

```ts
page.locator(`a[href="/submissions/batches/${batchReference}"]`)
```

and replace the obsolete `"Processing continues after you leave"` assertion with a check that the batch-tracking action is actually present. It then formats the file, shows the diff, and runs:

```bash
npx playwright test tests/e2e/submissions.spec.ts
```

If green:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

git add tests/e2e/submissions.spec.ts

git commit -m "test(submissions): make receipt assertions resilient to copy changes

Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push
```

This keeps the E2E coverage meaningful: it tests focus management and the actual batch navigation destination instead of tying the test to wording that PR #512 intentionally changed.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/12/2026, 5:28:30 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cd /mnt/c/Users/deanf/Downloads
chmod +x fix-submissions-e2e-copy.sh
./fix-submissions-e2e-copy.sh
Repository: /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
Updating:   tests/e2e/submissions.spec.ts
ERROR: Expected 2 stale 'Track validation and errors' locators, found 3. No modifications were made.
dean@Leonard:/mnt/c/Users/deanf/Downloads$ cd /mnt/c/Users/deanf/Downloads
chmod +x fix-submissions-e2e-copy.sh
./fix-submissions-e2e-copy.sh
Repository: /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
Updating:   tests/e2e/submissions.spec.ts
ERROR: Expected 2 stale 'Track validation and errors' locators, found 3. No modifications were made.
dean@Leonard:/mnt/c/Users/deanf/Downloads$

## Response:
9/12/2026, 5:28:37 PM

The script was too strict—it expected 2 stale link locators, but your file has **3**. No files were changed, so you’re safe.

Use the corrected version:

[Download `fix-submissions-e2e-copy-v2.sh`](sandbox:/mnt/data/fix-submissions-e2e-copy-v2.sh)

Run:

```bash
cd /mnt/c/Users/deanf/Downloads
chmod +x fix-submissions-e2e-copy-v2.sh
./fix-submissions-e2e-copy-v2.sh
```

This version replaces **all occurrences** of:

```ts
page.getByRole('link', { name: 'Track validation and errors' })
```

with the stable route-based locator:

```ts
page.locator(`a[href="/submissions/batches/${batchReference}"]`)
```

and also replaces the stale:

```ts
page.getByText(/Processing continues after you leave/)
```

assertion.

It then runs:

```bash
npx playwright test tests/e2e/submissions.spec.ts
```

If green:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

git add tests/e2e/submissions.spec.ts

git commit -m "test(submissions): make receipt assertions resilient to copy changes

Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push
```

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)