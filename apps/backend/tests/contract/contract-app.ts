import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { ApplicationAccount } from '../../src/modules/accounts/account';
import type { ApiConsumerRepository } from '../../src/modules/api-consumers/api-consumer.repository';
import type { ApiConsumerService } from '../../src/modules/api-consumers/api-consumer.service';
import type { BatchService } from '../../src/modules/batches/batch.service';
import type { DatasetReleaseService } from '../../src/modules/dataset-releases/dataset-release.service';
import type { ProvenanceService } from '../../src/modules/provenance/provenance.service';
import type { PublicReadService } from '../../src/modules/public-read/public-read.service';
import type { FixtureStatisticsService } from '../../src/modules/statistics/fixture-statistics.service';
import type { SubmissionService } from '../../src/modules/submissions/submission.service';
import type { SubmitterAccessService } from '../../src/modules/submitter-access/submitter-access.service';
import { createTestAccount, createTestApp } from '../test-app';

/**
 * Named options for the contract tests, mapped onto the positional
 * `createTestApp` parameters. Anything not supplied keeps the test default.
 */
interface ContractAppOptions {
  account?: Partial<ApplicationAccount>;
  verifyAccessToken?: VerifyAccessToken;
  publicRead?: Partial<PublicReadService>;
  fixtureStatistics?: Partial<FixtureStatisticsService>;
  submissions?: Partial<SubmissionService>;
  submitterAccess?: SubmitterAccessService;
  batches?: Partial<BatchService>;
  apiConsumers?: Partial<ApiConsumerService>;
  apiConsumerRepository?: Partial<ApiConsumerRepository>;
  datasetReleases?: Partial<DatasetReleaseService>;
  provenance?: Partial<ProvenanceService>;
}

export function contractApp(options: ContractAppOptions = {}) {
  const account = createTestAccount(options.account);

  return createTestApp(
    options.verifyAccessToken,
    options.publicRead as PublicReadService | undefined,
    async () => account,
    options.fixtureStatistics as FixtureStatisticsService | undefined,
    options.submissions as SubmissionService | undefined,
    options.submitterAccess,
    undefined,
    undefined,
    undefined,
    undefined,
    options.batches as BatchService | undefined,
    undefined,
    options.apiConsumers as ApiConsumerService | undefined,
    options.apiConsumerRepository as ApiConsumerRepository | undefined,
    options.datasetReleases as DatasetReleaseService | undefined,
    options.provenance as ProvenanceService | undefined,
  );
}

/** A syntactically valid consumer key; the stub repository decides whether it is active. */
export const CONSUMER_API_KEY = `sat_live_${'a'.repeat(43)}`;
