import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicApp } from '../App';
import { AuthProvider } from '../features/auth/AuthProvider';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function collection(data: unknown[], nextCursor: string | null = null, totalPages = 1) {
  return response(200, { data, pagination: { nextCursor, totalPages } });
}

function leaderboard(
  scope: { competitionId: string; competitionName: string; seasonId?: string; season?: string },
  metric: 'most_runs' | 'most_wickets',
  entries: Array<{ rank: number; participantId: string; participantName: string; value: number }>,
) {
  return response(200, {
    data: {
      scope: scope.seasonId ? 'season' : 'competition',
      competitionId: scope.competitionId,
      competitionName: scope.competitionName,
      ...(scope.seasonId ? { seasonId: scope.seasonId, season: scope.season } : {}),
      metric,
      limit: 5,
      qualification: null,
      tieBreakers: ['metricValue', 'participantName', 'participantId'],
      entries,
    },
  });
}

function playerMatch(
  fixtureId: string,
  options: {
    batting?: Record<string, number | null> | null;
    bowling?: Record<string, number | string | null> | null;
    competitionName?: string;
    startDate?: string;
    status?: 'complete' | 'partial';
    teams?: [string, string];
    warnings?: Array<{ code: string; message: string }>;
  } = {},
) {
  const teams = options.teams ?? ['Wanderers', 'Strikers'];
  const competitors = teams.map((name, index) => ({ competitorId: `team-${index + 1}`, name }));
  const competitionName = options.competitionName ?? 'Premier Cricket League';
  const startDate = options.startDate ?? '2026-08-09';

  return {
    fixture: {
      fixtureId,
      competitionId: 'competition-1',
      competitionName,
      seasonId: 'season-1',
      season: '2026',
      seasonLabel: '2026 season',
      competitors,
      matchType: 'T20',
      teamType: 'club',
      gender: 'female',
      ballsPerOver: 6,
      scheduledOvers: 20,
      venue: null,
      toss: null,
      startDate,
      endDate: startDate,
    },
    competitionName,
    competitors,
    competitor: competitors[0],
    role: 'playing_xi',
    statisticsStatus: options.status ?? 'complete',
    statisticsWarnings: options.warnings ?? [],
    batting:
      options.batting === undefined
        ? { runsScored: 42, ballsFaced: 30, fours: 5, sixes: 1, strikeRate: 140 }
        : options.batting,
    bowling:
      options.bowling === undefined
        ? {
            runsConceded: 18,
            wides: 1,
            noBalls: 0,
            legalBallsBowled: 12,
            oversBowled: '2.0',
            wicketsTaken: 2,
            economyRate: 9,
          }
        : options.bowling,
  };
}

/**
 * A participant aggregate response at career scope. The figures are chosen so
 * that none of them equals, or is the sum of, the match-history figures that
 * playerMatch produces, so a page that derived its career totals from the
 * history instead of reading them from this endpoint would show different
 * numbers.
 */
function careerAggregates(
  options: {
    none?: boolean;
    status?: 'complete' | 'partial';
    warnings?: Array<{ code: string; message: string }>;
  } = {},
) {
  return response(200, {
    data: {
      participantId: 'player-1',
      participantName: 'A Player',
      status: options.status ?? 'complete',
      scope: { superOversIncluded: false },
      warnings: options.warnings ?? [],
      statistics: options.none
        ? []
        : [
            {
              statisticId: 'stat-career-1',
              participantId: 'player-1',
              participantName: 'A Player',
              scope: 'career',
              statisticCode: 'participant_career',
              appearances: 62,
              fixtureCount: 58,
              sourceEventCount: 1677,
              batting: {
                innings: 54,
                runsScored: 1234,
                ballsFaced: 987,
                dismissals: 49,
                notOuts: 5,
                battingAverage: 25.18,
                fours: 101,
                sixes: 37,
                fifties: 7,
                hundreds: 2,
                highestScore: 112,
                highestScoreNotOut: true,
                strikeRate: 125.03,
              },
              bowling: {
                innings: 31,
                runsConceded: 842,
                wides: 24,
                noBalls: 11,
                legalBallsBowled: 690,
                wicketsTaken: 41,
                bowlingAverage: 20.54,
                bowlingStrikeRate: 16.83,
                bestBowling: { wicketsTaken: 5, runsConceded: 22 },
                fourWicketHauls: 2,
                fiveWicketHauls: 1,
                ballsPerOver: 6,
                oversBowled: '115.0',
                economyRate: 7.32,
              },
              fielding: { catches: 18, stumpings: 2, runOutInvolvements: 4 },
            },
          ],
    },
  });
}

function sectionTitled(title: string): HTMLElement {
  const section = screen.getByRole('heading', { level: 2, name: title }).closest('section');
  if (!section) {
    throw new Error(`Expected the "${title}" heading to sit inside a section.`);
  }
  return section;
}

function metricValue(container: HTMLElement, group: string, label: string): string | null {
  const region = within(container).getByRole('region', { name: group });
  return (
    within(region).getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? null
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

function createSignedOutAuthClient() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn((listener: AuthStateListener) => ({
      data: {
        subscription: {
          id: 'public-browse-test-subscription',
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

describe('public browsing pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSystemTheme();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads competitions anonymously and exposes their public records', async () => {
    let resolveRequest!: (value: Response) => void;
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/competitions');

    expect(
      screen.getByRole('heading', { level: 3, name: 'Loading competitions' }).parentElement,
    ).toHaveAttribute('role', 'status');

    resolveRequest(
      collection([{ competitionId: 'competition-1', name: 'Premier Cricket League' }]),
    );

    expect(await screen.findByRole('link', { name: 'Premier Cricket League' })).toHaveAttribute(
      'href',
      '/competitions/competition-1',
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).has('Authorization')).toBe(false);
  });

  it('shows a clear empty fixture state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(collection([])));

    renderRoute('/fixtures');

    expect(await screen.findByText('No fixtures found')).toBeInTheDocument();
    expect(screen.getByText(/No published fixtures match/i)).toBeInTheDocument();
  });

  it.each([
    { route: '/competitions', labels: ['Competition name'] },
    { route: '/seasons', labels: ['Competition'] },
    { route: '/fixtures', labels: ['Competition', 'Season', 'Team'] },
    { route: '/competitors', labels: ['Competition', 'Season', 'Team name'] },
    { route: '/participants', labels: ['Fixture', 'Team', 'Player name'] },
  ])('uses the shared name combobox pattern on $route', async ({ route, labels }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(collection([])));

    renderRoute(route);
    await screen.findByText(/^No .* found$/);

    for (const label of labels) {
      expect(screen.getByRole('combobox', { name: label })).toHaveAttribute(
        'aria-autocomplete',
        'list',
      );
    }
  });

  it('shows a safe API failure and retries the request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(503, {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Published records are unavailable.' },
        }),
      )
      .mockResolvedValueOnce(collection([]));
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/participants');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Published records are unavailable.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('No players found')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps fixture filters and the next cursor in routed interface state', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        collection(
          [
            {
              fixtureId: 'fixture-1',
              competitionId: 'competition-1',
              competitionName: 'Premier Cricket League',
              seasonId: 'season-1',
              season: '2026',
              seasonLabel: '2026',
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
            },
          ],
          'next-fixture-cursor',
          2,
        ),
      )
      .mockResolvedValueOnce(
        collection(
          [
            {
              fixtureId: 'fixture-2',
              competitionId: 'competition-1',
              competitionName: 'Premier Cricket League',
              seasonId: 'season-1',
              season: '2026',
              seasonLabel: '2026',
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
              startDate: '2026-08-10',
              endDate: '2026-08-10',
            },
          ],
          null,
          2,
        ),
      )
      .mockResolvedValueOnce(collection([]));
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/fixtures?gender=female&limit=25');

    expect(await screen.findByRole('link', { name: 'Wanderers vs Strikers' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View statistics for Wanderers vs Strikers' }),
    ).toHaveAttribute('href', '/fixtures/fixture-1/statistics');
    expect(screen.getByLabelText('Gender')).toHaveValue('female');
    expect(screen.getByLabelText('Records per page')).toHaveValue('25');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/fixtures?gender=female&limit=25');
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    fireEvent.click(screen.getByRole('link', { name: 'Next page' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toContain('cursor=next-fixture-cursor');
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();

    fireEvent.click(screen.getByRole('link', { name: 'Previous page' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2]?.[0]).not.toContain('cursor=');
    expect(await screen.findByText('No fixtures found')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'male' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3]?.[0]).toContain('gender=male');
    expect(fetchMock.mock.calls[3]?.[0]).not.toContain('cursor=');
  });

  it('routes internal relationship filters while displaying only readable names', async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        requestedUrls.push(input);
        const url = new URL(input);
        if (url.pathname.endsWith('/competitions')) {
          return Promise.resolve(
            collection([
              { competitionId: 'competition-1', name: 'Premier Cricket League' },
              { competitionId: 'competition-2', name: 'Regional Cup' },
            ]),
          );
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/fixtures');

    fireEvent.click(screen.getByRole('button', { name: 'Show competition options' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Premier Cricket League' }));
    expect(screen.getByRole('combobox', { name: 'Competition' })).toHaveValue(
      'Premier Cricket League',
    );
    expect(screen.queryByText('competition-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() =>
      expect(
        requestedUrls.some((url) => url.includes('/fixtures?competitionId=competition-1&limit=50')),
      ).toBe(true),
    );
    const summary = await screen.findByText('Active filters');
    expect(summary.parentElement).toHaveTextContent('Competition: Premier Cricket League');
    expect(summary.parentElement).not.toHaveTextContent('competition-1');
  });

  it('clears dependent selections and validates unselected typed names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const url = new URL(input);
        if (url.pathname.endsWith('/competitions')) {
          return Promise.resolve(
            collection([{ competitionId: 'competition-1', name: 'Premier Cricket League' }]),
          );
        }
        if (url.pathname.endsWith('/seasons')) {
          return Promise.resolve(
            collection([
              {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
                label: '2026',
                seasonId: 'season-1',
              },
            ]),
          );
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/fixtures');
    fireEvent.click(screen.getByRole('button', { name: 'Show competition options' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Premier Cricket League' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show season options' }));
    const seasonListbox = await screen.findByRole('listbox', { name: 'Season options' });
    fireEvent.click(within(seasonListbox).getByRole('option'));
    expect(screen.getByRole('combobox', { name: 'Season' })).toHaveValue(
      'Premier Cricket League — 2026',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear competition' }));
    expect(screen.getByRole('combobox', { name: 'Season' })).toHaveValue('');

    fireEvent.change(screen.getByRole('combobox', { name: 'Competition' }), {
      target: { value: 'Premier' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(
      screen.getByText('Choose a competition from the suggestions or clear the field.'),
    ).toBeVisible();
  });

  it('finds competition, season, and team options beyond initial pages by server-side name', async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        requestedUrls.push(input);
        const url = new URL(input);
        const name = url.searchParams.get('name');

        if (url.pathname.endsWith('/competitions')) {
          return Promise.resolve(
            name === 'World Twenty20'
              ? collection([{ competitionId: 'competition-world', name: 'World Twenty20' }])
              : collection(
                  [{ competitionId: 'competition-first', name: 'ACC Eastern Region T20' }],
                  'next-competition-page',
                ),
          );
        }
        if (url.pathname.endsWith('/seasons')) {
          return Promise.resolve(
            name === '2007'
              ? collection([
                  {
                    competitionId: 'competition-world',
                    competitionName: 'World Twenty20',
                    label: '2007',
                    seasonId: 'season-world-2007',
                  },
                ])
              : collection([], 'next-season-page'),
          );
        }
        if (url.pathname.endsWith('/competitors')) {
          return Promise.resolve(
            name === 'India'
              ? collection([{ competitorId: 'team-india', name: 'India' }])
              : collection([], 'next-team-page'),
          );
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/fixtures');

    const competition = screen.getByRole('combobox', { name: 'Competition' });
    fireEvent.change(competition, { target: { value: 'World Twenty20' } });
    fireEvent.click(await screen.findByRole('option', { name: 'World Twenty20' }));

    const season = screen.getByRole('combobox', { name: 'Season' });
    fireEvent.change(season, { target: { value: '2007' } });
    fireEvent.click(await screen.findByRole('option', { name: /World Twenty20 — 2007/ }));

    const team = screen.getByRole('combobox', { name: 'Team' });
    fireEvent.change(team, { target: { value: 'India' } });
    expect(await screen.findByRole('option', { name: 'India' })).toBeVisible();

    expect(
      requestedUrls.some((url) => url.includes('/competitions?limit=100&name=World+Twenty20')),
    ).toBe(true);
    expect(
      requestedUrls.some((url) =>
        url.includes('/seasons?competitionId=competition-world&limit=100&name=2007'),
      ),
    ).toBe(true);
    expect(
      requestedUrls.some((url) =>
        url.includes(
          '/competitors?competitionId=competition-world&seasonId=season-world-2007&limit=100&name=India',
        ),
      ),
    ).toBe(true);
    expect(requestedUrls.some((url) => url.includes('cursor=next-'))).toBe(false);
  });

  it('loads readable fixture, team, and player suggestions from public endpoints', async () => {
    const requestedUrls: string[] = [];
    const fixture = {
      fixtureId: 'fixture-1',
      competitionId: 'competition-1',
      competitionName: 'Premier Cricket League',
      seasonId: 'season-1',
      season: '2026',
      seasonLabel: '2026',
      competitors: [
        { competitorId: 'team-1', name: 'Wanderers' },
        { competitorId: 'team-2', name: 'Strikers' },
      ],
      matchType: 'T20',
      teamType: 'international',
      gender: 'female',
      ballsPerOver: 6,
      scheduledOvers: 20,
      venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
      toss: {
        winnerCompetitorId: 'team-1',
        winnerCompetitorName: 'Wanderers',
        decision: 'field',
      },
      startDate: '2026-08-09',
      endDate: '2026-08-09',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        requestedUrls.push(input);
        const url = new URL(input);
        if (url.pathname.endsWith('/fixtures')) {
          return Promise.resolve(collection([fixture]));
        }
        if (url.pathname.endsWith('/competitors')) {
          return Promise.resolve(
            url.searchParams.get('name') === 'South Africa'
              ? collection([{ competitorId: 'team-sa', name: 'South Africa' }])
              : collection([{ competitorId: 'team-1', name: 'Wanderers' }], 'teams-page-2'),
          );
        }
        if (url.pathname.endsWith('/participants') && url.searchParams.has('limit')) {
          return Promise.resolve(
            collection([{ participantId: 'player-1', displayName: 'A Player' }]),
          );
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/participants');
    fireEvent.click(screen.getByRole('button', { name: 'Show fixture options' }));
    fireEvent.click(await screen.findByRole('option', { name: /Wanderers vs Strikers/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Show team options' }));
    const teamInput = screen.getByRole('combobox', { name: 'Team' });
    fireEvent.change(teamInput, { target: { value: 'South Africa' } });
    expect(await screen.findByRole('option', { name: 'South Africa' })).toBeVisible();
    fireEvent.keyDown(teamInput, { key: 'ArrowDown' });
    fireEvent.keyDown(teamInput, { key: 'Enter' });
    expect(teamInput).toHaveValue('South Africa');
    fireEvent.change(screen.getByRole('combobox', { name: 'Player name' }), {
      target: { value: 'A Pl' },
    });

    expect(await screen.findByRole('option', { name: 'A Player' })).toBeVisible();
    expect(requestedUrls.some((url) => url.includes('/fixtures?limit=100'))).toBe(true);
    expect(
      requestedUrls.some((url) => url.includes('/competitors?limit=100&name=South+Africa')),
    ).toBe(true);
    expect(
      requestedUrls.some((url) =>
        url.includes('/participants?fixtureId=fixture-1&competitorId=team-sa&limit=100&name=A+Pl'),
      ),
    ).toBe(true);
  });

  it('opens a fixture and exposes statistics and players through local navigation', async () => {
    let resolveWeather!: (value: Response) => void;
    const requestedUrls: string[] = [];
    const fixture = {
      fixtureId: 'fixture-1',
      competitionId: 'competition-1',
      competitionName: 'Premier Cricket League',
      seasonId: 'season-1',
      season: '2026',
      seasonLabel: '2026',
      competitors: [
        { competitorId: 'team-1', name: 'Wanderers' },
        { competitorId: 'team-2', name: 'Strikers' },
      ],
      matchType: 'T20',
      teamType: 'international',
      gender: 'female',
      ballsPerOver: 6,
      scheduledOvers: 20,
      venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
      toss: {
        winnerCompetitorId: 'team-1',
        winnerCompetitorName: 'Wanderers',
        decision: 'field',
      },
      startDate: '2026-08-09',
      endDate: '2026-08-09',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        requestedUrls.push(input);
        const url = new URL(input);
        if (url.pathname.endsWith('/fixtures/fixture-1/weather')) {
          return new Promise<Response>((resolve) => {
            resolveWeather = resolve;
          });
        }
        if (url.pathname.endsWith('/fixtures/fixture-1')) {
          return Promise.resolve(response(200, { data: fixture }));
        }
        if (url.pathname.endsWith('/fixtures/fixture-1/statistics')) {
          return Promise.resolve(
            response(200, {
              data: {
                fixtureId: 'fixture-1',
                status: 'complete',
                scope: { superOversIncluded: false },
                outcome: {
                  kind: 'won',
                  winnerCompetitorId: 'team-1',
                  winnerCompetitorName: 'Wanderers',
                  eliminatorCompetitorId: null,
                  eliminatorCompetitorName: null,
                  margin: { type: 'runs', value: 12 },
                  method: null,
                  decidedByBowlOut: false,
                },
                highestScorers: [],
                warnings: [],
                statistics: [],
              },
            }),
          );
        }
        if (url.pathname.endsWith('/participants')) {
          return Promise.resolve(
            collection([{ participantId: 'player-1', displayName: 'A Player' }]),
          );
        }
        return Promise.resolve(collection([fixture]));
      }),
    );

    renderRoute('/fixtures');
    fireEvent.click(await screen.findByRole('link', { name: 'Wanderers vs Strikers' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Loading match weather…')).toBeVisible();
    resolveWeather(
      response(200, {
        data: {
          fixtureId: 'fixture-1',
          date: '2026-08-09',
          availability: 'available',
          venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
          weather: {
            date: '2026-08-09',
            latitude: -26.1929,
            longitude: 28.0305,
            temperatureMax: 24,
            temperatureMin: 11,
            precipitationSum: 0,
            windSpeedMax: 17,
          },
        },
      }),
    );
    const weatherSection = screen
      .getByRole('heading', { name: 'Match weather' })
      .closest('section');
    expect(weatherSection).not.toBeNull();
    expect(
      await within(weatherSection!).findByText('Wits Cricket Oval, Johannesburg'),
    ).toBeVisible();
    expect(within(weatherSection!).getByText('24 °C')).toBeVisible();
    expect(within(weatherSection!).getByText('11 °C')).toBeVisible();
    expect(within(weatherSection!).getByText('0 mm')).toBeVisible();
    expect(within(weatherSection!).getByText('17 km/h')).toBeVisible();
    expect(requestedUrls.some((url) => url.endsWith('/fixtures/fixture-1/weather'))).toBe(true);
    expect(screen.getByRole('link', { name: 'Premier Cricket League' })).toHaveAttribute(
      'href',
      '/competitions/competition-1',
    );
    const venueFact = screen.getByText('Venue', { selector: 'dt' }).closest('div');
    expect(venueFact).not.toBeNull();
    expect(within(venueFact!).getByText('Wits Cricket Oval, Johannesburg')).toBeVisible();
    expect(screen.getByText('Wanderers won the toss and chose to field.')).toBeVisible();
    const fixtureNavigation = screen.getByRole('navigation', { name: 'Fixture sections' });
    const statisticsLink = within(fixtureNavigation).getByRole('link', { name: 'Statistics' });
    const playersLink = within(fixtureNavigation).getByRole('link', { name: 'Players' });
    expect(statisticsLink).toHaveAttribute('href', '/fixtures/fixture-1/statistics');
    expect(playersLink).toHaveAttribute('href', '/fixtures/fixture-1/players');

    fireEvent.click(statisticsLink);
    expect(await screen.findByText('Wanderers won by 12 runs.')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Players' }));
    expect(await screen.findByRole('link', { name: 'A Player' })).toHaveAttribute(
      'href',
      '/participants/player-1',
    );
    expect(screen.queryByRole('link', { name: 'View fixture statistics' })).not.toBeInTheDocument();
    expect(screen.queryByText('Fixture ID')).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'unavailable weather',
      weatherStatus: 200,
      weatherBody: {
        data: {
          fixtureId: 'fixture-1',
          date: '2026-08-09',
          availability: 'unavailable',
          reason: 'MISSING_COORDINATES',
          venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
          weather: null,
        },
      },
      message: 'Weather is unavailable for this fixture’s venue.',
      fixtureVenue: null,
      fixtureToss: {
        winnerCompetitorId: 'team-1',
        winnerCompetitorName: 'Wanderers',
        decision: 'field',
      },
      expectedVenue: 'Venue unavailable',
      expectedToss: 'Wanderers won the toss and chose to field.',
      retry: false,
    },
    {
      name: 'weather provider errors',
      weatherStatus: 503,
      weatherBody: {
        error: {
          code: 'WEATHER_SERVICE_UNAVAILABLE',
          message: 'Weather is temporarily unavailable.',
        },
      },
      message: 'Weather could not be loaded. The match overview is still available.',
      fixtureVenue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
      fixtureToss: null,
      expectedVenue: 'Wits Cricket Oval, Johannesburg',
      expectedToss: 'Toss information unavailable',
      retry: true,
      retryWeather: {
        data: {
          fixtureId: 'fixture-1',
          date: '2026-08-09',
          availability: 'available',
          venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
          weather: {
            date: '2026-08-09',
            latitude: -26.1929,
            longitude: 28.0305,
            temperatureMax: 24,
            temperatureMin: 11,
            precipitationSum: 0,
            windSpeedMax: 17,
          },
        },
      },
    },
  ])(
    'keeps the fixture overview usable during $name',
    async ({
      weatherStatus,
      weatherBody,
      message,
      fixtureVenue,
      fixtureToss,
      expectedVenue,
      expectedToss,
      retry,
      retryWeather,
    }) => {
      const fixture = {
        fixtureId: 'fixture-1',
        competitionId: 'competition-1',
        competitionName: 'Premier Cricket League',
        seasonId: 'season-1',
        season: '2026',
        seasonLabel: '2026',
        competitors: [
          { competitorId: 'team-1', name: 'Wanderers' },
          { competitorId: 'team-2', name: 'Strikers' },
        ],
        matchType: 'T20',
        teamType: 'international',
        gender: 'female',
        ballsPerOver: 6,
        scheduledOvers: 20,
        venue: fixtureVenue,
        toss: fixtureToss,
        startDate: '2026-08-09',
        endDate: '2026-08-09',
      };
      let weatherRequests = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((input: string) => {
          const url = new URL(input);
          if (url.pathname.endsWith('/fixtures/fixture-1/weather')) {
            weatherRequests += 1;
            if (weatherRequests === 2 && retryWeather) {
              return Promise.resolve(response(200, retryWeather));
            }
            return Promise.resolve(response(weatherStatus, weatherBody));
          }
          if (url.pathname.endsWith('/fixtures/fixture-1')) {
            return Promise.resolve(response(200, { data: fixture }));
          }
          if (url.pathname.endsWith('/fixtures/fixture-1/statistics')) {
            return Promise.resolve(
              response(200, {
                data: {
                  fixtureId: 'fixture-1',
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
                  highestScorers: [],
                  warnings: [],
                  statistics: [],
                },
              }),
            );
          }
          return Promise.resolve(collection([]));
        }),
      );

      renderRoute('/fixtures/fixture-1');

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
      ).toBeVisible();
      expect(await screen.findByText(message)).toBeVisible();
      expect(screen.getByText('Premier Cricket League')).toBeVisible();
      expect(screen.getByText(expectedVenue)).toBeVisible();
      expect(screen.getByText(expectedToss)).toBeVisible();
      if (retry) {
        expect(screen.getByRole('button', { name: 'Try weather again' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Try weather again' }));
        await waitFor(() => expect(weatherRequests).toBe(2));
        expect(
          screen.getAllByText('Wits Cricket Oval, Johannesburg').length,
        ).toBeGreaterThanOrEqual(2);
      } else {
        expect(screen.queryByRole('button', { name: 'Try weather again' })).not.toBeInTheDocument();
      }
    },
  );

  it('displays readable seasons, season-grouped fixtures, and teams on a competition overview', async () => {
    const requestedUrls: string[] = [];
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        requestedUrls.push(input);
        const url = new URL(input);
        if (url.pathname.endsWith('/competitions/competition-1')) {
          return Promise.resolve(
            response(200, {
              data: { competitionId: 'competition-1', name: 'Premier Cricket League' },
            }),
          );
        }
        if (url.pathname.endsWith('/seasons')) {
          return Promise.resolve(
            collection([
              {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
                label: '2026 season',
                seasonId: 'season-1',
              },
            ]),
          );
        }
        if (url.pathname.endsWith('/fixtures')) {
          return Promise.resolve(collection([fixture]));
        }
        if (url.pathname.endsWith('/statistics/leaderboards')) {
          const metric = url.searchParams.get('metric') as 'most_runs' | 'most_wickets';
          return Promise.resolve(
            leaderboard(
              {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
              },
              metric,
              [
                {
                  rank: 1,
                  participantId: metric === 'most_runs' ? 'batter-1' : 'bowler-1',
                  participantName: metric === 'most_runs' ? 'Leading Batter' : 'Leading Bowler',
                  value: metric === 'most_runs' ? 312 : 9,
                },
              ],
            ),
          );
        }
        return Promise.resolve(collection([{ competitorId: 'team-1', name: 'Wanderers' }]));
      }),
    );

    renderRoute('/competitions/competition-1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Premier Cricket League' }),
    ).toBeVisible();
    const fixturesSection = screen
      .getByRole('heading', { level: 2, name: 'Fixtures by season' })
      .closest('section');
    expect(fixturesSection).not.toBeNull();
    expect(within(fixturesSection!).getByRole('link', { name: '2026 season' })).toHaveAttribute(
      'href',
      '/seasons/season-1',
    );
    expect(
      within(fixturesSection!).getByRole('link', { name: 'Wanderers vs Strikers' }),
    ).toHaveAttribute('href', '/fixtures/fixture-1');
    expect(screen.getByRole('link', { name: 'Wanderers' })).toHaveAttribute(
      'href',
      '/competitors/team-1',
    );
    expect(await screen.findByRole('link', { name: 'Leading Batter' })).toHaveAttribute(
      'href',
      '/participants/batter-1',
    );
    expect(screen.getByRole('link', { name: 'Leading Bowler' })).toHaveAttribute(
      'href',
      '/participants/bowler-1',
    );
    expect(document.querySelector('main')).not.toHaveTextContent('competition-1');
    expect(document.querySelector('main')).not.toHaveTextContent(/competitor|participant/i);
    expect(
      requestedUrls.some((url) => url.includes('/fixtures?competitionId=competition-1&limit=10')),
    ).toBe(true);
    expect(
      requestedUrls.some((url) =>
        url.includes(
          '/statistics/leaderboards?scope=competition&metric=most_runs&limit=5&competitionId=competition-1',
        ),
      ),
    ).toBe(true);
  });

  it('displays a season competition name, fixtures first, and participating teams', async () => {
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const url = new URL(input);
        if (url.pathname.endsWith('/seasons/season-1')) {
          return Promise.resolve(
            response(200, {
              data: {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
                label: '2026 season',
                seasonId: 'season-1',
              },
            }),
          );
        }
        if (url.pathname.endsWith('/statistics/leaderboards')) {
          const metric = url.searchParams.get('metric') as 'most_runs' | 'most_wickets';
          return Promise.resolve(
            leaderboard(
              {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
                seasonId: 'season-1',
                season: '2026 season',
              },
              metric,
              [
                {
                  rank: 1,
                  participantId: metric === 'most_runs' ? 'batter-1' : 'bowler-1',
                  participantName: metric === 'most_runs' ? 'Season Batter' : 'Season Bowler',
                  value: metric === 'most_runs' ? 200 : 7,
                },
              ],
            ),
          );
        }
        if (url.pathname.endsWith('/fixtures')) {
          return Promise.resolve(collection([fixture]));
        }
        return Promise.resolve(collection([{ competitorId: 'team-1', name: 'Wanderers' }]));
      }),
    );

    renderRoute('/seasons/season-1');

    expect(await screen.findByRole('heading', { level: 1, name: '2026 season' })).toBeVisible();
    const relatedHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(relatedHeadings.map((heading) => heading.textContent)).toEqual([
      'Season leaders',
      'Fixtures',
      'Teams',
    ]);
    expect(screen.getByRole('link', { name: 'Premier Cricket League' })).toHaveAttribute(
      'href',
      '/competitions/competition-1',
    );
    expect(await screen.findByRole('link', { name: 'Wanderers vs Strikers' })).toHaveAttribute(
      'href',
      '/fixtures/fixture-1',
    );
    expect(screen.getByRole('link', { name: 'Wanderers' })).toHaveAttribute(
      'href',
      '/competitors/team-1',
    );
    expect(await screen.findByRole('link', { name: 'Season Batter' })).toHaveAttribute(
      'href',
      '/participants/batter-1',
    );
    expect(document.querySelector('main')).not.toHaveTextContent('season-1');
  });

  it('keeps leaderboard failures and empty results independent and preserves zero values on retry', async () => {
    let runRequests = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const url = new URL(input);
        if (url.pathname.endsWith('/seasons/season-1')) {
          return Promise.resolve(
            response(200, {
              data: {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
                label: '2026 season',
                seasonId: 'season-1',
              },
            }),
          );
        }
        if (url.pathname.endsWith('/statistics/leaderboards')) {
          const metric = url.searchParams.get('metric') as 'most_runs' | 'most_wickets';
          if (metric === 'most_runs') {
            runRequests += 1;
            if (runRequests === 1) {
              return Promise.resolve(
                response(503, {
                  error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Ranking is temporarily unavailable.',
                  },
                }),
              );
            }
            return Promise.resolve(
              leaderboard(
                {
                  competitionId: 'competition-1',
                  competitionName: 'Premier Cricket League',
                  seasonId: 'season-1',
                  season: '2026 season',
                },
                metric,
                [{ rank: 1, participantId: 'batter-1', participantName: 'Zero Batter', value: 0 }],
              ),
            );
          }
          return Promise.resolve(
            leaderboard(
              {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
                seasonId: 'season-1',
                season: '2026 season',
              },
              metric,
              [],
            ),
          );
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/seasons/season-1');

    expect(
      await screen.findByRole('heading', { name: 'Leading run scorers could not be loaded' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'No ranked players available' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry leading run scorers' }));

    const table = await screen.findByRole('table', {
      name: 'Leading run scorers for 2026 season',
    });
    expect(within(table).getByRole('link', { name: 'Zero Batter' })).toHaveAttribute(
      'href',
      '/participants/batter-1',
    );
    expect(within(table).getByRole('cell', { name: '0' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'No ranked players available' })).toBeVisible();
  });

  it('displays a team fixture history and readable players', async () => {
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const url = new URL(input);
        if (url.pathname.endsWith('/competitors/team-1')) {
          return Promise.resolve(
            response(200, { data: { competitorId: 'team-1', name: 'Wanderers' } }),
          );
        }
        if (url.pathname.endsWith('/fixtures')) {
          return Promise.resolve(collection([fixture]));
        }
        return Promise.resolve(
          collection([{ participantId: 'player-1', displayName: 'A Player' }]),
        );
      }),
    );

    renderRoute('/competitors/team-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Wanderers' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Wanderers vs Strikers' })).toHaveAttribute(
      'href',
      '/fixtures/fixture-1',
    );
    expect(screen.getByRole('link', { name: 'A Player' })).toHaveAttribute(
      'href',
      '/participants/player-1',
    );
    expect(document.querySelector('main')).not.toHaveTextContent('team-1');
    expect(document.querySelector('main')).not.toHaveTextContent(/competitor|participant/i);
  });

  it('keeps related loading, error, retry, empty, and pagination states independent', async () => {
    let resolveSeasonRequest!: (value: Response) => void;
    let seasonRequestCount = 0;
    const requestedUrls: string[] = [];
    const fixture = (fixtureId: string, teams: string[]) => ({
      fixtureId,
      competitionId: 'competition-1',
      competitionName: 'Premier Cricket League',
      seasonId: 'season-1',
      season: '2026',
      seasonLabel: '2026 season',
      competitors: teams.map((name, index) => ({ competitorId: `team-${index + 1}`, name })),
      matchType: 'T20',
      teamType: 'international',
      gender: 'female',
      ballsPerOver: 6,
      scheduledOvers: 20,
      venue: null,
      toss: null,
      startDate: '2026-08-09',
      endDate: '2026-08-09',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        requestedUrls.push(input);
        const url = new URL(input);
        if (url.pathname.endsWith('/competitions/competition-1')) {
          return Promise.resolve(
            response(200, {
              data: { competitionId: 'competition-1', name: 'Premier Cricket League' },
            }),
          );
        }
        if (url.pathname.endsWith('/seasons')) {
          seasonRequestCount += 1;
          if (seasonRequestCount === 1) {
            return new Promise<Response>((resolve) => {
              resolveSeasonRequest = resolve;
            });
          }
          return Promise.resolve(
            collection([
              {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
                label: '2026 season',
                seasonId: 'season-1',
              },
            ]),
          );
        }
        if (url.pathname.endsWith('/statistics/leaderboards')) {
          return Promise.resolve(
            leaderboard(
              {
                competitionId: 'competition-1',
                competitionName: 'Premier Cricket League',
              },
              url.searchParams.get('metric') as 'most_runs' | 'most_wickets',
              [],
            ),
          );
        }
        if (url.pathname.endsWith('/fixtures')) {
          return Promise.resolve(
            url.searchParams.has('cursor')
              ? collection([fixture('fixture-2', ['Titans', 'Lions'])])
              : collection([fixture('fixture-1', ['Wanderers', 'Strikers'])], 'next-fixtures'),
          );
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/competitions/competition-1');

    expect(await screen.findByRole('heading', { level: 3, name: 'Loading seasons' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: 'No teams found' })).toBeVisible();

    resolveSeasonRequest(
      response(503, {
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Published seasons are unavailable.' },
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Published seasons could not be requested. Try this section again.',
    );
    expect(screen.getByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Retry seasons' }));
    expect(await screen.findByRole('link', { name: '2026 season' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Next fixtures page' }));
    expect(await screen.findByRole('link', { name: 'Titans vs Lions' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: '2026 season' })).not.toHaveLength(0);
    expect(screen.getByRole('heading', { level: 3, name: 'No teams found' })).toBeVisible();
    expect(requestedUrls.some((url) => url.includes('cursor=next-fixtures'))).toBe(true);
  });

  it('shows paginated player match history with readable links and reused performance figures', async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((requestUrl: string) => {
        const url = new URL(requestUrl);
        requestedUrls.push(requestUrl);
        if (url.pathname.endsWith('/participants/player-1')) {
          return Promise.resolve(
            response(200, { data: { participantId: 'player-1', displayName: 'A Player' } }),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/fixtures')) {
          return Promise.resolve(
            url.searchParams.has('cursor')
              ? collection([
                  playerMatch('fixture-2', {
                    startDate: '2026-07-02',
                    teams: ['Wanderers', 'Titans'],
                  }),
                ])
              : collection([playerMatch('fixture-1')], 'next-matches'),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/statistics')) {
          return Promise.resolve(careerAggregates());
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/participants/player-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Wanderers vs Strikers' })).toHaveAttribute(
      'href',
      '/fixtures/fixture-1',
    );
    expect(screen.getByRole('link', { name: 'Premier Cricket League' })).toHaveAttribute(
      'href',
      '/competitions/competition-1',
    );
    expect(screen.getByRole('link', { name: '2026 season' })).toHaveAttribute(
      'href',
      '/seasons/season-1',
    );
    expect(screen.getByRole('link', { name: 'Wanderers' })).toHaveAttribute(
      'href',
      '/competitors/team-1',
    );
    expect(screen.getByText(/Playing Xi/)).toBeVisible();
    expect(screen.getByText('42')).toBeVisible();
    expect(screen.getByText('2.0')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Next matches page' }));
    expect(await screen.findByRole('link', { name: 'Wanderers vs Titans' })).toBeVisible();
    expect(requestedUrls.some((url) => url.includes('cursor=next-matches'))).toBe(true);
    expect(document.querySelector('main')).not.toHaveTextContent(
      /player-1|fixture-2|competition-1|season-1|team-1/,
    );
  });

  it('keeps the player visible while match history errors, retries, and explains partial data', async () => {
    let historyRequests = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((requestUrl: string) => {
        const url = new URL(requestUrl);
        if (url.pathname.endsWith('/participants/player-1')) {
          return Promise.resolve(
            response(200, { data: { participantId: 'player-1', displayName: 'A Player' } }),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/fixtures')) {
          historyRequests += 1;
          return Promise.resolve(
            historyRequests === 1
              ? response(503, {
                  error: { code: 'SERVICE_UNAVAILABLE', message: 'History unavailable.' },
                })
              : collection([
                  playerMatch('fixture-1', {
                    batting: null,
                    bowling: null,
                    status: 'partial',
                    warnings: [
                      {
                        code: 'NO_ACCEPTED_EVENTS',
                        message: 'No published delivery events are available for this match.',
                      },
                    ],
                  }),
                ]),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/statistics')) {
          return Promise.resolve(careerAggregates());
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/participants/player-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
    expect(await screen.findByRole('alert')).toHaveTextContent('Match history could not be loaded');
    expect(screen.getByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
    // The failed history must not take the independently loaded career totals with it.
    expect((await within(sectionTitled('Career totals')).findAllByText('1234'))[0]).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Retry matches' }));
    expect(await screen.findByText('Partial data')).toBeVisible();
    expect(
      screen.getByText('No published delivery events are available for this match.'),
    ).toBeVisible();
    expect(
      screen.getByText(
        'No batting or bowling figures are published for this player in this match.',
      ),
    ).toBeVisible();
  });

  it('shows loading and empty states for a player with no published matches', async () => {
    let resolveHistory!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((requestUrl: string) => {
        const url = new URL(requestUrl);
        if (url.pathname.endsWith('/participants/player-1')) {
          return Promise.resolve(
            response(200, { data: { participantId: 'player-1', displayName: 'A Player' } }),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/statistics')) {
          return Promise.resolve(careerAggregates());
        }
        return new Promise<Response>((resolve) => {
          resolveHistory = resolve;
        });
      }),
    );

    renderRoute('/participants/player-1');

    expect(await screen.findByRole('heading', { level: 3, name: 'Loading matches' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
    resolveHistory(collection([]));
    expect(
      await screen.findByRole('heading', { level: 3, name: 'No matches found' }),
    ).toBeVisible();
    expect(
      screen.getByText('No published match history is available for this player.'),
    ).toBeVisible();
  });

  it('shows career totals from the participant aggregate endpoint alongside the match history', async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((requestUrl: string) => {
        const url = new URL(requestUrl);
        requestedUrls.push(requestUrl);
        if (url.pathname.endsWith('/participants/player-1')) {
          return Promise.resolve(
            response(200, { data: { participantId: 'player-1', displayName: 'A Player' } }),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/fixtures')) {
          return Promise.resolve(collection([playerMatch('fixture-1')]));
        }
        if (url.pathname.endsWith('/participants/player-1/statistics')) {
          return Promise.resolve(careerAggregates());
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/participants/player-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
    const career = sectionTitled('Career totals');
    await within(career).findByText('Complete data');

    // Every figure is the endpoint's career level, paired with its own label.
    expect(metricValue(career, 'Batting statistics', 'Runs')).toBe('1234');
    expect(metricValue(career, 'Batting statistics', 'Balls faced')).toBe('987');
    expect(metricValue(career, 'Batting statistics', 'Strike rate')).toBe('125.03');
    expect(metricValue(career, 'Batting statistics', 'Fours')).toBe('101');
    expect(metricValue(career, 'Batting statistics', 'Sixes')).toBe('37');
    expect(metricValue(career, 'Bowling statistics', 'Runs conceded')).toBe('842');
    expect(metricValue(career, 'Bowling statistics', 'Wides')).toBe('24');
    expect(metricValue(career, 'Bowling statistics', 'No-balls')).toBe('11');
    expect(metricValue(career, 'Bowling statistics', 'Overs')).toBe('115.0');
    expect(metricValue(career, 'Bowling statistics', 'Economy rate')).toBe('7.32');
    expect(metricValue(career, 'Bowling statistics', 'Wickets')).toBe('41');
    expect(career).toHaveTextContent(
      'Based on 1677 accepted events from 58 matches in which this player batted or bowled.',
    );

    // The match history is still rendered, with its own per-match figures.
    const history = sectionTitled('Match history');
    expect(
      await within(history).findByRole('link', { name: 'Wanderers vs Strikers' }),
    ).toBeVisible();
    expect(metricValue(history, 'Batting statistics', 'Runs')).toBe('42');
    expect(metricValue(history, 'Bowling statistics', 'Wides')).toBe('1');
    expect(metricValue(history, 'Bowling statistics', 'No-balls')).toBe('0');
    expect(within(career).queryByText('42')).not.toBeInTheDocument();

    // One resource request at career scope. The endpoint does not page, so the
    // client must neither send a cursor nor cap it with a page size.
    const aggregateRequests = requestedUrls
      .map((requestUrl) => new URL(requestUrl))
      .filter((url) => url.pathname.endsWith('/participants/player-1/statistics'));
    expect(aggregateRequests).toHaveLength(1);
    expect(aggregateRequests[0]?.search).toBe('');
    expect(document.querySelector('main')).not.toHaveTextContent(/player-1|stat-career-1/);
  });

  it('requests the career totals and the match history concurrently with independent loading states', async () => {
    const requestedPaths: string[] = [];
    let resolveCareer!: (value: Response) => void;
    let resolveHistory!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((requestUrl: string) => {
        const url = new URL(requestUrl);
        requestedPaths.push(url.pathname);
        if (url.pathname.endsWith('/participants/player-1')) {
          return Promise.resolve(
            response(200, { data: { participantId: 'player-1', displayName: 'A Player' } }),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/statistics')) {
          return new Promise<Response>((resolve) => {
            resolveCareer = resolve;
          });
        }
        if (url.pathname.endsWith('/participants/player-1/fixtures')) {
          return new Promise<Response>((resolve) => {
            resolveHistory = resolve;
          });
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/participants/player-1');

    // Both requests are in flight while neither has been answered. Issued in
    // sequence, the second would not start until the first resolved.
    await waitFor(() =>
      expect(requestedPaths).toEqual(
        expect.arrayContaining([
          '/api/v1/participants/player-1/statistics',
          '/api/v1/participants/player-1/fixtures',
        ]),
      ),
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Loading career totals' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: 'Loading matches' })).toBeVisible();

    resolveHistory(collection([playerMatch('fixture-1')]));
    expect(await screen.findByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: 'Loading career totals' })).toBeVisible();

    resolveCareer(careerAggregates());
    expect((await within(sectionTitled('Career totals')).findAllByText('1234'))[0]).toBeVisible();
    expect(screen.getByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();
  });

  it('states that a player with no accepted deliveries has no career totals without hiding the match history', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((requestUrl: string) => {
        const url = new URL(requestUrl);
        if (url.pathname.endsWith('/participants/player-1')) {
          return Promise.resolve(
            response(200, { data: { participantId: 'player-1', displayName: 'A Player' } }),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/fixtures')) {
          // Selected for a match without batting or bowling: history, but no figures.
          return Promise.resolve(
            collection([playerMatch('fixture-1', { batting: null, bowling: null })]),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/statistics')) {
          return Promise.resolve(
            careerAggregates({
              none: true,
              status: 'partial',
              warnings: [
                {
                  code: 'NO_ACCEPTED_EVENTS',
                  message: 'The participant has no accepted standard delivery events.',
                },
              ],
            }),
          );
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/participants/player-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
    const career = sectionTitled('Career totals');
    expect(
      await within(career).findByRole('heading', { level: 3, name: 'No career totals available' }),
    ).toBeVisible();
    expect(
      within(career).getByText('The participant has no accepted standard delivery events.'),
    ).toBeVisible();
    // An absence is not reported as a career of zeroes.
    expect(within(career).queryByRole('region', { name: 'Batting statistics' })).toBeNull();
    expect(within(career).queryByText('0')).toBeNull();

    expect(await screen.findByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();
    expect(
      screen.getByText(
        'No batting or bowling figures are published for this player in this match.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'an error response',
      failure: () =>
        Promise.resolve(
          response(503, {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Career totals are temporarily unavailable.',
            },
          }),
        ),
      reason: 'Career totals are temporarily unavailable.',
    },
    {
      name: 'a transport failure',
      failure: () => Promise.reject(new TypeError('Failed to fetch')),
      reason: 'Failed to fetch',
    },
  ])(
    'keeps the match history and states the failure when the career request fails with $name',
    async ({ failure, reason }) => {
      let careerRequests = 0;
      let historyRequests = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((requestUrl: string) => {
          const url = new URL(requestUrl);
          if (url.pathname.endsWith('/participants/player-1')) {
            return Promise.resolve(
              response(200, { data: { participantId: 'player-1', displayName: 'A Player' } }),
            );
          }
          if (url.pathname.endsWith('/participants/player-1/fixtures')) {
            historyRequests += 1;
            return Promise.resolve(collection([playerMatch('fixture-1')]));
          }
          if (url.pathname.endsWith('/participants/player-1/statistics')) {
            careerRequests += 1;
            return careerRequests === 1 ? failure() : Promise.resolve(careerAggregates());
          }
          return Promise.resolve(collection([]));
        }),
      );

      renderRoute('/participants/player-1');

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Career totals could not be loaded');
      expect(alert).toHaveTextContent(
        'Published career totals could not be requested. Try this section again.',
      );
      expect(alert).toHaveTextContent(reason);
      expect(sectionTitled('Career totals')).toContainElement(alert);

      // The history is unaffected: rendered, with its figures, and not in error.
      expect(await screen.findByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();
      expect(metricValue(sectionTitled('Match history'), 'Batting statistics', 'Runs')).toBe('42');
      expect(screen.getAllByRole('alert')).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: 'Retry career totals' }));
      expect((await within(sectionTitled('Career totals')).findAllByText('1234'))[0]).toBeVisible();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(careerRequests).toBe(2);
      // Retrying one section does not re-request the other.
      expect(historyRequests).toBe(1);
    },
  );

  // Before #476 the player page had no error boundary, so this contract-valid
  // record, whose competition identifier cannot be encoded into a link, unmounted
  // the entire page: no heading, no error and no retry.
  it('keeps a failure to display the match history inside its section beside the career totals', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let historyRequests = 0;
    const unencodable = playerMatch('fixture-1');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((requestUrl: string) => {
        const url = new URL(requestUrl);
        if (url.pathname.endsWith('/participants/player-1')) {
          return Promise.resolve(
            response(200, { data: { participantId: 'player-1', displayName: 'A Player' } }),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/fixtures')) {
          historyRequests += 1;
          return Promise.resolve(
            collection([
              historyRequests === 1
                ? { ...unencodable, fixture: { ...unencodable.fixture, competitionId: '\ud800' } }
                : playerMatch('fixture-1'),
            ]),
          );
        }
        if (url.pathname.endsWith('/participants/player-1/statistics')) {
          return Promise.resolve(careerAggregates());
        }
        return Promise.resolve(collection([]));
      }),
    );

    renderRoute('/participants/player-1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Match history could not be loaded');
    expect(alert).toHaveTextContent('The published match history could not be displayed.');
    expect(sectionTitled('Match history')).toContainElement(alert);
    expect(screen.getByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
    expect((await within(sectionTitled('Career totals')).findAllByText('1234'))[0]).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Retry matches' }));
    expect(await screen.findByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(historyRequests).toBe(2);
  });

  it.each([
    {
      listPath: '/competitors',
      detailPath: '/competitors/competitor-1',
      linkName: 'Wanderers',
      listRecord: { competitorId: 'competitor-1', name: 'Wanderers' },
      detailRecord: { competitorId: 'competitor-1', name: 'Wanderers' },
      heading: 'Wanderers',
    },
    {
      listPath: '/participants',
      detailPath: '/participants/participant-1',
      linkName: 'A Player',
      listRecord: { participantId: 'participant-1', displayName: 'A Player' },
      detailRecord: { participantId: 'participant-1', displayName: 'A Player' },
      heading: 'A Player',
    },
  ])('opens $linkName from its public collection', async (example) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith(example.detailPath)) {
          return Promise.resolve(response(200, { data: example.detailRecord }));
        }
        if (url.includes(`${example.detailPath}/fixtures?`)) {
          return Promise.resolve(collection([]));
        }
        return Promise.resolve(collection([example.listRecord]));
      }),
    );

    renderRoute(example.listPath);
    fireEvent.click(await screen.findByRole('link', { name: example.linkName }));

    expect(
      await screen.findByRole('heading', { level: 1, name: example.heading }),
    ).toBeInTheDocument();
  });

  it('browses seasons and links them to their competitions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          url.includes('/competitions?')
            ? collection([{ competitionId: 'competition-1', name: 'Premier Cricket League' }])
            : collection([
                {
                  seasonId: 'season-2026',
                  competitionId: 'competition-1',
                  competitionName: 'Premier Cricket League',
                  label: '2026',
                },
              ]),
        ),
      ),
    );

    renderRoute('/seasons?competitionId=competition-1');

    expect(await screen.findByRole('link', { name: '2026' })).toHaveAttribute(
      'href',
      '/seasons/season-2026',
    );
    expect(screen.getAllByText('Premier Cricket League')).not.toHaveLength(0);
    expect(screen.queryByText('competition-1')).not.toBeInTheDocument();
  });
});
