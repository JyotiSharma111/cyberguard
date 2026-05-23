/**
 * WHOIS / RDAP Scanner
 * Uses the RDAP protocol (modern WHOIS replacement) via rdap.org — free, no key.
 * Gets: registration date, expiry, registrar, nameservers.
 */

const TIMEOUT_MS = 10000

async function safeFetch(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/rdap+json', 'User-Agent': 'CyberGuard-Scanner/1.0' }
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = await res.json()
    return { ok: true, data }
  } catch (err) {
    clearTimeout(timer)
    return { ok: false, error: err.name === 'AbortError' ? 'TIMEOUT' : err.message }
  }
}

function parseRdapDate(events = [], eventAction) {
  const ev = events.find(e => e.eventAction === eventAction)
  return ev?.eventDate ? new Date(ev.eventDate) : null
}

function daysUntil(date) {
  if (!date) return null
  return Math.floor((date - new Date()) / (1000 * 60 * 60 * 24))
}

function domainAge(registeredDate) {
  if (!registeredDate) return null
  return Math.floor((new Date() - registeredDate) / (1000 * 60 * 60 * 24 * 365.25))
}

export async function scanWHOIS(domain) {
  if (!domain) throw new Error('scanWHOIS: domain required')
  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
  console.log(`[whoisScanner] Looking up ${clean}`)

  // Try RDAP bootstrap (finds the right RDAP server for the TLD)
  const result = await safeFetch(`https://rdap.org/domain/${clean}`)

  if (!result.ok) {
    console.warn(`[whoisScanner] RDAP lookup failed for ${clean}: ${result.error}`)
    return {
      domain: clean, scannedAt: new Date().toISOString(),
      score: 100, issues: [],
      error: `RDAP lookup failed: ${result.error}`,
      info: null
    }
  }

  const data       = result.data
  const events     = data.events ?? []
  const registered = parseRdapDate(events, 'registration')
  const expires    = parseRdapDate(events, 'expiration')
  const updated    = parseRdapDate(events, 'last changed')

  const daysToExpiry = daysUntil(expires)
  const ageYears     = domainAge(registered)

  // Registrar
  const registrar = data.entities
    ?.find(e => e.roles?.includes('registrar'))
    ?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3]
    ?? data.port43
    ?? 'Unknown'

  // Status
  const statuses = data.status ?? []

  const issues = []
  let score    = 100

  // Domain expiry
  if (daysToExpiry !== null && daysToExpiry < 0) {
    issues.push({
      id: 'domain-expired', type: 'WHOIS', sev: 'critical',
      title: 'Domain registration has EXPIRED',
      detail: `${clean} expired on ${expires?.toLocaleDateString()}. Anyone can re-register it right now and take over your email and website.`,
      fix: ['Log in to your domain registrar immediately and renew', `Registrar: ${registrar}`, 'After renewal, verify DNS propagation with: dig NS ' + clean]
    })
    score -= 50
  } else if (daysToExpiry !== null && daysToExpiry < 30) {
    issues.push({
      id: 'domain-expiring', type: 'WHOIS', sev: 'critical',
      title: `Domain expires in ${daysToExpiry} day${daysToExpiry !== 1 ? 's' : ''} — renew immediately`,
      detail: `${clean} expires on ${expires?.toLocaleDateString()}. If it lapses, your email, website, and all services stop working.`,
      fix: [`Renew at your registrar (${registrar}) immediately`, 'Enable auto-renewal to prevent this in future', 'Consider renewing for 2-5 years for peace of mind']
    })
    score -= 30
  } else if (daysToExpiry !== null && daysToExpiry < 90) {
    issues.push({
      id: 'domain-expiring-soon', type: 'WHOIS', sev: 'high',
      title: `Domain expires in ${daysToExpiry} days`,
      detail: `${clean} expires on ${expires?.toLocaleDateString()}. Renew soon.`,
      fix: [`Renew at ${registrar}`, 'Enable auto-renewal']
    })
    score -= 10
  }

  // Domain age (very new domains are higher risk)
  if (ageYears !== null && ageYears < 1) {
    issues.push({
      id: 'domain-new', type: 'WHOIS', sev: 'low',
      title: `Domain registered less than 1 year ago`,
      detail: `${clean} was registered in ${registered?.getFullYear()}. Very new domains are sometimes flagged as higher risk by email filters.`,
      fix: ['No action needed — domain age improves naturally over time', 'Ensure your email authentication (SPF, DKIM, DMARC) is fully configured to improve deliverability']
    })
  }

  // Transfer lock missing
  if (!statuses.includes('client transfer prohibited') && !statuses.includes('serverTransferProhibited')) {
    issues.push({
      id: 'domain-no-lock', type: 'WHOIS', sev: 'medium',
      title: 'Domain transfer lock not enabled',
      detail: 'Without a transfer lock, your domain could potentially be transferred to another registrar without your knowledge.',
      fix: [`Log in to ${registrar} and enable "Domain Lock" or "Transfer Lock"`, 'This is usually a free setting in your registrar account']
    })
    score -= 10
  }

  score = Math.max(0, score)
  console.log(`[whoisScanner] Done — expires in ${daysToExpiry} days, age ${ageYears}yr, score: ${score}`)

  return {
    domain:    clean,
    scannedAt: new Date().toISOString(),
    score,
    issues,
    info: {
      registrar,
      registered: registered?.toISOString() ?? null,
      expires:    expires?.toISOString()    ?? null,
      updated:    updated?.toISOString()    ?? null,
      daysToExpiry,
      ageYears,
      statuses,
      locked: statuses.includes('client transfer prohibited') || statuses.includes('serverTransferProhibited'),
    }
  }
}
