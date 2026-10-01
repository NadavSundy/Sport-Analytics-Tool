import type { BatchReportItem } from '@sport-analytics/contracts';
import { describe, expect, test } from 'vitest';

import {
  describeFixtureReference,
  describeInningsReference,
  groupReferenceResolutions,
} from './unresolved-reference-summary';

type Resolution = BatchReportItem['referenceResolutions'][number];

const submittedFixture = {
  season: { context: { name: '2026' } },
  context: {
    date: '2026-06-13',
    teams: [
      { context: { name: 'Thailand Women' } },
      { context: { name: 'United Arab Emirates Women' } },
    ],
    venue: 'Bayuemas Oval, Kuala Lumpur',
  },
  proposal: { matchType: 'T20' },
  sourceId: 'cricsheet:fixture:acc-wpc-2026-final',
};

function resolution(overrides: Partial<Resolution>): Resolution {
  return {
    referencePath: 'fixture',
    entityType: 'fixture',
    state: 'unresolved',
    submittedReference: submittedFixture,
    reason: 'No fixture carries the source reference "acc-wpc-2026-final".',
    requiredAction: 'contact_reviewer',
    candidates: [],
    ...overrides,
  };
}

describe('describeFixtureReference', () => {
  test('extracts teams, a readable date and the venue from the submitted payload', () => {
    expect(describeFixtureReference(submittedFixture)).toEqual({
      title: 'Thailand Women vs United Arab Emirates Women',
      date: '13 June 2026',
      venue: 'Bayuemas Oval, Kuala Lumpur',
      sourceReference: 'cricsheet:fixture:acc-wpc-2026-final',
    });
  });

  test.each([
    ['null', null],
    ['a string', 'acc-wpc-2026-final'],
    ['an empty object', {}],
    ['malformed teams', { context: { teams: 'nope', date: 'not-a-date' } }],
  ])('tolerates %s without throwing', (_case, submitted) => {
    expect(describeFixtureReference(submitted)).toEqual({
      title: null,
      date: null,
      venue: null,
      sourceReference: null,
    });
  });

  test('keeps whatever context is available when some fields are missing', () => {
    expect(
      describeFixtureReference({ context: { teams: [{ context: { name: 'Lions' } }] } }),
    ).toMatchObject({ title: 'Lions', date: null, venue: null });
  });
});

describe('describeInningsReference', () => {
  test('describes the innings ordinal and batting team', () => {
    expect(
      describeInningsReference({
        context: { ordinal: 1, battingTeam: { context: { name: 'Thailand Women' } } },
      }),
    ).toBe('1st innings, Thailand Women batting');
  });

  test('returns null when nothing useful was submitted', () => {
    expect(describeInningsReference(undefined)).toBeNull();
  });
});

describe('groupReferenceResolutions', () => {
  test('nests innings beneath an unresolved fixture instead of reporting it separately', () => {
    const fixture = resolution({});
    const innings = resolution({
      referencePath: 'innings',
      entityType: 'innings',
      submittedReference: { context: { ordinal: 1 } },
      reason: 'The fixture reference did not resolve, so no innings scope is available.',
    });
    const team = resolution({ referencePath: 'team', entityType: 'team' });

    expect(groupReferenceResolutions([fixture, innings, team])).toEqual({
      fixture,
      dependents: [innings],
      independent: [team],
    });
  });

  test('leaves innings independent when the fixture itself is not in error', () => {
    const innings = resolution({ referencePath: 'innings', entityType: 'innings' });
    expect(groupReferenceResolutions([innings])).toEqual({
      fixture: null,
      dependents: [],
      independent: [innings],
    });
  });
});
