const BASE_URL = import.meta.env.VITE_API_URL ?? ''

/**
 * API client — all fetch calls go through here.
 * 
 * - Centralised base URL (change once, works everywhere)
 * - Every call returns { ok, data, error } — never throws
 * - Request/response logged in dev mode
 * - Timeout on every request (10s default)
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const DEFAULT_TIMEOUT = 15000
const IS_DEV = import.meta.env.DEV

/**
 * Core fetch wrapper. Returns { ok, data, error, status }.
 */
async function getAuthHeader() {
  try {
    // Import supabase lazily to avoid circular deps
    const { supabase } = await import('./supabase.js')
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}
  } catch {
    return {}
  }
}

async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT)

  if (IS_DEV) console.debug(`[API] → ${options.method ?? 'GET'} ${url}`)

  // Attach auth token so server can enforce plan limits
  const authHeader = await getAuthHeader()

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...authHeader, ...(options.headers ?? {}) },
    })
    clearTimeout(timer)

    const data = await res.json().catch(() => null)

    if (IS_DEV) console.debug(`[API] ← ${res.status} ${url}`, data)

    if (!res.ok) {
      const errMsg = data?.error ?? `HTTP ${res.status}`
      console.error(`[API] Error ${res.status} on ${url}:`, errMsg)
      return { ok: false, data: null, error: errMsg, status: res.status }
    }

    return { ok: true, data: data?.data ?? data, error: null, status: res.status }

  } catch (err) {
    clearTimeout(timer)
    const isTimeout = err.name === 'AbortError'
    const message   = isTimeout ? `Request timed out after ${DEFAULT_TIMEOUT}ms` : err.message
    console.error(`[API] Fetch failed: ${url}`, message)
    return { ok: false, data: null, error: message, status: 0 }
  }
}

// ── Public API surface ────────────────────────────────────────

/** Check API is reachable */
export const health = () => apiFetch('/api/health')

/** Full DNS + email scan for a domain */
export const scanDNS = (domain) => apiFetch(`/api/dns/${encodeURIComponent(domain)}`)

/** SSL certificate scan */
export const scanSSL = (domain) => apiFetch(`/api/ssl/${encodeURIComponent(domain)}`)

/** Domain-level credential breach check (free, no key needed) */
export const scanCreds = (domain) => apiFetch(`/api/creds/${encodeURIComponent(domain)}`)

/**
 * Full scan — DNS + SSL + Creds in one call.
 * This is what the onboarding scan progress bar uses.
 */
export const fullScan = (domain) => apiFetch(`/api/scan/${encodeURIComponent(domain)}`)

/** Check if domain TXT verification record is live in DNS */
export const verifyDomain = (domain, token) =>
  apiFetch(`/api/verify/${encodeURIComponent(domain)}?token=${encodeURIComponent(token)}`)

/** Shodan port/CVE scan for a domain */
export const scanVuln       = (domain) => apiFetch(`/api/vuln/${encodeURIComponent(domain)}`)

/** Subdomain discovery via crt.sh */
export const scanSubdomains = (domain) => apiFetch(`/api/subdomains/${encodeURIComponent(domain)}`)

/** Fetch score history for chart */
export const fetchScoreHistory = (domainId) =>
  apiFetch(`/api/history/${encodeURIComponent(domainId)}`)

/** Fast vendor scan — DNS + SSL + email auth only */
export const scanVendorDomain = (domain) =>
  apiFetch(`/api/vendor/${encodeURIComponent(domain)}`, { timeout: 45000 })

/** Create Stripe Checkout session — returns { url } */
export const createCheckout = (userId, userEmail, plan) =>
  apiFetch('/api/billing/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ userId, userEmail, plan }),
  })

/** Open Stripe Customer Portal to manage/cancel */
export const openBillingPortal = (userId) =>
  apiFetch('/api/billing/portal', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })

/** HTTP security headers scan */
export const scanHeaders  = (domain) => apiFetch(`/api/headers/${encodeURIComponent(domain)}`)

/** DKIM selector discovery */
export const scanDKIM     = (domain) => apiFetch(`/api/dkim/${encodeURIComponent(domain)}`)

/** WHOIS / domain registration info */
export const scanWHOIS    = (domain) => apiFetch(`/api/whois/${encodeURIComponent(domain)}`)

/** VirusTotal domain reputation */
export const scanThreats  = (domain) => apiFetch(`/api/threats/${encodeURIComponent(domain)}`)

/** Automated pen test — checks for exposed files, methods, redirects */
export const runPentest = (domain) =>
  apiFetch(`/api/pentest/${encodeURIComponent(domain)}`, { timeout: 60000 })
