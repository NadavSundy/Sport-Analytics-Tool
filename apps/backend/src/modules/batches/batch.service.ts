import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';

import {
  API_BASE_PATH,
  type BatchMetadata,
  type BatchReceiptResponse,
} from '@sport-analytics/contracts';

import { canSubmitToCompetition } from '../../middleware/require-authorization';
import type { ApplicationAccount } from '../accounts/account';
import type { BatchPayloadStorageService } from '../object-storage/batch-payload-storage.service';
import { ObjectStorageError, ObjectSizeLimitError } from '../object-storage/object-store';
import { createBatchRepository, type BatchRepository } from './batch.repository';

const MAX_CONCURRENT_BATCHES = 3;

export class BatchForbiddenError extends Error {}
export class BatchConflictError extends Error {}
export class BatchUnavailableError extends Error {}

export interface BatchService {
  receive(
    account: ApplicationAccount,
    metadata: BatchMetadata,
    source: Readable,
  ): Promise<BatchReceiptResponse>;
  getStatus(account: ApplicationAccount, reference: string): Promise<BatchReceiptResponse>;
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

export function createBatchService(
  storage: BatchPayloadStorageService,
  repository: BatchRepository = createBatchRepository(),
): BatchService {
  return {
    async receive(account, metadata, source) {
      if (!canSubmitToCompetition(account, metadata.competitionId)) {
        source.destroy();
        throw new BatchForbiddenError();
      }

      const existing = await repository.findBatchByIdempotencyKey(
        account.accountId,
        metadata.idempotencyKey,
      );
      if (existing) {
        source.destroy();
        return receipt(existing);
      }

      if ((await repository.countNonTerminalBatches(account.accountId)) >= MAX_CONCURRENT_BATCHES) {
        source.destroy();
        throw new BatchConflictError('The submitter already has three active batches.');
      }

      let object;
      try {
        object = await storage.upload({
          ownerId: account.accountId,
          originalFilename: metadata.fileName,
          mediaType: metadata.mediaType,
          source,
        });
        const batch = await repository.createBatch({
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
        return receipt(batch);
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
      const batch = await repository.findBatchByReference(reference);
      if (!batch || (account.role !== 'admin' && batch.submitterId !== account.accountId)) {
        throw new BatchForbiddenError();
      }
      return receipt(batch);
    },
  };
}
