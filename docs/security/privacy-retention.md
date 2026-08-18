# Privacy and retention

## Account deletion policy

When the backend has its optional server-only Supabase secret, deletion removes the Supabase Auth
identity, display name, roles, submitter approval, and competition scopes. The application keeps a
disabled, non-identifying `app_user` tombstone with the same internal identifier.

If the secret is not configured, the HTTP route returns `501 ACCOUNT_DELETION_UNAVAILABLE` before
changing local deletion state. This fail-closed fallback does not prevent the backend from starting
or serving unrelated routes.

The following cricket and audit data is retained:

- submissions and their accepted or rejected status;
- fixtures, innings, deliveries, corrections, and delivery provenance;
- derived statistics and the event inputs that support them;
- source-file metadata, checksums, validation evidence, and other audit records; and
- the structural link from a submission to the tombstoned internal account.

This data remains because published statistics must stay reproducible and attributable to the
accepted event history. Retained public cricket data is no longer associated with the person's
Supabase subject or display name.

## Identifier handling

Finalisation replaces the external authentication subject with a unique random tombstone and
clears the display name. A one-way hash of the former high-entropy Supabase subject is retained only
as a revocation marker so an unexpired old JWT cannot create a new local account. It is not returned
through the API or frontend.

The internal `app_user_id`, account creation time, deletion-state timestamps, and cricket-data
relationships remain for provenance and operational audit. They must not be used to reconstruct or
enrich a deleted person's identity.

## Failure and access handling

The local application account is disabled before the backend calls Supabase Auth. This closes
application access immediately even though Supabase documents that an issued JWT can remain valid
until expiry. Authentication synchronization checks the deletion revocation marker and fails closed
rather than inserting a replacement account.

Because PostgreSQL and Supabase Auth cannot share one transaction, the workflow records its current
stage. Auth failures and local-finalisation failures leave the account disabled and safe to retry.
Safe public error responses do not include provider details, identifiers, credentials, or database
messages.

## User experience

The retained interface design explains the retained-data policy before deletion. The user must
deliberately confirm the operation, and a provider-capable backend requires a recent
managed-authentication sign-in. After success, the browser clears its managed local session and
returns to the public home page.

## Known limitations

- Account deletion requires a server-only Supabase secret in the backend deployment environment.
- A completed deletion cannot be rolled back from the product interface.
- Very rare failures after Auth deletion may require operator reconciliation of a disabled pending
  tombstone.
- Supabase Storage prevents Auth deletion while the user owns stored objects. The current product
  does not create user-owned Supabase Storage objects; future storage work must define ownership and
  reassignment or deletion before relying on this workflow.
- The retained revocation hash is intentionally linkable only to the same former high-entropy
  subject. Access to it is restricted to backend database operations.

See `evidence/decisions/ADR-006-account-deletion-retention.md` for the complete decision and
rollback considerations.

## AI Declaration

This policy was drafted and reconciled with the repository with the assistance of Codex[GPT-5].
