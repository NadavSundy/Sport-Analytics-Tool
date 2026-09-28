# COR-01 submission package — issue #605

A four-delivery direct-submission package for user-testing task `COR-01`
(Correct Previously Published Event Data), scenario `S3-COR-01`.

Files:

| File          | Purpose                                                                      |
| ------------- | ---------------------------------------------------------------------------- |
| `events.json` | The `events` array to paste into the submission form. Contains placeholders. |
| `validate.js` | Checks a filled-in `events.json` against the real submission contract.       |

## Why this package exists

`COR-01` needs the correction workspace on screen. That workspace is rendered at
one place only — `apps/frontend/src/features/submissions/SubmissionPage.tsx:1363`
— gated on `result.kind === 'accepted' && result.correctionContext`. So the
session needs a submission that is accepted immediately, against an existing
fixture whose squad already contains the referenced players.

## Two constraints that decide the whole setup

**1. The account must be `admin`.** `SubmissionPage.tsx:614-630` branches on
role. Only `role === 'admin'` calls `submitLegacyAdminEvents`, which posts to
`POST /api/v1/submissions` and produces `kind: 'accepted'` with the
`correctionContext` the workspace needs. A `submitter` account sending the same
JSON is wrapped into a technical batch file and uploaded as a batch, producing
`kind: 'acceptedBatch'` — which goes to review and **never renders the
correction workspace**. `reviewer-admin-test` is the account for this session,
not `submitter-test`.

**2. It must be the Advanced technical JSON form, not a file upload.** Every
file-upload path also produces `acceptedBatch`. The workspace is reachable only
through the pasted-JSON route.

## Step 1 — choose the fixture and read four identifiers off it

Database identifiers are assigned at ingest and are environment-specific;
nothing in this repository records the deployed values. They must be read off the
build being tested.

A usable target needs **three** things, and the third rules out most candidates:

1. **A competition association.** `submission.service.ts:51` refuses outright:
   `if (!fixture.competitionId || !canSubmitToCompetition(...)) throw new SubmissionForbiddenError()`.
   A fixture with a null `competitionId` returns `403` for every role, admin
   included.
2. **`innings` and `fixture_squad` rows.** These come from
   `onboardFixtureCanonicalContext` (`batch.repository.ts:1029`) at **Create
   canonical fixture from proposal**, not at publication. The package supplies
   its own deliveries, so pre-existing deliveries are not themselves required.
3. **Published events — solely so the `inningsId` can be discovered.** No API
   exposes a fixture's innings. There is no innings endpoint, and
   `GET /api/v1/fixtures/{fixtureId}` returns `competitors` as
   `{competitorId, name}` with no innings and no squad. The events endpoint is
   the only surface that emits `inningsId`, and on a fixture with no deliveries
   it returns nothing. Without database access, an event-less fixture is
   therefore unusable however well-formed its innings rows are.

**The selector is the test for requirement 1.** `listAllFixtures`
(`submission-api.ts:69-70`) filters `fixture.competitionId !== null`, and
`listScopedFixtures` requires the competition be one of the account's. So any
fixture that appears in the **Fixture** dropdown has a competition by
construction. Pick from the dropdown, then check requirement 3 with one events
call.

### Candidates already ruled out

| Candidate                           | Verdict                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Reference match **729307**          | Avoid. Its published figures are the validation baseline in `evidence/validation/729307-published-figures.md`.                     |
| #708 **onboarding-test** fixtures   | Blocked on requirement 3. They hold zero published events, so no `inningsId` can be read. Usable only with direct database access. |
| Fixture **8937** (first men's T20I) | Blocked on requirement 1. `competitionId` is `null`, so it cannot be submitted to at all — see the finding below.                  |

### Finding: fixture 8937 cannot be a submission target

8937 is New Zealand v Australia at Eden Park, 2005-02-17, season 2004/05 — the
first men's T20 international, and not one of the four seeded matches. It has
published events, so its identifiers read off cleanly:

| Value          | Identifier                               |
| -------------- | ---------------------------------------- |
| `inningsId`    | `17880` (ordinal 0, Australia batting)   |
| `strikerId`    | `71` (MJ Clarke)                         |
| `nonStrikerId` | `136386` (AC Gilchrist)                  |
| `bowlerId`     | `14194` (DR Tuffey), New Zealand bowling |

Those four were filled into this package and **pass both contract gates** —
`submissionRequestSchema` and `validateCricketBusinessRules` — with `fixtureId`
`8937`. The correction payload passes `correctionRequestSchema`. The package is
not the problem.

The fixture is. 8937 carries `competitionId: null`, recorded in
`evidence/ai/transcripts/dean-feldman/2026-09-18_AI_Deployment_Azure-Container-Apps-Migration.md:10500`
and diagnosed under issue #311 in
`evidence/ai/transcripts/gabriel-raz/2026-08-29-issue-311-admin-event-submission.md:810`:
"fixture `8937` has `competitionId: null`, so it is not eligible for any scoped
submission and the backend correctly rejects it." The #311 fix was to filter such
fixtures out of the administrator selector, so 8937 should not even appear in the
**Fixture** dropdown.

There is no route to repair it: the backend contains no `UPDATE fixture`
statement and the API defines no write method on any `/api/v1/fixtures` path, so
a fixture's competition association cannot be set through the product. 8937 is
permanently unusable as a submission target without direct database access.

Then:

1. Browse to the fixture. Its URL is `/fixtures/{fixtureId}` — that path segment
   is the `fixtureId`.
2. Fetch its accepted events (anonymous, no key needed):

   ```http
   GET /api/v1/fixtures/{fixtureId}/events?limit=10
   ```

3. Pick one innings and confirm events come back for it. Events returning with
   resolved participant IDs is the proof requirement 3 is met: the innings
   exists, and the players are in the fixture's squad on the right sides. An
   empty response means this fixture cannot be used.
4. From **one** event in that innings, copy four values:

   | Read from the response    | Paste into `events.json` as |
   | ------------------------- | --------------------------- |
   | `inningsId`               | `__INNINGS_ID__`            |
   | `strikerParticipantId`    | `__STRIKER_ID__`            |
   | `nonStrikerParticipantId` | `__NON_STRIKER_ID__`        |
   | `bowlerParticipantId`     | `__BOWLER_ID__`             |

Taking all four from one real delivery is deliberate. Those three players
already batted and bowled in that innings, so they are guaranteed to be in
`fixture_squad` for the fixture and on the correct sides — which is what the
server checks. `validateReferences`
(`apps/backend/src/modules/submissions/submission.repository.ts:319`) requires
the innings to belong to the fixture and every participant to be in the
fixture's squad; `validateCricketBusinessRules`
(`packages/contracts/src/cricket-validation.ts:174-213`) requires striker and
non-striker to be on the innings' batting team and the bowler on its bowling
team. Mixing IDs from different innings or fixtures fails these checks — which is
why all four values come from one delivery.

Prefer a low-scoring innings. The package adds 1 + 2 + 6 + 3 = **12 runs**, and
the correction removes 2 of them. Both movements are obvious in a small innings
and easy to miss inside a large one.

Also record, for the session notes, the fixture's current total runs and the
striker's current runs — those are the figures expected to move.

## Step 2 — fill in and validate

Substitute the four placeholders (each appears once per event, four times each),
then:

```bash
node evidence/user-testing/sprint-3/cor-01-correction-package/validate.js
```

It runs the two checks the server runs, in the server's order: the payload the
frontend sends against `submissionRequestSchema`, then
`validateCricketBusinessRules` — both from `@sport-analytics/contracts`. It
exits non-zero on any violation and requires `packages/contracts/dist` to be
built. Run it on the filled-in file before the session; a contract failure caught
here costs a minute, and caught in front of a participant costs the session.

It cannot check what only the database knows: that the identifiers exist, that
the players are in the fixture's squad and on the right sides, or that the
delivery coordinates are free.

## Step 3 — exactly what to type into the form

Signed in as the `admin` account, go to **`/submissions/new`**.

| Control                  | What to do                                                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow                 | Choose **Advanced technical JSON**                                                                                                                                                                                          |
| **Fixture**              | Select the chosen fixture. Options read `{startDate} — {home} v {away} — {competition}, {season} ({matchType})`. Only fixtures with a competition appear here, which is why the dropdown doubles as the requirement-1 check |
| **Delivery events JSON** | Paste the entire filled-in contents of `events.json` — the bare `[ … ]` array, nothing around it                                                                                                                            |
| Button                   | **Submit events**                                                                                                                                                                                                           |

Do not wrap the array in an object. The form adds `fixtureId` and
`schemaVersion` itself (`submission-api.ts:342-346`); pasting a full
`SubmissionRequest` object fails validation.

## Step 4 — what the participant should see after upload

Immediately, a `role="status"` panel:

- Heading **"Submission accepted"**
- "The backend accepted and stored 4 events."
- A definition list: **Submission reference** (numeric submission ID),
  **Fixture** (the fixture ID), **Received** (local timestamp)

The form then disables itself and the **Submit events** button disappears
(`completed` at `SubmissionPage.tsx:707`). That is expected, not a fault.

Below that panel, the **correction workspace** renders, containing:

- An event picker listing all four deliveries as
  `Delivery {sequenceNumber} - ball {ballNumber}` — so
  `Delivery 9001 - ball 900.1` through `Delivery 9004 - ball 900.4`
- **Current accepted event** with **Event reference** (the event UUID) and
  **Occurrence order** — `{sequenceNumber} (kept by the backend)`
- An editable delivery form
- A **fixture statistics overview** beneath it

The four deliveries carry off-bat runs **1, 2, 6, 3** in sequence order, so the
third (`sequenceNumber` 9003, `positionInOver` 2, the six) is unmistakable in
the picker. That is the correction target.

## Step 5 — the correction, and what it should show

The participant selects the third delivery, changes off-bat runs from **6** to
**4**, sets total to **4**, enters a reason, and submits. Expected:

- Heading **"Correction saved"**
- "Revision 2 is now current. The displayed event and match statistics below
  have been refreshed."
- The fixture statistics panel below re-fetches in place — the fixture total and
  the striker's runs each drop by 2 — from the +12 this package added, down to
  +10 against the innings' original total.

The striker's season/competition/career aggregates also change, but only on the
participant's own page; snapshots refresh synchronously on the next read
(ADR-015 — "There is no worker, poller or background refresh"), so there is no
delay to wait out. Navigating to `/participants/{strikerId}` after the
correction shows updated figures on first load.

On rejection the heading reads **"Correction rejected"** and the panel states
that the accepted event was not changed.

## Known limitations to brief the facilitator on

- **The correction history has no UI.**
  `GET /api/v1/submissions/events/{eventId}/history` exists and is not called
  anywhere in the frontend. `COR-01`'s "Whether confirmation/history information
  is clear" can only be observed for the confirmation half.
- **`refreshedScopes` is not displayed.** The correction response lists the exact
  affected fixture/season/competition/career scopes; the workspace reads only
  `revision`.
- **Discoverability cannot be tested with this package.** The workspace only
  exists because the participant just submitted. `COR-01`'s first Observe bullet
  — "Discoverability of correction controls" — has no independent control to
  find: there is no correction route in `App.tsx` and no nav entry. Record that
  as the finding rather than as a session failure.
- **The added deliveries are permanent.** No endpoint deletes a delivery or a
  submission; a correction supersedes a revision but never removes it, and there
  is no reviewer or administrator route that undoes an accepted direct
  submission. The only reset is a database restore or reseed. This is the whole
  reason the target must be chosen deliberately: the four deliveries stay for
  good, at a phantom over 900, adding 12 runs (10 after the correction) to the
  innings and distorting the bowler's overs-bowled figure. On a real historical
  match that means its scorecard permanently stops matching the published
  record. Record in the session notes which fixture was used and what its
  delivery count and innings total moved from and to, so a later reader is not
  surprised by it.
- **`overNumber` is 900 by design.** Live rows are unique on
  `(innings_id, over_number, position_in_over)` and on
  `(innings_id, innings_sequence)`
  (`database/migrations/20260806150357535_delivery-event-schema.sql:329-335`), so
  the package must not land on coordinates the innings already uses. Over 900 and
  sequences 9001-9004 are free in any real innings of any format and make the
  test deliveries obvious in an event list. The trade-off is that the bowler's
  overs-bowled figure becomes nonsensical for that innings; the striker's runs
  are the clean observable. `ballNumber` runs `900.1`-`900.4` to match, which
  keeps the event picker readable and satisfies the printed-ball progression rule
  (all four deliveries are legal, so each printed ball advances by one).
- **The event UUIDs are single-use.** `source_event_id` is globally unique and
  replay detection rejects a reused one with `EVENT_CONFLICT`. To run the session
  again, regenerate them with `randomUUID()`.

## Validation record

On 2026-09-28, with placeholders substituted for throwaway numeric identifiers,
`validate.js` reported the package **VALID against `submissionRequestSchema`
(schemaVersion 1.0)** and **VALID against `validateCricketBusinessRules` (no
violations)** for all four events. The intended correction (off-bat 6 to 4 with a
reason) was separately checked against `correctionRequestSchema` and is valid.

Eight deliberate mutations were each correctly rejected, confirming both gates
are live rather than vacuously passing:

| Mutation                               | Rejected by                       |
| -------------------------------------- | --------------------------------- |
| Striker equals non-striker             | `submissionRequestSchema`         |
| Total not equal to off-bat plus extras | `submissionRequestSchema`         |
| Duplicate `eventId`                    | `submissionRequestSchema`         |
| Duplicate position in over             | `submissionRequestSchema`         |
| Non-ascending sequence                 | `submissionRequestSchema`         |
| Unrecognised key under `runs`          | `submissionRequestSchema`         |
| Ball 3 relabelled `900.7`              | `BALL_NUMBER_PROGRESSION_INVALID` |
| Bowler placed on the batting team      | `BOWLER_TEAM_INVALID`             |

These are contract and cricket-rule checks only. They cannot confirm that the
substituted identifiers exist in the target fixture, that the players are in its
squad, or that the coordinates are free — the server decides those, and Step 1 is
the guard.

No credential, key, token, participant personal information or mutable production
identifier appears in this package.

## AI Declaration

This package was generated with the assistance of Claude-Code[Claude Opus 5].
