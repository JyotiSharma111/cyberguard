/**
 * VirusTotal Domain Reputation Scanner
 * Free API key — 4 requests/min, 500/day.
 * Get key at: https://www.virustotal.com/gui/join-us
 *
 * Checks domain against 90+ antivirus/threat intelligence engines.
 */

const VT_BASE = 'https://www.virustotal.com/api/v3'

async function vtFetch(path, apiKey) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${VT_BASE}${path}`, {
      signal: controller.signal,
      headers: { 'x-apikey': apiKey, 'User-Agent': 'CyberGuard-Scanner/1.0' }
    })
    clearTimeout(timer)
    if (res.status === 404) return { ok: true, status: 404, data: null }
    if (res.status === 401) return { ok: false, error: 'Invalid VirusTotal API key — check VIRUSTOTAL_API_KEY in .env.local' }
    if (res.status === 429) return { ok: false, error: 'VirusTotal rate limit — free tier allows 4 req/min' }
    if (!res.ok) return { ok: false, error: `VirusTotal returned ${res.status}` }
    const data = await res.json()
    return { ok: true, data }
  } catch (err) {
    clearTimeout(timer)
    return { ok: false, error: err.name === 'AbortError' ? 'TIMEOUT' : err.message }
  }
}

export async function scanVirusTotal(domain, apiKey) {
  if (!domain) throw new Error('scanVirusTotal: domain required')
  if (!apiKey) {
    return {
      domain, scannedAt: new Date().toISOString(),
      score: 100, issues: [],
      skipped: true,
      reason: 'VIRUSTOTAL_API_KEY not set — add it to .env.local for free threat intelligence. Get a free key at virustotal.com'
    }
  }

  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
  console.log(`[vtScanner] Checking ${clean}`)

  const result = await vtFetch(`/domains/${clean}`, apiKey)

  if (!result.ok) {
    console.warn(`[vtScanner] Failed: ${result.error}`)
    return { domain: clean, scannedAt: new Date().toISOString(), score: 100, issues: [], error: result.error }
  }

  if (!result.data || result.status === 404) {
    return { domain: clean, scannedAt: new Date().toISOString(), score: 100, issues: [], notFound: true }
  }

  const attrs      = result.data.data?.attributes ?? {}
  const stats      = attrs.last_analysis_stats ?? {}
  const malicious  = stats.malicious  ?? 0
  const suspicious = stats.suspicious ?? 0
  const harmless   = stats.harmless   ?? 0
  const undetected = stats.undetected ?? 0
  const total      = malicious + suspicious + harmless + undetected

  // Get names of engines that flagged it
  const analyses  = attrs.last_analysis_results ?? {}
  const flaggedBy = Object.entries(analyses)
    .filter(([_, v]) => v.category === 'malicious' || v.category === 'suspicious')
    .map(([engine, v]) => `${engine} (${v.result})`)
    .slice(0, 10)

  const categories = attrs.categories ?? {}
  const reputation = attrs.reputation ?? 0

  const issues = []
  let score    = 100

  if (malicious > 0) {
    const pct = Math.round((malicious / total) * 100)
    issues.push({
      id: 'vt-malicious', type: 'Threats', sev: malicious >= 5 ? 'critical' : 'high',
      title: `Domain flagged as malicious by ${malicious}/${total} security engines (${pct}%)`,
      detail: `Flagged by: ${flaggedBy.slice(0,5).join(', ')}${flaggedBy.length > 5 ? ` and ${flaggedBy.length - 5} more` : ''}.`,
      fix: [
        'Check if your website has been compromised — scan all files on your web server',
        'Run: sudo find /var/www -name "*.php" -newer /var/www/index.php -ls (find recently modified files)',
        'Contact your hosting provider and ask for a malware scan',
        'After cleaning, submit for review at google.com/webmasters and virustotal.com',
      ]
    })
    score -= Math.min(60, malicious * 12)
  }

  if (suspicious > 0 && malicious === 0) {
    issues.push({
      id: 'vt-suspicious', type: 'Threats', sev: 'medium',
      title: `Domain flagged as suspicious by ${suspicious} security engine${suspicious > 1 ? 's' : ''}`,
      detail: `Flagged by: ${flaggedBy.join(', ')}. This may be a false positive but warrants investigation.`,
      fix: [
        'Review your website for any injected scripts or unexpected content',
        'Check your server access logs for unusual requests',
        'Consider submitting a false-positive report to the flagging vendors',
      ]
    })
    score -= 15
  }

  if (reputation < -10) {
    issues.push({
      id: 'vt-reputation', type: 'Threats', sev: 'high',
      title: `Negative community reputation score: ${reputation}`,
      detail: 'VirusTotal community members have marked this domain as suspicious or malicious.',
      fix: ['Investigate your domain\'s historical use', 'Check for any past security incidents']
    })
    score -= 10
  }

  // Flag concerning category
  const badCategories = ['malware', 'phishing', 'spam', 'bot', 'c2']
  const foundBadCats  = Object.values(categories).filter(c =>
    badCategories.some(b => c.toLowerCase().includes(b))
  )
  if (foundBadCats.length > 0) {
    issues.push({
      id: 'vt-category', type: 'Threats', sev: 'high',
      title: `Domain categorised as: ${foundBadCats.join(', ')}`,
      detail: 'One or more security vendors have categorised this domain as potentially harmful.',
      fix: ['Investigate and clean any malware from your servers', 'Contact each vendor to request re-categorisation after cleanup']
    })
    score -= 20
  }

  score = Math.max(0, score)
  console.log(`[vtScanner] Done — ${malicious} malicious, ${suspicious} suspicious, score: ${score}`)

  return {
    domain:    clean,
    scannedAt: new Date().toISOString(),
    score,
    issues,
    stats:     { malicious, suspicious, harmless, undetected, total },
    reputation,
    categories,
    flaggedBy,
    lastAnalysisDate: attrs.last_analysis_date
      ? new Date(attrs.last_analysis_date * 1000).toISOString()
      : null,
  }
}
