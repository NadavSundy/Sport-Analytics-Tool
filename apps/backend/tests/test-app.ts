import type { VerifyAccessToken } from '../src/auth/supabase-auth';
import { createApp } from '../src/app';
import type { Environment } from '../src/config/env';
import type { ApplicationAccount } from '../src/modules/accounts/account';
import type { SynchronizeAccount } from '../src/modules/accounts/account.service';
import type { PublicReadService } from '../src/modules/public-read/public-read.service';
import type { FixtureStatisticsService } from '../src/modules/statistics/fixture-statistics.service';
import type { SubmissionService } from '../src/modules/submissions/submission.service';
import type { SubmitterAccessService } from '../src/modules/submitter-access/submitter-access.service';
import type { AccountDeletionService } from '../src/modules/account-deletion/account-deletion.service';
import type { AdminService } from '../src/modules/admin/admin.service';
import type { WeatherService } from '../src/modules/weather/weather.service';
import type { FixtureWeatherService } from '../src/modules/weather/fixture-weather.service';

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
  requestedCompetition: null,
  competitionIds: [],
  disabled: false,
  deletionState: 'active',
});

const requestTestSubmitterAccess: SubmitterAccessService = {
  async requestAccess(account, accessRequest) {
    return {
      data: {
        accountId: account.accountId,
        approvalState: 'pending',
        requestedCompetition: {
          competitionId: accessRequest.competitionId,
          name: 'Test Competition',
        },
      },
    };
  },
};

const deleteTestAccount: AccountDeletionService = {
  async deleteAccount() {
    return {
      data: {
        status: 'deleted',
        retainedCricketData: true,
      },
    };
  },
};

const testAdminService: AdminService = {
  async listUsers() {
    return { data: { users: [], availableScopes: [] } };
  },
  async updateSubmitterAccess() {
    throw new Error('The test administrator service was not configured for an update.');
  },
  async rejectSubmitterAccessRequest() {
    throw new Error('The test administrator service was not configured for a rejection.');
  },
};

export function createTestApp(
  verifyAccessToken: VerifyAccessToken = acceptTestIdentity,
  publicReadService?: PublicReadService,
  synchronizeAccount: SynchronizeAccount = synchronizeTestAccount,
  fixtureStatisticsService?: FixtureStatisticsService,
  submissionService?: SubmissionService,
  submitterAccessService: SubmitterAccessService = requestTestSubmitterAccess,
  accountDeletionService: AccountDeletionService = deleteTestAccount,
  adminService: AdminService = testAdminService,
  weatherService?: WeatherService,
  fixtureWeatherService?: FixtureWeatherService,
) {
  return createApp({
    environment: testEnvironment,
    verifyAccessToken,
    synchronizeAccount,
    ...(publicReadService !== undefined ? { publicReadService } : {}),
    ...(fixtureStatisticsService !== undefined ? { fixtureStatisticsService } : {}),
    ...(submissionService !== undefined ? { submissionService } : {}),
    submitterAccessService,
    accountDeletionService,
    adminService,
    ...(weatherService !== undefined ? { weatherService } : {}),
    ...(fixtureWeatherService !== undefined ? { fixtureWeatherService } : {}),
  });
}

export function createTestAccount(overrides: Partial<ApplicationAccount> = {}): ApplicationAccount {
  return {
    accountId: '1',
    subject: 'test-user',
    displayName: 'Test User',
    role: 'viewer',
    approvalState: 'not_requested',
    requestedCompetition: null,
    competitionIds: [],
    disabled: false,
    deletionState: 'active',
    ...overrides,
  };
}
