import type { Page } from '@playwright/test';

// Shared, deliberately small public record used by the route-wide quality audits
// (issue #800). Workflow-specific specs keep their own richer fixtures.

const fixture = {
  fixtureId: 'fixture-1',
  competitionId: 'competition-1',
  competitionName: 'Premier Cricket League',
  seasonId: 'season-1',
  season: '2026',
  seasonLabel: '2026 season',
  competitors: [
    { competitorId: 'competitor-1', name: 'Wanderers' },
    { competitorId: 'competitor-2', name: 'Strikers' },
  ],
  matchType: 'T20',
  teamType: 'international',
  gender: 'female',
  ballsPerOver: 6,
  scheduledOvers: 20,
  venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
  toss: {
    winnerCompetitorId: 'competitor-1',
    winnerCompetitorName: 'Wanderers',
    decision: 'field',
  },
  startDate: '2026-08-09',
  endDate: '2026-08-09',
};

const inningsStatistic = {
  statisticId: 'stat-innings-1',
  fixtureId: 'fixture-1',
  scope: 'innings',
  statisticCode: 'team_total',
  inningsId: 'innings-1',
  inningsOrdinal: 0,
  competitorId: 'competitor-1',
  competitorName: 'Wanderers',
  sourceEventCount: 12,
  metrics: {
    deliveryRuns: 104,
    penaltyRuns: 0,
    totalRuns: 104,
    wicketsLost: 3,
    legalBalls: 72,
    overs: '12.0',
    runRate: 8.67,
    powerplay: null,
    extras: { total: 7, wides: 3, noBalls: 1, byes: 0, legByes: 3, penaltyRuns: 0 },
  },
};

const playerStatistic = {
  statisticId: 'stat-player-1',
  fixtureId: 'fixture-1',
  scope: 'participant',
  statisticCode: 'participant_fixture',
  participantId: 'participant-1',
  participantName: 'A Player',
  competitorId: 'competitor-1',
  competitorName: 'Wanderers',
  sourceEventCount: 8,
  battingPosition: 1,
  battingParticipation: 'batted',
  dismissal: { status: 'not_out', kind: null, eventId: null },
  batting: { runsScored: 42, ballsFaced: 30, strikeRate: 140, fours: 5, sixes: 1 },
  bowling: null,
};

const collection = (data: unknown[]) => ({ data, pagination: { nextCursor: null, totalPages: 1 } });

export type MockRole = 'signed-out' | 'admin';

/** Signs the browser in as an approved administrator so every workspace route renders. */
async function signInAsAdministrator(page: Page) {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1_000);
    window.localStorage.setItem(
      'supabase.auth.token',
      JSON.stringify({
        access_token: 'approved-e2e-token',
        refresh_token: 'managed-by-supabase',
        expires_in: 3_600,
        expires_at: now + 3_600,
        token_type: 'bearer',
        user: {
          id: 'admin-user',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'admin@example.com',
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: '2026-08-16T00:00:00.000Z',
        },
      }),
    );
  });
}

/**
 * Serves one published fixture with statistics, and empty collections for every
 * other read, which also exercises each workspace's empty state.
 */
export async function mockPublishedRecord(page: Page, role: MockRole = 'signed-out') {
  if (role === 'admin') await signInAsAdministrator(page);

  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });

    if (path === '/auth/me') {
      return role === 'admin'
        ? json({
            user: {
              id: '1',
              subject: 'admin-user',
              displayName: 'Admin User',
              role: 'admin',
              approvalState: 'approved',
              requestedCompetition: null,
              competitionIds: [],
            },
          })
        : json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in.' } }, 401);
    }
    if (path === '/fixtures/fixture-1/statistics') {
      return json({
        data: {
          fixtureId: 'fixture-1',
          status: 'complete',
          scope: { superOversIncluded: false },
          outcome: {
            kind: 'won',
            winnerCompetitorId: 'competitor-1',
            winnerCompetitorName: 'Wanderers',
            eliminatorCompetitorId: null,
            eliminatorCompetitorName: null,
            margin: { type: 'runs', value: 12 },
            method: null,
            decidedByBowlOut: false,
          },
          highestScorers: [],
          warnings: [],
          statistics: [inningsStatistic, playerStatistic],
        },
      });
    }
    if (path.startsWith('/fixtures/fixture-1/statistics/')) {
      return json({ data: { ...inningsStatistic, contributingEvents: [] } });
    }
    if (path === '/fixtures/fixture-1/weather') {
      return json({
        data: {
          fixtureId: 'fixture-1',
          date: '2026-08-09',
          availability: 'available',
          venue: fixture.venue,
          weather: {
            date: '2026-08-09',
            latitude: -26.19,
            longitude: 28.03,
            temperatureMax: 24,
            temperatureMin: 11,
            precipitationSum: 0,
            windSpeedMax: 17,
          },
        },
      });
    }
    if (path === '/fixtures/fixture-1') return json({ data: fixture });
    if (path === '/fixtures') return json(collection([fixture]));
    if (path === '/competitions/competition-1') {
      return json({ data: { competitionId: 'competition-1', name: 'Premier Cricket League' } });
    }
    if (path === '/competitions') {
      return json(collection([{ competitionId: 'competition-1', name: 'Premier Cricket League' }]));
    }
    if (path === '/seasons/season-1' || path === '/seasons') {
      const season = {
        competitionId: 'competition-1',
        competitionName: 'Premier Cricket League',
        label: '2026 season',
        seasonId: 'season-1',
      };
      return json(path === '/seasons' ? collection([season]) : { data: season });
    }
    if (path === '/competitors/competitor-1') {
      return json({ data: { competitorId: 'competitor-1', name: 'Wanderers' } });
    }
    if (path === '/competitors') {
      return json(collection(fixture.competitors));
    }
    if (path === '/participants/participant-1') {
      return json({ data: { participantId: 'participant-1', displayName: 'A Player' } });
    }
    if (path === '/participants') {
      return json(collection([{ participantId: 'participant-1', displayName: 'A Player' }]));
    }
    if (/^\/participants\/[^/]+\/fixtures/.test(path)) return json(collection([]));
    if (/^\/participants\/[^/]+\/statistics/.test(path)) return json(collection([]));
    if (path === '/dataset-releases') return json({ data: [] });

    return route.request().method() === 'GET'
      ? json(collection([]))
      : json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404);
  });
}

export async function selectTheme(page: Page, theme: 'day' | 'night') {
  await page.addInitScript((selected) => {
    window.localStorage.setItem('statsthegame-theme', selected);
  }, theme);
}

/** Every normal user-facing route reviewed by issue #800. */
export const reviewedRoutes = {
  public: [
    '/',
    '/fixtures',
    '/fixtures/fixture-1',
    '/fixtures/fixture-1/players',
    '/fixtures/fixture-1/statistics',
    '/fixtures/fixture-1/statistics/stat-innings-1',
    '/competitions',
    '/competitions/competition-1',
    '/seasons',
    '/seasons/season-1',
    '/competitors',
    '/competitors/competitor-1',
    '/participants',
    '/participants/participant-1',
    '/participants/compare',
    '/dataset-releases',
    '/api',
    '/sign-in',
    '/privacy',
    '/terms',
    '/accessibility',
    '/does-not-exist',
  ],
  workspace: [
    '/account/overview',
    '/account/access',
    '/submissions/new',
    '/submissions/batches',
    '/reviews/batches',
    '/admin',
    '/admin/users',
    '/admin/api-consumers',
    '/admin/dataset-releases/new',
  ],
} as const;
