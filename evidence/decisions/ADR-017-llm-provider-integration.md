# ADR-017: Anthropic Claude Haiku 4.5 behind a server-side adapter for natural-language queries

- **Status:** Accepted, pending PR review
- **Date:** 2026-09-30
- **Participants:** Ben Swartz
- **Related issues:** [#814](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/814),
  [#811](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/811),
  [#868](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/868)

## Context

Issue #811 defined the analytics query-definition contract: a closed Zod schema that a reader's
question must be translated into before the platform will answer it. The contract is the security
boundary, not the translator, and the translator is what this record selects.

The platform needs a language model only to perform that translation. It does not need one to
compute anything: a validated definition is answered from the statistics the platform already
publishes, by existing hand-written code. The model therefore sees a schema description and a
question, and never a delivery, a fixture, an identifier or a SQL statement.

The project already integrates one external provider, Open-Meteo, behind a hand-written adapter
(ADR-008). That decision established the pattern this one follows: the provider is an internal
implementation detail of the backend, the frontend never calls it, and the backend owns every
`GET /api/v1/*` route.

## Decision

The project uses **Anthropic's Messages API** with **Claude Haiku 4.5**
(`claude-haiku-4-5-20251001`), called from `apps/backend/src/modules/analytics-query/llm.client.ts`.

Schema conformance uses the provider's **native structured outputs**: the request carries
`output_config.format` with `type: "json_schema"` and the JSON Schema projection of the #811
contract, and the constrained JSON arrives as the text of a text content block. Structured outputs
is generally available and lists `claude-haiku-4-5-20251001` among its supported models.

**Forced tool use is the recorded fallback and is deliberately not built.** If a future request ever
rejects `output_config.format`, the equivalent is a single tool whose `input_schema` is the same
JSON Schema, selected with `tool_choice: {"type": "tool", "name": ...}` and marked `strict: true`,
reading the definition from that block's `input`. That path requires declaring a tool the backend
never executes, so it is a workaround for a gap that no longer exists; recording it costs nothing
and building it now would double the surface under test.

### What is sent

Exactly five request fields, asserted by a test that fails if a sixth appears:

| Field           | Content                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`         | The configured identifier.                                                                                                                                   |
| `max_tokens`    | `512`, a module constant. A definition is well under a hundred tokens.                                                                                       |
| `system`        | `ANALYTICS_QUERY_PROMPT_DESCRIPTION` from the #811 contract, plus a fixed sentence framing the next message as data.                                         |
| `messages`      | One user turn: the reader's question between `<question>` and `</question>`, preceded since #868 by the caller's earlier turns in a `<prior-context>` block. |
| `output_config` | The JSON Schema projection of the contract.                                                                                                                  |

No identifier, column, table name or statement is sent. The schema description does use domain
vocabulary, because it has to explain what a season or a metric is, and a test distinguishes that
from database content by rejecting column- and statement-shaped tokens rather than domain words.

### What issue #868 added to that

**Earlier turns.** A caller may send up to five previous turns, each an earlier question and the
definition it was read as. They are rendered as one `<prior-context>` block inside the _same_ single
user turn, oldest first, with the current question last. Three choices there are load-bearing:

- quoting them in the reader's own turn rather than replaying them as `assistant` messages means
  nothing in the history can read as the model's own prior commitment;
- putting the current question last means a forged closing tag inside an earlier question can only
  end its own block, never make earlier content read as the current question; and
- serialising the _parsed_ definition means the caller's bytes never reach the prompt, so no stray
  key, comment, duplicate key or alternative encoding survives the round trip.

The turns are the same class of input as the question — reader-authored text, already bounded at 300
characters — and the system prompt's existing framing was extended to cover them rather than a
second, weaker framing being invented. A definition in a turn is not reader text at all: it has
already passed `analyticsQueryDefinitionSchema`, so every value is an enum member, a bounded integer,
or a name hint with control and formatting code points rejected.

**No new field and no new output bound.** The request still carries exactly the five fields above,
because the history is part of the user turn, and `max_tokens` stays `512`: history grows the input
and never the output. A test asserts both with a full five-turn conversation.

**One configured value.** The default competition name reaches the system prompt. It is the only
thing the adapter adds that is neither the contract nor fixed text, and a test strips it alongside
the contract description when asserting that the adapter contributes no data of its own.

**Still no cricket data, the turns included.** The turns come from the request body, never from an
evaluation, so the adapter never sees a result or a resolved identifier to send. A test runs the
forbidden-token list over a request built with a maximum-length conversation.

### Two validation steps, both required

The JSON Schema constrains shape only. The provider documents several keywords as unsupported in a
constrained schema, and rejects a schema carrying them before the request runs: `minLength`,
`maxLength`, `pattern`, `minimum`, `maximum`, and array bounds beyond `minItems: 0|1`. The
following parts of the #811 contract therefore cannot be expressed in the JSON Schema at all:

- a name is 1 to 100 characters and carries no control characters;
- `limit` is between 1 and 50;
- `participants` holds exactly two references; and
- the scope-to-reference rule, which is a cross-field refinement.

The adapter therefore parses every response with `analyticsQueryDefinitionSchema` as well.
**A definition that satisfies the JSON Schema is not yet trusted.** Anything failing either step
raises the invalid-output error and no definition is returned.

The JSON Schema is written by hand in `analytics-query.json-schema.ts` rather than generated. A
generator emits the unsupported keywords, so a generated schema would need post-processing and would
turn a future contract change into a runtime rejection rather than a build failure; `zod/v4`'s own
converter additionally cannot read the #811 schemas, which are written against Zod 3's classic API.
Every value that could drift is read off the contract instead of restated, and a test holds the
property names and required sets against the contract's own shapes.

### Configuration and spending control

A dedicated Anthropic Console **workspace for this project, with a $10 monthly spend limit**, and an
API key scoped to that workspace. The limit is the control: it caps the blast radius of a loop, a
leaked key or a load test at $10 rather than at the account balance.

| Variable                       | Default                     | Notes                                                                                                                                                                                                     |
| ------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LLM_API_KEY`                  | none                        | Server-only. Optional in every environment. Format deliberately unvalidated.                                                                                                                              |
| `LLM_MODEL`                    | `claude-haiku-4-5-20251001` | Character-set bounded, because it reaches the request body.                                                                                                                                               |
| `LLM_TIMEOUT_MS`               | `15000`                     | 2000 to 60000.                                                                                                                                                                                            |
| `NL_QUERY_DEFAULT_COMPETITION` | `Indian Premier League`     | Issue #868. Validated by the contract's own name rule, so a configured default cannot be one a definition would reject. A Bicep parameter with this default, so no required template parameter was added. |

The key is held in Key Vault as `backend-llm-api-key`, following the vault's convention of naming a
secret for the service that owns it, and reaches the runtime through `secretRef` exactly as
`DATABASE_URL` and `SUPABASE_SECRET_KEY` do. Inside the Container App it is aliased as the
`llm-api-key` secret; that alias is local to the app and is not required to match the vault name,
which is why `database-url` and `supabase-secret-key` sit beside `backend-database-url` and
`backend-supabase-secret-key`. CI receives only the versionless reference URI.
`scripts/check-frontend-bundle-secrets.mjs` rejects both the variable name and the provider's key
shape in a frontend bundle.

`LLM_TIMEOUT_MS` defaults to 15000 rather than the 5000 the weather adapter uses, because the first
request carrying a new response schema pays a one-time schema-compilation cost that a warm request
does not. With exactly one retry, the worst case stays near thirty seconds.

### Failure handling

One retry, never two, and only on a failure that retrying can fix: a timeout, `408`, `429`, or any
`5xx`, which includes the provider's `529` overloaded status. The typed errors map so a later
endpoint can answer correctly without inspecting the provider:

| Error                   | Raised when                                                                                | Later endpoint       |
| ----------------------- | ------------------------------------------------------------------------------------------ | -------------------- |
| `LlmNotConfiguredError` | No key configured. The provider is not called.                                             | Feature unavailable  |
| `LlmTimeoutError`       | Neither attempt completed inside the bound.                                                | `503`, retryable     |
| `LlmUpstreamError`      | Non-OK status, unparseable body, or a response that is not a Messages API response.        | `503`, retryable     |
| `LlmInvalidOutputError` | A refusal, a truncated response, non-JSON text, or a definition failing the #811 contract. | `422`, not retryable |

The split is deliberate: an envelope problem is the provider failing transport and may succeed on
retry, while a content problem is the model failing the contract and would fail again.

## Alternatives considered

Prices are per million tokens, input/output, **verified against each provider's own pricing page on
30 September 2026**.

### What a question costs after issue #868

The figures below were measured against the prompt as it stands: the contract description is 6,690
characters, the constrained schema about 2,300 serialised, and the framing about 150 tokens —
roughly **2,550 input tokens** for a question carrying no history. The original "about 2,000"
predates the issue #851 prompt additions.

| Request                                               | Input  | Output | Cost     |
| ----------------------------------------------------- | ------ | ------ | -------- |
| No conversation                                       | ~2,670 | ~155   | ~$0.0035 |
| Two turns, ordinary questions                         | ~2,990 | ~165   | ~$0.0037 |
| Five turns, 300-character questions, comparison turns | ~3,570 | ~170   | ~$0.0044 |

A turn is roughly 150 tokens at its worst — a 300-character question, a ~200-character definition and
about 90 characters of delimiters — so five turns add about 900.

`max_tokens` stays `512` and `LLM_TIMEOUT_MS` stays `15000`. History grows the input, not the output,
and 900 extra input tokens is well under a second of prefill; the timeout exists for schema
compilation and hung connections, neither of which this touches.

**The workspace limit remains the binding control, and this narrows the margin.** At $0.0044 the $10
monthly limit is about 2,270 questions, down from about 3,000. `NL_QUERY_GLOBAL_DAILY_LIMIT` of 300 a
day already permits 9,000 a month, which is roughly $40 — so the daily cap has never been what keeps
spend inside $10, and this issue does not change that. It does mean the two are closer together than
they were. No limit is changed here; the point of recording it is that lowering the global cap is the
lever if the workspace limit is ever reached.

Prompt caching was considered and rejected: the stable prefix only just clears Haiku's minimum
cacheable length, requests are sporadic against a five-minute TTL, and it is outside this issue.

### Claude Haiku 4.5 — $1 / $5 (selected)

Native structured outputs are generally available and explicitly support this model id. An existing
team member's Anthropic account removes payment and account-setup risk, which at this point in the
project is a schedule risk rather than a cost one. At roughly 2,000 input and 150 output tokens a
question, one question costs about **$0.00275**, so the $10 workspace limit is roughly 3,600
questions a month: far beyond any demonstration or marking load.

### Gemini 3.1 Flash-Lite — $0.25 / $1.50

Cheaper, and capable of constrained JSON output. Rejected on account and integration risk rather
than capability: it would need a new Google Cloud project, billing setup and a second credential
path, for a saving of roughly $0.002 per question against a $10 ceiling that is already not the
binding constraint.

### OpenAI GPT-5 Nano — $0.05 / $0.40

The cheapest candidate. Rejected for the same reason as Gemini, with the same conclusion: cost is
not the constraint this decision is trading against.

### Gemini 2.5 Flash — excluded from the comparison

Google's model-versions documentation states that access to 2.5 models is being limited to users who
have actively used them, and recommends newer models for new projects. A new project adopting it
would be starting on a family Google is steering new work away from.

An earlier draft of this comparison recorded a scheduled 16 October 2026 deprecation for this model.
That claim came from a third-party source and is **wrong**: Google's own deprecations page records
"No shutdown date announced" for `gemini-2.5-flash`. The October 2026 date belongs to
`gemini-2.5-flash-image`, a different model. The claim is recorded here as corrected rather than
quietly removed, so the same third-party figure is not reintroduced later.

### The official Anthropic SDK instead of `fetch`

Rejected, consistent with ADR-008. The repository already isolates external providers behind
hand-written adapters, and `weather.service.ts` supplies the pattern this adapter follows. The SDK
defaults to two retries where this issue requires exactly one, and its schema-parsing helper would
not remove the Zod step, because the contract's bounds and refinement must be validated regardless.
Adding a dependency to buy a helper the design then bypasses is not worth it against the
repository's dependency-hygiene gates.

## Advantages

- The contract, not the provider, decides what the platform will act on. A model that returns
  something else produces a typed error, not a query.
- Nothing about the platform's data is disclosed to translate a question.
- The provider is one configuration change away from being replaced: the model identifier is an
  environment variable and no sampling parameter is sent.
- Spend is capped by the workspace limit rather than by trusting the code to behave.
- The cost is negligible at project scale and measurable per question.

## Disadvantages

- **The reader's question text leaves our infrastructure** and is processed by Anthropic. That is
  the substantive privacy consequence of this decision, recorded in full below.
- **Claude Haiku 4.5's retirement commitment is "not sooner than 15 October 2026"**, which is
  before the 19–23 October 2026 presentation window. The commitment is a floor rather than a
  scheduled retirement, which is a real difference from a published shutdown date, but it is close
  enough to the window that it must not be discovered during the demonstration. Mitigation is
  recorded under Consequences.
- Structured outputs do not guarantee the capitalisation of `enum` and `const` string values. Every
  #811 enum value is lowercase, and the adapter **fails closed**: a differently cased value fails
  the Zod parse and raises the invalid-output error rather than being normalised, because a name
  hint must stay case-sensitive and selective normalisation would be fragile. A test covers this.
- Translation is non-deterministic in a platform that is otherwise reproducible. A question may
  translate differently on two occasions. Only the contract bounds that variation.
- The first request after a deploy, or after 24 hours idle, is slower than the rest because of
  schema compilation.

## Consequences

- **Data handling.** The question a reader types is sent to Anthropic, and **since issue #868 so are
  the earlier questions and definitions a caller sends with it**: a follow-up re-sends up to five
  previous turns on every request. A definition is a structure this backend validated rather than
  text the reader wrote, but an earlier question is the reader's own words exactly as the current one
  is, so the same disclosure covers both and the privacy notice says so. No cricket data, credential,
  identifier or account detail accompanies any of it, and nothing is sent about who asked. Any user-facing
  surface built on this in issue #816 must say that a question is processed by a third party before
  a reader submits one, and the privacy notice must be updated to match. That is a prerequisite of
  the user-facing work, not of this adapter.
- **Model change is configuration, not code.** The adapter sends **no `temperature`, no `top_p`, no
  `top_k`, no `thinking` and no `output_config.effort`**, and a test asserts their absence. This is
  not an oversight: `temperature` is rejected outright by the current Opus-class and Sonnet-class
  models, and `effort` is not supported on Haiku 4.5, so sending either would tie `LLM_MODEL` to one
  model family. Determinism comes from the constrained schema instead of from sampling parameters.
- **Named fallback model.** If Haiku 4.5 is retired, or the presentation window makes its retirement
  floor an unacceptable risk, the replacement is **Claude Sonnet 5.5** (`claude-sonnet-5-5`, **$2 /
  $10** per million tokens, retirement not sooner than 28 September 2027), verified against the
  Anthropic models overview on 30 September 2026. It supports structured outputs. Switching is
  setting `LLM_MODEL`; no code change is required. The cost per question would rise from about
  $0.00275 to about $0.0055, which the $10 limit still absorbs comfortably.
- **Spending limit is an operational commitment.** The $10 workspace limit and the workspace-scoped
  key must exist before the feature is enabled in a deployed environment. If the limit is raised or
  the key is issued outside that workspace, this record no longer describes the deployment.
- **A missing key disables this feature and nothing else.** `LLM_API_KEY` is optional in every
  environment, production included. Natural-language querying is one optional capability, so an
  absent key must not stop the backend from serving the published reads, the submission workflow or
  anything else. When it is absent the adapter raises `LlmNotConfiguredError`, which issue #815 maps
  to `503`, and `warnAboutOptionalConfiguration` logs one startup warning naming the variable and no
  value. An earlier draft of this record required the key in production; that was rejected, because
  making the whole API refuse to start over an optional feature trades a large outage for a small
  one. The deployment still supplies the key: the `backend-llm-api-key` Key Vault secret must exist
  before the template deploys, and the deployment workflow fails without its reference URI, so a
  deployment cannot reach production having silently forgotten it.
- **No endpoint, route or interface is added by this decision.** Issue #815 adds the endpoint that
  executes a validated definition and #816 the interface. Until then the adapter is unreachable from
  outside the backend.

## Verification and review date

Verified for issue #814 by unit tests with a stubbed `fetch` covering success, timeout, a retryable
`5xx` followed by success, two retryable failures, five non-retryable statuses, a malformed body, a
response with no text content, non-JSON text, a definition failing the contract, a differently cased
enum value, a refusal, a truncated response, and the unconfigured case. Further tests assert the
request body: the endpoint and headers, the system prompt built from the contract description, the
delimited question, the constrained schema, the absence of `temperature` and `effort`, the
`max_tokens` bound, the exact field set, and the absence of database content. **No test calls the
provider**, and no real key exists in the repository or in any test.

The JSON Schema is verified against the contract by Ajv: every valid definition it admits also
satisfies `analyticsQueryDefinitionSchema`, every object is closed, no unsupported keyword appears,
and the branch order, property names and required sets are read off the contract's own shapes.

Environment tests confirm that the backend loads without the key in a production configuration as
well as a development one, that a blank value counts as absent, that the model identifier and the
timeout are bounded, and that the startup warning fires exactly once when the key is missing, names
only the variable, and never carries the configured value.

`scripts/check-frontend-bundle-secrets.mjs` was run against a fresh production frontend build and
reported no findings, and both new patterns were confirmed to detect a planted leak.

**Review by 15 October 2026**, the earliest date on Claude Haiku 4.5's retirement commitment and
immediately before the presentation window. The review is to confirm the model is still served and,
if it is not, to set `LLM_MODEL` to the named fallback.

## AI Declaration

This record was drafted with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue
#814. The conversational-request section, the per-question cost figures and the data-handling
consequence were added with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue
#868; the token counts were measured from the prompt in the repository and priced at the Claude Haiku
4.5 rates already recorded here, not re-verified against the provider's pricing page. The candidate prices, the supported-model list for structured outputs, the Claude Haiku 4.5
retirement commitment and the Claude Sonnet 5.5 fallback figures were each verified against the
providers' own documentation pages on 30 September 2026, and the corrected Gemini 2.5 Flash
statement replaces an unverifiable third-party claim.
