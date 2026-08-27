import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { createSubmitterAccessRepository } from '../../src/modules/submitter-access/submitter-access.repository';

function queryResult(rows: Record<string, unknown>[]) {
  return {
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

function createExecutor(...results: Record<string, unknown>[][]) {
  const query = vi.fn();

  for (const rows of results) {
    query.mockResolvedValueOnce(queryResult(rows));
  }

  return {
    executor: { query } as unknown as QueryExecutor,
    query,
  };
}

describe('submitter access repository', () => {
  test('atomically changes an eligible account to pending', async () => {
    const { executor, query } = createExecutor([
      {
        accountId: '42',
        approvalState: 'pending',
        disabledAt: null,
        requestedCompetitionId: '7',
        requestedCompetitionName: 'Premier T20',
      },
    ]);

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42', '7')).resolves.toEqual({
      accountId: '42',
      approvalState: 'pending',
      requestedCompetition: { competitionId: '7', name: 'Premier T20' },
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("submitter_approval_state IN ('not_requested', 'rejected')"),
      ['42', '7'],
    );
  });

  test('rejects an account with an existing pending request', async () => {
    const { executor } = createExecutor(
      [],
      [
        {
          accountId: '42',
          approvalState: 'pending',
          disabledAt: null,
          competitionExists: true,
        },
      ],
    );

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42', '7')).rejects.toMatchObject({
      code: 'REQUEST_ALREADY_PENDING',
    });
  });

  test('rejects an already-approved submitter', async () => {
    const { executor } = createExecutor(
      [],
      [
        {
          accountId: '42',
          approvalState: 'approved',
          disabledAt: null,
          competitionExists: true,
        },
      ],
    );

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42', '7')).rejects.toMatchObject({
      code: 'SUBMITTER_ALREADY_APPROVED',
    });
  });

  test('fails closed for an unsupported persisted approval state', async () => {
    const { executor } = createExecutor(
      [],
      [
        {
          accountId: '42',
          approvalState: 'unexpected-state',
          disabledAt: null,
          competitionExists: true,
        },
      ],
    );

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42', '7')).rejects.toThrow('unsupported approval state');
  });

  test('rejects a competition that does not exist without changing the account', async () => {
    const { executor } = createExecutor(
      [],
      [
        {
          accountId: '42',
          approvalState: 'not_requested',
          disabledAt: null,
          competitionExists: false,
        },
      ],
    );

    const repository = createSubmitterAccessRepository(executor);

    await expect(repository.requestAccess('42', '99')).rejects.toThrow(
      'The requested competition does not exist.',
    );
  });
});
