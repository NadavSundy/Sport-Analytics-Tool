import type { QueryResult, QueryResultRow } from 'pg';

import { translateDatabaseError } from './errors';

export interface QueryExecutor {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

export async function executeQuery<Row extends QueryResultRow>(
  executor: QueryExecutor,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<Row>> {
  try {
    return await executor.query<Row>(text, values);
  } catch (error) {
    throw translateDatabaseError(error);
  }
}
