/**
 * The exact derived-statistic scopes whose inputs include a corrected delivery.
 *
 * Fixture statistics depend on every delivery in that fixture. Participant
 * aggregate statistics depend only on a delivery's striker and bowler; both the
 * previous and replacement roles are included because a correction may change
 * either identifier. This is intentionally a dependency map, not a cache: the
 * current API derives authoritative values from `delivery_current`.
 */
export type StatisticsRefreshScope = 'fixture' | 'season' | 'competition' | 'career';

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
