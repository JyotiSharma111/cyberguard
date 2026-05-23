/**
 * Subdomain Discovery via Certificate Transparency Logs
 * Uses crt.sh — free, no API key needed.
 * Finds all subdomains that have ever had an SSL certificate issued.
 *
 * Also checks each subdomain for takeover risk (CNAME to unclaimed service).
 */
import dns from 'node:dns/promises'

const CRT_URL    = 'https://crt.sh'
const TIMEOUT_MS = 15000

async function safeFetch(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CyberGuard-Scanner/1.0', 'Accept': 'application/json' }
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data: null }
    const data = await res.json()
    return { ok: true, data }
  } catch (err) {
    clearTimeout(timer)
    return { ok: false, error: err.name === 'AbortError' ? 'TIMEOUT' : err.message, data: null }
  }
}

/**
 * Known services that are vulnerable to subdomain takeover
 * when a CNAME points to them but the account no longer exists.
 */
const TAKEOVER_VULNERABLE = [
  'github.io', 'herokuapp.com', 'netlify.app', 'vercel.app',
  'pages.dev', 'azurewebsites.net', 'cloudapp.azure.com',
  'amplifyapp.com', 'surge.sh', 'bitbucket.io',
  's3.amazonaws.com', 'storage.googleapis.com',
]

/**
 * Check if a subdomain is vulnerable to takeover.
 * Returns { vulnerable, target, reason } or null.
 */
async function checkTakeover(subdomain) {
  try {
    const cnames = await dns.resolveCname(subdomain).catch(() => [])
    for (const cname of cnames) {
      for (const service of TAKEOVER_VULNERABLE) {
        if (cname.includes(service)) {
          // Check if the CNAME target resolves (if not, it's unclaimed)
          const resolves = await dns.resolve4(cname).then(() => true).catch(() => false)
          if (!resolves) {
            return { vulnerable: true, cname, service, reason: `CNAME to unclaimed ${service} resource` }
          }
        }
      }
    }
  } catch {
    // Subdomain doesn't resolve at all
  }
  return null
}

/**
 * Main subdomain discovery.
 */
export async function scanSubdomains(domain) {
  if (!domain) throw new Error('scanSubdomains: domain required')
  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()

  console.log(`[subdomainScanner] Scanning ${clean}`)
  const startedAt = Date.now()

  // Query crt.sh for certificate transparency logs
  const result = await safeFetch(`${CRT_URL}/?q=%.${clean}&output=json`)

  if (!result.ok) {
    console.warn(`[subdomainScanner] crt.sh failed:`, result.error)
    return {
      domain: clean, scannedAt: new Date().toISOString(),
      total: 0, subdomains: [], checked: [], issues: [], score: 100,
      error: `crt.sh lookup failed: ${result.error}`
    }
  }

  // Parse and deduplicate subdomain names
  const raw = result.data ?? []
  const names = new Set()

  for (const entry of raw) {
    const val = entry.name_value ?? ''
    // Split on newlines (crt.sh sometimes returns multiple per entry)
    for (const name of val.split('\n')) {
      const n = name.trim().toLowerCase()
      // Skip wildcards and the root domain itself
      if (!n || n.startsWith('*') || n === clean) continue
      // Only include subdomains of our target
      if (n.endsWith(`.${clean}`)) names.add(n)
    }
  }

  const subdomains = [...names].sort()
  console.log(`[subdomainScanner] Found ${subdomains.length} unique subdomains for ${clean}`)

  // Check top subdomains for takeover risk (limit to 20 to avoid rate limits)
  const issues = []
  const checked = []

  for (const sub of subdomains.slice(0, 20)) {
    const takeover = await checkTakeover(sub)
    if (takeover) {
      issues.push({
        id:     `takeover-${sub}`,
        type:   'Subdomains',
        sev:    'critical',
        title:  `Subdomain takeover risk — ${sub}`,
        detail: `${sub} has a CNAME pointing to ${takeover.cname} which appears to be unclaimed. An attacker can register this and serve malicious content under your domain.`,
        fix: [
          `Option A: Delete the CNAME record for ${sub} in your DNS provider`,
          `Option B: Reclaim the ${takeover.service} resource before an attacker does`,
          `Verify fix: dig CNAME ${sub} (should return NXDOMAIN after deletion)`
        ]
      })
    }
    checked.push({ name: sub, takeoverRisk: !!takeover, takeover })
    await new Promise(r => setTimeout(r, 100))  // small delay between DNS checks
  }

  // Flag unusually large attack surface
  if (subdomains.length > 50) {
    issues.push({
      id:   'large-surface',
      type: 'Subdomains',
      sev:  'medium',
      title: `Large attack surface — ${subdomains.length} subdomains discovered`,
      detail: `${subdomains.length} subdomains have been issued SSL certificates. Each one is a potential entry point. Review the list and decommission any that are no longer needed.`,
      fix: [
        'Audit all subdomains and remove DNS records for any that are no longer in use',
        'Implement a subdomain inventory process so new subdomains are tracked',
        'Consider a wildcard certificate policy to reduce certificate sprawl'
      ]
    })
  }

  const critCount = issues.filter(i => i.sev === 'critical').length
  const score = Math.max(0, 100 - (critCount * 25) - (subdomains.length > 50 ? 10 : 0))
  const elapsed = Date.now() - startedAt

  console.log(`[subdomainScanner] Done for ${clean} in ${elapsed}ms — ${subdomains.length} subs, ${issues.length} issues`)

  return {
    domain:     clean,
    scannedAt:  new Date().toISOString(),
    elapsedMs:  elapsed,
    total:      subdomains.length,
    subdomains: subdomains.slice(0, 200),  // cap at 200 for DB storage
    checked,
    issues,
    score,
  }
}
