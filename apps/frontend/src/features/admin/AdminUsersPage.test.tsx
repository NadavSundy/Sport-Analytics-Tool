import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { AdminUsersPage } from './AdminUsersPage';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];

function session(): Session {
  const user = {
    id: 'admin-subject',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-08-16T00:00:00.000Z',
  } satisfies User;

  return {
    access_token: 'admin-access-token',
    refresh_token: 'managed-by-supabase',
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
        data: {
          subscription: {
            id: 'admin-test-subscription',
            callback: _listener,
            unsubscribe: vi.fn(),
          },
        },
      }),
    ),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  } as unknown as AuthClient;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function currentUser(role: 'viewer' | 'admin' = 'admin') {
  return jsonResponse(200, {
    user: {
      id: role === 'admin' ? '1' : '42',
      subject: role === 'admin' ? 'admin-subject' : 'viewer-subject',
      displayName: role === 'admin' ? 'Administrator' : 'Viewer',
      role,
      approvalState: 'not_requested',
      competitionIds: [],
    },
  });
}

const accessTime = '2026-08-16T12:00:00.000Z';

function managedUser(
  overrides: Partial<{
    role: 'viewer' | 'submitter' | 'admin';
    approvalState: 'not_requested' | 'pending' | 'approved' | 'rejected';
    competitionScopes: { competitionId: string; name: string }[];
  }> = {},
) {
  return {
    id: '42',
    displayName: 'Pending Contributor',
    role: 'viewer' as const,
    approvalState: 'pending' as const,
    competitionScopes: [],
    disabled: false,
    updatedAt: accessTime,
    submitterAccessUpdatedAt: null,
    submitterAccessUpdatedBy: null,
    ...overrides,
  };
}

const availableScopes = [
  { competitionId: '7', name: 'Premier T20' },
  { competitionId: '8', name: 'University League' },
];

function managementResponse(user = managedUser()) {
  return jsonResponse(200, {
    data: {
      users: [user],
      availableScopes,
    },
  });
}

function updateResponse(user: ReturnType<typeof managedUser>) {
  return jsonResponse(200, {
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

async function userCard(): Promise<HTMLElement> {
  const heading = await screen.findByRole('heading', { name: 'Pending Contributor' });
  const card = heading.closest('article');

  if (!card) {
    throw new Error('Expected the managed user heading to be inside an article.');
  }

  return card;
}

describe('administrator user management page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redirects signed-out visitors to sign in', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderPage(null);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not request the user list for a non-administrator', async () => {
    const fetchMock = vi.fn().mockResolvedValue(currentUser('viewer'));
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Administrator access required' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/auth/me');
  });

  it('shows each user role, approval state, and current competition scope', async () => {
    const submitter = managedUser({
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [availableScopes[0]!],
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser())
        .mockResolvedValueOnce(managementResponse(submitter)),
    );

    renderPage();

    const card = within(await screen.findByRole('article'));
    expect(card.getAllByText('Submitter').length).toBeGreaterThan(0);
    expect(card.getByText('Approved')).toBeInTheDocument();
    expect(card.getAllByText('Premier T20').length).toBeGreaterThan(0);
    expect(card.getByRole('button', { name: 'Revoke submitter access' })).toBeEnabled();
  });

  it('does not offer approval or scope controls before a submitter request is made', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser())
        .mockResolvedValueOnce(managementResponse(managedUser({ approvalState: 'not_requested' }))),
    );

    renderPage();

    const card = within(await userCard());
    expect(card.getByText('No submitter access request has been made.')).toBeInTheDocument();
    expect(card.queryByRole('button', { name: 'Approve submitter' })).not.toBeInTheDocument();
    expect(card.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('does not treat a rejected request as pending approval', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(currentUser())
        .mockResolvedValueOnce(managementResponse(managedUser({ approvalState: 'rejected' }))),
    );

    renderPage();

    const card = within(await userCard());
    expect(
      card.getByText(
        'This request was rejected. The user must make a new request before approval.',
      ),
    ).toBeInTheDocument();
    expect(card.queryByRole('button', { name: 'Approve submitter' })).not.toBeInTheDocument();
    expect(card.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('approves a pending user with a selected scope and updates the card immediately', async () => {
    const approved = managedUser({
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [availableScopes[0]!],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse())
      .mockResolvedValueOnce(updateResponse(approved));
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    const card = within(await userCard());
    fireEvent.click(card.getByRole('checkbox', { name: 'Premier T20' }));
    fireEvent.click(card.getByRole('button', { name: 'Approve submitter' }));

    expect(
      await screen.findByText('Pending Contributor is now an approved submitter.'),
    ).toHaveAttribute('role', 'status');
    expect(
      within(await userCard()).getByRole('button', { name: 'Revoke submitter access' }),
    ).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/admin/users/42/submitter-access');
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ approved: true, competitionIds: ['7'] }),
    });
  });

  it('allows an administrator to reject a pending request', async () => {
    const rejected = managedUser({ approvalState: 'rejected' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse())
      .mockResolvedValueOnce(updateResponse(rejected));
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    fireEvent.click(within(await userCard()).getByRole('button', { name: 'Reject request' }));

    expect(
      await screen.findByText('Submitter request was rejected for Pending Contributor.'),
    ).toBeInTheDocument();
    expect(within(await userCard()).queryByRole('button')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ approved: false, competitionIds: [] }),
    });
  });

  it('updates an approved submitter to a different scope', async () => {
    const existing = managedUser({
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [availableScopes[0]!],
    });
    const updated = managedUser({
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [availableScopes[1]!],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse(existing))
      .mockResolvedValueOnce(updateResponse(updated));
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    const card = within(await userCard());
    fireEvent.click(card.getByRole('checkbox', { name: 'Premier T20' }));
    fireEvent.click(card.getByRole('checkbox', { name: 'University League' }));
    fireEvent.click(card.getByRole('button', { name: 'Save scope changes' }));

    expect(
      await screen.findByText('Competition scope was updated for Pending Contributor.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      body: JSON.stringify({ approved: true, competitionIds: ['8'] }),
    });
  });

  it('revokes a submitter and removes the effective scope immediately', async () => {
    const existing = managedUser({
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [availableScopes[0]!],
    });
    const revoked = managedUser({ approvalState: 'rejected', competitionScopes: [] });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse(existing))
      .mockResolvedValueOnce(updateResponse(revoked));
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    fireEvent.click(
      within(await userCard()).getByRole('button', { name: 'Revoke submitter access' }),
    );

    expect(
      await screen.findByText('Submitter access was revoked for Pending Contributor.'),
    ).toBeInTheDocument();
    expect(
      within(await userCard()).getByText(
        'This request was rejected. The user must make a new request before approval.',
      ),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      body: JSON.stringify({ approved: false, competitionIds: [] }),
    });
  });

  it('keeps controls usable after client or API validation errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(managementResponse())
      .mockResolvedValueOnce(
        jsonResponse(422, {
          error: {
            code: 'INVALID_COMPETITION_SCOPE',
            message: 'Competition scope 7 does not exist.',
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    const card = within(await userCard());
    fireEvent.click(card.getByRole('button', { name: 'Approve submitter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select at least one competition scope.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.click(card.getByRole('checkbox', { name: 'Premier T20' }));
    fireEvent.click(card.getByRole('button', { name: 'Approve submitter' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Competition scope 7 does not exist.'),
    );
    expect(card.getByRole('button', { name: 'Approve submitter' })).toBeEnabled();
  });
});
