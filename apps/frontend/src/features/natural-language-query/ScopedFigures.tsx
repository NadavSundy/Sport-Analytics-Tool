import type { ParticipantAggregates } from '@sport-analytics/contracts';
import { DataTable } from '../../components/DataTable';
import { ParticipantAggregateView } from '../statistics/ParticipantAggregateView';
import { METRICS, figure, pointedStatistic } from './figures';
import { scopedAggregates } from './scopedAggregates';

/**
 * One player's figures for the scope the question asked about (issue #851).
 *
 * Narrowing the published aggregate to the row `statisticIds` points at is
 * necessary but not sufficient: `ParticipantAggregateView` is built for the player
 * page, where every scope is present, and it opens on its career tab. A reader who
 * asked about the 2024 IPL season would be shown "No career totals available" and
 * have to find the season tab themselves.
 *
 * So the asked-for row is rendered directly, and the full published view stays
 * behind a disclosure — the same shape as the head-to-head, and the same metric
 * list, so a single answer and a comparison agree about what matters.
 *
 * The disclosure is given the whole published aggregate, not the narrowed one: it
 * says "full published statistics", and a narrowed aggregate shown there would be
 * neither full nor honest about it.
 */
export function ScopedFigures({
  aggregates,
  statisticIds,
}: {
  aggregates: ParticipantAggregates;
  statisticIds: readonly string[];
}) {
  const statistic = pointedStatistic(scopedAggregates(aggregates, statisticIds).statistics);

  if (!statistic) {
    return (
      <p className="ask-question__note" role="status">
        {aggregates.participantName} has no published figures for the scope this question asked
        about.
      </p>
    );
  }

  const rows = METRICS.map((metric) => ({ metric, value: metric.value(statistic) })).filter(
    (row) => row.value !== null,
  );

  return (
    <div className="scoped-figures">
      <DataTable caption={`${aggregates.participantName}: the figures this question asked for`}>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col" data-numeric>
              {aggregates.participantName}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric.label}>
              <th scope="row">{row.metric.label}</th>
              <td data-numeric>{figure.format(row.value as number)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <details className="comparison-summary__full">
        <summary>Full published statistics</summary>
        <ParticipantAggregateView aggregates={aggregates} />
      </details>
    </div>
  );
}
