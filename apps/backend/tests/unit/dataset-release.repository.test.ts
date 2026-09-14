import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { createDatasetReleaseRepository } from '../../src/modules/dataset-releases/dataset-release.repository';

describe('dataset release event paging', () => {
  test('adds an indexable innings lower bound to non-initial keyset pages', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
    const repository = createDatasetReleaseRepository({ query } as unknown as QueryExecutor);
    await repository.loadPublishedEventPage(
      { fixtureId: '7204', inningsOrdinal: 1, sequenceNumber: 27, eventId: '1647399' },
      10000,
    );
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('(i.fixture_id, i.ordinal) >= ($1::bigint, $2::integer)');
    expect(sql).toContain('(i.fixture_id, i.ordinal, d.innings_sequence, d.delivery_id) >');
    expect(query.mock.calls[0]?.[1]).toEqual(['7204', 1, 27, '1647399', 10000]);
  });

  test('does not add a nullable cursor predicate to the first page', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
    await createDatasetReleaseRepository({
      query,
    } as unknown as QueryExecutor).loadPublishedEventPage(null, 10000);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).not.toContain('$1::bigint IS NULL');
    expect(query.mock.calls[0]?.[1]).toEqual([10000]);
  });
});
