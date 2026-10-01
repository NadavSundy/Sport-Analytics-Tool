import { describe, expect, it } from 'vitest';
import {
  analyticsQueryDefinitionSchema,
  QUERY_DEFINITION_VERSION,
  queryDefinitionVersionSchema,
} from '@sport-analytics/contracts';

import { createQueryDefinitionVersion } from '../../src/modules/analytics-query/query-definition-version';

const season = { competitionName: 'Indian Premier League', seasonLabel: '2026' };

function parse(definition: unknown) {
  return analyticsQueryDefinitionSchema.parse(definition);
}

describe('query definition version', () => {
  it('produces a digest of the published shape', () => {
    const version = createQueryDefinitionVersion(
      parse({ kind: 'unsupported', reason: 'bowler_type' }),
    );

    expect(queryDefinitionVersionSchema.parse(version)).toBe(version);
  });

  it('gives the same definition the same version every time', () => {
    const definition = parse({
      kind: 'leaderboard',
      metric: 'most_runs',
      scope: 'season',
      season,
      limit: 10,
    });

    expect(createQueryDefinitionVersion(definition)).toBe(createQueryDefinitionVersion(definition));
  });

  // The hash is of the definition, not of the text that carried it, so a client
  // that orders its JSON differently still gets the same version.
  it('does not depend on key order, at any level', () => {
    const ordered = parse({
      kind: 'leaderboard',
      metric: 'most_runs',
      scope: 'season',
      season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
      limit: 10,
    });
    const reordered = parse({
      limit: 10,
      season: { seasonLabel: '2026', competitionName: 'Indian Premier League' },
      scope: 'season',
      metric: 'most_runs',
      kind: 'leaderboard',
    });

    expect(createQueryDefinitionVersion(reordered)).toBe(createQueryDefinitionVersion(ordered));
  });

  // The contract defaults `limit` to 10, and the version is taken after parsing,
  // so leaving it out and asking for ten are the same question.
  it('treats a defaulted value and an explicit one as the same definition', () => {
    const explicit = parse({
      kind: 'leaderboard',
      metric: 'most_runs',
      scope: 'competition',
      competition: { name: 'Indian Premier League' },
      limit: 10,
    });
    const defaulted = parse({
      kind: 'leaderboard',
      metric: 'most_runs',
      scope: 'competition',
      competition: { name: 'Indian Premier League' },
    });

    expect(createQueryDefinitionVersion(defaulted)).toBe(createQueryDefinitionVersion(explicit));
  });

  it('separates definitions that differ in any field', () => {
    const base = {
      kind: 'leaderboard' as const,
      metric: 'most_runs' as const,
      scope: 'competition' as const,
      competition: { name: 'Indian Premier League' },
      limit: 10,
    };

    const versions = new Set(
      [
        base,
        { ...base, metric: 'most_wickets' as const },
        { ...base, limit: 11 },
        { ...base, competition: { name: 'Big Bash League' } },
      ].map((definition) => createQueryDefinitionVersion(parse(definition))),
    );

    expect(versions.size).toBe(4);
  });

  // Array order is meaningful: a comparison names a first and a second player.
  it('depends on array order, because the comparison order is part of the question', () => {
    const first = parse({
      kind: 'participant_comparison',
      participants: [{ name: 'BB McCullum' }, { name: "D'Arcy Short" }],
      scope: 'career',
    });
    const swapped = parse({
      kind: 'participant_comparison',
      participants: [{ name: "D'Arcy Short" }, { name: 'BB McCullum' }],
      scope: 'career',
    });

    expect(createQueryDefinitionVersion(first)).not.toBe(createQueryDefinitionVersion(swapped));
  });

  // The contract version is part of the digest, so the same definition under a
  // later contract is a different version.
  it('binds the digest to the contract version', () => {
    const definition = parse({ kind: 'unsupported', reason: 'other' });

    expect(createQueryDefinitionVersion(definition)).not.toBe(
      createQueryDefinitionVersion(definition, `${QUERY_DEFINITION_VERSION}-next`),
    );
  });
});
