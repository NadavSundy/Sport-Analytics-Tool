import { seasonUploadPackageSchema, type SeasonUploadPackage } from '@sport-analytics/contracts';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { createBatchRepository } from '../../src/modules/batches/batch.repository';
import {
  resolvePackageReferences,
  type PackageResolution,
  type ReferenceOutcome,
} from '../../src/modules/batches/reference-resolver';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

/**
 * Reference resolution stages what it cannot resolve exactly.
 *
 * These tests cover the cases issue #360 names: a name shared by two members of
 * one squad, a participant renamed since the fixture was recorded, a repeated
 * fixture whose natural key identifies two rows, a fixture the platform has
 * never seen, and a reference to a fixture in another competition. Each must
 * produce a staged outcome rather than a guess, an exception, or a new canonical
 * record.
 *
 * The whole suite runs inside one transaction that is rolled back, so the seeded
 * competition, fixtures and squad never outlive the run.
 */

const prefix = `refres-${String(process.pid)}`;

interface SeededRecords {
  competitionId: string;
  otherCompetitionId: string;
  alphaTeamId: string;
  betaTeamId: string;
  gammaTeamId: string;
  singleFixtureId: string;
  singleFixtureSourceRef: string;
  repeatedFixtureSourceRefs: [string, string];
  crossCompetitionSourceRef: string;
  firstInningsId: string;
  secondInningsId: string;
  duplicateNamePersonIds: [string, string];
  bowlerPersonId: string;
  renamedPersonId: string;
  aliasHolderPersonIds: [string, string];
  submitterId: string;
}

const DUPLICATE_NAME = `${prefix} Duplicate Name`;
const BOWLER_NAME = `${prefix} Unique Bowler`;
const CURRENT_NAME = `${prefix} Current Name`;
const FORMER_NAME = `${prefix} Former Name`;
const SHARED_ALIAS = `${prefix} Shared Alias`;
const SEASON_NAME = '2026';

describe.sequential('batch reference resolution database integration', () => {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  let seeded: SeededRecords | undefined;

  function databaseClient(): PoolClient {
    if (!client) {
      throw new Error('Test database client has not been initialised.');
    }

    return client;
  }

  function records(): SeededRecords {
    if (!seeded) {
      throw new Error('Reference resolution test records have not been seeded.');
    }

    return seeded;
  }

  async function scalar(text: string, values: unknown[] = []): Promise<string> {
    const result = await databaseClient().query<Record<string, string>>(text, values);
    const row = result.rows[0];

    if (!row) {
      throw new Error(`Expected a row from: ${text}`);
    }

    return Object.values(row)[0]!;
  }

  async function insertFixture(
    sourceRef: string,
    competitionId: string,
    startDate: string,
    teamIds: [string, string],
  ): Promise<string> {
    const fixtureId = await scalar(
      `INSERT INTO fixture (
         source_ref, competition_id, season, match_type, team_type, gender,
         balls_per_over, start_date, end_date, outcome, source_version, source_revision
       )
       VALUES ($1, $2::bigint, $3, 'T20', 'club', 'male', 6, $4::date, $4::date,
               'no result', 'test', 1)
       RETURNING fixture_id::text`,
      [sourceRef, competitionId, SEASON_NAME, startDate],
    );

    for (const [index, teamId] of teamIds.entries()) {
      await databaseClient().query(
        `INSERT INTO fixture_team (fixture_id, team_id, ordinal) VALUES ($1, $2, $3)`,
        [fixtureId, teamId, index + 1],
      );
    }

    return fixtureId;
  }

  async function insertSquadMember(
    fixtureId: string,
    teamId: string,
    sourceRef: string,
    displayName: string,
    alias?: string,
  ): Promise<string> {
    const personId = await scalar(
      `INSERT INTO person (source_ref, display_name) VALUES ($1, $2) RETURNING person_id::text`,
      [sourceRef, displayName],
    );

    await databaseClient().query(
      `INSERT INTO fixture_squad (fixture_id, person_id, team_id) VALUES ($1, $2, $3)`,
      [fixtureId, personId, teamId],
    );

    if (alias) {
      await databaseClient().query(`INSERT INTO person_alias (person_id, name) VALUES ($1, $2)`, [
        personId,
        alias,
      ]);
    }

    return personId;
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
      const competitionId = await scalar(
        `INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text`,
        [`${prefix}-competition`],
      );
      const otherCompetitionId = await scalar(
        `INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text`,
        [`${prefix}-other-competition`],
      );

      const alphaTeamId = await scalar(
        `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text`,
        [`${prefix}-alpha`],
      );
      const betaTeamId = await scalar(
        `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text`,
        [`${prefix}-beta`],
      );
      const gammaTeamId = await scalar(
        `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text`,
        [`${prefix}-gamma`],
      );

      const singleFixtureSourceRef = `${prefix}-f1`;
      const singleFixtureId = await insertFixture(
        singleFixtureSourceRef,
        competitionId,
        '2026-01-01',
        [alphaTeamId, betaTeamId],
      );

      // Two fixtures sharing competition, season, date and teams: the repeated
      // fixture case, which the corpus shows for 131 natural keys.
      const repeatedFixtureSourceRefs: [string, string] = [`${prefix}-f2`, `${prefix}-f3`];
      for (const sourceRef of repeatedFixtureSourceRefs) {
        await insertFixture(sourceRef, competitionId, '2026-02-02', [alphaTeamId, betaTeamId]);
      }

      const crossCompetitionSourceRef = `${prefix}-f4`;
      await insertFixture(crossCompetitionSourceRef, otherCompetitionId, '2026-03-03', [
        alphaTeamId,
        gammaTeamId,
      ]);

      const firstInningsId = await scalar(
        `INSERT INTO innings (fixture_id, ordinal, batting_team_id)
         VALUES ($1, 0, $2) RETURNING innings_id::text`,
        [singleFixtureId, alphaTeamId],
      );
      const secondInningsId = await scalar(
        `INSERT INTO innings (fixture_id, ordinal, batting_team_id)
         VALUES ($1, 1, $2) RETURNING innings_id::text`,
        [singleFixtureId, betaTeamId],
      );

      const duplicateNamePersonIds: [string, string] = [
        await insertSquadMember(singleFixtureId, alphaTeamId, `${prefix}-dup-a`, DUPLICATE_NAME),
        await insertSquadMember(singleFixtureId, betaTeamId, `${prefix}-dup-b`, DUPLICATE_NAME),
      ];
      const bowlerPersonId = await insertSquadMember(
        singleFixtureId,
        betaTeamId,
        `${prefix}-bowler`,
        BOWLER_NAME,
      );
      const renamedPersonId = await insertSquadMember(
        singleFixtureId,
        alphaTeamId,
        `${prefix}-renamed`,
        CURRENT_NAME,
        FORMER_NAME,
      );
      const aliasHolderPersonIds: [string, string] = [
        await insertSquadMember(
          singleFixtureId,
          alphaTeamId,
          `${prefix}-alias-a`,
          `${prefix} Alias Holder A`,
          SHARED_ALIAS,
        ),
        await insertSquadMember(
          singleFixtureId,
          betaTeamId,
          `${prefix}-alias-b`,
          `${prefix} Alias Holder B`,
          SHARED_ALIAS,
        ),
      ];

      // A person the platform knows but who is not in this fixture's squad.
      await scalar(
        `INSERT INTO person (source_ref, display_name) VALUES ($1, $2) RETURNING person_id::text`,
        [`${prefix}-outsider`, `${prefix} Outside Squad`],
      );

      const submitterId = await scalar(
        `INSERT INTO app_user (auth_provider, auth_subject, application_role)
         VALUES ('test', $1, 'submitter') RETURNING app_user_id::text`,
        [prefix],
      );

      seeded = {
        competitionId,
        otherCompetitionId,
        alphaTeamId,
        betaTeamId,
        gammaTeamId,
        singleFixtureId,
        singleFixtureSourceRef,
        repeatedFixtureSourceRefs,
        crossCompetitionSourceRef,
        firstInningsId,
        secondInningsId,
        duplicateNamePersonIds,
        bowlerPersonId,
        renamedPersonId,
        aliasHolderPersonIds,
        submitterId,
      };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      client = undefined;
      await pool.end();
      pool = undefined;
      throw error;
    }
  }, 60_000);

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

  function participantByName(name: string): unknown {
    return { context: { name } };
  }

  function event(
    ordinal: number,
    striker: unknown,
    nonStriker: unknown,
    bowler: unknown,
  ): Record<string, unknown> {
    return {
      eventId: `cricsheet:delivery:${prefix}-e${String(ordinal)}`,
      occurrenceSequence: ordinal,
      striker,
      nonStriker,
      bowler,
      runs: { offBat: 1, extras: 0, total: 1 },
    };
  }

  /**
   * Build a package through the published contract, so that the resolver is
   * exercised against exactly the shape a submitter can send.
   */
  function buildPackage(
    competitionName: string,
    fixtures: Record<string, unknown>[],
  ): SeasonUploadPackage {
    return seasonUploadPackageSchema.parse({
      contractVersion: '1.0',
      packageId: `cricsheet:package:${prefix}`,
      competition: { context: { name: competitionName } },
      season: { context: { name: SEASON_NAME } },
      fixtures,
    });
  }

  function singleEventPackage(
    fixtureReference: Record<string, unknown>,
    striker: unknown,
    nonStriker: unknown,
    bowler: unknown,
    competitionName = `${prefix}-competition`,
    // Zero-based, as the stored column is. A package ordinal is the stored
    // ordinal, so this default names the fixture's first innings.
    inningsOrdinal = 0,
  ): SeasonUploadPackage {
    return buildPackage(competitionName, [
      {
        ...fixtureReference,
        innings: [
          {
            context: {
              ordinal: inningsOrdinal,
              battingTeam: { context: { name: `${prefix}-alpha` } },
            },
            events: [event(1, striker, nonStriker, bowler)],
          },
        ],
      },
    ]);
  }

  function outcomeAt(resolution: PackageResolution, referencePath: string): ReferenceOutcome {
    const found = resolution.outcomes.find((value) => value.referencePath === referencePath);

    if (!found) {
      throw new Error(`No outcome was produced for "${referencePath}".`);
    }

    return found;
  }

  /**
   * Insert a staging batch directly.
   *
   * `createBatchRepository().createBatch` is not used here because it does not
   * populate `batch.batch_reference`, which migration 20260903110000000 added as
   * NOT NULL. That break predates this work and is reported rather than fixed:
   * these tests cover reference resolution, not batch receipt.
   */
  async function insertBatch(idempotencyKey: string): Promise<string> {
    const seed = records();

    return scalar(
      `INSERT INTO batch (submitter_id, competition_id, idempotency_key, state)
       VALUES ($1::bigint, $2::bigint, $3, 'stored')
       RETURNING batch_id::text`,
      [seed.submitterId, seed.competitionId, idempotencyKey],
    );
  }

  async function countRows(table: string): Promise<number> {
    const result = await databaseClient().query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${table}`,
    );
    return Number(result.rows[0]?.count ?? '0');
  }

  test('resolves a fixture by source identifier, its innings by ordinal and its participants by squad-scoped name', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}` },
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
        { sourceId: `cricsheet:participant:${prefix}-bowler` },
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');
    expect(fixture.state).toBe('resolved');
    expect(fixture.canonicalId).toBe(seed.singleFixtureId);
    expect(fixture.matchedBy).toBe('source-identifier');

    // Package ordinal 0 is stored ordinal 0: the same number, not a conversion.
    const innings = outcomeAt(resolution, 'fixtures.0.innings.0');
    expect(innings.state).toBe('resolved');
    expect(innings.canonicalId).toBe(seed.firstInningsId);
    expect(innings.matchedBy).toBe('ordinal');

    const striker = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.striker');
    expect(striker.state).toBe('resolved');
    expect(striker.canonicalId).toBe(seed.renamedPersonId);
    expect(striker.matchedBy).toBe('exact-name');

    const bowler = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.bowler');
    expect(bowler.state).toBe('resolved');
    expect(bowler.canonicalId).toBe(seed.bowlerPersonId);
    expect(bowler.matchedBy).toBe('source-identifier');

    expect(resolution.items).toHaveLength(1);
    expect(resolution.items[0]?.state).toBe('resolved');
    expect(resolution.items[0]?.inningsId).toBe(seed.firstInningsId);
    expect(resolution.items[0]?.sourceIdentity).toBe(`cricsheet:delivery:${prefix}-e1`);
  });

  test('resolves dismissed-player and fielder references through the same squad scope', async () => {
    const seed = records();

    const uploadPackage = buildPackage(`${prefix}-competition`, [
      {
        sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}`,
        innings: [
          {
            context: {
              ordinal: 0,
              battingTeam: {
                context: {
                  name: `${prefix}-alpha`,
                },
              },
            },
            events: [
              {
                ...event(
                  1,
                  participantByName(CURRENT_NAME),
                  participantByName(`${prefix} Alias Holder A`),
                  participantByName(BOWLER_NAME),
                ),
                wickets: [
                  {
                    kind: 'caught',
                    playerOut: participantByName(CURRENT_NAME),
                    fielders: [
                      {
                        participant: participantByName(BOWLER_NAME),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const resolution = await resolvePackageReferences(databaseClient(), uploadPackage);

    const playerOut = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.wickets.0.playerOut');

    expect(playerOut.state).toBe('resolved');
    expect(playerOut.canonicalId).toBe(seed.renamedPersonId);

    const fielder = outcomeAt(
      resolution,
      'fixtures.0.innings.0.events.0.wickets.0.fielders.0.participant',
    );

    expect(fielder.state).toBe('resolved');
    expect(fielder.canonicalId).toBe(seed.bowlerPersonId);

    expect(resolution.items[0]?.state).toBe('resolved');

    const participants = resolution.items[0]?.resolvedReferences.participants as
      Record<string, { canonicalId?: string | null }> | undefined;

    expect(participants?.['wickets.0.playerOut']?.canonicalId).toBe(seed.renamedPersonId);

    expect(participants?.['wickets.0.fielders.0.participant']?.canonicalId).toBe(
      seed.bowlerPersonId,
    );
  });

  test('accepts matching fixture metadata alongside a source identifier', async () => {
    const seed = records();

    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        {
          sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}`,
          context: {
            date: '2026-01-01',
            teams: [
              { context: { name: `${prefix}-alpha` } },
              { context: { name: `${prefix}-beta` } },
            ],
          },
        },
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
        participantByName(BOWLER_NAME),
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');

    expect(fixture.state).toBe('resolved');
    expect(fixture.canonicalId).toBe(seed.singleFixtureId);
    expect(fixture.matchedBy).toBe('source-identifier');
    expect(resolution.items[0]?.state).toBe('resolved');
  });

  test('rejects conflicting fixture date metadata without changing the canonical fixture', async () => {
    const seed = records();

    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        {
          sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}`,
          context: {
            date: '2026-01-02',
            teams: [
              { context: { name: `${prefix}-alpha` } },
              { context: { name: `${prefix}-beta` } },
            ],
          },
        },
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
        participantByName(BOWLER_NAME),
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');

    expect(fixture.state).toBe('invalid');
    expect(fixture.reason).toContain('FIXTURE_METADATA_CONFLICT');
    expect(fixture.reason).toContain('date');
    expect(resolution.items[0]?.state).toBe('invalid');

    const persisted = await databaseClient().query<{
      startDate: string;
      season: string;
    }>(
      `SELECT
         to_char(start_date, 'YYYY-MM-DD') AS "startDate",
         season
       FROM fixture
       WHERE fixture_id=$1::bigint`,
      [seed.singleFixtureId],
    );

    expect(persisted.rows[0]).toEqual({
      startDate: '2026-01-01',
      season: SEASON_NAME,
    });
  });

  test('rejects a conflicting fixture team pair without changing canonical teams', async () => {
    const seed = records();

    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        {
          sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}`,
          context: {
            date: '2026-01-01',
            teams: [
              { context: { name: `${prefix}-alpha` } },
              { context: { name: `${prefix}-gamma` } },
            ],
          },
        },
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
        participantByName(BOWLER_NAME),
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');

    expect(fixture.state).toBe('invalid');
    expect(fixture.reason).toContain('FIXTURE_METADATA_CONFLICT');
    expect(fixture.reason).toContain('team pair');
    expect(resolution.items[0]?.state).toBe('invalid');

    const persisted = await databaseClient().query<{
      teamId: string;
    }>(
      `SELECT team_id::text AS "teamId"
       FROM fixture_team
       WHERE fixture_id=$1::bigint
       ORDER BY team_id`,
      [seed.singleFixtureId],
    );

    expect(persisted.rows.map((row) => row.teamId).sort()).toEqual(
      [seed.alphaTeamId, seed.betaTeamId].sort(),
    );
  });

  test('resolves the second innings by its own ordinal', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      buildPackage(`${prefix}-competition`, [
        {
          sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}`,
          innings: [
            {
              context: {
                // Stored ordinal 1 is the second innings, and the package says 1.
                ordinal: 1,
                battingTeam: { context: { name: `${prefix}-beta` } },
              },
              events: [
                event(
                  1,
                  participantByName(BOWLER_NAME),
                  participantByName(CURRENT_NAME),
                  participantByName(`${prefix} Alias Holder A`),
                ),
              ],
            },
          ],
        },
      ]),
    );

    const innings = outcomeAt(resolution, 'fixtures.0.innings.0');
    expect(innings.state).toBe('resolved');
    expect(innings.canonicalId).toBe(seed.secondInningsId);
  });

  /**
   * Anti-regression for the removed N-1 mapping.
   *
   * Package ordinals are zero-based, matching `innings.ordinal`. If a conversion
   * were reintroduced, ordinal 0 would become -1 and match nothing, so this test
   * fails rather than quietly resolving to the wrong innings.
   */
  test('treats package innings ordinal 0 as stored ordinal 0, with no conversion', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}` },
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
        participantByName(BOWLER_NAME),
        `${prefix}-competition`,
        0,
      ),
    );

    const innings = outcomeAt(resolution, 'fixtures.0.innings.0');
    expect(innings.state).toBe('resolved');
    expect(innings.canonicalId).toBe(seed.firstInningsId);
    expect(innings.canonicalId).not.toBe(seed.secondInningsId);
  });

  test('accepts a zero innings ordinal in the package contract', () => {
    // Under the previous `.positive()` bound this threw, which is what made the
    // resolver's conversion necessary.
    expect(() =>
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${records().singleFixtureSourceRef}` },
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
        participantByName(BOWLER_NAME),
        `${prefix}-competition`,
        0,
      ),
    ).not.toThrow();
  });

  test('rejects an innings ordinal beyond the stored range', () => {
    expect(() =>
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${records().singleFixtureSourceRef}` },
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
        participantByName(BOWLER_NAME),
        `${prefix}-competition`,
        8,
      ),
    ).toThrow();
  });

  test('says a competition source identifier is unsupported rather than merely not found', async () => {
    const uploadPackage = seasonUploadPackageSchema.parse({
      contractVersion: '1.0',
      packageId: `cricsheet:package:${prefix}`,
      // A source identifier only, with no readable competition name.
      competition: { sourceId: `cricsheet:competition:${prefix}-c1` },
      season: { context: { name: SEASON_NAME } },
      fixtures: [
        {
          sourceId: `cricsheet:fixture:${records().singleFixtureSourceRef}`,
          innings: [
            {
              context: { ordinal: 0, battingTeam: { context: { name: `${prefix}-alpha` } } },
              events: [
                event(
                  1,
                  participantByName(CURRENT_NAME),
                  participantByName(BOWLER_NAME),
                  participantByName(BOWLER_NAME),
                ),
              ],
            },
          ],
        },
      ],
    });

    const resolution = await resolvePackageReferences(databaseClient(), uploadPackage);

    const competition = outcomeAt(resolution, 'competition');
    expect(competition.state).toBe('unresolved');
    expect(competition.reason).toContain('not supported');
    expect(competition.reason).toContain('can never resolve');
    expect(competition.reason).toContain('the competition name');
  });

  test('says a team source identifier is unsupported and names the key that works', async () => {
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        {
          context: {
            date: '2026-01-01',
            teams: [
              { sourceId: `cricsheet:team:${prefix}-alpha` },
              { context: { name: `${prefix}-beta` } },
            ],
          },
        },
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
      ),
    );

    const team = outcomeAt(resolution, 'fixtures.0.context.teams.0');
    expect(team.state).toBe('unresolved');
    expect(team.reason).toContain('not supported');
    expect(team.reason).toContain('the team name');

    // The team it could not resolve is part of the fixture natural key, so the
    // fixture stages too rather than resolving on one team.
    expect(outcomeAt(resolution, 'fixtures.0').state).toBe('unresolved');
  });

  test('says an innings source identifier alone is unsupported', async () => {
    const resolution = await resolvePackageReferences(
      databaseClient(),
      buildPackage(`${prefix}-competition`, [
        {
          sourceId: `cricsheet:fixture:${records().singleFixtureSourceRef}`,
          innings: [
            {
              sourceId: `cricsheet:innings:${prefix}-i1`,
              events: [
                event(
                  1,
                  participantByName(CURRENT_NAME),
                  participantByName(BOWLER_NAME),
                  participantByName(BOWLER_NAME),
                ),
              ],
            },
          ],
        },
      ]),
    );

    const innings = outcomeAt(resolution, 'fixtures.0.innings.0');
    expect(innings.state).toBe('unresolved');
    expect(innings.reason).toContain('not supported');
    expect(innings.reason).toContain('the innings ordinal and batting team');
  });

  test('ignores an unsupported innings source identifier when readable context is also supplied', async () => {
    const seed = records();
    // This is the shape the shipped season-upload templates produce: an innings
    // carrying both a sourceId and readable context.
    const resolution = await resolvePackageReferences(
      databaseClient(),
      buildPackage(`${prefix}-competition`, [
        {
          sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}`,
          innings: [
            {
              sourceId: `cricsheet:innings:${prefix}-i1`,
              context: { ordinal: 0, battingTeam: { context: { name: `${prefix}-alpha` } } },
              events: [
                event(
                  1,
                  participantByName(CURRENT_NAME),
                  participantByName(BOWLER_NAME),
                  participantByName(BOWLER_NAME),
                ),
              ],
            },
          ],
        },
      ]),
    );

    const innings = outcomeAt(resolution, 'fixtures.0.innings.0');
    expect(innings.state).toBe('resolved');
    expect(innings.canonicalId).toBe(seed.firstInningsId);
    expect(innings.matchedBy).toBe('ordinal');
    expect(innings.reason).toContain('ignored');
  });

  test('stages a name shared by two members of one squad as ambiguous, with both candidates', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}` },
        participantByName(DUPLICATE_NAME),
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
      ),
    );

    const striker = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.striker');
    expect(striker.state).toBe('ambiguous');
    expect(striker.canonicalId).toBeNull();
    expect(striker.candidates.map((candidate) => candidate.canonicalId).sort()).toEqual(
      [...seed.duplicateNamePersonIds].sort(),
    );

    // The item is staged, and carries no innings identifier it did not earn.
    expect(resolution.items[0]?.state).toBe('ambiguous');
  });

  test('resolves a renamed participant through a unique exact alias and records the alias match', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}` },
        participantByName(FORMER_NAME),
        participantByName(BOWLER_NAME),
        participantByName(`${prefix} Alias Holder B`),
      ),
    );

    const striker = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.striker');
    expect(striker.state).toBe('resolved');
    expect(striker.canonicalId).toBe(seed.renamedPersonId);
    expect(striker.matchedBy).toBe('exact-alias');
  });

  test('stages an alias shared by two squad members as ambiguous rather than picking one', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}` },
        participantByName(SHARED_ALIAS),
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
      ),
    );

    const striker = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.striker');
    expect(striker.state).toBe('ambiguous');
    expect(striker.canonicalId).toBeNull();
    expect(striker.candidates.map((candidate) => candidate.canonicalId).sort()).toEqual(
      [...seed.aliasHolderPersonIds].sort(),
    );
  });

  test('stages a repeated fixture as ambiguous when the natural key identifies two fixtures', async () => {
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        {
          context: {
            date: '2026-02-02',
            teams: [
              { context: { name: `${prefix}-alpha` } },
              { context: { name: `${prefix}-beta` } },
            ],
          },
        },
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
        participantByName(DUPLICATE_NAME),
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');
    expect(fixture.state).toBe('ambiguous');
    expect(fixture.canonicalId).toBeNull();
    expect(fixture.candidates).toHaveLength(2);

    // With no fixture, there is no squad, so participants are staged too rather
    // than falling back to a global name match.
    const striker = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.striker');
    expect(striker.state).toBe('unresolved');
    expect(striker.canonicalId).toBeNull();
    expect(striker.reason).toContain('never matched globally');
  });

  test('resolves an unrepeated fixture by its natural key', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        {
          context: {
            date: '2026-01-01',
            teams: [
              { context: { name: `${prefix}-alpha` } },
              { context: { name: `${prefix}-beta` } },
            ],
          },
        },
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
        participantByName(`${prefix} Alias Holder A`),
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');
    expect(fixture.state).toBe('resolved');
    expect(fixture.canonicalId).toBe(seed.singleFixtureId);
    expect(fixture.matchedBy).toBe('natural-key');
  });

  test('stages a new fixture as unresolved with no candidates, and creates nothing', async () => {
    const fixturesBefore = await countRows('fixture');
    const teamsBefore = await countRows('team');
    const peopleBefore = await countRows('person');

    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        {
          context: {
            date: '2026-09-09',
            teams: [
              { context: { name: `${prefix}-alpha` } },
              { context: { name: `${prefix}-beta` } },
            ],
          },
        },
        participantByName(`${prefix} Someone New`),
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');
    expect(fixture.state).toBe('unresolved');
    expect(fixture.canonicalId).toBeNull();
    expect(fixture.candidates).toHaveLength(0);
    expect(fixture.reason).toContain('review decision');

    expect(await countRows('fixture')).toBe(fixturesBefore);
    expect(await countRows('team')).toBe(teamsBefore);
    expect(await countRows('person')).toBe(peopleBefore);
  });

  test('treats a fixture in another competition as invalid rather than resolving across the declared scope', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.crossCompetitionSourceRef}` },
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
        participantByName(DUPLICATE_NAME),
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');
    expect(fixture.state).toBe('invalid');
    expect(fixture.canonicalId).toBeNull();
    expect(fixture.candidates[0]?.outOfScope).toBe(true);
    expect(fixture.reason).toContain('different competition');

    expect(resolution.items[0]?.state).toBe('invalid');
    expect(resolution.items[0]?.inningsId).toBeNull();
  });

  test('does not attempt a global match when the competition itself does not resolve', async () => {
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${records().singleFixtureSourceRef}` },
        // A name that is unique platform-wide, so only the scoping rule can
        // prevent it from resolving.
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
        participantByName(DUPLICATE_NAME),
        `${prefix}-competition-that-does-not-exist`,
      ),
    );

    expect(outcomeAt(resolution, 'competition').state).toBe('unresolved');
    expect(outcomeAt(resolution, 'fixtures.0').state).toBe('unresolved');
    expect(outcomeAt(resolution, 'fixtures.0.innings.0').state).toBe('unresolved');

    const striker = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.striker');
    expect(striker.state).toBe('unresolved');
    expect(striker.canonicalId).toBeNull();
  });

  test('never matches a source identifier from another namespace against a stored reference', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        // The value is exactly the stored source reference; only the namespace
        // differs.
        { sourceId: `otherprovider:fixture:${seed.singleFixtureSourceRef}` },
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
        participantByName(DUPLICATE_NAME),
      ),
    );

    const fixture = outcomeAt(resolution, 'fixtures.0');
    expect(fixture.state).toBe('unresolved');
    expect(fixture.canonicalId).toBeNull();
    expect(fixture.reason).toContain('otherprovider');
  });

  test('stages a participant whose source reference names someone outside the resolved squad', async () => {
    const seed = records();
    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}` },
        { sourceId: `cricsheet:participant:${prefix}-outsider` },
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
      ),
    );

    const striker = outcomeAt(resolution, 'fixtures.0.innings.0.events.0.striker');
    expect(striker.state).toBe('unresolved');
    expect(striker.canonicalId).toBeNull();
    expect(striker.reason).toContain('resolved fixture squad');
  });

  test('issues the same number of database round trips regardless of how many events the package carries', async () => {
    const seed = records();

    function countingExecutor(): { executor: QueryExecutor; queries: () => number } {
      let queries = 0;
      const target = databaseClient();

      return {
        executor: {
          async query<Row extends QueryResultRow = QueryResultRow>(
            text: string,
            values?: unknown[],
          ): Promise<QueryResult<Row>> {
            queries += 1;
            return target.query<Row>(text, values);
          },
        },
        queries: () => queries,
      };
    }

    function packageWithEvents(eventCount: number): SeasonUploadPackage {
      return buildPackage(`${prefix}-competition`, [
        {
          sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}`,
          innings: [
            {
              context: {
                ordinal: 0,
                battingTeam: { context: { name: `${prefix}-alpha` } },
              },
              events: Array.from({ length: eventCount }, (_unused, index) =>
                event(
                  index + 1,
                  participantByName(CURRENT_NAME),
                  participantByName(BOWLER_NAME),
                  participantByName(`${prefix} Alias Holder A`),
                ),
              ),
            },
          ],
        },
      ]);
    }

    const small = countingExecutor();
    const smallResolution = await resolvePackageReferences(small.executor, packageWithEvents(2));

    const large = countingExecutor();
    const largeResolution = await resolvePackageReferences(large.executor, packageWithEvents(200));

    expect(smallResolution.items).toHaveLength(2);
    expect(largeResolution.items).toHaveLength(200);
    // Section 7.4 forbids a query per item: a hundredfold increase in events must
    // not change the number of round trips.
    expect(large.queries()).toBe(small.queries());
  });

  test('persists the resolution outcome to the staged item', async () => {
    const seed = records();
    const repository = createBatchRepository(databaseClient());
    const batchId = await insertBatch(`${prefix}-resolution`);

    // Expansion owns the ordinal, the natural-key columns and the payload;
    // resolution owns only the four columns asserted below.
    const [staged] = await repository.insertBatchItems(batchId, [
      { ordinal: 0, overNumber: 0, positionInOver: 0, payload: { note: 'staged' } },
    ]);

    expect(staged?.referenceResolutionState).toBe('resolved');
    expect(staged?.inningsId).toBeNull();

    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}` },
        participantByName(DUPLICATE_NAME),
        participantByName(BOWLER_NAME),
        participantByName(CURRENT_NAME),
      ),
    );

    const item = resolution.items[0]!;
    const [updated] = await repository.applyReferenceResolution([
      {
        batchItemId: staged!.batchItemId,
        inningsId: item.inningsId,
        sourceIdentity: item.sourceIdentity,
        referenceResolutionState: item.state,
        resolvedReferences: item.resolvedReferences as never,
      },
    ]);

    expect(updated?.referenceResolutionState).toBe('ambiguous');
    expect(updated?.sourceIdentity).toBe(`cricsheet:delivery:${prefix}-e1`);
    // The item is ambiguous because of its striker, but the innings reference
    // itself resolved. A reference that did resolve is recorded, so that the
    // natural-key constraint applies; the roll-up state is what marks the item
    // as needing review.
    expect(updated?.inningsId).toBe(seed.firstInningsId);

    const persisted = updated?.resolvedReferences as {
      fixture: { canonicalId: string; matchedBy: string };
      participants: { striker: { state: string; candidates: { canonicalId: string }[] } };
    };

    expect(persisted.fixture.canonicalId).toBe(seed.singleFixtureId);
    expect(persisted.fixture.matchedBy).toBe('source-identifier');
    expect(persisted.participants.striker.state).toBe('ambiguous');
    expect(persisted.participants.striker.candidates.map((c) => c.canonicalId).sort()).toEqual(
      [...seed.duplicateNamePersonIds].sort(),
    );
  });

  test('resolves a resolvable item to a canonical innings when nothing is ambiguous', async () => {
    const seed = records();
    const repository = createBatchRepository(databaseClient());
    const batchId = await insertBatch(`${prefix}-resolution-clean`);

    const [staged] = await repository.insertBatchItems(batchId, [
      { ordinal: 0, overNumber: 0, positionInOver: 1, payload: { note: 'staged' } },
    ]);

    const resolution = await resolvePackageReferences(
      databaseClient(),
      singleEventPackage(
        { sourceId: `cricsheet:fixture:${seed.singleFixtureSourceRef}` },
        participantByName(CURRENT_NAME),
        participantByName(BOWLER_NAME),
        participantByName(`${prefix} Alias Holder A`),
      ),
    );

    const item = resolution.items[0]!;
    const [updated] = await repository.applyReferenceResolution([
      {
        batchItemId: staged!.batchItemId,
        inningsId: item.inningsId,
        sourceIdentity: item.sourceIdentity,
        referenceResolutionState: item.state,
        resolvedReferences: item.resolvedReferences as never,
      },
    ]);

    expect(updated?.referenceResolutionState).toBe('resolved');
    expect(updated?.inningsId).toBe(seed.firstInningsId);
  });
});
