import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicApp } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';
import { PlayerPerformance } from './StatisticsPages';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

const testApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

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

// An unrecognised request fails loudly instead of receiving plausible data, so a
// test cannot pass while the request it depends on was never correct.
function notMocked(): Response {
  return response(404, {
    error: { code: 'NOT_FOUND', message: 'Request not mocked in this test.' },
  });
}

function exportDownload(type: string) {
  return { ok: true, status: 200, blob: vi.fn().mockResolvedValue(new Blob(['rows'], { type })) };
}

function traceEvents(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    eventId: `event-${index + 1}`,
    fixtureId: 'fixture-1',
    inningsId: 'innings-1',
    inningsOrdinal: 0,
    sequenceNumber: index + 1,
    strikerParticipantId: 'player-1',
    strikerParticipantName: 'A Player',
    nonStrikerParticipantId: 'non-striker-1',
    nonStrikerParticipantName: 'Non-striker',
    bowlerParticipantId: 'bowler-1',
    bowlerParticipantName: 'Opening Bowler',
    runs: { offBat: 1, extras: 0, total: 1 },
    extras: { wides: null, noBalls: null, byes: null, legByes: null, penalty: null },
    nonBoundary: false,
    bowlerWickets: 0,
    wicketsLost: 0,
  }));
}

function stubDownloads(downloadedFilenames: string[]) {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:event-data'),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloadedFilenames.push(this.download);
  });
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
  metrics: {
    deliveryRuns: 154,
    penaltyRuns: 5,
    totalRuns: 159,
    wicketsLost: 6,
    legalBalls: 120,
    overs: '20.0',
    runRate: 7.95,
    extras: { total: 9, wides: 2, noBalls: 1, byes: 0, legByes: 1, penaltyRuns: 5 },
  },
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
  battingPosition: 3,
  battingParticipation: 'batted' as const,
  dismissal: { status: 'not_out' as const, kind: null, eventId: null },
  batting: { runsScored: 42, ballsFaced: 30, strikeRate: 140, fours: 4, sixes: 2 },
  bowling: {
    runsConceded: 24,
    wides: 0,
    noBalls: 0,
    legalBallsBowled: 18,
    oversBowled: '3.0',
    economyRate: 8,
    wicketsTaken: 2,
  },
};

const unavailableWeather = {
  fixtureId: 'fixture-1',
  date: '2026-08-09',
  availability: 'unavailable',
  reason: 'MISSING_COORDINATES',
  venue: null,
  weather: null,
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
  venue: null,
  toss: null,
  startDate: '2026-08-09',
  endDate: '2026-08-09',
};

const teamNames: Record<string, string> = { 'team-1': 'Wanderers', 'team-2': 'Strikers' };

function inningsFor(competitorId: string, inningsOrdinal: number) {
  return {
    ...inningsStatistic,
    statisticId: `stat-innings-${inningsOrdinal}`,
    inningsId: `innings-${inningsOrdinal}`,
    inningsOrdinal,
    competitorId,
    competitorName: teamNames[competitorId],
  };
}

// A player statistic as the endpoint returns it. A null batting position is a
// player who was selected but did not bat.
function playerStatistic(
  participantId: string,
  participantName: string,
  competitorId: string | null,
  battingPosition: number | null,
) {
  return {
    ...participantStatistic,
    statisticId: `stat-participant-${participantId}`,
    participantId,
    participantName,
    competitorId,
    competitorName: competitorId === null ? null : teamNames[competitorId],
    battingPosition,
    ...(battingPosition === null
      ? { battingParticipation: 'did_not_bat' as const, dismissal: null, batting: null }
      : {}),
  };
}

function renderFixtureStatistics(statistics: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/fixtures/fixture-1')) {
        return Promise.resolve(response(200, { data: fixture }));
      }
      if (url.endsWith('/fixtures/fixture-1/weather')) {
        return Promise.resolve(response(200, { data: unavailableWeather }));
      }
      if (url.includes('/participants?')) {
        return Promise.resolve(collection([]));
      }
      if (url.endsWith('/fixtures/fixture-1/statistics')) {
        return Promise.resolve(
          response(200, {
            data: {
              fixtureId: 'fixture-1',
              status: 'complete',
              scope: { superOversIncluded: false },
              outcome,
              highestScorers: [
                {
                  participantId: 'player-1',
                  participantName: 'A Player',
                  competitorId: 'team-1',
                  competitorName: 'Wanderers',
                  inningsId: 'innings-1',
                  inningsOrdinal: 0,
                  runsScored: 42,
                  notOut: true,
                },
              ],
              warnings: [],
              statistics,
            },
          }),
        );
      }
      return Promise.resolve(notMocked());
    }),
  );
  renderRoute('/fixtures/fixture-1');
}

// Every team group in the order it is rendered, with the player named on each of
// its cards in the order those cards are rendered.
async function renderedPlayerGroups() {
  const playerSection = (await screen.findByRole('heading', { name: 'Player statistics' })).closest(
    'section',
  ) as HTMLElement;
  return within(playerSection)
    .getAllByRole('region')
    .filter((region) => region.parentElement === playerSection)
    .map((group) => ({
      team: within(group).getAllByRole('heading', { level: 3 })[0]?.textContent,
      players: within(group)
        .getAllByRole('listitem')
        .map((card) => within(card).getByRole('heading', { level: 3 }).textContent),
    }));
}

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

  it('distinguishes a dismissed duck, a not-out duck, dismissal types, and DNB', () => {
    const batting = { runsScored: 0, ballsFaced: 1, strikeRate: 0, fours: 0, sixes: 0 };
    const { rerender } = render(
      <PlayerPerformance
        batting={batting}
        bowling={null}
        battingPosition={3}
        battingParticipation="batted"
        dismissal={{ status: 'dismissed', kind: 'caught', eventId: 'event-1' }}
      />,
    );
    expect(screen.getByText('caught')).toBeInTheDocument();
    expect(screen.queryByLabelText('0 not out')).not.toBeInTheDocument();

    rerender(
      <PlayerPerformance
        batting={batting}
        bowling={null}
        battingPosition={4}
        battingParticipation="batted"
        dismissal={{ status: 'not_out', kind: null, eventId: null }}
      />,
    );
    expect(screen.getByLabelText('0 not out')).toBeInTheDocument();

    rerender(
      <PlayerPerformance
        batting={{ ...batting, runsScored: 12 }}
        bowling={null}
        battingPosition={5}
        battingParticipation="batted"
        dismissal={{ status: 'dismissed', kind: 'bowled', eventId: 'event-2' }}
      />,
    );
    expect(screen.getByText('bowled')).toBeInTheDocument();

    rerender(
      <PlayerPerformance
        batting={{ ...batting, runsScored: 7 }}
        bowling={null}
        battingPosition={6}
        battingParticipation="batted"
        dismissal={{ status: 'dismissed', kind: 'run out', eventId: 'event-3' }}
      />,
    );
    expect(screen.getByText('run out')).toBeInTheDocument();

    rerender(
      <PlayerPerformance
        batting={null}
        bowling={null}
        battingPosition={null}
        battingParticipation="did_not_bat"
        dismissal={null}
      />,
    );
    expect(screen.getByText('Did not bat')).toBeInTheDocument();
    expect(screen.queryByText('Balls faced')).not.toBeInTheDocument();
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
        `${testApiBaseUrl}/fixtures/fixture-1/statistics`,
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
          highestScorers: [
            {
              participantId: 'player-1',
              participantName: 'A Player',
              competitorId: 'team-1',
              competitorName: 'Wanderers',
              inningsId: 'innings-1',
              inningsOrdinal: 0,
              runsScored: 42,
              notOut: true,
            },
          ],
          warnings: [],
          statistics: [inningsStatistic, participantStatistic],
        },
      }),
    );

    expect(await screen.findByText('Complete data')).toBeInTheDocument();
    expect(screen.getByText('Wanderers won by 5 wickets.')).toBeInTheDocument();
    expect(screen.getByText('Highest individual innings score')).toBeInTheDocument();
    expect(screen.getByText('42* runs · innings 1')).toBeInTheDocument();

    const teamSection = screen.getByRole('heading', { name: 'Innings totals' }).parentElement
      ?.parentElement?.parentElement;
    expect(teamSection).toBeTruthy();
    expect(within(teamSection as HTMLElement).getByText('159')).toBeInTheDocument();
    expect(within(teamSection as HTMLElement).queryByText('Delivery runs')).not.toBeInTheDocument();
    expect(
      within(teamSection as HTMLElement).getByRole('link', { name: 'Wanderers' }),
    ).toHaveAttribute('href', '/competitors/team-1');

    const participantSection = screen.getByRole('heading', {
      name: 'Player statistics',
    }).parentElement?.parentElement?.parentElement;
    expect(participantSection).toBeTruthy();
    expect(
      within(participantSection as HTMLElement).getByLabelText('42 not out'),
    ).toBeInTheDocument();
    expect(within(participantSection as HTMLElement).getByText('Wides')).toBeInTheDocument();
    expect(within(participantSection as HTMLElement).getByText('No-balls')).toBeInTheDocument();
    expect(
      within(participantSection as HTMLElement).getByRole('link', {
        name: 'A Player',
      }),
    ).toHaveAttribute('href', '/participants/player-1');
    expect(screen.getByRole('heading', { name: 'Participating players' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View fixture statistics' })).not.toBeInTheDocument();

    const statisticsCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === `${testApiBaseUrl}/fixtures/fixture-1/statistics`,
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
              highestScorers: [],
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

      if (url.endsWith('/fixtures/fixture-1/statistics')) {
        statisticsRequestCount += 1;

        return Promise.resolve(
          statisticsRequestCount === 1
            ? response(503, {
                error: {
                  code: 'SERVICE_UNAVAILABLE',
                  message: 'Statistics are unavailable.',
                },
              })
            : response(200, {
                data: {
                  fixtureId: 'fixture-1',
                  status: 'complete',
                  scope: { superOversIncluded: false },
                  outcome,
                  highestScorers: [],
                  warnings: [],
                  statistics: [],
                },
              }),
        );
      }

      return Promise.resolve(
        response(404, {
          error: { code: 'NOT_FOUND', message: 'Request not mocked in this test.' },
        }),
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/fixtures/fixture-1');

    expect(
      await screen.findByText(
        'Published match statistics could not be requested. Try this section again.',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Wanderers vs Strikers',
      }),
    ).toBeVisible();

    expect(screen.getByText('Premier Cricket League')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Retry match statistics' }));

    expect(
      await screen.findByRole('heading', {
        name: 'No match statistics available',
      }),
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
                nonStrikerParticipantId: 'non-striker-1',
                nonStrikerParticipantName: 'Non-striker',
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
                wicketsLost: 0,
              },
            ],
          },
        }),
      ),
    );

    renderRoute('/fixtures/fixture-1/statistics/stat-innings-1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Wanderers innings 0 total' }),
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
        `${testApiBaseUrl}/fixtures/fixture-1/statistics/stat-innings-1?includeContributors=true`,
        expect.any(Object),
      ),
    );
  });

  // Issue #475 (P01-F12 / P02-F22): "Non-boundary: No" was shown on every delivery and
  // neither participant could interpret it. The row now appears only on a delivery whose
  // runs were run rather than hit to the boundary, and on no other delivery.
  it('marks only the deliveries whose runs were run rather than hit to the boundary', async () => {
    const [struck, run] = traceEvents(2);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.endsWith('/fixtures/fixture-1/statistics/stat-innings-1?includeContributors=true')
        ) {
          return Promise.resolve(
            response(200, {
              data: {
                ...inningsStatistic,
                contributingEvents: [
                  { ...struck, runs: { offBat: 4, extras: 0, total: 4 }, nonBoundary: false },
                  { ...run, runs: { offBat: 4, extras: 0, total: 4 }, nonBoundary: true },
                ],
              },
            }),
          );
        }
        return Promise.resolve(notMocked());
      }),
    );

    renderRoute('/fixtures/fixture-1/statistics/stat-innings-1');

    const struckDelivery = (await screen.findByRole('heading', { name: 'Delivery 1' })).closest(
      'li',
    ) as HTMLElement;
    const runDelivery = screen
      .getByRole('heading', { name: 'Delivery 2' })
      .closest('li') as HTMLElement;

    expect(within(struckDelivery).queryByText('Boundary')).not.toBeInTheDocument();
    expect(within(struckDelivery).queryByText(/not hit to the boundary/)).not.toBeInTheDocument();

    const boundaryTerm = within(runDelivery).getByText('Boundary');
    expect(boundaryTerm.tagName).toBe('DT');
    expect(boundaryTerm.nextElementSibling).toHaveTextContent(
      'No — the runs were run, not hit to the boundary',
    );
    expect(screen.queryByText('Non-boundary')).not.toBeInTheDocument();
  });

  // Issue #467: the control exported a filtered slice read as one page of 100,
  // so a 125-event innings downloaded 100 rows while the trace showed 125, and
  // a player trace downloaded non-striker and fielding rows it did not show.
  // The previous version of this test asserted the filtered slice URL and
  // answered every unrecognised request with a statistic, so it could not see
  // either defect.
  it('exports the displayed innings trace from its own statistic and states the event count', async () => {
    const contributingEvents = traceEvents(125);
    let resolveCsv!: (value: unknown) => void;
    const downloadedFilenames: string[] = [];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/fixtures/fixture-1/statistics/stat-innings-1?includeContributors=true')) {
        return Promise.resolve(
          response(200, { data: { ...inningsStatistic, contributingEvents } }),
        );
      }
      if (url.endsWith('/fixtures/fixture-1/statistics/stat-innings-1/events/export.csv')) {
        return new Promise((resolve) => {
          resolveCsv = resolve;
        });
      }
      if (url.endsWith('/fixtures/fixture-1/statistics/stat-innings-1/events/export.json')) {
        return Promise.resolve(exportDownload('application/json'));
      }
      return Promise.resolve(notMocked());
    });
    vi.stubGlobal('fetch', fetchMock);
    stubDownloads(downloadedFilenames);

    renderRoute('/fixtures/fixture-1/statistics/stat-innings-1');

    const exportSection = (
      await screen.findByRole('heading', { name: 'Export this trace' })
    ).closest('section') as HTMLElement;
    expect(screen.getByText('125 returned')).toBeInTheDocument();
    expect(exportSection).toHaveTextContent(
      'Download the 125 events shown in this trace, in match order, for analysis.',
    );

    fireEvent.click(within(exportSection).getByRole('button', { name: 'Download CSV' }));
    expect(
      await within(exportSection).findByText('Preparing the CSV export of 125 events…'),
    ).toBeInTheDocument();
    expect(within(exportSection).getByRole('button', { name: 'Preparing CSV…' })).toBeDisabled();

    resolveCsv(exportDownload('text/csv'));
    expect(
      await within(exportSection).findByText('CSV export of 125 events downloaded.'),
    ).toBeInTheDocument();

    fireEvent.click(within(exportSection).getByRole('button', { name: 'Download JSON' }));
    expect(
      await within(exportSection).findByText('JSON export of 125 events downloaded.'),
    ).toBeInTheDocument();

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls).toContain(
      `${testApiBaseUrl}/fixtures/fixture-1/statistics/stat-innings-1/events/export.csv`,
    );
    // Neither the filtered slice nor a client-chosen page is requested.
    expect(requestedUrls.some((url) => url.includes('/fixtures/fixture-1/events/export'))).toBe(
      false,
    );
    expect(
      requestedUrls.some((url) => /[?&](cursor|limit|inningsId|participantId)=/.test(url)),
    ).toBe(false);
    expect(downloadedFilenames).toEqual([
      'fixture-fixture-1-innings-innings-1-team-team-1-events.csv',
      'fixture-fixture-1-innings-innings-1-team-team-1-events.json',
    ]);
  }, 10_000);

  it('exports a player trace as the trace itself rather than every delivery involving the player', async () => {
    const contributingEvents = traceEvents(6);
    const downloadedFilenames: string[] = [];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (
        url.endsWith('/fixtures/fixture-1/statistics/stat-participant-1?includeContributors=true')
      ) {
        return Promise.resolve(
          response(200, { data: { ...participantStatistic, contributingEvents } }),
        );
      }
      if (url.endsWith('/fixtures/fixture-1/statistics/stat-participant-1/events/export.csv')) {
        return Promise.resolve(exportDownload('text/csv'));
      }
      return Promise.resolve(notMocked());
    });
    vi.stubGlobal('fetch', fetchMock);
    stubDownloads(downloadedFilenames);

    renderRoute('/fixtures/fixture-1/statistics/stat-participant-1');

    expect(await screen.findByText('6 returned')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));

    expect(await screen.findByText('CSV export of 6 events downloaded.')).toBeInTheDocument();
    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls).toContain(
      `${testApiBaseUrl}/fixtures/fixture-1/statistics/stat-participant-1/events/export.csv`,
    );
    expect(requestedUrls.some((url) => url.includes('participantId='))).toBe(false);
    expect(downloadedFilenames).toEqual(['fixture-fixture-1-player-player-1-events.csv']);
  });

  // Issue #475 (P01-F24 / P02-F18): in Sprint 2 user testing neither participant could
  // tell that a download had happened. The confirmation is asserted on the export
  // section's own status region, so text elsewhere on the page cannot satisfy it, and
  // it must be absent until the file has been produced.
  it('confirms on screen that a completed CSV download produced a file', async () => {
    let resolveCsv!: (value: unknown) => void;
    const downloadedFilenames: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.endsWith('/fixtures/fixture-1/statistics/stat-participant-1?includeContributors=true')
        ) {
          return Promise.resolve(
            response(200, {
              data: { ...participantStatistic, contributingEvents: traceEvents(6) },
            }),
          );
        }
        if (url.endsWith('/fixtures/fixture-1/statistics/stat-participant-1/events/export.csv')) {
          return new Promise((resolve) => {
            resolveCsv = resolve;
          });
        }
        return Promise.resolve(notMocked());
      }),
    );
    stubDownloads(downloadedFilenames);

    renderRoute('/fixtures/fixture-1/statistics/stat-participant-1');

    const exportSection = (
      await screen.findByRole('heading', { name: 'Export this trace' })
    ).closest('section') as HTMLElement;
    const status = within(exportSection).getByRole('status');
    expect(status).toBeEmptyDOMElement();

    fireEvent.click(within(exportSection).getByRole('button', { name: 'Download CSV' }));
    await waitFor(() => expect(status).toHaveTextContent('Preparing the CSV export of 6 events…'));
    expect(status).not.toHaveTextContent('downloaded');
    expect(downloadedFilenames).toEqual([]);

    resolveCsv(exportDownload('text/csv'));

    await waitFor(() => expect(status).toHaveTextContent('CSV export of 6 events downloaded.'));
    expect(downloadedFilenames).toEqual(['fixture-fixture-1-player-player-1-events.csv']);
  });

  it.each([
    {
      name: 'a failure partway through paging',
      status: 500,
      body: {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected server error occurred.',
        },
      },
      message: 'Export unavailable: An unexpected server error occurred.',
    },
    {
      name: 'an export over the bound',
      status: 422,
      body: {
        error: {
          code: 'EXPORT_TOO_LARGE',
          message:
            'This export has more than 5000 events. Narrow it with an innings, team, player, over or wicket-kind filter.',
        },
      },
      message: 'Export unavailable: This export has more than 5000 events.',
    },
    {
      name: 'a trace that changed during the export',
      status: 409,
      body: {
        error: {
          code: 'EXPORT_TRACE_CHANGED',
          message:
            'The accepted events changed while this export was prepared, so it no longer matches the calculation trace. Reload the trace and try again.',
        },
      },
      message: 'no longer matches the calculation trace',
    },
  ])(
    'states $name and downloads no file',
    async ({ status, body, message }) => {
      const downloadedFilenames: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((input: RequestInfo | URL) => {
          const url = String(input);
          if (url.endsWith('/statistics/stat-innings-1?includeContributors=true')) {
            return Promise.resolve(
              response(200, {
                data: { ...inningsStatistic, contributingEvents: traceEvents(125) },
              }),
            );
          }
          if (url.endsWith('/statistics/stat-innings-1/events/export.csv')) {
            return Promise.resolve(response(status, body));
          }
          return Promise.resolve(notMocked());
        }),
      );
      stubDownloads(downloadedFilenames);

      renderRoute('/fixtures/fixture-1/statistics/stat-innings-1');

      fireEvent.click(await screen.findByRole('button', { name: 'Download CSV' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(downloadedFilenames).toEqual([]);
      expect(screen.queryByText(/export of 125 events downloaded/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download CSV' })).toBeEnabled();
    },
    10_000,
  );

  it('explains when no trace events are available to export', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(200, { data: { ...inningsStatistic, contributingEvents: [] } }),
        ),
    );

    renderRoute('/fixtures/fixture-1/statistics/stat-innings-1');

    expect(
      await screen.findByText('No accepted events are available to export for this trace.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download CSV' })).not.toBeInTheDocument();
  });

  // Every other failure test resolves a non-OK Response. A transport failure
  // rejects the fetch instead, which is what a dropped or refused connection to
  // the deployed API produces, and it was not covered.
  it('reports a transport failure as an actionable statistics error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/fixtures/fixture-1')) {
          return Promise.resolve(response(200, { data: fixture }));
        }
        if (url.endsWith('/fixtures/fixture-1/weather')) {
          return Promise.resolve(response(200, { data: unavailableWeather }));
        }
        if (url.includes('/participants?')) {
          return Promise.resolve(collection([]));
        }
        return Promise.reject(new TypeError('Failed to fetch'));
      }),
    );

    renderRoute('/fixtures/fixture-1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Published match statistics could not be requested. Try this section again.',
    );
    // The section previously discarded the reason, so every distinct failure
    // reached the reader as the same sentence.
    expect(alert).toHaveTextContent('Failed to fetch');
    expect(screen.getByRole('button', { name: 'Retry match statistics' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
    ).toBeInTheDocument();
  });

  // The application mounts no error boundary, so before this guard an exception
  // raised while displaying published statistics unmounted the whole match
  // overview: a blank section with no error state and no retry.
  it('keeps a failure to display statistics inside an actionable section', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/fixtures/fixture-1')) {
          return Promise.resolve(response(200, { data: fixture }));
        }
        if (url.endsWith('/fixtures/fixture-1/weather')) {
          return Promise.resolve(response(200, { data: unavailableWeather }));
        }
        if (url.includes('/participants?')) {
          return Promise.resolve(collection([]));
        }
        return Promise.resolve(
          response(200, {
            data: {
              fixtureId: 'fixture-1',
              status: 'complete',
              scope: { superOversIncluded: false },
              outcome,
              highestScorers: [],
              warnings: [],
              // The published contract accepts any non-empty identifier, so a
              // value the record links cannot encode is a contract-valid
              // response that throws while the section is being displayed.
              statistics: [{ ...inningsStatistic, competitorId: '\ud800' }],
            },
          }),
        );
      }),
    );

    renderRoute('/fixtures/fixture-1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Match statistics could not be loaded');
    expect(alert).toHaveTextContent('The published statistics could not be displayed.');
    expect(screen.getByRole('button', { name: 'Retry match statistics' })).toBeInTheDocument();
    // The rest of the match overview must survive the failed section.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Premier Cricket League')).toBeInTheDocument();
  });

  // Issue #475 (P01-F09 / P02-F06): the endpoint returns player statistics in person-ID
  // order and the cards were rendered in that order, so the two sides interleaved and
  // neither was in batting order. The players below are listed as the endpoint lists
  // them: Strikers are named first although Wanderers batted first. The assertion reads
  // every group heading and card in rendered order, so cards that are merely present,
  // or grouped but misordered, cannot pass.
  it('groups player cards by team in innings order, each team in batting order', async () => {
    renderFixtureStatistics([
      inningsFor('team-1', 0),
      inningsFor('team-2', 1),
      playerStatistic('9', 'Ravi Dean', 'team-2', 1),
      playerStatistic('12', 'Kai Moss', 'team-1', 2),
      playerStatistic('14', 'Owen Hart', 'team-2', 2),
      playerStatistic('15', 'Ben Ash', 'team-1', 1),
      playerStatistic('21', 'Zed Park', 'team-1', null),
      playerStatistic('27', 'Lee Grant', 'team-2', 3),
      playerStatistic('30', 'Carl Bell', 'team-2', null),
      playerStatistic('33', 'Adam Cole', 'team-1', null),
    ]);

    expect(await renderedPlayerGroups()).toEqual([
      { team: 'Wanderers', players: ['Ben Ash', 'Kai Moss', 'Adam Cole', 'Zed Park'] },
      { team: 'Strikers', players: ['Ravi Dean', 'Owen Hart', 'Lee Grant', 'Carl Bell'] },
    ]);
  });

  // A team with no innings statistic has no innings to be placed by: here Strikers never
  // batted, and one player could not be associated with a team. Those groups follow the
  // team that batted, in the order the response first names them.
  it('places teams with no innings after the teams that batted, in response order', async () => {
    renderFixtureStatistics([
      inningsFor('team-1', 0),
      playerStatistic('5', 'Nia Ford', null, null),
      playerStatistic('8', 'Tom Reid', 'team-2', null),
      playerStatistic('10', 'Ann Lowe', 'team-1', 1),
      playerStatistic('11', 'Jo Marsh', 'team-1', 2),
    ]);

    expect(await renderedPlayerGroups()).toEqual([
      { team: 'Wanderers', players: ['Ann Lowe', 'Jo Marsh'] },
      { team: 'Team name unavailable', players: ['Nia Ford'] },
      { team: 'Strikers', players: ['Tom Reid'] },
    ]);
  });
});
