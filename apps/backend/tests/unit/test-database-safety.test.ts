import { describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

describe('assertSafeTestDatabase', () => {
  const validTestUrl = 'postgresql://postgres:postgres@localhost:5432/sport_analytics_test';

  test('accepts a separate database whose name identifies it as a test database', () => {
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

  test('rejects a test URL matching the development database target', () => {
    expect(() => assertSafeTestDatabase(validTestUrl, validTestUrl, 'test')).toThrow(
      /must not target the same database/,
    );
  });

  test('rejects the same database even when credentials differ', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgresql://test_user:test_password@localhost:5432/sport_analytics_test',
        'postgresql://dev_user:different_password@localhost:5432/sport_analytics_test',
        'test',
      ),
    ).toThrow(/must not target the same database/);
  });

  test('rejects the same local database when localhost aliases differ', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgresql://test_user:test_password@127.0.0.1:5432/sport_analytics_test',
        'postgresql://dev_user:dev_password@localhost:5432/sport_analytics_test',
        'test',
      ),
    ).toThrow(/must not target the same database/);
  });

  test('rejects a database name that does not identify it as a test database', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgresql://postgres:postgres@localhost:5432/sport_analytics',
        undefined,
        'test',
      ),
    ).toThrow(/must contain "test"/);
  });

  test('rejects incidental test text in a non-test database name', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgresql://postgres:postgres@localhost:5432/contest_results',
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
