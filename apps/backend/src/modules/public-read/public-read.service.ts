import type {
  Competition,
  CompetitionListQuery,
  Competitor,
  CompetitorListQuery,
  Fixture,
  FixtureEventListQuery,
  FixtureListQuery,
  Participant,
  ParticipantFixture,
  ParticipantFixtureListQuery,
  ParticipantListQuery,
  PublicEvent,
  Season,
  SeasonListQuery,
  FixtureStatisticsWarning,
} from '@sport-analytics/contracts';
import { z } from 'zod';

import {
  findCompetitionById,
  listCompetitions as listCompetitionRecords,
} from '../competitions/competition.repository';
import {
  findCompetitorById,
  listCompetitors as listCompetitorRecords,
} from '../competitors/competitor.repository';
import {
  createPublicEventRepository,
  type PublicEventRepository,
} from '../events/event.repository';
import {
  findFixtureById,
  listFixtures as listFixtureRecords,
  type FixtureRecord,
} from '../fixtures/fixture.repository';
import {
  findParticipantById,
  listCompetitorsForFixtures,
  listParticipantFixtures as listParticipantFixtureRecords,
  listParticipants as listParticipantRecords,
  type FixtureCompetitorRecord,
  type ParticipantFixtureListOptions,
  type ParticipantFixturePage,
  type ParticipantFixtureRecord,
  type ParticipantRecord,
} from '../participants/participant.repository';
import { findSeason, listSeasons as listSeasonRecords } from '../seasons/season.repository';
import { calculateRate, formatOvers } from '../statistics/fixture-statistics.metrics';
import { createCursor, InvalidCursorError, readCursor } from './cursor';
import { PublicReadInputError } from './public-read.errors';
import { createSeasonId, parseSeasonId } from './season-id';

const databaseIdSchema = z.string().regex(/^\d+$/);

const competitionCursorSchema = z.object({
  name: z.string(),
  competitionId: databaseIdSchema,
});

const seasonCursorSchema = z.object({
  competitionId: databaseIdSchema,
  label: z.string(),
});

const fixtureCursorSchema = z.object({
  startDate: z.string().date(),
  fixtureId: databaseIdSchema,
});

const competitorCursorSchema = z.object({
  name: z.string(),
  competitorId: databaseIdSchema,
});

const participantCursorSchema = z.object({
  displayName: z.string(),
  participantId: databaseIdSchema,
});

const participantFixtureCursorSchema = z.object({
  participantId: databaseIdSchema,
  startDate: z.string().date(),
  fixtureId: databaseIdSchema,
});

const eventCursorSchema = z.object({
  fixtureId: databaseIdSchema,
  inningsOrdinal: z.number().int().nonnegative(),
  sequenceNumber: z.number().int().positive(),
  eventId: databaseIdSchema,
});

export interface PublicReadService {
  listCompetitions(query: CompetitionListQuery): Promise<{
    data: Competition[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getCompetition(competitionId: string): Promise<Competition | null>;

  listSeasons(query: SeasonListQuery): Promise<{
    data: Season[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getSeason(seasonId: string): Promise<Season | null>;

  listFixtures(query: FixtureListQuery): Promise<{
    data: Fixture[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getFixture(fixtureId: string): Promise<Fixture | null>;

  listCompetitors(query: CompetitorListQuery): Promise<{
    data: Competitor[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getCompetitor(competitorId: string): Promise<Competitor | null>;

  listParticipants(query: ParticipantListQuery): Promise<{
    data: Participant[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getParticipant(participantId: string): Promise<Participant | null>;

  listParticipantFixtures(
    participantId: string,
    query: ParticipantFixtureListQuery,
  ): Promise<{
    data: ParticipantFixture[];
    pagination: {
      nextCursor: string | null;
    };
  } | null>;

  listFixtureEvents(
    fixtureId: string,
    query: FixtureEventListQuery,
  ): Promise<{
    data: PublicEvent[];
    pagination: {
      nextCursor: string | null;
    };
  } | null>;

  getFixtureEvent(fixtureId: string, eventId: string): Promise<PublicEvent | null>;
}

export interface ParticipantFixtureHistoryRepository {
  findParticipantById(participantId: string): Promise<ParticipantRecord | null>;
  listParticipantFixtures(options: ParticipantFixtureListOptions): Promise<ParticipantFixturePage>;
  listCompetitorsForFixtures(fixtureIds: string[]): Promise<FixtureCompetitorRecord[]>;
}

const defaultParticipantFixtureHistoryRepository: ParticipantFixtureHistoryRepository = {
  findParticipantById,
  listParticipantFixtures: listParticipantFixtureRecords,
  listCompetitorsForFixtures,
};

function isDatabaseId(value: string): boolean {
  return databaseIdSchema.safeParse(value).success;
}

function assertDatabaseFilter(value: string | undefined, field: string): void {
  if (value && !isDatabaseId(value)) {
    throw new PublicReadInputError('INVALID_FILTER', `${field} is invalid.`);
  }
}

function decodeCursor<T>(cursor: string | undefined, schema: z.ZodType<T>): T | undefined {
  try {
    return readCursor(cursor, schema);
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      throw new PublicReadInputError('INVALID_CURSOR', 'The pagination cursor is invalid.');
    }

    throw error;
  }
}

function createNextCursor<T>(
  hasMore: boolean,
  records: T[],
  toCursor: (record: T) => unknown,
): string | null {
  if (!hasMore || records.length === 0) {
    return null;
  }

  const finalRecord = records[records.length - 1]!;

  return createCursor(toCursor(finalRecord));
}

function mapFixture(record: FixtureRecord): Fixture {
  return {
    fixtureId: record.fixtureId,
    competitionId: record.competitionId,
    seasonId: record.competitionId
      ? createSeasonId({
          competitionId: record.competitionId,
          label: record.season,
        })
      : null,
    season: record.season,
    matchType: record.matchType,
    teamType: record.teamType,
    gender: record.gender,
    ballsPerOver: record.ballsPerOver,
    scheduledOvers: record.scheduledOvers,
    startDate: record.startDate,
    endDate: record.endDate,
  };
}

function requiredStatisticValue(value: number | null, field: string): number {
  if (value === null) {
    throw new Error(`Participant fixture statistic "${field}" was unexpectedly null.`);
  }

  return value;
}

function participantFixtureWarnings(record: ParticipantFixtureRecord): FixtureStatisticsWarning[] {
  const warnings: FixtureStatisticsWarning[] = [];

  if (record.missingFields.length > 0) {
    warnings.push({
      code: 'SOURCE_DATA_INCOMPLETE',
      message: 'The accepted source identifies fields that were unavailable.',
      fields: [...record.missingFields].sort(),
    });
  }

  if (record.standardInningsCount === 0) {
    warnings.push({
      code: 'NO_STANDARD_INNINGS',
      message: 'No non-super-over innings are available for derivation.',
    });
  }

  if (record.acceptedEventCount === 0) {
    warnings.push({
      code: 'NO_ACCEPTED_EVENTS',
      message: 'No accepted delivery events are available for derivation.',
    });
  }

  for (const inningsId of record.emptyStandardInningsIds) {
    warnings.push({
      code: 'INNINGS_WITHOUT_ACCEPTED_EVENTS',
      message: 'This innings has no accepted delivery events.',
      inningsId,
    });
  }

  return warnings;
}

function mapParticipantFixture(
  record: ParticipantFixtureRecord,
  competitors: FixtureCompetitorRecord[],
): ParticipantFixture {
  const warnings = participantFixtureWarnings(record);

  return {
    fixture: mapFixture(record),
    competitionName: record.competitionName,
    competitors: competitors.map(({ competitorId, name }) => ({ competitorId, name })),
    competitor: {
      competitorId: record.teamId,
      name: record.teamName,
    },
    role: record.role,
    statisticsStatus: warnings.length === 0 ? 'complete' : 'partial',
    statisticsWarnings: warnings,
    batting:
      record.runsScored === null
        ? null
        : {
            runsScored: record.runsScored,
            ballsFaced: requiredStatisticValue(record.ballsFaced, 'ballsFaced'),
            fours: requiredStatisticValue(record.fours, 'fours'),
            sixes: requiredStatisticValue(record.sixes, 'sixes'),
            strikeRate: calculateRate(
              record.runsScored,
              requiredStatisticValue(record.ballsFaced, 'ballsFaced'),
              100,
            ),
          },
    bowling:
      record.runsConceded === null
        ? null
        : {
            runsConceded: record.runsConceded,
            legalBallsBowled: requiredStatisticValue(record.legalBallsBowled, 'legalBallsBowled'),
            oversBowled: formatOvers(
              requiredStatisticValue(record.legalBallsBowled, 'legalBallsBowled'),
              record.ballsPerOver,
            ),
            wicketsTaken: requiredStatisticValue(record.wicketsTaken, 'wicketsTaken'),
            economyRate: calculateRate(
              record.runsConceded,
              requiredStatisticValue(record.legalBallsBowled, 'legalBallsBowled'),
              record.ballsPerOver,
            ),
          },
  };
}

function resolveSeasonFilter(
  seasonId: string | undefined,
  competitionId: string | undefined,
): {
  competitionId: string | undefined;
  season: string | undefined;
} {
  if (!seasonId) {
    return {
      competitionId,
      season: undefined,
    };
  }

  const identity = parseSeasonId(seasonId);

  if (!identity || !isDatabaseId(identity.competitionId)) {
    throw new PublicReadInputError('INVALID_FILTER', 'seasonId is invalid.');
  }

  if (competitionId && competitionId !== identity.competitionId) {
    throw new PublicReadInputError('INVALID_FILTER', 'competitionId does not match seasonId.');
  }

  return {
    competitionId: identity.competitionId,
    season: identity.label,
  };
}

export function createPublicReadService(
  eventRepository: PublicEventRepository = createPublicEventRepository(),
  participantFixtureHistoryRepository: ParticipantFixtureHistoryRepository = defaultParticipantFixtureHistoryRepository,
): PublicReadService {
  return {
    async listCompetitions(query) {
      const after = decodeCursor(query.cursor, competitionCursorSchema);

      const page = await listCompetitionRecords({
        limit: query.limit,
        ...(query.name !== undefined ? { name: query.name } : {}),
        ...(after !== undefined ? { after } : {}),
      });

      return {
        data: page.records,
        pagination: {
          nextCursor: createNextCursor(page.hasMore, page.records, (record) => ({
            name: record.name,
            competitionId: record.competitionId,
          })),
        },
      };
    },

    async getCompetition(competitionId) {
      if (!isDatabaseId(competitionId)) {
        return null;
      }

      return findCompetitionById(competitionId);
    },

    async listSeasons(query) {
      assertDatabaseFilter(query.competitionId, 'competitionId');

      const after = decodeCursor(query.cursor, seasonCursorSchema);

      const page = await listSeasonRecords({
        limit: query.limit,
        ...(query.competitionId !== undefined ? { competitionId: query.competitionId } : {}),
        ...(after !== undefined ? { after } : {}),
      });

      const data: Season[] = page.records.map((record) => ({
        seasonId: createSeasonId({
          competitionId: record.competitionId,
          label: record.label,
        }),
        competitionId: record.competitionId,
        label: record.label,
      }));

      return {
        data,
        pagination: {
          nextCursor: createNextCursor(page.hasMore, page.records, (record) => ({
            competitionId: record.competitionId,
            label: record.label,
          })),
        },
      };
    },

    async getSeason(seasonId) {
      const identity = parseSeasonId(seasonId);

      if (!identity || !isDatabaseId(identity.competitionId)) {
        return null;
      }

      const record = await findSeason(identity.competitionId, identity.label);

      if (!record) {
        return null;
      }

      return {
        seasonId,
        competitionId: record.competitionId,
        label: record.label,
      };
    },

    async listFixtures(query) {
      assertDatabaseFilter(query.competitionId, 'competitionId');
      assertDatabaseFilter(query.competitorId, 'competitorId');

      const seasonFilter = resolveSeasonFilter(query.seasonId, query.competitionId);

      const after = decodeCursor(query.cursor, fixtureCursorSchema);

      const page = await listFixtureRecords({
        limit: query.limit,
        ...(seasonFilter.competitionId !== undefined
          ? {
              competitionId: seasonFilter.competitionId,
            }
          : {}),
        ...(seasonFilter.season !== undefined ? { season: seasonFilter.season } : {}),
        ...(query.competitorId !== undefined ? { competitorId: query.competitorId } : {}),
        ...(query.gender !== undefined ? { gender: query.gender } : {}),
        ...(query.startDateFrom !== undefined ? { startDateFrom: query.startDateFrom } : {}),
        ...(query.startDateTo !== undefined ? { startDateTo: query.startDateTo } : {}),
        ...(after !== undefined ? { after } : {}),
      });

      return {
        data: page.records.map(mapFixture),
        pagination: {
          nextCursor: createNextCursor(page.hasMore, page.records, (record) => ({
            startDate: record.startDate,
            fixtureId: record.fixtureId,
          })),
        },
      };
    },

    async getFixture(fixtureId) {
      if (!isDatabaseId(fixtureId)) {
        return null;
      }

      const record = await findFixtureById(fixtureId);

      return record ? mapFixture(record) : null;
    },

    async listCompetitors(query) {
      assertDatabaseFilter(query.competitionId, 'competitionId');

      const seasonFilter = resolveSeasonFilter(query.seasonId, query.competitionId);

      const after = decodeCursor(query.cursor, competitorCursorSchema);

      const page = await listCompetitorRecords({
        limit: query.limit,
        ...(seasonFilter.competitionId !== undefined
          ? {
              competitionId: seasonFilter.competitionId,
            }
          : {}),
        ...(seasonFilter.season !== undefined ? { season: seasonFilter.season } : {}),
        ...(query.name !== undefined ? { name: query.name } : {}),
        ...(after !== undefined ? { after } : {}),
      });

      return {
        data: page.records,
        pagination: {
          nextCursor: createNextCursor(page.hasMore, page.records, (record) => ({
            name: record.name,
            competitorId: record.competitorId,
          })),
        },
      };
    },

    async getCompetitor(competitorId) {
      if (!isDatabaseId(competitorId)) {
        return null;
      }

      return findCompetitorById(competitorId);
    },

    async listParticipants(query) {
      assertDatabaseFilter(query.fixtureId, 'fixtureId');
      assertDatabaseFilter(query.competitorId, 'competitorId');

      const after = decodeCursor(query.cursor, participantCursorSchema);

      const page = await listParticipantRecords({
        limit: query.limit,
        ...(query.fixtureId !== undefined ? { fixtureId: query.fixtureId } : {}),
        ...(query.competitorId !== undefined ? { competitorId: query.competitorId } : {}),
        ...(query.name !== undefined ? { name: query.name } : {}),
        ...(after !== undefined ? { after } : {}),
      });

      return {
        data: page.records,
        pagination: {
          nextCursor: createNextCursor(page.hasMore, page.records, (record) => ({
            displayName: record.displayName,
            participantId: record.participantId,
          })),
        },
      };
    },

    async getParticipant(participantId) {
      if (!isDatabaseId(participantId)) {
        return null;
      }

      return findParticipantById(participantId);
    },

    async listParticipantFixtures(participantId, query) {
      if (!isDatabaseId(participantId)) {
        return null;
      }

      const after = decodeCursor(query.cursor, participantFixtureCursorSchema);
      if (after && after.participantId !== participantId) {
        throw new PublicReadInputError(
          'INVALID_CURSOR',
          'The pagination cursor does not belong to this participant.',
        );
      }

      const [participant, page] = await Promise.all([
        participantFixtureHistoryRepository.findParticipantById(participantId),
        participantFixtureHistoryRepository.listParticipantFixtures({
          participantId,
          limit: query.limit,
          ...(after !== undefined
            ? {
                after: {
                  startDate: after.startDate,
                  fixtureId: after.fixtureId,
                },
              }
            : {}),
        }),
      ]);

      if (!participant) {
        return null;
      }

      const competitors = await participantFixtureHistoryRepository.listCompetitorsForFixtures(
        page.records.map((record) => record.fixtureId),
      );
      const competitorsByFixture = new Map<string, FixtureCompetitorRecord[]>();
      for (const competitor of competitors) {
        const fixtureCompetitors = competitorsByFixture.get(competitor.fixtureId) ?? [];
        fixtureCompetitors.push(competitor);
        competitorsByFixture.set(competitor.fixtureId, fixtureCompetitors);
      }

      return {
        data: page.records.map((record) =>
          mapParticipantFixture(record, competitorsByFixture.get(record.fixtureId) ?? []),
        ),
        pagination: {
          nextCursor: createNextCursor(page.hasMore, page.records, (record) => ({
            participantId,
            startDate: record.startDate,
            fixtureId: record.fixtureId,
          })),
        },
      };
    },

    async listFixtureEvents(fixtureId, query) {
      if (!isDatabaseId(fixtureId)) {
        return null;
      }

      assertDatabaseFilter(query.inningsId, 'inningsId');
      assertDatabaseFilter(query.competitorId, 'competitorId');
      assertDatabaseFilter(query.participantId, 'participantId');

      const fixtureExists = await eventRepository.fixtureExists(fixtureId);
      if (!fixtureExists) {
        return null;
      }

      const after = decodeCursor(query.cursor, eventCursorSchema);
      if (after && after.fixtureId !== fixtureId) {
        throw new PublicReadInputError(
          'INVALID_CURSOR',
          'The pagination cursor does not belong to this fixture.',
        );
      }

      const page = await eventRepository.listAcceptedFixtureEvents({
        fixtureId,
        limit: query.limit,
        ...(query.inningsId !== undefined ? { inningsId: query.inningsId } : {}),
        ...(query.competitorId !== undefined ? { competitorId: query.competitorId } : {}),
        ...(query.participantId !== undefined ? { participantId: query.participantId } : {}),
        ...(query.overNumber !== undefined ? { overNumber: query.overNumber } : {}),
        ...(query.wicketKind !== undefined ? { wicketKind: query.wicketKind } : {}),
        ...(after !== undefined
          ? {
              after: {
                inningsOrdinal: after.inningsOrdinal,
                sequenceNumber: after.sequenceNumber,
                eventId: after.eventId,
              },
            }
          : {}),
      });

      return {
        data: page.records,
        pagination: {
          nextCursor: createNextCursor(page.hasMore, page.records, (record) => ({
            fixtureId: record.fixtureId,
            inningsOrdinal: record.inningsOrdinal,
            sequenceNumber: record.sequenceNumber,
            eventId: record.eventId,
          })),
        },
      };
    },

    async getFixtureEvent(fixtureId, eventId) {
      if (!isDatabaseId(fixtureId) || !isDatabaseId(eventId)) {
        return null;
      }

      return eventRepository.findAcceptedFixtureEvent(fixtureId, eventId);
    },
  };
}
