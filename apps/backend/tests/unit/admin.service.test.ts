import { describe, expect, test, vi } from 'vitest';

import type { AdminRepository } from '../../src/modules/admin/admin.repository';
import { createAdminService } from '../../src/modules/admin/admin.service';
import { createTestAccount } from '../test-app';

function repository(): AdminRepository {
  return {
    listUserManagementData: vi.fn().mockResolvedValue({
      users: [],
      availableScopes: [],
    }),
    updateSubmitterAccess: vi.fn().mockResolvedValue({
      id: '42',
      displayName: 'Contributor',
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [{ competitionId: '7', name: 'Premier T20' }],
      disabled: false,
      updatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedBy: { id: '1', displayName: 'Administrator' },
    }),
    rejectSubmitterAccessRequest: vi.fn().mockResolvedValue({
      id: '42',
      displayName: 'Contributor',
      role: 'viewer',
      approvalState: 'rejected',
      competitionScopes: [],
      disabled: false,
      updatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedBy: { id: '1', displayName: 'Administrator' },
    }),
  };
}

describe('administrator user-management service', () => {
  test('lists user-management data', async () => {
    const adminRepository = repository();
    const service = createAdminService(adminRepository);

    await expect(service.listUsers()).resolves.toEqual({
      data: { users: [], availableScopes: [] },
    });
    expect(adminRepository.listUserManagementData).toHaveBeenCalledOnce();
  });

  test('passes the administrator identity and requested scopes to the repository', async () => {
    const adminRepository = repository();
    const service = createAdminService(adminRepository);
    const administrator = createTestAccount({ accountId: '1', role: 'admin' });
    const update = { approved: true, competitionIds: ['7'] };

    await service.updateSubmitterAccess(administrator, '42', update);

    expect(adminRepository.updateSubmitterAccess).toHaveBeenCalledWith('42', '1', update);
  });

  test('does not allow an administrator to change their own submitter access', async () => {
    const adminRepository = repository();
    const service = createAdminService(adminRepository);
    const administrator = createTestAccount({ accountId: '42', role: 'admin' });

    await expect(
      service.updateSubmitterAccess(administrator, '42', {
        approved: false,
        competitionIds: [],
      }),
    ).rejects.toMatchObject({ code: 'SELF_MANAGEMENT_NOT_ALLOWED' });
    expect(adminRepository.updateSubmitterAccess).not.toHaveBeenCalled();
  });

  test('passes the administrator identity when rejecting a pending request', async () => {
    const adminRepository = repository();
    const service = createAdminService(adminRepository);
    const administrator = createTestAccount({ accountId: '1', role: 'admin' });

    await service.rejectSubmitterAccessRequest(administrator, '42');

    expect(adminRepository.rejectSubmitterAccessRequest).toHaveBeenCalledWith('42', '1');
  });

  test('does not allow an administrator to reject their own request', async () => {
    const adminRepository = repository();
    const service = createAdminService(adminRepository);
    const administrator = createTestAccount({ accountId: '42', role: 'admin' });

    await expect(service.rejectSubmitterAccessRequest(administrator, '42')).rejects.toMatchObject({
      code: 'SELF_MANAGEMENT_NOT_ALLOWED',
    });
    expect(adminRepository.rejectSubmitterAccessRequest).not.toHaveBeenCalled();
  });
});
