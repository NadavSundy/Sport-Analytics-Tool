import {
  apiErrorResponseSchema,
  competitionCollectionResponseSchema,
  competitionResponseSchema,
  competitorCollectionResponseSchema,
  competitorResponseSchema,
  datasetReleaseCollectionResponseSchema,
  datasetReleaseResponseSchema,
  fixtureCollectionResponseSchema,
  fixtureResponseSchema,
  fixtureWeatherResponseSchema,
  fixtureStatisticResponseSchema,
  fixtureStatisticsResponseSchema,
  participantAggregatesResponseSchema,
  participantCollectionResponseSchema,
  participantFixtureCollectionResponseSchema,
  participantResponseSchema,
  seasonCollectionResponseSchema,
  seasonResponseSchema,
  type Competition,
  type Competitor,
  type DatasetRelease,
  type Fixture,
  type FixtureCollectionResponse,
  type FixtureWeather,
  type FixtureStatistic,
  type FixtureStatistics,
  type PaginationMetadata,
  type Participant,
  type ParticipantAggregateScope,
  type ParticipantAggregates,
  type ParticipantFixture,
  type Season,
} from '@sport-analytics/contracts';
import { ApiResponseError } from './client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export type FixtureEventExportFormat = 'csv' | 'json';
export type FixtureEventExportFilters = Partial<
  Pick<
    Record<'inningsId' | 'competitorId' | 'participantId' | 'overNumber' | 'wicketKind', string>,
    'inningsId' | 'competitorId' | 'participantId' | 'overNumber' | 'wicketKind'
  >
>;

function filenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

export function fixtureEventExportFilename(
  fixtureId: string,
  format: FixtureEventExportFormat,
  filters: FixtureEventExportFilters,
): string {
  const trace = [
    filters.inningsId ? `innings-${filenamePart(filters.inningsId)}` : null,
    filters.competitorId ? `team-${filenamePart(filters.competitorId)}` : null,
    filters.participantId ? `player-${filenamePart(filters.participantId)}` : null,
    filters.overNumber ? `over-${filenamePart(filters.overNumber)}` : null,
    filters.wicketKind ? `wicket-${filenamePart(filters.wicketKind)}` : null,
  ].filter((part): part is string => part !== null);

  return `fixture-${filenamePart(fixtureId)}-${trace.length > 0 ? trace.join('-') : 'all'}-events.${format}`;
}

interface ResponseSchema<ResponseBody> {
  parse(value: unknown): ResponseBody;
}

export interface CollectionResponse<Resource> {
  data: Resource[];
  pagination: PaginationMetadata & { totalPages?: number };
}

export class ApiContractError extends Error {
  constructor() {
    super('The public API returned an unexpected response.');
    this.name = 'ApiContractError';
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requestPublicApi<ResponseBody>(
  path: string,
  schema: ResponseSchema<ResponseBody>,
  signal?: AbortSignal,
): Promise<ResponseBody> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
    },
    signal: signal ?? null,
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    const errorResponse = apiErrorResponseSchema.safeParse(body);
    const message = errorResponse.success ? errorResponse.data.error.message : undefined;
    throw new ApiResponseError(response.status, message);
  }

  try {
    return schema.parse(body);
  } catch {
    throw new ApiContractError();
  }
}

/**
 * Downloads exactly the accepted events a calculation trace displays. The
 * server derives the event set from the statistic and pages through it in full,
 * so the file cannot be a filtered look-alike of the trace or a single page of
 * it; any failure, including one partway through, arrives as an error response
 * rather than a short file.
 */
export async function downloadFixtureStatisticEventExport(
  fixtureId: string,
  statisticId: string,
  format: FixtureEventExportFormat,
): Promise<Blob> {
  const response = await fetch(
    `${apiBaseUrl}/fixtures/${encodeURIComponent(fixtureId)}/statistics/${encodeURIComponent(statisticId)}/events/export.${format}`,
    { headers: { Accept: format === 'csv' ? 'text/csv' : 'application/json' } },
  );

  if (!response.ok) {
    const body = await readResponseBody(response);
    const errorResponse = apiErrorResponseSchema.safeParse(body);
    throw new ApiResponseError(
      response.status,
      errorResponse.success ? errorResponse.data.error.message : undefined,
    );
  }

  return response.blob();
}

export function datasetReleaseArtifactUrl(version: string): string {
  return `${apiBaseUrl}/dataset-releases/${encodeURIComponent(version)}/artifact.json`;
}

export const publicReadApi = {
  listDatasetReleases(signal?: AbortSignal) {
    return requestPublicApi<{ data: DatasetRelease[] }>(
      '/dataset-releases',
      datasetReleaseCollectionResponseSchema,
      signal,
    );
  },
  getDatasetRelease(version: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: DatasetRelease }>(
      `/dataset-releases/${encodeURIComponent(version)}`,
      datasetReleaseResponseSchema,
      signal,
    );
  },
  listCompetitions(search: string, signal?: AbortSignal) {
    return requestPublicApi<CollectionResponse<Competition>>(
      `/competitions${search}`,
      competitionCollectionResponseSchema,
      signal,
    );
  },
  getCompetition(competitionId: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: Competition }>(
      `/competitions/${encodeURIComponent(competitionId)}`,
      competitionResponseSchema,
      signal,
    );
  },
  listSeasons(search: string, signal?: AbortSignal) {
    return requestPublicApi<CollectionResponse<Season>>(
      `/seasons${search}`,
      seasonCollectionResponseSchema,
      signal,
    );
  },
  getSeason(seasonId: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: Season }>(
      `/seasons/${encodeURIComponent(seasonId)}`,
      seasonResponseSchema,
      signal,
    );
  },
  listFixtures(search: string, signal?: AbortSignal) {
    return requestPublicApi<FixtureCollectionResponse>(
      `/fixtures${search}`,
      fixtureCollectionResponseSchema,
      signal,
    );
  },
  getFixture(fixtureId: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: Fixture }>(
      `/fixtures/${encodeURIComponent(fixtureId)}`,
      fixtureResponseSchema,
      signal,
    );
  },
  getFixtureWeather(fixtureId: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: FixtureWeather }>(
      `/fixtures/${encodeURIComponent(fixtureId)}/weather`,
      fixtureWeatherResponseSchema,
      signal,
    );
  },
  getFixtureStatistics(fixtureId: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: FixtureStatistics }>(
      `/fixtures/${encodeURIComponent(fixtureId)}/statistics`,
      fixtureStatisticsResponseSchema,
      signal,
    );
  },
  getFixtureStatistic(fixtureId: string, statisticId: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: FixtureStatistic }>(
      `/fixtures/${encodeURIComponent(fixtureId)}/statistics/${encodeURIComponent(statisticId)}?includeContributors=true`,
      fixtureStatisticResponseSchema,
      signal,
    );
  },
  listCompetitors(search: string, signal?: AbortSignal) {
    return requestPublicApi<CollectionResponse<Competitor>>(
      `/competitors${search}`,
      competitorCollectionResponseSchema,
      signal,
    );
  },
  getCompetitor(competitorId: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: Competitor }>(
      `/competitors/${encodeURIComponent(competitorId)}`,
      competitorResponseSchema,
      signal,
    );
  },
  listParticipants(search: string, signal?: AbortSignal) {
    return requestPublicApi<CollectionResponse<Participant>>(
      `/participants${search}`,
      participantCollectionResponseSchema,
      signal,
    );
  },
  getParticipant(participantId: string, signal?: AbortSignal) {
    return requestPublicApi<{ data: Participant }>(
      `/participants/${encodeURIComponent(participantId)}`,
      participantResponseSchema,
      signal,
    );
  },
  listParticipantFixtures(participantId: string, search: string, signal?: AbortSignal) {
    return requestPublicApi<CollectionResponse<ParticipantFixture>>(
      `/participants/${encodeURIComponent(participantId)}/fixtures${search}`,
      participantFixtureCollectionResponseSchema,
      signal,
    );
  },
  // A single resource, not a collection: the endpoint returns every requested
  // level in one response, so there is no cursor to follow.
  getParticipantAggregates(
    participantId: string,
    scope: ParticipantAggregateScope,
    signal?: AbortSignal,
  ) {
    return requestPublicApi<{ data: ParticipantAggregates }>(
      `/participants/${encodeURIComponent(participantId)}/statistics?scope=${scope}`,
      participantAggregatesResponseSchema,
      signal,
    );
  },
};
