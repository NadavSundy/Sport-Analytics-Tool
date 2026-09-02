import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireAdministrator } from '../../middleware/require-authorization';
import type { SynchronizeAccount } from '../accounts/account.service';
import {
  createAdminListUsersController,
  createAdminUpdateRoleController,
  createAdminRejectSubmitterAccessRequestController,
  createAdminUpdateSubmitterAccessController,
} from './admin.controller';
import type { AdminService } from './admin.service';

export function createAdminRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: AdminService,
): Router {
  const router = Router();
  const authenticate = requireAuthentication(verifyAccessToken, synchronizeAccount);
  const authorize = requireAdministrator();

  router.get('/admin/users', authenticate, authorize, createAdminListUsersController(service));
  router.patch(
    '/admin/users/:userId/role',
    authenticate,
    authorize,
    createAdminUpdateRoleController(service),
  );
  router.patch(
    '/admin/users/:userId/submitter-access',
    authenticate,
    authorize,
    createAdminUpdateSubmitterAccessController(service),
  );
  router.post(
    '/admin/users/:userId/submitter-access/rejection',
    authenticate,
    authorize,
    createAdminRejectSubmitterAccessRequestController(service),
  );

  return router;
}
