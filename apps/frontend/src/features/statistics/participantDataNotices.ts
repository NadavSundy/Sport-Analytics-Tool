import type {
  ParticipantAggregate,
  ParticipantAggregatesWarning,
} from '@sport-analytics/contracts';

/**
 * One reader-facing data notice built from one or more equivalent backend warnings.
 *
 * The participant-aggregates derivation emits a warning per grouped row, so a
 * player whose fixtures carry no competition receives one identical
 * COMPETITION_UNKNOWN warning for the competition level and another for every
 * season (#892). Those warnings describe one condition seen at several scopes;
 * repeating the sentence tells the reader nothing about which scope each copy
 * refers to. Equivalent warnings (same code and message) are therefore merged
 * into one notice that keeps their distinguishing scope metadata, while warnings
 * with a different code or message stay separate notices.
 */
export interface ParticipantDataNotice {
  key: string;
  code: ParticipantAggregatesWarning['code'];
  message: string;
  /** Distinct seasons named by the merged warnings, in natural order. */
  seasons: string[];
  /** Distinct competitions named by the merged warnings, in natural order of name. */
  competitions: { competitionId: string; competitionName: string | null }[];
}

const naturalOrder = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function consolidateParticipantWarnings(
  warnings: readonly ParticipantAggregatesWarning[],
  statistics: readonly ParticipantAggregate[] = [],
): ParticipantDataNotice[] {
  if (warnings.length === 0) return [];

  const groups = new Map<
    string,
    {
      code: ParticipantAggregatesWarning['code'];
      message: string;
      seasons: Set<string>;
      competitionIds: Set<string>;
    }
  >();

  for (const warning of warnings) {
    // The NUL separator cannot appear in an enum code, so the key is unambiguous.
    const key = `${warning.code}\u0000${warning.message}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        code: warning.code,
        message: warning.message,
        seasons: new Set(),
        competitionIds: new Set(),
      };
      groups.set(key, group);
    }
    if (warning.season !== undefined) group.seasons.add(warning.season);
    if (warning.competitionId !== undefined) group.competitionIds.add(warning.competitionId);
  }

  // Competition names are only looked up when a notice actually names one.
  let competitionNames: Map<string, string> | undefined;
  const nameOf = (competitionId: string): string | null => {
    if (!competitionNames) {
      competitionNames = new Map();
      for (const statistic of statistics) {
        if (
          statistic.scope !== 'career' &&
          statistic.competitionId !== null &&
          statistic.competitionName !== null
        ) {
          competitionNames.set(statistic.competitionId, statistic.competitionName);
        }
      }
    }
    return competitionNames.get(competitionId) ?? null;
  };

  return Array.from(groups.entries(), ([key, group]) => ({
    key,
    code: group.code,
    message: group.message,
    seasons: Array.from(group.seasons).sort(naturalOrder.compare),
    competitions: Array.from(group.competitionIds, (competitionId) => ({
      competitionId,
      competitionName: nameOf(competitionId),
    })).sort((left, right) =>
      naturalOrder.compare(
        left.competitionName ?? left.competitionId,
        right.competitionName ?? right.competitionId,
      ),
    ),
  }));
}
