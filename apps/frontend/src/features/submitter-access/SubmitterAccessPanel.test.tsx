import type { ApplicationRole, SubmitterApprovalState } from '@sport-analytics/contracts';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicApp } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function createSession(): Session {
  const user = {
    id: 'requesting-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'viewer@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-08-16T00:00:00.000Z',
  } satisfies User;

  return {
    access_token: 'viewer-access-token',
    refresh_token: 'managed-by-supabase',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

function createAuthClient(session: Session | null = createSession()) {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    onAuthStateChange: vi.fn((listener: AuthStateListener) => ({
      data: {
        subscription: {
          id: 'submitter-access-test-subscription',
          callback: listener,
          unsubscribe: vi.fn(),
        },
      },
    })),
    signInWithOAuth: vi
      .fn()
      .mockResolvedValue({ data: { provider: 'google', url: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  } as unknown as AuthClient;
}

function currentUser(
  approvalState: SubmitterApprovalState,
  role: ApplicationRole = 'viewer',
): Response {
  return jsonResponse(200, {
    user: {
      id: '17',
      subject: 'requesting-user',
      displayName: 'Requesting User',
      role,
      approvalState,
      competitionIds: role === 'submitter' || role === 'admin' ? ['5'] : [],
    },
  });
}

function renderAccountPage(session: Session | null = createSession()) {
  return render(
    <AuthProvider client={createAuthClient(session)}>
      <MemoryRouter initialEntries={['/account']}>
        <PublicApp />
      </MemoryRouter>
    </AuthProvider>,
  );
}

function useSystemTheme() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

describe('submitter access request and status interface', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSystemTheme();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not load application account data while signed out', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderAccountPage(null);

    expect(await screen.findByText(/you are signed out/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Submitter access' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits an eligible request, exposes progress, and reloads the persisted pending state', async () => {
    let approvalState: SubmitterApprovalState = 'not_requested';
    let resolveRequest!: (response: Response) => void;
    const pendingRequest = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;

      if (path.endsWith('/auth/me')) {
        return Promise.resolve(currentUser(approvalState));
      }

      if (path.endsWith('/submitter-access-requests')) {
        return pendingRequest;
      }

      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAccountPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Request submitter access' }));

    expect(screen.getByRole('button', { name: 'Requesting access…' })).toBeDisabled();

    approvalState = 'pending';
    await act(async () => {
      resolveRequest(
        jsonResponse(201, {
          data: { accountId: '17', approvalState: 'pending' },
        }),
      );
    });

    expect(await screen.findByText('Pending approval')).toBeInTheDocument();
    expect(
      screen.getByText('Your request was submitted and is now awaiting administrator approval.'),
    ).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [, requestInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(requestInit.method).toBe('POST');
    expect(new Headers(requestInit.headers).get('Authorization')).toBe(
      'Bearer viewer-access-token',
    );
  });

  it('restores a persisted pending state after remount without offering another request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(currentUser('pending'));
    vi.stubGlobal('fetch', fetchMock);

    const firstRender = renderAccountPage();
    expect(await screen.findByText('Pending approval')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();

    firstRender.unmount();
    renderAccountPage();

    expect(await screen.findByText('Pending approval')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
  });

  it('refreshes a stale eligible view when the backend reports an active request conflict', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser('not_requested'))
      .mockResolvedValueOnce(
        jsonResponse(409, {
          error: {
            code: 'REQUEST_ALREADY_PENDING',
            message: 'A submitter access request is already pending.',
          },
        }),
      )
      .mockResolvedValueOnce(currentUser('pending'));
    vi.stubGlobal('fetch', fetchMock);

    renderAccountPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Request submitter access' }));

    expect(await screen.findByText('Pending approval')).toBeInTheDocument();
    expect(
      screen.getByText('Your submitter status changed and has been refreshed from your account.'),
    ).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
  });

  it('shows submitter access from the role without a request action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUser('approved', 'submitter')));

    renderAccountPage();

    expect(await screen.findByText('Submitter')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submit events' })).toHaveAttribute(
      'href',
      '/submissions/new',
    );
    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
  });

  it('exposes submission access to an admin regardless of legacy approval state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUser('not_requested', 'admin')));

    renderAccountPage();

    expect(await screen.findByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submit events' })).toHaveAttribute(
      'href',
      '/submissions/new',
    );
  });

  it('does not expose submission access from the deprecated approval state alone', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUser('approved')));

    renderAccountPage();

    expect(
      await screen.findByText(/previously approved submitter access has been revoked/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Submit events' })).toBeNull();
  });

  it('explains rejected access and permits a new request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUser('rejected')));

    renderAccountPage();

    expect(await screen.findByText('Not approved')).toBeInTheDocument();
    expect(screen.getByText(/previous request was declined/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request submitter access' })).toBeEnabled();
  });

  it('reports an unauthenticated status response as an expired session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(401, {
          error: {
            code: 'UNAUTHORIZED',
            message: 'A valid authentication token is required.',
          },
        }),
      ),
    );

    renderAccountPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your session is no longer valid. Sign in again to check your submitter status.',
    );
  });

  it('retries a server-error status response and renders the resolved access state', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(500, {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'The server could not complete the request.',
          },
        }),
      )
      .mockResolvedValueOnce(currentUser('approved', 'submitter'));
    vi.stubGlobal('fetch', fetchMock);

    renderAccountPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your submitter status could not be loaded. Please try again.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry status check' }));

    expect(await screen.findByText('Submitter')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submit events' })).toHaveAttribute(
      'href',
      '/submissions/new',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('communicates profile and request failures and leaves retry available', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          user: { approvalState: 'not_requested' },
        }),
      )
      .mockResolvedValueOnce(currentUser('not_requested'))
      .mockResolvedValueOnce(
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Submitter access requests are temporarily unavailable.',
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderAccountPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The API returned an unexpected account response. Please try again.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry status check' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Request submitter access' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Submitter access requests are temporarily unavailable.',
    );
    expect(screen.getByRole('button', { name: 'Request submitter access' })).toBeEnabled();
  });
});
