import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { createSupabaseTokenVerifier, type VerifyAccessToken } from './auth/supabase-auth';
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

export interface AppDependencies {
  environment?: Environment;
  verifyAccessToken?: VerifyAccessToken;
  synchronizeAccount?: SynchronizeAccount;
  publicReadService?: PublicReadService;
  fixtureStatisticsService?: FixtureStatisticsService;
  submissionService?: SubmissionService;
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
      redact: ['req.headers.authorization'],
    }),
  );

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', createAuthRouter(verifyAccessToken, synchronizeAccount));
  app.use('/api/v1', createFixtureStatisticsRouter(fixtureStatisticsService));
  app.use(
    '/api/v1',
    createSubmissionRouter(verifyAccessToken, synchronizeAccount, submissionService),
  );
  app.use('/api/v1', createPublicReadRouter(publicReadService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
