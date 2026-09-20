import { describe, expect, test } from 'vitest';

import { seasonUploadPackageSchema } from '../season-upload';

function delivery(id: string) {
  return {
    eventId: `issue589:delivery:${id}`,
    occurrenceSequence: 1,
    overNumber: 0,
    positionInOver: 0,
    ballLabel: '0.1',
    operation: 'upsert' as const,
    striker: { context: { name: `Striker ${id}` } },
    nonStriker: { context: { name: `Non-striker ${id}` } },
    bowler: { context: { name: `Bowler ${id}` } },
    runs: { offBat: 1, extras: 0, total: 1, nonBoundary: false },
    extras: {},
    wickets: [],
  };
}

function fixture(id: string, date: string, home: string, away: string, season?: string) {
  return {
    ...(season ? { season: { context: { name: season } } } : {}),
    context: {
      date,
      teams: [{ context: { name: home } }, { context: { name: away } }],
    },
    innings: [
      {
        sourceId: `issue589:innings:${id}`,
        context: { ordinal: 0, battingTeam: { context: { name: home } } },
        events: [delivery(id)],
      },
    ],
  };
}

function catalogue() {
  return {
    contractVersion: '1.0',
    packageId: 'issue589:package:two-season-catalogue',
    competition: { context: { name: 'Issue 589 Competition' } },
    // Legacy/default season: fixtures may omit their own season and inherit this.
    season: { context: { name: '2025' } },
    fixtures: [
      fixture('2025-a', '2025-01-10', 'Alpha', 'Bravo'),
      fixture('2025-b', '2025-01-11', 'Charlie', 'Delta'),
      fixture('2026-a', '2026-01-10', 'Alpha', 'Charlie', '2026'),
      fixture('2026-b', '2026-01-11', 'Bravo', 'Delta', '2026'),
    ],
  };
}

describe('multi-season back-catalogue package contract', () => {
  test('accepts multiple fixtures from two seasons in one package', () => {
    const parsed = seasonUploadPackageSchema.safeParse(catalogue());

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.fixtures).toHaveLength(4);
    expect(parsed.data.fixtures[0]?.season).toBeUndefined();
    expect(parsed.data.fixtures[1]?.season).toBeUndefined();
    expect(parsed.data.fixtures[2]?.season?.context?.name).toBe('2026');
    expect(parsed.data.fixtures[3]?.season?.context?.name).toBe('2026');
  });

  test('keeps the package season as a backwards-compatible default', () => {
    const parsed = seasonUploadPackageSchema.parse({
      ...catalogue(),
      packageId: 'issue589:package:legacy-season-default',
      fixtures: [fixture('legacy', '2025-02-01', 'Alpha', 'Bravo')],
    });

    expect(parsed.season.context?.name).toBe('2025');
    expect(parsed.fixtures[0]?.season).toBeUndefined();
  });

  test('rejects an invalid fixture-level season without rejecting valid siblings silently', () => {
    const value = catalogue();
    value.fixtures[2]!.season = { context: { name: '' } };

    const parsed = seasonUploadPackageSchema.safeParse(value);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(
      parsed.error.issues.some(
        (issue) =>
          issue.path[0] === 'fixtures' && issue.path[1] === 2 && issue.path.includes('season'),
      ),
    ).toBe(true);
  });
});
