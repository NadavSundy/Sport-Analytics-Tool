import request from 'supertest';
import { describe, expect, test } from 'vitest';

import type { PublicReadService } from '../../src/modules/public-read/public-read.service';
import { DatabaseAccessError, translateDatabaseError } from '../../src/database';
import { createTestApp } from '../test-app';

/**
 * A cancelled statement reaches the error handler as an ordinary rejected
 * request, so it is asserted through a real route and the published error
 * envelope rather than against the handler in isolation.
 */
function appRejectingWith(error: unknown) {
  const publicRead = {
    async listCompetitions() {
      throw error;
    },
  } as unknown as PublicReadService;

  return createTestApp(undefined, publicRead);
}

describe('cancelled database statements', () => {
  test('reports a cancelled statement as retryable rather than as an internal error', async () => {
    const cancelled = translateDatabaseError(
      Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' }),
    );

    const response = await request(appRejectingWith(cancelled))
      .get('/api/v1/competitions')
      .expect('Content-Type', /application\/json/)
      .expect(503);

    expect(response.body).toEqual({
      error: {
        code: 'DATABASE_STATEMENT_TIMEOUT',
        message: 'The request exceeded the database time limit. Please retry.',
      },
    });
  });

  test('does not disclose the statement, its text or the database in the response', async () => {
    const cancelled = translateDatabaseError(
      Object.assign(
        new Error('canceling statement due to statement timeout: SELECT * FROM delivery_current'),
        { code: '57014' },
      ),
    );

    const response = await request(appRejectingWith(cancelled)).get('/api/v1/competitions');

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('delivery_current');
    expect(body).not.toContain('57014');
    expect(body).not.toContain('canceling statement');
  });

  // The 503 is deliberately narrow. Reclassifying the other database codes is
  // not part of bounding statement execution time.
  test('leaves every other database failure reported as an internal error', async () => {
    for (const code of [
      'DATABASE_UNAVAILABLE',
      'DATABASE_CONFLICT',
      'DATABASE_REFERENCE_ERROR',
      'DATABASE_CONSTRAINT_ERROR',
      'DATABASE_OPERATION_FAILED',
      'DATABASE_TRANSACTION_FAILED',
    ] as const) {
      const response = await request(appRejectingWith(new DatabaseAccessError(code, 'failed')))
        .get('/api/v1/competitions')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    }
  });
});
