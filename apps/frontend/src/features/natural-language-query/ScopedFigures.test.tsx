import type { ParticipantAggregates } from '@sport-analytics/contracts';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ScopedFigures } from './ScopedFigures';
import { figure } from './figures';

/**
 * Issue #851 problem 3. Narrowing the aggregate to the asked-for row is only half
 * the fix: the published player view opens on its career tab, so a season row
 * would still be shown as "No career totals available". The row has to be
 * rendered directly.
 */

const SEASON_ROW = {
  statisticId: 'stat_2024',
  participantId: '8452',
  participantName: 'V Kohli',
  appearances: 15,
  fixtureCount: 15,
  sourceEventCount: 400,
  batting: {
    innings: 15,
    runsScored: 741,
    ballsFaced: 479,
    dismissals: 12,
    notOuts: 3,
    battingAverage: 61.75,
    fours: 62,
    sixes: 38,
    fifties: 5,
    hundreds: 1,
    highestScore: 113,
    highestScoreNotOut: false,
    strikeRate: 154.7,
  },
  bowling: null,
  fielding: { catches: 1, stumpings: 0, runOutInvolvements: 0 },
  scope: 'season',
  statisticCode: 'participant_season',
  competitionId: '4',
  competitionName: 'Indian Premier League',
  season: '2024',
  seasonId: 'season_ipl_2024',
};

function aggregates(statistics: unknown[]): ParticipantAggregates {
  return {
    participantId: '8452',
    participantName: 'V Kohli',
    status: 'complete',
    scope: { superOversIncluded: false },
    warnings: [],
    statistics,
  } as unknown as ParticipantAggregates;
}

function renderFigures(statistics: unknown[]) {
  render(
    <MemoryRouter>
      <ScopedFigures aggregates={aggregates(statistics)} statisticIds={['stat_2024']} />
    </MemoryRouter>,
  );
}

describe('the figures a scoped question asked for', () => {
  it('shows the asked-for row directly rather than a career view', () => {
    renderFigures([SEASON_ROW]);

    const runs = screen.getByRole('row', { name: /Runs/i });
    expect(within(runs).getByText(figure.format(741))).toBeInTheDocument();
    // The published player view, which opens on its career tab, stays inside the
    // disclosure rather than being what the answer leads with.
    const table = screen.getByRole('table');
    expect(table.closest('details')).toBeNull();
  });

  it('shows the metrics a reader asked about', () => {
    renderFigures([SEASON_ROW]);

    for (const label of ['Innings', 'Runs', 'Batting average', 'Strike rate', 'Highest score']) {
      expect(screen.getByRole('row', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('omits a metric the row does not publish', () => {
    renderFigures([SEASON_ROW]);

    expect(screen.queryByRole('row', { name: /Wickets/i })).not.toBeInTheDocument();
  });

  it('keeps the full published record available on demand', () => {
    renderFigures([SEASON_ROW]);

    const disclosure = screen.getByText(/full published statistics/i).closest('details');
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute('open');
  });

  it('says so when nothing is published for the scope asked about', () => {
    renderFigures([]);

    expect(screen.getByRole('status')).toHaveTextContent(/no published figures/i);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
