/**
 * Microsoft 365 Security Scanner
 * Uses Microsoft Graph API — free with any M365 licence.
 *
 * Setup (one-time, user does this):
 * 1. Azure Portal → App registrations → New registration
 * 2. Add permissions: User.Read.All, Policy.Read.All,
 *    AuditLog.Read.All, Directory.Read.All, SecurityEvents.Read.All
 * 3. Grant admin consent
 * 4. Create client secret
 * 5. Add to CyberGuard: Tenant ID, Client ID, Client Secret
 *
 * All read-only permissions — we never write anything.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

async function getToken(tenantId, clientId, clientSecret) {
  const url  = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         'https://graph.microsoft.com/.default',
  })
  const res  = await fetch(url, { method:'POST', body, headers:{ 'Content-Type':'application/x-www-form-urlencoded' } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description ?? `Auth failed: ${res.status}`)
  return data.access_token
}

async function graphGet(path, token) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'ConsistencyLevel': 'eventual' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { error: `Graph API ${res.status}`, data: null }
    return { data: await res.json(), error: null }
  } catch (err) {
    clearTimeout(timer)
    return { error: err.message, data: null }
  }
}

export async function scanM365({ tenantId, clientId, clientSecret }) {
  if (!tenantId || !clientId || !clientSecret) {
    return {
      ok: false,
      skipped: true,
      reason: 'M365 credentials not configured — add Tenant ID, Client ID, and Client Secret in integrations settings'
    }
  }

  console.log('[m365Scanner] Connecting to Microsoft Graph...')
  const startedAt = Date.now()

  let token
  try {
    token = await getToken(tenantId, clientId, clientSecret)
  } catch (err) {
    return { ok: false, error: `Authentication failed: ${err.message}`, issues: [], score: 100 }
  }

  const issues   = []
  const findings = {}

  // 1. Check MFA registration per user
  console.log('[m365Scanner] Checking MFA status...')
  const mfaR = await graphGet('/reports/authenticationMethods/userRegistrationDetails?$top=999', token)
  if (mfaR.data?.value) {
    const users        = mfaR.data.value
    const noMfa        = users.filter(u => !u.isMfaRegistered && !u.isAdmin)
    const adminNoMfa   = users.filter(u => !u.isMfaRegistered && u.isAdmin)
    findings.totalUsers = users.length
    findings.mfaRegistered = users.filter(u => u.isMfaRegistered).length
    findings.noMfa     = noMfa.length
    findings.adminNoMfa = adminNoMfa.length

    if (adminNoMfa.length > 0) {
      issues.push({
        id: 'm365-admin-no-mfa', type: 'M365', sev: 'critical',
        title: `${adminNoMfa.length} admin account${adminNoMfa.length>1?'s':''} without MFA`,
        detail: `Admin accounts without MFA are the #1 way M365 tenants get compromised. If an attacker gets the password, they have full admin access.`,
        fix: [
          'Azure Portal → Users → Multi-Factor Authentication → enable for all admins immediately',
          'Consider Conditional Access policy: require MFA for all admin roles',
          'Enable Security Defaults if not using Conditional Access (free)',
        ]
      })
    }
    if (noMfa.length > 0) {
      issues.push({
        id: 'm365-users-no-mfa', type: 'M365', sev: 'high',
        title: `${noMfa.length} user account${noMfa.length>1?'s':''} without MFA registered`,
        detail: `${Math.round((noMfa.length / users.length) * 100)}% of your users have no MFA. Accounts with only a password are easily compromised.`,
        fix: [
          'Enable Security Defaults: Azure Portal → Properties → Manage Security defaults → Enable',
          'Or use Conditional Access to require MFA for all users',
          'Users can register at aka.ms/mfasetup',
        ]
      })
    }
  }

  // 2. Check for legacy authentication enabled
  console.log('[m365Scanner] Checking legacy auth...')
  const legacyR = await graphGet('/policies/authenticationMethodsPolicy', token)
  findings.legacyAuth = legacyR.data

  // 3. Check for external email forwarding rules
  console.log('[m365Scanner] Checking forwarding rules...')
  const fwdR = await graphGet('/users?$select=id,displayName,userPrincipalName,mail&$top=100', token)
  if (fwdR.data?.value) {
    findings.users = fwdR.data.value.slice(0, 50).map(u => ({
      name: u.displayName,
      email: u.userPrincipalName,
    }))
  }

  // 4. Check global admin count (should be minimal)
  console.log('[m365Scanner] Checking admin accounts...')
  const adminsR = await graphGet('/directoryRoles?$filter=displayName eq \'Global Administrator\'', token)
  if (adminsR.data?.value?.[0]?.id) {
    const membersR = await graphGet(`/directoryRoles/${adminsR.data.value[0].id}/members`, token)
    const admins   = membersR.data?.value ?? []
    findings.globalAdmins = admins.length
    findings.globalAdminList = admins.map(a => a.userPrincipalName ?? a.displayName)

    if (admins.length > 3) {
      issues.push({
        id: 'm365-too-many-admins', type: 'M365', sev: 'medium',
        title: `${admins.length} global administrators — reduce to 2–3`,
        detail: 'Having many global admins increases your attack surface. Each admin account is a target. Best practice is 2–3 maximum.',
        fix: [
          'Review global admin list: Azure Portal → Roles and administrators → Global Administrator',
          'Remove admin rights from anyone who doesn\'t need them',
          'Use Privileged Identity Management (PIM) for just-in-time admin access',
        ]
      })
    }
  }

  // 5. Check secure score
  console.log('[m365Scanner] Fetching Secure Score...')
  const scoreR = await graphGet('/security/secureScores?$top=1', token)
  if (scoreR.data?.value?.[0]) {
    const ss = scoreR.data.value[0]
    findings.secureScore     = ss.currentScore
    findings.secureScoreMax  = ss.maxScore
    findings.secureScorePct  = Math.round((ss.currentScore / ss.maxScore) * 100)

    if (findings.secureScorePct < 50) {
      issues.push({
        id: 'm365-low-secure-score', type: 'M365', sev: 'high',
        title: `Microsoft Secure Score: ${findings.secureScorePct}% (${ss.currentScore}/${ss.maxScore})`,
        detail: 'Your Microsoft Secure Score is below 50%. Microsoft\'s own assessment of your M365 security posture is poor.',
        fix: [
          'Review recommendations at security.microsoft.com',
          'Enable Security Defaults as a starting point',
          'Focus on MFA, legacy auth blocking, and admin access first',
        ]
      })
    }
  }

  // 6. Check if Security Defaults or Conditional Access is enabled
  const secDefaultsR = await graphGet('/policies/identitySecurityDefaultsEnforcementPolicy', token)
  findings.securityDefaultsEnabled = secDefaultsR.data?.isEnabled ?? null

  if (findings.securityDefaultsEnabled === false && !findings.hasConditionalAccess) {
    issues.push({
      id: 'm365-no-security-defaults', type: 'M365', sev: 'high',
      title: 'Security Defaults disabled — no baseline MFA policy',
      detail: 'Security Defaults is Microsoft\'s free baseline security policy. Disabling it without replacing it with Conditional Access leaves accounts unprotected.',
      fix: [
        'Enable Security Defaults: Azure Portal → Azure Active Directory → Properties → Manage Security defaults',
        'Or configure Conditional Access policies to require MFA',
        'Security Defaults is free and takes 2 minutes to enable',
      ]
    })
  }

  const critCount = issues.filter(i => i.sev === 'critical').length
  const highCount  = issues.filter(i => i.sev === 'high').length
  const score = Math.max(0, 100 - (critCount * 25) - (highCount * 15) - (issues.filter(i=>i.sev==='medium').length * 5))
  const elapsed = Date.now() - startedAt

  console.log(`[m365Scanner] Done in ${elapsed}ms — ${issues.length} issues, score: ${score}`)
  return { ok: true, score, issues, findings, elapsedMs: elapsed, scannedAt: new Date().toISOString() }
}
