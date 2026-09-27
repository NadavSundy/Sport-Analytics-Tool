import { apiErrorResponseSchema, type ApiErrorDetail } from '@sport-analytics/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export type ApiErrorKind = 'unauthenticated' | 'forbidden' | 'request-failed';

export class ApiResponseError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string | undefined;
  readonly details: ApiErrorDetail[] | undefined;

  constructor(
    status: number,
    message = `API request failed with status ${status}`,
    options: {
      code?: string | undefined;
      details?: ApiErrorDetail[] | undefined;
    } = {},
  ) {
    const kind =
      status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' : 'request-failed';

    super(message);
    this.name = 'ApiResponseError';
    this.kind = kind;
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export type AccessTokenProvider = () => string | null;

export interface AuthenticatedApiClient {
  request<ResponseBody>(path: string, init?: RequestInit): Promise<ResponseBody>;
  requestWithStatus<ResponseBody>(
    path: string,
    init?: RequestInit,
  ): Promise<{ status: number; body: ResponseBody }>;
}

export function createAuthenticatedApiClient(
  getAccessToken: AccessTokenProvider,
): AuthenticatedApiClient {
  async function requestWithStatus<ResponseBody>(
    path: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: ResponseBody }> {
    const headers = new Headers(init.headers);
    const accessToken = getAccessToken();

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    } else {
      headers.delete('Authorization');
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${apiBaseUrl}${normalizedPath}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      let body: unknown = null;

      try {
        body = await response.json();
      } catch {
        // Some infrastructure failures have no JSON body. The status-based
        // fallback below still gives the interface a safe error state.
      }

      const errorResponse = apiErrorResponseSchema.safeParse(body);

      if (errorResponse.success) {
        throw new ApiResponseError(response.status, errorResponse.data.error.message, {
          code: errorResponse.data.error.code,
          details: errorResponse.data.error.details,
        });
      }

      throw new ApiResponseError(response.status);
    }

    const body =
      response.status === 204
        ? (undefined as ResponseBody)
        : ((await response.json()) as ResponseBody);
    return { status: response.status, body };
  }

  return {
    async request<ResponseBody>(path: string, init: RequestInit = {}): Promise<ResponseBody> {
      return (await requestWithStatus<ResponseBody>(path, init)).body;
    },
    requestWithStatus,
  };
}
