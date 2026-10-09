import type { AuthChangeEvent, Session } from '@supabase/auth-js';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { AdministrationPage } from './AdministrationPage';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
const session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'admin-subject' },
} as Session;

function authClient(): AuthClient {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    onAuthStateChange: vi.fn(
      (_listener: (event: AuthChangeEvent, session: Session | null) => void) => ({
        data: { subscription: { id: 'test', callback: _listener, unsubscribe: vi.fn() } },
      }),
    ),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  } as unknown as AuthClient;
}

describe('administration entry points', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Issue #933: the loading status ended in three garbled characters instead of
  // an ellipsis, because the ellipsis had been saved as its UTF-8 bytes re-read
  // as Windows-1252.
  it('announces the administrator access check with a correctly encoded ellipsis', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    render(
      <AuthProvider client={authClient()}>
        <MemoryRouter>
          <AdministrationPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/^Checking administrator access…$/);
  });

  it('shows API consumers alongside existing administration actions for administrators', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          user: {
            id: '1',
            subject: 'admin-subject',
            displayName: 'Admin',
            role: 'admin',
            approvalState: 'not_requested',
            requestedCompetition: null,
            competitionIds: [],
          },
        }),
      }),
    );
    render(
      <AuthProvider client={authClient()}>
        <MemoryRouter>
          <AdministrationPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByRole('link', { name: 'Manage API consumers' })).toHaveAttribute(
      'href',
      '/admin/api-consumers',
    );
    expect(screen.getByRole('link', { name: 'Manage users' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Publish dataset release' })).toBeInTheDocument();
  });
});
