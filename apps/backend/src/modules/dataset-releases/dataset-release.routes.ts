import {
  createDatasetReleaseSchema,
  datasetReleaseVersionSchema,
} from '@sport-analytics/contracts';
import { Router } from 'express';
import { pipeline } from 'node:stream';

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
    (request, response, next) => {
      const parsed = createDatasetReleaseSchema.safeParse(request.body);
      if (!parsed.success) {
        response
          .status(400)
          .json({ error: { code: 'VALIDATION_FAILED', message: 'The request is invalid.' } });
        return;
      }
      void service
        .createRelease(parsed.data)
        .then((release) => response.status(201).json({ data: release }))
        .catch(next);
    },
  );

  router.get('/dataset-releases', (_request, response, next) => {
    void service
      .listReleases()
      .then((releases) => response.status(200).json({ data: releases }))
      .catch(next);
  });

  router.get('/dataset-releases/:version', (request, response, next) => {
    const version = datasetReleaseVersionSchema.safeParse(request.params.version);
    if (!version.success) {
      response
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Dataset release not found.' } });
      return;
    }
    void service
      .getRelease(version.data)
      .then((release) => {
        if (!release) {
          response
            .status(404)
            .json({ error: { code: 'NOT_FOUND', message: 'Dataset release not found.' } });
          return;
        }
        response.status(200).json({ data: release });
      })
      .catch(next);
  });

  router.get('/dataset-releases/:version/artifact.json', (request, response, next) => {
    const version = datasetReleaseVersionSchema.safeParse(request.params.version);
    if (!version.success) {
      response
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Dataset release artifact not found.' } });
      return;
    }
    void service
      .getArtifact(version.data)
      .then((artifact) => {
        if (!artifact) {
          response
            .status(404)
            .json({ error: { code: 'NOT_FOUND', message: 'Dataset release artifact not found.' } });
          return;
        }
        response.type('application/json').attachment(`dataset-release-${version.data}.json`);
        pipeline(artifact, response, (error) => {
          if (error) {
            next(error);
          }
        });
      })
      .catch(next);
  });

  return router;
}
