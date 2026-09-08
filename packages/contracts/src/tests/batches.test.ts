import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  BATCH_STATES,
  batchListResponseSchema,
  batchReferenceMappingRequestSchema,
  batchReferenceMappingResponseSchema,
  batchReportResponseSchema,
  batchReviewRequestSchema,
  batchStatusResponseSchema,
} from '../batches';

const reference = '123e4567-e89b-42d3-a456-426614174000';

function status(state: (typeof BATCH_STATES)[number]) {
  return {
    batchReference: reference,
    competitionId: '5',
    status: state,
    statusUrl: `/api/v1/batches/${reference}`,
    receivedAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-03T10:05:00.000Z',
    progress: { total: 3, processed: 3, accepted: 2, rejected: 1 },
    counts: { accepted: 2, rejected: 1, unresolved: 1, duplicate: 0, conflicting: 0 },
    review: null,
  };
}

describe('batch reporting contracts', () => {
  test.each(BATCH_STATES)('accepts the %s lifecycle state', (state) => {
    expect(batchStatusResponseSchema.safeParse({ data: status(state) }).success).toBe(true);
  });

  test('keeps every contract lifecycle state in the OpenAPI batch status enum', () => {
    const openapi = readFileSync(resolve(process.cwd(), '../../docs/api/openapi.yaml'), 'utf8');
    const batchStatus = openapi.slice(
      openapi.indexOf('    BatchStatus:'),
      openapi.indexOf('    BatchStatusResponse:'),
    );
    for (const state of BATCH_STATES) expect(batchStatus).toMatch(new RegExp(`\\b${state}\\b`));
  });

  test('accepts paginated batch lists', () => {
    expect(
      batchListResponseSchema.safeParse({
        data: [status('validating')],
        pagination: { nextCursor: 'opaque' },
      }).success,
    ).toBe(true);
  });

  test.each(['approved', 'rejected', 'returned_for_correction'])(
    'accepts a reasoned %s review decision',
    (decision) => {
      expect(
        batchReviewRequestSchema.safeParse({ decision, reason: 'Reviewed against source data.' })
          .success,
      ).toBe(true);
    },
  );

  test('rejects a review decision without a reason', () => {
    expect(
      batchReviewRequestSchema.safeParse({ decision: 'approved', reason: '   ' }).success,
    ).toBe(false);
  });

  test('requires stable rules, complete locations, cricket context and traceability', () => {
    const response = {
      data: {
        batch: status('partially_published'),
        errorGroups: [{ ruleCode: 'REFERENCE_RESOLUTION_FAILED', count: 2 }],
        items: [
          {
            ordinal: 1,
            outcome: 'unresolved',
            location: {
              filePath: 'events.json',
              sheetName: null,
              rowNumber: 13,
              jsonPath: '$.events[1]',
              ordinal: 1,
            },
            context: {
              eventReference: 'event-2',
              inningsId: null,
              overNumber: 4,
              positionInOver: 3,
              description: 'Event event-2 at over 4, delivery 3.',
            },
            stagedRecordId: '42',
            acceptedRecordId: null,
            referenceResolutions: [
              {
                referencePath: 'fixtures.0.innings.0.events.1.striker',
                entityType: 'participant',
                state: 'ambiguous',
                submittedReference: { context: { name: 'A. Smith' } },
                reason: 'Two squad members have this name.',
                requiredAction: 'select_candidate',
                candidates: [
                  {
                    candidateReference: 'e7b5945d-d738-5fc8-9278-8b15f50ab7c5',
                    label: 'A. Smith (Wits)',
                  },
                ],
              },
            ],
            errors: [
              {
                ruleCode: 'REFERENCE_RESOLUTION_FAILED',
                message: 'Unknown striker.',
                location: {
                  filePath: 'events.json',
                  sheetName: null,
                  rowNumber: 13,
                  jsonPath: 'striker',
                  ordinal: 1,
                },
                context: {
                  eventReference: 'event-2',
                  inningsId: null,
                  overNumber: 4,
                  positionInOver: 3,
                  description: 'Event event-2 at over 4, delivery 3.',
                },
              },
            ],
          },
        ],
        pagination: { nextCursor: null },
        downloadUrl: `/api/v1/batches/${reference}/report/download`,
      },
    };
    expect(batchReportResponseSchema.safeParse(response).success).toBe(true);
    expect(
      batchReportResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          errorGroups: [{ ruleCode: 'unstable-code', count: 1 }],
        },
      }).success,
    ).toBe(false);
  });

  test('accepts an opaque, idempotent reference mapping and its durable receipt', () => {
    const candidateReference = 'e7b5945d-d738-5fc8-9278-8b15f50ab7c5';
    expect(
      batchReferenceMappingRequestSchema.safeParse({
        itemOrdinal: 1,
        referencePath: 'fixtures.0.innings.0.events.1.striker',
        candidateReference,
        decisionKey: 'map-smith-1',
      }).success,
    ).toBe(true);
    expect(
      batchReferenceMappingResponseSchema.safeParse({
        data: {
          batchReference: reference,
          decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
          status: 'queued',
          statusUrl: `/api/v1/batches/${reference}`,
          submittedAt: '2026-09-07T12:00:00.000Z',
        },
      }).success,
    ).toBe(true);
  });
});
