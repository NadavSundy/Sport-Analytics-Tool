import { describe, expect, test } from 'vitest';

import {
  aggregateParticipantIds,
  deriveCorrectionStatisticsDependencies,
} from '../../src/modules/statistics/recomputation-dependencies';

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
  test('targets only the fixture and the previous or resulting player aggregates', () => {
    expect(
      deriveCorrectionStatisticsDependencies({
        fixtureId: '10',
        competitionId: '20',
        season: '2026',
        previousParticipantIds: ['100', '200'],
        resultingParticipantIds: ['100', '300'],
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
        previousParticipantIds: ['100'],
        resultingParticipantIds: ['100'],
      }),
    ).toEqual([
      { scope: 'fixture', fixtureId: '10', participantId: null, competitionId: null, season: null },
      { scope: 'career', fixtureId: '10', participantId: '100', competitionId: null, season: null },
    ]);
  });
});
