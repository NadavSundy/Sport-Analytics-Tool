import type {
  ParticipantAggregate,
  ParticipantAggregateBatting,
  ParticipantAggregateBowling,
  ParticipantAggregates,
  ParticipantCareerAggregate,
  ParticipantCompetitionAggregate,
  ParticipantSeasonAggregate,
} from '@sport-analytics/contracts';
import { memo, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import {
  consolidateParticipantWarnings,
  type ParticipantDataNotice,
} from './participantDataNotices';
import { StatisticsDefinitions } from './StatisticsDefinitions';

type ParticipantScope = 'career' | 'competition' | 'season';

const SCOPES: readonly { id: ParticipantScope; label: string }[] = [
  { id: 'career', label: 'Career' },
  { id: 'competition', label: 'By competition' },
  { id: 'season', label: 'By season' },
];

interface PartitionedStatistics {
  career: ParticipantCareerAggregate | undefined;
  competitions: ParticipantCompetitionAggregate[];
  seasons: ParticipantSeasonAggregate[];
}

/** Splits the published rows by scope in one pass, keeping their published order. */
function partitionStatistics(statistics: readonly ParticipantAggregate[]): PartitionedStatistics {
  const partitioned: PartitionedStatistics = { career: undefined, competitions: [], seasons: [] };
  for (const statistic of statistics) {
    if (statistic.scope === 'career') {
      partitioned.career ??= statistic;
    } else if (statistic.scope === 'competition') {
      partitioned.competitions.push(statistic);
    } else {
      partitioned.seasons.push(statistic);
    }
  }
  return partitioned;
}

function listScope(label: string, values: readonly string[]): string {
  return `${label} affected (${values.length}): ${values.join(', ')}`;
}

function DataNotices({ notices }: { notices: readonly ParticipantDataNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <section className="statistics-warnings" aria-label="Data notices" role="status">
      <h3>Data notices</h3>
      <ul>
        {notices.map((notice) => (
          <li key={notice.key} data-warning-code={notice.code}>
            {notice.message}
            {notice.competitions.length > 0 ? (
              <span className="statistics-warning__scope">
                {listScope(
                  notice.competitions.length === 1 ? 'Competition' : 'Competitions',
                  notice.competitions.map(
                    (competition) => competition.competitionName ?? competition.competitionId,
                  ),
                )}
              </span>
            ) : null}
            {notice.seasons.length > 0 ? (
              <span className="statistics-warning__scope">
                {listScope(notice.seasons.length === 1 ? 'Season' : 'Seasons', notice.seasons)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatRate(value: number | null): string | number {
  return value ?? '—';
}

function highestScore(batting: ParticipantAggregateBatting): string {
  return `${batting.highestScore}${batting.highestScoreNotOut ? '*' : ''}`;
}

function bestBowling(bowling: ParticipantAggregateBowling): string {
  return bowling.bestBowling
    ? `${bowling.bestBowling.wicketsTaken}/${bowling.bestBowling.runsConceded}`
    : '—';
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const CareerOverview = memo(function CareerOverview({
  career,
}: {
  career: ParticipantCareerAggregate;
}) {
  const headlineMetrics = [
    { label: 'Appearances', value: career.appearances },
    ...(career.batting
      ? [
          { label: 'Runs', value: career.batting.runsScored },
          { label: 'Batting average', value: formatRate(career.batting.battingAverage) },
          { label: 'Strike rate', value: formatRate(career.batting.strikeRate) },
          { label: 'Highest score', value: highestScore(career.batting) },
        ]
      : []),
    ...(career.bowling && career.bowling.innings > 0
      ? [
          { label: 'Wickets', value: career.bowling.wicketsTaken },
          { label: 'Bowling average', value: formatRate(career.bowling.bowlingAverage) },
          { label: 'Economy', value: formatRate(career.bowling.economyRate) },
        ]
      : []),
  ];

  return (
    <section aria-labelledby="career-overview-heading" className="participant-career-overview">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Career overview</p>
          <h3 id="career-overview-heading">Across all published matches</h3>
        </div>
      </div>
      <dl className="participant-kpis">
        {headlineMetrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </dl>
      <p className="statistic-card__source-count">
        Based on {career.sourceEventCount} accepted{' '}
        {career.sourceEventCount === 1 ? 'event' : 'events'} from {career.fixtureCount}{' '}
        {career.fixtureCount === 1 ? 'match' : 'matches'} in which this player batted or bowled.
      </p>
    </section>
  );
});

function RecordGroup({
  children,
  empty,
  title,
}: {
  children?: React.ReactNode;
  empty?: string;
  title: string;
}) {
  return (
    <section className="participant-record-group" aria-label={`${title} statistics`}>
      <h4>{title}</h4>
      {children ?? <p className="statistics-section__empty">{empty}</p>}
    </section>
  );
}

function AggregateDetail({ aggregate }: { aggregate: ParticipantAggregate }) {
  return (
    <div className="participant-record-grid">
      <RecordGroup title="Batting" empty="No batting record is available for this scope.">
        {aggregate.batting ? (
          <dl className="record-metrics">
            <Metric label="Innings" value={aggregate.batting.innings} />
            <Metric label="Runs" value={aggregate.batting.runsScored} />
            <Metric label="Balls faced" value={aggregate.batting.ballsFaced} />
            <Metric label="Not outs" value={aggregate.batting.notOuts} />
            <Metric label="Average" value={formatRate(aggregate.batting.battingAverage)} />
            <Metric label="Strike rate" value={formatRate(aggregate.batting.strikeRate)} />
            <Metric label="Highest score" value={highestScore(aggregate.batting)} />
            <Metric label="50s" value={aggregate.batting.fifties} />
            <Metric label="100s" value={aggregate.batting.hundreds} />
            <Metric label="Fours" value={aggregate.batting.fours} />
            <Metric label="Sixes" value={aggregate.batting.sixes} />
          </dl>
        ) : undefined}
      </RecordGroup>
      <RecordGroup title="Bowling" empty="No bowling record is available for this scope.">
        {aggregate.bowling ? (
          <dl className="record-metrics">
            <Metric label="Innings" value={aggregate.bowling.innings} />
            <Metric label="Wickets" value={aggregate.bowling.wicketsTaken} />
            <Metric label="Runs conceded" value={aggregate.bowling.runsConceded} />
            <Metric label="Wides" value={aggregate.bowling.wides} />
            <Metric label="No-balls" value={aggregate.bowling.noBalls} />
            <Metric label="Overs" value={aggregate.bowling.oversBowled ?? '—'} />
            <Metric label="Average" value={formatRate(aggregate.bowling.bowlingAverage)} />
            <Metric label="Economy rate" value={formatRate(aggregate.bowling.economyRate)} />
            <Metric label="Strike rate" value={formatRate(aggregate.bowling.bowlingStrikeRate)} />
            <Metric label="Best bowling" value={bestBowling(aggregate.bowling)} />
            <Metric label="4W" value={aggregate.bowling.fourWicketHauls} />
            <Metric label="5W" value={aggregate.bowling.fiveWicketHauls} />
          </dl>
        ) : undefined}
      </RecordGroup>
      <RecordGroup title="Fielding">
        <dl className="record-metrics">
          <Metric label="Catches" value={aggregate.fielding.catches} />
          <Metric label="Stumpings" value={aggregate.fielding.stumpings} />
          <Metric label="Run-out involvements" value={aggregate.fielding.runOutInvolvements} />
        </dl>
      </RecordGroup>
    </div>
  );
}

function SeasonTable({ seasons }: { seasons: ParticipantSeasonAggregate[] }) {
  if (seasons.length === 0) {
    return (
      <p className="statistics-section__empty" role="status">
        No season aggregates are available.
      </p>
    );
  }
  return (
    <DataTable caption="Participant record by season">
      <thead>
        <tr>
          <th scope="col">Season</th>
          <th scope="col">Competition</th>
          <th scope="col" data-numeric>
            Mat
          </th>
          <th scope="col" data-numeric>
            Runs
          </th>
          <th scope="col" data-numeric>
            Avg
          </th>
          <th scope="col" data-numeric>
            SR
          </th>
          <th scope="col" data-numeric>
            HS
          </th>
          <th scope="col" data-numeric>
            50s
          </th>
          <th scope="col" data-numeric>
            100s
          </th>
          <th scope="col" data-numeric>
            Wkts
          </th>
          <th scope="col" data-numeric>
            Econ
          </th>
        </tr>
      </thead>
      <tbody>
        {seasons.map((aggregate) => (
          <tr key={aggregate.statisticId}>
            <th scope="row">
              {aggregate.seasonId ? (
                <Link to={`/seasons/${encodeURIComponent(aggregate.seasonId)}`}>
                  {aggregate.season}
                </Link>
              ) : (
                aggregate.season
              )}
            </th>
            <td>
              {aggregate.competitionId && aggregate.competitionName ? (
                <Link to={`/competitions/${encodeURIComponent(aggregate.competitionId)}`}>
                  {aggregate.competitionName}
                </Link>
              ) : (
                (aggregate.competitionName ?? 'Competition unavailable')
              )}
            </td>
            <td data-numeric>{aggregate.appearances}</td>
            <td data-numeric>{aggregate.batting?.runsScored ?? '—'}</td>
            <td data-numeric>{formatRate(aggregate.batting?.battingAverage ?? null)}</td>
            <td data-numeric>{formatRate(aggregate.batting?.strikeRate ?? null)}</td>
            <td data-numeric>{aggregate.batting ? highestScore(aggregate.batting) : '—'}</td>
            <td data-numeric>{aggregate.batting?.fifties ?? '—'}</td>
            <td data-numeric>{aggregate.batting?.hundreds ?? '—'}</td>
            <td data-numeric>{aggregate.bowling?.wicketsTaken ?? '—'}</td>
            <td data-numeric>{formatRate(aggregate.bowling?.economyRate ?? null)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function CompetitionTable({ competitions }: { competitions: ParticipantCompetitionAggregate[] }) {
  if (competitions.length === 0) {
    return (
      <p className="statistics-section__empty" role="status">
        No competition aggregates are available.
      </p>
    );
  }
  return (
    <DataTable caption="Participant record by competition">
      <thead>
        <tr>
          <th scope="col">Competition</th>
          <th scope="col" data-numeric>
            Mat
          </th>
          <th scope="col" data-numeric>
            Runs
          </th>
          <th scope="col" data-numeric>
            Avg
          </th>
          <th scope="col" data-numeric>
            SR
          </th>
          <th scope="col" data-numeric>
            HS
          </th>
          <th scope="col" data-numeric>
            50s
          </th>
          <th scope="col" data-numeric>
            100s
          </th>
          <th scope="col" data-numeric>
            Wkts
          </th>
          <th scope="col" data-numeric>
            Econ
          </th>
        </tr>
      </thead>
      <tbody>
        {competitions.map((aggregate) => (
          <tr key={aggregate.statisticId}>
            <th scope="row">
              {aggregate.competitionId && aggregate.competitionName ? (
                <Link to={`/competitions/${encodeURIComponent(aggregate.competitionId)}`}>
                  {aggregate.competitionName}
                </Link>
              ) : (
                (aggregate.competitionName ?? 'Competition unavailable')
              )}
            </th>
            <td data-numeric>{aggregate.appearances}</td>
            <td data-numeric>{aggregate.batting?.runsScored ?? '—'}</td>
            <td data-numeric>{formatRate(aggregate.batting?.battingAverage ?? null)}</td>
            <td data-numeric>{formatRate(aggregate.batting?.strikeRate ?? null)}</td>
            <td data-numeric>{aggregate.batting ? highestScore(aggregate.batting) : '—'}</td>
            <td data-numeric>{aggregate.batting?.fifties ?? '—'}</td>
            <td data-numeric>{aggregate.batting?.hundreds ?? '—'}</td>
            <td data-numeric>{aggregate.bowling?.wicketsTaken ?? '—'}</td>
            <td data-numeric>{formatRate(aggregate.bowling?.economyRate ?? null)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

export function ParticipantAggregateView({ aggregates }: { aggregates: ParticipantAggregates }) {
  const [scope, setScope] = useState<ParticipantScope>('career');
  const tabsId = useId();
  const { career, competitions, seasons } = useMemo(
    () => partitionStatistics(aggregates.statistics),
    [aggregates.statistics],
  );
  const notices = useMemo(
    () => consolidateParticipantWarnings(aggregates.warnings, aggregates.statistics),
    [aggregates.warnings, aggregates.statistics],
  );

  return (
    <>
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Published player record</p>
          <h3>Career overview</h3>
        </div>
        <p className={`statistics-status statistics-status--${aggregates.status}`}>
          {aggregates.status === 'complete' ? 'Complete data' : 'Partial data'}
        </p>
      </div>
      <DataNotices notices={notices} />
      {career ? (
        <CareerOverview career={career} />
      ) : (
        <div className="state-message" role="status">
          <h3>No career totals available</h3>
          <p>No career batting or bowling figures are published for this player.</p>
        </div>
      )}
      <section aria-labelledby={`${tabsId}-heading`} className="participant-scope-section">
        <div className="statistics-section-heading">
          <div>
            <p className="eyebrow">Current scope</p>
            <h3 id={`${tabsId}-heading`}>Explore the record</h3>
          </div>
        </div>
        <div className="statistics-tabs" role="tablist" aria-label="Player statistics scope">
          {SCOPES.map((item, index) => (
            <button
              aria-controls={`${tabsId}-${item.id}-panel`}
              aria-selected={scope === item.id}
              className="statistics-tab"
              id={`${tabsId}-${item.id}-tab`}
              key={item.id}
              onClick={() => setScope(item.id)}
              onKeyDown={(event) => {
                let nextIndex: number | null = null;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  nextIndex = (index + 1) % SCOPES.length;
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  nextIndex = (index - 1 + SCOPES.length) % SCOPES.length;
                } else if (event.key === 'Home') {
                  nextIndex = 0;
                } else if (event.key === 'End') {
                  nextIndex = SCOPES.length - 1;
                }
                if (nextIndex === null) return;
                event.preventDefault();
                const nextScope = SCOPES[nextIndex];
                if (!nextScope) return;
                setScope(nextScope.id);
                document.getElementById(`${tabsId}-${nextScope.id}-tab`)?.focus();
              }}
              role="tab"
              tabIndex={scope === item.id ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          aria-labelledby={`${tabsId}-${scope}-tab`}
          className="statistics-tab-panel"
          id={`${tabsId}-${scope}-panel`}
          role="tabpanel"
          tabIndex={0}
        >
          <p className="scope-description">
            {scope === 'career'
              ? 'All published standard-innings records.'
              : scope === 'competition'
                ? 'Published totals grouped by competition.'
                : 'Published totals grouped by season and competition.'}
          </p>
          {scope === 'career' ? (
            career ? (
              <AggregateDetail aggregate={career} />
            ) : (
              <p className="statistics-section__empty">No career aggregate is available.</p>
            )
          ) : null}
          {scope === 'competition' ? <CompetitionTable competitions={competitions} /> : null}
          {scope === 'season' ? <SeasonTable seasons={seasons} /> : null}
        </div>
      </section>
      <section
        aria-labelledby={`${tabsId}-details-heading`}
        className="statistics-section calculation-details"
      >
        <div className="statistics-section-heading">
          <div>
            <p className="eyebrow">Evidence and scope</p>
            <h3 id={`${tabsId}-details-heading`}>Calculation details</h3>
          </div>
        </div>
        <details>
          <summary>How this player record is calculated</summary>
          <p>
            Aggregates use accepted events from standard innings. Super overs are excluded. Rates
            are calculated by the backend across the complete selected scope.
          </p>
          {career ? (
            <p>
              Career record: {career.appearances} appearances, {career.fixtureCount} batting or
              bowling matches and {career.sourceEventCount} accepted source events.
            </p>
          ) : null}
        </details>
        <StatisticsDefinitions
          includeBattingAverage
          includeBowlingAverage
          includeBowlingStrikeRate
        />
      </section>
    </>
  );
}
