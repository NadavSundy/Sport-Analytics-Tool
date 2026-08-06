import { describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

describe('assertSafeTestDatabase', () => {
  const validTestUrl = 'postgresql://postgres:postgres@localhost:5432/sport_analytics_test';

  test('accepts a separate database whose name contains test', () => {
    const result = assertSafeTestDatabase(
      validTestUrl,
      'postgresql://postgres:postgres@localhost:5432/sport_analytics',
      'test',
    );

    expect(result.pathname).toBe('/sport_analytics_test');
  });

  test('rejects commands outside the test environment', () => {
    expect(() => assertSafeTestDatabase(validTestUrl, undefined, 'development')).toThrow(
      /NODE_ENV=test/,
    );
  });

  test('rejects a missing test database URL', () => {
    expect(() => assertSafeTestDatabase(undefined, undefined, 'test')).toThrow(
      /DATABASE_URL_TEST is required/,
    );
  });

  test('rejects a test URL matching the development URL', () => {
    expect(() => assertSafeTestDatabase(validTestUrl, validTestUrl, 'test')).toThrow(
      /must not match/,
    );
  });

  test('rejects a database name without test', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgresql://postgres:postgres@localhost:5432/sport_analytics',
        undefined,
        'test',
      ),
    ).toThrow(/must contain "test"/);
  });

  test('rejects a non-PostgreSQL URL', () => {
    expect(() => assertSafeTestDatabase('https://example.com/test', undefined, 'test')).toThrow(
      /PostgreSQL protocol/,
    );
  });
});
