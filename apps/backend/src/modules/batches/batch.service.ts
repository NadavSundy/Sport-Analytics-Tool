import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';

import {
  API_BASE_PATH,
  type BatchListQuery,
  type BatchListResponse,
  type BatchMetadata,
  type BatchReferenceMappingRequest,
  type BatchReferenceMappingResponse,
  type BatchReferenceEntityType,
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
  BatchReferenceMappingConflictError,
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
  mapReference(
    account: ApplicationAccount,
    reference: string,
    request: BatchReferenceMappingRequest,
  ): Promise<BatchReferenceMappingResponse>;
}

interface StoredReferenceCandidate {
  canonicalId: string;
  label: string;
  outOfScope?: boolean;
}

interface StoredReferenceOutcome {
  referencePath: string;
  entityType: BatchReferenceEntityType;
  state: 'resolved' | 'ambiguous' | 'unresolved' | 'invalid';
  submittedReference: unknown;
  candidates: StoredReferenceCandidate[];
  reason: string | null;
}

function candidateReference(
  batchReference: string,
  itemOrdinal: number,
  referencePath: string,
  canonicalId: string,
) {
  const bytes = createHash('sha256')
    .update(`${batchReference}\0${String(itemOrdinal)}\0${referencePath}\0${canonicalId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const value = bytes.toString('hex');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function storedOutcomes(value: unknown): StoredReferenceOutcome[] {
  const results: StoredReferenceOutcome[] = [];
  function visit(candidate: unknown) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
    const record = candidate as Record<string, unknown>;
    if (
      typeof record.referencePath === 'string' &&
      ['competition', 'team', 'fixture', 'innings', 'participant'].includes(
        String(record.entityType),
      ) &&
      ['resolved', 'ambiguous', 'unresolved', 'invalid'].includes(String(record.state)) &&
      Array.isArray(record.candidates)
    ) {
      const candidates = record.candidates.flatMap((entry): StoredReferenceCandidate[] => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const item = entry as Record<string, unknown>;
        return typeof item.canonicalId === 'string' && typeof item.label === 'string'
          ? [
              {
                canonicalId: item.canonicalId,
                label: item.label,
                ...(item.outOfScope === true ? { outOfScope: true } : {}),
              },
            ]
          : [];
      });
      results.push({
        referencePath: record.referencePath,
        entityType: record.entityType as BatchReferenceEntityType,
        state: record.state as StoredReferenceOutcome['state'],
        submittedReference: record.submittedReference,
        candidates,
        reason: typeof record.reason === 'string' ? record.reason : null,
      });
      return;
    }
    for (const nested of Object.values(record)) visit(nested);
  }
  visit(value);
  return results;
}

function reportReferenceResolutions(
  record: BatchReportItemRecord,
  batchReference: string,
  competitionId: string,
) {
  const paths = new Set<string>();
  return storedOutcomes(record.resolvedReferences).flatMap((outcome) => {
    if (outcome.state === 'resolved' || paths.has(outcome.referencePath)) return [];
    paths.add(outcome.referencePath);
    const candidates = outcome.candidates
      .filter(
        (candidate) =>
          !candidate.outOfScope &&
          (outcome.entityType !== 'competition' || candidate.canonicalId === competitionId),
      )
      .map((candidate) => ({
        candidateReference: candidateReference(
          batchReference,
          record.ordinal,
          outcome.referencePath,
          candidate.canonicalId,
        ),
        label: candidate.label,
      }));
    return [
      {
        referencePath: outcome.referencePath,
        entityType: outcome.entityType,
        state: outcome.state,
        submittedReference: outcome.submittedReference,
        reason: outcome.reason,
        requiredAction:
          candidates.length > 0 ? ('select_candidate' as const) : ('contact_reviewer' as const),
        candidates,
      },
    ];
  });
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
    fixtureId: record.fixtureId ?? null,
    fixtureLabel: record.fixtureLabel ?? null,
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

function mapReportItem(
  record: BatchReportItemRecord,
  batchReference: string,
  competitionId: string,
): BatchReportItem {
  const context = reportContext(record);
  return {
    ordinal: record.ordinal,
    outcome: reportOutcome(record),
    location: reportLocation(record),
    context,
    stagedRecordId: record.batchItemId,
    acceptedRecordId: record.publishedEventId,
    referenceResolutions: reportReferenceResolutions(record, batchReference, competitionId),
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
      source: {
        fileName: batch.sourceFileName,
        checksum: batch.source?.checksum.toLowerCase() ?? null,
        packageVersion: batch.packageVersion,
        submitter: {
          accountId: batch.submitterId,
          displayName: batch.submitterDisplayName,
        },
      },
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
        ...(query.status ? { status: query.status } : {}),
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
      const [records, acceptedRecords] = await Promise.all([
        repository.listBatchReportItems(batch.batchId, {
          ...(cursor ? { afterOrdinal: cursor.ordinal } : {}),
          limit: query.limit + 1,
        }),
        repository.listBatchReportItems(batch.batchId, { acceptedOnly: true, limit: 15 }),
      ]);
      const page = records.slice(0, query.limit);
      const [batchStatus, errorGroups, resolution, fixtureSummaries] = await Promise.all([
        status(batch),
        repository.listBatchRuleGroups(batch.batchId),
        repository.getBatchResolutionCounts(batch.batchId),
        repository.listBatchFixtureSummaries(batch.batchId),
      ]);
      const blockingReasons: string[] = [];
      if (batchStatus.counts.rejected > 0) blockingReasons.push('Validation errors remain.');
      if (batchStatus.counts.conflicting > 0) blockingReasons.push('Conflicting records remain.');
      if (resolution.ambiguous > 0) blockingReasons.push('Ambiguous references remain.');
      if (resolution.unresolved > 0) blockingReasons.push('Unresolved references remain.');
      if (resolution.invalid > 0) blockingReasons.push('Invalid references remain.');
      return {
        data: {
          batch: batchStatus,
          errorGroups,
          reviewSummary: {
            validation: {
              accepted: batchStatus.counts.accepted,
              rejected: batchStatus.counts.rejected,
              blockingErrors: errorGroups.reduce((total, group) => total + group.count, 0),
              duplicate: batchStatus.counts.duplicate,
              conflicting: batchStatus.counts.conflicting,
            },
            resolution,
            approvalBlocked: blockingReasons.length > 0,
            blockingReasons,
          },
          fixtureSummaries,
          acceptedSamples: acceptedRecords
            .filter((record) => reportOutcome(record) === 'accepted')
            .slice(0, 15)
            .map((record) => mapReportItem(record, reference, batch.competitionId)),
          items: page.map((record) => mapReportItem(record, reference, batch.competitionId)),
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
        items.push(...page.map((record) => mapReportItem(record, reference, batch.competitionId)));
        if (page.length < 1000) break;
        afterOrdinal = page.at(-1)!.ordinal;
      }
      const [batchStatus, errorGroups, resolution, fixtureSummaries] = await Promise.all([
        status(batch),
        repository.listBatchRuleGroups(batch.batchId),
        repository.getBatchResolutionCounts(batch.batchId),
        repository.listBatchFixtureSummaries(batch.batchId),
      ]);
      const blockingReasons = [
        ...(batchStatus.counts.rejected > 0 ? ['Validation errors remain.'] : []),
        ...(batchStatus.counts.conflicting > 0 ? ['Conflicting records remain.'] : []),
        ...(resolution.ambiguous > 0 ? ['Ambiguous references remain.'] : []),
        ...(resolution.unresolved > 0 ? ['Unresolved references remain.'] : []),
        ...(resolution.invalid > 0 ? ['Invalid references remain.'] : []),
      ];
      return {
        data: {
          batch: batchStatus,
          errorGroups,
          reviewSummary: {
            validation: {
              accepted: batchStatus.counts.accepted,
              rejected: batchStatus.counts.rejected,
              blockingErrors: errorGroups.reduce((total, group) => total + group.count, 0),
              duplicate: batchStatus.counts.duplicate,
              conflicting: batchStatus.counts.conflicting,
            },
            resolution,
            approvalBlocked: blockingReasons.length > 0,
            blockingReasons,
          },
          fixtureSummaries,
          acceptedSamples: items.filter((item) => item.outcome === 'accepted').slice(0, 15),
          items,
        },
      };
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

    async mapReference(account, reference, request) {
      const batch = await findAuthorizedBatch(account, reference);
      let afterOrdinal: number | undefined;
      let selection:
        { entityType: BatchReferenceEntityType; canonicalId: string; label: string } | undefined;

      for (;;) {
        const items = await repository.listBatchItems(batch.batchId, {
          ...(afterOrdinal === undefined ? {} : { afterOrdinal }),
          limit: 1000,
        });
        for (const item of items) {
          if (item.ordinal !== request.itemOrdinal) continue;
          for (const outcome of storedOutcomes(item.resolvedReferences)) {
            if (outcome.referencePath !== request.referencePath) {
              continue;
            }
            const candidate = outcome.candidates.find(
              (value) =>
                !value.outOfScope &&
                (outcome.entityType !== 'competition' ||
                  value.canonicalId === batch.competitionId) &&
                candidateReference(
                  reference,
                  item.ordinal,
                  outcome.referencePath,
                  value.canonicalId,
                ) === request.candidateReference,
            );
            if (candidate) {
              selection = {
                entityType: outcome.entityType,
                canonicalId: candidate.canonicalId,
                label: candidate.label,
              };
              break;
            }
          }
          if (selection) break;
        }
        if (selection || items.length < 1000) break;
        afterOrdinal = items.at(-1)!.ordinal;
      }

      if (!selection) {
        throw new BatchConflictError(
          'The selected candidate is stale or is not available for this reference.',
        );
      }

      try {
        const decision = await repository.queueReferenceMapping({
          decisionReference: randomUUID(),
          batchId: batch.batchId,
          actorId: account.accountId,
          itemOrdinal: request.itemOrdinal,
          referencePath: request.referencePath,
          entityType: selection.entityType,
          candidateId: selection.canonicalId,
          candidateLabel: selection.label,
          decisionKey: request.decisionKey,
        });
        return {
          data: {
            batchReference: reference,
            decisionReference: decision.decisionReference,
            status: decision.state === 'applied' ? 'applied' : 'queued',
            statusUrl: `${API_BASE_PATH}/batches/${reference}`,
            submittedAt: decision.decidedAt,
          },
        };
      } catch (error) {
        if (error instanceof BatchReferenceMappingConflictError) {
          throw new BatchConflictError(error.message);
        }
        throw error;
      }
    },
  };
}
