import { describe, expect, test } from 'vitest';

import {
  fixtureEventListQuerySchema,
  fixtureListQuerySchema,
  fixtureSchema,
  fixtureStatisticsQuerySchema,
  fixtureStatisticsResponseSchema,
  participantFixtureCollectionResponseSchema,
  participantFixtureListQuerySchema,
  participantListQuerySchema,
  publicEventCollectionResponseSchema,
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
        startDate: '2026-01-10',
        endDate: '2026-01-10',
      }).success,
    ).toBe(true);
  });

  test('applies pagination defaults', () => {
    expect(participantListQuerySchema.parse({})).toEqual({
      limit: 50,
    });
    expect(participantFixtureListQuerySchema.parse({})).toEqual({
      limit: 50,
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
          inningsId: '200',
          inningsOrdinal: 0,
          sequenceNumber: 1,
          overNumber: 0,
          positionInOver: 0,
          ballNumber: '0.1',
          battingCompetitorId: '20',
          bowlingCompetitorId: '21',
          strikerParticipantId: '30',
          nonStrikerParticipantId: '31',
          bowlerParticipantId: '32',
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
