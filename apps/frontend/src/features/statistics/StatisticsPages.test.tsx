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

function collection(data: unknown[]): Response {
  return response(200, { data, pagination: { nextCursor: null } });
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
  winnerCompetitorName: 'Wanderers',
  eliminatorCompetitorId: null,
  eliminatorCompetitorName: null,
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
  competitorName: 'Wanderers',
  sourceEventCount: 120,
  metrics: { deliveryRuns: 154, penaltyRuns: 5, totalRuns: 159 },
};

const participantStatistic = {
  statisticId: 'stat-participant-1',
  fixtureId: 'fixture-1',
  scope: 'participant',
  statisticCode: 'participant_fixture',
  participantId: 'player-1',
  participantName: 'A Player',
  competitorId: 'team-1',
  competitorName: 'Wanderers',
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

const fixture = {
  fixtureId: 'fixture-1',
  competitionId: 'competition-1',
  competitionName: 'Premier Cricket League',
  seasonId: 'season-1',
  season: '2026',
  seasonLabel: '2026 season',
  competitors: [
    { competitorId: 'team-1', name: 'Wanderers' },
    { competitorId: 'team-2', name: 'Strikers' },
  ],
  matchType: 'T20',
  teamType: 'international',
  gender: 'female',
  ballsPerOver: 6,
  scheduledOvers: 20,
  startDate: '2026-08-09',
  endDate: '2026-08-09',
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

  it('automatically loads the match overview, statistics, and participating players anonymously', async () => {
    let resolveStatistics!: (value: Response) => void;
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/fixtures/fixture-1')) {
        return Promise.resolve(response(200, { data: fixture }));
      }
      if (url.includes('/participants?fixtureId=fixture-1')) {
        return Promise.resolve(
          collection([{ participantId: 'player-1', displayName: 'A Player' }]),
        );
      }
      return new Promise<Response>((resolve) => {
        resolveStatistics = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/fixtures/fixture-1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Loading match statistics' })).toBeInTheDocument();

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/fixtures/fixture-1/statistics',
        expect.objectContaining({ headers: { Accept: 'application/json' } }),
      ),
    );

    resolveStatistics(
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

    expect(await screen.findByText('Complete data')).toBeInTheDocument();
    expect(screen.getByText('Wanderers won by 5 wickets.')).toBeInTheDocument();

    const teamSection = screen.getByRole('heading', { name: 'Innings totals' }).parentElement
      ?.parentElement?.parentElement;
    expect(teamSection).toBeTruthy();
    expect(within(teamSection as HTMLElement).getByText('159')).toBeInTheDocument();
    expect(
      within(teamSection as HTMLElement).getByRole('link', { name: 'Wanderers' }),
    ).toHaveAttribute('href', '/competitors/team-1');

    const participantSection = screen.getByRole('heading', {
      name: 'Player statistics',
    }).parentElement?.parentElement?.parentElement;
    expect(participantSection).toBeTruthy();
    expect(within(participantSection as HTMLElement).getByText('42')).toBeInTheDocument();
    expect(
      within(participantSection as HTMLElement).getByRole('link', {
        name: 'A Player',
      }),
    ).toHaveAttribute('href', '/participants/player-1');
    expect(screen.getByRole('heading', { name: 'Participating players' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View fixture statistics' })).not.toBeInTheDocument();

    const statisticsCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === 'http://localhost:3000/api/v1/fixtures/fixture-1/statistics',
    );
    const request = statisticsCall?.[1] as RequestInit;
    expect(new Headers(request.headers).has('Authorization')).toBe(false);
  });

  it('shows partial-data notices and a clear empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/fixtures/fixture-empty')) {
          return Promise.resolve(
            response(200, { data: { ...fixture, fixtureId: 'fixture-empty' } }),
          );
        }
        if (url.includes('/participants?')) {
          return Promise.resolve(collection([]));
        }
        return Promise.resolve(
          response(200, {
            data: {
              fixtureId: 'fixture-empty',
              status: 'partial',
              scope: { superOversIncluded: false },
              outcome: {
                ...outcome,
                kind: 'no_result',
                winnerCompetitorId: null,
                winnerCompetitorName: null,
                margin: null,
              },
              warnings: [
                {
                  code: 'NO_ACCEPTED_EVENTS',
                  message: 'No accepted delivery events are available.',
                },
              ],
              statistics: [],
            },
          }),
        );
      }),
    );

    renderRoute('/fixtures/fixture-empty');

    expect(await screen.findByText('Partial data')).toBeInTheDocument();
    expect(screen.getByText('No accepted delivery events are available.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'No match statistics available' }),
    ).toBeInTheDocument();
  });

  it('communicates API failure and retries the public request', async () => {
    let statisticsRequestCount = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/fixtures/fixture-1')) {
        return Promise.resolve(response(200, { data: fixture }));
      }
      if (url.includes('/participants?')) {
        return Promise.resolve(collection([]));
      }
      statisticsRequestCount += 1;
      return Promise.resolve(
        statisticsRequestCount === 1
          ? response(503, {
              error: { code: 'SERVICE_UNAVAILABLE', message: 'Statistics are unavailable.' },
            })
          : response(200, {
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
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/fixtures/fixture-1');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Published match statistics could not be requested. Try this section again.',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Wanderers vs Strikers' })).toBeVisible();
    expect(screen.getByText('Premier Cricket League')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry match statistics' }));

    expect(
      await screen.findByRole('heading', { name: 'No match statistics available' }),
    ).toBeInTheDocument();
    expect(statisticsRequestCount).toBe(2);
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
                strikerParticipantName: 'Opening Batter',
                bowlerParticipantId: 'bowler-1',
                bowlerParticipantName: 'Opening Bowler',
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
      await screen.findByRole('heading', { level: 1, name: 'Wanderers innings 1 total' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delivery 1' })).toBeInTheDocument();
    expect(screen.queryByText('event-1')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Opening Batter' })).toHaveAttribute(
      'href',
      '/participants/striker-1',
    );
    expect(screen.getByRole('link', { name: 'Opening Bowler' })).toHaveAttribute(
      'href',
      '/participants/bowler-1',
    );
    expect(screen.getByRole('link', { name: 'Open Wanderers' })).toHaveAttribute(
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
