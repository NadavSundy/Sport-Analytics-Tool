# Analytics Query Evaluation

`POST /api/v1/query-definitions/evaluate` answers a structured query definition from the statistics
the platform already publishes.

The operation computes nothing of its own. Each name in the definition is resolved to an identifier
through the ordinary parameterised reads, the service that already answers that question is called,
and the published resource is returned unchanged. A figure this operation returns must therefore be
the same figure the corresponding public endpoint returns, because it is produced by the same code
path. No statistic calculation is defined here.

This surface supports natural-language querying over published statistics. It is not the
analyst-defined statistic engine: it admits no expression, defines no calculation, and stores no
definition.

## Authentication

The operation requires no authentication. It returns only resources the public statistics reads
already serve anonymously, so requiring a credential would gate a view of public data behind an
account. It is mounted alongside the other public statistics reads.

## Request

The body must be a query definition as defined by the
[shared query-definition contract](contracts.md) under "Analytics query definitions". Four kinds
are
accepted: `leaderboard`, `participant_statistics`, `participant_comparison` and `unsupported`.

```json
{
  "kind": "participant_statistics",
  "participant": { "name": "BB McCullum" },
  "scope": "career"
}
```

A body that is not JSON returns `400 INVALID_JSON`. A body that parses but does not satisfy the
contract returns `422 VALIDATION_FAILED`, as the other POST operations report an invalid body. A
body exceeding 1 MB returns `413 PAYLOAD_TOO_LARGE`.

## Outcomes

Every evaluated definition is answered with `200`. A reference that resolves to nothing or to more
than one entity, and a question the published statistics cannot answer, are outcomes rather than
failures: the request was valid and the platform answered it correctly by saying so. Only an invalid
body is an error.

| `outcome`          | Meaning                                                       | Additional fields                     |
| ------------------ | ------------------------------------------------------------- | ------------------------------------- |
| `answered`         | The definition resolved and the published result is returned. | `resolved`, `sources`, `result`       |
| `entity_not_found` | A name matched no entity.                                     | `reference`, `nameHint`               |
| `entity_ambiguous` | A name matched more than one entity.                          | `reference`, `nameHint`, `candidates` |
| `unsupported`      | The definition itself declares the question unanswerable.     | `reason`                              |

Every outcome carries `definitionVersion` and the `definition` that was evaluated.

### `definitionVersion`

`definitionVersion` is a digest of the definition under a canonical serialisation, prefixed `qdv1_`.
It is deterministic: the same question must always carry the same version, and the order of keys in
the request body may not change it. A value left to the contract's default produces the same version
as the same value sent explicitly, because the digest is taken after the definition is parsed. Array
order does change it, because the order of a comparison is part of the question.

### `sources`

An answered outcome carries one `sources` entry per upstream call: one for a leaderboard or a single
participant, and two for a comparison, in the order the definition named them. Each entry carries
the published `endpoint`, query string included, and the `statisticIds` within that response that
answer the question.

**`statisticIds` is empty for a `leaderboard`.** The published leaderboard response carries no
statistic identifier of any kind, so there is none to report; a leaderboard is traced by its
`endpoint` together with the resolved `competitionId` or `seasonId`. This is a limitation of the
published leaderboard shape rather than of the evaluation.

### `result` and the published endpoints

`result` is the resource the endpoint named in `sources` returns, unmodified — the `data` payload of
that response. For a comparison it is the two resources in the order named.

The published participant-aggregates endpoint accepts no competition or season filter, so a
definition naming one season receives the whole scope level and `statisticIds` names the row that
answers the question. The result is never narrowed: a caller reading `result` sees exactly what the
public endpoint publishes.

A player with no figures at the requested scope is still `answered`, with an empty `statisticIds`.
The published response legitimately contains no such row, and that is an answer rather than an
absence of one.

A scope with nothing published is reported as `entity_not_found` against the scope reference, because
the corresponding public endpoint answers `404` for it. Evaluation may only report what the published
API would report; it must never return an empty ranking the platform never produced.

## Name resolution

A name in a definition is a hint, never an identifier. It may only reach the database as a bound
parameter of an existing parameterised read.

Resolution prefers an exact case-insensitive match, so a complete name is not made ambiguous by every
longer name containing it. Only when nothing matches exactly do partial matches decide. One match
resolves; no match is `entity_not_found`; more than one is `entity_ambiguous`.

A search reads at most 25 matches. More matches than that are reported ambiguous rather than
narrowed, because a second exact match may sit outside the page.

`candidates` carries at most five entries, each an identifier and a display name. **Two candidates
may look identical.** Many people in the corpus share a display name: observation O2 in the
[database schema](../database/schema.md) records that 168 names map to more than one player
identifier. The published participant resource carries nothing further to tell them apart, so an
interface must resolve that by asking rather than by guessing.

## Failure responses

| Status | Condition                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------- |
| `400`  | The body is not valid JSON (`INVALID_JSON`).                                                        |
| `413`  | The body exceeds 1 MB (`PAYLOAD_TOO_LARGE`).                                                        |
| `422`  | The body does not satisfy the query-definition contract (`VALIDATION_FAILED`).                      |
| `503`  | A database statement exceeded its bound (`DATABASE_STATEMENT_TIMEOUT`); the request may be retried. |

## Related reading

- [Shared Contracts](contracts.md) — the query-definition contract this operation validates against.
- [Participant Aggregates](../statistics/participant-aggregates.md) — the published figures a
  participant question is answered from.
- [API Overview](overview.md) — the complete implemented endpoint surface.

## AI Declaration

This page was drafted with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue
#813.
