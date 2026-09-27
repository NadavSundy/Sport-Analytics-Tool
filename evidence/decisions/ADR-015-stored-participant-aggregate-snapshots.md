# ADR-015: Stored participant aggregates, served while current and refreshed on a read miss

- **Status:** Accepted, pending PR review
- **Date:** 2026-09-17
- **Participants:** Ben Swartz (approved the Phase 1 strategy, the storage split and the refresh model
  for issue #592)
- **Related issues:** #592, #286, #293, #599; ADR-009, ADR-010

## Context

Season, competition-wide and career aggregates were derived from `delivery_current` on every read.
The fixture statistics endpoint already had a per-fixture versioned cache (#293), but participant
aggregates had none, and `statistics_refresh_dependency` (#286) recorded the scopes a correction
affected without anything reading it. Issue #592 asks for an explicit storage strategy in which a
changed event identifies the affected fixture, season, competition and career scopes, only those
scopes are refreshed, corrections propagate, refresh is idempotent and retryable, and API results are
correct during and after a refresh.

The unit of computation matters. A participant's season, competition-wide and career rows come from
one grouped statement over all of that participant's deliveries. A career row changes whenever any
of the participant's fixtures does, so recomputing any affected scope for a participant costs the
whole statement. Recomputation per scope within one participant is therefore not available, and this
record never claims it.

**Selective**, used identically in this record, the documentation and the pull request, means: a
change recomputes each affected participant's query once and rewrites only the affected scope rows;
unaffected participants are not recomputed and their rows stay byte-identical.

## Decision

Adopt strategy C: store each participant's derived rows, keyed by a per-participant data version, and
serve them only while current. Pull requests 1 to 3 of #592 implement it.

### Affected participants and data versions

`participant_statistics_version` holds one monotonically increasing `data_version` per participant.
Direct submissions, direct corrections, batch publication chunks and Cricsheet ingest advance the
versions of the participants they affect in the same transaction as the write, with an incrementing
upsert in identifier order, fixture versions first. The affected set comes from one shared function,
`affectedParticipantIds`: everyone a delivery state the write adds or replaces names as striker,
non-striker, bowler, dismissed player or identified fielder, plus anyone the write adds to a fixture
squad. The set is deliberately conservative.

### Storage split: a state row and scope rows

- `participant_aggregate_snapshot_state`, one row per participant, records the `data_version` and
  `definition_version` the participant's stored rows were built from, a refresh count and failed
  refresh attempts. It vouches for the participant's complete set of scope rows.
- `participant_aggregate_snapshot`, one row per participant, level, competition and season, holds
  the grouped row as jsonb with the versions and refresh count of its last content write.

A single table of scope rows, each carrying the version it was built from, was rejected because its
rules contradict each other. Serving requires every row to carry the participant's current version,
while a selective refresh must leave rows whose figures did not change untouched. A correction that
changes a player's figures in one competition leaves their rows for another competition unchanged,
so those rows would keep an older version and the player would never be served again; rewriting
them to satisfy the read breaks selectivity. A single table also cannot record a participant whose
rows were built but empty.

### Read path

- Stored rows are served only when the participant has a `participant_statistics_version` row and the
  state row was built from that version under the running definition version.
- **A participant with no `participant_statistics_version` row is never served from, or written to,
  stored rows.** Their aggregates are always derived live.
- The definition version is the SHA-256 of a fixed prefix and the aggregate SQL text, including the
  shared classification fragments and the super-over predicate, so changing the calculation
  invalidates every stored row without a manual version bump.
- Otherwise the response is derived live exactly as before, and the stored rows are refreshed
  **synchronously on that read miss**, in the same request, from the rows just derived. The data
  version is read before the derivation, so rows that already include a later write are stored
  against the earlier version and never served.
- The refresh never makes a read wait. It takes a transaction-scoped advisory lease with
  `pg_try_advisory_xact_lock`, reads the version row `FOR SHARE NOWAIT` and the state row
  `FOR UPDATE NOWAIT`, and sets `lock_timeout` to 1 ms for every other lock. A held lease or lock, a
  failed write or a failed snapshot read leaves the live response unchanged; the next read retries.
- **There is no worker, poller or background refresh.** Refresh happens only on a read miss.

A response therefore reflects every tracked write committed before its snapshot read, whether it is
served from stored rows or derived live.

### Refresh

A refresh re-runs the unchanged derivation query once for a participant whose rows are not current,
and never for one whose rows are. In one transaction it advances the state row, inserts new scope
rows, rewrites only scope rows whose figures changed (each advancing its own refresh count), and
deletes scope rows that no longer exist. A scope row whose figures did not change keeps its bytes,
versions and refresh count. A failed refresh rolls back entirely, records an attempt and the last
error on the state row, and is retried by the next read.

### Consistency obligation for untracked writes

Stored rows stay correct only while every write to an aggregate input advances the affected
participants' versions. Submissions, corrections, batch publication and ingest do. **Any other write
to an input** (a data-rewriting migration, a seed that bypasses ingest, or a manual repair of
deliveries, wickets, fielders, squads, innings, fixtures, submissions, dismissal kinds or competition
names) **must invalidate stored rows in the same transaction** with
`SELECT invalidate_participant_aggregate_snapshots();` or, from TypeScript,
`invalidateParticipantAggregateSnapshots(executor)`. The function deletes every stored snapshot;
reads then derive live and rebuild them.

Existing data-rewriting migrations, including `20260913170000000_refresh-delivery-current-lineage`,
ran before the snapshot tables existed and cannot leave stale stored rows, so they need no action.
The committed seeds use ingest, which is tracked.

### Departure from ADR-010

ADR-010 routes recalculation after accepted events through a `background_job` row, the transactional
outbox and an idempotent worker. This decision does not. Participant aggregates are refreshed
synchronously inside the read that finds them stale, and `statistics_refresh_dependency` remains
correction evidence rather than a work queue. Reasons:

- a refresh per affected participant is bounded (one statement and one short transaction) and
  measured well inside the read target, which is ADR-010's own adoption gate for staying synchronous;
- a job per event would need an owner for system-triggered work, versioned idempotency keys in tables
  that can never be pruned, and would share the single batch queue with validation and publication;
- correctness would otherwise depend on a worker that local development and tests do not run, while
  the read path stays correct whether or not a refresh ever succeeds.

The cost is that the first read after a change pays for the derivation and the refresh write. If
measurements show that becomes unacceptable, a background refresh can be added later behind the same
store without changing the read rule.

## Alternatives considered

### A. Materialised aggregate tables refreshed in the write transaction

Readers would see new values the moment a write commits, but every submission and batch chunk would
run the aggregate statement for every affected participant inside its transaction, holding its locks
for the duration; the statement takes about 250 ms for the largest career in the measured corpus. A full backfill would be needed
before reads could use the tables, and any missed input would leave wrong values with no fallback.
Rejected.

### B. Per-participant versioned cache with a time-to-live

This generalises the fixture statistics cache: a version bumped with each write and a cache entry
keyed by that version, written back on a miss and expiring after a bounded time. It is correct and
needs no backfill, but refresh would only be observable through reads and expiry, so it could not
show that unaffected participants' stored rows are left untouched, and expiring entries would look
like refreshes. Strategy C keeps B's read rule and adds durable, individually counted scope rows.

## Advantages

- Reads for a participant whose rows are current are one statement, independent of career length.
- Correctness does not depend on a refresh succeeding: stored rows are used only when provably
  current, otherwise the live derivation answers as it always has.
- Selectivity is observable and tested: refresh counts, byte-identical rows for unaffected
  participants and unchanged scope rows, and recomputation only for affected participants.
- No backfill: an empty store behaves exactly like live derivation.

## Disadvantages

- The first read after a change pays for the live derivation plus a refresh write.
- Correctness of stored rows depends on every writer advancing versions, or invalidating; the
  obligation above must be honoured by future migrations and repairs.
- Recomputation granularity is a whole participant, not a scope.

## Consequences

- Fixture statistics keep their existing per-fixture version cache, unchanged apart from #592 PR 2's
  version bumps.
- `statistics_refresh_dependency` keeps journalling corrections only.
- Tests cover every write path, idempotency, retry, lease and lock behaviour, parity with live
  derivation for the reference fixtures, explicit zero extras and wide runs, and fail when the version
  check, the selective rewrite or the non-blocking guards are removed.

## Performance

Measured on 17 September 2026 on a Windows 11 host (Node 25.9.0, 12 logical CPUs, 16 GB, embedded
PostgreSQL 16.14 on the same host) with the generated 300-fixture, 72,000-delivery corpus. The
participant is `fictional-perf-player-1`, selected in all 300 fixtures, the largest career in the
corpus. Target: 1,500 ms warm P95.

### `npm run measure:performance`, before and after the benchmark fix

Before the fix the benchmark timed requests immediately after its bulk ingest, before any table had
planner statistics. One participant aggregate request in each run took minutes; the same happened on
`main` before #592 and at #592 PR 2
(`evidence/validation/issue-592-first-read-plans/`,
`evidence/validation/issue-592-performance-benchmark-before-analyze.md`).

| Operation             | Target P95 |      Before the fix, P50 / P95 | After the fix, P50 / P95 |
| --------------------- | ---------: | -----------------------------: | -----------------------: |
| public fixture page   |     500 ms |                  6.9 / 13.0 ms |            6.6 / 14.8 ms |
| fixture event page    |     750 ms |                 14.8 / 18.9 ms |           23.1 / 31.7 ms |
| fixture statistics    |   1,500 ms |                  2.5 / 40.9 ms |            5.6 / 45.2 ms |
| participant aggregate |   1,500 ms | 10.3 / **147,517.1 ms (fail)** |    3.9 / 257.3 ms (pass) |
| CSV event export      |   1,000 ms |               210.2 / 254.7 ms |           64.1 / 90.6 ms |

Before the fix: `evidence/validation/issue-592-performance-benchmark-before-analyze.md`. After the
fix: `evidence/validation/issue-592-performance-benchmark-after-analyze.md`. Each operation has 10
sequential samples, and its first sample is the first request after the load.

### `npm run measure:aggregate-snapshots`

Reads (20 samples each). Rows (b1), (b2) and the live-only reference are interleaved request by
request: the derivation they share varies between about 85 ms and 570 ms over tens of seconds on this
host, independently of which measurement runs, so consecutive blocks would compare moments rather
than work.

| Read                                                                      |     P50 |      P95 | Target P95 | Result |
| ------------------------------------------------------------------------- | ------: | -------: | ---------: | ------ |
| (a) served from a current snapshot                                        |  2.8 ms |   4.5 ms |   1,500 ms | pass   |
| (b1) read miss after a version advance, including the synchronous refresh | 94.2 ms | 121.2 ms |   1,500 ms | pass   |
| (b2) read miss with no stored rows, including the synchronous refresh     | 96.2 ms | 128.6 ms |   1,500 ms | pass   |
| Reference: live derivation only, never written                            | 89.4 ms | 139.0 ms |   1,500 ms | pass   |
| Fixture statistics                                                        |  3.2 ms |   3.8 ms |   1,500 ms | pass   |

Serving a current snapshot costs about 3 ms against about 90 ms for the derivation it replaces. A
read miss costs the derivation plus the refresh write, which measured 5-38 ms on its own.

Batch publication (1,000 deliveries per batch, chunks of 100, one transaction per chunk):

| Scenario                                      | Deliveries/s | Chunk P50 | Chunk P95 |
| --------------------------------------------- | -----------: | --------: | --------: |
| One batch                                     |        1,563 |   58.5 ms |  103.5 ms |
| Two concurrent batches, shared participants   |        2,578 |   71.2 ms |   76.3 ms |
| Two concurrent batches, disjoint participants |        2,635 |   68.5 ms |   91.7 ms |

Chunks that advance the same participant versions showed no material slowdown against disjoint
participants.

## Known limitations outside this decision

These need a team decision and are outside #592:

- **Participant reads can take minutes after importing or restoring into an empty or much smaller
  database, until the tables are analysed.** Without planner statistics the aggregate statement
  chooses nested loops; one request took 243 s in a reproduction and 450 ms after `ANALYZE`
  (`evidence/validation/issue-592-first-read-plans/`). Only the benchmark now runs `ANALYZE` after its
  load; import scripts and restore procedures are unchanged.
- **No `statement_timeout` is configured**, so a slow request holds one of the backend pool's ten
  connections until it finishes.

## Verification and review date

- **Tests:** database tests for each write path, a second refresh, a participant with a version but
  no fixture, a stored empty row set, a refresh failing partway and retried, a read while another
  session holds the lease or locks the version row, and parity with live derivation; mutation checks
  recorded in the #592 PR 3 description.
- **Review:** at PR review for #592, and again if refresh on read misses exceeds the read target or a
  background refresh is proposed.

## AI Declaration

The preceding decision record was drafted with the assistance of Claude-Code[Claude Opus 5].
