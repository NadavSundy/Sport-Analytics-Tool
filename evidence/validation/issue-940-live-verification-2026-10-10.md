# Issue #940 — live verification on the deployed site

| Field    | Value                                            |
| -------- | ------------------------------------------------ |
| Date     | 2026-10-10                                       |
| Surface  | The floating chat assistant on the deployed site |
| Verified | Ben Swartz                                       |
| Result   | **3 of 3 checks passed**                         |

This is a live check against the deployed site through the chat assistant, so each question made a
real call to the configured provider. It is recorded by hand for that reason: the evaluation runner
under `evidence/validation/` is the repeatable set, and this record is the confirmation that the
issue #940 behaviour reaches a reader on the deployed product rather than only in a test.

Issue #940 changed two things, and the three checks below cover both: an unfamiliar named
competition must be translated and resolved in the ordinary way rather than refused as ambiguous or
answered against the configured default, and a question about a match result must be refused with
wording that says what is published here instead of telling a reader who asked an ordinary cricket
question that they asked about something else.

## 1 · An unfamiliar named competition is answered

**Asked:** "Who scored the most runs in the Austria tour of Hungary in 2026?"

**Result — passed.** The answer was read as **Most runs · Austria tour of Hungary 2026 · top 10**,
ranking **1. Karanbir Singh 260**.

The competition is one the model has no reason to know, and it was neither refused as `ambiguous`
nor quietly answered against the configured default competition — the two failures that caused #940
to be raised. The interpretation shown above the figures names the competition and season the reader
asked for, so the reader can see that the question was understood before trusting the ranking.

## 2 · A match-result question is refused, pointing somewhere useful

**Asked:** "Who won the 01/09/2007 Kenya vs Pakistan game?"

**Result — passed.** Refused as not answerable from the published statistics. The message said the
figures published here are **player figures rather than match results**, and pointed the reader at
the fixtures pages.

This is the `other` refusal with the wording #940 introduced. Before that change the same question
was refused as `outside_cricket_statistics`, whose sentence — "That is not a question about the
cricket statistics published here" — is false of a reader asking who won a cricket match. The
refusal is still a refusal: the platform publishes aggregated player figures, not match outcomes.
What changed is that it now says so and sends the reader to the part of the product that can answer.

## 3 · A follow-up resolves against the earlier turn

**Asked, as a follow-up to check 1:** "What about wickets?"

**Result — passed.** Read as **Most wickets · Austria tour of Hungary 2026 · top 10**, ranking
**1. Bilal Zalmai 5**.

The follow-up carried neither the competition nor the season, and both were resolved from the
earlier turn, so the conversation support added under #868 and exercised by the assistant from #936
works on the deployed site. It also confirms the metric was changed while the scope was kept, rather
than the whole question being re-read from scratch.

## What this does and does not show

It shows that the three behaviours reach a reader on the deployed product. It is a single pass of
three questions, performed by hand, and translation is not deterministic: it is confirmation, not a
guarantee that every phrasing of these questions behaves the same way. The repeatable coverage is
`npm run test:scripts` for the case set and the dated evaluation runs for the translation step;
those, and the frontend and end-to-end suites, are what gate a merge.

No provider call recorded here was made by an automated test. The questions and answers above are
the reader-visible text; no key, token or configuration value appears in this record.

## Related records

- [Natural-Language Query Evidence](../../docs/validation/issue-817-natural-language-query-evidence.md)
  — the evaluation runs and what each caught.
- [Analytics Query](../../docs/api/analytics-query.md) — the documented behaviour, including the
  `other` refusal and the named-competition rule this record checks.

## AI Declaration

The three checks were performed by Ben Swartz against the deployed site. This record was written up
with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue #886 from his account of
the results; the tool made no provider call and did not perform the checks.
