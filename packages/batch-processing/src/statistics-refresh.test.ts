import { describe, expect, test, vi } from 'vitest';

import {
  advanceParticipantStatisticsVersions,
  advanceStatisticsDataVersions,
  type QueryExecutor,
} from './index';

function queryExecutor() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  } as unknown as QueryExecutor;
}

describe('statistics refresh versions', () => {
  test('does not write a participant version when the affected set is empty', async () => {
    const executor = queryExecutor();

    await advanceParticipantStatisticsVersions(executor, []);

    expect(executor.query).not.toHaveBeenCalled();
  });

  test('deduplicates affected identifiers before advancing fixture then participant versions', async () => {
    const executor = queryExecutor();

    await advanceStatisticsDataVersions(executor, {
      fixtureIds: ['fixture-2', 'fixture-1', 'fixture-2'],
      participantIds: ['participant-2', 'participant-1', 'participant-2'],
    });

    expect(executor.query).toHaveBeenCalledTimes(2);
    expect(executor.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('fixture_statistics_cache_version'),
      [['fixture-2', 'fixture-1']],
    );
    expect(executor.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('participant_statistics_version'),
      [['participant-2', 'participant-1']],
    );
  });
});
