import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import {
  findParticipantById,
  listCompetitorsForFixtures,
  listParticipantFixtures,
  listParticipants,
} from '../../src/modules/participants/participant.repository';

const queryResult = <Row>(rows: Row[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

function executorReturning<Row>(rows: Row[]) {
  const query = vi.fn().mockResolvedValue(queryResult(rows));
  return { query, executor: { query } as unknown as QueryExecutor };
}

describe('participant repository', () => {
  test('filters and cursor-paginates participants while retaining the filtered total', async () => {
    const { query, executor } = executorReturning([
      { participantId: '11', displayName: 'Asha Patel', totalRecords: 3 },
      { participantId: '12', displayName: 'Asha Singh', totalRecords: 3 },
      { participantId: '13', displayName: 'Asha Zondo', totalRecords: 3 },
    ]);

    const page = await listParticipants(
      {
        name: 'Asha',
        fixtureId: '91',
        competitorId: '4',
        after: { displayName: 'Aaliyah Khan', participantId: '10' },
        limit: 2,
      },
      executor,
    );

    expect(page).toEqual({
      records: [
        { participantId: '11', displayName: 'Asha Patel', totalRecords: 3 },
        { participantId: '12', displayName: 'Asha Singh', totalRecords: 3 },
      ],
      hasMore: true,
      totalRecords: 3,
    });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('p.display_name ILIKE $1');
    expect(sql).toContain('fs.fixture_id = $2::bigint');
    expect(sql).toContain('fs.team_id = $3::bigint');
    expect(sql).toContain('(display_name, person_id) > ($4::text, $5::bigint)');
    expect(sql).toContain('ORDER BY display_name ASC, person_id ASC');
    expect(query.mock.calls[0]?.[1]).toEqual(['%Asha%', '91', '4', 'Aaliyah Khan', '10', 3]);
  });

  test('returns an empty unfiltered participant page with a stable total', async () => {
    const { query, executor } = executorReturning([]);

    await expect(listParticipants({ limit: 20 }, executor)).resolves.toEqual({
      records: [],
      hasMore: false,
      totalRecords: 0,
    });
    expect(query.mock.calls[0]?.[1]).toEqual([21]);
  });

  test('maps participant lookup and missing participant states', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([{ participantId: '11', displayName: 'Asha Patel' }]))
      .mockResolvedValueOnce(queryResult([]));
    const executor = { query } as unknown as QueryExecutor;

    await expect(findParticipantById('11', executor)).resolves.toEqual({
      participantId: '11',
      displayName: 'Asha Patel',
    });
    await expect(findParticipantById('404', executor)).resolves.toBeNull();
    expect(query.mock.calls.map((call) => call[1])).toEqual([['11'], ['404']]);
  });

  test('returns bounded fixture history in newest-first order with cricket figures intact', async () => {
    const fixture = {
      fixtureId: '91',
      competitionId: '2',
      competitionName: 'Premier League',
      ballsPerOver: 6,
      scheduledOvers: 20,
      season: '2026',
      matchType: 'T20',
      teamType: 'club',
      gender: 'female',
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      teamId: '4',
      teamName: 'Lions',
      role: 'all-rounder',
      missingFields: [],
      standardInningsCount: 2,
      acceptedEventCount: 240,
      emptyStandardInningsIds: [],
      runsScored: 52,
      ballsFaced: 39,
      fours: 5,
      sixes: 2,
      runsConceded: 24,
      wides: 1,
      noBalls: 0,
      legalBallsBowled: 24,
      wicketsTaken: 2,
    };
    const { query, executor } = executorReturning([
      fixture,
      { ...fixture, fixtureId: '90', startDate: '2026-08-20' },
      { ...fixture, fixtureId: '89', startDate: '2026-08-10' },
    ]);

    const page = await listParticipantFixtures(
      {
        participantId: '11',
        after: { startDate: '2026-09-02', fixtureId: '92' },
        limit: 2,
      },
      executor,
    );

    expect(page.records.map((record) => record.fixtureId)).toEqual(['91', '90']);
    expect(page.hasMore).toBe(true);
    expect(page.records[0]).toMatchObject({ runsScored: 52, wicketsTaken: 2 });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('(f.start_date, f.fixture_id) < ($2::date, $3::bigint)');
    expect(sql).toContain("publication.status = 'accepted'");
    expect(sql).toContain('ORDER BY sf.start_date DESC, sf.fixture_id DESC');
    expect(query.mock.calls[0]?.[1]).toEqual(['11', '2026-09-02', '92', 3]);
  });

  test('loads competitors for a fixture page in deterministic order and skips empty pages', async () => {
    const { query, executor } = executorReturning([
      { fixtureId: '90', competitorId: '4', name: 'Lions', ordinal: 0 },
      { fixtureId: '90', competitorId: '5', name: 'Tigers', ordinal: 1 },
    ]);

    await expect(listCompetitorsForFixtures([], executor)).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
    await expect(listCompetitorsForFixtures(['90'], executor)).resolves.toHaveLength(2);
    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY ft.fixture_id ASC, ft.ordinal ASC');
    expect(query.mock.calls[0]?.[1]).toEqual([['90']]);
  });
});
