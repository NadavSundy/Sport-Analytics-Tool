# Event model

**Status:** Proposed. Requires approval by all six team members before the
migration is written. See #27.

Every published statistic is derived from accepted event records and remains
traceable to its submission, its events and, in due course, its
statistic-definition version. No statistic is stored as an independently entered
total. The executable migration history lives under `database/migrations/`.

---

## 1. What the source data forces

The design below is not a preference. Five properties of the Cricsheet source
data, established by parsing all 5,602 matches in the T20 international archive
(1,266,835 deliveries), rule out the obvious model. The scripts that produced
these figures are committed so the numbers can be reproduced.

| # | Property | Consequence for the schema |
|---|---|---|
| O1 | The printed ball number repeats within an over in 23.8% of overs. One over holds nineteen deliveries, six labelled `5.1`. | Delivery identity is the position in the source array, never the printed number. |
| O2 | Seventeen registry identifiers map to more than one name; sixty-eight names map to more than one identifier. Four distinct players are named `Muhammad Usman`. | Players key on the registry identifier. Names are display text and never a join key. |
| O3 | Extras types co-occur on a single delivery — a wide with byes. | Extras are separate nullable columns, not a type and a count. |
| O4 | `wickets` is an array. Six deliveries carry two. 3,577 dismissals name multiple fielders, and 26 fielder records identify a substitute with no name. | Wickets and fielders need their own tables, and fielder identity must be nullable. |
| O5 | Forty-six matches carry four innings, the last two being a super over. | Innings count per fixture is not fixed at two. |
| O6 | One hundred and eighteen innings carry `miscounted_overs`, where an over legitimately holds five or seven legal balls. | No constraint may assume six legal balls per over. |
| O7 | Penalty runs appear at innings level, belonging to no delivery. | A team total cannot be derived from deliveries alone. |
| O8 | `outcome` takes seven distinct shapes, including a result with no winner, an eliminator, and a bowl-out. | Outcome is not winner plus margin. |

---

## 2. Identity

### 2.1 Deliveries

A delivery is identified by:

```
(fixture, innings ordinal, over number, position within the over)
```

`position_in_over` is the zero-based index in the source array. This is also the
idempotency key: two submitted deliveries are the same delivery when these four
values agree, which is what allows a feed to be replayed without double-counting.

The printed ball number, such as `9.5`, is stored for display only. Property O1
shows it is not unique and it must never be used to join.

### 2.2 Players

Deliveries in the source reference players by name, but names are not stable
(O2). Ingestion resolves every name through the registry belonging to that match,
yielding a stable identifier. The schema stores that identifier. Every name ever
observed for a person is retained as an alias, so that a name appearing in an old
submission still resolves.

### 2.3 Fixtures

Fixtures are identified by the Cricsheet match identifier, retained as
`source_ref`. This is what allows a resubmitted or corrected match file to be
recognised as the same fixture.

---

## 3. Corrections

Deliveries are append-only. Nothing is updated in place and nothing is deleted.

A correction inserts a new row carrying the same natural key, with `revision`
incremented. The row it replaces has `superseded_at` and `superseded_by` set. A
partial unique index permits exactly one live row per natural key while allowing
unlimited superseded rows behind it.

Every derivation reads the `delivery_current` view. Correction history is
available by querying the base table directly.

This is what makes the project's central claim demonstrable: correcting one
delivery changes exactly those statistics that depend on it, because every
statistic is an aggregation over the live rows, and the prior state remains
visible for audit.

Retrofitting this after implementation would be a rewrite rather than a change,
which is why it is settled here rather than deferred.

---

## 4. Entities

**Reference.** `person` and `person_alias`; `team`; `venue`; `competition`.

**Identity.** `app_user`, holding the Firebase identifier, a display name and the
application role. Personal data remains with the authentication provider; this
table exists so that submissions have an owner and so that authorisation state
has somewhere to live. It is provisional and belongs ultimately to the
authentication issue — see section 7.

**Provenance.** `submission`, recording who submitted what, when, from which
source file, with what checksum, and whether it was accepted.

**Match structure.** `fixture`; `fixture_team`; `fixture_squad`;
`fixture_official`; `innings`; `innings_powerplay`; `innings_absent`.

**Events.** `delivery`; `delivery_wicket`; `delivery_wicket_fielder`;
`delivery_review`; `delivery_replacement`.

---

## 5. Derivation rules the schema must support

These belong to the derivation engine, but the schema is shaped to make them
expressible, and each is a place where a naive model would produce wrong figures.

1. Balls faced counts deliveries where no wide was bowled. A no-ball is faced; a
   wide is not.
2. Runs conceded by a bowler include wides and no-balls but exclude byes and
   leg-byes.
3. Boundaries count four or six off the bat, excluding deliveries flagged
   `non_boundary`, where the runs were run rather than struck to the rope.
4. A team total is the sum of delivery totals **plus** innings-level penalty runs
   (O7).
5. Legal balls in an over must be counted, never assumed to be six (O6).
6. Career aggregates group by person identifier, never by name (O2).
7. Super-over innings are conventionally excluded from batting averages. Whether
   this project excludes them is an open question — see section 7.

---

## 6. Deferred entities

`database/schema/event-model.md` identifies four further concerns that this
iteration does not implement: validation and review state; statistic definitions
and their versions; derived statistic results and their provenance; and dataset
releases and export jobs.

They are deferred deliberately, not overlooked. A derived result cannot be
modelled before the events it derives from exist, and a statistic definition
cannot be versioned before the derivation engine establishes what a definition
contains. Their intended shape:

- **Validation state** belongs on `submission`, which already carries a status.
  Richer review workflow — who reviewed, when, against what rule — extends that
  table rather than replacing it.
- **Statistic definition and version** requires a definition identifier, a version,
  and the expression or code reference that computes it, so that a published
  figure can name the version that produced it.
- **Derived result** requires the definition version, the scope it was computed
  over, the value, and the set of deliveries it consumed, so that a correction can
  identify which results are now stale.
- **Dataset release** requires a release identifier, the scope, the point in time
  it represents, and a manifest, so that a consumer holding an old reference can
  still resolve it.

What must be settled first: what statistics the client actually requires, and how
a release identifies the state of the data at a point in time.

---

## 7. Open questions for review

1. Should the dismissal kind be free text, an enumeration, or a lookup table?
   Thirteen kinds appear in this corpus, but the set is open, and an enumeration
   requires a migration to extend.
2. Officials do not appear in the player registry and so have no stable
   identifier. Should they be promoted to `person` records regardless, or remain
   denormalised names?
3. Should `miscounted_overs` remain unstructured, or be normalised? It affects
   118 innings out of 11,217.
4. Is the within-innings sequence assigned at ingestion or derived on read?
   Assigning costs a write-time computation; deriving costs an ordering on every
   query.
5. Are super-over innings included in season and career aggregates?
6. `app_user` is proposed here because authentication currently verifies tokens
   without persisting identity, and submissions need an owner. Should it live in
   this schema, or should this issue wait for the authentication issue to define
   it?
7. The agreed competition scope is 13,953 matches, approximately 3.15 million
   deliveries. The projected storage requirement exceeds the current hosting
   plan's limit. ADR-003 records this as unresolved.

---

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5], from an analysis of the Cricsheet T20 corpus.