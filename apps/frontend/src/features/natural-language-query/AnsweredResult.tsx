import type { NaturalLanguageQueryResult, ParticipantAggregates } from '@sport-analytics/contracts';
import { Link } from 'react-router-dom';
import { LeaderboardEntriesTable } from '../statistics/LeaderboardEntriesTable';
import { ComparisonSummary } from './ComparisonSummary';
import { ScopedFigures } from './ScopedFigures';

/**
 * Renders an answered question with the components the published statistics pages
 * use, so the same figures cannot be presented two different ways.
 *
 * Every answer also links to the published page the result came from. The
 * platform published it; this is a second route to the same thing, not a new
 * source, and a reader should be able to leave here and check it.
 */

const METRIC_VALUE_LABELS: Record<string, string> = {
  most_runs: 'Runs',
  most_wickets: 'Wickets',
  most_fours: 'Fours',
  most_sixes: 'Sixes',
  highest_batting_average: 'Average',
  highest_strike_rate: 'Strike rate',
  best_bowling_average: 'Average',
  best_economy_rate: 'Economy',
  best_bowling_strike_rate: 'Strike rate',
};

function PublishedLinks({ evaluation }: { evaluation: NaturalLanguageQueryResult['evaluation'] }) {
  if (evaluation.outcome !== 'answered') {
    return null;
  }

  const { resolved, definition } = evaluation;
  const links: { to: string; label: string }[] = [];

  if (definition.kind === 'leaderboard') {
    if (resolved.seasonId) {
      links.push({ to: `/seasons/${encodeURIComponent(resolved.seasonId)}`, label: 'this season' });
    } else if (resolved.competitionId) {
      links.push({
        to: `/competitions/${encodeURIComponent(resolved.competitionId)}`,
        label: 'this competition',
      });
    }
  }

  for (const participantId of resolved.participantIds) {
    links.push({
      to: `/participants/${encodeURIComponent(participantId)}`,
      label: `player ${participantId}`,
    });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <p className="ask-question__sources">
      Published page{links.length > 1 ? 's' : ''}:{' '}
      {links.map((link, index) => (
        <span key={link.to}>
          {index > 0 ? ', ' : null}
          <Link to={link.to}>{link.label}</Link>
        </span>
      ))}
    </p>
  );
}

export function AnsweredResult({
  evaluation,
}: {
  evaluation: NaturalLanguageQueryResult['evaluation'];
}) {
  if (evaluation.outcome !== 'answered') {
    return null;
  }

  const { definition } = evaluation;

  if (definition.kind === 'leaderboard') {
    const leaderboard = evaluation.result as Extract<
      typeof evaluation.result,
      { entries: unknown[] }
    >;

    return (
      <div className="ask-question__answer">
        <LeaderboardEntriesTable
          caption={`${definition.metric.replaceAll('_', ' ')} ranking`}
          entries={leaderboard.entries}
          valueLabel={METRIC_VALUE_LABELS[definition.metric] ?? 'Value'}
        />
        {leaderboard.qualification ? (
          <p className="statistics-note">{leaderboard.qualification.rationale}</p>
        ) : null}
        <PublishedLinks evaluation={evaluation} />
      </div>
    );
  }

  if (definition.kind === 'participant_statistics') {
    return (
      <div className="ask-question__answer">
        <ScopedFigures
          aggregates={evaluation.result as ParticipantAggregates}
          statisticIds={evaluation.sources[0]?.statisticIds ?? []}
        />
        <PublishedLinks evaluation={evaluation} />
      </div>
    );
  }

  const [firstResult, secondResult] = evaluation.result as [
    ParticipantAggregates,
    ParticipantAggregates,
  ];

  return (
    <div className="ask-question__answer ask-question__answer--comparison">
      <ComparisonSummary
        first={{
          aggregates: firstResult,
          statisticIds: evaluation.sources[0]?.statisticIds ?? [],
        }}
        second={{
          aggregates: secondResult,
          statisticIds: evaluation.sources[1]?.statisticIds ?? [],
        }}
      />
      <PublishedLinks evaluation={evaluation} />
    </div>
  );
}
