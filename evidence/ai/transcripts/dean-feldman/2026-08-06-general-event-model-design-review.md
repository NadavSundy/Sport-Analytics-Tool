# Event model design review

**User:** Anonymous  
**Created:** 8/6/2026 11:43:09  
**Updated:** 8/6/2026 11:43:28  
**Exported:** 8/7/2026 12:53:42  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a74571d-891c-83ea-82b6-86430affc2d8](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a74571d-891c-83ea-82b6-86430affc2d8)  

## Prompt:
8/6/2026, 11:43:06 AM

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
Claude-Web[Claude Opus 5], from an analysis of the Cricsheet T20 corpus. Will you guys please see what your AI says about the 7 open questions

## Response:
8/6/2026, 11:43:08 AM

Overall, I think this is a very strong design. It is solving problems that the project brief explicitly calls out-traceability, replayable submissions, corrections, stable identifiers, and derivation from events rather than stored totals. `sport_analytics (1).pdf`

Here are my recommendations for each of the seven open questions.

| # | Recommendation | Confidence | Reasoning |
|---|---|---|---|
| **1** | **Lookup table (`dismissal_kind`)** | ⭐⭐⭐⭐⭐ | Gives referential integrity while remaining extensible. |
| **2** | **Promote officials to `person`** | ⭐⭐⭐⭐☆ | Future-proofs the schema and simplifies relationships. |
| **3** | **Leave `miscounted_overs` unstructured for now** | ⭐⭐⭐⭐⭐ | Rare enough that normalization adds complexity without much value. |
| **4** | **Assign sequence during ingestion** | ⭐⭐⭐⭐☆ | Faster reads and deterministic ordering. |
| **5** | **Exclude super overs by default** | ⭐⭐⭐⭐⭐ | Matches cricket convention and simplifies statistics. |
| **6** | **Keep `app_user` in this schema** | ⭐⭐⭐⭐⭐ | Needed for provenance regardless of authentication implementation. |
| **7** | **Treat storage as an ADR/infrastructure issue** | ⭐⭐⭐⭐⭐ | Avoid designing around today's hosting limits. |

---

# 1. Dismissal kind

**Recommendation: Use a lookup table.**

```
dismissal_kind
--------------
id
code
display_name
description
```

Then

```
delivery_wicket
---------------
dismissal_kind_id
```

### Why?

You currently mention that there are 13 known dismissal kinds but the set is open.

An enum seems attractive initially, but:

- every new dismissal type requires a migration
- migrations become coupled to cricket law changes
- PostgreSQL enums are annoying to evolve

Free text is the opposite problem:

```
Caught
caught
Catch
caught out
```

all become possible.

A lookup table gives:

- referential integrity
- readable joins
- extensibility
- documentation
- easy API responses

I'd only use an enum if the set were truly fixed forever.

---

# 2. Officials

> Should officials become person records?

**Recommendation: Yes.**

I would promote them into `person`.

Reason:

You already have

```
person
person_alias
```

Officials are still people.

Even if they don't have registry IDs you can simply have

```
person
--------
id (UUID)
registry_id nullable
person_type
```

or

```
source = registry
source = manual
```

Advantages:

- single people table
- future statistics
- future search
- future profiles
- less duplicated code

The missing registry ID shouldn't stop normalization.

---

# 3. Miscounted overs

Current incidence:

> 118 innings out of 11,217

That is roughly **1%**.

I would **leave it as JSON or another unstructured field for now.**

Reason:

It is only needed for validation.

Normalizing means introducing tables like

```
innings
miscounted_over
miscounted_over_ball
```

which probably nobody queries.

If later the client wants reports like

> "Show all innings with miscounted overs"

you can always normalize later.

Current complexity is not justified.

---

# 4. Sequence assignment

> Assigned during ingestion or derived?

I would assign it.

For example

```
delivery_sequence
```

```
1
2
3
...
```

generated during import.

Reasons:

- deterministic
- easier replay
- faster queries
- no repeated ordering
- easier pagination

Deriving it every read means every query performs ordering/window functions.

Write once.

Read thousands of times.

Optimize reads.

---

# 5. Super overs

This is probably the most subjective one.

I'd recommend

> **Exclude from career and season aggregates by default.**

Why?

Most cricket statistics:

- batting average
- bowling average
- strike rate
- economy

traditionally ignore super overs.

Otherwise players suddenly gain:

- extra innings
- extra wickets
- extra balls

that distort career figures.

The nice compromise:

```
include_super_overs = false
```

inside the derivation engine.

Then later the API can expose

```
?includeSuperOvers=true
```

without changing storage.

Storage should never force this decision.

---

# 6. app_user

I actually think this belongs exactly where it is.

Authentication providers prove identity.

Your database owns application data.

You need

```
submission.owner_id
```

Somewhere.

Firebase/Auth0/etc should never become your relational model.

I'd keep

```
app_user
---------
id
firebase_uid
role
display_name
created_at
```

Authentication verifies tokens.

Application stores permissions.

That separation is very common.

---

# 7. Storage limits

Current estimate:

```
13,953 matches

≈3.15 million deliveries
```

This isn't really a schema problem.

I'd explicitly say:

> The schema should be designed for correctness, not today's hosting quota.

Then evaluate:

- Azure PostgreSQL
- Supabase paid
- Neon
- Azure SQL
- partitioning later if needed

Changing hosting is much easier than redesigning tables.

I'd keep ADR-003 open exactly as written.

---

# Additional comments

There are a couple of extra things I'd probably discuss with the team.

### A. UUID vs integer IDs

For reference tables I'd probably use UUIDs only where external exposure matters.

Internally:

```
delivery
person
team
fixture
```

could all use

```
BIGINT
```

for performance.

Expose stable external IDs separately if needed.

---

### B. Soft deletion

You've already solved corrections elegantly.

I'd explicitly state:

> Rows are never deleted except administrative reference data.

This reinforces the audit trail.

---

### C. Submission schema version

I'd add

```
submission
----------
schema_version
```

because eventually event schemas evolve.

Otherwise an old submission cannot necessarily be revalidated.

---

### D. Source payload

I might also keep

```
raw_payload
```

or

```
source_blob_hash
```

for forensic debugging.

You already keep checksums, which is excellent.

---

# Overall assessment

If I were reviewing this as an architecture proposal for the Wits SDP project, I'd approve it with only a few amendments.

The biggest changes I'd request are:

1. ✅ Use a lookup table for dismissal kinds instead of enums/free text.
2. ✅ Promote officials into the `person` model.
3. ✅ Keep `miscounted_overs` denormalized.
4. ✅ Assign delivery sequence during ingestion.
5. ✅ Exclude super overs by default, but make it configurable in the derivation layer.
6. ✅ Keep `app_user` in the event schema.
7. ✅ Leave storage planning as an ADR rather than compromising the schema.

The overall direction aligns very well with the project brief's emphasis on event-derived statistics, replayable submissions, correction history, provenance, and stable identifiers. It also puts you in a strong position to implement the advanced-tier requirements around versioned derivations and historical reproducibility later in the semester. `sport_analytics (1).pdf` `project_briefs (4).pdf`



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)