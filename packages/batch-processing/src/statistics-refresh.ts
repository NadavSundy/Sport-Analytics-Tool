import { executeQuery, type QueryExecutor } from './database';

/**
 * The exact derived-statistic scopes whose inputs include a corrected delivery.
 *
 * Fixture statistics depend on every delivery in that fixture. Participant
 * aggregate statistics depend on every participant relationship represented by
 * a delivery: batters, bowler, dismissed players and identified fielders. Both
 * the previous and replacement roles are included because a correction may
 * change any of them. This is intentionally a dependency map, not a cache: the
 * current API derives authoritative values from `delivery_current`.
 *
 * Direct corrections in the API and batch corrections published by the worker
 * both use these functions, so the two write paths cannot disagree about which
 * scopes a correction affects.
 */
type StatisticsRefreshScope = 'fixture' | 'season' | 'competition' | 'career';

export interface StatisticsRefreshDependency {
  scope: StatisticsRefreshScope;
  fixtureId: string;
  participantId: string | null;
  competitionId: string | null;
  season: string | null;
}

export interface CorrectionStatisticsDependencyInput {
  fixtureId: string;
  competitionId: string | null;
  season: string | null;
  /** The correction's affected participants, from `affectedParticipantIds`. */
  participantIds: readonly string[];
}

export interface AggregateParticipantEvent {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  wickets: ReadonlyArray<{
    playerOutId: string;
    fielders: ReadonlyArray<{ participantId?: string | undefined }>;
  }>;
}

export interface AffectedParticipantInput {
  /**
   * Every delivery state the write adds or replaces: the submitted or published
   * events, or a correction's previous and replacement states.
   */
  events: readonly AggregateParticipantEvent[];
  /** Participants the write adds to a fixture squad. */
  squadParticipantIds?: readonly string[];
}

/** Stable participant identifiers whose aggregates consume one delivery. */
export function aggregateParticipantIds(event: AggregateParticipantEvent): string[] {
  return [
    ...new Set([
      event.strikerId,
      event.nonStrikerId,
      event.bowlerId,
      ...event.wickets.flatMap((wicket) => [
        wicket.playerOutId,
        ...wicket.fielders.flatMap((fielder) =>
          fielder.participantId === undefined ? [] : [fielder.participantId],
        ),
      ]),
    ]),
  ].sort();
}

/**
 * The participants whose season, competition and career aggregates a write can
 * change. This is the only definition of that set: every write path that
 * journals dependencies or advances participant statistics versions uses it.
 *
 * A participant is affected when a delivery state the write adds or replaces
 * names them as striker, non-striker, bowler, dismissed player or identified
 * fielder, or when the write adds them to a fixture squad, which changes their
 * appearances. The set is deliberately conservative: a named participant is
 * included even when they are not in that fixture's squad and so contribute no
 * figures, because a missing participant would leave a stale aggregate while an
 * extra one only costs a recomputation.
 */
export function affectedParticipantIds(input: AffectedParticipantInput): string[] {
  return [
    ...new Set([
      ...input.events.flatMap((event) => aggregateParticipantIds(event)),
      ...(input.squadParticipantIds ?? []),
    ]),
  ]
    .filter((participantId) => participantId.length > 0)
    .sort();
}

export function deriveCorrectionStatisticsDependencies(
  input: CorrectionStatisticsDependencyInput,
): StatisticsRefreshDependency[] {
  const dependencies: StatisticsRefreshDependency[] = [
    {
      scope: 'fixture',
      fixtureId: input.fixtureId,
      participantId: null,
      competitionId: input.competitionId,
      season: input.season,
    },
  ];
  for (const participantId of input.participantIds) {
    if (input.competitionId && input.season) {
      dependencies.push({
        scope: 'season',
        fixtureId: input.fixtureId,
        participantId,
        competitionId: input.competitionId,
        season: input.season,
      });
    }

    if (input.competitionId) {
      dependencies.push({
        scope: 'competition',
        fixtureId: input.fixtureId,
        participantId,
        competitionId: input.competitionId,
        season: null,
      });
    }

    dependencies.push({
      scope: 'career',
      fixtureId: input.fixtureId,
      participantId,
      competitionId: null,
      season: null,
    });
  }

  return dependencies;
}

/** Journals a correction's dependencies in the transaction that stores the revision. */
export async function recordStatisticsRefreshDependencies(
  executor: QueryExecutor,
  sourceEventId: string,
  revision: number,
  dependencies: readonly StatisticsRefreshDependency[],
): Promise<void> {
  for (const dependency of dependencies) {
    await executeQuery(
      executor,
      `
        INSERT INTO statistics_refresh_dependency (
          source_event_id,
          delivery_revision,
          fixture_id,
          scope,
          participant_id,
          competition_id,
          season
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
      `,
      [
        sourceEventId,
        revision,
        dependency.fixtureId,
        dependency.scope,
        dependency.participantId,
        dependency.competitionId,
        dependency.season,
      ],
    );
  }
}

/** Advances the authoritative version in the same transaction as an event write. */
export async function advanceFixtureStatisticsCacheVersions(
  executor: QueryExecutor,
  fixtureIds: readonly string[],
): Promise<void> {
  const uniqueFixtureIds = [...new Set(fixtureIds)];
  if (uniqueFixtureIds.length === 0) return;

  // Rows are upserted in identifier order, so concurrent writers touching
  // overlapping fixtures take their row locks in the same order.
  await executeQuery(
    executor,
    `
      WITH advanced AS (
        INSERT INTO fixture_statistics_cache_version (fixture_id, data_version, updated_at)
        SELECT fixture_id, 1, now()
        FROM unnest($1::bigint[]) AS source(fixture_id)
        ORDER BY fixture_id
        ON CONFLICT (fixture_id) DO UPDATE
        SET data_version = fixture_statistics_cache_version.data_version + 1,
            updated_at = now()
        RETURNING fixture_id
      )
      DELETE FROM fixture_statistics_cache cache
      USING advanced
      WHERE cache.fixture_id = advanced.fixture_id
    `,
    [uniqueFixtureIds],
  );
}

/**
 * Advances each participant's statistics data version in the same transaction
 * as the write that affects their aggregates. The upsert increments an existing
 * version, so concurrent writers never lose a bump, and it touches rows in
 * identifier order so overlapping writers lock them in the same order.
 */
export async function advanceParticipantStatisticsVersions(
  executor: QueryExecutor,
  participantIds: readonly string[],
): Promise<void> {
  const uniqueParticipantIds = [...new Set(participantIds)];
  if (uniqueParticipantIds.length === 0) return;

  await executeQuery(
    executor,
    `
      INSERT INTO participant_statistics_version (participant_id, data_version, updated_at)
      SELECT participant_id, 1, now()
      FROM unnest($1::bigint[]) AS source(participant_id)
      ORDER BY participant_id
      ON CONFLICT (participant_id) DO UPDATE
      SET data_version = participant_statistics_version.data_version + 1,
          updated_at = now()
    `,
    [uniqueParticipantIds],
  );
}

/**
 * Advances every statistics data version a write affects: fixture versions
 * first, then participant versions, each in identifier order. Each write path
 * calls this once per transaction, after its deliveries are stored, so every
 * writer acquires these row locks in one consistent order.
 */
export async function advanceStatisticsDataVersions(
  executor: QueryExecutor,
  affected: { fixtureIds: readonly string[]; participantIds: readonly string[] },
): Promise<void> {
  await advanceFixtureStatisticsCacheVersions(executor, affected.fixtureIds);
  await advanceParticipantStatisticsVersions(executor, affected.participantIds);
}
