import { describe, expect, test } from 'vitest';

import { extractFixtureOnboardingContext } from '../../src/modules/batches/fixture-onboarding';

function fixtureOutcome(referencePath: string, sourceId: string) {
  return {
    referencePath,
    entityType: 'fixture',
    state: 'unresolved',
    candidates: [],
    reason: 'New fixture.',
    submittedReference: { sourceId },
  };
}

function inningsOutcome(referencePath: string, ordinal: number, battingTeamName: string) {
  return {
    referencePath,
    entityType: 'innings',
    state: 'unresolved',
    candidates: [],
    reason: 'No innings yet.',
    submittedReference: {
      context: { ordinal, battingTeam: { context: { name: battingTeamName } } },
    },
  };
}

function participantOutcome(
  referencePath: string,
  reference: { sourceId?: string; name?: string; teamName?: string },
) {
  return {
    referencePath,
    entityType: 'participant',
    state: 'unresolved',
    candidates: [],
    reason: 'No squad yet.',
    submittedReference: {
      ...(reference.sourceId ? { sourceId: reference.sourceId } : {}),
      ...(reference.name
        ? {
            context: {
              name: reference.name,
              ...(reference.teamName ? { team: { context: { name: reference.teamName } } } : {}),
            },
          }
        : {}),
    },
  };
}

describe('extractFixtureOnboardingContext', () => {
  test('collects distinct innings and participants belonging to the target fixture', () => {
    const items = [
      {
        resolvedReferences: {
          fixture: fixtureOutcome('fixtures.0', 'cricsheet:fixture:new-1'),
          innings: inningsOutcome('fixtures.0.innings.0', 0, 'Wits'),
          striker: participantOutcome('fixtures.0.innings.0.events.0.striker', {
            name: 'A. Smith',
            teamName: 'Wits',
          }),
          nonStriker: participantOutcome('fixtures.0.innings.0.events.0.nonStriker', {
            name: 'B. Jones',
            teamName: 'Wits',
          }),
          bowler: participantOutcome('fixtures.0.innings.0.events.0.bowler', {
            name: 'C. Khumalo',
            teamName: 'UCT',
          }),
        },
      },
      {
        // A second delivery in the same innings, same fixture: the striker
        // repeats (must be deduplicated) and a new player (the non-striker
        // rotated on strike) appears.
        resolvedReferences: {
          fixture: fixtureOutcome('fixtures.0', 'cricsheet:fixture:new-1'),
          innings: inningsOutcome('fixtures.0.innings.0', 0, 'Wits'),
          striker: participantOutcome('fixtures.0.innings.0.events.1.striker', {
            name: 'A. Smith',
            teamName: 'Wits',
          }),
          nonStriker: participantOutcome('fixtures.0.innings.0.events.1.nonStriker', {
            name: 'D. Naidoo',
            teamName: 'Wits',
          }),
          bowler: participantOutcome('fixtures.0.innings.0.events.1.bowler', {
            name: 'C. Khumalo',
            teamName: 'UCT',
          }),
        },
      },
      {
        // A different innings entirely for the same fixture.
        resolvedReferences: {
          fixture: fixtureOutcome('fixtures.0', 'cricsheet:fixture:new-1'),
          innings: inningsOutcome('fixtures.0.innings.1', 1, 'UCT'),
          striker: participantOutcome('fixtures.0.innings.1.events.0.striker', {
            name: 'C. Khumalo',
            teamName: 'UCT',
          }),
          nonStriker: participantOutcome('fixtures.0.innings.1.events.0.nonStriker', {
            name: 'E. Petersen',
            teamName: 'UCT',
          }),
          bowler: participantOutcome('fixtures.0.innings.1.events.0.bowler', {
            name: 'A. Smith',
            teamName: 'Wits',
          }),
        },
      },
      {
        // Belongs to an unrelated fixture in the same batch and must be ignored.
        resolvedReferences: {
          fixture: fixtureOutcome('fixtures.1', 'cricsheet:fixture:other'),
          innings: inningsOutcome('fixtures.1.innings.0', 0, 'Other Team'),
          striker: participantOutcome('fixtures.1.innings.0.events.0.striker', {
            name: 'Z. Someone',
            teamName: 'Other Team',
          }),
        },
      },
    ];

    const context = extractFixtureOnboardingContext(items, 'fixtures.0', 'cricsheet:fixture:new-1');

    expect(context.innings).toEqual(
      expect.arrayContaining([
        { ordinal: 0, battingTeamName: 'Wits' },
        { ordinal: 1, battingTeamName: 'UCT' },
      ]),
    );
    expect(context.innings).toHaveLength(2);

    expect(context.participants).toHaveLength(5);
    expect(context.participants).toEqual(
      expect.arrayContaining([
        { name: 'A. Smith', teamName: 'Wits' },
        { name: 'B. Jones', teamName: 'Wits' },
        { name: 'C. Khumalo', teamName: 'UCT' },
        { name: 'D. Naidoo', teamName: 'Wits' },
        { name: 'E. Petersen', teamName: 'UCT' },
      ]),
    );
    expect(context.participants).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Z. Someone' })]),
    );
  });

  test('prefers durable source identifiers over names for participant deduplication', () => {
    const items = [
      {
        resolvedReferences: {
          fixture: fixtureOutcome('fixtures.0', 'cricsheet:fixture:new-1'),
          striker: participantOutcome('fixtures.0.innings.0.events.0.striker', {
            sourceId: 'cricsheet:participant:abc123',
            name: 'A. Smith',
            teamName: 'Wits',
          }),
        },
      },
      {
        // Same durable identity, spelled differently this time; must collapse to one.
        resolvedReferences: {
          fixture: fixtureOutcome('fixtures.0', 'cricsheet:fixture:new-1'),
          striker: participantOutcome('fixtures.0.innings.0.events.1.striker', {
            sourceId: 'cricsheet:participant:abc123',
            name: 'Alan Smith',
            teamName: 'Wits',
          }),
        },
      },
    ];

    const context = extractFixtureOnboardingContext(items, 'fixtures.0', 'cricsheet:fixture:new-1');

    expect(context.participants).toHaveLength(1);
    expect(context.participants[0]).toMatchObject({ sourceId: 'cricsheet:participant:abc123' });
  });

  test('returns nothing when no item belongs to the target fixture', () => {
    const items = [
      {
        resolvedReferences: {
          fixture: fixtureOutcome('fixtures.0', 'cricsheet:fixture:different'),
          innings: inningsOutcome('fixtures.0.innings.0', 0, 'Wits'),
        },
      },
    ];

    const context = extractFixtureOnboardingContext(items, 'fixtures.0', 'cricsheet:fixture:new-1');

    expect(context.innings).toEqual([]);
    expect(context.participants).toEqual([]);
  });

  test('ignores innings and participant outcomes with incomplete context', () => {
    const items = [
      {
        resolvedReferences: {
          fixture: fixtureOutcome('fixtures.0', 'cricsheet:fixture:new-1'),
          innings: {
            referencePath: 'fixtures.0.innings.0',
            entityType: 'innings',
            state: 'unresolved',
            candidates: [],
            reason: null,
            submittedReference: { context: { ordinal: 0 } }, // missing batting team
          },
          striker: {
            referencePath: 'fixtures.0.innings.0.events.0.striker',
            entityType: 'participant',
            state: 'invalid',
            candidates: [],
            reason: null,
            submittedReference: {}, // no sourceId and no name
          },
        },
      },
    ];

    const context = extractFixtureOnboardingContext(items, 'fixtures.0', 'cricsheet:fixture:new-1');

    expect(context.innings).toEqual([]);
    expect(context.participants).toEqual([]);
  });
});
