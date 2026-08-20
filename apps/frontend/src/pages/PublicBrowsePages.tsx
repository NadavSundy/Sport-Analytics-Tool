import type {
  Competition,
  Competitor,
  Fixture,
  Participant,
  Season,
} from '@sport-analytics/contracts';
import { useCallback, type ReactNode } from 'react';
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
import { usePublicData } from '../features/browse/usePublicData';

function optionSearch(filters?: URLSearchParams): string {
  const params = new URLSearchParams(filters);
  params.set('limit', '100');
  return `?${params.toString()}`;
}

async function loadCompetitionOptions(
  _filters: URLSearchParams,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listCompetitions(optionSearch(), signal);
  return response.data.map((competition) => ({
    label: competition.name,
    value: competition.competitionId,
  }));
}

async function loadCompetitionNameOptions(
  filters: URLSearchParams,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const options = await loadCompetitionOptions(filters, signal);
  return options.map((option) => ({ ...option, value: option.label }));
}

async function loadSeasonOptions(
  filters: URLSearchParams,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listSeasons(optionSearch(filters), signal);
  return response.data.map((season) => ({
    description: `Season in ${season.competitionName}`,
    keywords: [season.label, season.competitionName],
    label: `${season.competitionName} — ${season.label}`,
    value: season.seasonId,
  }));
}

async function loadFixtureOptions(
  filters: URLSearchParams,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listFixtures(optionSearch(filters), signal);
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
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listCompetitors(optionSearch(filters), signal);
  return response.data.map((team) => ({
    label: team.name,
    value: team.competitorId,
  }));
}

async function loadTeamNameOptions(
  filters: URLSearchParams,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const options = await loadTeamOptions(filters, signal);
  return options.map((option) => ({ ...option, value: option.label }));
}

async function loadPlayerNameOptions(
  filters: URLSearchParams,
  signal: AbortSignal,
): Promise<NameComboboxOption[]> {
  const response = await publicReadApi.listParticipants(optionSearch(filters), signal);
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
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function fixtureTitle(fixture: Fixture): string {
  const teamNames = fixture.competitors.map(({ name }) => name);
  return teamNames.length > 0 ? teamNames.join(' vs ') : 'Fixture teams unavailable';
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
      <p className="record-list__summary">{context.join(' · ')}</p>
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
          >
            <RelatedCollection
              emptyMessage="No published seasons are available for this competition."
              filters={relatedFilters('competitionId', competition.competitionId)}
              load={publicReadApi.listSeasons}
              renderRecords={(seasons) => <SeasonRecords seasons={seasons} />}
              resourceLabel="seasons"
              title="Seasons"
            />
            <RelatedCollection
              emptyMessage="No published fixtures are available for this competition."
              filters={relatedFilters('competitionId', competition.competitionId)}
              load={publicReadApi.listFixtures}
              renderRecords={(fixtures) => <CompetitionFixtureRecords fixtures={fixtures} />}
              resourceLabel="fixtures"
              title="Fixtures by season"
            />
            <RelatedCollection
              emptyMessage="No published teams are available for this competition."
              filters={relatedFilters('competitionId', competition.competitionId)}
              load={publicReadApi.listCompetitors}
              renderRecords={(teams) => <TeamRecords teams={teams} />}
              resourceLabel="teams"
              title="Teams"
            />
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
          >
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
            <RelatedCollection
              emptyMessage="No published fixtures are available for this season."
              filters={relatedFilters('seasonId', season.seasonId)}
              load={publicReadApi.listFixtures}
              renderRecords={(fixtures) => <FixtureRecords fixtures={fixtures} />}
              resourceLabel="fixtures"
              title="Fixtures"
            />
            <RelatedCollection
              emptyMessage="No published teams are available for this season."
              filters={relatedFilters('seasonId', season.seasonId)}
              load={publicReadApi.listCompetitors}
              renderRecords={(teams) => <TeamRecords teams={teams} />}
              resourceLabel="teams"
              title="Teams"
            />
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
          >
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
              <RecordFact label="Start date" value={formatDate(fixture.startDate)} />
              <RecordFact label="End date" value={formatDate(fixture.endDate)} />
              <RecordFact label="Balls per over" value={fixture.ballsPerOver} />
              <RecordFact
                label="Scheduled overs"
                value={fixture.scheduledOvers ?? 'Not specified'}
              />
            </RecordFacts>
            <nav aria-label="Fixture records" className="related-records">
              <h2>Fixture records</h2>
              <div>
                <Link to={`/fixtures/${encodeURIComponent(fixture.fixtureId)}/statistics`}>
                  View fixture statistics
                </Link>
                <Link to={`/participants?fixtureId=${encodeURIComponent(fixture.fixtureId)}`}>
                  Browse players
                </Link>
              </div>
            </nav>
          </DetailLayout>
        );
      }}
      requestKey={fixtureId}
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
          >
            <RelatedCollection
              emptyMessage="No published fixtures are available for this team."
              filters={relatedFilters('competitorId', competitor.competitorId)}
              load={publicReadApi.listFixtures}
              renderRecords={(fixtures) => <FixtureRecords fixtures={fixtures} />}
              resourceLabel="fixtures"
              title="Fixtures"
            />
            <RelatedCollection
              emptyMessage="No published players are available for this team."
              filters={relatedFilters('competitorId', competitor.competitorId)}
              load={publicReadApi.listParticipants}
              renderRecords={(players) => <PlayerRecords players={players} />}
              resourceLabel="players"
              title="Players"
            />
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
          >
            {null}
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
