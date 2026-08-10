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
import {
  DetailError,
  DetailLayout,
  DetailLoading,
  RecordFact,
  RecordFacts,
  RelatedLinks,
} from '../features/browse/RecordDetail';
import { usePublicData } from '../features/browse/usePublicData';

const competitionFilters: FilterField[] = [
  { label: 'Competition name', name: 'name', placeholder: 'Search by name', type: 'search' },
];

const seasonFilters: FilterField[] = [
  { label: 'Competition ID', name: 'competitionId', placeholder: 'Competition ID' },
];

const fixtureFilters: FilterField[] = [
  { label: 'Competition ID', name: 'competitionId', placeholder: 'Competition ID' },
  { label: 'Season ID', name: 'seasonId', placeholder: 'Season ID' },
  { label: 'Competitor ID', name: 'competitorId', placeholder: 'Competitor ID' },
  { label: 'Gender', name: 'gender', placeholder: 'Gender', type: 'search' },
  { label: 'Starting on or after', name: 'startDateFrom', type: 'date' },
  { label: 'Starting on or before', name: 'startDateTo', type: 'date' },
];

const competitorFilters: FilterField[] = [
  { label: 'Competition ID', name: 'competitionId', placeholder: 'Competition ID' },
  { label: 'Season ID', name: 'seasonId', placeholder: 'Season ID' },
  { label: 'Team name', name: 'name', placeholder: 'Search by team name', type: 'search' },
];

const participantFilters: FilterField[] = [
  { label: 'Fixture ID', name: 'fixtureId', placeholder: 'Fixture ID' },
  { label: 'Competitor ID', name: 'competitorId', placeholder: 'Competitor ID' },
  { label: 'Player name', name: 'name', placeholder: 'Search by player name', type: 'search' },
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

function RecordListItem({ children }: { children: ReactNode }) {
  return <li className="record-list__item">{children}</li>;
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
          <p className="record-list__meta">
            Competition{' '}
            <Link to={`/competitions/${encodeURIComponent(season.competitionId)}`}>
              {season.competitionId}
            </Link>
          </p>
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
      description="Browse published fixtures by competition, season, competitor, date and gender."
      emptyMessage="No published fixtures match the current filters."
      eyebrow="Match archive"
      filters={fixtureFilters}
      load={publicReadApi.listFixtures}
      renderItem={(fixture) => (
        <RecordListItem key={fixture.fixtureId}>
          <p className="record-list__meta">
            <time dateTime={fixture.startDate}>{formatDate(fixture.startDate)}</time>
          </p>
          <h3>
            <Link to={`/fixtures/${encodeURIComponent(fixture.fixtureId)}`}>
              {fixture.matchType} fixture
            </Link>
          </h3>
          <p className="record-list__summary">
            {fixture.season} / {labelValue(fixture.gender)} /{' '}
            {fixture.scheduledOvers === null
              ? 'Overs not specified'
              : `${fixture.scheduledOvers} overs`}
          </p>
        </RecordListItem>
      )}
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
          <p className="record-list__meta">Competitor</p>
          <h3>
            <Link to={`/competitors/${encodeURIComponent(competitor.competitorId)}`}>
              {competitor.name}
            </Link>
          </h3>
        </RecordListItem>
      )}
      resourceLabel="teams"
      title="Competitors"
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
          <p className="record-list__meta">Participant</p>
          <h3>
            <Link to={`/participants/${encodeURIComponent(participant.participantId)}`}>
              {participant.displayName}
            </Link>
          </h3>
        </RecordListItem>
      )}
      resourceLabel="players"
      title="Participants"
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
        const id = encodeURIComponent(competition.competitionId);
        return (
          <DetailLayout
            backLabel="competitions"
            backTo="/competitions"
            eyebrow="Competition"
            title={competition.name}
          >
            <RecordFacts>
              <RecordFact label="Competition ID" value={competition.competitionId} />
            </RecordFacts>
            <RelatedLinks>
              <Link to={`/seasons?competitionId=${id}`}>Browse seasons</Link>
              <Link to={`/fixtures?competitionId=${id}`}>Browse fixtures</Link>
              <Link to={`/competitors?competitionId=${id}`}>Browse competitors</Link>
            </RelatedLinks>
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
        const id = encodeURIComponent(season.seasonId);
        return (
          <DetailLayout backLabel="seasons" backTo="/seasons" eyebrow="Season" title={season.label}>
            <RecordFacts>
              <RecordFact label="Season ID" value={season.seasonId} />
              <RecordFact
                label="Competition"
                value={
                  <Link to={`/competitions/${encodeURIComponent(season.competitionId)}`}>
                    {season.competitionId}
                  </Link>
                }
              />
            </RecordFacts>
            <RelatedLinks>
              <Link to={`/fixtures?seasonId=${id}`}>Browse fixtures</Link>
              <Link to={`/competitors?seasonId=${id}`}>Browse competitors</Link>
            </RelatedLinks>
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
            eyebrow="Fixture"
            title={`${fixture.matchType} fixture`}
          >
            <RecordFacts>
              <RecordFact label="Fixture ID" value={fixture.fixtureId} />
              <RecordFact label="Season" value={fixture.season} />
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
            <RelatedLinks>
              {fixture.competitionId ? (
                <Link to={`/competitions/${encodeURIComponent(fixture.competitionId)}`}>
                  Open competition
                </Link>
              ) : null}
              {fixture.seasonId ? (
                <Link to={`/seasons/${encodeURIComponent(fixture.seasonId)}`}>Open season</Link>
              ) : null}
              <Link to={`/participants?fixtureId=${encodeURIComponent(fixture.fixtureId)}`}>
                Browse participants
              </Link>
            </RelatedLinks>
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
      label="Competitor"
      load={load}
      render={({ data: competitor }) => {
        const id = encodeURIComponent(competitor.competitorId);
        return (
          <DetailLayout
            backLabel="competitors"
            backTo="/competitors"
            eyebrow="Competitor"
            title={competitor.name}
          >
            <RecordFacts>
              <RecordFact label="Competitor ID" value={competitor.competitorId} />
            </RecordFacts>
            <RelatedLinks>
              <Link to={`/fixtures?competitorId=${id}`}>Browse fixtures</Link>
              <Link to={`/participants?competitorId=${id}`}>Browse participants</Link>
            </RelatedLinks>
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
      label="Participant"
      load={load}
      render={({ data: participant }) => {
        return (
          <DetailLayout
            backLabel="participants"
            backTo="/participants"
            eyebrow="Participant"
            title={participant.displayName}
          >
            <RecordFacts>
              <RecordFact label="Participant ID" value={participant.participantId} />
            </RecordFacts>
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
