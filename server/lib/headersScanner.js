/**
 * HTTP Security Headers Scanner
 * Fetches the domain and inspects response headers.
 * No API key needed — pure HTTP fetch.
 *
 * Checks: HSTS, CSP, X-Frame-Options, X-Content-Type-Options,
 *         Referrer-Policy, Permissions-Policy, X-XSS-Protection
 */

const TIMEOUT_MS = 10000

async function safeFetch(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'CyberGuard-Scanner/1.0' }
    })
    clearTimeout(timer)
    return { ok: true, headers: Object.fromEntries(res.headers.entries()), status: res.status, finalUrl: res.url }
  } catch (err) {
    clearTimeout(timer)
    return { ok: false, error: err.name === 'AbortError' ? 'TIMEOUT' : err.message }
  }
}

const HEADER_CHECKS = [
  {
    name:        'Strict-Transport-Security',
    key:         'strict-transport-security',
    sev:         'high',
    title:       'HSTS not configured',
    detail:      'Without HTTP Strict Transport Security, browsers may connect over plain HTTP. Attackers can intercept traffic.',
    goodDetail:  'HSTS forces all connections to use HTTPS.',
    fix: [
      'In nginx: add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
      'In Apache: Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
      'Restart your web server after adding',
    ],
    validate: (val) => {
      if (!val) return { ok: false }
      const maxAge = parseInt(val.match(/max-age=(\d+)/)?.[1] ?? '0', 10)
      if (maxAge < 31536000) return { ok: false, warn: `max-age=${maxAge} is less than 1 year (31536000)` }
      return { ok: true }
    }
  },
  {
    name:        'Content-Security-Policy',
    key:         'content-security-policy',
    sev:         'high',
    title:       'Content-Security-Policy (CSP) not set',
    detail:      'Without CSP, attackers can inject malicious scripts into your pages (XSS attacks). One of the most important security headers.',
    goodDetail:  'CSP restricts which scripts, styles and resources can load on your pages.',
    fix: [
      'Start with report-only mode: Content-Security-Policy-Report-Only: default-src \'self\'',
      'Monitor violations, then enforce: Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'',
      'Use a CSP evaluator at csp-evaluator.withgoogle.com to refine your policy',
    ],
    validate: (val) => val ? { ok: true } : { ok: false }
  },
  {
    name:        'X-Frame-Options',
    key:         'x-frame-options',
    sev:         'medium',
    title:       'X-Frame-Options not set — clickjacking possible',
    detail:      'Without this header, attackers can embed your website in an invisible iframe and trick users into clicking things (clickjacking).',
    goodDetail:  'Prevents your site from being embedded in iframes on other domains.',
    fix: [
      'Add header: X-Frame-Options: SAMEORIGIN',
      'Or use CSP: frame-ancestors \'self\' (more modern approach)',
    ],
    validate: (val) => val ? { ok: true } : { ok: false }
  },
  {
    name:        'X-Content-Type-Options',
    key:         'x-content-type-options',
    sev:         'medium',
    title:       'X-Content-Type-Options not set',
    detail:      'Without this header, browsers may "sniff" content types and execute files as a different type than intended, enabling attacks.',
    goodDetail:  'Prevents browsers from MIME-sniffing responses.',
    fix: [
      'Add header: X-Content-Type-Options: nosniff',
      'This is a one-line fix in any web server',
    ],
    validate: (val) => val?.toLowerCase() === 'nosniff' ? { ok: true } : { ok: false }
  },
  {
    name:        'Referrer-Policy',
    key:         'referrer-policy',
    sev:         'low',
    title:       'Referrer-Policy not set',
    detail:      'Without this header, your full URL (including paths and query strings) is sent to external sites when users click links.',
    goodDetail:  'Controls how much referrer information is shared with external sites.',
    fix: [
      'Add header: Referrer-Policy: strict-origin-when-cross-origin',
      'Or for maximum privacy: Referrer-Policy: no-referrer',
    ],
    validate: (val) => val ? { ok: true } : { ok: false }
  },
  {
    name:        'Permissions-Policy',
    key:         'permissions-policy',
    sev:         'low',
    title:       'Permissions-Policy not set',
    detail:      'Without this header, any script on your page can access the camera, microphone, geolocation, and other browser APIs.',
    goodDetail:  'Restricts which browser features scripts can access.',
    fix: [
      'Add header: Permissions-Policy: camera=(), microphone=(), geolocation=()',
      'Add features you actually need, disable everything else',
    ],
    validate: (val) => val ? { ok: true } : { ok: false }
  },
]

export async function scanHeaders(domain) {
  if (!domain) throw new Error('scanHeaders: domain required')
  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
  console.log(`[headersScanner] Scanning https://${clean}`)

  const result = await safeFetch(`https://${clean}`)
  if (!result.ok) {
    // Try www subdomain if root fails
    const wwwResult = await safeFetch(`https://www.${clean}`)
    if (!wwwResult.ok) {
      return {
        domain: clean, scannedAt: new Date().toISOString(),
        score: 0, issues: [],
        error: `Could not fetch ${clean}: ${result.error}`,
        headers: {}
      }
    }
    Object.assign(result, wwwResult)
  }

  const headers = result.headers ?? {}
  const issues  = []
  let score     = 100

  for (const check of HEADER_CHECKS) {
    const val       = headers[check.key]
    const validated = check.validate(val)

    if (!validated.ok) {
      const deduction = check.sev === 'high' ? 20 : check.sev === 'medium' ? 10 : 5
      score -= deduction
      issues.push({
        id:     `header-${check.key}`,
        type:   'Headers',
        sev:    check.sev,
        title:  check.title,
        detail: validated.warn
          ? `${check.detail} (Current value: ${val} — ${validated.warn})`
          : check.detail,
        fix:    check.fix,
      })
    }
  }

  // Server information disclosure
  const serverHeader = headers['server']
  if (serverHeader && /\d/.test(serverHeader)) {
    issues.push({
      id:     'header-server-disclosure',
      type:   'Headers',
      sev:    'medium',
      title:  `Server version disclosed: ${serverHeader}`,
      detail: 'Revealing your web server software and version helps attackers find known vulnerabilities.',
      fix:    [
        'In nginx: server_tokens off; in the http block of nginx.conf',
        'In Apache: ServerTokens Prod and ServerSignature Off in httpd.conf',
      ]
    })
    score -= 10
  }

  score = Math.max(0, score)
  console.log(`[headersScanner] Done — score: ${score}, ${issues.length} issues`)

  return {
    domain:    clean,
    scannedAt: new Date().toISOString(),
    score,
    issues,
    headers:   {
      hsts:        headers['strict-transport-security'] ?? null,
      csp:         headers['content-security-policy'] ?? null,
      xframe:      headers['x-frame-options'] ?? null,
      xcontent:    headers['x-content-type-options'] ?? null,
      referrer:    headers['referrer-policy'] ?? null,
      permissions: headers['permissions-policy'] ?? null,
      server:      headers['server'] ?? null,
    }
  }
}
