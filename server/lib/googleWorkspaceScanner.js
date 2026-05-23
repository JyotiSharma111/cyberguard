/**
 * Google Workspace Scanner
 * Uses Google Admin SDK (free with any Google Workspace licence).
 *
 * Setup:
 * 1. console.cloud.google.com → Create project
 * 2. Enable Admin SDK API
 * 3. Create Service Account → Download JSON key
 * 4. In Google Admin (admin.google.com) → Security → API controls →
 *    Domain-wide delegation → Add service account client ID with scopes:
 *    https://www.googleapis.com/auth/admin.directory.user.readonly
 *    https://www.googleapis.com/auth/admin.directory.domain.readonly
 *    https://www.googleapis.com/auth/admin.reports.audit.readonly
 * 5. Paste service account email + admin email into CyberGuard
 */

const TIMEOUT_MS = 15000

async function getGoogleToken(serviceAccountKey, adminEmail) {
  // Create JWT for service account impersonation
  const now     = Math.floor(Date.now() / 1000)
  const payload = {
    iss:   serviceAccountKey.client_email,
    sub:   adminEmail,
    scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/admin.directory.domain.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  // Sign JWT using RS256 — requires crypto
  const { createSign } = await import('node:crypto')
  const header   = Buffer.from(JSON.stringify({ alg:'RS256', typ:'JWT' })).toString('base64url')
  const body     = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const unsigned = `${header}.${body}`
  const sign     = createSign('RSA-SHA256')
  sign.update(unsigned)
  const signature = sign.sign(serviceAccountKey.private_key, 'base64url')
  const jwt = `${unsigned}.${signature}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description ?? `Google auth failed: ${res.status}`)
  return data.access_token
}

async function adminGet(path, token) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`https://admin.googleapis.com${path}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { error: `Admin API ${res.status}`, data: null }
    return { data: await res.json(), error: null }
  } catch (err) {
    clearTimeout(timer)
    return { error: err.message, data: null }
  }
}

export async function scanGoogleWorkspace({ serviceAccountKeyJson, adminEmail }) {
  if (!serviceAccountKeyJson || !adminEmail) {
    return { ok: false, skipped: true, reason: 'Google Workspace credentials not configured' }
  }

  let serviceAccountKey
  try {
    serviceAccountKey = typeof serviceAccountKeyJson === 'string'
      ? JSON.parse(serviceAccountKeyJson)
      : serviceAccountKeyJson
  } catch {
    return { ok: false, error: 'Invalid service account JSON — paste the full contents of the downloaded key file' }
  }

  console.log('[googleScanner] Connecting to Google Admin SDK...')
  const startedAt = Date.now()

  let token
  try {
    token = await getGoogleToken(serviceAccountKey, adminEmail)
  } catch (err) {
    return { ok: false, error: `Authentication failed: ${err.message}` }
  }

  const issues   = []
  const findings = {}

  // 1. List users and check 2-step verification
  const usersR = await adminGet('/admin/directory/v1/users?customer=my_customer&maxResults=500&projection=full', token)
  if (usersR.data?.users) {
    const users = usersR.data.users
    findings.totalUsers = users.length
    findings.noMfa      = users.filter(u => !u.isEnrolledIn2Sv).length
    findings.admins     = users.filter(u => u.isAdmin || u.isDelegatedAdmin).length
    findings.suspended  = users.filter(u => u.suspended).length
    const adminNoMfa    = users.filter(u => (u.isAdmin || u.isDelegatedAdmin) && !u.isEnrolledIn2Sv)

    if (adminNoMfa.length > 0) {
      issues.push({
        id: 'gws-admin-no-2sv', type: 'Google', sev: 'critical',
        title: `${adminNoMfa.length} admin account${adminNoMfa.length>1?'s':''} without 2-step verification`,
        detail: 'Google Workspace admin accounts without 2SV are the primary target for account takeover attacks.',
        fix: [
          'Admin Console → Security → Authentication → 2-step verification → Enforce for admins',
          'Affected accounts: ' + adminNoMfa.slice(0,3).map(u=>u.primaryEmail).join(', '),
        ]
      })
    }

    if (findings.noMfa > 0) {
      const pct = Math.round((findings.noMfa / users.length) * 100)
      issues.push({
        id: 'gws-users-no-2sv', type: 'Google', sev: 'high',
        title: `${findings.noMfa} user${findings.noMfa>1?'s':''} (${pct}%) without 2-step verification`,
        detail: 'Accounts protected only by password are easily compromised through phishing.',
        fix: [
          'Admin Console → Security → Authentication → 2-step verification → Enforcement → On (for all users)',
          'Give users 1 week grace period before enforcing',
        ]
      })
    }
  }

  // 2. Check sharing settings
  const sharingR = await adminGet('/admin/directory/v1/customer/my_customer', token)
  if (sharingR.data) {
    findings.domain = sharingR.data.customerDomain
  }

  const critCount = issues.filter(i => i.sev === 'critical').length
  const highCount  = issues.filter(i => i.sev === 'high').length
  const score = Math.max(0, 100 - (critCount * 25) - (highCount * 15))
  const elapsed = Date.now() - startedAt

  console.log(`[googleScanner] Done in ${elapsed}ms — ${issues.length} issues, score: ${score}`)
  return { ok: true, score, issues, findings, elapsedMs: elapsed, scannedAt: new Date().toISOString() }
}
