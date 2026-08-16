export class RecentAuthenticationRequiredError extends Error {
  readonly code = 'RECENT_AUTHENTICATION_REQUIRED';

  constructor() {
    super('Please sign in again before deleting your account.');
    this.name = 'RecentAuthenticationRequiredError';
  }
}

export class AccountDeletionIncompleteError extends Error {
  readonly code = 'ACCOUNT_DELETION_INCOMPLETE';

  constructor() {
    super(
      'Account deletion could not be completed. The account remains disabled and can be retried.',
    );
    this.name = 'AccountDeletionIncompleteError';
  }
}
