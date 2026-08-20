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

`apps/backend/tests/database/reference-fixture.database.test.ts` submits each
committed example inside an isolated database savepoint. The automated test
requires a descriptive rejection and verifies that no partial fixture remains.
Run it with `npm run test:database` from the repository root.

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5]
and reviewed and edited with the assistance of Codex[GPT-5].
