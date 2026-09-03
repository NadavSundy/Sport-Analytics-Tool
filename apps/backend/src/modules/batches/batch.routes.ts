import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireSubmitter } from '../../middleware/require-authorization';
import type { SynchronizeAccount } from '../accounts/account.service';
import { createSubmissionRateLimit } from '../submissions/submission-rate-limit';
import { createBatchReceiptController, createBatchStatusController } from './batch.controller';
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
    '/batches/:batchReference',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createBatchStatusController(service),
  );
  return router;
}
