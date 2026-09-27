import { describe, expect, test } from 'vitest';

import {
  affectedParticipantIds,
  aggregateParticipantIds,
  deriveCorrectionStatisticsDependencies,
} from '@sport-analytics/batch-processing';

describe('correction statistics dependencies', () => {
  test('includes batters, bowler, dismissed players, and every identified fielder', () => {
    expect(
      aggregateParticipantIds({
        strikerId: '100',
        nonStrikerId: '200',
        bowlerId: '300',
        wickets: [
          {
            playerOutId: '100',
            fielders: [
              { participantId: '400' },
              { participantId: '500' },
              { participantId: '400' },
              {},
            ],
          },
        ],
      }),
    ).toEqual(['100', '200', '300', '400', '500']);
  });
  test('unions every event and added squad member once, in a stable order', () => {
    const event = (strikerId: string, nonStrikerId: string, bowlerId: string) => ({
      strikerId,
      nonStrikerId,
      bowlerId,
      wickets: [],
    });

    expect(
      affectedParticipantIds({
        events: [
          event('300', '100', '200'),
          {
            ...event('100', '400', '200'),
            wickets: [{ playerOutId: '400', fielders: [{ participantId: '500' }, {}] }],
          },
        ],
        squadParticipantIds: ['600', '100', ''],
      }),
    ).toEqual(['100', '200', '300', '400', '500', '600']);
    expect(affectedParticipantIds({ events: [] })).toEqual([]);
  });

  test('targets only the fixture and the previous or resulting player aggregates', () => {
    expect(
      deriveCorrectionStatisticsDependencies({
        fixtureId: '10',
        competitionId: '20',
        season: '2026',
        participantIds: ['100', '200', '300'],
      }),
    ).toEqual([
      {
        scope: 'fixture',
        fixtureId: '10',
        participantId: null,
        competitionId: '20',
        season: '2026',
      },
      {
        scope: 'season',
        fixtureId: '10',
        participantId: '100',
        competitionId: '20',
        season: '2026',
      },
      {
        scope: 'competition',
        fixtureId: '10',
        participantId: '100',
        competitionId: '20',
        season: null,
      },
      { scope: 'career', fixtureId: '10', participantId: '100', competitionId: null, season: null },
      {
        scope: 'season',
        fixtureId: '10',
        participantId: '200',
        competitionId: '20',
        season: '2026',
      },
      {
        scope: 'competition',
        fixtureId: '10',
        participantId: '200',
        competitionId: '20',
        season: null,
      },
      { scope: 'career', fixtureId: '10', participantId: '200', competitionId: null, season: null },
      {
        scope: 'season',
        fixtureId: '10',
        participantId: '300',
        competitionId: '20',
        season: '2026',
      },
      {
        scope: 'competition',
        fixtureId: '10',
        participantId: '300',
        competitionId: '20',
        season: null,
      },
      { scope: 'career', fixtureId: '10', participantId: '300', competitionId: null, season: null },
    ]);
  });

  test('does not create unrelated season or competition targets without their identity', () => {
    expect(
      deriveCorrectionStatisticsDependencies({
        fixtureId: '10',
        competitionId: null,
        season: null,
        participantIds: ['100'],
      }),
    ).toEqual([
      { scope: 'fixture', fixtureId: '10', participantId: null, competitionId: null, season: null },
      { scope: 'career', fixtureId: '10', participantId: '100', competitionId: null, season: null },
    ]);
  });
});
