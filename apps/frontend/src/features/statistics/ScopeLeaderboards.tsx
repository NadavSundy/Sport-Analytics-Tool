import type { LeaderboardMetric, LeaderboardQuery } from '@sport-analytics/contracts';
import { useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import { publicReadApi } from '../../api/public-read';
import { DataTable } from '../../components/DataTable';
import { SectionError } from '../browse/SectionBoundary';
import { usePublicData } from '../browse/usePublicData';

type LeaderboardScope =
  { scope: 'season'; seasonId: string } | { scope: 'competition'; competitionId: string };

const leaderboardNumber = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 });

function LeaderboardPanel({
  metric,
  scope,
  title,
  valueLabel,
}: {
  metric: LeaderboardMetric;
  scope: LeaderboardScope;
  title: string;
  valueLabel: string;
}) {
  const headingId = useId();
  const scopeType = scope.scope;
  const scopeId = scope.scope === 'season' ? scope.seasonId : scope.competitionId;
  const load = useCallback(
    (signal: AbortSignal) => {
      const query: LeaderboardQuery =
        scopeType === 'season'
          ? { scope: scopeType, seasonId: scopeId, metric, limit: 5 }
          : { scope: scopeType, competitionId: scopeId, metric, limit: 5 };
      return publicReadApi.getLeaderboard(query, signal);
    },
    [metric, scopeId, scopeType],
  );
  const state = usePublicData(load, `${scopeType}:${scopeId}:${metric}`);

  return (
    <section aria-labelledby={headingId} className="scope-leaderboard">
      <h3 id={headingId}>{title}</h3>
      {state.status === 'loading' ? (
        <p className="statistics-section__empty" role="status">
          Loading {title.toLowerCase()}…
        </p>
      ) : null}
      {state.status === 'error' ? (
        <SectionError
          description={`The ${title.toLowerCase()} could not be requested. The other published statistics remain available.`}
          reason={state.error.message}
          retry={state.reload}
          retryLabel={`Retry ${title.toLowerCase()}`}
          title={`${title} could not be loaded`}
        />
      ) : null}
      {state.status === 'ready' && state.data.data.entries.length === 0 ? (
        <div className="state-message" role="status">
          <h4>No ranked players available</h4>
          <p>
            No accepted {metric === 'most_runs' ? 'batting' : 'bowling'} record is available for
            this scope.
          </p>
        </div>
      ) : null}
      {state.status === 'ready' && state.data.data.entries.length > 0 ? (
        <>
          <DataTable
            caption={`${title} for ${state.data.data.scope === 'season' ? state.data.data.season : state.data.data.competitionName}`}
          >
            <thead>
              <tr>
                <th scope="col" data-numeric>
                  Rank
                </th>
                <th scope="col">Player</th>
                <th scope="col" data-numeric>
                  {valueLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {state.data.data.entries.map((entry) => (
                <tr key={entry.participantId}>
                  <td data-numeric>{entry.rank}</td>
                  <th scope="row">
                    <Link to={`/participants/${encodeURIComponent(entry.participantId)}`}>
                      {entry.participantName}
                    </Link>
                  </th>
                  <td data-numeric>{leaderboardNumber.format(entry.value)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {state.data.data.qualification ? (
            <p className="statistics-note">{state.data.data.qualification.rationale}</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export function ScopeLeaderboards({ scope }: { scope: LeaderboardScope }) {
  const headingId = useId();
  const label = scope.scope === 'season' ? 'Season leaders' : 'Competition leaders';

  return (
    <section aria-labelledby={headingId} className="statistics-section scope-leaderboards">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Across published matches</p>
          <h2 id={headingId}>{label}</h2>
        </div>
      </div>
      <p className="scope-description">
        Server-ranked from accepted standard-innings events in this scope. Super overs are excluded;
        players are not ranked in the browser.
      </p>
      <div className="scope-leaderboards__grid">
        <LeaderboardPanel
          metric="most_runs"
          scope={scope}
          title="Leading run scorers"
          valueLabel="Runs"
        />
        <LeaderboardPanel
          metric="most_wickets"
          scope={scope}
          title="Leading wicket takers"
          valueLabel="Wickets"
        />
      </div>
    </section>
  );
}
