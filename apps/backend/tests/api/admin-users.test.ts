import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import {
  AdminManagementConflictError,
  AdminEmailLookupUnavailableError,
  AdminUserNotFoundError,
  InvalidCompetitionScopesError,
} from '../../src/modules/admin/admin.errors';
import type { AdminService } from '../../src/modules/admin/admin.service';
import { createTestAccount, createTestApp } from '../test-app';

const updatedAt = '2026-08-16T12:00:00.000Z';

function managedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: '42',
    email: 'contributor@example.com',
    displayName: 'Pending Contributor',
    role: 'viewer' as const,
    approvalState: 'pending' as const,
    requestedCompetition: { competitionId: '7', name: 'Premier T20' },
    competitionScopes: [],
    disabled: false,
    updatedAt,
    submitterAccessUpdatedAt: null,
    submitterAccessUpdatedBy: null,
    ...overrides,
  };
}

function mockAdminService(): AdminService {
  return {
    listUsers: vi.fn<AdminService['listUsers']>().mockResolvedValue({
      data: {
        users: [managedUser()],
        availableScopes: [{ competitionId: '7', name: 'Premier T20' }],
      },
    }),
    updateSubmitterAccess: vi.fn<AdminService['updateSubmitterAccess']>().mockResolvedValue({
      data: managedUser({
        role: 'submitter',
        approvalState: 'approved',
        competitionScopes: [{ competitionId: '7', name: 'Premier T20' }],
        submitterAccessUpdatedAt: updatedAt,
        submitterAccessUpdatedBy: { id: '1', displayName: 'Administrator' },
      }),
    }),
    rejectSubmitterAccessRequest: vi
      .fn<AdminService['rejectSubmitterAccessRequest']>()
      .mockResolvedValue({
        data: managedUser({
          approvalState: 'rejected',
          submitterAccessUpdatedAt: updatedAt,
          submitterAccessUpdatedBy: { id: '1', displayName: 'Administrator' },
        }),
      }),
    updateRole: vi.fn<AdminService['updateRole']>().mockResolvedValue({
      data: managedUser({ role: 'admin', approvalState: 'not_requested' }),
    }),
  };
}

function appWithAdminService(
  service: AdminService,
  account = createTestAccount({ accountId: '1', role: 'admin' }),
  verifyAccessToken?: VerifyAccessToken,
) {
  return createTestApp(
    verifyAccessToken,
    undefined,
    async () => account,
    undefined,
    undefined,
    undefined,
    undefined,
    service,
  );
}

describe('administrator user-management API', () => {
  test('requires authentication before listing registered users', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const service = mockAdminService();

    const response = await request(appWithAdminService(service, undefined, verifyAccessToken))
      .get('/api/v1/admin/users')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(service.listUsers).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  test.each(['viewer', 'submitter'] as const)('does not allow a %s to list users', async (role) => {
    const service = mockAdminService();

    const response = await request(appWithAdminService(service, createTestAccount({ role })))
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer user-token')
      .expect(403);

    expect(service.listUsers).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('lists users and valid competition scopes for an administrator', async () => {
    const service = mockAdminService();

    const response = await request(appWithAdminService(service))
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(service.listUsers).toHaveBeenCalledOnce();
    expect(response.body.data.users[0]).toMatchObject({
      id: '42',
      role: 'viewer',
      approvalState: 'pending',
      requestedCompetition: { competitionId: '7', name: 'Premier T20' },
    });
    expect(response.body.data.availableScopes).toEqual([
      { competitionId: '7', name: 'Premier T20' },
    ]);
  });

  test('returns a controlled response when the server-only email lookup is unavailable', async () => {
    const service = mockAdminService();
    vi.mocked(service.listUsers).mockRejectedValue(new AdminEmailLookupUnavailableError());

    const response = await request(appWithAdminService(service))
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer admin-token')
      .expect(503);

    expect(response.body.error).toEqual({
      code: 'ADMIN_EMAIL_LOOKUP_UNAVAILABLE',
      message: 'Administrator email lookup is temporarily unavailable.',
    });
  });

  test('approves a submitter with a selected scope', async () => {
    const service = mockAdminService();
    const administrator = createTestAccount({ accountId: '1', role: 'admin' });

    const response = await request(appWithAdminService(service, administrator))
      .patch('/api/v1/admin/users/42/submitter-access')
      .set('Authorization', 'Bearer admin-token')
      .send({ approved: true, competitionIds: ['7'] })
      .expect(200);

    expect(service.updateSubmitterAccess).toHaveBeenCalledWith(administrator, '42', {
      approved: true,
      competitionIds: ['7'],
    });
    expect(response.body.data).toMatchObject({
      id: '42',
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [{ competitionId: '7', name: 'Premier T20' }],
    });
  });

  test('promotes a non-administrator through the server-authorised role endpoint', async () => {
    const service = mockAdminService();
    const administrator = createTestAccount({ accountId: '1', role: 'admin' });
    await request(appWithAdminService(service, administrator))
      .patch('/api/v1/admin/users/42/role')
      .set('Authorization', 'Bearer admin-token')
      .send({ role: 'admin' })
      .expect(200);
    expect(service.updateRole).toHaveBeenCalledWith(administrator, '42', { role: 'admin' });
  });

  test('rejects invalid roles before role management reaches the service', async () => {
    const service = mockAdminService();
    await request(appWithAdminService(service))
      .patch('/api/v1/admin/users/42/role')
      .set('Authorization', 'Bearer admin-token')
      .send({ role: 'owner' })
      .expect(422);
    expect(service.updateRole).not.toHaveBeenCalled();
  });

  test('revokes submitter access and all scopes', async () => {
    const service = mockAdminService();
    vi.mocked(service.updateSubmitterAccess).mockResolvedValue({
      data: managedUser({ approvalState: 'approved' }),
    });

    const response = await request(appWithAdminService(service))
      .patch('/api/v1/admin/users/42/submitter-access')
      .set('Authorization', 'Bearer admin-token')
      .send({ approved: false, competitionIds: [] })
      .expect(200);

    expect(service.updateSubmitterAccess).toHaveBeenCalledWith(expect.anything(), '42', {
      approved: false,
      competitionIds: [],
    });
    expect(response.body.data).toMatchObject({
      role: 'viewer',
      approvalState: 'approved',
      competitionScopes: [],
    });
  });

  test('rejects a pending submitter access request through the explicit action', async () => {
    const service = mockAdminService();
    const administrator = createTestAccount({ accountId: '1', role: 'admin' });

    const response = await request(appWithAdminService(service, administrator))
      .post('/api/v1/admin/users/42/submitter-access/rejection')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(service.rejectSubmitterAccessRequest).toHaveBeenCalledWith(administrator, '42');
    expect(response.body.data).toMatchObject({
      id: '42',
      role: 'viewer',
      approvalState: 'rejected',
      competitionScopes: [],
    });
  });

  test('requires an administrator for the rejection action', async () => {
    const service = mockAdminService();

    await request(appWithAdminService(service, createTestAccount({ role: 'viewer' })))
      .post('/api/v1/admin/users/42/submitter-access/rejection')
      .set('Authorization', 'Bearer viewer-token')
      .expect(403);

    expect(service.rejectSubmitterAccessRequest).not.toHaveBeenCalled();
  });

  test('requires authentication for the rejection action', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const service = mockAdminService();

    await request(appWithAdminService(service, undefined, verifyAccessToken))
      .post('/api/v1/admin/users/42/submitter-access/rejection')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(service.rejectSubmitterAccessRequest).not.toHaveBeenCalled();
  });

  test('returns a stable conflict for an invalid rejection transition', async () => {
    const service = mockAdminService();
    vi.mocked(service.rejectSubmitterAccessRequest).mockRejectedValue(
      new AdminManagementConflictError(
        'INVALID_SUBMITTER_ACCESS_TRANSITION',
        "The requested submitter access transition is not valid for the account's current state.",
      ),
    );

    const response = await request(appWithAdminService(service))
      .post('/api/v1/admin/users/42/submitter-access/rejection')
      .set('Authorization', 'Bearer admin-token')
      .expect(409);

    expect(response.body.error).toEqual({
      code: 'INVALID_SUBMITTER_ACCESS_TRANSITION',
      message:
        "The requested submitter access transition is not valid for the account's current state.",
    });
  });

  test.each([
    [{ approved: true, competitionIds: [] }, 'Select at least one competition scope'],
    [{ approved: false, competitionIds: ['7'] }, 'cannot retain competition scopes'],
    [{ approved: true, competitionIds: ['not-an-id'] }, 'must be valid'],
  ])('rejects an invalid submitter access update', async (body, expectedMessage) => {
    const service = mockAdminService();

    const response = await request(appWithAdminService(service))
      .patch('/api/v1/admin/users/42/submitter-access')
      .set('Authorization', 'Bearer admin-token')
      .send(body)
      .expect(422);

    expect(service.updateSubmitterAccess).not.toHaveBeenCalled();
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(response.body.error.details[0].message).toContain(expectedMessage);
  });

  test('prevents a normal signed-in user from approving themselves', async () => {
    const service = mockAdminService();
    const viewer = createTestAccount({ accountId: '42', role: 'viewer' });

    await request(appWithAdminService(service, viewer))
      .patch('/api/v1/admin/users/42/submitter-access')
      .set('Authorization', 'Bearer viewer-token')
      .send({ approved: true, competitionIds: ['7'] })
      .expect(403);

    expect(service.updateSubmitterAccess).not.toHaveBeenCalled();
  });

  test.each([
    [new InvalidCompetitionScopesError(['99']), 422, 'INVALID_COMPETITION_SCOPE'],
    [new AdminUserNotFoundError(), 404, 'USER_NOT_FOUND'],
    [
      new AdminManagementConflictError(
        'SELF_MANAGEMENT_NOT_ALLOWED',
        'Administrators cannot change their own submitter access.',
      ),
      409,
      'SELF_MANAGEMENT_NOT_ALLOWED',
    ],
    [
      new AdminManagementConflictError(
        'INVALID_SUBMITTER_ACCESS_TRANSITION',
        "The requested submitter access transition is not valid for the account's current state.",
      ),
      409,
      'INVALID_SUBMITTER_ACCESS_TRANSITION',
    ],
  ])('returns a useful management failure', async (error, status, code) => {
    const service = mockAdminService();
    vi.mocked(service.updateSubmitterAccess).mockRejectedValue(error);

    const response = await request(appWithAdminService(service))
      .patch('/api/v1/admin/users/42/submitter-access')
      .set('Authorization', 'Bearer admin-token')
      .send({ approved: true, competitionIds: ['99'] })
      .expect(status);

    expect(response.body.error.code).toBe(code);
    expect(response.body.error.message).toEqual(expect.any(String));
  });
});
