import { seasonUploadPackageSchema } from '@sport-analytics/contracts';
import type { QueryResult, QueryResultRow } from 'pg';
import { describe, expect, test, vi } from 'vitest';

import {
  resolvePackageReferences,
  type QueryExecutor,
  type ReferenceOutcome,
  type ReferenceResolutionOverride,
} from './index';

interface ResolverRows {
  competitions: Array<{ canonicalId: string; name: string }>;
  teams: Array<{ canonicalId: string; name: string }>;
  fixturesBySource: Array<{
    canonicalId: string;
    sourceRef: string;
    competitionId: string | null;
    season: string | null;
    startDate: string | null;
    teamIds: string[];
    venue: string | null;
  }>;
  fixturesById: ResolverRows['fixturesBySource'];
  fixturesByNaturalKey: Array<{
    canonicalId: string;
    competitionId: string | null;
    season: string | null;
    startDate: string;
    teamIds: string[];
  }>;
  innings: Array<{
    canonicalId: string;
    fixtureId: string;
    ordinal: number;
    battingTeamId: string | null;
  }>;
  squad: Array<{
    fixtureId: string;
    canonicalId: string;
    displayName: string;
    sourceRef: string | null;
  }>;
  aliases: Array<{ fixtureId: string; canonicalId: string; name: string }>;
}

const baseRows: ResolverRows = {
  competitions: [{ canonicalId: '1', name: 'Premier League' }],
  teams: [
    { canonicalId: '10', name: 'Alpha' },
    { canonicalId: '20', name: 'Beta' },
  ],
  fixturesBySource: [
    {
      canonicalId: '100',
      sourceRef: 'match-100',
      competitionId: '1',
      season: '2026',
      startDate: '2026-01-02',
      teamIds: ['10', '20'],
      venue: 'Oval',
    },
  ],
  fixturesById: [
    {
      canonicalId: '100',
      sourceRef: 'match-100',
      competitionId: '1',
      season: '2026',
      startDate: '2026-01-02',
      teamIds: ['10', '20'],
      venue: 'Oval',
    },
  ],
  fixturesByNaturalKey: [
    {
      canonicalId: '100',
      competitionId: '1',
      season: '2026',
      startDate: '2026-01-02',
      teamIds: ['10', '20'],
    },
  ],
  innings: [{ canonicalId: '1000', fixtureId: '100', ordinal: 0, battingTeamId: '10' }],
  squad: [
    { fixtureId: '100', canonicalId: '101', displayName: 'Alice', sourceRef: 'alice' },
    { fixtureId: '100', canonicalId: '102', displayName: 'Bob', sourceRef: 'bob' },
    { fixtureId: '100', canonicalId: '103', displayName: 'Charlie', sourceRef: 'charlie' },
    { fixtureId: '100', canonicalId: '104', displayName: 'Dana', sourceRef: 'dana' },
    { fixtureId: '100', canonicalId: '105', displayName: 'Shared', sourceRef: 'shared-a' },
    { fixtureId: '100', canonicalId: '106', displayName: 'Shared', sourceRef: 'shared-b' },
  ],
  aliases: [{ fixtureId: '100', canonicalId: '104', name: 'Former Dana' }],
};

function result<Row extends QueryResultRow>(rows: Row[]): QueryResult<Row> {
  return { command: 'SELECT', rowCount: rows.length, oid: 0, fields: [], rows };
}

function resolverExecutor(overrides: Partial<ResolverRows> = {}) {
  const rows = { ...baseRows, ...overrides };
  const query = vi.fn(
    async <Row extends QueryResultRow>(text: string): Promise<QueryResult<Row>> => {
      let selected: unknown[];
      if (text.includes('FROM competition')) selected = rows.competitions;
      else if (text.includes('FROM team')) selected = rows.teams;
      else if (text.includes('f.source_ref = ANY')) selected = rows.fixturesBySource;
      else if (text.includes('f.fixture_id = ANY')) selected = rows.fixturesById;
      else if (text.includes('f.competition_id = $1::bigint')) selected = rows.fixturesByNaturalKey;
      else if (text.includes('FROM innings')) selected = rows.innings;
      else if (text.includes('JOIN person_alias')) selected = rows.aliases;
      else if (text.includes('FROM fixture_squad')) selected = rows.squad;
      else throw new Error(`Unexpected resolver query: ${text}`);
      return result(selected as Row[]);
    },
  );
  return { executor: { query } as QueryExecutor, query };
}

function delivery(
  eventId: string,
  striker: unknown = { context: { name: 'Alice' } },
  nonStriker: unknown = { sourceId: 'app:participant:102' },
  bowler: unknown = { sourceId: 'cricsheet:participant:charlie' },
) {
  return {
    eventId,
    occurrenceSequence: 1,
    overNumber: 0,
    positionInOver: 0,
    striker,
    nonStriker,
    bowler,
    runs: { offBat: 1, extras: 0, total: 1 },
    wickets: [
      {
        kind: 'caught',
        playerOut: { context: { name: 'Former Dana' } },
        fielders: [{ participant: { sourceId: 'cricsheet:participant:alice' } }],
      },
    ],
  };
}

function upload(
  fixtures: unknown[],
  competition: unknown = { context: { name: 'Premier League' } },
) {
  return seasonUploadPackageSchema.parse({
    contractVersion: '1.0',
    packageId: 'cricsheet:package:unit-test',
    competition,
    season: { context: { name: '2026' } },
    fixtures,
  });
}

function sourceFixture(event = delivery('cricsheet:delivery:event-1')) {
  return {
    sourceId: 'cricsheet:fixture:match-100',
    context: {
      date: '2026-01-02',
      venue: 'Oval',
      teams: [{ context: { name: 'Alpha' } }, { context: { name: 'Beta' } }],
    },
    innings: [
      {
        context: { ordinal: 0, battingTeam: { context: { name: 'Alpha' } } },
        events: [event],
      },
    ],
  };
}

function at(outcomes: ReferenceOutcome[], path: string): ReferenceOutcome {
  const found = outcomes.find((value) => value.referencePath === path);
  if (!found) throw new Error(`Missing outcome ${path}`);
  return found;
}

describe('resolvePackageReferences', () => {
  test('resolves a complete mixed-reference delivery with deterministic provenance', async () => {
    const { executor, query } = resolverExecutor();

    const first = await resolvePackageReferences(executor, upload([sourceFixture()]));
    const second = await resolvePackageReferences(executor, upload([sourceFixture()]));

    expect(first).toEqual(second);
    expect(first.items).toHaveLength(1);
    expect(first.items[0]).toMatchObject({
      sourceIdentity: 'cricsheet:delivery:event-1',
      inningsId: '1000',
      state: 'resolved',
      resolvedReferences: {
        fixture: { canonicalId: '100', matchedBy: 'source-identifier' },
        innings: { canonicalId: '1000', matchedBy: 'ordinal' },
        participants: {
          striker: { canonicalId: '101', matchedBy: 'exact-name' },
          nonStriker: { canonicalId: '102', matchedBy: 'application-id' },
          bowler: { canonicalId: '103', matchedBy: 'source-identifier' },
          'wickets.0.playerOut': { canonicalId: '104', matchedBy: 'exact-alias' },
          'wickets.0.fielders.0.participant': {
            canonicalId: '101',
            matchedBy: 'source-identifier',
          },
        },
      },
    });
    expect(at(first.outcomes, 'competition')).toMatchObject({
      state: 'resolved',
      canonicalId: '1',
      matchedBy: 'exact-name',
    });
    expect(query).toHaveBeenCalledTimes(14);
  });

  test('resolves a natural-key fixture while explaining ignored incomparable identifiers', async () => {
    const { executor } = resolverExecutor();
    const fixture = { ...sourceFixture(), sourceId: 'template:fixture:replace-me' };

    const resolution = await resolvePackageReferences(executor, upload([fixture]));

    expect(at(resolution.outcomes, 'fixtures.0')).toMatchObject({
      state: 'resolved',
      canonicalId: '100',
      matchedBy: 'natural-key',
      reason: expect.stringContaining('was ignored'),
    });
    expect(resolution.items[0]?.state).toBe('resolved');
  });

  test('stages ambiguous, unresolved, and invalid references without guessing', async () => {
    const { executor } = resolverExecutor({
      fixturesByNaturalKey: [
        ...baseRows.fixturesByNaturalKey,
        { ...baseRows.fixturesByNaturalKey[0]!, canonicalId: '101' },
      ],
    });
    const ambiguousParticipant = delivery(
      'cricsheet:delivery:event-2',
      { context: { name: 'Shared' } },
      { context: { name: 'Missing' } },
      { sourceId: 'other:participant:charlie', context: { name: 'Charlie' } },
    );
    const fixture = { ...sourceFixture(ambiguousParticipant), sourceId: undefined };

    const resolution = await resolvePackageReferences(executor, upload([fixture]));

    expect(at(resolution.outcomes, 'fixtures.0')).toMatchObject({
      state: 'ambiguous',
      candidates: [{ canonicalId: '100' }, { canonicalId: '101' }],
    });
    expect(at(resolution.outcomes, 'fixtures.0.innings.0')).toMatchObject({
      state: 'unresolved',
      reason: expect.stringContaining('fixture reference did not resolve'),
    });
    expect(at(resolution.outcomes, 'fixtures.0.innings.0.events.0.striker')).toMatchObject({
      state: 'unresolved',
      reason: expect.stringContaining('no squad scope'),
    });
    expect(resolution.items[0]).toMatchObject({ state: 'unresolved', inningsId: null });
  });

  test('applies only valid reviewer overrides and records manual provenance', async () => {
    const { executor } = resolverExecutor();
    const path = 'fixtures.0.innings.0.events.0.striker';
    const packageWithAmbiguity = upload([
      sourceFixture(delivery('cricsheet:delivery:event-3', { context: { name: 'Shared' } })),
    ]);
    const valid = new Map<string, ReferenceResolutionOverride>([
      [path, { entityType: 'participant', canonicalId: '105' }],
    ]);

    const resolved = await resolvePackageReferences(executor, packageWithAmbiguity, valid);
    expect(at(resolved.outcomes, path)).toMatchObject({
      state: 'resolved',
      canonicalId: '105',
      matchedBy: 'manual',
      reason: expect.stringContaining('authorised user'),
    });
    expect(resolved.items[0]?.state).toBe('resolved');

    const rejected = await resolvePackageReferences(
      executor,
      packageWithAmbiguity,
      new Map([[path, { entityType: 'team', canonicalId: '105' }]]),
    );
    expect(at(rejected.outcomes, path).state).toBe('ambiguous');
  });

  test('reports unsupported named source identifiers and scoped fixture conflicts readably', async () => {
    const { executor } = resolverExecutor({
      competitions: [],
      fixturesBySource: [{ ...baseRows.fixturesBySource[0]!, competitionId: '999' }],
    });
    const unsupportedCompetition = upload([sourceFixture()]);
    unsupportedCompetition.competition = { sourceId: 'cricsheet:competition:unknown' };
    const noCompetition = await resolvePackageReferences(executor, unsupportedCompetition);

    expect(at(noCompetition.outcomes, 'competition')).toMatchObject({
      state: 'unresolved',
      reason: expect.stringContaining('Source identifiers are not supported'),
    });
    expect(at(noCompetition.outcomes, 'fixtures.0')).toMatchObject({
      state: 'unresolved',
      reason: expect.stringContaining('competition reference did not resolve'),
    });

    const scoped = resolverExecutor({
      fixturesBySource: [{ ...baseRows.fixturesBySource[0]!, competitionId: '999' }],
    });
    const conflict = await resolvePackageReferences(scoped.executor, upload([sourceFixture()]));
    expect(at(conflict.outcomes, 'fixtures.0')).toMatchObject({
      state: 'invalid',
      candidates: [{ canonicalId: '100', outOfScope: true }],
      reason: expect.stringContaining('different competition'),
    });
    expect(conflict.items[0]?.state).toBe('invalid');
  });

  test.each([
    ['malformed', 'fixture-id', 'could not be read'],
    ['app:fixture:0', 'fixture-id', 'positive database identifier'],
    ['cricsheet:fixture:missing', 'fixture-id', 'No fixture carries'],
  ])('stages fixture identifier %s as expected', async (sourceId, _label, reason) => {
    const { executor } = resolverExecutor({ fixturesBySource: [], fixturesById: [] });
    const packageWithIdentifier = upload([sourceFixture()]);
    packageWithIdentifier.fixtures[0]!.sourceId = sourceId;
    const resolution = await resolvePackageReferences(executor, packageWithIdentifier);
    expect(at(resolution.outcomes, 'fixtures.0')).toMatchObject({
      state: sourceId === 'malformed' || sourceId === 'app:fixture:0' ? 'invalid' : 'unresolved',
      reason: expect.stringContaining(reason),
    });
  });

  test('resolves application fixture and innings identifiers and detects metadata contradictions', async () => {
    const { executor } = resolverExecutor();
    const fixture = {
      ...sourceFixture(),
      sourceId: 'app:fixture:100',
      innings: [
        {
          sourceId: 'app:innings:1000',
          context: { ordinal: 1, battingTeam: { context: { name: 'Beta' } } },
          events: [delivery('cricsheet:delivery:event-4')],
        },
      ],
    };

    const resolution = await resolvePackageReferences(executor, upload([fixture]));

    expect(at(resolution.outcomes, 'fixtures.0')).toMatchObject({
      state: 'resolved',
      matchedBy: 'application-id',
    });
    expect(at(resolution.outcomes, 'fixtures.0.innings.0')).toMatchObject({
      state: 'invalid',
      reason: expect.stringContaining('different ordinal'),
    });
    expect(resolution.items[0]?.state).toBe('invalid');
  });
});
