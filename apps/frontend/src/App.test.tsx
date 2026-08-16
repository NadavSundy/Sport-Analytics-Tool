import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AuthProvider } from './features/auth/AuthProvider';
import { THEME_STORAGE_KEY } from './theme';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

function createSession(): Session {
  const user = {
    id: 'user-123',
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

function currentUserResponse(approvalState: 'not_requested' | 'pending' | 'approved' | 'rejected') {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      user: {
        id: '17',
        subject: 'user-123',
        displayName: 'Example User',
        role: 'viewer',
        approvalState,
        competitionIds: approvalState === 'approved' ? ['5'] : [],
      },
    }),
  } as unknown as Response;
}

function createAuthClient(session: Session | null) {
  let listener: AuthStateListener | undefined;
  const client = {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    onAuthStateChange: vi.fn((nextListener: AuthStateListener) => {
      listener = nextListener;
      return {
        data: {
          subscription: {
            id: 'app-test-subscription',
            callback: nextListener,
            unsubscribe: vi.fn(),
          },
        },
      };
    }),
    signInWithOAuth: vi
      .fn()
      .mockResolvedValue({ data: { provider: 'google', url: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  } as unknown as AuthClient;

  return {
    client,
    emit(event: AuthChangeEvent, nextSession: Session | null) {
      listener?.(event, nextSession);
    },
  };
}

function apiResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function renderApp(path = '/', session: Session | null = null) {
  const auth = createAuthClient(session);

  render(
    <AuthProvider client={auth.client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthProvider>,
  );

  return auth;
}

function useSystemTheme(prefersDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' && prefersDark,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe('public application and authentication interface', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
    useSystemTheme(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the landing page public and shows signed-out navigation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    expect(screen.getByRole('heading', { level: 1, name: 'Stat’sTheGame' })).toBeInTheDocument();
    const accountNavigation = await screen.findByRole('navigation', { name: 'Account' });
    const authenticationCallToAction = within(accountNavigation).getByRole('link', {
      name: 'Login or Sign up',
    });
    expect(within(accountNavigation).getAllByRole('link')).toHaveLength(1);
    expect(authenticationCallToAction).toHaveAttribute('href', '/sign-in');
    expect(within(accountNavigation).queryByRole('link', { name: 'Create Account' })).toBeNull();
    expect(within(accountNavigation).queryByRole('link', { name: 'Sign In' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Account' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(authenticationCallToAction);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Login or Sign up' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  });

  it('renders the unified Google authentication page without registration alternatives', async () => {
    renderApp('/sign-in');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Login or Sign up' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login or Sign up' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('link', { name: 'Create Account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
  });

  it('starts managed Google OAuth with the callback return URL and shows progress', async () => {
    type OAuthResult = Awaited<ReturnType<AuthClient['signInWithOAuth']>>;
    let resolveAuthentication!: (value: OAuthResult) => void;
    const pendingAuthentication = new Promise<OAuthResult>((resolve) => {
      resolveAuthentication = resolve;
    });
    const auth = renderApp('/sign-in');
    vi.mocked(auth.client.signInWithOAuth).mockReturnValue(pendingAuthentication);

    const button = await screen.findByRole('button', { name: 'Continue with Google' });
    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Connecting to Google…' })).toBeDisabled();
    expect(auth.client.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    await act(async () =>
      resolveAuthentication({
        data: { provider: 'google', url: 'https://example.supabase.co/auth/v1/authorize' },
        error: null,
      }),
    );
  });

  it('shows a safe Google authentication error without provider details', async () => {
    const auth = renderApp('/sign-in');
    vi.mocked(auth.client.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error: new Error('provider secret response') as never,
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not connect to Google. Please try again.',
    );
    expect(screen.queryByText(/provider secret response/i)).not.toBeInTheDocument();
  });

  it('recognises an authenticated callback and opens the account page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
    renderApp('/auth/callback', createSession());

    expect(await screen.findByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument();
    expect(screen.getByText('person@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Submit Events' })).not.toBeInTheDocument();
  });

  it('handles OAuth cancellation without exposing provider details', async () => {
    renderApp('/auth/callback#error=access_denied&error_description=private+provider+detail');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign-in was cancelled. No changes were made.',
    );
    expect(screen.queryByText(/private provider detail/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try Again' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: 'Return Home' })).toHaveAttribute('href', '/');
  });

  it('handles OAuth provider errors without exposing provider details', async () => {
    renderApp(
      '/auth/callback?error=server_error&error_code=500&error_description=provider+secret+response',
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not complete sign-in. Please try again.',
    );
    expect(screen.queryByText(/provider secret response/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('shows a recoverable error when the callback produces no session', async () => {
    renderApp('/auth/callback');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not establish a signed-in session. Please try again.',
    );
    expect(screen.getByRole('link', { name: 'Try Again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return Home' })).toBeInTheDocument();
  });

  it('updates to signed-in navigation and loads the application account status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
    const session = createSession();
    const auth = renderApp('/account');

    expect(await screen.findByText(/you are signed out/i)).toBeInTheDocument();

    act(() => auth.emit('SIGNED_IN', session));

    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login or Sign up' })).not.toBeInTheDocument();
    expect(screen.getByText('person@example.com')).toBeInTheDocument();
    expect(
      screen.queryByText(/administrator|approved submitter|role|grant/i),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Request submitter access' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Delete account' })).toBeInTheDocument();
  });

  it('requires deliberate account-deletion confirmation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
    renderApp('/account', createSession());

    const deleteButton = await screen.findByRole('button', {
      name: 'Permanently delete account',
    });
    expect(deleteButton).toBeDisabled();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'I understand that account deletion is permanent.',
      }),
    );
    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'delete' },
    });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    });
    expect(deleteButton).toBeEnabled();
  });

  it('prevents duplicate deletion requests, signs out locally, and returns home on success', async () => {
    let resolveRequest!: (response: Response) => void;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    type SignOutResult = Awaited<ReturnType<AuthClient['signOut']>>;
    let resolveSignOut!: (result: SignOutResult) => void;
    const signOut = new Promise<SignOutResult>((resolve) => {
      resolveSignOut = resolve;
    });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;

      if (path.endsWith('/auth/me')) {
        return Promise.resolve(currentUserResponse('not_requested'));
      }

      if (path.endsWith('/account')) {
        return request;
      }

      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const auth = renderApp('/account', createSession());
    vi.mocked(auth.client.signOut).mockReturnValue(signOut);

    fireEvent.click(
      await screen.findByRole('checkbox', {
        name: 'I understand that account deletion is permanent.',
      }),
    );
    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    });
    const deleteButton = screen.getByRole('button', { name: 'Permanently delete account' });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    expect(screen.getByRole('button', { name: 'Deleting account…' })).toBeDisabled();
    expect(screen.getByText('Deleting your account…')).toHaveAttribute('role', 'status');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/account',
      expect.objectContaining({ method: 'DELETE' }),
    );

    await act(async () => {
      resolveRequest(apiResponse(200, { data: { status: 'deleted', retainedCricketData: true } }));
    });

    expect(screen.getByText('Account deleted. Clearing this browser session…')).toHaveAttribute(
      'role',
      'status',
    );
    expect(auth.client.signOut).toHaveBeenCalledWith({ scope: 'local' });

    await act(async () => resolveSignOut({ error: null }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stat’sTheGame' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login or Sign up' })).toBeInTheDocument();
  });

  it('announces a safe deletion error and allows retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname;

        if (path.endsWith('/auth/me')) {
          return Promise.resolve(currentUserResponse('not_requested'));
        }

        if (path.endsWith('/account')) {
          return Promise.resolve(
            apiResponse(503, {
              error: {
                code: 'ACCOUNT_DELETION_INCOMPLETE',
                message: 'provider details must not be displayed',
              },
            }),
          );
        }

        throw new Error(`Unexpected request: ${path}`);
      }),
    );
    renderApp('/account', createSession());

    fireEvent.click(
      await screen.findByRole('checkbox', {
        name: 'I understand that account deletion is permanent.',
      }),
    );
    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete account' }));

    expect(
      await screen.findByText(/Your account is disabled and the operation can be retried safely\./),
    ).toHaveAttribute('role', 'alert');
    expect(screen.queryByText(/provider details/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Permanently delete account' })).toBeEnabled();
  });

  it('signs out through Supabase, returns home, and restores signed-out navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
    type SignOutResult = Awaited<ReturnType<AuthClient['signOut']>>;
    let resolveSignOut!: (value: SignOutResult) => void;
    const pendingSignOut = new Promise<SignOutResult>((resolve) => {
      resolveSignOut = resolve;
    });
    const auth = renderApp('/account', createSession());
    vi.mocked(auth.client.signOut).mockReturnValue(pendingSignOut);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign Out' }));

    expect(screen.getByRole('button', { name: 'Signing Out…' })).toBeDisabled();

    await act(async () => {
      auth.emit('SIGNED_OUT', null);
      resolveSignOut({ error: null });
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stat’sTheGame' }),
    ).toBeInTheDocument();
    const accountNavigation = screen.getByRole('navigation', { name: 'Account' });
    expect(within(accountNavigation).getAllByRole('link')).toHaveLength(1);
    expect(
      within(accountNavigation).getByRole('link', { name: 'Login or Sign up' }),
    ).toHaveAttribute('href', '/sign-in');
    expect(within(accountNavigation).queryByRole('link', { name: 'Create Account' })).toBeNull();
    expect(within(accountNavigation).queryByRole('link', { name: 'Sign In' })).toBeNull();
  });

  it('shows a safe sign-out error and remains signed in when Supabase rejects the action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUserResponse('not_requested')));
    const auth = renderApp('/account', createSession());
    vi.mocked(auth.client.signOut).mockResolvedValue({
      error: new Error('token internals') as never,
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Sign Out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not sign you out. Please try again.',
    );
    expect(screen.queryByText(/token internals/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument();
  });

  it('persists a manual theme selection', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Switch to Night Match theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
    expect(await screen.findByText('Night Match')).toBeInTheDocument();
  });
});
