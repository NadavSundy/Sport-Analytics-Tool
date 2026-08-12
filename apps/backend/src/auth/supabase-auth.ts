import { createClient } from '@supabase/supabase-js';
import type { Environment } from '../config/env';

type SupabaseEnvironment = Pick<Environment, 'SUPABASE_URL' | 'SUPABASE_PUBLISHABLE_KEY'>;

export interface VerifiedIdentity {
  uid: string;
  displayName?: string | null;
}

export type VerifyAccessToken = (accessToken: string) => Promise<VerifiedIdentity>;

export function createSupabaseTokenVerifier(environment: SupabaseEnvironment): VerifyAccessToken {
  const supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return async (accessToken) => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      throw new Error('Supabase authentication token could not be verified');
    }

    return {
      uid: user.id,
      displayName: resolveDisplayName(user.user_metadata),
    };
  };
}

function resolveDisplayName(metadata: Record<string, unknown>): string | null {
  for (const key of ['display_name', 'full_name', 'name']) {
    const value = metadata[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
