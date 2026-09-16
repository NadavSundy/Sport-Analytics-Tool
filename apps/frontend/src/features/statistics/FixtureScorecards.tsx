import type {
  FixtureOutcome,
  FixtureStatistics,
  InningsTeamStatistic,
  ParticipantFixtureStatistic,
} from '@sport-analytics/contracts';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { StatisticsDefinitions } from './StatisticsDefinitions';

function recordPath(resource: 'competitors' | 'participants', identifier: string) {
  return `/${resource}/${encodeURIComponent(identifier)}`;
}

function formatOutcome(outcome: FixtureOutcome): string {
  if (outcome.kind === 'won') {
    const margin = outcome.margin ? ` by ${outcome.margin.value} ${outcome.margin.type}` : '';
    const method = outcome.method ? ` (${outcome.method})` : '';
    return `${outcome.winnerCompetitorName ?? 'Winning team name unavailable'} won${margin}${method}.`;
  }
  if (outcome.kind === 'no_result') return 'No result.';
  if (outcome.kind === 'draw') return 'Match drawn.';

  const deciderWinner = outcome.eliminatorCompetitorName ?? outcome.winnerCompetitorName;
  if (outcome.decidedByBowlOut && deciderWinner) {
    return `Match tied; ${deciderWinner} won the bowl-out.`;
  }
  if (outcome.eliminatorCompetitorName) {
    return `Match tied; ${outcome.eliminatorCompetitorName} won the eliminator.`;
  }
  return 'Match tied.';
}

function formatRate(value: number | null): string | number {
  return value ?? '—';
}

function dismissalLabel(statistic: ParticipantFixtureStatistic): string {
  if (statistic.battingParticipation === 'did_not_bat') return 'Did not bat';
  if (statistic.dismissal?.status === 'not_out') return 'not out';
  return statistic.dismissal?.kind ?? 'Dismissed';
}

function compareNames(
  left: ParticipantFixtureStatistic,
  right: ParticipantFixtureStatistic,
): number {
  return (
    left.participantName.localeCompare(right.participantName) ||
    left.participantId.localeCompare(right.participantId)
  );
}

export function leadingBatters(statistics: ParticipantFixtureStatistic[]) {
  return statistics
    .filter((statistic) => statistic.batting !== null)
    .sort(
      (left, right) =>
        (right.batting?.runsScored ?? 0) - (left.batting?.runsScored ?? 0) ||
        compareNames(left, right),
    )
    .slice(0, 3);
}

export function leadingBowlers(statistics: ParticipantFixtureStatistic[]) {
  return statistics
    .filter((statistic) => statistic.bowling !== null)
    .sort(
      (left, right) =>
        (right.bowling?.wicketsTaken ?? 0) - (left.bowling?.wicketsTaken ?? 0) ||
        compareNames(left, right),
    )
    .slice(0, 3);
}

function MatchSummary({
  innings,
  statistics,
}: {
  innings: InningsTeamStatistic[];
  statistics: FixtureStatistics;
}) {
  return (
    <section aria-labelledby="fixture-summary-heading" className="match-summary">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Match summary</p>
          <h3 id="fixture-summary-heading">{formatOutcome(statistics.outcome)}</h3>
        </div>
        <p className={`statistics-status statistics-status--${statistics.status}`}>
          {statistics.status === 'complete' ? 'Complete statistics' : 'Partial statistics'}
        </p>
      </div>
      {innings.length > 0 ? (
        <div className="match-summary__scores">
          {innings.map((statistic) => (
            <div key={statistic.statisticId}>
              <Link to={recordPath('competitors', statistic.competitorId)}>
                {statistic.competitorName}
              </Link>
              <strong>
                {statistic.metrics.totalRuns}/{statistic.metrics.wicketsLost}
              </strong>
              <span>
                {statistic.metrics.overs} overs · RR {formatRate(statistic.metrics.runRate)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function InningsSummary({ innings }: { innings: InningsTeamStatistic[] }) {
  return (
    <section aria-labelledby="innings-summary-heading" className="statistics-section">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">By innings</p>
          <h3 id="innings-summary-heading">Innings summary</h3>
        </div>
      </div>
      {innings.length > 0 ? (
        <>
          <DataTable
            caption="Score, progress, run rate and extras for each standard innings"
            className="statistics-table statistics-table--innings"
          >
            <colgroup>
              <col className="statistics-table__entity" />
              <col className="statistics-table__metric" span={4} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col" data-numeric>
                  Score
                </th>
                <th scope="col" data-numeric>
                  Overs
                </th>
                <th scope="col" data-numeric>
                  RR
                </th>
                <th scope="col" data-numeric>
                  Extras
                </th>
              </tr>
            </thead>
            <tbody>
              {innings.map((statistic) => (
                <tr key={statistic.statisticId}>
                  <th scope="row">
                    <Link to={recordPath('competitors', statistic.competitorId)}>
                      {statistic.competitorName}
                    </Link>
                  </th>
                  <td data-numeric>
                    {statistic.metrics.totalRuns}/{statistic.metrics.wicketsLost}
                  </td>
                  <td data-numeric>{statistic.metrics.overs}</td>
                  <td data-numeric>{formatRate(statistic.metrics.runRate)}</td>
                  <td data-numeric>{statistic.metrics.extras.total}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <details className="innings-extras">
            <summary>Extras breakdown</summary>
            <DataTable
              caption="Extras by innings"
              className="statistics-table statistics-table--extras"
            >
              <colgroup>
                <col className="statistics-table__entity" />
                <col className="statistics-table__metric" span={5} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col" data-numeric>
                    WD
                  </th>
                  <th scope="col" data-numeric>
                    NB
                  </th>
                  <th scope="col" data-numeric>
                    B
                  </th>
                  <th scope="col" data-numeric>
                    LB
                  </th>
                  <th scope="col" data-numeric>
                    Pen
                  </th>
                </tr>
              </thead>
              <tbody>
                {innings.map((statistic) => (
                  <tr key={statistic.statisticId}>
                    <th scope="row">{statistic.competitorName}</th>
                    <td data-numeric>{statistic.metrics.extras.wides}</td>
                    <td data-numeric>{statistic.metrics.extras.noBalls}</td>
                    <td data-numeric>{statistic.metrics.extras.byes}</td>
                    <td data-numeric>{statistic.metrics.extras.legByes}</td>
                    <td data-numeric>{statistic.metrics.extras.penaltyRuns}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </details>
        </>
      ) : (
        <p className="statistics-section__empty">No innings totals are available.</p>
      )}
    </section>
  );
}

function MatchLeaders({ players }: { players: ParticipantFixtureStatistic[] }) {
  const batters = leadingBatters(players);
  const bowlers = leadingBowlers(players);
  const battingRank = (index: number) =>
    batters.findIndex(
      (statistic) => statistic.batting?.runsScored === batters[index]?.batting?.runsScored,
    ) + 1;
  const bowlingRank = (index: number) =>
    bowlers.findIndex(
      (statistic) => statistic.bowling?.wicketsTaken === bowlers[index]?.bowling?.wicketsTaken,
    ) + 1;
  if (batters.length === 0 && bowlers.length === 0) return null;

  return (
    <section aria-labelledby="match-leaders-heading" className="statistics-section match-leaders">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Standout performances</p>
          <h3 id="match-leaders-heading">Match leaders</h3>
        </div>
      </div>
      <div className="match-leaders__grid">
        <section aria-labelledby="leading-runs-heading">
          <h4 id="leading-runs-heading">Leading run scorers</h4>
          {batters.length > 0 ? (
            <ol>
              {batters.map((statistic, index) => (
                <li key={statistic.statisticId}>
                  <span className="match-leaders__rank">{battingRank(index)}</span>
                  <span>
                    <Link to={recordPath('participants', statistic.participantId)}>
                      {statistic.participantName}
                    </Link>
                    <small>{statistic.competitorName}</small>
                  </span>
                  <strong>{statistic.batting?.runsScored}</strong>
                  <span>
                    {statistic.batting?.ballsFaced} balls · SR{' '}
                    {formatRate(statistic.batting?.strikeRate ?? null)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="statistics-section__empty">No batting record is available.</p>
          )}
        </section>
        <section aria-labelledby="leading-wickets-heading">
          <h4 id="leading-wickets-heading">Leading wicket takers</h4>
          {bowlers.length > 0 ? (
            <ol>
              {bowlers.map((statistic, index) => (
                <li key={statistic.statisticId}>
                  <span className="match-leaders__rank">{bowlingRank(index)}</span>
                  <span>
                    <Link to={recordPath('participants', statistic.participantId)}>
                      {statistic.participantName}
                    </Link>
                    <small>{statistic.competitorName}</small>
                  </span>
                  <strong>{statistic.bowling?.wicketsTaken}</strong>
                  <span>
                    {statistic.bowling?.runsConceded} runs · {statistic.bowling?.oversBowled} overs
                    · Econ {formatRate(statistic.bowling?.economyRate ?? null)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="statistics-section__empty">No bowling record is available.</p>
          )}
        </section>
      </div>
      <p className="statistics-note">
        Players level on the headline measure share that measure; names provide only a stable
        display order.
      </p>
    </section>
  );
}

function teamGroups(players: ParticipantFixtureStatistic[], innings: InningsTeamStatistic[]) {
  const groups = new Map<
    string,
    { id: string | null; name: string; players: ParticipantFixtureStatistic[] }
  >();
  for (const player of players) {
    const key = player.competitorId ?? 'unknown';
    const group = groups.get(key) ?? {
      id: player.competitorId,
      name: player.competitorName ?? 'Team unavailable',
      players: [],
    };
    group.players.push(player);
    groups.set(key, group);
  }
  const inningsOrder = new Map<string, number>();
  for (const statistic of innings) {
    if (!inningsOrder.has(statistic.competitorId)) {
      inningsOrder.set(statistic.competitorId, statistic.inningsOrdinal);
    }
  }
  return [...groups.values()].sort((left, right) => {
    const leftOrder = left.id ? inningsOrder.get(left.id) : undefined;
    const rightOrder = right.id ? inningsOrder.get(right.id) : undefined;
    if (leftOrder === undefined || rightOrder === undefined) {
      return Number(leftOrder === undefined) - Number(rightOrder === undefined);
    }
    return leftOrder - rightOrder;
  });
}

function BattingScorecards({
  innings,
  players,
}: {
  innings: InningsTeamStatistic[];
  players: ParticipantFixtureStatistic[];
}) {
  return (
    <section
      aria-labelledby="batting-scorecard-heading"
      className="statistics-section scorecard-section"
    >
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">By player</p>
          <h3 id="batting-scorecard-heading">Batting scorecard</h3>
        </div>
      </div>
      {teamGroups(players, innings).map((group) => {
        const ordered = [...group.players].sort((left, right) => {
          if (left.battingPosition !== null && right.battingPosition !== null) {
            return left.battingPosition - right.battingPosition;
          }
          if (left.battingPosition !== null) return -1;
          if (right.battingPosition !== null) return 1;
          return compareNames(left, right);
        });
        return (
          <div className="scorecard-group" key={group.id ?? 'unknown'}>
            <h4>{group.name}</h4>
            <DataTable
              caption={`${group.name} batting scorecard`}
              className="statistics-table statistics-table--batting"
            >
              <colgroup>
                <col className="statistics-table__entity" />
                <col className="statistics-table__metric" span={5} />
                <col className="statistics-table__detail" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col" data-numeric>
                    R
                  </th>
                  <th scope="col" data-numeric>
                    B
                  </th>
                  <th scope="col" data-numeric>
                    4s
                  </th>
                  <th scope="col" data-numeric>
                    6s
                  </th>
                  <th scope="col" data-numeric>
                    SR
                  </th>
                  <th scope="col">Dismissal</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((statistic) => (
                  <tr key={statistic.statisticId}>
                    <th scope="row">
                      <Link to={recordPath('participants', statistic.participantId)}>
                        {statistic.participantName}
                      </Link>
                    </th>
                    {statistic.batting ? (
                      <>
                        <td
                          data-numeric
                          aria-label={
                            statistic.dismissal?.status === 'not_out'
                              ? `${statistic.batting.runsScored} not out`
                              : undefined
                          }
                        >
                          {statistic.batting.runsScored}
                          {statistic.dismissal?.status === 'not_out' ? '*' : ''}
                        </td>
                        <td data-numeric>{statistic.batting.ballsFaced}</td>
                        <td data-numeric>{statistic.batting.fours}</td>
                        <td data-numeric>{statistic.batting.sixes}</td>
                        <td data-numeric>{formatRate(statistic.batting.strikeRate)}</td>
                        <td>{dismissalLabel(statistic)}</td>
                      </>
                    ) : (
                      <td colSpan={6}>Did not bat</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        );
      })}
      {players.length === 0 ? (
        <p className="statistics-section__empty">No batting record is available.</p>
      ) : null}
    </section>
  );
}

function BowlingScorecards({
  innings,
  players,
}: {
  innings: InningsTeamStatistic[];
  players: ParticipantFixtureStatistic[];
}) {
  const groups = teamGroups(
    players.map((player) => player),
    innings,
  )
    .map((group) => ({
      ...group,
      players: group.players.filter((player) => player.bowling !== null).sort(compareNames),
    }))
    .filter((group) => group.players.length > 0);

  return (
    <section
      aria-labelledby="bowling-scorecard-heading"
      className="statistics-section scorecard-section"
    >
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">By bowler</p>
          <h3 id="bowling-scorecard-heading">Bowling scorecard</h3>
        </div>
      </div>
      {groups.map((group) => (
        <div className="scorecard-group" key={group.id ?? 'unknown'}>
          <h4>{group.name}</h4>
          <DataTable
            caption={`${group.name} bowling scorecard`}
            className="statistics-table statistics-table--bowling"
          >
            <colgroup>
              <col className="statistics-table__entity" />
              <col className="statistics-table__metric" span={6} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Bowler</th>
                <th scope="col" data-numeric>
                  O
                </th>
                <th scope="col" data-numeric>
                  R
                </th>
                <th scope="col" data-numeric>
                  W
                </th>
                <th scope="col" data-numeric>
                  Econ
                </th>
                <th scope="col" data-numeric>
                  WD
                </th>
                <th scope="col" data-numeric>
                  NB
                </th>
              </tr>
            </thead>
            <tbody>
              {group.players.map((statistic) => (
                <tr key={statistic.statisticId}>
                  <th scope="row">
                    <Link to={recordPath('participants', statistic.participantId)}>
                      {statistic.participantName}
                    </Link>
                  </th>
                  <td data-numeric>{statistic.bowling?.oversBowled}</td>
                  <td data-numeric>{statistic.bowling?.runsConceded}</td>
                  <td data-numeric>{statistic.bowling?.wicketsTaken}</td>
                  <td data-numeric>{formatRate(statistic.bowling?.economyRate ?? null)}</td>
                  <td data-numeric>{statistic.bowling?.wides}</td>
                  <td data-numeric>{statistic.bowling?.noBalls}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      ))}
      {groups.length === 0 ? (
        <p className="statistics-section__empty">No bowling record is available.</p>
      ) : null}
    </section>
  );
}

function CalculationDetails({ statistics }: { statistics: FixtureStatistics }) {
  return (
    <section
      aria-labelledby="calculation-details-heading"
      className="statistics-section calculation-details"
    >
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Evidence and scope</p>
          <h3 id="calculation-details-heading">Calculation details</h3>
        </div>
      </div>
      <details>
        <summary>How these match statistics are calculated</summary>
        <p>
          Figures use accepted delivery events from standard innings. Super overs are excluded. Runs
          conceded include runs off the bat, wides and no-balls; ordinary byes and leg-byes are
          excluded.
        </p>
        <ul>
          {statistics.statistics.map((statistic) => (
            <li key={statistic.statisticId}>
              <span>
                {statistic.scope === 'innings'
                  ? statistic.competitorName
                  : statistic.participantName}
                : {statistic.sourceEventCount} accepted{' '}
                {statistic.sourceEventCount === 1 ? 'event' : 'events'}
              </span>{' '}
              <Link
                to={`/fixtures/${encodeURIComponent(statistic.fixtureId)}/statistics/${encodeURIComponent(statistic.statisticId)}`}
              >
                View calculation trace
              </Link>
            </li>
          ))}
        </ul>
      </details>
      <StatisticsDefinitions includeRunRate />
    </section>
  );
}

export function FixtureAnalytics({ statistics }: { statistics: FixtureStatistics }) {
  const innings = statistics.statistics
    .filter((statistic): statistic is InningsTeamStatistic => statistic.scope === 'innings')
    .sort((left, right) => left.inningsOrdinal - right.inningsOrdinal);
  const players = statistics.statistics.filter(
    (statistic): statistic is ParticipantFixtureStatistic => statistic.scope === 'participant',
  );

  return (
    <>
      <MatchSummary innings={innings} statistics={statistics} />
      {statistics.warnings.length > 0 ? (
        <section
          aria-labelledby="statistics-warnings-heading"
          className="statistics-warnings"
          role="status"
        >
          <h3 id="statistics-warnings-heading">Data notices</h3>
          <ul>
            {statistics.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warning.message}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {statistics.statistics.length === 0 ? (
        <div className="state-message" role="status">
          <h3>No match statistics available</h3>
          <p>No published standard-innings statistics are currently available for this match.</p>
        </div>
      ) : (
        <>
          <InningsSummary innings={innings} />
          <MatchLeaders players={players} />
          <BattingScorecards innings={innings} players={players} />
          <BowlingScorecards innings={innings} players={players} />
          <CalculationDetails statistics={statistics} />
        </>
      )}
    </>
  );
}
