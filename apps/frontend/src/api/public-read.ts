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
  leaderboardResponseSchema,
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
  type Leaderboard,
  type LeaderboardQuery,
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
  pagination: PaginationMetadata & { totalPages?: number | undefined };
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
    // The code and `Retry-After` let a caller tell the anonymous read limit
    // (issue #821) apart from other failures and say how long to wait.
    const retryAfter = retryAfterSeconds(response);
    throw new ApiResponseError(response.status, message, {
      ...(errorResponse.success ? { code: errorResponse.data.error.code } : {}),
      ...(retryAfter !== undefined ? { retryAfterSeconds: retryAfter } : {}),
    });
  }

  try {
    return schema.parse(body);
  } catch {
    throw new ApiContractError();
  }
}

/**
 * Reads `Retry-After` only when it carries something a caller can act on.
 *
 * The header may also be an HTTP-date, which this client deliberately does not
 * interpret: an interface that cannot say how long to wait should say nothing
 * rather than guess a duration.
 */
function retryAfterSeconds(response: Response): number | undefined {
  const header = response.headers?.get('Retry-After');
  if (header === null || header === undefined) {
    return undefined;
  }

  const seconds = Number(header.trim());
  return Number.isInteger(seconds) && seconds >= 0 ? seconds : undefined;
}

/**
 * Sends a JSON body to a public endpoint and validates the response against the
 * shared contract.
 *
 * It is the POST counterpart of `requestPublicApi`, with two differences the
 * natural-language query endpoint needs: the error `code` is carried through, so
 * a caller can tell its nine outcomes apart, and `Retry-After` is read, so a
 * rate-limited caller can be told how long to wait. No credential is sent; the
 * endpoints this reaches are public.
 */
export async function postPublicApi<ResponseBody>(
  path: string,
  body: unknown,
  schema: ResponseSchema<ResponseBody>,
  signal?: AbortSignal,
): Promise<ResponseBody> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });
  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    const errorResponse = apiErrorResponseSchema.safeParse(responseBody);
    throw new ApiResponseError(
      response.status,
      errorResponse.success ? errorResponse.data.error.message : undefined,
      {
        ...(errorResponse.success ? { code: errorResponse.data.error.code } : {}),
        ...(errorResponse.success && errorResponse.data.error.details
          ? { details: errorResponse.data.error.details }
          : {}),
        ...(retryAfterSeconds(response) !== undefined
          ? { retryAfterSeconds: retryAfterSeconds(response) }
          : {}),
      },
    );
  }

  try {
    return schema.parse(responseBody);
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
    scope?: ParticipantAggregateScope,
    signal?: AbortSignal,
  ) {
    return requestPublicApi<{ data: ParticipantAggregates }>(
      `/participants/${encodeURIComponent(participantId)}/statistics${scope ? `?scope=${scope}` : ''}`,
      participantAggregatesResponseSchema,
      signal,
    );
  },
  getLeaderboard(query: LeaderboardQuery, signal?: AbortSignal) {
    const params = new URLSearchParams({
      scope: query.scope,
      metric: query.metric,
      limit: String(query.limit),
      ...(query.scope === 'season'
        ? { seasonId: query.seasonId }
        : { competitionId: query.competitionId }),
    });
    return requestPublicApi<{ data: Leaderboard }>(
      `/statistics/leaderboards?${params.toString()}`,
      leaderboardResponseSchema,
      signal,
    );
  },
};
