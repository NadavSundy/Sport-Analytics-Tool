# Fixture statistic calculations

Fixture statistics are deterministic projections of accepted cricket events. They are calculated
when requested; there is no manually editable statistic total and no persisted cache in the Basic
implementation.

## Publication input

The derivation repository applies these rules before calculation:

1. The fixture's originating submission must have `status = accepted`.
2. For each delivery natural key `(innings, over_number, position_in_over)`, only the highest
   accepted revision is selected. A pending or rejected correction cannot displace the last
   accepted revision.
3. Events are ordered by innings ordinal and then `innings_sequence`. `ball_number` is display-only
   and is never used for order.
4. Standard fixture batting, bowling and team aggregates exclude innings marked
   `is_super_over`. A super over is a tie-breaking procedure rather than a standard
   match innings, so including it would distort ordinary player and team statistics.
   The response makes this scope explicit with `superOversIncluded: false`.

## Super-over scopes

These scope names describe possible future API behavior; they are not currently
implemented or recorded as client-approved requirements.

The current fixture-statistics response represents standard aggregates and excludes
all super-over innings.

A future `super-over-only` scope may calculate statistics exclusively from innings
marked `is_super_over`. A future `standard-and-super-over-combined` scope may include
both types, but it must be explicitly named and requested; it must never become the
default.

Fixture outcome information may still identify an eliminator winner even when the
super-over deliveries are excluded from batting and bowling aggregates. Future
season, competition and career aggregates must consume the same standard-innings
boundary.

This is the team's current implementation default for Issue #104. Client confirmation
of the convention for future season, competition and career aggregates remains
pending.

## Basic calculations

| Result             | Calculation                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| Team total         | Sum `runs_total` for the innings, plus `penalty_pre` and `penalty_post` |
| Batter runs        | Sum `runs_off_bat` for deliveries where the participant is striker      |
| Balls faced        | Count striker deliveries with no wide; a no-ball still counts as faced  |
| Strike rate        | Batter runs / balls faced × 100, rounded to two decimal places          |
| Fours and sixes    | Count 4 or 6 `runs_off_bat`, excluding `non_boundary` deliveries        |
| Runs conceded      | `runs_off_bat + wides + no-balls`; byes and leg-byes are excluded       |
| Legal balls bowled | Count deliveries with neither wides nor no-balls                        |
| Overs bowled       | `completeOvers.remainingBalls`, using the fixture's `balls_per_over`    |
| Economy rate       | Runs conceded / legal balls × `balls_per_over`, rounded to two decimals |
| Bowler wickets     | Count wickets whose `dismissal_kind.credits_bowler` value is true       |
| Fixture outcome    | Accepted fixture outcome fact, represented as a typed result and margin |

Strike rate and economy rate are `null` when their denominator is zero. This distinguishes an
undefined rate from a real rate of zero.

## Statistic resources and traceability

Each innings and participant projection has a stable opaque `statisticId`. The ID is a deterministic
hash of the fixture and scope identifiers, so replaying the same fixture preserves its resource
references.

Published statistics retain stable competitor and participant identifiers while also carrying the
readable relationship names needed for presentation. Innings totals include `competitorName`;
participant statistics include `participantName` and the participant's `competitorName` where known;
and fixture outcomes include `winnerCompetitorName` and `eliminatorCompetitorName` where those
relationships exist.

Normal list and detail responses return `sourceEventCount` only. Calling either endpoint with
`includeContributors=true` adds the accepted, ordered delivery records used by that projection.
Each trace record includes the stable delivery `eventId`, innings and sequence references, striker
and bowler identifiers and readable names, run components, extras, boundary flag and
credited-bowler wicket count. This is enough to reproduce every published metric while allowing
user-facing traces to identify the players without exposing submission ownership or internal audit
data.

For an innings total, `metrics.deliveryRuns` is traceable to delivery event IDs while
`metrics.penaltyRuns` is traceable to the returned `inningsId`, because the approved schema records
pre/post penalties at innings level rather than inventing a delivery for them.

## Public frontend

Opening `/fixtures/{fixtureId}` automatically requests and displays the fixture's Basic statistics
below its named teams and match metadata. The combined overview shows the typed outcome,
completeness state, warnings, innings totals, available player batting and bowling metrics, and
participating players without a separate statistics action. The previous
`/fixtures/{fixtureId}/statistics` route remains available for compatible deep links.

The statistics API exposes readable team and player names alongside stable identifiers so public
interfaces can present cricket identities without additional name-resolution requests. Identifiers
remain internal to API requests, routes, and React keys rather than visible page content.

Each result links to `/fixtures/{fixtureId}/statistics/{statisticId}`. That route opts into
`includeContributors=true` and presents the accepted delivery references and run components used by
the calculation. It does not expose submission ownership, account information, pending or rejected
events, or internal audit data. The calculation trace identifies deliveries by readable match order
and player names; stable event identifiers remain internal React keys.

## Incomplete data

An accepted but incomplete fixture returns HTTP `200` with `status: partial`. Warning codes cover:

- source-declared missing fields;
- no standard innings;
- no accepted delivery events;
- an innings with no accepted delivery events; and
- a participant whose fixture competitor cannot be established.

The response still contains every result that can be derived safely. An unpublished fixture, an
unknown fixture, or an unknown statistic resource returns `404`.

## Golden fixture

The backend unit suite includes a manually verified representative fixture covering wides,
no-balls, byes, a non-boundary four, a bowler-credited wicket, innings penalty runs and both batting
and bowling roles. It also replays the same events in reverse input order and asserts an identical
result, while the repository test verifies accepted-revision filtering and occurrence ordering.

## AI Declaration

The preceding calculation, API and public-interface documentation was generated, reviewed and edited
with the assistance of Codex[GPT-5.6 Sol] and ChatGPT-Web[GPT-5.6 Sol].
