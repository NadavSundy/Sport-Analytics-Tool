import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { createSupabaseTokenVerifier, type VerifyAccessToken } from './auth/supabase-auth';
import { loadEnvironment, type Environment } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { createAuthRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';
import { createPublicReadRouter } from './modules/public-read/public-read.routes';
import {
  createPublicReadService,
  type PublicReadService,
} from './modules/public-read/public-read.service';

export interface AppDependencies {
  environment?: Environment;
  verifyAccessToken?: VerifyAccessToken;
  publicReadService?: PublicReadService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const environment = dependencies.environment ?? loadEnvironment();
  const verifyAccessToken =
    dependencies.verifyAccessToken ?? createSupabaseTokenVerifier(environment);
  const publicReadService = dependencies.publicReadService ?? createPublicReadService();
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
  app.use('/api/v1/auth', createAuthRouter(verifyAccessToken));
  app.use('/api/v1', createPublicReadRouter(publicReadService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
