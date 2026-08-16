export type SubmitterAccessConflictCode = 'REQUEST_ALREADY_PENDING' | 'SUBMITTER_ALREADY_APPROVED';

export class SubmitterAccessConflictError extends Error {
  constructor(
    public readonly code: SubmitterAccessConflictCode,
    message: string,
  ) {
    super(message);
    this.name = 'SubmitterAccessConflictError';
  }
}
