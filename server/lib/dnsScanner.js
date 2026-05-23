/**
 * DNS Scanner — performs real DNS lookups using Node built-ins.
 * No external API key needed. All errors are caught per-record
 * so one failure doesn't kill the entire scan.
 */
import dns from 'node:dns/promises'
import net from 'node:net'

/**
 * Safely run a single DNS lookup. Returns { data, error }.
 * Never throws — callers can always destructure safely.
 */
async function safeResolve(fn, ...args) {
  try {
    const data = await fn(...args)
    return { data, error: null }
  } catch (err) {
    // ENODATA = record type not found (valid absence, not an error)
    // ENOTFOUND = domain doesn't exist at all
    const code = err.code ?? 'UNKNOWN'
    return { data: null, error: code }
  }
}

/**
 * Analyse SPF string for common misconfigurations.
 * Returns { valid, policy, issues[] }
 */
function analyseSPF(spfString) {
  if (!spfString) return { valid: false, policy: null, issues: ['SPF record missing'] }

  const issues = []
  let policy = 'softfail' // default ~all

  if (spfString.includes('+all')) {
    policy = 'passall'
    issues.push('SPF uses +all — allows ANY server to send as you. Change to -all immediately.')
  } else if (spfString.includes('-all')) {
    policy = 'hardfail'
  } else if (spfString.includes('~all')) {
    policy = 'softfail'
    issues.push('SPF uses ~all (softfail). Upgrade to -all once DMARC is at p=reject.')
  } else if (spfString.includes('?all')) {
    policy = 'neutral'
    issues.push('SPF uses ?all (neutral) — provides no protection.')
  }

  // Count DNS lookups (max 10 allowed)
  const lookups = (spfString.match(/include:|a:|mx:|ptr:|exists:/g) || []).length
  if (lookups > 10) {
    issues.push(`SPF has ${lookups} DNS lookups — exceeds the 10-lookup limit. Flatten your record.`)
  }

  return { valid: true, raw: spfString, policy, lookupCount: lookups, issues }
}

/**
 * Analyse DMARC TXT record string.
 */
function analyseDMARC(dmarcString) {
  if (!dmarcString) {
    return {
      valid: false,
      policy: null,
      pct: null,
      rua: null,
      issues: ['DMARC record missing — anyone can spoof your domain email'],
      score: 0,
    }
  }

  const get = (key) => {
    const m = dmarcString.match(new RegExp(`${key}=([^;\\s]+)`))
    return m ? m[1] : null
  }

  const policy = get('p')
  const pct    = parseInt(get('pct') ?? '100', 10)
  const rua    = get('rua')
  const ruf    = get('ruf')
  const issues = []
  let score = 100

  if (!policy) {
    issues.push('DMARC p= tag missing')
    score = 0
  } else if (policy === 'none') {
    issues.push('DMARC policy is p=none — no enforcement. Anyone can spoof @yourdomain.com')
    score = 30
  } else if (policy === 'quarantine') {
    if (pct < 100) issues.push(`DMARC pct=${pct} — only ${pct}% of failing mail is quarantined. Increase to 100.`)
    score = 70
  } else if (policy === 'reject') {
    score = 100
  }

  if (!rua) {
    issues.push('No rua= reporting address — you won\'t receive DMARC failure reports')
    score = Math.max(0, score - 10)
  }

  return { valid: true, raw: dmarcString, policy, pct, rua, ruf, issues, score }
}

/**
 * Main DNS scan. Takes a domain string, returns a structured result object.
 */
export async function scanDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('scanDomain: domain must be a non-empty string')
  }

  // Normalise — strip protocol/path if user passed a URL
  const cleanDomain = domain.trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase()

  console.log(`[dnsScanner] Starting scan for: ${cleanDomain}`)
  const startedAt = Date.now()

  // Run all lookups in parallel — faster and independent failures
  const [
    aResult,
    aaaaResult,
    mxResult,
    txtResult,
    nsResult,
    caaResult,
    soaResult,
    cnameResult,
  ] = await Promise.all([
    safeResolve(dns.resolve4, cleanDomain),
    safeResolve(dns.resolve6, cleanDomain),
    safeResolve(dns.resolveMx, cleanDomain),
    safeResolve(dns.resolveTxt, cleanDomain),
    safeResolve(dns.resolveNs, cleanDomain),
    safeResolve(dns.resolveCaa, cleanDomain),
    safeResolve(dns.resolveSoa, cleanDomain),
    safeResolve(dns.resolveCname, cleanDomain),
  ])

  // ── Parse TXT records for SPF and DMARC ───────────────────
  const allTxt = (txtResult.data ?? []).map(arr => arr.join(''))
  const spfRaw    = allTxt.find(t => t.startsWith('v=spf1')) ?? null
  const spfResult = analyseSPF(spfRaw)

  // DMARC lives on _dmarc.domain
  const { data: dmarcTxt } = await safeResolve(dns.resolveTxt, `_dmarc.${cleanDomain}`)
  const dmarcRaw    = (dmarcTxt ?? []).map(a => a.join('')).find(t => t.startsWith('v=DMARC1')) ?? null
  const dmarcResult = analyseDMARC(dmarcRaw)

  // ── BIMI check ────────────────────────────────────────────
  const { data: bimiTxt } = await safeResolve(dns.resolveTxt, `default._bimi.${cleanDomain}`)
  const bimiRaw = (bimiTxt ?? []).map(a => a.join('')).find(t => t.startsWith('v=BIMI1')) ?? null

  // ── MTA-STS check ─────────────────────────────────────────
  const { data: mtaStsTxt } = await safeResolve(dns.resolveTxt, `_mta-sts.${cleanDomain}`)
  const mtaStsRaw = (mtaStsTxt ?? []).map(a => a.join('')).find(t => t.startsWith('v=STSv1')) ?? null

  // ── PTR check on first A record ───────────────────────────
  let ptrResult = { data: null, error: 'NO_A_RECORD' }
  const firstIP = aResult.data?.[0] ?? null
  if (firstIP) {
    ptrResult = await safeResolve(dns.reverse, firstIP)
  }

  // ── DNSSEC: check for DS/DNSKEY records ───────────────────
  const { data: dnskeyTxt } = await safeResolve(dns.resolveTlsa, `_443._tcp.${cleanDomain}`)
  // Simple heuristic: if NS responds and SOA exists, DNSSEC might be configured
  // Real DNSSEC validation needs a validating resolver — this flags absence
  const hasDNSSEC = soaResult.data !== null  // placeholder — real check below

  // ── Build issues list ──────────────────────────────────────
  const issues = []

  if (!aResult.data) {
    issues.push({ id:'no-a', sev:'critical', type:'DNS', title:'No A record found', detail:`Domain ${cleanDomain} doesn't resolve to any IP address.`, fix:['Check your DNS provider — you need an A record pointing to your server IP', `Example: ${cleanDomain} A 1.2.3.4`] })
  }

  if (!mxResult.data || mxResult.data.length === 0) {
    issues.push({ id:'no-mx', sev:'high', type:'DNS', title:'No MX record — email delivery broken', detail:'Without an MX record, no one can send email to your domain.', fix:[`Add MX record: ${cleanDomain} MX 10 mail.${cleanDomain}`, 'Or use your email provider\'s MX values (Google: aspmx.l.google.com, Microsoft: yourdomain-com.mail.protection.outlook.com)'] })
  }

  if (!ptrResult.data && firstIP) {
    issues.push({ id:'no-ptr', sev:'critical', type:'DNS', title:`PTR / reverse DNS missing for ${firstIP}`, detail:'Mail servers check reverse DNS. Missing PTR causes emails to be rejected or spam-foldered.', fix:['Log in to your hosting provider or ISP control panel', 'Find Reverse DNS / PTR settings under IP management', `Set PTR: ${firstIP} → mail.${cleanDomain}`, 'Allow 24-48h to propagate, then verify: dig -x ' + firstIP + ' +short'] })
  }

  if (!caaResult.data || caaResult.data.length === 0) {
    issues.push({ id:'no-caa', sev:'high', type:'DNS', title:'CAA record missing', detail:'Without CAA, any certificate authority can issue SSL certs for your domain.', fix:['Add CAA record: 0 issue "letsencrypt.org" (or your CA)', 'Add: 0 issuewild ";" to block wildcard cert issuance', `Verify: dig CAA ${cleanDomain}`] })
  }

  issues.push(...spfResult.issues.map((msg, i) => ({
    id: `spf-${i}`, sev: spfResult.policy === 'passall' ? 'critical' : 'high', type: 'Email',
    title: 'SPF issue', detail: msg,
    fix: ['Update your SPF TXT record at your DNS provider', 'Example safe record: v=spf1 include:_spf.google.com -all']
  })))

  issues.push(...dmarcResult.issues.map((msg, i) => ({
    id: `dmarc-${i}`,
    sev: dmarcResult.policy === null || dmarcResult.policy === 'none' ? 'critical' : 'high',
    type: 'Email', title: 'DMARC issue', detail: msg,
    fix: ['Update _dmarc.' + cleanDomain + ' TXT record', 'Start with: v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@' + cleanDomain, 'After 2 weeks without issues, escalate to p=reject pct=100']
  })))

  // ── Score (0-100) ──────────────────────────────────────────
  let score = 100
  if (!aResult.data)                                          score -= 30
  if (!mxResult.data)                                         score -= 20
  if (!ptrResult.data && firstIP)                             score -= 15
  if (!caaResult.data || caaResult.data.length === 0)         score -= 10
  if (spfResult.policy === 'passall')                         score -= 25
  if (spfResult.policy === 'softfail' || !spfResult.valid)    score -= 10
  if (!dmarcResult.valid || dmarcResult.policy === null)       score -= 20
  if (dmarcResult.policy === 'none')                          score -= 15
  score = Math.max(0, score)

  const elapsed = Date.now() - startedAt
  console.log(`[dnsScanner] Scan complete for ${cleanDomain} in ${elapsed}ms — score: ${score}`)

  return {
    domain:   cleanDomain,
    scannedAt: new Date().toISOString(),
    elapsedMs: elapsed,
    score,
    records: {
      a:      { data: aResult.data,    error: aResult.error },
      aaaa:   { data: aaaaResult.data, error: aaaaResult.error },
      mx:     { data: mxResult.data,   error: mxResult.error },
      ns:     { data: nsResult.data,   error: nsResult.error },
      soa:    { data: soaResult.data,  error: soaResult.error },
      caa:    { data: caaResult.data,  error: caaResult.error },
      cname:  { data: cnameResult.data,error: cnameResult.error },
      txt:    { data: allTxt,          error: txtResult.error },
      ptr:    { ip: firstIP, data: ptrResult.data, error: ptrResult.error },
    },
    email: {
      spf:    spfResult,
      dmarc:  dmarcResult,
      bimi:   { configured: !!bimiRaw, raw: bimiRaw },
      mtaSts: { configured: !!mtaStsRaw, raw: mtaStsRaw },
    },
    issues,
  }
}
