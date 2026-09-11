import { z } from 'zod';

import {
  apiDateSchema,
  apiIdentifierSchema,
  createCollectionResponseSchema,
  createResourceResponseSchema,
  paginationQuerySchema,
} from './api';

const filterTextSchema = z.string().trim().min(1);

// Basic exports are deliberately synchronous and capped. Larger or paginated
// dataset releases belong to the later asynchronous export work.
export const FIXTURE_EVENT_EXPORT_LIMIT = 100;

export const competitionSchema = z.object({
  competitionId: apiIdentifierSchema,
  name: z.string().min(1),
});

export const seasonSchema = z.object({
  seasonId: apiIdentifierSchema,
  competitionId: apiIdentifierSchema,
  competitionName: z.string().min(1),
  label: z.string().min(1),
});

export const fixtureCompetitorSummarySchema = z.object({
  competitorId: apiIdentifierSchema,
  name: z.string().min(1),
});

export const fixtureSchema = z.object({
  fixtureId: apiIdentifierSchema,
  competitionId: apiIdentifierSchema.nullable(),
  competitionName: z.string().min(1).nullable(),
  seasonId: apiIdentifierSchema.nullable(),
  season: z.string().min(1),
  seasonLabel: z.string().min(1),
  competitors: z.array(fixtureCompetitorSummarySchema),
  matchType: z.string().min(1),
  teamType: z.string().min(1),
  gender: z.string().min(1),
  ballsPerOver: z.number().int().positive(),
  scheduledOvers: z.number().int().positive().nullable(),
  startDate: apiDateSchema,
  endDate: apiDateSchema,
});

export const fixtureWeatherVenueSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1).nullable(),
});

export const weatherDataSchema = z.object({
  date: apiDateSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  temperatureMax: z.number().nullable(),
  temperatureMin: z.number().nullable(),
  precipitationSum: z.number().nonnegative().nullable(),
  windSpeedMax: z.number().nonnegative().nullable(),
});

export const fixtureWeatherSchema = z.discriminatedUnion('availability', [
  z.object({
    fixtureId: apiIdentifierSchema,
    date: apiDateSchema,
    availability: z.literal('available'),
    venue: fixtureWeatherVenueSchema,
    weather: weatherDataSchema,
  }),
  z.object({
    fixtureId: apiIdentifierSchema,
    date: apiDateSchema,
    availability: z.literal('unavailable'),
    reason: z.enum(['MISSING_VENUE', 'MISSING_COORDINATES', 'UNSUPPORTED_LOCATION']),
    venue: fixtureWeatherVenueSchema.nullable(),
    weather: z.null(),
  }),
]);

export const fixtureWeatherResponseSchema = createResourceResponseSchema(fixtureWeatherSchema);

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
  strikerParticipantName: z.string().min(1),
  bowlerParticipantId: apiIdentifierSchema,
  bowlerParticipantName: z.string().min(1),
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
  competitorName: z.string().min(1),
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
  participantName: z.string().min(1),
  competitorId: apiIdentifierSchema.nullable(),
  competitorName: z.string().min(1).nullable(),
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
  winnerCompetitorName: z.string().min(1).nullable(),
  eliminatorCompetitorId: apiIdentifierSchema.nullable(),
  eliminatorCompetitorName: z.string().min(1).nullable(),
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
  name: filterTextSchema.optional(),
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

const fixtureEventFilterQueryShape = {
  inningsId: apiIdentifierSchema.optional(),
  competitorId: apiIdentifierSchema.optional(),
  participantId: apiIdentifierSchema.optional(),
  overNumber: z.coerce.number().int().nonnegative().max(32_767).optional(),
  wicketKind: filterTextSchema.optional(),
};

export const fixtureEventListQuerySchema = paginationQuerySchema.extend(
  fixtureEventFilterQueryShape,
);

// Exports intentionally accept the same event filters as the paginated read,
// but not cursor or limit: every export has the fixed Basic-tier row cap.
export const fixtureEventExportQuerySchema = z.object(fixtureEventFilterQueryShape).strict();

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

export const participantFixtureBattingSchema = z.object({
  runsScored: z.number().int().nonnegative(),
  ballsFaced: z.number().int().nonnegative(),
  fours: z.number().int().nonnegative(),
  sixes: z.number().int().nonnegative(),
  strikeRate: z.number().nonnegative().nullable(),
});

export const participantFixtureBowlingSchema = z.object({
  runsConceded: z.number().int().nonnegative(),
  legalBallsBowled: z.number().int().nonnegative(),
  oversBowled: z.string().regex(/^\d+\.\d+$/),
  wicketsTaken: z.number().int().nonnegative(),
  economyRate: z.number().nonnegative().nullable(),
});

export const participantFixtureSchema = z.object({
  fixture: fixtureSchema,
  // fixtureSchema carries the competition identifier but not its name, and no
  // competitors. Both are required for a readable player record, so they are
  // carried here rather than by widening fixtureSchema, which other responses
  // already depend on.
  competitionName: z.string().min(1).nullable(),
  competitors: z.array(competitorSchema),
  // The competitor the participant was selected for in this fixture.
  competitor: competitorSchema,
  role: z.string().min(1).nullable(),
  // These mirror the fixture-statistics publication state so a client can
  // distinguish a player who did not bat or bowl from a fixture whose accepted
  // source is incomplete or has no published delivery events.
  statisticsStatus: z.enum(['complete', 'partial']),
  statisticsWarnings: z.array(fixtureStatisticsWarningSchema),
  // Null where the participant was selected but did not bat, or did not bowl.
  // The fixture is still listed: selection is participation, and omitting it
  // would misrepresent a player's record.
  batting: participantFixtureBattingSchema.nullable(),
  bowling: participantFixtureBowlingSchema.nullable(),
});

export const participantFixtureListQuerySchema = paginationQuerySchema;

export const participantFixtureCollectionResponseSchema =
  createCollectionResponseSchema(participantFixtureSchema);

// ---------------------------------------------------------------------------
// Participant aggregates (season, competition and career)
//
// Issue #285. The catalogue in docs/requirements/sport-domain-definition.md §7
// names season aggregates (grouped by competition and season) and career
// aggregates (grouped across all seasons). Competition-wide is required by the
// issue but is not named as a level in §7; it is the same rollup grouped by
// competition alone, and §7 needs extending to record it.
//
// Every level excludes super-over innings, per §7 and issue #104, and groups by
// person identifier rather than display name: §10 records that names are not
// identity.
// ---------------------------------------------------------------------------

export const participantAggregateBattingSchema = z.object({
  runsScored: z.number().int().nonnegative(),
  ballsFaced: z.number().int().nonnegative(),
  fours: z.number().int().nonnegative(),
  sixes: z.number().int().nonnegative(),
  strikeRate: z.number().nonnegative().nullable(),
});

export const participantAggregateBowlingSchema = z.object({
  runsConceded: z.number().int().nonnegative(),
  legalBallsBowled: z.number().int().nonnegative(),
  wicketsTaken: z.number().int().nonnegative(),
  // Legal balls are counted from delivery rows. Overs and economy rate need a
  // balls-per-over divisor, which is a fixture-level fact: §10 forbids assuming
  // six. Where a group spans fixtures with different values there is no single
  // correct divisor, so both are null and MIXED_BALLS_PER_OVER is warned.
  ballsPerOver: z.number().int().positive().nullable(),
  oversBowled: z
    .string()
    .regex(/^\d+\.\d+$/)
    .nullable(),
  economyRate: z.number().nonnegative().nullable(),
});

const participantAggregateCommonSchema = z.object({
  statisticId: apiIdentifierSchema,
  participantId: apiIdentifierSchema,
  participantName: z.string().min(1),
  // Fixtures the participant actually appeared in as striker or bowler. This is
  // deliberately narrower than the fixture history at
  // /participants/{id}/fixtures, where participation is squad selection and a
  // player selected but not called upon still played.
  fixtureCount: z.number().int().nonnegative(),
  sourceEventCount: z.number().int().nonnegative(),
  // Null where the participant appears in no accepted delivery in this group as
  // a striker, or as a bowler, respectively. A zero is a real figure and is not
  // used to stand in for an absent one.
  batting: participantAggregateBattingSchema.nullable(),
  bowling: participantAggregateBowlingSchema.nullable(),
});

export const participantSeasonAggregateSchema = participantAggregateCommonSchema.extend({
  scope: z.literal('season'),
  statisticCode: z.literal('participant_season'),
  // Null for a fixture recorded without a competition. Season is stored as text
  // on the fixture and takes forms such as 2016/17, so it is never an integer.
  competitionId: apiIdentifierSchema.nullable(),
  competitionName: z.string().min(1).nullable(),
  seasonId: apiIdentifierSchema.nullable(),
  season: z.string().min(1),
});

export const participantCompetitionAggregateSchema = participantAggregateCommonSchema.extend({
  scope: z.literal('competition'),
  statisticCode: z.literal('participant_competition'),
  competitionId: apiIdentifierSchema.nullable(),
  competitionName: z.string().min(1).nullable(),
});

export const participantCareerAggregateSchema = participantAggregateCommonSchema.extend({
  scope: z.literal('career'),
  statisticCode: z.literal('participant_career'),
});

export const participantAggregateSchema = z.discriminatedUnion('scope', [
  participantSeasonAggregateSchema,
  participantCompetitionAggregateSchema,
  participantCareerAggregateSchema,
]);

export const participantAggregatesWarningSchema = z.object({
  code: z.enum(['NO_ACCEPTED_EVENTS', 'COMPETITION_UNKNOWN', 'MIXED_BALLS_PER_OVER']),
  message: z.string().min(1),
  competitionId: apiIdentifierSchema.optional(),
  season: z.string().min(1).optional(),
});

export const participantAggregatesSchema = z.object({
  participantId: apiIdentifierSchema,
  participantName: z.string().min(1),
  status: z.enum(['complete', 'partial']),
  scope: z.object({
    superOversIncluded: z.literal(false),
  }),
  warnings: z.array(participantAggregatesWarningSchema),
  statistics: z.array(participantAggregateSchema),
});

export const participantAggregateScopeSchema = z.enum(['season', 'competition', 'career']);

export const participantAggregatesQuerySchema = z.object({
  scope: participantAggregateScopeSchema.optional(),
});

export const participantAggregatesResponseSchema = createResourceResponseSchema(
  participantAggregatesSchema,
);

export const participantAggregateResponseSchema = createResourceResponseSchema(
  participantAggregateSchema,
);
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
export type FixtureWeather = z.infer<typeof fixtureWeatherSchema>;
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
export type FixtureEventExportQuery = z.infer<typeof fixtureEventExportQuerySchema>;
export type FixtureStatisticsQuery = z.infer<typeof fixtureStatisticsQuerySchema>;
export type ParticipantFixtureBatting = z.infer<typeof participantFixtureBattingSchema>;
export type ParticipantFixtureBowling = z.infer<typeof participantFixtureBowlingSchema>;
export type ParticipantFixture = z.infer<typeof participantFixtureSchema>;
export type ParticipantFixtureListQuery = z.infer<typeof participantFixtureListQuerySchema>;
export type ParticipantFixtureCollectionResponse = z.infer<
  typeof participantFixtureCollectionResponseSchema
>;

export type ParticipantAggregateBatting = z.infer<typeof participantAggregateBattingSchema>;
export type ParticipantAggregateBowling = z.infer<typeof participantAggregateBowlingSchema>;
export type ParticipantSeasonAggregate = z.infer<typeof participantSeasonAggregateSchema>;
export type ParticipantCompetitionAggregate = z.infer<typeof participantCompetitionAggregateSchema>;
export type ParticipantCareerAggregate = z.infer<typeof participantCareerAggregateSchema>;
export type ParticipantAggregate = z.infer<typeof participantAggregateSchema>;
export type ParticipantAggregatesWarning = z.infer<typeof participantAggregatesWarningSchema>;
export type ParticipantAggregates = z.infer<typeof participantAggregatesSchema>;
export type ParticipantAggregateScope = z.infer<typeof participantAggregateScopeSchema>;
export type ParticipantAggregatesQuery = z.infer<typeof participantAggregatesQuerySchema>;
