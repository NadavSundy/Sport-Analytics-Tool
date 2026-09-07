# Claude Chat Transcript

#### **User** (9/4/2026, 10:15:01 AM):
 Collect all CSV row faults rather than throwing on the first malformed row #366
Open
opened 2 days ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments
[Shayna](https://sdp.ms.wits.ac.za/Shayna) commented [2 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/366#issue-1739)
Member
Description
Change the Basic CSV parser so a malformed row produces a structured row-level error while parsing continues where safe. This establishes consistent complete-report behavior for batch ingestion.
Acceptance Criteria

* One malformed row does not hide later independent faults.
* Every malformed row has file and row location information.
* Valid rows are still parsed where safe.
* Structured rejection information is returned.
* Existing valid uploads remain accepted.
* Tests cover multiple malformed rows.

AI Declaration
The preceding issue was planned and edited with the assistance of Codex[GPT-5] and ChatGPT-Web[GPT-5.6 Sol].

#### **Claude** (9/4/2026, 10:15:02 AM):
 Now let's make the edits. First, import the `ApiErrorDetail` type:

Now replace `csvRows` with a fault-collecting version and update `normaliseCsv`:

Now update `normaliseCsv` to consume `csvRowResults`, collect faults from both malformed rows and cross-row consistency checks, and throw once with the full set:

Now let's view what follows (the `events.map` body) to make sure closing braces still line up correctly, and update the call site in `parseSubmissionUpload`:

Good, that closes correctly. Now update the call site to pass fileName:

Now let's view the full file to sanity check everything compiles logically:

Good. Now let's check that TypeScript compiles. Let's check the package setup for running typecheck/tests.

Good, install succeeded. Now let's build contracts and run backend typecheck + existing tests.

Typecheck passes. Now let's run the existing API test suite for submissions to make sure current behavior still works.

All 22 existing tests pass. Now let's add tests covering multiple malformed rows, and rows with mixed independent faults. Let's check the test file's tail to add tests near the CSV section, and check imports/format.

Now let's create a unit test file for `submission-upload.ts` covering multiple malformed rows and interplay with other faults:

All 5 new tests pass. Now let's run the full backend unit + api suite to check nothing else broke.

All 257 tests pass across the full backend suite, including the new tests. Let's also run lint to make sure there are no style violations.

Lint is clean too. Now let's package up the diff as a patch file and present it, along with a summary of the change.

Good, the diff was generated correctly (path issue on the first head command only). Let's copy the two changed/added files to outputs and present them.

Fixed issue #366 in `apps/backend/src/modules/submissions/submission-upload.ts`. Summary of the change:

- **Row-fault collection**: split `csvRows` into `csvRowResults`, which parses every data row independently and returns either a valid `CsvRow` or a structured `INVALID_FILE_ROW` fault (with `eventIndex`, `field: 'file'`, and a message naming the file and CSV line number) — it no longer throws on the first bad row.
- **Independent faults surfaced together**: `normaliseCsv` now runs the fixtureId/schemaVersion consistency check only over the structurally valid rows, then merges those faults with the malformed-row faults into one `SubmissionValidationError`, sorted by row. A malformed row can no longer hide a later, unrelated fault.
- **Valid rows still used where safe**: only rows that fail the check are excluded; the rest still count toward the consistency check and would be normalized if the file is otherwise fault-free.
- **File location on faults**: filename is now threaded through to error messages (e.g. `"match-events.csv" row 5 has 4 columns; 21 are required.`).
- **Structured rejection unchanged in shape**: still one `SubmissionValidationError` with a `details[]` array, matching the existing API error contract, so no schema/controller changes were needed.

Verified: full backend suite (257 tests across 35 files, including the pre-existing `submissions.test.ts`) passes, `tsc --noEmit` and `eslint` are clean, and I added `tests/unit/submission-upload.test.ts` with 5 new tests covering multiple malformed rows, valid-row survival alongside malformed ones, a malformed row co-occurring with an independent fixtureId fault, and the untouched happy path.

#### **Claude** (9/4/2026, 10:51:44 AM):
 That `git pull` was run in your own terminal, not something I can execute — and that domain (`sdp.ms.wits.ac.za`) isn't reachable from my sandboxed environment either way, so I can't reproduce it or pull for you.

"Connection was reset" during the TLS/HTTP handshake usually points to one of these:

Given it's a university-hosted instance, my guess is you're off the Wits network and need the VPN — that's the most common cause of this exact symptom for these self-hosted `sdp.ms.wits.ac.za` repos.

Once you're back in, the `submission-upload.ts` and `submission-upload.test.ts` files I produced above are ready to drop into `apps/backend/src/modules/submissions/` and `apps/backend/tests/unit/` respectively — let me know if you'd like a proper patch file formatted for `git apply` instead of the raw files.

#### **User** (9/4/2026, 10:51:44 AM):
 git pull            
fatal: unable to access 'https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git/': Recv failure: Connection was reset

#### **Claude** (9/4/2026, 11:19:20 AM):
 The three files I generated, and exactly where each one goes in the repo:

So in short: two file replacements/additions in `apps/backend/`, one optional diff for review — nothing goes in `packages/contracts` or the frontend.

#### **User** (9/4/2026, 11:19:20 AM):
 can you tell me exactly where to change these files and what they actually called

#### **User** (9/4/2026, 11:20:16 AM):
 git me a branch name for this issue

#### **Claude** (9/4/2026, 11:20:17 AM):
 A clean, conventional option tied to the issue number:

```
366-collect-csv-row-faults
```

Or if the repo prefers a type prefix (common patterns: `feature/`, `fix/`):

```
fix/366-csv-row-fault-collection
```

Both are short, reference the issue number for traceability, and describe the change (collecting faults instead of throwing on first). I'd go with whichever prefix style matches branches already in the repo — if you're not sure, `fix/366-csv-row-fault-collection` is the safer default since this is a bug-fix/robustness change rather than a new feature.

#### **User** (9/4/2026, 11:23:27 AM):
 give me a commit message

#### **Claude** (9/4/2026, 11:23:28 AM):
 A concise, conventional-commit style message:

```
fix(submissions): collect all CSV row faults instead of failing fast

Change the CSV parser used for submission uploads so a malformed row
is recorded as a structured fault (file, row, column count) rather
than aborting the parse. Cross-row consistency checks (fixtureId,
schemaVersion) now run against the structurally valid rows and are
merged with row-level faults into a single response, so one bad row
can no longer hide a later, independent fault. Valid rows are still
parsed where safe, and existing valid uploads remain accepted.

Adds unit tests covering multiple malformed rows, a malformed row
alongside an independent cross-row fault, and the untouched happy
path.

Closes #366
```

If you want something shorter for a single-line commit (e.g. squash merge):

```
fix(submissions): collect all CSV row faults instead of failing fast (#366)
```

#### **Claude** (9/4/2026, 11:23:43 AM):
 ```
fix: collect all CSV row faults instead of failing fast (#366)
```

#### **User** (9/4/2026, 11:23:43 AM):
 much shorter

#### **Claude** (9/4/2026, 11:24:08 AM):
 ```
fix(submissions): collect all CSV row faults instead of failing fast

Malformed rows are now recorded as structured faults (file, row,
column count) instead of aborting the parse on the first one.
Cross-row consistency checks run against the valid rows and merge
into the same response, so faults no longer hide each other. Valid
rows still parse, existing uploads still work. Adds unit tests for
multiple/mixed faults and the happy path.

Closes #366
```

#### **User** (9/4/2026, 11:24:08 AM):
 just a bit more summarized

#### **Claude** (9/4/2026, 11:24:18 AM):
 ```
fix(submissions): collect all CSV row faults instead of failing fast

Malformed rows are now reported as structured faults (file, row,
column count) instead of aborting on the first one. Faults no longer
hide each other, valid rows still parse, and existing uploads still
work. Adds tests for multiple/mixed faults.

Closes #366
```

#### **User** (9/4/2026, 11:24:18 AM):
 a bit smaller