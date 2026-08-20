# Seeds

Store deterministic, non-sensitive development and test seed data here. Seed data
must be clearly fictional or sourced under an appropriate licence.

## Match data

`matches/` contains four Cricsheet match files used to seed a development
database. They are loaded by the ingestion script rather than by SQL inserts, so
the seed exercises the same validation path as a real submission and cannot drift
from the schema. Loading the same files again does not duplicate fixtures,
innings, participants, deliveries or wickets.

| Match   | Reason for inclusion                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 729307  | Reference fixture. Expected figures recorded in `evidence/validation/729307-published-figures.md` from a published scorecard. |
| 423788  | Super over. Four innings, reversed batting order, tie decided by eliminator.                                                  |
| 1462921 | Miscounted over with the ball count supplied as a string.                                                                     |
| 1399114 | Miscounted over with the ball count supplied as an integer.                                                                   |

## Licence and attribution

Cricsheet match data and its public player register are made available under the
[Open Data Commons Attribution License 1.0](https://opendatacommons.org/licenses/by/1-0/),
which permits copying, distributing, using, adapting and producing works from the
dataset provided public use is attributed.

Source: [Cricsheet](https://cricsheet.org/). The identifiers and public sporting
names in these fixtures use the [Cricsheet Register](https://cricsheet.org/register/).

Any public release of data derived from these files must carry the same
attribution.

## Data protection

The committed subset contains public match facts, professional player and
official names, and Cricsheet registry identifiers needed to resolve those names.
It does not contain contact details, authentication identifiers, private profiles
or other restricted personal information. The files were selected for event and
schema coverage, not to profile individuals, and are retained with their source
and licence attribution.

## Automated verification

`apps/backend/tests/database/reference-fixture.database.test.ts` loads match
729307 into an isolated PostgreSQL transaction and verifies the representative
domain entities, ordered Basic delivery/extra/wicket vocabulary, published
figures, repeat loading and all three invalid examples. Run it as part of the
database integration suite:

```bash
npm run test:database
```

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5]
and reviewed and edited with the assistance of Codex[GPT-5].
