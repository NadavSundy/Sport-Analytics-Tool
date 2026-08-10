# Pages

The public application uses React Router inside the reusable `PublicShell`. Public content remains
available without an account; there is no global authentication gate.

## Authentication routes

| Route             | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `/create-account` | Starts managed Supabase Google OAuth for a new identity.       |
| `/sign-in`        | Starts managed Supabase Google OAuth for an existing identity. |
| `/account`        | Displays the signed-in Supabase identity email when available. |

The authentication routes use only Supabase session identity. They do not create application
profiles or interpret roles, approved-submitter status, administrator permissions, or scoped
grants.

## AI Declaration

The authentication route documentation was updated with the assistance of Codex[GPT-5.6 Sol].
