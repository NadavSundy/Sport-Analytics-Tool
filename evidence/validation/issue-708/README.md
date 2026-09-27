# Issue #708 deployed acceptance packages

Three version `1.1` JSON batch submission packages for deployed acceptance testing of reviewer
participant onboarding. **Each one is good for a single run**; take the next unused file.

| File                                 | Use                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `onboarding-test-package.json`       | The first run, 25 September 2026. Recorded in `deployed-acceptance-2026-09-25.md`. |
| `onboarding-test-package-rerun.json` | The second run.                                                                    |
| `onboarding-test-package-run-3.json` | The third run.                                                                     |

Every record they introduce is fictional and prefixed `onboarding-test-`, so the data they create is
identifiable as test data.

The two fixture teams are the exception. They are `Argentina` and `Austria`, real canonical teams,
because a v1.1 package cannot introduce a new one — see
[Finding](#finding-a-v11-package-cannot-introduce-a-new-team). No database editing is needed at any
point in this workflow.

## Why there is one per run

**A package can only be used once.** The first is identified by the source reference
`cricsheet:fixture:onboarding-test-708-fixture-1`, and the first run created that fixture as a
canonical record. Submitting it again resolves to the fixture that already exists rather than
arriving as a new proposal, so the reviewer is never offered **Create canonical fixture from
proposal** and the journey this test exists to exercise never starts. The same becomes true of each
later package once it has been run.

Every package after the first is the same package with a different identity. They are deliberately
**identical in shape** — same teams, same four participants, same identifier situations, same
expected outcomes — so a re-run tests the same behaviour rather than a new scenario. Only what
identifies the fixture differs:

|                     | First                                             | Second                             | Third                     |
| ------------------- | ------------------------------------------------- | ---------------------------------- | ------------------------- |
| `packageId`         | `cricsheet:package:onboarding-test-708`           | `…-708-rerun`                      | `…-708-run-3`             |
| fixture `sourceId`  | `cricsheet:fixture:onboarding-test-708-fixture-1` | `…-fixture-2`                      | `…-fixture-3`             |
| date and end date   | `2031-03-14`                                      | `2032-04-18`                       | `2033-05-22`              |
| season              | `onboarding-test-2031`                            | `onboarding-test-2032`             | `onboarding-test-2033`    |
| the five `eventId`s | `…-708-i1-0.1` …                                  | `…-708-r2-i1-0.1` …                | `…-708-r3-i1-0.1` …       |
| venue               | `onboarding-test-Kingfisher-Oval`                 | `onboarding-test-Swallowtail-Park` | unchanged from the second |

The date matters as much as the source reference. A fixture reference carries both a source identity
and readable context, so a new source reference with the old date and the same two teams could still
resolve to the fixture the first run created.

The venue does not. A fixture that does not resolve by source reference is looked up on competition
and start date in `reference-resolver.ts`, and `venue` takes no part in that: it is only compared
against a fixture that has already matched, to report a context divergence. The second package
changed it, the third leaves it alone, and both are equally new.

**A fourth run needs a fourth package**, made the same way: change the source reference, the date,
the season and the five event references, and leave everything else alone. Change the `packageId`
too, so the file says which run it is — nothing reads it (it is parsed by the contract and never
stored), but two packages claiming one identity is misleading to the next reader.

## Before you submit

### The competition name is already set, for one environment

All three packages carry `ACC Eastern Region T20`, the competition the first run used. **Change it
if you are running anywhere else**, and note that it is not chosen in the upload form: the form
chooses a `competitionId`, the package carries a competition _name_, and the two are resolved
separately and must agree.

`reference-resolver.ts` resolves the package's competition by exact name against the `competition`
table and emits its own reference outcome:

```sql
SELECT competition_id, name FROM competition WHERE name = ANY($1::text[])
```

The resolved `competitionId` then scopes fixture resolution. If the name matches nothing, that
reference is reported unresolved and the scope is null, so set it correctly before uploading.

**What to look for on the deployed site:** the competition selector in the batch upload form lists
the competitions your submitter account is scoped to — use one of those names verbatim. The same
names are public at `GET /api/v1/competitions`. Copy it exactly: the match is a string comparison,
not a search.

### `Argentina` and `Austria` — check, do not edit

Both must already exist as canonical teams on the deployed platform. Confirm with either:

- `GET /api/v1/competitors` — public and unauthenticated, listing `{ competitorId, name }` straight
  from `team.team_id` and `team.name`, which is the same table canonical fixture creation checks
  against; or
- the public browse pages, where competitor names shown on any fixture are canonical team names.

If either name is absent on your environment, substitute two that are present. `Argentina` appears
7 times in the package and `Austria` 9 times, across the fixture context, both innings batting teams
and the participant team references.

### Leave `onboarding-test-Unlisted-Wanderers` exactly as it is

That team is deliberately **not** one of the fixture's two and does not need to exist anywhere. Its
absence is what produces the `team_not_recognised` task. Do not replace it and do not create it.

Expect it to appear **twice** in the report, for two different reasons: once as an unresolved _team_
reference (teams also resolve by exact name), and once as the participant onboarding task this test
is about. The first is not a defect.

## What each package contains

One fixture, two innings, five deliveries. Identical in all three, apart from the identity fields
tabulated above.

The fixture is genuinely new in each: nothing on the platform resolves its source reference, date or
season, so it arrives as a reviewer-actionable fixture proposal carrying the full `1.1` proposal
metadata.

The proposal's outcome is `won`, and it names `Argentina` as the `winner` — the team the deliveries
themselves put ahead. Both are needed: `fixture_winner_ck` requires a winner exactly when the
outcome is `won`, so a proposal that says `won` without saying by whom cannot become a canonical
fixture. See [the local end-to-end run](#how-this-was-validated); a package written before the
`winner` field existed is now refused at upload rather than accepted and failed at the reviewer's
click.

The two innings run 1, wide, 4 and then 2, 0. The wide is the third delivery's reason for being
labelled `0.2` and not `0.3`: a printed ball number counts legal deliveries, so an illegal one does
not advance it.

Four distinct participants appear across nine role references. The deduplication that issue #708
asks for means the reviewer should see one decision per participant, not one per reference.

| Participant                      | Team named                           | Expected outcome                                                                                                                               |
| -------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding-test-Priya-Naicker`  | `Argentina`                          | **`no_durable_identifier`** — no identifier, and a name alone can neither create nor match a person                                            |
| `onboarding-test-Sipho-Dlamini`  | `onboarding-test-Unlisted-Wanderers` | **`team_not_recognised`** — not one of the fixture's two teams                                                                                 |
| `onboarding-test-Lerato-Khumalo` | `Austria`                            | **`identifier_not_found`** — carries `app:participant:2147483647`, which names nobody                                                          |
| `onboarding-test-Thandi-Mokoena` | `Austria`                            | **Resolves automatically** — carries `cricsheet:participant:onboarding-test-bowler-1`, a durable registry identifier, so no decision is needed |

So: **three onboarding tasks, covering three of the four reasons**, and one control proving that a
participant carrying a durable identifier still needs no reviewer decision.

`ambiguous_name` is the fourth reason and is not covered. It requires more than one existing person
already answering to the submitted name, which depends on what the deployed database already holds
and cannot be guaranteed by a package alone.

## Finding: a v1.1 package cannot introduce a new team

Canonical fixture creation refuses unless **both** proposed teams are already canonical records:

```
if (teams.rows.length !== 2)
  throw new BatchReferenceMappingConflictError(
    'Both proposed fixture teams must already be canonical records.',
  );
```

— `apps/backend/src/modules/batches/batch.repository.ts`

The team lookup selects `FROM team WHERE name = ANY($1)` over the two proposed names, and
`fixture_team` is then populated by `JOIN team ON team.name = proposed.name`. A team name not
already in `team` contributes no row and no identifier.

So a version `1.1` fixture proposal can introduce a new fixture, season, venue and date, but **not a
new team**. A submitter whose package names a team the platform has never seen gets a `409` at
**Create canonical fixture from proposal**, and there is no route through the product to add one:
teams are readable through `/api/v1/competitors`, but no create path exists. This is why this
package uses two real teams rather than fictional ones.

The principle is consistent with #708 — a team is a decision, not something to infer from a name,
the same reasoning that makes participant onboarding a reviewer decision. But it is a real limit on
package ingestion, and it lands on two issues that assume packages can carry unfamiliar data:

- **#589 (multi-season back-catalogue ingestion)** — a back catalogue is precisely where teams the
  platform has never held are expected. Every unknown team would block its fixture at the reviewer
  step, with no supported way to proceed.
- **#598** — the same dependency: any ingestion path accepting externally sourced fixtures inherits
  the constraint.

Both need a decision on how a new team becomes canonical: a reviewer action comparable to **Create
canonical fixture from proposal**, an administrative create path, or an explicit statement that
teams are seeded out of band and packages may only reference existing ones. Recorded here rather
than raised, as agreed.

## Finding: the upload form is narrower than the contract on `gender`

Nothing below the interface constrains `gender` to a value set:

| Layer                                      | Rule                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| `fixtureProposalSchema` (season-upload.ts) | `readableNameSchema` — any trimmed string, 1 to 200 chars |
| `openapi.yaml`                             | `type: string, minLength: 1`                              |
| `fixture.gender` column                    | `text NOT NULL`, no CHECK and no enum type                |
| Worker proposal check                      | `typeof proposal.gender === 'string'`                     |

The deployed upload form offers exactly two options, `NEW_FIXTURE_GENDERS = ['female', 'male']` in
`apps/frontend/src/features/submissions/SubmissionPage.tsx`, labelled "Women" and "Men".

So a value such as `mixed` is valid everywhere except the form. A submitter using the form cannot
propose it; a submitter posting a package directly can, and it will be stored. The two routes into
the same field disagree, and the narrower one is the one with no validation behind it.

This is worth a decision rather than a silent divergence: either the contract should constrain
`gender` to the values the platform intends to support, and the corpus convention is already
`male`/`female`, or the form should accept what the contract accepts. Recorded here rather than
raised, as agreed.

Note for anyone reading the form: the option **labels** are "Women" and "Men", but the **values**
submitted are `female` and `male`. This package uses `male`, matching the value, not the label.

## How this was validated

**All three** packages were parsed with the real `seasonUploadPackageSchema` from
`packages/contracts/src/season-upload.ts` (built output), the same schema the upload path applies.
Each reports `VALID`, `contractVersion 1.1`, one fixture, two innings, five deliveries, and each
yields the same four participants and the same three onboarding tasks.

The first was re-validated after the team names were set to `Argentina` and `Austria`, and again
after `gender` was changed from `mixed` to `male`. Each later package was validated after it was
derived from the one before it, and a structural diff against that predecessor confirms that only
the identity fields tabulated above differ — six for the second, five for the third, which keeps the
venue.

The expected outcome column is no longer a simulation. `onboarding-test-package-run-3.json` is
driven through the whole workflow against a real PostgreSQL by
`apps/backend/tests/database/issue-708-onboarding-end-to-end.database.test.ts`, which submits the
file as it stands, runs the real service, repository and worker job handlers, and asserts stages 1,
2, 4, 5, 9, 10 and 11 of the checklist below. Run it with `npm run test:database`.

That run is what corrected both packages: the `winner` field and the `0.2` ball label are defects it
found in the packages themselves. It found four more in the product, and corrected the diagnosis of
a fifth, recorded in
[the local end-to-end section of the deployed acceptance note](deployed-acceptance-2026-09-25.md#local-end-to-end-run-25-september-2026).

It is not a substitute for a deployed run. It does not exercise the reviewer interface, the queue
transport, or the deployed environment's own data, and Defect A was an interface defect. The
deployed run is still what these packages exist to capture.

## Acceptance checklist

Fill in as you go. One line per stage; the evidence write-up can be completed from these notes.

| #   | Stage                     | Record                                                                                                                                | Result |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 0   | Setup                     | Competition name and id used; that `Argentina` and `Austria` were both found, and where                                               |        |
| 1   | Upload                    | HTTP status, batch reference, receipt `status`, timestamp                                                                             |        |
| 2   | Validation finishes       | Final state — expected `awaiting_review`, **not** `rejected` — plus accepted/rejected/unresolved counts                               |        |
| 3   | Workspace before decision | That the fixture proposal is offered, and that no Participants section appears yet                                                    |        |
| 4   | Create canonical fixture  | HTTP status, new fixture id, and that the eight proposal fields survived unchanged                                                    |        |
| 5   | After revalidation        | "Participants to onboard" count (expect **3**), the three names, and the reason shown on each                                         |        |
| 6   | Deduplication             | That nine role references produced three cards, and that `onboarding-test-Thandi-Mokoena` is **absent**                               |        |
| 7   | No name matching          | That no card offers a free-text participant name field anywhere                                                                       |        |
| 8   | Fault path (deliberate)   | Answer the team card with the wrong team: HTTP status (expect `409`), that nothing was applied, and that the fault names its own task |        |
| 9   | Submit decisions          | That one request carried all three, the receipt counts, and that the confirmation stayed visible after the view changed               |        |
| 10  | After revalidation        | Batch state, whether approval is unblocked, and any remaining unresolved references                                                   |        |
| 11  | Publish                   | Approval result, and that the fixture and its deliveries are publicly visible                                                         |        |
| 12  | Anything unexpected       | Anything that differed from the expectations above, with the screen or response that showed it                                        |        |
