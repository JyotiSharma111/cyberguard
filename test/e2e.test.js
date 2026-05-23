/**
 * CyberGuard End-to-End Test Suite
 * Tests every API endpoint and core scanner function.
 *
 * Usage:
 *   node test/e2e.test.js                        — full test (needs server running)
 *   node test/e2e.test.js --fast                 — skip slow external scans
 *   node test/e2e.test.js --domain yourdomain.com — test against your real domain
 *
 * Prerequisites:
 *   npm run server   (must be running on port 3001)
 */
import './load-env.js'

const BASE_URL    = process.env.API_URL ?? 'http://localhost:3001'
const domainArg  = process.argv.find(a => a.startsWith('--domain='))?.split('=')[1]
                ?? process.argv[process.argv.findIndex(a => a === '--domain') + 1]
const TEST_DOMAIN = domainArg ?? 'example.com'
const FAST_MODE   = process.argv.includes('--fast')

const c = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
}

const results = { pass:0, fail:0, skip:0, errors:[] }
let   currentSection = ''

async function test(name, fn, { skip = false } = {}) {
  if (skip) {
    console.log(`  ${c.yellow('SKIP')} ${c.dim(name)}`)
    results.skip++
    return
  }
  try {
    await fn()
    console.log(`  ${c.green('PASS')} ${name}`)
    results.pass++
  } catch (err) {
    console.log(`  ${c.red('FAIL')} ${name}`)
    console.log(`       ${c.red(err.message)}`)
    results.fail++
    results.errors.push({ section: currentSection, name, error: err.message })
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message ?? 'Assertion failed')
}

function assertEqual(actual, expected, label = '') {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

async function api(path, options = {}) {
  const timeout    = options.timeout ?? 30000
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  options.method ?? 'GET',
      signal:  controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      body:    options.body ? JSON.stringify(options.body) : undefined,
    })
    clearTimeout(timer)
    const json = await res.json()
    return { status: res.status, ...json }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error(`Timeout after ${timeout}ms — is "npm run server" running?`)
    if (err.code === 'ECONNREFUSED') throw new Error(`Connection refused — run "npm run server" first`)
    throw err
  }
}

function section(name) {
  currentSection = name
  console.log(`\n${c.bold(c.cyan('▶ ' + name))}`)
}

// ═══════════════════════════════════════════════════════════════
console.log(c.bold('\nCyberGuard E2E Test Suite'))
console.log(c.dim(`Target: ${BASE_URL} · Domain: ${TEST_DOMAIN} · Mode: ${FAST_MODE ? 'fast' : 'full'}\n`))
// ═══════════════════════════════════════════════════════════════

section('Server health')

await test('API server is running', async () => {
  const r = await api('/api/health', { timeout: 5000 })
  assert(r.ok, 'Health check returned ok:false')
  assert(r.service, 'Missing service field')
  console.log(`       ${c.dim(`${r.service} v${r.version ?? '?'}`)}`)
})

await test('Environment variables loaded', async () => {
  const r = await api('/api/health')
  const env = r.env ?? r.features ?? {}
  const resendOk = Object.values(env).some(v => String(v).includes('Resend') || String(v).includes('configured'))
  console.log(`       ${c.dim(JSON.stringify(env))}`)
})

// ─────────────────────────────────────────────────────────────
section('DNS Scanner')

await test('DNS scan returns score and records', async () => {
  const r = await api(`/api/dns/${TEST_DOMAIN}`, { timeout: 15000 })
  assert(r.ok,                         `DNS scan failed: ${r.error}`)
  assert(typeof r.data?.score === 'number', 'Missing score')
  assert(Array.isArray(r.data?.issues), 'Missing issues array')
  console.log(`       ${c.dim(`Score: ${r.data.score} · ${r.data.issues.length} issues`)}`)
}, { skip: FAST_MODE })

await test('DNS handles invalid domain without 500', async () => {
  const r = await api('/api/dns/not-a-real-domain-xyz-abc-123.invalid', { timeout: 10000 })
  assert(r.status !== 500, `Server crashed on invalid domain`)
})

// ─────────────────────────────────────────────────────────────
section('SSL Scanner')

await test('SSL scan returns certificate details', async () => {
  const r = await api(`/api/ssl/${TEST_DOMAIN}`, { timeout: 15000 })
  assert(r.ok, `SSL scan failed: ${r.error}`)
  assert(typeof r.data?.score === 'number', 'Missing score')
  const days = r.data?.cert?.daysLeft ?? r.data?.raw_ssl?.cert?.daysLeft
  if (days !== undefined) console.log(`       ${c.dim(`Score: ${r.data.score} · Cert expires in ${days} days`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('HTTP Headers Scanner')

await test('Headers scan returns security findings', async () => {
  const r = await api(`/api/headers/${TEST_DOMAIN}`, { timeout: 15000 })
  assert(r.ok, `Headers scan failed: ${r.error}`)
  assert(typeof r.data?.score === 'number',  'Missing score')
  assert(r.data?.headers !== undefined,      'Missing headers object')
  assert(Array.isArray(r.data?.issues),      'Missing issues array')
  const missing = Object.entries(r.data.headers).filter(([,v]) => !v).map(([k]) => k)
  console.log(`       ${c.dim(`Score: ${r.data.score} · Missing headers: ${missing.join(', ') || 'none'}`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('DKIM Scanner')

await test('DKIM scanner checks 20+ selectors', async () => {
  const r = await api(`/api/dkim/${TEST_DOMAIN}`, { timeout: 25000 })
  assert(r.ok, `DKIM scan failed: ${r.error}`)
  assert(typeof r.data?.missing === 'boolean',      'Missing "missing" boolean')
  assert(r.data?.selectorsChecked >= 20,            `Only checked ${r.data?.selectorsChecked} selectors`)
  console.log(`       ${c.dim(`Checked ${r.data.selectorsChecked} selectors · Found: ${r.data.found?.length ?? 0} · Missing: ${r.data.missing}`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('WHOIS Scanner')

await test('WHOIS returns domain registration info', async () => {
  const r = await api(`/api/whois/${TEST_DOMAIN}`, { timeout: 15000 })
  assert(r.ok, `WHOIS failed: ${r.error}`)
  assert(typeof r.data?.score === 'number', 'Missing score')
  if (r.data?.info?.daysToExpiry) console.log(`       ${c.dim(`Expires in ${r.data.info.daysToExpiry} days · Registrar: ${r.data.info.registrar}`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('Shodan Port Scanner')

await test('Shodan scan returns ports and CVEs', async () => {
  const r = await api(`/api/vuln/${TEST_DOMAIN}`, { timeout: 25000 })
  assert(r.ok, `Shodan failed: ${r.error}`)
  assert(typeof r.data?.score === 'number', 'Missing score')
  assert(Array.isArray(r.data?.ports),      'Missing ports array')
  assert(Array.isArray(r.data?.vulns),      'Missing vulns array')
  console.log(`       ${c.dim(`IPs: ${r.data.ips?.join(', ')} · Ports: ${r.data.ports?.length} · CVEs: ${r.data.vulns?.length}`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('Subdomain Scanner')

await test('Subdomain scanner queries certificate transparency', async () => {
  const r = await api(`/api/subdomains/${TEST_DOMAIN}`, { timeout: 30000 })
  assert(r.ok, `Subdomain scan failed: ${r.error}`)
  assert(typeof r.data?.total === 'number',     'Missing total')
  assert(Array.isArray(r.data?.subdomains),     'Missing subdomains array')
  console.log(`       ${c.dim(`Found ${r.data.total} subdomains`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('Credential Scanner')

await test('Credential scanner returns breach status', async () => {
  const r = await api(`/api/creds/${TEST_DOMAIN}`, { timeout: 15000 })
  assert(r.ok, `Creds scan failed: ${r.error}`)
  assert(typeof r.data?.score === 'number', 'Missing score')
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('Pentest Scanner')

await test('Pentest scans for exposed paths and methods', async () => {
  const r = await api(`/api/pentest/${TEST_DOMAIN}`, { timeout: 60000 })
  assert(r.ok, `Pentest failed: ${r.error}`)
  assert(typeof r.data?.score === 'number', 'Missing score')
  assert(Array.isArray(r.data?.issues),     'Missing issues array')
  console.log(`       ${c.dim(`Score: ${r.data.score} · ${r.data.issues.length} issues`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('VirusTotal Scanner')

await test('VirusTotal scan runs or skips gracefully', async () => {
  const r = await api(`/api/threats/${TEST_DOMAIN}`, { timeout: 20000 })
  assert(r.ok, `VT API error: ${r.error}`)
  if (r.data?.skipped) {
    console.log(`       ${c.yellow('→')} ${c.dim('No VT key — add VIRUSTOTAL_API_KEY to .env.local (free at virustotal.com)')}`)
  } else {
    assert(typeof r.data?.score === 'number', 'Missing VT score')
    console.log(`       ${c.dim(`Score: ${r.data.score} · Malicious: ${r.data.stats?.malicious ?? 0} · Suspicious: ${r.data.stats?.suspicious ?? 0}`)}`)
  }
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('Vendor Scanner')

await test('Vendor scan returns grade A-F', async () => {
  const r = await api(`/api/vendor/${TEST_DOMAIN}`, { timeout: 45000 })
  assert(r.ok, `Vendor scan failed: ${r.error}`)
  assert(typeof r.data?.score === 'number', 'Missing score')
  assert(r.data?.grade, 'Missing grade')
  assert(/^[A-F][+-]?$/.test(r.data.grade), `Invalid grade format: ${r.data.grade}`)
  console.log(`       ${c.dim(`Grade: ${r.data.grade} · Score: ${r.data.score}`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('Full Scan (all 9 scanners)')

await test('Full scan completes and returns all scores', async () => {
  const r = await api(`/api/scan/${TEST_DOMAIN}`, { timeout: 120000 })
  assert(r.ok, `Full scan failed: ${r.error}`)
  const d = r.data
  assert(typeof d?.overallScore === 'number',  'Missing overallScore')
  const requiredScores = ['dns', 'ssl', 'headers', 'dkim', 'whois', 'threats', 'pentest']
  for (const key of requiredScores) {
    assert(d?.scores?.[key] !== undefined, `Missing ${key} score in scores object`)
  }
  assert(Array.isArray(d?.issues), 'Missing issues array')
  console.log(`       ${c.dim(`Overall: ${d.overallScore}/100 · ${d.issues?.length} issues · ${d.elapsedMs}ms`)}`)
  console.log(`       ${c.dim(`Scores → DNS:${d.scores.dns} SSL:${d.scores.ssl} Headers:${d.scores.headers} DKIM:${d.scores.dkim} WHOIS:${d.scores.whois}`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('Alert Engine Logic')

await test('No alerts when nothing changed', async () => {
  const { detectChanges } = await import('../server/lib/alertEngine.js')
  const scan = { score:80, issues:[], raw_ssl:{ cert:{ daysLeft:100 } }, raw_dns:{ email:{ dmarc:{ policy:'reject' } } } }
  const r    = detectChanges(scan, scan)
  assertEqual(r.length, 0, 'Expected 0 alerts on identical scans')
})

await test('Detects score drop > 10 points', async () => {
  const { detectChanges } = await import('../server/lib/alertEngine.js')
  const r = detectChanges(
    { score:50, issues:[], raw_ssl:{}, raw_dns:{} },
    { score:85, issues:[], raw_ssl:{}, raw_dns:{} }
  )
  assert(r.some(a => a.type === 'score_drop'), 'Expected score_drop alert for 35pt drop')
})

await test('Does NOT alert on score drop < 10 points', async () => {
  const { detectChanges } = await import('../server/lib/alertEngine.js')
  const r = detectChanges(
    { score:78, issues:[], raw_ssl:{}, raw_dns:{} },
    { score:82, issues:[], raw_ssl:{}, raw_dns:{} }
  )
  assert(!r.some(a => a.type === 'score_drop'), 'Should NOT alert on 4pt score drop')
})

await test('Detects new critical issue', async () => {
  const { detectChanges } = await import('../server/lib/alertEngine.js')
  const r = detectChanges(
    { score:70, issues:[{ sev:'critical', id:'c1' }], raw_ssl:{}, raw_dns:{} },
    { score:70, issues:[],                            raw_ssl:{}, raw_dns:{} }
  )
  assert(r.some(a => a.type === 'new_critical'), 'Expected new_critical alert')
})

await test('Detects cert expiry < 30 days', async () => {
  const { detectChanges } = await import('../server/lib/alertEngine.js')
  const r = detectChanges(
    { score:80, issues:[], raw_ssl:{ cert:{ daysLeft:14, validTo: new Date(Date.now() + 14*86400000).toISOString() } }, raw_dns:{} },
    null
  )
  assert(r.some(a => a.type === 'cert_expiry'), 'Expected cert_expiry alert for 14-day cert')
})

await test('Does NOT alert on cert with 60+ days left', async () => {
  const { detectChanges } = await import('../server/lib/alertEngine.js')
  const r = detectChanges(
    { score:90, issues:[], raw_ssl:{ cert:{ daysLeft:90, validTo: new Date(Date.now() + 90*86400000).toISOString() } }, raw_dns:{} },
    null
  )
  assert(!r.some(a => a.type === 'cert_expiry'), 'Should NOT alert on cert with 90 days left')
})

// ─────────────────────────────────────────────────────────────
section('Alert API')

await test('Alert trigger API accepts valid payload', async () => {
  const r = await api('/api/alerts/trigger', {
    method: 'POST',
    body: {
      domain: TEST_DOMAIN,
      currentScan:  { domain: TEST_DOMAIN, score:80, issues:[], raw_ssl:{}, raw_dns:{} },
      previousScan: { domain: TEST_DOMAIN, score:80, issues:[], raw_ssl:{}, raw_dns:{} },
      recipients:   [],
      settings:     { alert_score_drop:true, alert_new_critical:true },
    }
  })
  assert(r.ok, `Alert trigger failed: ${r.error}`)
  assert(typeof r.triggered === 'number', 'Missing triggered count')
  assert(typeof r.sent      === 'number', 'Missing sent count')
})

await test('Alert test endpoint responds correctly', async () => {
  const r = await api('/api/alerts/test', {
    method: 'POST',
    body: { email: 'test@example.com', domain: TEST_DOMAIN }
  })
  assert(r.ok !== undefined, 'No response from test alert endpoint')
  if (r.sent) {
    console.log(`       ${c.dim('Test alert sent successfully via Resend')}`)
  } else {
    console.log(`       ${c.yellow('→')} ${c.dim(`Alert not sent: ${r.reason ?? r.error}`)}`)
  }
})

// ─────────────────────────────────────────────────────────────
section('Document Generator')

await test('IRP generator produces valid document', async () => {
  const r = await api('/api/documents/irp', {
    method: 'POST',
    body: { orgName:'Acme Ltd', domain:TEST_DOMAIN, contactName:'Jane Smith', contactEmail:'jane@acme.com' }
  })
  assert(r.ok, `IRP failed: ${r.error}`)
  assert(r.html?.includes('Incident Response Plan'), 'Missing IRP title in output')
  assert(r.html?.includes('Acme Ltd'),               'Missing org name in IRP')
  assert(r.html?.includes('Ransomware'),             'Missing ransomware section in IRP')
  assert(r.html?.length > 5000,                      `IRP too short: ${r.html?.length} chars`)
  console.log(`       ${c.dim(`Generated ${Math.round(r.html.length / 1000)}KB IRP`)}`)
})

await test('AUP generator produces valid document', async () => {
  const r = await api('/api/documents/aup', {
    method: 'POST',
    body: { orgName:'Acme Ltd', domain:TEST_DOMAIN, contactName:'Jane Smith', contactEmail:'jane@acme.com' }
  })
  assert(r.ok, `AUP failed: ${r.error}`)
  assert(r.html?.includes('Acceptable Use Policy'), 'Missing AUP title in output')
  assert(r.html?.includes('Acme Ltd'),              'Missing org name in AUP')
  assert(r.html?.includes('Password'),              'Missing password section in AUP')
  assert(r.html?.length > 3000,                     `AUP too short: ${r.html?.length} chars`)
  console.log(`       ${c.dim(`Generated ${Math.round(r.html.length / 1000)}KB AUP`)}`)
})

// ─────────────────────────────────────────────────────────────
section('Phishing Simulation')

await test('Templates endpoint returns 4+ templates', async () => {
  const r = await api('/api/phishing/templates')
  assert(r.ok,                         `Templates failed: ${r.error}`)
  assert(Array.isArray(r.data),        'Expected array')
  assert(r.data.length >= 4,           `Expected 4+ templates, got ${r.data.length}`)
  for (const t of r.data) {
    assert(t.id,         `Template missing id`)
    assert(t.name,       `Template ${t.id} missing name`)
    assert(t.subject,    `Template ${t.id} missing subject`)
    assert(t.difficulty, `Template ${t.id} missing difficulty`)
    assert(['easy','medium','hard'].includes(t.difficulty), `Invalid difficulty: ${t.difficulty}`)
  }
  console.log(`       ${c.dim(r.data.map(t=>`${t.name} (${t.difficulty})`).join(' · '))}`)
})

// ─────────────────────────────────────────────────────────────
section('Threat Feed')

await test('Threat feed fetches from public sources', async () => {
  const r = await api('/api/threatfeed', { timeout: 25000 })
  assert(r.ok,                         `Threat feed failed: ${r.error}`)
  assert(Array.isArray(r.data?.items), 'Missing items array')
  assert(r.data?.fetchedAt,            'Missing fetchedAt timestamp')
  assert(r.data?.sources,              'Missing sources breakdown')
  console.log(`       ${c.dim(`${r.data.items.length} items · CISA:${r.data.sources.cisa} OTX:${r.data.sources.otx} NCSC:${r.data.sources.ncsc}`)}`)
}, { skip: FAST_MODE })

// ─────────────────────────────────────────────────────────────
section('Integration credential validation')

await test('M365 returns skipped for empty credentials', async () => {
  const r = await api('/api/integrations/m365/scan', { method:'POST', body:{} })
  assert(r.data?.skipped === true || r.ok === false, 'Expected skipped or error for empty M365 creds')
})

await test('AWS returns skipped for empty credentials', async () => {
  const r = await api('/api/integrations/aws/scan', { method:'POST', body:{} })
  assert(r.data?.skipped === true || r.ok === false, 'Expected skipped or error for empty AWS creds')
})

await test('GitHub returns skipped for empty token', async () => {
  const r = await api('/api/integrations/github/scan', { method:'POST', body:{} })
  assert(r.data?.skipped === true || r.ok === false, 'Expected skipped or error for empty GitHub token')
})

await test('Cloudflare returns skipped for empty token', async () => {
  const r = await api('/api/integrations/cloudflare/scan', { method:'POST', body:{} })
  assert(r.data?.skipped === true || r.ok === false, 'Expected skipped or error for empty CF token')
})

// ─────────────────────────────────────────────────────────────
section('Error handling')

await test('Unknown route returns 404 JSON', async () => {
  const r = await api('/api/this-route-does-not-exist-xyz')
  assert(r.status === 404,       `Expected 404, got ${r.status}`)
  assert(r.error !== undefined,  'Expected error field in 404 response')
})

await test('Cron endpoint rejects wrong secret', async () => {
  const r = await api('/api/cron/rescan?secret=definitely-wrong-secret-xyz')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    assert(r.status === 401 || r.ok === false, 'Cron should reject wrong secret')
    console.log(`       ${c.dim('Correctly rejected wrong secret')}`)
  } else {
    console.log(`       ${c.yellow('→')} ${c.dim('CRON_SECRET not set — endpoint is open (add to .env.local for production)')}`)
  }
})

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

const total   = results.pass + results.fail + results.skip
const tested  = total - results.skip
const pct     = tested > 0 ? Math.round((results.pass / tested) * 100) : 0

console.log('\n' + '─'.repeat(60))
console.log(c.bold(`\n${c.green(results.pass + ' passed')}  ${results.fail > 0 ? c.red(results.fail + ' failed') : c.dim('0 failed')}  ${c.yellow(results.skip + ' skipped')}  ${c.dim(`(${tested} run)`)}  ${pct}% pass rate`))

if (results.errors.length > 0) {
  console.log(c.bold(c.red('\nFailed tests:')))
  let lastSection = ''
  for (const e of results.errors) {
    if (e.section !== lastSection) {
      console.log(`\n  ${c.cyan(e.section)}`)
      lastSection = e.section
    }
    console.log(`  ${c.red('✗')} ${e.name}`)
    console.log(`    ${c.dim(e.error)}`)
  }
}

if (results.skip > 0 && FAST_MODE) {
  console.log(c.dim(`\nTip: run without --fast to test all ${results.skip + tested} tests including slow external scans`))
}

if (results.fail > 0) {
  console.log(c.red('\n✗ Test suite FAILED'))
  process.exit(1)
} else {
  console.log(c.green('\n✓ All tests passed!'))
}
