import {
  apiErrorResponseSchema,
  competitionCollectionResponseSchema,
  competitionResponseSchema,
  competitorCollectionResponseSchema,
  competitorResponseSchema,
  fixtureCollectionResponseSchema,
  fixtureResponseSchema,
  participantCollectionResponseSchema,
  participantResponseSchema,
  seasonCollectionResponseSchema,
  seasonResponseSchema,
  type Competition,
  type Competitor,
  type Fixture,
  type PaginationMetadata,
  type Participant,
  type Season,
} from '@sport-analytics/contracts';
import { ApiResponseError } from './client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

interface ResponseSchema<ResponseBody> {
  parse(value: unknown): ResponseBody;
}

export interface CollectionResponse<Resource> {
  data: Resource[];
  pagination: PaginationMetadata;
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

export const publicReadApi = {
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
    return requestPublicApi<CollectionResponse<Fixture>>(
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
};
