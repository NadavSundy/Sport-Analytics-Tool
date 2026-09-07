import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';

import {
  API_BASE_PATH,
  type BatchListQuery,
  type BatchListResponse,
  type BatchMetadata,
  type BatchReceiptResponse,
  type BatchReportDownloadResponse,
  type BatchReportItem,
  type BatchReportQuery,
  type BatchReportResponse,
  type BatchReviewRequest,
  type BatchReviewResponse,
  type BatchStatus,
  type BatchStatusResponse,
} from '@sport-analytics/contracts';
import { z } from 'zod';

import { canSubmitToCompetition } from '../../middleware/require-authorization';
import type { ApplicationAccount } from '../accounts/account';
import type { BatchPayloadStorageService } from '../object-storage/batch-payload-storage.service';
import { ObjectStorageError, ObjectSizeLimitError } from '../object-storage/object-store';
import {
  BatchLeaseBusyError,
  BatchReviewConflictError,
  BatchReviewResolutionError,
  createBatchRepository,
  type BatchRepository,
} from './batch.repository';
import type { BatchRecord, BatchReportItemRecord } from './batch.repository';
import { createCursor, InvalidCursorError, readCursor } from '../public-read/cursor';

export class BatchForbiddenError extends Error {}
export class BatchConflictError extends Error {}
export class BatchUnavailableError extends Error {}
export class BatchInputError extends Error {}

const batchListCursorSchema = z.object({
  createdAt: z.string().datetime(),
  batchId: z.string().regex(/^\d+$/),
});
const batchReportCursorSchema = z.object({
  batchReference: z.string().uuid(),
  ordinal: z.number().int().nonnegative(),
});

export interface BatchService {
  receive(
    account: ApplicationAccount,
    metadata: BatchMetadata,
    source: Readable,
  ): Promise<BatchReceiptResponse>;
  getStatus(account: ApplicationAccount, reference: string): Promise<BatchStatusResponse>;
  list(account: ApplicationAccount, query: BatchListQuery): Promise<BatchListResponse>;
  getReport(
    account: ApplicationAccount,
    reference: string,
    query: BatchReportQuery,
  ): Promise<BatchReportResponse>;
  downloadReport(
    account: ApplicationAccount,
    reference: string,
  ): Promise<BatchReportDownloadResponse>;
  review(
    account: ApplicationAccount,
    reference: string,
    request: BatchReviewRequest,
  ): Promise<BatchReviewResponse>;
}

function receipt(batch: {
  batchReference: string;
  state: 'received' | 'stored' | string;
  createdAt: string;
}): BatchReceiptResponse {
  return {
    data: {
      batchReference: batch.batchReference,
      status: batch.state === 'received' ? 'received' : 'stored',
      statusUrl: `${API_BASE_PATH}/batches/${batch.batchReference}`,
      receivedAt: batch.createdAt,
    },
  };
}

function sourceLocation(record: BatchReportItemRecord) {
  const value = record.sourceLocation;
  return value && !Array.isArray(value) && typeof value === 'object' ? value : {};
}

function reportContext(record: BatchReportItemRecord) {
  const event = record.sourceIdentity;
  const cricketPosition =
    record.overNumber === null || record.positionInOver === null
      ? `source item ${record.ordinal + 1}`
      : `over ${record.overNumber}, delivery ${record.positionInOver}`;
  return {
    eventReference: event,
    inningsId: record.inningsId,
    overNumber: record.overNumber,
    positionInOver: record.positionInOver,
    description: event
      ? `Event ${event} at ${cricketPosition}.`
      : `Cricket event at ${cricketPosition}.`,
  };
}

function reportLocation(
  record: BatchReportItemRecord,
  error?: BatchReportItemRecord['errors'][number],
) {
  const source = sourceLocation(record);
  const rowNumber = error?.rowNumber ?? source.rowNumber;
  return {
    filePath: error?.filePath ?? (typeof source.filePath === 'string' ? source.filePath : null),
    sheetName: typeof source.sheetName === 'string' ? source.sheetName : null,
    rowNumber: typeof rowNumber === 'number' && rowNumber > 0 ? rowNumber : null,
    jsonPath: error?.fieldPath ?? (typeof source.jsonPath === 'string' ? source.jsonPath : null),
    ordinal: record.ordinal,
  };
}

function reportOutcome(record: BatchReportItemRecord): BatchReportItem['outcome'] {
  if (
    record.rejectionCode?.includes('CONFLICT') ||
    record.errors.some((e) => e.ruleCode.includes('CONFLICT'))
  ) {
    return 'conflicting';
  }
  if (
    record.state === 'duplicate_skipped' ||
    record.errors.some((e) => e.ruleCode === 'DUPLICATE_BATCH_ITEM')
  ) {
    return 'duplicate';
  }
  if (record.referenceResolutionState && record.referenceResolutionState !== 'resolved') {
    return 'unresolved';
  }
  if (record.state === 'pending') return 'pending';
  if (record.state === 'rejected' || record.errors.length > 0 || record.state === null) {
    return 'rejected';
  }
  return 'accepted';
}

function mapReportItem(record: BatchReportItemRecord): BatchReportItem {
  const context = reportContext(record);
  return {
    ordinal: record.ordinal,
    outcome: reportOutcome(record),
    location: reportLocation(record),
    context,
    stagedRecordId: record.batchItemId,
    acceptedRecordId: record.publishedEventId,
    errors: record.errors.map((error) => ({
      ruleCode: error.ruleCode,
      message: error.message,
      location: reportLocation(record, error),
      context,
    })),
  };
}

function decodeCursor<T>(value: string | undefined, schema: z.ZodType<T>): T | undefined {
  try {
    return readCursor(value, schema);
  } catch (error) {
    if (error instanceof InvalidCursorError)
      throw new BatchInputError('The pagination cursor is invalid.');
    throw error;
  }
}

export function createBatchService(
  storage: BatchPayloadStorageService,
  repository: BatchRepository = createBatchRepository(),
): BatchService {
  async function findAuthorizedBatch(account: ApplicationAccount, reference: string) {
    const batch = await repository.findBatchByReference(reference);
    const canInspect =
      batch &&
      (batch.submitterId === account.accountId ||
        (account.role === 'admin' && account.competitionIds.includes(batch.competitionId)));
    if (!batch || !canInspect) {
      throw new BatchForbiddenError();
    }
    return batch;
  }

  async function status(batch: BatchRecord): Promise<BatchStatus> {
    const [progress, counts, review] = await Promise.all([
      repository.getBatchProgress(batch.batchId),
      repository.getBatchCounts(batch.batchId),
      repository.getLatestReviewDecision(batch.batchId),
    ]);
    return {
      batchReference: batch.batchReference,
      competitionId: batch.competitionId,
      status: batch.state,
      statusUrl: `${API_BASE_PATH}/batches/${batch.batchReference}`,
      receivedAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      progress,
      counts,
      review: review
        ? {
            decision: review.decision,
            actor: {
              accountId: review.actorId,
              displayName: review.actorDisplayName,
            },
            decidedAt: review.decidedAt,
            reason: review.reason,
          }
        : null,
    };
  }

  return {
    async receive(account, metadata, source) {
      if (!canSubmitToCompetition(account, metadata.competitionId)) {
        source.destroy();
        throw new BatchForbiddenError();
      }

      let object;
      try {
        object = await storage.upload({
          ownerId: account.accountId,
          originalFilename: metadata.fileName,
          mediaType: metadata.mediaType,
          source,
        });
        const outcome = await repository.createOrFindBatchAndQueueValidation({
          batchReference: randomUUID(),
          submitterId: account.accountId,
          competitionId: metadata.competitionId,
          idempotencyKey: metadata.idempotencyKey,
          packageVersion: metadata.packageVersion,
          source: {
            checksum: object.sha256,
            uri: `stored-object:${object.objectId}`,
            sizeBytes: object.byteSize,
          },
          state: 'stored',
        });
        if (outcome.activeLimitReached) {
          throw new BatchConflictError('The submitter already has three active batches.');
        }
        if (!outcome.batch) throw new Error('Batch receipt returned no result.');
        if (!outcome.created && outcome.batch.source?.checksum !== object.sha256) {
          throw new BatchConflictError(
            'The Idempotency-Key is already associated with different batch content.',
          );
        }
        return receipt(outcome.batch);
      } catch (error) {
        // A storage record is retained for reconciliable provenance, but no batch row is created
        // unless its source was completely stored and recorded.
        if (error instanceof ObjectSizeLimitError || error instanceof ObjectStorageError) {
          throw error;
        }
        throw error;
      }
    },

    async getStatus(account, reference) {
      return { data: await status(await findAuthorizedBatch(account, reference)) };
    },

    async list(account, query) {
      const cursor = decodeCursor(query.cursor, batchListCursorSchema);
      const records = await repository.listBatches({
        ...(account.role === 'admin'
          ? { competitionIds: account.competitionIds }
          : { submitterId: account.accountId }),
        ...(cursor ? { beforeCreatedAt: cursor.createdAt, beforeBatchId: cursor.batchId } : {}),
        limit: query.limit + 1,
      });
      const page = records.slice(0, query.limit);
      return {
        data: await Promise.all(page.map(status)),
        pagination: {
          nextCursor:
            records.length > query.limit && page.length > 0
              ? createCursor({
                  createdAt: page.at(-1)!.createdAt,
                  batchId: page.at(-1)!.batchId,
                })
              : null,
        },
      };
    },

    async getReport(account, reference, query) {
      const batch = await findAuthorizedBatch(account, reference);
      const cursor = decodeCursor(query.cursor, batchReportCursorSchema);
      if (cursor && cursor.batchReference !== reference) {
        throw new BatchInputError('The pagination cursor is invalid for this batch.');
      }
      const records = await repository.listBatchReportItems(batch.batchId, {
        ...(cursor ? { afterOrdinal: cursor.ordinal } : {}),
        limit: query.limit + 1,
      });
      const page = records.slice(0, query.limit);
      const [batchStatus, errorGroups] = await Promise.all([
        status(batch),
        repository.listBatchRuleGroups(batch.batchId),
      ]);
      return {
        data: {
          batch: batchStatus,
          errorGroups,
          items: page.map(mapReportItem),
          pagination: {
            nextCursor:
              records.length > query.limit && page.length > 0
                ? createCursor({ batchReference: reference, ordinal: page.at(-1)!.ordinal })
                : null,
          },
          downloadUrl: `${API_BASE_PATH}/batches/${reference}/report/download`,
        },
      };
    },

    async downloadReport(account, reference) {
      const batch = await findAuthorizedBatch(account, reference);
      const items: BatchReportItem[] = [];
      let afterOrdinal: number | undefined;
      for (;;) {
        const page = await repository.listBatchReportItems(batch.batchId, {
          ...(afterOrdinal === undefined ? {} : { afterOrdinal }),
          limit: 1000,
        });
        items.push(...page.map(mapReportItem));
        if (page.length < 1000) break;
        afterOrdinal = page.at(-1)!.ordinal;
      }
      const [batchStatus, errorGroups] = await Promise.all([
        status(batch),
        repository.listBatchRuleGroups(batch.batchId),
      ]);
      return { data: { batch: batchStatus, errorGroups, items } };
    },

    async review(account, reference, request) {
      const batch = await repository.findBatchByReference(reference);
      if (
        !batch ||
        account.role !== 'admin' ||
        !account.competitionIds.includes(batch.competitionId)
      ) {
        throw new BatchForbiddenError();
      }
      try {
        const decision = await repository.applyReviewDecision({
          batchId: batch.batchId,
          actorId: account.accountId,
          decision: request.decision,
          reason: request.reason,
        });
        if (decision.resumePublication) {
          await repository.publishAcceptedItems(batch.batchId, `reviewer:${account.accountId}`);
        }
      } catch (error) {
        if (
          error instanceof BatchReviewConflictError ||
          error instanceof BatchReviewResolutionError ||
          error instanceof BatchLeaseBusyError
        ) {
          throw new BatchConflictError(error.message);
        }
        throw error;
      }
      const current = await repository.findBatchById(batch.batchId);
      if (!current) throw new Error('Reviewed batch could not be reloaded.');
      return { data: await status(current) };
    },
  };
}
