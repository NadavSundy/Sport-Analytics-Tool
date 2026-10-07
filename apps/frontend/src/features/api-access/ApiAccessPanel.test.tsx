import type { AuthChangeEvent, Session, User } from '@supabase/auth-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { ApiAccessPanel } from './ApiAccessPanel';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
const response = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;
const session = (): Session => ({
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'user@example.com',
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
        data: { subscription: { id: 'api-access', callback: _listener, unsubscribe: vi.fn() } },
      }),
    ),
    signOut: vi.fn(),
  }) as unknown as AuthClient;
const requestRecord = (state: 'pending' | 'approved' | 'rejected') => ({
  id: '4',
  requesterAccountId: '11',
  name: 'Match model',
  intendedUse: 'Research match predictions.',
  state,
  createdAt: '2026-10-04T10:00:00.000Z',
  reviewedAt: state === 'pending' ? null : '2026-10-04T11:00:00.000Z',
  reviewedBy: state === 'pending' ? null : { id: '1', displayName: 'Admin' },
  reviewReason: state === 'rejected' ? 'Insufficient detail.' : null,
});
const consumer = {
  id: '7',
  name: 'Match model',
  rateLimitPerMinute: 30,
  dailyQuota: 2000,
  createdAt: '2026-10-04T11:00:00.000Z',
  keys: [],
};

function renderPanel() {
  return render(
    <AuthProvider client={auth()}>
      <ApiAccessPanel />
    </AuthProvider>,
  );
}

describe('account API access', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('requests access and shows pending state', async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? response(201, { data: requestRecord('pending') })
          : response(200, { data: { request: null, consumer: null } }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const name = await screen.findByLabelText(/^Consumer or application name/);
    const intendedUse = screen.getByLabelText(/^Intended use/);
    expect(screen.getByRole('form', { name: 'API access request' })).toBeInTheDocument();
    expect(name).toHaveAccessibleDescription(/identif.*the application consuming the API/i);
    expect(intendedUse).toHaveAccessibleDescription(/how the application will use/i);
    expect(intendedUse).toHaveAttribute('rows', '6');
    fireEvent.change(name, {
      target: { value: 'Match model' },
    });
    fireEvent.change(intendedUse, {
      target: { value: 'Research match predictions.' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Request API access' }));
    expect(await screen.findByText(/awaiting administrator review/i)).toBeInTheDocument();
  });

  test('shows rejection and allows a new request', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(200, { data: { request: requestRecord('rejected'), consumer: null } }),
        ),
    );
    renderPanel();
    expect(await screen.findByText(/Insufficient detail/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit a new request' }));
    expect(screen.getByRole('button', { name: 'Request API access' })).toBeInTheDocument();
  });

  test('generates a one-time key, clears it on dismissal, and never uses browser storage', async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? response(201, {
              data: {
                ...consumer,
                keys: [
                  {
                    id: '8',
                    prefix: 'sat_live_example',
                    createdAt: '2026-10-04T12:00:00.000Z',
                    revokedAt: null,
                  },
                ],
                apiKey: 'sat_live_one_time_secret',
              },
            })
          : response(200, { data: { request: requestRecord('approved'), consumer } }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: copy },
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Generate API key' }));
    expect(await screen.findByText('sat_live_one_time_secret')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy API key' }));
    expect(copy).toHaveBeenCalledWith('sat_live_one_time_secret');
    expect(await screen.findByRole('status')).toHaveTextContent('API key copied');
    fireEvent.click(screen.getByRole('button', { name: 'I have saved the key' }));
    await waitFor(() =>
      expect(screen.queryByText('sat_live_one_time_secret')).not.toBeInTheDocument(),
    );
    expect(storage).not.toHaveBeenCalled();
  });

  test('loads the approved owner usage for a selected UTC date range', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/usage?')) {
        return Promise.resolve(
          response(200, {
            data: {
              consumer: {
                id: consumer.id,
                name: consumer.name,
                rateLimitPerMinute: consumer.rateLimitPerMinute,
                dailyQuota: consumer.dailyQuota,
              },
              from: '2026-10-01',
              to: '2026-10-05',
              totalRequests: 27,
              entries: [],
            },
          }),
        );
      }
      return Promise.resolve(
        response(200, { data: { request: requestRecord('approved'), consumer } }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();

    fireEvent.change(await screen.findByLabelText('From date (UTC)'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByLabelText('To date (UTC)'), {
      target: { value: '2026-10-05' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'View API usage' }));

    expect(await screen.findByText('Requests in period: 27')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('from=2026-10-01&to=2026-10-05'),
      expect.anything(),
    );
  });
});
