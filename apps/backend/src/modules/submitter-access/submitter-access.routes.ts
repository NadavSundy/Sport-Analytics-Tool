import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import type { SynchronizeAccount } from '../accounts/account.service';
import { createSubmitterAccessController } from './submitter-access.controller';
import type { SubmitterAccessService } from './submitter-access.service';

export function createSubmitterAccessRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: SubmitterAccessService,
): Router {
  const router = Router();

  router.post(
    '/submitter-access-requests',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    createSubmitterAccessController(service),
  );

  return router;
}
