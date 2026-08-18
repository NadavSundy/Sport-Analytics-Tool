# Issue #86 authentication terminology audit

**Date:** 15 August 2026  
**Scope:** open authentication-related Gitea issues, current authentication
documentation, historical provider decisions, and active runtime/dependency
configuration.

## Purpose

This audit verifies that active project requirements and implementation material
identify Supabase Auth as the selected managed authentication provider. It also
distinguishes incorrect current terminology from intentional Firebase references
that preserve provider-evaluation and decision history.

## Open-issue search

The live Gitea open-issue search for `Firebase` returned three issues:

| Issue                                                                         | Audit result                                                                                                                                                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#86](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/86) | Intentional: this issue describes and records the Firebase-to-Supabase terminology audit.                                                                                              |
| [#66](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/66) | Already corrected: its title, description, criteria, and dependencies use Supabase Auth. Firebase remains visible only in the historical title-change activity and correction comment. |
| [#43](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43) | Already corrected: its current account-schema requirements use a stable Supabase Auth identifier. Firebase remains only in historical issue discussion or activity.                    |

The related authentication issues referenced by the existing #86 audit comment
were also reviewed:

| Issue                                                                         | Audit result                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #14                                                                           | Historical provider investigation and migration record. Its Firebase references explain the superseded implementation and must remain.                                  |
| #102                                                                          | Correctly records the Supabase Google OAuth callback implementation.                                                                                                    |
| #117                                                                          | Correctly records the unified Supabase Google OAuth authentication entry.                                                                                               |
| [#65](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/65) | Uses Supabase terminology, but assumes email/password authentication is enabled. This is an unresolved architecture decision rather than a Firebase terminology defect. |

## Repository documentation reviewed

The source-document scan found Firebase context in nine Markdown documents. Each
remaining reference is intentional:

| Document                                                                | Reason the Firebase reference remains                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `evidence/decisions/ADR-002-firebase-authentication-foundation.md`      | Preserves the original, now-superseded provider decision and proof. Editing it would rewrite decision history.     |
| `evidence/decisions/ADR-004-supabase-authentication-foundation.md`      | Records the approved replacement of Firebase with Supabase Auth and explains the trade-off.                        |
| `docs/security/auth-provider-comparison.md`                             | Compares Supabase Auth, Firebase Authentication, and Auth0 as evaluated alternatives.                              |
| `docs/security/authentication.md`                                       | Documents Supabase Auth as current and links ADR-002 only as the superseded decision.                              |
| `docs/architecture/system-architecture.md`                              | States that ADR-004 supersedes Firebase and that Firebase is not part of the current runtime.                      |
| `docs/development/technology-stack.md`                                  | Records Supabase Auth as selected and Firebase as the superseded alternative.                                      |
| `docs/planning/project-backlog.md`                                      | Preserves migration context and explicitly prevents future work from introducing Firebase alongside Supabase Auth. |
| `evidence/decisions/2026-08-05-lecturer-ruling-supabase.md`             | Uses Firebase and Supabase as examples when recording the handwritten-API boundary question.                       |
| `evidence/decisions/ADR-003-database-host-connection-and-migrations.md` | Uses both providers as examples when documenting the database-host and generated-endpoint boundary.                |

Generated documentation under `site/` was not treated as an independent source
of truth and must not be edited instead of its Markdown source.

## Active implementation check

The runtime and dependency scan found no active Firebase SDK, Firebase Admin SDK,
Firebase environment variable, or Firebase package reference in `apps/`,
`packages/`, `package.json`, or `package-lock.json`.

The current implementation and documentation consistently select Supabase Auth.
No active open requirement instructs a developer to implement Firebase as an
authentication provider. The Firebase references that remain are historical,
comparative, or explicit warnings against adding a second identity platform.

No application functionality was changed as part of this audit.

## Issue #65 decision at the time of the audit

Issue #65 requests a forgotten-password and password-reset flow and depends on
Supabase email/password authentication. The implemented frontend currently uses
Google OAuth through Supabase Auth. For those identities, password recovery is
managed by Google rather than by the application through
`resetPasswordForEmail`.

Before #65 is implemented, the team must decide whether:

1. Google-managed account recovery satisfies the password-recovery requirement;
   or
2. Supabase email/password authentication will be approved and enabled as an
   additional sign-in method.

This decision must be made through the project's architecture and review process.
Issue #86 does not authorise enabling a new authentication method.

### Resolution note — 18 August 2026

The project subsequently selected the first option while Google OAuth remains the only supported
sign-in method. Google owns recovery of the Google Account credential. The application does not
implement `resetPasswordForEmail`, because completing that Supabase flow would set a separate
Supabase email/password credential rather than changing the user's Google Account or Gmail
password.

The current decision and user journey are documented in
`docs/security/password-recovery.md`. Adding Supabase email/password authentication remains a
separate architecture and product decision.

## Search commands and results

The repository was searched from its root with PowerShell and ripgrep:

```powershell
rg -n -i "firebase( auth| authentication)?" `
  --glob '!node_modules/**' `
  --glob '!gitea-export/**' `
  --glob '!evidence/ai/transcripts/**' .

rg -n -i "firebase-admin|@firebase|VITE_FIREBASE|FIREBASE_" `
  apps packages package.json package-lock.json

rg -l -i "firebase" `
  README.md apps docs database packages evidence/decisions `
  --glob '*.md' `
  --glob '!**/site/**'
```

Recorded results:

- active runtime/dependency Firebase matches: **0**;
- source Markdown documents containing intentional Firebase context: **9**; and
- live open Gitea issues returned for `Firebase`: **3** (#86, #66, and #43).

The live tracker search used:

```text
https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?q=Firebase&type=all&state=open
```

## Acceptance-criteria conclusion

- Open issues containing Firebase terminology were reviewed.
- #43 and #66 were already corrected to Supabase Auth terminology.
- Historical and comparative Firebase references were retained deliberately.
- Current authentication and architecture documentation identifies Supabase Auth
  as the selected provider.
- No active runtime dependency or requirement instructs Firebase implementation.
- At the time of this audit, the separate email/password decision required by #65 was unresolved;
  the 18 August 2026 resolution note records the later Google-managed recovery decision.
- No application functionality changed during this audit.
- Peer review remains required before Issue #86 can be completed.

## AI declaration

This audit record was prepared with assistance from Codex[GPT-5] and requires
human review before merge.
