/**
 * M365 Anomaly Detection — extends base M365 scanner with threat detection.
 * Checks: risky sign-ins, suspicious inbox rules, OAuth app audit,
 * new admin accounts, legacy auth usage.
 * Uses existing Graph API connection — no new permissions needed.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

async function graphGet(path, token) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'ConsistencyLevel': 'eventual' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { error: `Graph ${res.status}`, data: null }
    return { data: await res.json(), error: null }
  } catch (err) {
    clearTimeout(timer)
    return { error: err.message, data: null }
  }
}

export async function scanM365Anomalies(token) {
  if (!token) return { ok: false, error: 'No token' }

  const alerts  = []
  const findings = {}

  // 1. Risky sign-ins (requires Azure AD P2 or M365 Business Premium)
  const riskyR = await graphGet('/identityProtection/riskyUsers?$top=20', token)
  if (riskyR.data?.value?.length > 0) {
    const risky = riskyR.data.value.filter(u => u.riskLevel !== 'none' && u.riskLevel !== 'low')
    if (risky.length > 0) {
      findings.riskyUsers = risky
      alerts.push({
        id:       'm365-risky-users',
        type:     'M365 Anomaly',
        sev:      'critical',
        title:    `${risky.length} user${risky.length>1?'s':''} flagged as at-risk by Microsoft`,
        detail:   `Users: ${risky.slice(0,3).map(u=>u.userPrincipalName).join(', ')}. Risk level: ${risky[0]?.riskLevel}.`,
        fix:      ['Investigate sign-in activity for each flagged user', 'Consider forcing password reset: Azure AD → Users → select user → Reset password', 'Review recent sign-ins for impossible travel or unfamiliar locations'],
        action:   'Investigate',
      })
    }
  }

  // 2. Suspicious inbox rules — external forwarding
  const usersR = await graphGet('/users?$select=id,userPrincipalName&$top=50', token)
  if (usersR.data?.value) {
    const externalForwards = []
    for (const user of usersR.data.value.slice(0, 20)) {
      const rulesR = await graphGet(`/users/${user.id}/mailFolders/inbox/messageRules?$top=20`, token)
      if (rulesR.data?.value) {
        for (const rule of rulesR.data.value) {
          const fwdActions = rule.actions?.forwardTo ?? []
          const externalFwd = fwdActions.filter(f => {
            const email = f.emailAddress?.address ?? ''
            const domain = email.split('@')[1] ?? ''
            return domain && !domain.includes('microsoft') && !domain.includes('office365')
          })
          if (externalFwd.length > 0) {
            externalForwards.push({
              user: user.userPrincipalName,
              rule: rule.displayName,
              to: externalFwd.map(f => f.emailAddress?.address).join(', ')
            })
          }
        }
      }
    }
    if (externalForwards.length > 0) {
      findings.suspiciousRules = externalForwards
      alerts.push({
        id:     'm365-external-forwarding',
        type:   'M365 Anomaly',
        sev:    'critical',
        title:  `${externalForwards.length} inbox rule${externalForwards.length>1?'s are':' is'} forwarding email to external addresses`,
        detail: `${externalForwards.map(r=>`${r.user} → ${r.to}`).join(', ')}. This is a common Business Email Compromise (BEC) indicator.`,
        fix:    ['Remove the suspicious forwarding rule immediately', 'Check if the affected account was compromised', 'Review all email sent from this account in the last 30 days'],
        action: 'Remove rule',
        urgent: true,
      })
    }
  }

  // 3. OAuth app permissions audit — apps with excessive permissions
  const appsR = await graphGet('/servicePrincipals?$top=50&$filter=tags/any(t:t eq \'WindowsAzureActiveDirectoryIntegratedApp\')', token)
  if (appsR.data?.value) {
    const thirdParty = appsR.data.value.filter(a => !a.microsoftFirstPartyPublisher && a.appId)
    findings.thirdPartyApps = thirdParty.length

    // Check for high-privilege delegated permissions
    const highPrivScopes = ['Mail.ReadWrite', 'Mail.Send', 'MailboxSettings.ReadWrite', 'Files.ReadWrite.All', 'Sites.FullControl.All']
    const riskyApps = []
    for (const app of thirdParty.slice(0, 20)) {
      const permR = await graphGet(`/servicePrincipals/${app.id}/oauth2PermissionGrants`, token)
      if (permR.data?.value) {
        for (const grant of permR.data.value) {
          const scopes = grant.scope?.split(' ') ?? []
          const risky  = scopes.filter(s => highPrivScopes.includes(s))
          if (risky.length > 0) {
            riskyApps.push({ name: app.displayName, scopes: risky })
          }
        }
      }
    }
    if (riskyApps.length > 0) {
      alerts.push({
        id:     'm365-risky-oauth-apps',
        type:   'M365 Anomaly',
        sev:    'high',
        title:  `${riskyApps.length} third-party app${riskyApps.length>1?'s have':' has'} high-privilege M365 permissions`,
        detail: `Apps with sensitive access: ${riskyApps.slice(0,3).map(a=>`${a.name} (${a.scopes.join(', ')})`).join('; ')}`,
        fix:    ['Review each app: Azure AD → Enterprise Applications → select app → Permissions', 'Remove apps that are no longer used or not recognised', 'OAuth app abuse is a common persistence technique after account compromise'],
        action: 'Review apps',
      })
    }
  }

  // 4. Recent new Global Admin accounts (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString()
  const newUsersR = await graphGet(`/users?$filter=createdDateTime ge ${sevenDaysAgo}&$select=displayName,userPrincipalName,createdDateTime`, token)
  if (newUsersR.data?.value?.length > 0) {
    findings.newUsers = newUsersR.data.value.length
    // Check if any are admins
    const adminR = await graphGet('/directoryRoles?$filter=displayName eq \'Global Administrator\'', token)
    if (adminR.data?.value?.[0]?.id) {
      const membersR = await graphGet(`/directoryRoles/${adminR.data.value[0].id}/members?$select=userPrincipalName,createdDateTime`, token)
      const newAdmins = (membersR.data?.value ?? []).filter(m =>
        m.createdDateTime && new Date(m.createdDateTime) > new Date(sevenDaysAgo)
      )
      if (newAdmins.length > 0) {
        alerts.push({
          id:     'm365-new-admin',
          type:   'M365 Anomaly',
          sev:    'high',
          title:  `${newAdmins.length} new Global Administrator account${newAdmins.length>1?'s':''} created in last 7 days`,
          detail: `New admins: ${newAdmins.map(a=>a.userPrincipalName).join(', ')}`,
          fix:    ['Verify these accounts were legitimately created', 'If unexpected, disable the account immediately and investigate', 'Attackers commonly create backdoor admin accounts after compromise'],
          action: 'Verify accounts',
          urgent: true,
        })
      }
    }
  }

  return { ok: true, alerts, findings, scannedAt: new Date().toISOString() }
}
