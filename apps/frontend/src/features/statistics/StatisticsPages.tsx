import type {
  FixtureStatistic,
  FixtureStatistics,
  ParticipantAggregateBowling,
  ParticipantFixtureBatting,
  ParticipantFixtureBowling,
  StatisticContributingEvent,
} from '@sport-analytics/contracts';
import { useCallback, useId, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs, LocalNavigation } from '../../components/NavigationPrimitives';
import { publicReadApi } from '../../api/public-read';
import { DetailError, DetailLoading, RelatedLinks } from '../browse/RecordDetail';
import { SectionBoundary, SectionError } from '../browse/SectionBoundary';
import { usePublicData } from '../browse/usePublicData';
import { EventExportControls } from './EventExportControls';
import { FixtureAnalytics } from './FixtureScorecards';
import { ParticipantAggregateView } from './ParticipantAggregateView';

function recordPath(resource: 'competitors' | 'participants', identifier: string) {
  return `/${resource}/${encodeURIComponent(identifier)}`;
}

function fixtureLabel(statistics: FixtureStatistics): string {
  const names = statistics.statistics
    .map((statistic) => statistic.competitorName)
    .filter((name): name is string => Boolean(name));
  const distinctNames = [...new Set(names)];
  return distinctNames.length > 0 ? distinctNames.join(' vs ') : 'Fixture';
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
  battingPosition,
  battingParticipation,
  dismissal,
  showUnavailable = false,
}: {
  batting: ParticipantFixtureBatting | null;
  bowling: ParticipantFixtureBowling | ParticipantAggregateBowling | null;
  battingPosition?: number | null;
  battingParticipation?: 'did_not_bat' | 'batted';
  dismissal?: {
    status: 'not_out' | 'dismissed';
    kind: string | null;
    eventId: string | null;
  } | null;
  showUnavailable?: boolean;
}) {
  return (
    <div className="participant-statistics">
      {batting ? (
        <section aria-label="Batting statistics">
          <h4>Batting</h4>
          <MetricList>
            {battingPosition !== null && battingPosition !== undefined ? (
              <StatisticMetric label="Batting position" value={battingPosition} />
            ) : null}
            <StatisticMetric
              label="Runs"
              value={
                dismissal?.status === 'not_out' ? (
                  <span aria-label={`${batting.runsScored} not out`}>{batting.runsScored}*</span>
                ) : (
                  batting.runsScored
                )
              }
            />
            <StatisticMetric label="Balls faced" value={batting.ballsFaced} />
            <StatisticMetric label="Strike rate" value={batting.strikeRate ?? '—'} />
            <StatisticMetric label="Fours" value={batting.fours} />
            <StatisticMetric label="Sixes" value={batting.sixes} />
            {dismissal?.status === 'dismissed' ? (
              <StatisticMetric label="Dismissal" value={dismissal.kind ?? 'Dismissed'} />
            ) : null}
          </MetricList>
        </section>
      ) : battingParticipation === 'did_not_bat' ? (
        <section aria-label="Batting statistics">
          <h4>Batting</h4>
          <p className="statistics-section__empty">Did not bat</p>
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
            <StatisticMetric label="Wides" value={bowling.wides} />
            <StatisticMetric label="No-balls" value={bowling.noBalls} />
            <StatisticMetric label="Overs" value={bowling.oversBowled ?? '—'} />
            <StatisticMetric label="Economy rate" value={bowling.economyRate ?? '—'} />
            <StatisticMetric label="Wickets" value={bowling.wicketsTaken} />
          </MetricList>
        </section>
      ) : showUnavailable ? (
        <section aria-label="Bowling statistics">
          <h4>Bowling</h4>
          <p className="statistics-section__empty">Did not bowl</p>
        </section>
      ) : null}
    </div>
  );
}

function StatisticValues({ statistic }: { statistic: FixtureStatistic }) {
  if (statistic.scope === 'innings') {
    return (
      <MetricList>
        <StatisticMetric label="Runs" value={statistic.metrics.totalRuns} />
        {statistic.metrics.penaltyRuns > 0 ? (
          <StatisticMetric label="Penalty runs" value={statistic.metrics.penaltyRuns} />
        ) : null}
      </MetricList>
    );
  }
  return (
    <PlayerPerformance
      batting={statistic.batting}
      bowling={statistic.bowling}
      battingPosition={statistic.battingPosition}
      battingParticipation={statistic.battingParticipation}
      dismissal={statistic.dismissal}
    />
  );
}

function StatisticsContent({
  statistics,
  retry,
}: {
  statistics: FixtureStatistics;
  retry(): void;
}) {
  const fixturePath = `/fixtures/${encodeURIComponent(statistics.fixtureId)}`;
  return (
    <article className="detail-page statistics-page content-boundary">
      <Breadcrumbs
        items={[
          { label: 'Fixtures', to: '/fixtures' },
          { label: fixtureLabel(statistics), to: fixturePath },
          { label: 'Statistics', to: '#' },
        ]}
      />
      <Link className="back-link" to={fixturePath}>
        Back to match overview
      </Link>
      <header className="page-heading page-heading--detail">
        <p className="eyebrow">Published match record</p>
        <h1>Match statistics</h1>
        <p>Cricket scorecards calculated from accepted delivery events.</p>
      </header>
      <LocalNavigation
        label="Fixture sections"
        items={[
          { label: 'Overview', to: fixturePath },
          { label: 'Statistics', to: `${fixturePath}/statistics` },
          { label: 'Players', to: `${fixturePath}/players` },
        ]}
      />
      <div className="fixture-statistics-overview">
        <SectionBoundary
          onRetry={retry}
          renderError={(boundaryRetry) => (
            <StatisticsSectionError
              reason="The published statistics could not be displayed."
              retry={boundaryRetry}
            />
          )}
        >
          <FixtureAnalytics statistics={statistics} />
        </SectionBoundary>
      </div>
    </article>
  );
}

function StatisticsSectionError({ reason, retry }: { reason: string; retry(): void }) {
  return (
    <SectionError
      description="Published match statistics could not be requested. Try this section again."
      reason={reason}
      retry={retry}
      retryLabel="Retry match statistics"
      title="Match statistics could not be loaded"
    />
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
        <StatisticsSectionError reason={state.error.message} retry={state.reload} />
      ) : null}
      {state.status === 'ready' ? (
        <SectionBoundary
          onRetry={state.reload}
          renderError={(retry) => (
            <StatisticsSectionError
              reason="The published statistics could not be displayed."
              retry={retry}
            />
          )}
        >
          <FixtureAnalytics statistics={state.data.data} />
        </SectionBoundary>
      ) : null}
    </section>
  );
}

function ParticipantStatisticsError({ reason, retry }: { reason: string; retry(): void }) {
  return (
    <SectionError
      description="Published career totals could not be requested. Try this section again."
      reason={reason}
      retry={retry}
      retryLabel="Retry career totals"
      title="Career totals could not be loaded"
    />
  );
}

export function ParticipantCareerOverview({ participantId }: { participantId: string }) {
  const headingId = useId();
  const load = useCallback(
    (signal: AbortSignal) =>
      publicReadApi.getParticipantAggregates(participantId, undefined, signal),
    [participantId],
  );
  const state = usePublicData(load, participantId);
  return (
    <section
      aria-labelledby={headingId}
      className="related-collection participant-aggregate-overview"
    >
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Published player statistics</p>
          <h2 id={headingId}>Career totals</h2>
        </div>
      </div>
      {state.status === 'loading' ? (
        <div className="state-message" role="status">
          <h3>Loading career totals</h3>
          <p>The career, competition and season records are being requested.</p>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <ParticipantStatisticsError reason={state.error.message} retry={state.reload} />
      ) : null}
      {state.status === 'ready' ? (
        <SectionBoundary
          onRetry={state.reload}
          renderError={(retry) => (
            <ParticipantStatisticsError
              reason="The published player statistics could not be displayed."
              retry={retry}
            />
          )}
        >
          <ParticipantAggregateView aggregates={state.data.data} />
        </SectionBoundary>
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
  if (state.status === 'loading')
    return (
      <div className="detail-page content-boundary">
        <DetailLoading label="fixture statistics" />
      </div>
    );
  if (state.status === 'error')
    return (
      <div className="detail-page content-boundary">
        <DetailError error={state.error} label="Fixture statistics" reload={state.reload} />
      </div>
    );
  return <StatisticsContent statistics={state.data.data} retry={state.reload} />;
}

function EventTrace({ event }: { event: StatisticContributingEvent }) {
  return (
    <li className="event-trace">
      <header>
        <p className="record-list__meta">Innings {event.inningsOrdinal}</p>
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
        {event.nonBoundary ? (
          <StatisticMetric
            label="Boundary"
            value="No — the runs were run, not hit to the boundary"
          />
        ) : null}
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
      ? `${statistic.competitorName} innings ${statistic.inningsOrdinal} total`
      : `${statistic.participantName} performance`;
  const contributingEvents = statistic.contributingEvents ?? [];
  const exportFilenameFilters =
    statistic.scope === 'innings'
      ? { inningsId: statistic.inningsId, competitorId: statistic.competitorId }
      : { participantId: statistic.participantId };
  return (
    <article className="detail-page statistics-page content-boundary">
      <Breadcrumbs
        items={[
          { label: 'Fixtures', to: '/fixtures' },
          { label: 'Fixture', to: `/fixtures/${fixtureId}` },
          { label: 'Statistics', to: `/fixtures/${fixtureId}/statistics` },
          { label: title, to: '#' },
        ]}
      />
      <Link className="back-link" to={`/fixtures/${fixtureId}/statistics`}>
        Back to match statistics
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
          eventCount={contributingEvents.length}
          filenameFilters={exportFilenameFilters}
          fixtureId={statistic.fixtureId}
          statisticId={statistic.statisticId}
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
  if (state.status === 'loading')
    return (
      <div className="detail-page content-boundary">
        <DetailLoading label="statistic calculation" />
      </div>
    );
  if (state.status === 'error')
    return (
      <div className="detail-page content-boundary">
        <DetailError error={state.error} label="Statistic calculation" reload={state.reload} />
      </div>
    );
  return <StatisticDetailContent statistic={state.data.data} />;
}
