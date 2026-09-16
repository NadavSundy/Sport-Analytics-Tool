import { describe, expect, test } from 'vitest';

import {
  eventProvenanceResponseSchema,
  provenanceSubmissionDetailResponseSchema,
  statisticProvenanceResponseSchema,
} from '../provenance';

const source = {
  kind: 'batch' as const,
  reference: '123e4567-e89b-42d3-a456-426614174000',
  submissionId: '30',
  batchReference: '123e4567-e89b-42d3-a456-426614174000',
  batchItemId: '9',
  submissionEventOrdinal: null,
  submitter: { accountId: '1', displayName: 'Submitter' },
  checksum: 'a'.repeat(64),
  decision: {
    decision: 'approved' as const,
    actor: { accountId: '2', displayName: 'Reviewer' },
    decidedAt: '2026-09-09T10:00:00.000Z',
    reason: 'Validated and approved.',
  },
};

describe('protected provenance contracts', () => {
  test('accepts submission lifecycle and decision detail', () => {
    expect(
      provenanceSubmissionDetailResponseSchema.safeParse({
        data: {
          kind: 'batch',
          reference: '123e4567-e89b-42d3-a456-426614174000',
          submissionId: null,
          batchReference: '123e4567-e89b-42d3-a456-426614174000',
          fixtureId: null,
          competitionId: '5',
          submitter: { accountId: '1', displayName: 'Submitter' },
          status: 'published',
          receivedAt: '2026-09-09T09:00:00.000Z',
          updatedAt: '2026-09-09T10:01:00.000Z',
          eventCount: 10,
          source: {
            fileName: 'season.ndjson',
            mediaType: 'application/x-ndjson',
            sizeBytes: 1024,
            checksum: 'a'.repeat(64),
            packageVersion: '1.0',
          },
          lifecycle: [
            {
              fromState: 'awaiting_review',
              toState: 'publishing',
              at: '2026-09-09T10:00:00.000Z',
              actorKind: 'reviewer',
              actorIdentifier: '2',
              reason: 'Approved for publication.',
            },
          ],
          decisions: [source.decision],
        },
      }).success,
    ).toBe(true);
  });

  test('accepts event revision provenance and statistic contributor traces', () => {
    expect(
      eventProvenanceResponseSchema.safeParse({
        data: {
          eventId: '100',
          sourceEventId: '123e4567-e89b-42d3-a456-426614174001',
          fixtureId: '7',
          competitionId: '5',
          currentDeliveryId: '101',
          revisions: [
            {
              deliveryId: '101',
              revision: 2,
              recordedAt: '2026-09-09T10:05:00.000Z',
              supersededAt: null,
              current: true,
              source,
              correction: null,
            },
          ],
        },
      }).success,
    ).toBe(true);

    expect(
      statisticProvenanceResponseSchema.safeParse({
        data: {
          statisticId: 'stat_example',
          fixtureId: '7',
          participantId: null,
          statisticCode: 'team_total',
          scope: 'innings',
          sourceEventCount: 1,
          contributors: [
            {
              deliveryId: '101',
              revision: 2,
              sourceEventId: '123e4567-e89b-42d3-a456-426614174001',
              source,
            },
          ],
          pagination: { nextCursor: null },
        },
      }).success,
    ).toBe(true);
  });

  test('allows tombstoned submitters without losing provenance links', () => {
    expect(
      statisticProvenanceResponseSchema.safeParse({
        data: {
          statisticId: 'stat_example',
          fixtureId: '7',
          participantId: null,
          statisticCode: 'team_total',
          scope: 'innings',
          sourceEventCount: 1,
          contributors: [
            {
              deliveryId: '101',
              revision: 1,
              sourceEventId: null,
              source: {
                ...source,
                kind: 'file',
                reference: '30',
                batchReference: null,
                batchItemId: null,
                submitter: { accountId: null, displayName: null },
                decision: {
                  decision: 'accepted',
                  actor: null,
                  decidedAt: '2026-09-09T09:00:00.000Z',
                  reason: null,
                },
              },
            },
          ],
          pagination: { nextCursor: null },
        },
      }).success,
    ).toBe(true);
  });
});
