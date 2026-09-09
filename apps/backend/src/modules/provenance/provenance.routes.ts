import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireSubmitter } from '../../middleware/require-authorization';
import type { SynchronizeAccount } from '../accounts/account.service';
import {
  createEventProvenanceController,
  createProvenanceSubmissionController,
  createProvenanceSubmissionListController,
  createStatisticProvenanceController,
} from './provenance.controller';
import type { ProvenanceService } from './provenance.service';

export function createProvenanceRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: ProvenanceService,
): Router {
  const router = Router();
  const authenticate = requireAuthentication(verifyAccessToken, synchronizeAccount);

  router.get(
    '/provenance/submissions',
    authenticate,
    requireSubmitter(),
    createProvenanceSubmissionListController(service),
  );
  router.get(
    '/provenance/submissions/:reference',
    authenticate,
    requireSubmitter(),
    createProvenanceSubmissionController(service),
  );
  router.get(
    '/provenance/events/:eventId',
    authenticate,
    requireSubmitter(),
    createEventProvenanceController(service),
  );
  router.get(
    '/provenance/fixtures/:fixtureId/statistics/:statisticId',
    authenticate,
    requireSubmitter(),
    createStatisticProvenanceController(service),
  );

  return router;
}
