/**
 * Vendor Scanner — fast, targeted scan for third-party vendors.
 * Runs DNS + SSL + email auth only (no Shodan/subdomains — too slow for vendors).
 * Designed to scan 10+ vendors in reasonable time.
 *
 * Grading scale (same as BitSight):
 *   A  = 850-1000  Excellent
 *   B  = 700-849   Good
 *   C  = 550-699   Needs attention
 *   D  = 400-549   Poor
 *   F  = 0-399     Critical risk
 */
import { scanDomain } from './dnsScanner.js'
import { scanSSL }    from './sslScanner.js'

function scoreToGrade(score) {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function gradeSuffix(score, grade) {
  // Add +/- for finer resolution within grade
  if (score >= 85) {
    if (score >= 95) return 'A+'
    if (score >= 90) return 'A'
    return 'A-'
  }
  if (score >= 70) {
    if (score >= 80) return 'B+'
    if (score >= 75) return 'B'
    return 'B-'
  }
  if (score >= 55) {
    if (score >= 65) return 'C+'
    if (score >= 60) return 'C'
    return 'C-'
  }
  if (score >= 40) return 'D'
  return 'F'
}

/**
 * Summarise key findings for display in vendor card.
 */
function buildSummary(dns, ssl) {
  const findings = []

  // Email auth quality
  const dmarc = dns?.email?.dmarc
  const spf   = dns?.email?.spf
  if (!dmarc?.valid || !dmarc?.policy || dmarc.policy === 'none') {
    findings.push({ type:'risk', text:'DMARC not enforced — email spoofing possible' })
  } else if (dmarc.policy === 'quarantine') {
    findings.push({ type:'warn', text:'DMARC quarantine — not fully enforced' })
  } else {
    findings.push({ type:'ok', text:'DMARC enforced (p=reject)' })
  }

  if (spf?.policy === 'hardfail') {
    findings.push({ type:'ok', text:'SPF hard fail configured' })
  } else if (!spf?.valid) {
    findings.push({ type:'risk', text:'SPF not configured' })
  }

  // SSL quality
  if (ssl?.connectError) {
    findings.push({ type:'risk', text:'HTTPS not available or cert invalid' })
  } else if (ssl?.cert?.daysLeft !== undefined) {
    if (ssl.cert.daysLeft < 0) {
      findings.push({ type:'risk', text:'SSL certificate expired' })
    } else if (ssl.cert.daysLeft < 30) {
      findings.push({ type:'warn', text:`SSL cert expires in ${ssl.cert.daysLeft} days` })
    } else {
      findings.push({ type:'ok', text:`SSL valid (${ssl.cert.daysLeft} days remaining)` })
    }
  }

  if (ssl?.protocol) {
    if (ssl.protocol === 'TLSv1.3') {
      findings.push({ type:'ok', text:'TLS 1.3 (latest protocol)' })
    } else if (ssl.protocol === 'TLSv1.2') {
      findings.push({ type:'ok', text:'TLS 1.2' })
    } else {
      findings.push({ type:'risk', text:`Outdated protocol: ${ssl.protocol}` })
    }
  }

  // DNS security
  const hasCaa  = (dns?.records?.caa?.data?.length ?? 0) > 0
  const hasPtr  = !!dns?.records?.ptr?.data
  if (!hasCaa) findings.push({ type:'warn', text:'No CAA record — any CA can issue certs' })
  if (!hasPtr)  findings.push({ type:'warn', text:'No PTR record on mail server' })

  return findings
}

export async function scanVendor(domain) {
  if (!domain) throw new Error('scanVendor: domain required')
  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()

  console.log(`[vendorScanner] Scanning ${clean}`)
  const startedAt = Date.now()

  // Run DNS + SSL in parallel — skip Shodan/subdomains for speed
  const [dnsResult, sslResult] = await Promise.allSettled([
    scanDomain(clean),
    scanSSL(clean),
  ])

  const dns = dnsResult.status === 'fulfilled' ? dnsResult.value : { score: 0, issues: [], error: dnsResult.reason?.message }
  const ssl = sslResult.status === 'fulfilled' ? sslResult.value : { score: 0, issues: [], error: sslResult.reason?.message }

  // Email auth score from DNS
  const email = dns?.email ?? {}
  let emailScore = 100
  if (!email.spf?.valid)                                emailScore -= 30
  if (email.spf?.policy === 'passall')                  emailScore -= 40
  if (!email.dmarc?.valid || !email.dmarc?.policy)      emailScore -= 35
  if (email.dmarc?.policy === 'none')                   emailScore -= 25
  if (email.dmarc?.policy === 'quarantine')             emailScore -= 10
  if (!email.bimi?.configured)                          emailScore -= 5
  emailScore = Math.max(0, emailScore)

  // Weighted overall
  const dnsW   = dns.score   ?? 0
  const sslW   = ssl.score   ?? 0
  const emailW = emailScore
  const overall = Math.round((dnsW * 0.35) + (sslW * 0.35) + (emailW * 0.30))
  const grade   = gradeSuffix(overall)

  const summary  = buildSummary(dns, ssl)
  const allIssues = [...(dns.issues ?? []), ...(ssl.issues ?? [])]

  const elapsed = Date.now() - startedAt
  console.log(`[vendorScanner] Done ${clean} in ${elapsed}ms — score: ${overall} grade: ${grade}`)

  return {
    domain:      clean,
    scannedAt:   new Date().toISOString(),
    elapsedMs:   elapsed,
    score:       overall,
    grade,
    dns_score:   dnsW,
    ssl_score:   sslW,
    email_score: emailW,
    summary,
    issues:      allIssues,
    raw_dns:     dns,
    raw_ssl:     ssl,
  }
}
