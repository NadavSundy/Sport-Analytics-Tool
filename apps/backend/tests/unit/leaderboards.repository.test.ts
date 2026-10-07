import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { loadLeaderboardSource } from '../../src/modules/statistics/leaderboards.repository';

const queryResult = <Row>(rows: Row[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

describe('leaderboards repository', () => {
  test('loads a season-scoped, bounded ranking with deterministic tie breakers', async () => {
    const query = vi.fn().mockResolvedValue(
      queryResult([
        {
          competitionName: 'Premier League',
          rank: 1,
          participantId: '11',
          participantName: 'Asha Patel',
          value: 512,
        },
        {
          competitionName: 'Premier League',
          rank: 2,
          participantId: '12',
          participantName: 'Bina Singh',
          value: 512,
        },
      ]),
    );
    const executor = { query } as unknown as QueryExecutor;

    await expect(
      loadLeaderboardSource({ competitionId: '2', season: '2026' }, 'most_runs', 10, executor),
    ).resolves.toEqual({
      competitionName: 'Premier League',
      metric: 'most_runs',
      rows: [
        { rank: 1, participantId: '11', participantName: 'Asha Patel', value: 512 },
        { rank: 2, participantId: '12', participantName: 'Bina Singh', value: 512 },
      ],
    });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("publication.status = 'accepted'");
    expect(sql).toContain("source_submission.status = 'accepted'");
    expect(sql).toContain('participant_name COLLATE "C" ASC');
    expect(sql).toContain('ranked.rank <= $4::int');
    expect(query.mock.calls[0]?.[1]).toEqual(['2', '2026', 'most_runs', 10]);
  });

  test('returns an empty leaderboard for an existing scope with no qualifying rows', async () => {
    const query = vi.fn().mockResolvedValue(
      queryResult([
        {
          competitionName: 'Premier League',
          rank: null,
          participantId: null,
          participantName: null,
          value: null,
        },
      ]),
    );

    await expect(
      loadLeaderboardSource({ competitionId: '2', season: null }, 'best_economy_rate', 5, {
        query,
      } as unknown as QueryExecutor),
    ).resolves.toEqual({
      competitionName: 'Premier League',
      metric: 'best_economy_rate',
      rows: [],
    });
    expect(query.mock.calls[0]?.[1]).toEqual(['2', null, 'best_economy_rate', 5]);
  });

  test('returns null when the competition or requested published season is missing', async () => {
    const query = vi.fn().mockResolvedValue(queryResult([]));

    await expect(
      loadLeaderboardSource({ competitionId: '404', season: '1900' }, 'most_wickets', 20, {
        query,
      } as unknown as QueryExecutor),
    ).resolves.toBeNull();
  });
});
