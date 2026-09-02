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

export interface AppDependencies {
  environment?: Environment;
  verifyAccessToken?: VerifyAccessToken;
  synchronizeAccount?: SynchronizeAccount;
  publicReadService?: PublicReadService;
  fixtureStatisticsService?: FixtureStatisticsService;
  submissionService?: SubmissionService;
  submitterAccessService?: SubmitterAccessService;
  accountDeletionService?: AccountDeletionService;
  adminService?: AdminService;
  weatherService?: WeatherService;
  fixtureWeatherService?: FixtureWeatherService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const environment = dependencies.environment ?? loadEnvironment();
  const verifyAccessToken =
    dependencies.verifyAccessToken ?? createSupabaseTokenVerifier(environment);
  const synchronizeAccount = dependencies.synchronizeAccount ?? createAccountSynchronizer();
  const publicReadService = dependencies.publicReadService ?? createPublicReadService();
  const fixtureStatisticsService =
    dependencies.fixtureStatisticsService ?? createFixtureStatisticsService();
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
  const allowedOrigins = environment.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      autoLogging: process.env.NODE_ENV !== 'test',
      redact: ['req.headers.authorization'],
    }),
  );

  app.use(API_BASE_PATH, (_request, response, next) => {
    response.setHeader('API-Version', CURRENT_API_VERSION);
    next();
  });

  app.use(`${API_BASE_PATH}/health`, healthRouter);
  app.use(`${API_BASE_PATH}/auth`, createAuthRouter(verifyAccessToken, synchronizeAccount));
  app.use(API_BASE_PATH, createFixtureStatisticsRouter(fixtureStatisticsService));
  app.use(
    API_BASE_PATH,
    createSubmissionRouter(verifyAccessToken, synchronizeAccount, submissionService),
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
