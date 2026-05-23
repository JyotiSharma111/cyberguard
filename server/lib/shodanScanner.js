/**
 * Shodan InternetDB Scanner
 * Free API — no key needed. Rate limit: 1 req/sec, be respectful.
 * Endpoint: https://internetdb.shodan.io/{ip}
 *
 * Returns open ports, CVEs, and CPEs (software versions) for any public IP.
 */
import dns from 'node:dns/promises'

const SHODAN_BASE = 'https://internetdb.shodan.io'
const TIMEOUT_MS  = 10000

/**
 * Fetch with timeout. Returns { ok, status, data, error }.
 * Never throws.
 */
async function safeFetch(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res  = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'CyberGuard-Scanner/1.0' } })
    clearTimeout(timer)
    if (res.status === 404) return { ok: true, status: 404, data: null }   // IP not in Shodan = clean
    if (!res.ok)            return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}` }
    const data = await res.json()
    return { ok: true, status: res.status, data }
  } catch (err) {
    clearTimeout(timer)
    const code = err.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_ERROR'
    return { ok: false, status: 0, data: null, error: `${code}: ${err.message}` }
  }
}

/**
 * Analyse a port number and return human-readable info.
 */
function describePort(port) {
  const known = {
    21:   { name: 'FTP',           risk: 'high',   note: 'File transfer — often has auth issues. Should not be publicly exposed.' },
    22:   { name: 'SSH',           risk: 'medium',  note: 'Remote access. Ensure key-based auth only, disable password login.' },
    23:   { name: 'Telnet',        risk: 'critical',note: 'Plaintext remote access — should never be public. Disable immediately.' },
    25:   { name: 'SMTP',          risk: 'medium',  note: 'Mail server. Ensure it requires auth to prevent open relay.' },
    53:   { name: 'DNS',           risk: 'medium',  note: 'DNS server. Ensure recursion is disabled for public queries.' },
    80:   { name: 'HTTP',          risk: 'low',     note: 'Web server. Should redirect to HTTPS (443).' },
    110:  { name: 'POP3',          risk: 'high',    note: 'Email retrieval — uses plaintext. Use POP3S (995) instead.' },
    143:  { name: 'IMAP',          risk: 'high',    note: 'Email access — uses plaintext. Use IMAPS (993) instead.' },
    443:  { name: 'HTTPS',         risk: 'low',     note: 'Encrypted web traffic. Expected and normal.' },
    445:  { name: 'SMB',           risk: 'critical',note: 'Windows file sharing — never expose to internet. Common ransomware vector.' },
    1433: { name: 'MSSQL',         risk: 'critical',note: 'SQL Server exposed to internet — major risk. Restrict to VPN/internal only.' },
    1521: { name: 'Oracle DB',     risk: 'critical',note: 'Oracle database exposed — restrict to internal network only.' },
    2375: { name: 'Docker',        risk: 'critical',note: 'Docker API exposed — full server compromise risk. Disable immediately.' },
    3306: { name: 'MySQL',         risk: 'critical',note: 'MySQL exposed to internet — should be internal only.' },
    3389: { name: 'RDP',           risk: 'critical',note: 'Remote Desktop exposed — primary ransomware entry point. Use VPN.' },
    5432: { name: 'PostgreSQL',    risk: 'critical',note: 'Postgres exposed to internet — restrict to internal network only.' },
    5900: { name: 'VNC',           risk: 'critical',note: 'VNC remote desktop — often weakly authenticated. Disable or VPN-gate.' },
    6379: { name: 'Redis',         risk: 'critical',note: 'Redis exposed — no auth by default. Restrict to internal network.' },
    8080: { name: 'HTTP alt',      risk: 'medium',  note: 'Alternative HTTP port. Check what service is running here.' },
    8443: { name: 'HTTPS alt',     risk: 'low',     note: 'Alternative HTTPS port.' },
    9200: { name: 'Elasticsearch', risk: 'critical',note: 'Elasticsearch exposed — data breach risk. Restrict to internal only.' },
    27017:{ name: 'MongoDB',       risk: 'critical',note: 'MongoDB exposed — no auth by default. Restrict to internal network.' },
  }
  return known[port] ?? { name: `Port ${port}`, risk: 'medium', note: 'Unknown service on this port — investigate what is running.' }
}

/**
 * Get CVE severity from CVE ID heuristic (CVSS not available from InternetDB).
 * InternetDB only gives CVE IDs, not scores. We tag recent CVEs as high.
 */
function cveSeverity(cveId) {
  // Recent CVEs (2023+) tend to be high severity by default in InternetDB
  const year = parseInt(cveId.split('-')[1] ?? '0', 10)
  if (year >= 2023) return 'critical'
  if (year >= 2021) return 'high'
  return 'medium'
}

/**
 * Main scan. Takes domain name, resolves its IPs, queries Shodan for each.
 */
export async function scanShodan(domain) {
  if (!domain) throw new Error('scanShodan: domain required')
  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()

  console.log(`[shodanScanner] Scanning ${clean}`)
  const startedAt = Date.now()

  // Resolve domain to IPs
  let ips = []
  try {
    const a    = await dns.resolve4(clean).catch(() => [])
    const aaaa = await dns.resolve6(clean).catch(() => [])
    ips = [...new Set([...a, ...aaaa.slice(0, 2)])]   // dedupe, limit IPv6
  } catch (err) {
    console.warn(`[shodanScanner] DNS resolution failed for ${clean}:`, err.message)
  }

  if (!ips.length) {
    return {
      domain: clean, scannedAt: new Date().toISOString(), elapsedMs: Date.now() - startedAt,
      ips: [], ports: [], vulns: [], cpes: [], issues: [], score: 100,
      error: `Could not resolve ${clean} to any IP addresses`
    }
  }

  // Query Shodan for each IP (max 3 to be polite)
  const results = []
  for (const ip of ips.slice(0, 3)) {
    const r = await safeFetch(`${SHODAN_BASE}/${ip}`)
    if (r.ok && r.data) results.push({ ip, ...r.data })
    else if (r.status === 404) results.push({ ip, ports:[], vulns:[], cpes:[], tags:[], hostnames:[] })
    else results.push({ ip, error: r.error })
    // Respect rate limit
    await new Promise(r => setTimeout(r, 1100))
  }

  // Aggregate across all IPs
  const allPorts = [...new Set(results.flatMap(r => r.ports ?? []))]
  const allVulns = [...new Set(results.flatMap(r => r.vulns ?? []))]
  const allCpes  = [...new Set(results.flatMap(r => r.cpes  ?? []))]
  const allTags  = [...new Set(results.flatMap(r => r.tags  ?? []))]

  // Build issues list
  const issues = []

  // Port issues
  for (const port of allPorts) {
    const info = describePort(port)
    if (info.risk === 'critical' || info.risk === 'high') {
      issues.push({
        id:     `port-${port}`,
        type:   'Ports',
        sev:    info.risk,
        title:  `${info.name} (port ${port}) exposed to internet`,
        detail: info.note,
        fix:    port === 3389
          ? ['Block port 3389 in your firewall from all IPs except your VPN range', 'Require VPN before RDP is accessible', 'Enable Network Level Authentication (NLA)']
          : port === 22
          ? ['Disable password auth: PasswordAuthentication no in /etc/ssh/sshd_config', 'Use SSH key pairs only', 'Consider moving SSH to a non-standard port']
          : port === 3306 || port === 5432 || port === 27017
          ? [`Restrict port ${port} to internal network only in your firewall/security group`, 'Never expose databases to the public internet', 'Use a VPN or bastion host for remote DB access']
          : [`Block port ${port} from public internet in your firewall`, 'Restrict to VPN or internal network only']
      })
    }
  }

  // CVE issues
  for (const cve of allVulns.slice(0, 20)) {
    const sev = cveSeverity(cve)
    issues.push({
      id:     `cve-${cve}`,
      type:   'CVE',
      sev,
      title:  `${cve} — known vulnerability detected`,
      detail: `Shodan detected ${cve} on one of your public IPs (${ips[0]}). This CVE is associated with software/services detected on your server.`,
      fix: [
        'Update all server software packages: sudo apt update && sudo apt upgrade',
        `Search "${cve}" at nvd.nist.gov for the specific affected software and patch version`,
        'After patching, trigger a rescan to verify the CVE no longer appears'
      ]
    })
  }

  // Score calculation
  const critCount = issues.filter(i => i.sev === 'critical').length
  const highCount  = issues.filter(i => i.sev === 'high').length
  const score = Math.max(0, 100 - (critCount * 20) - (highCount * 10))

  const elapsed = Date.now() - startedAt
  console.log(`[shodanScanner] Done for ${clean} in ${elapsed}ms — ${allPorts.length} ports, ${allVulns.length} CVEs, ${issues.length} issues`)

  return {
    domain:     clean,
    scannedAt:  new Date().toISOString(),
    elapsedMs:  elapsed,
    ips,
    ports:      allPorts.map(p => ({ port: p, ...describePort(p) })),
    vulns:      allVulns.map(v => ({ cve: v, severity: cveSeverity(v) })),
    cpes:       allCpes,
    tags:       allTags,
    rawResults: results,
    issues,
    score,
  }
}
