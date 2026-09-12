import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { AdministratorManagedUser } from '@sport-analytics/contracts';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { AdminUsersPage } from './AdminUsersPage';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
const accessTime = '2026-08-16T12:00:00.000Z';
const availableScopes = [
  { competitionId: '7', name: 'Premier T20' },
  { competitionId: '8', name: 'University League' },
];

function session(): Session {
  const user = {
    id: 'admin-subject',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: accessTime,
  } satisfies User;
  return {
    access_token: 'admin-access-token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

function authClient(currentSession: Session | null): AuthClient {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: currentSession } }),
    onAuthStateChange: vi.fn(
      (_listener: (event: AuthChangeEvent, session: Session | null) => void) => ({
        data: { subscription: { id: 'test', callback: _listener, unsubscribe: vi.fn() } },
      }),
    ),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  } as unknown as AuthClient;
}

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function currentUser(role: 'viewer' | 'admin' = 'admin') {
  return response(200, {
    user: {
      id: '1',
      subject: 'admin-subject',
      displayName: 'Administrator',
      role,
      approvalState: 'not_requested',
      requestedCompetition: null,
      competitionIds: [],
    },
  });
}

function managedUser(overrides: Partial<AdministratorManagedUser> = {}): AdministratorManagedUser {
  return {
    id: '42',
    email: 'pending.contributor@example.com',
    displayName: 'Pending Contributor',
    role: 'viewer' as const,
    approvalState: 'pending' as const,
    requestedCompetition: availableScopes[0]!,
    competitionScopes: [],
    disabled: false,
    previouslyRevoked: false,
    updatedAt: accessTime,
    submitterAccessUpdatedAt: null,
    submitterAccessUpdatedBy: null,
    ...overrides,
  };
}

const administrator = managedUser({
  id: '1',
  email: 'admin@example.com',
  displayName: 'Administrator',
  role: 'admin',
  approvalState: 'not_requested',
  requestedCompetition: null,
});
const submitter = managedUser({
  id: '7',
  email: 'analyst@example.com',
  displayName: 'Analyst',
  role: 'submitter',
  approvalState: 'approved',
  requestedCompetition: null,
  competitionScopes: [availableScopes[1]!],
});

function managementResponse(users = [administrator, managedUser(), submitter]) {
  return response(200, { data: { users, availableScopes } });
}

function updatedResponse(user: ReturnType<typeof managedUser>) {
  return response(200, {
    data: {
      ...user,
      submitterAccessUpdatedAt: accessTime,
      submitterAccessUpdatedBy: { id: '1', displayName: 'Administrator' },
    },
  });
}

function renderPage(currentSession: Session | null = session()) {
  render(
    <AuthProvider client={authClient(currentSession)}>
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/sign-in" element={<h1>Sign in</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function openPendingUser() {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Manage pending.contributor@example.com' }),
  );
  return within(screen.getByRole('dialog', { name: 'Pending Contributor' }));
}

describe('administrator user management page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redirects signed-out visitors and rejects non-administrators before listing users', async () => {
    const fetchMock = vi.fn().mockResolvedValue(currentUser('viewer'));
    vi.stubGlobal('fetch', fetchMock);
    renderPage(null);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders loading and then scan-friendly account data returned by the backend API', async () => {
    let resolveUsers!: (value: Response) => void;
    const usersPromise = new Promise<Response>((resolve) => {
      resolveUsers = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(currentUser()).mockReturnValueOnce(usersPromise),
    );
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Loading registered users' }),
    ).toBeInTheDocument();
    resolveUsers(managementResponse());
    const table = within(await screen.findByRole('table'));
    expect(table.getByText('pending.contributor@example.com')).toBeInTheDocument();
    expect(table.getByText('Administrator')).toBeInTheDocument();
    expect(table.getByText('Pending')).toBeInTheDocument();
    expect(table.getByText('University League')).toBeInTheDocument();
  });

  it('searches email and filters independently by role and submitter state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(currentUser()).mockResolvedValueOnce(managementResponse()),
    );
    renderPage();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'analyst@' } });
    expect(screen.getByText('analyst@example.com')).toBeInTheDocument();
    expect(screen.queryByText('pending.contributor@example.com')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'viewer' } });
    expect(screen.getByText('pending.contributor@example.com')).toBeInTheDocument();
    expect(screen.queryByText('analyst@example.com')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Submitter status'), { target: { value: 'approved' } });
    expect(screen.getByText('analyst@example.com')).toBeInTheDocument();
    expect(screen.queryByText('pending.contributor@example.com')).not.toBeInTheDocument();
  });

  it('distinguishes an empty account list from empty filtered results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(currentUser()).mockResolvedValueOnce(managementResponse([])),
    );
    renderPage();
    expect(await screen.findByRole('heading', { name: 'No registered users' })).toBeInTheDocument();
  });

  it('shows no-results guidance and clears active filters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(currentUser()).mockResolvedValueOnce(managementResponse()),
    );
    renderPage();
    fireEvent.change(await screen.findByLabelText('Search users'), {
      target: { value: 'missing@example.com' },
    });
    expect(
      screen.getByRole('heading', { name: 'No users match the current search or filters.' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('pending.contributor@example.com')).toBeInTheDocument();
  });

  it('surfaces API failure and retries through the handwritten backend endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(
        response(500, { error: { code: 'FAILED', message: 'User service unavailable.' } }),
      )
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('User service unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading users' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(fetchMock.mock.calls[3]?.[0]).toContain('/admin/users');
  });

  it('opens a keyboard-accessible management dialog and restores trigger focus', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(currentUser()).mockResolvedValueOnce(managementResponse()),
    );
    renderPage();
    const trigger = await screen.findByRole('button', {
      name: 'Manage pending.contributor@example.com',
    });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Pending Contributor' });
    expect(within(dialog).getAllByText('pending.contributor@example.com')).toHaveLength(2);
    expect(within(dialog).getAllByText('Premier T20')).toHaveLength(2);
    expect(within(dialog).getByRole('button', { name: /close management view/i })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('confirms and approves a pending submitter through the backend API', async () => {
    const approved = managedUser({
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [availableScopes[0]!],
      requestedCompetition: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse())
      .mockResolvedValueOnce(updatedResponse(approved));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const dialog = await openPendingUser();
    fireEvent.click(dialog.getByRole('button', { name: 'Approve submitter' }));
    expect(dialog.getByRole('alertdialog')).toHaveTextContent(
      'Approve pending.contributor@example.com',
    );
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm change' }));
    expect(await dialog.findByText(/now an approved submitter/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/admin/users/42/submitter-access');
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ approved: true, competitionIds: ['7'] }),
    });
  });

  it('confirms rejection and surfaces non-success responses without closing the dialog', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse())
      .mockResolvedValueOnce(
        response(403, {
          error: { code: 'FORBIDDEN', message: 'You are not authorised to reject this request.' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const dialog = await openPendingUser();
    fireEvent.click(dialog.getByRole('button', { name: 'Reject request' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm change' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('not authorised');
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/admin/users/42/submitter-access/rejection');
  });

  it('updates competition scopes and revokes access only after confirmation', async () => {
    const rescoped = managedUser({ ...submitter, competitionScopes: [availableScopes[0]!] });
    const revoked = managedUser({
      ...submitter,
      role: 'viewer',
      approvalState: 'rejected',
      competitionScopes: [],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse())
      .mockResolvedValueOnce(updatedResponse(rescoped))
      .mockResolvedValueOnce(updatedResponse(revoked));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Manage analyst@example.com' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Analyst' }));
    fireEvent.click(dialog.getByRole('checkbox', { name: 'Premier T20' }));
    fireEvent.click(dialog.getByRole('checkbox', { name: 'University League' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Save scope changes' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm change' }));
    await dialog.findByText(/competition scope was updated/i);
    fireEvent.click(dialog.getByRole('button', { name: 'Revoke submitter access' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm change' }));
    expect(await dialog.findByText(/submitter access was revoked/i)).toBeInTheDocument();
  });

  it('promotes a viewer only after explaining and confirming the security-sensitive change', async () => {
    const promoted = managedUser({
      role: 'admin',
      approvalState: 'not_requested',
      requestedCompetition: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse())
      .mockResolvedValueOnce(updatedResponse(promoted));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const dialog = await openPendingUser();
    fireEvent.click(dialog.getByRole('button', { name: 'Promote to Administrator' }));
    expect(dialog.getByRole('alertdialog')).toHaveTextContent('full administrative access');
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm change' }));
    expect(await dialog.findByText(/now an Administrator/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/admin/users/42/role');
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    });
  });

  it('distinguishes and handles a pending additional competition request for a submitter', async () => {
    const requestingSubmitter = managedUser({
      ...submitter,
      requestedCompetition: availableScopes[0]!,
      competitionScopes: [availableScopes[1]!],
    });
    const approved = managedUser({
      ...requestingSubmitter,
      requestedCompetition: null,
      competitionScopes: [availableScopes[0]!, availableScopes[1]!],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(
        managementResponse([administrator, managedUser(), requestingSubmitter]),
      )
      .mockResolvedValueOnce(updatedResponse(approved));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Manage analyst@example.com' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Analyst' }));
    expect(dialog.getByText('Pending additional scope request')).toBeInTheDocument();
    expect(dialog.getAllByText('Premier T20').length).toBeGreaterThan(0);
    expect(dialog.getByRole('button', { name: 'Approve additional scope' })).toBeEnabled();
    expect(dialog.getByRole('button', { name: 'Reject scope request' })).toBeEnabled();

    fireEvent.click(dialog.getByRole('button', { name: 'Approve additional scope' }));
    expect(dialog.getByRole('alertdialog')).toHaveTextContent('Approve analyst@example.com');
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm change' }));
    await dialog.findByText(/competition scope was updated/i);
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ approved: true, competitionIds: ['8', '7'] }),
    });
  });
});
