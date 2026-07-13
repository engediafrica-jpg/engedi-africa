import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client for server-only routes that must run without a logged-in
// user session (e.g. the auto-confirm cron job). Bypasses RLS entirely —
// never import this into client components or expose SUPABASE_SERVICE_ROLE_KEY
// with a NEXT_PUBLIC_ prefix.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
