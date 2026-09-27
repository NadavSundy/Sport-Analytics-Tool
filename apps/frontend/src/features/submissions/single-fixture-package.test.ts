import type { Fixture } from '@sport-analytics/contracts';
import { describe, expect, it } from 'vitest';

import { SingleFixturePackageError, validateSingleFixturePackage } from './single-fixture-package';

const fixture = {
  fixtureId: '7',
  competitionId: '5',
  competitionName: 'Premier T20',
  seasonId: '15',
  season: '2026',
  seasonLabel: '2026/27',
  competitors: [
    { competitorId: '20', name: 'Wanderers' },
    { competitorId: '21', name: 'Strikers' },
  ],
  matchType: 'T20',
  teamType: 'domestic',
  gender: 'female',
  ballsPerOver: 6,
  scheduledOvers: 20,
  venue: null,
  toss: null,
  startDate: '2026-08-20',
  endDate: '2026-08-20',
} satisfies Fixture;

describe('single-fixture package scope validation', () => {
  it('accepts readable JSON context for the selected fixture', () => {
    expect(() =>
      validateSingleFixturePackage(
        'fixture.json',
        JSON.stringify({
          fixtures: [
            {
              context: {
                date: '2026-08-20',
                teams: [{ context: { name: 'Strikers' } }, { context: { name: 'Wanderers' } }],
              },
            },
          ],
        }),
        fixture,
      ),
    ).not.toThrow();
  });

  it('accepts quoted CSV names while checking every row', () => {
    expect(() =>
      validateSingleFixturePackage(
        'fixture.csv',
        'fixtureDate,homeTeamName,awayTeamName,notes\r\n2026-08-20,"Wanderers","Strikers","line one\nline two"\r\n',
        fixture,
      ),
    ).not.toThrow();
  });

  it('directs multi-fixture packages to the appropriate workflow', () => {
    expect(() =>
      validateSingleFixturePackage(
        'fixtures.json',
        JSON.stringify({ fixtures: [{ context: {} }, { context: {} }] }),
        fixture,
      ),
    ).toThrowError(
      new SingleFixturePackageError(
        'Single-fixture mode requires exactly one fixture. Choose Season or Back catalogue for larger packages.',
      ),
    );
  });

  it('rejects readable context that does not match the selection', () => {
    expect(() =>
      validateSingleFixturePackage(
        'fixture.csv',
        'fixtureDate,homeTeamName,awayTeamName\n2026-08-21,Wanderers,Strikers\n',
        fixture,
      ),
    ).toThrow(/does not match the selected fixture/);
  });
});
