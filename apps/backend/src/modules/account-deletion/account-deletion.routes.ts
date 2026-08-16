import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import type { SynchronizeAccount } from '../accounts/account.service';
import { createAccountDeletionController } from './account-deletion.controller';
import type { AccountDeletionService } from './account-deletion.service';

export function createAccountDeletionRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: AccountDeletionService,
): Router {
  const router = Router();

  router.delete(
    '/account',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    createAccountDeletionController(service),
  );

  return router;
}
