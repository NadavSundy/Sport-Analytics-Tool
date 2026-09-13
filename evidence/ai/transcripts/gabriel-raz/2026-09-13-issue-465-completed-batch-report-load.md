# Fix completed batch report loading

## Task

Investigate and implement Issue #465: `bug(reports): completed batch report
cannot be loaded`. The requested scope was the actual cause of HTTP 500 from
`GET /api/v1/batches/:batchReference/report`, including regression coverage
and preservation of authorization, completed batch lifecycle behaviour, and
batch-list behaviour.

## Investigation and evidence

- Reviewed the live issue, repository contribution and Git methodology, AI
  evidence requirements, and existing report route, middleware, controller,
  service, repository query, response mapping, frontend client, and reviewer
  UI.
- Confirmed the local API health endpoint responded successfully after the
  required local database migrations had been applied.
- Reproduced the user-visible failure using completed rejected batch
  `753a72fd-1965-4eca-9eba-8d3db5e8dd48`. Before the fix, the API response
  included `operation: null` for a validation-rejected source item without a
  persisted `batch_item` row. The frontend report contract permits only
  `upsert` or `correction`, so parsing rejected the otherwise valid response
  and displayed a generic loading failure.
- Ran an isolated embedded-PostgreSQL reproduction of the report query. It
  parsed and executed successfully, confirming the failure was response-shape
  compatibility rather than SQL syntax or query execution.

> [REDACTED: disposable local database credential]
>
> The original raw command used for the isolated query reproduction contained
> a local test-database password. It was removed before committing this
> evidence. No production credential, authentication token, cookie, or private
> connection string is retained here.

## Change and review

- Made the repository result type accurately nullable for `operation` because
  the report query deliberately left-joins `batch_item`.
- Normalized a missing `operation` to the existing public-contract default,
  `upsert`, in the report response mapping.
- Added a service regression test whose fixture has `operation: null` and
  asserts the public report emits `operation: 'upsert'`; it fails before the
  fix and passes afterwards.
- Kept authorization, lifecycle-state checks, and the batch-list path
  unchanged.

## Verification

- `npm run hygiene` — passed.
- `npm run check` — passed.
- Backend unit tests — 32 files and 219 tests passed.
- Backend API tests — 16 files and 166 tests passed.
- Disposable PostgreSQL tests — 18 files, 159 tests passed, 2 skipped.
- Frontend reviewer unit tests — 9 tests passed.
- `git diff --check` — passed.
- Manual signed-in browser verification — the rejected batch report loaded;
  the `PACKAGE_ITEM_INVALID` error group expanded and showed the item-level
  message: “Cricket event at source item 1. Total runs must equal off-bat runs
  plus extras.”

## Result

The implementation commit is `7c9b33f` (`fix(reports): load completed batch
reports`). Human review remains required before merge.
