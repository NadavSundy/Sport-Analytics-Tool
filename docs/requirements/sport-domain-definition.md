# Sport domain definition

**Issue:** #37 · **Status:** Draft for team and stakeholder review
**Depends on / formalises:** `database/schema.md` (approved 6 August 2026, #27), `docs/cricsheet.md`, `docs/database/overview.md`, `docs/api/overview.md`

> **Process note.** This document should normally precede the event schema. In
> this repository the event model (`schema.md`) and the Cricsheet downloader
> were already built and approved before an explicit domain-definition issue
> was raised. Rather than re-deriving a different domain from scratch, this
> document makes the existing implicit decision explicit, ratifies it against
> the required questions in #37, and records the gaps that were not yet
> written down anywhere. The team and stakeholder should treat the "Final
> decisions and approval record" section as the item needing sign-off, since
> the underlying schema decision already carries six-person approval on #27.

---

## 1. Selected sport and professional competition

- **Sport:** Cricket, restricted to the **Twenty20 (T20) format**.
- **Competitions represented:** Any competition whose matches Cricsheet
  classifies as `match_type: "T20"`, covering both:
  - **domestic / franchise T20 competitions** (e.g. league tournaments such as
    the Big Bash League), and
  - **international T20 matches**, identified not by the `IT20` label but by
    `team_type: "international"` on a `T20`-typed match (see §10 for why the
    `IT20` label cannot be used for this).
- **Coverage:** Both men's and women's matches are in scope. The Hundred (a
  100-ball format) is explicitly out of scope.
- **Data source:** Cricsheet's JSON match archive, acquired via
  `scripts/download_cricsheet_t20.py`, currently holding 13,953 matches and
  3,193,996 deliveries (`docs/cricsheet.md`).

## 2. Motivation for the selection

Applying the criteria in #37 against what the corpus analysis in `schema.md`
already demonstrated:

| Criterion                                                 | Evidence                                                                                                                                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Events are individually and chronologically representable | Every delivery is addressable as `(fixture, innings ordinal, over number, position_in_over)`; array position — not the printed ball number — gives a stable chronological key (schema.md §2.1, §1.1). |
| Meaningful statistics are derivable from events           | Balls faced, runs conceded, boundaries, team totals, and career aggregates are all defined as functions of delivery rows (schema.md §5).                                                              |
| Fixture structure is well understood                      | A T20 fixture is bounded, typically two innings, with clearly defined start/toss/outcome semantics, though not rigidly two innings (see §3, §10).                                                     |
| Sufficient domain information is available                | Cricsheet publishes a documented, versioned schema with 13,953 matches already downloaded and catalogued.                                                                                             |
| Representative test data is available and legal           | The corpus is already downloaded under Cricsheet's own redistribution terms; scripts are repeatable and cached locally.                                                                               |
| Event volume suits Intermediate performance testing       | 3.19 million deliveries across 13,953 matches gives a realistic bulk-ingestion and query-performance workload.                                                                                        |
| Corrections can be demonstrated clearly                   | Cricsheet republishes corrected match files with revisions; the schema's revision/supersession model (schema.md §3) was designed specifically to demonstrate this.                                    |
| Season and career aggregates are meaningful               | Player identifiers persist and alias across name changes (schema.md §1.2, §2.2), which is exactly what is needed for career-level aggregation.                                                        |
| Live / out-of-order events are eventually demonstrable    | The delivery identity model does not depend on receiving deliveries in submission order, only in encoded order, so late/out-of-order events are representable.                                        |
| The team can explain the domain confidently               | Cricket's scoring rules (byes, wides, no-balls, boundaries, dismissals) are well documented and already reflected in the approved schema.                                                             |
| Achievable within the project timeline                    | The Basic-tier vocabulary below is deliberately narrow: one event type (the delivery) with typed attributes, not a large enumerated event catalogue.                                                  |

The counter-argument — that cricket's rule surface (extras interactions,
super overs, bowl-outs, miscounted overs) is unusually irregular — is
accepted, but treated as a strength for this project specifically: it forces
the event-sourced, no-independently-entered-totals design that is the
project's central technical claim (schema.md §3), rather than allowing a
simpler sport to hide schema mistakes.

## 3. Competition and fixture definitions

- **Season / competition period:** the `competition` entity groups fixtures
  that belong to the same tournament, series, or league edition (schema.md
  §4, "Reference" entities). A season boundary is taken from Cricsheet's own
  per-match `season` field; the platform does not yet define an independent
  season-numbering scheme.
- **Fixture:** one T20 match, identified by the Cricsheet match ID, retained
  as `source_ref` on the `fixture` entity, so that a resubmitted or corrected
  match file is recognised as the same fixture rather than a duplicate
  (schema.md §2.3).
- **Multiple competitions:** the platform supports many competitions of the
  same sport concurrently (domestic leagues and international series side by
  side), not a single hard-coded competition.
- **Innings count is not fixed at two.** 99 matches in the corpus carry four
  innings, and 204 innings are flagged as super-over innings (schema.md,
  property O5). Any fixture-level logic that assumes exactly two innings will
  misrepresent these matches.

## 4. Competitors and participant definitions

- **Competitors are teams**, not individual athletes. `fixture_team` links a
  `team` to a `fixture`; `fixture_squad` lists the players declared for that
  team in that fixture.
- **Participants** are individual players, tracked through the sport even
  though the competitor unit is the team. Participant roles required by the
  event vocabulary below: **striker (batter facing)**, **non-striker**,
  **bowler**, **fielder(s)** (on a wicket), **captain**, **wicketkeeper**, and
  **substitute/replacement player**.
- **Officials** (umpires, match referees) are modelled separately from
  `person` rather than folded into it, because Cricsheet gives no stable
  identifier for them and asserting identity from a name alone is exactly
  what the corpus rules out for players (schema.md §1.2, decision #2 in §7).
  If a stable official registry becomes available later, records reconcile
  through an `external_ref`.
- **Players can change teams between seasons.** Player identity must survive
  that: the platform keys players on a registry identifier
  (`person`/`person_alias`), never on name, because 168 names in the corpus
  map to more than one player and 40 identifiers map to more than one name
  (schema.md, property O2, §1.2).
- **Stable identifiers required across seasons:** `person` (player)
  identifiers, `team` identifiers, and `fixture` `source_ref` values. Venue
  and competition identifiers should also remain stable, though this has not
  yet been stress-tested against the corpus the way player identity has.

## 5. Event vocabulary

The platform's Basic-tier event vocabulary is deliberately narrow: a single
core event (the **delivery**), carrying typed sub-facts, plus a small number
of innings- and fixture-level facts that do not belong to any one delivery.
This mirrors the approved schema rather than inventing a separate list.

| Event type                          | Meaning                                                                                                                    | Required data                                                                                                                                             | Optional data                                                                                                                                            | Statistics affected                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Delivery**                        | One ball bowled in an innings.                                                                                             | fixture, innings ordinal, over number, `position_in_over` (identity key), bowler, striker, non-striker, runs off bat                                      | printed ball number (display only)                                                                                                                       | Balls faced, runs off bat, boundaries, strike rate, economy rate                                                                     |
| **Extra** (attached to a delivery)  | Runs awarded outside the delivery's off-the-bat total.                                                                     | extras type (wide / no-ball / bye / leg bye / penalty — nullable columns, as types co-occur, e.g. a no-ball with byes) and the runs for each type present | —                                                                                                                                                        | Runs conceded, balls faced (a no-ball counts as faced, a wide does not), team total                                                  |
| **Wicket** (attached to a delivery) | A batter is dismissed.                                                                                                     | dismissed player, `dismissal_kind` (raw source value retained for provenance), whether the kind credits the bowler                                        | fielder(s) involved (0, 1, or more — 5,833 dismissals in the corpus name multiple fielders, and some fielder records identify a substitute with no name) | Bowler's wicket tally (only for kinds flagged `credits_bowler` — a run out is not the bowler's wicket), fielder/catch tallies        |
| **Review**                          | A DRS-style review is requested and decided.                                                                               | fixture, innings, delivery reference, outcome of the review                                                                                               | reviewing side/player                                                                                                                                    | Not currently used in a Basic statistic; retained for provenance and Advanced-tier reconciliation work                               |
| **Replacement / substitution**      | A player is substituted mid-fixture (injury substitute, concussion substitute, or a competition-specific "supersub" role). | fixture, team, player in, player out                                                                                                                      | reason/role (e.g. `supersub`, present on 42 Big Bash League matches only)                                                                                | Squad/participation statistics; excluded from ball-by-ball batting/bowling attribution unless the replacement actually bowls or bats |
| **Innings penalty**                 | Penalty runs awarded at innings level, belonging to no single delivery.                                                    | fixture, innings ordinal, penalty run amount                                                                                                              | —                                                                                                                                                        | Team total (team total = sum of delivery totals **plus** innings-level penalty runs — it cannot be derived from deliveries alone)    |
| **Powerplay marker**                | Marks which overs of an innings fall in a powerplay.                                                                       | fixture, innings, over range                                                                                                                              | —                                                                                                                                                        | Powerplay-scoped aggregates (Intermediate)                                                                                           |
| **Miscounted-over note**            | Records that an over legitimately held other than six legal balls.                                                         | fixture, innings, over number, legal ball count                                                                                                           | —                                                                                                                                                        | Legal-balls-per-over must always be counted from delivery rows, never assumed to be six                                              |
| **Fixture outcome**                 | The result of the match.                                                                                                   | outcome shape (win/loss with margin, tie, no result, abandoned, decided by eliminator, decided by bowl-out — seven distinct shapes exist in the corpus)   | winning team/margin where applicable                                                                                                                     | Not a "winner plus margin" pair — must be modelled as a typed outcome, not two flat columns                                          |

Event ordering and timing: deliveries are ordered by a within-innings
sequence assigned at ingestion (not derived on read), so the API can return
events in occurrence order with pagination; a correction inherits the
sequence of the revision it supersedes rather than being appended
(schema.md §3, §7 decision #4).

## 6. Required-event field summary

This restates §5 as a flat required/optional split for implementers:

- **Always required on a delivery:** fixture, innings ordinal, over number,
  position-in-over, bowler identifier, striker identifier, non-striker
  identifier, runs off bat.
- **Required when a wicket occurs:** dismissed player identifier,
  dismissal-kind reference.
- **Required when an extra occurs:** at least one of wide/no-ball/bye/leg-bye/
  penalty run counts (more than one may be present simultaneously).
- **Required at innings level:** innings ordinal, fixture reference,
  super-over flag (where applicable), penalty runs (where applicable).
- **Required at fixture level:** source_ref (Cricsheet match ID), competition
  reference, team references, outcome.

## 7. Statistic catalogue

| Statistic                                               | Level                           | Source events                                            | Calculation                                                                                                                            | Requirement tier                                                                                |
| ------------------------------------------------------- | ------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Runs scored (off bat)                                   | Participant (batting), fixture  | Delivery                                                 | Sum of runs-off-bat for deliveries faced by the player                                                                                 | Basic                                                                                           |
| Balls faced                                             | Participant, fixture            | Delivery, Extra                                          | Count of deliveries where no wide was bowled (a no-ball is faced, a wide is not)                                                       | Basic                                                                                           |
| Strike rate                                             | Participant, fixture            | Delivery                                                 | Runs scored ÷ balls faced × 100                                                                                                        | Basic                                                                                           |
| Boundaries (4s/6s)                                      | Participant, fixture            | Delivery                                                 | Count of deliveries with 4 or 6 off the bat, excluding the deliveries flagged `non_boundary` (runs run rather than struck to the rope) | Basic                                                                                           |
| Runs conceded                                           | Participant (bowling), fixture  | Delivery, Extra                                          | Runs off bat + wides + no-balls, excluding byes and leg-byes unless run off a wide (Law 22.6)                                          | Basic                                                                                           |
| Legal balls bowled / overs bowled                       | Participant, fixture            | Delivery, miscounted-over note                           | Count of legal deliveries per over, never assumed to be six                                                                            | Basic                                                                                           |
| Economy rate                                            | Participant, fixture            | Delivery, Extra                                          | Runs conceded ÷ legal balls bowled × 6                                                                                                 | Basic                                                                                           |
| Wickets taken (bowler)                                  | Participant, fixture            | Wicket                                                   | Count of dismissals where the dismissal kind is flagged `credits_bowler` and the bowler is this player                                 | Basic                                                                                           |
| Team total                                              | Fixture, team, innings          | Delivery, Extra, Innings penalty                         | Sum of delivery totals plus innings-level penalty runs                                                                                 | Basic                                                                                           |
| Fixture outcome                                         | Fixture                         | Fixture outcome                                          | Typed outcome (not winner+margin)                                                                                                      | Basic                                                                                           |
| Season aggregates (runs, wickets, economy, strike rate) | Season, competitor, participant | All above, grouped by competition/season                 | Sum or recompute across fixtures within a season, grouped by person identifier — never by name                                         | Intermediate                                                                                    |
| Career aggregates                                       | Participant (career)            | All above                                                | Same as season aggregates, grouped by person identifier across all seasons                                                             | Intermediate                                                                                    |
| Powerplay-scoped statistics                             | Innings, fixture                | Delivery, Powerplay marker                               | As above, restricted to overs marked as powerplay                                                                                      | Intermediate                                                                                    |
| Super-over statistics                                   | Fixture, participant            | Delivery (super-over innings)                            | Same calculations as standard statistics, but computed on a separately scoped set; **excluded from standard aggregates by default**    | Intermediate/Advanced — excluded by default under Issue #104; client confirmation pending (§12) |
| Analyst-defined / custom statistic                      | Any                             | Statistic definition + version                           | Computed from a versioned expression, not hard-coded query logic                                                                       | Advanced (deferred entity — not yet modelled, schema.md §6)                                     |
| Live/in-progress fixture statistics                     | Fixture (live)                  | Delivery, submitted incrementally, possibly out of order | Same calculations, recomputed incrementally as new deliveries arrive                                                                   | Advanced                                                                                        |
| Reconciliation after correction                         | Any statistic already published | Delivery revision + superseded delivery                  | Identify which derived results become stale when a delivery is corrected                                                               | Advanced (deferred entity — "derived result", schema.md §6)                                     |

**Statistics identified as currently unsupported / deferred**, per the
"deferred entities" already recorded in schema.md §6: any statistic that
depends on a versioned statistic definition, a derived-result provenance
record, or a dataset release manifest. These require entities that do not
exist yet and are explicitly out of scope for this issue and for Basic/
Intermediate work.

## 8. Event-to-statistic mapping

This is the inverse of §7, for traceability:

- **Delivery** → runs scored, balls faced, strike rate, boundaries, runs
  conceded, economy rate, team total, all season/career aggregates.
- **Wicket** (+ fielders) → wickets taken, dismissal-kind breakdowns, catch/
  run-out tallies for fielders.
- **Extra** → runs conceded, balls faced exclusion rule, team total.
- **Innings penalty** → team total only (this is the one statistic that
  cannot be derived from deliveries alone — property O7).
- **Miscounted-over note** → legal-balls-per-over, and therefore overs
  bowled and economy rate.
- **Powerplay marker** → powerplay-scoped aggregates only.
- **Fixture outcome** → win/loss/tie/no-result reporting; not used in any
  player statistic.
- **Review, Replacement** → not currently mapped to any Basic or
  Intermediate statistic; retained for provenance and future Advanced-tier
  reconciliation work.

## 9. Submitter scope foundation

- Submission ownership is recorded on `submission`, referencing `app_user`,
  which is keyed on the authentication provider and that provider's subject
  identifier rather than any provider-specific column (schema.md §4, §7
  decision #6).
- The implemented minimum scope model authorises an account with the `submitter` or `admin` role
  for explicit competitions through `submitter_competition_scope`. A verified identity with the
  `viewer` role or no matching grant cannot pass upload-route policy. More granular date, season,
  or fixture grants remain a future extension and must preserve this deny-by-default boundary.
- Validation/review state (accepted, rejected, pending) is expected to live
  on `submission`, which already carries a status column; a richer
  reviewer-workflow (who reviewed, when, against which rule) is deferred
  (schema.md §6).

## 10. Sport-specific validation rules and known-impossible conditions

Carried over directly from the corpus analysis already performed for the
approved schema, because these are exactly the conditions a naive validator
would get wrong:

1. **Delivery identity must never use the printed ball number.** It repeats
   within an over in 20.4% of overs (104,818 of 514,380) because wides and
   no-balls do not advance it. Identity is `(fixture, innings, over,
position_in_over)` only.
2. **Extras types can co-occur** on one delivery (e.g. no-ball + byes).
   Validation must not assume at most one extras type per delivery.
3. **A run out must never be credited to the bowler.** Only dismissal kinds
   flagged `credits_bowler` count toward a bowler's wicket tally.
4. **An over may legally hold other than six balls** (175 innings in the
   corpus carry `miscounted_overs`, with overs of five or seven legal balls).
   No constraint may hard-code six.
5. **Innings count per fixture is not fixed at two** (99 four-innings
   matches; 204 super-over innings).
6. **Team total cannot be validated from deliveries alone** — innings-level
   penalty runs must be included.
7. **Outcome is not "winner plus margin."** Seven distinct outcome shapes
   exist, including no-result, eliminator, and bowl-out decisions.
8. **`IT20` is not a reliable filter for "international match."** Only 320
   matches in the corpus are classified `IT20`, while every true T20
   international carries `match_type: "T20"` with `team_type:
"international"`, and `match_type_number` is present on exactly those
   5,602 matches. Any validation, filter, or statistic that treats `IT20` as
   meaning "international" will misclassify roughly 5,300 matches. This has
   been raised against the downloader (schema.md §9) but is repeated here
   because it is a domain-definition error, not just a data-acquisition bug.
9. **Bowl-out attempts are deliberately not modelled as individual events.**
   The mechanism appears on only 2 matches (2006–2007), is obsolete, and no
   in-scope statistic depends on it. The fixture outcome must still be able
   to record that a match was decided by bowl-out (a nullable outcome value),
   but per-attempt bowler/outcome pairs are an accepted exclusion, not an
   oversight.
10. **Supersubs are a squad fact, not an event.** The Big Bash League's
    substitute rule (42 matches) is represented as a nullable role on
    `fixture_squad`, not as its own event or table.
11. **A correction never overwrites delivery content.** It inserts a new
    revision; the previous revision is marked superseded, and a correction
    inherits the within-innings sequence of the revision it supersedes so
    that pagination order does not shift underneath a consumer.

## 11. Representative fixture example

**Structural walkthrough** (illustrative, using the fields defined above —
not a specific match's actual scorecard):

1. A fixture is created from a Cricsheet match file, with `source_ref` set to
   the match ID, teams and venue resolved to `team`/`venue` records, and the
   competition resolved to a `competition` record.
2. Two `fixture_team` rows link the fixture to its two competing teams;
   `fixture_squad` rows list the declared players for each team, with roles
   (captain, wicketkeeper) marked where the source provides them.
3. For the first innings, an `innings` row is created (ordinal 1). Deliveries
   are ingested in source-array order; each delivery row carries
   `position_in_over` as its identity anchor and the printed ball number as a
   display-only column.
4. A wicket occurring on, say, the third delivery of the fourth over creates
   a `delivery_wicket` row referencing that delivery, the dismissed batter,
   the dismissal kind, and — if it's a catch — a `delivery_wicket_fielder`
   row for the catching fielder.
5. **Verification: does a correction propagate correctly?** Schema.md already
   documents a real corpus case that exercises this end-to-end — match
   `1402765`, innings 0, over 5, where seven consecutive source records share
   the printed ball number `5.1` and are distinguished only by array
   position. If any one of those seven delivery records is later corrected
   (say, a wide reclassified as a legal delivery), the correction is inserted
   as a new revision of that specific `(fixture, innings, over,
position_in_over)` row; the old revision is superseded; and every
   statistic reading from `delivery_current` — balls faced, legal-balls-in-
   over, team total — recomputes to reflect only the live row, while the
   superseded revision remains queryable for audit. This confirms
   requirement (5) of the #37 verification checklist ("at least one event
   correction would automatically affect a derived statistic") using data
   already present in the corpus, rather than a hypothetical.
6. The second innings repeats the same structure. If the match went to a
   super over, a third `innings` row is created with `is_super_over = true`
   and is excluded from standard season/career aggregates by default (§7).
7. The fixture closes with an `outcome` row recording one of the seven
   possible outcome shapes.

This walkthrough confirms: competitors and participants can be represented;
events can be recorded in order; each event fits the proposed fields; the
required fixture statistics (team total, wickets, balls faced) can be
computed from those events; a correction demonstrably affects a derived
statistic; every calculated statistic traces back to specific delivery rows;
and nothing here is specific to a single fixture — the same model already
covers all 13,953 downloaded matches.

## 12. Open stakeholder questions

Carried forward from schema.md §9, since they were never resolved there and
belong properly to this domain-definition issue:

1. **Super-over convention:** should super-over statistics be entirely
   excluded from a player's season/career figures, or surfaced as a
   separately labelled scope the client can opt into? Not yet confirmed with
   the client.
2. **Storage benchmark for the corpus at full scale** (3,193,996 deliveries,
   2.5× the size of the subset the original storage projection was based on)
   is still outstanding — owner and date not yet assigned.
3. **Object-storage option for source files and dataset releases:** whether
   holding these outside PostgreSQL changes the ADR-003 hosting decision is
   still open.
4. **`IT20` misclassification (§10, item 8):** raised against the downloader
   but not yet fixed; needs a decision on whether to patch the downloader's
   classification logic or handle it in ingestion/validation instead.
5. **Review/DRS event usage:** the `Review` event is defined for provenance
   but has no statistic consuming it yet; confirm whether any Basic/
   Intermediate statistic should use it before Advanced-tier work begins.

## 13. Final decisions and approval record

- **Sport and format:** Cricket, T20, men's and women's, domestic/franchise
  and international competitions, per §1 — consistent with, and formalising,
  the corpus scope already approved in `schema.md` (approved by all six team
  members on 6 August 2026, per #27).
- **Submitter scope:** Competition-level grants are the implemented Basic-tier
  boundary. Fixture, season, and date-range grants remain possible future
  extensions, but are not prerequisites for issue #43 or the direct-submission
  flow.
- **This document's own approval status:** draft, pending explicit team
  review and stakeholder sign-off as required by #37's Definition of Done.
  Because the underlying schema decision already has six-person approval,
  this document's review can focus on the parts that were not previously
  written down explicitly: the submitter scope foundation (§9), the statistic
  requirement-tier assignments (§7), and the open questions (§12).
- **Outstanding before this issue can close:** team review, stakeholder
  review (or explicit recording of unresolved questions per §12), and a
  merged Pull Request per the Git workflow specified in #37.

## Change log

- **16 September 2026 (#623):** the extras co-occurrence example in §5 and §10 was corrected from
  "a wide with byes" to "a no-ball with byes" after the #623 corpus scan found no delivery recording
  a wide with byes or leg byes. The runs-conceded rule in §7 now states that byes and leg byes run
  off a wide are wide runs charged to the bowler (Law 22.6, ADR-014).

## AI Declaration

The submitter-scope implementation status was updated with the assistance of
Codex[GPT-5.6 Sol].
The issue #623 change log entry and corrected examples were added with the assistance of
Claude-Code[Claude Opus 5].
