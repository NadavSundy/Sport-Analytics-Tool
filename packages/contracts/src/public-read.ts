import { z } from 'zod';

import {
  apiDateSchema,
  apiIdentifierSchema,
  createCollectionResponseSchema,
  createResourceResponseSchema,
  paginationQuerySchema,
} from './api';

const filterTextSchema = z.string().trim().min(1);

export const competitionSchema = z.object({
  competitionId: apiIdentifierSchema,
  name: z.string().min(1),
});

export const seasonSchema = z.object({
  seasonId: apiIdentifierSchema,
  competitionId: apiIdentifierSchema,
  label: z.string().min(1),
});

export const fixtureSchema = z.object({
  fixtureId: apiIdentifierSchema,
  competitionId: apiIdentifierSchema.nullable(),
  seasonId: apiIdentifierSchema.nullable(),
  season: z.string().min(1),
  matchType: z.string().min(1),
  teamType: z.string().min(1),
  gender: z.string().min(1),
  ballsPerOver: z.number().int().positive(),
  scheduledOvers: z.number().int().positive().nullable(),
  startDate: apiDateSchema,
  endDate: apiDateSchema,
});

export const competitorSchema = z.object({
  competitorId: apiIdentifierSchema,
  name: z.string().min(1),
});

export const participantSchema = z.object({
  participantId: apiIdentifierSchema,
  displayName: z.string().min(1),
});

export const publicEventFielderSchema = z.object({
  participantId: apiIdentifierSchema.nullable(),
  isSubstitute: z.boolean(),
});

export const publicEventWicketSchema = z.object({
  wicketId: apiIdentifierSchema,
  kind: z.string().min(1),
  playerOutParticipantId: apiIdentifierSchema,
  fielders: z.array(publicEventFielderSchema),
});

export const publicEventSchema = z.object({
  eventId: apiIdentifierSchema,
  fixtureId: apiIdentifierSchema,
  inningsId: apiIdentifierSchema,
  inningsOrdinal: z.number().int().nonnegative(),
  sequenceNumber: z.number().int().positive(),
  overNumber: z.number().int().nonnegative(),
  positionInOver: z.number().int().nonnegative(),
  ballNumber: z.string().min(1),
  battingCompetitorId: apiIdentifierSchema,
  bowlingCompetitorId: apiIdentifierSchema.nullable(),
  strikerParticipantId: apiIdentifierSchema,
  nonStrikerParticipantId: apiIdentifierSchema,
  bowlerParticipantId: apiIdentifierSchema,
  runs: z.object({
    offBat: z.number().int().nonnegative(),
    extras: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    nonBoundary: z.boolean(),
  }),
  extras: z.object({
    wides: z.number().int().nonnegative().nullable(),
    noBalls: z.number().int().nonnegative().nullable(),
    byes: z.number().int().nonnegative().nullable(),
    legByes: z.number().int().nonnegative().nullable(),
    penalty: z.number().int().nonnegative().nullable(),
  }),
  wickets: z.array(publicEventWicketSchema),
});

export const statisticContributingEventSchema = z.object({
  eventId: apiIdentifierSchema,
  fixtureId: apiIdentifierSchema,
  inningsId: apiIdentifierSchema,
  inningsOrdinal: z.number().int().nonnegative(),
  sequenceNumber: z.number().int().positive(),
  strikerParticipantId: apiIdentifierSchema,
  bowlerParticipantId: apiIdentifierSchema,
  runs: z.object({
    offBat: z.number().int().nonnegative(),
    extras: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
  extras: z.object({
    wides: z.number().int().nonnegative().nullable(),
    noBalls: z.number().int().nonnegative().nullable(),
    byes: z.number().int().nonnegative().nullable(),
    legByes: z.number().int().nonnegative().nullable(),
    penalty: z.number().int().nonnegative().nullable(),
  }),
  nonBoundary: z.boolean(),
  bowlerWickets: z.number().int().nonnegative(),
});

const fixtureStatisticCommonSchema = z.object({
  statisticId: apiIdentifierSchema,
  fixtureId: apiIdentifierSchema,
  sourceEventCount: z.number().int().nonnegative(),
  contributingEvents: z.array(statisticContributingEventSchema).optional(),
});

export const inningsTeamStatisticSchema = fixtureStatisticCommonSchema.extend({
  scope: z.literal('innings'),
  statisticCode: z.literal('team_total'),
  inningsId: apiIdentifierSchema,
  inningsOrdinal: z.number().int().nonnegative(),
  competitorId: apiIdentifierSchema,
  metrics: z.object({
    deliveryRuns: z.number().int().nonnegative(),
    penaltyRuns: z.number().int().nonnegative(),
    totalRuns: z.number().int().nonnegative(),
  }),
});

export const participantFixtureStatisticSchema = fixtureStatisticCommonSchema.extend({
  scope: z.literal('participant'),
  statisticCode: z.literal('participant_fixture'),
  participantId: apiIdentifierSchema,
  competitorId: apiIdentifierSchema.nullable(),
  batting: z
    .object({
      runsScored: z.number().int().nonnegative(),
      ballsFaced: z.number().int().nonnegative(),
      strikeRate: z.number().nonnegative().nullable(),
      fours: z.number().int().nonnegative(),
      sixes: z.number().int().nonnegative(),
    })
    .nullable(),
  bowling: z
    .object({
      runsConceded: z.number().int().nonnegative(),
      legalBallsBowled: z.number().int().nonnegative(),
      oversBowled: z.string().regex(/^\d+\.\d+$/),
      economyRate: z.number().nonnegative().nullable(),
      wicketsTaken: z.number().int().nonnegative(),
    })
    .nullable(),
});

export const fixtureStatisticSchema = z.discriminatedUnion('scope', [
  inningsTeamStatisticSchema,
  participantFixtureStatisticSchema,
]);

export const fixtureStatisticsWarningSchema = z.object({
  code: z.enum([
    'SOURCE_DATA_INCOMPLETE',
    'NO_STANDARD_INNINGS',
    'NO_ACCEPTED_EVENTS',
    'INNINGS_WITHOUT_ACCEPTED_EVENTS',
    'PARTICIPANT_COMPETITOR_UNKNOWN',
  ]),
  message: z.string().min(1),
  inningsId: apiIdentifierSchema.optional(),
  participantId: apiIdentifierSchema.optional(),
  fields: z.array(z.string().min(1)).optional(),
});

export const fixtureOutcomeSchema = z.object({
  kind: z.enum(['won', 'tie', 'draw', 'no_result']),
  winnerCompetitorId: apiIdentifierSchema.nullable(),
  eliminatorCompetitorId: apiIdentifierSchema.nullable(),
  margin: z
    .object({
      type: z.enum(['runs', 'wickets']),
      value: z.number().int().nonnegative(),
    })
    .nullable(),
  method: z.string().min(1).nullable(),
  decidedByBowlOut: z.boolean(),
});

export const fixtureStatisticsSchema = z.object({
  fixtureId: apiIdentifierSchema,
  status: z.enum(['complete', 'partial']),
  scope: z.object({
    superOversIncluded: z.literal(false),
  }),
  outcome: fixtureOutcomeSchema,
  warnings: z.array(fixtureStatisticsWarningSchema),
  statistics: z.array(fixtureStatisticSchema),
});

export const competitionListQuerySchema = paginationQuerySchema.extend({
  name: filterTextSchema.optional(),
});

export const seasonListQuerySchema = paginationQuerySchema.extend({
  competitionId: apiIdentifierSchema.optional(),
});

export const fixtureListQuerySchema = paginationQuerySchema
  .extend({
    competitionId: apiIdentifierSchema.optional(),
    seasonId: apiIdentifierSchema.optional(),
    competitorId: apiIdentifierSchema.optional(),
    gender: filterTextSchema.optional(),
    startDateFrom: apiDateSchema.optional(),
    startDateTo: apiDateSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.startDateFrom && value.startDateTo && value.startDateFrom > value.startDateTo) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDateTo'],
        message: 'startDateTo must be on or after startDateFrom.',
      });
    }
  });

export const competitorListQuerySchema = paginationQuerySchema.extend({
  competitionId: apiIdentifierSchema.optional(),
  seasonId: apiIdentifierSchema.optional(),
  name: filterTextSchema.optional(),
});

export const participantListQuerySchema = paginationQuerySchema.extend({
  fixtureId: apiIdentifierSchema.optional(),
  competitorId: apiIdentifierSchema.optional(),
  name: filterTextSchema.optional(),
});

export const fixtureEventListQuerySchema = paginationQuerySchema.extend({
  inningsId: apiIdentifierSchema.optional(),
  competitorId: apiIdentifierSchema.optional(),
  participantId: apiIdentifierSchema.optional(),
  overNumber: z.coerce.number().int().nonnegative().max(32_767).optional(),
  wicketKind: filterTextSchema.optional(),
});

export const fixtureStatisticsQuerySchema = z.object({
  includeContributors: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const competitionResponseSchema = createResourceResponseSchema(competitionSchema);

export const competitionCollectionResponseSchema =
  createCollectionResponseSchema(competitionSchema);

export const seasonResponseSchema = createResourceResponseSchema(seasonSchema);

export const seasonCollectionResponseSchema = createCollectionResponseSchema(seasonSchema);

export const fixtureResponseSchema = createResourceResponseSchema(fixtureSchema);

export const fixtureCollectionResponseSchema = createCollectionResponseSchema(fixtureSchema);

export const competitorResponseSchema = createResourceResponseSchema(competitorSchema);

export const competitorCollectionResponseSchema = createCollectionResponseSchema(competitorSchema);

export const participantResponseSchema = createResourceResponseSchema(participantSchema);

export const participantCollectionResponseSchema =
  createCollectionResponseSchema(participantSchema);

export const publicEventResponseSchema = createResourceResponseSchema(publicEventSchema);

export const publicEventCollectionResponseSchema =
  createCollectionResponseSchema(publicEventSchema);

export const fixtureStatisticsResponseSchema =
  createResourceResponseSchema(fixtureStatisticsSchema);

export const fixtureStatisticResponseSchema = createResourceResponseSchema(fixtureStatisticSchema);

export type Competition = z.infer<typeof competitionSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type Fixture = z.infer<typeof fixtureSchema>;
export type Competitor = z.infer<typeof competitorSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type PublicEvent = z.infer<typeof publicEventSchema>;
export type StatisticContributingEvent = z.infer<typeof statisticContributingEventSchema>;
export type InningsTeamStatistic = z.infer<typeof inningsTeamStatisticSchema>;
export type ParticipantFixtureStatistic = z.infer<typeof participantFixtureStatisticSchema>;
export type FixtureStatistic = z.infer<typeof fixtureStatisticSchema>;
export type FixtureStatisticsWarning = z.infer<typeof fixtureStatisticsWarningSchema>;
export type FixtureOutcome = z.infer<typeof fixtureOutcomeSchema>;
export type FixtureStatistics = z.infer<typeof fixtureStatisticsSchema>;

export type CompetitionListQuery = z.infer<typeof competitionListQuerySchema>;
export type SeasonListQuery = z.infer<typeof seasonListQuerySchema>;
export type FixtureListQuery = z.infer<typeof fixtureListQuerySchema>;
export type CompetitorListQuery = z.infer<typeof competitorListQuerySchema>;
export type ParticipantListQuery = z.infer<typeof participantListQuerySchema>;
export type FixtureEventListQuery = z.infer<typeof fixtureEventListQuerySchema>;
export type FixtureStatisticsQuery = z.infer<typeof fixtureStatisticsQuerySchema>;
