import test from 'node:test';
import assert from 'node:assert/strict';

import { convertCricsheetFixture } from '../../scripts/issue-598-cricsheet-package.mjs';

test('converts a Cricsheet fixture into a v1.1 new-fixture package', () => {
  const result = convertCricsheetFixture(
    {
      meta: { data_version: '1.1', revision: 3 },
      info: {
        dates: ['2026-09-17'],
        event: { name: 'Africa Continental Cup' },
        gender: 'male',
        match_type: 'T20',
        team_type: 'international',
        teams: ['Kenya', 'Botswana'],
        venue: 'Gahanga International Cricket Stadium, Rwanda',
        balls_per_over: 6,
        outcome: { winner: 'Kenya', by: { runs: 64 } },
        season: '2026',
        registry: {
          people: { 'A Batter': 'player-a', 'B Batter': 'player-b', Bowler: 'player-c' },
        },
      },
      innings: [
        {
          team: 'Kenya',
          overs: [
            {
              over: 0,
              deliveries: [
                {
                  batter: 'A Batter',
                  non_striker: 'B Batter',
                  bowler: 'Bowler',
                  runs: { batter: 4, extras: 0, total: 4 },
                  wickets: [
                    { kind: 'caught', player_out: 'A Batter', fielders: [{ name: 'Bowler' }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    '1552923',
  );

  assert.equal(result.contractVersion, '1.1');
  assert.equal(result.packageId, 'cricsheet:package:1552923');
  assert.equal(result.fixtures[0].sourceId, 'cricsheet:fixture:1552923');
  assert.equal(result.fixtures[0].proposal.winner, 'Kenya');
  assert.deepEqual(result.fixtures[0].innings[0].events[0], {
    eventId: 'cricsheet:delivery:1552923-1-0-1',
    occurrenceSequence: 1,
    overNumber: 0,
    positionInOver: 0,
    ballLabel: '0.1',
    striker: {
      sourceId: 'cricsheet:participant:player-a',
      context: { name: 'A Batter', team: { context: { name: 'Kenya' } } },
    },
    nonStriker: {
      sourceId: 'cricsheet:participant:player-b',
      context: { name: 'B Batter', team: { context: { name: 'Kenya' } } },
    },
    bowler: {
      sourceId: 'cricsheet:participant:player-c',
      context: { name: 'Bowler', team: { context: { name: 'Botswana' } } },
    },
    runs: { offBat: 4, extras: 0, total: 4 },
    extras: {},
    wickets: [
      {
        kind: 'caught',
        playerOut: {
          sourceId: 'cricsheet:participant:player-a',
          context: { name: 'A Batter', team: { context: { name: 'Kenya' } } },
        },
        fielders: [
          {
            participant: {
              sourceId: 'cricsheet:participant:player-c',
              context: { name: 'Bowler', team: { context: { name: 'Botswana' } } },
            },
          },
        ],
      },
    ],
  });
});
