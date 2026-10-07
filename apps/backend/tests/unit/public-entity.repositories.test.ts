import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import {
  findCompetitionById,
  listCompetitions,
} from '../../src/modules/competitions/competition.repository';
import {
  findCompetitorById,
  listCompetitors,
} from '../../src/modules/competitors/competitor.repository';
import { findSeason, listSeasons } from '../../src/modules/seasons/season.repository';

const queryResult = <Row>(rows: Row[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

describe('competition repository', () => {
  test('filters and keyset-paginates competitions with a stable extra-row bound', async () => {
    const query = vi.fn().mockResolvedValue(
      queryResult([
        { competitionId: '2', name: 'Premier League' },
        { competitionId: '3', name: 'Premier Shield' },
        { competitionId: '4', name: 'Premier Trophy' },
      ]),
    );
    const page = await listCompetitions(
      {
        name: 'Premier',
        after: { name: 'National League', competitionId: '1' },
        limit: 2,
      },
      { query } as unknown as QueryExecutor,
    );

    expect(page).toEqual({
      records: [
        { competitionId: '2', name: 'Premier League' },
        { competitionId: '3', name: 'Premier Shield' },
      ],
      hasMore: true,
    });
    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY name ASC, competition_id ASC');
    expect(query.mock.calls[0]?.[1]).toEqual(['%Premier%', 'National League', '1', 3]);
  });

  test('finds a competition and preserves the missing state', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([{ competitionId: '2', name: 'Premier League' }]))
      .mockResolvedValueOnce(queryResult([]));
    const executor = { query } as unknown as QueryExecutor;
    await expect(findCompetitionById('2', executor)).resolves.toMatchObject({ competitionId: '2' });
    await expect(findCompetitionById('404', executor)).resolves.toBeNull();
  });
});

describe('season repository', () => {
  test('filters seasons before cursor paging so the total remains stable', async () => {
    const query = vi.fn().mockResolvedValue(
      queryResult([
        { competitionId: '2', competitionName: 'Premier League', label: '2026', totalRecords: 3 },
        { competitionId: '2', competitionName: 'Premier League', label: '2027', totalRecords: 3 },
        { competitionId: '2', competitionName: 'Premier League', label: '2028', totalRecords: 3 },
      ]),
    );
    const page = await listSeasons(
      {
        competitionId: '2',
        name: 'Premier',
        after: { competitionId: '2', label: '2025' },
        limit: 2,
      },
      { query } as unknown as QueryExecutor,
    );

    expect(page.records.map((record) => record.label)).toEqual(['2026', '2027']);
    expect(page).toMatchObject({ hasMore: true, totalRecords: 3 });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('COUNT(*) OVER()::integer AS "totalRecords"');
    expect(sql).toContain('(competition_id, season) > ($3::bigint, $4::text)');
    expect(query.mock.calls[0]?.[1]).toEqual(['2', '%Premier%', '2', '2025', 3]);
  });

  test('returns empty totals and maps exact season lookup', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(
        queryResult([{ competitionId: '2', competitionName: 'Premier League', label: '2026' }]),
      )
      .mockResolvedValueOnce(queryResult([]));
    const executor = { query } as unknown as QueryExecutor;

    await expect(listSeasons({ limit: 20 }, executor)).resolves.toEqual({
      records: [],
      hasMore: false,
      totalRecords: 0,
    });
    await expect(findSeason('2', '2026', executor)).resolves.toMatchObject({ label: '2026' });
    await expect(findSeason('2', '1900', executor)).resolves.toBeNull();
  });
});

describe('competitor repository', () => {
  test('applies competition, season, name, and keyset scope in deterministic order', async () => {
    const query = vi.fn().mockResolvedValue(
      queryResult([
        { competitorId: '4', name: 'Lions' },
        { competitorId: '5', name: 'Lions Academy' },
        { competitorId: '6', name: 'Lions XI' },
      ]),
    );
    const page = await listCompetitors(
      {
        competitionId: '2',
        season: '2026',
        name: 'Lions',
        after: { name: 'Leopards', competitorId: '3' },
        limit: 2,
      },
      { query } as unknown as QueryExecutor,
    );

    expect(page.records.map((record) => record.competitorId)).toEqual(['4', '5']);
    expect(page.hasMore).toBe(true);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('f.competition_id = $2::bigint');
    expect(sql).toContain('f.season = $3::text');
    expect(sql).toContain('(t.name, t.team_id) > ($4::text, $5::bigint)');
    expect(sql).toContain('ORDER BY t.name ASC, t.team_id ASC');
    expect(query.mock.calls[0]?.[1]).toEqual(['%Lions%', '2', '2026', 'Leopards', '3', 3]);
  });

  test('finds a competitor and returns null for an unknown team', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([{ competitorId: '4', name: 'Lions' }]))
      .mockResolvedValueOnce(queryResult([]));
    const executor = { query } as unknown as QueryExecutor;
    await expect(findCompetitorById('4', executor)).resolves.toEqual({
      competitorId: '4',
      name: 'Lions',
    });
    await expect(findCompetitorById('404', executor)).resolves.toBeNull();
  });
});
