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

function collection(data: unknown[], nextCursor: string | null = null) {
  return response(200, { data, pagination: { nextCursor } });
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
              startDate: '2026-08-09',
              endDate: '2026-08-09',
            },
          ],
          'next-fixture-cursor',
        ),
      )
      .mockResolvedValueOnce(collection([]))
      .mockResolvedValueOnce(collection([]));
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/fixtures?gender=female&limit=25');

    expect(await screen.findByRole('link', { name: 'Wanderers vs Strikers' })).toBeInTheDocument();
    expect(screen.getByLabelText('Gender')).toHaveValue('female');
    expect(screen.getByLabelText('Records per page')).toHaveValue('25');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/fixtures?gender=female&limit=25');

    fireEvent.click(screen.getByRole('link', { name: 'Next page' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toContain('cursor=next-fixture-cursor');

    fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'male' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2]?.[0]).toContain('gender=male');
    expect(fetchMock.mock.calls[2]?.[0]).not.toContain('cursor=');
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
          return Promise.resolve(collection([{ competitorId: 'team-1', name: 'Wanderers' }]));
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
    fireEvent.click(await screen.findByRole('option', { name: 'Wanderers' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Player name' }), {
      target: { value: 'A Pl' },
    });

    expect(await screen.findByRole('option', { name: 'A Player' })).toBeVisible();
    expect(requestedUrls.some((url) => url.includes('/fixtures?limit=100'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/competitors?limit=100'))).toBe(true);
    expect(
      requestedUrls.some((url) =>
        url.includes('/participants?fixtureId=fixture-1&competitorId=team-1&limit=100'),
      ),
    ).toBe(true);
  });

  it('opens a fixture and links its related public records', async () => {
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
      startDate: '2026-08-09',
      endDate: '2026-08-09',
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.endsWith('/fixtures/fixture-1')
              ? response(200, { data: fixture })
              : collection([fixture]),
          ),
        ),
    );

    renderRoute('/fixtures');
    fireEvent.click(await screen.findByRole('link', { name: 'Wanderers vs Strikers' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Premier Cricket League' })).toHaveAttribute(
      'href',
      '/competitions/competition-1',
    );
    expect(screen.getByRole('link', { name: 'Browse players' })).toHaveAttribute(
      'href',
      '/participants?fixtureId=fixture-1',
    );
    expect(screen.getByRole('link', { name: 'View fixture statistics' })).toHaveAttribute(
      'href',
      '/fixtures/fixture-1/statistics',
    );
    expect(screen.queryByText('Fixture ID')).not.toBeInTheDocument();
  });

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
    expect(document.querySelector('main')).not.toHaveTextContent('competition-1');
    expect(document.querySelector('main')).not.toHaveTextContent(/competitor|participant/i);
    expect(
      requestedUrls.some((url) => url.includes('/fixtures?competitionId=competition-1&limit=10')),
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
        if (url.pathname.endsWith('/fixtures')) {
          return Promise.resolve(collection([fixture]));
        }
        return Promise.resolve(collection([{ competitorId: 'team-1', name: 'Wanderers' }]));
      }),
    );

    renderRoute('/seasons/season-1');

    expect(await screen.findByRole('heading', { level: 1, name: '2026 season' })).toBeVisible();
    const relatedHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(relatedHeadings.map((heading) => heading.textContent)).toEqual(['Fixtures', 'Teams']);
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
    expect(document.querySelector('main')).not.toHaveTextContent('season-1');
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
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.endsWith(example.detailPath)
              ? response(200, { data: example.detailRecord })
              : collection([example.listRecord]),
          ),
        ),
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
