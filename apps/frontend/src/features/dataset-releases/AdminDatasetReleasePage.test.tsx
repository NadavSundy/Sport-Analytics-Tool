import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { AdminDatasetReleasePage } from './AdminDatasetReleasePage';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];

const release = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.2',
  createdAt: '2026-09-10T10:00:00.000Z',
  snapshotId: '1e3af729-8ced-4f49-ae61-7f0d74eab8f8',
  snapshotAsOf: '2026-09-10T10:00:00.000Z',
  formatVersion: '1.0',
  scope: 'published-accepted-deliveries',
  eventCount: 1234,
  checksum: 'a'.repeat(64),
  fields: [{ name: 'eventId', description: 'Stable event identifier.' }],
};

function session(): Session {
  const user = {
    id: 'admin-subject',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: release.createdAt,
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

function renderPage(currentSession: Session | null = session()) {
  return render(
    <AuthProvider client={authClient(currentSession)}>
      <MemoryRouter initialEntries={['/admin/dataset-releases/new']}>
        <Routes>
          <Route path="/admin/dataset-releases/new" element={<AdminDatasetReleasePage />} />
          <Route path="/sign-in" element={<h1>Sign in</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('administrator dataset release page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redirects signed-out visitors and denies non-administrators before showing the form', async () => {
    const signedOutFetch = vi.fn();
    vi.stubGlobal('fetch', signedOutFetch);
    renderPage(null);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(signedOutFetch).not.toHaveBeenCalled();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUser('viewer')));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Administrator access required');
    expect(screen.queryByRole('textbox', { name: 'Release version' })).not.toBeInTheDocument();
  });

  it('validates the version with the shared release contract and focuses actionable feedback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(currentUser()));
    renderPage();
    const input = await screen.findByRole('textbox', { name: 'Release version' });
    fireEvent.change(input, { target: { value: 'bad version' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate and publish snapshot' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveFocus();
    expect(alert).toHaveTextContent('Use 1–64 letters, numbers, dots, underscores, or hyphens');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('prevents duplicate submission and presents the published release metadata and links', async () => {
    let resolveRelease!: (value: Response) => void;
    const releaseRequest = new Promise<Response>((resolve) => {
      resolveRelease = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockReturnValueOnce(releaseRequest);
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const input = await screen.findByRole('textbox', { name: 'Release version' });
    fireEvent.change(input, { target: { value: ' 2026.09.2 ' } });
    const submit = screen.getByRole('button', { name: 'Generate and publish snapshot' });
    fireEvent.click(submit);
    expect(screen.getByRole('button', { name: 'Queueing release…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Queueing release…' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveRelease(response(200, { data: release }));
    const status = await screen.findByRole('status');
    expect(status).toHaveFocus();
    expect(within(status).getByRole('heading', { name: 'Dataset 2026.09.2' })).toBeInTheDocument();
    expect(within(status).getByText('1 234')).toBeInTheDocument();
    expect(within(status).getByText('a'.repeat(64))).toBeInTheDocument();
    expect(within(status).getByRole('link', { name: 'View public release' })).toHaveAttribute(
      'href',
      '/dataset-releases/2026.09.2',
    );
    expect(within(status).getByRole('link', { name: 'Browse release catalogue' })).toHaveAttribute(
      'href',
      '/dataset-releases',
    );

    const [, request] = fetchMock.mock.calls[1]!;
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/admin/dataset-releases');
    expect(request).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ version: '2026.09.2' }),
    });
    expect((request?.headers as Headers).get('Authorization')).toBe('Bearer admin-access-token');
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows durable job progress and polls until the release is complete', async () => {
    const pending = {
      jobId: '11111111-1111-4111-8111-111111111111',
      version: release.version,
      status: 'pending',
      eventsProcessed: 0,
      bytesWritten: 0,
      pageNumber: 0,
      createdAt: release.createdAt,
      startedAt: null,
      completedAt: null,
      failureCode: null,
      failureMessage: null,
      release: null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(response(202, { data: pending }))
      .mockResolvedValueOnce(
        response(200, {
          data: {
            ...pending,
            status: 'generating',
            eventsProcessed: 1000,
            bytesWritten: 4000,
            pageNumber: 1,
            startedAt: release.createdAt,
          },
        }),
      )
      .mockResolvedValueOnce(
        response(200, {
          data: {
            ...pending,
            status: 'completed',
            eventsProcessed: 1234,
            bytesWritten: 5000,
            pageNumber: 1,
            completedAt: release.createdAt,
            release,
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const input = await screen.findByRole('textbox', { name: 'Release version' });
    fireEvent.change(input, { target: { value: release.version } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate and publish snapshot' }));
    expect(
      await screen.findByText(
        'The worker is creating the immutable artifact. You can leave this page safely.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate and publish snapshot' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Generate and publish snapshot' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('1 000', {}, { timeout: 2500 })).toBeInTheDocument();
    expect(screen.getByText('4 000')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'View public release' }, { timeout: 3500 }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls[3]?.[0]).toContain(
        `/admin/dataset-release-jobs/${pending.jobId}`,
      ),
    );
  });

  it('stops polling on failure and shows the safe worker failure message', async () => {
    const generating = {
      jobId: '11111111-1111-4111-8111-111111111111',
      version: release.version,
      status: 'generating',
      eventsProcessed: 10000,
      bytesWritten: 42000,
      pageNumber: 1,
      createdAt: release.createdAt,
      startedAt: release.createdAt,
      completedAt: null,
      failureCode: null,
      failureMessage: null,
      release: null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(response(202, { data: generating }))
      .mockResolvedValueOnce(
        response(200, {
          data: {
            ...generating,
            status: 'failed',
            failureCode: 'GenerationFailed',
            failureMessage: 'Dataset release generation failed and can be retried.',
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Release version' }), {
      target: { value: release.version },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate and publish snapshot' }));

    expect(await screen.findByRole('alert', {}, { timeout: 2500 })).toHaveTextContent(
      'Dataset release generation failed and can be retried.',
    );
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('button', { name: 'Generate and publish snapshot' })).toBeEnabled();
  });

  it('cancels pending polling when the page unmounts', async () => {
    const pending = {
      jobId: '11111111-1111-4111-8111-111111111111',
      version: release.version,
      status: 'pending',
      eventsProcessed: 0,
      bytesWritten: 0,
      pageNumber: 0,
      createdAt: release.createdAt,
      startedAt: null,
      completedAt: null,
      failureCode: null,
      failureMessage: null,
      release: null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(response(202, { data: pending }));
    vi.stubGlobal('fetch', fetchMock);
    const page = renderPage();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Release version' }), {
      target: { value: release.version },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate and publish snapshot' }));
    await screen.findByText(/worker is creating the immutable artifact/i);
    page.unmount();

    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('preserves the entered version and surfaces API and unexpected-response failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(currentUser())
      .mockResolvedValueOnce(
        response(403, { error: { code: 'FORBIDDEN', message: 'Release permission was revoked.' } }),
      )
      .mockResolvedValueOnce(response(202, { data: { version: 'malformed' } }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const input = await screen.findByRole('textbox', { name: 'Release version' });
    fireEvent.change(input, { target: { value: '2026.09.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate and publish snapshot' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your signed-in account is not authorised to publish dataset releases.',
    );
    expect(input).toHaveValue('2026.09.2');

    fireEvent.click(screen.getByRole('button', { name: 'Generate and publish snapshot' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('unexpected dataset release response'),
    );
    expect(input).toHaveValue('2026.09.2');
  });
});
