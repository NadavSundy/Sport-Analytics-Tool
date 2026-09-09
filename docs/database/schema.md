# Event model

**Status:** Approved by all six team members on 6 August 2026. See #27.

Every published statistic is derived from accepted event records and remains
traceable to its submission, its events and, in due course, its
statistic-definition version. No statistic is stored as an independently entered
total. The executable migration history lives under `database/migrations/`.

---

## 1. What the source data forces

The design below is not a preference. Eight properties of the Cricsheet source
data rule out the obvious model. They were established by parsing the full
downloaded corpus: 13,953 matches and 3,193,996 deliveries, retrieved by
`scripts/download_cricsheet_t20.py`. The scripts that produced the figures are
committed as `scripts/catalogue_cricsheet_fields.py` and
`scripts/probe_cricsheet_edge_cases.py`, so every number below can be reproduced
and checked rather than taken on trust.

| #   | Property                                                                                                                                               | Consequence for the schema                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| O1  | The printed ball number repeats within an over in 20.4% of overs (104,818 of 514,380). One over holds nineteen deliveries, six of them labelled `5.1`. | Delivery identity is the position in the source array, never the printed number.     |
| O2  | 168 names map to more than one player identifier, and 40 identifiers map to more than one name. `Abdul Rahman` is three different people.              | Players key on the registry identifier. Names are display text and never a join key. |
| O3  | Extras types co-occur on a single delivery — a wide with byes. Five types appear: wides, leg byes, no-balls, byes and penalty.                         | Extras are separate nullable columns, not a type and a count.                        |
| O4  | `wickets` is an array. 5,833 dismissals name multiple fielders, and 127 fielder records identify a substitute with no name at all.                     | Wickets and fielders need their own tables, and fielder identity must be nullable.   |
| O5  | 99 matches carry four innings rather than two; 204 innings are flagged as super overs.                                                                 | Innings count per fixture is not fixed at two.                                       |
| O6  | 175 innings carry `miscounted_overs`, where an over legitimately holds five or seven legal balls.                                                      | No constraint may assume six legal balls per over.                                   |
| O7  | Penalty runs appear at innings level, belonging to no delivery.                                                                                        | A team total cannot be derived from deliveries alone.                                |
| O8  | `outcome` takes seven distinct shapes, including a result with no winner, an eliminator and a bowl-out.                                                | Outcome is not winner plus margin.                                                   |

### 1.1 The case that decides delivery identity

In match `1402765`, innings 0, over 5, seven consecutive deliveries carry the same
printed number:

| position | ball number | extras  |
| -------- | ----------- | ------- |
| 0        | 5.1         | no-ball |
| 1        | 5.1         | no-ball |
| 2        | 5.1         | no-ball |
| 3        | 5.1         | no-ball |
| 4        | 5.1         | no-ball |
| 5        | 5.1         | no-ball |
| 6        | 5.1         | —       |

Only the array position distinguishes them.

### 1.2 The case that decides player identity

Three patterns appear, and each breaks name-based identity differently:

- **Marriage or name change.** `KH Brunt` becomes `KH Sciver-Brunt`; `J Cleetus`
  becomes `J Peter`. One person, two names, across seasons.
- **Shared names.** Three distinct players named `Abdul Rahman`; two named
  `Junaid Siddique`.
- **Retroactive disambiguation.** `Kamran Khan` becomes `Kamran Khan (2)` when
  Cricsheet later distinguishes two players. A submission recorded before that
  change references a name that afterwards belongs to someone else.

The corpus holds 13,391 distinct identifiers against 13,240 distinct names: there
are more people than there are names for them.

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

TThe printed ball number is stored for display only, and never used to join. It is
derived at ingestion from a count of legal deliveries within the over: wides and
no-balls do not advance it, which is why it repeats. Storing the array position
here instead would produce a value that never repeats, and the column would no
longer demonstrate the property that makes `position_in_over` the identifier.

### 2.2 Players

Deliveries in the source reference players by name. Ingestion resolves every name
through the registry belonging to that match, yielding a stable identifier, and
the schema stores that identifier. Every name ever observed for a person is
retained as an alias, so that a name appearing in an older submission still
resolves after Cricsheet renames or disambiguates it.

### 2.3 Fixtures

Fixtures are identified by the Cricsheet match identifier, retained as
`source_ref`, so that a resubmitted or corrected match file is recognised as the
same fixture.

---

## 3. Corrections

Delivery event content is immutable. A correction inserts a new revision rather
than replacing or deleting the existing record. The previous live revision is
marked as superseded through audit metadata.

A partial unique index permits exactly one live row per natural key while allowing
unlimited superseded revisions behind it. Every derivation reads the
`delivery_current` view; correction history is available by querying the base
table.

A correction inherits the within-innings sequence of the revision it supersedes.
Without this rule a corrected delivery would receive a new sequence, and the order
of the innings would shift beneath any consumer paging through it.

`delivery.supersedes_delivery_id` links each replacement back to its immediate predecessor while
`delivery.superseded_by` links the predecessor forward. Database triggers require later revisions to
increase by exactly one and preserve the stable source event, original submission and event ordinal,
optional source batch item, and innings sequence. Published delivery content and provenance cannot be
updated in place; only the controlled live-to-superseded transition and initial batch-item link are allowed.

Every accepted correction appends one `delivery_correction_history` row containing the requester and
database timestamp, required reason, complete previous and resulting event snapshots, explicit delivery
links, and original submission/batch-item provenance. Optional reviewer, decision, review timestamp and
review reason fields are all-or-none where review applies. Update and delete triggers make the audit record
append-only. Authorised history reads use this table; public reads and statistics use `delivery_current`.

This is what makes the project's central claim demonstrable: correcting one
delivery changes exactly those statistics that depend on it, because every
statistic is an aggregation over the live rows, and the prior state remains
visible for audit.

Retrofitting this after implementation would be a rewrite rather than a change,
which is why it is settled here rather than deferred.

---

## 4. Entities

**Reference.** `person` and `person_alias`; `official`; `team`; `venue`;
`competition`; `dismissal_kind`.

**Identity.** `app_user`, keyed on the authentication provider and that provider's
subject identifier rather than on any provider-specific column, so that the schema
does not depend on the current choice of provider. Holds the display name, application role,
submitter-approval state, requested competition, disabled state, created time, last-updated time,
last-authenticated time, and the administrator account/time for the latest submitter-access change.
The nullable requested-competition foreign key records request workflow state without granting
access. `application_role` is
non-null, defaults to `viewer`, and accepts only
`viewer`, `submitter`, or `admin`. The database maintains the last-updated time for every account
change. Personal data remains with the authentication provider. The role is authoritative for
submission capability, while `submitter_competition_scope` remains separate and limits a submitter
or admin to a specific competition. The legacy `submitter_approval_state` column is retained as
deprecated request-workflow data and is not used for submission authorization. Authentication
never creates a privileged role or competition grant. Administrator approval, scope replacement,
revocation, and access-audit attribution are written in one transaction. Immutable
`submitter_access_history` rows retain each request, approval, rejection, and revocation, including
when a rejected or revoked viewer later makes a new request.

Account deletion does not remove this row. A deletion state machine records the external Auth and
local finalisation stages; the subject becomes a random tombstone, the display name is cleared, and
a one-way former-subject revocation marker prevents unexpired JWTs from recreating an active local
account. The internal identifier and submission relationship remain for provenance.

**Provenance.** `submission`, recording who submitted what, when, whether it
was accepted, and—where a JSON or CSV file was used—the original filename,
canonical media type, and byte length. Linked deliveries retain that submission
and source-file provenance without duplicating uploaded event content.

The durable batch-staging model adds `batch`, `batch_item`, `batch_checkpoint`,
`batch_validation_result`, and `batch_review_decision`. `batch` records the submitter, target
competition, idempotency key, package version, SHA-256 object identity, lifecycle and optional
superseding batch. `batch_item` retains each submitted JSON event in payload order, source identity
and location, reference-resolution evidence, validation outcome, and an optional link to the
published `delivery`. Its canonical innings reference is nullable only while resolution remains
unresolved, ambiguous, or invalid. `batch_checkpoint` has a composite batch-and-phase primary key,
so validation and publication retain independent ordinal, lease, and attempt data. Validation and
review records are append-only; a published delivery revision carries its explicit source item.
The live-delivery natural-key guarantee remains the existing partial unique index
`delivery_natural_key_live`; it permits historical revisions while preventing two live
deliveries at one innings/over/position. Batch and batch-item provenance is not deletable.

The batch foreign keys are canonical storage references, not fields a submitter must know. The
receipt API resolves a human-facing competition reference before creating `batch`; workers retain a
source identity, normalised location, and resolution outcome on `batch_item` while canonical fixture
or innings context remains unresolved. This preserves evidence without placeholder identifiers.
`batch.source_uri` is reserved for an opaque application object reference resolved by the backend
object-store adapter, never a public or signed provider URL. See
[Batch persistence extensions](batch-persistence.md) for the #359 gap analysis and migration record.

Issue #363 exposes this retained chain through protected APIs. Direct and uploaded submissions persist
`submission.source_sha256`; uploaded files additionally retain filename, media type and byte size.
Published batch deliveries retain `delivery.source_batch_item_id`, while batch source metadata and
checksum remain in `batch`/`stored_object`, including after raw-object expiry. Current and superseded
`delivery` revisions plus append-only `delivery_correction_history`, `batch_state_transition` and
`batch_review_decision` records provide the trace from a derived statistic contributor back to its
source, submitter and acceptance/publication decision. Account tombstoning keeps the internal account
relationship while removing personal display information, so historical provenance remains resolvable.

The `stored_object` relation holds the provider-independent metadata for those private bytes:
application object ID, owner, sanitised original filename, media type, byte size, SHA-256 checksum,
server-generated storage key, provider version, expiry time, and retention state. Its row is
non-deletable provenance. The expiry workflow deletes the raw provider object and records `expired`
plus `deleted_at` without removing the metadata needed to interpret a retained batch.

**Match structure.** `fixture`; `fixture_team`; `fixture_squad`;
`fixture_official`; `innings`; `innings_powerplay`; `innings_absent`;
`innings_miscounted_over`.

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
3. Boundaries count four or six off the bat, excluding the 232 deliveries flagged
   `non_boundary`, where the runs were run rather than struck to the rope.
4. A team total is the sum of delivery totals **plus** innings-level penalty runs
   (O7).
5. Legal balls in an over must be counted, never assumed to be six (O6).
6. Career aggregates group by person identifier, never by name (O2).
7. A wicket is credited to the bowler only for those dismissal kinds flagged
   `credits_bowler`. A run out is not the bowler's wicket.
8. Super-over innings are excluded from standard aggregates by default.

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
  A richer review workflow — who reviewed, when, against which rule — extends that
  table rather than replacing it.
- **Statistic definition and version** requires a definition identifier, a version,
  and the expression or code reference that computes it, so that a published
  figure can name the version that produced it. The super-over exclusion in rule 8
  belongs here rather than in query code.
- **Derived result** requires the definition version, the scope computed over, the
  value, and the deliveries consumed, so that a correction can identify which
  results are now stale.
- **Dataset release** requires a release identifier, the scope, the point in time
  represented, and a manifest, so that a consumer holding an older reference can
  still resolve it.

What must be settled first: which statistics the client actually requires, which
is the subject of #37, and how a release identifies the state of the data at a
point in time.

---

## 7. Decisions taken at review

Approved by all six team members on 6 August 2026: Ben Swartz, Shayna Unterslak,
Dean Feldman, Nadav Sundy, Gabriel Raz, Liora Rosenberg. Two AI-assisted reviews
were obtained beforehand; where they disagreed, the resolution and its reason are
recorded on #27.

1. **Dismissal kind** is a lookup table, `dismissal_kind`, with the raw source
   value retained on `delivery_wicket` for provenance. The table carries a
   `credits_bowler` flag, so that the distinction between a bowler's wicket and a
   run out lives in data rather than in application code. Fourteen kinds appear in
   the corpus, two of which were absent from the earlier subset, which is itself
   the argument against an enumeration.
2. **Officials** have their own table rather than being promoted to `person`. The
   source provides no stable identifier for them, and asserting identity from a
   name is precisely what observation O2 forbids. If an official registry becomes
   available, records reconcile through `external_ref`.
3. **Miscounted overs** are normalised into `innings_miscounted_over`. The source
   supplies the ball count as a string in some matches and an integer in others,
   so ingestion coerces it into a typed column. The table explains an irregularity
   rather than producing a figure; legal balls per over are still counted from the
   delivery rows themselves.
4. **The within-innings sequence** is assigned at ingestion, not derived on read,
   because the API must return events in occurrence order with pagination. A
   correction inherits the sequence of the revision it supersedes.
5. **Super-over innings** are excluded from standard aggregates. Separately scoped
   `super-over-only` statistics may be provided explicitly. A combined
   `standard-and-super-over-combined` scope may be introduced in future, but it must
   never be the default. The exclusion must eventually become a property of a
   versioned statistic definition.
   The current implementation follows this default under Issue #104, while final
   client confirmation remains open.
6. **`app_user`** is included here in minimal form. Issue #44 extends the record with approval and
   synchronization state and adds competition-scoped grants; it does not redefine submission
   ownership. Issue #66 adds recoverable deletion state and non-identifying tombstoning without
   changing that ownership relationship.
7. **Storage** is not permitted to shape the schema. A measured benchmark against
   the real schema and indexes is required before the hosting question is
   resolved, and the option of holding source files and dataset releases in object
   storage rather than in PostgreSQL is to be evaluated. ADR-003 records this as
   open.

---

## 8. Source data questions resolved before implementation

Three fields were identified in the corpus catalogue but not understood at the
time of review. All three were investigated before the migration was written, by
`scripts/probe_delivery_over_key.py` and `scripts/probe_match_metadata.py`.

**A delivery-level `over` key** appears on 3,068 deliveries across 13 files. It is
redundant: in every case it equals the number of the over object containing it,
with zero disagreements across the full corpus. It is a generation artefact
affecting 0.09% of matches. The parent over is authoritative and the field is
ignored.

**`supersubs`** appears on 42 matches, all in the Big Bash League, and maps a team
to a single named player. It records the competition's substitute rule. It is a
squad fact rather than an event, and is represented by a nullable role on
`fixture_squad` rather than a table of its own.

**`bowl_out`** appears on 2 matches, both from 2006 and 2007, and holds an ordered
list of bowler and outcome pairs. It records the tie-breaking mechanism that
preceded the super over, and the same bowler may appear more than once.

The individual bowl-out attempts are **deliberately not modelled**. The rule is
obsolete, the data covers two matches out of 13,953, and no statistic in scope is
derived from it. The fixture outcome must still be able to record that a match was
decided by a bowl-out, which a nullable outcome column provides. This is recorded
as a known exclusion rather than an oversight; if a bowl-out statistic is later
required, the source data remains available for a subsequent migration.

## 9. Outstanding

- Client confirmation of the super-over convention.
- The storage benchmark: owner and date. The corpus is 3,193,996 deliveries,
  which is two and a half times the subset the original projection was based on.
- Whether the object-storage option changes the hosting decision in ADR-003.
- The 320 matches classified `IT20` are not the international matches. Every match
  in the T20 international archive carries `match_type: "T20"` with
  `team_type: "international"`, and `match_type_number` is present on exactly
  those 5,602 matches. Anything treating `IT20` as meaning international will
  misclassify roughly 5,300 matches. Raised against the downloader.

- Client confirmation of the super-over convention.
- The storage benchmark: owner and date. The corpus is 3,193,996 deliveries,
  which is 2.5 times the subset the original projection was based on.
- Whether the object-storage option changes the hosting decision in ADR-003.
- Three delivery-level fields require investigation before the migration is
  written: an `over` key appearing on 3,068 deliveries, where the over number
  should belong to the parent over object; `supersubs`, present on 42 matches; and
  `bowl_out`, present on 2.
- The 320 matches classified `IT20` are not the international matches. Every match
  in the T20 international archive carries `match_type: "T20"` with
  `team_type: "international"`, and `match_type_number` is present on exactly
  those 5,602 matches. Anything treating `IT20` as meaning international will
  misclassify roughly 5,300 matches.

---

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5], from an analysis of the Cricsheet T20 corpus. The issue #44 application
account and scope description was updated with the assistance of Codex[GPT-5.6 Sol]. The issue #255
requested-competition description was updated with the assistance of Codex[GPT-5].
The issue #276 batch-staging description was added with the assistance of Codex[GPT-5].
The issue #356 downstream reference and object-storage boundaries were documented with the
assistance of Codex[GPT-5].
The issue #359 batch-persistence extension was documented with the assistance of Codex[GPT-5].
The issue #358 stored-object schema was documented with the assistance of Codex[GPT-5].
The issue #284 immutable correction audit schema was documented with the assistance of Codex[GPT-5].

The issue #363 protected provenance API documentation was generated and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
