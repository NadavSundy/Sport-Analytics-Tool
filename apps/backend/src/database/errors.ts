export type DatabaseErrorCode =
  | 'DATABASE_UNAVAILABLE'
  | 'DATABASE_CONFLICT'
  | 'DATABASE_REFERENCE_ERROR'
  | 'DATABASE_CONSTRAINT_ERROR'
  | 'DATABASE_OPERATION_FAILED'
  | 'DATABASE_TRANSACTION_FAILED';

export class DatabaseAccessError extends Error {
  constructor(
    public readonly code: DatabaseErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DatabaseAccessError';
  }
}

function postgresErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return undefined;
}

export function translateDatabaseError(error: unknown): DatabaseAccessError {
  if (error instanceof DatabaseAccessError) {
    return error;
  }

  const postgresCode = postgresErrorCode(error);

  if (postgresCode?.startsWith('08')) {
    return new DatabaseAccessError(
      'DATABASE_UNAVAILABLE',
      'The database is currently unavailable.',
      { cause: error },
    );
  }

  switch (postgresCode) {
    case '23505':
      return new DatabaseAccessError(
        'DATABASE_CONFLICT',
        'The database operation conflicts with existing data.',
        { cause: error },
      );

    case '23503':
      return new DatabaseAccessError(
        'DATABASE_REFERENCE_ERROR',
        'The database operation references unavailable data.',
        { cause: error },
      );

    case '23502':
    case '23514':
      return new DatabaseAccessError(
        'DATABASE_CONSTRAINT_ERROR',
        'The database rejected invalid data.',
        { cause: error },
      );

    default:
      return new DatabaseAccessError(
        'DATABASE_OPERATION_FAILED',
        'The database operation could not be completed.',
        { cause: error },
      );
  }
}
