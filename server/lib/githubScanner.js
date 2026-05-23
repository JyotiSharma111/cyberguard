/**
 * GitHub Organisation Security Scanner
 * Free with any GitHub plan.
 * Required token scopes: read:org, read:user, repo, security_events
 */

const GH_BASE    = 'https://api.github.com'
const TIMEOUT_MS = 12000

async function ghGet(path, token) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${GH_BASE}${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CyberGuard-Scanner/1.0',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.status === 404) return { data: null, notFound: true }
    if (!res.ok) return { error: `GitHub API ${res.status}`, data: null }
    return { data: await res.json(), error: null }
  } catch (err) {
    clearTimeout(timer)
    return { error: err.name === 'AbortError' ? 'TIMEOUT' : err.message, data: null }
  }
}

export async function scanGitHub({ token, org }) {
  if (!token) {
    return { ok: false, skipped: true, reason: 'GitHub token not configured' }
  }

  console.log(`[githubScanner] Scanning ${org ? `org: ${org}` : 'user account'}...`)
  const startedAt = Date.now()
  const issues    = []
  const findings  = {}

  // 1. Validate token and get user/org info
  const userR = await ghGet('/user', token)
  if (userR.error) return { ok: false, error: `Authentication failed: ${userR.error}` }
  findings.user = { login: userR.data?.login, name: userR.data?.name, twoFactorEnabled: userR.data?.two_factor_authentication }

  if (findings.user.twoFactorEnabled === false) {
    issues.push({
      id: 'gh-no-2fa', type: 'GitHub', sev: 'critical',
      title: 'GitHub account owner does not have 2FA enabled',
      detail: 'GitHub account without 2FA is vulnerable to credential stuffing and phishing attacks. Source code access = game over.',
      fix: ['github.com → Settings → Password and authentication → Enable two-factor authentication', 'Use an authenticator app (not SMS)']
    })
  }

  // 2. If org provided, check org security settings
  if (org) {
    const orgR = await ghGet(`/orgs/${org}`, token)
    if (orgR.data) {
      findings.org = { name: orgR.data.name, members: orgR.data.members_count, repos: orgR.data.public_repos }

      // Check if 2FA is required for org members
      const membersR = await ghGet(`/orgs/${org}/members?filter=2fa_disabled`, token)
      if (membersR.data && membersR.data.length > 0) {
        issues.push({
          id: 'gh-org-members-no-2fa', type: 'GitHub', sev: 'critical',
          title: `${membersR.data.length} org member${membersR.data.length>1?'s':''} without 2FA`,
          detail: `Members without 2FA: ${membersR.data.slice(0,5).map(m=>m.login).join(', ')}${membersR.data.length>5?` and ${membersR.data.length-5} more`:''}`,
          fix: [
            `github.com/organizations/${org}/settings/security → Require two-factor authentication`,
            'This will remove non-compliant members until they enable 2FA',
          ]
        })
      }

      // Check secret scanning alerts
      const secretsR = await ghGet(`/orgs/${org}/secret-scanning/alerts?state=open&per_page=50`, token)
      if (!secretsR.error && Array.isArray(secretsR.data) && secretsR.data.length > 0) {
        findings.secretAlerts = secretsR.data.length
        const byType = {}
        secretsR.data.forEach(a => { byType[a.secret_type_display_name ?? 'Unknown'] = (byType[a.secret_type_display_name ?? 'Unknown'] ?? 0) + 1 })
        issues.push({
          id: 'gh-secret-scanning', type: 'GitHub', sev: 'critical',
          title: `${secretsR.data.length} open secret scanning alert${secretsR.data.length>1?'s':''} in your repositories`,
          detail: `Exposed secrets by type: ${Object.entries(byType).map(([k,v])=>`${k} (${v})`).join(', ')}`,
          fix: [
            `github.com/organizations/${org}/security → Secret scanning → review and revoke each exposed secret`,
            'Rotate all exposed credentials immediately — assume they have been compromised',
            'Add secrets to a secrets manager (AWS Secrets Manager, GitHub Actions secrets) instead of committing them',
          ]
        })
      }

      // Check Dependabot alerts
      const depR = await ghGet(`/orgs/${org}/dependabot/alerts?state=open&severity=critical&per_page=10`, token)
      if (!depR.error && Array.isArray(depR.data) && depR.data.length > 0) {
        findings.criticalDependencies = depR.data.length
        issues.push({
          id: 'gh-dependabot-critical', type: 'GitHub', sev: 'high',
          title: `${depR.data.length} critical dependency vulnerabilit${depR.data.length>1?'ies':'y'} (Dependabot)`,
          detail: `Critical severity vulnerabilities in your dependencies need immediate patching.`,
          fix: [
            `github.com/organizations/${org}/security → Dependabot alerts → review and update each package`,
            'Enable Dependabot auto-merge for patch updates',
            'Run: npm audit fix (for Node.js projects)',
          ]
        })
      }

      // Check repos for branch protection
      const reposR = await ghGet(`/orgs/${org}/repos?per_page=30&sort=updated`, token)
      if (reposR.data) {
        findings.repoCount = reposR.data.length
        let unprotected = 0
        for (const repo of reposR.data.filter(r => !r.archived && !r.fork).slice(0, 10)) {
          const branchR = await ghGet(`/repos/${org}/${repo.name}/branches/${repo.default_branch ?? 'main'}`, token)
          if (branchR.data && !branchR.data.protected) unprotected++
        }
        if (unprotected > 0) {
          issues.push({
            id: 'gh-no-branch-protection', type: 'GitHub', sev: 'medium',
            title: `${unprotected} repositor${unprotected>1?'ies':'y'} with no branch protection on default branch`,
            detail: 'Without branch protection, anyone with write access can push directly to main/master — including accidentally destructive changes.',
            fix: [
              `For each repo: Settings → Branches → Add rule → Require pull request reviews before merging`,
              'Enable: Require status checks, Require up-to-date branches',
            ]
          })
        }
      }
    }
  }

  const critCount = issues.filter(i => i.sev === 'critical').length
  const highCount  = issues.filter(i => i.sev === 'high').length
  const score = Math.max(0, 100 - (critCount * 25) - (highCount * 15) - (issues.filter(i=>i.sev==='medium').length * 5))
  const elapsed = Date.now() - startedAt

  console.log(`[githubScanner] Done in ${elapsed}ms — ${issues.length} issues, score: ${score}`)
  return { ok: true, score, issues, findings, elapsedMs: elapsed, scannedAt: new Date().toISOString() }
}
