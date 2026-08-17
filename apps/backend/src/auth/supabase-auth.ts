import { createClient } from '@supabase/supabase-js';
import type { Environment } from '../config/env';

type SupabaseEnvironment = Pick<Environment, 'SUPABASE_URL' | 'SUPABASE_PUBLISHABLE_KEY'>;

export interface VerifiedIdentity {
  uid: string;
  displayName?: string | null;
  lastSignInAt?: Date | null;
}

export type VerifyAccessToken = (accessToken: string) => Promise<VerifiedIdentity>;
export type DeleteAuthUserResult = 'deleted' | 'not_found';
export type DeleteAuthUser = (authSubject: string) => Promise<DeleteAuthUserResult>;

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
      lastSignInAt: parseDate(user.last_sign_in_at),
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

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
