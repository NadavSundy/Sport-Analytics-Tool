@'

# Invalid submission examples

Each file is match 729307 with exactly one deliberate defect introduced. They are
not loaded by the seed. They exist to demonstrate that a defective submission is
rejected with a message identifying the problem, and that a rejected submission
leaves no partial data behind.

They are produced by `scripts/make_invalid_seeds.py` from the valid file under
`../matches`, so the defect is the only difference.

| File                              | Defect                                                                         | Rejected by                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `unregistered-name.json`          | The batter on the first delivery is a name absent from `info.registry.people`. | Application check in `ingest-match.ts`. Names are not identifiers; a name the registry omits cannot be resolved to anyone. |
| `inconsistent-runs.json`          | `runs.total` on the first delivery is 6 where batter plus extras is 4.         | `delivery_runs_ck`.                                                                                                        |
| `striker-equals-non-striker.json` | The non-striker on the first delivery is the same person as the batter.        | `delivery_striker_ck`.                                                                                                     |

Rejection happens at two layers: the application refuses input it cannot resolve,
and the database refuses rows that violate its own rules. Neither layer is relied
upon alone.

## Verification

Each file was submitted to the ingestion script on 10 August 2026. Each was
rejected with a message naming the defect, and the database was unchanged
afterwards: four fixtures and 955 deliveries before and after.

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5].
'@ | Set-Content -Path database\seeds\invalid\README.md -Encoding utf8
