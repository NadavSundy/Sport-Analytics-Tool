import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicApp } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function createSignedOutAuthClient() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn((listener: AuthStateListener) => ({
      data: {
        subscription: {
          id: 'statistics-test-subscription',
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

function renderRoute(route: string) {
  return render(
    <AuthProvider client={createSignedOutAuthClient()}>
      <MemoryRouter initialEntries={[route]}>
        <PublicApp />
      </MemoryRouter>
    </AuthProvider>,
  );
}

const outcome = {
  kind: 'won',
  winnerCompetitorId: 'team-1',
  eliminatorCompetitorId: null,
  margin: { type: 'wickets', value: 5 },
  method: null,
  decidedByBowlOut: false,
};

const inningsStatistic = {
  statisticId: 'stat-innings-1',
  fixtureId: 'fixture-1',
  scope: 'innings',
  statisticCode: 'team_total',
  inningsId: 'innings-1',
  inningsOrdinal: 0,
  competitorId: 'team-1',
  sourceEventCount: 120,
  metrics: { deliveryRuns: 154, penaltyRuns: 5, totalRuns: 159 },
};

const participantStatistic = {
  statisticId: 'stat-participant-1',
  fixtureId: 'fixture-1',
  scope: 'participant',
  statisticCode: 'participant_fixture',
  participantId: 'player-1',
  competitorId: 'team-1',
  sourceEventCount: 38,
  batting: { runsScored: 42, ballsFaced: 30, strikeRate: 140, fours: 4, sixes: 2 },
  bowling: {
    runsConceded: 24,
    legalBallsBowled: 18,
    oversBowled: '3.0',
    economyRate: 8,
    wicketsTaken: 2,
  },
};

describe('public fixture statistics pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads and displays Basic fixture, competitor and participant statistics anonymously', async () => {
    let resolveRequest!: (value: Response) => void;
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/fixtures/fixture-1/statistics');

    expect(screen.getByRole('heading', { name: 'Loading fixture statistics' })).toBeInTheDocument();

    resolveRequest(
      response(200, {
        data: {
          fixtureId: 'fixture-1',
          status: 'complete',
          scope: { superOversIncluded: false },
          outcome,
          warnings: [],
          statistics: [inningsStatistic, participantStatistic],
        },
      }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fixture statistics' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Complete data')).toBeInTheDocument();
    expect(screen.getByText('Competitor team-1 won by 5 wickets.')).toBeInTheDocument();

    const teamSection = screen.getByRole('heading', { name: 'Competitor totals' }).parentElement
      ?.parentElement?.parentElement;
    expect(teamSection).toBeTruthy();
    expect(within(teamSection as HTMLElement).getByText('159')).toBeInTheDocument();
    expect(
      within(teamSection as HTMLElement).getByRole('link', { name: 'Competitor team-1' }),
    ).toHaveAttribute('href', '/competitors/team-1');

    const participantSection = screen.getByRole('heading', {
      name: 'Participant statistics',
    }).parentElement?.parentElement?.parentElement;
    expect(participantSection).toBeTruthy();
    expect(within(participantSection as HTMLElement).getByText('42')).toBeInTheDocument();
    expect(
      within(participantSection as HTMLElement).getByRole('link', {
        name: 'Participant player-1',
      }),
    ).toHaveAttribute('href', '/participants/player-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/fixtures/fixture-1/statistics',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).has('Authorization')).toBe(false);
  });

  it('shows partial-data notices and a clear empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(200, {
          data: {
            fixtureId: 'fixture-empty',
            status: 'partial',
            scope: { superOversIncluded: false },
            outcome: { ...outcome, kind: 'no_result', winnerCompetitorId: null, margin: null },
            warnings: [
              { code: 'NO_ACCEPTED_EVENTS', message: 'No accepted delivery events are available.' },
            ],
            statistics: [],
          },
        }),
      ),
    );

    renderRoute('/fixtures/fixture-empty/statistics');

    expect(await screen.findByText('Partial data')).toBeInTheDocument();
    expect(screen.getByText('No accepted delivery events are available.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'No fixture statistics available' }),
    ).toBeInTheDocument();
  });

  it('communicates API failure and retries the public request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(503, {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Statistics are unavailable.' },
        }),
      )
      .mockResolvedValueOnce(
        response(200, {
          data: {
            fixtureId: 'fixture-1',
            status: 'complete',
            scope: { superOversIncluded: false },
            outcome,
            warnings: [],
            statistics: [],
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/fixtures/fixture-1/statistics');

    expect(await screen.findByRole('alert')).toHaveTextContent('Statistics are unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { name: 'No fixture statistics available' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows contributing events and links every related public record', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(200, {
          data: {
            ...inningsStatistic,
            contributingEvents: [
              {
                eventId: 'event-1',
                fixtureId: 'fixture-1',
                inningsId: 'innings-1',
                inningsOrdinal: 0,
                sequenceNumber: 1,
                strikerParticipantId: 'striker-1',
                bowlerParticipantId: 'bowler-1',
                runs: { offBat: 4, extras: 1, total: 5 },
                extras: {
                  wides: 1,
                  noBalls: null,
                  byes: null,
                  legByes: null,
                  penalty: null,
                },
                nonBoundary: false,
                bowlerWickets: 0,
              },
            ],
          },
        }),
      ),
    );

    renderRoute('/fixtures/fixture-1/statistics/stat-innings-1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Innings 1 team total' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Event 1' })).toBeInTheDocument();
    expect(screen.getByText('event-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Participant striker-1' })).toHaveAttribute(
      'href',
      '/participants/striker-1',
    );
    expect(screen.getByRole('link', { name: 'Participant bowler-1' })).toHaveAttribute(
      'href',
      '/participants/bowler-1',
    );
    expect(screen.getByRole('link', { name: 'Open competitor' })).toHaveAttribute(
      'href',
      '/competitors/team-1',
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/fixtures/fixture-1/statistics/stat-innings-1?includeContributors=true',
        expect.any(Object),
      ),
    );
  });
});
