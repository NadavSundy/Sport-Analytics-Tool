import type { ApplicationRole, SubmitterApprovalState } from '@sport-analytics/contracts';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  requestedCompetition = approvalState === 'not_requested'
    ? null
    : { competitionId: '5', name: 'Premier T20' },
): Response {
  return jsonResponse(200, {
    user: {
      id: '17',
      subject: 'requesting-user',
      displayName: 'Requesting User',
      role,
      approvalState,
      requestedCompetition,
      competitionIds: role === 'submitter' || role === 'admin' ? ['5'] : [],
    },
  });
}

function competitionsResponse(
  competitions = [
    { competitionId: '5', name: 'Premier T20' },
    { competitionId: '8', name: 'University League' },
  ],
): Response {
  return jsonResponse(200, {
    data: competitions,
    pagination: { nextCursor: null },
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
    let requestedCompetition: { competitionId: string; name: string } | null = null;
    let resolveRequest!: (response: Response) => void;
    const pendingRequest = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;

      if (path.endsWith('/auth/me')) {
        return Promise.resolve(currentUser(approvalState, 'viewer', requestedCompetition));
      }

      if (path.endsWith('/competitions')) {
        return Promise.resolve(competitionsResponse());
      }

      if (path.endsWith('/submitter-access-requests')) {
        return pendingRequest;
      }

      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAccountPage();

    const competitionSelect = await screen.findByRole('combobox', { name: 'Competition' });
    expect(competitionSelect).toHaveValue('5');
    fireEvent.change(competitionSelect, { target: { value: '8' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Request submitter access' }));

    expect(screen.getByRole('button', { name: 'Requesting access…' })).toBeDisabled();

    approvalState = 'pending';
    requestedCompetition = { competitionId: '8', name: 'University League' };
    await act(async () => {
      resolveRequest(
        jsonResponse(201, {
          data: {
            accountId: '17',
            approvalState: 'pending',
            requestedCompetition: { competitionId: '8', name: 'University League' },
          },
        }),
      );
    });

    expect(await screen.findByText('Pending approval')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your request for University League was submitted and is now awaiting administrator approval.',
      ),
    ).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const requestCall = fetchMock.mock.calls.find(([input]) =>
      new URL(String(input)).pathname.endsWith('/submitter-access-requests'),
    ) as [string, RequestInit];
    const [, requestInit] = requestCall;
    expect(requestInit.method).toBe('POST');
    expect(requestInit.body).toBe(JSON.stringify({ competitionId: '8' }));
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

  it('shows an empty state when no competitions are available to request', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser('not_requested'))
        .mockResolvedValueOnce(competitionsResponse([])),
    );

    renderAccountPage();

    expect(
      await screen.findByText('No competitions are currently available for an access request.'),
    ).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('combobox', { name: 'Competition' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Request submitter access' }),
    ).not.toBeInTheDocument();
  });

  it('refreshes a stale eligible view when the backend reports an active request conflict', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser('not_requested'))
      .mockResolvedValueOnce(competitionsResponse())
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

  it('shows submitter access from the role and offers additional competition scope', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser('approved', 'submitter'))
        .mockResolvedValueOnce(competitionsResponse()),
    );

    renderAccountPage();

    expect(await screen.findByText('Submitter')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submit events' })).toHaveAttribute(
      'href',
      '/submissions/new',
    );
    expect(screen.queryByRole('link', { name: 'Upload a batch' })).toBeNull();
    expect(screen.queryByRole('button', { name: /request submitter access/i })).toBeNull();
    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.tagName === 'P' &&
          element.textContent?.includes('Current competition scope:') &&
          element.textContent.includes('Premier T20'),
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request additional competition' })).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Additional competition' }),
    ).not.toBeInTheDocument();
  });

  it('opens the additional competition dialog on demand and closes it on cancel', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser('approved', 'submitter'))
        .mockResolvedValueOnce(competitionsResponse()),
    );

    renderAccountPage();

    const trigger = await screen.findByRole('button', { name: 'Request additional competition' });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Request additional competition' });
    expect(
      within(dialog).getByRole('combobox', { name: 'Additional competition' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox')).toHaveFocus();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes the additional competition dialog on Escape', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser('approved', 'submitter'))
        .mockResolvedValueOnce(competitionsResponse()),
    );

    renderAccountPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Request additional competition' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lets the user change the selected competition before confirming', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser('approved', 'submitter'))
        .mockResolvedValueOnce(
          competitionsResponse([
            { competitionId: '5', name: 'Premier T20' },
            { competitionId: '8', name: 'University League' },
            { competitionId: '9', name: 'Regional Cup' },
          ]),
        ),
    );

    renderAccountPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Request additional competition' }));
    const dialog = await screen.findByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: 'Request competition' });
    const select = within(dialog).getByRole('combobox', { name: 'Additional competition' });

    expect(confirmButton).toBeEnabled();

    fireEvent.change(select, { target: { value: '9' } });
    expect(select).toHaveValue('9');
    expect(confirmButton).toBeEnabled();
  });

  it('submits an additional competition request from the dialog without granting access client-side', async () => {
    let requestedCompetition: { competitionId: string; name: string } | null = {
      competitionId: '5',
      name: 'Premier T20',
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('approved', 'submitter', requestedCompetition));
      }
      if (path.endsWith('/competitions')) return Promise.resolve(competitionsResponse());
      if (path.endsWith('/submitter-scope-requests')) {
        requestedCompetition = { competitionId: '8', name: 'University League' };
        return Promise.resolve(
          jsonResponse(201, {
            data: {
              accountId: '17',
              requestedCompetition,
            },
          }),
        );
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAccountPage();

    expect(
      await screen.findByText((_, element) =>
        Boolean(
          element?.tagName === 'P' &&
          element.textContent?.includes('Current competition scope:') &&
          element.textContent.includes('Premier T20'),
        ),
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Request additional competition' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request competition' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText(/Additional scope request pending for/)).toHaveTextContent(
      'University League',
    );
    expect(screen.getByText(/existing submission access is unchanged/i)).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.tagName === 'P' &&
          element.textContent?.includes('Current competition scope:') &&
          element.textContent.includes('Premier T20'),
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request additional competition' })).toBeNull();

    const requestCall = fetchMock.mock.calls.find(([input]) =>
      new URL(String(input)).pathname.endsWith('/submitter-scope-requests'),
    ) as [string, RequestInit];
    expect(requestCall[1].body).toBe(JSON.stringify({ competitionId: '8' }));
  });

  it('keeps the dialog open and shows the error when the additional competition request fails', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('approved', 'submitter'));
      }
      if (path.endsWith('/competitions')) return Promise.resolve(competitionsResponse());
      if (path.endsWith('/submitter-scope-requests')) {
        return Promise.resolve(
          jsonResponse(500, {
            error: { code: 'INTERNAL', message: 'The request could not be completed.' },
          }),
        );
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAccountPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Request additional competition' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request competition' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The request could not be completed.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('combobox', { name: 'Additional competition' }),
    ).toBeInTheDocument();
  });

  it('exposes submission access to an admin regardless of legacy approval state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUser('not_requested', 'admin')));

    renderAccountPage();

    expect(await screen.findByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submit events' })).toHaveAttribute(
      'href',
      '/submissions/new',
    );
    expect(screen.getByRole('link', { name: 'Publish dataset release' })).toHaveAttribute(
      'href',
      '/admin/dataset-releases/new',
    );
  });

  it('permits a revoked viewer to request access again without restoring submission access', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser('approved'))
        .mockResolvedValueOnce(competitionsResponse()),
    );

    renderAccountPage();

    expect(await screen.findByText(/previous submitter access was revoked/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Submit events' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Request submitter access' })).toBeEnabled();
  });

  it('explains rejected access and permits a new request', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser('rejected'))
        .mockResolvedValueOnce(competitionsResponse()),
    );

    renderAccountPage();

    expect(await screen.findByText('Not approved')).toBeInTheDocument();
    expect(screen.getByText(/previous request was declined/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Competition' })).toHaveValue('5');
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
      .mockResolvedValueOnce(currentUser('approved', 'submitter'))
      .mockResolvedValueOnce(competitionsResponse());
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
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
      .mockResolvedValueOnce(competitionsResponse())
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