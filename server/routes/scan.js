/**
 * Full scan — DNS + SSL + Creds + Shodan + Subdomains + Headers + DKIM + WHOIS + VirusTotal
 * GET /api/scan/:domain
 */
import { Router } from 'express'
import { scanDomain }       from '../lib/dnsScanner.js'
import { scanSSL }          from '../lib/sslScanner.js'
import { scanCredentials }  from '../lib/credScanner.js'
import { scanShodan }       from '../lib/shodanScanner.js'
import { scanSubdomains }   from '../lib/subdomainScanner.js'
import { scanHeaders }      from '../lib/headersScanner.js'
import { scanDKIM }         from '../lib/dkimScanner.js'
import { scanWHOIS }        from '../lib/whoisScanner.js'
import { scanVirusTotal }   from '../lib/virusTotalScanner.js'
import { scanPentest }      from '../lib/pentestScanner.js'

const router = Router()

router.get('/:domain', async (req, res, next) => {
  const domain = req.params.domain?.trim()
  if (!domain) return res.status(400).json({ ok: false, error: 'domain required' })

  console.log(`[scan] Full scan started for: ${domain}`)
  const startedAt = Date.now()

  try {
    const [dnsR, sslR, credR, shodanR, subR, headersR, dkimR, whoisR, vtR, pentestR] =
      await Promise.allSettled([
        scanDomain(domain),
        scanSSL(domain),
        scanCredentials(domain, [], process.env.HIBP_API_KEY),
        scanShodan(domain),
        scanSubdomains(domain),
        scanHeaders(domain),
        scanDKIM(domain),
        scanWHOIS(domain),
        scanVirusTotal(domain, process.env.VIRUSTOTAL_API_KEY),
        scanPentest(domain),
      ])

    const dns     = dnsR.status     === 'fulfilled' ? dnsR.value     : { score:0,   issues:[] }
    const ssl     = sslR.status     === 'fulfilled' ? sslR.value     : { score:0,   issues:[] }
    const cred    = credR.status    === 'fulfilled' ? credR.value    : { score:0,   issues:[] }
    const shodan  = shodanR.status  === 'fulfilled' ? shodanR.value  : { score:100, issues:[] }
    const sub     = subR.status     === 'fulfilled' ? subR.value     : { score:100, issues:[] }
    const headers = headersR.status === 'fulfilled' ? headersR.value : { score:100, issues:[] }
    const dkim    = dkimR.status    === 'fulfilled' ? dkimR.value    : { score:100, issues:[] }
    const whois   = whoisR.status   === 'fulfilled' ? whoisR.value   : { score:100, issues:[] }
    const vt      = vtR.status      === 'fulfilled' ? vtR.value      : { score:100, issues:[] }
    const pentest = pentestR.status  === 'fulfilled' ? pentestR.value  : { score:100, issues:[] }

    // Weighted overall score
    const overall = Math.round(
      (dns.score     ?? 0)   * 0.15 +
      (ssl.score     ?? 0)   * 0.15 +
      (cred.score    ?? 0)   * 0.10 +
      (shodan.score  ?? 100) * 0.15 +
      (sub.score     ?? 100) * 0.05 +
      (headers.score ?? 100) * 0.15 +
      (dkim.score    ?? 100) * 0.10 +
      (whois.score   ?? 100) * 0.10 +
      (vt.score      ?? 100) * 0.04 +
      (pentest.score ?? 100) * 0.01
    )

    const sevOrder  = { critical:0, high:1, medium:2, low:3 }
    const allIssues = [
      ...(dns.issues     ?? []),
      ...(ssl.issues     ?? []),
      ...(cred.issues    ?? []),
      ...(shodan.issues  ?? []),
      ...(sub.issues     ?? []),
      ...(headers.issues ?? []),
      ...(dkim.issues    ?? []),
      ...(whois.issues   ?? []),
      ...(vt.issues      ?? []),
      ...(pentest.issues ?? []),
    ].sort((a, b) => (sevOrder[a.sev] ?? 9) - (sevOrder[b.sev] ?? 9))

    const elapsed = Date.now() - startedAt
    console.log(`[scan] Done ${domain} in ${elapsed}ms — score: ${overall}, issues: ${allIssues.length}`)

    res.json({
      ok: true,
      data: {
        domain, scannedAt: new Date().toISOString(), elapsedMs: elapsed,
        overallScore: overall,
        scores: {
          dns:        dns.score     ?? 0,
          ssl:        ssl.score     ?? 0,
          credentials:cred.score   ?? 0,
          ports:      shodan.score  ?? 100,
          subdomains: sub.score     ?? 100,
          headers:    headers.score ?? 100,
          dkim:       dkim.score    ?? 100,
          whois:      whois.score   ?? 100,
          threats:    vt.score      ?? 100,
          pentest:    pentest.score ?? 100,
        },
        issueCount: {
          critical: allIssues.filter(i => i.sev === 'critical').length,
          high:     allIssues.filter(i => i.sev === 'high').length,
          total:    allIssues.length,
        },
        issues: allIssues,
        dns, ssl, credentials: cred,
        shodan, subdomains: sub,
        headers, dkim, whois,
        virustotal: vt,
        pentest,
      }
    })
  } catch (err) { next(err) }
})

export default router
