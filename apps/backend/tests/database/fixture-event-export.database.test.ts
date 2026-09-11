import { resolve } from 'node:path';

import {
  FIXTURE_EVENT_EXPORT_PAGE_SIZE,
  type FixtureStatistic,
  type InningsTeamStatistic,
  type ParticipantFixtureStatistic,
} from '@sport-analytics/contracts';
import { Pool, type PoolClient } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { createPublicEventRepository } from '../../src/modules/events/event.repository';
import { createPublicReadService } from '../../src/modules/public-read/public-read.service';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';
import { createFixtureStatisticsService } from '../../src/modules/statistics/fixture-statistics.service';
import { createTestApp } from '../test-app';

/**
 * Issue #467: a fixture-event export read one page of 100 and discarded the
 * cursor, so a 125-event innings exported 100 rows totalling 132 of 179 runs
 * while the calculation trace beside the control displayed all 125. A player
 * trace export went the other way, adding non-striker and fielding rows the
 * trace does not display.
 *
 * These assertions run against a real ingested match rather than mocked pages.
 * Reference fixture 423788 has standard innings longer than one export page,
 * which each test asserts before relying on it, so a single-page export cannot
 * pass by the data happening to fit on one page.
 */

interface CsvExport {
  columns: string[];
  rows: Array<Record<string, string>>;
}

const seedPath = resolve(__dirname, '../../../../database/seeds/matches/423788.json');
const sourceRef = `issue-467-423788-${process.pid}`;

// Every data cell in the export is quoted, with embedded quotes doubled, and
// the header row is not; names may contain commas.
function parseCsvExport(text: string): CsvExport {
  const [header = '', ...lines] = text.trimEnd().split('\r\n');
  const columns = header.split(',');

  return {
    columns,
    rows: lines.map((line) => {
      const cells = [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((match) =>
        (match[1] ?? '').replaceAll('""', '"'),
      );
      expect(cells).toHaveLength(columns.length);
      return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? '']));
    }),
  };
}

function summedRuns(rows: Array<Record<string, string>>): number {
  return rows.reduce((total, row) => total + Number(row.runsTotal), 0);
}

describe.sequential('fixture event export database integration', () => {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  let fixtureId: string | undefined;

  function databaseClient(): PoolClient {
    if (!client) {
      throw new Error('Test database client has not been initialised.');
    }
    return client;
  }

  function ingestedFixtureId(): string {
    if (!fixtureId) {
      throw new Error('Reference fixture has not been ingested.');
    }
    return fixtureId;
  }

  function services() {
    const publicReadService = createPublicReadService(
      createPublicEventRepository(databaseClient()),
    );
    const fixtureStatisticsService = createFixtureStatisticsService(
      (id) => loadFixtureStatisticsSource(id, databaseClient()),
      null,
    );

    return {
      fixtureStatisticsService,
      app: createTestApp(undefined, publicReadService, undefined, fixtureStatisticsService),
    };
  }

  async function traceStatistics(): Promise<FixtureStatistic[]> {
    const statistics = await services().fixtureStatisticsService.getFixtureStatistics(
      ingestedFixtureId(),
      { includeContributors: true },
    );
    if (!statistics) {
      throw new Error('Expected the ingested fixture to derive statistics.');
    }
    return statistics.statistics;
  }

  async function exportCsv(path: string): Promise<CsvExport> {
    const response = await request(services().app)
      .get(`/api/v1/fixtures/${ingestedFixtureId()}${path}`)
      .expect('Content-Type', /text\/csv/)
      .expect(200);

    return parseCsvExport(response.text);
  }

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });
    client = await pool.connect();
    await client.query('BEGIN');

    try {
      const ingestion = await ingestMatchData(client, seedPath, { sourceRef });
      fixtureId = ingestion.fixtureId;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      client = undefined;
      await pool.end();
      pool = undefined;
      throw error;
    }
  }, 30_000);

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      client = undefined;
    }
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  test('exports every event of an innings longer than one page, with the runs the trace displays', async () => {
    const innings = (await traceStatistics()).filter(
      (statistic): statistic is InningsTeamStatistic => statistic.scope === 'innings',
    );
    const longInnings = innings.filter(
      (statistic) => statistic.sourceEventCount > FIXTURE_EVENT_EXPORT_PAGE_SIZE,
    );
    // Without an innings longer than a page this test could not detect a
    // single-page export, so it refuses to pass on data that fits on one.
    expect(longInnings.length).toBeGreaterThan(0);

    for (const statistic of longInnings) {
      const tracedEventIds = (statistic.contributingEvents ?? []).map((event) => event.eventId);
      expect(tracedEventIds).toHaveLength(statistic.sourceEventCount);

      const trace = await exportCsv(`/statistics/${statistic.statisticId}/events/export.csv`);
      expect(trace.rows).toHaveLength(statistic.sourceEventCount);
      expect(trace.rows.map((row) => row.eventId)).toEqual(tracedEventIds);
      expect(summedRuns(trace.rows)).toBe(statistic.metrics.deliveryRuns);

      // The filtered export that the trace used before #467 is complete too.
      const filtered = await exportCsv(
        `/events/export.csv?inningsId=${statistic.inningsId}&competitorId=${statistic.competitorId}`,
      );
      expect(filtered.rows).toHaveLength(statistic.sourceEventCount);
      expect(summedRuns(filtered.rows)).toBe(statistic.metrics.deliveryRuns);
    }
  });

  test('exports a JSON trace with the same events as the CSV trace', async () => {
    const statistic = (await traceStatistics()).find(
      (candidate): candidate is InningsTeamStatistic =>
        candidate.scope === 'innings' &&
        candidate.sourceEventCount > FIXTURE_EVENT_EXPORT_PAGE_SIZE,
    );
    if (!statistic) {
      throw new Error('Expected an innings longer than one export page.');
    }

    const response = await request(services().app)
      .get(
        `/api/v1/fixtures/${ingestedFixtureId()}/statistics/${statistic.statisticId}/events/export.json`,
      )
      .expect(200);

    expect(response.body.data.map((event: { eventId: string }) => event.eventId)).toEqual(
      (statistic.contributingEvents ?? []).map((event) => event.eventId),
    );
    expect(
      response.body.data.reduce(
        (total: number, event: { runs: { total: number } }) => total + event.runs.total,
        0,
      ),
    ).toBe(statistic.metrics.deliveryRuns);
  });

  test('exports a player trace as exactly the events the trace displays', async () => {
    const participants = (await traceStatistics()).filter(
      (statistic): statistic is ParticipantFixtureStatistic => statistic.scope === 'participant',
    );
    expect(participants.length).toBeGreaterThan(0);

    let playersInvolvedBeyondTheirTrace = 0;

    for (const statistic of participants) {
      const tracedEventIds = (statistic.contributingEvents ?? []).map((event) => event.eventId);
      const trace = await exportCsv(`/statistics/${statistic.statisticId}/events/export.csv`);

      expect(trace.rows.map((row) => row.eventId)).toEqual(tracedEventIds);
      for (const row of trace.rows) {
        expect([row.strikerParticipantId, row.bowlerParticipantId]).toContain(
          statistic.participantId,
        );
      }

      const involvement = await exportCsv(
        `/events/export.csv?participantId=${statistic.participantId}`,
      );
      if (involvement.rows.length > trace.rows.length) {
        playersInvolvedBeyondTheirTrace += 1;
      }
    }

    // The participant filter matches non-striker, dismissal and fielding rows,
    // which is why the trace export no longer uses it. If no player differed
    // here the assertion above would prove nothing about that choice.
    expect(playersInvolvedBeyondTheirTrace).toBeGreaterThan(0);
  });
});
