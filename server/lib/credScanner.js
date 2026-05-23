/**
 * Credential scanner — checks domain email addresses against
 * the HaveIBeenPwned v3 API (free, no auth needed for domain search).
 * 
 * Rate limit: HIBP allows ~1 req/1500ms per API key.
 * Free tier: breaches only (no paste data).
 * 
 * Docs: https://haveibeenpwned.com/API/v3#BreachesForAccount
 */

const HIBP_BASE = 'https://haveibeenpwned.com/api/v3'
const UA = 'CyberGuard-SecurityScanner/1.0'

/**
 * Sleep helper for rate limiting
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch with timeout + User-Agent.
 * Returns { ok, status, data } — never throws.
 */
async function hibpFetch(path, apiKey) {
  const headers = { 'User-Agent': UA, 'hibp-api-key': apiKey ?? '' }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${HIBP_BASE}${path}`, { headers, signal: controller.signal })
    clearTimeout(timeout)

    if (res.status === 404) return { ok: true, status: 404, data: [] }  // not found = clean
    if (res.status === 401) return { ok: false, status: 401, data: null, error: 'HIBP API key required for this endpoint' }
    if (res.status === 429) return { ok: false, status: 429, data: null, error: 'HIBP rate limit hit — try again in 60s' }
    if (!res.ok)            return { ok: false, status: res.status, data: null, error: `HIBP returned ${res.status}` }

    const data = await res.json()
    return { ok: true, status: res.status, data }
  } catch (err) {
    clearTimeout(timeout)
    const code = err.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_ERROR'
    return { ok: false, status: 0, data: null, error: `${code}: ${err.message}` }
  }
}

/**
 * Check a single email address against HIBP breaches.
 * Returns array of breach objects or error info.
 */
async function checkEmail(email, apiKey) {
  const encoded = encodeURIComponent(email)
  const result  = await hibpFetch(`/breachedaccount/${encoded}?truncateResponse=false`, apiKey)
  return { email, ...result }
}

/**
 * Get all breaches for a domain (doesn't expose individual emails — aggregate only).
 * This endpoint is free without an API key.
 */
async function getBreachesForDomain(domain) {
  const result = await hibpFetch(`/breaches?domain=${domain}`)
  return result
}

/**
 * Main credential scan. 
 * - Always checks domain-level breach data (free)
 * - If apiKey provided, checks specific email accounts
 */
export async function scanCredentials(domain, emailsToCheck = [], apiKey = null) {
  if (!domain) throw new Error('scanCredentials: domain required')

  const cleanDomain = domain.trim().toLowerCase()
  console.log(`[credScanner] Scanning credentials for ${cleanDomain}, ${emailsToCheck.length} emails to check`)

  const issues  = []
  const results = { domain: cleanDomain, scannedAt: new Date().toISOString() }

  // ── Domain-level breach check (free, no key needed) ───────
  const domainBreaches = await getBreachesForDomain(cleanDomain)
  results.domainBreaches = domainBreaches.data ?? []
  results.domainBreachError = domainBreaches.error ?? null

  if (domainBreaches.data && domainBreaches.data.length > 0) {
    const breachNames = domainBreaches.data.map(b => b.Name).join(', ')
    issues.push({
      id: 'domain-breach', sev: 'high', type: 'Credentials',
      title: `Domain found in ${domainBreaches.data.length} breach${domainBreaches.data.length > 1 ? 'es' : ''}`,
      detail: `${cleanDomain} emails appeared in: ${breachNames}`,
      fix: [
        'Force password reset for all staff accounts that may use reused passwords',
        'Enable MFA on all accounts',
        'Check each breach for the type of data exposed (password, phone, address)',
        'Visit haveibeenpwned.com to check individual accounts'
      ]
    })
  }

  // ── Per-email check (needs API key) ───────────────────────
  results.emailResults = []

  if (emailsToCheck.length > 0 && apiKey) {
    for (const email of emailsToCheck.slice(0, 20)) { // cap at 20 to respect rate limits
      await sleep(1600) // HIBP rate limit: 1 req per 1500ms
      const r = await checkEmail(email, apiKey)
      results.emailResults.push(r)

      if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
        const hasPlaintext = r.data.some(b => b.DataClasses?.includes('Passwords'))
        issues.push({
          id:  `cred-${email}`,
          sev: hasPlaintext ? 'critical' : 'high',
          type: 'Credentials',
          title: `${email} found in ${r.data.length} breach${r.data.length > 1 ? 'es' : ''}`,
          detail: `Breach sources: ${r.data.map(b => b.Name).join(', ')}`,
          fix: [
            `Force password reset for ${email} immediately`,
            'Revoke all active sessions and tokens',
            'Enable TOTP MFA on this account',
            'Review account audit logs for last 30 days'
          ]
        })
      }
    }
  } else if (emailsToCheck.length > 0 && !apiKey) {
    results.emailResults = [{ error: 'HIBP_API_KEY not set — per-email checks skipped. Add HIBP_API_KEY to your .env file.' }]
    console.warn('[credScanner] No HIBP API key — per-email checks skipped')
  }

  // ── Score ─────────────────────────────────────────────────
  const critCount = issues.filter(i => i.sev === 'critical').length
  const highCount  = issues.filter(i => i.sev === 'high').length
  results.score  = Math.max(0, 100 - (critCount * 25) - (highCount * 10))
  results.issues = issues

  console.log(`[credScanner] Done — ${issues.length} issues, score: ${results.score}`)
  return results
}
