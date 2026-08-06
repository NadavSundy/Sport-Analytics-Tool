import type { VerifyIdToken } from '../src/auth/firebase-auth';
import { createApp } from '../src/app';
import type { Environment } from '../src/config/env';

const testEnvironment: Environment = {
  NODE_ENV: 'test',
  PORT: 3000,
  CORS_ORIGINS: 'http://localhost:5173',
  FIREBASE_PROJECT_ID: 'demo-sport-analytics',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
};

const acceptTestIdentity: VerifyIdToken = async () => ({
  uid: 'test-user',
});

export function createTestApp(verifyIdToken: VerifyIdToken = acceptTestIdentity) {
  return createApp({
    environment: testEnvironment,
    verifyIdToken,
  });
}
