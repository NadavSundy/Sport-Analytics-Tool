import type { Session } from '@supabase/auth-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { PinShortcutButton } from './PinShortcutButton';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];

function authClient(session: Session | null): AuthClient {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { id: 'pin-test', unsubscribe: vi.fn() } },
    })),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  } as unknown as AuthClient;
}

const signedInSession = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-one',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-10-01T00:00:00.000Z',
  },
} as Session;

describe('PinShortcutButton', () => {
  beforeEach(() => window.localStorage.clear());

  it('pins and unpins a signed-in team shortcut', async () => {
    render(
      <AuthProvider client={authClient(signedInSession)}>
        <PinShortcutButton label="team" shortcut={{ kind: 'team', id: 'mancity' }} />
      </AuthProvider>,
    );

    const button = await screen.findByRole('button', { name: 'Pin team' });
    fireEvent.click(button);
    expect(window.localStorage.getItem('stats_pinned_user-one')).toBe('["team_mancity"]');
    expect(screen.getByRole('button', { name: 'Unpin team' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unpin team' }));
    await waitFor(() => expect(window.localStorage.getItem('stats_pinned_user-one')).toBe('[]'));
  });

  it('does not render a pin control for an anonymous visitor', async () => {
    render(
      <AuthProvider client={authClient(null)}>
        <PinShortcutButton label="team" shortcut={{ kind: 'team', id: 'mancity' }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.queryByRole('button', { name: /pin team/i })).toBeNull());
  });
});
