import type { CurrentUserProfile } from '@sport-analytics/contracts';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { PublicApp } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';
import { BatchUploadWorkflow, type PackageUploadScope } from './BatchUploadPage';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

const batchReference = '123e4567-e89b-42d3-a456-426614174000';
const submitterProfile = {
  id: '17',
  subject: 'submitter-user',
  displayName: 'Submitter User',
  role: 'submitter' as const,
  approvalState: 'approved' as const,
  requestedCompetition: null,
  competitionIds: ['5'],
};

function session(): Session {
  const user = {
    id: 'submitter-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'submitter@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-09-08T00:00:00.000Z',
  } satisfies User;
  return {
    access_token: 'batch-access-token',
    refresh_token: 'managed',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

function authClient(activeSession: Session | null = session()) {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: activeSession } }),
    onAuthStateChange: vi.fn((listener: AuthStateListener) => ({
      data: {
        subscription: { id: 'batch-upload-test', callback: listener, unsubscribe: vi.fn() },
      },
    })),
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

function renderUpload(
  scope: PackageUploadScope = 'season',
  profile: CurrentUserProfile = submitterProfile,
) {
  return render(
    <AuthProvider client={authClient()}>
      <MemoryRouter>
        <BatchUploadWorkflow profile={profile} scope={scope} />
      </MemoryRouter>
    </AuthProvider>,
  );
}

function renderLegacyRoute(activeSession: Session | null = session()) {
  return render(
    <AuthProvider client={authClient(activeSession)}>
      <MemoryRouter initialEntries={['/submissions/batches/new']}>
        <PublicApp />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('guided batch upload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('redirects signed-out visitors without loading upload data', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderLegacyRoute(null);
    expect(await screen.findByRole('heading', { name: 'Login or Sign up' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('explains the contract and creates a durable batch receipt from readable choices', async () => {
    let finishUpload!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          response(200, {
            user: {
              id: '17',
              subject: 'submitter-user',
              displayName: 'Submitter User',
              role: 'submitter',
              approvalState: 'approved',
              requestedCompetition: null,
              competitionIds: ['5'],
            },
          }),
        );
      }
      if (url.endsWith('/competitions/5')) {
        return Promise.resolve(
          response(200, { data: { competitionId: '5', name: 'Premier T20' } }),
        );
      }
      if (url.endsWith('/batches') && init?.method === 'POST') {
        return new Promise<Response>((resolve) => {
          finishUpload = resolve;
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderUpload();

    expect(await screen.findByText(/JSON, CSV spreadsheet, or NDJSON/)).toBeInTheDocument();
    expect(screen.getByText(/50,000 delivery events/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download JSON template' })).toHaveAttribute(
      'download',
    );
    expect(screen.getByRole('link', { name: 'Download spreadsheet template' })).toHaveAttribute(
      'download',
    );
    expect(await screen.findByLabelText('Competition')).toHaveDisplayValue('Premier T20');
    if (false) {
      const season = await screen.findByLabelText('Season context');
      await waitFor(() =>
        expect(
          within(season).getByRole('option', { name: '2026/27 — Premier T20' }),
        ).toBeInTheDocument(),
      );
    }

    const fileBytes = '{"contractVersion":"1.0"}';
    // The package-authoritative path below constructs the selected file.
    expect(screen.queryByLabelText('Season context')).not.toBeInTheDocument();
    expect(
      screen.getByText(/season name and reference inside the package are authoritative/i),
    ).toBeInTheDocument();
    const file = new File(['{"contractVersion":"1.0"}'], 'season.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode(fileBytes).buffer,
    });
    fireEvent.change(screen.getByLabelText('Season package'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload season package' }));
    expect(screen.getByRole('progressbar', { name: 'Upload progress' })).toBeInTheDocument();

    await waitFor(() => expect(finishUpload).toEqual(expect.any(Function)));
    await act(async () => {
      finishUpload(
        response(202, {
          data: {
            batchReference,
            status: 'stored',
            statusUrl: `/api/v1/batches/${batchReference}`,
            receivedAt: '2026-09-08T09:30:00.000Z',
          },
        }),
      );
    });

    expect(await screen.findByRole('heading', { name: 'Season received safely' })).toHaveFocus();
    expect(screen.getByText(batchReference)).toBeInTheDocument();
    expect(screen.getByText(/Processing continues after you leave/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Track validation and errors' })).toHaveAttribute(
      'href',
      `/submissions/batches/${batchReference}`,
    );

    const uploadCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/batches'))!;
    const headers = new Headers((uploadCall[1] as RequestInit).headers);
    expect(headers.get('Authorization')).toBe('Bearer batch-access-token');
    expect(headers.get('X-Competition-Id')).toBe('5');
    expect(headers.get('X-Batch-Package-Version')).toBe('1.0');
    expect(headers.get('X-File-Name')).toBe('season.json');
    expect((uploadCall[1] as RequestInit).body).toBe(file);
  });

  test('covers an empty scope without exposing ID inputs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderUpload('season', { ...submitterProfile, competitionIds: [] });
    expect(
      await screen.findByRole('heading', { name: 'No authorised competitions' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/ID/i)).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  test('does not load known seasons because package context is authoritative', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          response(200, {
            user: {
              id: '17',
              subject: 'submitter-user',
              displayName: null,
              role: 'submitter',
              approvalState: 'approved',
              requestedCompetition: null,
              competitionIds: ['5'],
            },
          }),
        );
      }
      if (url.endsWith('/competitions/5')) {
        return Promise.resolve(
          response(200, { data: { competitionId: '5', name: 'Premier T20' } }),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderUpload();
    expect(await screen.findByText(/package are authoritative/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Season package')).toBeEnabled();
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/seasons?'))).toBe(false);
  });

  test('keeps the catalogue upload workflow package-authoritative', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me'))
        return Promise.resolve(response(200, { user: submitterProfile }));
      if (url.endsWith('/competitions/5'))
        return Promise.resolve(
          response(200, { data: { competitionId: '5', name: 'Premier T20' } }),
        );
      if (url.endsWith('/batches') && init?.method === 'POST')
        return Promise.resolve(
          response(202, {
            data: {
              batchReference,
              status: 'stored',
              statusUrl: `/api/v1/batches/${batchReference}`,
              receivedAt: '2026-09-08T09:30:00.000Z',
            },
          }),
        );
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderUpload('catalogue');
    expect(await screen.findByLabelText('Back catalogue package')).toBeEnabled();
    expect(screen.getByText(/Each season is identified by its readable name/i)).toBeInTheDocument();
    const file = new File(['{"contractVersion":"1.0"}'], 'catalogue.json', {
      type: 'application/json',
    });
    fireEvent.change(screen.getByLabelText('Back catalogue package'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload back catalogue package' }));
    expect(
      await screen.findByRole('heading', { name: 'Back catalogue received safely' }),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/seasons?'))).toBe(false);
  });

  test('distinguishes an access-loading failure from an empty scope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderUpload();
    expect(
      await screen.findByRole('heading', { name: 'Upload choices unavailable' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'No authorised competitions' }),
    ).not.toBeInTheDocument();
  });
});
