export type AdminManagementConflictCode =
  | 'SELF_MANAGEMENT_NOT_ALLOWED'
  | 'ADMIN_ACCOUNT_NOT_MANAGEABLE'
  | 'ROLE_TRANSITION_MANAGED_BY_SUBMITTER_ACCESS'
  | 'DISABLED_ACCOUNT_NOT_MANAGEABLE'
  | 'INVALID_SUBMITTER_ACCESS_TRANSITION'
  | 'REQUESTED_COMPETITION_SCOPE_MISSING'
  | 'REQUESTED_COMPETITION_SCOPE_MISMATCH';

export class AdminManagementConflictError extends Error {
  constructor(
    public readonly code: AdminManagementConflictCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminManagementConflictError';
  }
}

export class AdminUserNotFoundError extends Error {
  constructor() {
    super('The requested user does not exist.');
    this.name = 'AdminUserNotFoundError';
  }
}

export class AdminEmailLookupUnavailableError extends Error {
  constructor(public readonly failure: string = 'provider_error') {
    super('Administrator email lookup is temporarily unavailable.');
    this.name = 'AdminEmailLookupUnavailableError';
  }
}

export class InvalidCompetitionScopesError extends Error {
  constructor(public readonly competitionIds: string[]) {
    super(
      competitionIds.length === 0
        ? 'At least one competition scope is required.'
        : competitionIds.length === 1
          ? `Competition scope ${competitionIds[0]} does not exist.`
          : `Competition scopes ${competitionIds.join(', ')} do not exist.`,
    );
    this.name = 'InvalidCompetitionScopesError';
  }
}
