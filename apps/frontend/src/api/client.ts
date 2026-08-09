export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export type ApiErrorKind = 'unauthenticated' | 'forbidden' | 'request-failed';

export class ApiResponseError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;

  constructor(status: number) {
    const kind =
      status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' : 'request-failed';

    super(`API request failed with status ${status}`);
    this.name = 'ApiResponseError';
    this.kind = kind;
    this.status = status;
  }
}

export type AccessTokenProvider = () => string | null;

export interface AuthenticatedApiClient {
  request<ResponseBody>(path: string, init?: RequestInit): Promise<ResponseBody>;
}

export function createAuthenticatedApiClient(
  getAccessToken: AccessTokenProvider,
): AuthenticatedApiClient {
  return {
    async request<ResponseBody>(path: string, init: RequestInit = {}): Promise<ResponseBody> {
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
        throw new ApiResponseError(response.status);
      }

      if (response.status === 204) {
        return undefined as ResponseBody;
      }

      return (await response.json()) as ResponseBody;
    },
  };
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`, {
    headers: {
      Accept: 'application/json',
    },
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
