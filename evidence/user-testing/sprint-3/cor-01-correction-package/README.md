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

**Recommended fixture: an issue #708 onboarding-test fixture — Argentina v
Austria — and specifically its second innings.**

These deliveries cannot be removed afterwards (see the limitations below), so the
target should be a fixture that is already synthetic. The #708 packages in
`evidence/validation/issue-708/` each created one: every record they introduce is
fictional and prefixed `onboarding-test-`, and each fixture is published with two
innings and five deliveries.

| Package                              | Fixture date | Season                 |
| ------------------------------------ | ------------ | ---------------------- |
| `onboarding-test-package.json`       | 2031-03-14   | `onboarding-test-2031` |
| `onboarding-test-package-rerun.json` | 2032-04-18   | `onboarding-test-2032` |
| `onboarding-test-package-run-3.json` | 2033-05-22   | `onboarding-test-2033` |

Prefer the **2031** fixture: its onboarding run is complete and written up in
`evidence/validation/issue-708/deployed-acceptance-2026-09-25.md`, so nothing
further depends on its live delivery count. Only a fixture whose onboarding
journey actually completed is usable — an unrun package has no fixture on the
deployed build at all, and burning one of those to make a COR-01 target wastes a
single-use onboarding scenario.

**Use innings 2, not innings 1.** Innings 1 cannot satisfy the server's rules:
its non-striker `onboarding-test-Sipho-Dlamini` is deliberately on
`onboarding-test-Unlisted-Wanderers` rather than the batting team, which is the
`team_not_recognised` case #708 exists to test, and it holds only one genuine
Argentina batter — so it cannot supply two distinct batters on the batting side.
Innings 2 is clean in all three packages:

| Role        | Participant                      | Team                |
| ----------- | -------------------------------- | ------------------- |
| Batting     | —                                | Austria             |
| Striker     | `onboarding-test-Lerato-Khumalo` | Austria             |
| Non-striker | `onboarding-test-Thandi-Mokoena` | Austria             |
| Bowler      | `onboarding-test-Priya-Naicker`  | Argentina (bowling) |

Innings 2 also makes the correction unusually legible. It currently holds two
deliveries worth **2 runs**. This package adds 1 + 2 + 6 + 3 = **12**, taking it
to 14; correcting the six to a four takes it to **12**. Both movements are
visible at a glance, which they would not be inside a 132-run innings.

**Do not use the seeded reference match 729307.** Its published figures are the
validation baseline recorded in
`evidence/validation/729307-published-figures.md`; adding four synthetic
deliveries to it corrupts the fixture that evidence documents.

Then:

1. Browse to the fixture. Its URL is `/fixtures/{fixtureId}` — that path segment
   is the `fixtureId`.
2. Fetch its accepted events (anonymous, no key needed):

   ```http
   GET /api/v1/fixtures/{fixtureId}/events?limit=10
   ```

3. Find the two events whose `inningsOrdinal` is **2** — the ones batted by
   Austria. If they come back with resolved participant IDs, that alone proves
   what this package needs: the innings exists, the three players were onboarded,
   and they are in the fixture's squad on the right sides.
4. From **one** of those two events, copy four values:

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
why all four values come from one delivery, and why innings 1 is excluded.

Two of the three innings-2 participants (`Lerato-Khumalo`, carrying an
identifier that names nobody, and `Priya-Naicker`, carrying none) reached the
platform only through a reviewer onboarding decision during the #708 run. Step 3
above is what confirms those decisions were made: if the events return their IDs,
they exist.

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

| Control                  | What to do                                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow                 | Choose **Advanced technical JSON**                                                                                                                                                                                                 |
| **Fixture**              | Select the chosen fixture. Options read `{startDate} — {home} v {away} — {competition}, {season} ({matchType})`, so the 2031 onboarding-test fixture appears as `2031-03-14 — Argentina v Austria — …, onboarding-test-2031 (T20)` |
| **Delivery events JSON** | Paste the entire filled-in contents of `events.json` — the bare `[ … ]` array, nothing around it                                                                                                                                   |
| Button                   | **Submit events**                                                                                                                                                                                                                  |

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
  the striker's runs each drop by 2. On the recommended 2031 fixture that is the
  Austria innings going 14 → 12, and `onboarding-test-Lerato-Khumalo` going
  14 → 12.

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
  reason Step 1 targets an already-synthetic `onboarding-test-` fixture: the
  four deliveries stay there for good, so they should land somewhere nothing
  real depends on. Record in the session notes which fixture was used and that
  its delivery count moved from five to nine, so a later reader of the #708
  acceptance evidence is not surprised by it.
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
