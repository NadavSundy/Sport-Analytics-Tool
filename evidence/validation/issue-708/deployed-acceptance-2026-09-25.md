# Issue #708 deployed acceptance run — 25 September 2026

A reviewer participant onboarding run against the deployed platform, using
`onboarding-test-package.json` from this directory.

Everything under [Observations](#observations) is what the operator saw. Where a cause is not
established by the run itself, it is marked as open rather than explained.

## Environment

|                 |                                                                                         |
| --------------- | --------------------------------------------------------------------------------------- |
| Frontend        | Deployed Cloudflare Pages — `sport-analytics-tool-web.pages.dev`                        |
| Backend         | Deployed API                                                                            |
| Batch reference | `af667af3-2a16-4b2f-b3da-1b19338213f0`                                                  |
| Uploaded        | 25/09/2026 09:11:43                                                                     |
| Account         | `statsthegametest@gmail.com`, submitter at upload, administrator for the reviewer steps |
| Competition     | ACC Eastern Region T20                                                                  |
| Fixture         | 2031-03-14, Argentina v Austria                                                         |
| Season          | `onboarding-test-2031`                                                                  |

## Observations

**1. Upload.** Accepted. A receipt was returned. Status shown as
"Received — validation pending".

**2. Validation finished.** State `Awaiting review`. Counts: 0 accepted, 5 rejected, 5 unresolved.
The batch was **not** terminally rejected.

**3. Reviewer workspace, before any decision.** "Needs review (1)", showing the fixture proposal and
a **Create canonical fixture from proposal** action. No Participants section was present.

**4. Canonical fixture created.** The workspace reported "Canonical fixture decision queued for
validation". Actions were disabled while revalidation ran.

**5. After revalidation.** "Needs review (3)", and a **Participants to onboard** section showing
3 outstanding, as three cards:

| Card                             | Reason text shown                                        |
| -------------------------------- | -------------------------------------------------------- |
| `onboarding-test-Lerato-Khumalo` | "The submitted identifier names nobody on this platform" |
| `onboarding-test-Priya-Naicker`  | "No durable identifier was submitted"                    |
| `onboarding-test-Sipho-Dlamini`  | "No durable identifier was submitted"                    |

`onboarding-test-Thandi-Mokoena` was **absent** — onboarded automatically from its `cricsheet`
identifier. Nine role references in the package produced three cards. No free-text participant name
field appeared anywhere in the section.

**6. First submission — all three answered with durable identifiers.** The response was
"Nothing was applied. 1 of 3 decisions could not be applied." The `onboarding-test-Sipho-Dlamini`
card showed the fault "Name one of the two teams of the fixture this task belongs to."

**7. Second submission — the other two.** "2 settled. The batch is being revalidated once for all of
them." Outstanding dropped to 1. The confirmation remained visible while the section changed.

**8. After that revalidation.** All **three** tasks were outstanding again, including the two that
had just been settled.

**9. Public fixture page.** Lists three players: `onboarding-test-lerato-1`,
`onboarding-test-priya-1` and `onboarding-test-Thandi-Mokoena`. The squad rows persisted, and the
reviewer-created fixture is publicly visible.

## Defects found

### Defect A — a task needing both an identity and a team cannot be settled through the interface

A task that requires both an identity and a team gives the reviewer no control with which to supply
the team. The requirement surfaces only as a fault after submitting, and the card does not
re-render to offer the missing control. The task therefore cannot be settled through the interface
at all.

Observed at steps 6 and 8: `onboarding-test-Sipho-Dlamini` was answered with a durable identifier,
was refused with "Name one of the two teams of the fixture this task belongs to", and remained
outstanding with no way to provide that team.

The interface offers the team control only for a task whose reason is `team_not_recognised`, while
the team is checked for every decision regardless of its reason. This card's reason was
`no_durable_identifier`.

### Defect B — settled onboarding tasks reappear as outstanding after revalidation

At step 7 two tasks were settled and the outstanding count dropped to 1. At step 8, after
revalidation, all three were outstanding again, including the two just settled — while the squad
rows they created persisted and are visible on the public fixture page (step 9).

The task list is regenerated rather than reflecting already-settled state.

## Note: `team_not_recognised` was not exercised

The package was built so that `onboarding-test-Sipho-Dlamini`, which names
`onboarding-test-Unlisted-Wanderers` — deliberately not one of the fixture's two teams — would be
classified `team_not_recognised`. It was classified `no_durable_identifier` instead (step 5), so the
`team_not_recognised` classification was never produced by this run.

**The cause is not established.** The only code path that writes these tasks,
`onboardFixtureCanonicalContext` in `apps/backend/src/modules/batches/batch.repository.ts`, tests
the team **before** the identifier and reports `team_not_recognised` whenever the submitted team is
missing or is not one of the fixture's two:

```ts
const teamId = participant.teamName ? teamIdByName.get(participant.teamName) : undefined;
if (!teamId) {
  await report(participant, 'team_not_recognised');
  continue;
}
```

The observed classification is therefore not explained by that ordering, and what happened to the
submitted team name between the package and the onboarding task has not been determined. It needs
investigation on its own; this file records only that the classification differed from the one the
package was designed to produce.

The fault at step 6 shows the team check itself is working: the decision was refused precisely
because the participant's team was not one of the fixture's two.

## Requirements exercised

The repository holds no local copy of issue #708, so this is assessed against the scope briefed for
Pull Requests 1 to 3 rather than against the issue text. A clause-by-clause tick-off against the
issue still needs doing by someone who can read it.

### Satisfied by this run

| Requirement                                                                                   | Evidence                                                                |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A batch whose only actionable work is a fixture proposal is not terminally rejected           | Step 2 — `Awaiting review` with 0 accepted                              |
| A reviewer can create a canonical fixture from a v1.1 proposal                                | Step 4                                                                  |
| A reviewer-created fixture is publicly visible                                                | Step 9                                                                  |
| Onboarding tasks appear only after the canonical fixture exists                               | Steps 3 and 5                                                           |
| A participant carrying a durable registry identifier is onboarded without a reviewer decision | Step 5 — `onboarding-test-Thandi-Mokoena` absent                        |
| Outstanding work is deduplicated: one decision per participant, not one per reference         | Step 5 — nine role references produced three cards                      |
| The interface never offers a free-text participant name                                       | Step 5                                                                  |
| An identifier naming nobody is refused rather than guessed at                                 | Step 5 — `identifier_not_found` on `onboarding-test-Lerato-Khumalo`     |
| Decisions are submitted as one array and revalidated once                                     | Step 7 — "revalidated once for all of them"                             |
| The array is all-or-nothing, with a fault against the decision that failed                    | Step 6 — "Nothing was applied. 1 of 3", fault shown on the failing card |
| The receipt survives the section changing                                                     | Step 7 — confirmation stayed visible                                    |
| A participant's team must be one of the fixture's two                                         | Step 6 — the decision was refused for that reason                       |
| Squad membership persists from a reviewer decision                                            | Step 9                                                                  |

### Not satisfied

| Requirement                                                            | Evidence                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------ |
| Every outstanding onboarding task can be settled through the interface | Defect A — one task could not be settled at all        |
| A settled task stays settled                                           | Defect B — two settled tasks reappeared as outstanding |

### Not exercised

| Requirement                                      | Why                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `team_not_recognised` classification             | Not produced by this run; see the note above                                                            |
| `ambiguous_name` classification                  | Requires more than one existing person answering to the submitted name; the package cannot guarantee it |
| Batch approval and publication of the deliveries | The run stopped at the outstanding tasks; the deliveries were not published                             |
| Replaying an identical decision array            | Not attempted                                                                                           |
| Regression coverage across more than one team    | Only one team's participants were settled                                                               |

## Follow-up: the re-run, and a regression on the canonical fixture path

A second package was prepared for a re-run (`onboarding-test-package-rerun.json`) and uploaded as
batch `860bc3f2-f5c4-4eaf-b4f4-ca5d1d43e9eb`, after the fixes for defects A and B merged as #731.

### What happened

`POST /api/v1/batches/{ref}/canonical-fixtures` returned **500 five times**, at 10:04:33, 10:04:38,
10:04:49, 10:04:51 and 10:08:00 UTC, each taking about 1.8 seconds. Health checks either side
returned 200, so only this path failed. No canonical fixture was created, and the re-run did not get
past this step.

The whole decision runs inside one transaction (`createCanonicalFixtureAndQueueMapping` wraps itself
in `withTransaction`), so each attempt rolled back completely and each was equivalent to a first
attempt.

### Diagnosed from the Container App logs

All five requests logged exactly:

> The database rejected invalid data.

That is the message `translateDatabaseError` produces for a constraint violation. It maps both
`23502` and `23514` to that one string, so the log alone narrows it to "a constraint refused the
write" rather than naming which. A reproduction on this exact path produced **`23514`**, a check
violation, from `recordOnboarded`:

```
DatabaseAccessError: The database rejected invalid data.
 ❯ recordOnboarded                       batch.repository.ts:1134
 ❯ onboardFixtureCanonicalContext        batch.repository.ts:1248
 ❯ createCanonicalFixtureAndQueueMapping batch.repository.ts:2565
```

The cause is that closing an onboarding task set its state, person and time but not `decided_by`,
which the state constraint has required since Pull Request 2. The UPDATE raises a check violation
the moment it matches a row, and nothing catches it, so it reaches the client as a 500 rather than
as a refusal.

### Open question: why a task row existed to match

`recordOnboarded` only violates the constraint when its UPDATE **matches an existing task row**. On
a genuinely fresh batch there should be none: the backend only creates them during this same
derivation, and a participant that onboards successfully is never reported first.

`860bc3f2` is recorded as a fresh upload whose only reviewer actions were these five clicks. How a
task row came to exist for the UPDATE to match is **not established**, and is recorded here rather
than guessed at. One candidate, unverified: #729 added a second writer in the worker
(`persistReviewerActionableOnboardingTasks`) that creates task rows during ordinary validation, but
only once a fixture outcome has resolved, which a new v1.1 proposal has not. Settling it needs the
task rows for that batch, or the validation history that preceded the clicks.

The fix is correct regardless of the answer: the UPDATE must satisfy the constraint whenever it
matches, and a path that can 500 on a constraint the schema has required since Pull Request 2 is
wrong however it is reached.

### A second regression, found while investigating

#729's worker writer resets every task it touches to outstanding, unguarded:

```sql
ON CONFLICT (batch_id, fixture_id, participant_key) DO UPDATE SET
  ..., state='outstanding', person_id=NULL, onboarded_at=NULL, decided_by=NULL, ...
```

It runs on every validation pass, and settling a task queues a revalidation, so a reviewer's answers
came back as outstanding work on the very next pass while the squad rows they created stayed. That
is defect B again, through a path that did not exist when defect B was first fixed: the guard added
then was on the backend's derivation, and this is a different statement in a different service. It
now carries the same guard.

## Local end-to-end run, 25 September 2026

The deployed environment could not be re-verified: its Container App carries one revision, predating
every fix above. The workflow was therefore driven locally against a real PostgreSQL, through the
real service, repository and worker job handlers, by
`apps/backend/tests/database/issue-708-onboarding-end-to-end.database.test.ts` and using
`onboarding-test-package-run-3.json` unaltered. Every stage of the acceptance checklist that does
not need a browser now passes. What it found is below.

### Defect C's diagnosis above is wrong

The 500s are reproduced exactly — `POST /api/v1/batches/{ref}/canonical-fixtures`, 23514, "The
database rejected invalid data.", the whole transaction rolled back. But the constraint is
`fixture_winner_ck`, not the onboarding task state constraint:

```
new row for relation "fixture" violates check constraint "fixture_winner_ck"
Failing row contains (1, onboarding-test-708-fixture-3, ..., won, null, ...)
```

`fixture_winner_ck` is `CHECK ((outcome = 'won') = (winner_id IS NOT NULL))`. The proposal contract
accepted `outcome: 'won'`, carried no winner, and the canonical fixture INSERT wrote no `winner_id`,
so **every** v1.1 proposal declaring the commonest outcome in the sport was refused by the database.
No test had ever created a canonical fixture with `outcome: 'won'` — every one of them used `tie`
or `no result` — which is how it reached deployment.

This happens at the fixture INSERT, before `onboardFixtureCanonicalContext` runs at all, so on this
path `recordOnboarded` is never reached. That also **closes the open question** recorded above: no
task row had to exist, because the transaction never got as far as writing or matching one.

The `decided_by` fix committed as 81f52ea stands on its own merits — that UPDATE must satisfy the
constraint whenever it matches — but it was not what stopped the re-run.

### Defect D — a v1.1 proposal could not declare a winner

The cause above, stated as its own defect. `fixtureProposalSchema` now carries `winner`, required
when the outcome is `won` and refused otherwise, mirroring `fixture_winner_ck`; the canonical
fixture INSERT resolves it against the proposal's own two teams and writes `winner_id`. A package
naming a winner that is not one of them is refused with a `409` rather than a `500`.

### Defect E — the reviewer was shown the wrong reason, which is what made Defect A unsettleable

`onboarding-test-Sipho-Dlamini` was classified `no_durable_identifier` instead of
`team_not_recognised` — the misclassification recorded above as "the cause is not established". It
is established now.

Two writers create these task rows and they disagreed. The backend derivation checks the submitted
team against the fixture's own two. #729's worker writer read
`teamName ? ... : 'team_not_recognised'` — a team counted as recognised whenever one was named at
all — so a participant naming a team that is not one of the fixture's two was recorded as
`no_durable_identifier`. Its upsert overwrites `reason` for any outstanding task, so the wrong
answer replaced the right one on the first revalidation.

This is also the whole of Defect A's symptom. The interface offers the team control only for a
`team_not_recognised` task; the card said `no_durable_identifier`; so the one task that needed a
team was the one task that could not be given one. They were recorded above as separate findings
with an unexplained middle. They are one bug.

The worker now settles the reason against the database by the backend's rule — team first, then
identifier, then candidate count — and can report `ambiguous_name`, which it previously could not
express at all.

### Defect F — a settled decision left the batch unapprovable

Found past the point the deployed run reached. All three tasks settle, the squad rows appear, the
tasks stay settled — and every participant reference stays unresolved, so no item becomes
acceptable and approval is refused with a `409`. The onboarding work completes and achieves nothing.

The decision path created a person with `display_name` set to the identifier value. A squad is
matched by display name, so the name the submission used matched nothing, and the reference offered
no candidate. That is also what step 9 above observed without comment: the public fixture page
listing `onboarding-test-priya-1` as a player. The registry key standing in for a player's name was
the visible half of a defect whose other half was that the batch could never be approved.

The decision path now uses the submitted name, exactly as the derivation path for the same situation
already did. An existing person keeps its own name.

**No alias is written for a submitted name.** Pull Request #731 recorded that as a deliberate
decision — a name must not become a resolution key of its own — and it still holds. This is the
person's own name, and squad scope is what makes matching on it safe. The end-to-end test asserts
`person_alias` is empty after all three decisions, so the property cannot be lost silently.

### Defect G — a reviewer's decision could not be applied to an identifier that named nobody

The remaining half of F, and a separate mechanism. `onboarding-test-Lerato-Khumalo` is submitted with
`app:participant:2147483647`. An identifier naming nobody can never be name-matched — correctly —
so no display name fix can reach it. It can only be settled by the reviewer's own recorded mapping,
and `applyOverride` honoured a mapping only for a candidate the resolver itself had offered. A task
exists precisely because the resolver could offer nothing, so a decision settling one could never be
applied, and the reference mapping the decision writes — the mechanism its own code comment relies
on — was rejected as "no longer available in the batch context" on every revalidation.

`applyOverride` now accepts a participant mapping onto a member of the resolved fixture's own squad
even where no candidate was offered. It is not a widening of matching: the person is in that squad
because a reviewer put them there by the decision the mapping records.

The end-to-end test asserts which mechanism settles each of the fifteen role references, so the two
cannot be confused: five resolve by the durable identifier the package carried, eight by squad-scoped
exact name, and two — Lerato's — by the reviewer's mapping and by nothing else.

### Two defects in the packages themselves

Found by the same run, and corrected in all three packages:

- `outcome: "won"` with no `winner` — the packages could not have created a canonical fixture on
  any environment; and
- the third delivery labelled `0.3` when the second is a wide. A printed ball number counts legal
  deliveries, so the label does not advance across a wide. `BALL_NUMBER_PROGRESSION_INVALID`
  rejected that delivery at publication, which the deployed run never reached.

## Status

Issue #708 is **not** closed. Seven defects are now recorded against it:

| Defect | What                                                             | Fixed | Verified                          |
| ------ | ---------------------------------------------------------------- | ----- | --------------------------------- |
| A      | A task the interface could not settle                            | Yes   | Contract boundary only; see below |
| B      | Settled tasks did not stay settled — fixed twice                 | Yes   | Local end-to-end                  |
| C      | Canonical fixture path returned 500 on a constraint violation    | Yes   | Local end-to-end                  |
| D      | A v1.1 proposal could not declare a winner — the real cause of C | Yes   | Local end-to-end                  |
| E      | Two writers classified a task differently; the wrong one won     | Yes   | Local end-to-end                  |
| F      | A settled decision left the batch unapprovable                   | Yes   | Local end-to-end                  |
| G      | A mapping could not settle an identifier that named nobody       | Yes   | Local end-to-end                  |

**A is the exception.** Its fix was in the reviewer interface, and the local run drives the API, not
a browser. What is verified is that the endpoint accepts a decision carrying both an identity and a
team for a task whose reason is not `team_not_recognised` — what the interface has to be able to
send. That the card now renders the control still needs a browser. Defect E removes the condition
that triggered A in the first place.

A deployed run is still needed, and still blocked on the Container App. The open question recorded
above is closed.
