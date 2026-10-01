# Analytics Query

Two operations answer questions about the statistics the platform already publishes.

| Operation                                 | Takes                         | Use                           |
| ----------------------------------------- | ----------------------------- | ----------------------------- |
| `POST /api/v1/natural-language-queries`   | a question in words           | the reader-facing surface     |
| `POST /api/v1/query-definitions/evaluate` | a structured query definition | a caller that has one already |

The first translates the question into a definition and then evaluates it exactly as the second
does, so everything below about outcomes, name resolution and results applies to both. Neither
requires authentication.

## Query definition evaluation

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

## The definition request body

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

## Evaluation failure responses

| Status | Condition                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------- |
| `400`  | The body is not valid JSON (`INVALID_JSON`).                                                        |
| `413`  | The body exceeds 1 MB (`PAYLOAD_TOO_LARGE`).                                                        |
| `422`  | The body does not satisfy the query-definition contract (`VALIDATION_FAILED`).                      |
| `503`  | A database statement exceeded its bound (`DATABASE_STATEMENT_TIMEOUT`); the request may be retried. |

## Natural-language questions

`POST /api/v1/natural-language-queries` answers a question written in words.

```json
{ "question": "Who scored the most runs in the 2026 Indian Premier League season?" }
```

The question is translated into a query definition by a server-side adapter, and that definition is
evaluated exactly as the operation above evaluates one. The response carries the question as it was
understood, the model that read it, and the evaluation:

```json
{
  "data": {
    "question": "Who scored the most runs in the 2026 Indian Premier League season?",
    "model": "claude-haiku-4-5-20251001",
    "evaluation": { "outcome": "answered", "definition": { "kind": "leaderboard" } }
  }
}
```

`evaluation.definition` is what the question was read as, so an interface may show its
interpretation without asking a second time. Token counts are not returned: they are operator
metering data, so they are recorded in the server logs instead.

This is not the analyst-defined statistic engine. The question selects among published results; it
never defines a calculation, and nothing is stored.

### What the model may and may not do

The model may only produce a query definition that satisfies the shared contract. The adapter
validates its output against that contract, so output the contract rejects becomes
`422 QUERY_NOT_UNDERSTOOD` and never an answer. A question the published statistics cannot answer
must be returned as the `unsupported` kind, which is a `200` naming the reason.

The question is data and never an instruction. It is framed as such for the model, and nothing
derived from it reaches the database except as a bound parameter of an existing parameterised read.
A question that asks the model to disregard its instructions must be answered as `unsupported` with
the reason `outside_cricket_statistics`.

`scripts/evaluate-natural-language-queries.mjs` runs a fixed set of questions against the configured
provider and writes a dated record under `evidence/validation/`. It covers each supported kind, each
unpublished dimension, an unqualified name, and prompt-injection attempts. It is run by hand, because
every run spends money against the ADR-017 monthly limit:

```bash
npm run evaluate:natural-language-queries
```

### Limits

The operation is anonymous and every admitted request calls a paid provider, so the limits are its
protection rather than a convenience.

| Limit                    | Default        | Variable                          |
| ------------------------ | -------------- | --------------------------------- |
| Per client, per minute   | 10             | `NL_QUERY_RATE_LIMIT_PER_MINUTE`  |
| Per client, per UTC day  | 100            | `NL_QUERY_DAILY_QUOTA_PER_CLIENT` |
| All clients, per UTC day | 300            | `NL_QUERY_GLOBAL_DAILY_LIMIT`     |
| Question length          | 300 characters | not configurable                  |

The per-client limits are generous because a campus or a mobile network can put many readers behind
one address. The limits are not independent: one client may consume at most its own daily quota of
the global cap, so a few busy clients can exhaust the day. That is deliberate at this spending level.

Every limit counts **attempts**, not successes, and the count is taken after the question is
validated and before the provider is called. An invalid question therefore costs nothing, and a
request that fails after admission still spends one attempt — which is the cost of a budget that
cannot be bypassed by failing on purpose.

Every counter is held in PostgreSQL rather than in process memory, so a restart or a second replica
cannot hand out a fresh allowance, and all of them fail closed: if a counter cannot be read the
request is refused with `503` rather than admitted unmetered.

A client is identified by a salted SHA-256 digest of its address and never by the address. The salt
is generated by the database, one per UTC date, so it exists in no configuration file or deployment
template and a client cannot be followed from one day to the next. **No raw IP address is stored.**

### How the client address is determined

`request.ip` is derived from `X-Forwarded-For` using `TRUSTED_PROXY_HOP_COUNT`, which names how many
proxy hops in front of the application may be trusted and is counted **from the right** of the
header. Azure Container Apps ingress appends the caller's address to anything the caller sent, so the
rightmost entry is the one the platform added and `1` is correct there. Entries further left are
caller-supplied and are ignored.

The hop count must never exceed the number of proxies actually in front of the application. Setting
it to `true`-like "trust everything" would make Express take the leftmost entry, which the caller
controls, and the per-client limits could then be bypassed by sending a header. The default of `0`
trusts nothing and uses the socket address, which is right locally and safe-but-wrong in a
misconfigured deployment: every visitor then shares one bucket, so the limits bind too tightly rather
than not at all.

That Container Apps appends rather than replaces `X-Forwarded-For` is an assumption about the
platform, recorded here because the verification below is what confirms it.

### Post-deployment verification

A wrong hop count does not fail a deploy and does not show up in a log; it quietly puts every visitor
in one bucket. So after any deployment that changes `TRUSTED_PROXY_HOP_COUNT` or the ingress in front
of the API, confirm that two clients are counted separately:

1. From one network, send a question and record `RateLimit-Remaining` from the response.
2. Send a second question from the **same** network. `RateLimit-Remaining` must decrease by one.
3. From a **different** network — a mobile connection rather than the same office or campus
   wifi — send a question. Its `RateLimit-Remaining` must be the first value again, not a
   continuation of the first network's count.

```bash
curl -si -X POST "$API/api/v1/natural-language-queries" \
  -H 'Content-Type: application/json' \
  -d '{"question":"Who scored the most runs in the Indian Premier League?"}' \
  | grep -i 'ratelimit-remaining'
```

If the third value continues the first network's count, every visitor is sharing one bucket: the hop
count is too low, or the ingress is not sending the header. If it is far higher than expected, or two
requests from the same network do not decrease it, the count may be too high and reaching into
caller-supplied entries, which means the limits can be bypassed.

### Natural-language failure responses

| Status | Condition                                                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | The body is not valid JSON (`INVALID_JSON`).                                                                                                                                                                              |
| `413`  | The body exceeds 1 MB (`PAYLOAD_TOO_LARGE`).                                                                                                                                                                              |
| `422`  | The question is missing, empty or longer than 300 characters (`VALIDATION_FAILED`), or the model's output does not satisfy the query-definition contract (`QUERY_NOT_UNDERSTOOD`).                                        |
| `429`  | A per-client limit (`RATE_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`) or the global daily cap (`GLOBAL_DAILY_LIMIT_REACHED`).                                                                                                      |
| `503`  | The provider is unconfigured, unreachable or too slow (`QUERY_SERVICE_UNAVAILABLE`); the limiter could not be read (`RATE_LIMIT_UNAVAILABLE`); or a database statement exceeded its bound (`DATABASE_STATEMENT_TIMEOUT`). |

The per-minute limit sends the `RateLimit-*` headers and `Retry-After`. The daily quota sends the
`RateLimit-*` and `X-Quota-*` headers. The global cap sends `Retry-After` alone, because the limit it
reports is not the caller's own allowance and reporting it as one would tell a client it is exhausted
when it is not. All of these headers are exposed to browsers by the existing CORS configuration.

### What is logged

One line per request records the outcome, the definition kind, the definition version, the model, the
token counts and the elapsed time. The question text and the model's raw output are never written, at
any level: the question is the reader's own words, it already reaches a third party, and a log is the
one place it would be retained. The client hash is not logged either, because nothing in a log needs
it.

## Related reading

- [Shared Contracts](contracts.md) — the query-definition contract this operation validates against.
- [Participant Aggregates](../statistics/participant-aggregates.md) — the published figures a
  participant question is answered from.
- [API Overview](overview.md) — the complete implemented endpoint surface.

## AI Declaration

This page was drafted with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue
#813. The natural-language query endpoint, its limits and the post-deployment verification were
documented with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue #815.
