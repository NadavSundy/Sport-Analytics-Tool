# Issue 803 — disposable local submitter/reviewer kit

Prepared on 7 October 2026 with Codex (GPT-6). The user confirmed that the subsequent authenticated upload, invalid-file recovery and publication testing was a real participant session. See the [screenshot evidence and observed results](evidence/2026-10-07-rehearsal/README.md). Record the supplied step-by-step assistance; completion does not establish unassisted Success outcomes.

## What is running

- App: <http://localhost:5183>
- API: <http://localhost:3083/api/v1>
- Worker: port 3084, consuming the local database outbox.
- PostgreSQL: **127.0.0.1:55483**, database **sport_analytics_803**.
- Competition: **LOCAL ONLY - Sprint 4 Disposable Cup**, ID 1.
- Fixture **1**: **7 October 2026**, S4 Local Lions vs S4 Local Eagles. Use for the valid-upload task.
- Fixture **2**: **8 October 2026**, same teams. Use for the invalid/recovery tasks.
- Season: **2026**, format T20, one empty innings per fixture.
- Synthetic players: S4 Local Striker, S4 Local Non-striker, S4 Local Bowler, S4 Local Fielder.

The launcher overrides the configured shared database for both backend and worker. Existing `.env` files stay untouched. Authentication still uses the configured Supabase identity provider; application roles, fixture data, submissions and publication are local. The app code is the current root checkout; record its commit with `git rev-parse HEAD`. This is not a claim that it matches the latest deployed build.

## JSON files

| File                | Target               | Expected result                                                                                                 |
| ------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `01-valid.json`     | Fixture 1, 7 October | Valid package; two events stage for review.                                                                     |
| `02-invalid.json`   | Fixture 2, 8 October | Unsupported `contractVersion` (`803-invalid`); error should identify the version. No deliveries should publish. |
| `03-corrected.json` | Fixture 2, 8 October | Restores version `1.0`; two events stage for review.                                                            |

Invalid and corrected packages share their package/event identities to model correction of the same attempted upload. The first valid package uses different identities and a different fixture, avoiding duplicate event slots. The two fixtures each contain a boundary for four runs on ball 0.1 and a caught wicket for zero runs on 0.2. After successful publication, each fixture should show **4 runs, 1 wicket, 2 legal balls** for the first innings. This is deliberately tiny synthetic data, not a complete match.

## Start or restart

From the repository root in PowerShell:

```powershell
node testing/user-testing/local-803/local-test-kit.mjs start
```

Leave that terminal running. Ctrl+C stops the kit. Restarting preserves database state; it does not clear submitted events. Use these dedicated ports, rather than launching the usual backend that points at the shared database.

The kit uses already-installed embedded PostgreSQL, migrations and local Node dependencies. Runtime database and object storage are in this folder's ignored `runtime/` directory.

## Facilitator setup — before the real session

1. In the configured Supabase project's **Authentication → URL Configuration**, ensure **Redirect URLs** allows `http://localhost:5183/**`. The app requests `/auth/callback` on its current origin, sometimes with a `returnTo` query. Keep the existing production Site URL and redirects. Open the local app at `http://localhost:5183` and sign in with the project's Google test identity. Visit the account page so the local application account is synchronized. Use a second test identity for reviewer testing where practical. Do not include credentials in evidence. If sign-in sends you to the deployed site, the local redirect allowance needs checking; the kit does not change provider settings. The app currently exposes Google sign-in, not an email/password fallback.
2. In a second terminal list the local account IDs:

   ```powershell
   node testing/user-testing/local-803/local-test-kit.mjs accounts
   ```

3. Grant roles to the correct IDs from that output (replace 1 and 2 with the actual IDs):

   ```powershell
   node testing/user-testing/local-803/local-test-kit.mjs grant 1 submitter
   node testing/user-testing/local-803/local-test-kit.mjs grant 2 admin
   ```

   These commands modify only this fixed local database. Submitter scope covers this disposable competition. Reload the account page to refresh the role. With one available test identity, change its local role between sessions and record that setup; do not claim two participants.

4. Run read-only preflight:

   ```powershell
   node testing/user-testing/local-803/verify.mjs
   ```

   This verifies JSON schemas, all real database references, empty event slots and HTTP availability. It was successfully run during preparation. It does **not** verify signed-in upload receipts, invalid-upload recovery, reviewer decisions or publication.

5. Privately rehearse valid receipt, invalid rejection, corrected recovery and reviewer publication on these disposable fixtures. Capture actual batch references and the expected states. If correction is blocked by a duplicate package/batch identity, follow the app's correction/replacement workflow and record it; do not treat replay as a new accepted upload.
6. Reset after rehearsal and recreate/regrant the accounts before the participant's independent attempt. Confirm event slots are empty again. Start the participant signed out.

## Submitter test sequence

For ordinary manual QA, the navigation sequence is:

1. Sign in; confirm account role is submitter and scope includes the disposable competition.
2. Open **Submit data / New submission**, select **Single fixture**, **Existing fixture**.
3. Select fixture 1 (7 October) and upload `01-valid.json`. Confirm receipt/batch ID and explain the pending review state. Receipt is not publication.
4. Select fixture 2 (8 October) and upload `02-invalid.json`. Record the exact error/status and whether it explains how to fix the version.
5. Correct the version to `1.0` or use `03-corrected.json`. Retry using the app's supported recovery path. Confirm receipt and subsequent validation state; retain batch ID.
6. Record dropdown scrolling and intermittent access-check behavior separately, linking #907 and #909 if reproduced. No failing task should be recorded as success merely because a reload/assistance made it work.

For formal issue #803 sessions, give the participant **one canonical task at a time**, not these navigation answers:

- AUTH-01, AUTH-02, SUB-01, SUB-02, SUB-03, SUB-04.
- Use the exact wording in `docs/testing/user-testing-task-bank.md` or `.worktrees/issue-803/testing/user-testing/SPRINT4_PARTICIPANT_TASKS.md`.
- Supply fixture/date and the relevant JSON when needed. Keep the corrected file with the facilitator until the recovery task; do not disclose the deliberate fault before the invalid task.
- Record anonymous participant ID, date, browser/build, task outcome, any assistance, difficulties/feedback, severity, resulting issues and retest needs in the existing Sprint 4 submitter-session template. The facilitator should not point to controls or coach a task into success.

## Reviewer test sequence

1. Use the local admin/reviewer test account.
2. Find the staged batch from fixture 1; inspect validation and resolved references.
3. Confirm both events are valid and references map to the intended disposable fixture/players.
4. Approve/publish the batch and wait for worker completion.
5. Verify the public fixture statistics show 4 runs, 1 wicket and 2 legal balls. Verify recovery fixture 2 independently if published.
6. Formal task IDs: AUTH-01, REV-01, REV-02, REV-04. Retain actual decision/publication status and batch IDs in the existing reviewer template.

## Reset for a fresh rehearsal or session

Stop the kit with Ctrl+C first (if Codex launched it, ask Codex to stop it). Then:

```powershell
node testing/user-testing/local-803/local-test-kit.mjs reset
node testing/user-testing/local-803/local-test-kit.mjs start
```

Reset drops only the fixed local `sport_analytics_803` database, after checking its disposable competition marker. The kit recreates schema and fixtures on start. Local roles must be granted again after sign-in. Authentication identities at Supabase are not deleted. Stored local objects are retained; fresh batch UUIDs keep them separate. Never run this reset while the kit/apps are still using the database.

## Completion boundary

This pack is technical preparation. The minimum three genuine final-stage sessions, feedback evaluation, important-fix retests and final summary are still required before #803 can close. Keep earlier testing rounds intact.

Supplemental [AI simulated public-user session](evidence/2026-10-07-ai-simulation/README.md): five public/API-discovery tasks completed through the browser, with screenshots and observations. This is separate from human participant evidence.
