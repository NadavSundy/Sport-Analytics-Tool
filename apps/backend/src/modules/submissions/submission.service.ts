import { createHash } from 'node:crypto';

import type {
  CorrectionRequest,
  CorrectionResponse,
  CorrectionHistoryResponse,
  SubmissionRequest,
  SubmissionResponse,
  SubmissionSourceFile,
} from '@sport-analytics/contracts';

import { canSubmitToCompetition } from '../../middleware/require-authorization';
import type { ApplicationAccount } from '../accounts/account';
import { SubmissionForbiddenError, SubmissionValidationError } from './submission.errors';
import { createSubmissionRepository, type SubmissionRepository } from './submission.repository';

export interface SubmissionService {
  submit(
    account: ApplicationAccount,
    submission: SubmissionRequest,
    sourceFile?: SubmissionSourceFile,
    sourceChecksum?: string,
  ): Promise<SubmissionResponse>;
  correct(
    account: ApplicationAccount,
    eventId: string,
    correction: CorrectionRequest,
  ): Promise<CorrectionResponse>;
  getCorrectionHistory(
    account: ApplicationAccount,
    eventId: string,
  ): Promise<CorrectionHistoryResponse>;
}

export function createSubmissionService(
  repository: SubmissionRepository = createSubmissionRepository(),
): SubmissionService {
  return {
    async submit(account, submission, sourceFile, sourceChecksum) {
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

      if (!fixture.competitionId || !canSubmitToCompetition(account, fixture.competitionId)) {
        throw new SubmissionForbiddenError();
      }

      const checksum =
        sourceChecksum ?? createHash('sha256').update(JSON.stringify(submission)).digest('hex');
      const acceptedSubmission = await repository.storeAcceptedSubmission(
        submission,
        account.accountId,
        sourceFile,
        checksum,
      );

      return {
        data: acceptedSubmission,
      };
    },

    async correct(account, eventId, correction) {
      const target = await repository.findCorrectionTarget(eventId);
      if (!target || target.fixtureId !== correction.fixtureId) {
        throw new SubmissionValidationError('The correction references an unavailable event.', [
          {
            code: 'EVENT_NOT_FOUND',
            message: 'The source event is not an accepted, correctable event for this fixture.',
            field: 'eventId',
          },
        ]);
      }

      if (!target.competitionId || !canSubmitToCompetition(account, target.competitionId)) {
        throw new SubmissionForbiddenError();
      }

      return {
        data: await repository.storeAcceptedCorrection(eventId, correction, account.accountId),
      };
    },

    async getCorrectionHistory(account, eventId) {
      const target = await repository.findCorrectionTarget(eventId);
      if (!target) {
        throw new SubmissionValidationError('The correction history is unavailable.', [
          {
            code: 'EVENT_NOT_FOUND',
            message: 'The source event is not an accepted event.',
            field: 'eventId',
          },
        ]);
      }

      if (!target.competitionId || !canSubmitToCompetition(account, target.competitionId)) {
        throw new SubmissionForbiddenError();
      }

      return { data: await repository.listCorrectionHistory(eventId) };
    },
  };
}
