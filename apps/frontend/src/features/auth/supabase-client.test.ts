import { afterEach, describe, expect, it, vi } from 'vitest';

const authClient = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
};
const createAuthClient = vi.fn((_options?: unknown) => authClient);
const createSupabaseClient = vi.fn();

class AuthClientConstructor {
  constructor(options: unknown) {
    return createAuthClient(options);
  }
}

vi.mock('@supabase/auth-js', () => ({ GoTrueClient: AuthClientConstructor }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createSupabaseClient }));

describe('Supabase auth client', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('constructs only the auth client required by the frontend session provider', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-key');

    const { supabase } = await import('./supabase-client');

    expect(supabase).toBe(authClient);
    expect(createAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({
        autoRefreshToken: true,
        detectSessionInUrl: true,
        headers: { apikey: 'public-key' },
        persistSession: true,
        url: 'https://example.supabase.co/auth/v1',
      }),
    );
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });
});
