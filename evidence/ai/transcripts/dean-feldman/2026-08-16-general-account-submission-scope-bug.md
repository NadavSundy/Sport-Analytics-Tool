# Account Submission Scope

**User:** Anonymous  
**Created:** 8/16/2026 19:32:09  
**Updated:** 8/16/2026 19:44:51  
**Exported:** 8/18/2026 12:25:36  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a81f40f-1990-83ea-914c-6663ee5d44e2](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a81f40f-1990-83ea-914c-6663ee5d44e2)  

## Prompt:
8/16/2026, 7:32:11 PM

![6f97e6cb-1909-47e4-ac47-f62ffcb8d22a.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000eac48243b17532a618e510dd&ts=496402&p=fs&cid=1&sig=904b674107e156c32db2ffe74f09a9d9bd75d17ac7562650177bf81d7ef168c8&v=0)

whatdoes ths mean

## Response:
8/16/2026, 7:32:09 PM

It means **your account is recognised as a submitter, but the system has not assigned you any fixtures that you are allowed to submit data for.**

So the role change worked:

- ✅ `application_role = 'submitter'`
- ✅ You have submission permission in principle
- ❌ Your account currently has **no competition/fixture scope assigned**

This matches the project requirement: approved submitters should only submit within a **defined part of the competition**. `sport_analytics (1).pdf`

### What needs to happen

You need to assign Dean's user account to a scope that contains fixtures. Conceptually:

```text
Dean
  ↓
application_role = submitter
  ↓
assigned competition / team / fixture scope
  ↓
fixtures become visible
  ↓
Dean can submit event data
```

For example, if your cricket competition contains:

```text
SA20 2026
├── Fixture 1
├── Fixture 2
├── Fixture 3
└── Fixture 4
```

Dean might be assigned:

```text
Dean → SA20 2026
```

or, depending on how your authorization design works:

```text
Dean → Fixture 1
Dean → Fixture 2
```

Right now it's essentially:

```text
Dean → submitter ✅
Dean → allowed fixtures [] ❌
```

**So this screen is not an error.** It's the frontend correctly telling you that authorization succeeded but the scope query returned zero fixtures.

The next thing we need to do is **add Dean to the relevant submitter scope in the database**. If you show me the tables related to `scope`, `competition`, `fixture`, or `submitter`, I can give you the exact SQL to make fixtures appear.

## Prompt:
8/16/2026, 7:33:56 PM

![936e920e-96c4-446e-a981-e012c7d47364.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000a1c081f4bc3f61c6c02811d6&ts=496402&p=fs&cid=1&sig=0a7e4a671dd8286b95430206c717493030dd5d3fca5d82adcc45d76c41280869&v=0)

## Response:
8/16/2026, 7:33:58 PM

> **Diagnosing server failure**
>
> I’m reading this as a backend error, not a frontend or CORS problem. The users request reaches the server, but `/api/v1/admin/users` crashes while processing data—possibly because the new `submitter` role isn’t accepted by an older schema or query.
>
> **Diagnosed server failure**
>
> 
>
> Worked for 5s

**Recommended outcome:** fix the backend/contract handling for the new `submitter` role. The screenshot shows the frontend successfully reaches your backend, but `GET /api/v1/admin/users` crashes with a **500 Internal Server Error**.

This is different from the earlier CORS problem.

### What the screenshot tells us

The important line is:

```text
Failed to load resource: the server responded with a status of 500
:3001/api/v1/admin/users
```

So the flow is:

```text
Frontend ✅
   ↓
GET http://localhost:3001/api/v1/admin/users
   ↓
Backend receives request ✅
   ↓
Something inside endpoint crashes ❌
   ↓
500 Internal Server Error
```

The yellow messages about:

```text
Env key MODE not found
```

and

```text
[AssignmentCache] no LMS adapter active
```

are **not the cause of this page failing**.

## Most likely cause

Because we just changed the account system from two roles to three roles:

```text
viewer
submitter
admin
```

a very likely problem is that **one part of the code still thinks the only valid roles are `viewer` and `admin`**.

For example, you may have something like:

```ts
z.enum(['viewer', 'admin'])
```

or:

```ts
type ApplicationRole = 'viewer' | 'admin';
```

Then the database returns Dean as:

```text
application_role = submitter
```

and `/api/v1/admin/users` tries to parse that row.

Result:

```text
"submitter" is not a recognised application role
→ exception
→ HTTP 500
```

That would fit extremely well with the timing of the problem.

### First check

From the repo root run:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  -E "viewer.*admin|admin.*viewer|application_role|ApplicationRole" \
  apps/backend apps/frontend packages
```

Then also:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  "admin/users" \
  apps/backend apps/frontend packages
```

We are looking for anything resembling:

```ts
['viewer', 'admin']
```

that should now be:

```ts
['viewer', 'submitter', 'admin']
```

---

### More importantly: look at the backend terminal

Keep the backend running:

```bash
npm run dev --workspace=@sport-analytics/backend
```

Then reload the **User Access Management** page.

The backend terminal should print the **actual exception** corresponding to:

```text
GET /api/v1/admin/users → 500
```

Send me that error.

That will tell us whether it's:

```text
Zod enum problem
database column problem
SQL constraint/problem
response validation problem
missing migration
repository mapping problem
```

### I would check these places specifically

Your three-role model needs to agree everywhere:

```text
DATABASE
application_role
  viewer
  submitter
  admin

        ↓

BACKEND DB TYPES / REPOSITORY

        ↓

BACKEND VALIDATION

        ↓

SHARED CONTRACTS

        ↓

ADMIN API

        ↓

FRONTEND TYPES
```

If even one still says:

```text
viewer | admin
```

you can get exactly this type of failure.

Also verify the database itself:

```sql
SELECT
    id,
    display_name,
    application_role,
    submitter_approval_state,
    disabled_at
FROM app_user
ORDER BY created_at DESC;
```

The exact ID column may differ in your schema, but the important thing is to see whether `submitter` is now being returned by the database.

### Don't change anything blindly yet

A `500` means the server has a programming/data problem. **Don't solve this by changing Dean back to `viewer` or `admin`.** Your three-role design is valid and is useful for the project because the brief specifically distinguishes approved submitters with defined competition scopes. `sport_analytics (1).pdf`

The proper fix is to ensure the application consistently understands:

```ts
viewer
submitter
admin
```

**Next action:** run the backend, reload this page once, and paste the backend terminal error here. From that I can tell you the exact file and change to make.

## Prompt:
8/16/2026, 7:35:59 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  -E "viewer.*admin|admin.*viewer|application_role|ApplicationRole" \
  apps/backend apps/frontend packages
apps/backend/src/modules/accounts/account.repository.ts:3:import { isApplicationRole, isSubmitterApprovalState, type ApplicationAccount } from './account';
apps/backend/src/modules/accounts/account.repository.ts:38:          application_role,
apps/backend/src/modules/accounts/account.repository.ts:46:        account.application_role AS role,
apps/backend/src/modules/accounts/account.repository.ts:61:        account.application_role,
apps/backend/src/modules/accounts/account.repository.ts:74:  if (!isApplicationRole(account.role)) {
apps/backend/src/modules/accounts/account.ts:2:  applicationRoleSchema,
apps/backend/src/modules/accounts/account.ts:4:  type ApplicationRole,
apps/backend/src/modules/accounts/account.ts:8:export type { ApplicationRole, SubmitterApprovalState } from '@sport-analytics/contracts';
apps/backend/src/modules/accounts/account.ts:14:  role: ApplicationRole;
apps/backend/src/modules/accounts/account.ts:20:export function isApplicationRole(value: string): value is ApplicationRole {
apps/backend/src/modules/accounts/account.ts:21:  return applicationRoleSchema.safeParse(value).success;
apps/backend/tests/database/account-schema.database.test.ts:187:              'application_role',
apps/backend/tests/database/account-schema.database.test.ts:205:      { tableName: 'app_user', columnName: 'application_role', nullable: 'NO' },
apps/backend/tests/database/account-schema.database.test.ts:242:        'app_user_application_role_ck',
apps/backend/tests/database/account-schema.database.test.ts:410:              INSERT INTO app_user (auth_provider, auth_subject, application_role)
apps/backend/tests/unit/account.repository.test.ts:101:      expect(conflictUpdate).not.toContain('application_role');
packages/contracts/src/auth.ts:5:export const applicationRoleSchema = z.enum(['viewer', 'administrator']);
packages/contracts/src/auth.ts:19:    role: applicationRoleSchema,
packages/contracts/src/auth.ts:46:export type ApplicationRole = z.infer<typeof applicationRoleSchema>;
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  "admin/users" \
  apps/backend apps/frontend packages
dean@Leonard

## Response:
8/16/2026, 7:36:02 PM

> **Identifying role mismatch**
>
> I’m seeing a likely mismatch: the shared contract defines `viewer | administrator`, while the application expects `viewer | submitter | admin`. I’d first standardize on one spelling, update the contract and database constraint, then rebuild dependent packages.
>
> **Identified role mismatch**
>
> 
>
> Worked for 6s

**You found the likely cause.** This line is the problem:

```text
packages/contracts/src/auth.ts:5:
export const applicationRoleSchema = z.enum(['viewer', 'administrator']);
```

Your database now contains a third role, `submitter`, but the shared application contract still only accepts two roles.

So when `/api/v1/admin/users` reads Dean from the database:

```text
application_role = submitter
```

the backend effectively does:

```ts
applicationRoleSchema.safeParse('submitter')
```

and gets:

```text
❌ invalid role
```

That lines up very well with the `500`.

## 1. Keep `administrator`, don't rename it to `admin`

Your code currently uses the canonical role:

```text
administrator
```

So your three application roles should preferably be:

```text
viewer
submitter
administrator
```

Your UI can display `"Admin"` to users, but internally keep `administrator` unless you deliberately migrate the whole application and database.

The Sport Analytics brief specifically requires **approved submitters with a defined competition scope**, so having a dedicated submitter role is sensible. `sport_analytics (1).pdf`

## 2. Change the shared contract

Open:

```bash
nano packages/contracts/src/auth.ts
```

Change:

```ts
export const applicationRoleSchema = z.enum(['viewer', 'administrator']);
```

to:

```ts
export const applicationRoleSchema = z.enum([
  'viewer',
  'submitter',
  'administrator',
]);
```

That's the first required fix.

## 3. Search for all other hard-coded role assumptions

Now run:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  -E "'viewer'|'submitter'|'administrator'|\"viewer\"|\"submitter\"|\"administrator\"" \
  apps packages
```

Paste that output if you want me to check each occurrence.

We specifically need to catch things such as:

```ts
role === 'viewer'
role === 'administrator'
```

or:

```ts
switch (role) {
  case 'viewer':
  case 'administrator':
}
```

that may need a `submitter` branch.

---

## 4. Check the database constraint

Your grep also found:

```text
app_user_application_role_ck
```

which means PostgreSQL probably has a `CHECK` constraint restricting valid roles.

Run this in Supabase SQL Editor:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'app_user_application_role_ck';
```

You ideally want something equivalent to:

```sql
CHECK (
  application_role IN (
    'viewer',
    'submitter',
    'administrator'
  )
)
```

If it already includes `submitter`, great.

If it only says:

```text
viewer
administrator
```

then the database migration also needs updating.

But because you apparently already managed to make Dean a `submitter`, I'm expecting you've already changed that constraint or the value wouldn't normally have been accepted.

## 5. Rebuild the contracts package

This is **important** because your application imports:

```ts
@sport-analytics/contracts
```

and you've previously had compiled `dist` files involved.

From the repo root run:

```bash
npm run build --workspace=@sport-analytics/contracts
```

Then check:

```bash
grep -Rni "submitter" packages/contracts/dist
```

You should see `submitter` in the compiled output.

If the workspace build command isn't available, run:

```bash
cat packages/contracts/package.json
```

and send me the scripts section.

---

## 6. Run the checks

From the repository root:

```bash
npm run typecheck
```

then:

```bash
npm test
```

If the project uses workspace-specific commands and either fails because of the command itself, send me the output rather than changing anything randomly.

## 7. Restart frontend and backend

After rebuilding contracts, stop the running dev servers with `Ctrl+C`.

Then restart them.

Backend:

```bash
npm run dev --workspace=@sport-analytics/backend
```

Frontend in another terminal:

```bash
npm run dev --workspace=@sport-analytics/frontend
```

Then reload:

```text
Administrator Workspace
→ User Access Management
```

### Expected result

Previously:

```text
Database
Dean = submitter
       ↓
Contracts know only:
viewer | administrator
       ↓
❌ validation
       ↓
500
```

After the fix:

```text
Database
Dean = submitter
       ↓
Contracts know:
viewer | submitter | administrator
       ↓
✅ valid account
       ↓
GET /api/v1/admin/users → 200
       ↓
User management loads
```

### One thing I would **not** do

Don't change this to:

```ts
['viewer', 'submitter', 'admin']
```

just because we call the role "admin" conversationally. Your existing code clearly uses:

```text
administrator
```

Changing that name creates a much larger migration.

**Do steps 2 and 3 first.** In particular, send me the result of the broader role search after you've changed `auth.ts`; I'll identify exactly which other files need modification before you commit anything.

## Prompt:
8/16/2026, 7:39:29 PM

![ca78c8c5-57c1-45aa-9556-cfd9d33cb026.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000349c81f4ad0052aea7e4c2af&ts=496402&p=fs&cid=1&sig=c1d0c5ad8cef5afb074b5b4c30cc8cd6b00863bd48afc19c2a4b9c654af19fc7&v=0)

admins shouldnt get this, admins and approved submitters should be fine

## Response:
8/16/2026, 7:40:52 PM

> **Clarifying access logic**
>
> I’m separating role from approval state: administrators should bypass submitter requests, approved submitters can submit within scope, and unapproved viewers should see the request flow. I’m checking whether frontend conditions currently conflate these states.
>
> **Clarified access logic**
>
> 
>
> Worked for 8s

Yes - **the current UI logic is wrong.** An `administrator` should not see “Request submitter access”, and an already approved submitter should not see it either.

The intended permission model should be:

| Account state | What the Account page should show | Can submit? |
|---|---|---:|
| `viewer` + `not_requested` | **Request submitter access** | ❌ |
| `viewer` + `pending` | Request pending | ❌ |
| `submitter` + `approved` | Submitter access approved / assigned scope | ✅ within scope |
| `submitter` + `approved`, no scope | Approved, but **No in-scope fixtures** | ❌ until scope assigned |
| `administrator` | Administrator access; **no request button** | ✅ |
| rejected/revoked submitter | Rejected/revoked state, optionally allow another request depending on your policy | ❌ |

That matches the project brief: ordinary submission is limited to **approved submitters within a defined competition scope**. `sport_analytics (1).pdf`

### Why you're seeing this

Your admin account apparently has something like:

```text
application_role = administrator
submitter_approval_state = not_requested
```

That's perfectly reasonable.

The bug is probably that the frontend does something conceptually like:

```tsx
if (account.submitterApprovalState === 'not_requested') {
  return <RequestSubmitterAccess />;
}
```

without checking:

```ts
account.role === 'administrator'
```

first.

### Fix the frontend logic

I would structure it explicitly:

```ts
const isAdministrator = account.role === 'administrator';

const isApprovedSubmitter =
  account.role === 'submitter' &&
  account.submitterApprovalState === 'approved';

const hasSubmissionAccess =
  isAdministrator || isApprovedSubmitter;

const canRequestSubmitterAccess =
  account.role === 'viewer' &&
  account.submitterApprovalState === 'not_requested';
```

Then:

```tsx
{isAdministrator && (
  <SubmitterAccessStatus
    title="Administrator access"
    description="Administrators have submission and management access."
  />
)}

{isApprovedSubmitter && (
  <SubmitterAccessStatus
    title="Submitter access approved"
    description="You may submit event data for fixtures within your assigned competition scope."
  />
)}

{canRequestSubmitterAccess && (
  <button onClick={requestSubmitterAccess}>
    Request submitter access
  </button>
)}
```

The important rule is:

```text
administrator
    ↓
DO NOT evaluate "not_requested" as needing submitter approval
```

because an administrator is a higher/different authorization path.

### Find the exact frontend file

Run:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  -E "Request submitter access|Submitter access|NOT REQUESTED|not_requested" \
  apps/frontend/src
```

Also:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  "submitterApprovalState" \
  apps/frontend/src
```

Send me the output and I can tell you the **exact lines to change**.

### Also fix the backend authorization

Don't make this only a visual fix.

Any endpoint that permits event submission should effectively enforce:

```ts
const maySubmit =
  account.role === 'administrator' ||
  (
    account.role === 'submitter' &&
    account.submitterApprovalState === 'approved'
  );
```

For ordinary submitters:

```text
approved submitter
      +
assigned competition scope
      ↓
may submit fixture
```

For administrators, I'd recommend:

```text
administrator
      ↓
scope bypass / all competition scopes
```

unless your team has deliberately decided that administrators should also receive explicit scopes.

### Tests worth adding

You should lock this behaviour down because it is authorization-sensitive:

```text
✅ viewer/not_requested → request button shown
✅ viewer/pending → request button hidden
✅ submitter/approved → request button hidden
✅ administrator/not_requested → request button hidden
✅ administrator → submission endpoint allowed
✅ approved submitter + matching scope → allowed
✅ approved submitter + wrong/no scope → 403
✅ viewer → submission endpoint 403
```

This is important beyond UX: **frontend hiding is not security**. The backend must independently enforce these permissions.

**Next step:** run the two `grep` commands above and paste the results. I'll point you to the exact component and condition to change.

## Prompt:
8/16/2026, 7:43:42 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  -E "Request submitter access|Submitter access|NOT REQUESTED|not_requested" \
  apps/frontend/src
apps/frontend/src/App.test.tsx:34:function currentUserResponse(approvalState: 'not_requested' | 'pending' | 'approved' | 'rejected') {
apps/frontend/src/App.test.tsx:207:    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
apps/frontend/src/App.test.tsx:249:    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
apps/frontend/src/App.test.tsx:262:      await screen.findByRole('button', { name: 'Request submitter access' }),
apps/frontend/src/App.test.tsx:267:    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
apps/frontend/src/App.test.tsx:298:    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
apps/frontend/src/features/README.md:8:approved-submitter access gate, scoped fixture selection, Basic delivery-event JSON editor, and
apps/frontend/src/features/submitter-access/submitter-access-api.ts:9:    super('The API returned an unexpected submitter access response. Please try again.');
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:100:describe('submitter access request and status interface', () => {
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:118:    expect(screen.queryByRole('heading', { name: 'Submitter access' })).not.toBeInTheDocument();
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:123:    let approvalState: SubmitterApprovalState = 'not_requested';
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:145:    fireEvent.click(await screen.findByRole('button', { name: 'Request submitter access' }));
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:162:    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:178:    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:185:    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:191:      .mockResolvedValueOnce(currentUser('not_requested'))
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:196:            message: 'A submitter access request is already pending.',
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:205:    fireEvent.click(await screen.findByRole('button', { name: 'Request submitter access' }));
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:211:    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:224:    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:234:    expect(screen.getByRole('button', { name: 'Request submitter access' })).toBeEnabled();
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:242:          user: { approvalState: 'not_requested' },
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:245:      .mockResolvedValueOnce(currentUser('not_requested'))
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:250:            message: 'Submitter access requests are temporarily unavailable.',
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:262:    fireEvent.click(await screen.findByRole('button', { name: 'Request submitter access' }));
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:265:      'Submitter access requests are temporarily unavailable.',
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:267:    expect(screen.getByRole('button', { name: 'Request submitter access' })).toBeEnabled();
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.tsx:134:          <h2 id="submitter-access-title">Submitter access</h2>
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.tsx:140:            {profileState.profile.approvalState === 'not_requested'
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.tsx:141:              ? 'Not requested'
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.tsx:194:            {isSubmitting ? 'Requesting access…' : 'Request submitter access'}
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  "submitterApprovalState" \
  apps/frontend/src
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:1:import type { SubmitterApprovalState } from '@sport-analytics/contracts';
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:61:function currentUser(approvalState: SubmitterApprovalState): Response {
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx:123:    let approvalState: SubmitterApprovalState = 'not_requested';
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
8/16/2026, 7:43:46 PM

> **Inspecting the component next**
>
> I’m going to review the surrounding `currentUser` loading logic and each role-check location before proposing edits. The key question is whether role data is missing, stale, or being compared against the wrong value.
>
> **Inspected the component next**
>
> 
>
> **Searching the web**
>
>
> **Narrowing the fix**
>
> I need the component’s role and approval-state logic before changing it. Please share the relevant `SubmitterAccessPanel.tsx`, contract type, and test sections so I can provide an exact patch without guessing field names or behavior.
>
> **Narrowed the fix**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 15s

**Recommended outcome:** hide the entire **Submitter access request panel for administrators**. Approved submitters should keep the panel only as a status display, with no request button.

Your grep has narrowed the bug to exactly this component:

```text
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.tsx
```

The component currently appears to make its decision mainly from:

```ts
profileState.profile.approvalState
```

but it also needs to consider the user's **application role**.

The intended rule is:

```ts
administrator → no submitter request UI
submitter + approved → approved status, no request button
viewer + not_requested → request button
viewer + pending → pending status, no button
viewer + rejected → rejected/re-request behaviour according to policy
```

This also fits the project brief, which specifically says submissions are for **approved submitters within a defined competition scope**. `sport_analytics (1).pdf`

### First, show me the exact component

Run:

```bash
sed -n '1,240p' \
  apps/frontend/src/features/submitter-access/SubmitterAccessPanel.tsx
```

And the beginning of its tests:

```bash
sed -n '1,220p' \
  apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx
```

Also show the current-user contract so I don't guess the property name:

```bash
sed -n '1,100p' packages/contracts/src/auth.ts
```

Paste those three outputs.

### The change we're likely making

It will probably be something like:

```ts
const isAdministrator =
  profileState.status === 'success' &&
  profileState.profile.role === 'administrator';
```

Then either completely skip the submitter-access panel for admins:

```tsx
if (isAdministrator) {
  return null;
}
```

or, if you want the Account page to explicitly communicate their privilege, show something like:

```text
Administrator access
You already have permission to manage and submit competition data.
```

I prefer **showing an administrator status rather than a request form**, because it makes the user's permissions obvious.

For the button itself, the condition should be narrow:

```ts
const canRequestSubmitterAccess =
  profileState.profile.role === 'viewer' &&
  profileState.profile.approvalState === 'not_requested';
```

Not merely:

```ts
profileState.profile.approvalState === 'not_requested'
```

That current approach is why an administrator whose approval state happens to be `not_requested` gets the button.

### Add a regression test too

You already have good tests in:

```text
SubmitterAccessPanel.test.tsx
```

Add one specifically for this case:

```ts
administrator + not_requested
→ no "Request submitter access" button
```

And preserve the existing approved-submitters case:

```ts
submitter + approved
→ no "Request submitter access" button
```

That protects this permission rule from breaking again.

**Next action:** paste those three `sed` outputs. Then I can give you the exact code edits instead of guessing around the component structure.

## Prompt:
8/16/2026, 7:44:29 PM

can you make a bug please so i canmake an issue

## Response:
8/16/2026, 7:44:31 PM

**Recommended outcome:** log this as a frontend authorization/UX bug and include a backend-permission check in the acceptance criteria so it cannot be fixed only by hiding the button.

**document: **

# Bug: Administrators are shown submitter-access request UI

## Description

The **Account** page currently displays the **Submitter access** request interface to users whose `application_role` is `administrator`.

An administrator may have:

```text
application_role = administrator
submitter_approval_state = not_requested
```

Because the frontend appears to determine whether to show the request UI primarily from `submitter_approval_state`, an administrator incorrectly sees:

> Request submitter access

Administrators should already have the necessary elevated access and should not need to request submitter approval.

Approved submitters should also not be shown the request button.

## Steps to reproduce

1. Sign in using an account with:
   - `application_role = administrator`
   - `submitter_approval_state = not_requested`
2. Navigate to the **Account** page.
3. Scroll to **Submitter access**.
4. Observe that **Request submitter access** is displayed.

## Current behaviour

Administrators with `submitter_approval_state = not_requested` are presented with the submitter-access request workflow.

## Expected behaviour

Permission/status behaviour should be:

- `viewer` + `not_requested`
  - Show **Request submitter access**.
- `viewer` + `pending`
  - Show pending status.
  - Do not show the request button.
- `submitter` + `approved`
  - Show approved submitter status.
  - Do not show the request button.
- `administrator`
  - Do not show the submitter-access request button.
  - Administrator submission/management access should be recognised independently of `submitter_approval_state`.

The frontend should not determine submission permission from approval state alone.

## Likely affected component

```text
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.tsx
```

Relevant existing tests:

```text
apps/frontend/src/features/submitter-access/SubmitterAccessPanel.test.tsx
```

## Required changes

- Include `application_role` when determining submitter-access UI state.
- Only allow the request action for eligible viewer accounts.
- Prevent administrators from entering the submitter request workflow.
- Ensure approved submitters are recognised correctly.
- Verify backend authorization also allows administrators independently of submitter approval state.
- Do not rely on frontend hiding as the security control.

## Acceptance criteria

- [ ] `viewer` + `not_requested` sees **Request submitter access**.
- [ ] `viewer` + `pending` does not see the request button.
- [ ] `submitter` + `approved` does not see the request button.
- [ ] `administrator` + `not_requested` does not see the request button.
- [ ] Administrators can access operations intended for administrators without requiring submitter approval.
- [ ] Approved submitters can submit only within their permitted competition scope.
- [ ] Viewers cannot access protected submission endpoints.
- [ ] Automated frontend tests cover administrator, viewer, and approved-submitter states.
- [ ] Relevant backend authorization tests continue to pass.
- [ ] Typecheck, lint, and automated tests pass.
- [ ] Documentation is updated if the documented role/permission model is affected.

## Reason

The Sport Analytics Tool requires submission to be restricted to approved users and defined competition scopes. The application should clearly distinguish ordinary viewers, approved submitters, and administrators rather than treating administrator accounts as unapproved submitter applicants.

## Priority

**High** - authorization-related UX bug.

## Milestone

**Milestone 1 / Foundations**, with regression coverage required before Milestone 2 core submission workflows.

The key point for the issue is that this is **not just a cosmetic bug**: the fix should establish the rule that `administrator` access and approved `submitter` access are two valid authorization paths. The project brief requires controlled submission by approved users within defined competition scope. `sport_analytics (1).pdf`



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)