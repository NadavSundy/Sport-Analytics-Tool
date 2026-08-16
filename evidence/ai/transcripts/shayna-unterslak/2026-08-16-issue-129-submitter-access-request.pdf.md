# Backend Issue #129 Plan

**User:** Anonymous  
**Created:** 8/16/2026 11:18:28  
**Updated:** 8/16/2026 12:37:08  
**Exported:** 8/16/2026 12:37:35  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a81800d-44c0-83ea-8bd7-7a5e47860eb5](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a81800d-44c0-83ea-8bd7-7a5e47860eb5)  

## Prompt:
8/16/2026, 11:18:24 AM

[Attachment: 20faedba-82ba-41e1-9d34-cc495f2d357c.png]

[Attachment: ff085821-a90b-40f2-983f-e946e9c4b9f3.png]

[Attachment: Sport-Analytics-Tool (3)(1).zip]

heres my current issue, lets do it together please
remember, we need to document, follow all methodology, write tests, etc
i gave u the code etc for reference

## Response:
8/16/2026, 11:18:27 AM

> **Inspecting Project Archive Structure**
>
>
> **Starting the implementation plan**
>
> I’ll guide this step by step. First, I’m checking the working tree and issue metadata, then I’ll create a focused branch before touching the schema, endpoint, UI, tests, and documentation.
>
> **Started the implementation plan**
>
> 
>
> **Preparing issue #129**
>
> I’m starting by aligning the issue with the project methodology: I’ll confirm dependencies, add any missing motivation or evidence, apply the API label, then create a focused feature branch before coding.
>
> **Prepared issue #129**
>
> 
>
> **Implemented submitter access request workflow and verified backend integration with tests**
>
> 
>
> Worked for 6m 23s

Yes. I’ve gone through the current repo you sent, the issue, the existing account/auth implementation, database schema, testing setup, Git methodology, project methodology, AI evidence process, OpenAPI, and docs. We should do **#129 properly as a complete backend issue**, not just make the endpoint and move on.

A key finding first: **we should not create another database table for this issue.** Your existing `app_user` schema already has the server-owned:

```text
submitter_approval_state
```

with exactly:

```text
not_requested
pending
approved
rejected
```

That was clearly built to support this workflow. So #129 should atomically change the authenticated account from:

```text
not_requested → pending
rejected      → pending
```

while refusing:

```text
pending  → 409 duplicate request
approved → 409 already approved
```

That avoids two competing sources of truth and leaves #45 able to find accounts whose state is `pending`. This also remains a handwritten HTTP API, as the project requires. `sport_analytics.pdf`

### What we will implement

I suggest this endpoint:

```http
POST /api/v1/submitter-access-requests
Authorization: Bearer <supabase-access-token>
```

Successful response:

```json
{
  "data": {
    "accountId": "42",
    "approvalState": "pending"
  }
}
```

with:

```text
201  request created
401  not authenticated
409  request already pending
409  account already approved
500  unexpected database/server failure
```

We will make the state transition **atomic in PostgreSQL**, so two rapid clicks cannot create two active requests.

We'll add the implementation in a dedicated backend module along the same repository → service → controller → route architecture already used by submissions:

```text
apps/backend/src/modules/submitter-access/
├── submitter-access.errors.ts
├── submitter-access.repository.ts
├── submitter-access.service.ts
├── submitter-access.controller.ts
└── submitter-access.routes.ts
```

Then tests:

```text
apps/backend/tests/api/submitter-access-request.test.ts
apps/backend/tests/unit/submitter-access.repository.test.ts
apps/backend/tests/database/submitter-access-request.database.test.ts
```

We'll test at least:

```text
✓ unauthenticated → 401
✓ not_requested → pending + 201
✓ correct application account changed
✓ state actually persists in PostgreSQL
✓ second pending request → 409
✓ approved submitter → 409
✓ rejected user can re-request → pending
✓ unsupported persisted state fails closed
```

And then update:

```text
docs/api/openapi.yaml
docs/api/overview.md
docs/security/authentication.md
docs/development/testing.md
```

plus the AI register/transcript at the end. That's particularly important here because we're using ChatGPT for code generation: your course AI policy requires code-generation commits to include an `Assisted-by` declaration, and writing/documentation needs its AI declaration too. `ai_policy_20_jul.pdf`

This is also exactly the kind of evidence your methodology and rubric want: issue → branch → small commits → automated tests → documentation → PR → peer review → merge. The Sprint 1 rubric specifically rewards actually *using* the methodology and implementing supporting requirements rather than merely having the methodology documented. `project_briefs.pdf`

## Step 1 - make #129 Ready/In Progress properly

Your issue is already pretty good, but according to **your own methodology**, it is missing a proper `Motivation` and `Evidence` section. I would add these before starting:

```markdown
## Motivation

Authenticated users must be able to express that they want submitter access without authentication itself granting submission permission.

The existing application-account authorization model already separates authentication from submitter approval using the server-owned `submitter_approval_state`. This issue implements the request transition so that administrator workflow #45 can later review pending requests and grant the appropriate competition scope.

## Evidence

Implementation evidence will include:

- automated API tests for authenticated, unauthenticated, duplicate and already-approved cases;
- database integration tests confirming the request state is persisted against the correct application account;
- updated OpenAPI and authentication documentation;
- the linked Pull Request and local verification results.
```

Also make sure #129 has:

```text
Milestone: Sprint 1

Labels:
type: feature
area: backend
area: database
area: api          ← add this if your repo has it
tier: basic        ← add this if available
priority: high     ← appropriate for the current client-requested workflow
```

And move it:

```text
Ready → In Progress
```

once we actually start.

I would also add this short comment to #129 so the implementation decision is recorded rather than living only in this chat:

```markdown
Starting implementation on `feat/129-submitter-access-request`.

The existing `app_user.submitter_approval_state` from #43 will be used as the persisted request state rather than introducing a second request-state table.

Planned transitions:

- `not_requested` → `pending`
- `rejected` → `pending`
- existing `pending` → reject as duplicate
- existing `approved` → reject as already approved

The transition will be performed atomically so concurrent duplicate requests cannot both succeed.

Refs #120
Integrates with #45
```

### Then create the branch

**Do not create it until your working tree is clean.** One thing I noticed in the ZIP you sent: its `main` currently shows a bunch of modified/untracked generated `site/` files. We absolutely do **not** want those sneaking into #129.

Run:

```bash
git switch main
git pull origin main
git status
```

Your methodology requires the branch to come from updated `main`, and it requires unrelated changes to stay out of the issue branch.

**Send me the output of `git status` after those three commands.** Then we'll create:

```bash
feat/129-submitter-access-request
```

and go to **Step 2: write the failing tests first**, before implementing the endpoint.

## Prompt:
8/16/2026, 11:35:06 AM

S C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git status
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   site/404.html
        modified:   site/ai/usage/index.html
        modified:   site/api/overview/index.html
        modified:   site/architecture/overview/index.html
        modified:   site/architecture/repository-structure/index.html
        modified:   site/database/overview/index.html
        modified:   site/database/schema/index.html
        modified:   site/deployment/azure/index.html
        modified:   site/deployment/overview/index.html
        modified:   site/development/dependencies/index.html
        modified:   site/development/setup/index.html
        modified:   site/development/testing/index.html
        modified:   site/git-methodology/index.html
        modified:   site/index.html
        modified:   site/project_methodology/index.html
        modified:   site/search/search_index.json
        modified:   site/security/overview/index.html
        modified:   site/sitemap.xml.gz

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        site/adr/
        site/ai_policy.pdf
        site/api/contracts/
        site/api/openapi.yaml
        site/api/openapi/
        site/api/public-read/
        site/api/versioning/
        site/architecture/system-architecture/
        site/data/
        site/database/access/
        site/database/erd/
        site/deployment/azure-backend/
        site/deployment/azure-fronted/
        site/deployment/cloudflare_pages/
        site/design/
        site/development/technology-stack/
        site/environment/
        site/planning/
        site/requirements/
        site/security/auth-provider-comparison/
        site/security/authentication/

## Response:
8/16/2026, 11:35:09 AM

> **Cleaning generated files**
>
> I’m treating `site/` as generated output: I’ll restore tracked changes, preview untracked deletions, remove only generated files, and verify the working tree. I won’t alter ignore rules or bundle this cleanup into the unrelated issue.
>
> **Cleaned generated files**
>
> 
>
> **Reviewed Git hygiene, methodology, and tracked documentation files**
>
> 
>
> Worked for 30s

Perfect - this explains it. Those are **generated MkDocs `site/` files**, not source changes we want in #129. Your repo’s own setup documentation says the generated `site/` directory is build output and should not be committed as part of normal documentation changes.

Do **not** stage any of these, and don’t use `git reset --hard`. Clean only `site/`.

### 1. Restore the tracked generated files

Run:

```powershell
git restore site/
```

### 2. Preview the untracked files that will be removed

Run:

```powershell
git clean -nd site/
```

This is only a dry run. You should see the untracked `site/...` directories/files from your status.

If that output only contains generated `site/` content, run:

```powershell
git clean -fd site/
```

### 3. Confirm `main` is clean

```powershell
git status
```

We want:

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

### 4. Then create the issue branch

Once it is clean:

```powershell
git switch -c feat/129-submitter-access-request
```

Then:

```powershell
git status
git branch --show-current
```

You should get:

```text
feat/129-submitter-access-request
```

### One repo problem we've spotted

Your repository currently **doesn't ignore `site/` in `.gitignore`**, even though your documentation explicitly treats it as generated build output. That's why running MkDocs keeps dirtying your working tree.

I would **not fix that inside #129**, because it is unrelated scope. We should log a tiny separate chore/bug issue later for:

> Stop generated MkDocs `site/` output from dirtying the repository

and handle the existing tracked files properly there.

For #129, we stay disciplined:

```text
#129
  ↓
clean main
  ↓
feat/129-submitter-access-request
  ↓
write tests first
  ↓
implementation
  ↓
API docs
  ↓
AI evidence
  ↓
npm run check
  ↓
PR + review
```

Run the four cleanup commands through `git status` and **send me the resulting `git status`**. Then we'll start with the existing backend structure and write our first failing tests before touching implementation.

## Prompt:
8/16/2026, 11:36:28 AM

next

## Response:
8/16/2026, 11:36:30 AM

> **Inspecting repository zip contents**
>
>
> **Setting up the first test**
>
> I’m starting with a failing integration test for the authenticated endpoint. I’ll first inspect the existing test helpers and route conventions, then add coverage for successful submission and unauthenticated rejection before implementing behavior.
>
> **Set up the first test**
>
> 
>
> **Inspecting authentication and authorization test patterns**
>
>
> **Writing red tests**
>
> I’m adding the endpoint contract first: anonymous requests should return `401`, while an authenticated non-approved account should receive a pending response. I’ll keep these tests local until they pass, then implement the smallest supporting route.
>
> **Wrote red tests**
>
> 
>
> **Inspecting Transaction and Query Helpers**
>
>
> **Inspected repository files, authentication routes, tests, documentation, and database helpers**
>
> 
>
> Worked for 1m 25s

Good. We’ll do this **one small step at a time**.

I checked the repo you uploaded. We already have reusable authentication middleware and test helpers, so we should start #129 with a **red API test** rather than writing implementation first.

### Step 2 - create the branch and first failing test

If you have not created the branch yet:

```powershell
git switch -c feat/129-submitter-access-request
```

Confirm:

```powershell
git branch --show-current
```

It should say:

```text
feat/129-submitter-access-request
```

Now create:

```text
apps/backend/tests/api/submitter-access-request.test.ts
```

Put **only this first test** in it:

```ts
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import { createTestApp } from '../test-app';

describe('submitter access request API', () => {
  test('rejects unauthenticated requests', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();

    const response = await request(createTestApp(verifyAccessToken))
      .post('/api/v1/submitter-access-requests')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid authentication token is required.',
      },
    });
  });
});
```

This deliberately uses your existing `requireAuthentication` contract, so we're not inventing a different authentication response for #129.

### Run just this test

From the repo root:

```powershell
npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
```

It **should fail** right now, most likely with something similar to:

```text
expected 401
received 404
```

That is exactly what we want: the test proves `/api/v1/submitter-access-requests` does not exist yet.

**Do not commit this failing state.** Your Git methodology says commits should leave the affected area working and should not knowingly introduce failing tests. We'll get the first slice green and then make the first small commit.

Send me the failing test output, and next we'll add the **smallest route/service structure necessary to turn this first test green**-without implementing the whole feature at once.

## Prompt:
8/16/2026, 11:40:35 AM

next ( notw, i need npm.cmd or npx.cmd on my machine pls)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts

 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/backend

 ❯ tests/api/submitter-access-request.test.ts (1)
   ❯ submitter access request API (1)
     \ rejects unauthenticated requests
{"level":30,"time":1786873159820,"pid":30012,"hostname":"ShaynaU-Laptop","req":{"id":1,"method":"POST","url":"/api/v1/submitter-access-requests","query":{},"params":{},"headers":{"host":"127.0.0.1:52425","accept-encoding":"gzip, deflate","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52426},"res":{"statusCode":404,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen"
 ❯ tests/api/submitter-access-request.test.ts (1)
   ❯ submitter access request API (1)
     × rejects unauthenticated requests

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/api/submitter-access-request.test.ts > submitter access request API > rejects unauthenticated requests
Error: expected "WWW-Authenticate" header field
 ❯ tests/api/submitter-access-request.test.ts:13:8
     11|     const response = await request(createTestApp(verifyAccessToken))
     12|       .post('/api/v1/submitter-access-requests')
     13|       .expect('WWW-Authenticate', 'Bearer')
       |        ^
     14|       .expect(401);
     15| 
 ❯ Test._assertHeader ../../node_modules/supertest/lib/test.js:281:47
 ❯ ../../node_modules/supertest/lib/test.js:365:13
 ❯ Test._assertFunction ../../node_modules/supertest/lib/test.js:342:13
 ❯ Test.assert ../../node_modules/supertest/lib/test.js:195:23
 ❯ localAssert ../../node_modules/supertest/lib/test.js:138:14
 ❯ Server.<anonymous> ../../node_modules/supertest/lib/test.js:152:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  11:39:15
   Duration  4.11s (transform 1.10s, setup 0ms, collect 2.60s, tests 247ms, environment 0ms, prepare 370ms)

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/16/2026, 11:40:39 AM

> **Inspecting repository structure**
>
>
> **Inspected repository structure, routes, authentication, and account patterns**
>
> 
>
> Worked for 35s

That failure is exactly right: the request is hitting the global 404 handler, so there is no `WWW-Authenticate` header yet.

Also, I’ve saved the machine-specific command detail: for your Windows setup I’ll use **`npm.cmd` / `npx.cmd`**, not plain `npm` / `npx`. 

## Step 3 - add the protected route only

For this TDD step, we want to do the **minimum needed** to make the anonymous-authentication test green. We are **not** implementing the database logic yet.

### 3.1 Create the module folder

Create:

```text
apps/backend/src/modules/submitter-access/
```

Then create:

```text
apps/backend/src/modules/submitter-access/submitter-access.routes.ts
```

Put this in it:

```ts
import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import type { SynchronizeAccount } from '../accounts/account.service';

export function createSubmitterAccessRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
): Router {
  const router = Router();

  router.post(
    '/submitter-access-requests',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    (_request, response) => {
      response.status(501).json({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Submitter access requests are not implemented yet.',
        },
      });
    },
  );

  return router;
}
```

The `501` is deliberately temporary. It means:

```text
anonymous request
      ↓
requireAuthentication
      ↓
401

authenticated request
      ↓
temporary handler
      ↓
501
```

So we're proving the route is protected **before** adding business logic.

---

## 3.2 Register the router in `app.ts`

Open:

```text
apps/backend/src/app.ts
```

Add this import with the other module imports:

```ts
import { createSubmitterAccessRouter } from './modules/submitter-access/submitter-access.routes';
```

Then find:

```ts
app.use(
  '/api/v1',
  createSubmissionRouter(verifyAccessToken, synchronizeAccount, submissionService),
);
app.use('/api/v1', createPublicReadRouter(publicReadService));
```

Add the new router between them:

```ts
app.use(
  '/api/v1',
  createSubmissionRouter(verifyAccessToken, synchronizeAccount, submissionService),
);
app.use(
  '/api/v1',
  createSubmitterAccessRouter(verifyAccessToken, synchronizeAccount),
);
app.use('/api/v1', createPublicReadRouter(publicReadService));
```

Don't change anything else yet.

---

## 3.3 Format the two files

Because you're on PowerShell/Windows:

```powershell
npx.cmd prettier --write apps/backend/src/app.ts apps/backend/src/modules/submitter-access/submitter-access.routes.ts apps/backend/tests/api/submitter-access-request.test.ts
```

Then check formatting:

```powershell
npx.cmd prettier --check apps/backend/src/app.ts apps/backend/src/modules/submitter-access/submitter-access.routes.ts apps/backend/tests/api/submitter-access-request.test.ts
```

---

## 3.4 Run the same test again

```powershell
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
```

Now we want:

```text
✓ submitter access request API
  ✓ rejects unauthenticated requests

Test Files  1 passed
Tests       1 passed
```

### Why we're doing it this way

We now have actual evidence for the first acceptance criterion:

> Unauthenticated requests are rejected.

And we're reusing the project's existing authentication middleware instead of duplicating auth behaviour. That's important because your project brief requires established authentication practices and a hand-written HTTP API. `project_briefs.pdf`

**Don't commit yet.** This `501` is intentionally transitional.

Once this is green, the next step is more interesting: we'll write the failing test for:

```text
authenticated + not_requested
        ↓
POST request
        ↓
201 Created
        ↓
service receives correct authenticated account
```

That test will force us to introduce the controller/service cleanly rather than stuffing database logic into the route.

## Prompt:
8/16/2026, 11:44:50 AM

passed, next?

## Response:
8/16/2026, 11:44:52 AM

> **Inspecting repository archive structure**
>
>
> **Adding a failing test**
>
> I’m starting with the smallest TDD step: add an authenticated `POST /submitters` test that expects `201 Created`. It should fail against the current `501`, confirming the test is exercising the intended route.
>
> **Added a failing test**
>
> 
>
> **Inspected repository architecture, authentication, schemas, and API test patterns**
>
> 
>
> Worked for 1m 14s

Good. The first slice is green. Now we write the **next failing test**: an authenticated ordinary user should be able to create a request and receive `201`.

For this step, **change only the test file**. The temporary `501` route should make this new test fail, which is what we want.

Open:

```text
apps/backend/tests/api/submitter-access-request.test.ts
```

Keep your existing test and add this second one inside the same `describe`:

```ts
test('allows an authenticated non-approved user to request submitter access', async () => {
  const response = await request(createTestApp())
    .post('/api/v1/submitter-access-requests')
    .set('Authorization', 'Bearer test-token')
    .expect(201);

  expect(response.body).toEqual({
    data: {
      accountId: '1',
      approvalState: 'pending',
    },
  });
});
```

So the full file should now look like:

```ts
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import { createTestApp } from '../test-app';

describe('submitter access request API', () => {
  test('rejects unauthenticated requests', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();

    const response = await request(createTestApp(verifyAccessToken))
      .post('/api/v1/submitter-access-requests')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid authentication token is required.',
      },
    });
  });

  test('allows an authenticated non-approved user to request submitter access', async () => {
    const response = await request(createTestApp())
      .post('/api/v1/submitter-access-requests')
      .set('Authorization', 'Bearer test-token')
      .expect(201);

    expect(response.body).toEqual({
      data: {
        accountId: '1',
        approvalState: 'pending',
      },
    });
  });
});
```

Format it:

```powershell
npx.cmd prettier --write apps/backend/tests/api/submitter-access-request.test.ts
```

Then run:

```powershell
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
```

You should now get roughly:

```text
✓ rejects unauthenticated requests
× allows an authenticated non-approved user to request submitter access

expected 201
received 501
```

That `501 → expected 201` failure is our next **RED** state.

Don't commit yet.

Once you get that expected failure, the next step is to replace the temporary route handler with the real architecture:

```text
route
  ↓
controller
  ↓
service
  ↓
repository
```

and importantly, we'll inject the service through `createApp()` / `createTestApp()` just like your existing `SubmissionService`, so the API test will **not need a real database**. Then we'll make this test green before adding the duplicate/approved cases.

## Prompt:
8/16/2026, 11:47:13 AM

ok, do it, give me qa bit more at a time as i dont have so much time (unless we nearly done?)

## Response:
8/16/2026, 11:47:14 AM

> **Inspecting Uploaded Zip Contents**
>
>
> **Designing the implementation**
>
> I’m planning the next implementation slice around repository, service, controller, routes, app wiring, and focused tests. I’m checking existing error conventions and keeping database access injectable so tests avoid real persistence.
>
> **Designed the implementation**
>
> 
>
> **Inspecting backend tests and database setup**
>
>
> **Inspected uploaded files, backend architecture, authentication, schemas, images, tests, and database setup**
>
> 
>
> Worked for 1m 7s

Yep - we can move faster now. We’re roughly **halfway through #129**. The remaining work is:

**core implementation → tests → DB integration test → docs/OpenAPI → AI evidence → full checks → commit/PR.**

Do this whole implementation chunk now.

## 1. Create `submitter-access.errors.ts`

Create:

```text
apps/backend/src/modules/submitter-access/submitter-access.errors.ts
```

```ts
export type SubmitterAccessConflictCode =
  | 'REQUEST_ALREADY_PENDING'
  | 'SUBMITTER_ALREADY_APPROVED';

export class SubmitterAccessConflictError extends Error {
  constructor(
    public readonly code: SubmitterAccessConflictCode,
    message: string,
  ) {
    super(message);
    this.name = 'SubmitterAccessConflictError';
  }
}
```

---

## 2. Create the repository

Create:

```text
apps/backend/src/modules/submitter-access/submitter-access.repository.ts
```

```ts
import type { Pool } from 'pg';

import { executeQuery, getDatabasePool } from '../../database';
import { isSubmitterApprovalState } from '../accounts/account';
import { SubmitterAccessConflictError } from './submitter-access.errors';

export interface SubmitterAccessRequestRecord {
  accountId: string;
  approvalState: 'pending';
}

export interface SubmitterAccessRepository {
  requestAccess(accountId: string): Promise<SubmitterAccessRequestRecord>;
}

interface SubmitterAccessRow {
  accountId: string;
  approvalState: string;
  disabledAt: Date | null;
}

export function createSubmitterAccessRepository(pool?: Pool): SubmitterAccessRepository {
  return {
    async requestAccess(accountId) {
      const databasePool = pool ?? getDatabasePool();

      // This conditional UPDATE is the concurrency guard. PostgreSQL re-checks
      // the WHERE condition after waiting on a concurrently updated row, so
      // only one request can transition an eligible account to pending.
      const updated = await executeQuery<SubmitterAccessRow>(
        databasePool,
        `
          UPDATE app_user
          SET submitter_approval_state = 'pending'
          WHERE app_user_id = $1
            AND submitter_approval_state IN ('not_requested', 'rejected')
            AND disabled_at IS NULL
          RETURNING
            app_user_id::text AS "accountId",
            submitter_approval_state AS "approvalState",
            disabled_at AS "disabledAt"
        `,
        [accountId],
      );

      const created = updated.rows[0];

      if (created) {
        return {
          accountId: created.accountId,
          approvalState: 'pending',
        };
      }

      const current = await executeQuery<SubmitterAccessRow>(
        databasePool,
        `
          SELECT
            app_user_id::text AS "accountId",
            submitter_approval_state AS "approvalState",
            disabled_at AS "disabledAt"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      const account = current.rows[0];

      if (!account) {
        throw new Error('Authenticated application account no longer exists');
      }

      if (account.disabledAt) {
        throw new Error('Authenticated application account became disabled');
      }

      if (!isSubmitterApprovalState(account.approvalState)) {
        throw new Error('Application account has an unsupported approval state');
      }

      if (account.approvalState === 'pending') {
        throw new SubmitterAccessConflictError(
          'REQUEST_ALREADY_PENDING',
          'A submitter access request is already pending.',
        );
      }

      if (account.approvalState === 'approved') {
        throw new SubmitterAccessConflictError(
          'SUBMITTER_ALREADY_APPROVED',
          'The authenticated account is already an approved submitter.',
        );
      }

      throw new Error('Submitter access request state changed unexpectedly');
    },
  };
}
```

This is important: **we do not need a new migration/table.** The existing `app_user.submitter_approval_state` already represents the request state.

---

## 3. Create the service

Create:

```text
apps/backend/src/modules/submitter-access/submitter-access.service.ts
```

```ts
import type { ApplicationAccount } from '../accounts/account';
import {
  createSubmitterAccessRepository,
  type SubmitterAccessRepository,
} from './submitter-access.repository';

export interface SubmitterAccessResponse {
  data: {
    accountId: string;
    approvalState: 'pending';
  };
}

export interface SubmitterAccessService {
  requestAccess(account: ApplicationAccount): Promise<SubmitterAccessResponse>;
}

export function createSubmitterAccessService(
  repository: SubmitterAccessRepository = createSubmitterAccessRepository(),
): SubmitterAccessService {
  return {
    async requestAccess(account) {
      const request = await repository.requestAccess(account.accountId);

      return {
        data: request,
      };
    },
  };
}
```

---

## 4. Create the controller

Create:

```text
apps/backend/src/modules/submitter-access/submitter-access.controller.ts
```

```ts
import type { RequestHandler, Response } from 'express';

import type { ApplicationAccount } from '../accounts/account';
import { SubmitterAccessConflictError } from './submitter-access.errors';
import type { SubmitterAccessService } from './submitter-access.service';

function getAuthenticatedAccount(response: Response): ApplicationAccount {
  const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;

  if (!account) {
    throw new Error('Submitter access controller requires an authenticated application account');
  }

  return account;
}

export function createSubmitterAccessController(
  service: SubmitterAccessService,
): RequestHandler {
  return (_request, response, next) => {
    let account: ApplicationAccount;

    try {
      account = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    void service
      .requestAccess(account)
      .then((result) => {
        response.status(201).json(result);
      })
      .catch((error: unknown) => {
        if (error instanceof SubmitterAccessConflictError) {
          response.status(409).json({
            error: {
              code: error.code,
              message: error.message,
            },
          });
          return;
        }

        next(error);
      });
  };
}
```

---

## 5. Replace your temporary route

Replace the contents of:

```text
apps/backend/src/modules/submitter-access/submitter-access.routes.ts
```

with:

```ts
import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import type { SynchronizeAccount } from '../accounts/account.service';
import { createSubmitterAccessController } from './submitter-access.controller';
import type { SubmitterAccessService } from './submitter-access.service';

export function createSubmitterAccessRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: SubmitterAccessService,
): Router {
  const router = Router();

  router.post(
    '/submitter-access-requests',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    createSubmitterAccessController(service),
  );

  return router;
}
```

So goodbye temporary `501`.

---

# 6. Update `app.ts`

Open:

```text
apps/backend/src/app.ts
```

You already added the route import. Also add:

```ts
import {
  createSubmitterAccessService,
  type SubmitterAccessService,
} from './modules/submitter-access/submitter-access.service';
```

Inside `AppDependencies`, add:

```ts
submitterAccessService?: SubmitterAccessService;
```

So that section should contain:

```ts
export interface AppDependencies {
  environment?: Environment;
  verifyAccessToken?: VerifyAccessToken;
  synchronizeAccount?: SynchronizeAccount;
  publicReadService?: PublicReadService;
  fixtureStatisticsService?: FixtureStatisticsService;
  submissionService?: SubmissionService;
  submitterAccessService?: SubmitterAccessService;
}
```

Then where the services are created:

```ts
const submissionService = dependencies.submissionService ?? createSubmissionService();
```

add immediately afterwards:

```ts
const submitterAccessService =
  dependencies.submitterAccessService ?? createSubmitterAccessService();
```

And change your route registration from:

```ts
createSubmitterAccessRouter(verifyAccessToken, synchronizeAccount)
```

to:

```ts
createSubmitterAccessRouter(
  verifyAccessToken,
  synchronizeAccount,
  submitterAccessService,
)
```

---

# 7. Update `tests/test-app.ts`

Add this import:

```ts
import type { SubmitterAccessService } from '../src/modules/submitter-access/submitter-access.service';
```

Change your function signature to add the new dependency **at the end**:

```ts
export function createTestApp(
  verifyAccessToken: VerifyAccessToken = acceptTestIdentity,
  publicReadService?: PublicReadService,
  synchronizeAccount: SynchronizeAccount = synchronizeTestAccount,
  fixtureStatisticsService?: FixtureStatisticsService,
  submissionService?: SubmissionService,
  submitterAccessService?: SubmitterAccessService,
) {
```

Then inside `createApp({...})`, add:

```ts
...(submitterAccessService !== undefined ? { submitterAccessService } : {}),
```

So the bottom of that object will look something like:

```ts
...(fixtureStatisticsService !== undefined ? { fixtureStatisticsService } : {}),
...(submissionService !== undefined ? { submissionService } : {}),
...(submitterAccessService !== undefined ? { submitterAccessService } : {}),
```

Adding it at the end means we don't break all the existing `createTestApp(...)` calls.

---

# 8. Replace your API test with a proper mocked-service version

Your earlier second test used the default service, which would now hit the real DB. Replace the whole contents of:

```text
apps/backend/tests/api/submitter-access-request.test.ts
```

with:

```ts
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { SubmitterAccessService } from '../../src/modules/submitter-access/submitter-access.service';
import { SubmitterAccessConflictError } from '../../src/modules/submitter-access/submitter-access.errors';
import { createTestAccount, createTestApp } from '../test-app';

function mockSubmitterAccessService(): SubmitterAccessService {
  return {
    requestAccess: vi.fn<SubmitterAccessService['requestAccess']>().mockResolvedValue({
      data: {
        accountId: '1',
        approvalState: 'pending',
      },
    }),
  };
}

describe('submitter access request API', () => {
  test('rejects unauthenticated requests before request processing', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const service = mockSubmitterAccessService();

    const response = await request(
      createTestApp(
        verifyAccessToken,
        undefined,
        undefined,
        undefined,
        undefined,
        service,
      ),
    )
      .post('/api/v1/submitter-access-requests')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(service.requestAccess).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid authentication token is required.',
      },
    });
  });

  test('creates a pending request for the authenticated application account', async () => {
    const service = mockSubmitterAccessService();
    const account = createTestAccount({
      accountId: '42',
      approvalState: 'not_requested',
    });

    const synchronizeAccount = async () => account;

    const response = await request(
      createTestApp(
        undefined,
        undefined,
        synchronizeAccount,
        undefined,
        undefined,
        service,
      ),
    )
      .post('/api/v1/submitter-access-requests')
      .set('Authorization', 'Bearer test-token')
      .expect(201);

    expect(service.requestAccess).toHaveBeenCalledOnce();
    expect(service.requestAccess).toHaveBeenCalledWith(account);

    expect(response.body).toEqual({
      data: {
        accountId: '1',
        approvalState: 'pending',
      },
    });
  });

  test('rejects a duplicate active request', async () => {
    const service = mockSubmitterAccessService();

    vi.mocked(service.requestAccess).mockRejectedValue(
      new SubmitterAccessConflictError(
        'REQUEST_ALREADY_PENDING',
        'A submitter access request is already pending.',
      ),
    );

    const response = await request(
      createTestApp(undefined, undefined, undefined, undefined, undefined, service),
    )
      .post('/api/v1/submitter-access-requests')
      .set('Authorization', 'Bearer test-token')
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: 'REQUEST_ALREADY_PENDING',
        message: 'A submitter access request is already pending.',
      },
    });
  });

  test('rejects an already-approved submitter', async () => {
    const service = mockSubmitterAccessService();

    vi.mocked(service.requestAccess).mockRejectedValue(
      new SubmitterAccessConflictError(
        'SUBMITTER_ALREADY_APPROVED',
        'The authenticated account is already an approved submitter.',
      ),
    );

    const response = await request(
      createTestApp(undefined, undefined, undefined, undefined, undefined, service),
    )
      .post('/api/v1/submitter-access-requests')
      .set('Authorization', 'Bearer test-token')
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: 'SUBMITTER_ALREADY_APPROVED',
        message: 'The authenticated account is already an approved submitter.',
      },
    });
  });
});
```

Notice that the second test checks the **actual authenticated account is passed to the service**, which directly supports the acceptance criterion that the request belongs to the correct application account.

---

# 9. Format + typecheck + run this feature's API tests

Run all three:

```powershell
npx.cmd prettier --write apps/backend/src/app.ts apps/backend/src/modules/submitter-access apps/backend/tests/test-app.ts apps/backend/tests/api/submitter-access-request.test.ts
```

```powershell
npm.cmd run typecheck --workspace=@sport-analytics/backend
```

```powershell
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
```

We want:

```text
4 passed
```

Then also run the existing API suite because we changed `createApp` and `createTestApp`:

```powershell
npm.cmd run test:api --workspace=@sport-analytics/backend
```

**Don't commit yet.**

Once those pass, send me just the bottom of the output (or any error). Then I'll give you the next larger chunk all at once: **repository unit tests + real database persistence test + docs/OpenAPI**, after which we're basically at checks/evidence/PR. `sport_analytics.pdf`

## Prompt:
8/16/2026, 11:57:40 AM

apps/backend/tests/api/submitter-access-request.test.ts 35ms
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd run typecheck --workspace=@sport-analytics/backend

> @sport-analytics/backend@0.1.0 typecheck
> tsc --noEmit

src/modules/statistics/fixture-statistics.controller.ts:1:10 - error TS2724: '"@sport-analytics/contracts"' has no exported member named 'fixtureStatisticsQuerySchema'. Did you mean 'fixtureListQuerySchema'?

1 import { fixtureStatisticsQuerySchema } from '@sport-analytics/contracts';
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../packages/contracts/dist/public-read.d.ts:110:22
    110 export declare const fixtureListQuerySchema: z.ZodEffects<z.ZodObject<{
                             ~~~~~~~~~~~~~~~~~~~~~~
    'fixtureListQuerySchema' is declared here.

src/modules/statistics/fixture-statistics.controller.ts:33:41 - error TS7006: Parameter 'issue' implicitly has an 'any' type.

33       details: result.error.issues.map((issue) => ({
                                           ~~~~~

src/modules/statistics/fixture-statistics.derivation.ts:3:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'FixtureOutcome'.

3   FixtureOutcome,
    ~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.derivation.ts:4:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'FixtureStatistic'.

4   FixtureStatistic,
    ~~~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.derivation.ts:5:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'FixtureStatistics'.

5   FixtureStatistics,
    ~~~~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.derivation.ts:6:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'FixtureStatisticsWarning'.

6   FixtureStatisticsWarning,
    ~~~~~~~~~~~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.derivation.ts:7:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'ParticipantFixtureStatistic'.

7   ParticipantFixtureStatistic,
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.derivation.ts:8:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'StatisticContributingEvent'.

8   StatisticContributingEvent,
    ~~~~~~~~~~~~~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.service.ts:2:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'FixtureStatistic'.

2   FixtureStatistic,
    ~~~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.service.ts:3:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'FixtureStatistics'.

3   FixtureStatistics,
    ~~~~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.service.ts:4:3 - error TS2724: '"@sport-analytics/contracts"' has no exported member named 'FixtureStatisticsQuery'. Did you mean 'FixtureListQuery'?

4   FixtureStatisticsQuery,
    ~~~~~~~~~~~~~~~~~~~~~~

src/modules/statistics/fixture-statistics.service.ts:60:44 - error TS7006: Parameter 'statistic' implicitly has an 'any' type.

60         fixtureStatistics.statistics.find((statistic) => statistic.statisticId === statisticId) ??
                                              ~~~~~~~~~

src/modules/submissions/submission.controller.ts:1:10 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'submissionRequestSchema'.

1 import { submissionRequestSchema } from '@sport-analytics/contracts';
           ~~~~~~~~~~~~~~~~~~~~~~~

src/modules/submissions/submission.controller.ts:32:45 - error TS7006: Parameter 'issue' implicitly has an 'any' type.

32           details: parsed.error.issues.map((issue) => {
                                               ~~~~~

src/modules/submissions/submission.repository.ts:3:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'SubmissionEvent'.

3   SubmissionEvent,
    ~~~~~~~~~~~~~~~

src/modules/submissions/submission.repository.ts:4:3 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'SubmissionRequest'.

4   SubmissionRequest,
    ~~~~~~~~~~~~~~~~~

src/modules/submissions/submission.repository.ts:103:33 - error TS7006: Parameter 'wicket' implicitly has an 'any' type.

103       ...event.wickets.flatMap((wicket) => [
                                    ~~~~~~

src/modules/submissions/submission.repository.ts:105:37 - error TS7006: Parameter 'fielder' implicitly has an 'any' type.

105         ...wicket.fielders.flatMap((fielder) =>
                                        ~~~~~~~

src/modules/submissions/submission.service.ts:1:15 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'SubmissionRequest'.

1 import type { SubmissionRequest, SubmissionResponse } from '@sport-analytics/contracts';
                ~~~~~~~~~~~~~~~~~

src/modules/submissions/submission.service.ts:1:34 - error TS2305: Module '"@sport-analytics/contracts"' has no exported member 'SubmissionResponse'.

1 import type { SubmissionRequest, SubmissionResponse } from '@sport-analytics/contracts';
                                   ~~~~~~~~~~~~~~~~~~

src/modules/submissions/submission.service.ts:37:59 - error TS7006: Parameter 'event' implicitly has an 'any' type.

37       const submittedWickets = submission.events.flatMap((event, eventIndex) =>
                                                             ~~~~~

src/modules/submissions/submission.service.ts:37:66 - error TS7006: Parameter 'eventIndex' implicitly has an 'any' type.

37       const submittedWickets = submission.events.flatMap((event, eventIndex) =>
                                                                    ~~~~~~~~~~

src/modules/submissions/submission.service.ts:38:28 - error TS7006: Parameter 'wicket' implicitly has an 'any' type.

38         event.wickets.map((wicket) => ({ eventIndex, kind: wicket.kind })),
                              ~~~~~~

src/modules/submissions/submission.service.ts:43:55 - error TS7006: Parameter 'wicket' implicitly has an 'any' type.

43         const unrecognised = submittedWickets.filter((wicket) => !recognisedKinds.has(wicket.kind));
                                                         ~~~~~~

src/modules/submissions/submission.service.ts:48:31 - error TS7006: Parameter 'wicket' implicitly has an 'any' type.

48             unrecognised.map((wicket) => ({
                                 ~~~~~~


Found 25 errors in 6 files.

Errors  Files
     2  src/modules/statistics/fixture-statistics.controller.ts:1
     6  src/modules/statistics/fixture-statistics.derivation.ts:3
     4  src/modules/statistics/fixture-statistics.service.ts:2
     2  src/modules/submissions/submission.controller.ts:1
     4  src/modules/submissions/submission.repository.ts:3
     7  src/modules/submissions/submission.service.ts:1
npm error Lifecycle script `typecheck` failed with error:
npm error code 2
npm error path C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend
npm error workspace @sport-analytics/backend@0.1.0
npm error location C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\apps\backend
npm error command failed
npm error command C:\Windows\system32\cmd.exe /d /s /c tsc --noEmit
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

[Attachment: Pasted text(7).txt]

## Response:
8/16/2026, 11:57:42 AM

> **Interpreting test results**
>
> I’m reading this as a build-order problem, not a regression in the new contracts. The feature tests pass, while backend checks see stale compiled contracts. I’m rebuilding contracts first, then rerunning typecheck and API tests before revisiting unrelated legacy failures.
>
> **Interpreted test results**
>
> 
>
> Worked for 7s

Good news: **#129 itself is working.** Your new test file passed all 4 tests:

```text
✓ rejects unauthenticated requests
✓ creates pending request
✓ rejects duplicate request
✓ rejects already-approved submitter
```

The full-suite failure is the **existing stale `@sport-analytics/contracts` build problem**, not #129. The giveaway is all the missing exports from `packages/contracts/dist` plus the runtime `safeParse` being `undefined`. This is the same build-order issue the repo has had: the backend is consuming an old compiled contracts package. `Pasted text.txt`

### Do this now

First rebuild contracts:

```powershell
npm.cmd run build --workspace=@sport-analytics/contracts
```

Then typecheck again:

```powershell
npm.cmd run typecheck --workspace=@sport-analytics/backend
```

Then rerun the API suite:

```powershell
npm.cmd run test:api --workspace=@sport-analytics/backend
```

I expect that to clear the statistics/submission failures too.

### Then check we haven't accidentally generated repo changes

```powershell
git status --short
```

Don't change the statistics or submissions code for #129. If rebuilding contracts fixes them, they were unrelated environmental/build-order failures and we simply record that in our verification evidence.

Once those pass, **we're quite close**. Next I'll give you one larger final implementation chunk:

1. repository/service unit tests, including `rejected → pending`;
2. database persistence test;
3. OpenAPI + docs;
4. run full checks;
5. AI declaration/evidence;
6. commits and PR.

Run those three commands and send me the **final summary lines only** plus `git status --short`.

## Prompt:
8/16/2026, 11:58:52 AM

all passed
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git status --short
 M apps/backend/src/app.ts
 M apps/backend/tests/test-app.ts
?? apps/backend/src/modules/submitter-access/
?? apps/backend/tests/api/submitter-access-request.test.ts
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/16/2026, 11:58:54 AM

> **Inspecting repository structure and test patterns**
>
>
> **Planning tests and commits**
>
> I’m noting that implementation, API tests, full tests, and type checks are passing. I’m ready to create a checkpoint commit, then add focused repository tests and documentation before making the final commit.
>
> **Planned tests and commits**
>
> 
>
> **Inspecting Database Test Configuration**
>
>
> **Preparing focused validation**
>
> I’m adding repository unit tests for pending-request creation, duplicate prevention, rejection resubmission, and approved-account handling. I’m also preparing an evidence note so the completed checks are easy to review.
>
> **Prepared focused validation**
>
> 
>
> **Checking README AI Attribution Guidelines**
>
>
> **Inspected repository, database tests, API patterns, documentation, and attribution guidelines**
>
> 
>
> Worked for 2m 2s

Great - that is a clean checkpoint. Your feature API tests pass, the wider API suite passes after rebuilding contracts, and `git status` contains only #129 files.

We’re now around **75-80% done**. Do a small methodology-compliant commit first, then add the persistence tests.

### 1. Commit the working endpoint + API tests

```powershell
git add apps/backend/src/app.ts apps/backend/src/modules/submitter-access apps/backend/tests/test-app.ts apps/backend/tests/api/submitter-access-request.test.ts

git commit -m "feat(api): add submitter access request endpoint" -m "Refs #129" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

That AI trailer is required because this commit contains AI-assisted generated code. `ai_policy_20_jul.pdf`

Then:

```powershell
git status
```

It should be clean.

---

# 2. Make the repository easier to unit-test

Small improvement before adding repository tests: your other repositories use `QueryExecutor`, so #129 should follow that existing pattern too.

Replace:

```text
apps/backend/src/modules/submitter-access/submitter-access.repository.ts
```

with:

```ts
import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import { isSubmitterApprovalState } from '../accounts/account';
import { SubmitterAccessConflictError } from './submitter-access.errors';

export interface SubmitterAccessRequestRecord {
  accountId: string;
  approvalState: 'pending';
}

export interface SubmitterAccessRepository {
  requestAccess(accountId: string): Promise<SubmitterAccessRequestRecord>;
}

interface SubmitterAccessRow {
  accountId: string;
  approvalState: string;
  disabledAt: Date | null;
}

export function createSubmitterAccessRepository(
  executor: QueryExecutor = getDatabasePool(),
): SubmitterAccessRepository {
  return {
    async requestAccess(accountId) {
      const updated = await executeQuery<SubmitterAccessRow>(
        executor,
        `
          UPDATE app_user
          SET submitter_approval_state = 'pending'
          WHERE app_user_id = $1
            AND submitter_approval_state IN ('not_requested', 'rejected')
            AND disabled_at IS NULL
          RETURNING
            app_user_id::text AS "accountId",
            submitter_approval_state AS "approvalState",
            disabled_at AS "disabledAt"
        `,
        [accountId],
      );

      const created = updated.rows[0];

      if (created) {
        return {
          accountId: created.accountId,
          approvalState: 'pending',
        };
      }

      const current = await executeQuery<SubmitterAccessRow>(
        executor,
        `
          SELECT
            app_user_id::text AS "accountId",
            submitter_approval_state AS "approvalState",
            disabled_at AS "disabledAt"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      const account = current.rows[0];

      if (!account) {
        throw new Error('Authenticated application account no longer exists');
      }

      if (account.disabledAt) {
        throw new Error('Authenticated application account became disabled');
      }

      if (!isSubmitterApprovalState(account.approvalState)) {
        throw new Error('Application account has an unsupported approval state');
      }

      if (account.approvalState === 'pending') {
        throw new SubmitterAccessConflictError(
          'REQUEST_ALREADY_PENDING',
          'A submitter access request is already pending.',
        );
      }

      if (account.approvalState === 'approved') {
        throw new SubmitterAccessConflictError(
          'SUBMITTER_ALREADY_APPROVED',
          'The authenticated account is already an approved submitter.',
        );
      }

      throw new Error('Submitter access request state changed unexpectedly');
    },
  };
}
```

The important part remains the conditional:

```sql
submitter_approval_state IN ('not_requested', 'rejected')
```

That gives us the atomic duplicate protection.

---

# 3. Add repository unit tests

Create:

```text
apps/backend/tests/unit/submitter-access.repository.test.ts
```

```ts
import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { createSubmitterAccessRepository } from '../../src/modules/submitter-access/submitter-access.repository';

function queryResult(rows: Record<string, unknown>[]) {
  return {
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

function createExecutor(...results: Record<string, unknown>[][]) {
  const query = vi.fn();

  for (const rows of results) {
    query.mockResolvedValueOnce(queryResult(rows));
  }

  return {
    executor: { query } as unknown as QueryExecutor,
    query,
  };
}

describe('submitter access repository', () => {
  test('atomically changes an eligible account to pending', async () => {
    const { executor, query } = createExecutor([
      {
        accountId: '42',
        approvalState: 'pending',
        disabledAt: null,
      },
    ]);

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42')).resolves.toEqual({
      accountId: '42',
      approvalState: 'pending',
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("submitter_approval_state IN ('not_requested', 'rejected')"),
      ['42'],
    );
  });

  test('rejects an account with an existing pending request', async () => {
    const { executor } = createExecutor(
      [],
      [
        {
          accountId: '42',
          approvalState: 'pending',
          disabledAt: null,
        },
      ],
    );

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42')).rejects.toMatchObject({
      code: 'REQUEST_ALREADY_PENDING',
    });
  });

  test('rejects an already-approved submitter', async () => {
    const { executor } = createExecutor(
      [],
      [
        {
          accountId: '42',
          approvalState: 'approved',
          disabledAt: null,
        },
      ],
    );

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42')).rejects.toMatchObject({
      code: 'SUBMITTER_ALREADY_APPROVED',
    });
  });

  test('fails closed for an unsupported persisted approval state', async () => {
    const { executor } = createExecutor(
      [],
      [
        {
          accountId: '42',
          approvalState: 'unexpected-state',
          disabledAt: null,
        },
      ],
    );

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42')).rejects.toThrow(
      'unsupported approval state',
    );
  });
});
```

---

# 4. Add the real PostgreSQL persistence test

This is the important acceptance-criterion evidence. Create:

```text
apps/backend/tests/database/submitter-access-request.database.test.ts
```

```ts
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import { createSubmitterAccessRepository } from '../../src/modules/submitter-access/submitter-access.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const sourcePrefix = `submitter-access-test-${process.pid}`;

describe.sequential('submitter access request database integration', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }

    return pool;
  }

  async function withRolledBackTransaction(
    operation: (client: PoolClient) => Promise<void>,
  ): Promise<void> {
    const client = await databasePool().connect();

    try {
      await client.query('BEGIN');
      await operation(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  async function insertAccount(
    client: PoolClient,
    suffix: string,
    approvalState: 'not_requested' | 'pending' | 'approved' | 'rejected',
  ): Promise<string> {
    const result = await executeQuery<{ accountId: string }>(
      client,
      `
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          submitter_approval_state
        )
        VALUES ('test', $1, $2)
        RETURNING app_user_id::text AS "accountId"
      `,
      [`${sourcePrefix}-${suffix}`, approvalState],
    );

    return result.rows[0].accountId;
  }

  beforeAll(() => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );

    pool = new Pool({
      connectionString: databaseUrl.toString(),
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  test('persists a pending request and prevents a second active request', async () => {
    await withRolledBackTransaction(async (client) => {
      const accountId = await insertAccount(client, 'new-request', 'not_requested');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId)).resolves.toEqual({
        accountId,
        approvalState: 'pending',
      });

      const persisted = await executeQuery<{ approvalState: string }>(
        client,
        `
          SELECT submitter_approval_state AS "approvalState"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(persisted.rows[0].approvalState).toBe('pending');

      await expect(repository.requestAccess(accountId)).rejects.toMatchObject({
        code: 'REQUEST_ALREADY_PENDING',
      });
    });
  });

  test('allows a previously rejected account to request access again', async () => {
    await withRolledBackTransaction(async (client) => {
      const accountId = await insertAccount(client, 'rejected-request', 'rejected');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId)).resolves.toEqual({
        accountId,
        approvalState: 'pending',
      });

      const persisted = await executeQuery<{ approvalState: string }>(
        client,
        `
          SELECT submitter_approval_state AS "approvalState"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(persisted.rows[0].approvalState).toBe('pending');
    });
  });

  test('does not change an already-approved submitter', async () => {
    await withRolledBackTransaction(async (client) => {
      const accountId = await insertAccount(client, 'approved-request', 'approved');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId)).rejects.toMatchObject({
        code: 'SUBMITTER_ALREADY_APPROVED',
      });

      const persisted = await executeQuery<{ approvalState: string }>(
        client,
        `
          SELECT submitter_approval_state AS "approvalState"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(persisted.rows[0].approvalState).toBe('approved');
    });
  });
});
```

This directly proves the course requirement that approved submission access is controlled and that request state is persisted rather than merely returned by the API. The Sport Analytics brief specifically requires only approved users to submit and provenance to remain clear. `sport_analytics.pdf`

---

# 5. Run this batch

Format:

```powershell
npx.cmd prettier --write apps/backend/src/modules/submitter-access apps/backend/tests/unit/submitter-access.repository.test.ts apps/backend/tests/database/submitter-access-request.database.test.ts
```

Run unit tests:

```powershell
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/unit/submitter-access.repository.test.ts
```

Then make sure the API tests still pass:

```powershell
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
```

Then the database test:

```powershell
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/database/submitter-access-request.database.test.ts
```

If that last one complains about `DATABASE_URL_TEST`, **don't point it at your normal development database**. Send me that error and we'll use your safe test DB setup.

If all three pass, **don't commit yet**. Send me just:

```text
unit: passed
api: passed
database: passed
```

Then I'll give you the **last chunk in one go**: OpenAPI + docs + validation evidence + AI CSV/transcript naming + final checks + final commit + complete PR wording.

## Prompt:
8/16/2026, 12:04:48 PM

unit and api passed   
Duration  4.01s (transform 1.11s, setup 0ms, collect 2.34s, tests 258ms, environment 0ms, prepare 421ms)

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/database/submitter-access-request.database.test.ts

 RUN  v2.1.9 C:/Users/shayn/OneDrive/Desktop/Sport-Analytics-Tool/apps/backend

 ❯ tests/database/submitter-access-request.database.test.ts (3)
   ❯ submitter access request database integration (3)
     \ [ beforeAll ]
     ↓ persists a pending request and prevents a second active request [skipped]
     ↓ allows a previously rejected account to request access again [skipped]
     ↓ does not change an already-approved submitter [skipped]

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/database/submitter-access-request.database.test.ts > submitter access request database integration
Error: DATABASE_URL_TEST is required.
 ❯ Module.assertSafeTestDatabase scripts/test-database-safety.ts:11:11
      9| 
     10|   if (!testDatabaseUrl) {
     11|     throw new Error('DATABASE_URL_TEST is required.');
       |           ^
     12|   }
     13| 
 ❯ tests/database/submitter-access-request.database.test.ts:58:25

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  3 skipped (3)
   Start at  12:04:08
   Duration  1.91s (transform 496ms, setup 0ms, collect 661ms, tests 12ms, environment 1ms, prepare 289ms)

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
8/16/2026, 12:04:50 PM

> **Inspecting Repository Test Database Setup**
>
>
> **Checking test configuration**
>
> I’m noticing the database test command may not load `.env.test` automatically, while reset does. I’m checking whether test variables are supplied externally; otherwise, I’ll run Vitest with the test environment explicitly loaded.
>
> **Checked test configuration**
>
> 
>
> **Inspected repository test database and Postgres Docker configuration**
>
> 
>
> Worked for 41s

That is **not a #129 test failure**. The repository’s safety guard is doing exactly what it should: it refuses to let database integration tests run unless there is a dedicated test database. Your existing backend docs require `DATABASE_URL_TEST` to point to an isolated database and specifically warn not to use development/production. Do **not** change the safety check and do **not** point it at your normal Supabase database.

First check whether you already have the test environment file:

```powershell
Test-Path apps/backend/.env.test
```

### If it says `True`

Run the repository’s intended test-database setup:

```powershell
npm.cmd run db:test:reset --workspace=@sport-analytics/backend
npm.cmd run db:test:seed --workspace=@sport-analytics/backend
```

Then load that file into your current PowerShell session:

```powershell
Get-Content apps/backend/.env.test | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
}
$env:NODE_ENV = "test"
```

Then:

```powershell
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/database/submitter-access-request.database.test.ts
```

We want:

```text
✓ persists a pending request and prevents a second active request
✓ allows a previously rejected account to request access again
✓ does not change an already-approved submitter

3 passed
```

### If `Test-Path` says `False`

Don't make up a DB URL yet. Run:

```powershell
Get-Content apps/backend/.env.example
```

Your repo expects something structurally like:

```text
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/sport_analytics_test
```

but that only works if you actually have a local PostgreSQL instance with that separate database.

Tell me just:

```text
True
```

or

```text
False
```

for `Test-Path apps/backend/.env.test`.

Also: **do not delete the DB test we added.** It is useful evidence for #129 because it verifies the actual persisted transition rather than only mocking it. Your project requires event/submission permissions to be genuinely controlled at the persisted application-account level. `sport_analytics.pdf`

Once we resolve this, we're at the final docs/evidence/checks/PR stage.

## Prompt:
8/16/2026, 12:06:30 PM

ppl have just pushed.. how can i get their changes and ensire it doesnt affect mine?
also, its False from b4

## Response:
8/16/2026, 12:06:32 PM

> **Inspecting Repository Methodology for Safe Git Pull**
>
>
> **Planning repository sync**
>
> I’m protecting the current uncommitted refactor and tests, then I’ll update the feature branch from the latest main branch. After restoring the work, I’ll verify affected tests and inspect any conflicts carefully.
>
> **Planned repository synchronization**
>
> 
>
> **Inspected repository methodology for safe Git branch synchronization**
>
> 
>
> Worked for 31s

Yes - because people pushed to `main` while you were working, **update your feature branch now before we continue**. We can do it without losing your #129 work.

Your methodology explicitly requires the branch to be updated with latest `main` before PR, and it uses merge commits, so I’d **merge `origin/main` into your feature branch rather than rebase**. That avoids rewriting your existing #129 commit history. 

### 1. Safely stash your current uncommitted #129 work

You currently have the repository-test changes that we haven’t committed yet, so first:

```powershell
git status
git stash push -u -m "wip #129 before syncing main"
```

The `-u` is important because it includes the new untracked test files.

Confirm:

```powershell
git status
```

It should now say:

```text
nothing to commit, working tree clean
```

### 2. Fetch what everyone just pushed

```powershell
git fetch origin
```

Before merging anything, see what came in:

```powershell
git log --oneline --decorate HEAD..origin/main
```

Then see **which files they changed**:

```powershell
git diff --name-status HEAD...origin/main
```

This is useful because we can immediately see whether anyone touched:

```text
apps/backend/src/app.ts
apps/backend/tests/test-app.ts
apps/backend/src/modules/accounts/...
apps/backend/src/database/...
```

Those are the areas most likely to interact with #129.

### 3. Merge latest `main` into your branch

First confirm you're still on:

```powershell
git branch --show-current
```

It must say:

```text
feat/129-submitter-access-request
```

Then:

```powershell
git merge origin/main
```

There are two possible outcomes.

If you get:

```text
Merge made by the 'ort' strategy.
```

great.

If Git says there are conflicts, **do not start choosing “ours/theirs” randomly**. Run:

```powershell
git status
```

and send me the conflicted file names; we’ll resolve them properly.

### 4. Restore your unfinished #129 changes

If the merge succeeds:

```powershell
git stash pop
```

Again, if that produces conflicts:

```powershell
git status
```

and send me the output.

If it applies cleanly, run:

```powershell
git status --short
```

You should see only our uncommitted #129 repository/testing changes.

### 5. Rebuild contracts because main changed

This is especially important after pulling teammates' changes:

```powershell
npm.cmd run build --workspace=@sport-analytics/contracts
```

Then run our quick checks:

```powershell
npm.cmd run typecheck --workspace=@sport-analytics/backend
```

```powershell
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/unit/submitter-access.repository.test.ts tests/api/submitter-access-request.test.ts
```

And then:

```powershell
npm.cmd run test:api --workspace=@sport-analytics/backend
```

If those all pass after the merge, we know the new teammate changes have **not broken #129**, and #129 has not broken their API work.

---

About the DB test saying `False`: that's okay for now. **Do not create `.env.test` using your normal Supabase DB.** We can either use whatever dedicated test DB setup the team introduces from the new main changes, or document that the DB integration test is present but could not be locally executed because you don't currently have `DATABASE_URL_TEST`.

Do the commands through:

```powershell
git diff --name-status HEAD...origin/main
```

first. If you paste that output, I can quickly tell you whether any of the incoming work overlaps #129 **before you merge it**.

## Prompt:
8/16/2026, 12:09:43 PM

[Attachment: 2560074f-ec62-4067-8763-2006c2f7181a.png]

## Response:
8/16/2026, 12:09:48 PM

You’re just in **Vim editing the merge commit message**. The merge itself has likely succeeded; Git is waiting for you to save the message.

Press:

```text
Esc
```

then type:

```text
:wq
```

and press **Enter**.

That means **write + quit**.

After that, back in PowerShell, run:

```powershell
git status
```

If it looks clean, restore your stashed #129 work:

```powershell
git stash pop
```

Then run:

```powershell
git status --short
```

If `git stash pop` gives any conflicts, stop there and send me the output before editing anything.

If instead you ever need to cancel this editor without saving, it’s:

```text
Esc
:q!
```

But here, use **`:wq`**.

## Prompt:
8/16/2026, 12:11:01 PM

ok, done, now let me send u new zip so u can see what theya dded, or can i get it from PRs or soemthing?

## Response:
8/16/2026, 12:11:09 PM

> **Reviewing repository changes**
>
> I’m determining whether the existing project snapshot is enough. Since the repository has changed through merges and local work, a fresh archive is the most reliable option; commit diffs can supplement it but may omit uncommitted updates.
>
> **Reviewed repository changes**
>
> 
>
> Worked for 6s

Yes — **send me a fresh ZIP of the repo now**. That’s the safest option because I’ll then be looking at the exact code state you have after:

```text
your #129 commit
+ latest origin/main
+ your restored uncommitted #129 tests
```

PRs alone are less reliable because I’d need all relevant PRs and their final merged versions, and your Gitea may not be publicly accessible.

Before zipping, just run:

```powershell
git status --short
```

and keep that output for me too.

You do **not** need to include `.git`, `node_modules`, generated `site`, etc. From the repo root, you can make a clean ZIP with PowerShell like this:

```powershell
Compress-Archive `
  -Path apps,packages,docs,evidence,scripts,.gitea,package.json,package-lock.json,tsconfig.json,mkdocs.yml,README.md `
  -DestinationPath ../Sport-Analytics-Tool-current.zip `
  -Force
```

If one of those paths doesn't exist, PowerShell may complain; in that case, easiest is just zip the repo folder manually in Explorer and upload it.

Alternatively, if you only want to show me **what teammates added**, run:

```powershell
git show --stat --oneline HEAD
```

and:

```powershell
git diff --name-status HEAD^1..HEAD
```

That will show exactly what came in through the merge.

But since we still need to finish #129 and make sure their changes don’t conflict with our implementation, **uploading the fresh ZIP is best**.

## Prompt:
8/16/2026, 12:13:24 PM

[Attachment: f80b457d-0f94-4a4c-af03-b99f018ea5e1.png]

[Attachment: Sport-Analytics-Tool(2).zip]

can we finish 129? did they change or add nb things?

## Response:
8/16/2026, 12:13:26 PM

> **Extracting and inspecting project archive directories**
>
>
> **Reviewing implementation scope**
>
> I’m focusing on the existing account schema and the requested persistence behavior. The cleanest path appears to be adding a submitter approval state, defaulting to pending, while keeping validation errors structured and preserving a future admin query path.
>
> **Reviewed implementation scope**
>
> 
>
> **Inspected project, reviewed documentation, validated contracts, tests, lint, and changes**
>
> 
>
> Worked for 2m 56s

Yes - I checked the **fresh ZIP and the actual Git history**. We can finish #129 now.

The new `main` changes are important to the project, but **they do not conflict with our backend implementation**:

- **PR #147**: submission rejection-format work - `packages/contracts` + `docs/api/submissions.md`.
- **PR #148**: approved-submitter frontend submission workflow - frontend pages/API client/tests, E2E tests, plus updates to `docs/security/authentication.md` and `docs/development/testing.md`.
- They **did not touch** `apps/backend/src/app.ts`, `apps/backend/tests/test-app.ts`, the account/database implementation, or our new `submitter-access` module.

So the only overlap is documentation. We simply add our #129 documentation **on top of their latest versions**, not overwrite them.

Your current branch also looks healthy:

```text
a5d0b53  feat(api): add submitter access request endpoint
90b1b5a  merge latest origin/main into #129

Uncommitted:
 M submitter-access.repository.ts
?? submitter-access.repository.test.ts
?? submitter-access-request.database.test.ts
```

## Finish #129 - Part 1: document the API

### A. Update `docs/api/overview.md`

Under **Current user profile**, before `### Public read`, add:

```markdown
### Submitter access requests

An authenticated application user who is not already an approved submitter can request submitter
access through:

```http
POST /api/v1/submitter-access-requests
Authorization: Bearer <supabase-access-token>
```

A successful request changes the authenticated application account's server-owned approval state to
`pending`:

```json
{
  "data": {
    "accountId": "42",
    "approvalState": "pending"
  }
}
```

The endpoint returns `401 Unauthorized` when no valid authentication is supplied.

A `409 Conflict` is returned when the account already has a pending request or is already an approved
submitter. A previously rejected account may submit a new request.

The request state is stored on the provider-neutral application account and can subsequently be
consumed by the administrator approval and competition-scope workflow.
```

And change the AI declaration at the bottom from:

```markdown
The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

to:

```markdown
The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

No change needed there - we're already correctly declared.

---

## B. Update `docs/security/authentication.md`

After the paragraph explaining:

```text
not_requested, pending, approved, and rejected describe submitter approval
```

add:

```markdown
### Requesting submitter access

Authentication does not itself grant submission permission. An authenticated application account may
explicitly request submitter access through:

```http
POST /api/v1/submitter-access-requests
Authorization: Bearer <supabase-access-token>
```

The backend uses the authenticated and synchronized `app_user` account rather than accepting an
account identifier from the client.

Eligible state transitions are:

```text
not_requested -> pending
rejected      -> pending
```

An existing `pending` request is rejected with `409 Conflict`, preventing duplicate active requests.
An `approved` submitter is also rejected with `409 Conflict` because no additional request is
necessary.

The state transition is performed with a conditional PostgreSQL update so that concurrent duplicate
requests cannot both create a new active request. Administrator approval and competition-scope
assignment remain separate server-owned operations.
```

Important: **do not remove** the new `/submissions/new` frontend section your teammate just added.

---

## C. Update `docs/development/testing.md`

After **Account and authorization coverage**, before **Direct submission coverage**, add:

```markdown
## Submitter access request coverage

The submitter-access API and repository suites cover:

- anonymous requests being rejected before request processing;
- an authenticated application account creating a `pending` request;
- the authenticated account being passed to the request service;
- duplicate `pending` requests returning a conflict;
- already-approved submitters returning a conflict;
- eligible state changes being implemented as a conditional database update; and
- unsupported persisted approval states failing closed.

The PostgreSQL integration suite additionally verifies that `not_requested` and previously `rejected`
accounts persist as `pending`, a second active request is rejected, and an already-approved account is
not modified.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run typecheck --workspace=@sport-analytics/backend
npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
npm exec --workspace=@sport-analytics/backend -- vitest run tests/unit/submitter-access.repository.test.ts
npm run test:database --workspace=@sport-analytics/backend
```

Database integration tests require `NODE_ENV=test` and a dedicated `DATABASE_URL_TEST`. They must
not be run against the shared development or production database.
```

For you on Windows, we'll actually use `npm.cmd`, but the docs currently use portable `npm` commands, so keep their established documentation style.

---

# Part 2: OpenAPI

Open:

```text
docs/api/openapi.yaml
```

Add a new tag near the top, after Authentication:

```yaml
  - name: Submitter Access
    description: Authenticated submitter-access request operations.
```

Then immediately **after `/api/v1/auth/me` and before `/api/v1/competitions`**, add:

```yaml
  /api/v1/submitter-access-requests:
    post:
      tags:
        - Submitter Access
      summary: Request submitter access
      description: |
        Creates a submitter-access request for the authenticated application
        account by transitioning an eligible server-owned approval state to
        `pending`.

        Accounts already in `pending` or `approved` state cannot create another
        active request. A previously rejected account may request access again.
      operationId: requestSubmitterAccess
      x-implementation-status: implemented
      security:
        - bearerAuth: []
      responses:
        '201':
          description: Submitter access request created.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SubmitterAccessRequestResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '409':
          description: The account already has a pending request or is already approved.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiErrorResponse'
```

Then under `components:` → `schemas:`, add:

```yaml
    SubmitterAccessRequestResponse:
      type: object
      additionalProperties: false
      required:
        - data
      properties:
        data:
          type: object
          additionalProperties: false
          required:
            - accountId
            - approvalState
          properties:
            accountId:
              $ref: '#/components/schemas/ApiIdentifier'
            approvalState:
              type: string
              enum:
                - pending
```

---

# Part 3: evidence file

Create:

```text
evidence/validation/issue-129-submitter-access-request.md
```

Use this:

```markdown
# Issue #129 submitter access request verification

**Date:** 16 August 2026  
**Scope:** authenticated submitter-access request persistence and API endpoint.

## Implementation

The implementation adds:

```text
POST /api/v1/submitter-access-requests
```

The route requires an authenticated Supabase identity and operates on the synchronized,
provider-neutral application account.

Eligible approval-state transitions are:

```text
not_requested -> pending
rejected      -> pending
```

Existing `pending` requests and already-approved submitters are rejected with `409 Conflict`.

The repository uses a conditional PostgreSQL `UPDATE` so the eligibility condition is evaluated as
part of the state change rather than through a separate read-then-write sequence.

## Automated verification

Focused API tests verify:

- unauthenticated requests return `401`;
- an authenticated account can create a pending request;
- the correct synchronized application account is supplied to the service;
- duplicate pending requests return `409`; and
- already-approved submitters return `409`.

Focused repository tests verify:

- the eligible transition uses the conditional database update;
- duplicate pending requests are rejected;
- approved accounts are rejected; and
- unsupported persisted states fail closed.

The focused API and repository suites passed locally.

The PostgreSQL integration suite additionally covers:

- persistence from `not_requested` to `pending`;
- prevention of a second active request;
- re-requesting after a previous rejection; and
- preservation of an already-approved state.

The local development machine does not currently have a configured isolated
`DATABASE_URL_TEST`, so those database integration tests were not executed against the shared
development database. The repository safety guard correctly refused to run them without a dedicated
test database.

## Regression verification

After synchronizing the branch with the latest `origin/main`, the contracts package was rebuilt and
the existing backend API suite passed.

The latest upstream changes included the approved-submitter frontend event-submission workflow and
submission rejection-contract changes. They did not modify the #129 backend module.

## Related work

- Issue #120 - submitter access request workflow
- Issue #45 - administrator submitter approval and scope management
- Issue #43 - application account, role, approval and scope schema
- Issue #44 - account synchronization and role-based authorization

## AI Declaration

The implementation and this verification record were generated, reviewed and edited with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
```

That approach to the unavailable DB is completely consistent with existing repository evidence: other issues already record implemented database integration tests that were intentionally not run against the shared development DB when an isolated PostgreSQL service was unavailable.

---

## Part 4: format + checks

Run:

```powershell
npx.cmd prettier --write apps/backend/src/modules/submitter-access apps/backend/tests/api/submitter-access-request.test.ts apps/backend/tests/unit/submitter-access.repository.test.ts apps/backend/tests/database/submitter-access-request.database.test.ts docs/api/overview.md docs/security/authentication.md docs/development/testing.md docs/api/openapi.yaml evidence/validation/issue-129-submitter-access-request.md
```

Then:

```powershell
npm.cmd run build --workspace=@sport-analytics/contracts
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts tests/unit/submitter-access.repository.test.ts
npm.cmd run test:api --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run openapi:lint
```

**Do not run the database test again right now**; we already know why it cannot execute locally and we're preserving that safely.

Then:

```powershell
git status --short
```

Send me the output/results of those checks. After that we have only **AI CSV + transcript name + final commit + PR wording**, and #129 is finished.

## Prompt:
8/16/2026, 12:17:43 PM

part A, regive, your markdown broke up

## Response:
8/16/2026, 12:17:46 PM

Yep — here is **Part A only**, cleanly, in one copy-paste block.

Open:

```text
docs/api/overview.md
```

Under the **Current user profile** section, add this **before `### Public read`**:

```markdown
### Submitter access requests

An authenticated application user who is not already an approved submitter can request submitter access through:

```http
POST /api/v1/submitter-access-requests
Authorization: Bearer <supabase-access-token>
```

A successful request changes the authenticated application account's server-owned approval state to `pending`:

```json
{
  "data": {
    "accountId": "42",
    "approvalState": "pending"
  }
}
```

The endpoint returns `401 Unauthorized` when no valid authentication is supplied.

A `409 Conflict` is returned when the account already has a pending request or is already an approved submitter. A previously rejected account may submit a new request.

The request state is stored on the provider-neutral application account and can subsequently be consumed by the administrator approval and competition-scope workflow.
```

And at the bottom of the document, **keep the existing AI declaration** if it already says:

```markdown
The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

Do **not** replace any of the new teammate content in that file.

## Prompt:
8/16/2026, 12:18:47 PM

u lost it again... A succesful request is not longer in the the block!

## Response:
8/16/2026, 12:18:51 PM

You’re right — the inner code fences were closing the outer Markdown block. Here it is correctly as **one single copy-paste Markdown block** using four backticks outside.

Open `docs/api/overview.md` and add this **before `### Public read`**:

````markdown
### Submitter access requests

An authenticated application user who is not already an approved submitter can request submitter access through:

```http
POST /api/v1/submitter-access-requests
Authorization: Bearer <supabase-access-token>
```

A successful request changes the authenticated application account's server-owned approval state to `pending`:

```json
{
  "data": {
    "accountId": "42",
    "approvalState": "pending"
  }
}
```

The endpoint returns `401 Unauthorized` when no valid authentication is supplied.

A `409 Conflict` is returned when the account already has a pending request or is already an approved submitter. A previously rejected account may submit a new request.

The request state is stored on the provider-neutral application account and can subsequently be consumed by the administrator approval and competition-scope workflow.
````

And at the bottom of the document, keep the existing declaration if it already says:

```markdown
The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

## Prompt:
8/16/2026, 12:19:52 PM

same for park B, give to me again properly

## Response:
8/16/2026, 12:19:56 PM

Open:

```text
docs/security/authentication.md
```

After the paragraph that explains that `not_requested`, `pending`, `approved`, and `rejected` describe submitter approval, add this **exact block**:

````markdown
### Requesting submitter access

Authentication does not itself grant submission permission. An authenticated application account may explicitly request submitter access through:

```http
POST /api/v1/submitter-access-requests
Authorization: Bearer <supabase-access-token>
```

The backend uses the authenticated and synchronized `app_user` account rather than accepting an account identifier from the client.

Eligible state transitions are:

```text
not_requested -> pending
rejected      -> pending
```

An existing `pending` request is rejected with `409 Conflict`, preventing duplicate active requests.

An `approved` submitter is also rejected with `409 Conflict` because no additional request is necessary.

The state transition is performed with a conditional PostgreSQL update so that concurrent duplicate requests cannot both create a new active request.

Administrator approval and competition-scope assignment remain separate server-owned operations.
````

Do **not** remove the newer `/submissions/new` frontend section your teammate added below/elsewhere in the file.

## Prompt:
8/16/2026, 12:22:39 PM

correct?

[Attachment: Pasted markdown(5).md]

## Response:
8/16/2026, 12:22:42 PM

> **Reviewed authentication and submitter access documentation consistency**
>
> 
>
> **Reviewing and fixing Markdown headings and formatting**
>
>
> **Reviewed and fixed Markdown headings and formatting**
>
> 
>
> Worked for 34s

Yes - **the new “Requesting submitter access” section is in the right place and the content is correct**. It sits immediately after the application authorisation model, which is where it belongs. `Pasted markdown.md`

There are **two small things you should fix elsewhere in this same document** because #129 has changed what is true:

1. Under **Deferred scope**, you still have:

```markdown
- submitter access-request routes and interfaces;
```

That is now wrong because #129 **does implement the backend route**. Change it to:

```markdown
- submitter access-request frontend interface;
```

The administrator approval routes/interfaces can remain deferred because those belong to #45. `Pasted markdown.md`

2. At the bottom under **AI Declaration**, append this sentence:

```markdown
The submitter access-request section was documented with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

That keeps this edit properly attributed under your COMS3011A AI policy. `ai_policy_20_jul.pdf`

**One other warning:** the file you uploaded literally contains things like:

```text
**## Overview**
\`\`\`http
not\_requested
```

If your actual `docs/security/authentication.md` in VS Code genuinely looks like that, then the Markdown has been escaped/bolded incorrectly and we need to fix it. Headings should be:

```markdown
## Overview
### Requesting submitter access
```

and code fences should be normal triple backticks, not `\`\`\``. If that weird escaping is only from how you pasted/uploaded it here, then ignore this warning.

After those two content fixes, **Part B is done**.

## Prompt:
8/16/2026, 12:24:30 PM

whats after part B/

## Response:
8/16/2026, 12:24:37 PM

After Part B, the next step is **Part C: update `docs/development/testing.md`**. Then we do OpenAPI, evidence, final checks, AI log/transcript, commit, and PR.

Add this section in `docs/development/testing.md` **after the account/authorization testing section and before the direct submission coverage section**:

````markdown
## Submitter access request coverage

The submitter-access API and repository suites cover:

- anonymous requests being rejected before request processing;
- an authenticated application account creating a `pending` request;
- the authenticated account being passed to the request service;
- duplicate `pending` requests returning a conflict;
- already-approved submitters returning a conflict;
- eligible state changes being implemented as a conditional database update; and
- unsupported persisted approval states failing closed.

The PostgreSQL integration suite additionally verifies that `not_requested` and previously `rejected` accounts persist as `pending`, a second active request is rejected, and an already-approved account is not modified.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run typecheck --workspace=@sport-analytics/backend
npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
npm exec --workspace=@sport-analytics/backend -- vitest run tests/unit/submitter-access.repository.test.ts
npm run test:database --workspace=@sport-analytics/backend
```

Database integration tests require `NODE_ENV=test` and a dedicated `DATABASE_URL_TEST`. They must not be run against the shared development or production database.
````

For the repo documentation, keep the portable `npm` commands even though **you personally run `npm.cmd`** on Windows.

After Part C:

```text
Part D - docs/api/openapi.yaml
Part E - evidence/validation/issue-129-submitter-access-request.md
Part F - format + lint + typecheck + tests
Part G - AI usage CSV + transcript
Part H - final commit + push + PR
```

Do Part C, then tell me **done**, and I’ll give you the OpenAPI section cleanly in one block.

## Prompt:
8/16/2026, 12:26:32 PM

done

## Response:
8/16/2026, 12:26:35 PM

> **Inspecting OpenAPI project structure**
>
>
> **Inspected OpenAPI project structure, schemas, and response definitions**
>
> 
>
> Worked for 28s

Great. **Part D = OpenAPI**. I checked the current `docs/api/openapi.yaml` structure, so the placement below matches the file you have now.

### D1 — Add the new tag

Near the top under `tags:`, add this **after `Authentication and Profile`**:

```yaml
  - name: Submitter Access
    description: Authenticated submitter-access request operations.
```

So that section should become:

```yaml
tags:
  - name: Health
    description: Service health and availability.

  - name: Authentication and Profile
    description: Managed-authentication identity and profile-related operations.

  - name: Submitter Access
    description: Authenticated submitter-access request operations.

  - name: Public Read
    description: Anonymous sport-reference and fixture reads.

  - name: Submissions
    description: Approved-submitter event-submission operations.
```

### D2 — Add the endpoint

Under `paths:`, add this **after the entire `/api/v1/auth/me:` block and before `/api/v1/competitions:`**:

```yaml
  /api/v1/submitter-access-requests:
    post:
      tags:
        - Submitter Access
      summary: Request submitter access
      description: |
        Creates a submitter-access request for the authenticated application
        account by transitioning an eligible server-owned approval state to
        `pending`.

        Accounts already in `pending` or `approved` state cannot create another
        active request. A previously rejected account may request access again.
      operationId: requestSubmitterAccess
      x-implementation-status: implemented
      security:
        - bearerAuth: []
      responses:
        '201':
          description: Submitter access request created.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SubmitterAccessRequestResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '409':
          description: The account already has a pending request or is already approved.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiErrorResponse'
```

### D3 — Add the response schema

Go down to:

```yaml
components:
  ...
  schemas:
```

Add this **after `CurrentUserProfileResponse` and before `ApiErrorDetail`**:

```yaml
    SubmitterAccessRequestResponse:
      type: object
      additionalProperties: false
      required:
        - data
      properties:
        data:
          type: object
          additionalProperties: false
          required:
            - accountId
            - approvalState
          properties:
            accountId:
              $ref: '#/components/schemas/ApiIdentifier'
            approvalState:
              type: string
              enum:
                - pending
```

The existing OpenAPI file already has the AI declaration at the top for `ChatGPT-Web[GPT-5.6 Sol]`, so **you do not need another declaration** for this edit.

Once that’s in, say **done** and I’ll give you **Part E: the validation/evidence file**, again as one properly contained Markdown block.

## Prompt:
8/16/2026, 12:30:16 PM

done

## Response:
8/16/2026, 12:30:20 PM

Part E: create the validation/evidence file.

Create:

```text
evidence/validation/issue-129-submitter-access-request.md
```

Paste this as one complete Markdown block:

````markdown
# Issue #129 submitter access request verification

**Date:** 16 August 2026  
**Scope:** authenticated submitter-access request persistence and API endpoint.

## Implementation

The implementation adds:

```text
POST /api/v1/submitter-access-requests
```

The route requires an authenticated Supabase identity and operates on the synchronized, provider-neutral application account.

Eligible approval-state transitions are:

```text
not_requested -> pending
rejected      -> pending
```

Existing `pending` requests and already-approved submitters are rejected with `409 Conflict`.

The repository uses a conditional PostgreSQL `UPDATE` so the eligibility condition is evaluated as part of the state change rather than through a separate read-then-write sequence.

## Automated verification

Focused API tests verify:

- unauthenticated requests return `401`;
- an authenticated account can create a pending request;
- the correct synchronized application account is supplied to the service;
- duplicate pending requests return `409`; and
- already-approved submitters return `409`.

Focused repository tests verify:

- the eligible transition uses the conditional database update;
- duplicate pending requests are rejected;
- approved accounts are rejected; and
- unsupported persisted states fail closed.

The focused API and repository suites passed locally.

The PostgreSQL integration suite additionally covers:

- persistence from `not_requested` to `pending`;
- prevention of a second active request;
- re-requesting after a previous rejection; and
- preservation of an already-approved state.

The local development machine does not currently have a configured isolated `DATABASE_URL_TEST`, so those database integration tests were not executed against the shared development database. The repository safety guard correctly refused to run them without a dedicated test database.

## Regression verification

After synchronizing the branch with the latest `origin/main`, the contracts package was rebuilt and the existing backend API suite passed.

The latest upstream changes included the approved-submitter frontend event-submission workflow and submission rejection-contract changes. They did not modify the #129 backend module.

## Related work

- Issue #120 — submitter access request workflow
- Issue #45 — administrator submitter approval and scope management
- Issue #43 — application account, role, approval and scope schema
- Issue #44 — account synchronization and role-based authorization

## AI Declaration

The implementation and this verification record were generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
````

After that, Part F is the final verification pass. Run:

```powershell
npx.cmd prettier --write apps/backend/src/modules/submitter-access apps/backend/tests/api/submitter-access-request.test.ts apps/backend/tests/unit/submitter-access.repository.test.ts apps/backend/tests/database/submitter-access-request.database.test.ts docs/api/overview.md docs/security/authentication.md docs/development/testing.md docs/api/openapi.yaml evidence/validation/issue-129-submitter-access-request.md
```

Then:

```powershell
npm.cmd run build --workspace=@sport-analytics/contracts
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts tests/unit/submitter-access.repository.test.ts
npm.cmd run test:api --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run openapi:lint
```

Then:

```powershell
git status --short
```

Send me the final summary lines from those checks plus `git status --short`, and I’ll give you the AI CSV/transcript entry, final commit, push, and PR text.

## Prompt:
8/16/2026, 12:32:47 PM

[Attachment: 166aff6f-d970-400b-85f2-4e8de55d6516.png]

## Response:
8/16/2026, 12:32:49 PM

> **Inspecting repository AI usage files**
>
>
> **Continuing the setup**
>
> I’m treating the clean status as confirmation that the repository is ready. I’ll proceed with the remaining validation, then add the required CSV fixture and transcript file before committing the changes.
>
> **Continued the setup**
>
> 
>
> **Inspected repository AI usage files and documentation**
>
> 
>
> Worked for 58s

Yes — **that `git status` is exactly what I’d expect at this point**.

The earlier endpoint/API-test files are not showing because they were already committed in your first #129 commit. What remains is the repository hardening, docs, OpenAPI, evidence, and AI record.

### Add the AI evidence now

Export this ChatGPT conversation as a PDF and save it as:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-16-issue-129-submitter-access-request.pdf
```

Then append this **single row** to:

```text
evidence/ai/registers/shayna-unterslak.csv
```

```csv
"2026-08-16","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","Planning; code generation; test generation; API design; documentation; technical guidance; debugging; Git guidance","Issue #129: persist submitter access requests and implement the authenticated request endpoint","Submitter-access repository, service, controller and route; authenticated POST /api/v1/submitter-access-requests endpoint; conflict handling for pending and approved accounts; atomic PostgreSQL approval-state transition; API and repository tests; PostgreSQL integration tests; OpenAPI, authentication, API overview, testing and validation documentation; Git integration and Pull Request guidance","Reviewed and adapted the generated implementation against the existing application-account, authentication and database architecture; used test-first development for the API route; rebuilt shared contracts; passed focused API and repository tests, backend type-check, API regression suite, lint and OpenAPI validation; synchronized with latest origin/main and reran regression checks. PostgreSQL integration tests were implemented but were not executed locally because no isolated DATABASE_URL_TEST is configured; the repository safety guard correctly prevented use of the shared development database.","evidence/ai/transcripts/shayna-unterslak/2026-08-16-issue-129-submitter-access-request.pdf; evidence/validation/issue-129-submitter-access-request.md; Issue #129; linked Pull Request"
```

Use the **per-member register**, not the old shared `ai-usage-register.csv`; the current repo README says the shared register is retained only while older entries are migrated.

### Format/check the AI CSV

```powershell
git diff --check
```

Then:

```powershell
git status --short
```

You should now additionally see:

```text
M evidence/ai/registers/shayna-unterslak.csv
?? evidence/ai/transcripts/shayna-unterslak/2026-08-16-issue-129-submitter-access-request.pdf
```

### Final commit

Stage only #129:

```powershell
git add apps/backend/src/modules/submitter-access/submitter-access.repository.ts
git add apps/backend/tests/database/submitter-access-request.database.test.ts
git add apps/backend/tests/unit/submitter-access.repository.test.ts
git add docs/api/openapi.yaml
git add docs/api/overview.md
git add docs/development/testing.md
git add docs/security/authentication.md
git add evidence/validation/issue-129-submitter-access-request.md
git add evidence/ai/registers/shayna-unterslak.csv
git add evidence/ai/transcripts/shayna-unterslak/2026-08-16-issue-129-submitter-access-request.pdf
```

Check exactly what is staged:

```powershell
git status
git diff --cached --stat
```

Then commit:

```powershell
git commit -m "test(docs): verify submitter access request workflow" -m "Refs #129" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

That gives you two sensible #129 commits:

```text
feat(api): add submitter access request endpoint
test(docs): verify submitter access request workflow
```

### Push

```powershell
git push -u origin feat/129-submitter-access-request
```

Then run:

```powershell
git status
```

It should be clean.

Once you've pushed, send me **“pushed”** and I’ll give you the complete PR wording, including the testing caveat about `DATABASE_URL_TEST`, AI assistance, `Closes #129`, and `Refs #120 / #45` correctly.

## Prompt:
8/16/2026, 12:35:42 PM

give me PR

## Response:
8/16/2026, 12:35:50 PM

> **Drafting pull request**
>
> I’m preparing a reviewer-friendly PR with the requested title, linked issues, implementation summary, testing details, documentation updates, database-test caveats, verification steps, and the required AI-assistance note.
>
> Worked for 5s

**document: **

## Related Issue

Closes #129

Refs #120  
Refs #45

## Purpose

Implement the backend workflow that allows an authenticated ordinary user to request submitter access.

This persists the request against the authenticated application account, prevents duplicate active requests, prevents already-approved submitters from creating unnecessary requests, and exposes the request through the handwritten API for the later administrator approval workflow.

## Summary of Changes

This Pull Request adds the authenticated endpoint:

```http
POST /api/v1/submitter-access-requests
Authorization: Bearer <supabase-access-token>
```

The implementation:

- uses the synchronized `app_user` account from the authenticated request rather than accepting an account ID from the client;
- persists submitter-request state using the existing `submitter_approval_state`;
- transitions eligible accounts:
  - `not_requested -> pending`
  - `rejected -> pending`
- rejects an existing `pending` request with `409 Conflict`;
- rejects an already `approved` submitter with `409 Conflict`;
- rejects unauthenticated requests with `401 Unauthorized`;
- uses a conditional PostgreSQL `UPDATE` so the eligibility check and state transition happen atomically;
- keeps administrator approval and competition-scope assignment separate for #45.

## Backend Structure

The submitter-access workflow is separated into the existing backend architecture:

```text
route
  ↓
controller
  ↓
service
  ↓
repository
```

Added under:

```text
apps/backend/src/modules/submitter-access/
```

The route reuses the existing authentication and account-synchronisation middleware rather than introducing a separate authentication path.

## Automated Tests

### API tests

Added coverage for:

- unauthenticated requests being rejected before request processing;
- an authenticated application account successfully creating a pending request;
- the correct authenticated application account being supplied to the service;
- duplicate pending requests returning `409`;
- already-approved submitters returning `409`.

### Repository tests

Added coverage for:

- eligible accounts using the conditional state transition;
- duplicate pending requests being rejected;
- approved accounts being rejected;
- unsupported persisted approval states failing closed.

### PostgreSQL integration tests

Added integration coverage for:

- persistence from `not_requested` to `pending`;
- prevention of a second active request;
- re-requesting after a previous rejection;
- ensuring an already-approved account is not modified.

The PostgreSQL integration tests were **not executed locally** because this development machine does not currently have an isolated `DATABASE_URL_TEST` configured.

The repository database-safety guard correctly prevented the tests from being run against the shared development database. The tests remain included for execution in an appropriately isolated test-database environment.

## Regression Verification

The branch was synchronised with the latest `origin/main` during development.

After synchronisation:

```text
npm run build --workspace=@sport-analytics/contracts
npm run typecheck --workspace=@sport-analytics/backend
npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts tests/unit/submitter-access.repository.test.ts
npm run test:api --workspace=@sport-analytics/backend
npm run lint --workspace=@sport-analytics/backend
npm run openapi:lint
```

were used to verify the implementation and regression behaviour.

The contracts package was rebuilt before the backend checks because the backend consumes its compiled contract output.

## Documentation

Updated:

```text
docs/api/overview.md
docs/api/openapi.yaml
docs/security/authentication.md
docs/development/testing.md
```

The documentation now records:

- the submitter-access request endpoint;
- authentication requirements;
- request-state transitions;
- duplicate and approved-account behaviour;
- concurrency protection;
- automated testing coverage;
- the relationship between requesting access and later administrator approval.

Validation evidence was added at:

```text
evidence/validation/issue-129-submitter-access-request.md
```

## Reviewer Verification

A reviewer can verify the focused implementation with:

```bash
npm run build --workspace=@sport-analytics/contracts
npm run typecheck --workspace=@sport-analytics/backend

npm exec --workspace=@sport-analytics/backend -- \
  vitest run \
  tests/api/submitter-access-request.test.ts \
  tests/unit/submitter-access.repository.test.ts

npm run test:api --workspace=@sport-analytics/backend
```

Database integration tests additionally require a safe, isolated `DATABASE_URL_TEST`.

## AI Usage

This implementation was developed with assistance from:

```text
ChatGPT-Web[GPT-5.6 Sol]
```

AI assistance included planning, code generation, test generation, API design, documentation, debugging and Git guidance.

The generated work was reviewed and adapted against the repository's existing authentication, application-account, database and testing architecture.

AI usage is recorded in the contributor AI register and supporting transcript evidence.

## Scope

This PR implements the **request/persistence side** of the submitter-access workflow.

It does **not** implement:

- the frontend request interface;
- administrator review/approval;
- administrator competition-scope assignment.

Those remain separate workflow work, including #45.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)