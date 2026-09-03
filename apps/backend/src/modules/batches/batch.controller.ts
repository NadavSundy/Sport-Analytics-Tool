import { batchMetadataSchema, batchReferenceSchema } from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import { rejectAuthorization } from '../../middleware/authorization-response';
import type { ApplicationAccount } from '../accounts/account';
import { ObjectSizeLimitError, ObjectStorageError } from '../object-storage/object-store';
import {
  BatchConflictError,
  BatchForbiddenError,
  BatchUnavailableError,
  type BatchService,
} from './batch.service';

function account(response: Response): ApplicationAccount {
  const authenticated = response.locals.authenticatedAccount as ApplicationAccount | undefined;
  if (!authenticated) throw new Error('Batch controller requires an authenticated account');
  return authenticated;
}

function metadataFromHeaders(request: Parameters<RequestHandler>[0]) {
  return batchMetadataSchema.safeParse({
    competitionId: request.header('X-Competition-Id'),
    idempotencyKey: request.header('Idempotency-Key'),
    packageVersion: request.header('X-Batch-Package-Version'),
    fileName: request.header('X-File-Name'),
    mediaType: request.header('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase(),
  });
}

export function createBatchReceiptController(service: BatchService): RequestHandler {
  return (request, response, next) => {
    const parsed = metadataFromHeaders(request);
    if (!parsed.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The batch receipt metadata is invalid.',
          details: parsed.error.issues.map((issue) => ({
            code: 'INVALID_FIELD',
            message: issue.message,
            field: issue.path.join('.'),
          })),
        },
      });
      return;
    }
    let authenticated: ApplicationAccount;
    try {
      authenticated = account(response);
    } catch (error) {
      next(error);
      return;
    }
    void service
      .receive(authenticated, parsed.data, request)
      .then((result) => {
        response.status(202).location(result.data.statusUrl).json(result);
      })
      .catch((error: unknown) => {
        if (error instanceof BatchForbiddenError) {
          rejectAuthorization(response);
          return;
        }
        if (error instanceof BatchConflictError) {
          response.status(409).json({ error: { code: 'BATCH_CONFLICT', message: error.message } });
          return;
        }
        if (error instanceof ObjectSizeLimitError) {
          response
            .status(413)
            .json({ error: { code: 'PAYLOAD_TOO_LARGE', message: error.message } });
          return;
        }
        if (error instanceof ObjectStorageError) {
          response.status(503).json({
            error: {
              code: 'BATCH_STORAGE_UNAVAILABLE',
              message: 'The batch payload could not be stored.',
            },
          });
          return;
        }
        next(error);
      });
  };
}

export function createBatchStatusController(service: BatchService): RequestHandler {
  return (request, response, next) => {
    const reference = batchReferenceSchema.safeParse(request.params.batchReference);
    if (!reference.success) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Batch not found.' } });
      return;
    }
    let authenticated: ApplicationAccount;
    try {
      authenticated = account(response);
    } catch (error) {
      next(error);
      return;
    }
    void service
      .getStatus(authenticated, reference.data)
      .then((result) => response.json(result))
      .catch((error: unknown) => {
        if (error instanceof BatchForbiddenError || error instanceof BatchUnavailableError) {
          rejectAuthorization(response);
          return;
        }
        next(error);
      });
  };
}
