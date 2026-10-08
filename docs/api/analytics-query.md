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

**A name that finds nothing falls back to its surname.** Translation is asked for scorecard names, so
the first search usually succeeds; the fallback is for when it does not, because `Virat Kohli`
searched whole matches nothing where the scorecard says `V Kohli`. It is the same parameterised read
with the last word of the name bound instead, so no SQL is added, and it runs only on the path that
would otherwise have reported `entity_not_found`.

The fallback may suggest but never decide. A surname matching one player whose leading initial agrees
with the hint resolves — `Virat Kohli` to `V Kohli`. One whose initial disagrees is reported as
`entity_ambiguous` with that single candidate, so `Suresh Kohli` asks "did you mean V Kohli" rather
than answering with a different player's figures or dead-ending. A crowded surname is reported
ambiguous with candidates as any other crowded match is.

The comparison is the leading initial and nothing more, which errs toward asking: a scorecard that
orders initials differently from the spoken name, `KD Karthik` against `Dinesh Karthik`, also asks.
One extra confirmation is the accepted price for never answering as somebody else. A single-token
name and a surname under three characters skip the fallback entirely — the first search already was
that token, and `%K%` would match most of the corpus.

`candidates` carries one to five entries, each an identifier and a display name. A single candidate
is the surname fallback asking for confirmation, as above. **Two candidates
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

### Suggestions

A question the platform cannot answer exactly may come back with up to three
questions it can answer:

```json
{
  "data": {
    "question": "Who is the best batter in the IPL?",
    "model": "claude-haiku-4-5-20251001",
    "evaluation": { "outcome": "unsupported", "reason": "ambiguous" },
    "suggestions": [
      {
        "kind": "leaderboard",
        "metric": "most_runs",
        "scope": "competition",
        "competition": { "name": "Indian Premier League" },
        "limit": 10
      }
    ]
  }
}
```

Each suggestion is a query definition that has **already passed the
query-definition contract**, so a client may offer it without validating it again,
and none that failed validation is ever returned. A suggestion is never the
`unsupported` kind: it is shown as something to ask.

**A suggestion is answered by posting it to
`POST /api/v1/query-definitions/evaluate`.** That makes no language-model call and
is not counted against the limits below, so following a suggestion costs a reader
nothing.

**Suggestions carry no label.** A client words one from the definition itself, so
the wording cannot disagree with what it describes. They sit beside the definition
rather than inside it, because `definitionVersion` is a digest of the definition
alone: a suggestion within it would make the same question carry different versions
whenever a different suggestion was offered. For the same reason, adding them did
not change the definition shape and `QUERY_DEFINITION_VERSION` remains `1.0`.

The field is absent rather than empty when nothing was suggested. When the model's
own output could not be used at all — the `422 QUERY_NOT_UNDERSTOOD` case — there
is nothing to suggest, because the output that would have carried a suggestion is
what failed; an interface should fall back to its own examples.

### Scoped answers

The published participant-aggregates endpoint accepts no competition or season
filter, so a season- or competition-scoped question is answered with the player's
entire aggregate and `sources[].statisticIds` names the row that answers it. One
player's season aggregate can carry **more than sixty rows across twenty-odd
competitions**.

A client must therefore narrow the result to the rows `statisticIds` points at. It
is not enough to hand the whole aggregate to a player-page component: those open on
a career view, so a season row stays hidden behind a tab and the reader sees "no
career totals" for a question that was answered correctly.

An empty `statisticIds` for a participant question means nothing is published at
that scope, which is an answer rather than an error.

### Follow-up questions

A question may carry up to five earlier turns, oldest first, so that a follow-up resolves against
what was already asked:

```json
{
  "question": "What about his strike rate?",
  "conversation": [
    {
      "question": "What are V Kohli's career statistics?",
      "definition": {
        "kind": "participant_statistics",
        "participant": { "name": "V Kohli" },
        "scope": "career"
      }
    }
  ]
}
```

Each turn is the question that was asked and the definition it was read as; take the definition from
that turn's own `evaluation.definition`. `conversation` is optional, so a client that keeps no
history — the home-page widget — sends only `question`.

Both halves are the existing contracts rather than looser copies. An earlier question obeys the same
300-character rule as the current one, because it is the same kind of thing: text the reader wrote.
An earlier definition must satisfy the whole query-definition contract.

**One invalid turn fails the whole request** with `422 VALIDATION_FAILED`, naming the turn and the
field, rather than being dropped: a conversation read from a partially-rejected history would answer
a question nobody asked. The body is validated before the limiter and before the provider, so a
rejected history spends nothing.

The turns reach the provider as clearly delimited prior context inside the same user turn, oldest
first, with the current question last. They are framed as data on exactly the terms the question
already is, and nothing is added to them: no cricket data, no result and no resolved identifier,
because the turns come from the request body and never from an evaluation. ADR-017 records this as
part of what is sent.

The five-turn bound is a cost bound. Every turn is re-sent on every question, so an unbounded history
would make one conversation arbitrarily expensive against the ADR-017 limit.

### The default competition

A question that needs a competition and names none is read against a configured default
(`NL_QUERY_DEFAULT_COMPETITION`, default `Indian Premier League`). The response then says so:

```json
{
  "data": {
    "question": "Who has the most sixes?",
    "model": "claude-haiku-4-5-20251001",
    "evaluation": {
      "outcome": "answered",
      "definition": {
        "kind": "leaderboard",
        "metric": "most_sixes",
        "scope": "competition",
        "competition": { "name": "Indian Premier League" }
      }
    },
    "assumptions": ["competition"]
  }
}
```

`assumptions` names the reference the reader did not supply; the name itself is in the definition,
because that is what was queried. A client should mark such an answer as assumed — the home-page
widget says "You did not say which competition, so this assumes Indian Premier League" — because
otherwise the reader is shown an answer to a narrower question than they asked.

The field is absent when the reader named everything themselves, and the definition is unaffected
either way: a definition that used the default is identical to one where the reader named it, so the
same question carries the same `definitionVersion`.

**A season is never assumed.** The translation step is told the default competition but neither
today's date nor which seasons the platform holds, so an assumed season would be a guess reported as
an answer. A question that needs a season and names none — "last season", "this year" — comes back
`unsupported` with the reason `ambiguous` and suggestions scoped to a competition already in play.
`competition` is therefore the only value `assumptions` can carry.

The default is configuration, not database content: an operator sets the name and nothing reads it
from the corpus. It is validated by the same name rule a definition applies, so a deployment cannot
configure a default that the contract would then reject.

### Casual phrasing

Casual wording for a published metric is read as that metric: "smashes the most sixes" is
`most_sixes`, "best economy" and "most economical" are `best_economy_rate`, "scores fastest" is
`highest_strike_rate`. The mapping is generated from the metric enum itself, so a metric renamed in
the contract cannot leave the guidance naming a metric that no longer exists.

A superlative that names no published measure stays a refusal with something to ask instead: "who is
the best batter", "the GOAT", "the most dangerous batter" are `unsupported` with the reason
`ambiguous` and up to three concrete suggestions.

### Limits

The operation is anonymous and every admitted request calls a paid provider, so the limits are its
protection rather than a convenience.

| Limit                    | Default        | Variable                          |
| ------------------------ | -------------- | --------------------------------- |
| Per client, per minute   | 10             | `NL_QUERY_RATE_LIMIT_PER_MINUTE`  |
| Per client, per UTC day  | 100            | `NL_QUERY_DAILY_QUOTA_PER_CLIENT` |
| All clients, per UTC day | 300            | `NL_QUERY_GLOBAL_DAILY_LIMIT`     |
| Question length          | 300 characters | not configurable                  |
| Conversation turns       | 5              | not configurable                  |

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

### What a question costs

The provider is paid per token, so the feature has a running cost and a hard ceiling. Both are
recorded in full in [ADR-017](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-017-llm-provider-integration.md){ target="_blank" rel="noopener" };
the figures below are the operational summary.

Claude Haiku 4.5 is billed at $1 per million input tokens and $5 per million output tokens. Almost
all of the input is fixed overhead rather than the reader's question: the contract description is
about 3,310 tokens, the constrained schema about 700 and the framing about 200.

| Request                                               | Input  | Output | Cost     |
| ----------------------------------------------------- | ------ | ------ | -------- |
| A question with no conversation                       | ~4,210 | ~160   | ~$0.0050 |
| Two turns, ordinary questions                         | ~4,570 | ~165   | ~$0.0054 |
| Five turns, 300-character questions, comparison turns | ~5,110 | ~170   | ~$0.0060 |

A turn is roughly 150 tokens at its worst, so a full five-turn history adds about 900 — less than the
fixed prompt, which is paid on every request whether a conversation is sent or not.

**Following a suggestion costs nothing.** A suggestion is answered by posting it to
`POST /api/v1/query-definitions/evaluate`, which makes no provider call at all.

#### The $10 workspace limit

The provider account is a **dedicated Anthropic Console workspace for this project with a $10
monthly spend limit**, and the API key is scoped to that workspace. The limit is the control rather
than a budget estimate: it caps the blast radius of a loop, a leaked key or a load test at $10
instead of at the account balance.

At about $0.0060 a question that ceiling is roughly **1,670 questions a month**.

**The per-day limits are not what keeps spend inside $10.** `NL_QUERY_GLOBAL_DAILY_LIMIT` of 300 a
day permits 9,000 questions a month, which is roughly $54. The daily cap exists to stop a single day
exhausting the month, not to enforce the budget. If the workspace limit is ever reached, the levers
in order are lowering the global daily cap and trimming the prompt — the prompt is the larger cost
and the one paid on every request.

The $10 limit and the workspace-scoped key are an operational commitment: both must exist before the
feature is enabled in a deployed environment. A key issued outside that workspace, or a raised limit,
means ADR-017 no longer describes the deployment.

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
token counts, the elapsed time, how many conversation turns were sent and what was assumed. The
question text and the model's raw output are never written, at any level: the question is the
reader's own words, it already reaches a third party, and a log is the one place it would be
retained. The same holds for the earlier turns — a count is recorded, never their text. The client
hash is not logged either, because nothing in a log needs it.

## Known limitations

These are current, accepted limitations rather than defects awaiting a fix. Each is a consequence of
a decision recorded above or in ADR-017.

**A follow-up resolves only against what an earlier _question_ named.** The model never sees an
answer. Only the earlier questions and the definitions they were read as are sent, because no
database content and no evaluation result reaches the provider — that is the privacy property the
whole design is built on, not an oversight. So "What about his strike rate?" resolves after "What are
V Kohli's career statistics?", because that turn's definition names the player. It cannot resolve
after "Who scored the most runs in the 2024 Indian Premier League season?": that definition names a
metric, a scope and a season, and the player the pronoun refers to exists only in the answer, which
the model never reads. A follow-up of that kind comes back `unsupported` or resolves against the
wrong thing, and a client should expect the reader to name the player again.

**The home-page widget sends no conversation.** It answers one question at a time, each answer
replacing the last, so follow-ups are available to API callers and are not exercised by the
reader-facing surface. A client that wants them has to keep the history itself and send it on each
request.

**Suggestion generation varies between runs.** Suggestions come from the same non-deterministic
translation step as the definition, so the same refused question can come back with three
suggestions, with one, or with none. The field is absent rather than empty when nothing was
suggested. The evaluation runs demonstrate the spread directly: between two runs twenty-one minutes
apart, one refusal went from no suggestions to two, another from two to none. A client must therefore
render a refusal that carries nothing to ask instead, rather than assuming a suggestion will always
be there.

**A season is never assumed.** The translation step is told the default competition but neither
today's date nor which seasons the platform holds, so an assumed season would be a guess presented as
an answer. "Last season" and "this year" come back `unsupported` with the reason `ambiguous`.
`competition` is the only value `assumptions` can carry.

**Translation is not deterministic.** The same question may be read differently on two occasions. The
query-definition contract bounds what the variation can be — an invalid reading is rejected rather
than answered — but it does not make the reading stable. Nothing downstream of the translation is
affected: an identical definition always produces an identical `definitionVersion` and an identical
answer.

**A refused injection attempt may carry the wrong reason label.** The evaluation set's
delimiter-escape case has been refused in every run, as it must be, but is labelled `ambiguous`
rather than `outside_cricket_statistics` or `other`. The attempt fails safe — nothing is executed and
no data is disclosed — so this is a reporting inaccuracy in a refusal rather than a security finding.

**Two candidates may look identical.** 168 display names in the corpus map to more than one
participant identifier, and the published participant resource carries nothing further to tell them
apart. An interface must ask rather than guess, and cannot always make the choice meaningful to the
reader.

**A leaderboard answer carries no `statisticIds`.** The published leaderboard response contains no
statistic identifier to report, so a leaderboard is traceable only by its `endpoint` and the resolved
competition or season.

**The first question after a deploy, or after a day idle, is slower.** The provider compiles the
response schema on that request. `LLM_TIMEOUT_MS` is 15000 rather than the 5000 the weather adapter
uses for exactly this reason, and one evaluation run recorded a timeout against a case that had
passed in both earlier runs.

## Related reading

- [Shared Contracts](contracts.md) — the query-definition contract this operation validates against.
- [Participant Aggregates](../statistics/participant-aggregates.md) — the published figures a
  participant question is answered from.
- [API Overview](overview.md) — the complete implemented endpoint surface.

## AI Declaration

This page was drafted with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue
#813. The natural-language query endpoint, its limits and the post-deployment verification were
documented with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue #815. The
follow-up questions, the default competition, the casual-phrasing guidance and the surname fallback
were documented with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue #868. The
suggestions and scoped answers were documented with the assistance of
Claude-Code[Claude Opus 5 (1M context)] under issue #851. The cost summary and the known limitations
were added with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue #817; the
figures are the ones ADR-017 already records and the limitations are drawn from the evaluation runs
rather than restated from the implementation.
