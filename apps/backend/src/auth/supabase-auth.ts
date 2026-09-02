import { createClient } from '@supabase/supabase-js';
import type { Environment } from '../config/env';

type SupabaseEnvironment = Pick<Environment, 'SUPABASE_URL' | 'SUPABASE_PUBLISHABLE_KEY'>;
interface SupabaseAdminEnvironment {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}

export interface VerifiedIdentity {
  uid: string;
  displayName?: string | null;
  lastSignInAt?: Date | null;
}

export type VerifyAccessToken = (accessToken: string) => Promise<VerifiedIdentity>;
type DeleteAuthUserResult = 'deleted' | 'not_found';
export type DeleteAuthUser = (authSubject: string) => Promise<DeleteAuthUserResult>;
/** Reads only the provider field that the administrator management API is allowed to expose. */
export type ReadAuthUserEmail = (authSubject: string) => Promise<string>;

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

export function createSupabaseAdminUserDeleter(
  environment: SupabaseAdminEnvironment,
): DeleteAuthUser {
  const supabaseAdmin = createClient(environment.SUPABASE_URL, environment.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return async (authSubject) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authSubject, false);

    if (!error) {
      return 'deleted';
    }

    if ('code' in error && error.code === 'user_not_found') {
      return 'not_found';
    }

    // Provider details can contain internal information. Keep them out of logs
    // and public error responses by raising a stable local failure instead.
    throw new Error('Supabase Auth administrative deletion failed');
  };
}

/**
 * Keep provider administration at the backend boundary.  The returned function
 * intentionally exposes an email address only; callers never receive the
 * provider user object, its tokens, or its metadata.
 */
export function createSupabaseAdminUserEmailReader(
  environment: SupabaseAdminEnvironment,
): ReadAuthUserEmail {
  const supabaseAdmin = createClient(environment.SUPABASE_URL, environment.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return async (authSubject) => {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.admin.getUserById(authSubject);

    if (error || !user?.email) {
      throw new Error('Supabase Auth administrative email lookup failed');
    }

    return user.email;
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
