# Pages

The public application uses React Router inside the reusable `PublicShell`. Public content remains
available without an account; there is no global authentication gate.

## Public browsing routes

| Public concept   | Collection          | Detail                         |
| ---------------- | ------------------- | ------------------------------ |
| Competitions     | `/competitions`     | `/competitions/:competitionId` |
| Seasons          | `/seasons`          | `/seasons/:seasonId`           |
| Fixtures         | `/fixtures`         | `/fixtures/:fixtureId`         |
| Teams            | `/competitors`      | `/competitors/:competitorId`   |
| Players          | `/participants`     | `/participants/:participantId` |
| Dataset releases | `/dataset-releases` | `/dataset-releases/:version`   |

Published fixture statistics load directly in `/fixtures/:fixtureId` with the fixture outcome,
completeness state, innings totals, player batting and bowling figures, and participating players.
The fixture overview also requests contextual weather from the handwritten
`/api/v1/fixtures/:fixtureId/weather` endpoint and presents available temperature, rainfall, wind,
and venue context. Weather loading, unavailable-location, and provider-error states remain
independent from the fixture record so external-service failures do not hide match information.
The previous `/fixtures/:fixtureId/statistics` route remains available for compatible deep links,
but it is not required to view the primary statistics. Each statistic links to
`/fixtures/:fixtureId/statistics/:statisticId`, which requests the accepted contributing events used
by that result and links back to the named match, team, and player records. Its CSV and JSON export
controls download that statistic's calculation-trace export, so the file holds exactly the events
the trace lists however many there are; the control states the event count, announces preparation
and completion, and shows the server's reason when an export fails instead of downloading a file.

These pages call only the handwritten public API through `src/api/public-read.ts`. They do not
read Supabase data, attach identity credentials, or require an authenticated session.

Dataset releases are discoverable from the public navigation. The catalogue displays creation,
scope, event-count and format metadata; its detail route displays the complete field documentation,
SHA-256 checksum and canonical JSON artefact download. Missing releases retain the shared explicit
error and retry experience.

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
and organise the published response as a match summary, innings comparison, deterministic match
leaders, semantic batting and bowling scorecards, and consolidated calculation details. Tables use
the shared horizontally scrollable data-table pattern on narrow screens and preserve zero values,
while undefined backend rates are displayed as an em dash. A separate Powerplay comparison shows
the backend-supplied score, overs and run rate for each marked innings, distinguishes those figures
from the full innings, and states when an innings has no authoritative marker instead of substituting
zeroes or assuming the first six overs.
Player details immediately embed the participant fixture-history endpoint. Named match cards link to
the complete fixture overview and present readable competition, season, date, match type, team, and
role context with available batting and bowling figures. The history section owns its loading,
empty, error, retry, and cursor-pagination states, while partial and unavailable figures are stated
without deriving aggregate player statistics in presentation code.
Beside the history, a career totals section requests
`/api/v1/participants/:participantId/statistics` and presents the career, competition, and season
batting, bowling, and fielding aggregates exactly as that endpoint derives them, with its
completeness state and data notices. Keyboard-operable scope tabs distinguish the career detail
from competition and season comparison tables.
The endpoint returns one resource rather than a page, so there is no cursor to follow. The two
sections are mounted together so their requests are issued concurrently, and each owns its loading,
empty, error, and retry states, so a failure in one never hides the other. Both sections sit inside
the shared section error boundary, which keeps an exception while displaying either one inside that
section with an actionable retry instead of unmounting the page. Aggregate averages, highest score,
best bowling, appearances, and fielding figures are shown only because the current aggregate
contract supplies them; the frontend does not reconstruct them from fixture history.
The public Players journey also provides one fixture-level comparison route, discoverable from the
Players collection, an individual player page, and fixture statistics. It reuses published fixture
statistics, identifies both selected players and the current-fixture scope, and labels its batting
and bowling metrics with units. It does not derive new statistics or request a comparison endpoint.

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
The fixture-weather overview behavior was documented with the assistance of Codex[GPT-5].
The dataset-release catalogue and download experience was documented with the assistance of
Codex[GPT-5].
The calculation-trace export behaviour for issue #467 was documented with the assistance of
Claude Code[Claude Opus 5].
The player career totals behaviour was documented with the assistance of Claude Code[Claude Opus 5].
The issue #582 public statistics information architecture was documented with the assistance of
Codex[GPT-5.6 Sol].
The issue #634 powerplay presentation was documented with the assistance of Codex[GPT-5].
