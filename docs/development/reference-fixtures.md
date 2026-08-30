# Reference Fixtures: Provenance and Update Policy

## 1. Purpose

This document defines what a reference fixture is, where its expected figures come
from, which record governs when sources disagree, and the conditions under which a
reference document may be changed.

It exists because the platform must be able to demonstrate that a published figure
is correct, not merely that the code which produced it ran without error. A
derivation checked only against its own output proves nothing.

## 2. Definition

A **reference fixture** is a match whose expected results are recorded from a
published source independent of the data the platform ingests, and against which
the platform's derivation is compared automatically.

A reference fixture consists of three parts:

1. a committed source file under `database/seeds/matches/`;
2. a published-figures document under `evidence/validation/`; and
3. automated comparisons in `apps/backend/tests/database/`.

A match with only the first two is not a reference fixture. It is a seed.

## 3. The reference set

| Identifier | Match                                             | What it exercises                                                                                                                                                         |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 729307     | Kolkata Knight Riders v Kings XI Punjab, IPL 2014 | All four common extras types; a run out excluded from bowler credit                                                                                                       |
| 423788     | New Zealand v Australia, 2nd T20I, 2010           | A tie decided by a one-over eliminator; super-over exclusion; a hit wicket dismissal; extras published as runs where the delivery count differs                           |
| 1399114    | Pakistan v Hong Kong, Asian Games 2023            | An international fixture whose `match_type` is `T20`; a seven-ball over                                                                                                   |
| 1462921    | Uganda v Rwanda, Africa Continental Cup 2024/25   | A shortened innings with a target adjusted under D/L; the highest proportion of uncredited dismissals; a divergence between the committed source and the published record |

The set is chosen to exercise cases that are modelled wrongly by a plausible but
incorrect implementation, not to be representative of ordinary matches. A fixture
that exercises nothing the others do not may not be added to the set.

## 4. Provenance of expected figures

### 4.1 Published figures

A published figure is one obtained from a published scorecard. Published figures
must:

1. be transcribed from a source cited by URL in the reference document;
2. be read by a person, not extracted automatically; and
3. be independent of the committed source file.

Requirement 3 is the point of the exercise. A figure derived from the same data
the platform ingests corroborates nothing.

Where a scorecard site blocks automated access, that is not an obstacle to be
worked around. The figures are read by hand.

### 4.2 Measured figures

A **measured figure** is one obtained from the committed source file or from the
database — for example a legal-delivery count, which published scorecards do not
print.

Measured figures must be labelled as such and recorded separately from published
figures. They may be produced automatically.

### 4.3 Runs are not deliveries

A scorecard's extras line reports **runs**. A wide that runs away for four is one
delivery and four runs.

An expected value for a delivery-count assertion may never be copied from an
extras line. Where the two coincide, the reference document must say that they
coincide rather than leaving the reader to assume it.

## 5. Which record governs

The two records answer different questions and neither is subordinate to the
other.

1. The **published scorecard** is authoritative for what happened in the match.
2. The **committed source file** is authoritative for what the platform is able to
   derive.

Where they agree, the figure is asserted by an automated comparison.

Where they disagree:

1. both figures must be recorded in the reference document, each attributed to its
   record;
2. the cause of the divergence must be established and documented, or explicitly
   recorded as unexplained;
3. the scope of the divergence must be stated — which figures it affects and which
   it does not; and
4. **no assertion may be written against a divergent figure** until the divergence
   is resolved.

A divergence is a finding, not a failure. It is recorded, not smoothed over.

### 5.1 A committed source may not be edited to resolve a divergence

The seed files are a verbatim record of data obtained from Cricsheet. Editing one
to agree with a scorecard would destroy the property that makes it evidence, and
would make the platform's ingestion untestable against real-world data defects.

Where a source is found to be defective, the defect is documented and, where the
upstream project accepts reports, reported upstream. It is not patched locally.

### 5.2 Recorded divergences

| Fixture | Divergence                                                                                                                                                                | Status                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1462921 | The source omits one scoreless delivery from Uganda's innings: 107 legal deliveries against the 108 implied by a completed 18 overs. No run or wicket figure is affected. | Cause established. Assertions on Uganda's legal-delivery count suspended; all other figures assertable. |
| 423788  | The scorecard reports New Zealand's eliminator as four balls; the source records five deliveries of which three were legal. The runs agree.                               | Unexplained. Assertions on the eliminator ball count suspended.                                         |

## 6. When a reference document may change

A reference document may be changed only for one of the following reasons.

1. **A published source is corrected.** The corrected figures are transcribed, the
   change is recorded with its date and what changed, and the affected automated
   comparisons are updated in the same Pull Request.
2. **A newer version of the committed source is obtained.** Measured figures are
   re-measured. Published figures are unchanged. Any new divergence is recorded
   under section 5.
3. **A divergence is resolved.** The resolution and its evidence are recorded, and
   the suspended assertion is written.
4. **An error in transcription is found.** The correction is recorded explicitly;
   a corrected figure may not be substituted silently.
5. **The reference set is extended.** See section 8.

A reference document may **not** be changed to make a failing comparison pass. A
comparison that fails is either a defect in the derivation or an error in the
reference figures, and which of the two must be established before either is
changed.

## 7. Review

A change to a reference document or to the comparisons that use it requires review
by a team member other than its author, as for any other change.

The reviewer must confirm that any changed published figure was checked against
the cited source, and that no expected value was altered solely to make a
comparison pass.

Where the change was AI-assisted, the declaration must state that the published
figures were verified by a person against the cited source. A declaration that
cannot honestly say so must say so instead.

## 8. Adding a reference fixture

A fixture may be added to the reference set when:

1. it exercises a case no fixture in the set already exercises, stated explicitly;
2. a published scorecard for it exists and is citable by URL;
3. its identifier is traceable between the published source and the committed
   source file;
4. a published-figures document is written under `evidence/validation/`; and
5. automated comparisons are added.

The set is intended to stay small. Each fixture must earn its place by covering a
distinct failure mode.

## 9. Where each fixture's evidence and coverage live

Coverage for a reference fixture is spread across several files and is not
discoverable from an issue description. This table is the index, and it must be
updated whenever a fixture gains or loses coverage.

| Fixture | Published figures                                  | Automated comparisons                                | Other records                                            |
| ------- | -------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| 729307  | `evidence/validation/729307-published-figures.md`  | `tests/database/reference-fixture.database.test.ts`  | `scripts/validate-match.ts`                              |
| 423788  | `evidence/validation/423788-published-figures.md`  | `tests/database/fixture-statistics.database.test.ts` | `evidence/validation/issue-104-super-over-aggregates.md` |
| 1399114 | `evidence/validation/1399114-published-figures.md` | _pending, issue #287_                                | —                                                        |
| 1462921 | `evidence/validation/1462921-published-figures.md` | _pending, issue #287_                                | —                                                        |

Test paths are relative to `apps/backend/`.

## 10. Related documents

- `database/seeds/README.md` — the committed seeds and their provenance
- `docs/development/testing.md` — the testing strategy
- `evidence/validation/` — published-figures documents and issue validation records
- `apps/backend/scripts/validate-match.ts` — the manual validator

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5].
