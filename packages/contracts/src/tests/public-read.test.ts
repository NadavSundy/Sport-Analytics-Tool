import { describe, expect, test } from 'vitest';

import {
  fixtureEventListQuerySchema,
  fixtureListQuerySchema,
  fixtureSchema,
  fixtureStatisticsQuerySchema,
  fixtureStatisticsResponseSchema,
  fixtureWeatherResponseSchema,
  participantAggregatesQuerySchema,
  participantAggregatesResponseSchema,
  participantFixtureCollectionResponseSchema,
  participantFixtureListQuerySchema,
  participantListQuerySchema,
  publicEventCollectionResponseSchema,
  seasonListQuerySchema,
  seasonSchema,
} from '../public-read';

describe('public read contracts', () => {
  test('validates a season with readable competition context', () => {
    expect(
      seasonSchema.safeParse({
        seasonId: 'season_opaque-value',
        competitionId: '12',
        competitionName: 'SA20',
        label: '2025/26',
      }).success,
    ).toBe(true);
  });

  test('validates a fixture with readable relationship summaries', () => {
    expect(
      fixtureSchema.safeParse({
        fixtureId: '100',
        competitionId: '12',
        competitionName: 'SA20',
        seasonId: 'season_opaque-value',
        season: '2025/26',
        seasonLabel: '2025/26',
        competitors: [
          {
            competitorId: '20',
            name: 'Joburg Super Kings',
          },
          {
            competitorId: '21',
            name: 'Pretoria Capitals',
          },
        ],
        matchType: 'T20',
        teamType: 'club',
        gender: 'male',
        ballsPerOver: 6,
        scheduledOvers: 20,
        venue: { name: 'Wanderers Stadium', city: 'Johannesburg' },
        toss: {
          winnerCompetitorId: '20',
          winnerCompetitorName: 'Joburg Super Kings',
          decision: 'bat',
        },
        startDate: '2026-01-10',
        endDate: '2026-01-10',
      }).success,
    ).toBe(true);
  });

  test('validates a fixture with unavailable venue and toss metadata', () => {
    expect(
      fixtureSchema.safeParse({
        fixtureId: '100',
        competitionId: '12',
        competitionName: 'SA20',
        seasonId: 'season_opaque-value',
        season: '2025/26',
        seasonLabel: '2025/26',
        competitors: [],
        matchType: 'T20',
        teamType: 'club',
        gender: 'male',
        ballsPerOver: 6,
        scheduledOvers: 20,
        venue: null,
        toss: null,
        startDate: '2026-01-10',
        endDate: '2026-01-10',
      }).success,
    ).toBe(true);
  });

  test('validates available and unavailable fixture weather', () => {
    for (const reason of ['MISSING_COORDINATES', 'LOCATION_NOT_FOUND', 'UNSUPPORTED_DATE']) {
      expect(
        fixtureWeatherResponseSchema.safeParse({
          data: {
            fixtureId: '100',
            date: '2026-08-09',
            availability: 'available',
            venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
            weather: {
              date: '2026-08-09',
              latitude: -26.1929,
              longitude: 28.0305,
              temperatureMax: 24,
              temperatureMin: 11,
              precipitationSum: 0,
              windSpeedMax: 17,
            },
          },
        }).success,
      ).toBe(true);

      expect(
        fixtureWeatherResponseSchema.safeParse({
          data: {
            fixtureId: '100',
            date: '2026-08-09',
            availability: 'unavailable',
            reason,
            venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
            weather: null,
          },
        }).success,
      ).toBe(true);
    }
  });

  test('applies pagination defaults', () => {
    expect(participantListQuerySchema.parse({})).toEqual({
      limit: 50,
    });
    expect(participantFixtureListQuerySchema.parse({})).toEqual({
      limit: 50,
    });
  });

  test('accepts server-side season name search', () => {
    expect(seasonListQuerySchema.parse({ name: 'World Twenty20' })).toEqual({
      limit: 50,
      name: 'World Twenty20',
    });
  });

  test('validates player fixture history with readable context and partial statistics', () => {
    const result = participantFixtureCollectionResponseSchema.safeParse({
      data: [
        {
          fixture: {
            fixtureId: '481',
            competitionId: '12',
            competitionName: 'Example Competition',
            seasonId: 'season_example',
            season: '2026',
            seasonLabel: '2026',
            competitors: [
              { competitorId: '20', name: 'Team One' },
              { competitorId: '21', name: 'Team Two' },
            ],
            matchType: 'T20',
            teamType: 'international',
            gender: 'male',
            ballsPerOver: 6,
            scheduledOvers: 20,
            venue: null,
            toss: null,
            startDate: '2026-08-09',
            endDate: '2026-08-09',
          },
          competitionName: 'Example Competition',
          competitors: [
            { competitorId: '20', name: 'Team One' },
            { competitorId: '21', name: 'Team Two' },
          ],
          competitor: { competitorId: '20', name: 'Team One' },
          role: null,
          statisticsStatus: 'partial',
          statisticsWarnings: [
            {
              code: 'NO_ACCEPTED_EVENTS',
              message: 'No accepted delivery events are available for derivation.',
            },
          ],
          batting: null,
          bowling: null,
        },
      ],
      pagination: {
        nextCursor: null,
      },
    });

    expect(result.success).toBe(true);
  });

  test('rejects malformed player fixture bowling notation', () => {
    const result = participantFixtureCollectionResponseSchema.safeParse({
      data: [
        {
          fixture: {
            fixtureId: '481',
            competitionId: null,
            competitionName: null,
            seasonId: null,
            season: '2026',
            seasonLabel: '2026',
            competitors: [],
            matchType: 'T20',
            teamType: 'club',
            gender: 'mixed',
            ballsPerOver: 6,
            scheduledOvers: null,
            venue: null,
            toss: null,
            startDate: '2026-08-09',
            endDate: '2026-08-09',
          },
          competitionName: null,
          competitors: [],
          competitor: { competitorId: '20', name: 'Team One' },
          role: null,
          statisticsStatus: 'complete',
          statisticsWarnings: [],
          batting: null,
          bowling: {
            runsConceded: 10,
            wides: 0,
            noBalls: 0,
            legalBallsBowled: 6,
            oversBowled: 'one over',
            wicketsTaken: 1,
            economyRate: 10,
          },
        },
      ],
      pagination: { nextCursor: null },
    });

    expect(result.success).toBe(false);
  });

  test('accepts fixture filters', () => {
    expect(
      fixtureListQuerySchema.parse({
        competitionId: '1',
        competitorId: '2',
        gender: 'female',
        startDateFrom: '2026-01-01',
        startDateTo: '2026-08-09',
        limit: '25',
      }),
    ).toEqual({
      competitionId: '1',
      competitorId: '2',
      gender: 'female',
      startDateFrom: '2026-01-01',
      startDateTo: '2026-08-09',
      limit: 25,
    });
  });

  test('rejects an invalid fixture date range', () => {
    expect(
      fixtureListQuerySchema.safeParse({
        startDateFrom: '2026-08-09',
        startDateTo: '2026-01-01',
      }).success,
    ).toBe(false);
  });

  test('accepts cricket event filters and applies pagination defaults', () => {
    expect(
      fixtureEventListQuerySchema.parse({
        inningsId: '10',
        competitorId: '20',
        participantId: '30',
        overNumber: '4',
        wicketKind: 'caught',
      }),
    ).toEqual({
      inningsId: '10',
      competitorId: '20',
      participantId: '30',
      overNumber: 4,
      wicketKind: 'caught',
      limit: 50,
    });
  });

  test('validates a public event collection without submission audit fields', () => {
    const result = publicEventCollectionResponseSchema.safeParse({
      data: [
        {
          eventId: '500',
          fixtureId: '100',
          competitionId: '10',
          competitionName: 'World Twenty20',
          inningsId: '200',
          inningsOrdinal: 0,
          sequenceNumber: 1,
          overNumber: 0,
          positionInOver: 0,
          ballNumber: '0.1',
          battingCompetitorId: '20',
          battingCompetitorName: 'India',
          bowlingCompetitorId: '21',
          bowlingCompetitorName: 'Pakistan',
          strikerParticipantId: '30',
          strikerParticipantName: 'Opening Batter',
          nonStrikerParticipantId: '31',
          nonStrikerParticipantName: 'Non-striker',
          bowlerParticipantId: '32',
          bowlerParticipantName: 'Opening Bowler',
          runs: {
            offBat: 1,
            extras: 0,
            total: 1,
            nonBoundary: false,
          },
          extras: {
            wides: null,
            noBalls: null,
            byes: null,
            legByes: null,
            penalty: null,
          },
          wickets: [],
        },
      ],
      pagination: {
        nextCursor: null,
      },
    });

    expect(result.success).toBe(true);
  });

  test('parses the opt-in statistic contributor expansion', () => {
    expect(fixtureStatisticsQuerySchema.parse({})).toEqual({
      includeContributors: false,
    });
    expect(
      fixtureStatisticsQuerySchema.parse({
        includeContributors: 'true',
      }),
    ).toEqual({
      includeContributors: true,
    });
  });

  test('parses the participant aggregate scope filter', () => {
    expect(participantAggregatesQuerySchema.parse({})).toEqual({});
    expect(participantAggregatesQuerySchema.parse({ scope: 'career' })).toEqual({
      scope: 'career',
    });
    expect(participantAggregatesQuerySchema.safeParse({ scope: 'super-over' }).success).toBe(false);
  });

  test('validates season, competition and career aggregates for one participant', () => {
    const result = participantAggregatesResponseSchema.safeParse({
      data: {
        participantId: '50',
        participantName: 'BB McCullum',
        status: 'complete',
        scope: { superOversIncluded: false },
        warnings: [],
        statistics: [
          {
            statisticId: 'stat-season',
            participantId: '50',
            participantName: 'BB McCullum',
            scope: 'season',
            statisticCode: 'participant_season',
            competitionId: '10',
            competitionName: 'Australia in New Zealand T20I Series',
            seasonId: 'season_opaque',
            season: '2009/10',
            appearances: 1,
            fixtureCount: 1,
            sourceEventCount: 60,
            batting: {
              innings: 1,
              runsScored: 116,
              ballsFaced: 56,
              dismissals: 0,
              notOuts: 1,
              battingAverage: null,
              fours: 12,
              sixes: 8,
              fifties: 0,
              hundreds: 1,
              highestScore: 116,
              highestScoreNotOut: true,
              strikeRate: 207.14,
            },
            bowling: null,
            fielding: { catches: 1, stumpings: 0, runOutInvolvements: 1 },
          },
          {
            statisticId: 'stat-competition',
            participantId: '50',
            participantName: 'BB McCullum',
            scope: 'competition',
            statisticCode: 'participant_competition',
            competitionId: '10',
            competitionName: 'Australia in New Zealand T20I Series',
            appearances: 1,
            fixtureCount: 1,
            sourceEventCount: 60,
            batting: null,
            bowling: {
              innings: 1,
              runsConceded: 44,
              wides: 2,
              noBalls: 1,
              legalBallsBowled: 24,
              wicketsTaken: 0,
              bowlingAverage: null,
              bowlingStrikeRate: null,
              bestBowling: { wicketsTaken: 0, runsConceded: 44 },
              fourWicketHauls: 0,
              fiveWicketHauls: 0,
              ballsPerOver: 6,
              oversBowled: '4.0',
              economyRate: 11,
            },
            fielding: { catches: 0, stumpings: 0, runOutInvolvements: 0 },
          },
          {
            statisticId: 'stat-career',
            participantId: '50',
            participantName: 'BB McCullum',
            scope: 'career',
            statisticCode: 'participant_career',
            appearances: 2,
            fixtureCount: 1,
            sourceEventCount: 60,
            batting: null,
            // A career spanning fixtures with different balls-per-over has no
            // single divisor, so neither rate is invented.
            bowling: {
              innings: 1,
              runsConceded: 44,
              wides: 2,
              noBalls: 1,
              legalBallsBowled: 24,
              wicketsTaken: 0,
              bowlingAverage: null,
              bowlingStrikeRate: null,
              bestBowling: { wicketsTaken: 0, runsConceded: 44 },
              fourWicketHauls: 0,
              fiveWicketHauls: 0,
              ballsPerOver: null,
              oversBowled: null,
              economyRate: null,
            },
            fielding: { catches: 0, stumpings: 0, runOutInvolvements: 0 },
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  test('rejects a season aggregate carrying a competition-scoped shape', () => {
    const result = participantAggregatesResponseSchema.safeParse({
      data: {
        participantId: '50',
        participantName: 'BB McCullum',
        status: 'complete',
        scope: { superOversIncluded: false },
        warnings: [],
        statistics: [
          {
            statisticId: 'stat-season',
            participantId: '50',
            participantName: 'BB McCullum',
            scope: 'season',
            statisticCode: 'participant_season',
            competitionId: '10',
            competitionName: 'Test League',
            seasonId: 'season_opaque',
            // The season label is what distinguishes this level and is required.
            appearances: 1,
            fixtureCount: 1,
            sourceEventCount: 60,
            batting: null,
            bowling: null,
            fielding: { catches: 0, stumpings: 0, runOutInvolvements: 0 },
          },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  test('validates fixture statistics with readable team and player relationships', () => {
    expect(
      fixtureStatisticsResponseSchema.safeParse({
        data: {
          fixtureId: '9',
          status: 'complete',
          scope: { superOversIncluded: false },
          outcome: {
            kind: 'won',
            winnerCompetitorId: '20',
            winnerCompetitorName: 'Joburg Super Kings',
            eliminatorCompetitorId: null,
            eliminatorCompetitorName: null,
            margin: {
              type: 'runs',
              value: 12,
            },
            method: null,
            decidedByBowlOut: false,
          },
          highestScorers: [
            {
              participantId: '50',
              participantName: 'Example Batter',
              competitorId: '20',
              competitorName: 'Joburg Super Kings',
              inningsId: '30',
              inningsOrdinal: 0,
              runsScored: 4,
              notOut: true,
            },
          ],
          warnings: [],
          statistics: [
            {
              statisticId: 'stat-team',
              fixtureId: '9',
              scope: 'innings',
              statisticCode: 'team_total',
              inningsId: '30',
              inningsOrdinal: 0,
              competitorId: '20',
              competitorName: 'Joburg Super Kings',
              sourceEventCount: 1,
              metrics: {
                deliveryRuns: 4,
                penaltyRuns: 0,
                totalRuns: 4,
              },
              contributingEvents: [
                {
                  eventId: '40',
                  fixtureId: '9',
                  inningsId: '30',
                  inningsOrdinal: 0,
                  sequenceNumber: 1,
                  strikerParticipantId: '50',
                  strikerParticipantName: 'Example Batter',
                  nonStrikerParticipantId: '51',
                  nonStrikerParticipantName: 'Example Non-striker',
                  bowlerParticipantId: '60',
                  bowlerParticipantName: 'Example Bowler',
                  runs: {
                    offBat: 4,
                    extras: 0,
                    total: 4,
                  },
                  extras: {
                    wides: null,
                    noBalls: null,
                    byes: null,
                    legByes: null,
                    penalty: null,
                  },
                  nonBoundary: false,
                  bowlerWickets: 0,
                },
              ],
            },
            {
              statisticId: 'stat-player',
              fixtureId: '9',
              scope: 'participant',
              statisticCode: 'participant_fixture',
              participantId: '50',
              participantName: 'Example Batter',
              competitorId: '20',
              competitorName: 'Joburg Super Kings',
              sourceEventCount: 1,
              battingPosition: 1,
              battingParticipation: 'batted',
              dismissal: { status: 'not_out', kind: null, eventId: null },
              batting: {
                runsScored: 4,
                ballsFaced: 1,
                strikeRate: 400,
                fours: 1,
                sixes: 0,
              },
              bowling: null,
            },
          ],
        },
      }).success,
    ).toBe(true);
  });
});
