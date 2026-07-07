/**
 * Supabase client — single instance used across the entire app.
 * Import this wherever you need auth or DB access.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    '[CyberGuard] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local\n' +
    'Copy .env.example to .env.local and fill in your Supabase project values.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:    true,
    persistSession:      true,
    detectSessionInUrl:  true,   // handles email verification magic links
  }
})

/** Convenience: get the current authenticated user (or null) */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('[supabase] getUser error:', error.message)
    return null
  }
  return user
}

/** Convenience: get the current user's profile row */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    console.error('[supabase] getProfile error:', error.message)
    return null
  }
  return data
}
