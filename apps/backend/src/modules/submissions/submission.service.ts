import type { SubmissionRequest, SubmissionResponse } from '@sport-analytics/contracts';

import { hasCompetitionScope } from '../../middleware/require-authorization';
import type { ApplicationAccount } from '../accounts/account';
import { SubmissionForbiddenError, SubmissionValidationError } from './submission.errors';
import { createSubmissionRepository, type SubmissionRepository } from './submission.repository';

export interface SubmissionService {
  submit(account: ApplicationAccount, submission: SubmissionRequest): Promise<SubmissionResponse>;
}

export function createSubmissionService(
  repository: SubmissionRepository = createSubmissionRepository(),
): SubmissionService {
  return {
    async submit(account, submission) {
      const fixture = await repository.findFixtureScope(submission.fixtureId);

      if (!fixture) {
        throw new SubmissionValidationError('The submission references an unavailable fixture.', [
          {
            code: 'FIXTURE_NOT_FOUND',
            message: 'The fixture does not exist.',
            field: 'fixtureId',
          },
        ]);
      }

      if (!fixture.competitionId || !hasCompetitionScope(account, fixture.competitionId)) {
        throw new SubmissionForbiddenError();
      }

      const acceptedSubmission = await repository.storeAcceptedSubmission(
        submission,
        account.accountId,
      );

      return {
        data: acceptedSubmission,
      };
    },
  };
}
