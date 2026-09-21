# Manual Test Instructions

**User:** Anonymous  
**Created:** 9/17/2026 13:03:46  
**Updated:** 9/18/2026 8:47:17  
**Exported:** 9/21/2026 14:36:07  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aabc911-e3d8-83ea-afc3-6ecde479adc0](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aabc911-e3d8-83ea-afc3-6ecde479adc0)  

## Prompt:
9/17/2026, 1:04:36 PM

how do i manually test these

[Attachment: Pasted markdown.md]

## Response:
9/17/2026, 1:04:40 PM

> **Planning manual tests**
>
> I’m structuring a hands-on checklist around the issue’s required behaviors: successful API-key requests, missing or invalid keys, quota exhaustion, rate limiting, protected routes, and fallback wording.
>
> **Planned manual tests**
>
> 
>
> **Testing the acceptance criteria**
>
> I’m using the issue’s categories: valid keys, missing or invalid keys, disabled or revoked keys, quotas, rate limits, protected routes, and clear fallback behavior. Test in staging with deliberately low limits.
>
> **Tested the acceptance criteria**
>
> 
>
> **Planned manual consumer API key quota validation testing**
>
> 
>
> Worked for 39s

For **#594**, manually test it as an **external API consumer**, not through the frontend. The issue specifically requires proof for valid, invalid, disabled/revoked keys, quota exhaustion, rate limiting, alternate-route bypasses, and documentation consistency. `Pasted markdown.md` This directly supports the Intermediate brief requirement that the API issue consumer keys and enforce rate limits/quotas. `sport_analytics (1).pdf`

### 1. Set up the test environment

Use the **deployed Sprint 3 backend** if possible. You need:

```bash
export BASE_URL="https://YOUR-BACKEND-URL"
export KEY_HEADER="x-api-key"       # replace with whatever OpenAPI actually specifies
export VALID_KEY="..."
export DISABLED_KEY="..."
export REVOKED_KEY="..."
```

Also have these available from your OpenAPI docs:

```text
A protected fixture endpoint
A protected events endpoint
A protected statistics endpoint
A protected export endpoint
An anonymous/public endpoint, if one exists
An internal/admin endpoint
```

Do **not** assume the status code. #594 explicitly says the status codes/error payloads must match your documentation, so compare every result against OpenAPI. `Pasted markdown.md`

### 2. Run this manual test matrix

| Test | What to do | Pass condition |
|---|---|---|
| Anonymous/public classification | Call a documented anonymous endpoint with no key | Returns its normal successful response |
| Protected endpoint - no key | Call fixture/events/statistics/export endpoint without a key | Rejected with documented status + error body |
| Valid key | Call every protected API family with `VALID_KEY` | Normal `2xx` response |
| Invalid key | Use something like `definitely-not-a-real-key` | Rejected; no protected data returned |
| Disabled key | Disable a real key, then call protected endpoint | Rejected |
| Re-enabled key | Re-enable that same key if disabling is reversible | Works again |
| Revoked key | Revoke a separate key and retry it | Rejected; should not regain access |
| Fixture bypass | Try the normal fixture list and direct fixture-by-ID route without a key | Both protected consistently |
| Event bypass | Try event list, direct event lookup, and nested event routes without a key | All protected consistently |
| Statistics bypass | Try all alternate statistics/aggregate routes | All protected consistently |
| Export bypass | Try the export/download route without or with invalid key | Cannot export protected data |
| Rate limit | Rapidly exceed the documented per-minute limit | Requests beyond limit get documented rate-limit response |
| Daily quota | Consume all allowed daily requests and make one additional request | Additional request rejected with documented quota response |
| Isolation | Exhaust consumer A's limit, then use consumer B | B should remain usable |
| Admin/internal isolation | Try consumer key against an internal/admin route | Consumer key must not grant admin access |
| Documentation | Compare OpenAPI/docs with everything observed | Protected routes/header/error responses/limits accurately documented |

### 3. Commands for the normal key tests

First verify a valid key:

```bash
curl -i \
  -H "${KEY_HEADER}: ${VALID_KEY}" \
  "${BASE_URL}/YOUR/PROTECTED/ENDPOINT"
```

Then **no key**:

```bash
curl -i \
  "${BASE_URL}/YOUR/PROTECTED/ENDPOINT"
```

Invalid key:

```bash
curl -i \
  -H "${KEY_HEADER}: definitely-not-a-real-key" \
  "${BASE_URL}/YOUR/PROTECTED/ENDPOINT"
```

Disabled key:

```bash
curl -i \
  -H "${KEY_HEADER}: ${DISABLED_KEY}" \
  "${BASE_URL}/YOUR/PROTECTED/ENDPOINT"
```

Revoked key:

```bash
curl -i \
  -H "${KEY_HEADER}: ${REVOKED_KEY}" \
  "${BASE_URL}/YOUR/PROTECTED/ENDPOINT"
```

For each one, record both:

```text
HTTP status
JSON response body
```

### 4. The most important #594 test: bypass attempts

This is probably where bugs are most likely.

Suppose your API exposes routes resembling:

```text
/api/v1/fixtures
/api/v1/fixtures/{fixtureId}
/api/v1/fixtures/{fixtureId}/events
/api/v1/events
/api/v1/statistics
/api/v1/players/{playerId}/statistics
/api/v1/export
```

Test **every route independently** without a key.

For example:

```bash
curl -i "$BASE_URL/api/v1/fixtures"

curl -i "$BASE_URL/api/v1/fixtures/FIXTURE_ID"

curl -i "$BASE_URL/api/v1/fixtures/FIXTURE_ID/events"

curl -i "$BASE_URL/api/v1/events"

curl -i "$BASE_URL/api/v1/statistics"

curl -i "$BASE_URL/api/v1/players/PLAYER_ID/statistics"

curl -i "$BASE_URL/api/v1/export"
```

The key point is:

> You must not be able to bypass protection just because you found a different route to the same underlying data.

That directly corresponds to #594's requirement that fixture/event/statistics/export reads cannot bypass the intended controls. `Pasted markdown.md`

### 5. Rate-limit test

If your production limit is high, **do this locally/staging with a deliberately small configured limit** rather than firing hundreds of production requests.

For example, if you temporarily configure:

```text
3 requests/minute
```

run:

```bash
for i in {1..5}; do
  echo "===== REQUEST $i ====="
  curl -s -i \
    -H "${KEY_HEADER}: ${VALID_KEY}" \
    "${BASE_URL}/YOUR/PROTECTED/ENDPOINT"
  echo
done
```

Expected behaviour conceptually:

```text
Request 1 -> allowed
Request 2 -> allowed
Request 3 -> allowed
Request 4 -> rate-limit rejection
Request 5 -> rate-limit rejection
```

After the window resets, the key should work again.

Also verify the error is the **same structure documented in OpenAPI**.

### 6. Daily quota test

This is easiest with a test consumer that has a tiny quota, such as:

```text
Daily quota = 5
Rate limit = comfortably above 5/minute
```

Then:

```bash
for i in {1..6}; do
  echo "===== REQUEST $i ====="
  curl -s -i \
    -H "${KEY_HEADER}: ${VALID_KEY}" \
    "${BASE_URL}/YOUR/PROTECTED/ENDPOINT"
  echo
done
```

You want:

```text
1-5  -> allowed
6    -> quota exceeded
```

Be careful that your **per-minute limiter does not trigger first**. Otherwise you haven't actually tested the daily quota.

Then try the same exhausted key against another protected endpoint:

```bash
curl -i \
  -H "${KEY_HEADER}: ${VALID_KEY}" \
  "${BASE_URL}/YOUR/OTHER/PROTECTED/ENDPOINT"
```

If quotas are consumer-wide, changing routes must **not bypass the quota**.

### 7. Test consumer isolation

Have two keys:

```bash
export KEY_A="..."
export KEY_B="..."
```

Exhaust A.

Then:

```bash
curl -i \
  -H "${KEY_HEADER}: ${KEY_B}" \
  "${BASE_URL}/YOUR/PROTECTED/ENDPOINT"
```

Key B should still work.

Otherwise your implementation may accidentally be rate-limiting **the whole API** rather than the individual consumer.

### 8. What I would save as evidence

For #594, create one manual-test evidence document with a table like:

| ID | Scenario | Endpoint | Expected | Actual | Result |
|---|---|---|---|---|---|
| M594-01 | Valid key | `/api/v1/...` | `2xx` | `200` | PASS |
| M594-02 | Missing key | `/api/v1/...` | documented rejection | `...` | PASS |
| M594-03 | Invalid key | `/api/v1/...` | documented rejection | `...` | PASS |
| M594-04 | Disabled key | `/api/v1/...` | rejection | `...` | PASS |
| M594-05 | Revoked key | `/api/v1/...` | rejection | `...` | PASS |
| M594-06 | Rate limit exceeded | `/api/v1/...` | documented limit response | `...` | PASS |
| M594-07 | Daily quota exceeded | `/api/v1/...` | documented quota response | `...` | PASS |
| M594-08 | Fixture bypass | alternate fixture route | rejected | `...` | PASS |
| M594-09 | Event bypass | alternate event route | rejected | `...` | PASS |
| M594-10 | Statistics bypass | alternate stats route | rejected | `...` | PASS |
| M594-11 | Export bypass | export route | rejected | `...` | PASS |
| M594-12 | Consumer isolation | key B after A exhausted | B succeeds | `...` | PASS |

Save the raw terminal output as well. That gives you strong evidence for the issue rather than just writing "manually tested."

**One important distinction:** #594 also references #595, which is about sharing rate-limit state across multiple backend instances. That needs a slightly different deployment-level test; the procedure above verifies #594's consumer policy itself.

If you paste your **actual OpenAPI routes/API-key header and current limits**, I can turn this into the **exact commands you can copy-paste against Stat'sTheGame**, with no placeholders.

## Prompt:
9/17/2026, 1:07:44 PM

> export BASE_URL="https://YOUR-BACKEND-URL"
>     export KEY_HEADER="x-api-key"       # replace with whatever OpenAPI actually specifies
>     export VALID_KEY="..."
>     export DISABLED_KEY="..."
>     export REVOKED_KEY="...

where do i find these?

## Response:
9/17/2026, 1:08:05 PM

> **Locating configuration values**
>
> I’ll find these in the frontend environment files, API documentation, backend authentication middleware, and deployment settings. Search for `API_BASE`, `securitySchemes`, header names, key-status fields, and admin-key configuration; browser Network requests can confirm runtime values.
>
> Worked for 8s

Find them from your repo/deployed app rather than guessing. For #594, these values should come from your API configuration/docs and the consumer-key management implementation. `Pasted markdown.md`

From the repo root, run these searches.

### 1. `BASE_URL`

The quickest way is your deployed frontend:

1. Open Stat'sTheGame.
2. Press **F12 → Network**.
3. Refresh.
4. Click any request to your backend.
5. Look at **Request URL**.

If you see something like:

```text
https://statsthegame-api-....azurewebsites.net/api/v1/fixtures
```

then:

```bash
export BASE_URL="https://statsthegame-api-....azurewebsites.net"
```

You can also search the repo:

```bash
rg -n "VITE_.*API|API_BASE|BASE_URL|azurewebsites.net|pages.dev" \
  apps docs .github .gitea 2>/dev/null
```

And check environment files:

```bash
find . -maxdepth 4 -type f \
  \( -name ".env*" -o -name "wrangler.toml" -o -name "azure*.yml" \) \
  -print
```

---

### 2. `KEY_HEADER`

This should be defined in **OpenAPI**. Your repo has previously been validating:

```text
docs/api/openapi.yaml
```

Run:

```bash
rg -n -C 8 "securitySchemes|apiKey|in: header" docs/api/openapi.yaml
```

You are looking for something like:

```yaml
securitySchemes:
  ConsumerApiKey:
    type: apiKey
    in: header
    name: X-API-Key
```

If it says:

```yaml
name: X-API-Key
```

then use:

```bash
export KEY_HEADER="X-API-Key"
```

Do **not** assume mine was correct when I wrote `x-api-key`; use whatever your OpenAPI actually specifies. #594 explicitly requires the protected API surface and responses to be documented. `Pasted markdown.md`

A broader repo search is:

```bash
rg -ni "x-api-key|api[_-]?key|consumer[_-]?key|apikey" \
  apps packages docs tests
```

---

### 3. `VALID_KEY`

This is an actual consumer API key that has been issued by your system.

First find how your project issues keys:

```bash
rg -ni "issue.*key|create.*key|generate.*key|api.?key|consumer.?key" \
  apps/backend/src apps/frontend/src docs
```

Also search for consumer/admin routes:

```bash
rg -ni "consumer|api.?key" apps/backend/src/modules
```

You will probably find either:

```text
POST /.../api-keys
POST /.../consumers
```

or an admin page for creating consumer keys.

Create a **new test consumer/key**. When your app returns the raw key, save it:

```bash
export VALID_KEY="the-raw-key-that-was-generated"
```

Important: API keys are commonly stored in the database as a **hash**. If your implementation does that, you cannot copy the DB value and use it as the API key. You need the raw key shown when the key is created.

---

### 4. `DISABLED_KEY`

Don't hunt for some special existing disabled key. The easiest manual test is usually:

```text
Create test key A
        ↓
verify it works
        ↓
disable test key A
        ↓
retry same raw key
```

Search for the disable mechanism:

```bash
rg -ni "disable|disabled|enabled" \
  apps/backend/src apps/frontend/src docs
```

Once you know the raw key:

```bash
export DISABLED_KEY="raw-key-A"
```

Then disable **that consumer/key through your admin UI/API** before performing the disabled-key test.

---

### 5. `REVOKED_KEY`

Same idea. Create another test key so you don't destroy the one you need for the other tests.

```text
Key A = valid
Key B = disable test
Key C = revoke test
```

Find the revoke implementation:

```bash
rg -ni "revoke|revoked" \
  apps/backend/src apps/frontend/src docs tests
```

Then:

```bash
export REVOKED_KEY="raw-key-C"
```

Revoke C through whatever API/admin functionality your system provides, then call the analytics API using that same raw key.

---

### Fastest way to locate everything

Run this exact command from the repository root:

```bash
printf '\n=== API URL CONFIG ===\n'
rg -n "VITE_.*API|API_BASE|BASE_URL|azurewebsites.net" apps docs .github .gitea 2>/dev/null || true

printf '\n=== OPENAPI API KEY DEFINITION ===\n'
rg -n -C 8 "securitySchemes|apiKey|in: header" docs/api/openapi.yaml 2>/dev/null || true

printf '\n=== API KEY IMPLEMENTATION ===\n'
rg -ni "api.?key|consumer.?key|apikey" apps/backend/src apps/frontend/src docs 2>/dev/null || true

printf '\n=== DISABLE / REVOKE ===\n'
rg -ni "disable|disabled|revoke|revoked" apps/backend/src apps/frontend/src docs 2>/dev/null || true
```

**Paste the output of that command here.** I can then tell you the exact `BASE_URL`, exact header name, and exactly how to create the three test keys for your implementation.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 1:09:37 PM

give me 1 command to find them
also look through the docs and let me know if they there [https://sports-analytics-tool.pages.dev](https://sports-analytics-tool.pages.dev)

## Response:
9/17/2026, 1:09:41 PM

> **Reviewing documentation guidance**
>
> I’m checking the referenced documentation for where API keys, backend URLs, environment variables, and authentication headers are described. I’ll also provide one repository-search command, while distinguishing documented configuration from actual secret values.
>
> **Cross-checking configuration**
>
> I’m checking the docs for the four key states and configuration names, then I’ll compare those findings against the repository. I’m also watching for any mismatch between documented and required key behavior.
>
> **Reviewed documentation guidance and cross-checked configuration**
>
> 
>
> **Searched 1 website**
>
> 
>
> Worked for 27s

Run this **single command from the repo root**:

```bash
bash -lc 'rg -n -uu --hidden -S "VITE_API_BASE_URL|azurewebsites\.net|X-API-Key|sat_live_|rateLimitPerMinute|dailyQuota|api-consumers|revoke|revoked|disable|disabled" . -g "!node_modules" -g "!dist" -g "!coverage" -g "!.git" | sed -E "s/(sat_live_)[A-Za-z0-9._-]+/\1<REDACTED>/g"'
```

That searches code, docs, ignored `.env` files, tests, and config, while masking any `sat_live_...` key it happens to find.

I checked your live documentation. Here is what is already documented:

| Item | In docs? | Value / location |
|---|---|---|
| `BASE_URL` | **Yes** | `https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net` |
| API base path | **Yes** | `/api/v1` |
| API-key header | **Yes** | `X-API-Key` |
| Key format | **Yes** | `sat_live_<secret>` |
| How to create a key | **Yes** | `POST /api/v1/admin/api-consumers` |
| Default rate limit | **Yes** | `60 requests/minute` |
| Default daily quota | **Yes** | `10,000/day`, UTC |
| Revoked-key behaviour | **Yes** | `401 API_KEY_UNAUTHORIZED` |
| Rate/quota exceeded | **Yes** | `429` |
| Actual `VALID_KEY` | **No - intentionally** | Secret is returned only when issued/rotated |
| Actual `REVOKED_KEY` | **No - intentionally** | You need to create a key, save it, then revoke it |
| Actual `DISABLED_KEY` | **No** | I don't see a documented disable-key lifecycle |

The API overview explicitly gives the deployed development backend URL. ([Sports Analytics Tool](https://sports-analytics-tool.pages.dev/api/overview/)) The environment documentation also confirms `VITE_API_BASE_URL` is the frontend variable pointing at the handwritten backend. ([Sports Analytics Tool](https://sports-analytics-tool.pages.dev/environment/))

More importantly, your **Consumer API Keys and Limits** page already tells us exactly how the keys work. An admin creates a consumer with:

```http
POST /api/v1/admin/api-consumers
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Partner dashboard",
  "rateLimitPerMinute": 60,
  "dailyQuota": 10000
}
```

The `201` response returns `data.apiKey` **once only**. The docs explicitly say later GETs never return the raw secret. ([Sports Analytics Tool](https://sports-analytics-tool.pages.dev/api/consumer-keys/))

So for manual testing your known values are already:

```bash
export BASE_URL="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"
export KEY_HEADER="X-API-Key"
```

The actual key must be **issued by the application**; you should not expect to find it in Git. The docs also state that consumer requests send it as:

```http
X-API-Key: sat_live_<secret>
```

and unknown/revoked keys return `401`. ([Sports Analytics Tool](https://sports-analytics-tool.pages.dev/api/consumer-keys/))

There is one important issue with **#594**: the live docs currently say the keyed consumer endpoints are only:

```text
GET /api/v1/consumer/competitions
GET /api/v1/consumer/fixtures
```

([Sports Analytics Tool](https://sports-analytics-tool.pages.dev/api/consumer-keys/))

But #594 requires the consumer-key policy to cover the wider quota-controlled analytics surface and prevent fixture/event/statistics/export bypasses. `Pasted markdown.md` So if your implementation has now expanded that surface, **the live docs appear not to have been updated yet**. The API overview likewise says the keyed surface currently provides competition and fixture reads. ([Sports Analytics Tool](https://sports-analytics-tool.pages.dev/api/overview/))

Also, I do **not** see a documented `disabled` API-key state on the current consumer-key page. It documents unknown, malformed and revoked keys, plus rotation/revocation. ([Sports Analytics Tool](https://sports-analytics-tool.pages.dev/api/consumer-keys/)) Since #594 explicitly says “valid, invalid, disabled and revoked keys behave as documented,” that is something I would verify in the implementation/docs before closing the issue.

Paste the output of that one command and I can tell you exactly which routes to hit and how to create the test key.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

---

**Sources:**

- [Overview - Sport Analytics Tool](https://sports-analytics-tool.pages.dev/api/overview/)

## Prompt:
9/17/2026, 1:11:34 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ bash -lc 'rg -n -uu --hidden -S "VITE_API_BASE_URL|azurewebsites\.net|X-API-Key|sat_live_|rateLimitPerMinute|dailyQuota|api-consumers|revoke|revoked|disable|disabled" . -g "!node_modules" -g "!dist" -g "!coverage" -g "!.git" | sed -E "s/(sat_live_)[A-Za-z0-9._-]+/\1<REDACTED>/g"'
bash: line 1: rg: command not found
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 1:11:44 PM

`rg` (ripgrep) just isn't installed in your WSL environment. Use this **single command instead**; it does the same search with standard `grep`:

```bash
grep -RInE --binary-files=without-match \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=coverage \
  --exclude-dir=.git \
  'VITE_API_BASE_URL|azurewebsites\.net|X-API-Key|sat_live_|rateLimitPerMinute|dailyQuota|api-consumers|revoke|revoked|disable|disabled' . \
  2>/dev/null | sed -E 's/(sat_live_)[A-Za-z0-9._-]+/\1<REDACTED>/g'
```

It will search your **code, docs, config, tests, and `.env` files**, while hiding any actual `sat_live_...` secret it encounters.

Paste the output here and I'll extract:

- the exact backend `BASE_URL`
- exact API-key header
- how/where to generate a valid test key
- whether disabled/revoked states actually exist
- the configured rate limit and daily quota
- the exact commands to manually test #594

You do **not** need to install `rg` for this.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 1:15:29 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ grep -RInE --binary-files=without-match \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=coverage \
  --exclude-dir=.git \
  'VITE_API_BASE_URL|azurewebsites\.net|X-API-Key|sat_live_|rateLimitPerMinute|dailyQuota|api-consumers|revoke|revoked|disable|disabled' . \
  2>/dev/null | sed -E 's/(sat_live_)[A-Za-z0-9._-]+/\1<REDACTED>/g'
./.gitea/workflows/ci.yml:403:      FRONTEND_URL: https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net
./.gitea/workflows/ci.yml:422:          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
./.gitea/workflows/ci.yml:427:          for name in AZURE_FRONTEND_PUBLISH_PROFILE VITE_API_BASE_URL VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY; do
./.gitea/workflows/ci.yml:441:          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
./.gitea/workflows/ci.yml:476:      BACKEND_URL: https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net
./.gitea/workflows/deploy-backend.yml:12:      BACKEND_URL: https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net
./.gitea/workflows/deploy-frontend.yml:11:      FRONTEND_URL: https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net
./.gitea/workflows/deploy-frontend.yml:30:          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
./.gitea/workflows/deploy-frontend.yml:35:          for name in AZURE_FRONTEND_PUBLISH_PROFILE VITE_API_BASE_URL VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY; do
./.gitea/workflows/deploy-frontend.yml:49:          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
./AGENTS.md:431:Never disable, delete, skip, loosen, or weaken tests merely to obtain a passing result.
./apps/backend/README.md:99:Do not disable TLS certificate verification to bypass a connection error.
./apps/backend/README.md:159:approves a pending request, replaces an approved submitter's complete scope, or revokes approved
./apps/backend/README.md:168:request state, scopes, or audit data. Administrator and disabled targets are protected, and
./apps/backend/src/app.ts:65:import { createApiConsumerRouter } from './modules/api-consumers/api-consumer.routes';
./apps/backend/src/app.ts:69:} from './modules/api-consumers/api-consumer.service';
./apps/backend/src/app.ts:73:} from './modules/api-consumers/api-consumer.repository';
./apps/backend/src/app.ts:74:import { createConsumerRouter } from './modules/api-consumers/consumer.routes';
./apps/backend/src/app.ts:75:import { createConsumerAuthentication } from './modules/api-consumers/consumer-authentication';
./apps/backend/src/app.ts:180:  app.disable('x-powered-by');
./apps/backend/src/middleware/require-authentication.ts:50:      if (account.disabled && !options.allowDisabledAccount?.(account)) {
./apps/backend/src/modules/account-deletion/account-deletion.errors.ts:15:      'Account deletion could not be completed. The account remains disabled and can be retried.',
./apps/backend/src/modules/account-deletion/account-deletion.repository.ts:48:              disabled_at = COALESCE(disabled_at, now()),
./apps/backend/src/modules/account-deletion/account-deletion.repository.ts:167:              disabled_at = COALESCE(disabled_at, now()),
./apps/backend/src/modules/account-deletion/account-deletion.service.ts:49:    // The account was disabled by prepare(). A failed status write must not
./apps/backend/src/modules/accounts/account.repository.ts:20:  disabledAt: Date | null;
./apps/backend/src/modules/accounts/account.repository.ts:56:          disabled_at,
./apps/backend/src/modules/accounts/account.repository.ts:76:              AND app_user.disabled_at IS NULL
./apps/backend/src/modules/accounts/account.repository.ts:82:              AND app_user.disabled_at IS NULL
./apps/backend/src/modules/accounts/account.repository.ts:94:          disabled_at,
./apps/backend/src/modules/accounts/account.repository.ts:121:        account.disabled_at AS "disabledAt",
./apps/backend/src/modules/accounts/account.repository.ts:136:        account.disabled_at,
./apps/backend/src/modules/accounts/account.repository.ts:179:    disabled: account.disabledAt !== null,
./apps/backend/src/modules/accounts/account.ts:26:  disabled: boolean;
./apps/backend/src/modules/admin/admin-access-policy.ts:10:export type SubmitterAccessTransition = 'approve' | 'reject' | 'scope' | 'reject_scope' | 'revoke';
./apps/backend/src/modules/admin/admin-access-policy.ts:11:export type SubmitterAccessAction = 'grant' | 'reject' | 'revoke';
./apps/backend/src/modules/admin/admin-access-policy.ts:36:  if (action === 'revoke' && isApprovedSubmitter) {
./apps/backend/src/modules/admin/admin-access-policy.ts:37:    return 'revoke';
./apps/backend/src/modules/admin/admin.repository.ts:31:  disabledAt: Date | null;
./apps/backend/src/modules/admin/admin.repository.ts:44:  disabledAt: Date | null;
./apps/backend/src/modules/admin/admin.repository.ts:93:    managed.disabled_at AS "disabledAt",
./apps/backend/src/modules/admin/admin.repository.ts:102:        AND history.action = 'revoked'
./apps/backend/src/modules/admin/admin.repository.ts:149:    disabled: row.disabledAt !== null,
./apps/backend/src/modules/admin/admin.repository.ts:250:          account.disabled_at AS "disabledAt"
./apps/backend/src/modules/admin/admin.repository.ts:278:    if (target.disabledAt) {
./apps/backend/src/modules/admin/admin.repository.ts:383:      transition === 'revoke'
./apps/backend/src/modules/admin/admin.repository.ts:399:              : 'revoked',
./apps/backend/src/modules/admin/admin.repository.ts:444:        update.approved ? 'grant' : 'revoke',
./apps/backend/src/modules/admin/admin.repository.ts:465:              false AS "requestedCompetitionAlreadyGranted", disabled_at AS "disabledAt"
./apps/backend/src/modules/admin/admin.repository.ts:472:        if (target.disabledAt) {
./apps/backend/src/modules/api-consumers/api-consumer.controller.ts:84:      .revoke(account(response), request.params.consumerId, request.params.keyId)
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:10:  rateLimitPerMinute: number;
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:11:  dailyQuota: number;
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:20:  revokedAt: Date | null;
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:25:  rateLimitPerMinute: number;
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:26:  dailyQuota: number;
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:33:  revoke(ownerAccountId: string, consumerId: string, keyId: string): Promise<void>;
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:52:    rateLimitPerMinute: row.rateLimitPerMinute,
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:53:    dailyQuota: row.dailyQuota,
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:59:      revokedAt: key.revokedAt?.toISOString() ?? null,
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:71:      rate_limit_per_minute AS "rateLimitPerMinute", daily_quota AS "dailyQuota", created_at AS "createdAt"
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:80:      key_prefix AS prefix, created_at AS "createdAt", revoked_at AS "revokedAt"
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:95:           RETURNING api_consumer_id::text AS id, name, rate_limit_per_minute AS "rateLimitPerMinute",
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:96:             daily_quota AS "dailyQuota", created_at AS "createdAt"`,
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:97:          [ownerAccountId, issue.name, issue.rateLimitPerMinute, issue.dailyQuota],
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:130:          `UPDATE api_consumer_key SET revoked_at = now()
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:131:          WHERE api_consumer_id = $1 AND revoked_at IS NULL`,
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:143:    async revoke(ownerAccountId, consumerId, keyId) {
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:146:        `UPDATE api_consumer_key SET revoked_at = now()
./apps/backend/src/modules/api-consumers/api-consumer.repository.ts:147:         WHERE api_consumer_key_id = $1 AND revoked_at IS NULL
./apps/backend/src/module

## Response:
9/17/2026, 1:15:44 PM

> **Interpreting repository results**
>
> I’m reading this as a request to interpret the grep output. It identifies API-key routes and storage fields, but not the actual quota defaults. I’d inspect the referenced authentication and billing files next.
>
> **Interpreted repository results**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 13s

Good - this already tells us quite a lot.

From your output:

```bash
BASE_URL="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"
```

Your consumer-key implementation is definitely here:

```text
apps/backend/src/modules/api-consumers/
```

and **revocation definitely exists**:

```text
api-consumer.controller.ts
api-consumer.repository.ts
```

with `revokedAt` / `revoked_at` and a `revoke(...)` operation.

I do **not** see evidence of a separate **disabled API-consumer key state** in that output. The `disabled` matches shown are mostly normal user-account disabling. That is worth checking because #594 explicitly mentions valid, invalid, disabled and revoked keys. `Pasted markdown.md`

Run this **one command next**. It will show the exact header, routes, defaults, key creation/rotation/revocation code, and relevant OpenAPI documentation:

```bash
for f in \
  apps/backend/src/modules/api-consumers/*.ts \
  docs/api/openapi.yaml; do
  [ -f "$f" ] || continue
  echo
  echo "==================== $f ===================="
  grep -nEi -C 4 \
    'X-API-Key|apiKey|api-consumers|consumer/|rateLimitPerMinute|dailyQuota|rate.?limit|quota|revoke|revoked|disable|disabled|rotate|sat_live_|router\.(get|post|patch|put|delete)|default' \
    "$f" 2>/dev/null
done
```

### What we know already

| Needed value | Status |
|---|---|
| Backend URL | ✅ Found |
| API consumer module | ✅ Found |
| Rate-limit fields | ✅ Found |
| Daily-quota fields | ✅ Found |
| Revocation support | ✅ Found |
| Actual numeric rate limit | ⏳ Need next output |
| Actual numeric daily quota | ⏳ Need next output |
| API-key header | ⏳ Need next output |
| API-key creation endpoint | ⏳ Need next output |
| Protected consumer routes | ⏳ Need next output |
| Raw valid key | ❌ Won't normally be stored in Git |
| Disabled consumer-key state | ⚠️ Not evident yet |

Also, **do not search Git for an actual valid API key**. Your code appears structured correctly around issuing consumer keys; a usable raw key should normally be obtained when a test consumer is created rather than committed to the repository.

Once you paste the output of that command, I can give you the exact sequence:

```text
1. Create test consumer
2. Copy raw key
3. Test valid key
4. Test no key
5. Test invalid key
6. Revoke key
7. Test revoked key
8. Trigger rate limit
9. Trigger daily quota
10. Test alternate-route bypasses
```

with **copy-paste commands using your actual routes**, not placeholders.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 1:16:57 PM

[Attachment: Pasted text.txt]

## Response:
9/17/2026, 1:16:59 PM

> **Testing API readiness**
>
> I’m seeing incomplete documentation: protected fixture-detail, events, export, and statistics routes aren’t reflected in the OpenAPI snippet. I’d now run authenticated smoke tests, verify key creation, confirm headers, and check the disabled state plus schema defaults.
>
> **Tested API readiness**
>
> 
>
> **Planning smoke tests**
>
> I’m preparing manual checks for key creation, missing or invalid authentication, valid access, revocation, quotas, and protected fixture routes. I’m also flagging that the current implementation appears to support revocation, not a distinct disabled state.
>
> **Planned smoke tests**
>
> 
>
> Worked for 19s

The output gives enough to make the manual test concrete. It also exposes **two things you should not mark as complete yet**: there is no consumer-key `disabled` state, and OpenAPI appears to document only two of the protected consumer routes even though the backend protects many more. `Pasted text.txt`

### What we now know

```bash
BASE_URL="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"
KEY_HEADER="X-API-Key"
KEY_FORMAT="sat_live_<43 chars>"
```

The backend protects all of these with the same consumer authentication middleware:

```text
GET /api/v1/consumer/competitions
GET /api/v1/consumer/fixtures
GET /api/v1/consumer/fixtures/:fixtureId
GET /api/v1/consumer/fixtures/:fixtureId/events
GET /api/v1/consumer/fixtures/:fixtureId/events/export.json
GET /api/v1/consumer/fixtures/:fixtureId/events/export.csv
GET /api/v1/consumer/fixtures/:fixtureId/events/:eventId
GET /api/v1/consumer/fixtures/:fixtureId/statistics
GET /api/v1/consumer/fixtures/:fixtureId/statistics/:statisticId
GET /api/v1/consumer/fixtures/:fixtureId/statistics/:statisticId/events/export.json
GET /api/v1/consumer/fixtures/:fixtureId/statistics/:statisticId/events/export.csv
GET /api/v1/consumer/participants/:participantId/statistics
GET /api/v1/consumer/participants/:participantId/statistics/:statisticId
```

The key-management endpoints are:

```text
GET    /api/v1/admin/api-consumers
POST   /api/v1/admin/api-consumers
POST   /api/v1/admin/api-consumers/:consumerId/keys/rotate
DELETE /api/v1/admin/api-consumers/:consumerId/keys/:keyId
```

The implementation also confirms:

```text
invalid/missing/revoked -> 401 API_KEY_UNAUTHORIZED
rate exceeded            -> 429 RATE_LIMIT_EXCEEDED
daily quota exceeded     -> 429 QUOTA_EXCEEDED
```

And defaults are:

```text
60 requests/minute
10,000 requests/day
```

For manual testing, don't use those defaults. Create tiny test consumers.

## 1. Get your admin bearer token

Log into the deployed app as an **administrator**.

Open:

```text
F12 → Network
```

Click a backend request requiring authentication and copy the value after:

```text
Authorization: Bearer ...
```

Then in WSL run:

```bash
read -rsp "Paste admin bearer token: " ADMIN_TOKEN; echo
export ADMIN_TOKEN
export BASE_URL="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"
```

Using `read -s` prevents the token being printed into the terminal/history.

## 2. Create an easy-to-test consumer

Use a consumer with a high enough quota but a rate limit of `3`:

```bash
curl -sS -X POST \
  "$BASE_URL/api/v1/admin/api-consumers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manual Test #594 Rate Limit",
    "rateLimitPerMinute": 3,
    "dailyQuota": 100
  }' | tee /tmp/consumer-594.json | python3 -m json.tool
```

You should get something containing:

```json
{
  "data": {
    "id": "...",
    "apiKey": "sat_live_...",
    "keys": [
      {
        "id": "..."
      }
    ]
  }
}
```

Now automatically load the important values:

```bash
export VALID_KEY="$(python3 -c 'import json; print(json.load(open("/tmp/consumer-594.json"))["data"]["apiKey"])')"
export CONSUMER_ID="$(python3 -c 'import json; print(json.load(open("/tmp/consumer-594.json"))["data"]["id"])')"
export KEY_ID="$(python3 -c 'import json; print(json.load(open("/tmp/consumer-594.json"))["data"]["keys"][0]["id"])')"

echo "Consumer: $CONSUMER_ID"
echo "Key ID:   $KEY_ID"
echo "API key loaded into \$VALID_KEY"
```

Don't print `$VALID_KEY` into evidence/screenshots.

## 3. Valid key

```bash
curl -i \
  -H "X-API-Key: $VALID_KEY" \
  "$BASE_URL/api/v1/consumer/competitions"
```

You want:

```text
HTTP 200

RateLimit-Limit: 3
RateLimit-Remaining: ...
RateLimit-Reset: ...
X-Quota-Limit: 100
X-Quota-Remaining: ...
X-Quota-Reset: ...
```

This proves authentication and both limit systems are active.

## 4. Missing key

```bash
curl -i "$BASE_URL/api/v1/consumer/competitions"
```

Expected:

```text
HTTP 401
WWW-Authenticate: ApiKey
```

with:

```json
{
  "error": {
    "code": "API_KEY_UNAUTHORIZED",
    "message": "A valid active API key is required."
  }
}
```

That response comes directly from your middleware. `Pasted text.txt`

## 5. Invalid key

```bash
curl -i \
  -H "X-API-Key: sat_live_definitely_invalid" \
  "$BASE_URL/api/v1/consumer/competitions"
```

Expected:

```text
401 API_KEY_UNAUTHORIZED
```

Also test a correctly shaped but nonexistent key:

```bash
curl -i \
  -H "X-API-Key: sat_live_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" \
  "$BASE_URL/api/v1/consumer/competitions"
```

Expected again:

```text
401 API_KEY_UNAUTHORIZED
```

That is useful because it separately checks malformed-key rejection and unknown-valid-format-key rejection.

## 6. Rate limit

Because you created the consumer with:

```text
3 requests/minute
```

wait around 60 seconds after your earlier requests, then run:

```bash
for i in {1..5}; do
  echo
  echo "========== REQUEST $i =========="
  curl -sS -i \
    -H "X-API-Key: $VALID_KEY" \
    "$BASE_URL/api/v1/consumer/competitions" |
    grep -Ei 'HTTP/|RateLimit-|Retry-After|X-Quota-|RATE_LIMIT_EXCEEDED|QUOTA_EXCEEDED'
done
```

Expected:

```text
Request 1 -> 200
Request 2 -> 200
Request 3 -> 200
Request 4 -> 429 RATE_LIMIT_EXCEEDED
Request 5 -> 429 RATE_LIMIT_EXCEEDED
```

The `429` should include:

```text
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
Retry-After
```

## 7. Daily quota

Create a **different** consumer so the per-minute limit doesn't interfere:

```bash
curl -sS -X POST \
  "$BASE_URL/api/v1/admin/api-consumers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manual Test #594 Daily Quota",
    "rateLimitPerMinute": 100,
    "dailyQuota": 5
  }' | tee /tmp/quota-594.json | python3 -m json.tool
```

Load its key:

```bash
export QUOTA_KEY="$(python3 -c 'import json; print(json.load(open("/tmp/quota-594.json"))["data"]["apiKey"])')"
```

Then:

```bash
for i in {1..6}; do
  echo
  echo "========== REQUEST $i =========="
  curl -sS -i \
    -H "X-API-Key: $QUOTA_KEY" \
    "$BASE_URL/api/v1/consumer/competitions" |
    grep -Ei 'HTTP/|RateLimit-|Retry-After|X-Quota-|RATE_LIMIT_EXCEEDED|QUOTA_EXCEEDED'
done
```

Expected:

```text
1 -> 200
2 -> 200
3 -> 200
4 -> 200
5 -> 200
6 -> 429 QUOTA_EXCEEDED
```

The sixth should show:

```text
X-Quota-Limit: 5
X-Quota-Remaining: 0
X-Quota-Reset: ...
```

## 8. Revoked key

Your implementation definitely supports this. `Pasted text.txt`

First let the current rate-limit window reset and verify:

```bash
curl -i \
  -H "X-API-Key: $VALID_KEY" \
  "$BASE_URL/api/v1/consumer/competitions"
```

Then revoke it:

```bash
curl -i -X DELETE \
  "$BASE_URL/api/v1/admin/api-consumers/$CONSUMER_ID/keys/$KEY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected:

```text
204 No Content
```

Now retry the **same raw key**:

```bash
curl -i \
  -H "X-API-Key: $VALID_KEY" \
  "$BASE_URL/api/v1/consumer/competitions"
```

Expected:

```text
401
API_KEY_UNAUTHORIZED
```

That directly proves revoked keys stop working.

## 9. Bypass testing

First obtain a fixture using the valid **quota consumer**:

```bash
curl -sS \
  -H "X-API-Key: $QUOTA_KEY" \
  "$BASE_URL/api/v1/consumer/fixtures" |
  python3 -m json.tool
```

You may have exhausted that tiny quota already, so creating another normal testing consumer may be easier.

Copy one fixture ID and:

```bash
export FIXTURE_ID="PUT_THE_ID_HERE"
```

Then deliberately try protected routes **with no API key**:

```bash
for path in \
  "/api/v1/consumer/fixtures" \
  "/api/v1/consumer/fixtures/$FIXTURE_ID" \
  "/api/v1/consumer/fixtures/$FIXTURE_ID/events" \
  "/api/v1/consumer/fixtures/$FIXTURE_ID/events/export.json" \
  "/api/v1/consumer/fixtures/$FIXTURE_ID/events/export.csv" \
  "/api/v1/consumer/fixtures/$FIXTURE_ID/statistics"; do
  echo
  echo "===== $path ====="
  curl -sS -i "$BASE_URL$path" | head -n 12
done
```

Every one should return:

```text
401 API_KEY_UNAUTHORIZED
```

If **any one gives data**, you've found the bypass bug #594 was intended to prevent.

---

## Two problems revealed by your code

### Problem 1 - `disabled` API keys do not appear to exist

Your consumer key model contains:

```text
createdAt
revokedAt
```

and active lookup checks:

```sql
WHERE key.key_hash = $1
AND key.revoked_at IS NULL
```

There is no:

```text
disabled
disabledAt
enabled
```

for API consumer keys. The `disabled` references elsewhere are **user accounts**, not consumer keys. `Pasted text.txt`

So the #594 acceptance criterion:

> Valid, invalid, disabled and revoked keys behave as documented.

cannot currently be demonstrated as written.

You need to choose one of these before closing #594:

```text
A. Implement a genuine disabled API-consumer/key lifecycle.

or

B. Confirm with the issue owner/client that "disabled" was erroneous,
   remove it from the acceptance criterion, and retain revoked as the
   supported inactive state.
```

Do **not** claim the existing account disabling feature satisfies this; it's a different security principal.

### Problem 2 - OpenAPI appears incomplete

Backend `consumer.routes.ts` protects all the fixture/event/export/statistics/participant routes listed above. `Pasted text.txt`

But your grep output shows OpenAPI consumer definitions only for:

```text
/api/v1/consumer/competitions
/api/v1/consumer/fixtures
```

with `apiKeyAuth`.

I don't see OpenAPI entries in this output for:

```text
/consumer/fixtures/{fixtureId}
/consumer/fixtures/{fixtureId}/events
/consumer/.../export
/consumer/.../statistics
/consumer/participants/...
```

That conflicts with #594's acceptance criterion that **API documentation identifies the protected surface**. `Pasted markdown.md`

So technically, before #594 closes, I would treat the status as:

```text
Implementation protection:       looks implemented ✅
Missing/invalid key handling:     implemented ✅
Revocation:                       implemented ✅
Per-consumer quota:               implemented ✅
Per-minute limiting:              implemented ✅
Protected alternate routes:       implemented in router ✅
Disabled-key behaviour:           missing / unclear ❌
OpenAPI full protected surface:   apparently incomplete ❌
Manual deployed verification:     still required ⏳
User feedback gate:               separate #607 ⏳
```

One more architectural concern: the rate limiter is an in-memory `Map`, so #595 is still necessary for multiple backend instances; your pasted code confirms that issue is real rather than redundant. `Pasted text.txt`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 1:27:08 PM

read -rsp "Paste admin bearer token: " ADMIN_TOKEN; echo
export ADMIN_TOKEN
export BASE_URL="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"

Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6ImU5YTZmOTBhLTJkMTItNDIwMS1iYjFmLTBiNjAxOWYxNTkxMCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3hnZmNscHhsdGpzbW13aWNuaGtmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiYWU4MWUyNi0wYjVlLTRlYmQtODhiMy0zZWZlZmYxN2RlMDUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg5NjQ3NzE3LCJpYXQiOjE3ODk2NDQxMTcsImVtYWlsIjoic3RhdHN0aGVnYW1lQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jTG1vbDF0UlVPVkF5MGdqcFViZVVtUUNTcHNjdFFJZmI3M20zSmFZcWc1Rl9UUk5BPXM5Ni1jIiwiZW1haWwiOiJzdGF0c3RoZWdhbWVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IlN0YXQncyBUaGVHYW1lIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6IlN0YXQncyBUaGVHYW1lIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jTG1vbDF0UlVPVkF5MGdqcFViZVVtUUNTcHNjdFFJZmI3M20zSmFZcWc1Rl9UUk5BPXM5Ni1jIiwicHJvdmlkZXJfaWQiOiIxMDExNzM5MTc5OTY4MTMwNTYzMTgiLCJzdWIiOiIxMDExNzM5MTc5OTY4MTMwNTYzMTgifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvYXV0aCIsInRpbWVzdGFtcCI6MTc4OTY0NDExN31dLCJzZXNzaW9uX2lkIjoiZjEwMzcxN2YtZTUxMy00MTE0LWE2NDAtZDIxNTZlYjk2YTdiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.ac5HDBISnVh6SvjMPH8GT5q4d0u--moUHXvbe0EMV_rb9-9pmMbREcqjb75fBFmzh_RyBiYZbFi7KGHbBpz0Hg

## Response:
9/17/2026, 1:27:15 PM

That bearer token is now exposed in the chat, so **do not use that token for testing**. Log out of Stat'sTheGame and back in to obtain a fresh access token, then keep the replacement only in your terminal.

Also, when the command asks for the token, paste **only the token itself**, not the word `Bearer`.

Use:

```bash
read -rsp "Paste NEW admin bearer token (without 'Bearer '): " ADMIN_TOKEN; echo
export ADMIN_TOKEN
export BASE_URL="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"
```

When prompted:

```text
Paste NEW admin bearer token (without 'Bearer '):
```

paste:

```text
eyJhbGciOi...
```

not:

```text
Bearer eyJhbGciOi...
```

Then verify the token works without printing it:

```bash
curl -i \
  "$BASE_URL/api/v1/admin/api-consumers" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

You want something like:

```text
HTTP/... 200
```

If you get `200`, you're ready to create the #594 test consumer.

Then run:

```bash
curl -sS -X POST \
  "$BASE_URL/api/v1/admin/api-consumers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manual Test #594 Rate Limit",
    "rateLimitPerMinute": 3,
    "dailyQuota": 100
  }' | tee /tmp/consumer-594.json | python3 -m json.tool
```

**Do not paste the returned `apiKey` here either.** You can paste the rest of the JSON with `apiKey` replaced by `<REDACTED>`, and I'll guide you through the next manual test.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 2:04:03 PM

dist/assets/index-KQ6Q2CqG.js
dist/assets/index-KQ6Q2CqG.js 4215ms
dist/index.html 53ms
dist/README.md 95ms (unchanged)
dist/season-upload-manifest-template.json 3ms (unchanged)
dist/season-upload-template.json 6ms (unchanged)
index.html 9ms (unchanged)
package.json 8ms (unchanged)
public/README.md 4ms (unchanged)
public/season-upload-manifest-template.json 1ms (unchanged)
public/season-upload-template.json 4ms (unchanged)
README.md 102ms (unchanged)
src/api/client.test.ts 158ms (unchanged)
src/api/client.ts 27ms (unchanged)
src/api/public-read.test.ts 25ms (unchanged)
src/api/public-read.ts 23ms (unchanged)
src/App.test.tsx 68ms (unchanged)
src/App.tsx 11ms (unchanged)
src/components/Button.tsx 4ms (unchanged)
src/components/Card.tsx 3ms (unchanged)
src/components/ComponentBaseline.test.tsx 13ms (unchanged)
src/components/DataTable.tsx 7ms (unchanged)
src/components/Message.tsx 3ms (unchanged)
src/components/PageLayout.tsx 19ms (unchanged)
src/components/PublicShell.test.tsx 24ms (unchanged)
src/components/PublicShell.tsx 21ms (unchanged)
src/components/README.md 7ms (unchanged)
src/components/TextField.tsx 8ms (unchanged)
src/components/ThemeToggle.tsx 8ms (unchanged)
src/features/admin/admin-api.ts 10ms (unchanged)
src/features/admin/AdminUsersPage.test.tsx 72ms (unchanged)
src/features/admin/AdminUsersPage.tsx 96ms (unchanged)
^C
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ git add .
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ git commit -m "fix(prettier)"
^[[A^[[A^[[A^[[A^[[A^[[B^[[BOn branch feat/594-consumer-api-controls
Your branch is up to date with 'origin/feat/594-consumer-api-controls'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   ../backend/tests/unit/provenance.service.test.ts

no changes added to commit (use "git add" and/or "git commit -a")
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ git add .
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ git add .
^[[Bdean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ git commit -m "fix(prettier)"
On branch feat/594-consumer-api-controls
Your branch is up to date with 'origin/feat/594-consumer-api-controls'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   ../backend/tests/unit/provenance.service.test.ts

no changes added to commit (use "git add" and/or "git commit -a")
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ git push
To https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
 ! [rejected]          feat/594-consumer-api-controls -> feat/594-consumer-api-controls (fetch first)
error: failed to push some refs to 'https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ 

help

## Response:
9/17/2026, 2:04:18 PM

You have **two separate issues**:

1. `git add .` was run from `apps/frontend`, so it **cannot stage** `apps/backend/tests/unit/provenance.service.test.ts`.
2. The remote branch has commits you don't have locally, so you need to **rebase before pushing**.

From wherever you are now, run this safe sequence:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

# See exactly what changed
git diff -- apps/backend/tests/unit/provenance.service.test.ts

# Stage the backend file
git add apps/backend/tests/unit/provenance.service.test.ts

# Confirm it is staged
git status

# Commit it
git commit -m "fix(test): format provenance service test"

# Bring in the newer remote commits without creating a merge commit
git fetch origin
git rebase origin/feat/594-consumer-api-controls

# Push the rebased branch
git push origin feat/594-consumer-api-controls
```

The reason this failed:

```bash
cd apps/frontend
git add .
```

only stages:

```text
apps/frontend/**
```

Your modified file is:

```text
apps/backend/tests/unit/provenance.service.test.ts
```

which is a **sibling directory**, so Git correctly left it unstaged.

### If the rebase reports conflicts

Do **not** run `git pull` or `git push --force` immediately. Run:

```bash
git status
```

and paste the output here. I'll tell you exactly which side to keep.

### One check before committing

Because your commit says `fix(prettier)`, first look at the diff:

```bash
git diff -- apps/backend/tests/unit/provenance.service.test.ts
```

If it's genuinely just formatting, continue with the commands above.

If you discover that change was accidental and you **don't want it**, instead run:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
git restore apps/backend/tests/unit/provenance.service.test.ts
git fetch origin
git rebase origin/feat/594-consumer-api-controls
git push origin feat/594-consumer-api-controls
```

Do **not** restore the file until you've checked the diff, because that discards the local modification.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 2:06:13 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ git add .
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ git commit -m "fix(test): format provenance service test"
On branch feat/594-consumer-api-controls
Your branch is behind 'origin/feat/594-consumer-api-controls' by 10 commits, and can be fast-forwarded.
  (use "git pull" to update your local branch)

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   ../backend/src/modules/provenance/provenance.repository.ts
        modified:   ../backend/src/modules/provenance/provenance.service.ts
        modified:   ../backend/tests/unit/provenance.service.test.ts

no changes added to commit (use "git add" and/or "git commit -a")
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$

## Response:
9/17/2026, 2:06:25 PM

> **Planning the git update**
>
> I’m checking the safest sequence: move to the repository root, stage the three backend files explicitly, commit them, then rebase onto the remote branch’s ten newer commits before pushing.
>
> **Planned the git update**
>
> 
>
> Worked for 8s

You are still inside `apps/frontend`, so `git add .` cannot stage the three modified backend files.

Run this exact sequence:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

git add \
  apps/backend/src/modules/provenance/provenance.repository.ts \
  apps/backend/src/modules/provenance/provenance.service.ts \
  apps/backend/tests/unit/provenance.service.test.ts

git status

git commit -m "fix(provenance): format service and tests"

git fetch origin
git rebase origin/feat/594-consumer-api-controls

git push origin feat/594-consumer-api-controls
```

Your situation is currently:

```text
Local branch: 10 commits behind remote
Local changes:
  provenance.repository.ts
  provenance.service.ts
  provenance.service.test.ts
```

The sequence above will:

```text
stage your 3 files
        ↓
commit your work
        ↓
download the 10 remote commits
        ↓
replay your commit on top of them
        ↓
push cleanly
```

Before committing, if you want to confirm these are only the expected formatting changes, run:

```bash
git diff --cached
```

If `git rebase` reports a conflict, **stop there** and run:

```bash
git status
```

Paste that output here; don't force-push or abort anything yet.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 2:07:56 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

git add \
  apps/backend/src/modules/provenance/provenance.repository.ts \
  apps/backend/src/modules/provenance/provenance.service.ts \
  apps/backend/tests/unit/provenance.service.test.ts

git status

git commit -m "fix(provenance): format service and tests"

git fetch origin
git push origin feat/594-consumer-api-controlsls
Refresh index: 100% (1134/1134), done.
On branch feat/594-consumer-api-controls
Your branch is behind 'origin/feat/594-consumer-api-controls' by 10 commits, and can be fast-forwarded.
  (use "git pull" to update your local branch)

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   apps/backend/src/modules/provenance/provenance.repository.ts
        modified:   apps/backend/src/modules/provenance/provenance.service.ts
        modified:   apps/backend/tests/unit/provenance.service.test.ts

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   evidence/ai/registers/dean-feldman.csv

[feat/594-consumer-api-controls 5cc8a6de] fix(provenance): format service and tests
 3 files changed, 68 insertions(+), 6 deletions(-)
error: cannot rebase: You have unstaged changes.
error: Please commit or stash them.
To https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
 ! [rejected]          feat/594-consumer-api-controls -> feat/594-consumer-api-controls (non-fast-forward)
error: failed to push some refs to 'https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 2:08:07 PM

> **Resolving Git state**
>
> I’m seeing two separate issues: unstaged changes in the evidence CSV are blocking the rebase, while the remote branch has new commits. I’ll inspect or stash that file, rebase safely, then push without force.
>
> **Resolved Git state**
>
> 
>
> Worked for 7s

Your commit succeeded. The **only thing blocking the rebase now is**:

```text
evidence/ai/registers/dean-feldman.csv
```

Do **not force-push**. Safest route is to temporarily stash that file, rebase onto the 10 remote commits, restore the file, then decide whether it belongs in a commit.

Run exactly:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

# Temporarily preserve the unstaged AI-register change
git stash push -m "temp: dean AI register before 594 rebase" -- evidence/ai/registers/dean-feldman.csv

# Confirm the working tree is clean
git status

# Update remote refs and replay your commit on top of the 10 remote commits
git fetch origin
git rebase origin/feat/594-consumer-api-controls

# Restore the AI-register change
git stash pop

# Check final state
git status
```

### If the rebase succeeds

Before pushing, check what changed in the AI register:

```bash
git diff -- evidence/ai/registers/dean-feldman.csv
```

If that CSV change is **supposed to be committed**, do:

```bash
git add evidence/ai/registers/dean-feldman.csv
git commit -m "docs(ai): update AI usage register"
git push origin feat/594-consumer-api-controls
```

If the CSV change is **not supposed to be kept**, do:

```bash
git restore evidence/ai/registers/dean-feldman.csv
git push origin feat/594-consumer-api-controls
```

### If `git rebase` reports conflicts

Stop. Run:

```bash
git status
```

and paste the output here. Don't use `git rebase --abort`, `git push --force`, or resolve anything blindly.

One thing I would also verify: your commit reported:

```text
3 files changed, 68 insertions(+), 6 deletions(-)
```

That's fairly large for a commit described as only formatting. After the rebase, check it with:

```bash
git show --stat --oneline HEAD
git show --word-diff=plain HEAD
```

That makes sure Prettier didn't accidentally accompany substantive provenance changes.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 2:13:08 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git push
To https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
 ! [rejected]          feat/594-consumer-api-controls -> feat/594-consumer-api-controls (non-fast-forward)
error: failed to push some refs to 'https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 2:13:19 PM

You still need to bring the **10 remote commits into your branch** before Git will allow the push.

From the repo root, run:

```bash
git pull --rebase --autostash origin feat/594-consumer-api-controls && git push origin feat/594-consumer-api-controls
```

`--autostash` will temporarily preserve your uncommitted `dean-feldman.csv` change, rebase your local commit on top of the remote branch, then restore that change.

If it succeeds, you're done.

If you get a **rebase conflict**, do not force-push. Run:

```bash
git status
```

and paste the output here.

Do **not** use:

```bash
git push --force
```

for this situation.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:03:39 PM

[Attachment: Pasted markdown.md]

## Response:
9/17/2026, 10:03:48 PM

> **Diagnosing CI failure**
>
> I’m identifying this as a test-fixture regression, not a production-data failure. The suite still mutates a published delivery directly, but the updated API now requires immutable revisions, so that test setup must be rewritten.
>
> **Diagnosed CI failure**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 16s

The CI failure is coming from a **stale database test**, not from the snapshot implementation itself. The failing test still directly overwrites a published `delivery` row:

```ts
UPDATE delivery
SET runs_off_bat = 6, runs_total = 6
WHERE ...
```

but your newer immutable-correction protection correctly rejects that with:

```text
Published delivery revision content and provenance cannot be overwritten.
```

That is exactly why PostgreSQL raises `23514` from `protect_delivery_revision()`. `Pasted markdown.md`

So **do not weaken/remove the trigger**. Update the test so its simulated mid-stream correction uses the same correction/revision workflow as production.

First, run this one command from the repo root so we can see the failing block **and** the already-working correction pattern in your database tests:

```bash
printf '\n===== FAILING RELEASE TEST =====\n'; \
sed -n '470,545p' apps/backend/tests/database/public-events.database.test.ts; \
printf '\n===== WORKING CORRECTION TESTS =====\n'; \
grep -n -A80 -B20 "atomically supersedes a corrected event" apps/backend/tests/database/submission.database.test.ts
```

Paste that output here and I can give you the exact replacement code.

The intended change will be structurally:

```ts
const store = new InterleavingObjectStore(async () => {
  // OLD - now invalid
  // await databasePool().query(
  //   `UPDATE delivery SET runs_off_bat = 6, runs_total = 6 ...`,
  // );

  // NEW
  // publish a correction through the repository/service used by production,
  // creating a new immutable revision and superseding the previous revision.
});
```

The test's purpose should remain unchanged:

```text
Start streaming release snapshot
        ↓
first page is captured
        ↓
publish a legitimate correction as a NEW revision
        ↓
continue streaming
        ↓
release must remain internally consistent with its original snapshot
```

That is actually a **better test** for #596 because it now simulates the real correction lifecycle rather than illegally editing history.

Your CI output also confirms that the current correction infrastructure itself is working: these tests pass in the same run:

```text
✓ atomically supersedes a corrected event and refreshes only its derived statistics
✓ serializes concurrent corrections into monotonic immutable revisions
✓ classifies corrected revisions by value when their statistics are refreshed
```

while only the release-interleaving test fails. `Pasted markdown.md`

So don't change:

```text
protect_delivery_revision()
immutable correction migration
production correction semantics
dataset snapshot semantics
```

Change only the stale setup inside:

```text
apps/backend/tests/database/public-events.database.test.ts
```

at approximately lines `514-516`.

After changing it, verify locally with:

```bash
npm run test:database --workspace=@sport-analytics/backend
```

or, for a much faster iteration first:

```bash
cd apps/backend && npx vitest run tests/database/public-events.database.test.ts
```

Then run the full DB suite before pushing.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:04:29 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ printf '\n===== FAILING RELEASE TEST =====\n'; \
sed -n '470,545p' apps/backend/tests/database/public-events.database.test.ts; \
printf '\n===== WORKING CORRECTION TESTS =====\n'; \
grep -n -A80 -B20 "atomically supersedes a corrected event" apps/backend/tests/database/submission.database.test.ts

===== FAILING RELEASE TEST =====
    const repository = createDatasetReleaseRepository(databasePool());
    const owner = await databasePool().query<{ accountId: string }>(
      `SELECT app_user_id::text AS "accountId" FROM app_user ORDER BY app_user_id LIMIT 1`,
    );
    const version = `${sourcePrefix}-async`;
    const input = {
      version,
      requesterId: owner.rows[0]!.accountId,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem' as const,
    };
    const [first, concurrent] = await Promise.all([
      repository.requestGeneration(input),
      repository.requestGeneration(input),
    ]);
    expect(first.job?.jobId).toBe(concurrent.job?.jobId);
    expect(first.job?.state).toBe('queued');
    const jobId = first.job!.jobId;
    await databasePool().query(
      `UPDATE background_job SET state='failed',last_error_code='TestFailure',last_error_message='Safe test failure.' WHERE job_id=$1::uuid`,
      [jobId],
    );
    const retried = await repository.requestGeneration(input);
    expect(retried.job).toMatchObject({ jobId, state: 'queued', eventsProcessed: 0 });
    const outbox = await databasePool().query<{ count: string }>(
      `SELECT count(*)::text AS count FROM outbox_message WHERE job_id=$1::uuid`,
      [jobId],
    );
    expect(outbox.rows[0]!.count).toBe('2');
  });

  test('keeps a release coherent when a correction is published between streamed pages', async () => {
    const current = testRecords();
    const repository = createDatasetReleaseRepository(databasePool());
    const owner = await databasePool().query<{ accountId: string }>(
      `SELECT app_user_id::text AS "accountId" FROM app_user ORDER BY app_user_id LIMIT 1`,
    );
    const requested = await repository.requestGeneration({
      version: `${sourcePrefix}-snapshot`,
      requesterId: owner.rows[0]!.accountId,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
    });
    const store = new InterleavingObjectStore(async () => {
      const previousId = current.orderedEventIds[2]!;
      await databasePool().query(
        `UPDATE delivery SET superseded_at=now(),superseded_by=delivery_id WHERE delivery_id=$1::bigint`,
        [previousId],
      );
      const replacement = await databasePool().query<{ eventId: string }>(
        `INSERT INTO delivery (
           innings_id,over_number,position_in_over,innings_sequence,ball_number,
           striker_id,non_striker_id,bowler_id,runs_off_bat,runs_extras,runs_total,
           non_boundary,extra_wides,extra_noballs,extra_byes,extra_legbyes,extra_penalty,
           submission_id,source_event_id,submission_event_ordinal,revision,
           supersedes_delivery_id,source_batch_item_id
         ) SELECT
           innings_id,over_number,position_in_over,innings_sequence,ball_number,
           striker_id,non_striker_id,bowler_id,6,runs_extras,6,
           non_boundary,extra_wides,extra_noballs,extra_byes,extra_legbyes,extra_penalty,
           submission_id,source_event_id,submission_event_ordinal,revision+1,
           delivery_id,source_batch_item_id
         FROM delivery WHERE delivery_id=$1::bigint
         RETURNING delivery_id::text AS "eventId"`,
        [previousId],
      );
      await databasePool().query(
        `UPDATE delivery SET superseded_by=$2::bigint WHERE delivery_id=$1::bigint`,
        [previousId, replacement.rows[0]!.eventId],
      );
    });
    const handler = createDatasetReleaseJobHandler(databasePool(), store, workerLogger, {
      workerId: 'snapshot-test-worker',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',

===== WORKING CORRECTION TESTS =====
524-    } finally {
525-      await executeQuery(
526-        databasePool(),
527-        "UPDATE app_user SET application_role = 'submitter' WHERE app_user_id = $1",
528-        [testRecords().accountId],
529-      );
530-    }
531-
532-    const afterUnauthorized = await executeQuery<{ count: number; runsTotal: number }>(
533-      databasePool(),
534-      `
535-        SELECT count(*)::int AS count, sum(runs_total)::int AS "runsTotal"
536-        FROM delivery
537-        WHERE source_event_id = $1 AND superseded_at IS NULL
538-      `,
539-      ['123e4567-e89b-42d3-a456-426614174010'],
540-    );
541-    expect(afterUnauthorized.rows).toEqual(before.rows);
542-  });
543-
544:  test('atomically supersedes a corrected event and refreshes only its derived statistics', async () => {
545-    const correctedEventId = '123e4567-e89b-42d3-a456-426614174010';
546-    const unrelatedEventId = '123e4567-e89b-42d3-a456-426614174013';
547-    const unrelated = payload([
548-      { eventId: unrelatedEventId, sequenceNumber: 2, positionInOver: 1 },
549-    ]);
550-    unrelated.events[0].runs = { offBat: 2, extras: 0, total: 2 };
551-
552-    await request(app({ role: 'admin' }))
553-      .post('/api/v1/submissions')
554-      .set('Authorization', 'Bearer database-test-token')
555-      .send(unrelated)
556-      .expect(201);
557-    await executeQuery(
558-      databasePool(),
559-      `
560-        UPDATE fixture
561-        SET first_seen_in = (
562-          SELECT submission_id FROM submission WHERE fixture_id = $1 ORDER BY submission_id ASC LIMIT 1
563-        )
564-        WHERE fixture_id = $1
565-      `,
566-      [testRecords().fixtureId],
567-    );
568-
569-    const beforeSource = await loadFixtureStatisticsSource(testRecords().fixtureId, databasePool());
570-    expect(beforeSource).not.toBeNull();
571-    const beforeStatistics = deriveFixtureStatistics(beforeSource!, { includeContributors: false });
572-    await executeQuery(
573-      databasePool(),
574-      `
575-        INSERT INTO fixture_statistics_cache_version (fixture_id, data_version)
576-        VALUES ($1, 41)
577-        ON CONFLICT (fixture_id) DO UPDATE SET data_version = EXCLUDED.data_version
578-      `,
579-      [testRecords().fixtureId],
580-    );
581-    await executeQuery(
582-      databasePool(),
583-      `
584-        INSERT INTO fixture_statistics_cache (
585-          cache_key, fixture_id, data_version, payload, expires_at
586-        )
587-        VALUES ($1, $2, 41, $3::jsonb, now() + interval '1 minute')
588-      `,
589-      [
590-        `test-fixture-statistics-${testRecords().fixtureId}`,
591-        testRecords().fixtureId,
592-        JSON.stringify(beforeStatistics),
593-      ],
594-    );
595-
596-    const original = payload([{ eventId: correctedEventId, sequenceNumber: 1, positionInOver: 0 }])
597-      .events[0];
598-    const { eventId: _eventId, sequenceNumber: _sequenceNumber, ...event } = original;
599-    void _eventId;
600-    void _sequenceNumber;
601-    event.runs = { offBat: 4, extras: 0, total: 4 };
602-    event.wickets = [
603-      {
604-        kind: 'run out',
605-        playerOutId: testRecords().strikerId,
606-        fielders: [{ participantId: testRecords().bowlerId }],
607-      },
608-    ];
609-    const response = await request(app())
610-      .put(`/api/v1/submissions/events/${correctedEventId}`)
611-      .set('Authorization', 'Bearer database-test-token')
612-      .send({
613-        fixtureId: testRecords().fixtureId,
614-        schemaVersion: '1.0',
615-        reason: 'Correct scorer transcription.',
616-        event,
617-      })
618-      .expect(200);
619-
620-    expect(response.body.data).toMatchObject({
621-      eventId: correctedEventId,
622-      revision: 2,
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 10:04:39 PM

> **Interpreting the pasted request**
>
> I’m treating the pasted material as asking for a concise code patch, but the actual target file and surrounding imports aren’t included here. I need that context to produce a reliable exact replacement rather than guess.
>
> **Interpreted the pasted request**
>
> 
>
> **Planning the correction**
>
> I’m inferring that the fix is to create the replacement revision first, then mark the published revision as superseded by that new revision. I need the target test’s surrounding code to provide an exact patch safely.
>
> **Evaluating the database flow**
>
> I’m inferring the failure occurs because the published row is being mutated directly. The safer correction path appears to create the replacement revision first, then establish the supersession relationship without rewriting protected published data.
>
> **Planned the correction and evaluated the database flow**
>
> 
>
> **Clarifying identifier usage**
>
> I’m noticing that the test may confuse an internal delivery ID with the correction endpoint’s source-event identifier. I need to verify which identifier the fixture exposes before proposing a patch, because substituting them could create a misleading test.
>
> **Clarified identifier usage**
>
> 
>
> **Searching the web**
>
> 
>
> **Checking for Local Repository Files**
>
>
> **Checked local files and fetched an internal Gitea file via API**
>
> 
>
> Worked for 57s

This confirms the test must use the **real correction path** rather than manually mutating `delivery`. The immutable trigger is doing its job; we should not weaken it.

Run this **one command** so I can give you the exact copy-paste patch without guessing imports/helpers:

```bash
printf '\n===== PUBLIC EVENTS IMPORTS / SETUP =====\n'; \
sed -n '1,140p' apps/backend/tests/database/public-events.database.test.ts; \
printf '\n===== FULL FAILING TEST =====\n'; \
sed -n '495,555p' apps/backend/tests/database/public-events.database.test.ts; \
printf '\n===== SUBMISSION TEST IMPORTS / APP HELPER =====\n'; \
sed -n '1,180p' apps/backend/tests/database/submission.database.test.ts; \
printf '\n===== IMMUTABLE CORRECTION TRIGGER =====\n'; \
grep -RIn -A100 -B20 \
  'protect_delivery_revision\|Published delivery revision content and provenance cannot be overwritten' \
  database/migrations apps/backend/src 2>/dev/null
```

What we've established already is that this block is the problem:

```ts
await databasePool().query(
  `UPDATE delivery SET superseded_at=now(),superseded_by=delivery_id WHERE delivery_id=$1::bigint`,
  [previousId],
);

const replacement = await databasePool().query(/* manual INSERT */);

await databasePool().query(
  `UPDATE delivery SET superseded_by=$2::bigint WHERE delivery_id=$1::bigint`,
  [previousId, replacement.rows[0]!.eventId],
);
```

It is trying to fake a correction by directly editing immutable published history.

The corrected test should instead preserve the same timing:

```text
release streaming starts
→ page 1 written
→ legitimate correction published through production correction logic
→ remaining release pages written
→ release remains one coherent snapshot
```

Your existing `submission.database.test.ts` proves the supported correction route is:

```http
PUT /api/v1/submissions/events/:sourceEventId
```

with a correction payload, and that route successfully creates revision `2` instead of overwriting revision `1`.

Once you paste the output of the command above, I'll give you the **exact replacement code and imports**, plus the exact targeted test command to verify it.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:06:21 PM

[Attachment: Pasted text.txt]

## Response:
9/17/2026, 10:06:25 PM

> **Preparing a patch**
>
> I’m missing the surrounding test setup and helper signatures, so I can’t safely provide an exact replacement without inventing repository-specific details. I’m ready to tailor the patch once the full test file or relevant setup is available.
>
> **Prepared a patch**
>
> 
>
> **Investigating trigger behavior**
>
> I’m checking whether another update trigger changes `updated_at`, causing the immutability comparison to fail before supersession fields are applied. I need the repository’s correction implementation or full test setup to produce a reliable patch.
>
> **Investigated trigger behavior**
>
> 
>
> Worked for 34s

The important point is: **your current local test no longer matches the code that failed in CI**.

CI failed on code that directly did:

```ts
UPDATE delivery
SET runs_off_bat = 6, runs_total = 6
```

which correctly violates immutable revision protection. `Pasted markdown.md`

But the file you just showed now does this instead:

```text
mark old revision superseded
→ insert revision + 1 with runs = 6
→ point old revision at replacement
```

That matches the immutable lineage design in your migrations, including `supersedes_delivery_id`, incremented revisions, and preserved provenance. `Pasted text.txt`

So **do not edit the trigger or test again yet**. First verify whether the corrected test already passes locally.

Run this one command from the repo root:

```bash
git status && \
git branch --show-current && \
git diff -- apps/backend/tests/database/public-events.database.test.ts && \
npm run test:database --workspace=@sport-analytics/backend
```

### What I expect

If the test now passes, the problem is simply that **PR #657's CI ran an older commit** that still contained the illegal direct update.

Then check whether your corrected file is actually committed:

```bash
git status
git log -5 --oneline -- apps/backend/tests/database/public-events.database.test.ts
```

If `git status` shows this file modified, commit it:

```bash
git add apps/backend/tests/database/public-events.database.test.ts

git commit -m "test(dataset-releases): publish correction as immutable revision"
```

Because this is code/test assistance, your COMS3011A AI policy requires the commit attribution. `ai_policy.pdf` So make the commit as:

```bash
git commit -m "test(dataset-releases): publish correction as immutable revision" \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"
```

Then update against the remote branch before pushing:

```bash
git pull --rebase --autostash
git push
```

### Why the new version is correct

Your migration explicitly requires a correction to:

```text
revision > 1
supersedes_delivery_id != null
previous.revision + 1 == replacement.revision
same source_event_id
same submission_id
same submission_event_ordinal
same source_batch_item_id
same innings_sequence
```

and your updated test copies those immutable provenance fields while changing the cricket content into a **new row**, rather than overwriting the published row. `Pasted text.txt`

That also preserves what the test is actually meant to prove:

```text
Release begins reading snapshot
        ↓
a genuine new delivery revision is published mid-stream
        ↓
release continues reading
        ↓
release artifact must still represent one coherent snapshot
```

So this is the correct direction for #596.

Paste the output of the combined command above. The main thing I want to see is whether `keeps a release coherent when a correction is published between streamed pages` now goes ✅.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:15:37 PM

[Attachment: Pasted text.txt]

## Response:
9/17/2026, 10:15:46 PM

> **Diagnosing test failure**
>
> I’m seeing a snapshot-consistency issue: the test expects three original event IDs, but the artifact includes a later replacement event. I’m checking whether assertions should filter to the captured snapshot and separately verify the final event’s metadata.
>
> **Diagnosed test failure**
>
> 
>
> Worked for 24s

The immutable-correction failure is fixed. The remaining failure is a **test-isolation assertion bug**: the dataset release correctly contains events from the whole test database, while this test incorrectly expects the artifact to contain only its three locally-created events. Your run now has **203 passing tests and only this one assertion failing**. `Pasted text.txt`

Do **not** change production snapshot/release code. Fix only:

```text
apps/backend/tests/database/public-events.database.test.ts
```

Replace these two assertions:

```ts
expect(artifact.events.map((event) => event.eventId)).toEqual(current.orderedEventIds);
expect(artifact.events.at(-1)?.runsOffBat).toBe(1);
```

with:

```ts
const testEventIds = new Set(current.orderedEventIds);
const snapshottedTestEvents = artifact.events.filter((event) => testEventIds.has(event.eventId));

expect(snapshottedTestEvents.map((event) => event.eventId)).toEqual(current.orderedEventIds);

const correctedSnapshotEvent = snapshottedTestEvents.find(
  (event) => event.eventId === current.orderedEventIds[2],
);

expect(correctedSnapshotEvent?.runsOffBat).toBe(1);
```

This keeps the actual #596 requirement intact:

```text
snapshot begins
→ original event is read
→ correction publishes revision 2
→ release continues
→ release must still contain revision-1 value (1 run)
```

It merely stops assuming that **no other tests have published events into the shared integration-test database**.

### Apply it automatically

From the repo root, run:

```bash
python3 - <<'PY'
from pathlib import Path

path = Path("apps/backend/tests/database/public-events.database.test.ts")
text = path.read_text()

old = """    expect(artifact.events.map((event) => event.eventId)).toEqual(current.orderedEventIds);
    expect(artifact.events.at(-1)?.runsOffBat).toBe(1);"""

new = """    const testEventIds = new Set(current.orderedEventIds);
    const snapshottedTestEvents = artifact.events.filter((event) => testEventIds.has(event.eventId));

    expect(snapshottedTestEvents.map((event) => event.eventId)).toEqual(current.orderedEventIds);

    const correctedSnapshotEvent = snapshottedTestEvents.find(
      (event) => event.eventId === current.orderedEventIds[2],
    );

    expect(correctedSnapshotEvent?.runsOffBat).toBe(1);"""

if old not in text:
    raise SystemExit("Expected assertion block not found; no changes made.")

path.write_text(text.replace(old, new, 1))
print(f"Updated {path}")
PY

npx prettier --write apps/backend/tests/database/public-events.database.test.ts

npm run test:database --workspace=@sport-analytics/backend
```

If that finishes with:

```text
Test Files  27 passed | 1 skipped
Tests       204 passed | 2 skipped
```

then run:

```bash
git add apps/backend/tests/database/public-events.database.test.ts

git commit \
  -m "test(dataset-releases): isolate snapshot coherence assertions" \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push
```

This is preferable to weakening the immutable correction trigger or changing the snapshot implementation: the test still proves the exact concurrency invariant, but now only examines the records it owns.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:24:00 PM

n@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git add apps/backend/tests/database/public-events.database.test.ts

git commit \
  -m "test(dataset-releases): isolate snapshot coherence assertions" \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push
[fix/596-consistent-release-snapshot a6df279b] test(dataset-releases): isolate snapshot coherence assertions
 1 file changed, 13 insertions(+), 2 deletions(-)
To https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
 ! [rejected]          fix/596-consistent-release-snapshot -> fix/596-consistent-release-snapshot (fetch first)
error: failed to push some refs to 'https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 10:24:07 PM

Your commit succeeded. The push is only failing because **someone pushed new commits to the same remote branch after your last sync**.

Run this from the repo root:

```bash
git pull --rebase --autostash origin fix/596-consistent-release-snapshot && \
git push origin fix/596-consistent-release-snapshot
```

That will:

```text
fetch remote changes
→ replay your a6df279b commit on top
→ push the updated branch
```

Do **not** use `git push --force`.

If the rebase stops with a conflict, run:

```bash
git status
```

and paste the output here. I’ll tell you exactly how to resolve it.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:25:39 PM

git push
[fix/596-consistent-release-snapshot a6df279b] test(dataset-releases): isolate snapshot coherence assertions
 1 file changed, 13 insertions(+), 2 deletions(-)
To https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
 ! [rejected]          fix/596-consistent-release-snapshot -> fix/596-consistent-release-snapshot (fetch first)
error: failed to push some refs to 'https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git pull --rebase --autostash origin fix/596-consistent-release-snapshot && \
git push origin fix/596-consistent-release-snapshot
remote: Enumerating objects: 163, done.
remote: Counting objects: 100% (116/116), done.
remote: Compressing objects: 100% (63/63), done.
Unpacking objects:                         
remote: Total 63 (delta 53), reused 0 (delta 0), pack-reused 0 (from 0)
  100% (63/63), 327.65 KiB | 226.00 KiB/s, done.
From https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool
 * branch              fix/596-consistent-release-snapshot -> FETCH_HEAD
   547c2470..62f60950  fix/596-consistent-release-snapshot -> origin/fix/596-consistent-release-snapshot
Auto-merging database/migrations/README.md
CONFLICT (content): Merge conflict in database/migrations/README.md
Auto-merging docs/api/openapi.yaml
error: could not apply 98934c60... feat(statistics): add authoritative powerplay analytics
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: You can instead skip this commit: run "git rebase --skip".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
Could not apply 98934c60... feat(statistics): add authoritative powerplay analytics
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 10:25:56 PM

> **Assessing the rebase**
>
> I’m determining whether the branch already contains the same mainline changes through a remote merge. The conflict suggests overlapping history, so replaying all 21 local commits may be unnecessary or risky.
>
> **Assessed the rebase**
>
> 
>
> Worked for 15s

Do **not** resolve this conflict yet. The rebase is trying to replay an unrelated commit:

```text
98934c60 feat(statistics): add authoritative powerplay analytics
```

onto `fix/596-consistent-release-snapshot`. That suggests your local branch contains extra commits, so blindly continuing could contaminate #596.

Run this exact recovery/diagnostic sequence:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

git rebase --abort
git fetch origin

echo "===== COMMITS ONLY ON LOCAL / ONLY ON REMOTE ====="
git log --left-right --cherry-pick --oneline \
  origin/fix/596-consistent-release-snapshot...fix/596-consistent-release-snapshot
```

You should see lines beginning with:

```text
<   = only on remote
>   = only on your local branch
```

We specifically need to see whether your intended fix:

```text
a6df279b test(dataset-releases): isolate snapshot coherence assertions
```

is the only `>` commit you actually need to preserve.

### If `a6df279b` is the only local commit you need

Use the cleaner approach instead of rebasing 21 unrelated commits:

```bash
git branch backup/fix-596-before-cleanup

git reset --hard origin/fix/596-consistent-release-snapshot

git cherry-pick a6df279b

git push origin fix/596-consistent-release-snapshot
```

That gives you:

```text
latest teammate/remote #596 branch
        +
your one test fix
```

without replaying unrelated powerplay/statistics work.

Do **not** run either of these right now:

```bash
git rebase --skip
git push --force
```

Paste the output of the `git log --left-right --cherry-pick` command first. I can then tell you exactly which local commits should be kept.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:27:07 PM

apparently we are in rebasing mode

## Response:
9/17/2026, 10:27:15 PM

Yes — you are currently **inside an interrupted rebase**. The conflict stopped the rebase before it could complete.

Because it is trying to replay an unrelated `feat(statistics): add authoritative powerplay analytics` commit, **do not continue the rebase yet**.

Run:

```bash
git status
```

You will probably see something like:

```text
rebase in progress
You are currently rebasing branch 'fix/596-consistent-release-snapshot'
```

Safest move is to get back to exactly where you were before the failed `git pull --rebase`:

```bash
git rebase --abort
```

Then verify:

```bash
git status
git branch --show-current
```

You should be back on:

```text
fix/596-consistent-release-snapshot
```

with your committed fix still present.

Then run this so we can see why your branch had those extra commits:

```bash
git fetch origin

git log --left-right --cherry-pick --oneline \
  origin/fix/596-consistent-release-snapshot...HEAD
```

**Do not run `git rebase --continue`, `git rebase --skip`, or force-push.**

Paste the output of that final `git log` command and we'll clean the branch without losing your `a6df279b` fix.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:27:45 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git status
interactive rebase in progress; onto 62f60950
Last commands done (3 commands done):
   pick cedfe177 fix(ci): make coverage late and non-blocking
   pick 98934c60 feat(statistics): add authoritative powerplay analytics
  (see more in file .git/rebase-merge/done)
Next commands to do (8 remaining commands):
   pick c38e2f09 feat(api): expose public OpenAPI specification
   pick bb5b94e6 docs(ai): record issue 658 assistance
  (use "git rebase --edit-todo" to view and edit)
You are currently editing a commit while rebasing branch 'fix/596-consistent-release-snapshot' on '62f60950'.
  (use "git commit --amend" to amend the current commit)
  (use "git rebase --continue" once you are satisfied with your changes)

nothing to commit, working tree clean
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 10:27:53 PM

Yes — you are definitely in an active rebase, and it is currently replaying a stack of unrelated commits onto `62f60950`.

Because your working tree is clean, the safest action is to abort this rebase and return to the exact pre-rebase branch state:

```bash
git rebase --abort
```

Then immediately verify:

```bash
git status
git branch --show-current
```

You should be back on:

```text
fix/596-consistent-release-snapshot
```

Then inspect what is actually different between your local branch and the remote:

```bash
git fetch origin

git log --left-right --cherry-pick --oneline \
  origin/fix/596-consistent-release-snapshot...HEAD
```

Interpretation:

```text
< commit   = only on remote
> commit   = only on your local branch
```

We specifically want to identify your intended commit:

```text
a6df279b test(dataset-releases): isolate snapshot coherence assertions
```

and avoid replaying unrelated commits like:

```text
feat(statistics): add authoritative powerplay analytics
feat(api): expose public OpenAPI specification
docs(ai): record issue 658 assistance
```

Do **not** run:

```bash
git rebase --continue
git rebase --skip
git push --force
```

Paste the output of the `git log --left-right --cherry-pick` command after aborting, and I can give you the exact cleanup command sequence.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:31:25 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git status
git branch --show-current
On branch fix/596-consistent-release-snapshot
Your branch and 'origin/fix/596-consistent-release-snapshot' have diverged,
and have 20 and 1 different commits each, respectively.
  (use "git pull" if you want to integrate the remote branch with yours)

nothing to commit, working tree clean
fix/596-consistent-release-snapshot
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 10:31:33 PM

Good — the rebase is aborted and your working tree is clean.

Your branch is currently:

```text
20 commits only on your local branch
1 commit only on the remote branch
```

Do **not** `git pull` again yet. First identify those commits with this single command:

```bash
git fetch origin && git log --left-right --cherry-pick --graph --oneline --decorate origin/fix/596-consistent-release-snapshot...HEAD
```

Interpretation:

```text
<  = commit only on the remote branch
>  = commit only on your local branch
```

We need to see which of those 20 local commits actually belong to #596 and which are unrelated commits that accidentally ended up on this branch.

Your known intended fix should appear among the `>` commits:

```text
a6df279b test(dataset-releases): isolate snapshot coherence assertions
```

Do **not** run any of these yet:

```bash
git pull
git rebase
git push --force
git reset --hard
```

Paste the output of that command. I’ll give you the exact safest cleanup sequence to keep the #596 commits and incorporate the single remote commit without dragging unrelated work into the PR.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:33:23 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git status
git branch --show-current
On branch fix/596-consistent-release-snapshot
Your branch and 'origin/fix/596-consistent-release-snapshot' have diverged,
and have 20 and 1 different commits each, respectively.
  (use "git pull" if you want to integrate the remote branch with yours)

nothing to commit, working tree clean
fix/596-consistent-release-snapshot
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git fetch origin && git log --left-right --cherry-pick --graph --oneline --decorate origin/fix/596-consistent-release-snapshot...HEAD
remote: Enumerating objects: 17, done.
remote: Counting objects: 100% (17/17), done.
remote: Compressing objects: 100% (10/10), done.
remote: Total 15 (delta 5), reused 0 (delta 0), pack-reused 0 (from 0)
Unpacking objects:                         
  100% (15/15), 1.58 KiB | 2.00 KiB/s, done.
From https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool
   0fb192de..721873da  coverage-badge -> origin/coverage-badge
 * [new branch]        feat/592-statistics-data-versions -> origin/feat/592-statistics-data-versions
> a6df279b (HEAD -> fix/596-consistent-release-snapshot) test(dataset-releases): isolate snapshot coherence assertions
>   04ea8421 merge: integrate main into release snapshot fix
|\  
| >   fa62b47a (origin/main, origin/HEAD) Merge pull request '#658 feat(api): expose public OpenAPI specification' (#666) from feat/658-expose-openapi-spec into main
| |\  
| | > 02f572fc fix(dependencies): remove unused dependencies
| | >   2a910c01 Merge remote-tracking branch 'origin/main' into feat/658-expose-openapi-spec
| | |\  
| | |/  
| |/|   
| > |   c70d048d Merge pull request '#635 Add scoped statistics leaderboards' (#665) from feat/635-statistics-leaderboards into main
:

## Response:
9/17/2026, 10:33:32 PM

> **Interpreting the graph**
>
> I’m seeing a local branch with many commits beyond its remote-tracking branch, likely because a merge pulled in `main`. I’d first inspect unique commits on each side without the pager, then decide whether to push, rebase, or reset.
>
> **Interpreted the graph**
>
> 
>
> Worked for 8s

You’re currently inside Git’s pager — the `:` at the bottom means the output has more lines.

Press:

```text
q
```

Do **not** rebase or pull again yet.

Your output already shows the key problem: besides your intended fix `a6df279b`, your local #596 branch contains a merge from `main` (`04ea8421`), which is why Git thinks there are ~20 local commits.

Now run this **single command** so we see only the commits made directly on the #596 branch, without all the merged `main` history:

```bash
git --no-pager log --left-right --cherry-pick --first-parent --oneline origin/fix/596-consistent-release-snapshot...HEAD
```

You should get a much shorter result.

We are looking for something like:

```text
> a6df279b test(dataset-releases): isolate snapshot coherence assertions
> 04ea8421 merge: integrate main into release snapshot fix
< 62f60950 ...
```

Paste that output. Then I can give you the exact safe cleanup sequence.

For now, **do not run**:

```bash
git pull
git rebase
git rebase --skip
git push --force
git reset --hard
```

Your commit is safe; we just need to untangle the branch history.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/17/2026, 10:35:03 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git --no-pager log --left-right --cherry-pick --first-parent --oneline origin/fix/596-consistent-release-snapshot...HEAD

> a6df279b (HEAD -> fix/596-consistent-release-snapshot) test(dataset-releases): isolate snapshot coherence assertions
> 04ea8421 merge: integrate main into release snapshot fix
< 62f60950 (origin/fix/596-consistent-release-snapshot) Merge branch 'main' into fix/596-consistent-release-snapshot
> 8f7d3f05 test(datasets): publish replacement in snapshot test
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ 
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/17/2026, 10:35:13 PM

Your branch history is now clear. Keep the **two #596 commits**:

```text
8f7d3f05 test(datasets): publish replacement in snapshot test
a6df279b test(dataset-releases): isolate snapshot coherence assertions
```

Drop the redundant local merge `04ea8421`, and rebuild directly on the current remote `62f60950`.

Run exactly:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

# Safety backup
git branch backup/fix-596-before-cleanup

# Make local branch exactly match the latest remote branch
git reset --hard origin/fix/596-consistent-release-snapshot

# Re-apply only the two actual #596 fixes, in order
git cherry-pick 8f7d3f05
git cherry-pick a6df279b

# Verify clean history
git status
git --no-pager log -5 --oneline

# Push normally
git push origin fix/596-consistent-release-snapshot
```

The resulting history should effectively be:

```text
<remote history>
62f60950 Merge branch 'main' into fix/596-consistent-release-snapshot
    ↓
<new hash> test(datasets): publish replacement in snapshot test
    ↓
<new hash> test(dataset-releases): isolate snapshot coherence assertions
```

The hashes of the two cherry-picked commits will change; that is normal.

If either `git cherry-pick` reports a conflict, **stop there** and run:

```bash
git status
```

Paste that output rather than using `--skip` or force-pushing.

After both cherry-picks succeed, I would also rerun:

```bash
npm run test:database --workspace=@sport-analytics/backend
```

before considering #596 ready again.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/18/2026, 8:21:55 AM

[Attachment: Pasted markdown.md]

## Response:
9/18/2026, 8:22:00 AM

> **Diagnosing pagination failure**
>
> I’m seeing the snapshot test pass. The remaining failure is likely checking only the first published-events page, while the corrected event appears later. I’d target that event directly or paginate until it’s found, rather than assuming it’s in page one.
>
> **Diagnosed pagination failure**
>
> 
>
> **Narrowing the failing assertion**
>
> I’m treating the snapshot as fixed. The remaining check is probably searching only the first published page, so I’d filter for the corrected event directly or paginate until its identifier appears before asserting `runsOffBat === 6`.
>
> **Narrowed the failing assertion**
>
> 
>
> **Investigated published event pagination and fetched fixture-filtered pages**
>
> 
>
> **Targeting the replacement**
>
> I’m recommending capturing the replacement event ID during correction, then asserting that exact published event has `runsOffBat: 6`. This avoids relying on page ordering or unrelated shared events appearing in the first page.
>
> **Searching the web**
>
> 
>
> Worked for 50s

The remaining CI failure is now a **different brittle assertion**, not the snapshot logic.

The failing line:

```ts
expect(published.events).toContainEqual(expect.objectContaining({ runsOffBat: 6 }));
```

only inspects the page returned by:

```ts
repository.loadPublishedEventPage(...)
```

and your CI database contains many events. The corrected `6-run` replacement is simply **not guaranteed to be on that page**. The received page has 10 unrelated/current events, so the assertion fails even though the correction may have published correctly. `Pasted markdown.md`

For #596, don't weaken production code and don't assert that an arbitrary page contains *some* six-run event. Assert the actual replacement revision directly.

In `apps/backend/tests/database/public-events.database.test.ts`, replace the final block around lines 580-581:

```ts
const published = await repository.loadPublishedEventPage(null, 10);
expect(published.events).toContainEqual(expect.objectContaining({ runsOffBat: 6 }));
```

with:

```ts
const correctedLiveEvent = await databasePool().query<{ runsOffBat: number }>(
  `
    SELECT runs_off_bat AS "runsOffBat"
    FROM delivery_current
    WHERE supersedes_delivery_id = $1::bigint
  `,
  [current.orderedEventIds[2]],
);

expect(correctedLiveEvent.rows).toEqual([{ runsOffBat: 6 }]);
```

That tests the actual invariant:

```text
release snapshot
    -> still contains the pre-correction value

live delivery_current
    -> contains the newly published 6-run revision
```

rather than relying on database-wide pagination order.

You can apply it automatically with:

```bash
python3 - <<'PY'
from pathlib import Path

path = Path("apps/backend/tests/database/public-events.database.test.ts")
text = path.read_text()

old = """    const published = await repository.loadPublishedEventPage(null, 10);
    expect(published.events).toContainEqual(expect.objectContaining({ runsOffBat: 6 }));"""

new = """    const correctedLiveEvent = await databasePool().query<{ runsOffBat: number }>(
      `
        SELECT runs_off_bat AS "runsOffBat"
        FROM delivery_current
        WHERE supersedes_delivery_id = $1::bigint
      `,
      [current.orderedEventIds[2]],
    );

    expect(correctedLiveEvent.rows).toEqual([{ runsOffBat: 6 }]);"""

if old not in text:
    raise SystemExit("Expected final assertion block not found; no changes made.")

path.write_text(text.replace(old, new, 1))
print(f"Updated {path}")
PY

npx prettier --write apps/backend/tests/database/public-events.database.test.ts

npm run test:database --workspace=@sport-analytics/backend
```

If it passes, commit with:

```bash
git add apps/backend/tests/database/public-events.database.test.ts

git commit \
  -m "test(dataset-releases): target corrected live revision" \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push
```

The important distinction is that your **snapshot assertion should stay scoped to the test's own events**, while the post-correction assertion should target the **specific corrected lineage**, not an arbitrary first page. Your current run already has `203 passed` with only this assertion failing. `Pasted markdown.md`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/18/2026, 8:41:08 AM

Verify the API implementation against the OpenAPI contract20s

Run npm run prepare\:contracts --workspace=@sport-analytics/backend

\> @sport-analytics/backend\@0.1.0 prepare\:contracts

\> npm run build --workspace=@sport-analytics/contracts && npm run build --workspace=@sport-analytics/batch-processing && npm run build --workspace=@sport-analytics/object-storage && node ../../scripts/check-contracts-public-api.mjs

\> @sport-analytics/contracts\@0.1.0 build

\> tsc -p tsconfig.json

\> @sport-analytics/batch-processing\@0.1.0 build

\> tsc -p tsconfig.json

\> @sport-analytics/object-storage\@0.1.0 build

\> tsc -p tsconfig.json

Contracts public API check passed.

\> sport-analytics-tool\@0.1.0 test\:api-contract

\> npm run test\:contract --workspace=@sport-analytics/backend

\> @sport-analytics/backend\@0.1.0 test\:contract

\> vitest run tests/contract

 **RUN**  v4.1.11 /workspace/git-push-pray/Sport-Analytics-Tool/apps/backend

✓ tests/contract/corrected-contract.contract.test.ts (40 tests) 789ms

❯ tests/contract/representative-operations.contract.test.ts (15 tests | 1 failed) 315ms

✓ GET /health returns the documented health response 61ms

✓ GET /competitions returns a documented page, and 400 for an invalid limit 22ms

✓ GET /fixtures/{fixtureId} returns a documented fixture, and 404 when it is unknown 32ms

✓ GET /fixtures/{fixtureId}/statistics returns documented fixture statistics 68ms

✓ GET /fixtures/{fixtureId}/events/export.csv returns documented CSV 6ms

× GET /\*\*\* returns documented releases, and 404 for an unknown version 11ms

✓ an unsupported API major version returns the documented UNSUPPORTED\_API\_VERSION error 9ms

✓ GET /consumer/competitions returns a documented page for an active key 13ms

✓ GET /consumer/competitions returns the documented 401 without a key 7ms

✓ GET /auth/me returns the documented profile, and 401 without a token 20ms

✓ POST /submitter-access-requests returns 201, and 422 for an invalid body 16ms

✓ GET /provenance/submissions returns 200 to an administrator and 403 to a viewer 19ms

✓ POST /admin/api-consumers returns 201 to an administrator and 403 to a viewer 22ms

✓ a deprecated field remains in responses until its documented retirement 4ms

✓ every deprecated operation explains its replacement in its description 1ms

stderr | tests/contract/openapi-contract.test.ts > OpenAPI contract checker > deliberate mismatch: rejects a status the operation does not document

Simulated repository failure.

✓ tests/contract/openapi-contract.test.ts (6 tests) 349ms

✓ tests/contract/route-inventory.contract.test.ts (3 tests) 9ms

⎯⎯⎯⎯⎯⎯⎯ **Failed Tests 1** ⎯⎯⎯⎯⎯⎯⎯

 **FAIL**  tests/contract/representative-operations.contract.test.ts > public operations > GET /\*\*\* returns documented releases, and 404 for an unknown version

**ContractViolation**: OpenAPI contract violation for GET /api/v1/\*\*\* → 200:

  \- response body /data/0 must have required property 'snapshotId'

  \- response body /data/0 must have required property 'snapshotAsOf'

Contract: docs/api/openapi.yaml

❯ Object.expectResponse tests/contract/openapi-contract.ts:454:15

452|       if (problems.length > 0) {

453|         const request = (response as unknown as { req: { method: strin…

454|         throw new ContractViolation(

   \|               ^

455|           \`${request.method} ${request.path} → ${response.status}\`,

456|           problems,

❯ tests/contract/representative-operations.contract.test.ts:169:14

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  **1 failed** | **3 passed** (4)

      Tests  **1 failed** | **63 passed** (64)

   Start at  06:40:33

   Duration  7.24s (transform 830ms, setup 0ms, import 5.27s, tests 1.46s, environment 0ms)

\::error::/workspace/git-push-pray/Sport-Analytics-Tool/apps/backend/tests/contract/openapi-contract.ts:454:15: tests/contract/representative-operations.contract.test.ts > public operations > GET /\*\*\* returns documented releases, and 404 for an unknown version: ContractViolation: OpenAPI contract violation for GET /api/v1/\*\*\* → 200:%0A  - response body /data/0 must have required property 'snapshotId'%0A  - response body /data/0 must have required property 'snapshotAsOf'%0AContract: docs/api/openapi.yaml%0A ❯ Object.expectResponse tests/contract/openapi-contract.ts:454:15%0A ❯ tests/contract/representative-operations.contract.test.ts:169:14%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { exchange: 'GET /api/v1/\*\*\* → 200', problems: [ 'response body /data/0 must have required property \\'snapshotId\\'', 'response body /data/0 must have required property \\'snapshotAsOf\\'' ] }%0A

npm error Lifecycle script \`test\:contract\` failed with error:

npm error code 1

npm error path /workspace/git-push-pray/Sport-Analytics-Tool/apps/backend

npm error workspace @sport-analytics/backend\@0.1.0

npm error location /workspace/git-push-pray/Sport-Analytics-Tool/apps/backend

npm error command failed

npm error command sh -c vitest run tests/contract

\##[error]Process completed with exit code 1.

## Response:
9/18/2026, 8:41:21 AM

> **Diagnosing contract failure**
>
> I’m seeing a schema mismatch: the release-list response now requires `snapshotId` and `snapshotAsOf`, but the implementation omits them. I’d update the response mapper and tests, unless the contract change was unintended.
>
> **Diagnosed contract failure**
>
> 
>
> Worked for 7s

The failure is a **real OpenAPI/implementation mismatch**. Do **not** weaken the OpenAPI schema: the release-list implementation is returning objects without the newly-required snapshot metadata:

```text
snapshotId
snapshotAsOf
```

The contract test is correctly catching that.

Run this one command from the repo root to locate every relevant definition and mapping:

```bash
grep -RInE --binary-files=without-match \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  'snapshotId|snapshotAsOf|DatasetRelease|dataset.*release|load.*Release|list.*Release' \
  apps/backend/src apps/backend/tests packages docs/api/openapi.yaml database/migrations \
  2>/dev/null
```

The likely problem is structurally this:

```ts
return {
  version: row.version,
  createdAt: row.createdAt,
  // ...
};
```

while OpenAPI now requires something equivalent to:

```ts
return {
  version: row.version,
  snapshotId: row.snapshotId,
  snapshotAsOf: row.snapshotAsOf.toISOString(),
  createdAt: row.createdAt.toISOString(),
  // existing fields
};
```

### What needs fixing

Your `/dataset releases` list operation and your single-release operation should expose the **same snapshot identity metadata** if the schema requires it.

The database/repository query therefore also needs to select the fields, e.g. conceptually:

```sql
SELECT
  ...,
  snapshot_id AS "snapshotId",
  snapshot_as_of AS "snapshotAsOf"
FROM dataset_release
```

Then the repository/controller DTO needs to preserve them.

The important point is:

```text
Database snapshot metadata
        ↓
repository row
        ↓
service/domain object
        ↓
HTTP response
        ↓
OpenAPI contract
```

Right now that chain is broken somewhere before the HTTP response.

### Do not do this

Do **not** "fix" CI by removing:

```yaml
snapshotId
snapshotAsOf
```

from OpenAPI `required:` unless the #596 design explicitly decided those fields should not be public.

Given your consistent-release-snapshot work, those fields appear intentional: they make the release identify the snapshot it was generated from.

### After the patch

Run the targeted contract suite first:

```bash
npm run test:contract --workspace=@sport-analytics/backend
```

You want:

```text
Test Files  4 passed
Tests       64 passed
```

Then run:

```bash
npm run test:database --workspace=@sport-analytics/backend
npm run typecheck --workspace=@sport-analytics/backend
npm run lint --workspace=@sport-analytics/backend
```

Paste the output of the `grep` command above and I can give you the **exact file-by-file code change**, rather than guessing which repository mapper is dropping the two fields.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/18/2026, 8:42:36 AM

[Attachment: Pasted text.txt]

## Response:
9/18/2026, 8:42:40 AM

This output changes the diagnosis: **the production implementation already carries `snapshotId` and `snapshotAsOf` end-to-end**. The stale piece is almost certainly the mock `release` object inside `representative-operations.contract.test.ts`. Your repository query, service mapping, shared contracts, OpenAPI schema, API tests, and other contract samples already include both fields. `Pasted text.txt`

Do **not** change the repository/service/OpenAPI. Run this one command:

```bash
sed -n '1,190p' apps/backend/tests/contract/representative-operations.contract.test.ts
```

Look for the object used here:

```ts
datasetReleases: {
  listReleases: async () => [release],
  getRelease: async () => null,
},
```

The failing `release` fixture is returning something equivalent to:

```ts
const release = {
  releaseId: '...',
  version: '...',
  createdAt: '...',
  eventCount: ...,
  checksum: '...',
  // missing snapshotId / snapshotAsOf
};
```

It needs the two fields required by your current contract:

```ts
snapshotId: '1e3af729-8ced-4f49-ae61-7f0d74eab8f8',
snapshotAsOf: '2026-09-09T10:00:00.000Z',
```

Your existing `contract-samples.ts` already contains valid sample values for those fields, so ideally the representative test should reuse that canonical fixture rather than maintain a second stale copy. `Pasted text.txt`

After changing the fixture, run only the failing contract suite first:

```bash
npm run test:contract --workspace=@sport-analytics/backend
```

Expected:

```text
Test Files  4 passed
Tests       64 passed
```

Then run:

```bash
npm run test:database --workspace=@sport-analytics/backend
```

If you paste the output of that `sed` command, I can give you the **exact two-line/file patch** instead of another broad search.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/18/2026, 8:43:37 AM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ sed -n '1,190p' apps/backend/tests/contract/representative-operations.contract.test.ts
import request from 'supertest';
import { describe, expect, test } from 'vitest';

import type { PublicEvent } from '@sport-analytics/contracts';

import { CONSUMER_API_KEY, contractApp } from './contract-app';
import { createOpenApiContract } from './openapi-contract';

/**
 * Representative public, consumer and authenticated operations checked against
 * docs/api/openapi.yaml (issue #609). Services are stubbed; routing,
 * authentication, validation and serialisation are the real implementation.
 */

const contract = createOpenApiContract();

const competition = { competitionId: '10', name: 'World Twenty20' };

const fixture = {
  fixtureId: '100',
  competitionId: '12',
  competitionName: 'Test Competition',
  seasonId: 'season_example',
  season: '2026',
  seasonLabel: '2026',
  competitors: [
    { competitorId: '20', name: 'Team Alpha' },
    { competitorId: '21', name: 'Team Beta' },
  ],
  matchType: 'T20',
  teamType: 'international',
  gender: 'male',
  ballsPerOver: 6,
  scheduledOvers: 20,
  venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
  toss: { winnerCompetitorId: '20', winnerCompetitorName: 'Team Alpha', decision: 'bat' },
  startDate: '2026-08-09',
  endDate: '2026-08-09',
};

const event: PublicEvent = {
  eventId: '500',
  fixtureId: '100',
  competitionId: '10',
  competitionName: 'World Twenty20',
  inningsId: '200',
  inningsOrdinal: 0,
  sequenceNumber: 1,
  overNumber: 0,
  positionInOver: 0,
  ballNumber: '0.1',
  battingCompetitorId: '20',
  battingCompetitorName: 'India',
  bowlingCompetitorId: '21',
  bowlingCompetitorName: 'Pakistan',
  strikerParticipantId: '30',
  strikerParticipantName: 'Opening Batter',
  nonStrikerParticipantId: '31',
  nonStrikerParticipantName: 'Non-striker',
  bowlerParticipantId: '32',
  bowlerParticipantName: 'Opening Bowler',
  runs: { offBat: 4, extras: 0, total: 4, nonBoundary: false },
  extras: { wides: null, noBalls: null, byes: null, legByes: null, penalty: null },
  wickets: [],
};

const fixtureStatistics = {
  fixtureId: '9',
  status: 'complete' as const,
  scope: { superOversIncluded: false },
  outcome: {
    kind: 'tie' as const,
    winnerCompetitorId: null,
    winnerCompetitorName: null,
    eliminatorCompetitorId: null,
    eliminatorCompetitorName: null,
    margin: null,
    method: null,
    decidedByBowlOut: false,
  },
  highestScorers: [],
  warnings: [],
  statistics: [],
};

const release = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.1',
  createdAt: '2026-09-09T10:00:00.000Z',
  formatVersion: '1.0' as const,
  scope: 'published-accepted-deliveries' as const,
  eventCount: 2,
  checksum: 'a'.repeat(64),
  fields: [
    { name: 'eventId', description: 'Stable identifier of the accepted delivery revision.' },
  ],
};

const apiConsumer = {
  id: '7',
  name: 'Partner dashboard',
  rateLimitPerMinute: 60,
  dailyQuota: 10000,
  createdAt: '2026-09-07T10:00:00.000Z',
  keys: [
    { id: '9', prefix: 'sat_live_example', createdAt: '2026-09-07T10:00:00.000Z', revokedAt: null },
  ],
};

function activeConsumerRepository() {
  return {
    findActiveConsumer: async () => ({ consumerId: '7', rateLimitPerMinute: 60, dailyQuota: 100 }),
    consumeDailyQuota: async () => ({ allowed: true, used: 1 }),
  };
}

describe('public operations', () => {
  test('GET /health returns the documented health response', async () => {
    const response = await request(contractApp()).get('/api/v1/health').expect(200);

    contract.expectResponse(response);
  });

  test('GET /competitions returns a documented page, and 400 for an invalid limit', async () => {
    const app = contractApp({
      publicRead: {
        listCompetitions: async () => ({ data: [competition], pagination: { nextCursor: null } }),
      },
    });

    contract.expectResponse(await request(app).get('/api/v1/competitions?limit=5').expect(200));
    contract.expectResponse(await request(app).get('/api/v1/competitions?limit=0').expect(400), {
      requestIsInvalid: true,
    });
  });

  test('GET /fixtures/{fixtureId} returns a documented fixture, and 404 when it is unknown', async () => {
    const found = contractApp({ publicRead: { getFixture: async () => fixture } });
    const missing = contractApp({ publicRead: { getFixture: async () => null } });

    contract.expectResponse(await request(found).get('/api/v1/fixtures/100').expect(200));
    contract.expectResponse(await request(missing).get('/api/v1/fixtures/999').expect(404));
  });

  test('GET /fixtures/{fixtureId}/statistics returns documented fixture statistics', async () => {
    const app = contractApp({
      fixtureStatistics: {
        getFixtureStatistics: async () => fixtureStatistics,
        getFixtureStatistic: async () => null,
      },
    });

    contract.expectResponse(await request(app).get('/api/v1/fixtures/9/statistics').expect(200));
  });

  test('GET /fixtures/{fixtureId}/events/export.csv returns documented CSV', async () => {
    const app = contractApp({ publicRead: { exportFixtureEvents: async () => [event] } });

    const response = await request(app).get('/api/v1/fixtures/100/events/export.csv').expect(200);

    contract.expectResponse(response);
  });

  test('GET /dataset-releases returns documented releases, and 404 for an unknown version', async () => {
    const app = contractApp({
      datasetReleases: { listReleases: async () => [release], getRelease: async () => null },
    });

    contract.expectResponse(await request(app).get('/api/v1/dataset-releases').expect(200));
    contract.expectResponse(
      await request(app).get('/api/v1/dataset-releases/2026.09.9').expect(404),
    );
  });

  test('an unsupported API major version returns the documented UNSUPPORTED_API_VERSION error', async () => {
    const response = await request(contractApp()).get('/api/v2/health').expect(404);

    expect(response.body.error.code).toBe('UNSUPPORTED_API_VERSION');
    expect(contract.schemaProblems('/components/schemas/ApiErrorResponse', response.body)).toEqual(
      [],
    );
    expect(String((contract.document.info as { description: string }).description)).toContain(
      'UNSUPPORTED_API_VERSION',
    );
  });
});

describe('consumer (API key) operations', () => {
  test('GET /consumer/competitions returns a documented page for an active key', async () => {
    const app = contractApp({
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/18/2026, 8:43:51 AM

The fix is only in the **contract-test fixture**. Your `release` object is missing the two fields now required by OpenAPI.

Change this block in:

```text
apps/backend/tests/contract/representative-operations.contract.test.ts
```

to:

```ts
const release = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.1',
  createdAt: '2026-09-09T10:00:00.000Z',
  snapshotId: '1e3af729-8ced-4f49-ae61-7f0d74eab8f8',
  snapshotAsOf: '2026-09-09T10:00:00.000Z',
  formatVersion: '1.0' as const,
  scope: 'published-accepted-deliveries' as const,
  eventCount: 2,
  checksum: 'a'.repeat(64),
  fields: [
    { name: 'eventId', description: 'Stable identifier of the accepted delivery revision.' },
  ],
};
```

Your repository, service, contracts and OpenAPI already support these fields; this local mock is just stale.

You can apply and test it in one command:

```bash
python3 - <<'PY'
from pathlib import Path

path = Path("apps/backend/tests/contract/representative-operations.contract.test.ts")
text = path.read_text()

old = """  createdAt: '2026-09-09T10:00:00.000Z',
  formatVersion: '1.0' as const,"""

new = """  createdAt: '2026-09-09T10:00:00.000Z',
  snapshotId: '1e3af729-8ced-4f49-ae61-7f0d74eab8f8',
  snapshotAsOf: '2026-09-09T10:00:00.000Z',
  formatVersion: '1.0' as const,"""

if old not in text:
    raise SystemExit("Expected release fixture block not found; no changes made.")

path.write_text(text.replace(old, new, 1))
print(f"Updated {path}")
PY

npx prettier --write apps/backend/tests/contract/representative-operations.contract.test.ts && \
npm run test:contract --workspace=@sport-analytics/backend
```

You want:

```text
Test Files  4 passed
Tests       64 passed
```

Then commit:

```bash
git add apps/backend/tests/contract/representative-operations.contract.test.ts

git commit \
  -m "test(api): update dataset release contract fixture" \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"
```

Then rerun the database suite because that still had the separate snapshot-test issue:

```bash
npm run test:database --workspace=@sport-analytics/backend
```

Do **not** remove `snapshotId` or `snapshotAsOf` from OpenAPI—the implementation already supports them; the failing mock was simply outdated.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)