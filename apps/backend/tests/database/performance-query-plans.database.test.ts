import { readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import type { QueryExecutor } from '../../src/database';
import { listParticipantFixtures } from '../../src/modules/participants/participant.repository';

const corpusPath = resolve(__dirname, '../../../../data/performance/representative-t20');
const performanceDescribe =
  process.env.RUN_PERFORMANCE_DATABASE_TESTS === '1' ? describe.sequential : describe.skip;

interface ExplainRow {
  'QUERY PLAN': Array<{
    Plan: QueryPlan;
    'Execution Time': number;
  }>;
}

interface QueryPlan {
  'Node Type': string;
  'Parent Relationship'?: string;
  'CTE Name'?: string;
  'Relation Name'?: string;
  Alias?: string;
  'Actual Loops'?: number;
  Plans?: QueryPlan[];
}

function nodeTypes(plan: QueryPlan): string[] {
  return [plan['Node Type'], ...(plan.Plans ?? []).flatMap(nodeTypes)];
}

function flatten(plan: QueryPlan): QueryPlan[] {
  return [plan, ...(plan.Plans ?? []).flatMap(flatten)];
}

/**
 * Every node reached through a SubPlan branch, including nodes nested below one.
 *
 * A SubPlan is re-evaluated once per row of its parent, so a scan underneath one
 * is a repeated scan. `Parent Relationship` names the branch on the child rather
 * than on the node that owns it, which is why this walks downwards from the
 * branch root rather than reading a property of the parent.
 */
function subPlanNodes(plan: QueryPlan): QueryPlan[] {
  return flatten(plan).flatMap((node) =>
    node['Parent Relationship'] === 'SubPlan' ? flatten(node) : [],
  );
}

performanceDescribe('representative query-plan regression', () => {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  let participantId: string | undefined;

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    const files = (await readdir(corpusPath))
      .filter((file) => /^representative-t20-\d{3}\.json$/.test(file))
      .sort();

    expect(files).toHaveLength(300);
    pool = new Pool({ connectionString: databaseUrl.toString() });
    client = await pool.connect();
    for (const file of files) {
      await ingestMatchData(client, resolve(corpusPath, file), {
        sourceRef: `issue-290-${file}`,
      });
    }

    const participant = await client.query<{ personId: string }>(
      `SELECT person_id::text AS "personId"
       FROM person
       WHERE source_ref = 'fictional-perf-player-1'`,
    );
    participantId = participant.rows[0]?.personId;
  }, 180_000);

  afterAll(async () => {
    if (client) {
      client.release();
    }
    await pool?.end();
  });

  test('removes redundant live-delivery de-duplication without changing result rows', async () => {
    expect(client).toBeDefined();
    expect(participantId).toBeDefined();

    const selectedFixtures = `
      SELECT f.fixture_id
      FROM fixture_squad fs
      JOIN fixture f ON f.fixture_id = fs.fixture_id
      JOIN submission publication
        ON publication.submission_id = f.first_seen_in
       AND publication.status = 'accepted'
      WHERE fs.person_id = $1::bigint
      ORDER BY f.start_date DESC, f.fixture_id DESC
      LIMIT 51
    `;
    const before = `
      SELECT DISTINCT ON (d.innings_id, d.over_number, d.position_in_over)
        d.delivery_id
      FROM delivery_current d
      JOIN innings i ON i.innings_id = d.innings_id AND i.is_super_over = false
      JOIN submission source_submission
        ON source_submission.submission_id = d.submission_id
       AND source_submission.status = 'accepted'
      WHERE i.fixture_id IN (${selectedFixtures})
      ORDER BY d.innings_id, d.over_number, d.position_in_over, d.revision DESC, d.delivery_id DESC
    `;
    const after = `
      SELECT d.delivery_id
      FROM delivery_current d
      JOIN innings i ON i.innings_id = d.innings_id AND i.is_super_over = false
      JOIN submission source_submission
        ON source_submission.submission_id = d.submission_id
       AND source_submission.status = 'accepted'
      WHERE i.fixture_id IN (${selectedFixtures})
    `;
    const executor = client!;
    const beforeRows = await executor.query(before, [participantId]);
    const afterRows = await executor.query(after, [participantId]);
    const beforePlan = await executor.query<ExplainRow>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${before}`,
      [participantId],
    );
    const afterPlan = await executor.query<ExplainRow>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${after}`,
      [participantId],
    );
    const beforeResult = beforePlan.rows[0]?.['QUERY PLAN'][0];
    const afterResult = afterPlan.rows[0]?.['QUERY PLAN'][0];

    expect(beforeRows.rows.map((row) => row.delivery_id).sort()).toEqual(
      afterRows.rows.map((row) => row.delivery_id).sort(),
    );
    expect(beforeResult).toBeDefined();
    expect(afterResult).toBeDefined();

    const beforeNodes = nodeTypes(beforeResult!.Plan);
    const afterNodes = nodeTypes(afterResult!.Plan);
    expect(beforeNodes).toContain('Unique');
    expect(afterNodes).not.toContain('Unique');
    expect(afterResult!['Execution Time']).toBeLessThan(beforeResult!['Execution Time']);

    const measurement = {
      rows: afterRows.rowCount,
      before: { executionMs: beforeResult!['Execution Time'], nodes: beforeNodes },
      after: { executionMs: afterResult!['Execution Time'], nodes: afterNodes },
    };
    console.info(JSON.stringify(measurement));

    if (process.env.PERFORMANCE_PLAN_OUTPUT) {
      await writeFile(
        process.env.PERFORMANCE_PLAN_OUTPUT,
        `${JSON.stringify(measurement, null, 2)}\n`,
      );
    }
  });

  /**
   * Issue #410. The check above measures a hand-written fragment of the
   * participant-history read, and the endpoint's own statement was never
   * planned here: a 34.4% improvement on a 32 ms fragment left a 3,454 ms
   * endpoint untouched. This plans the statement the endpoint actually issues,
   * by capturing it from `listParticipantFixtures` rather than restating it.
   *
   * The assertion is structural, not a duration. `accepted_delivery` is
   * referenced more than once, so it is materialised into a tuplestore, and a
   * tuplestore has no index: any SubPlan that scans it re-reads the whole set
   * once per row of its parent. Issue #410 measured that at 51 and 102 loops,
   * 845.5 ms of an 889.5 ms plan. A loop count is stable across machines in a
   * way an elapsed time is not, so the invariant is what is pinned.
   */
  test('plans the endpoint statement with no repeated scan of the materialised delivery set', async () => {
    expect(client).toBeDefined();
    expect(participantId).toBeDefined();
    const executor = client!;

    // Capture the statement the repository issues, so the plan under test cannot
    // drift away from the shipped one.
    const captured: Array<{ text: string; values: unknown[] }> = [];
    const recordingExecutor: QueryExecutor = {
      query: async <Row extends QueryResultRow>(text: string, values?: unknown[]) => {
        captured.push({ text, values: values ?? [] });
        return await executor.query<Row>(text, values);
      },
    };

    const page = await listParticipantFixtures(
      { participantId: participantId!, limit: 50 },
      recordingExecutor,
    );
    expect(page.records).toHaveLength(50);
    expect(captured).toHaveLength(1);

    const statement = captured[0]!;
    const plan = await executor.query<ExplainRow>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${statement.text}`,
      statement.values,
    );
    const result = plan.rows[0]?.['QUERY PLAN'][0];
    expect(result).toBeDefined();

    const repeatedDeliveryScans = subPlanNodes(result!.Plan).filter(
      (node) => node['Node Type'] === 'CTE Scan' && node['CTE Name'] === 'accepted_delivery',
    );

    expect(
      repeatedDeliveryScans.map((node) => ({
        alias: node.Alias,
        loops: node['Actual Loops'],
      })),
    ).toEqual([]);

    // The set is still built exactly once, which is what makes one grouped pass
    // over it cheap.
    const deliveryScans = flatten(result!.Plan).filter(
      (node) => node['Node Type'] === 'CTE Scan' && node['CTE Name'] === 'accepted_delivery',
    );
    expect(deliveryScans.length).toBeGreaterThan(0);
    for (const scan of deliveryScans) {
      expect(scan['Actual Loops']).toBe(1);
    }

    console.info(
      JSON.stringify({
        endpointStatementExecutionMs: result!['Execution Time'],
        acceptedDeliveryScans: deliveryScans.length,
      }),
    );
    // Generous, so that a reintroduced re-scan fails on the loop-count assertion
    // rather than on the clock. A duration is not what this test asserts.
  }, 120_000);
});
