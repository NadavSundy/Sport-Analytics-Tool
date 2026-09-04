import type { QueryResult, QueryResultRow } from 'pg';

/** Structural database boundary shared by the API tests and asynchronous worker. */
export interface QueryExecutor {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

export function executeQuery<Row extends QueryResultRow>(
  executor: QueryExecutor,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<Row>> {
  return executor.query<Row>(text, values);
}
