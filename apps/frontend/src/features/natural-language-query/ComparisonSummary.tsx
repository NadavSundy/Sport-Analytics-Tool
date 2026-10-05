import type { ParticipantAggregates } from '@sport-analytics/contracts';
import { useId } from 'react';
import { DataTable } from '../../components/DataTable';
import { ParticipantAggregateView } from '../statistics/ParticipantAggregateView';
import { METRICS, figure, pointedStatistic, type Metric } from './figures';
import { scopedAggregates } from './scopedAggregates';

/**
 * Two players' key figures side by side (issue #851).
 *
 * A reader comparing two players wants a handful of numbers, not two full
 * aggregates to scroll between. The full figures stay one click away rather than
 * being replaced: this summarises, it does not decide what matters.
 *
 * Two rules it has to get right. The leader is named in words, because an
 * indication carried only by colour is no indication to a reader who cannot see
 * it. And a smaller number is better for a bowling average and an economy rate, so
 * those comparisons run the other way; getting that backwards would quietly praise
 * the worse bowler.
 */

type Lead = 'first' | 'second' | 'tied' | 'incomparable';

function leadFor(metric: Metric, first: number | null, second: number | null): Lead {
  if (first === null || second === null) {
    return 'incomparable';
  }
  if (first === second) {
    return 'tied';
  }

  const firstLeads = metric.lowerIsBetter ? first < second : first > second;
  return firstLeads ? 'first' : 'second';
}

function Value({ leads, value }: { leads: boolean; value: number | null }) {
  if (value === null) {
    return (
      <td data-numeric>
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">Not published</span>
      </td>
    );
  }

  return (
    <td data-numeric>
      {leads ? (
        <>
          <strong>{figure.format(value)}</strong>{' '}
          <span aria-hidden="true" className="comparison-summary__marker">
            ▲
          </span>
          <span className="visually-hidden"> leads</span>
        </>
      ) : (
        figure.format(value)
      )}
    </td>
  );
}

export interface ComparisonSide {
  aggregates: ParticipantAggregates;
  statisticIds: readonly string[];
}

export function ComparisonSummary({
  first,
  second,
}: {
  first: ComparisonSide;
  second: ComparisonSide;
}) {
  const captionId = useId();
  const firstStatistic = pointedStatistic(
    scopedAggregates(first.aggregates, first.statisticIds).statistics,
  );
  const secondStatistic = pointedStatistic(
    scopedAggregates(second.aggregates, second.statisticIds).statistics,
  );

  const rows = METRICS.map((metric) => ({
    metric,
    first: metric.value(firstStatistic),
    second: metric.value(secondStatistic),
  })).filter((row) => row.first !== null || row.second !== null);

  const missing = [
    { side: first, statistic: firstStatistic },
    { side: second, statistic: secondStatistic },
  ].filter((player) => player.statistic === undefined);

  return (
    <div className="comparison-summary">
      {missing.length > 0 ? (
        <p className="ask-question__note" role="status">
          {missing.map((player) => player.side.aggregates.participantName).join(' and ')} has no
          published figures for the scope this question asked about.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <DataTable
          caption={`${first.aggregates.participantName} compared with ${second.aggregates.participantName}`}
        >
          <thead>
            <tr>
              <th id={captionId} scope="col">
                Metric
              </th>
              <th scope="col" data-numeric>
                {first.aggregates.participantName}
              </th>
              <th scope="col" data-numeric>
                {second.aggregates.participantName}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const lead = leadFor(row.metric, row.first, row.second);
              return (
                <tr key={row.metric.label}>
                  <th scope="row">
                    {row.metric.label}
                    {lead === 'tied' ? <span className="visually-hidden"> tied</span> : null}
                  </th>
                  <Value leads={lead === 'first'} value={row.first} />
                  <Value leads={lead === 'second'} value={row.second} />
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : null}

      <details className="comparison-summary__full">
        <summary>Full published statistics</summary>
        <ParticipantAggregateView aggregates={first.aggregates} />
        <ParticipantAggregateView aggregates={second.aggregates} />
      </details>
    </div>
  );
}
