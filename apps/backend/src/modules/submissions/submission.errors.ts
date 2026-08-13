import type { ApiErrorDetail } from '@sport-analytics/contracts';

export class SubmissionValidationError extends Error {
  constructor(
    message: string,
    public readonly details: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'SubmissionValidationError';
  }
}

export class SubmissionForbiddenError extends Error {
  constructor() {
    super('The authenticated account is not permitted to submit events for this fixture.');
    this.name = 'SubmissionForbiddenError';
  }
}

export class SubmissionConflictError extends Error {
  constructor(
    public readonly code: 'DUPLICATE_EVENT_ID' | 'EVENT_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'SubmissionConflictError';
  }
}
