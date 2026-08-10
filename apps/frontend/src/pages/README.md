# Pages

The public application uses React Router inside the reusable `PublicShell`. Public content remains
available without an account; there is no global authentication gate.

## Public browsing routes

| Resource     | Collection      | Detail                         |
| ------------ | --------------- | ------------------------------ |
| Competitions | `/competitions` | `/competitions/:competitionId` |
| Seasons      | `/seasons`      | `/seasons/:seasonId`           |
| Fixtures     | `/fixtures`     | `/fixtures/:fixtureId`         |
| Competitors  | `/competitors`  | `/competitors/:competitorId`   |
| Participants | `/participants` | `/participants/:participantId` |

These pages call only the handwritten public API through `src/api/public-read.ts`. They do not
read Supabase data, attach identity credentials, or require an authenticated session.

Collection pages preserve the API-supported filters, page size, and cursor in the URL query
string. Every route provides explicit loading and error states; collections also provide an empty
state. Related public records are linked where their identifiers are present in the API response.

## Authentication routes

| Route      | Purpose                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `/sign-in` | Starts managed Supabase Google OAuth for either login or account creation. |
| `/account` | Displays the signed-in Supabase identity email when available.             |

The authentication routes use only Supabase session identity. They do not create application
profiles or interpret roles, approved-submitter status, administrator permissions, or scoped
grants.

## AI Declaration

The public browsing and authentication route documentation was updated with the assistance of
Codex[GPT-5.6 Sol] and ChatGPT-Web[GPT-5.6 Sol].
