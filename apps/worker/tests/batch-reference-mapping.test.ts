import { describe, expect, test } from 'vitest';

import {
  finalBatchValidationState,
  isReviewerActionableFixtureResolution,
  prepareItem,
  referenceOverridesForChunk,
} from '../src/batch-validation-job';

describe('batch reference mapping reprocessing', () => {
  test('binds a retained item decision to the current chunk-local path', () => {
    const result = referenceOverridesForChunk(
      [
        {
          decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
          itemOrdinal: 42,
          referencePath: 'fixtures.7.innings.2.events.19.striker',
          entityType: 'participant',
          canonicalId: '71',
        },
      ],
      new Map([[42, 'fixtures.0.innings.0.events.0']]),
    );

    expect(result.overrides.get('fixtures.0.innings.0.events.0.striker')).toEqual({
      entityType: 'participant',
      canonicalId: '71',
    });
    expect(result.decisionReferencesByPath.get('fixtures.0.innings.0.events.0.striker')).toEqual([
      '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
    ]);
  });

  test('does not apply competing selections to a shared chunk reference', () => {
    const result = referenceOverridesForChunk(
      [
        {
          decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
          itemOrdinal: 1,
          referencePath: 'competition',
          entityType: 'competition',
          canonicalId: '5',
        },
        {
          decisionReference: '26c75206-b66e-46c5-a174-3612d05e6d9c',
          itemOrdinal: 2,
          referencePath: 'competition',
          entityType: 'competition',
          canonicalId: '6',
        },
      ],
      new Map([
        [1, 'fixtures.0.innings.0.events.0'],
        [2, 'fixtures.0.innings.0.events.1'],
      ]),
    );

    expect(result.overrides.has('competition')).toBe(false);
    expect(result.decisionReferencesByPath.has('competition')).toBe(false);
  });

  test('stages complete fixture-proposal evidence unchanged for reviewer resolution', () => {
    const proposal = {
      endDate: '2026-03-14',
      matchType: 'T20',
      teamType: 'club',
      gender: 'female',
      ballsPerOver: 6,
      outcome: 'no result',
      sourceVersion: '1',
      sourceRevision: 0,
    };
    const resolvedReferences = {
      fixture: {
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'unresolved',
        canonicalId: null,
        candidates: [],
        reason: 'No matching fixture.',
        submittedReference: {
          sourceId: 'submitter:fixture:new-fixture',
          context: {
            date: '2026-03-14',
            teams: [{ context: { name: 'Wanderers' } }, { context: { name: 'Strikers' } }],
          },
          season: { context: { name: '2026' } },
          proposal,
        },
      },
    };
    const item = prepareItem(
      {
        ordinal: 0,
        filePath: 'batch.json',
        rowNumber: null,
        fixtureKey: 'fixture-1',
        inningsKey: 'innings-1',
        packageEnvelope: {
          contractVersion: '1.1',
          packageId: 'submitter:package:new-fixture',
          competition: { context: { name: 'Premier T20' } },
          season: { context: { name: '2026' } },
        },
        fixture: {
          sourceId: 'submitter:fixture:new-fixture',
          context: {
            date: '2026-03-14',
            teams: [{ context: { name: 'Wanderers' } }, { context: { name: 'Strikers' } }],
          },
          proposal,
        },
        innings: {
          context: { ordinal: 0, battingTeam: { context: { name: 'Wanderers' } } },
        },
        event: {
          eventId: 'submitter:delivery:new-fixture-1',
          occurrenceSequence: 1,
          overNumber: 0,
          positionInOver: 0,
          ballLabel: '0.1',
          operation: 'upsert',
          striker: { context: { name: 'A. Batter' } },
          nonStriker: { context: { name: 'B. Batter' } },
          bowler: { context: { name: 'C. Bowler' } },
          runs: { offBat: 0, extras: 0, total: 0 },
          extras: {},
          wickets: [],
        },
      },
      { inningsId: null, state: 'unresolved', resolvedReferences },
      { overNumber: 0, positionInOver: 0 },
    );

    expect(item?.resolvedReferences).toEqual(resolvedReferences);
  });
});

describe('reviewer-actionable batch finalisation (#695)', () => {
  const proposal = {
    endDate: '2026-01-01',
    matchType: 'T20',
    teamType: 'university',
    gender: 'mixed',
    ballsPerOver: 6,
    outcome: 'tie',
    sourceVersion: '1.1',
    sourceRevision: 1,
  };

  test('keeps a zero-accepted batch reviewable when an unresolved fixture has a valid proposal', () => {
    expect(
      isReviewerActionableFixtureResolution({
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'unresolved',
        submittedReference: {
          sourceId: 'submitter:fixture:new-1',
          proposal,
        },
      }),
    ).toBe(true);

    expect(finalBatchValidationState(0, true)).toBe('awaiting_review');
  });

  test('still rejects zero-accepted batches without an actionable fixture proposal', () => {
    expect(
      isReviewerActionableFixtureResolution({
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'unresolved',
        submittedReference: {
          sourceId: 'submitter:fixture:new-1',
          proposal: { sourceVersion: '1.1' },
        },
      }),
    ).toBe(false);

    expect(finalBatchValidationState(0, false)).toBe('rejected');
  });

  test('preserves existing accepted-item finalisation behaviour', () => {
    expect(finalBatchValidationState(1, false)).toBe('awaiting_review');
  });

  test('keeps a batch reviewable while participant onboarding work remains (issue #708)', () => {
    // The case #708 exists for. The reviewer has created the canonical fixture,
    // so the fixture now resolves and the #695 guard no longer applies, but the
    // new fixture's squad is incomplete so nothing is accepted. Rejecting here
    // would strand the batch at the moment the reviewer had just acted on it.
    expect(finalBatchValidationState(0, false, true)).toBe('awaiting_review');

    // Once every task is settled and there is still nothing publishable, the
    // batch is rejected as before: outstanding work is what defers it, not the
    // mere existence of a reviewer.
    expect(finalBatchValidationState(0, false, false)).toBe('rejected');

    // The default preserves every existing caller's behaviour.
    expect(finalBatchValidationState(0, false)).toBe('rejected');
    expect(finalBatchValidationState(0, true)).toBe('awaiting_review');
  });

  test('does not treat a resolved fixture as a reviewer action', () => {
    expect(
      isReviewerActionableFixtureResolution({
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'resolved',
        submittedReference: {
          sourceId: 'submitter:fixture:new-1',
          proposal,
        },
      }),
    ).toBe(false);
  });
});
