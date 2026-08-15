# Submission field mapping

| Document Information | Details                                 |
| -------------------- | --------------------------------------- |
| Purpose              | Deliverable of issue #49                |
| Contract             | `packages/contracts/src/submissions.ts` |
| Schema version       | 1.0                                     |
| Status               | Current                                 |

## 1. Purpose

This document maps every field of the direct submission contract to the
relational entity that stores it, and records the fields the contract
deliberately does not carry. It describes the contract as implemented, not a
proposed design.

The relational model is defined by the migration `20260806150357535_delivery-event-schema`
and documented in [the event model](../database/schema.md).

## 2. Envelope

| Contract field  | Stored as                             | Notes                                                                |
| --------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `fixtureId`     | Resolved against `fixture.fixture_id` | Must already exist. The contract does not create fixtures.           |
| `schemaVersion` | `submission.schema_version`           | Literal `1.0`. A submission declaring any other version is rejected. |
| `events`        | One `delivery` row per element        | Between 1 and 1,000 elements.                                        |

The submission itself is recorded in `submission`, carrying the submitter, the
received timestamp and the accepted status. Every delivery references it through
`delivery.submission_id`, which is how a published statistic remains traceable to
the submission that supplied it.

## 3. Delivery event

| Contract field     | Column                               | Table                   | Notes                                                                                              |
| ------------------ | ------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `eventId`          | Recorded against the submitted event | `submission` provenance | A UUID. Detects accidental retry or replay within a submission.                                    |
| `inningsId`        | `delivery.innings_id`                | `delivery`              | Must already exist. The contract does not create innings.                                          |
| `sequenceNumber`   | `delivery.innings_sequence`          | `delivery`              | Assigned at submission, not derived on read. Must ascend within an innings.                        |
| `overNumber`       | `delivery.over_number`               | `delivery`              | Zero-based. Part of the natural key.                                                               |
| `positionInOver`   | `delivery.position_in_over`          | `delivery`              | Zero-based index within the over. **This is the identifying column**, not the printed ball number. |
| `ballNumber`       | `delivery.ball_number`               | `delivery`              | Display only. Never unique, never used to join.                                                    |
| `strikerId`        | `delivery.striker_id`                | `delivery`              | References `person`. Must differ from the non-striker.                                             |
| `nonStrikerId`     | `delivery.non_striker_id`            | `delivery`              | References `person`.                                                                               |
| `bowlerId`         | `delivery.bowler_id`                 | `delivery`              | References `person`.                                                                               |
| `runs.offBat`      | `delivery.runs_off_bat`              | `delivery`              |                                                                                                    |
| `runs.extras`      | `delivery.runs_extras`               | `delivery`              | Must equal the sum of the extras breakdown.                                                        |
| `runs.total`       | `delivery.runs_total`                | `delivery`              | Must equal off-bat plus extras. Enforced by `delivery_runs_ck`.                                    |
| `runs.nonBoundary` | `delivery.non_boundary`              | `delivery`              | Defaults to false.                                                                                 |

## 4. Extras

Extras are stored as a nullable column per type rather than as a type and a
count, because more than one type can apply to a single delivery — a wide with
byes, for example.

| Contract field   | Column                   |
| ---------------- | ------------------------ |
| `extras.wides`   | `delivery.extra_wides`   |
| `extras.noBalls` | `delivery.extra_noballs` |
| `extras.byes`    | `delivery.extra_byes`    |
| `extras.legByes` | `delivery.extra_legbyes` |
| `extras.penalty` | `delivery.extra_penalty` |

An absent type is stored as null rather than zero, so that a type which did not
occur is distinguishable from one that occurred and awarded no runs.

## 5. Wickets and fielders

| Contract field                       | Column                                                   | Table                     |
| ------------------------------------ | -------------------------------------------------------- | ------------------------- |
| `wickets[].kind`                     | `delivery_wicket.kind` and `delivery_wicket.source_kind` | `delivery_wicket`         |
| `wickets[].playerOutId`              | `delivery_wicket.player_out_id`                          | `delivery_wicket`         |
| `wickets[].fielders[].participantId` | `delivery_wicket_fielder.person_id`                      | `delivery_wicket_fielder` |
| `wickets[].fielders[].substitute`    | `delivery_wicket_fielder.is_substitute`                  | `delivery_wicket_fielder` |

`kind` is resolved against the `dismissal_kind` lookup table before storage. The
vocabulary is held in that table rather than enumerated in the contract because
the set is open: two kinds present in the full corpus were absent from the subset
the schema was designed against.

`person_id` on a fielder is nullable, because some records identify a substitute
with no name at all. A fielder must therefore either identify a participant or be
marked as a substitute; `fielder_identified_ck` enforces this at the database and
the contract enforces it at submission.

## 6. Fields the contract does not carry

These are represented in the relational model but have no submission path. They
are recorded here so the omission is a known limitation rather than an oversight.

| Not carried                        | Stored in                                     | Consequence                                                                                                                              |
| ---------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Fixture creation                   | `fixture` and its associated tables           | A submission adds events to a fixture created by other means. Only the ingestion script creates one.                                     |
| Innings creation                   | `innings`                                     | Likewise.                                                                                                                                |
| Super-over flag                    | `innings.is_super_over`                       | Belongs to the innings, so the contract is agnostic: the same delivery is valid whichever innings it references.                         |
| Innings penalty runs               | `innings.penalty_pre`, `innings.penalty_post` | **A team total is the sum of delivery totals plus innings-level penalty runs, so it cannot be derived from submitted deliveries alone.** |
| Powerplay markers                  | `innings_powerplay`                           | Powerplay-scoped aggregates cannot be derived from a submission.                                                                         |
| Miscounted-over notes              | `innings_miscounted_over`                     | The irregularity is not recorded, though legal balls are still counted from the delivery rows themselves.                                |
| Reviews                            | `delivery_review`                             | Not used by any Basic statistic; retained in the model for provenance.                                                                   |
| Replacements                       | `delivery_replacement`                        | Likewise.                                                                                                                                |
| Correction of an existing delivery | `delivery.superseded_by`                      | The contract submits new events. Correcting one is not yet supported through submission.                                                 |

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5].
