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

## Status

Issue #708 is **not** closed by this run. Two defects block it: a task the interface cannot settle
(A) and settled tasks that do not stay settled (B).
