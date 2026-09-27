import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';

describe('fixture statistics repository', () => {
  test('reads only accepted revisions and preserves event order', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            fixtureId: '9',
            ballsPerOver: 6,
            missingFields: [],
            outcome: 'tie',
            winnerCompetitorId: null,
            winnerCompetitorName: null,
            eliminatorCompetitorId: null,
            eliminatorCompetitorName: null,
            outcomeByRuns: null,
            outcomeByWickets: null,
            outcomeMethod: null,
            decidedByBowlOut: false,
            inningsId: '11',
            inningsOrdinal: 0,
            battingCompetitorId: '2',
            battingCompetitorName: 'Team Alpha',
            penaltyPre: null,
            penaltyPost: null,
            miscountedOvers: [{ overNumber: 4, balls: 5 }],
            powerplays: [{ fromBall: 0.1, toBall: 5.6, type: 'mandatory' }],
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });
    const executor = { query } as unknown as QueryExecutor;

    const source = await loadFixtureStatisticsSource('9', executor);

    expect(source?.fixtureId).toBe('9');
    expect(source?.innings[0]).toMatchObject({
      battingCompetitorId: '2',
      battingCompetitorName: 'Team Alpha',
      miscountedOvers: [{ overNumber: 4, balls: 5 }],
      powerplays: [{ fromBall: 0.1, toBall: 5.6, type: 'mandatory' }],
    });
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0]?.[0]).toContain('i.is_super_over = false');

    expect(query.mock.calls[1]?.[0]).toContain('d.innings_id = ANY($1::bigint[])');

    expect(query.mock.calls[1]?.[0]).not.toContain('is_super_over');
    expect(query.mock.calls[0]?.[0]).toContain('winner_team.name AS "winnerCompetitorName"');
    expect(query.mock.calls[0]?.[0]).toContain('batting_team.name AS "battingCompetitorName"');
    expect(query.mock.calls[0]?.[0]).toContain('FROM innings_miscounted_over miscount');
    expect(query.mock.calls[0]?.[0]).toContain('FROM innings_powerplay powerplay');
    expect(query.mock.calls[1]?.[0]).toContain('striker_person.display_name AS "strikerName"');
    expect(query.mock.calls[1]?.[0]).toContain('bowler_person.display_name AS "bowlerName"');
    expect(query.mock.calls[1]?.[0]).toContain('d.over_number AS "overNumber"');
    expect(query.mock.calls[1]?.[0]).toContain(
      'non_striker_person.display_name AS "nonStrikerName"',
    );
    expect(query.mock.calls[1]?.[0]).toContain("'isTerminal'");
    expect(query.mock.calls[1]?.[1]).toEqual([['11']]);
    expect(query.mock.calls[0]?.[0]).toContain("publication.status = 'accepted'");
    expect(query.mock.calls[1]?.[0]).toContain("source_submission.status = 'accepted'");
    expect(query.mock.calls[1]?.[0]).toContain('FROM delivery_current d');
    expect(query.mock.calls[1]?.[0]).not.toContain('DISTINCT ON');
    expect(query.mock.calls[1]?.[0]).toContain(
      'ORDER BY i.ordinal ASC, d.innings_sequence ASC, d.delivery_id ASC',
    );
    expect(query.mock.calls[2]?.[0]).toContain('FROM fixture_squad fs');
  });
});
