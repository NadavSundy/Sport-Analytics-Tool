import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { API_BASE_PATH, CURRENT_API_VERSION } from '@sport-analytics/contracts';
import { createWeatherRouter } from './modules/weather/weather.routes';
import { WeatherService } from './modules/weather/weather.service';
import {
  createFixtureWeatherService,
  type FixtureWeatherService,
} from './modules/weather/fixture-weather.service';
import {
  createSupabaseAdminUserDeleter,
  createSupabaseAdminUserEmailReader,
  createSupabaseTokenVerifier,
  type VerifyAccessToken,
} from './auth/supabase-auth';
import { loadEnvironment, type Environment } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import {
  createAccountSynchronizer,
  type SynchronizeAccount,
} from './modules/accounts/account.service';
import { createAuthRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';
import { createPublicReadRouter } from './modules/public-read/public-read.routes';
import {
  createPublicReadService,
  type PublicReadService,
} from './modules/public-read/public-read.service';
import { createParticipantAggregatesRouter } from './modules/statistics/participant-aggregates.routes';
import {
  createParticipantAggregatesService,
  type ParticipantAggregatesService,
} from './modules/statistics/participant-aggregates.service';
import { createFixtureStatisticsRouter } from './modules/statistics/fixture-statistics.routes';
import {
  createFixtureStatisticsService,
  type FixtureStatisticsService,
} from './modules/statistics/fixture-statistics.service';
import { createSubmissionRouter } from './modules/submissions/submission.routes';
import {
  createSubmissionService,
  type SubmissionService,
} from './modules/submissions/submission.service';
import { createSubmitterAccessRouter } from './modules/submitter-access/submitter-access.routes';
import {
  createSubmitterAccessService,
  type SubmitterAccessService,
} from './modules/submitter-access/submitter-access.service';
import { createAccountDeletionRouter } from './modules/account-deletion/account-deletion.routes';
import {
  createAccountDeletionService,
  createUnavailableAccountDeletionService,
  type AccountDeletionService,
} from './modules/account-deletion/account-deletion.service';
import { createAdminRouter } from './modules/admin/admin.routes';
import { createAdminService, type AdminService } from './modules/admin/admin.service';
import { createAzureObjectStorageComposition } from './modules/object-storage/azure-object-storage.composition';
import type { BatchPayloadStorageService } from './modules/object-storage/batch-payload-storage.service';
import { createBatchRouter } from './modules/batches/batch.routes';
import { createBatchService, type BatchService } from './modules/batches/batch.service';
import { createApiConsumerRouter } from './modules/api-consumers/api-consumer.routes';
import {
  createApiConsumerService,
  type ApiConsumerService,
} from './modules/api-consumers/api-consumer.service';
import {
  createLazyApiConsumerRepository,
  type ApiConsumerRepository,
} from './modules/api-consumers/api-consumer.repository';
import { createConsumerRouter } from './modules/api-consumers/consumer.routes';
import { createProvenanceRouter } from './modules/provenance/provenance.routes';
import {
  createProvenanceService,
  type ProvenanceService,
} from './modules/provenance/provenance.service';
import { createDatasetReleaseRouter } from './modules/dataset-releases/dataset-release.routes';
import {
  createDatasetReleaseService,
  type DatasetReleaseService,
} from './modules/dataset-releases/dataset-release.service';

export interface AppDependencies {
  environment?: Environment;
  verifyAccessToken?: VerifyAccessToken;
  synchronizeAccount?: SynchronizeAccount;
  publicReadService?: PublicReadService;
  fixtureStatisticsService?: FixtureStatisticsService;
  participantAggregatesService?: ParticipantAggregatesService;
  submissionService?: SubmissionService;
  submitterAccessService?: SubmitterAccessService;
  accountDeletionService?: AccountDeletionService;
  adminService?: AdminService;
  weatherService?: WeatherService;
  fixtureWeatherService?: FixtureWeatherService;
  batchPayloadStorageService?: BatchPayloadStorageService;
  batchService?: BatchService;
  apiConsumerService?: ApiConsumerService;
  apiConsumerRepository?: ApiConsumerRepository;
  datasetReleaseService?: DatasetReleaseService;
  provenanceService?: ProvenanceService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const environment = dependencies.environment ?? loadEnvironment();
  const verifyAccessToken =
    dependencies.verifyAccessToken ?? createSupabaseTokenVerifier(environment);
  const synchronizeAccount = dependencies.synchronizeAccount ?? createAccountSynchronizer();
  const publicReadService = dependencies.publicReadService ?? createPublicReadService();
  const fixtureStatisticsService =
    dependencies.fixtureStatisticsService ?? createFixtureStatisticsService();
  const participantAggregatesService =
    dependencies.participantAggregatesService ?? createParticipantAggregatesService();
  const submissionService = dependencies.submissionService ?? createSubmissionService();
  const submitterAccessService =
    dependencies.submitterAccessService ?? createSubmitterAccessService();
  const accountDeletionService =
    dependencies.accountDeletionService ??
    (environment.SUPABASE_SECRET_KEY
      ? createAccountDeletionService(
          createSupabaseAdminUserDeleter({
            SUPABASE_URL: environment.SUPABASE_URL,
            SUPABASE_SECRET_KEY: environment.SUPABASE_SECRET_KEY,
          }),
        )
      : createUnavailableAccountDeletionService());
  const adminService =
    dependencies.adminService ??
    createAdminService(
      undefined,
      environment.SUPABASE_SECRET_KEY
        ? createSupabaseAdminUserEmailReader({
            SUPABASE_URL: environment.SUPABASE_URL,
            SUPABASE_SECRET_KEY: environment.SUPABASE_SECRET_KEY,
          })
        : undefined,
    );
  const weatherService = dependencies.weatherService ?? new WeatherService();
  const fixtureWeatherService =
    dependencies.fixtureWeatherService ?? createFixtureWeatherService(weatherService);
  const batchPayloadStorageService =
    dependencies.batchPayloadStorageService ??
    (environment.NODE_ENV === 'production'
      ? createAzureObjectStorageComposition(environment).batchPayloadStorageService
      : undefined);
  const batchService = dependencies.batchService ?? createBatchService(batchPayloadStorageService);
  const apiConsumerRepository =
    dependencies.apiConsumerRepository ?? createLazyApiConsumerRepository();
  const apiConsumerService =
    dependencies.apiConsumerService ?? createApiConsumerService(apiConsumerRepository);
  const datasetReleaseService = dependencies.datasetReleaseService ?? createDatasetReleaseService();
  const provenanceService =
    dependencies.provenanceService ?? createProvenanceService(fixtureStatisticsService);
  const allowedOrigins = environment.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const app = express();

  if (batchPayloadStorageService) {
    app.locals.batchPayloadStorageService = batchPayloadStorageService;
  }

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: '1mb',
      type: (request) => {
        if (request.url?.startsWith(`${API_BASE_PATH}/batches`)) {
          return false;
        }

        const contentType = request.headers['content-type'] ?? '';
        return /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:;|$)/i.test(contentType);
      },
    }),
  );
  app.use(
    pinoHttp({
      autoLogging: process.env.NODE_ENV !== 'test',
      redact: ['req.headers.authorization', 'req.headers.x-api-key'],
    }),
  );

  app.use(API_BASE_PATH, (_request, response, next) => {
    response.setHeader('API-Version', CURRENT_API_VERSION);
    next();
  });

  app.use(`${API_BASE_PATH}/health`, healthRouter);
  app.use(`${API_BASE_PATH}/auth`, createAuthRouter(verifyAccessToken, synchronizeAccount));
  app.use(API_BASE_PATH, createFixtureStatisticsRouter(fixtureStatisticsService));
  app.use(API_BASE_PATH, createParticipantAggregatesRouter(participantAggregatesService));
  app.use(
    API_BASE_PATH,
    createSubmissionRouter(verifyAccessToken, synchronizeAccount, submissionService),
  );
  app.use(API_BASE_PATH, createBatchRouter(verifyAccessToken, synchronizeAccount, batchService));
  app.use(
    API_BASE_PATH,
    createProvenanceRouter(verifyAccessToken, synchronizeAccount, provenanceService),
  );
  app.use(
    API_BASE_PATH,
    createSubmitterAccessRouter(verifyAccessToken, synchronizeAccount, submitterAccessService),
  );
  app.use(
    API_BASE_PATH,
    createAccountDeletionRouter(verifyAccessToken, synchronizeAccount, accountDeletionService),
  );
  app.use(API_BASE_PATH, createAdminRouter(verifyAccessToken, synchronizeAccount, adminService));
  app.use(
    API_BASE_PATH,
    createApiConsumerRouter(verifyAccessToken, synchronizeAccount, apiConsumerService),
  );
  app.use(API_BASE_PATH, createConsumerRouter(publicReadService, apiConsumerRepository));
  app.use(
    API_BASE_PATH,
    createDatasetReleaseRouter(verifyAccessToken, synchronizeAccount, datasetReleaseService),
  );
  app.use(API_BASE_PATH, createPublicReadRouter(publicReadService));
  app.use(API_BASE_PATH, createWeatherRouter(weatherService, fixtureWeatherService));

  app.use('/api', (request, response, next) => {
    const requestedVersion = request.path.split('/').filter(Boolean)[0];

    if (requestedVersion !== undefined && /^v\d+$/.test(requestedVersion)) {
      response.status(404).json({
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `API version ${requestedVersion} is not supported. Use ${API_BASE_PATH}.`,
        },
      });
      return;
    }

    next();
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
