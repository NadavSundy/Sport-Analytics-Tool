import type {
  FixtureStatistics,
  ParticipantAggregateBatting,
  ParticipantAggregates,
  ParticipantFixtureStatistic,
} from '@sport-analytics/contracts';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { FixtureAnalytics } from './FixtureScorecards';
import { ParticipantAggregateView } from './ParticipantAggregateView';

const batting: ParticipantAggregateBatting = {
  innings: 3,
  runsScored: 100,
  ballsFaced: 80,
  dismissals: 2,
  notOuts: 1,
  battingAverage: 50,
  fours: 10,
  sixes: 2,
  fifties: 1,
  hundreds: 0,
  highestScore: 60,
  highestScoreNotOut: true,
  strikeRate: 125,
};

function player(
  id: string,
  name: string,
  runs: number,
  wickets: number,
  strikeRate: number | null = 100,
): ParticipantFixtureStatistic {
  return {
    statisticId: `stat-${id}`,
    fixtureId: 'fixture-1',
    scope: 'participant',
    statisticCode: 'participant_fixture',
    participantId: id,
    participantName: name,
    competitorId: 'team-1',
    competitorName: 'Falcons',
    sourceEventCount: 12,
    battingPosition: 1,
    battingParticipation: 'batted',
    dismissal: { status: 'dismissed', kind: 'caught', eventId: `event-${id}` },
    batting: { runsScored: runs, ballsFaced: runs, strikeRate, fours: 0, sixes: 0 },
    bowling: {
      runsConceded: 0,
      wides: 0,
      noBalls: 0,
      legalBallsBowled: 6,
      oversBowled: '1.0',
      economyRate: 0,
      wicketsTaken: wickets,
    },
  };
}

const fixtureStatistics: FixtureStatistics = {
  fixtureId: 'fixture-1',
  status: 'complete',
  scope: { superOversIncluded: false },
  outcome: {
    kind: 'won',
    winnerCompetitorId: 'team-1',
    winnerCompetitorName: 'Falcons',
    eliminatorCompetitorId: null,
    eliminatorCompetitorName: null,
    margin: { type: 'runs', value: 10 },
    method: null,
    decidedByBowlOut: false,
  },
  highestScorers: [],
  warnings: [],
  statistics: [
    {
      statisticId: 'innings-1-stat',
      fixtureId: 'fixture-1',
      scope: 'innings',
      statisticCode: 'team_total',
      inningsId: 'innings-1',
      inningsOrdinal: 0,
      competitorId: 'team-1',
      competitorName: 'Falcons',
      sourceEventCount: 0,
      metrics: {
        deliveryRuns: 0,
        penaltyRuns: 0,
        totalRuns: 0,
        wicketsLost: 0,
        legalBalls: 0,
        overs: '0.0',
        runRate: null,
        extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0 },
      },
    },
    player('player-b', 'Bravo', 50, 2),
    player('player-a', 'Alpha', 50, 2),
    player('player-c', 'Charlie', 0, 0, null),
    player('player-d', 'Delta', 0, 0),
  ],
};

const career = {
  statisticId: 'career-1',
  participantId: 'player-1',
  participantName: 'A Player',
  scope: 'career' as const,
  statisticCode: 'participant_career' as const,
  appearances: 4,
  fixtureCount: 3,
  sourceEventCount: 100,
  batting,
  bowling: null,
  fielding: { catches: 0, stumpings: 0, runOutInvolvements: 0 },
};

const aggregates: ParticipantAggregates = {
  participantId: 'player-1',
  participantName: 'A Player',
  status: 'complete',
  scope: { superOversIncluded: false },
  warnings: [],
  statistics: [
    career,
    {
      ...career,
      statisticId: 'competition-1-stat',
      scope: 'competition',
      statisticCode: 'participant_competition',
      competitionId: 'competition-1',
      competitionName: 'Premier League',
    },
    {
      ...career,
      statisticId: 'season-1-stat',
      scope: 'season',
      statisticCode: 'participant_season',
      competitionId: 'competition-1',
      competitionName: 'Premier League',
      seasonId: 'season-1',
      season: '2026',
    },
  ],
};

describe('statistics presentation', () => {
  it('renders cricket scorecards, exact zeroes, undefined rates and neutral tied leaders', () => {
    render(
      <MemoryRouter>
        <FixtureAnalytics statistics={fixtureStatistics} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Falcons won by 10 runs.' })).toBeInTheDocument();
    const inningsTable = screen.getByRole('table', {
      name: 'Score, progress, run rate and extras for each standard innings',
    });
    expect(inningsTable).toHaveTextContent('0/0');
    expect(inningsTable).toHaveTextContent('—');
    fireEvent.click(screen.getByText('Extras breakdown'));
    const extrasTable = screen.getByRole('table', { name: 'Extras by innings' });
    expect(within(extrasTable).getByRole('row', { name: 'Falcons 0 0 0 0 0' })).toBeInTheDocument();

    const battingTable = screen.getByRole('table', { name: 'Falcons batting scorecard' });
    expect(within(battingTable).getByRole('link', { name: 'Charlie' })).toHaveAttribute(
      'href',
      '/participants/player-c',
    );
    expect(within(battingTable).getAllByText('0').length).toBeGreaterThan(0);
    expect(within(battingTable).getByText('—')).toBeInTheDocument();

    const bowlingTable = screen.getByRole('table', { name: 'Falcons bowling scorecard' });
    expect(within(bowlingTable).getAllByText('0').length).toBeGreaterThan(0);
    expect(within(bowlingTable).getByRole('columnheader', { name: 'WD' })).toBeInTheDocument();
    expect(within(bowlingTable).getByRole('columnheader', { name: 'NB' })).toBeInTheDocument();

    const runs = screen.getByRole('region', { name: 'Leading run scorers' });
    expect(within(runs).getAllByText('1')).toHaveLength(2);
    expect(within(runs).getByRole('link', { name: 'Alpha' })).toBeInTheDocument();
    expect(within(runs).getByRole('link', { name: 'Bravo' })).toBeInTheDocument();

    const wickets = screen.getByRole('region', { name: 'Leading wicket takers' });
    expect(within(wickets).getAllByText('1')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'View calculation trace' }).length).toBeGreaterThan(
      0,
    );
  });

  it('switches aggregate scope with pointer and keyboard controls', () => {
    render(
      <MemoryRouter>
        <ParticipantAggregateView aggregates={aggregates} />
      </MemoryRouter>,
    );

    const careerTab = screen.getByRole('tab', { name: 'Career' });
    expect(careerTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('region', { name: 'Batting statistics' })).toHaveTextContent('100');
    expect(screen.getByRole('region', { name: 'Bowling statistics' })).toHaveTextContent(
      'No bowling record is available for this scope.',
    );
    expect(screen.getByRole('region', { name: 'Fielding statistics' })).toHaveTextContent('0');

    fireEvent.keyDown(careerTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'By competition' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('table', { name: 'Participant record by competition' }),
    ).toHaveTextContent('Premier League');

    fireEvent.click(screen.getByRole('tab', { name: 'By season' }));
    expect(screen.getByRole('table', { name: 'Participant record by season' })).toHaveTextContent(
      '2026',
    );
  });

  it('states when season and competition aggregates are unavailable', () => {
    render(
      <MemoryRouter>
        <ParticipantAggregateView aggregates={{ ...aggregates, statistics: [career] }} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'By competition' }));
    expect(screen.getByText('No competition aggregates are available.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'By season' }));
    expect(screen.getByText('No season aggregates are available.')).toBeInTheDocument();
  });

  it('keeps a bowling-only record distinct from zero and undefined bowling values', () => {
    const bowlingOnly = {
      ...career,
      batting: null,
      bowling: {
        innings: 1,
        runsConceded: 0,
        wides: 0,
        noBalls: 0,
        legalBallsBowled: 0,
        wicketsTaken: 0,
        bowlingAverage: null,
        bowlingStrikeRate: null,
        bestBowling: { wicketsTaken: 0, runsConceded: 0 },
        fourWicketHauls: 0,
        fiveWicketHauls: 0,
        ballsPerOver: 6,
        oversBowled: '0.0',
        economyRate: null,
      },
    };
    render(
      <MemoryRouter>
        <ParticipantAggregateView aggregates={{ ...aggregates, statistics: [bowlingOnly] }} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('region', { name: 'Batting statistics' })).toHaveTextContent(
      'No batting record is available for this scope.',
    );
    const bowlingRegion = screen.getByRole('region', { name: 'Bowling statistics' });
    expect(bowlingRegion).toHaveTextContent('Wickets0');
    expect(bowlingRegion).toHaveTextContent('Average—');
    expect(bowlingRegion).toHaveTextContent('Economy rate—');
  });
});
