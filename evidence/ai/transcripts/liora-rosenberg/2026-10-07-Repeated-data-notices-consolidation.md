# Chat export: Issue #892, consolidating repeated player data notices

- **Date:** Wednesday 7 October 2026, 18:54–19:10 (Africa/Johannesburg)
- **Assistant:** Claude Opus 5.5 (Anthropic), with file and shell tools in a cloud workspace
- **Repository:** https://github.com/NadavSundy/Sport-Analytics-Tool.git, base `main` at `5110d63f`
- **Issue:** #892 `bug(frontend): consolidate repeated data notices across player career pages (non-blocking)`
- **Related issues:** #803 (testing), #869 (separate issue)

---

## 1. User request (18:54)

> https://github.com/NadavSundy/Sport-Analytics-Tool.git bug(frontend): consolidate repeated data notices across player career pages (non-blocking) #892
>
> *(Full issue #892 text was pasted. Its key points:)*
>
> - **Summary:** Player career pages repeat identical data-quality notices instead of one consolidated explanation. The concrete example is A Symonds (`/participants/136385`), which shows seven identical bullets reading "These fixtures are published without a competition." The reporter says most player pages are affected.
> - **Severity:** Low (S4), non-blocking. Readability follow-up from #803.
> - **Expected:** Show equivalent missing-competition warnings as one useful notice, optionally with a count or the affected seasons. Keep distinct warnings, scope information and the Partial data status.
> - **Acceptance criteria:**
>   - Consolidate equivalent notices in the shared player career view, with no player-specific workaround.
>   - Keep distinct conditions and their season/competition context.
>   - Keep career figures, aggregation scope and the Partial data status.
>   - Add regression tests for equivalent versus distinct notices.
>   - Verify A Symonds, other affected players and a complete-data player.
> - **Investigation notes:**
>   - `ParticipantAggregateView.tsx` renders each `aggregates.warnings` item as `warning.message` without its scope metadata.
>   - `participant-aggregates.derivation.ts` generates `COMPETITION_UNKNOWN` warnings that can carry a season.
>
> **"Give me a separate branch to solve this issue and try improve the performace"**

## 2. What the assistant did

### Investigation
1. Cloned the repository and created the branch `fix/892-consolidate-player-data-notices`.
2. Read `apps/frontend/src/features/statistics/ParticipantAggregateView.tsx`. It renders one `<li>` per warning, keyed by array index, and shows only `warning.message`.
3. Read the warning contract in `packages/contracts/src/public-read.ts`. Each warning has:
   - `code`: one of `NO_ACCEPTED_EVENTS`, `COMPETITION_UNKNOWN`, `MIXED_BALLS_PER_OVER`
   - `message`
   - optional `competitionId`
   - optional `season`
4. Read `apps/backend/src/modules/statistics/participant-aggregates.derivation.ts`.
   - **Root cause:** a `COMPETITION_UNKNOWN` warning is pushed for every competition-grouped row whose competition is null.
   - That means one warning for the competition level and one for each season level, all with the same message.
   - Seven bullets fits 1 competition row + 6 season rows. This was not checked against the live API.
   - `MIXED_BALLS_PER_OVER` is emitted per row in the same way.
5. Decided to fix this in the frontend only. The backend, the API contract and the stored aggregate snapshots (ADR-015) are untouched.

### Implementation
- **New file `apps/frontend/src/features/statistics/participantDataNotices.ts`**
  - Adds `consolidateParticipantWarnings(warnings, statistics)`, a pure function.
  - Warnings with the same `code` and `message` count as equivalent and merge into one notice. Notices keep the order in which they first appear.
  - Each notice keeps its distinct seasons, sorted naturally (`2005/06 … 2010`).
  - Each notice keeps its distinct competitions, resolved to published competition names from the statistics rows, with the id as a fallback.
  - Warnings with a different code or message stay as separate notices.
- **`ParticipantAggregateView.tsx`**
  - Adds a new `DataNotices` component. It renders one bullet per notice, plus scope lines such as "Seasons affected (6): …" and "Competition affected (1): …".
  - Notices are keyed by a stable key instead of the array index.
  - The Partial/Complete status badge and the career figures are unchanged.
- **Performance improvements in the same view**
  - The statistics are split into career, competition and season rows in one memoised pass, instead of three `find`/`filter` scans on every render.
  - Notice consolidation is memoised, so it only reruns when the data changes.
  - The scope tab list is a module-level constant instead of being rebuilt each render.
  - `CareerOverview` is wrapped in `React.memo`, so switching tabs no longer re-renders it.
  - These gains are small, because the main cost of the page is the network fetch.
- **`apps/frontend/src/styles.css`:** adds a `.statistics-warning__scope` style for the secondary scope line.
- **New tests in `apps/frontend/src/features/statistics/ParticipantDataNotices.test.tsx` (10 tests)**
  - Helper tests:
    - no notices for a complete-data player
    - merging the A Symonds shape (1 unscoped + 6 season warnings) into one notice
    - removing duplicate seasons
    - keeping distinct codes and messages separate
    - falling back to the competition id when no name is published
  - View tests:
    - A Symonds shows exactly one bullet with "Seasons affected (6): …"
    - the Partial data badge and career totals are preserved
    - distinct conditions render as separate notices with their context
    - a lone unscoped warning gets no invented scope text
    - a complete-data player shows no notices panel and "Complete data"

### Verification
- Built `@sport-analytics/contracts`, which the frontend tests need.
- Frontend test suite: **47 files, 476 tests, all passing**.
- `tsc --noEmit`, `eslint`, `prettier --check` and `knip` all pass for the changed files.

## 3. User interruption (18:59)

> **"yes but dont commit on my behalf, give me commit messages to do locally"**

### Assistant response
- **Undid the local commit:** a local commit had already been made. The assistant reverted it with `git reset --soft HEAD~1`, then unstaged everything. All changes are now uncommitted on the branch.
- **No push:** a push attempt had already failed because GitHub was not linked to the session, so nothing was pushed.
- **Exported a patch:** all changes were saved as `892-consolidate-player-data-notices.patch` and sent to the user.

### Apply locally
```bash
git checkout main && git pull
git checkout -b fix/892-consolidate-player-data-notices
git apply 892-consolidate-player-data-notices.patch
```

### Suggested commits
```bash
git add apps/frontend/src/features/statistics/participantDataNotices.ts
git commit -m "feat(frontend): add helper to consolidate equivalent participant warnings (#892)" \
  -m "Merge warnings sharing a code and message into one notice, keeping distinct seasons and competitions as scope context." \
  -m "Assisted-by: Claude Opus 5.5"

git add apps/frontend/src/features/statistics/ParticipantAggregateView.tsx apps/frontend/src/styles.css
git commit -m "fix(frontend): show one data notice per condition on player career pages (#892)" \
  -m "Replaces repeated identical bullets with a single notice listing affected seasons/competitions. Also partitions statistics in one memoised pass, memoises notice consolidation and CareerOverview, and hoists the static scope tabs." \
  -m "Refs #892, #803" -m "Assisted-by: Claude Opus 5.5"

git add apps/frontend/src/features/statistics/ParticipantDataNotices.test.tsx
git commit -m "test(frontend): cover equivalent vs distinct participant data notices (#892)" \
  -m "Assisted-by: Claude Opus 5.5"
```

### Follow-ups for the user
- CONTRIBUTING.md asks for an `Assisted-by` trailer, which is why it appears in each commit message.
- CONTRIBUTING.md also asks you to add a row to your own `evidence/ai/registers/<member>.csv`. This was not done.
- **Acceptance step still open:** after deployment, check A Symonds (`/participants/136385`), several other affected players and one complete-data player, then record the results on #892.

## 4. User request (19:10)

> **"since you chat export this chat can you make me a .md file"**

The assistant produced this file.

---

## Summary of changed files

| File | Change |
|---|---|
| `apps/frontend/src/features/statistics/participantDataNotices.ts` | New: pure consolidation helper |
| `apps/frontend/src/features/statistics/ParticipantAggregateView.tsx` | Renders consolidated notices with scope context; memoisation and single-pass partitioning |
| `apps/frontend/src/styles.css` | New `.statistics-warning__scope` style |
| `apps/frontend/src/features/statistics/ParticipantDataNotices.test.tsx` | New: 10 regression tests |

**Not changed:** the backend derivation, the API contract and the stored snapshots.

## AI declaration

The code, tests, patch and this record were drafted with the assistance of Claude Opus 5.5 (Anthropic). Nothing was committed or pushed by the assistant. Committing, pushing and opening the pull request are left to the user.
