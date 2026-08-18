# Roles and permissions

Application roles define application-wide capability. Competition scopes separately limit where a
submission-capable account may operate.

| Capability                | Viewer | Submitter                  | Admin                      |
| ------------------------- | ------ | -------------------------- | -------------------------- |
| View fixtures/statistics  | Yes    | Yes                        | Yes                        |
| Manage own account        | Yes    | Yes                        | Yes                        |
| Submit event data         | No     | Yes, within assigned scope | Yes, within assigned scope |
| Correct submitted data    | No     | Yes, where permitted       | Yes                        |
| View submission history   | No     | Yes                        | Yes                        |
| Manage users              | No     | No                         | Yes                        |
| Assign roles              | No     | No                         | Yes                        |
| Assign competition scopes | No     | No                         | Yes                        |
| Access admin endpoints    | No     | No                         | Yes                        |

## Authoritative role

`app_user.application_role` is non-null, defaults to `viewer`, and has exactly three values:

```text
application_role
|-- viewer
|-- submitter
`-- admin
```

- `viewer` is the normal registered-account role and cannot submit or administer the application.
- `submitter` can use submission workflows but cannot use administrator endpoints.
- `admin` can use administrator workflows and permitted submission workflows.

The backend treats `submitter` and `admin` as submission-capable roles. It then independently
checks `submitter_competition_scope` for the target competition. Role checks alone are never
sufficient for a scoped submission.

```text
application_role = submitter
competition_scopes = [competition-a, competition-b]
```

This account may submit only for Competition A and Competition B. It receives `403 Forbidden` for
another competition. A viewer also receives `403 Forbidden`, even if an old approval record says
`approved`. Missing, malformed, expired, or otherwise invalid authentication receives
`401 Unauthorized` before authorization is evaluated.

## Deprecated approval state

`app_user.submitter_approval_state` is temporarily retained to support the existing access-request
workflow and migration history. It is deprecated as an authorization source. Approving a request
must assign `application_role = submitter` and the intended competition scopes through a trusted
administrative process. The column should be removed in a later migration once no workflow depends
on it.

## Administrator submitter workflow

Only an account whose authoritative role is `admin` may call the user-management endpoints. The
backend does not accept an administrator role from token claims or profile metadata; it uses the
synchronized PostgreSQL account attached by authentication middleware.

Approval and scope assignment are one operation. An approval is valid only when at least one
requested competition exists. In one transaction the backend:

1. locks and checks the target account;
2. validates every requested competition;
3. assigns `application_role = submitter` and the compatibility state `approved`;
4. replaces the target account's complete `submitter_competition_scope`; and
5. records the administrator and change time.

Rejection and revocation are distinct. Rejection is permitted only for a pending viewer request; it
keeps `application_role = viewer`, records `rejected`, removes every competition scope, and permits a
later request. Revocation is permitted only for an approved submitter; it assigns
`application_role = viewer`, retains the historical `approved` request decision, and removes every
competition scope. Scope replacement is likewise limited to an approved submitter. Each transition
updates role, request state, scopes, administrator attribution, and time in one transaction.

Invalid lifecycle changes return `409 INVALID_SUBMITTER_ACCESS_TRANSITION`. Validation and state
checks occur while the target row is locked, so a failed transition leaves the existing role,
request state, scopes, and audit fields unchanged.

The submitter-access operation cannot modify an `admin` account, a disabled account, or the acting
administrator's own account. A viewer or submitter receives `403 Forbidden` before request-body
processing and therefore cannot approve themselves.

`app_user.submitter_access_updated_by` and `submitter_access_updated_at` identify the most recent
administrator access change. The actor foreign key uses `ON DELETE SET NULL`: the change time
remains visible if the administrator account is later removed.

## Security boundary

- The backend reads roles and scopes from PostgreSQL after verifying identity.
- Registration and profile synchronization never accept an application role from the request or
  from Supabase user metadata.
- Re-authentication may refresh the display name and last-authenticated time, but it never updates
  the persisted role or scopes.
- Only a trusted administrative backend process may change `application_role`.
- Approval, rejection, scope replacement, audit attribution, and revocation are committed atomically.
- Frontend visibility checks may improve the interface, but they are never the security boundary.
