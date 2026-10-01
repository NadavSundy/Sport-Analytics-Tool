import type { AuthChangeEvent, Session, User } from '@supabase/auth-js';
import type { ApiConsumer } from '@sport-analytics/contracts';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { AdminApiConsumersPage } from './AdminApiConsumersPage';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
const testApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const createdAt = '2026-09-27T08:30:00.000Z';
const rawKey = 'sat_live_test-secret-that-is-only-shown-once';

function session(): Session {
  const user = {
    id: 'admin-subject',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: createdAt,
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

function response(status: number, body?: unknown): Response {
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

function consumer(overrides: Partial<ApiConsumer> = {}): ApiConsumer {
  return {
    id: '12',
    name: 'Partner dashboard',
    rateLimitPerMinute: 60,
    dailyQuota: 10_000,
    createdAt,
    keys: [{ id: '33', prefix: 'sat_live_test-sa', createdAt, revokedAt: null }],
    ...overrides,
  };
}

function listResponse(consumers: ApiConsumer[] = [consumer()]) {
  return response(200, { data: { consumers } });
}

function usageResponse(
  entries: Array<{
    date: string;
    endpoint: string;
    statusClass: '2xx' | '3xx' | '4xx' | '5xx';
    requestCount: number;
  }> = [
    {
      date: '2026-09-26',
      endpoint: 'GET /consumer/fixtures/:fixtureId/events',
      statusClass: '2xx',
      requestCount: 8,
    },
  ],
) {
  return response(200, {
    data: {
      consumer: {
        id: '12',
        name: 'Partner dashboard',
        rateLimitPerMinute: 60,
        dailyQuota: 10_000,
      },
      from: '2026-09-20',
      to: '2026-09-26',
      totalRequests: entries.reduce((total, entry) => total + entry.requestCount, 0),
      entries,
    },
  });
}

function renderPage(path = '/admin/api-consumers', currentSession: Session | null = session()) {
  render(
    <AuthProvider client={authClient(currentSession)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/api-consumers" element={<AdminApiConsumersPage />} />
          <Route path="/admin/api-consumers/:consumerId" element={<AdminApiConsumersPage />} />
          <Route path="/sign-in" element={<h1>Sign in</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('administrator API consumer management', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redirects signed-out visitors and denies non-administrators before loading consumers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(currentUser('viewer'));
    vi.stubGlobal('fetch', fetchMock);
    await act(async () => renderPage('/admin/api-consumers', null));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    cleanup();
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Administrator access required' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('renders safe list metadata and an empty state without rendering secret fields', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const table = within(await screen.findByRole('table'));
    expect(table.getByText('Partner dashboard')).toBeInTheDocument();
    expect(table.getByText('Active key')).toBeInTheDocument();
    expect(table.getByText(/10.000\/UTC day/)).toBeInTheDocument();
    expect(screen.queryByText(rawKey)).not.toBeInTheDocument();

    cleanup();
    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(currentUser()).mockResolvedValueOnce(listResponse([])),
    );
    renderPage();
    expect(await screen.findByRole('heading', { name: 'No API consumers' })).toBeInTheDocument();
  });

  it('surfaces a list failure and retries the authenticated backend request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(
        response(500, { error: { code: 'FAILED', message: 'Consumer service unavailable.' } }),
      )
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Consumer service unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading API consumers' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('validates create fields and presents backend validation without losing entered values', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(
        response(422, {
          error: { code: 'VALIDATION_FAILED', message: 'The API consumer request is invalid.' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByRole('heading', { name: 'No API consumers' });
    fireEvent.change(screen.getByLabelText('Consumer name'), { target: { value: ' ' } });
    fireEvent.change(screen.getByLabelText('Rate limit (requests per minute)'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create consumer' }));
    expect(screen.getByText('Enter a consumer name.')).toBeInTheDocument();
    expect(screen.getByText('Enter 1 to 10,000 requests per minute.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByLabelText('Consumer name'), {
      target: { value: 'Mobile scorer' },
    });
    fireEvent.change(screen.getByLabelText('Rate limit (requests per minute)'), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create consumer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('request is invalid');
    expect(screen.getByLabelText('Consumer name')).toHaveValue('Mobile scorer');
  });

  it('creates a consumer, copies its one-time key, and discards it on dismissal', async () => {
    const created = consumer({ id: '13', name: 'Mobile scorer' });
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new Error('clipboard unavailable'))
      .mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(response(201, { data: { ...created, apiKey: rawKey } }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByRole('heading', { name: 'No API consumers' });
    fireEvent.change(screen.getByLabelText('Consumer name'), {
      target: { value: 'Mobile scorer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create consumer' }));
    const dialog = await screen.findByRole('dialog', { name: 'API key created' });
    expect(within(dialog).getByLabelText('New API key')).toHaveTextContent(rawKey);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy API key' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('could not be copied');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy API key' }));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('API key copied');
    expect(writeText).toHaveBeenCalledWith(rawKey);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dismiss key' }));
    expect(screen.queryByText(rawKey)).not.toBeInTheDocument();
    expect(await screen.findByText('Mobile scorer')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create consumer' })).toHaveFocus(),
    );
  });

  it('confirms rotation, shows only the replacement once, and preserves errors for retry', async () => {
    const rotated = consumer({
      keys: [
        { id: '33', prefix: 'sat_live_test-sa', createdAt, revokedAt: createdAt },
        { id: '34', prefix: 'sat_live_replace', createdAt, revokedAt: null },
      ],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(usageResponse())
      .mockResolvedValueOnce(
        response(503, { error: { code: 'FAILED', message: 'Rotation is unavailable.' } }),
      )
      .mockResolvedValueOnce(response(200, { data: { ...rotated, apiKey: rawKey } }))
      .mockResolvedValueOnce(usageResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage('/admin/api-consumers/12');
    const rotate = await screen.findByRole('button', { name: 'Rotate key' });
    fireEvent.click(rotate);
    expect(screen.getByRole('dialog', { name: 'Rotate API key?' })).toHaveTextContent(
      'stop every previous active key',
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Rotate API key?' })).getByRole('button', {
        name: 'Rotate key',
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Rotation is unavailable.');
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Rotate API key?' })).getByRole('button', {
        name: 'Rotate key',
      }),
    );
    expect(await screen.findByRole('dialog', { name: 'API key rotated' })).toHaveTextContent(
      rawKey,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss key' }));
    expect(screen.queryByText(rawKey)).not.toBeInTheDocument();
    expect(screen.getByText('sat_live_replace')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rotate key' })).toHaveFocus());
  });

  it('confirms key revocation, reports failure, and refreshes safe key state after success', async () => {
    const revoked = consumer({
      keys: [{ id: '33', prefix: 'sat_live_test-sa', createdAt, revokedAt: createdAt }],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(usageResponse())
      .mockResolvedValueOnce(
        response(500, { error: { code: 'FAILED', message: 'Revocation failed.' } }),
      )
      .mockResolvedValueOnce(response(204))
      .mockResolvedValueOnce(listResponse([revoked]))
      .mockResolvedValueOnce(usageResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage('/admin/api-consumers/12');
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke key sat_live_test-sa' }));
    expect(screen.getByRole('dialog', { name: 'Revoke API key?' })).toHaveTextContent(
      'immediately stop',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revoke key' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revocation failed.');
    fireEvent.click(screen.getByRole('button', { name: 'Revoke key' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Revoke API key?' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('status')).toHaveTextContent('API key sat_live_test-sa was revoked.');
    expect(screen.getByText('Revoked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revoke key sat_live/ })).not.toBeInTheDocument();
  });

  it('loads selected-consumer usage, interprets status/counts, and never renders secrets', async () => {
    let resolveUsage: ((value: Response) => void) | undefined;
    const pendingUsage = new Promise<Response>((resolve) => {
      resolveUsage = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse())
      .mockReturnValueOnce(pendingUsage);
    vi.stubGlobal('fetch', fetchMock);
    renderPage('/admin/api-consumers/12');

    expect(await screen.findByRole('heading', { name: 'Loading usage' })).toBeInTheDocument();
    resolveUsage?.(usageResponse());
    const usageTable = within(await screen.findByRole('table', { name: /Aggregated usage/ }));
    expect(usageTable.getByText('GET /consumer/fixtures/:fixtureId/events')).toBeInTheDocument();
    expect(usageTable.getByText('2xx')).toBeInTheDocument();
    expect(usageTable.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2026-09-20 to 2026-09-26 UTC')).toBeInTheDocument();
    expect(screen.queryByText(rawKey)).not.toBeInTheDocument();
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(rawKey);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `${testApiBaseUrl}/admin/api-consumers/12/usage?limit=100`,
    );
  });

  it('distinguishes empty usage, validates the date window, and requests an explicit UTC period', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(usageResponse([]))
      .mockResolvedValueOnce(usageResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage('/admin/api-consumers/12');

    expect(
      await screen.findByRole('heading', { name: 'No usage exists in this period' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('From date (UTC)'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText('To date (UTC)'), {
      target: { value: '2026-09-26' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply period' }));
    expect(screen.getByRole('alert')).toHaveTextContent('no more than 31 UTC dates');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fireEvent.change(screen.getByLabelText('From date (UTC)'), {
      target: { value: '2026-09-20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply period' }));
    expect(await screen.findByRole('table', { name: /Aggregated usage/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls[3]?.[0]).toContain(
      '/admin/api-consumers/12/usage?from=2026-09-20&to=2026-09-26&limit=100',
    );
  });

  it('shows a usage failure separately and retries the same selected consumer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(
        response(503, { error: { code: 'FAILED', message: 'Usage service unavailable.' } }),
      )
      .mockResolvedValueOnce(usageResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage('/admin/api-consumers/12');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Usage could not be loaded');
    expect(alert).toHaveTextContent('Usage service unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading usage' }));
    expect(await screen.findByRole('table', { name: /Aggregated usage/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      `${testApiBaseUrl}/admin/api-consumers/12/usage?limit=100`,
    );
  });
});
