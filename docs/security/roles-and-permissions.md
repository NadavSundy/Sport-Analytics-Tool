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

## Security boundary

- The backend reads roles and scopes from PostgreSQL after verifying identity.
- Registration and profile synchronization never accept an application role from the request or
  from Supabase user metadata.
- Re-authentication may refresh the display name and last-authenticated time, but it never updates
  the persisted role or scopes.
- Only a trusted administrative backend process may change `application_role`.
- Frontend visibility checks may improve the interface, but they are never the security boundary.
