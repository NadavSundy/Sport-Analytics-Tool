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
            eliminatorCompetitorId: null,
            outcomeByRuns: null,
            outcomeByWickets: null,
            outcomeMethod: null,
            decidedByBowlOut: false,
            inningsId: '11',
            inningsOrdinal: 0,
            battingCompetitorId: '2',
            penaltyPre: null,
            penaltyPost: null,
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
      });
    const executor = { query } as unknown as QueryExecutor;

    const source = await loadFixtureStatisticsSource('9', executor);

    expect(source?.fixtureId).toBe('9');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain('i.is_super_over = false');

    expect(query.mock.calls[1]?.[0]).toContain('d.innings_id = ANY($1::bigint[])');

    expect(query.mock.calls[1]?.[0]).not.toContain('is_super_over');

    expect(query.mock.calls[1]?.[1]).toEqual([['11']]);
    expect(query.mock.calls[0]?.[0]).toContain("publication.status = 'accepted'");
    expect(query.mock.calls[1]?.[0]).toContain("source_submission.status = 'accepted'");
    expect(query.mock.calls[1]?.[0]).toContain(
      'DISTINCT ON (d.innings_id, d.over_number, d.position_in_over)',
    );
    expect(query.mock.calls[1]?.[0]).toContain(
      'ORDER BY i.ordinal ASC, d.innings_sequence ASC, d.delivery_id ASC',
    );
  });
});
