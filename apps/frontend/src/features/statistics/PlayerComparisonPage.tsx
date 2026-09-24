import type { Fixture, ParticipantFixtureStatistic } from '@sport-analytics/contracts';
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicReadApi } from '../../api/public-read';
import { DetailError, DetailLoading } from '../browse/RecordDetail';
import { usePublicData } from '../browse/usePublicData';

function fixtureLabel(fixture: Fixture): string {
  const teams = fixture.competitors.map((competitor) => competitor.name);
  return teams.length > 0 ? teams.join(' vs ') : 'Fixture teams unavailable';
}

function value(value: number | string | null): string | number {
  return value ?? '—';
}

function battingValue(
  player: ParticipantFixtureStatistic,
  metric: keyof NonNullable<ParticipantFixtureStatistic['batting']>,
) {
  if (!player.batting) return player.battingParticipation === 'did_not_bat' ? 'Did not bat' : '—';
  return value(player.batting[metric]);
}

function bowlingValue(
  player: ParticipantFixtureStatistic,
  metric: keyof NonNullable<ParticipantFixtureStatistic['bowling']>,
) {
  if (!player.bowling) return 'Did not bowl';
  return value(player.bowling[metric]);
}

function ComparisonTable({
  heading,
  metrics,
  playerA,
  playerB,
}: {
  heading: string;
  metrics: Array<{ label: string; value(player: ParticipantFixtureStatistic): string | number }>;
  playerA: ParticipantFixtureStatistic;
  playerB: ParticipantFixtureStatistic;
}) {
  return (
    <section className="statistics-section">
      <h2>{heading}</h2>
      <div className="ui-data-table">
        <table className="statistics-table">
          <caption>{heading} metrics from the published fixture statistics</caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col" data-numeric>
                {playerA.participantName}
              </th>
              <th scope="col" data-numeric>
                {playerB.participantName}
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.label}>
                <th scope="row">{metric.label}</th>
                <td data-numeric>{metric.value(playerA)}</td>
                <td data-numeric>{metric.value(playerB)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FixtureComparison({
  comparisonRequested,
  fixtureId,
  playerAId,
  playerBId,
}: {
  comparisonRequested: boolean;
  fixtureId: string;
  playerAId: string;
  playerBId: string;
}) {
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getFixtureStatistics(fixtureId, signal),
    [fixtureId],
  );
  const state = usePublicData(load, fixtureId);

  if (state.status === 'loading') return <DetailLoading label="fixture player statistics" />;
  if (state.status === 'error') {
    return (
      <DetailError error={state.error} label="Fixture player statistics" reload={state.reload} />
    );
  }

  const players = state.data.data.statistics
    .filter(
      (statistic): statistic is ParticipantFixtureStatistic => statistic.scope === 'participant',
    )
    .sort((left, right) => left.participantName.localeCompare(right.participantName));
  const playerA = players.find((player) => player.participantId === playerAId);
  const playerB = players.find((player) => player.participantId === playerBId);

  if (players.length === 0) {
    return (
      <p className="statistics-section__empty">
        No published player figures are available for this fixture.
      </p>
    );
  }

  if (
    !comparisonRequested ||
    !playerA ||
    !playerB ||
    playerA.participantId === playerB.participantId
  ) {
    return (
      <p className="statistics-section__empty">
        Select two different players, then compare their published fixture performances.
      </p>
    );
  }

  return (
    <section aria-label="Player performance comparison" className="player-comparison">
      <p className="statistics-note">Scope: Current fixture</p>
      <p className="statistics-note">
        Metrics use the published fixture scorecard. Rates are shown as published.
      </p>
      <ComparisonTable
        heading="Batting"
        metrics={[
          { label: 'Runs (runs)', value: (player) => battingValue(player, 'runsScored') },
          { label: 'Balls faced (balls)', value: (player) => battingValue(player, 'ballsFaced') },
          { label: 'Strike rate (%)', value: (player) => battingValue(player, 'strikeRate') },
          { label: 'Fours (boundaries)', value: (player) => battingValue(player, 'fours') },
          { label: 'Sixes (boundaries)', value: (player) => battingValue(player, 'sixes') },
        ]}
        playerA={playerA}
        playerB={playerB}
      />
      <ComparisonTable
        heading="Bowling"
        metrics={[
          {
            label: 'Runs conceded (runs)',
            value: (player) => bowlingValue(player, 'runsConceded'),
          },
          { label: 'Wides (deliveries)', value: (player) => bowlingValue(player, 'wides') },
          { label: 'No-balls (deliveries)', value: (player) => bowlingValue(player, 'noBalls') },
          { label: 'Overs (overs)', value: (player) => bowlingValue(player, 'oversBowled') },
          {
            label: 'Economy rate (runs per over)',
            value: (player) => bowlingValue(player, 'economyRate'),
          },
          { label: 'Wickets (wickets)', value: (player) => bowlingValue(player, 'wicketsTaken') },
        ]}
        playerA={playerA}
        playerB={playerB}
      />
    </section>
  );
}

export function PlayerComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fixtureId = searchParams.get('fixtureId') ?? '';
  const playerAId = searchParams.get('playerA') ?? '';
  const playerBId = searchParams.get('playerB') ?? '';
  const [comparisonRequested, setComparisonRequested] = useState(false);
  const loadFixtures = useCallback(
    (signal: AbortSignal) => publicReadApi.listFixtures('?limit=100', signal),
    [],
  );
  const fixtures = usePublicData(loadFixtures, 'comparison-fixtures');
  const selectedFixture = useMemo(
    () =>
      fixtures.status === 'ready'
        ? fixtures.data.data.find((fixture) => fixture.fixtureId === fixtureId)
        : undefined,
    [fixtureId, fixtures],
  );

  function updateSelection(name: 'fixtureId' | 'playerA' | 'playerB', nextValue: string) {
    setComparisonRequested(false);
    const next = new URLSearchParams(searchParams);
    if (nextValue) next.set(name, nextValue);
    else next.delete(name);
    if (name === 'fixtureId') {
      next.delete('playerB');
    }
    setSearchParams(next);
  }

  return (
    <article className="detail-page content-boundary">
      <Link className="back-link" to="/participants">
        Back to players
      </Link>
      <header className="page-heading page-heading--detail">
        <p className="eyebrow">Published fixture statistics</p>
        <h1>Compare players</h1>
        <p>
          Select two players in one fixture to compare the published batting and bowling figures.
        </p>
      </header>
      {fixtures.status === 'loading' ? <DetailLoading label="fixtures" /> : null}
      {fixtures.status === 'error' ? (
        <DetailError error={fixtures.error} label="Fixtures" reload={fixtures.reload} />
      ) : null}
      {fixtures.status === 'ready' ? (
        <>
          <div className="filter-grid player-comparison__controls">
            <label className="field">
              <span>Fixture</span>
              <select
                aria-label="Fixture"
                onChange={(event) => updateSelection('fixtureId', event.target.value)}
                value={fixtureId}
              >
                <option value="">Select a fixture</option>
                {fixtures.data.data.map((fixture) => (
                  <option key={fixture.fixtureId} value={fixture.fixtureId}>
                    {fixtureLabel(fixture)}
                  </option>
                ))}
              </select>
            </label>
            {selectedFixture ? (
              <PlayerControls
                fixtureId={fixtureId}
                playerAId={playerAId}
                playerBId={playerBId}
                onChange={updateSelection}
                onCompare={() => setComparisonRequested(true)}
              />
            ) : null}
          </div>
          {selectedFixture ? (
            <FixtureComparison
              comparisonRequested={comparisonRequested}
              fixtureId={fixtureId}
              key={`${fixtureId}:${playerAId}:${playerBId}`}
              playerAId={playerAId}
              playerBId={playerBId}
            />
          ) : (
            <p className="statistics-section__empty">
              Choose a fixture to see its published players.
            </p>
          )}
        </>
      ) : null}
    </article>
  );
}

function PlayerControls({
  fixtureId,
  playerAId,
  playerBId,
  onChange,
  onCompare,
}: {
  fixtureId: string;
  playerAId: string;
  playerBId: string;
  onChange(name: 'fixtureId' | 'playerA' | 'playerB', value: string): void;
  onCompare(): void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getFixtureStatistics(fixtureId, signal),
    [fixtureId],
  );
  const state = usePublicData(load, `comparison-players:${fixtureId}`);
  if (state.status !== 'ready') return null;
  const players = state.data.data.statistics
    .filter(
      (statistic): statistic is ParticipantFixtureStatistic => statistic.scope === 'participant',
    )
    .sort((left, right) => left.participantName.localeCompare(right.participantName));
  return (
    <>
      <label className="field">
        <span>Player A</span>
        <select
          aria-label="Player A"
          onChange={(event) => onChange('playerA', event.target.value)}
          value={playerAId}
        >
          <option value="">Select a player</option>
          {players.map((player) => (
            <option key={player.participantId} value={player.participantId}>
              {player.participantName}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Player B</span>
        <select
          aria-label="Player B"
          onChange={(event) => onChange('playerB', event.target.value)}
          value={playerBId}
        >
          <option value="">Select a player</option>
          {players.map((player) => (
            <option key={player.participantId} value={player.participantId}>
              {player.participantName}
            </option>
          ))}
        </select>
      </label>
      <button className="button button--primary" onClick={onCompare} type="button">
        Compare performances
      </button>
    </>
  );
}
