import { json, Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireAdministrator, requireSubmitter } from '../../middleware/require-authorization';
import type { SynchronizeAccount } from '../accounts/account.service';
import { createSubmissionRateLimit } from '../submissions/submission-rate-limit';
import {
  createBatchListController,
  createBatchReceiptController,
  createBatchReferenceMappingController,
  createBatchReportController,
  createBatchReportDownloadController,
  createBatchReviewController,
  createBatchStatusController,
} from './batch.controller';
import type { BatchService } from './batch.service';

export function createBatchRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: BatchService,
): Router {
  const router = Router();
  router.post(
    '/batches',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createSubmissionRateLimit(6),
    createBatchReceiptController(service),
  );
  router.get(
    '/batches',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createBatchListController(service),
  );
  router.post(
    '/batches/:batchReference/reference-mappings',
    json({ limit: '16kb' }),
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createBatchReferenceMappingController(service),
  );
  router.post(
    '/batches/:batchReference/review',
    json({ limit: '16kb' }),
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireAdministrator(),
    createBatchReviewController(service),
  );
  router.get(
    '/batches/:batchReference/report/download',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createBatchReportDownloadController(service),
  );
  router.get(
    '/batches/:batchReference/report',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createBatchReportController(service),
  );
  router.get(
    '/batches/:batchReference',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createBatchStatusController(service),
  );
  return router;
}
