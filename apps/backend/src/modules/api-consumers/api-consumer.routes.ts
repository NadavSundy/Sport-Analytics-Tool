import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireAdministrator } from '../../middleware/require-authorization';
import type { SynchronizeAccount } from '../accounts/account.service';
import { createApiConsumerUsageController } from './api-consumer.controller';
import type { ApiConsumerService } from './api-consumer.service';

export function createApiConsumerRouter(
  verify: VerifyAccessToken,
  synchronize: SynchronizeAccount,
  service: ApiConsumerService,
): Router {
  const router = Router();
  const authenticate = requireAuthentication(verify, synchronize);
  const authorize = requireAdministrator();
  router.get(
    '/admin/api-consumers/:consumerId/usage',
    authenticate,
    authorize,
    createApiConsumerUsageController(service),
  );
  return router;
}
