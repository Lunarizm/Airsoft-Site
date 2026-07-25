import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses every row level security policy.
 *
 * Rules:
 *  - Server-side only. Importing this into a "use client" file leaks
 *    the key into the browser bundle and hands your database away.
 *  - Always check the caller is actually an admin BEFORE using it.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
