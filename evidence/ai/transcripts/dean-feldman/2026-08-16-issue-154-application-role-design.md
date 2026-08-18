# Role access levels

**User:** Anonymous  
**Created:** 8/16/2026 17:30:48  
**Updated:** 8/16/2026 18:11:51  
**Exported:** 8/18/2026 12:25:25  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a81d79e-344c-83ea-b5ea-f1044c358f6d](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a81d79e-344c-83ea-b5ea-f1044c358f6d)  

## Prompt:
8/16/2026, 5:30:50 PM

what is the different roles ?

## Response:
8/16/2026, 5:30:47 PM

> **Identifying access roles**
>
> I’m distinguishing application roles from access levels: anonymous readers may consume public data, registered users manage profiles, approved submitters create competition data, and administrators manage users, approvals, competitions, and settings.
>
> **Identified access roles**
>
> 
>
> Worked for 12s

## Recommended role model

For **StatsTheGame / Sport Analytics Tool**, I’d keep the actual application roles simple:

| Role / access level | What they can do |
|---|---|
| **Public / Anonymous** | View fixtures, event data, player/team statistics, datasets, and use public read-only API endpoints. **Not necessarily stored as a database role.** |
| **Registered User** | Everything public users can do + manage their own account/profile, reset password, delete account, etc. Cannot submit official sport data. |
| **Approved Submitter** | Registered user who has been approved to submit/correct event data. Their permission should be limited to their assigned competition/team/season scope. |
| **Administrator** | Manage users, approve/revoke submitters, assign scopes, manage competitions, deal with submissions/corrections, and perform privileged administrative operations. |
| **API Consumer** | An external application/script consuming your API. This is better treated as an **API client/access category**, rather than a normal human role. At Intermediate tier, clients can receive API keys, quotas and rate limits. |

This fits the brief particularly well because it explicitly says **only approved submitters** should submit data and that each submitter should operate within a **defined part of the competition**. `sport_analytics (1).pdf`

### The important distinction in your current implementation

From the authorization work you've already been doing, the clean model is essentially:

```text
Anonymous
    │
    ▼
Registered User
    │
    ├── approvedSubmitter = true
    │       └── competition scopes [...]
    │
    └── role = ADMIN
```

So I would **not** make every permission a separate role.

For example, rather than:

```text
USER
SUBMITTER
CRICKET_SUBMITTER
IPL_SUBMITTER
ADMIN
SUPER_ADMIN
```

use something closer to:

```text
role:
  USER
  ADMIN

approvedSubmitter:
  true / false

competitionScopes:
  [competitionId1, competitionId2, ...]
```

That gives you much more flexible authorization.

For example:

> Sarah is a `USER`, `approvedSubmitter=true`, with access to Competition A.

She can submit data for Competition A, but not Competition B.

An administrator might be:

> Dean is `ADMIN`.

The server can give administrators broader management permissions independently of submitter scopes.

### What each role should probably see

**Public / anonymous**

```text
Home
Competitions
Fixtures
Teams
Players
Statistics
Datasets
API Documentation
```

Read-only.

**Registered user**

Everything above plus:

```text
Profile
Account settings
Delete account
```

The general project brief requires signup, login, password reset and account deletion. `project_briefs (4).pdf`

**Approved submitter**

Adds something like:

```text
Submission Dashboard
Submit Fixture
Upload Events
Submission History
Validation Errors
Correct Submission
```

But the **backend must check the user's scope**. Hiding a button on the frontend is not authorization.

**Administrator**

Adds:

```text
Admin Dashboard
Users
Submitter Approvals
Competition Scopes
Submissions
Competitions
Audit / Corrections
```

### One role you may add later: Reviewer

For the **Intermediate tier**, the project brief says submissions should undergo review before publication and corrections should retain history. `sport_analytics (1).pdf`

You therefore have two reasonable designs:

```text
Option A - simpler
ADMIN performs reviews
```

or

```text
Option B - stronger RBAC
USER
REVIEWER
ADMIN
```

For now, I'd use **Option A** unless your stakeholder specifically wants independent reviewers. You can introduce `REVIEWER` later without redesigning the whole authentication system.

### So, in short

Your main **human roles** should be:

**1. User → 2. Approved Submitter → 3. Administrator**

with **Anonymous/Public** as an unauthenticated access level and **API Consumer** as a separate external-client concept.

That keeps the authorization model simple while still satisfying the brief's requirements for approved submissions, scoped responsibility, authentication/security, API access, and eventually submission review. `sport_analytics (1).pdf` `project_briefs (4).pdf`

**Avoid:** creating lots of hard-coded roles such as `CRICKET_ADMIN`, `TEAM_SUBMITTER`, `COMPETITION_ADMIN`, etc. Use **role + approval + scopes** instead.

## Prompt:
8/16/2026, 5:31:33 PM

is it documented?

## Response:
8/16/2026, 5:31:33 PM

> **Searching the web**
>
>
> **Searching the web**
>
> 
>
> **Listing uploaded files for documentation verification**
>
>
> **Listed uploaded files for documentation verification**
>
> 
>
> Worked for 14s

**Partially.** The official brief documents the **Approved Submitter** concept very clearly, but it does **not** define the full role model I described (`USER`, `ADMIN`, public access, API consumer, etc.).

The Sport Analytics brief explicitly says that only **approved submitters** may submit data, that each submitter must operate within a **defined part of the competition**, and that it must remain clear who supplied each event. `sport_analytics (1).pdf` The general brief also documents the required authentication capabilities-signup, sign-in, password reset and account deletion-but does not prescribe specific application roles. `project_briefs (4).pdf`

For **your repository**, Issue #44 appears to have already added authorization-related documentation around account synchronisation, profiles, administrator access, approved submitters and competition scopes. However, I can't currently inspect the live Gitea repository-the repository URL is returning inaccessible/404 from my side-so I can't confirm whether there is a **single clear “Roles and Permissions” section/table** in the current docs.

I recommend explicitly documenting this in something like:

```text
docs/security/authorization.md
```

with a table such as:

| Access | Authenticated | Submit events | Scope restricted | Admin functions |
|---|---:|---:|---:|---:|
| Public | No | No | - | No |
| User | Yes | No | - | No |
| Approved Submitter | Yes | Yes | Yes | No |
| Administrator | Yes | Depends on policy | No / elevated | Yes |

Then explain that **Approved Submitter is a permission/status plus competition scopes**, rather than necessarily a completely separate authentication role.

That would strengthen your **security documentation, architecture documentation, setup understanding, and Milestone 1/2 evidence**, rather than leaving the authorization rules discoverable only from code.

If you send me the latest repo ZIP, I can check **exactly where roles are currently documented and tell you what is missing.**

## Prompt:
8/16/2026, 5:32:32 PM

give me the md file with 
'viewer' and 'admin'

help me change the db to allow for each

## Response:
8/16/2026, 5:32:33 PM

> **Inspecting schema options**
>
> I’m checking the repository structure and current database design first. I’ll tailor the migration to the existing vocabulary and workflows, then provide a Markdown implementation plan with model, migration, authorization, and UI changes.
>
> **Inspected schema options**
>
> 
>
> **Searching the web**
>
>
> **Designing database roles**
>
> I’m treating `viewer` and `admin` as explicit roles, while keeping submission approval as a separate capability. I’ll document the schema change, migration path, authorization rules, and safeguards against accidental privilege escalation.
>
> **Designed database roles**
>
> 
>
> **Searching the web**
>
> 
>
> **Creating roles and permissions documentation**
>
>
> **Created roles and permissions documentation**
>
> 
>
> Worked for 41s

## Recommended outcome

Use only **two stored account roles**:

- `viewer` - default registered user
- `admin` - privileged administrator

Keep **approved submitter** as a separate permission (`approved_submitter`) plus competition scopes. That preserves the brief requirement that only approved users may submit and that they are restricted to a defined competition scope. `sport_analytics (1).pdf`

I made the Markdown file for you:

[Download `roles-and-permissions.md`](sandbox:/mnt/data/roles-and-permissions.md)

I also included the required AI declaration because COMS3011A requires AI-assisted documents to declare the tool/model used. `ai_policy.pdf`

**document: **

# Roles and Permissions

## Purpose

StatsTheGame uses a deliberately small role model to keep authorization understandable and auditable.

The application has two stored account roles:

- `viewer`
- `admin`

Submission permission is **not** represented as a third role. A viewer may separately be approved as a submitter and restricted to specific competition scopes.

## Roles

### Viewer

`viewer` is the default role for a registered account.

A viewer may:

- sign in and manage their own account;
- view public fixtures, events, competitors and derived statistics;
- use functionality available to ordinary authenticated users;
- submit event data only if separately approved as a submitter; and
- submit only within competition scopes assigned to them.

A viewer may not:

- manage other users;
- grant or revoke submitter approval;
- assign competition scopes;
- change another user's role; or
- perform administrator-only operations.

### Admin

`admin` is a privileged role used for application administration.

An admin may:

- perform all ordinary authenticated-user actions;
- view and manage application users;
- grant or revoke approved-submitter status;
- assign or remove competition scopes;
- manage privileged submission/review workflows where permitted; and
- perform other explicitly documented administrator operations.

Administrator access must always be enforced by the backend. Hiding an admin control in the frontend is not sufficient authorization.

## Approved Submitter Permission

Submission access is represented separately from the account role.

Recommended authorization fields:

| Field | Example | Purpose |
|---|---|---|
| `role` | `viewer` | Account role: `viewer` or `admin` |
| `approved_submitter` | `true` | Whether the account may submit event data |
| competition scopes | competition UUIDs | Competitions the submitter may submit for |

Example:

```text
role = viewer
approved_submitter = true
competition_scopes = [competition-a]
```

This account may submit for `competition-a`, but may not perform administrator operations or submit outside its assigned scopes.

## Authorization Rules

| Action | Viewer | Approved viewer | Admin |
|---|---:|---:|---:|
| Read public statistics | Yes | Yes | Yes |
| Manage own account | Yes | Yes | Yes |
| Submit event data | No | Yes, within scope | According to application policy |
| Correct in-scope submissions | No | Yes, within workflow rules | Yes |
| Manage users | No | No | Yes |
| Approve submitters | No | No | Yes |
| Assign competition scopes | No | No | Yes |
| Change account roles | No | No | Yes |

## Backend Enforcement

Every privileged API endpoint must enforce authorization server-side.

1. Verify the user's authentication token.
2. Load their application account from the database.
3. For administrator endpoints, require `role = 'admin'`.
4. For submission endpoints, require `approved_submitter = true`.
5. Verify that the requested competition is within the user's assigned scopes.
6. Return `401 Unauthorized` for missing or invalid authentication.
7. Return `403 Forbidden` when authenticated users lack permission.

The frontend may hide unavailable controls, but the backend remains the authoritative security boundary.

## Database Constraints

The database should restrict `role` to:

```text
viewer
admin
```

`viewer` should be the default for newly created application accounts.

Administrator status must be granted explicitly through a privileged process and must never be accepted from user-controlled registration or profile data.

## Security Notes

- Never trust a role supplied by the frontend.
- Never store administrator authority in user-editable profile metadata.
- Privileged operations must go through the team's hand-written backend HTTP API.
- Keep authorization checks in reusable backend middleware/services.
- Preserve evidence of privileged role and approval changes where practical.
- Test allowed and denied cases for every privileged endpoint.

## AI Declaration

The preceding document was generated with the assistance of: ChatGPT Web[GPT-5.6 Sol].

## Now change the database

Because I can't access the internal Gitea repository directly, first check exactly how your current `app_user.role` column is defined before changing it. 

Run this against the **development database**:

```sql
SELECT
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'app_user'
  AND column_name = 'role';
```

Also see what roles currently exist:

```sql
SELECT role, COUNT(*)
FROM app_user
GROUP BY role
ORDER BY role;
```

### If `role` is `text` or `varchar`

Your migration can be:

```sql
BEGIN;

-- Remove an existing role CHECK constraint if this is its name.
-- PostgreSQL ignores this if it does not exist.
ALTER TABLE app_user
DROP CONSTRAINT IF EXISTS app_user_role_check;

-- Convert existing ordinary-user roles.
UPDATE app_user
SET role = 'viewer'
WHERE role IN ('user', 'USER', 'viewer', 'VIEWER');

-- Normalise existing admin roles.
UPDATE app_user
SET role = 'admin'
WHERE role IN ('admin', 'ADMIN');

-- Do NOT silently convert unexpected roles.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM app_user
        WHERE role IS NULL
           OR role NOT IN ('viewer', 'admin')
    ) THEN
        RAISE EXCEPTION
            'Unexpected app_user role exists. Migration aborted.';
    END IF;
END
$$;

ALTER TABLE app_user
ALTER COLUMN role SET DEFAULT 'viewer';

ALTER TABLE app_user
ALTER COLUMN role SET NOT NULL;

ALTER TABLE app_user
ADD CONSTRAINT app_user_role_check
CHECK (role IN ('viewer', 'admin'));

COMMIT;
```

Then verify it:

```sql
SELECT role, COUNT(*)
FROM app_user
GROUP BY role;
```

You should only see:

```text
viewer
admin
```

### Then verify submitter permission stays separate

Your conceptual `app_user` data should resemble:

```text
app_user
---------------------------------
id
auth_user_id
role                  viewer/admin
approved_submitter    true/false
...
```

and your competition-scope table should remain separate, something along the lines of:

```text
submitter_competition_scope
---------------------------------
user_id
competition_id
```

So someone can be:

```text
role = viewer
approved_submitter = true
```

without becoming an administrator.

### Very important

**Do not make registration accept `role`.**

New accounts should always become:

```text
role = viewer
```

The browser should never be allowed to submit:

```json
{
  "role": "admin"
}
```

and have the server trust it.

Your backend needs to own role changes, because the general brief specifically requires established authentication/security practices. `project_briefs (4).pdf`

### Tests to add

After changing this, make sure these pass:

```text
✓ new account defaults to viewer
✓ viewer can access ordinary authenticated endpoints
✓ viewer cannot access admin endpoint -> 403
✓ admin can access admin endpoint
✓ viewer cannot promote themselves
✓ approved viewer can submit within assigned scope
✓ approved viewer cannot submit outside assigned scope
✓ unapproved viewer cannot submit -> 403
```

**Next:** run the two inspection SQL queries above and paste me their output. I'll give you the **exact migration file for your current database schema** rather than guessing whether your `role` column is text or a PostgreSQL enum.

## Prompt:
8/16/2026, 5:35:11 PM

its nt role, its called **application\_role**

## Response:
8/16/2026, 5:35:10 PM

Yes - use **`application_role`**, not `role`.

Your model should be:

```text
application_role = viewer | admin
approved_submitter = true | false
competition scopes = separate permissions
```

That separation still matches the project brief: approved submitters need permission to submit within a defined competition scope, but that does not mean they need to be administrators. `sport_analytics (1).pdf`

### 1. First inspect the current column

Run:

```sql
SELECT
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'app_user'
  AND column_name = 'application_role';
```

Then see the current values:

```sql
SELECT application_role, COUNT(*)
FROM app_user
GROUP BY application_role
ORDER BY application_role;
```

### 2. If `application_role` is `text` / `varchar`

Use this migration:

```sql
BEGIN;

ALTER TABLE app_user
DROP CONSTRAINT IF EXISTS app_user_application_role_check;

-- Convert existing ordinary-user values to viewer.
UPDATE app_user
SET application_role = 'viewer'
WHERE application_role IN (
    'user',
    'USER',
    'viewer',
    'VIEWER'
);

-- Normalise administrator values.
UPDATE app_user
SET application_role = 'admin'
WHERE application_role IN (
    'admin',
    'ADMIN'
);

-- Abort instead of silently changing unexpected roles.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM app_user
        WHERE application_role IS NULL
           OR application_role NOT IN ('viewer', 'admin')
    ) THEN
        RAISE EXCEPTION
            'Unexpected app_user.application_role value exists. Migration aborted.';
    END IF;
END
$$;

ALTER TABLE app_user
ALTER COLUMN application_role SET DEFAULT 'viewer';

ALTER TABLE app_user
ALTER COLUMN application_role SET NOT NULL;

ALTER TABLE app_user
ADD CONSTRAINT app_user_application_role_check
CHECK (application_role IN ('viewer', 'admin'));

COMMIT;
```

Then verify:

```sql
SELECT application_role, COUNT(*)
FROM app_user
GROUP BY application_role
ORDER BY application_role;
```

Only these should exist:

```text
viewer
admin
```

### 3. Backend checks should also use `application_role`

Instead of:

```ts
user.role === 'admin'
```

use:

```ts
user.applicationRole === 'admin'
```

or, if your database object uses snake case directly:

```ts
user.application_role === 'admin'
```

Use whichever naming convention your repository already follows.

### 4. New users must default to viewer

Your server/database should create accounts as:

```text
application_role = viewer
```

Users must **never** be allowed to choose this during registration:

```json
{
  "application_role": "admin"
}
```

Admin promotion should only happen through an authorised backend/admin process.

### 5. Submitter permission remains independent

An ordinary submitter should look conceptually like:

```text
application_role = viewer
approved_submitter = true
competition_scope = Competition A
```

An ordinary user:

```text
application_role = viewer
approved_submitter = false
```

An administrator:

```text
application_role = admin
```

So the authorization rule becomes:

```ts
// Admin operation
applicationRole === 'admin'

// Submission operation
approvedSubmitter === true
&& userHasCompetitionScope(competitionId)
```

That is cleaner than making `submitter` another `application_role`.

Also, in the Markdown file I gave you, replace every database reference to `role` with **`application_role`**. The role names themselves remain `viewer` and `admin`.

**Next:** paste the output of:

```sql
SELECT
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'app_user'
  AND column_name = 'application_role';
```

and

```sql
SELECT application_role, COUNT(*)
FROM app_user
GROUP BY application_role;
```

Then I can give you the exact migration for your schema, especially if `application_role` is a PostgreSQL enum rather than plain text.

## Prompt:
8/16/2026, 5:36:18 PM

so make an issue to add so we can do it

## Response:
8/16/2026, 5:36:21 PM

> **Drafting role-management issue**
>
> I’m framing this as a ready-to-paste Gitea issue: define `viewer` and `admin` roles, preserve existing behavior, document the model, enforce permissions, add tests, and include migration and security acceptance criteria.
>
> **Drafted role-management issue**
>
> 
>
> Worked for 4s

**Recommended outcome:** create a **high-priority Milestone 1 issue** to standardise `application_role` to `viewer | admin`, keep submitter approval separate, update authorization logic, document the model, and add tests. This supports the authentication/security and documentation requirements while preserving the brief's separate concept of approved, competition-scoped submitters. `sport_analytics (1).pdf` `project_briefs (4).pdf`

**document: **

# Standardise `application_role` to `viewer` and `admin`

## Summary

Standardise application account roles so that `app_user.application_role` supports two explicit roles:

- `viewer`
- `admin`

`viewer` must be the default role for normal registered users.

Approved-submitter access must remain separate from `application_role`. Submission permission should continue to depend on submitter approval and the user's assigned competition scopes.

## Motivation

The current authorization model needs a clear distinction between ordinary users and administrators.

Using only `viewer` and `admin` for `application_role` keeps role-based authorization simple while allowing submission permissions to remain independently controlled.

The project brief requires:

- established authentication and security practices;
- approved users only for event submissions;
- submitters to operate within a defined competition scope; and
- clear traceability of submitted event data.

An approved submitter therefore does not need to become an administrator.

## Intended authorization model

### Viewer

A `viewer` is the default registered account.

A viewer may:

- use ordinary authenticated functionality;
- manage their own account;
- access permitted public/read functionality; and
- submit event data only when separately approved as a submitter and assigned the relevant competition scope.

A viewer may not:

- manage other users;
- change roles;
- approve submitters;
- assign competition scopes; or
- access administrator-only endpoints.

### Admin

An `admin` is a privileged application account.

An admin may perform documented administrative operations such as:

- managing users;
- granting/revoking submitter approval;
- assigning competition scopes;
- managing privileged submission/review operations; and
- accessing administrator-only API endpoints.

Admin authorization must always be enforced by the backend.

## Database changes

Update `app_user.application_role` so that only the following values are valid:

```text
viewer
admin
```

Requirements:

- [ ] Inspect the existing `application_role` type, constraints, defaults and existing values before creating the migration.
- [ ] Safely migrate existing ordinary-user values to `viewer`.
- [ ] Preserve/normalise existing administrator accounts as `admin`.
- [ ] Do not silently convert unknown role values.
- [ ] Set the default `application_role` to `viewer`.
- [ ] Ensure `application_role` cannot be `NULL`.
- [ ] Add or update the database constraint/enum so only `viewer` and `admin` are valid.
- [ ] Ensure the migration is reversible where practical.
- [ ] Update database documentation.

## Backend changes

- [ ] Update application role types/constants to use `viewer` and `admin`.
- [ ] Update account synchronisation so new accounts receive `application_role = 'viewer'`.
- [ ] Update administrator authorization checks to require `application_role = 'admin'`.
- [ ] Ensure registration/profile requests cannot supply or modify `application_role`.
- [ ] Ensure user-controlled Supabase metadata cannot grant administrator access.
- [ ] Keep approved-submitter checks separate from application-role checks.
- [ ] Continue enforcing competition scopes server-side for submissions.
- [ ] Return `401` for missing/invalid authentication.
- [ ] Return `403` when an authenticated account lacks the required authorization.

## Frontend changes

Where applicable:

- [ ] Update application role types from the API contract.
- [ ] Display/admin-gate administrative controls using the new role values.
- [ ] Do not rely on frontend role checks for security.
- [ ] Ensure normal registered users are treated as viewers.

## Documentation

Add or update a Roles and Permissions document explaining:

| Capability | Viewer | Approved Viewer | Admin |
|---|---:|---:|---:|
| Read public data | Yes | Yes | Yes |
| Manage own account | Yes | Yes | Yes |
| Submit event data | No | Yes, within assigned scope | According to admin policy |
| Manage users | No | No | Yes |
| Approve submitters | No | No | Yes |
| Assign competition scopes | No | No | Yes |
| Change application roles | No | No | Yes |

Document clearly that:

```text
application_role = viewer | admin
```

is independent from:

```text
approved_submitter = true | false
competition scopes = [...]
```

Example approved submitter:

```text
application_role = viewer
approved_submitter = true
competition_scopes = [competition-a]
```

## Automated tests

Add or update tests proving:

- [ ] New accounts default to `viewer`.
- [ ] Existing accounts migrate correctly.
- [ ] Invalid `application_role` values are rejected.
- [ ] A viewer can access ordinary authenticated endpoints.
- [ ] A viewer receives `403` from administrator endpoints.
- [ ] An admin can access administrator endpoints.
- [ ] A viewer cannot promote themselves to admin.
- [ ] Registration cannot request `application_role = admin`.
- [ ] Profile updates cannot modify `application_role`.
- [ ] An approved viewer can submit within an assigned competition scope.
- [ ] An approved viewer cannot submit outside their scope.
- [ ] An unapproved viewer cannot submit.
- [ ] Existing authentication/API tests continue to pass.

## Acceptance criteria

This issue is complete when:

1. `app_user.application_role` accepts only `viewer` and `admin`.
2. New registered accounts default to `viewer`.
3. Existing account data has been safely migrated.
4. Admin-only API functionality is enforced using `application_role = 'admin'`.
5. Users cannot grant themselves administrator privileges.
6. Approved-submitter permission remains independent of application roles.
7. Competition-scoped authorization still works.
8. Relevant frontend/API contracts are updated.
9. Automated allowed/denied authorization tests pass.
10. Database, security and authorization documentation is updated.
11. CI passes.
12. The changes have been reviewed through a pull request.

## Security considerations

- Never trust `application_role` supplied by the frontend.
- Never derive administrator access from user-editable metadata.
- Role changes must occur only through a trusted backend/administrative process.
- Backend authorization remains the security boundary.
- Existing secrets and authentication tokens must not be logged.
- Privilege escalation scenarios must be explicitly tested.

## Dependencies

Depends on the existing application-account/authentication and authorization foundation.

This issue should not replace the existing approved-submitter or competition-scope authorization model.

## Priority

**High**

Authorization and database-role decisions affect later submission workflows, admin functionality and security testing, so they should be stabilised early.

## Milestone

**Milestone 1 - Foundations**

## Evidence to preserve

- Database migration
- Updated schema/database documentation
- Roles and permissions documentation
- Authorization tests
- CI run
- Pull request and review
- Relevant API/security documentation updates
- AI-use record where applicable

### Suggested labels

`backend`, `database`, `security`, `documentation`, `testing`, `priority-high`, `milestone-1`

One important constraint: **do not change “approved submitter” into an `application_role`**. The project-specific brief explicitly makes approval and competition scope part of submission authorization, so keeping that separate is the safer design. `sport_analytics (1).pdf`

**Next action:** add this issue to Gitea, assign an owner, then make the database migration and backend changes together in one feature branch so the schema and code cannot drift apart.

## Prompt:
8/16/2026, 5:36:56 PM

![7147fdab-dcb7-4d38-bd39-c24ae2948b57.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000830481f4ba3a6767ef2f679f&ts=496402&p=fs&cid=1&sig=727b1b41c08736e70a58eac58af94868d9783c47b2eb0166cc51d1446b6ee61a&v=0)

## Response:
8/16/2026, 5:36:58 PM

> **Diagnosing the constraint**
>
> I’m reading the error as a database check constraint rejecting `admin`, even though the form displays `viewer`. I’d inspect the constraint definition first, then update the migration in the correct order: remove, modify, and recreate it.
>
> **Diagnosed the constraint**
>
> 
>
> Worked for 6s

The screenshot shows the exact problem: **your database still has the old check constraint** `app_user_application_role_ck`, and that constraint currently does **not allow `admin`**.

So when you try changing a user to:

```text
application_role = admin
```

PostgreSQL rejects it before saving.

### 1. Check what the constraint currently allows

Run this in the Supabase SQL editor:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
  AND conname = 'app_user_application_role_ck';
```

Also run:

```sql
SELECT DISTINCT application_role
FROM public.app_user
ORDER BY application_role;
```

That will tell us exactly what the old setup is.

### 2. Change the constraint to allow `viewer` and `admin`

If your intended model is now definitely:

```text
viewer
admin
```

run:

```sql
BEGIN;

ALTER TABLE public.app_user
DROP CONSTRAINT IF EXISTS app_user_application_role_ck;

ALTER TABLE public.app_user
ALTER COLUMN application_role SET DEFAULT 'viewer';

ALTER TABLE public.app_user
ALTER COLUMN application_role SET NOT NULL;

ALTER TABLE public.app_user
ADD CONSTRAINT app_user_application_role_ck
CHECK (application_role IN ('viewer', 'admin'));

COMMIT;
```

### 3. Verify it

Run:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
  AND conname = 'app_user_application_role_ck';
```

You should now see something equivalent to:

```text
CHECK (application_role IN ('viewer', 'admin'))
```

### 4. Then change the account to admin

After the constraint is fixed, changing:

```text
viewer
```

to:

```text
admin
```

in the Supabase table editor should work.

Or through SQL:

```sql
UPDATE public.app_user
SET application_role = 'admin'
WHERE id = 8;
```

Based on your screenshot, the rejected row appears to have `id = 8`, but **check that this is actually the account you want to promote before running that update**.

Then:

```sql
SELECT id, display_name, application_role
FROM public.app_user
ORDER BY id;
```

### Important for the project

Keep this structure:

```text
application_role
├── viewer
└── admin

approved_submitter
├── false
└── true
```

So an approved data submitter can still be:

```text
application_role = viewer
approved_submitter = true
```

without receiving administrator privileges. That matches the Sport Analytics brief's requirement for approved, scoped submitters. `sport_analytics (1).pdf`

Also, **don't just make this change manually in Supabase and leave it there**. Once it works, we should put the same SQL into a version-controlled database migration so every environment gets the same schema.

## Prompt:
8/16/2026, 6:00:54 PM

we need to adapt it to have 3 roles
1 viewer, 1 submitter, 1 admin

redo the issue and then also give me the sql stuff to edit the db

## Response:
8/16/2026, 6:00:56 PM

> **Clarifying role migration**
>
> I’m aligning the schema with three roles: viewer, submitter, and admin. I’ll preserve separate competition scopes, migrate approved submitters into the submitter role, and avoid conflicting role flags or duplicate sources of truth.
>
> **Clarified role migration**
>
> 
>
> Worked for 9s

**Recommended outcome:** make `application_role` the single source of truth with exactly three roles:

```text
viewer → submitter → admin
```

Keep **competition scopes separate** so a `submitter` is still restricted to the competitions they are authorised for. This directly reflects the project brief's requirement that only approved submitters may submit, and that each submitter operates within a defined part of the competition. `sport_analytics (1).pdf`

**document: **

# Add `viewer`, `submitter`, and `admin` Application Roles

## Summary

Update the application's authorization model so that `app_user.application_role` supports exactly three roles:

- `viewer`
- `submitter`
- `admin`

New accounts must default to `viewer`.

A `submitter` represents a user who has been approved to submit sport event data. Submitters must still be restricted to their assigned competition scopes.

An `admin` has privileged application-management permissions.

## Motivation

The Sport Analytics Tool requires different levels of access for ordinary users, approved data submitters, and administrators.

The application should therefore use a clear role model:

```text
viewer
  ↓
submitter
  ↓
admin
```

This allows authorization decisions to be made consistently across the database, backend API and frontend.

Competition scopes remain separate from the role because a submitter must only be able to submit within the part of the competition they have been assigned.

## Roles

### Viewer

A `viewer` is the default registered user.

A viewer may:

- view public fixtures;
- view competitors;
- view events;
- view derived statistics;
- use available datasets/API functionality;
- manage their own account.

A viewer may not:

- submit event data;
- modify official competition data;
- manage users;
- assign roles;
- assign competition scopes;
- access administrator functionality.

---

### Submitter

A `submitter` is an approved user who may submit and manage event data within their assigned competition scope.

A submitter may:

- perform all viewer operations;
- submit fixture/event data;
- view their submission history;
- correct or resubmit data where the workflow permits;
- access submission validation results.

A submitter may only submit data for competitions included in their assigned scopes.

A submitter may not:

- change their own role;
- change another user's role;
- assign competition scopes;
- manage users;
- perform administrator-only operations.

---

### Admin

An `admin` is a privileged application account.

An admin may:

- perform viewer operations;
- perform submitter operations;
- manage users;
- promote/demote users;
- assign or remove competition scopes;
- manage submission/review workflows;
- perform other documented administrator operations.

Administrator access must be enforced by the backend.

## Permission Matrix

| Capability | Viewer | Submitter | Admin |
|---|---:|---:|---:|
| View fixtures/statistics | Yes | Yes | Yes |
| Manage own account | Yes | Yes | Yes |
| Submit event data | No | Yes, within scope | Yes |
| Correct submitted data | No | Yes, where permitted | Yes |
| View submission history | No | Yes | Yes |
| Manage users | No | No | Yes |
| Assign roles | No | No | Yes |
| Assign competition scopes | No | No | Yes |
| Admin endpoints | No | No | Yes |

## Database Changes

Update:

```text
public.app_user.application_role
```

to accept only:

```text
viewer
submitter
admin
```

Requirements:

- [ ] Inspect existing role values before migration.
- [ ] Replace the existing `app_user_application_role_ck` constraint.
- [ ] Set `viewer` as the default role.
- [ ] Ensure `application_role` is `NOT NULL`.
- [ ] Preserve existing administrators as `admin`.
- [ ] Convert existing ordinary accounts to `viewer`.
- [ ] Convert currently approved submitters to `submitter`, where applicable.
- [ ] Reject unexpected role values instead of silently converting them.
- [ ] Preserve competition-scope assignments.
- [ ] Update database documentation.

## Approved Submitter Migration

If the existing database still contains a separate `approved_submitter` flag, migrate existing approved users to:

```text
application_role = 'submitter'
```

After the application has been migrated, `application_role` should become the source of truth for whether a user may submit.

The old `approved_submitter` field should then either:

1. be removed in a subsequent migration; or
2. be explicitly deprecated and no longer used for authorization.

There must not be two conflicting sources of truth for submission permission.

## Competition Scopes

Competition scopes remain separate from `application_role`.

For example:

```text
application_role = submitter
competition_scopes = [competition-a, competition-b]
```

This user may submit only for Competition A and Competition B.

Role checks alone are not sufficient for submission authorization.

The backend must verify both:

```text
application_role is submitter or admin
```

and:

```text
the requested competition is within the user's allowed scope
```

where applicable.

## Backend Changes

- [ ] Update application role types/constants to:
  - `viewer`
  - `submitter`
  - `admin`
- [ ] New accounts default to `viewer`.
- [ ] Update submitter middleware to require `application_role = 'submitter'` or `application_role = 'admin'`.
- [ ] Continue validating competition scope server-side.
- [ ] Admin middleware must require `application_role = 'admin'`.
- [ ] Registration must not accept `application_role`.
- [ ] Normal profile updates must not accept `application_role`.
- [ ] User-editable Supabase metadata must never determine application roles.
- [ ] Role changes must only be available through authorised administrator functionality.
- [ ] Return `401 Unauthorized` when authentication is missing/invalid.
- [ ] Return `403 Forbidden` when the account lacks the required role or competition scope.

## Frontend Changes

- [ ] Update frontend role types to support all three roles.
- [ ] Viewer UI must hide submission/admin functionality.
- [ ] Submitter UI must expose submission functionality.
- [ ] Admin UI must expose administrative functionality.
- [ ] Frontend checks are for UX only; backend checks remain authoritative.
- [ ] Update any route guards using old role names.

## API / Contract Changes

Update shared contracts and API schemas so `application_role` only accepts:

```text
viewer
submitter
admin
```

Update API documentation wherever user/account responses contain `application_role`.

## Automated Tests

Add or update tests proving:

- [ ] New accounts default to `viewer`.
- [ ] `viewer` is accepted.
- [ ] `submitter` is accepted.
- [ ] `admin` is accepted.
- [ ] Invalid role values are rejected.
- [ ] Viewer cannot submit event data.
- [ ] Submitter can submit within assigned scope.
- [ ] Submitter cannot submit outside assigned scope.
- [ ] Submitter cannot access administrator endpoints.
- [ ] Admin can access administrator endpoints.
- [ ] Admin can perform permitted submission operations.
- [ ] Users cannot promote themselves.
- [ ] Registration cannot request `submitter` or `admin`.
- [ ] Profile updates cannot change `application_role`.
- [ ] Existing authorization tests continue to pass.

## Documentation

Update:

- [ ] Roles and permissions documentation.
- [ ] Database/schema documentation.
- [ ] Security documentation.
- [ ] API documentation.
- [ ] Authentication/authorization documentation.

Document the final model clearly:

```text
application_role
├── viewer
├── submitter
└── admin
```

with competition scopes handled separately.

## Acceptance Criteria

This issue is complete when:

1. `app_user.application_role` accepts exactly `viewer`, `submitter`, and `admin`.
2. New users default to `viewer`.
3. Approved submitters use `application_role = 'submitter'`.
4. Existing administrators remain `admin`.
5. Competition scopes remain separately enforced.
6. Viewer accounts cannot submit.
7. Submitters cannot access administrator functionality.
8. Admin-only operations require `admin`.
9. Users cannot assign or modify their own role.
10. Backend, frontend and shared contracts use the same three roles.
11. Relevant automated authorization tests pass.
12. Database/security/API documentation has been updated.
13. CI passes.
14. Changes are reviewed through a pull request.

## Priority

**High**

The role model affects authentication, authorization, event submission, administrative functionality, database design and testing.

## Milestone

**Milestone 1 - Foundations**

## Evidence

Preserve:

- database migration;
- schema documentation;
- authorization documentation;
- automated tests;
- CI results;
- issue and pull request;
- code review;
- updated API documentation;
- AI-use evidence where applicable.

## AI Declaration

The preceding document was generated with the assistance of: ChatGPT Web[GPT-5.6 Sol].

This is now a better fit for your project-specific brief because **`submitter` explicitly represents the brief's approved submitter**, while competition scope still determines *where* they may submit. `sport_analytics (1).pdf`

## SQL - update the database

Because your screenshot shows the existing constraint is called:

```text
app_user_application_role_ck
```

you need to replace that constraint.

### 1. Inspect everything first

Run this before changing anything:

```sql
SELECT
    id,
    display_name,
    application_role
FROM public.app_user
ORDER BY id;
```

Then inspect the current constraint:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
  AND conname = 'app_user_application_role_ck';
```

Also check whether you still have an `approved_submitter` column:

```sql
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'app_user'
  AND column_name = 'approved_submitter';
```

---

# 2. Change the constraint to three roles

Run:

```sql
BEGIN;

ALTER TABLE public.app_user
DROP CONSTRAINT IF EXISTS app_user_application_role_ck;

ALTER TABLE public.app_user
ALTER COLUMN application_role SET DEFAULT 'viewer';

ALTER TABLE public.app_user
ALTER COLUMN application_role SET NOT NULL;

ALTER TABLE public.app_user
ADD CONSTRAINT app_user_application_role_ck
CHECK (
    application_role IN (
        'viewer',
        'submitter',
        'admin'
    )
);

COMMIT;
```

Now PostgreSQL will allow all three:

```text
viewer
submitter
admin
```

---

## 3. Verify the constraint

Run:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
  AND conname = 'app_user_application_role_ck';
```

You should see something equivalent to:

```sql
CHECK (
    application_role = ANY (
        ARRAY[
            'viewer',
            'submitter',
            'admin'
        ]
    )
)
```

That's fine.

---

# 4. Make a user a submitter

For example:

```sql
UPDATE public.app_user
SET application_role = 'submitter'
WHERE id = 8;
```

But change `8` to the actual user you intend to approve.

Check afterwards:

```sql
SELECT
    id,
    display_name,
    application_role
FROM public.app_user
ORDER BY id;
```

---

# 5. Make a user an admin

```sql
UPDATE public.app_user
SET application_role = 'admin'
WHERE id = 8;
```

Again, verify the user ID first.

---

# 6. Return someone to viewer

```sql
UPDATE public.app_user
SET application_role = 'viewer'
WHERE id = 8;
```

---

## If you currently have `approved_submitter`

This is important.

If your current table has something like:

```text
approved_submitter = true
```

then existing approved users should be migrated to the new role.

First inspect them:

```sql
SELECT
    id,
    display_name,
    application_role,
    approved_submitter
FROM public.app_user
WHERE approved_submitter = true;
```

If those are definitely the users that should become submitters:

```sql
UPDATE public.app_user
SET application_role = 'submitter'
WHERE approved_submitter = true
  AND application_role = 'viewer';
```

Then verify:

```sql
SELECT
    id,
    display_name,
    application_role,
    approved_submitter
FROM public.app_user
ORDER BY id;
```

### Don't delete `approved_submitter` yet

I would **not drop that column immediately**.

First change the backend from:

```ts
user.approvedSubmitter === true
```

to something like:

```ts
user.applicationRole === 'submitter'
|| user.applicationRole === 'admin'
```

and make sure all tests pass.

Then remove `approved_submitter` in a **separate migration** once nothing uses it.

That prevents breaking your existing backend.

---

# 7. Your final database model

Conceptually:

```text
app_user
────────────────────────────
id
auth_user_id
display_name
application_role
...
```

where:

```text
application_role
────────────────
viewer
submitter
admin
```

Then separately:

```text
submitter_competition_scope
───────────────────────────
app_user_id
competition_id
```

So:

```text
Dean
application_role = submitter

Scopes:
- Competition A
- Competition B
```

means Dean can submit A and B, but not C.

---

## Backend rule you ultimately want

Something along these lines:

```ts
const canSubmit =
  user.applicationRole === 'submitter' ||
  user.applicationRole === 'admin';
```

followed by:

```ts
if (!canSubmit) {
  return res.status(403).json({
    error: 'Forbidden',
  });
}
```

Then for a normal submitter:

```ts
if (
  user.applicationRole === 'submitter' &&
  !hasCompetitionScope(user, competitionId)
) {
  return res.status(403).json({
    error: 'Forbidden',
  });
}
```

The important security rule is:

```text
frontend role check = UX
backend role check = security
```

The general project brief requires established authentication/security practices, and the Sport Analytics brief specifically requires approved, scoped submission access. `project_briefs (4).pdf` `sport_analytics (1).pdf`

### Do these next

1. Create the Gitea issue above.
2. Run the constraint migration.
3. Confirm you can manually set `viewer`, `submitter`, and `admin`.
4. **Don't remove `approved_submitter` yet.**
5. Create a branch for the actual code migration.
6. Update backend → contracts → frontend → tests → docs.
7. Once the old boolean is unused, remove it in a later migration.

## Prompt:
8/16/2026, 6:03:07 PM

auth_provider
display_name
application_role
created_at
disabled_at
submitter_approval_state
last_authenticated_at

ghere is the table

## Response:
8/16/2026, 6:03:09 PM

> **Reframing role approval**
>
> I’m separating effective permissions from approval workflow: `application_role` controls access, while `submitter_approval_state` tracks requests. I’ll avoid inventing enum values and recommend inspecting constraints before updating migrations or approval logic.
>
> **Reframed role approval**
>
> 
>
> Worked for 8s

That table structure is actually better than the earlier assumption. **Do not remove `submitter_approval_state`.** Use the two fields for different purposes:

```text
application_role
├── viewer
├── submitter
└── admin

submitter_approval_state
└── tracks the submitter approval workflow
```

The Sport Analytics brief says submission must be restricted to **approved submitters** and tied to a defined part of the competition, so keeping an explicit approval workflow is useful. `sport_analytics (1).pdf`

### Recommended meaning of your table

| Column | Purpose |
|---|---|
| `auth_provider` | Authentication provider, e.g. Supabase |
| `display_name` | User-facing name |
| `application_role` | Effective authorization role: `viewer`, `submitter`, `admin` |
| `created_at` | Account creation timestamp |
| `disabled_at` | Account disabled timestamp; `NULL` while active |
| `submitter_approval_state` | Status of a request to become an approved submitter |
| `last_authenticated_at` | Last successful authentication |

The important part is:

```text
application_role = what the user can do NOW
submitter_approval_state = where their submitter application is in the workflow
```

So I would model the workflow like this:

```text
New account
application_role = viewer
        │
        │ requests submitter access
        ▼
application_role = viewer
submitter_approval_state = pending
        │
        ├── rejected ──> role remains viewer
        │
        └── approved ──> role becomes submitter
```

An admin is separately:

```text
application_role = admin
```

## Before changing the DB, inspect the real constraints

Run these in Supabase first:

```sql
SELECT
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'app_user'
  AND column_name IN (
      'application_role',
      'submitter_approval_state'
  );
```

Then:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
ORDER BY conname;
```

And see the values you currently have:

```sql
SELECT
    application_role,
    submitter_approval_state,
    COUNT(*)
FROM public.app_user
GROUP BY
    application_role,
    submitter_approval_state
ORDER BY
    application_role,
    submitter_approval_state;
```

That last query is important because I **don't want to guess the valid values of `submitter_approval_state`** and accidentally break your existing approval system.

## You can safely change the role constraint now

From your earlier error, we know the role constraint is:

```text
app_user_application_role_ck
```

To make it accept the three roles:

```sql
BEGIN;

ALTER TABLE public.app_user
DROP CONSTRAINT IF EXISTS app_user_application_role_ck;

ALTER TABLE public.app_user
ALTER COLUMN application_role SET DEFAULT 'viewer';

ALTER TABLE public.app_user
ALTER COLUMN application_role SET NOT NULL;

ALTER TABLE public.app_user
ADD CONSTRAINT app_user_application_role_ck
CHECK (
    application_role IN (
        'viewer',
        'submitter',
        'admin'
    )
);

COMMIT;
```

Verify:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
  AND conname = 'app_user_application_role_ck';
```

You should see all three roles allowed.

## Then test all three

Pick a test account ID carefully:

```sql
SELECT
    id,
    display_name,
    application_role,
    submitter_approval_state
FROM public.app_user
ORDER BY id;
```

Viewer:

```sql
UPDATE public.app_user
SET application_role = 'viewer'
WHERE id = 8;
```

Submitter:

```sql
UPDATE public.app_user
SET application_role = 'submitter'
WHERE id = 8;
```

Admin:

```sql
UPDATE public.app_user
SET application_role = 'admin'
WHERE id = 8;
```

### But don't manually alter approval state yet

We need to see what its current valid values actually are. It might currently use values such as:

```text
not_requested
pending
approved
rejected
```

but **those are examples, not confirmed values in your database**.

Once you paste the output of:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
ORDER BY conname;
```

I can give you the exact SQL for `submitter_approval_state` as well.

### The issue should also change slightly

The key requirement should now say:

> `application_role` is the effective authorization role (`viewer`, `submitter`, or `admin`), while `submitter_approval_state` records the submitter approval workflow. A submitter request does not grant submission permission until approved; upon approval, the user's effective role becomes `submitter`.

And **do not add/remove another `approved_submitter` boolean**. Your existing `submitter_approval_state` already handles that domain much better.

One more security rule: approving a submitter should ideally update the approval state and effective role in **one backend-controlled transaction**, not through two unrelated frontend operations. That prevents someone ending up as `submitter` while their approval still says rejected/pending.

## Prompt:
8/16/2026, 6:04:56 PM

![ca33118d-f211-48c5-bbc5-9bf14f4fdb8b.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000e668824680cfcf850c40941f&ts=496402&p=fs&cid=1&sig=651396c197d12d68d6ce478385cd3ba1c8c541757cc79ca674cecb809e8665a5&v=0)

## Response:
8/16/2026, 6:04:59 PM

The screenshot confirms the database is **still using the old role constraint**. PostgreSQL is rejecting:

```text
application_role = submitter
```

because `app_user_application_role_ck` does not currently include `submitter`.

There is also a second thing visible in the error: Dean's row would become:

```text
application_role = submitter
submitter_approval_state = not_requested
```

That is logically inconsistent. We should fix the role constraint first, then handle the approval workflow properly.

### 1. Replace the role constraint

Run this in the Supabase SQL editor:

```sql
BEGIN;

ALTER TABLE public.app_user
DROP CONSTRAINT IF EXISTS app_user_application_role_ck;

ALTER TABLE public.app_user
ALTER COLUMN application_role SET DEFAULT 'viewer';

ALTER TABLE public.app_user
ALTER COLUMN application_role SET NOT NULL;

ALTER TABLE public.app_user
ADD CONSTRAINT app_user_application_role_ck
CHECK (
    application_role IN (
        'viewer',
        'submitter',
        'admin'
    )
);

COMMIT;
```

### 2. Verify it

Run:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
  AND conname = 'app_user_application_role_ck';
```

You should see all three allowed values:

```text
viewer
submitter
admin
```

After that, the Supabase table editor will stop rejecting `submitter`.

### 3. But don't leave Dean as `submitter + not_requested`

Your screenshot shows:

```text
Dean Feldman
application_role = submitter
submitter_approval_state = not_requested
```

We want the model to behave like:

```text
Viewer:
application_role = viewer
submitter_approval_state = not_requested
```

```text
Requested:
application_role = viewer
submitter_approval_state = pending
```

```text
Approved:
application_role = submitter
submitter_approval_state = approved
```

```text
Rejected:
application_role = viewer
submitter_approval_state = rejected
```

But **don't run those approval values yet**, because we need to confirm what your database currently permits for `submitter_approval_state`.

Run this:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
ORDER BY conname;
```

And:

```sql
SELECT DISTINCT submitter_approval_state
FROM public.app_user
ORDER BY submitter_approval_state;
```

Paste those outputs here and I'll give you the exact approval-state SQL too.

### 4. Your final intended authorization model

I recommend:

| Role | Approval state | Meaning |
|---|---|---|
| `viewer` | `not_requested` | Normal user |
| `viewer` | `pending` | Asked to become submitter |
| `viewer` | `rejected` | Request rejected |
| `submitter` | `approved` | Approved data submitter |
| `admin` | independent | Administrator |

And competition scope remains separate, because the brief requires approved submitters to work within a defined part of the competition. `sport_analytics (1).pdf`

**For now:** run the first SQL block. That fixes the error in your screenshot. Then send me the two approval-state query results so we can make the workflow consistent too.

## Prompt:
8/16/2026, 6:06:48 PM

so make dean be a submitter

## Response:
8/16/2026, 6:06:49 PM

> **Updating Dean’s role**
>
> I’m using Dean Feldman’s existing row and changing only `application_role` to `submitter`. I’m leaving the approval state unchanged unless the application separately requires an approved status.
> 
> ```sql
> UPDATE profiles
> SET application_role = 'submitter'
> WHERE id = 6
>   AND display_name = 'Dean Feldman';
> ```
>
> Worked for 4s

Yes. From your screenshot, **Dean Feldman is `app_user.id = 6`**.

First make sure the role constraint already allows `submitter`, then run:

```sql
UPDATE public.app_user
SET application_role = 'submitter'
WHERE id = 6;
```

Then verify:

```sql
SELECT
    id,
    display_name,
    application_role,
    submitter_approval_state
FROM public.app_user
WHERE id = 6;
```

You should get something like:

```text
6 | Dean Feldman | submitter | not_requested
```

### But we should also approve Dean

Because your table has `submitter_approval_state`, ideally Dean should end up as:

```text
application_role         = submitter
submitter_approval_state = approved
```

Before changing that field, check what values the database permits:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%submitter_approval_state%';
```

If that shows that `approved` is an allowed value, then do both together:

```sql
UPDATE public.app_user
SET
    application_role = 'submitter',
    submitter_approval_state = 'approved'
WHERE id = 6;
```

Then verify:

```sql
SELECT
    id,
    display_name,
    application_role,
    submitter_approval_state
FROM public.app_user
WHERE id = 6;
```

Desired result:

```text
Dean Feldman | submitter | approved
```

If you paste the output of that constraint query, I can tell you exactly whether `approved` is the correct approval-state value before you run it.

## Prompt:
8/16/2026, 6:08:11 PM

![9398b2c5-a299-40e9-98ee-79ed863c8824.png](https://chatgpt.com/backend-api/estuary/content?id=file_000000006888820a9fdab86d2ab4c257&ts=496402&p=fs&cid=1&sig=5f09e8bc9b3a69e85049b24f61d6601a8ea7937d0753c215639a75083cb222d3&v=0)

## Response:
8/16/2026, 6:08:14 PM

> **Fixing the constraint**
>
> I’ll use the exact constraint name shown in the error, recreate it with the three intended roles, then update the row. I’m preserving the existing approval state and verifying the result afterward.
> 
> ```sql
> BEGIN;
> 
> ALTER TABLE app_user
> DROP CONSTRAINT IF EXISTS app_user_application_role_check;
> 
> ALTER TABLE app_user
> ADD CONSTRAINT app_user_application_role_check
> CHECK (application_role IN ('viewer', 'submitter', 'admin'));
> 
> UPDATE app_user
> SET application_role = 'submitter'
> WHERE app_user_id = 6;
> 
> COMMIT;
> 
> SELECT app_user_id, application_role, approval_state
> FROM app_user
> WHERE app_user_id = 6;
> ```
>
> **Fixed the constraint**
>
> 
>
> Worked for 7s

The problem is now clear: **your real constraint is named**

```text
app_user_application_role_check
```

but the earlier SQL dropped:

```text
app_user_application_role_ck
```

So the old constraint was never removed.

Run this exact SQL in Supabase:

```sql
BEGIN;

-- Remove either possible old constraint name
ALTER TABLE public.app_user
DROP CONSTRAINT IF EXISTS app_user_application_role_ck;

ALTER TABLE public.app_user
DROP CONSTRAINT IF EXISTS app_user_application_role_check;

-- Three valid application roles
ALTER TABLE public.app_user
ADD CONSTRAINT app_user_application_role_check
CHECK (
    application_role IN (
        'viewer',
        'submitter',
        'admin'
    )
);

-- New accounts should remain viewers by default
ALTER TABLE public.app_user
ALTER COLUMN application_role SET DEFAULT 'viewer';

-- Make Dean a submitter
UPDATE public.app_user
SET application_role = 'submitter'
WHERE app_user_id = 6;

COMMIT;
```

Then verify:

```sql
SELECT
    app_user_id,
    display_name,
    application_role,
    submitter_approval_state
FROM public.app_user
ORDER BY app_user_id;
```

You should now see:

```text
Dean Feldman | submitter
```

### One more thing

Your screenshot shows Dean currently has:

```text
submitter_approval_state = not_requested
```

If `submitter` represents an **approved submitter**, then eventually Dean should probably be:

```text
application_role         = submitter
submitter_approval_state = approved
```

Before changing that value, run:

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%submitter_approval_state%';
```

Send me that result and I'll give you the exact SQL to make Dean **`submitter + approved`** without guessing the allowed approval-state values.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)