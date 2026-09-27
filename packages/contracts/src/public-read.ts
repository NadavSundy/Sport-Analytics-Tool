import { z } from 'zod';

import {
  apiDateSchema,
  apiIdentifierSchema,
  createCollectionResponseSchema,
  createResourceResponseSchema,
  MAX_PAGE_LIMIT,
  paginationQuerySchema,
} from './api';

const filterTextSchema = z.string().trim().min(1);

// Basic exports are synchronous and complete. Issue #467 found the export read a
// single page of 100 and discarded the cursor, so 85% of imported innings were
// exported short without any indication. An export now follows the event
// collection's cursor at the public maximum page size until it is exhausted.
export const FIXTURE_EVENT_EXPORT_PAGE_SIZE = MAX_PAGE_LIMIT;

// The bound that keeps a synchronous export finite. Reaching it fails the whole
// export with EXPORT_TOO_LARGE rather than returning a short file. The largest
// fixture in the imported corpus has 346 accepted events, so a filtered or
// single-fixture export does not approach it.
export const FIXTURE_EVENT_EXPORT_MAX_EVENTS = 5_000;

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

export const fixtureVenueSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1).nullable(),
});

export const fixtureTossSchema = z.object({
  winnerCompetitorId: apiIdentifierSchema.nullable(),
  winnerCompetitorName: z.string().min(1).nullable(),
  decision: z.enum(['bat', 'field']).nullable(),
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
  venue: fixtureVenueSchema.nullable(),
  toss: fixtureTossSchema.nullable(),
  startDate: apiDateSchema,
  endDate: apiDateSchema,
});

const fixtureWeatherVenueSchema = fixtureVenueSchema;

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
    reason: z.enum([
      'MISSING_VENUE',
      'MISSING_COORDINATES',
      'UNSUPPORTED_LOCATION',
      'LOCATION_NOT_FOUND',
      'UNSUPPORTED_DATE',
    ]),
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
  participantName: z.string().min(1).nullable(),
  isSubstitute: z.boolean(),
});

export const publicEventWicketSchema = z.object({
  wicketId: apiIdentifierSchema,
  kind: z.string().min(1),
  playerOutParticipantId: apiIdentifierSchema,
  playerOutParticipantName: z.string().min(1),
  fielders: z.array(publicEventFielderSchema),
});

export const publicEventSchema = z.object({
  eventId: apiIdentifierSchema,
  fixtureId: apiIdentifierSchema,
  competitionId: apiIdentifierSchema.nullable(),
  competitionName: z.string().min(1).nullable(),
  inningsId: apiIdentifierSchema,
  inningsOrdinal: z.number().int().nonnegative(),
  sequenceNumber: z.number().int().positive(),
  overNumber: z.number().int().nonnegative(),
  positionInOver: z.number().int().nonnegative(),
  ballNumber: z.string().min(1),
  battingCompetitorId: apiIdentifierSchema,
  battingCompetitorName: z.string().min(1),
  bowlingCompetitorId: apiIdentifierSchema.nullable(),
  bowlingCompetitorName: z.string().min(1).nullable(),
  strikerParticipantId: apiIdentifierSchema,
  strikerParticipantName: z.string().min(1),
  nonStrikerParticipantId: apiIdentifierSchema,
  nonStrikerParticipantName: z.string().min(1),
  bowlerParticipantId: apiIdentifierSchema,
  bowlerParticipantName: z.string().min(1),
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
  nonStrikerParticipantId: apiIdentifierSchema,
  nonStrikerParticipantName: z.string().min(1),
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
  wicketsLost: z.number().int().nonnegative(),
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
    wicketsLost: z.number().int().nonnegative(),
    legalBalls: z.number().int().nonnegative(),
    overs: z.string().regex(/^\d+\.\d+$/),
    runRate: z.number().nonnegative().nullable(),
    powerplay: z
      .object({
        ranges: z.array(
          z.object({
            fromBall: z.number().nonnegative(),
            toBall: z.number().nonnegative(),
            type: z.string().min(1),
          }),
        ),
        runs: z.number().int().nonnegative(),
        wicketsLost: z.number().int().nonnegative(),
        legalBalls: z.number().int().nonnegative(),
        overs: z.string().regex(/^\d+\.\d+$/),
        runRate: z.number().nonnegative().nullable(),
        sourceEventCount: z.number().int().nonnegative(),
        contributingEvents: z.array(statisticContributingEventSchema).optional(),
      })
      .nullable(),
    extras: z.object({
      total: z.number().int().nonnegative(),
      wides: z.number().int().nonnegative(),
      noBalls: z.number().int().nonnegative(),
      byes: z.number().int().nonnegative(),
      legByes: z.number().int().nonnegative(),
      penaltyRuns: z.number().int().nonnegative(),
    }),
  }),
});

export const participantFixtureStatisticSchema = fixtureStatisticCommonSchema.extend({
  scope: z.literal('participant'),
  statisticCode: z.literal('participant_fixture'),
  participantId: apiIdentifierSchema,
  participantName: z.string().min(1),
  competitorId: apiIdentifierSchema.nullable(),
  competitorName: z.string().min(1).nullable(),
  battingPosition: z.number().int().positive().nullable(),
  battingParticipation: z.enum(['did_not_bat', 'batted']),
  dismissal: z
    .object({
      status: z.enum(['not_out', 'dismissed']),
      kind: z.string().min(1).nullable(),
      eventId: apiIdentifierSchema.nullable(),
    })
    .nullable(),
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
      wides: z.number().int().nonnegative(),
      noBalls: z.number().int().nonnegative(),
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

export const fixtureHighestScorerSchema = z.object({
  participantId: apiIdentifierSchema,
  participantName: z.string().min(1),
  competitorId: apiIdentifierSchema,
  competitorName: z.string().min(1),
  inningsId: apiIdentifierSchema,
  inningsOrdinal: z.number().int().nonnegative(),
  runsScored: z.number().int().nonnegative(),
  notOut: z.boolean(),
});

export const fixtureStatisticsSchema = z.object({
  fixtureId: apiIdentifierSchema,
  status: z.enum(['complete', 'partial']),
  scope: z.object({
    superOversIncluded: z.literal(false),
  }),
  outcome: fixtureOutcomeSchema,
  highestScorers: z.array(fixtureHighestScorerSchema),
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

// Exports accept the same event filters as the paginated read but not cursor or
// limit: an export is the whole filtered result set, paged on the server.
export const fixtureEventExportQuerySchema = z.object(fixtureEventFilterQueryShape).strict();

// A calculation-trace export takes its event set from the statistic itself, so
// it accepts no filters that could make the file differ from the trace.
export const fixtureStatisticEventExportQuerySchema = z.object({}).strict();

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

export const fixtureCollectionResponseSchema = z.object({
  data: z.array(fixtureSchema),
  pagination: z.object({
    nextCursor: z.string().min(1).nullable(),
    totalPages: z.number().int().nonnegative(),
  }),
});

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
  // These are the bowler-attributable extras included in runsConceded, with
  // byes and leg-byes run off a wide counted as wides (Law 22.6). Other byes,
  // leg-byes and innings-level penalty runs belong to the fielding team, not
  // the bowler's analysis.
  wides: z.number().int().nonnegative(),
  noBalls: z.number().int().nonnegative(),
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
  innings: z.number().int().nonnegative(),
  runsScored: z.number().int().nonnegative(),
  ballsFaced: z.number().int().nonnegative(),
  dismissals: z.number().int().nonnegative(),
  notOuts: z.number().int().nonnegative(),
  battingAverage: z.number().nonnegative().nullable(),
  fours: z.number().int().nonnegative(),
  sixes: z.number().int().nonnegative(),
  fifties: z.number().int().nonnegative(),
  hundreds: z.number().int().nonnegative(),
  highestScore: z.number().int().nonnegative(),
  highestScoreNotOut: z.boolean(),
  strikeRate: z.number().nonnegative().nullable(),
});

export const participantAggregateBestBowlingSchema = z.object({
  wicketsTaken: z.number().int().nonnegative(),
  runsConceded: z.number().int().nonnegative(),
});

export const participantAggregateBowlingSchema = z.object({
  innings: z.number().int().nonnegative(),
  runsConceded: z.number().int().nonnegative(),
  // Wides and no-balls are charged to the bowler, including byes and leg-byes
  // run off a wide (Law 22.6). Other extras are deliberately not presented as a
  // bowler figure.
  wides: z.number().int().nonnegative(),
  noBalls: z.number().int().nonnegative(),
  legalBallsBowled: z.number().int().nonnegative(),
  wicketsTaken: z.number().int().nonnegative(),
  bowlingAverage: z.number().nonnegative().nullable(),
  bowlingStrikeRate: z.number().nonnegative().nullable(),
  bestBowling: participantAggregateBestBowlingSchema,
  fourWicketHauls: z.number().int().nonnegative(),
  fiveWicketHauls: z.number().int().nonnegative(),
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

export const participantAggregateFieldingSchema = z.object({
  catches: z.number().int().nonnegative(),
  stumpings: z.number().int().nonnegative(),
  runOutInvolvements: z.number().int().nonnegative(),
});

const participantAggregateCommonSchema = z.object({
  statisticId: apiIdentifierSchema,
  participantId: apiIdentifierSchema,
  participantName: z.string().min(1),
  appearances: z.number().int().nonnegative(),
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
  fielding: participantAggregateFieldingSchema,
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

// ---------------------------------------------------------------------------
// Season and competition leaderboards
// ---------------------------------------------------------------------------

export const leaderboardMetricSchema = z.enum([
  'most_runs',
  'most_wickets',
  'most_fours',
  'most_sixes',
  'highest_batting_average',
  'highest_strike_rate',
  'best_bowling_average',
  'best_economy_rate',
  'best_bowling_strike_rate',
]);

const leaderboardQueryCommonSchema = z.object({
  metric: leaderboardMetricSchema,
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const leaderboardQuerySchema = z.discriminatedUnion('scope', [
  leaderboardQueryCommonSchema
    .extend({
      scope: z.literal('season'),
      seasonId: apiIdentifierSchema,
    })
    .strict(),
  leaderboardQueryCommonSchema
    .extend({
      scope: z.literal('competition'),
      competitionId: apiIdentifierSchema,
    })
    .strict(),
]);

export const leaderboardQualificationSchema = z
  .object({
    field: z.enum(['dismissals', 'ballsFaced', 'wicketsTaken', 'legalBallsBowled']),
    minimum: z.number().int().positive(),
    rationale: z.string().min(1),
  })
  .nullable();

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  participantId: apiIdentifierSchema,
  participantName: z.string().min(1),
  value: z.number().nonnegative(),
});

const leaderboardCommonSchema = z.object({
  metric: leaderboardMetricSchema,
  limit: z.number().int().min(1).max(50),
  qualification: leaderboardQualificationSchema,
  tieBreakers: z.tuple([
    z.literal('metricValue'),
    z.literal('participantName'),
    z.literal('participantId'),
  ]),
  entries: z.array(leaderboardEntrySchema).max(50),
});

export const leaderboardSchema = z.discriminatedUnion('scope', [
  leaderboardCommonSchema.extend({
    scope: z.literal('season'),
    seasonId: apiIdentifierSchema,
    competitionId: apiIdentifierSchema,
    competitionName: z.string().min(1),
    season: z.string().min(1),
  }),
  leaderboardCommonSchema.extend({
    scope: z.literal('competition'),
    competitionId: apiIdentifierSchema,
    competitionName: z.string().min(1),
  }),
]);

export const leaderboardResponseSchema = createResourceResponseSchema(leaderboardSchema);
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
export type FixtureHighestScorer = z.infer<typeof fixtureHighestScorerSchema>;
export type FixtureStatistics = z.infer<typeof fixtureStatisticsSchema>;

export type CompetitionListQuery = z.infer<typeof competitionListQuerySchema>;
export type SeasonListQuery = z.infer<typeof seasonListQuerySchema>;
export type FixtureListQuery = z.infer<typeof fixtureListQuerySchema>;

export type FixtureCollectionResponse = z.infer<typeof fixtureCollectionResponseSchema>;
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
export type ParticipantAggregateBestBowling = z.infer<typeof participantAggregateBestBowlingSchema>;
export type ParticipantAggregateBowling = z.infer<typeof participantAggregateBowlingSchema>;
export type ParticipantAggregateFielding = z.infer<typeof participantAggregateFieldingSchema>;
export type ParticipantSeasonAggregate = z.infer<typeof participantSeasonAggregateSchema>;
export type ParticipantCompetitionAggregate = z.infer<typeof participantCompetitionAggregateSchema>;
export type ParticipantCareerAggregate = z.infer<typeof participantCareerAggregateSchema>;
export type ParticipantAggregate = z.infer<typeof participantAggregateSchema>;
export type ParticipantAggregatesWarning = z.infer<typeof participantAggregatesWarningSchema>;
export type ParticipantAggregates = z.infer<typeof participantAggregatesSchema>;
export type ParticipantAggregateScope = z.infer<typeof participantAggregateScopeSchema>;
export type ParticipantAggregatesQuery = z.infer<typeof participantAggregatesQuerySchema>;
export type LeaderboardMetric = z.infer<typeof leaderboardMetricSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type LeaderboardQualification = z.infer<typeof leaderboardQualificationSchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type Leaderboard = z.infer<typeof leaderboardSchema>;
