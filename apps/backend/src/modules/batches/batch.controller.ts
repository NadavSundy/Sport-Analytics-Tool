import {
  batchListQuerySchema,
  batchMetadataSchema,
  batchReferenceMappingRequestSchema,
  batchReferenceSchema,
  batchReportQuerySchema,
  batchReviewRequestSchema,
} from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import { rejectAuthorization } from '../../middleware/authorization-response';
import type { ApplicationAccount } from '../accounts/account';
import { ObjectSizeLimitError, ObjectStorageError } from '../object-storage/object-store';
import {
  BatchConflictError,
  BatchForbiddenError,
  BatchInputError,
  BatchUnavailableError,
  type BatchService,
} from './batch.service';

function rejectReadError(response: Response, error: unknown): boolean {
  if (error instanceof BatchForbiddenError || error instanceof BatchUnavailableError) {
    rejectAuthorization(response);
    return true;
  }
  if (error instanceof BatchInputError) {
    response.status(400).json({ error: { code: 'INVALID_QUERY', message: error.message } });
    return true;
  }
  return false;
}

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
        if (rejectReadError(response, error)) return;
        next(error);
      });
  };
}

export function createBatchListController(service: BatchService): RequestHandler {
  return (request, response, next) => {
    const query = batchListQuerySchema.safeParse(request.query);
    if (!query.success) {
      response
        .status(400)
        .json({ error: { code: 'INVALID_QUERY', message: 'The batch list query is invalid.' } });
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
      .list(authenticated, query.data)
      .then((result) => response.json(result))
      .catch((error: unknown) => {
        if (rejectReadError(response, error)) return;
        next(error);
      });
  };
}

function reportRequest(service: BatchService, download: boolean): RequestHandler {
  return (request, response, next) => {
    const reference = batchReferenceSchema.safeParse(request.params.batchReference);
    const query = batchReportQuerySchema.safeParse(request.query);
    if (!reference.success) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Batch not found.' } });
      return;
    }
    if (!download && !query.success) {
      response
        .status(400)
        .json({ error: { code: 'INVALID_QUERY', message: 'The report query is invalid.' } });
      return;
    }
    let authenticated: ApplicationAccount;
    try {
      authenticated = account(response);
    } catch (error) {
      next(error);
      return;
    }
    const result = download
      ? service.downloadReport(authenticated, reference.data)
      : service.getReport(
          authenticated,
          reference.data,
          query.success ? query.data : { limit: 50 },
        );
    void result
      .then((body) => {
        if (download) {
          response.attachment(`batch-${reference.data}-report.json`);
          response.type('application/json');
        }
        response.json(body);
      })
      .catch((error: unknown) => {
        if (rejectReadError(response, error)) return;
        next(error);
      });
  };
}

export function createBatchReportController(service: BatchService): RequestHandler {
  return reportRequest(service, false);
}

export function createBatchReportDownloadController(service: BatchService): RequestHandler {
  return reportRequest(service, true);
}

export function createBatchReviewController(service: BatchService): RequestHandler {
  return (request, response, next) => {
    const reference = batchReferenceSchema.safeParse(request.params.batchReference);
    const body = batchReviewRequestSchema.safeParse(request.body);
    if (!reference.success) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Batch not found.' } });
      return;
    }
    if (!body.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The batch review decision is invalid.',
          details: body.error.issues.map((issue) => ({
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
      .review(authenticated, reference.data, body.data)
      .then((result) => response.json(result))
      .catch((error: unknown) => {
        if (error instanceof BatchForbiddenError) {
          rejectAuthorization(response);
          return;
        }
        if (error instanceof BatchConflictError) {
          response.status(409).json({
            error: { code: 'BATCH_REVIEW_CONFLICT', message: error.message },
          });
          return;
        }
        next(error);
      });
  };
}

export function createBatchReferenceMappingController(service: BatchService): RequestHandler {
  return (request, response, next) => {
    const reference = batchReferenceSchema.safeParse(request.params.batchReference);
    const body = batchReferenceMappingRequestSchema.safeParse(request.body);
    if (!reference.success) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Batch not found.' } });
      return;
    }
    if (!body.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The reference mapping decision is invalid.',
          details: body.error.issues.map((issue) => ({
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
      .mapReference(authenticated, reference.data, body.data)
      .then((result) => response.status(result.data.status === 'queued' ? 202 : 200).json(result))
      .catch((error: unknown) => {
        if (error instanceof BatchForbiddenError) {
          rejectAuthorization(response);
          return;
        }
        if (error instanceof BatchConflictError) {
          response.status(409).json({
            error: { code: 'BATCH_REFERENCE_MAPPING_CONFLICT', message: error.message },
          });
          return;
        }
        next(error);
      });
  };
}
