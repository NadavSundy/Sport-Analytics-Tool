# Pages

The public application uses React Router inside the reusable `PublicShell`. Public content remains
available without an account; there is no global authentication gate.

## Public browsing routes

| Public concept | Collection      | Detail                         |
| -------------- | --------------- | ------------------------------ |
| Competitions   | `/competitions` | `/competitions/:competitionId` |
| Seasons        | `/seasons`      | `/seasons/:seasonId`           |
| Fixtures       | `/fixtures`     | `/fixtures/:fixtureId`         |
| Teams          | `/competitors`  | `/competitors/:competitorId`   |
| Players        | `/participants` | `/participants/:participantId` |

Published fixture statistics load directly in `/fixtures/:fixtureId` with the fixture outcome,
completeness state, innings totals, player batting and bowling figures, and participating players.
The previous `/fixtures/:fixtureId/statistics` route remains available for compatible deep links,
but it is not required to view the primary statistics. Each statistic links to
`/fixtures/:fixtureId/statistics/:statisticId`, which requests the accepted contributing events used
by that result and links back to the named match, team, and player records.

These pages call only the handwritten public API through `src/api/public-read.ts`. They do not
read Supabase data, attach identity credentials, or require an authenticated session.

Collection pages preserve the API-supported filters, page size, and cursor in the URL query
string. Competition, season, fixture, team, and player filters share a readable-name combobox with
fuzzy-ranked suggestions and direct dropdown selection. Stable relationship identifiers may remain
in routed query values and API requests, but fields, options, active-filter summaries, and
validation feedback display readable names only. Parent changes clear invalid dependent selections.
Every route provides explicit loading and error states; collections also provide an empty state.
Competition, season, and team details render their related records in independent sections using
the collection loading, empty, error, retry, record-list, and cursor-pagination patterns. Each
fixture result opens a named fixture overview. Internal identifiers remain in route and request
values but are not used as visible record identity.
Fixture-statistics pages additionally identify complete or partial data in text, show API warnings,
and use semantic lists and definition lists so metric groups remain readable at narrow widths.
Player details immediately embed the participant fixture-history endpoint. Named match cards link to
the complete fixture overview and present readable competition, season, date, match type, team, and
role context with available batting and bowling figures. The history section owns its loading,
empty, error, retry, and cursor-pagination states, while partial and unavailable figures are stated
without deriving aggregate player statistics in presentation code.

## Authentication routes

| Route              | Purpose                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `/sign-in`         | Starts managed Supabase Google OAuth for either login or account creation.                     |
| `/account`         | Displays the signed-in Supabase identity email when available.                                 |
| `/submissions/new` | Lets a `submitter` or `admin` select an in-scope fixture and submit Basic delivery-event JSON. |

The sign-in and account routes use only Supabase session identity. The protected submission route
loads the application role and competition scope from the handwritten API's current-user profile.
That state controls presentation only: the backend independently enforces the submission-capable
role and fixture scope for every submission.

## AI Declaration

The public browsing, statistics and authentication route documentation was updated with the
assistance of Codex[GPT-5.6 Sol] and ChatGPT-Web[GPT-5.6 Sol].
The readable public collection filter behavior was documented with the assistance of
Codex[GPT-5.6 Sol].
The related-record detail overview behavior was documented with the assistance of
Codex[GPT-5.6 Sol].
The combined match-overview route behavior was documented with the assistance of
Codex[GPT-5.6 Sol].
The embedded player-overview route behavior was documented with the assistance of
Codex[GPT-5.6 Sol].
