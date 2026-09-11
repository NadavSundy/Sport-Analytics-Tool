import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireAdministrator, requireSubmitter } from '../../middleware/require-authorization';
import type { SynchronizeAccount } from '../accounts/account.service';
import {
  createCorrectionController,
  createCorrectionHistoryController,
  createSubmissionController,
  createSubmissionUploadController,
} from './submission.controller';
import { createSubmissionRateLimit } from './submission-rate-limit';
import type { SubmissionService } from './submission.service';
import { createSubmissionUploadMiddleware } from './submission-upload';

export function createSubmissionRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: SubmissionService,
): Router {
  const router = Router();

  router.post(
    '/submissions',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireAdministrator(),
    createSubmissionRateLimit(),
    createSubmissionController(service),
  );

  router.post(
    '/submissions/uploads',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireAdministrator(),
    createSubmissionRateLimit(),
    createSubmissionUploadMiddleware(),
    createSubmissionUploadController(service),
  );

  router.put(
    '/submissions/events/:eventId',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createSubmissionRateLimit(),
    createCorrectionController(service),
  );

  router.get(
    '/submissions/events/:eventId/history',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    requireSubmitter(),
    createCorrectionHistoryController(service),
  );

  return router;
}
