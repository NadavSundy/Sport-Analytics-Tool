import type { PoolClient } from 'pg';
import { describe, expect, test, vi } from 'vitest';

import {
  finalBatchValidationState,
  persistReviewerActionableOnboardingTasks,
  isReviewerActionableFixtureResolution,
  prepareItem,
  reviewerActionableParticipantReferences,
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

describe('reviewer-actionable participant references (#729)', () => {
  test('stages an unknown submitted participant when its fixture resolves', () => {
    expect(
      reviewerActionableParticipantReferences({
        fixture: {
          entityType: 'fixture',
          state: 'resolved',
          canonicalId: '91',
        },
        striker: {
          referencePath: 'striker',
          entityType: 'participant',
          state: 'unresolved',
          submittedReference: {
            context: { name: 'New Batter', team: { context: { name: 'Eastern' } } },
          },
        },
        bowler: {
          referencePath: 'bowler',
          entityType: 'participant',
          state: 'invalid',
          submittedReference: { context: { name: 'Malformed Bowler' } },
        },
      }),
    ).toEqual([
      {
        fixtureId: '91',
        participantKey: 'name:New Batter::Eastern',
        submittedName: 'New Batter',
        submittedSourceId: null,
        submittedTeamName: 'Eastern',
      },
    ]);
  });

  /*
   * Which decision a reviewer has to make is not decided here. It depends on
   * the fixture's own two teams and on how many people answer to the submitted
   * name, neither of which is in the resolved references. Deciding it from the
   * reference alone is how this writer came to disagree with the backend
   * derivation, reporting a participant whose team is not one of the fixture's
   * two as `no_durable_identifier`. Issue #708.
   */
  test('does not decide the reason from the reference alone', () => {
    const [staged] = reviewerActionableParticipantReferences({
      fixture: { entityType: 'fixture', state: 'resolved', canonicalId: '91' },
      striker: {
        referencePath: 'striker',
        entityType: 'participant',
        state: 'unresolved',
        submittedReference: {
          context: { name: 'New Batter', team: { context: { name: 'Not In This Fixture' } } },
        },
      },
    });

    expect(staged).toBeDefined();
    expect(staged).not.toHaveProperty('reason');
    expect(staged!.submittedTeamName).toBe('Not In This Fixture');
  });
});

describe('persistReviewerActionableOnboardingTasks', () => {
  const task = {
    fixtureId: '22',
    participantKey: 'name:A Player::Lions',
    submittedName: 'A Player',
    submittedSourceId: null,
    submittedTeamName: 'Lions',
    reason: 'no_durable_identifier' as const,
  };

  function recordingClient() {
    const statements: string[] = [];
    return {
      statements,
      client: {
        query: vi.fn((text: string) => {
          statements.push(text);
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
      } as unknown as Pick<PoolClient, 'query'>,
    };
  }

  test('leaves a settled task alone when the work is derived again', async () => {
    const { statements, client } = recordingClient();

    await persistReviewerActionableOnboardingTasks(client, '7', [task]);

    const upsert = statements.find((statement) =>
      statement.includes('INSERT INTO batch_participant_onboarding_task'),
    );
    expect(upsert).toBeDefined();

    /*
     * Every revalidation runs this, and settling a task queues a revalidation,
     * so an unguarded reset undid a reviewer's answers on the very next pass
     * while the squad rows they created stayed. Issue #708, found in deployed
     * acceptance testing. The guard's behaviour against the real table is
     * covered by the backend's equivalent derivation test.
     */
    expect(upsert).toContain("WHERE batch_participant_onboarding_task.state <> 'onboarded'");

    // The reset it guards still clears every settled field, so a row that is
    // reopened cannot keep naming a decider.
    for (const cleared of ['person_id=NULL', 'onboarded_at=NULL', 'decided_by=NULL']) {
      expect(upsert).toContain(cleared);
    }
  });

  test('writes nothing when a pass found no reviewer-owned work', async () => {
    const { client } = recordingClient();

    await persistReviewerActionableOnboardingTasks(client, '7', []);

    expect(client.query).not.toHaveBeenCalled();
  });

  /*
   * The reason is settled here, against the fixture's own two teams, by the
   * same rule `onboardFixtureCanonicalContext` applies in the backend. This
   * used to read "a team was named, so the team is recognised", so a
   * participant naming a team that is not one of the fixture's two was written
   * as `no_durable_identifier` — and because the upsert overwrites `reason` for
   * an outstanding task, that replaced the backend's correct answer on the
   * first revalidation. Issue #708.
   */
  describe('classifies against the fixture, not the reference alone', () => {
    function classifyingClient(candidateRows: Array<Record<string, string>> = []) {
      const written: unknown[] = [];
      const client = {
        query: vi.fn((text: string, values?: unknown[]) => {
          if (text.includes('FROM fixture_team')) {
            return Promise.resolve({
              rows: [
                { fixtureId: '22', name: 'Lions' },
                { fixtureId: '22', name: 'Tigers' },
              ],
              rowCount: 2,
            });
          }
          if (text.includes('FROM unnest')) {
            return Promise.resolve({ rows: candidateRows, rowCount: candidateRows.length });
          }
          if (text.includes('INSERT INTO batch_participant_onboarding_task')) {
            written.push(JSON.parse(String(values?.[1])));
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
      } as unknown as Pick<PoolClient, 'query'>;
      return { client, reasons: () => (written[0] as Array<{ reason: string }>) ?? [] };
    }

    const staged = (overrides: Record<string, unknown>) => ({
      fixtureId: '22',
      participantKey: 'key',
      submittedName: 'A Player',
      submittedSourceId: null,
      submittedTeamName: 'Lions',
      ...overrides,
    });

    test('a team outside the fixture is team_not_recognised, not a missing identifier', async () => {
      const { client, reasons } = classifyingClient();

      await persistReviewerActionableOnboardingTasks(client, '7', [
        staged({ submittedTeamName: 'Not In This Fixture' }),
      ]);

      expect(reasons()[0]!.reason).toBe('team_not_recognised');
    });

    test('no team named at all is team_not_recognised', async () => {
      const { client, reasons } = classifyingClient();

      await persistReviewerActionableOnboardingTasks(client, '7', [
        staged({ submittedTeamName: null }),
      ]);

      expect(reasons()[0]!.reason).toBe('team_not_recognised');
    });

    test('an identifier that resolved to nobody is identifier_not_found', async () => {
      const { client, reasons } = classifyingClient();

      await persistReviewerActionableOnboardingTasks(client, '7', [
        staged({ submittedSourceId: 'app:participant:2147483647' }),
      ]);

      expect(reasons()[0]!.reason).toBe('identifier_not_found');
    });

    test('one person answering to the name is no_durable_identifier', async () => {
      const { client, reasons } = classifyingClient([
        { submittedName: 'A Player', personId: '1', displayName: 'A Player' },
      ]);

      await persistReviewerActionableOnboardingTasks(client, '7', [staged({})]);

      expect(reasons()[0]!.reason).toBe('no_durable_identifier');
    });

    test('more than one person answering to the name is ambiguous_name', async () => {
      const { client, reasons } = classifyingClient([
        { submittedName: 'A Player', personId: '1', displayName: 'A Player' },
        { submittedName: 'A Player', personId: '2', displayName: 'A Player' },
      ]);

      await persistReviewerActionableOnboardingTasks(client, '7', [staged({})]);

      // Choosing between two people is a different decision from supplying an
      // identifier, and this writer could not report it at all before.
      expect(reasons()[0]!.reason).toBe('ambiguous_name');
    });
  });
});
