import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

function createSession(userId = 'user-123'): Session {
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'person@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-08-09T00:00:00.000Z',
  } satisfies User;

  return {
    access_token: 'current-access-token',
    refresh_token: 'managed-by-supabase',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

function createDeferredSession() {
  let resolve!: (result: { data: { session: Session | null } }) => void;
  const promise = new Promise<{ data: { session: Session | null } }>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function createAuthClient(sessionRequest: Promise<{ data: { session: Session | null } }>) {
  let listener: AuthStateListener | undefined;
  const unsubscribe = vi.fn();
  const client = {
    getSession: vi.fn(() => sessionRequest),
    onAuthStateChange: vi.fn((nextListener: AuthStateListener) => {
      listener = nextListener;
      return {
        data: {
          subscription: {
            id: 'auth-test-subscription',
            callback: nextListener,
            unsubscribe,
          },
        },
      };
    }),
  } as unknown as AuthClient;

  return {
    client,
    emit(event: AuthChangeEvent, session: Session | null) {
      listener?.(event, session);
    },
  };
}

function AuthStateProbe() {
  const { identity, isAuthenticated, isLoading, session } = useAuth();

  return (
    <dl>
      <dt>Loading</dt>
      <dd>{String(isLoading)}</dd>
      <dt>Authenticated</dt>
      <dd>{String(isAuthenticated)}</dd>
      <dt>Session token</dt>
      <dd>{session?.access_token ?? 'none'}</dd>
      <dt>Identity</dt>
      <dd>{identity?.id ?? 'none'}</dd>
    </dl>
  );
}

describe('AuthProvider', () => {
  it('begins in a loading state and becomes unauthenticated without an existing session', async () => {
    const deferredSession = createDeferredSession();
    const { client } = createAuthClient(deferredSession.promise);

    render(
      <AuthProvider client={client}>
        <AuthStateProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('Loading').nextElementSibling).toHaveTextContent('true');

    await act(async () => deferredSession.resolve({ data: { session: null } }));

    expect(screen.getByText('Loading').nextElementSibling).toHaveTextContent('false');
    expect(screen.getByText('Authenticated').nextElementSibling).toHaveTextContent('false');
    expect(screen.getByText('Identity').nextElementSibling).toHaveTextContent('none');
  });

  it('exposes the existing authenticated session and identity', async () => {
    const session = createSession();
    const { client } = createAuthClient(Promise.resolve({ data: { session } }));

    render(
      <AuthProvider client={client}>
        <AuthStateProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('current-access-token')).toBeInTheDocument();
    expect(screen.getByText('Authenticated').nextElementSibling).toHaveTextContent('true');
    expect(screen.getByText('Identity').nextElementSibling).toHaveTextContent('user-123');
  });

  it('updates shared state when Supabase reports sign-in and sign-out changes', async () => {
    const { client, emit } = createAuthClient(Promise.resolve({ data: { session: null } }));

    render(
      <AuthProvider client={client}>
        <AuthStateProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText('Loading').nextElementSibling).toHaveTextContent('false'),
    );

    act(() => emit('SIGNED_IN', createSession('changed-user')));
    expect(screen.getByText('Identity').nextElementSibling).toHaveTextContent('changed-user');
    expect(screen.getByText('Authenticated').nextElementSibling).toHaveTextContent('true');

    act(() => emit('SIGNED_OUT', null));
    expect(screen.getByText('Identity').nextElementSibling).toHaveTextContent('none');
    expect(screen.getByText('Authenticated').nextElementSibling).toHaveTextContent('false');
  });
});
