/**
 * Load environment variables BEFORE anything else.
 * This file must be the very first import in server/index.js.
 *
 * Loads in order (each overrides the previous):
 *   .env          — base config
 *   .env.local    — local overrides (your actual keys, gitignored)
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')

// Load .env first (base)
const base = resolve(root, '.env')
if (existsSync(base)) {
  config({ path: base })
  console.log('[env] loaded .env')
}

// Load .env.local second — overrides .env (your real keys live here)
const local = resolve(root, '.env.local')
if (existsSync(local)) {
  config({ path: local, override: true })
  console.log('[env] loaded .env.local')
} else {
  console.warn('[env] .env.local not found — create it with your API keys')
  console.warn('[env] See .env.example for the required variables')
}

// Confirm key variables loaded (never log the actual values)
const checks = {
  RESEND_API_KEY:    !!process.env.RESEND_API_KEY,
  SUPABASE_URL:      !!process.env.SUPABASE_URL,
  RESEND_FROM:       !!process.env.RESEND_FROM,
  VIRUSTOTAL_API_KEY:!!process.env.VIRUSTOTAL_API_KEY,
}
console.log('[env] key variables:', checks)
