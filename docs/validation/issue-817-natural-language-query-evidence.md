# Natural-Language Query Evidence

This page is the evidence summary for the natural-language query feature: what was built across
issues #811–#816, #851 and #868, how it was evaluated, and what each evaluation run caught. The
behaviour itself is documented on the [Analytics Query](../api/analytics-query.md) page, and the
provider decision in
[ADR-017](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-017-llm-provider-integration.md){ target="_blank" rel="noopener" }.

## Demonstration feedback, 6 October 2026

The feature was demonstrated on 6 October 2026, after issues #815, #816 and #851 had delivered the
endpoint, the home-page widget and the suggestions. Two observations were recorded:

- **Answers were hard to get with casual phrasing.** A question had to be worded close to the shape
  of a published metric to be answered. Ordinary wording for the same figure — "who smashes the most
  sixes", "who is the most economical bowler" — did not reliably reach the metric it names.
- **Follow-up questions were not understood.** Having asked about a player, asking a second question
  about the same player did not work: each question was translated with no knowledge of the one
  before it.

**Issue #868 was the response**, and it is what the final behaviour on this page describes. It
added:

- a casual-wording map generated from the metric enum itself, so wording for a published measure
  reaches that measure while a superlative naming no published measure stays a refusal with
  suggestions;
- conversation support — up to five earlier turns sent as delimited prior context, so a follow-up
  resolves against what an earlier question named;
- scorecard-name handling with the surname fallback, so a spoken name like "Virat Kohli" reaches the
  scorecard's `V Kohli` and a disagreeing initial asks rather than answers as somebody else; and
- the configured default competition, reported in `assumptions` so an assumed answer is never shown
  as an exact one.

The three #868 evaluation runs below are the verification of that response. The meeting record, with the disposition of each feedback
item, is retained at
[`evidence/stakeholder-meetings/2026-10-06-natural-language-query-demonstration.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/stakeholder-meetings/2026-10-06-natural-language-query-demonstration.md){ target="_blank" rel="noopener" }.
The feedback was
behavioural rather than task-scored, so it is recorded there as demonstration feedback and is not
counted as a formal user-testing task attempt under
[ADR-013](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-013-task-based-user-testing-evidence.md){ target="_blank" rel="noopener" }.

## How the feature is evaluated

Translation is not deterministic, so it cannot be verified by a unit test asserting one output. It is
evaluated instead by a fixed set of questions run against the configured provider, each case
accepting one or more defensible readings:

```bash
npm run evaluate:natural-language-queries
```

`scripts/evaluate-natural-language-queries.mjs` writes a dated record under `evidence/validation/`.
**It is run by hand, never in CI**, because every run spends money against the $10 workspace limit
recorded in ADR-017. The case definitions live in `scripts/natural-language-query-cases.mjs` and
`scripts/natural-language-conversational-cases.mjs`, and `npm run test:scripts` guards the runner and
the case set without calling the provider.

A case passes only when the returned definition matches an accepted reading. Cases that state
`expectSuggestions` must also offer something answerable, and cases that state `expectAssumptions`
must report exactly those assumptions — a question answered against the default competition without
saying so is a failure, because the reader would have been shown an answer to a narrower question
than they asked.

## Evaluation runs

| Run                                                                                                                                                                                                       | Date       | Cases | Passed | Failed |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----- | ------ | ------ |
| [#815 first](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-815-natural-language-evaluation-2026-10-01.md){ target="_blank" rel="noopener" }      | 2026-10-01 | 27    | 26     | 1      |
| [#815 second](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-815-natural-language-evaluation-2026-10-05.md){ target="_blank" rel="noopener" }     | 2026-10-05 | 36    | 35     | 1      |
| [#868 run 1](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-868-natural-language-evaluation-2026-10-07-run1.md){ target="_blank" rel="noopener" } | 2026-10-07 | 63    | 55     | 8      |
| [#868 run 2](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-868-natural-language-evaluation-2026-10-07-run2.md){ target="_blank" rel="noopener" } | 2026-10-07 | 64    | 62     | 2      |
| [#868 run 3](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-868-natural-language-evaluation-2026-10-07-run3.md){ target="_blank" rel="noopener" } | 2026-10-07 | 64    | 62     | 2      |

The three #868 runs are the ones that exercise the final behaviour: **55/63 → 62/64 → 62/64**.

### What each run caught

**#815 first run, 26/27.** Established the baseline across every supported kind, every unpublished
dimension and four prompt-injection attempts. Its one failure was the delimiter-escape injection
case, refused correctly but labelled `ambiguous` rather than `outside_cricket_statistics` or `other`.
That failure has recurred in every run since and is the one open item below.

**#815 second run, 35/36.** Added the suggestion cases from #851, the home-page widget's own example
questions and the scoped-answer cases. It confirmed that refusals come back with something to ask
instead, and that the widget's examples translate to the kinds they claim. Same single failure.

**#868 run 1, 55/63.** The first run against conversations, casual phrasing, scorecard names and the
default competition. Eight failures, which separated into four different problems:

- **Three regressions in the prompt changes.** `participant-season` returned a definition the
  contract rejected outright; the default-competition rule was filling a competition into
  season-scoped questions, so `default-no-season-assumed` and
  `default-no-season-assumed-this-year` reported an assumption where none was permitted.
- **One transient provider failure.** `unsupported-match-phase` timed out. It had passed in both
  earlier runs and passed in both later ones. The larger prompt makes a cold request slower, which is
  what `LLM_TIMEOUT_MS` and the single retry exist for.
- **Three cases whose expectations were wrong, not the behaviour.** `participant-runs-only` and
  `participant-apostrophe-name` reported `expected … got …` with identical text on both sides — the
  failure description was comparing more than it printed, so a real mismatch was indistinguishable
  from a reporting defect. `casual-biggest-hitter` expected `most_sixes` for "biggest hitter", which
  names no published measure; the wording was removed from the casual map rather than the refusal
  being treated as wrong.
- **The standing delimiter-escape label.**

This run is the reason the failure description now prints participant names, competitions and
seasons: a mismatch has to be diagnosable without paying for a second run.

**#868 run 2, 62/64.** All three regressions and the two wrong name expectations resolved. It caught
one new thing — `default-abbreviation-is-not-an-assumption`, added for this run, showed that a
question naming "the IPL" was still being reported as having assumed its competition. A reader who
names the competition in the short form everyone uses has assumed nothing. The fix was made
deterministic in the adapter rather than by adding more prompt text.

**#868 run 3, 62/64.** The abbreviation case passed. The same two-failure count is **not the same two
failures**: `default-no-season-assumed-this-year` refused correctly but offered no suggestion, where
twenty-one minutes earlier it had offered one. Comparing the two runs shows the same movement in both
directions — `unsupported-match-phase` went from no suggestions to two, and `ambiguous-name` from
none to two.

That is the clearest evidence for the limitation that suggestion generation varies between runs, and
it is why a client must render a refusal that carries nothing to ask instead.

## Standing failure

The delimiter-escape injection case has failed in all five runs. The attempt is **refused in every
run** — nothing is executed, no prompt content and no data is disclosed — but the refusal carries the
reason `ambiguous` instead of `outside_cricket_statistics` or `other`. It is a reporting inaccuracy in
a refusal rather than a security finding, and it is held as a backlog item rather than fixed under
#868 or #817.

## Automated evidence beside the evaluation

The evaluation covers the translation step only. Everything downstream of it is covered by the
ordinary suites, which do not call the provider:

- the adapter's request shape, retries, typed errors and the assertion that no database content is
  sent, with a stubbed `fetch`;
- the query-definition contract and its JSON Schema projection, checked against each other by Ajv;
- the endpoint's outcomes, limits, headers and logging;
- name resolution including the surname fallback and the single-candidate confirmation;
- the deterministic default-competition rule, including the acronym match and its word boundaries;
  and
- the widget's rendering of answers, assumptions, suggestions and refusals.

**No test anywhere calls the provider, and no API key exists in the repository.**

## Related reading

- [Analytics Query](../api/analytics-query.md) — the documented behaviour and its known limitations.
- [Final system verification bank](../testing/final-system-verification.md) — `API-TECH-11` covers
  this feature in the final verification.
- [Testing & Validation Evidence](../process/validation-and-user-testing.md) — the wider evidence
  index.

## AI Declaration

The preceding page was drafted with the assistance of Claude-Code[Claude Opus 5 (1M context)] under
issue #817. The run figures and per-run findings were read from the five evaluation records in
`evidence/validation/` rather than restated from memory, and the run 2 against run 3 suggestion
comparison was taken by diffing those two records. The evaluation runs themselves were performed by
Ben Swartz, and the 6 October demonstration feedback is his own record of that session rather than
anything the tool observed.
