import type {
  ParticipantAggregates,
  ParticipantAggregatesWarning,
  ParticipantCareerAggregate,
} from '@sport-analytics/contracts';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ParticipantAggregateView } from './ParticipantAggregateView';
import { consolidateParticipantWarnings } from './participantDataNotices';

const MISSING_COMPETITION = 'These fixtures are published without a competition.';
const MIXED_OVERS =
  'These fixtures do not share one balls-per-over value, so overs bowled and economy rate have no single divisor.';

const career: ParticipantCareerAggregate = {
  statisticId: 'career-1',
  participantId: '136385',
  participantName: 'A Symonds',
  scope: 'career',
  statisticCode: 'participant_career',
  appearances: 12,
  fixtureCount: 12,
  sourceEventCount: 640,
  batting: {
    innings: 11,
    runsScored: 337,
    ballsFaced: 199,
    dismissals: 9,
    notOuts: 2,
    battingAverage: 37.44,
    fours: 30,
    sixes: 14,
    fifties: 2,
    hundreds: 0,
    highestScore: 85,
    highestScoreNotOut: true,
    strikeRate: 169.35,
  },
  bowling: null,
  fielding: { catches: 3, stumpings: 0, runOutInvolvements: 1 },
};

// The derivation emits one COMPETITION_UNKNOWN warning for the competition level
// and one for each season: the shape behind the seven identical bullets in #892.
const symondsWarnings: ParticipantAggregatesWarning[] = [
  { code: 'COMPETITION_UNKNOWN', message: MISSING_COMPETITION },
  ...['2010', '2005/06', '2008', '2006/07', '2009', '2007/08'].map((season) => ({
    code: 'COMPETITION_UNKNOWN' as const,
    message: MISSING_COMPETITION,
    season,
  })),
];

function aggregatesWith(warnings: ParticipantAggregatesWarning[]): ParticipantAggregates {
  return {
    participantId: '136385',
    participantName: 'A Symonds',
    status: warnings.length === 0 ? 'complete' : 'partial',
    scope: { superOversIncluded: false },
    warnings,
    statistics: [
      career,
      {
        ...career,
        statisticId: 'competition-ipl',
        scope: 'competition',
        statisticCode: 'participant_competition',
        competitionId: 'ipl',
        competitionName: 'Indian Premier League',
      },
    ],
  };
}

function renderView(aggregates: ParticipantAggregates) {
  return render(
    <MemoryRouter>
      <ParticipantAggregateView aggregates={aggregates} />
    </MemoryRouter>,
  );
}

describe('consolidateParticipantWarnings', () => {
  it('returns no notices for a complete-data player', () => {
    expect(consolidateParticipantWarnings([])).toEqual([]);
  });

  it('merges equivalent warnings into one notice with distinct seasons in natural order', () => {
    const notices = consolidateParticipantWarnings(symondsWarnings);

    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      code: 'COMPETITION_UNKNOWN',
      message: MISSING_COMPETITION,
      seasons: ['2005/06', '2006/07', '2007/08', '2008', '2009', '2010'],
      competitions: [],
    });
  });

  it('does not repeat a season named by more than one equivalent warning', () => {
    const notices = consolidateParticipantWarnings([
      { code: 'COMPETITION_UNKNOWN', message: MISSING_COMPETITION, season: '2008' },
      { code: 'COMPETITION_UNKNOWN', message: MISSING_COMPETITION, season: '2008' },
    ]);

    expect(notices).toHaveLength(1);
    expect(notices[0]?.seasons).toEqual(['2008']);
  });

  it('keeps distinct codes and messages as separate notices in first-seen order', () => {
    const notices = consolidateParticipantWarnings(
      [
        { code: 'MIXED_BALLS_PER_OVER', message: MIXED_OVERS, competitionId: 'ipl' },
        ...symondsWarnings,
        {
          code: 'MIXED_BALLS_PER_OVER',
          message: MIXED_OVERS,
          competitionId: 'ipl',
          season: '2009',
        },
        { code: 'COMPETITION_UNKNOWN', message: 'A differently worded notice.' },
      ],
      aggregatesWith([]).statistics,
    );

    expect(notices.map((notice) => [notice.code, notice.message])).toEqual([
      ['MIXED_BALLS_PER_OVER', MIXED_OVERS],
      ['COMPETITION_UNKNOWN', MISSING_COMPETITION],
      ['COMPETITION_UNKNOWN', 'A differently worded notice.'],
    ]);
    expect(notices[0]).toMatchObject({
      seasons: ['2009'],
      competitions: [{ competitionId: 'ipl', competitionName: 'Indian Premier League' }],
    });
  });

  it('falls back to the competition identifier when no published row names it', () => {
    const [notice] = consolidateParticipantWarnings([
      { code: 'MIXED_BALLS_PER_OVER', message: MIXED_OVERS, competitionId: 'unlisted' },
    ]);

    expect(notice?.competitions).toEqual([{ competitionId: 'unlisted', competitionName: null }]);
  });
});

describe('participant career data notices', () => {
  it('shows one missing-competition notice with its affected seasons (#892)', () => {
    renderView(aggregatesWith(symondsWarnings));

    const notices = screen.getByRole('status', { name: 'Data notices' });
    const items = within(notices).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent(MISSING_COMPETITION);
    expect(items[0]).toHaveTextContent(
      'Seasons affected (6): 2005/06, 2006/07, 2007/08, 2008, 2009, 2010',
    );
    expect(within(notices).getAllByText(MISSING_COMPETITION, { exact: false })).toHaveLength(1);
  });

  it('preserves the Partial data status and the career figures', () => {
    renderView(aggregatesWith(symondsWarnings));

    expect(screen.getByText('Partial data')).toBeInTheDocument();
    const overview = screen.getByRole('region', { name: 'Across all published matches' });
    expect(overview).toHaveTextContent('Appearances12');
    expect(overview).toHaveTextContent('Runs337');
    expect(overview).toHaveTextContent('Highest score85*');
  });

  it('keeps genuinely distinct conditions as separate notices with their context', () => {
    renderView(
      aggregatesWith([
        ...symondsWarnings,
        { code: 'MIXED_BALLS_PER_OVER', message: MIXED_OVERS, competitionId: 'ipl' },
        {
          code: 'MIXED_BALLS_PER_OVER',
          message: MIXED_OVERS,
          competitionId: 'ipl',
          season: '2009',
        },
      ]),
    );

    const items = within(screen.getByRole('status', { name: 'Data notices' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(MISSING_COMPETITION);
    expect(items[1]).toHaveTextContent(MIXED_OVERS);
    expect(items[1]).toHaveTextContent('Competition affected (1): Indian Premier League');
    expect(items[1]).toHaveTextContent('Season affected (1): 2009');
  });

  it('shows a lone unscoped warning without inventing scope detail', () => {
    renderView(
      aggregatesWith([
        {
          code: 'NO_ACCEPTED_EVENTS',
          message: 'The participant has no accepted squad appearances or standard delivery events.',
        },
      ]),
    );

    const [item] = within(screen.getByRole('status', { name: 'Data notices' })).getAllByRole(
      'listitem',
    );
    expect(item).not.toHaveTextContent('affected');
  });

  it('shows no notices panel and Complete data for a complete-data player', () => {
    renderView(aggregatesWith([]));

    expect(screen.queryByRole('status', { name: 'Data notices' })).not.toBeInTheDocument();
    expect(screen.getByText('Complete data')).toBeInTheDocument();
  });
});
