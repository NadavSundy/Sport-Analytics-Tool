import { GoTrueClient } from '@supabase/auth-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required for frontend authentication.',
  );
}

export const supabase = new GoTrueClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: { apikey: supabasePublishableKey },
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
});
