/**
 * DKIM Selector Scanner
 * Checks common DKIM selectors via DNS TXT lookups.
 * No API key needed — pure DNS.
 *
 * DKIM records live at: {selector}._domainkey.{domain}
 */
import dns from 'node:dns/promises'

// Common DKIM selectors used by major email providers
const COMMON_SELECTORS = [
  // Google Workspace
  'google', 'google2',
  // Microsoft 365
  'selector1', 'selector2',
  // Generic / common
  'default', 'dkim', 'mail', 'email', 'key1', 'key2', 'k1', 'k2',
  // Mailchimp / Mandrill
  'k1', 'mandrill',
  // SendGrid
  's1', 's2', 'smtp',
  // Mailgun
  'mailo', 'pic',
  // Amazon SES
  'amazonses',
  // Zoho
  'zoho',
]

async function checkSelector(selector, domain) {
  const host = `${selector}._domainkey.${domain}`
  try {
    const records = await dns.resolveTxt(host)
    const flat    = records.map(r => r.join('')).find(r => r.includes('v=DKIM1') || r.includes('p='))
    if (flat) return { selector, found: true, record: flat, host }
    return { selector, found: false }
  } catch {
    return { selector, found: false }
  }
}

export async function scanDKIM(domain) {
  if (!domain) throw new Error('scanDKIM: domain required')
  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
  console.log(`[dkimScanner] Checking ${COMMON_SELECTORS.length} selectors for ${clean}`)

  // Check all selectors in parallel
  const results = await Promise.all(
    COMMON_SELECTORS.map(sel => checkSelector(sel, clean))
  )

  const found   = results.filter(r => r.found)
  const missing = found.length === 0

  const issues = []

  if (missing) {
    issues.push({
      id:     'dkim-missing',
      type:   'Email',
      sev:    'high',
      title:  'DKIM not found on common selectors',
      detail: `Checked ${COMMON_SELECTORS.length} common DKIM selectors — none found. Without DKIM, email authentication is incomplete and emails are more likely to land in spam.`,
      fix: [
        'If you use Google Workspace: Admin Console → Apps → Google Workspace → Gmail → Authenticate email → Generate new record',
        'If you use Microsoft 365: Admin Center → Settings → Domains → select domain → DNS records → add DKIM TXT records',
        'If you use another provider: check their documentation for "DKIM setup" and add the TXT record they provide',
      ]
    })
  } else {
    // Check for weak key size (v=DKIM1; k=rsa; p=... — short p= value indicates 512/768 bit key)
    for (const r of found) {
      const pValue = r.record?.match(/p=([A-Za-z0-9+/=]+)/)?.[1] ?? ''
      if (pValue.length < 100 && pValue.length > 0) {
        issues.push({
          id:     `dkim-weak-${r.selector}`,
          type:   'Email',
          sev:    'medium',
          title:  `DKIM key on selector "${r.selector}" may be too short`,
          detail: 'Short DKIM keys (512-bit or 768-bit) can be cracked. Minimum recommended is 1024-bit, ideal is 2048-bit.',
          fix: [
            'Rotate your DKIM key to 2048-bit in your email provider settings',
            'For Google Workspace: Admin Console → Gmail → Authenticate email → rotate',
          ]
        })
      }
    }
  }

  return {
    domain:    clean,
    scannedAt: new Date().toISOString(),
    found,
    missing,
    selectorsChecked: COMMON_SELECTORS.length,
    issues,
    score: missing ? 60 : 100,
  }
}
