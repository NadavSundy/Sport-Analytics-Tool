import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireApprovedSubmitter } from '../../middleware/require-authorization';
import type { SynchronizeAccount } from '../accounts/account.service';
import { createSubmissionController } from './submission.controller';
import { createSubmissionRateLimit } from './submission-rate-limit';
import type { SubmissionService } from './submission.service';

export function createSubmissionRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: SubmissionService,
): Router {
  const router = Router();

  router.post(
    '/submissions',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireApprovedSubmitter(),
    createSubmissionRateLimit(),
    createSubmissionController(service),
  );

  return router;
}
