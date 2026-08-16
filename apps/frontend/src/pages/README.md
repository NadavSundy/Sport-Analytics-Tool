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

Published fixture statistics are available at `/fixtures/:fixtureId/statistics`. Each statistic
links to `/fixtures/:fixtureId/statistics/:statisticId`, which requests the accepted contributing
events used by that result. Both routes remain anonymous and link back to the fixture and related
competitor or participant records.

These pages call only the handwritten public API through `src/api/public-read.ts`. They do not
read Supabase data, attach identity credentials, or require an authenticated session.

Collection pages preserve the API-supported filters, page size, and cursor in the URL query
string. Every route provides explicit loading and error states; collections also provide an empty
state. Related public records are linked where their identifiers are present in the API response.
Fixture-statistics pages additionally identify complete or partial data in text, show API warnings,
and use semantic lists and definition lists so metric groups remain readable at narrow widths.

## Authentication routes

| Route              | Purpose                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `/sign-in`         | Starts managed Supabase Google OAuth for either login or account creation.                  |
| `/account`         | Displays the signed-in Supabase identity email when available.                              |
| `/submissions/new` | Lets an approved submitter select an in-scope fixture and submit Basic delivery-event JSON. |

The sign-in and account routes use only Supabase session identity. The protected submission route
loads approval and competition scope from the handwritten API's current-user profile. That state
controls presentation only: the backend independently enforces approval and fixture scope for every
submission.

## AI Declaration

The public browsing, statistics and authentication route documentation was updated with the
assistance of Codex[GPT-5.6 Sol] and ChatGPT-Web[GPT-5.6 Sol].
