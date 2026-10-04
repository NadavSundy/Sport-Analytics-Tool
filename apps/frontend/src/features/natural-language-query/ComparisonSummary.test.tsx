import type { ParticipantAggregates } from '@sport-analytics/contracts';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ComparisonSummary } from './ComparisonSummary';

/**
 * The compact head-to-head (issue #851). Two rules matter more than the layout:
 * the leading value must be readable without seeing colour, and the metrics where
 * a smaller number is better must be compared the other way round.
 */

function aggregates(
  participantId: string,
  participantName: string,
  batting: Record<string, unknown> | null,
  bowling: Record<string, unknown> | null,
): ParticipantAggregates {
  return {
    participantId,
    participantName,
    status: 'complete',
    scope: { superOversIncluded: false },
    warnings: [],
    statistics: [
      {
        statisticId: `stat_${participantId}`,
        participantId,
        participantName,
        appearances: 15,
        fixtureCount: 15,
        sourceEventCount: 400,
        batting,
        bowling,
        fielding: { catches: 1, stumpings: 0, runOutInvolvements: 0 },
        scope: 'career',
        statisticCode: 'participant_career',
      },
    ],
  } as unknown as ParticipantAggregates;
}

function batting(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function bowling(overrides: Record<string, unknown> = {}) {
  return {
    innings: 4,
    runsConceded: 120,
    wides: 2,
    noBalls: 0,
    legalBallsBowled: 96,
    wicketsTaken: 6,
    bowlingAverage: 20,
    bowlingStrikeRate: 16,
    bestBowling: { wicketsTaken: 3, runsConceded: 20 },
    fourWicketHauls: 0,
    fiveWicketHauls: 0,
    economyRate: 7.5,
    ...overrides,
  };
}

function renderSummary(first: ParticipantAggregates, second: ParticipantAggregates) {
  render(
    <MemoryRouter>
      <ComparisonSummary
        first={{ aggregates: first, statisticIds: [first.statistics[0]?.statisticId ?? ''] }}
        second={{ aggregates: second, statisticIds: [second.statistics[0]?.statisticId ?? ''] }}
      />
    </MemoryRouter>,
  );
}

// en-ZA formatting, as the rest of the statistics tables use: 31.5 reads "31,5".
const figure = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 });

function metricRow(label: string) {
  return screen.getByRole('row', { name: new RegExp(label, 'i') });
}

describe('the compact comparison', () => {
  it('names both players as the columns, in the order asked', () => {
    renderSummary(
      aggregates('8452', 'V Kohli', batting(), null),
      aggregates('12703', 'RD Gaikwad', batting({ runsScored: 583 }), null),
    );

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers[1]).toContain('V Kohli');
    expect(headers[2]).toContain('RD Gaikwad');
  });

  it('shows the batting metrics a reader compares first', () => {
    renderSummary(
      aggregates('8452', 'V Kohli', batting(), null),
      aggregates('12703', 'RD Gaikwad', batting({ runsScored: 583 }), null),
    );

    for (const label of ['Runs', 'Average', 'Strike rate']) {
      expect(metricRow(label)).toBeInTheDocument();
    }
    expect(within(metricRow('Runs')).getByText(figure.format(741))).toBeInTheDocument();
    expect(within(metricRow('Runs')).getByText(figure.format(583))).toBeInTheDocument();
  });

  // The leader must be readable without seeing colour, so the marker is text.
  it('marks the higher value as leading in words, not by colour', () => {
    renderSummary(
      aggregates('8452', 'V Kohli', batting(), null),
      aggregates('12703', 'RD Gaikwad', batting({ runsScored: 583 }), null),
    );

    const runs = metricRow('Runs');
    expect(within(runs).getByText(figure.format(741)).closest('td')).toHaveTextContent(/leads/i);
    expect(within(runs).getByText(figure.format(583)).closest('td')).not.toHaveTextContent(
      /leads/i,
    );
  });

  it('indicates the leader with a marker that assistive technology ignores', () => {
    renderSummary(
      aggregates('8452', 'V Kohli', batting(), null),
      aggregates('12703', 'RD Gaikwad', batting({ runsScored: 583 }), null),
    );

    const marker = within(metricRow('Runs')).getByText('▲');
    expect(marker).toHaveAttribute('aria-hidden', 'true');
  });

  describe('metrics where a smaller number is better', () => {
    it('treats the lower bowling average as leading', () => {
      renderSummary(
        aggregates('8452', 'V Kohli', null, bowling({ bowlingAverage: 31.5 })),
        aggregates('12703', 'RD Gaikwad', null, bowling({ bowlingAverage: 20 })),
      );

      const row = metricRow('Bowling average');
      expect(within(row).getByText(figure.format(20)).closest('td')).toHaveTextContent(/leads/i);
      expect(within(row).getByText(figure.format(31.5)).closest('td')).not.toHaveTextContent(
        /leads/i,
      );
    });

    it('treats the lower economy rate as leading', () => {
      renderSummary(
        aggregates('8452', 'V Kohli', null, bowling({ economyRate: 6.2 })),
        aggregates('12703', 'RD Gaikwad', null, bowling({ economyRate: 9.1 })),
      );

      const row = metricRow('Economy');
      expect(within(row).getByText(figure.format(6.2)).closest('td')).toHaveTextContent(/leads/i);
      expect(within(row).getByText(figure.format(9.1)).closest('td')).not.toHaveTextContent(
        /leads/i,
      );
    });

    it('still treats the higher wicket count as leading', () => {
      renderSummary(
        aggregates('8452', 'V Kohli', null, bowling({ wicketsTaken: 2 })),
        aggregates('12703', 'RD Gaikwad', null, bowling({ wicketsTaken: 11 })),
      );

      const row = metricRow('Wickets');
      expect(within(row).getByText(figure.format(11)).closest('td')).toHaveTextContent(/leads/i);
    });
  });

  it('says tied rather than naming a leader when the values match', () => {
    renderSummary(
      aggregates('8452', 'V Kohli', batting({ runsScored: 500 }), null),
      aggregates('12703', 'RD Gaikwad', batting({ runsScored: 500 }), null),
    );

    const row = metricRow('Runs');
    expect(row).toHaveTextContent(/tied/i);
    expect(row).not.toHaveTextContent(/leads/i);
  });

  it('omits a metric neither player has', () => {
    renderSummary(
      aggregates('8452', 'V Kohli', batting(), null),
      aggregates('12703', 'RD Gaikwad', batting(), null),
    );

    expect(screen.queryByRole('row', { name: /Wickets/i })).not.toBeInTheDocument();
  });

  it('shows a metric only one player has without claiming a comparison', () => {
    renderSummary(
      aggregates('8452', 'V Kohli', batting({ battingAverage: null }), null),
      aggregates('12703', 'RD Gaikwad', batting({ battingAverage: 53 }), null),
    );

    const row = metricRow('Average');
    expect(within(row).getByText(figure.format(53))).toBeInTheDocument();
    expect(row).toHaveTextContent(/not published|—/i);
  });

  // The full figures stay available, behind a disclosure rather than on screen.
  it('keeps the full published statistics available on demand', () => {
    renderSummary(
      aggregates('8452', 'V Kohli', batting(), null),
      aggregates('12703', 'RD Gaikwad', batting({ runsScored: 583 }), null),
    );

    const summary = screen.getByText(/full published statistics/i);
    const disclosure = summary.closest('details');
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute('open');
  });

  it('reports a player with no published row for the scope asked about', () => {
    const empty = { ...aggregates('8452', 'V Kohli', null, null), statistics: [] };

    renderSummary(empty, aggregates('12703', 'RD Gaikwad', batting(), null));

    // The aggregate view inside the disclosure has status regions of its own, so
    // the note is found by its own wording.
    const note = screen.getByText(/no published figures/i);
    expect(note).toHaveTextContent(/V Kohli/);
  });
});
