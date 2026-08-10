import { useMemo } from 'react';
import { createAuthenticatedApiClient, type AuthenticatedApiClient } from '../../api/client';
import { useAuth } from './AuthProvider';

export function useAuthenticatedApiClient(): AuthenticatedApiClient {
  const { session } = useAuth();

  return useMemo(
    () => createAuthenticatedApiClient(() => session?.access_token ?? null),
    [session?.access_token],
  );
}
