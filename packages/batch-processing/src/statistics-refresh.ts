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
  previousParticipantIds: readonly string[];
  resultingParticipantIds: readonly string[];
}

interface AggregateParticipantEvent {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  wickets: ReadonlyArray<{
    playerOutId: string;
    fielders: ReadonlyArray<{ participantId?: string | undefined }>;
  }>;
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
  const participantIds = [
    ...new Set([...input.previousParticipantIds, ...input.resultingParticipantIds]),
  ]
    .filter((participantId) => participantId.length > 0)
    .sort();

  for (const participantId of participantIds) {
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

  await executeQuery(
    executor,
    `
      WITH advanced AS (
        INSERT INTO fixture_statistics_cache_version (fixture_id, data_version, updated_at)
        SELECT fixture_id, 1, now()
        FROM unnest($1::bigint[]) AS source(fixture_id)
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
