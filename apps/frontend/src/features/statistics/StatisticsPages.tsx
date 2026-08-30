import type {
  FixtureOutcome,
  FixtureStatistic,
  FixtureStatistics,
  ParticipantFixtureBatting,
  ParticipantFixtureBowling,
  StatisticContributingEvent,
} from '@sport-analytics/contracts';
import { useCallback, useId, type ElementType, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicReadApi } from '../../api/public-read';
import {
  DetailError,
  DetailLoading,
  RecordFact,
  RecordFacts,
  RelatedLinks,
} from '../browse/RecordDetail';
import { usePublicData } from '../browse/usePublicData';
import { EventExportControls } from './EventExportControls';

function recordPath(resource: 'competitors' | 'participants', identifier: string) {
  return `/${resource}/${encodeURIComponent(identifier)}`;
}

function formatOutcome(outcome: FixtureOutcome): string {
  if (outcome.kind === 'won') {
    const margin = outcome.margin ? ` by ${outcome.margin.value} ${outcome.margin.type}` : '';
    const method = outcome.method ? ` (${outcome.method})` : '';
    return `${outcome.winnerCompetitorName ?? 'Winning team name unavailable'} won${margin}${method}.`;
  }

  if (outcome.kind === 'no_result') {
    return 'No result.';
  }

  if (outcome.kind === 'tie') {
    const deciderWinner = outcome.eliminatorCompetitorName ?? outcome.winnerCompetitorName;
    if (outcome.decidedByBowlOut && deciderWinner) {
      return `Match tied; ${deciderWinner} won the bowl-out.`;
    }
    if (outcome.eliminatorCompetitorName) {
      return `Match tied; ${outcome.eliminatorCompetitorName} won the eliminator.`;
    }
    return 'Match tied.';
  }

  return 'Match drawn.';
}

function StatisticMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function MetricList({ children }: { children: ReactNode }) {
  return <dl className="statistic-metrics">{children}</dl>;
}

export function PlayerPerformance({
  batting,
  bowling,
  showUnavailable = false,
}: {
  batting: ParticipantFixtureBatting | null;
  bowling: ParticipantFixtureBowling | null;
  showUnavailable?: boolean;
}) {
  return (
    <div className="participant-statistics">
      {batting ? (
        <section aria-label="Batting statistics">
          <h4>Batting</h4>
          <MetricList>
            <StatisticMetric label="Runs" value={batting.runsScored} />
            <StatisticMetric label="Balls faced" value={batting.ballsFaced} />
            <StatisticMetric label="Strike rate" value={batting.strikeRate ?? 'Not available'} />
            <StatisticMetric label="Fours" value={batting.fours} />
            <StatisticMetric label="Sixes" value={batting.sixes} />
          </MetricList>
        </section>
      ) : showUnavailable ? (
        <section aria-label="Batting statistics">
          <h4>Batting</h4>
          <p className="statistics-section__empty">No batting figures are available.</p>
        </section>
      ) : null}
      {bowling ? (
        <section aria-label="Bowling statistics">
          <h4>Bowling</h4>
          <MetricList>
            <StatisticMetric label="Runs conceded" value={bowling.runsConceded} />
            <StatisticMetric label="Legal balls" value={bowling.legalBallsBowled} />
            <StatisticMetric label="Overs" value={bowling.oversBowled} />
            <StatisticMetric label="Economy rate" value={bowling.economyRate ?? 'Not available'} />
            <StatisticMetric label="Wickets" value={bowling.wicketsTaken} />
          </MetricList>
        </section>
      ) : showUnavailable ? (
        <section aria-label="Bowling statistics">
          <h4>Bowling</h4>
          <p className="statistics-section__empty">No bowling figures are available.</p>
        </section>
      ) : null}
    </div>
  );
}

function StatisticValues({ statistic }: { statistic: FixtureStatistic }) {
  if (statistic.scope === 'innings') {
    return (
      <MetricList>
        <StatisticMetric label="Total runs" value={statistic.metrics.totalRuns} />
        <StatisticMetric label="Delivery runs" value={statistic.metrics.deliveryRuns} />
        <StatisticMetric label="Penalty runs" value={statistic.metrics.penaltyRuns} />
      </MetricList>
    );
  }

  return <PlayerPerformance batting={statistic.batting} bowling={statistic.bowling} />;
}

function StatisticCard({ statistic }: { statistic: FixtureStatistic }) {
  const fixtureId = encodeURIComponent(statistic.fixtureId);
  const statisticId = encodeURIComponent(statistic.statisticId);

  return (
    <li className="statistic-card">
      <header className="statistic-card__heading">
        <div>
          <p className="record-list__meta">
            {statistic.scope === 'innings'
              ? `Innings ${statistic.inningsOrdinal + 1}`
              : 'Player performance'}
          </p>
          <h3>
            {statistic.scope === 'innings' ? (
              <Link to={recordPath('competitors', statistic.competitorId)}>
                {statistic.competitorName}
              </Link>
            ) : (
              <Link to={recordPath('participants', statistic.participantId)}>
                {statistic.participantName}
              </Link>
            )}
          </h3>
          {statistic.scope === 'participant' &&
          statistic.competitorId &&
          statistic.competitorName ? (
            <p className="statistic-card__association">
              Team:{' '}
              <Link to={recordPath('competitors', statistic.competitorId)}>
                {statistic.competitorName}
              </Link>
            </p>
          ) : null}
        </div>
        <Link className="text-link" to={`/fixtures/${fixtureId}/statistics/${statisticId}`}>
          View calculation trace
        </Link>
      </header>
      <StatisticValues statistic={statistic} />
      <p className="statistic-card__source-count">
        Based on {statistic.sourceEventCount}{' '}
        {statistic.sourceEventCount === 1 ? 'accepted event' : 'accepted events'}.
      </p>
    </li>
  );
}

function StatisticsResults({
  headingLevel = 'h2',
  statistics,
}: {
  headingLevel?: 'h2' | 'h3';
  statistics: FixtureStatistics;
}) {
  const Heading: ElementType = headingLevel;
  const inningsStatistics = statistics.statistics.filter(
    (statistic) => statistic.scope === 'innings',
  );
  const participantStatistics = statistics.statistics.filter(
    (statistic) => statistic.scope === 'participant',
  );

  return (
    <>
      <section aria-labelledby="fixture-summary-heading" className="statistics-summary">
        <div className="statistics-section-heading">
          <Heading id="fixture-summary-heading">Match result</Heading>
          <p className={`statistics-status statistics-status--${statistics.status}`}>
            {statistics.status === 'complete' ? 'Complete data' : 'Partial data'}
          </p>
        </div>
        <RecordFacts>
          <RecordFact label="Outcome" value={formatOutcome(statistics.outcome)} />
          <RecordFact label="Super overs included" value="No" />
        </RecordFacts>
      </section>

      {statistics.warnings.length > 0 ? (
        <section aria-labelledby="statistics-warnings-heading" className="statistics-warnings">
          <Heading id="statistics-warnings-heading">Data notices</Heading>
          <ul>
            {statistics.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warning.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {statistics.statistics.length === 0 ? (
        <div className="state-message" role="status">
          <Heading>No match statistics available</Heading>
          <p>No published standard-innings statistics are currently available for this match.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="team-statistics-heading" className="statistics-section">
            <div className="statistics-section-heading">
              <div>
                <p className="eyebrow">By innings</p>
                <Heading id="team-statistics-heading">Innings totals</Heading>
              </div>
              <p>{inningsStatistics.length} published</p>
            </div>
            {inningsStatistics.length > 0 ? (
              <ul className="statistics-list">
                {inningsStatistics.map((statistic) => (
                  <StatisticCard key={statistic.statisticId} statistic={statistic} />
                ))}
              </ul>
            ) : (
              <p className="statistics-section__empty">No innings totals are available.</p>
            )}
          </section>

          <section aria-labelledby="participant-statistics-heading" className="statistics-section">
            <div className="statistics-section-heading">
              <div>
                <p className="eyebrow">By player</p>
                <Heading id="participant-statistics-heading">Player statistics</Heading>
              </div>
              <p>{participantStatistics.length} published</p>
            </div>
            {participantStatistics.length > 0 ? (
              <ul className="statistics-list">
                {participantStatistics.map((statistic) => (
                  <StatisticCard key={statistic.statisticId} statistic={statistic} />
                ))}
              </ul>
            ) : (
              <p className="statistics-section__empty">No player statistics are available.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}

function StatisticsContent({ statistics }: { statistics: FixtureStatistics }) {
  return (
    <article className="detail-page statistics-page content-boundary">
      <Link className="back-link" to={`/fixtures/${encodeURIComponent(statistics.fixtureId)}`}>
        Back to match overview
      </Link>
      <header className="page-heading page-heading--detail">
        <p className="eyebrow">Published match record</p>
        <h1>Match statistics</h1>
        <p>
          Basic totals calculated from accepted delivery events. Standard match statistics exclude
          super overs.
        </p>
      </header>
      <StatisticsResults statistics={statistics} />
    </article>
  );
}

export function FixtureStatisticsOverview({ fixtureId }: { fixtureId: string }) {
  const headingId = useId();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getFixtureStatistics(fixtureId, signal),
    [fixtureId],
  );
  const state = usePublicData(load, fixtureId);

  return (
    <section aria-labelledby={headingId} className="related-collection fixture-statistics-overview">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Published match record</p>
          <h2 id={headingId}>Match statistics</h2>
        </div>
      </div>

      {state.status === 'loading' ? (
        <div className="state-message" role="status">
          <h3>Loading match statistics</h3>
          <p>The published outcome and player performances are being requested.</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="state-message state-message--error" role="alert">
          <h3>Match statistics could not be loaded</h3>
          <p>Published match statistics could not be requested. Try this section again.</p>
          <button
            aria-label="Retry match statistics"
            className="button button--secondary"
            onClick={state.reload}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <StatisticsResults headingLevel="h3" statistics={state.data.data} />
      ) : null}
    </section>
  );
}

export function FixtureStatisticsPage() {
  const { fixtureId = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getFixtureStatistics(fixtureId, signal),
    [fixtureId],
  );
  const state = usePublicData(load, fixtureId);

  if (state.status === 'loading') {
    return (
      <div className="detail-page content-boundary">
        <DetailLoading label="fixture statistics" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="detail-page content-boundary">
        <DetailError error={state.error} label="Fixture statistics" reload={state.reload} />
      </div>
    );
  }

  return <StatisticsContent statistics={state.data.data} />;
}

function EventTrace({ event }: { event: StatisticContributingEvent }) {
  return (
    <li className="event-trace">
      <header>
        <p className="record-list__meta">Innings {event.inningsOrdinal + 1}</p>
        <h3>Delivery {event.sequenceNumber}</h3>
      </header>
      <dl>
        <StatisticMetric label="Total runs" value={event.runs.total} />
        <StatisticMetric label="Off bat" value={event.runs.offBat} />
        <StatisticMetric label="Extras" value={event.runs.extras} />
        <StatisticMetric label="Wides" value={event.extras.wides ?? 0} />
        <StatisticMetric label="No-balls" value={event.extras.noBalls ?? 0} />
        <StatisticMetric label="Byes" value={event.extras.byes ?? 0} />
        <StatisticMetric label="Leg-byes" value={event.extras.legByes ?? 0} />
        <StatisticMetric label="Penalty extras" value={event.extras.penalty ?? 0} />
        <StatisticMetric label="Bowler wickets" value={event.bowlerWickets} />
        <StatisticMetric label="Non-boundary" value={event.nonBoundary ? 'Yes' : 'No'} />
        <StatisticMetric
          label="Striker"
          value={
            <Link to={recordPath('participants', event.strikerParticipantId)}>
              {event.strikerParticipantName}
            </Link>
          }
        />
        <StatisticMetric
          label="Bowler"
          value={
            <Link to={recordPath('participants', event.bowlerParticipantId)}>
              {event.bowlerParticipantName}
            </Link>
          }
        />
      </dl>
    </li>
  );
}

function StatisticDetailContent({ statistic }: { statistic: FixtureStatistic }) {
  const fixtureId = encodeURIComponent(statistic.fixtureId);
  const title =
    statistic.scope === 'innings'
      ? `${statistic.competitorName} innings ${statistic.inningsOrdinal + 1} total`
      : `${statistic.participantName} performance`;
  const contributingEvents = statistic.contributingEvents ?? [];
  const exportFilters =
    statistic.scope === 'innings'
      ? { inningsId: statistic.inningsId, competitorId: statistic.competitorId }
      : { participantId: statistic.participantId };

  return (
    <article className="detail-page statistics-page content-boundary">
      <Link className="back-link" to={`/fixtures/${fixtureId}`}>
        Back to match overview
      </Link>
      <header className="page-heading page-heading--detail">
        <p className="eyebrow">Calculation trace</p>
        <h1>{title}</h1>
        <p>This published result is calculated from accepted events in their match order.</p>
      </header>

      <section aria-labelledby="published-result-heading" className="statistics-section">
        <div className="statistics-section-heading">
          <h2 id="published-result-heading">Published result</h2>
          <p>
            {statistic.sourceEventCount}{' '}
            {statistic.sourceEventCount === 1 ? 'source event' : 'source events'}
          </p>
        </div>
        <StatisticValues statistic={statistic} />
      </section>

      <section aria-labelledby="contributing-events-heading" className="statistics-section">
        <div className="statistics-section-heading">
          <div>
            <p className="eyebrow">How calculated</p>
            <h2 id="contributing-events-heading">Contributing events</h2>
          </div>
          <p>{contributingEvents.length} returned</p>
        </div>
        {statistic.scope === 'innings' && statistic.metrics.penaltyRuns > 0 ? (
          <p className="statistics-note">
            The delivery events trace delivery runs. The {statistic.metrics.penaltyRuns} penalty
            runs are recorded at innings level.
          </p>
        ) : null}
        <EventExportControls
          filters={exportFilters}
          fixtureId={statistic.fixtureId}
          hasEvents={contributingEvents.length > 0}
        />
        {contributingEvents.length > 0 ? (
          <ol className="event-trace-list">
            {contributingEvents.map((event) => (
              <EventTrace event={event} key={event.eventId} />
            ))}
          </ol>
        ) : (
          <div className="state-message" role="status">
            <h3>No contributing events available</h3>
            <p>No accepted delivery records are available for this calculation.</p>
          </div>
        )}
      </section>

      <RelatedLinks>
        <Link to={`/fixtures/${fixtureId}`}>Open match overview</Link>
        {statistic.scope === 'innings' ? (
          <Link to={recordPath('competitors', statistic.competitorId)}>
            Open {statistic.competitorName}
          </Link>
        ) : (
          <>
            <Link to={recordPath('participants', statistic.participantId)}>
              Open {statistic.participantName}
            </Link>
            {statistic.competitorId && statistic.competitorName ? (
              <Link to={recordPath('competitors', statistic.competitorId)}>
                Open {statistic.competitorName}
              </Link>
            ) : null}
          </>
        )}
      </RelatedLinks>
    </article>
  );
}

export function FixtureStatisticDetailPage() {
  const { fixtureId = '', statisticId = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getFixtureStatistic(fixtureId, statisticId, signal),
    [fixtureId, statisticId],
  );
  const state = usePublicData(load, `${fixtureId}:${statisticId}`);

  if (state.status === 'loading') {
    return (
      <div className="detail-page content-boundary">
        <DetailLoading label="statistic calculation" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="detail-page content-boundary">
        <DetailError error={state.error} label="Statistic calculation" reload={state.reload} />
      </div>
    );
  }

  return <StatisticDetailContent statistic={state.data.data} />;
}
