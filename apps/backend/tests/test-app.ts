import type { VerifyAccessToken } from '../src/auth/supabase-auth';
import { createApp } from '../src/app';
import type { Environment } from '../src/config/env';
import type { ApplicationAccount } from '../src/modules/accounts/account';
import type { SynchronizeAccount } from '../src/modules/accounts/account.service';
import type { PublicReadService } from '../src/modules/public-read/public-read.service';
import type { FixtureStatisticsService } from '../src/modules/statistics/fixture-statistics.service';
import type { SubmissionService } from '../src/modules/submissions/submission.service';

const testEnvironment: Environment = {
  NODE_ENV: 'test',
  PORT: 3000,
  CORS_ORIGINS: 'http://localhost:5173',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
};

const acceptTestIdentity: VerifyAccessToken = async () => ({
  uid: 'test-user',
  displayName: 'Test User',
});

const synchronizeTestAccount: SynchronizeAccount = async (identity) => ({
  accountId: '1',
  subject: identity.uid,
  displayName: identity.displayName ?? null,
  role: 'viewer',
  approvalState: 'not_requested',
  competitionIds: [],
  disabled: false,
});

export function createTestApp(
  verifyAccessToken: VerifyAccessToken = acceptTestIdentity,
  publicReadService?: PublicReadService,
  synchronizeAccount: SynchronizeAccount = synchronizeTestAccount,
  fixtureStatisticsService?: FixtureStatisticsService,
  submissionService?: SubmissionService,
) {
  return createApp({
    environment: testEnvironment,
    verifyAccessToken,
    synchronizeAccount,
    ...(publicReadService !== undefined ? { publicReadService } : {}),
    ...(fixtureStatisticsService !== undefined ? { fixtureStatisticsService } : {}),
    ...(submissionService !== undefined ? { submissionService } : {}),
  });
}

export function createTestAccount(overrides: Partial<ApplicationAccount> = {}): ApplicationAccount {
  return {
    accountId: '1',
    subject: 'test-user',
    displayName: 'Test User',
    role: 'viewer',
    approvalState: 'not_requested',
    competitionIds: [],
    disabled: false,
    ...overrides,
  };
}
