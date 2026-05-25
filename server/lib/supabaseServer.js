/**
 * Server-side Supabase client.
 * Disables Realtime to avoid the ws/WebSocket error on Node 18.
 * The server never needs Realtime — it only does REST queries.
 */
import { createClient } from '@supabase/supabase-js'

let _client = null

export function getSupabase() {
  if (_client) return _client
  _client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      realtime: { enabled: false },
      global: {
        headers: { 'x-application-name': 'cyberguard-server' }
      }
    }
  )
  return _client
}

// Alias for convenience
export const supabaseServer = getSupabase()
