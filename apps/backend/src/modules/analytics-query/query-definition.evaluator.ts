import {
  type AnalyticsQueryDefinition,
  type LeaderboardQuery,
  type ParticipantAggregate,
  type ParticipantAggregateScope,
  type ParticipantAggregates,
  type QueryDefinitionCandidate,
  type QueryDefinitionEvaluation,
  type QueryDefinitionReference,
  type QueryDefinitionSource,
} from '@sport-analytics/contracts';

import { listCompetitions } from '../competitions/competition.repository';
import { listParticipants } from '../participants/participant.repository';
import { createSeasonId } from '../public-read/season-id';
import { listSeasons, findSeason } from '../seasons/season.repository';
import type { LeaderboardsService } from '../statistics/leaderboards.service';
import type { ParticipantAggregatesService } from '../statistics/participant-aggregates.service';
import { createQueryDefinitionVersion } from './query-definition-version';

/**
 * Answers a query definition from the statistics the platform already publishes.
 *
 * The evaluator computes nothing. It resolves each name hint to an identifier
 * through the existing parameterised repository reads, calls the service that
 * already answers that question, and reports the published resource unchanged
 * alongside the endpoint that returns it and the statistics inside it that
 * answer the question. No SQL is added here, and no statistic is recalculated:
 * a figure this returns is the same figure the public API returns, because it is
 * the same code path.
 *
 * Only a definition that fails the issue #811 contract is an error, and the
 * controller reports that. Everything else is an outcome: a question the
 * platform cannot pin to one entity, or cannot answer at all, was still
 * answered correctly by saying so.
 */

/** The published paths an evaluation delegates to. */
const LEADERBOARD_PATH = '/api/v1/statistics/leaderboards';

/**
 * How many matches one name search reads. Beyond this the matches cannot be
 * narrowed safely, because a second exact match may sit outside the page, so the
 * reference is reported ambiguous instead.
 */
const SEARCH_LIMIT = 25;

/** How many candidates an ambiguous outcome offers. */
const CANDIDATE_LIMIT = 5;

/**
 * The shortest surname worth searching on (issue #868).
 *
 * Below this the search stops being a surname search and becomes a substring
 * that matches most of the corpus: `"V K"` would fall back to `%K%`, match
 * thousands of people, and report five arbitrary candidates. Three characters
 * keeps "Kock", "Kohli" and "Dhoni" and rejects "K" and "de", and an honest
 * `entity_not_found` is better than five names picked at random.
 */
const MINIMUM_SURNAME_LENGTH = 3;

export interface QueryDefinitionNameResolver {
  findParticipantsByName(
    name: string,
    limit: number,
  ): Promise<{ records: { participantId: string; displayName: string }[]; totalRecords: number }>;
  findCompetitionsByName(
    name: string,
    limit: number,
  ): Promise<{ records: { competitionId: string; name: string }[]; hasMore: boolean }>;
  findSeasonExact(
    competitionId: string,
    label: string,
  ): Promise<{ competitionId: string; competitionName: string; label: string } | null>;
  findSeasonsByLabel(
    competitionId: string,
    label: string,
    limit: number,
  ): Promise<{ records: { competitionId: string; competitionName: string; label: string }[] }>;
}

export interface QueryDefinitionEvaluator {
  evaluate(definition: AnalyticsQueryDefinition): Promise<QueryDefinitionEvaluation>;
}

export interface QueryDefinitionEvaluatorDependencies {
  leaderboards: Pick<LeaderboardsService, 'getLeaderboard'>;
  participantAggregates: Pick<ParticipantAggregatesService, 'getParticipantAggregates'>;
  names?: QueryDefinitionNameResolver;
}

/** The repository reads the resolver uses, each already parameterised. */
const databaseNameResolver: QueryDefinitionNameResolver = {
  findParticipantsByName: (name, limit) => listParticipants({ limit, name }),
  findCompetitionsByName: (name, limit) => listCompetitions({ limit, name }),
  findSeasonExact: (competitionId, label) => findSeason(competitionId, label),
  findSeasonsByLabel: (competitionId, label, limit) =>
    listSeasons({ limit, competitionId, name: label }),
};

type Resolution<T> =
  | { status: 'resolved'; value: T }
  | { status: 'not_found' }
  | { status: 'ambiguous'; candidates: QueryDefinitionCandidate[] };

/**
 * Narrows a set of name matches to one entity.
 *
 * An exact case-insensitive match is preferred, so a complete name is not made
 * ambiguous by every longer name that contains it. Only when nothing matches
 * exactly do the partial matches decide.
 */
function narrow<T>(
  records: readonly T[],
  hint: string,
  displayNameOf: (record: T) => string,
  candidateOf: (record: T) => QueryDefinitionCandidate,
): Resolution<T> {
  const wanted = hint.trim().toLowerCase();
  const exact = records.filter((record) => displayNameOf(record).toLowerCase() === wanted);
  const pool = exact.length > 0 ? exact : records;

  if (pool.length === 0) {
    return { status: 'not_found' };
  }
  if (pool.length === 1) {
    return { status: 'resolved', value: pool[0]! };
  }

  return { status: 'ambiguous', candidates: pool.slice(0, CANDIDATE_LIMIT).map(candidateOf) };
}

/** Every match beyond one page is ambiguous; the candidates shown are the first few. */
function unnarrowable<T>(
  records: readonly T[],
  candidateOf: (record: T) => QueryDefinitionCandidate,
): Resolution<T> {
  return { status: 'ambiguous', candidates: records.slice(0, CANDIDATE_LIMIT).map(candidateOf) };
}

/**
 * The surname to fall back to, or null when there is nothing worth searching.
 *
 * Returns null for a single-token hint, because the first search already *was*
 * that token and repeating it would be a second round trip for the same rows,
 * and for a surname below the length floor.
 *
 * The last whitespace-separated token is the surname, which is also what makes
 * the lowercase particles work without special-casing them: the search is a
 * substring, so `"Quinton de Kock"` falls back to `"Kock"` and still matches
 * `"Q de Kock"`.
 */
function surnameOf(hint: string): string | null {
  const tokens = hint.trim().split(/\s+/);
  if (tokens.length < 2) {
    return null;
  }

  const surname = tokens[tokens.length - 1]!;
  return surname.length >= MINIMUM_SURNAME_LENGTH ? surname : null;
}

/**
 * Whether a display name could be the person the hint named.
 *
 * A surname search is a weaker claim than a name search, and this is what stops
 * it becoming a guess. `"Virat Kohli"` falling back to `"Kohli"` and finding one
 * `"V Kohli"` is almost certainly right, because the initial agrees.
 * `"Suresh Kohli"` finding the same row is almost certainly wrong, and without
 * this check it would be returned as the answer with nothing to show it was a
 * substitution.
 *
 * The comparison is the first letter of each and nothing more, because the hint
 * is a full name and the match is a scorecard name: the given name's initial is
 * the only part reliably comparable between the two. `"Mahendra Dhoni"` against
 * `"MS Dhoni"` agrees; `"Sachin Dhoni"` does not, because `S` is a middle
 * initial and matching it would resolve a different person's question.
 *
 * It is deliberately the leading initial rather than any of them, so both kinds
 * of mistake land on the safe outcome. A scorecard that orders initials
 * differently from the spoken name — `"Dinesh Karthik"` against `"KD Karthik"` —
 * disagrees here, and that is accepted: a disagreement is not treated as proof
 * of a wrong match, because the caller reports it as a single candidate to
 * confirm rather than as a miss. One extra confirmation is the right price for
 * never answering as somebody else.
 */
function initialAgrees(hint: string, displayName: string): boolean {
  const given = hint.trim().charAt(0).toLowerCase();

  return given !== '' && displayName.trim().charAt(0).toLowerCase() === given;
}

export function createQueryDefinitionEvaluator(
  dependencies: QueryDefinitionEvaluatorDependencies,
): QueryDefinitionEvaluator {
  const names = dependencies.names ?? databaseNameResolver;

  const participantCandidateOf = (record: { participantId: string; displayName: string }) => ({
    id: record.participantId,
    displayName: record.displayName,
  });

  /** One search for a participant name, narrowed the usual way. */
  async function searchParticipants(
    searched: string,
    hint: string,
  ): Promise<Resolution<{ participantId: string; displayName: string }>> {
    const page = await names.findParticipantsByName(searched, SEARCH_LIMIT);

    if (page.totalRecords > SEARCH_LIMIT) {
      return unnarrowable(page.records, participantCandidateOf);
    }

    return narrow(page.records, hint, (record) => record.displayName, participantCandidateOf);
  }

  /**
   * Resolves a player name, falling back to the surname when the name itself
   * finds nothing (issue #868).
   *
   * The prompt asks for scorecard names, so the first search usually succeeds.
   * The fallback is for when it does not: `"Virat Kohli"` searched whole matches
   * nothing, because the scorecard says `"V Kohli"`.
   *
   * It is the same parameterised read with a different bound value — no new SQL,
   * and `SEARCH_LIMIT` and `CANDIDATE_LIMIT` still govern — and it only ever runs
   * on the path that would otherwise have returned `entity_not_found`, so it
   * costs one extra round trip and only on a miss.
   *
   * A surname search that lands on exactly one person whose initial disagrees
   * with the hint is reported as a single candidate rather than resolved. That is
   * the whole point of the fallback being a fallback: it is allowed to suggest,
   * never to decide, so the reader is asked "did you mean this one" instead of
   * being handed figures for somebody else.
   */
  async function resolveParticipant(
    hint: string,
  ): Promise<Resolution<{ participantId: string; displayName: string }>> {
    const direct = await searchParticipants(hint, hint);
    if (direct.status !== 'not_found') {
      return direct;
    }

    const surname = surnameOf(hint);
    if (surname === null) {
      return direct;
    }

    const fallback = await searchParticipants(surname, surname);
    if (fallback.status !== 'resolved') {
      return fallback;
    }

    return initialAgrees(hint, fallback.value.displayName)
      ? fallback
      : { status: 'ambiguous', candidates: [participantCandidateOf(fallback.value)] };
  }

  async function resolveCompetition(
    hint: string,
  ): Promise<Resolution<{ competitionId: string; name: string }>> {
    const page = await names.findCompetitionsByName(hint, SEARCH_LIMIT);
    const candidateOf = (record: { competitionId: string; name: string }) => ({
      id: record.competitionId,
      displayName: record.name,
    });

    // The competition read reports only whether another page exists.
    if (page.hasMore) {
      return unnarrowable(page.records, candidateOf);
    }

    return narrow(page.records, hint, (record) => record.name, candidateOf);
  }

  /** A season is a resolved competition plus a label the competition actually has. */
  async function resolveSeason(
    competitionId: string,
    label: string,
  ): Promise<Resolution<{ competitionId: string; label: string }>> {
    const exact = await names.findSeasonExact(competitionId, label);
    if (exact) {
      return { status: 'resolved', value: { competitionId, label: exact.label } };
    }

    const page = await names.findSeasonsByLabel(competitionId, label, SEARCH_LIMIT);
    const resolution = narrow(
      page.records,
      label,
      (record) => record.label,
      (record) => ({ id: createSeasonId(record), displayName: record.label }),
    );

    return resolution.status === 'resolved'
      ? {
          status: 'resolved',
          value: { competitionId: resolution.value.competitionId, label: resolution.value.label },
        }
      : resolution;
  }

  function leaderboardEndpoint(query: LeaderboardQuery): string {
    const parameters = new URLSearchParams({
      scope: query.scope,
      ...(query.scope === 'season'
        ? { seasonId: query.seasonId }
        : { competitionId: query.competitionId }),
      metric: query.metric,
      limit: String(query.limit),
    });

    return `${LEADERBOARD_PATH}?${parameters.toString()}`;
  }

  function aggregatesEndpoint(participantId: string, scope: ParticipantAggregateScope): string {
    return `/api/v1/participants/${encodeURIComponent(participantId)}/statistics?scope=${scope}`;
  }

  /**
   * The statistics within a published aggregate response that answer the
   * question. The published endpoint takes no competition or season filter, so
   * the whole scope level is returned and this names the rows that match.
   */
  function answers(
    statistic: ParticipantAggregate,
    scope: ParticipantAggregateScope,
    competitionId: string | null,
    season: string | null,
  ): boolean {
    // Narrowed on the row's own discriminator rather than on the requested
    // scope, so each branch reads only the fields that level actually carries.
    if (scope === 'career') {
      return statistic.scope === 'career';
    }

    if (scope === 'competition') {
      return statistic.scope === 'competition' && statistic.competitionId === competitionId;
    }

    return (
      statistic.scope === 'season' &&
      statistic.competitionId === competitionId &&
      statistic.season === season
    );
  }

  function answeringStatisticIds(
    published: ParticipantAggregates,
    scope: ParticipantAggregateScope,
    competitionId: string | null,
    season: string | null,
  ): string[] {
    return published.statistics
      .filter((statistic) => answers(statistic, scope, competitionId, season))
      .map((statistic) => statistic.statisticId);
  }

  return {
    async evaluate(definition) {
      const definitionVersion = createQueryDefinitionVersion(definition);
      const common = { definitionVersion, definition } as const;

      const notFound = (
        reference: QueryDefinitionReference,
        nameHint: string,
      ): QueryDefinitionEvaluation => ({
        outcome: 'entity_not_found',
        ...common,
        reference,
        nameHint,
      });

      const ambiguous = (
        reference: QueryDefinitionReference,
        nameHint: string,
        candidates: QueryDefinitionCandidate[],
      ): QueryDefinitionEvaluation => ({
        outcome: 'entity_ambiguous',
        ...common,
        reference,
        nameHint,
        candidates: candidates.slice(0, CANDIDATE_LIMIT) as QueryDefinitionCandidate[],
      });

      if (definition.kind === 'unsupported') {
        return { outcome: 'unsupported', ...common, reason: definition.reason };
      }

      // The scope reference, shared by every answerable kind. The issue #811
      // contract guarantees the reference the scope names is present.
      let competitionId: string | null = null;
      let seasonLabel: string | null = null;
      let seasonId: string | null = null;
      let scopeReference: QueryDefinitionReference = 'competition';
      let scopeHint = '';

      if (definition.scope !== 'career') {
        const competitionHint =
          definition.scope === 'season'
            ? definition.season!.competitionName
            : definition.competition!.name;
        scopeReference = definition.scope === 'season' ? 'season' : 'competition';
        scopeHint =
          definition.scope === 'season' ? definition.season!.seasonLabel : competitionHint;

        const competition = await resolveCompetition(competitionHint);
        if (competition.status === 'not_found') return notFound('competition', competitionHint);
        if (competition.status === 'ambiguous') {
          return ambiguous('competition', competitionHint, competition.candidates);
        }
        competitionId = competition.value.competitionId;

        if (definition.scope === 'season') {
          const season = await resolveSeason(competitionId, definition.season!.seasonLabel);
          if (season.status === 'not_found') return notFound('season', scopeHint);
          if (season.status === 'ambiguous') {
            return ambiguous('season', scopeHint, season.candidates);
          }
          seasonLabel = season.value.label;
          seasonId = createSeasonId({ competitionId, label: seasonLabel });
        }
      }

      const resolvedScope = {
        competitionId,
        seasonId,
        season: seasonLabel,
      };

      if (definition.kind === 'leaderboard') {
        const query: LeaderboardQuery =
          definition.scope === 'season'
            ? {
                scope: 'season',
                seasonId: seasonId!,
                metric: definition.metric,
                limit: definition.limit,
              }
            : {
                scope: 'competition',
                competitionId: competitionId!,
                metric: definition.metric,
                limit: definition.limit,
              };

        const leaderboard = await dependencies.leaderboards.getLeaderboard(query);
        if (!leaderboard) {
          // The published endpoint answers 404 for a scope with nothing
          // published, so the scope is reported as not found rather than as an
          // empty ranking the platform never produced.
          return notFound(scopeReference, scopeHint);
        }

        return {
          outcome: 'answered',
          ...common,
          resolved: { participantIds: [], ...resolvedScope },
          // A published leaderboard carries no statistic identifier, so its
          // traceability is the endpoint and the resolved scope.
          sources: [{ endpoint: leaderboardEndpoint(query), statisticIds: [] }],
          result: leaderboard,
        };
      }

      const participantHints =
        definition.kind === 'participant_comparison'
          ? definition.participants.map((participant) => participant.name)
          : [definition.participant.name];
      const participantReferences: QueryDefinitionReference[] =
        definition.kind === 'participant_comparison'
          ? ['participants.0', 'participants.1']
          : ['participant'];

      const participantIds: string[] = [];
      for (const [index, hint] of participantHints.entries()) {
        const reference = participantReferences[index]!;
        const participant = await resolveParticipant(hint);

        if (participant.status === 'not_found') return notFound(reference, hint);
        if (participant.status === 'ambiguous') {
          return ambiguous(reference, hint, participant.candidates);
        }
        participantIds.push(participant.value.participantId);
      }

      const published: ParticipantAggregates[] = [];
      const sources: QueryDefinitionSource[] = [];

      for (const [index, participantId] of participantIds.entries()) {
        const aggregates = await dependencies.participantAggregates.getParticipantAggregates(
          participantId,
          { scope: definition.scope },
        );

        if (!aggregates) {
          return notFound(participantReferences[index]!, participantHints[index]!);
        }

        published.push(aggregates);
        sources.push({
          endpoint: aggregatesEndpoint(participantId, definition.scope),
          statisticIds: answeringStatisticIds(
            aggregates,
            definition.scope,
            competitionId,
            seasonLabel,
          ),
        });
      }

      return {
        outcome: 'answered',
        ...common,
        resolved: { participantIds, ...resolvedScope },
        sources: sources as QueryDefinitionSource[],
        result:
          definition.kind === 'participant_comparison'
            ? ([published[0]!, published[1]!] as [ParticipantAggregates, ParticipantAggregates])
            : published[0]!,
      };
    },
  };
}
