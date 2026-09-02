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
      authSubject: 'contributor-auth-subject',
      displayName: 'Contributor',
      role: 'submitter',
      approvalState: 'approved',
      requestedCompetition: { competitionId: '7', name: 'Premier T20' },
      competitionScopes: [{ competitionId: '7', name: 'Premier T20' }],
      disabled: false,
      updatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedBy: { id: '1', displayName: 'Administrator' },
      previouslyRevoked: false,
    }),
    rejectSubmitterAccessRequest: vi.fn().mockResolvedValue({
      id: '42',
      authSubject: 'contributor-auth-subject',
      displayName: 'Contributor',
      role: 'viewer',
      approvalState: 'rejected',
      requestedCompetition: { competitionId: '7', name: 'Premier T20' },
      competitionScopes: [],
      disabled: false,
      updatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedBy: { id: '1', displayName: 'Administrator' },
      previouslyRevoked: false,
    }),
    updateRole: vi.fn().mockResolvedValue({
      id: '42',
      authSubject: 'contributor-auth-subject',
      displayName: 'Contributor',
      role: 'admin',
      approvalState: 'not_requested',
      requestedCompetition: null,
      competitionScopes: [],
      disabled: false,
      updatedAt: '2026-08-16T12:00:00.000Z',
      submitterAccessUpdatedAt: null,
      submitterAccessUpdatedBy: null,
      previouslyRevoked: false,
    }),
  };
}

describe('administrator user-management service', () => {
  test('lists user-management data', async () => {
    const adminRepository = repository();
    const readAuthUserEmail = vi.fn().mockResolvedValue('contributor@example.com');
    const service = createAdminService(adminRepository, readAuthUserEmail);

    await expect(service.listUsers()).resolves.toEqual({
      data: { users: [], availableScopes: [] },
    });
    expect(adminRepository.listUserManagementData).toHaveBeenCalledOnce();
  });

  test('adds only the provider email to the safe management response', async () => {
    const adminRepository = repository();
    vi.mocked(adminRepository.listUserManagementData).mockResolvedValue({
      users: [
        {
          id: '42',
          authSubject: 'contributor-auth-subject',
          displayName: 'Contributor',
          role: 'viewer',
          approvalState: 'pending',
          requestedCompetition: null,
          competitionScopes: [],
          disabled: false,
          updatedAt: '2026-08-16T12:00:00.000Z',
          submitterAccessUpdatedAt: null,
          submitterAccessUpdatedBy: null,
          previouslyRevoked: false,
        },
      ],
      availableScopes: [],
    });
    const readAuthUserEmail = vi.fn().mockResolvedValue('contributor@example.com');
    const service = createAdminService(adminRepository, readAuthUserEmail);

    await expect(service.listUsers()).resolves.toEqual({
      data: {
        users: [
          expect.objectContaining({ id: '42', email: 'contributor@example.com' }),
        ],
        availableScopes: [],
      },
    });
    expect(readAuthUserEmail).toHaveBeenCalledWith('contributor-auth-subject');
  });

  test('passes the administrator identity and requested scopes to the repository', async () => {
    const adminRepository = repository();
    const service = createAdminService(
      adminRepository,
      vi.fn().mockResolvedValue('contributor@example.com'),
    );
    const administrator = createTestAccount({ accountId: '1', role: 'admin' });
    const update = { approved: true, competitionIds: ['7'] };

    await service.updateSubmitterAccess(administrator, '42', update);

    expect(adminRepository.updateSubmitterAccess).toHaveBeenCalledWith('42', '1', update);
  });

  test('does not allow an administrator to change their own submitter access', async () => {
    const adminRepository = repository();
    const service = createAdminService(
      adminRepository,
      vi.fn().mockResolvedValue('contributor@example.com'),
    );
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
    const service = createAdminService(
      adminRepository,
      vi.fn().mockResolvedValue('contributor@example.com'),
    );
    const administrator = createTestAccount({ accountId: '1', role: 'admin' });

    await service.rejectSubmitterAccessRequest(administrator, '42');

    expect(adminRepository.rejectSubmitterAccessRequest).toHaveBeenCalledWith('42', '1');
  });

  test('does not allow an administrator to reject their own request', async () => {
    const adminRepository = repository();
    const service = createAdminService(
      adminRepository,
      vi.fn().mockResolvedValue('contributor@example.com'),
    );
    const administrator = createTestAccount({ accountId: '42', role: 'admin' });

    await expect(service.rejectSubmitterAccessRequest(administrator, '42')).rejects.toMatchObject({
      code: 'SELF_MANAGEMENT_NOT_ALLOWED',
    });
    expect(adminRepository.rejectSubmitterAccessRequest).not.toHaveBeenCalled();
  });

  test('passes a role promotion to the repository and prevents self-management', async () => {
    const adminRepository = repository();
    const service = createAdminService(
      adminRepository,
      vi.fn().mockResolvedValue('contributor@example.com'),
    );
    const administrator = createTestAccount({ accountId: '1', role: 'admin' });
    await service.updateRole(administrator, '42', { role: 'admin' });
    expect(adminRepository.updateRole).toHaveBeenCalledWith('42', '1', { role: 'admin' });
    await expect(service.updateRole(administrator, '1', { role: 'admin' })).rejects.toMatchObject({
      code: 'SELF_MANAGEMENT_NOT_ALLOWED',
    });
  });
});
