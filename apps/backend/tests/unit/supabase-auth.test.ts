import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, deleteUserMock, getUserByIdMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  deleteUserMock: vi.fn(),
  getUserByIdMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

import {
  createSupabaseAdminUserDeleter,
  createSupabaseAdminUserEmailReader,
} from '../../src/auth/supabase-auth';

describe('Supabase Auth administration', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    deleteUserMock.mockReset();
    getUserByIdMock.mockReset();
    createClientMock.mockReturnValue({
      auth: {
        admin: {
          deleteUser: deleteUserMock,
          getUserById: getUserByIdMock,
        },
      },
    });
  });

  it('uses a dedicated non-persistent server client for hard deletion', async () => {
    deleteUserMock.mockResolvedValue({ data: {}, error: null });

    const deleteAuthUser = createSupabaseAdminUserDeleter({
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_SECRET_KEY: 'test-server-only-secret-key',
    });

    await expect(deleteAuthUser('auth-user-42')).resolves.toBe('deleted');
    expect(createClientMock).toHaveBeenCalledWith(
      'https://test-project.supabase.co',
      'test-server-only-secret-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    expect(deleteUserMock).toHaveBeenCalledWith('auth-user-42', false);
  });

  it('treats an already-removed Auth identity as an idempotent success', async () => {
    deleteUserMock.mockResolvedValue({
      data: {},
      error: { code: 'user_not_found', message: 'User not found' },
    });

    const deleteAuthUser = createSupabaseAdminUserDeleter({
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_SECRET_KEY: 'test-server-only-secret-key',
    });

    await expect(deleteAuthUser('missing-auth-user')).resolves.toBe('not_found');
  });

  it('does not expose provider details when administrative deletion fails', async () => {
    deleteUserMock.mockResolvedValue({
      data: {},
      error: { code: 'provider_failure', message: 'internal provider detail' },
    });

    const deleteAuthUser = createSupabaseAdminUserDeleter({
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_SECRET_KEY: 'test-server-only-secret-key',
    });

    await expect(deleteAuthUser('auth-user-42')).rejects.toThrow(
      'Supabase Auth administrative deletion failed',
    );
  });

  it('reads only an email through the server-only provider client', async () => {
    getUserByIdMock.mockResolvedValue({
      data: { user: { email: 'contributor@example.com', access_token: 'must-not-leak' } },
      error: null,
    });
    const readAuthUserEmail = createSupabaseAdminUserEmailReader({
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_SECRET_KEY: 'test-server-only-secret-key',
    });

    await expect(readAuthUserEmail('auth-user-42')).resolves.toBe('contributor@example.com');
    expect(getUserByIdMock).toHaveBeenCalledWith('auth-user-42');
  });

  it('categorises a missing provider identity without exposing the provider response', async () => {
    getUserByIdMock.mockResolvedValue({
      data: { user: null },
      error: {
        code: 'user_not_found',
        message: 'The provider-specific user detail is not public.',
      },
    });
    const readAuthUserEmail = createSupabaseAdminUserEmailReader({
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_SECRET_KEY: 'test-server-only-secret-key',
    });

    await expect(
      readAuthUserEmail('deleted:123e4567-e89b-42d3-a456-426614174000'),
    ).rejects.toMatchObject({
      name: 'SupabaseAdminEmailLookupError',
      failure: 'auth_user_not_found',
      message: 'Supabase Auth administrative email lookup failed',
    });
  });
});
