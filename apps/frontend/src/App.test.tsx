import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { act, fireEvent, render, screen } from '@testing-library/react';
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
    expect(await screen.findByRole('link', { name: 'Create Account' })).toHaveAttribute(
      'href',
      '/create-account',
    );
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('link', { name: 'Account' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['/create-account', 'Create Account'],
    ['/sign-in', 'Sign In'],
  ])('renders the %s Google authentication page', async (path, title) => {
    renderApp(path);

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: title })).toHaveAttribute('aria-current', 'page');
  });

  it('starts managed Google OAuth with the root return URL and shows progress', async () => {
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
      options: { redirectTo: `${window.location.origin}/` },
    });

    await act(async () =>
      resolveAuthentication({
        data: { provider: 'google', url: 'https://example.supabase.co/auth/v1/authorize' },
        error: null,
      }),
    );
  });

  it('shows a safe Google authentication error without provider details', async () => {
    const auth = renderApp('/create-account');
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

  it('updates to signed-in navigation and displays only session identity information', async () => {
    const session = createSession();
    const auth = renderApp('/account');

    expect(await screen.findByText(/you are signed out/i)).toBeInTheDocument();

    act(() => auth.emit('SIGNED_IN', session));

    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Account' })).not.toBeInTheDocument();
    expect(screen.getByText('person@example.com')).toBeInTheDocument();
    expect(
      screen.queryByText(/administrator|approved submitter|role|grant/i),
    ).not.toBeInTheDocument();
  });

  it('signs out through Supabase, returns home, and restores signed-out navigation', async () => {
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
    expect(screen.getByRole('link', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows a safe sign-out error and remains signed in when Supabase rejects the action', async () => {
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
