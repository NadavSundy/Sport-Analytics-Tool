# Issue #909: Submit data intermittently fails to check signed-in submission access

Session log, Thursday 8 October 2026. Prepared with Claude Code (Claude Opus 5.5).

---

## 1. Request

> Do this issue on a separate branch and give me a git add and git commits because we use Gitea and not GitHub so I must push locally.

**Issue summary (#909, opened by GabeRaz):** Sometimes, opening `/submissions/new` while signed in shows an error panel instead of the submission form:

> **Submission access could not be checked**
> Your application role and fixture scope could not be loaded. Please try again.

**Acceptance criteria:**

- Identify and document the trigger.
- Valid authorised sessions can open Submit data repeatedly without the spurious failure.
- Transient failures offer a usable recovery path without misrepresenting permissions.
- Genuine authentication and authorisation restrictions remain enforced.
- Add regression coverage, and existing tests still pass.

Screenshot evidence: the reporter's screenshot of the error state (Chrome on Windows).

---

## 2. Investigation

| Step | Finding |
|---|---|
| Searched for the error text | Comes from `AccessError` in `apps/frontend/src/features/submissions/SubmissionPage.tsx`. |
| Read the access-check `useEffect` | Two steps: (1) `getCurrentUserProfile` → authenticated `GET /auth/me`; (2) `competitionOptions(profile)` → public competition reads. Any failure other than a 401 showed the generic "role and fixture scope" message. There was no retry and no retry button. |
| `competitionOptions` (`BatchUploadPage.tsx`) | Submitters: one `GET /competitions/:id` per scoped competition, run in parallel with `Promise.all`. Admins: paged `GET /competitions?limit=100`. These all go through `publicReadApi`, which sends no credentials. |
| Backend `/auth/me` | If token verification fails, it returns 401, which already shows the separate "session is no longer valid" message. So the reported message came from a non-401 failure: a 5xx, a network error, a contract mismatch, or a failed competition lookup. |
| Backend `app.ts` → `canonical-read-authentication.ts` (issue #821) | **Every canonical public GET without an `X-API-Key` header is rate-limited per IP address: 30 requests/minute by default (`ANONYMOUS_RATE_LIMIT_PER_MINUTE`), plus a global cap of 600/minute.** A bearer token does not exempt a request. Over the limit, the backend returns `429 RATE_LIMIT_EXCEEDED` with `Retry-After`. If the limiter store is down, it returns `503 RATE_LIMIT_UNAVAILABLE`. |
| Frontend `requestPublicApi` | Dropped the error `code` and `Retry-After` on GET failures (`postPublicApi` already kept them), so the page could not tell a rate limit apart from any other failure. |

---

## 3. Root cause

The Submit data page loads the names of the competitions a user can submit to through the **anonymous public read endpoints**. Since #821, those endpoints count every browser without an API key against a **per-IP limit of 30 requests per minute**, even when the user is signed in.

A user who browses Explore Data (which uses the same public reads) and then opens Submit data within the same minute can find the allowance already spent. The competition lookup then gets a `429`, and the page shows "Your application role and fixture scope could not be loaded", **even though the role check (`/auth/me`) succeeded**. The failure depends on how many public reads happened in the previous minute, which is why it is intermittent.

Other transient causes produce the same false message: a cold backend, a dropped connection, a gateway 5xx, or the limiter's 503.

---

## 4. Fix (frontend only)

Branch: `fix/909-submission-access-check`

### `apps/frontend/src/api/public-read.ts`
- `requestPublicApi` now passes the API error `code` and `Retry-After` (as `retryAfterSeconds`) on `ApiResponseError`, matching `postPublicApi`.

### `apps/frontend/src/features/submissions/submission-access.ts` (new)
- `loadSubmissionAccess(client, signal, sleep?)` performs the two-step access check.
- **Retries only transient failures:** network `TypeError`, 408, 425, 429 and 5xx.
  - Up to 2 retries, with backoff of 400 ms, then 1200 ms.
  - A `Retry-After` of 5 seconds or less is waited out automatically.
  - A longer `Retry-After` is reported to the user rather than waited out silently.
- **Never retries** 401, 403 or contract mismatches, so real restrictions stay enforced.
- Retry waits can be aborted, so leaving the page stops the retries.
- `SubmissionAccessError` records which step failed (`profile` or `competitions`) and why (`unauthenticated`, `not-permitted`, `rate-limited` or `unavailable`).
- `submissionAccessErrorMessage()` produces accurate wording:
  - If the competitions step fails, the message says the **submitter role was confirmed and permissions have not changed**, plus "Try again in N seconds" when the wait is known.
  - A 401 keeps the existing "session is no longer valid" message.
  - A 403 says the account is not currently permitted to submit.
- `canRetrySubmissionAccess()` returns false for 401 and 403.

### `apps/frontend/src/features/submissions/SubmissionPage.tsx`
- The access-check effect now calls `loadSubmissionAccess`.
- `AccessError` shows a **Try again** button when the failure can be retried. The button re-runs the check through an `accessAttempt` counter, with no page reload.

### Tests
- **`SubmissionPage.test.tsx`**: 4 new tests under `issue #909: transient submission access failures`.
  1. A brief 429 on the scope lookup recovers automatically, and the form loads.
  2. A dropped `/auth/me` request (`TypeError`) recovers automatically.
  3. A persistent 429 with `Retry-After: 30` is not retried automatically. The message says the role was confirmed, permissions are unchanged and the wait is 30 seconds. **Try again** then loads the form.
  4. A 401 is not retried and shows no Try again button.
- **`submission-access.test.ts`** (new): 8 unit tests with an injected sleep, so no real delays.
  - Retrying a 503.
  - Giving up after the retry limit.
  - No retry on 401 or 403.
  - No retry on a contract mismatch.
  - Waiting out a short `Retry-After`.
  - Reporting a long rate-limit window.
  - Stopping the retries when aborted.

### Verification
- Tests 1–3 **fail on the original code** and pass with the fix. Test 4 passes on both, because it guards behaviour that must not change.
- The full frontend suite passes: **50 files, 500 tests**.
- `tsc --noEmit`, eslint, prettier, dependency-cruiser and knip all pass.
- The patch applies cleanly (`git apply --check`) to `main` at `d019373b`.

---

## 5. Commands

Put `issue-909.patch` in the repository root, then run:

```bash
git checkout main && git pull
git checkout -b fix/909-submission-access-check
git apply issue-909.patch

git add apps/frontend/src/api/public-read.ts
git commit -m "fix(frontend): carry error code and Retry-After on public read failures" \
  -m "Refs #909" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QuzFjrNEbgKzyVdDM2pjpM"

git add apps/frontend/src/features/submissions/submission-access.ts apps/frontend/src/features/submissions/SubmissionPage.tsx
git commit -m "fix(submissions): retry transient access-check failures and report them accurately" \
  -m "The competition scope lookup uses public reads, which share the per-address anonymous limit from #821, so a signed-in user who had just browsed could get a 429 and see a spurious access failure. Transient failures are now retried with a bounded backoff that honours a short Retry-After, the error says when the role was confirmed, and a Try again action re-runs the check. 401/403 and contract errors are never retried." \
  -m "Refs #909" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QuzFjrNEbgKzyVdDM2pjpM"

git add apps/frontend/src/features/submissions/submission-access.test.ts apps/frontend/src/features/submissions/SubmissionPage.test.tsx
git commit -m "test(submissions): cover transient submission access failures" \
  -m "Refs #909" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QuzFjrNEbgKzyVdDM2pjpM"

git push -u origin fix/909-submission-access-check
```

**Team conventions to add yourself if needed:**
- an `Assisted-by: Claude-Code[Claude Opus 5.5]` trailer;
- a `chore(ai): record ai use for issue 909` commit adding a row to `evidence/ai/registers/<your-name>.csv`.

---

## 6. Suggested text for the issue's Resolution / Verification sections

**Resolution:** The trigger is the per-IP anonymous read limit from #821 (30 requests/minute). The page's competition-scope lookup uses public reads, so signed-in users share that allowance with their own browsing, and a `429` was reported as a role/fixture-scope failure. Transient failures (network, 408, 425, 429, 5xx) are now retried with a bounded backoff that honours a short `Retry-After`. Error messages now separate a scope-lookup failure from a role failure, and a Try again action is available. Real 401/403 refusals and contract mismatches are not retried.

**Verification:** Added 4 page tests and 8 unit tests; 3 of the page tests fail on the previous code. The full frontend suite passes (500/500), along with typecheck, lint, format, dependency-cruiser and knip. Still to do: repeated manual navigation through the signed-in account workflow on the deployed site, including opening Submit data right after heavy Explore Data browsing.

---