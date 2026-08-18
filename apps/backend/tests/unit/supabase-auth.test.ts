import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, deleteUserMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  deleteUserMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

import { createSupabaseAdminUserDeleter } from '../../src/auth/supabase-auth';

describe('Supabase Auth administration', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    deleteUserMock.mockReset();
    createClientMock.mockReturnValue({
      auth: {
        admin: {
          deleteUser: deleteUserMock,
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
});
