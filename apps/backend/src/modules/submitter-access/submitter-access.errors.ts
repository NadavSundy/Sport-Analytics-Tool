export type SubmitterAccessConflictCode =
  | 'REQUEST_ALREADY_PENDING'
  | 'SUBMITTER_ALREADY_APPROVED'
  | 'ADDITIONAL_SCOPE_REQUIRES_APPROVED_SUBMITTER'
  | 'ADDITIONAL_SCOPE_REQUEST_PENDING'
  | 'SCOPE_ALREADY_GRANTED';

export class SubmitterAccessConflictError extends Error {
  constructor(
    public readonly code: SubmitterAccessConflictCode,
    message: string,
  ) {
    super(message);
    this.name = 'SubmitterAccessConflictError';
  }
}

export class InvalidRequestedCompetitionError extends Error {
  constructor() {
    super('The requested competition does not exist.');
    this.name = 'InvalidRequestedCompetitionError';
  }
}
