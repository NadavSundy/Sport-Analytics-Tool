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
    requestAdditionalScope: vi.fn().mockResolvedValue({
      accountId: '42',
      requestedCompetition: { competitionId: '8', name: 'University League' },
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

  test('lets an approved submitter request one additional competition without granting it', async () => {
    const repository = createRepository();
    const service = createSubmitterAccessService(repository);
    const account = createTestAccount({
      role: 'submitter',
      approvalState: 'approved',
      competitionIds: ['7'],
      requestedCompetition: null,
    });

    await expect(service.requestAdditionalScope(account, { competitionId: '8' })).resolves.toEqual({
      data: {
        accountId: '42',
        requestedCompetition: { competitionId: '8', name: 'University League' },
      },
    });
    expect(repository.requestAdditionalScope).toHaveBeenCalledWith('1', '8');
    expect(account.competitionIds).toEqual(['7']);
  });

  test('rejects duplicate and concurrent additional scope requests before persistence', async () => {
    const repository = createRepository();
    const service = createSubmitterAccessService(repository);

    await expect(
      service.requestAdditionalScope(
        createTestAccount({ role: 'submitter', approvalState: 'approved', competitionIds: ['8'] }),
        { competitionId: '8' },
      ),
    ).rejects.toMatchObject({ code: 'SCOPE_ALREADY_GRANTED' });

    await expect(
      service.requestAdditionalScope(
        createTestAccount({
          role: 'submitter',
          approvalState: 'approved',
          competitionIds: ['7'],
          requestedCompetition: { competitionId: '8', name: 'University League' },
        }),
        { competitionId: '9' },
      ),
    ).rejects.toMatchObject({ code: 'ADDITIONAL_SCOPE_REQUEST_PENDING' });

    expect(repository.requestAdditionalScope).not.toHaveBeenCalled();
  });
});
