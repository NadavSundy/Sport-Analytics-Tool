# Natural-language query demonstration — 6 October 2026

## Context

The natural-language query feature was demonstrated to the project stakeholder on Tuesday
6 October 2026, as required by issue #817.

At the time of the demonstration the feature consisted of the work delivered by issues #811 and #813
(the query-definition contract and its evaluation), #814 (the server-side provider adapter, ADR-017),
#815 (the `POST /api/v1/natural-language-queries` endpoint), #816 (the home-page question widget) and
#851 (answerable suggestions beside a refusal). Neither issue #868 nor issue #924 existed yet; both
were created in response to this meeting.

**This record was written up after the meeting.** The demonstration was not recorded and
contemporaneous minutes were not taken, so the feedback below is recorded from the team's own account
of the session rather than from a transcript.

> **Attendance not retained.** Attendance is not recorded here because it was not retained at the
> time and must not be reconstructed. The feedback list below is otherwise **complete**: Ben Swartz
> has confirmed that the three items recorded are everything the meeting raised.

## Feedback received

### 1. Answers were hard to get with casual phrasing

A question had to be worded close to the shape of a published metric before it would be answered.
Ordinary wording for the same figure — "who smashes the most sixes", "who is the most economical
bowler" — did not reliably reach the metric it names, so a reader who did not already know the
platform's vocabulary was refused a question the platform could in fact answer.

### 2. Follow-up questions were not understood

Having asked about a player, asking a second question about the same player did not work. Each
question was translated with no knowledge of the one before it, so an ordinary conversational
follow-up — "what about his strike rate?" — could not be resolved.

### 3. The assistant should be a floating chat bubble on every page

Testers asked for the assistant to be reachable from anywhere in the product rather than only from
the home page. The request was specific: a floating chat bubble fixed to the bottom-right corner of
every page, replacing the home-page widget rather than sitting alongside it, and supporting
follow-up questions within the conversation it holds.

This is a larger change than it appears, because the home-page widget deliberately keeps no history
and answers one question at a time. A chat surface implies a conversation the client maintains and
sends back on each request, which the API already supports but no interface currently exercises.

## Disposition

All three items were accepted.

| #   | Feedback                                | Disposition                                        |
| --- | --------------------------------------- | -------------------------------------------------- |
| 1   | Casual phrasing did not reach a metric  | Accepted — **issue #868**, delivered and evaluated |
| 2   | Follow-up questions were not understood | Accepted — **issue #868**, delivered and evaluated |
| 3   | Floating chat bubble on every page      | Accepted — **issue #924**, not yet started         |

### Issue #868 — what was delivered in response

- **A casual-wording map**, generated from the metric enum in the contract itself so a metric renamed
  in the contract cannot leave the guidance naming one that no longer exists. Casual wording for a
  published measure now reaches that measure, while a superlative naming no published measure stays a
  refusal with suggestions rather than being answered as a guess.
- **Conversation support.** A caller may send up to five earlier turns, each an earlier question and
  the definition it was read as, delivered to the provider as delimited prior context inside the same
  user turn so that nothing in the history can read as the model's own prior commitment.
- **Scorecard-name handling with a surname fallback**, so a spoken name reaches the scorecard form
  (`Virat Kohli` to `V Kohli`) and a disagreeing initial asks for confirmation rather than answering
  as a different player.
- **A configured default competition**, reported in `assumptions` so that an answer against an
  assumed competition is never presented as an answer to the question the reader actually asked.

### Verification of the response

Issue #868 was verified by three evaluation runs against the real provider on 7 October 2026:
**55/63, then 62/64, then 62/64**. The records are
`issue-868-natural-language-evaluation-2026-10-07-run1.md`, `-run2.md` and `-run3.md` under
`evidence/validation/`, and they are summarised with a per-run account of what each caught in the
documentation site's
[Natural-Language Query Evidence](../../docs/validation/issue-817-natural-language-query-evidence.md)
page.

### Issue #924 — the outstanding response

Item 3 is tracked by **issue #924, "Natural-language query follow-up work"**, which holds the
remaining work for this feature as a checklist. The floating chat assistant sits there alongside the
engineering follow-ups the feature's own documentation and evaluation runs identified, so the
interface change and the behaviour it depends on — follow-up resolution after a leaderboard, and the
empty-suggestions fallback a chat surface would hit more often than a one-shot widget does — are
planned together rather than separately.

Nothing in item 3 has been started. It is recorded here as accepted, not as delivered.

## Relationship to formal user testing

This was a stakeholder demonstration, not a formal user-testing session. The feedback was behavioural
and was not scored against the task-based protocol established in
[ADR-013](../decisions/ADR-013-task-based-user-testing-evidence.md), so it is recorded here rather
than under `evidence/user-testing/` and is not counted as a task attempt.

## Integrity

This record contains no credentials, tokens, production data or personal information. It records only
the feedback the team retained and the work it caused; nothing has been added to make the response
look more complete than it was.

## AI Declaration

This record was drafted with the assistance of Claude-Code[Claude Opus 5 (1M context)] under issue
#817. The three feedback items, their dispositions and the confirmation that the list is complete
are Ben Swartz's own account of the meeting; the description of what #868 delivered was taken from
ADR-017 and the repository, and the run figures from the three evaluation records. Attendance was
deliberately left unrecorded rather than reconstructed.
