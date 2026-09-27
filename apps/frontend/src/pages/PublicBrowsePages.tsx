import type {
  Competition,
  Competitor,
  Fixture,
  FixtureWeather,
  Participant,
  ParticipantFixture,
  Season,
} from '@sport-analytics/contracts';
import { useCallback, useId, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicReadApi } from '../api/public-read';
import { BrowseCollection, type FilterField } from '../features/browse/BrowseCollection';
import type { NameComboboxOption } from '../features/browse/NameCombobox';
import { RelatedCollection } from '../features/browse/RelatedCollection';
import {
  DetailError,
  DetailLayout,
  DetailLoading,
  RecordFact,
  RecordFacts,
} from '../features/browse/RecordDetail';
import { AnchoredSection, LocalNavigation } from '../components/NavigationPrimitives';
import { SectionBoundary, SectionError } from '../features/browse/SectionBoundary';
import { usePublicData } from '../features/browse/usePublicData';
import {
  ParticipantCareerOverview,
  PlayerPerformance,
} from '../features/statistics/StatisticsPages';
import { ScopeLeaderboards } from '../features/statistics/ScopeLeaderboards';

function optionSearch(filters: URLSearchParams, name: string): string {
  const params = new URLSearchParams(filters);
  params.set('limit', '100');
  params.delete('cursor');
  if (name) {
    params.set('name', name);
  }
  return `?${params.toString()}`;
}

async function loadCompetitionOptions(
  filters: URLSearchParams,
  query: string,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listCompetitions(optionSearch(filters, query), signal);
  return response.data.map((competition) => ({
    label: competition.name,
    value: competition.competitionId,
  }));
}

async function loadCompetitionNameOptions(
  filters: URLSearchParams,
  query: string,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const options = await loadCompetitionOptions(filters, query, signal);
  return options.map((option) => ({ ...option, value: option.label }));
}

async function loadSeasonOptions(
  filters: URLSearchParams,
  query: string,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listSeasons(optionSearch(filters, query), signal);
  return response.data.map((season) => ({
    description: `Season in ${season.competitionName}`,
    keywords: [season.label, season.competitionName],
    label: `${season.competitionName} — ${season.label}`,
    value: season.seasonId,
  }));
}

async function loadFixtureOptions(
  filters: URLSearchParams,
  _query: string,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listFixtures(optionSearch(filters, ''), signal);
  return response.data.map((fixture) => {
    const teamNames = fixture.competitors.map(({ name }) => name);
    const title = teamNames.length > 0 ? teamNames.join(' vs ') : 'Fixture teams unavailable';
    const context = [
      formatDate(fixture.startDate),
      fixture.competitionName,
      fixture.seasonLabel,
    ].filter((value): value is string => Boolean(value));

    return {
      description: context.join(' · '),
      keywords: [...teamNames, ...context],
      label: title,
      value: fixture.fixtureId,
    };
  });
}

async function loadTeamOptions(
  filters: URLSearchParams,
  query: string,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listCompetitors(optionSearch(filters, query), signal);
  return response.data.map((team) => ({
    label: team.name,
    value: team.competitorId,
  }));
}

async function loadTeamNameOptions(
  filters: URLSearchParams,
  query: string,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const options = await loadTeamOptions(filters, query, signal);
  return options.map((option) => ({ ...option, value: option.label }));
}

async function loadPlayerNameOptions(
  filters: URLSearchParams,
  query: string,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listParticipants(optionSearch(filters, query), signal);
  return response.data.map((player) => ({
    label: player.displayName,
    value: player.displayName,
  }));
}

const competitionFilters: FilterField[] = [
  {
    entityName: 'competition',
    kind: 'combobox',
    label: 'Competition name',
    loadOptions: loadCompetitionNameOptions,
    name: 'name',
    placeholder: 'Type a competition name',
    routeValue: 'name',
  },
];

const seasonFilters: FilterField[] = [
  {
    entityName: 'competition',
    kind: 'combobox',
    label: 'Competition',
    loadOptions: loadCompetitionOptions,
    name: 'competitionId',
    placeholder: 'Type a competition name',
    routeValue: 'reference',
  },
];

const fixtureFilters: FilterField[] = [
  {
    clears: ['seasonId', 'competitorId'],
    entityName: 'competition',
    kind: 'combobox',
    label: 'Competition',
    loadOptions: loadCompetitionOptions,
    name: 'competitionId',
    placeholder: 'Type a competition name',
    routeValue: 'reference',
  },
  {
    clears: ['competitorId'],
    dependsOn: ['competitionId'],
    entityName: 'season',
    kind: 'combobox',
    label: 'Season',
    loadOptions: loadSeasonOptions,
    name: 'seasonId',
    placeholder: 'Type a season or competition name',
    routeValue: 'reference',
  },
  {
    dependsOn: ['competitionId', 'seasonId'],
    entityName: 'team',
    kind: 'combobox',
    label: 'Team',
    loadOptions: loadTeamOptions,
    name: 'competitorId',
    placeholder: 'Type a team name',
    routeValue: 'reference',
  },
  { label: 'Gender', name: 'gender', placeholder: 'Gender', type: 'search' },
  { label: 'Starting on or after', name: 'startDateFrom', type: 'date' },
  { label: 'Starting on or before', name: 'startDateTo', type: 'date' },
];

const competitorFilters: FilterField[] = [
  {
    clears: ['seasonId', 'name'],
    entityName: 'competition',
    kind: 'combobox',
    label: 'Competition',
    loadOptions: loadCompetitionOptions,
    name: 'competitionId',
    placeholder: 'Type a competition name',
    routeValue: 'reference',
  },
  {
    clears: ['name'],
    dependsOn: ['competitionId'],
    entityName: 'season',
    kind: 'combobox',
    label: 'Season',
    loadOptions: loadSeasonOptions,
    name: 'seasonId',
    placeholder: 'Type a season or competition name',
    routeValue: 'reference',
  },
  {
    dependsOn: ['competitionId', 'seasonId'],
    entityName: 'team',
    kind: 'combobox',
    label: 'Team name',
    loadOptions: loadTeamNameOptions,
    name: 'name',
    placeholder: 'Type a team name',
    routeValue: 'name',
  },
];

const participantFilters: FilterField[] = [
  {
    clears: ['competitorId', 'name'],
    entityName: 'fixture',
    kind: 'combobox',
    label: 'Fixture',
    loadOptions: loadFixtureOptions,
    name: 'fixtureId',
    placeholder: 'Type team, competition or season names',
    routeValue: 'reference',
  },
  {
    clears: ['name'],
    entityName: 'team',
    kind: 'combobox',
    label: 'Team',
    loadOptions: loadTeamOptions,
    name: 'competitorId',
    placeholder: 'Type a team name',
    routeValue: 'reference',
  },
  {
    dependsOn: ['fixtureId', 'competitorId'],
    entityName: 'player',
    kind: 'combobox',
    label: 'Player name',
    loadOptions: loadPlayerNameOptions,
    name: 'name',
    placeholder: 'Type a player name',
    routeValue: 'name',
  },
];

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function labelValue(value: string): string {
  return value
    .split(/[_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function fixtureTitle(fixture: Fixture): string {
  const teamNames = fixture.competitors.map(({ name }) => name);
  return teamNames.length > 0 ? teamNames.join(' vs ') : 'Fixture teams unavailable';
}

function fixtureVenueLabel(venue: Fixture['venue']): string {
  if (!venue) {
    return 'Venue unavailable';
  }

  return [venue.name, venue.city].filter(Boolean).join(', ');
}

function fixtureTossLabel(toss: Fixture['toss']): string {
  if (!toss) {
    return 'Toss information unavailable';
  }

  if (toss.winnerCompetitorName && toss.decision) {
    return `${toss.winnerCompetitorName} won the toss and chose to ${toss.decision}.`;
  }
  if (toss.winnerCompetitorName) {
    return `${toss.winnerCompetitorName} won the toss.`;
  }
  if (toss.decision) {
    return `Toss decision: chose to ${toss.decision}.`;
  }

  return 'Toss information unavailable';
}

function relatedFilters(name: string, value: string): URLSearchParams {
  return new URLSearchParams({ [name]: value });
}

function RecordListItem({ children }: { children: ReactNode }) {
  return <li className="record-list__item">{children}</li>;
}

function FixtureRecord({ fixture }: { fixture: Fixture }) {
  const context = [fixture.competitionName, fixture.seasonLabel, fixture.matchType].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <RecordListItem>
      <p className="record-list__meta">
        <time dateTime={fixture.startDate}>{formatDate(fixture.startDate)}</time>
      </p>
      <h3>
        <Link to={`/fixtures/${encodeURIComponent(fixture.fixtureId)}`}>
          {fixtureTitle(fixture)}
        </Link>
      </h3>
      <p className="record-list__summary">
        {context.join(' · ')}
        <br />
        <Link to={`/fixtures/${encodeURIComponent(fixture.fixtureId)}/statistics`}>
          View statistics for {fixtureTitle(fixture)}
        </Link>
      </p>
    </RecordListItem>
  );
}

function FixtureRecords({ fixtures }: { fixtures: Fixture[] }) {
  return (
    <ul className="record-list">
      {fixtures.map((fixture) => (
        <FixtureRecord fixture={fixture} key={fixture.fixtureId} />
      ))}
    </ul>
  );
}

function PlayerMatchRecord({ match }: { match: ParticipantFixture }) {
  const { fixture } = match;
  const title = fixtureTitle({ ...fixture, competitors: match.competitors });

  return (
    <li className="statistic-card player-match-card">
      <header className="statistic-card__heading">
        <div>
          <p className="record-list__meta">
            <time dateTime={fixture.startDate}>{formatDate(fixture.startDate)}</time>
            {' · '}
            {fixture.matchType}
          </p>
          <h3>
            <Link to={`/fixtures/${encodeURIComponent(fixture.fixtureId)}`}>{title}</Link>
          </h3>
          <p className="player-match-card__associations">
            {match.competitionName ? (
              fixture.competitionId ? (
                <Link to={`/competitions/${encodeURIComponent(fixture.competitionId)}`}>
                  {match.competitionName}
                </Link>
              ) : (
                match.competitionName
              )
            ) : (
              'Competition name unavailable'
            )}
            {' · '}
            {fixture.seasonId ? (
              <Link to={`/seasons/${encodeURIComponent(fixture.seasonId)}`}>
                {fixture.seasonLabel}
              </Link>
            ) : (
              fixture.seasonLabel
            )}
            {' · '}
            <Link to={`/competitors/${encodeURIComponent(match.competitor.competitorId)}`}>
              {match.competitor.name}
            </Link>
            {match.role ? ` · ${labelValue(match.role)}` : null}
          </p>
        </div>
        <p className={`statistics-status statistics-status--${match.statisticsStatus}`}>
          {match.statisticsStatus === 'complete' ? 'Complete data' : 'Partial data'}
        </p>
      </header>

      {match.statisticsWarnings.length > 0 ? (
        <div className="player-match-card__notices" role="status">
          <h4>Data notices</h4>
          <ul>
            {match.statisticsWarnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.batting || match.bowling ? (
        <PlayerPerformance batting={match.batting} bowling={match.bowling} showUnavailable />
      ) : (
        <p className="statistics-section__empty">
          No batting or bowling figures are published for this player in this match.
        </p>
      )}
    </li>
  );
}

function PlayerMatchRecords({ matches }: { matches: ParticipantFixture[] }) {
  return (
    <ul className="statistics-list player-match-list">
      {matches.map((match) => (
        <PlayerMatchRecord key={match.fixture.fixtureId} match={match} />
      ))}
    </ul>
  );
}

const playerMatchFilters = new URLSearchParams();

function PlayerMatchHistoryDisplayError({ retry }: { retry(): void }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="related-collection">
      <div className="results-heading">
        <h2 id={headingId}>Match history</h2>
      </div>
      <SectionError
        description="Published matches could not be requested. Try this section again."
        reason="The published match history could not be displayed."
        retry={retry}
        retryLabel="Retry matches"
        title="Match history could not be loaded"
      />
    </section>
  );
}

function PlayerMatchHistory({ participantId }: { participantId: string }) {
  // Remounting the collection is how a retry after a display failure requests
  // the history again; its own reload lives inside the unmounted section.
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const load = useCallback(
    (search: string, signal: AbortSignal) =>
      publicReadApi.listParticipantFixtures(participantId, search, signal),
    [participantId],
  );

  return (
    <SectionBoundary
      onRetry={retry}
      renderError={(boundaryRetry) => <PlayerMatchHistoryDisplayError retry={boundaryRetry} />}
    >
      <RelatedCollection
        emptyMessage="No published match history is available for this player."
        filters={playerMatchFilters}
        key={attempt}
        load={load}
        renderRecords={(matches) => <PlayerMatchRecords matches={matches} />}
        resourceLabel="matches"
        title="Match history"
      />
    </SectionBoundary>
  );
}

function CompetitionFixtureRecords({ fixtures }: { fixtures: Fixture[] }) {
  const groups = new Map<string, { label: string; seasonId: string | null; fixtures: Fixture[] }>();

  for (const fixture of fixtures) {
    const key = fixture.seasonId ?? fixture.seasonLabel;
    const group = groups.get(key);
    if (group) {
      group.fixtures.push(fixture);
    } else {
      groups.set(key, {
        fixtures: [fixture],
        label: fixture.seasonLabel,
        seasonId: fixture.seasonId,
      });
    }
  }

  return (
    <ol className="fixture-groups">
      {[...groups.entries()].map(([key, group]) => (
        <li key={key}>
          <h3>
            {group.seasonId ? (
              <Link to={`/seasons/${encodeURIComponent(group.seasonId)}`}>{group.label}</Link>
            ) : (
              group.label
            )}
          </h3>
          <FixtureRecords fixtures={group.fixtures} />
        </li>
      ))}
    </ol>
  );
}

function SeasonRecords({ seasons }: { seasons: Season[] }) {
  return (
    <ul className="record-list">
      {seasons.map((season) => (
        <RecordListItem key={season.seasonId}>
          <p className="record-list__meta">{season.competitionName}</p>
          <h3>
            <Link to={`/seasons/${encodeURIComponent(season.seasonId)}`}>{season.label}</Link>
          </h3>
          <p className="record-list__summary">Season overview</p>
        </RecordListItem>
      ))}
    </ul>
  );
}

function TeamRecords({ teams }: { teams: Competitor[] }) {
  return (
    <ul className="record-list">
      {teams.map((team) => (
        <RecordListItem key={team.competitorId}>
          <p className="record-list__meta">Team</p>
          <h3>
            <Link to={`/competitors/${encodeURIComponent(team.competitorId)}`}>{team.name}</Link>
          </h3>
          <p className="record-list__summary">Team overview</p>
        </RecordListItem>
      ))}
    </ul>
  );
}

function PlayerRecords({ players }: { players: Participant[] }) {
  return (
    <ul className="record-list">
      {players.map((player) => (
        <RecordListItem key={player.participantId}>
          <p className="record-list__meta">Player</p>
          <h3>
            <Link to={`/participants/${encodeURIComponent(player.participantId)}`}>
              {player.displayName}
            </Link>
          </h3>
          <p className="record-list__summary">Player overview</p>
        </RecordListItem>
      ))}
    </ul>
  );
}

export function CompetitionsPage() {
  return (
    <BrowseCollection<Competition>
      description="Browse the published cricket competitions available in the public record."
      emptyMessage="No published competitions match the current filters."
      eyebrow="Public cricket record"
      filters={competitionFilters}
      load={publicReadApi.listCompetitions}
      renderItem={(competition) => (
        <RecordListItem key={competition.competitionId}>
          <p className="record-list__meta">Competition</p>
          <h3>
            <Link to={`/competitions/${encodeURIComponent(competition.competitionId)}`}>
              {competition.name}
            </Link>
          </h3>
        </RecordListItem>
      )}
      resourceLabel="competitions"
      title="Competitions"
    />
  );
}

export function SeasonsPage() {
  return (
    <BrowseCollection<Season>
      description="Browse published seasons and follow them to their competition and fixtures."
      emptyMessage="No published seasons match the current filters."
      eyebrow="Competition calendar"
      filters={seasonFilters}
      load={publicReadApi.listSeasons}
      renderItem={(season) => (
        <RecordListItem key={season.seasonId}>
          <p className="record-list__meta">{season.competitionName}</p>
          <h3>
            <Link to={`/seasons/${encodeURIComponent(season.seasonId)}`}>{season.label}</Link>
          </h3>
        </RecordListItem>
      )}
      resourceLabel="seasons"
      title="Seasons"
    />
  );
}

export function FixturesPage() {
  return (
    <BrowseCollection<Fixture>
      description="Browse published fixtures by competition, season, team, date and gender."
      emptyMessage="No published fixtures match the current filters."
      eyebrow="Match archive"
      filters={fixtureFilters}
      load={publicReadApi.listFixtures}
      renderItem={(fixture) => <FixtureRecord fixture={fixture} key={fixture.fixtureId} />}
      resourceLabel="fixtures"
      title="Fixtures"
    />
  );
}

export function CompetitorsPage() {
  return (
    <BrowseCollection<Competitor>
      description="Browse teams in the published competition and season record."
      emptyMessage="No published teams match the current filters."
      eyebrow="Teams"
      filters={competitorFilters}
      load={publicReadApi.listCompetitors}
      renderItem={(competitor) => (
        <RecordListItem key={competitor.competitorId}>
          <p className="record-list__meta">Team</p>
          <h3>
            <Link to={`/competitors/${encodeURIComponent(competitor.competitorId)}`}>
              {competitor.name}
            </Link>
          </h3>
        </RecordListItem>
      )}
      resourceLabel="teams"
      title="Teams"
    />
  );
}

export function ParticipantsPage() {
  return (
    <BrowseCollection<Participant>
      description="Browse players in the published fixture and team record."
      emptyMessage="No published players match the current filters."
      eyebrow="Players"
      filters={participantFilters}
      headerAction={
        <Link className="button button--primary" to="/participants/compare">
          Compare players
        </Link>
      }
      load={publicReadApi.listParticipants}
      renderItem={(participant) => (
        <RecordListItem key={participant.participantId}>
          <p className="record-list__meta">Player</p>
          <h3>
            <Link to={`/participants/${encodeURIComponent(participant.participantId)}`}>
              {participant.displayName}
            </Link>
          </h3>
        </RecordListItem>
      )}
      resourceLabel="players"
      title="Players"
    />
  );
}

function DetailState<Value>({
  label,
  requestKey,
  load,
  render,
}: {
  label: string;
  requestKey: string;
  load(signal: AbortSignal): Promise<Value>;
  render(value: Value): ReactNode;
}) {
  const state = usePublicData(load, requestKey);

  if (state.status === 'loading') {
    return (
      <div className="detail-page content-boundary">
        <DetailLoading label={label} />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="detail-page content-boundary">
        <DetailError error={state.error} label={label} reload={state.reload} />
      </div>
    );
  }

  return render(state.data);
}

const weatherNumber = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 });

function WeatherFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function availableWeatherFacts(weather: Extract<FixtureWeather, { availability: 'available' }>) {
  const facts: Array<{ label: string; value: string }> = [];

  if (weather.weather.temperatureMax !== null) {
    facts.push({
      label: 'Maximum temperature',
      value: `${weatherNumber.format(weather.weather.temperatureMax)} °C`,
    });
  }
  if (weather.weather.temperatureMin !== null) {
    facts.push({
      label: 'Minimum temperature',
      value: `${weatherNumber.format(weather.weather.temperatureMin)} °C`,
    });
  }
  if (weather.weather.precipitationSum !== null) {
    facts.push({
      label: 'Rainfall',
      value: `${weatherNumber.format(weather.weather.precipitationSum)} mm`,
    });
  }
  if (weather.weather.windSpeedMax !== null) {
    facts.push({
      label: 'Maximum wind speed',
      value: `${weatherNumber.format(weather.weather.windSpeedMax)} km/h`,
    });
  }

  return facts;
}

function FixtureWeatherOverview({ fixtureId }: { fixtureId: string }) {
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getFixtureWeather(fixtureId, signal),
    [fixtureId],
  );
  const state = usePublicData(load, fixtureId);

  if (state.status === 'loading') {
    return (
      <section aria-labelledby="fixture-weather-heading" className="fixture-weather">
        <h2 id="fixture-weather-heading">Match weather</h2>
        <p className="fixture-weather__state" role="status">
          Loading match weather…
        </p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section aria-labelledby="fixture-weather-heading" className="fixture-weather">
        <h2 id="fixture-weather-heading">Match weather</h2>
        <div className="fixture-weather__state fixture-weather__state--error" role="alert">
          <p>Weather could not be loaded. The match overview is still available.</p>
          <button className="button button--secondary" onClick={state.reload} type="button">
            Try weather again
          </button>
        </div>
      </section>
    );
  }

  const fixtureWeather = state.data.data;
  if (fixtureWeather.availability === 'unavailable') {
    return (
      <section aria-labelledby="fixture-weather-heading" className="fixture-weather">
        <h2 id="fixture-weather-heading">Match weather</h2>
        <p className="fixture-weather__state">Weather is unavailable for this fixture’s venue.</p>
      </section>
    );
  }

  const facts = availableWeatherFacts(fixtureWeather);
  const venue = [fixtureWeather.venue.name, fixtureWeather.venue.city].filter(Boolean).join(', ');

  return (
    <section aria-labelledby="fixture-weather-heading" className="fixture-weather">
      <div className="fixture-weather__heading">
        <h2 id="fixture-weather-heading">Match weather</h2>
        <p>{venue}</p>
      </div>
      {facts.length > 0 ? (
        <dl className="fixture-weather__facts">
          {facts.map((fact) => (
            <WeatherFact key={fact.label} {...fact} />
          ))}
        </dl>
      ) : (
        <p className="fixture-weather__state">Weather readings are unavailable for this date.</p>
      )}
    </section>
  );
}

export function CompetitionDetailPage() {
  const { competitionId = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getCompetition(competitionId, signal),
    [competitionId],
  );

  return (
    <DetailState
      label="Competition"
      load={load}
      render={({ data: competition }) => {
        return (
          <DetailLayout
            backLabel="competitions"
            backTo="/competitions"
            eyebrow="Competition"
            title={competition.name}
            breadcrumbs={[
              { label: 'Explore', to: '/competitions' },
              { label: 'Competitions', to: '/competitions' },
              { label: competition.name, to: '#' },
            ]}
            sections={[
              { label: 'Seasons', to: '#seasons' },
              { label: 'Leaders', to: '#leaders' },
              { label: 'Fixtures', to: '#fixtures' },
              { label: 'Teams', to: '#teams' },
            ]}
          >
            <AnchoredSection id="seasons">
              <RelatedCollection
                emptyMessage="No published seasons are available for this competition."
                filters={relatedFilters('competitionId', competition.competitionId)}
                load={publicReadApi.listSeasons}
                renderRecords={(seasons) => <SeasonRecords seasons={seasons} />}
                resourceLabel="seasons"
                title="Seasons"
              />
            </AnchoredSection>
            <AnchoredSection id="leaders">
              <ScopeLeaderboards
                scope={{ scope: 'competition', competitionId: competition.competitionId }}
              />
            </AnchoredSection>
            <AnchoredSection id="fixtures">
              <RelatedCollection
                emptyMessage="No published fixtures are available for this competition."
                filters={relatedFilters('competitionId', competition.competitionId)}
                load={publicReadApi.listFixtures}
                renderRecords={(fixtures) => <CompetitionFixtureRecords fixtures={fixtures} />}
                resourceLabel="fixtures"
                title="Fixtures by season"
              />
            </AnchoredSection>
            <AnchoredSection id="teams">
              <RelatedCollection
                emptyMessage="No published teams are available for this competition."
                filters={relatedFilters('competitionId', competition.competitionId)}
                load={publicReadApi.listCompetitors}
                renderRecords={(teams) => <TeamRecords teams={teams} />}
                resourceLabel="teams"
                title="Teams"
              />
            </AnchoredSection>
          </DetailLayout>
        );
      }}
      requestKey={competitionId}
    />
  );
}

export function SeasonDetailPage() {
  const { seasonId = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getSeason(seasonId, signal),
    [seasonId],
  );

  return (
    <DetailState
      label="Season"
      load={load}
      render={({ data: season }) => {
        return (
          <DetailLayout
            backLabel="seasons"
            backTo="/seasons"
            eyebrow={season.competitionName}
            title={season.label}
            breadcrumbs={[
              { label: 'Explore', to: '/seasons' },
              { label: 'Seasons', to: '/seasons' },
              { label: season.label, to: '#' },
            ]}
            sections={[
              { label: 'Overview', to: '#overview' },
              { label: 'Leaders', to: '#leaders' },
              { label: 'Fixtures', to: '#fixtures' },
              { label: 'Teams', to: '#teams' },
            ]}
          >
            <AnchoredSection id="overview">
              <RecordFacts>
                <RecordFact
                  label="Competition"
                  value={
                    <Link to={`/competitions/${encodeURIComponent(season.competitionId)}`}>
                      {season.competitionName}
                    </Link>
                  }
                />
              </RecordFacts>
            </AnchoredSection>
            <AnchoredSection id="leaders">
              <ScopeLeaderboards scope={{ scope: 'season', seasonId: season.seasonId }} />
            </AnchoredSection>
            <AnchoredSection id="fixtures">
              <RelatedCollection
                emptyMessage="No published fixtures are available for this season."
                filters={relatedFilters('seasonId', season.seasonId)}
                load={publicReadApi.listFixtures}
                renderRecords={(fixtures) => <FixtureRecords fixtures={fixtures} />}
                resourceLabel="fixtures"
                title="Fixtures"
              />
            </AnchoredSection>
            <AnchoredSection id="teams">
              <RelatedCollection
                emptyMessage="No published teams are available for this season."
                filters={relatedFilters('seasonId', season.seasonId)}
                load={publicReadApi.listCompetitors}
                renderRecords={(teams) => <TeamRecords teams={teams} />}
                resourceLabel="teams"
                title="Teams"
              />
            </AnchoredSection>
          </DetailLayout>
        );
      }}
      requestKey={seasonId}
    />
  );
}

export function FixtureDetailPage() {
  const { fixtureId = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getFixture(fixtureId, signal),
    [fixtureId],
  );

  return (
    <DetailState
      label="Fixture"
      load={load}
      render={({ data: fixture }) => {
        return (
          <DetailLayout
            backLabel="fixtures"
            backTo="/fixtures"
            eyebrow="Fixture overview"
            title={fixtureTitle(fixture)}
            breadcrumbs={[
              { label: 'Fixtures', to: '/fixtures' },
              { label: fixtureTitle(fixture), to: '#' },
            ]}
          >
            <LocalNavigation
              label="Fixture sections"
              items={[
                { label: 'Overview', to: `/fixtures/${encodeURIComponent(fixture.fixtureId)}` },
                {
                  label: 'Statistics',
                  to: `/fixtures/${encodeURIComponent(fixture.fixtureId)}/statistics`,
                },
                {
                  label: 'Players',
                  to: `/fixtures/${encodeURIComponent(fixture.fixtureId)}/players`,
                },
              ]}
            />
            <RecordFacts>
              <RecordFact
                label="Competition"
                value={
                  fixture.competitionId && fixture.competitionName ? (
                    <Link to={`/competitions/${encodeURIComponent(fixture.competitionId)}`}>
                      {fixture.competitionName}
                    </Link>
                  ) : (
                    'Competition name unavailable'
                  )
                }
              />
              <RecordFact
                label="Season"
                value={
                  fixture.seasonId ? (
                    <Link to={`/seasons/${encodeURIComponent(fixture.seasonId)}`}>
                      {fixture.seasonLabel}
                    </Link>
                  ) : (
                    fixture.seasonLabel
                  )
                }
              />
              <RecordFact
                label="Teams"
                value={
                  fixture.competitors.length > 0 ? (
                    <span className="record-fact-links">
                      {fixture.competitors.map((team) => (
                        <Link
                          key={team.competitorId}
                          to={`/competitors/${encodeURIComponent(team.competitorId)}`}
                        >
                          {team.name}
                        </Link>
                      ))}
                    </span>
                  ) : (
                    'Team names unavailable'
                  )
                }
              />
              <RecordFact label="Match type" value={fixture.matchType} />
              <RecordFact label="Gender" value={labelValue(fixture.gender)} />
              <RecordFact label="Team type" value={labelValue(fixture.teamType)} />
              <RecordFact label="Venue" value={fixtureVenueLabel(fixture.venue)} />
              <RecordFact label="Toss" value={fixtureTossLabel(fixture.toss)} />
              <RecordFact label="Start date" value={formatDate(fixture.startDate)} />
              <RecordFact label="End date" value={formatDate(fixture.endDate)} />
              <RecordFact label="Balls per over" value={fixture.ballsPerOver} />
              <RecordFact
                label="Scheduled overs"
                value={fixture.scheduledOvers ?? 'Not specified'}
              />
            </RecordFacts>
            <FixtureWeatherOverview fixtureId={fixture.fixtureId} />
          </DetailLayout>
        );
      }}
      requestKey={fixtureId}
    />
  );
}

export function FixturePlayersPage() {
  const { fixtureId = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getFixture(fixtureId, signal),
    [fixtureId],
  );
  return (
    <DetailState
      label="Fixture players"
      load={load}
      requestKey={fixtureId}
      render={({ data: fixture }) => (
        <DetailLayout
          backLabel="fixtures"
          backTo="/fixtures"
          eyebrow="Fixture players"
          title={fixtureTitle(fixture)}
          breadcrumbs={[
            { label: 'Fixtures', to: '/fixtures' },
            {
              label: fixtureTitle(fixture),
              to: `/fixtures/${encodeURIComponent(fixture.fixtureId)}`,
            },
            { label: 'Players', to: '#' },
          ]}
        >
          <LocalNavigation
            label="Fixture sections"
            items={[
              { label: 'Overview', to: `/fixtures/${encodeURIComponent(fixture.fixtureId)}` },
              {
                label: 'Statistics',
                to: `/fixtures/${encodeURIComponent(fixture.fixtureId)}/statistics`,
              },
              {
                label: 'Players',
                to: `/fixtures/${encodeURIComponent(fixture.fixtureId)}/players`,
              },
            ]}
          />
          <RelatedCollection
            emptyMessage="No published players are available for this match."
            filters={relatedFilters('fixtureId', fixture.fixtureId)}
            load={publicReadApi.listParticipants}
            renderRecords={(players) => <PlayerRecords players={players} />}
            resourceLabel="players"
            title="Participating players"
          />
        </DetailLayout>
      )}
    />
  );
}

export function CompetitorDetailPage() {
  const { competitorId = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getCompetitor(competitorId, signal),
    [competitorId],
  );

  return (
    <DetailState
      label="Team"
      load={load}
      render={({ data: competitor }) => {
        return (
          <DetailLayout
            backLabel="teams"
            backTo="/competitors"
            eyebrow="Team"
            title={competitor.name}
            breadcrumbs={[
              { label: 'Explore', to: '/competitors' },
              { label: 'Teams', to: '/competitors' },
              { label: competitor.name, to: '#' },
            ]}
            sections={[
              { label: 'Fixtures', to: '#fixtures' },
              { label: 'Players', to: '#players' },
            ]}
          >
            <AnchoredSection id="fixtures">
              <RelatedCollection
                emptyMessage="No published fixtures are available for this team."
                filters={relatedFilters('competitorId', competitor.competitorId)}
                load={publicReadApi.listFixtures}
                renderRecords={(fixtures) => <FixtureRecords fixtures={fixtures} />}
                resourceLabel="fixtures"
                title="Fixtures"
              />
            </AnchoredSection>
            <AnchoredSection id="players">
              <RelatedCollection
                emptyMessage="No published players are available for this team."
                filters={relatedFilters('competitorId', competitor.competitorId)}
                load={publicReadApi.listParticipants}
                renderRecords={(players) => <PlayerRecords players={players} />}
                resourceLabel="players"
                title="Players"
              />
            </AnchoredSection>
          </DetailLayout>
        );
      }}
      requestKey={competitorId}
    />
  );
}

export function ParticipantDetailPage() {
  const { participantId = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getParticipant(participantId, signal),
    [participantId],
  );

  return (
    <DetailState
      label="Player"
      load={load}
      render={({ data: participant }) => {
        return (
          <DetailLayout
            backLabel="players"
            backTo="/participants"
            eyebrow="Player"
            title={participant.displayName}
            breadcrumbs={[
              { label: 'Explore', to: '/participants' },
              { label: 'Players', to: '/participants' },
              { label: participant.displayName, to: '#' },
            ]}
            sections={[
              { label: 'Overview', to: '#overview' },
              { label: 'Match history', to: '#match-history' },
            ]}
          >
            <Link
              className="button button--secondary"
              to={`/participants/compare?playerA=${encodeURIComponent(participant.participantId)}`}
            >
              Compare with another player
            </Link>
            {/* Siblings, so both requests start in the same commit rather than one
                waiting on the other; neither section's state can hide the other. */}
            <AnchoredSection id="overview">
              <ParticipantCareerOverview participantId={participant.participantId} />
            </AnchoredSection>
            <AnchoredSection id="match-history">
              <PlayerMatchHistory participantId={participant.participantId} />
            </AnchoredSection>
          </DetailLayout>
        );
      }}
      requestKey={participantId}
    />
  );
}

export function NotFoundPage() {
  return (
    <div className="detail-page content-boundary">
      <div className="state-message state-message--detail">
        <p className="eyebrow">Page not found</p>
        <h1>This public page does not exist</h1>
        <p>The address does not match a published browsing page.</p>
        <Link className="button button--secondary" to="/">
          Return home
        </Link>
      </div>
    </div>
  );
}
