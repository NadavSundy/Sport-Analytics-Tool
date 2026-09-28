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

**Recommended fixture:** the seeded reference match **729307** — Kolkata Knight
Riders v Kings XI Punjab, 26 April 2014, IPL 2014, T20
(`database/seeds/matches/729307.json`). Its expected figures are already
documented in `evidence/validation/729307-published-figures.md` (Kings XI Punjab
132/9 in 20 overs; KKR 109 all out in 18.2), so the facilitator knows what the
statistics should read before and after. Confirm it is present on the deployed
build; if the deployment is not seeded from `database/seeds/matches/`, any
existing fixture with accepted events works instead.

Then:

1. Browse to the fixture. Its URL is `/fixtures/{fixtureId}` — that path segment
   is the `fixtureId`.
2. Fetch one page of its accepted events (anonymous, no key needed):

   ```http
   GET /api/v1/fixtures/{fixtureId}/events?limit=5
   ```

3. From **one** returned event, copy four values:

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
team. Mixing IDs from different innings or fixtures fails these checks.

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

| Control                  | What to do                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workflow                 | Choose **Advanced technical JSON**                                                                                                                                                                     |
| **Fixture**              | Select the chosen fixture. Options read `{startDate} — {home} v {away} — {competition}, {season} ({matchType})`, so 729307 appears as `2014-04-26 — Kolkata Knight Riders v Kings XI Punjab — … (T20)` |
| **Delivery events JSON** | Paste the entire filled-in contents of `events.json` — the bare `[ … ]` array, nothing around it                                                                                                       |
| Button                   | **Submit events**                                                                                                                                                                                      |

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
  the striker's runs each drop by 2.

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
  submission; a correction supersedes a revision but never removes it. The only
  reset is a database restore or reseed. Using the 729307 reference fixture
  therefore leaves four synthetic deliveries in it. Prefer a disposable fixture
  where one exists.
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
