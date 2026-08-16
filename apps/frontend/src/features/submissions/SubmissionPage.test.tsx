import type { ApplicationRole, CurrentUserProfile } from '@sport-analytics/contracts';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicApp } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

const fixture = {
  fixtureId: '7',
  competitionId: '5',
  seasonId: '15',
  season: '2026',
  matchType: 'T20',
  teamType: 'international',
  gender: 'female',
  ballsPerOver: 6,
  scheduledOvers: 20,
  startDate: '2026-08-20',
  endDate: '2026-08-20',
};

const validEvents = [
  {
    eventId: '123e4567-e89b-42d3-a456-426614174000',
    inningsId: '10',
    sequenceNumber: 1,
    overNumber: 0,
    positionInOver: 0,
    ballNumber: '0.1',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '22',
    runs: { offBat: 4, extras: 0, total: 4, nonBoundary: false },
    extras: {},
    wickets: [],
  },
];

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function createSession(): Session {
  const user = {
    id: 'approved-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'submitter@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-08-16T00:00:00.000Z',
  } satisfies User;

  return {
    access_token: 'approved-access-token',
    refresh_token: 'managed-by-supabase',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

function createAuthClient(session: Session | null) {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    onAuthStateChange: vi.fn((listener: AuthStateListener) => ({
      data: {
        subscription: {
          id: 'submission-page-test-subscription',
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

function renderSubmissionPage(session: Session | null = createSession()) {
  return render(
    <AuthProvider client={createAuthClient(session)}>
      <MemoryRouter initialEntries={['/submissions/new']}>
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

function currentUser(
  role: ApplicationRole,
  approvalState: CurrentUserProfile['approvalState'],
  competitionIds: string[] = [],
) {
  return response(200, {
    user: {
      id: '17',
      subject: 'approved-user',
      displayName: 'Submitter User',
      role,
      approvalState,
      competitionIds,
    },
  });
}

function fixtures(data: unknown[]) {
  return response(200, { data, pagination: { nextCursor: null } });
}

describe('role-gated event submission page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSystemTheme();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('directs an anonymous user to sign in without loading application data', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage(null);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Login or Sign up' }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks a viewer whose submitter request is pending', async () => {
    const fetchMock = vi.fn().mockResolvedValue(currentUser('viewer', 'pending'));
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();

    expect(await screen.findByText('Submitter role required')).toBeInTheDocument();
    expect(screen.getByText(/pending approval/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit events' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not treat a legacy approved viewer as a submitter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(currentUser('viewer', 'approved', ['5']));
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();

    expect(await screen.findByText('Submitter role required')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fixture')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails safely when the current-user response does not match the shared contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(200, {
        user: {
          approvalState: 'approved',
          competitionIds: ['5'],
        },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();

    expect(
      await screen.findByRole('heading', {
        name: 'Submission access could not be checked',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Your application role and fixture scope could not be loaded. Please try again.',
      ),
    ).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Submit events' })).not.toBeInTheDocument();
  });

  it('lists only fixtures returned for the approved submitter competition scope', async () => {
    const outsideScopeFixture = { ...fixture, fixtureId: '99', competitionId: '9' };
    const secondFixture = {
      ...fixture,
      fixtureId: '8',
      competitionId: '6',
      startDate: '2026-08-21',
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('submitter', 'approved', ['5', '6']));
      }
      if (url.includes('competitionId=5')) {
        return Promise.resolve(fixtures([fixture, outsideScopeFixture]));
      }
      return Promise.resolve(fixtures([secondFixture]));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();

    const selector = await screen.findByLabelText('Fixture');
    expect(within(selector).getAllByRole('option')).toHaveLength(2);
    expect(within(selector).queryByRole('option', { name: /fixture 99/i })).toBeNull();
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('competitionId=5'),
        expect.stringContaining('competitionId=6'),
      ]),
    );
  });

  it('submits valid delivery events and focuses the stored reference summary', async () => {
    let resolveSubmission!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('submitter', 'approved', ['5']));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture]));
      }
      if (url.endsWith('/submissions') && init?.method === 'POST') {
        return new Promise<Response>((resolve) => {
          resolveSubmission = resolve;
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();

    fireEvent.change(await screen.findByLabelText('Delivery events JSON'), {
      target: { value: JSON.stringify(validEvents) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));

    expect(screen.getByRole('button', { name: 'Submitting events…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Validating and storing');

    await act(async () => {
      resolveSubmission(
        response(201, {
          data: {
            submissionId: '300',
            fixtureId: '7',
            submitterId: '17',
            status: 'accepted',
            receivedAt: '2026-08-16T09:30:00.000Z',
            schemaVersion: '1.0',
            eventCount: 1,
          },
        }),
      );
    });

    const heading = await screen.findByRole('heading', { name: 'Submission accepted' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('300')).toBeInTheDocument();

    const submissionCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/submissions'),
    );
    const request = submissionCall?.[1] as RequestInit;
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer approved-access-token');
    expect(JSON.parse(String(request.body))).toEqual({
      fixtureId: '7',
      schemaVersion: '1.0',
      events: validEvents,
    });
    expect(String(request.body)).not.toMatch(/finalStatistic|totalWickets|finalScore/i);
  });

  it('shows event-specific and field-specific validation results', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('submitter', 'approved', ['5']));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture]));
      }
      return Promise.resolve(
        response(422, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'The submission is invalid.',
            details: [
              {
                code: 'INVALID_FIELD',
                message: 'Total runs must equal off-bat runs plus extras.',
                field: 'events.0.runs.total',
                eventIndex: 0,
              },
              {
                code: 'INVALID_FIELD',
                message: 'Event identifiers must be UUIDs.',
                field: 'events.1.eventId',
                eventIndex: 1,
              },
            ],
          },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();
    const editor = await screen.findByLabelText('Delivery events JSON');
    fireEvent.change(editor, { target: { value: JSON.stringify(validEvents) } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));

    const heading = await screen.findByRole('heading', { name: 'Submission rejected' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('Event 1 — runs.total')).toBeInTheDocument();
    expect(screen.getByText('Event 2 — eventId')).toBeInTheDocument();
    expect(editor).toHaveAttribute('aria-invalid', 'true');
    expect(editor).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('submission-validation'),
    );
  });

  it('shows invalid JSON and backend failures as distinct clear results', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('submitter', 'approved', ['5']));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture]));
      }
      return Promise.resolve(
        response(503, {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Submission storage is unavailable.' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();
    const editor = await screen.findByLabelText('Delivery events JSON');
    fireEvent.change(editor, { target: { value: '{' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));

    expect(await screen.findByText('Enter valid JSON before submitting.')).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: JSON.stringify(validEvents) } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));

    expect(await screen.findByRole('heading', { name: 'Submission failed' })).toBeInTheDocument();
    expect(screen.getByText('Submission storage is unavailable.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Submission failed' })).toHaveFocus(),
    );
  });
});
