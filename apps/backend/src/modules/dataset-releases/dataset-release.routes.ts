import {
  createDatasetReleaseSchema,
  datasetReleaseVersionSchema,
} from '@sport-analytics/contracts';
import { Router } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireAdministrator } from '../../middleware/require-authorization';
import type { SynchronizeAccount } from '../accounts/account.service';
import type { DatasetReleaseService } from './dataset-release.service';

export function createDatasetReleaseRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
  service: DatasetReleaseService,
): Router {
  const router = Router();
  const authenticate = requireAuthentication(verifyAccessToken, synchronizeAccount);

  router.post(
    '/admin/dataset-releases',
    authenticate,
    requireAdministrator(),
    (request, response) => {
      const parsed = createDatasetReleaseSchema.safeParse(request.body);
      if (!parsed.success) {
        response
          .status(400)
          .json({ error: { code: 'VALIDATION_FAILED', message: 'The request is invalid.' } });
        return;
      }
      void service
        .createRelease(parsed.data)
        .then((release) => response.status(201).json({ data: release }));
    },
  );

  router.get('/dataset-releases', (_request, response) => {
    void service.listReleases().then((releases) => response.status(200).json({ data: releases }));
  });

  router.get('/dataset-releases/:version', (request, response) => {
    const version = datasetReleaseVersionSchema.safeParse(request.params.version);
    if (!version.success) {
      response
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Dataset release not found.' } });
      return;
    }
    void service.getRelease(version.data).then((release) => {
      if (!release) {
        response
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Dataset release not found.' } });
        return;
      }
      response.status(200).json({ data: release });
    });
  });

  router.get('/dataset-releases/:version/artifact.json', (request, response) => {
    const version = datasetReleaseVersionSchema.safeParse(request.params.version);
    if (!version.success) {
      response
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Dataset release artifact not found.' } });
      return;
    }
    void service.getArtifact(version.data).then((artifact) => {
      if (!artifact) {
        response
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Dataset release artifact not found.' } });
        return;
      }
      response
        .type('application/json')
        .attachment(`dataset-release-${version.data}.json`)
        .send(artifact);
    });
  });

  return router;
}
