# Implement Batch Worker Pipeline

**User:** Anonymous  
**Created:** 9/4/2026 11:50:37  
**Updated:** 9/4/2026 14:34:59  
**Exported:** 9/4/2026 14:35:22  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9/c/6a9a9431-dd48-83e9-9ed6-c09a9e7bd9b1](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9/c/6a9a9431-dd48-83e9-9ed6-c09a9e7bd9b1)  

## Prompt:
9/4/2026, 2:16:29 PM

![75875908-53dd-49f7-b486-67b08d4ecb1c.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000cb508206a976fca6e56c2ba9&fn=75875908-53dd-49f7-b486-67b08d4ecb1c.png&cd=attachment&ts=496812&p=fs&cid=1&sig=bb42ec374390ad7b31e525aa2ef3205e78cea0b9cf0c32640d35b1ab5f7fc256&v=0)

which of these is easier?

## Response:
9/4/2026, 2:16:39 PM

**#367 is definitely easier.**

**#367 — Strip UTF-8 byte-order marks and support common CSV media types**
This should be a small, well-bounded backend bug:
- strip a leading UTF-8 BOM before parsing;
- accept common CSV content types such as `text/csv`, probably `application/csv` / `text/plain` where appropriate;
- add a few focused tests;
- likely only touches the upload/parser path and tests.

Given what we just did for #278, we already dealt with BOM/CSV behaviour in the batch parser, so the pattern is fresh. I’d expect **~20–45 minutes** if the existing submission upload code is straightforward.

**#369 — Investigate delayed backend responses after idle periods**
This is much less predictable. It could involve Azure cold starts, Postgres connection pooling, DNS/network latency, container sleep, health probes, or connection re-establishment. You first have to reproduce and measure it before you even know what to fix. Could be **1–3+ hours**, potentially longer if it’s hosting-related.

So I’d do:

**#367 first → quick win → then #369.**

And because #367 is close to that open CSV PR you showed earlier, we should check whether that PR is touching the same `submission-upload.ts` code before branching, just to avoid duplicated work.

## Prompt:
9/4/2026, 2:17:27 PM

# Strip UTF-8 byte-order marks and support common CSV media types #367

**svgOpen**

opened 2 days ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [2 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/367#issue-1740)

**Member**

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/367#description)Description

Make uploads robust to CSV files exported by common spreadsheet applications. A UTF-8 BOM must not corrupt the first header and supported browser MIME variations must not cause a valid CSV to be rejected.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/367#acceptance-criteria)Acceptance Criteria

- UTF-8 BOM is removed before header validation.
- `text/csv` and approved spreadsheet-generated CSV MIME types work.
- Unsupported non-CSV content remains rejected.
- Tests cover BOM input and supported MIME variations.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/367#ai-declaration)AI Declaration

> The preceding issue was planned and edited with the assistance of Codex[GPT-5] and ChatGPT-Web[GPT-5.6 Sol].
>
> do this

## Response:
9/4/2026, 2:17:29 PM

> **Reviewing documentation changes**
>
> I’m identifying the relevant upload documentation and API references, then I’m checking whether the frontend MIME restrictions also need updating. I’m noting an existing overlapping change so implementation can avoid unnecessary conflicts.
>
> **Reviewed documentation changes**
>
> 
>
> **Inspecting Upload MIME Documentation and Frontend Support**
>
>
> **Choosing implementation scope**
>
> I’m limiting CSV acceptance to the documented MIME variants, preserving extension checks, stripping a leading UTF-8 BOM only for CSV content, and adding API coverage without creating unnecessary overlap with the existing upload changes.
>
> **Chose implementation scope**
>
> 
>
> **Inspecting Submission Tests and MIME Handling**
>
>
> **Updated and verified CSV upload MIME handling and documentation patch**
>
> 
>
> Worked for 2m 47s

Yep — I’ve done #367 against the current repo. It’s a small, contained fix.

**Do not apply it on the #278 branch.** Finish/push #278 first, then get back to a clean `main` and branch:

```powershell
git switch main
git pull
git switch -c fix/367-csv-bom-media-types
```

Then use this patch:

[Download #367 patch](sandbox:/mnt/data/issue-367-csv-bom-mime-types.patch)

Apply it:

```powershell
git apply --check .\issue-367-csv-bom-mime-types.patch
git apply .\issue-367-csv-bom-mime-types.patch
Remove-Item .\issue-367-csv-bom-mime-types.patch
```

Then format:

```powershell
npx.cmd prettier --write `
  apps/backend/src/modules/submissions/submission-upload.ts `
  apps/backend/tests/api/submissions.test.ts `
  docs/api/submissions.md `
  docs/api/openapi.yaml
```

### What this changes

It now accepts `.csv` files reported as:

```text
text/csv
application/csv
application/vnd.ms-excel
text/plain
```

but **only when the filename is actually `.csv`**, so an arbitrary `.txt` upload remains rejected.

All accepted CSV MIME variants are normalised internally to:

```text
text/csv
```

It also strips a leading UTF-8 BOM:

```ts
function stripUtf8Bom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}
```

before CSV header validation.

Tests cover:

- normal `text/csv` ✅
- UTF-8 BOM CSV ✅
- `application/csv` ✅
- `application/vnd.ms-excel` ✅
- `text/plain` CSV ✅
- existing unsupported non-CSV rejection remains ✅

And I updated:

```text
apps/backend/src/modules/submissions/submission-upload.ts
apps/backend/tests/api/submissions.test.ts
docs/api/submissions.md
docs/api/openapi.yaml
```

I **intentionally did not change the frontend file input**. It already contains `.csv` in its `accept` attribute, which allows a real `.csv` regardless of the MIME the browser reports. Adding `text/plain` there would unnecessarily make ordinary `.txt` files selectable.

Also, this should coexist reasonably with **#366**: #366 changes the CSV row-fault logic in the same source file, while #367 changes MIME detection and BOM handling in different sections.

After applying, run:

```powershell
git diff --check
npm.cmd run test:api
npm.cmd run openapi:lint
npm.cmd run typecheck
```

If those pass:

```powershell
npm.cmd run check
npm.cmd run ci:local
```

Send me the output. Then I’ll give you the **AI CSV row, transcript name, commit, and PR for #367**.

## Prompt:
9/4/2026, 2:23:13 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git apply --check .\issue-367-csv-bom-mime-types.patch
>> git apply .\issue-367-csv-bom-mime-types.patch
>> Remove-Item .\issue-367-csv-bom-mime-types.patch
error: patch failed: apps/backend/src/modules/submissions/submission-upload.ts:274
error: apps/backend/src/modules/submissions/submission-upload.ts: patch does not apply
error: patch failed: apps/backend/src/modules/submissions/submission-upload.ts:274
error: apps/backend/src/modules/submissions/submission-upload.ts: patch does not apply
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

[Attachment: submission.controller.ts]

[Attachment: submission.errors.ts]

[Attachment: submission.repository.ts]

[Attachment: submission.routes.ts]

[Attachment: submission.service.ts]

[Attachment: submission-rate-limit.ts]

[Attachment: submission-upload.ts]

## Response:
9/4/2026, 2:23:15 PM

> **Reviewing patch mismatch**
>
> I’m seeing that the failed patch targeted pre-#366 code. Your current file already contains the row-fault and identifier handling introduced there, so the expected context no longer exists. I’ll base the next change on this exact version and avoid overwriting merged work.
>
> **Reviewed patch mismatch**
>
> 
>
> **Inspecting CSV upload tests and documentation**
>
>
> **Building a current patch**
>
> I’m preparing a context-independent change against the uploaded version, preserving #366’s row-fault behavior. I’ll add normalized MIME acceptance plus focused tests in a new file, avoiding conflicts with existing test changes.
>
> **Built a current patch**
>
> 
>
> **Patching CSV MIME types and BOM handling**
>
>
> **Inspected and patched CSV upload handling with expanded media type tests**
>
> 
>
> Worked for 1m 42s

Yep - the failure makes sense. Your current `submission-upload.ts` has already changed from the version I built the first patch against; it now contains the new `CsvRowResult`/multi-row fault handling, so the old hunk around line 274 no longer matches. `submission-upload.ts`

I rebuilt it against **the exact file you just uploaded**, and I made the tests a separate new unit-test file so we don't interfere with the #366 tests.

[Download the corrected #367 patch](sandbox:/mnt/data/issue-367-current-main.patch)

Apply:

```powershell
git apply --check .\issue-367-current-main.patch
git apply .\issue-367-current-main.patch
Remove-Item .\issue-367-current-main.patch
```

Then:

```powershell
npx.cmd prettier --write `
  apps/backend/src/modules/submissions/submission-upload.ts `
  apps/backend/tests/unit/submission-upload-media-types.test.ts

git diff --check
npm.cmd run test:unit
npm.cmd run typecheck
```

This corrected version does exactly #367:

- strips a UTF-8 BOM **before CSV header validation**
- accepts:
  - `text/csv`
  - `application/csv`
  - `application/vnd.ms-excel`
  - `text/plain`
  - MIME values with parameters such as `text/csv; charset=utf-8`
- only accepts those alternatives when the filename actually ends in `.csv`
- normalises accepted CSV uploads to `text/csv`
- still rejects `events.txt` with `text/plain`
- still rejects a `.csv` sent as something unsupported like `application/pdf`
- adds dedicated tests for all of that

Importantly, I **didn't overwrite the new malformed-row behaviour already in your current file**.

If those three commands pass, run:

```powershell
npm.cmd run check
npm.cmd run ci:local
```

Then send me the result and I'll give you the **AI evidence row + transcript name + commit + PR** for #367.

## Prompt:
9/4/2026, 2:27:33 PM

yay passed
how can i test it? like can i physically run and test if it wokrs?

## Response:
9/4/2026, 2:27:45 PM

> **Testing the upload flow**
>
> I’m preparing a hands-on test that exercises the parser with a realistic CSV, including valid rows, missing values, and an invalid part number. I’ll then verify normalization and reported validation errors.
>
> **Tested the upload flow**
>
> 
>
> **Inspecting repository upload templates**
>
>
> **Running a practical test**
>
> I’m using a temporary CSV fixture to exercise the parser directly, then checking normalized rows and validation errors. If that passes, I’m testing the same file through the browser upload flow with a logged-in submitter account.
>
> **Ran a practical test**
>
> 
>
> **Inspecting package scripts for local testing**
>
>
> **Inspected repository upload templates and package scripts**
>
> 
>
> Worked for 45s

Yes — and since the automated tests passed, a quick manual smoke test is worth doing.

The easiest way is to exercise the actual upload parser directly with a real CSV file and different MIME types, without needing to log in or set up Supabase.

From the repo root, run this in PowerShell:

```powershell
@'
import fs from 'node:fs';
import { parseSubmissionUpload } from './apps/backend/src/modules/submissions/submission-upload.ts';

const csv = fs.readFileSync(
  './apps/frontend/public/submission-template.csv',
  'utf8',
);

const bomCsv = '\uFEFF' + csv;

function makeFile(
  mimetype: string,
  originalname = 'manual-test.csv',
  content = bomCsv,
) {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size: Buffer.byteLength(content),
    destination: '',
    filename: originalname,
    path: '',
    buffer: Buffer.from(content, 'utf8'),
    stream: undefined as any,
  };
}

const supported = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv; charset=utf-8',
];

for (const mime of supported) {
  try {
    const result = parseSubmissionUpload(makeFile(mime));

    console.log(
      'PASS:',
      mime,
      '=>',
      result.sourceFile.mediaType,
    );
  } catch (error) {
    console.error('FAIL:', mime, error);
  }
}

try {
  parseSubmissionUpload(makeFile('text/plain', 'not-a-csv.txt'));
  console.error('FAIL: .txt file was incorrectly accepted');
} catch {
  console.log('PASS: text/plain .txt rejected');
}

try {
  parseSubmissionUpload(makeFile('application/pdf', 'fake.csv'));
  console.error('FAIL: application/pdf was incorrectly accepted');
} catch {
  console.log('PASS: unsupported application/pdf rejected');
}
'@ | Set-Content .\manual-367-test.ts

npx.cmd tsx .\manual-367-test.ts

Remove-Item .\manual-367-test.ts
```

You should get roughly:

```text
PASS: text/csv => text/csv
PASS: application/csv => text/csv
PASS: application/vnd.ms-excel => text/csv
PASS: text/plain => text/csv
PASS: text/csv; charset=utf-8 => text/csv
PASS: text/plain .txt rejected
PASS: unsupported application/pdf rejected
```

That also tests the **BOM fix**, because the script deliberately puts `\uFEFF` in front of the real submission CSV template.

If you want an even more "real user" test after that, create an actual BOM CSV:

```powershell
$csv = Get-Content .\apps\frontend\public\submission-template.csv -Raw
[System.IO.File]::WriteAllText(
  "$PWD\bom-submission-test.csv",
  ([char]0xFEFF + $csv),
  [System.Text.UTF8Encoding]::new($false)
)
```

Then start the app:

```powershell
npm.cmd run dev
```

Sign in as an authorised submitter and upload:

```text
bom-submission-test.csv
```

If the template's fixture IDs match your local seeded data, it should process normally instead of complaining that the first header is something like `﻿fixtureId`.

Afterwards:

```powershell
Remove-Item .\bom-submission-test.csv
```

I'd do the direct parser test first — it proves all four #367 acceptance criteria in about 30 seconds.

## Prompt:
9/4/2026, 2:29:17 PM

FAIL: text/csv SubmissionValidationError: The uploaded submission file is invalid.
    at invalidFile (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:50:10)
    at csvRowResults (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:145:11)
    at normaliseCsv (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:221:19)
    at parseSubmissionUpload (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:323:24)
    at fs (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:40:20)
    at Object.<anonymous> (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:65:1)
    at Module._compile (node:internal/modules/cjs/loader:1812:14)
    at Object.transformer (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\node_modules\tsx\dist\register-BcxQ17Jo.cjs:9:3339)
    at Module.load (node:internal/modules/cjs/loader:1533:32)
    at Module._load (node:internal/modules/cjs/loader:1335:12) {
  details: [
    {
      code: 'INVALID_FILE',
      message: 'The CSV file must contain at least one event row.',
      field: 'file'
    }
  ]
}
FAIL: application/csv SubmissionValidationError: The uploaded submission file is invalid.
    at invalidFile (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:50:10)
    at csvRowResults (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:145:11)
    at normaliseCsv (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:221:19)
    at parseSubmissionUpload (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:323:24)
    at fs (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:40:20)
    at Object.<anonymous> (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:65:1)
    at Module._compile (node:internal/modules/cjs/loader:1812:14)
    at Object.transformer (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\node_modules\tsx\dist\register-BcxQ17Jo.cjs:9:3339)
    at Module.load (node:internal/modules/cjs/loader:1533:32)
    at Module._load (node:internal/modules/cjs/loader:1335:12) {
  details: [
    {
      code: 'INVALID_FILE',
      message: 'The CSV file must contain at least one event row.',
      field: 'file'
    }
  ]
}
FAIL: application/vnd.ms-excel SubmissionValidationError: The uploaded submission file is invalid.
    at invalidFile (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:50:10)
    at csvRowResults (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:145:11)
    at normaliseCsv (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:221:19)
    at parseSubmissionUpload (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:323:24)
    at fs (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:40:20)
    at Object.<anonymous> (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:65:1)
    at Module._compile (node:internal/modules/cjs/loader:1812:14)
    at Object.transformer (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\node_modules\tsx\dist\register-BcxQ17Jo.cjs:9:3339)
    at Module.load (node:internal/modules/cjs/loader:1533:32)
    at Module._load (node:internal/modules/cjs/loader:1335:12) {
  details: [
    {
      code: 'INVALID_FILE',
      message: 'The CSV file must contain at least one event row.',
      field: 'file'
    }
  ]
}
FAIL: text/plain SubmissionValidationError: The uploaded submission file is invalid.
    at invalidFile (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:50:10)
    at csvRowResults (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:145:11)
    at normaliseCsv (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:221:19)
    at parseSubmissionUpload (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:323:24)
    at fs (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:40:20)
    at Object.<anonymous> (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:65:1)
    at Module._compile (node:internal/modules/cjs/loader:1812:14)
    at Object.transformer (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\node_modules\tsx\dist\register-BcxQ17Jo.cjs:9:3339)
    at Module.load (node:internal/modules/cjs/loader:1533:32)
    at Module._load (node:internal/modules/cjs/loader:1335:12) {
  details: [
    {
      code: 'INVALID_FILE',
      message: 'The CSV file must contain at least one event row.',
      field: 'file'
    }
  ]
}
FAIL: text/csv; charset=utf-8 SubmissionValidationError: The uploaded submission file is invalid.
    at invalidFile (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:50:10)
    at csvRowResults (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:145:11)
    at normaliseCsv (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:221:19)
    at parseSubmissionUpload (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend\src\modules\submissions\submission-upload.ts:323:24)
    at fs (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:40:20)
    at Object.<anonymous> (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\manual-367-test.ts:65:1)
    at Module._compile (node:internal/modules/cjs/loader:1812:14)
    at Object.transformer (C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\node_modules\tsx\dist\register-BcxQ17Jo.cjs:9:3339)
    at Module.load (node:internal/modules/cjs/loader:1533:32)
    at Module._load (node:internal/modules/cjs/loader:1335:12) {
  details: [
    {
      code: 'INVALID_FILE',
      message: 'The CSV file must contain at least one event row.',
      field: 'file'
    }
  ]
}
PASS: text/plain .txt rejected
PASS: unsupported application/pdf rejected
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/4/2026, 2:29:29 PM

> **Diagnosing the test failure**
>
> I’m seeing that parsing works through MIME and BOM checks, then rejects the template because it has no event rows. I’ll explain that the test fixture needs one populated CSV row, not headers alone.
>
> **Diagnosed the test failure**
>
> 
>
> Worked for 12s

This is actually **good news**: the #367 fix is working. Your manual test file was the problem.

Every supported MIME got past:
- MIME validation ✅
- `.csv` filename validation ✅
- BOM stripping ✅
- exact CSV header validation ✅

and then failed only because `apps/frontend/public/submission-template.csv` currently contains **the header but no event row**:

> `The CSV file must contain at least one event row.`

If the BOM had *not* been stripped, you would instead have received the “CSV header must exactly contain…” error.

Use this better smoke test, which creates one structurally valid event row itself:

```powershell
@'
import { parseSubmissionUpload } from './apps/backend/src/modules/submissions/submission-upload.ts';

const headers = [
  'fixtureId',
  'schemaVersion',
  'eventId',
  'inningsId',
  'sequenceNumber',
  'overNumber',
  'positionInOver',
  'ballNumber',
  'strikerId',
  'nonStrikerId',
  'bowlerId',
  'runsOffBat',
  'runsExtras',
  'runsTotal',
  'runsNonBoundary',
  'extraWides',
  'extraNoBalls',
  'extraByes',
  'extraLegByes',
  'extraPenalty',
  'wickets',
];

const row = [
  '1',
  '1.0',
  '00000000-0000-4000-8000-000000000001',
  '1',
  '1',
  '0',
  '1',
  '0.1',
  '10',
  '11',
  '12',
  '1',
  '0',
  '1',
  'false',
  '',
  '',
  '',
  '',
  '',
  '[]',
];

const csv = `${headers.join(',')}\n${row.join(',')}\n`;
const bomCsv = '\uFEFF' + csv;

function makeFile(
  mimetype: string,
  originalname = 'manual-test.csv',
  content = bomCsv,
) {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size: Buffer.byteLength(content),
    buffer: Buffer.from(content, 'utf8'),
  } as any;
}

const supported = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv; charset=utf-8',
];

for (const mime of supported) {
  try {
    const result = parseSubmissionUpload(makeFile(mime));
    console.log(
      'PASS:',
      mime,
      '=>',
      result.sourceFile.mediaType,
    );
  } catch (error) {
    console.error('FAIL:', mime, error);
  }
}

try {
  parseSubmissionUpload(makeFile('text/plain', 'not-a-csv.txt'));
  console.error('FAIL: .txt file was incorrectly accepted');
} catch {
  console.log('PASS: text/plain .txt rejected');
}

try {
  parseSubmissionUpload(makeFile('application/pdf', 'fake.csv'));
  console.error('FAIL: application/pdf was incorrectly accepted');
} catch {
  console.log('PASS: unsupported application/pdf rejected');
}
'@ | Set-Content .\manual-367-test.ts

npx.cmd tsx .\manual-367-test.ts

Remove-Item .\manual-367-test.ts
```

You should now get:

```text
PASS: text/csv => text/csv
PASS: application/csv => text/csv
PASS: application/vnd.ms-excel => text/csv
PASS: text/plain => text/csv
PASS: text/csv; charset=utf-8 => text/csv
PASS: text/plain .txt rejected
PASS: unsupported application/pdf rejected
```

So your first run already proved an important thing: **the BOM fix worked**, because the parser successfully recognized `fixtureId` as the first header and progressed to the empty-data check. `submission-upload.ts`

Run this corrected one and show me the output.

## Prompt:
9/4/2026, 2:32:06 PM

![986c251b-dff4-4732-9504-c54825d0dcbb.png](https://chatgpt.com/backend-api/estuary/content?id=file_0000000010a481f59577c7c780d6d453&fn=986c251b-dff4-4732-9504-c54825d0dcbb.png&cd=attachment&ts=496812&p=fs&cid=1&sig=577e46b785dce046649cd2eb40529bca8f5f1a789f73cceb19063f1c4482bacf&v=0)

## Response:
9/4/2026, 2:32:18 PM

> **Interpreting the upload result**
>
> This is expected: the BOM header parsed successfully, but the template contains no data rows, so the importer reports “no valid rows.” Add one valid event row, then upload again to test the complete flow.
>
> **Interpreted the upload result**
>
> 
>
> Worked for 10s

Yep — **this screenshot is actually a successful test of the BOM fix**.

The important part is the error you got:

> **“The CSV file must contain at least one event row.”**

That means the backend successfully:

1. accepted the file as CSV,
2. stripped the BOM,
3. recognised `fixtureId` as the first header,
4. validated the entire header correctly,
5. only then noticed that the template contains no data rows.

Before #367, that same BOM file would have failed much earlier with something like:

> “The CSV header must exactly contain: fixtureId, …”

So **BOM handling is working in the actual browser → frontend → API → backend path.** ✅

### Want to test it one step further in the UI?

Make a copy of the CSV and add one event row. The easiest way is:

```powershell
$path = ".\bom-submission-test.csv"

$csv = Get-Content .\apps\frontend\public\submission-template.csv -Raw

$row = '1,1.0,00000000-0000-4000-8000-000000000001,1,1,0,1,0.1,10,11,12,1,0,1,false,,,,,,[]'

[System.IO.File]::WriteAllText(
  $path,
  ([char]0xFEFF + $csv.TrimEnd() + "`r`n" + $row + "`r`n"),
  [System.Text.UTF8Encoding]::new($false)
)
```

Upload that through the page.

It will probably then reject it for **fixture/innings/player IDs**, because those dummy IDs probably don't exist in your local database. That's okay. If the error changes to things like:

```text
fixture not found
invalid innings
invalid participant
```

then we've proven the file made it through **BOM + MIME + CSV parsing + schema parsing**.

If you want the nicest possible final smoke test, we can make a CSV using the **actual seeded fixture/innings/player IDs**, so you click **Upload and submit file** and it genuinely returns **accepted**. That would be the best manual evidence for #367.

## Prompt:
9/4/2026, 2:33:13 PM

![e66c7a84-1ab3-4224-b4c6-39371c080766.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000c9b081fa81e31bf3117bfccc&fn=e66c7a84-1ab3-4224-b4c6-39371c080766.png&cd=attachment&ts=496812&p=fs&cid=1&sig=7b09026f894e897257294599778f356627be79c99625cd248121fc9e1982d3fc&v=0)

## Response:
9/4/2026, 2:33:22 PM

> **Interpreting the result**
>
> I’m reading this as progress: the upload and parsing path is working, while authorization is now blocking submission. The dummy fixture IDs likely aren’t valid for the authorized competition, so I’d test with real in-scope fixtures next.
>
> **Interpreted the result**
>
> 
>
> Worked for 11s

Yep — **this is even better evidence that #367 is working.** ✅

Your BOM CSV has now successfully passed:

- file extension check
- CSV MIME handling
- **UTF-8 BOM stripping**
- header validation
- row parsing
- submission-schema parsing

It only failed **after all of that**, at the backend authorization/scope check:

> “The backend did not permit this submission. Your approval or fixture scope may have changed.”

That is because the test row used dummy IDs such as `fixtureId = 1`. Your logged-in submitter is authorised for **ACC Men's Premier Cup**, and that dummy fixture evidently isn't within your permitted scope.

So for the actual purpose of **#367**, this manual browser test is a success. 🎉

You can stop here if you want. Between this and the automated tests, the acceptance criteria are covered.

If you want the ultimate end-to-end test where the green **submission accepted** message appears, we'd just need to replace the dummy fixture/innings/player IDs with real IDs from one fixture in your ACC Men's Premier Cup test data. But that is testing the broader submission system, not really necessary for #367.

I'd now clean up the temporary file:

```powershell
Remove-Item .\bom-submission-test.csv -ErrorAction SilentlyContinue
Remove-Item .\manual-367-test.ts -ErrorAction SilentlyContinue
```

Then:

```powershell
git status
git diff --stat
```

Send me that and I'll give you the **AI CSV row, transcript filename, commit and PR** for #367.

## Prompt:
9/4/2026, 2:34:02 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git status
>> git diff --stat
On branch fix/367-csv-bom-media-types
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   apps/backend/src/modules/submissions/submission-upload.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        apps/backend/tests/unit/submission-upload-media-types.test.ts

no changes added to commit (use "git add" and/or "git commit -a")
 .../src/modules/submissions/submission-upload.ts       | 18 ++++++++++++++----
 2 files changed, 15 insertions(+), 4 deletions(-)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/4/2026, 2:34:17 PM

Perfect - this is a nice, clean #367 diff: **1 implementation file + 1 focused test file**. No temporary files hanging around.

Add the AI evidence now, before the commit.

Use this transcript filename:

```text
evidence/ai/transcripts/shayna-unterslak/2026-09-04-issue-367-csv-bom-media-types.pdf
```

And append this row to your register:

```csv
"2026-09-04","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","Code generation; debugging; testing; review; Git and Pull Request guidance","Issue #367: strip UTF-8 byte-order marks and support common CSV media types","Updated direct submission CSV upload handling to strip a leading UTF-8 BOM before header validation and accept approved browser/spreadsheet CSV MIME variants while continuing to reject unsupported non-CSV uploads; added focused unit coverage","Automated tests, typecheck, npm run check and npm run ci:local passed; manually verified the BOM CSV through the browser upload flow, where it passed MIME, BOM, header and row parsing and reached backend fixture-scope authorization","evidence/ai/transcripts/shayna-unterslak/2026-09-04-issue-367-csv-bom-media-types.pdf; Issue #367; Pull Request pending; commit pending"
```

The COMS3011A policy requires the AI code-generation attribution in the commit too. `ai_policy_20_jul.pdf`

### Is the implementation complete?

Yes. For #367, **these two code files are enough**:

```text
apps/backend/src/modules/submissions/submission-upload.ts
apps/backend/tests/unit/submission-upload-media-types.test.ts
```

I would **not add unrelated docs/OpenAPI changes just to make the PR look bigger**. The public upload contract is still “JSON or CSV”; this fix merely makes legitimate CSV files from browsers/spreadsheets robust to MIME variations and BOMs.

Your manual UI test was particularly useful: the BOM CSV progressed all the way to fixture-scope authorization, proving it passed the exact stages #367 is fixing.

### Commit

After adding the CSV register row and transcript:

```powershell
git add -A
git status --short
```

Make sure it shows your implementation/test plus the AI evidence, and no temporary test files.

Then:

```powershell
git commit `
  -m "fix(backend): support BOM and common CSV media types" `
  -m "Strip UTF-8 byte-order marks before CSV header validation and accept approved browser and spreadsheet CSV MIME variants while retaining non-CSV rejection." `
  -m "Refs #367" `
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Then:

```powershell
git push -u origin fix/367-csv-bom-media-types
```

## PR

**Title**

```text
fix(backend): support BOM and common CSV media types
```

**Description**

```markdown
## Summary

Fixes #367 by making direct CSV submission uploads robust to files produced by common browsers and spreadsheet applications.

- strips a leading UTF-8 BOM before CSV header validation
- accepts `text/csv`
- accepts `application/csv`
- accepts `application/vnd.ms-excel`
- accepts `text/plain` for files that actually use a `.csv` filename
- handles MIME parameters such as `text/csv; charset=utf-8`
- normalises accepted CSV uploads to `text/csv`
- continues rejecting unsupported non-CSV uploads
- adds focused unit coverage for BOM handling and MIME variants

## Validation

- `git diff --check` ✅
- backend unit tests ✅
- TypeScript typecheck ✅
- `npm.cmd run check` ✅
- `npm.cmd run ci:local` ✅
- manual browser smoke test ✅

The manual smoke test uploaded a BOM-prefixed CSV through the real submission UI. The request passed file-type detection, BOM removal, exact CSV header validation and event-row parsing, and only then reached the existing backend fixture-scope authorization check.

## AI assistance

Implementation, debugging, testing, review and PR preparation used ChatGPT Web with GPT-5.6 Sol.

Evidence:
`evidence/ai/transcripts/shayna-unterslak/2026-09-04-issue-367-csv-bom-media-types.pdf`

Register:
`evidence/ai/registers/shayna-unterslak.csv`

Closes #367
```

This is a good small PR - focused fix, targeted regression tests, full CI green, and an actual browser-level manual verification.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)