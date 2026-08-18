# ADR-006: Account deletion retention and tombstoning

- **Status:** Accepted
- **Date:** 2026-08-16
- **Participants:** Gabriel Raz, Git Push Pray project team
- **Related issue:** #66

## Context

On 17 August 2026, a required elevated key caused the backend to fail at startup where that setting
was absent. A publishable-only fallback restored availability but disabled this decision's deletion
workflow. The corrected composition keeps elevated access optional at startup and enables the
workflow only when the backend has a separate server-only Supabase secret.

An application account is both a personal account record and the stable owner of cricket-data
submissions. Deleting the row would either break submission provenance or encourage a cascading
delete that removes accepted deliveries and statistics. Keeping the Supabase identity or display
name indefinitely would retain personal identifiers after the person requests deletion.

Supabase Auth deletion is an external administrative operation. It cannot participate in the same
PostgreSQL transaction as application-data changes, and an already-issued access-token JWT may
remain valid until it expires.

## Decision

Account deletion permanently disables and tombstones the existing `app_user` row. Its
`app_user_id` remains stable so existing `submission.submitted_by` relationships remain intact.

The workflow will:

1. require the authenticated account owner, the exact confirmation value `DELETE`, and a recent
   managed-authentication sign-in;
2. atomically disable the application account, reset its role and submitter approval to their
   least-privileged values, and remove all competition scopes;
3. call Supabase Auth's Admin API from the backend using a server-only secret;
4. after Auth deletion succeeds, replace `auth_subject` with a random non-identifying tombstone,
   remove the display name, and mark the row deleted; and
5. retain a one-way hash of the former high-entropy Supabase subject solely to stop an unexpired
   old JWT from creating a replacement application account.

Submissions, fixtures, deliveries, accepted events, corrections, statistics, source references,
checksums, and audit/provenance relationships are retained. No foreign key from those records to
`app_user` may use `ON DELETE CASCADE`.

The local workflow records whether Auth deletion is pending, failed, succeeded but awaiting local
finalisation, or fully complete. Retrying a failed step never re-enables the account. A Supabase
`user_not_found` result is treated as an idempotent successful Auth deletion.

## Alternatives considered

### Cascade application data from `app_user`

Rejected because it would destroy accepted cricket records, derived results, and the evidence
needed to explain where published statistics came from.

### Set `submission.submitted_by` to null

Rejected because it weakens structural provenance and discards the stable link to the submitting
application account even though that link can be preserved without retaining personal identity.

### Keep the original Supabase subject

Rejected because it remains an external personal identifier. A random tombstone plus a one-way
revocation hash provides the required structural and fail-closed behaviour without retaining the
raw subject.

## Consequences

- Account deletion is irreversible through the product interface.
- A missing server-only Supabase secret disables only account deletion; it does not prevent backend
  startup or unrelated routes.
- Retained cricket data is attributed to a non-identifying deleted-account tombstone.
- The account cannot regain roles, approval, or scopes, including while an old JWT is unexpired.
- Auth and application deletion cannot be globally atomic. Failures are recorded for safe retry
  and operational reconciliation while the local account remains disabled.
- If Auth deletion succeeds and every subsequent database write fails, an operator must reconcile
  the disabled pending row. This limitation is documented rather than hidden.
- Supabase Storage objects owned by an Auth user can block Auth deletion. The current application
  does not create user-owned Supabase Storage objects; this must be reviewed if storage is added.

## Rollback and recovery

The schema migration can be rolled back only before deleted-account state exists. Removing the
state columns after a tombstone has been created would discard deletion audit state and could allow
an old subject to be synchronized again. In an incident, operators should keep the account
disabled, inspect the recorded stage without exposing identifiers or credentials, retry the
idempotent workflow, and restore from a verified backup only under the project's recovery process.

## Verification and review date

Verify the migration, API, Supabase Admin mock, old-token denial, retained-provenance queries, and
frontend confirmation/sign-out flow before merging #66. Review this decision before introducing
user-owned object storage or changing authentication providers.

## References

- [Supabase administrative user deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- [Supabase user deletion and JWT behaviour](https://supabase.com/docs/guides/auth/managing-user-data#deleting-users)
- [Supabase sign-out behaviour](https://supabase.com/docs/guides/auth/signout)

## AI Declaration

This decision record was drafted and reconciled with the repository with the assistance of
Codex[GPT-5].
