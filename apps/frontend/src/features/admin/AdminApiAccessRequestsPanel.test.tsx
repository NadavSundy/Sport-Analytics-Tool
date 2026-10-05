import type { AuthChangeEvent, Session, User } from '@supabase/auth-js';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { AdminApiAccessRequestsPanel } from './AdminApiAccessRequestsPanel';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];

const session = (): Session => ({
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'admin-subject',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-10-04T00:00:00.000Z',
  } satisfies User,
});

const auth = () =>
  ({
    getSession: vi.fn().mockResolvedValue({ data: { session: session() } }),
    onAuthStateChange: vi.fn(
      (_listener: (event: AuthChangeEvent, session: Session | null) => void) => ({
        data: {
          subscription: { id: 'admin-api-access', callback: _listener, unsubscribe: vi.fn() },
        },
      }),
    ),
    signOut: vi.fn(),
  }) as unknown as AuthClient;

const response = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;

const pending = {
  id: '9',
  requesterAccountId: '67',
  name: 'Dev Testing',
  intendedUse: 'Used to test if feature works.',
  state: 'pending',
  createdAt: '2026-10-04T10:00:00.000Z',
  reviewedAt: null,
  reviewedBy: null,
  reviewReason: null,
  requester: {
    displayName: 'Dev User',
    email: 'dev.user@example.com',
  },
};

function renderPanel() {
  return render(
    <AuthProvider client={auth()}>
      <AdminApiAccessRequestsPanel />
    </AuthProvider>,
  );
}

describe('administrator API access request review', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('groups a pending request into a labelled review card with accessible capacity fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(200, { data: { requests: [pending] } })),
    );
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Review pending requests' }));

    const card = await screen.findByRole('group', { name: 'Dev Testing' });
    expect(within(card).getByText('Dev User')).toBeInTheDocument();
    expect(within(card).getByText('dev.user@example.com')).toBeInTheDocument();
    expect(within(card).queryByText(/Requested by account/)).not.toBeInTheDocument();
    expect(within(card).getByRole('group', { name: 'Capacity' })).toBeInTheDocument();
    expect(within(card).getByLabelText(/^Requests per minute/)).toHaveValue(60);
    expect(within(card).getByLabelText(/^Requests per UTC day/)).toHaveValue(10000);
    expect(within(card).getByLabelText('Review reason (optional)')).toHaveAccessibleDescription(
      /recorded with the review decision/i,
    );
    expect(within(card).getByRole('button', { name: 'Approve request' })).toHaveClass(
      'ui-button--primary',
    );
    expect(within(card).getByRole('button', { name: 'Reject request' })).toHaveClass(
      'api-access-review__reject',
    );
  });

  it('requires keyboard-dismissible confirmation before rejecting a request', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'PATCH'
        ? response(200, {
            data: {
              id: pending.id,
              requesterAccountId: pending.requesterAccountId,
              name: pending.name,
              intendedUse: pending.intendedUse,
              state: 'rejected',
              createdAt: pending.createdAt,
              reviewedAt: '2026-10-04T11:00:00.000Z',
              reviewedBy: { id: '1', displayName: 'Admin' },
              reviewReason: null,
            },
          })
        : response(200, { data: { requests: [pending] } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Review pending requests' }));
    const reject = await screen.findByRole('button', { name: 'Reject request' });
    fireEvent.click(reject);

    const confirmation = screen.getByRole('alertdialog', { name: 'Reject API access request?' });
    expect(within(confirmation).getByRole('button', { name: 'Confirm rejection' })).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(confirmation, { key: 'Escape' });
    await waitFor(() => expect(reject).toHaveFocus());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    fireEvent.click(reject);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    await waitFor(() => expect(screen.queryByText('Dev Testing')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
