import { describe, expect, test, vi } from 'vitest';

import type { SubmitterAccessRepository } from '../../src/modules/submitter-access/submitter-access.repository';
import { createSubmitterAccessService } from '../../src/modules/submitter-access/submitter-access.service';
import { createTestAccount } from '../test-app';

function createRepository(): SubmitterAccessRepository {
  return {
    requestAccess: vi.fn().mockResolvedValue({
      accountId: '42',
      approvalState: 'pending',
      requestedCompetition: { competitionId: '7', name: 'Premier T20' },
    }),
  };
}

describe('submitter access service', () => {
  test('allows a viewer to create a submitter-role request', async () => {
    const repository = createRepository();
    const service = createSubmitterAccessService(repository);

    await expect(
      service.requestAccess(createTestAccount({ role: 'viewer' }), { competitionId: '7' }),
    ).resolves.toEqual({
      data: {
        accountId: '42',
        approvalState: 'pending',
        requestedCompetition: { competitionId: '7', name: 'Premier T20' },
      },
    });
    expect(repository.requestAccess).toHaveBeenCalledWith('1', '7');
  });

  test.each(['submitter', 'admin'] as const)(
    'does not create a redundant request for a %s',
    async (role) => {
      const repository = createRepository();
      const service = createSubmitterAccessService(repository);

      await expect(
        service.requestAccess(createTestAccount({ role }), { competitionId: '7' }),
      ).rejects.toMatchObject({ code: 'SUBMITTER_ALREADY_APPROVED' });
      expect(repository.requestAccess).not.toHaveBeenCalled();
    },
  );
});
