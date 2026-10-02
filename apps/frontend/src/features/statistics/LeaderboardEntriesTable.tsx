import type { LeaderboardEntry } from '@sport-analytics/contracts';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';

/**
 * The ranked table a leaderboard is displayed as.
 *
 * It is presentational: it renders entries it is given and fetches nothing, so
 * the same table serves a page that loads a leaderboard itself and a caller that
 * already holds one. Extracted from `ScopeLeaderboards` for issue #816 without
 * changing its markup, so the published statistics pages and an answered
 * natural-language question cannot present the same ranking differently.
 */

const leaderboardNumber = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 });

export function LeaderboardEntriesTable({
  caption,
  entries,
  valueLabel,
}: {
  caption: string;
  entries: readonly LeaderboardEntry[];
  valueLabel: string;
}) {
  return (
    <DataTable caption={caption}>
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
        {entries.map((entry) => (
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
  );
}
