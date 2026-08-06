import type { VerifyAccessToken } from '../src/auth/supabase-auth';
import { createApp } from '../src/app';
import type { Environment } from '../src/config/env';

const testEnvironment: Environment = {
  NODE_ENV: 'test',
  PORT: 3000,
  CORS_ORIGINS: 'http://localhost:5173',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
};

const acceptTestIdentity: VerifyAccessToken = async () => ({
  uid: 'test-user',
});

export function createTestApp(verifyAccessToken: VerifyAccessToken = acceptTestIdentity) {
  return createApp({
    environment: testEnvironment,
    verifyAccessToken,
  });
}
