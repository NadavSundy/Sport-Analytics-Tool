@'

# Seeds

Store deterministic, non-sensitive development and test seed data here. Seed data
must be clearly fictional or sourced under an appropriate licence.

## Match data

`matches/` contains four Cricsheet match files used to seed a development
database. They are loaded by the ingestion script rather than by SQL inserts, so
the seed exercises the same validation path as a real submission and cannot drift
from the schema.

| Match   | Reason for inclusion                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 729307  | Reference fixture. Expected figures recorded in `evidence/validation/729307-published-figures.md` from a published scorecard. |
| 423788  | Super over. Four innings, reversed batting order, tie decided by eliminator.                                                  |
| 1462921 | Miscounted over with the ball count supplied as a string.                                                                     |
| 1399114 | Miscounted over with the ball count supplied as an integer.                                                                   |

## Licence and attribution

Cricsheet match data is made available under the Open Data Commons Attribution
License 1.0 (ODC-BY), which permits copying, distributing, using, adapting and
producing works from the dataset provided public use is attributed.

Source: Cricsheet, https://cricsheet.org/

Any public release of data derived from these files must carry the same
attribution.

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5].
'@ | Set-Content -Path database\seeds\README.md -Encoding utf8
