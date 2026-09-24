import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlayerComparisonPage } from './PlayerComparisonPage';

function response(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

function collection(data: unknown[]): Response {
  return response({ data, pagination: { nextCursor: null, totalPages: 1 } });
}

describe('player comparison', () => {
  it('compares two published player performances in the selected fixture with labelled units', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/fixtures?')) {
          return Promise.resolve(
            collection([
              {
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
              },
            ]),
          );
        }
        if (url.endsWith('/fixtures/fixture-1/statistics')) {
          return Promise.resolve(
            response({
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
                  margin: { type: 'wickets', value: 5 },
                  method: null,
                  decidedByBowlOut: false,
                },
                highestScorers: [],
                warnings: [],
                statistics: [
                  {
                    statisticId: 'player-1-stat',
                    fixtureId: 'fixture-1',
                    scope: 'participant',
                    statisticCode: 'participant_fixture',
                    participantId: 'player-1',
                    participantName: 'A Player',
                    competitorId: 'team-1',
                    competitorName: 'Wanderers',
                    sourceEventCount: 30,
                    battingPosition: 1,
                    battingParticipation: 'batted',
                    dismissal: { status: 'not_out', kind: null, eventId: null },
                    batting: {
                      runsScored: 72,
                      ballsFaced: 48,
                      strikeRate: 150,
                      fours: 6,
                      sixes: 2,
                    },
                    bowling: null,
                  },
                  {
                    statisticId: 'player-2-stat',
                    fixtureId: 'fixture-1',
                    scope: 'participant',
                    statisticCode: 'participant_fixture',
                    participantId: 'player-2',
                    participantName: 'B Player',
                    competitorId: 'team-2',
                    competitorName: 'Strikers',
                    sourceEventCount: 24,
                    battingPosition: 2,
                    battingParticipation: 'batted',
                    dismissal: { status: 'dismissed', kind: 'caught', eventId: 'event-1' },
                    batting: {
                      runsScored: 41,
                      ballsFaced: 36,
                      strikeRate: 113.9,
                      fours: 3,
                      sixes: 0,
                    },
                    bowling: null,
                  },
                ],
              },
            }),
          );
        }
        return Promise.resolve(collection([]));
      }),
    );

    render(
      <MemoryRouter initialEntries={['/participants/compare?fixtureId=fixture-1&playerA=player-1']}>
        <PlayerComparisonPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Compare players' })).toBeVisible();
    fireEvent.change(await screen.findByLabelText('Player B'), { target: { value: 'player-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compare performances' }));

    const comparison = await screen.findByRole('region', { name: 'Player performance comparison' });
    expect(within(comparison).getByText('Scope: Current fixture')).toBeVisible();
    expect(within(comparison).getByRole('columnheader', { name: 'A Player' })).toBeVisible();
    expect(within(comparison).getByRole('columnheader', { name: 'B Player' })).toBeVisible();
    expect(within(comparison).getByText('Runs (runs)')).toBeVisible();
    expect(within(comparison).getByText('Strike rate (%)')).toBeVisible();
    expect(within(comparison).getByText('72')).toBeVisible();
    expect(within(comparison).getByText('41')).toBeVisible();
  });
});
