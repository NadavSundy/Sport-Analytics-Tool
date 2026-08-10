import type { Pool, PoolClient } from 'pg';

import { DatabaseAccessError, translateDatabaseError } from './errors';
import { executeQuery } from './query';

export async function withTransaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  let client: PoolClient;

  try {
    client = await pool.connect();
  } catch (error) {
    throw translateDatabaseError(error);
  }

  let transactionStarted = false;

  try {
    await executeQuery(client, 'BEGIN');
    transactionStarted = true;

    const result = await operation(client);

    await executeQuery(client, 'COMMIT');
    transactionStarted = false;

    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await executeQuery(client, 'ROLLBACK');
      } catch (rollbackError) {
        throw new DatabaseAccessError(
          'DATABASE_TRANSACTION_FAILED',
          'The database transaction failed and rollback could not be confirmed.',
          {
            cause: new AggregateError([error, rollbackError]),
          },
        );
      }
    }

    throw error;
  } finally {
    client.release();
  }
}
