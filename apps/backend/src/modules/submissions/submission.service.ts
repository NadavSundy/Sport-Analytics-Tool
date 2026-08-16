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

      // The dismissal vocabulary is held in the dismissal_kind lookup table, not
      // enumerated in the contract, because the set is open. Resolving it here
      // rather than relying on the foreign key means an unrecognised kind is
      // rejected with the field and the value that caused it, instead of
      // surfacing as an unexplained server error.
      const submittedWickets = submission.events.flatMap((event, eventIndex) =>
        event.wickets.map((wicket) => ({ eventIndex, kind: wicket.kind })),
      );

      if (submittedWickets.length > 0) {
        const recognisedKinds = await repository.findDismissalKinds();
        const unrecognised = submittedWickets.filter((wicket) => !recognisedKinds.has(wicket.kind));

        if (unrecognised.length > 0) {
          throw new SubmissionValidationError(
            'The submission references a dismissal kind the platform does not recognise.',
            unrecognised.map((wicket) => ({
              code: 'UNKNOWN_DISMISSAL_KIND',
              message: `"${wicket.kind}" is not a recognised dismissal kind.`,
              field: 'wickets.kind',
              eventIndex: wicket.eventIndex,
            })),
          );
        }
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
