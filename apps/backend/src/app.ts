import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp, { type Options as PinoHttpOptions } from 'pino-http';
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
import { loadOpenApiSpecification } from './openapi/openapi-spec';
import { errorHandler } from './middleware/error-handler';
import { apiDeprecationMiddleware } from './middleware/api-deprecation';
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
import { createLeaderboardsRouter } from './modules/statistics/leaderboards.routes';
import { createLlmClient, type LlmClient } from './modules/analytics-query/llm.client';
import { createNaturalLanguageQueryRouter } from './modules/analytics-query/natural-language-query.routes';
import {
  createNaturalLanguageQueryLimiter,
  type NaturalLanguageQueryLimiter,
} from './modules/analytics-query/natural-language-query.limiter';
import { createDatabaseNaturalLanguageQueryUsageRepository } from './modules/analytics-query/natural-language-query.repository';
import { createQueryDefinitionRouter } from './modules/analytics-query/query-definition.routes';
import {
  createQueryDefinitionEvaluator,
  type QueryDefinitionEvaluator,
  type QueryDefinitionNameResolver,
} from './modules/analytics-query/query-definition.evaluator';
import {
  createLeaderboardsService,
  type LeaderboardsService,
} from './modules/statistics/leaderboards.service';
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
import type { BatchPayloadStorageService } from './modules/object-storage/batch-payload-storage.service';
import type { ObjectStore } from './modules/object-storage/object-store';
import { createObjectStorageComposition } from './modules/object-storage/object-storage.composition';
import { createBatchRouter } from './modules/batches/batch.routes';
import { createBatchService, type BatchService } from './modules/batches/batch.service';
import { createApiConsumerRouter } from './modules/api-consumers/api-consumer.routes';
import { createApiAccessRouter } from './modules/api-consumers/api-access.routes';
import {
  createApiAccessService,
  type ApiAccessService,
} from './modules/api-consumers/api-access.service';
import {
  createApiConsumerService,
  type ApiConsumerService,
} from './modules/api-consumers/api-consumer.service';
import {
  createLazyApiConsumerRepository,
  type ApiConsumerRepository,
} from './modules/api-consumers/api-consumer.repository';
import { createConsumerRouter } from './modules/api-consumers/consumer.routes';
import { createConsumerAuthentication } from './modules/api-consumers/consumer-authentication';
import {
  createLazyAnonymousAccessRepository,
  type AnonymousAccessRepository,
} from './modules/api-consumers/anonymous-access.repository';
import { createCanonicalReadAuthentication } from './modules/api-consumers/canonical-read-authentication';
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
  leaderboardsService?: LeaderboardsService;
  queryDefinitionEvaluator?: QueryDefinitionEvaluator;
  /** Injected by the tests; production resolves names through the repositories. */
  queryDefinitionNames?: { names: QueryDefinitionNameResolver };
  /** Injected by the tests, which never reach the provider. */
  llmClient?: LlmClient;
  /** Injected by the tests; production counts in PostgreSQL. */
  naturalLanguageQueryLimiter?: NaturalLanguageQueryLimiter;
  /**
   * Injected so a test can assert on what is logged, which is how the rule that
   * a question never reaches a log is held. Production builds its own logger,
   * exactly as before.
   */
  logger?: PinoHttpOptions['logger'];
  submissionService?: SubmissionService;
  submitterAccessService?: SubmitterAccessService;
  accountDeletionService?: AccountDeletionService;
  adminService?: AdminService;
  weatherService?: WeatherService;
  fixtureWeatherService?: FixtureWeatherService;
  objectStore?: ObjectStore;
  releaseObjectStore?: ObjectStore;
  batchPayloadStorageService?: BatchPayloadStorageService;
  batchService?: BatchService;
  apiConsumerService?: ApiConsumerService;
  apiAccessService?: ApiAccessService;
  apiConsumerRepository?: ApiConsumerRepository;
  anonymousAccessRepository?: AnonymousAccessRepository;
  datasetReleaseService?: DatasetReleaseService;
  provenanceService?: ProvenanceService;
}

const BROWSER_EXPOSED_RESPONSE_HEADERS = [
  'RateLimit-Limit',
  'RateLimit-Remaining',
  'RateLimit-Reset',
  'X-Quota-Limit',
  'X-Quota-Remaining',
  'X-Quota-Reset',
  'Retry-After',
  'Deprecation',
  'Sunset',
  'Link',
];

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
  const leaderboardsService = dependencies.leaderboardsService ?? createLeaderboardsService();
  // Delegates to the two services above rather than reading anything itself.
  const queryDefinitionEvaluator =
    dependencies.queryDefinitionEvaluator ??
    createQueryDefinitionEvaluator({
      leaderboards: leaderboardsService,
      participantAggregates: participantAggregatesService,
      ...(dependencies.queryDefinitionNames ?? {}),
    });
  // The adapter is constructed whether or not a key is configured: with no key
  // it raises its not-configured error per request, which the endpoint reports as
  // temporarily unavailable. That keeps one optional feature from deciding
  // whether the backend starts.
  const llmClient =
    dependencies.llmClient ??
    createLlmClient({
      apiKey: environment.LLM_API_KEY,
      model: environment.LLM_MODEL,
      timeoutMs: environment.LLM_TIMEOUT_MS,
    });
  const naturalLanguageQueryLimiter =
    dependencies.naturalLanguageQueryLimiter ??
    createNaturalLanguageQueryLimiter(createDatabaseNaturalLanguageQueryUsageRepository(), {
      rateLimitPerMinute: environment.NL_QUERY_RATE_LIMIT_PER_MINUTE,
      dailyQuotaPerClient: environment.NL_QUERY_DAILY_QUOTA_PER_CLIENT,
      globalDailyLimit: environment.NL_QUERY_GLOBAL_DAILY_LIMIT,
    });
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
  const readAuthUserEmail = environment.SUPABASE_SECRET_KEY
    ? createSupabaseAdminUserEmailReader({
        SUPABASE_URL: environment.SUPABASE_URL,
        SUPABASE_SECRET_KEY: environment.SUPABASE_SECRET_KEY,
      })
    : undefined;
  const adminService =
    dependencies.adminService ?? createAdminService(undefined, readAuthUserEmail);
  const weatherService = dependencies.weatherService ?? new WeatherService();
  const fixtureWeatherService =
    dependencies.fixtureWeatherService ?? createFixtureWeatherService(weatherService);
  const objectStorageComposition = createObjectStorageComposition(environment);
  const objectStore = dependencies.objectStore ?? objectStorageComposition?.objectStore;
  const releaseObjectStore =
    dependencies.releaseObjectStore ?? objectStorageComposition?.releaseObjectStore;
  const batchPayloadStorageService =
    dependencies.batchPayloadStorageService ?? objectStorageComposition?.batchPayloadStorageService;
  const batchService = dependencies.batchService ?? createBatchService(batchPayloadStorageService);
  const apiConsumerRepository =
    dependencies.apiConsumerRepository ?? createLazyApiConsumerRepository();
  const apiConsumerService =
    dependencies.apiConsumerService ?? createApiConsumerService(apiConsumerRepository);
  const apiAccessService =
    dependencies.apiAccessService ??
    createApiAccessService(undefined, apiConsumerService, readAuthUserEmail);
  const consumerAuthentication = createConsumerAuthentication(apiConsumerRepository);
  const anonymousAccessRepository =
    dependencies.anonymousAccessRepository ?? createLazyAnonymousAccessRepository();
  const canonicalReadAuthentication = createCanonicalReadAuthentication(
    apiConsumerRepository,
    anonymousAccessRepository,
    {
      sourceLimitPerMinute: environment.ANONYMOUS_RATE_LIMIT_PER_MINUTE ?? 30,
      globalLimitPerMinute: environment.ANONYMOUS_GLOBAL_RATE_LIMIT_PER_MINUTE ?? 600,
      sourceKeySecret:
        environment.ANONYMOUS_RATE_LIMIT_SECRET ?? 'development-only-anonymous-rate-secret',
    },
  );
  const datasetReleaseService =
    dependencies.datasetReleaseService ??
    createDatasetReleaseService(undefined, {
      deploymentEnvironment: environment.DEPLOYMENT_ENVIRONMENT,
      storageProvider: objectStorageComposition?.provider,
      releaseObjectStore,
      legacyObjectStore: objectStorageComposition?.legacyObjectStore ?? objectStore,
    });
  const provenanceService =
    dependencies.provenanceService ??
    createProvenanceService(fixtureStatisticsService, undefined, participantAggregatesService);
  const allowedOrigins = environment.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const app = express();

  if (batchPayloadStorageService) {
    app.locals.batchPayloadStorageService = batchPayloadStorageService;
  }

  app.disable('x-powered-by');
  // The hop count is taken from the right of `X-Forwarded-For`, so `request.ip`
  // is the address the infrastructure added rather than anything the caller put
  // there. Both the issue #821 anonymous read limits
  // (`canonical-read-authentication.ts`) and the issue #815 natural-language
  // limits depend on it: with `true` Express would take the leftmost,
  // client-supplied entry and either limit could be bypassed by sending a header.
  //
  // The two issues each introduced a variable for the same hop count, so this is
  // applied once. Setting it twice would let the later call silently override the
  // earlier one, and a deployment that configured only `TRUST_PROXY_HOPS` would
  // lose its per-client limits without any error. `TRUST_PROXY_HOPS` has no
  // default, so an explicit value from either variable is honoured and neither
  // can quietly widen what the other trusts.
  app.set('trust proxy', environment.TRUST_PROXY_HOPS ?? environment.TRUSTED_PROXY_HOP_COUNT);
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      exposedHeaders: BROWSER_EXPOSED_RESPONSE_HEADERS,
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
      ...(dependencies.logger ? { logger: dependencies.logger } : {}),
    }),
  );

  app.get('/openapi.yaml', (_request, response, next) => {
    try {
      response
        .status(200)
        .set('Content-Type', 'application/yaml; charset=utf-8')
        .send(loadOpenApiSpecification());
    } catch (error) {
      next(error);
    }
  });

  app.use(API_BASE_PATH, (_request, response, next) => {
    response.setHeader('API-Version', CURRENT_API_VERSION);
    next();
  });
  app.use(apiDeprecationMiddleware);
  app.use(API_BASE_PATH, canonicalReadAuthentication);

  app.use(`${API_BASE_PATH}/health`, healthRouter);
  app.use(`${API_BASE_PATH}/auth`, createAuthRouter(verifyAccessToken, synchronizeAccount));
  app.use(API_BASE_PATH, createFixtureStatisticsRouter(fixtureStatisticsService));
  app.use(API_BASE_PATH, createParticipantAggregatesRouter(participantAggregatesService));
  app.use(API_BASE_PATH, createLeaderboardsRouter(leaderboardsService));
  app.use(API_BASE_PATH, createQueryDefinitionRouter(queryDefinitionEvaluator));
  app.use(
    API_BASE_PATH,
    createNaturalLanguageQueryRouter({
      llmClient,
      evaluator: queryDefinitionEvaluator,
      limiter: naturalLanguageQueryLimiter,
    }),
  );
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
  app.use(
    API_BASE_PATH,
    createApiAccessRouter(verifyAccessToken, synchronizeAccount, apiAccessService),
  );
  app.use(
    API_BASE_PATH,
    createConsumerRouter(
      publicReadService,
      fixtureStatisticsService,
      participantAggregatesService,
      consumerAuthentication,
      apiConsumerRepository,
    ),
  );
  app.use(
    API_BASE_PATH,
    createDatasetReleaseRouter(verifyAccessToken, synchronizeAccount, datasetReleaseService),
  );
  app.use(API_BASE_PATH, createPublicReadRouter(publicReadService, fixtureStatisticsService));
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
