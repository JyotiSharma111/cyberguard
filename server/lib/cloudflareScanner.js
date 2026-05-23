/**
 * Cloudflare Security Scanner
 * Free with any Cloudflare account (including free tier).
 * Uses Cloudflare API — requires API Token with Zone:Read permission.
 */

const CF_BASE    = 'https://api.cloudflare.com/client/v4'
const TIMEOUT_MS = 12000

async function cfGet(path, token) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${CF_BASE}${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'CyberGuard-Scanner/1.0' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { error: `Cloudflare API ${res.status}`, data: null }
    const json = await res.json()
    if (!json.success) return { error: json.errors?.[0]?.message ?? 'API error', data: null }
    return { data: json.result, error: null }
  } catch (err) {
    clearTimeout(timer)
    return { error: err.name === 'AbortError' ? 'TIMEOUT' : err.message, data: null }
  }
}

export async function scanCloudflare({ apiToken, zoneId, domain }) {
  if (!apiToken) return { ok: false, skipped: true, reason: 'Cloudflare API token not configured' }

  console.log(`[cloudflareScanner] Scanning zone ${zoneId ?? domain}...`)
  const startedAt = Date.now()
  const issues    = []
  const findings  = {}

  // Find zone if not provided
  let zone = zoneId
  if (!zone && domain) {
    const zonesR = await cfGet(`/zones?name=${domain}`, apiToken)
    zone = zonesR.data?.[0]?.id
    if (!zone) return { ok: false, error: `Zone not found for domain ${domain} — check your API token has access to this zone` }
  }

  // 1. Zone settings — SSL mode
  const sslR = await cfGet(`/zones/${zone}/settings/ssl`, apiToken)
  findings.sslMode = sslR.data?.value
  if (sslR.data?.value === 'off') {
    issues.push({
      id: 'cf-ssl-off', type: 'Cloudflare', sev: 'critical',
      title: 'Cloudflare SSL is disabled',
      detail: 'Traffic between visitors and Cloudflare is unencrypted.',
      fix: ['Cloudflare Dashboard → SSL/TLS → Overview → Select "Full (strict)"']
    })
  } else if (sslR.data?.value === 'flexible') {
    issues.push({
      id: 'cf-ssl-flexible', type: 'Cloudflare', sev: 'high',
      title: 'Cloudflare SSL set to Flexible — traffic to your server is unencrypted',
      detail: 'Flexible SSL encrypts visitor→Cloudflare but NOT Cloudflare→your server. Your server data is sent in plaintext.',
      fix: ['Cloudflare Dashboard → SSL/TLS → Overview → Change to "Full (strict)"', 'Ensure your origin server has a valid SSL certificate first']
    })
  }

  // 2. Always use HTTPS
  const httpsR = await cfGet(`/zones/${zone}/settings/always_use_https`, apiToken)
  findings.alwaysHttps = httpsR.data?.value === 'on'
  if (httpsR.data?.value !== 'on') {
    issues.push({
      id: 'cf-no-always-https', type: 'Cloudflare', sev: 'medium',
      title: 'Always Use HTTPS is disabled',
      detail: 'HTTP requests are not automatically redirected to HTTPS.',
      fix: ['Cloudflare Dashboard → SSL/TLS → Edge Certificates → Always Use HTTPS → On']
    })
  }

  // 3. HSTS
  const hstsR = await cfGet(`/zones/${zone}/settings/security_header`, apiToken)
  findings.hsts = hstsR.data?.value?.strict_transport_security?.enabled
  if (!findings.hsts) {
    issues.push({
      id: 'cf-no-hsts', type: 'Cloudflare', sev: 'medium',
      title: 'HSTS not configured through Cloudflare',
      detail: 'HTTP Strict Transport Security forces browsers to always use HTTPS.',
      fix: ['Cloudflare Dashboard → SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS) → Enable']
    })
  }

  // 4. WAF — security level
  const secLevelR = await cfGet(`/zones/${zone}/settings/security_level`, apiToken)
  findings.securityLevel = secLevelR.data?.value
  if (secLevelR.data?.value === 'off' || secLevelR.data?.value === 'essentially_off') {
    issues.push({
      id: 'cf-waf-off', type: 'Cloudflare', sev: 'high',
      title: `Cloudflare WAF security level is "${secLevelR.data?.value}"`,
      detail: 'Your WAF protection is effectively disabled. Common attacks and bots are not being blocked.',
      fix: ['Cloudflare Dashboard → Security → Settings → Security Level → Set to "Medium" or "High"']
    })
  }

  // 5. Bot protection
  const botR = await cfGet(`/zones/${zone}/settings/bot_management`, apiToken)
  findings.botProtection = botR.data?.enable_js

  // 6. Min TLS version
  const tlsR = await cfGet(`/zones/${zone}/settings/min_tls_version`, apiToken)
  findings.minTls = tlsR.data?.value
  if (tlsR.data?.value === '1.0' || tlsR.data?.value === '1.1') {
    issues.push({
      id: 'cf-old-tls', type: 'Cloudflare', sev: 'medium',
      title: `Minimum TLS version set to ${tlsR.data?.value} — outdated`,
      detail: 'TLS 1.0 and 1.1 have known vulnerabilities. Minimum should be TLS 1.2.',
      fix: ['Cloudflare Dashboard → SSL/TLS → Edge Certificates → Minimum TLS Version → TLS 1.2']
    })
  }

  // 7. Zone overview
  const zoneR = await cfGet(`/zones/${zone}`, apiToken)
  if (zoneR.data) {
    findings.zoneName = zoneR.data.name
    findings.plan     = zoneR.data.plan?.name
  }

  const critCount = issues.filter(i => i.sev === 'critical').length
  const highCount  = issues.filter(i => i.sev === 'high').length
  const score = Math.max(0, 100 - (critCount * 25) - (highCount * 15) - (issues.filter(i=>i.sev==='medium').length * 5))
  const elapsed = Date.now() - startedAt

  console.log(`[cloudflareScanner] Done in ${elapsed}ms — ${issues.length} issues, score: ${score}`)
  return { ok: true, score, issues, findings, elapsedMs: elapsed, scannedAt: new Date().toISOString() }
}
