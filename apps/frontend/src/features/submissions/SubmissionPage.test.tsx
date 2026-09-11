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
  competitionName: 'Example Competition',
  seasonId: '15',
  season: '2026',
  seasonLabel: '2026',
  competitors: [
    { competitorId: '20', name: 'Wanderers' },
    { competitorId: '21', name: 'Strikers' },
  ],
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

async function selectTechnicalJson() {
  fireEvent.click(await screen.findByRole('radio', { name: /Advanced technical JSON/ }));
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
      requestedCompetition: null,
      competitionIds,
    },
  });
}

function fixtures(data: unknown[]) {
  return response(200, { data, pagination: { nextCursor: null } });
}

function singleFixtureCsv() {
  return 'fixtureDate,homeTeamName,awayTeamName\n2026-08-20,Wanderers,Strikers\n';
}

function fixtureStatistics(totalRuns: number) {
  return response(200, {
    data: {
      fixtureId: '7',
      status: 'complete',
      scope: { superOversIncluded: false },
      outcome: {
        kind: 'no_result',
        winnerCompetitorId: null,
        winnerCompetitorName: null,
        eliminatorCompetitorId: null,
        eliminatorCompetitorName: null,
        margin: null,
        method: null,
        decidedByBowlOut: false,
      },
      warnings: [],
      statistics: [
        {
          statisticId: '100',
          fixtureId: '7',
          scope: 'innings',
          statisticCode: 'team_total',
          inningsId: '10',
          inningsOrdinal: 0,
          competitorId: '20',
          competitorName: 'Wanderers',
          sourceEventCount: 1,
          metrics: { deliveryRuns: totalRuns, penaltyRuns: 0, totalRuns },
        },
      ],
    },
  });
}

function participatingPlayers() {
  return fixtures([
    { participantId: '20', displayName: 'Opening Batter' },
    { participantId: '21', displayName: 'Non-striker' },
    { participantId: '22', displayName: 'Opening Bowler' },
  ]);
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
      await screen.findByRole('heading', { level: 1, name: 'Login or Sign up' }, { timeout: 5000 }),
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
    await selectTechnicalJson();

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

  it('lists fixtures from every competition for an administrator without scopes', async () => {
    const unassignedFixture = { ...fixture, fixtureId: '99', competitionId: null };
    const otherCompetitionFixture = {
      ...fixture,
      fixtureId: '8',
      competitionId: '6',
      competitionName: 'Premier League',
      startDate: '2026-08-21',
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('admin', 'not_requested'));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture, otherCompetitionFixture, unassignedFixture]));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();
    await selectTechnicalJson();

    expect(
      await screen.findByRole('heading', { name: 'Administrator submission access' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/may submit event data for any competition/i)).toBeInTheDocument();

    const selector = screen.getByLabelText('Fixture');
    expect(within(selector).getAllByRole('option')).toHaveLength(2);
    expect(
      within(selector).getByRole('option', { name: /Example Competition/i }),
    ).toBeInTheDocument();
    expect(within(selector).getByRole('option', { name: /Premier League/i })).toBeInTheDocument();
    expect(within(selector).queryByRole('option', { name: /Outside Scope/i })).toBeNull();

    const fixtureRequests = fetchMock.mock.calls
      .map(([input]) => String(input))
      .filter((url) => url.includes('/fixtures?'));
    expect(fixtureRequests).toEqual([expect.not.stringContaining('competitionId=')]);
  });

  it('stages advanced technical JSON through the batch review pipeline', async () => {
    const batchReference = '223e4567-e89b-42d3-a456-426614174000';
    let resolveBatch!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('submitter', 'approved', ['5']));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture]));
      }
      if (url.endsWith('/batches') && init?.method === 'POST') {
        return new Promise<Response>((resolve) => {
          resolveBatch = resolve;
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();
    await selectTechnicalJson();

    fireEvent.change(await screen.findByLabelText('Delivery events JSON'), {
      target: { value: JSON.stringify(validEvents) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));

    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/validation and review/i);

    await act(async () => {
      resolveBatch(
        response(202, {
          data: {
            batchReference,
            status: 'stored',
            statusUrl: `/api/v1/batches/${batchReference}`,
            receivedAt: '2026-08-16T09:30:00.000Z',
          },
        }),
      );
    });

    const heading = await screen.findByRole('heading', { name: 'Fixture package received safely' });
    expect(heading).toHaveFocus();
    expect(screen.getByText(batchReference)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save correction' })).not.toBeInTheDocument();

    const batchCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/batches'));
    expect(batchCall).toBeDefined();
    const request = batchCall?.[1] as RequestInit;
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer approved-access-token');
    expect(new Headers(request.headers).get('X-Competition-Id')).toBe('5');
    expect(new Headers(request.headers).get('X-File-Name')).toBe('technical-7.json');
    expect(request.body).toBeInstanceOf(File);

    const packageText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result ?? '')));
      reader.addEventListener('error', () =>
        reject(new Error('The staged technical package could not be read.')),
      );
      reader.readAsText(request.body as File);
    });
    const packagePayload = JSON.parse(packageText) as {
      fixtures: Array<{
        sourceId: string;
        innings: Array<{
          sourceId: string;
          events: Array<Record<string, unknown>>;
        }>;
      }>;
    };
    expect(packagePayload.fixtures[0]?.sourceId).toBe('app:fixture:7');
    expect(packagePayload.fixtures[0]?.innings[0]?.sourceId).toBe('app:innings:10');
    expect(packagePayload.fixtures[0]?.innings[0]?.events[0]).toMatchObject({
      eventId: `app:delivery:${validEvents[0]!.eventId}`,
      striker: { sourceId: 'app:participant:20' },
      nonStriker: { sourceId: 'app:participant:21' },
      bowler: { sourceId: 'app:participant:22' },
    });
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/submissions'))).toBe(
      false,
    );
  });

  it('saves a prefilled correction and refreshes the event and statistic displays', async () => {
    let statisticsRequests = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('admin', 'approved', ['5']));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture]));
      }
      if (url.endsWith('/submissions') && init?.method === 'POST') {
        return Promise.resolve(
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
      }
      if (url.includes('/participants?fixtureId=7')) {
        return Promise.resolve(participatingPlayers());
      }
      if (url.endsWith('/fixtures/7/statistics')) {
        statisticsRequests += 1;
        return Promise.resolve(fixtureStatistics(statisticsRequests === 1 ? 4 : 6));
      }
      if (url.endsWith(`/submissions/events/${validEvents[0]!.eventId}`)) {
        expect(init?.method).toBe('PUT');
        expect(JSON.parse(String(init?.body))).toMatchObject({
          fixtureId: '7',
          reason: 'Correct scorer transcription.',
          event: {
            runs: { offBat: 6, extras: 0, total: 6 },
          },
        });
        expect(String(init?.body)).not.toMatch(/statistics|sequenceNumber|finalScore/i);
        return Promise.resolve(
          response(200, {
            data: {
              eventId: validEvents[0]!.eventId,
              fixtureId: '7',
              revision: 2,
              refreshedScopes: [
                { scope: 'fixture', participantId: null, competitionId: '5', season: '2026' },
              ],
            },
          }),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();
    await selectTechnicalJson();
    fireEvent.change(await screen.findByLabelText('Delivery events JSON'), {
      target: { value: JSON.stringify(validEvents) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));

    fireEvent.change(await screen.findByLabelText(/Runs off the bat/), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Reason for correction'), {
      target: { value: 'Correct scorer transcription.' },
    });
    expect(screen.getByText('Delivery total').nextElementSibling).toHaveTextContent('6');
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));

    const heading = await screen.findByRole('heading', { name: 'Correction saved' });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/Revision 2 is now current/)).toBeInTheDocument();
    await waitFor(() => expect(statisticsRequests).toBe(2));
    expect(screen.getByText('Delivery total').nextElementSibling).toHaveTextContent('6');
    expect(screen.getAllByText('6').length).toBeGreaterThan(1);
  });

  it.each([
    {
      body: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The correction is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              message: 'Use a printed ball number such as 5.1.',
              field: 'event.ballNumber',
            },
          ],
        },
      },
      errorText: 'Use a printed ball number such as 5.1.',
      inputLabel: /Printed ball number/,
      kind: 'validation',
      status: 422,
    },
    {
      body: {
        error: {
          code: 'EVENT_CONFLICT',
          message: 'That delivery position is already occupied.',
        },
      },
      errorText: 'That delivery position is already occupied.',
      inputLabel: /Delivery position in over/,
      kind: 'conflict',
      status: 409,
    },
  ])(
    'associates correction $kind errors with the relevant input without refreshing statistics',
    async ({ body, errorText, inputLabel, status }) => {
      let statisticsRequests = 0;
      const fetchMock = vi
        .fn()
        .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.endsWith('/auth/me')) {
            return Promise.resolve(currentUser('admin', 'approved', ['5']));
          }
          if (url.includes('/fixtures?')) {
            return Promise.resolve(fixtures([fixture]));
          }
          if (url.endsWith('/submissions') && init?.method === 'POST') {
            return Promise.resolve(
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
          }
          if (url.includes('/participants?fixtureId=7')) {
            return Promise.resolve(participatingPlayers());
          }
          if (url.endsWith('/fixtures/7/statistics')) {
            statisticsRequests += 1;
            return Promise.resolve(fixtureStatistics(4));
          }
          if (url.endsWith(`/submissions/events/${validEvents[0]!.eventId}`)) {
            return Promise.resolve(response(status, body));
          }
          throw new Error(`Unexpected request: ${url}`);
        });
      vi.stubGlobal('fetch', fetchMock);

      renderSubmissionPage();
      await selectTechnicalJson();
      fireEvent.change(await screen.findByLabelText('Delivery events JSON'), {
        target: { value: JSON.stringify(validEvents) },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));
      const relevantInput = await screen.findByLabelText(inputLabel);
      fireEvent.change(screen.getByLabelText('Reason for correction'), {
        target: { value: 'Correct scorer transcription.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));

      expect(await screen.findByRole('heading', { name: 'Correction rejected' })).toHaveFocus();
      expect(relevantInput).toHaveAttribute('aria-invalid', 'true');
      expect(relevantInput).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
      expect(screen.getAllByText(errorText).length).toBeGreaterThan(0);
      expect(statisticsRequests).toBe(1);
    },
  );

  it('withdraws correction actions when backend scope is denied', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('admin', 'approved', ['5']));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture]));
      }
      if (url.endsWith('/submissions') && init?.method === 'POST') {
        return Promise.resolve(
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
      }
      if (url.includes('/participants?fixtureId=7')) {
        return Promise.resolve(participatingPlayers());
      }
      if (url.endsWith('/fixtures/7/statistics')) {
        return Promise.resolve(fixtureStatistics(4));
      }
      if (url.endsWith(`/submissions/events/${validEvents[0]!.eventId}`)) {
        return Promise.resolve(
          response(403, { error: { code: 'FORBIDDEN', message: 'Forbidden.' } }),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();
    await selectTechnicalJson();
    fireEvent.change(await screen.findByLabelText('Delivery events JSON'), {
      target: { value: JSON.stringify(validEvents) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));
    fireEvent.change(await screen.findByLabelText('Reason for correction'), {
      target: { value: 'Correct scorer transcription.' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Save correction' }));

    expect(await screen.findByRole('heading', { name: 'Correction access denied' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Save correction' })).not.toBeInTheDocument();
    expect(screen.getByText(/accepted event was not changed/i)).toBeInTheDocument();
  });

  it('explains local technical schema failures without schema jargon', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('submitter', 'approved', ['5']));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture]));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();
    await selectTechnicalJson();
    const editor = await screen.findByLabelText('Delivery events JSON');
    fireEvent.change(editor, {
      target: { value: JSON.stringify([{ ...validEvents[0], eventId: 'not-a-uuid' }]) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));

    expect(await screen.findByRole('heading', { name: 'Submission rejected' })).toHaveFocus();
    expect(
      screen.getByText('Event identifier: This identifier is not in the expected format.'),
    ).toBeInTheDocument();
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
    await selectTechnicalJson();
    const editor = await screen.findByLabelText('Delivery events JSON');
    fireEvent.change(editor, { target: { value: JSON.stringify(validEvents) } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit events' }));

    const heading = await screen.findByRole('heading', { name: 'Submission rejected' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('Event 1 — Total runs')).toBeInTheDocument();
    expect(screen.getByText('Event 2 — Event identifier')).toBeInTheDocument();
    expect(screen.getAllByText('Technical details')).toHaveLength(2);
    expect(screen.getByText('events.0.runs.total')).toBeInTheDocument();
    expect(screen.getAllByText('INVALID_FIELD', { selector: 'code' })).toHaveLength(2);
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
    await selectTechnicalJson();
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

  it('uploads a readable fixture package and shows its durable receipt', async () => {
    const batchReference = '123e4567-e89b-42d3-a456-426614174000';
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(currentUser('submitter', 'approved', ['5']));
      }
      if (url.includes('/fixtures?')) {
        return Promise.resolve(fixtures([fixture]));
      }
      if (url.endsWith('/batches') && init?.method === 'POST') {
        return Promise.resolve(
          response(202, {
            data: {
              batchReference,
              status: 'stored',
              statusUrl: `/api/v1/batches/${batchReference}`,
              receivedAt: '2026-08-16T09:30:00.000Z',
            },
          }),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSubmissionPage();

    const fixtureSelect = await screen.findByLabelText('Fixture');
    expect(screen.getByRole('radio', { name: /Single fixture/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Season/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Back catalogue/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Advanced technical JSON/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Upload a season or back catalogue/ })).toBeNull();
    expect(fixtureSelect).toHaveAccessibleDescription(/never need to enter a database ID/i);
    expect(within(fixtureSelect).getByRole('option')).toHaveTextContent(
      '2026-08-20 — Wanderers v Strikers — Example Competition, 2026 (T20)',
    );
    expect(
      screen.getByText(/Upload one JSON or CSV spreadsheet package up to 50 MB/),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Download JSON template' })).toHaveAttribute(
      'href',
      '/season-upload-template.json',
    );
    expect(screen.getByRole('link', { name: 'Download spreadsheet template' })).toHaveAttribute(
      'href',
      '/season-upload-template.csv',
    );

    const input = screen.getByLabelText('Fixture package');
    const file = new File(
      [
        JSON.stringify({
          contractVersion: '1.0',
          packageId: 'source:fixture-7',
          fixtures: [
            {
              context: {
                date: fixture.startDate,
                teams: fixture.competitors.map((competitor) => ({
                  context: { name: competitor.name },
                })),
              },
            },
          ],
        }),
      ],
      'fixture-package.json',
      { type: 'application/json' },
    );
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload fixture package' }));

    expect(
      await screen.findByRole('heading', { name: 'Fixture package received safely' }),
    ).toHaveFocus();
    expect(screen.getByText(batchReference)).toBeInTheDocument();
    expect(screen.getByText(/Processing continues after you leave this page/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Track validation and errors' })).toHaveAttribute(
      'href',
      `/submissions/batches/${batchReference}`,
    );
    const uploadCall = fetchMock.mock.calls.find(([request]) =>
      String(request).endsWith('/batches'),
    );
    expect(uploadCall?.[1]).toMatchObject({ method: 'POST', body: file });
    const uploadHeaders = new Headers((uploadCall?.[1] as RequestInit).headers);
    expect(uploadHeaders.get('Content-Type')).toBe('application/json');
    expect(uploadHeaders.get('X-Batch-Package-Version')).toBe('1.0');
    expect(uploadHeaders.get('X-Competition-Id')).toBe('5');
    expect(uploadHeaders.get('X-File-Name')).toBe('fixture-package.json');
  });

  it('shows immediate package and row validation errors clearly', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me'))
        return Promise.resolve(currentUser('submitter', 'approved', ['5']));
      if (url.includes('/fixtures?')) return Promise.resolve(fixtures([fixture]));
      return Promise.resolve(
        response(422, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'The uploaded submission file is invalid.',
            details: [
              {
                code: 'INVALID_FILE_ROW',
                message: 'CSV row 2 is invalid.',
                field: 'file',
                eventIndex: 0,
              },
            ],
          },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSubmissionPage();
    const input = await screen.findByLabelText('Fixture package');
    fireEvent.change(input, {
      target: { files: [new File([singleFixtureCsv()], 'events.csv', { type: 'text/csv' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload fixture package' }));

    expect(await screen.findByRole('heading', { name: 'Submission rejected' })).toHaveFocus();
    expect(screen.getByText('Row 1 — file')).toBeInTheDocument();
    expect(screen.getByText('CSV row 2 is invalid.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects unsupported single-fixture package formats before upload', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me'))
        return Promise.resolve(currentUser('submitter', 'approved', ['5']));
      if (url.includes('/fixtures?')) return Promise.resolve(fixtures([fixture]));
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSubmissionPage();

    const input = await screen.findByLabelText('Fixture package');
    fireEvent.change(input, {
      target: { files: [new File(['unsupported'], 'events.ndjson')] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload fixture package' }));

    expect(await screen.findByRole('heading', { name: 'Submission rejected' })).toHaveFocus();
    expect(screen.getByText('Choose a JSON or CSV fixture package.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.some(([request]) => String(request).endsWith('/batches'))).toBe(
      false,
    );
  });
});
