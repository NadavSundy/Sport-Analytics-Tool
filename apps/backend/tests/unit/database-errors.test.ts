import { describe, expect, test } from 'vitest';

import { DatabaseAccessError, translateDatabaseError } from '../../src/database';

function postgresError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

describe('database error translation', () => {
  test('translates unique constraint failures without exposing raw details', () => {
    const rawError = postgresError(
      '23505',
      'duplicate key value violates unique constraint competition_name_key',
    );

    const translated = translateDatabaseError(rawError);

    expect(translated).toBeInstanceOf(DatabaseAccessError);
    expect(translated.code).toBe('DATABASE_CONFLICT');
    expect(translated.message).toBe('The database operation conflicts with existing data.');
    expect(translated.message).not.toContain('competition_name_key');
  });

  test('translates foreign-key failures', () => {
    const translated = translateDatabaseError(
      postgresError('23503', 'raw foreign key database detail'),
    );

    expect(translated.code).toBe('DATABASE_REFERENCE_ERROR');
    expect(translated.message).toBe('The database operation references unavailable data.');
  });

  test('translates connection failures', () => {
    const translated = translateDatabaseError(
      postgresError('08006', 'raw database connection failure'),
    );

    expect(translated.code).toBe('DATABASE_UNAVAILABLE');
    expect(translated.message).toBe('The database is currently unavailable.');
  });

  test('uses a safe fallback for unknown database failures', () => {
    const translated = translateDatabaseError(
      postgresError('XX000', 'internal PostgreSQL implementation detail'),
    );

    expect(translated.code).toBe('DATABASE_OPERATION_FAILED');
    expect(translated.message).toBe('The database operation could not be completed.');
    expect(translated.message).not.toContain('PostgreSQL');
  });
});
