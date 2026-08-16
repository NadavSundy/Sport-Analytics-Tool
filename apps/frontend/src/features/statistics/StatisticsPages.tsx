import type {
  FixtureOutcome,
  FixtureStatistic,
  FixtureStatistics,
  StatisticContributingEvent,
} from '@sport-analytics/contracts';
import { useCallback, type ReactNode } from 'react';
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

function recordPath(resource: 'competitors' | 'participants', identifier: string) {
  return `/${resource}/${encodeURIComponent(identifier)}`;
}

function formatOutcome(outcome: FixtureOutcome): string {
  if (outcome.kind === 'won') {
    const margin = outcome.margin ? ` by ${outcome.margin.value} ${outcome.margin.type}` : '';
    const method = outcome.method ? ` (${outcome.method})` : '';
    return `Competitor ${outcome.winnerCompetitorId ?? 'unknown'} won${margin}${method}.`;
  }

  if (outcome.kind === 'no_result') {
    return 'No result.';
  }

  return `${outcome.kind === 'tie' ? 'Tie' : 'Draw'}.`;
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

  return (
    <div className="participant-statistics">
      {statistic.batting ? (
        <section aria-label="Batting statistics">
          <h4>Batting</h4>
          <MetricList>
            <StatisticMetric label="Runs" value={statistic.batting.runsScored} />
            <StatisticMetric label="Balls faced" value={statistic.batting.ballsFaced} />
            <StatisticMetric
              label="Strike rate"
              value={statistic.batting.strikeRate ?? 'Not available'}
            />
            <StatisticMetric label="Fours" value={statistic.batting.fours} />
            <StatisticMetric label="Sixes" value={statistic.batting.sixes} />
          </MetricList>
        </section>
      ) : null}
      {statistic.bowling ? (
        <section aria-label="Bowling statistics">
          <h4>Bowling</h4>
          <MetricList>
            <StatisticMetric label="Runs conceded" value={statistic.bowling.runsConceded} />
            <StatisticMetric label="Legal balls" value={statistic.bowling.legalBallsBowled} />
            <StatisticMetric label="Overs" value={statistic.bowling.oversBowled} />
            <StatisticMetric
              label="Economy rate"
              value={statistic.bowling.economyRate ?? 'Not available'}
            />
            <StatisticMetric label="Wickets" value={statistic.bowling.wicketsTaken} />
          </MetricList>
        </section>
      ) : null}
    </div>
  );
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
              : 'Fixture participant'}
          </p>
          <h3>
            {statistic.scope === 'innings' ? (
              <Link to={recordPath('competitors', statistic.competitorId)}>
                Competitor {statistic.competitorId}
              </Link>
            ) : (
              <Link to={recordPath('participants', statistic.participantId)}>
                Participant {statistic.participantId}
              </Link>
            )}
          </h3>
          {statistic.scope === 'participant' && statistic.competitorId ? (
            <p className="statistic-card__association">
              Team:{' '}
              <Link to={recordPath('competitors', statistic.competitorId)}>
                competitor {statistic.competitorId}
              </Link>
            </p>
          ) : null}
        </div>
        <Link className="text-link" to={`/fixtures/${fixtureId}/statistics/${statisticId}`}>
          How calculated
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

function StatisticsContent({ statistics }: { statistics: FixtureStatistics }) {
  const inningsStatistics = statistics.statistics.filter(
    (statistic) => statistic.scope === 'innings',
  );
  const participantStatistics = statistics.statistics.filter(
    (statistic) => statistic.scope === 'participant',
  );

  return (
    <article className="detail-page statistics-page content-boundary">
      <Link className="back-link" to={`/fixtures/${encodeURIComponent(statistics.fixtureId)}`}>
        Back to fixture
      </Link>
      <header className="page-heading page-heading--detail">
        <p className="eyebrow">Published fixture record</p>
        <h1>Fixture statistics</h1>
        <p>
          Basic totals calculated from accepted delivery events. Standard fixture statistics exclude
          super overs.
        </p>
      </header>

      <section aria-labelledby="fixture-summary-heading" className="statistics-summary">
        <div className="statistics-section-heading">
          <h2 id="fixture-summary-heading">Fixture summary</h2>
          <p className={`statistics-status statistics-status--${statistics.status}`}>
            {statistics.status === 'complete' ? 'Complete data' : 'Partial data'}
          </p>
        </div>
        <RecordFacts>
          <RecordFact label="Fixture ID" value={statistics.fixtureId} />
          <RecordFact label="Outcome" value={formatOutcome(statistics.outcome)} />
          <RecordFact label="Super overs included" value="No" />
        </RecordFacts>
      </section>

      {statistics.warnings.length > 0 ? (
        <section aria-labelledby="statistics-warnings-heading" className="statistics-warnings">
          <h2 id="statistics-warnings-heading">Data notices</h2>
          <ul>
            {statistics.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warning.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {statistics.statistics.length === 0 ? (
        <div className="state-message" role="status">
          <h2>No fixture statistics available</h2>
          <p>No accepted standard-innings events are currently available for this fixture.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="team-statistics-heading" className="statistics-section">
            <div className="statistics-section-heading">
              <div>
                <p className="eyebrow">By innings</p>
                <h2 id="team-statistics-heading">Competitor totals</h2>
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
              <p className="statistics-section__empty">No competitor totals are available.</p>
            )}
          </section>

          <section aria-labelledby="participant-statistics-heading" className="statistics-section">
            <div className="statistics-section-heading">
              <div>
                <p className="eyebrow">By player</p>
                <h2 id="participant-statistics-heading">Participant statistics</h2>
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
              <p className="statistics-section__empty">No participant statistics are available.</p>
            )}
          </section>
        </>
      )}

      <RelatedLinks>
        <Link to={`/fixtures/${encodeURIComponent(statistics.fixtureId)}`}>Open fixture</Link>
        <Link to={`/participants?fixtureId=${encodeURIComponent(statistics.fixtureId)}`}>
          Browse fixture participants
        </Link>
      </RelatedLinks>
    </article>
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
        <h3>Event {event.sequenceNumber}</h3>
      </header>
      <dl>
        <StatisticMetric label="Event reference" value={event.eventId} />
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
              Participant {event.strikerParticipantId}
            </Link>
          }
        />
        <StatisticMetric
          label="Bowler"
          value={
            <Link to={recordPath('participants', event.bowlerParticipantId)}>
              Participant {event.bowlerParticipantId}
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
      ? `Innings ${statistic.inningsOrdinal + 1} team total`
      : `Participant ${statistic.participantId}`;
  const contributingEvents = statistic.contributingEvents ?? [];

  return (
    <article className="detail-page statistics-page content-boundary">
      <Link className="back-link" to={`/fixtures/${fixtureId}/statistics`}>
        Back to fixture statistics
      </Link>
      <header className="page-heading page-heading--detail">
        <p className="eyebrow">Calculation trace</p>
        <h1>{title}</h1>
        <p>
          This published result is calculated from accepted events in innings and event-sequence
          order.
        </p>
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
        {contributingEvents.length > 0 ? (
          <ol className="event-trace-list">
            {contributingEvents.map((event) => (
              <EventTrace event={event} key={event.eventId} />
            ))}
          </ol>
        ) : (
          <div className="state-message" role="status">
            <h3>No contributing events available</h3>
            <p>The public API did not return accepted delivery events for this statistic.</p>
          </div>
        )}
      </section>

      <RelatedLinks>
        <Link to={`/fixtures/${fixtureId}`}>Open fixture</Link>
        {statistic.scope === 'innings' ? (
          <Link to={recordPath('competitors', statistic.competitorId)}>Open competitor</Link>
        ) : (
          <>
            <Link to={recordPath('participants', statistic.participantId)}>Open participant</Link>
            {statistic.competitorId ? (
              <Link to={recordPath('competitors', statistic.competitorId)}>Open competitor</Link>
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
