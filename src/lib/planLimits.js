export const PLANS = {
  free: {
    name:        'Starter',
    price:       0,
    domains:     1,
    shareLinks:  0,
    staffEmails: 0,
    vendors:     3,
    integrations: 1,
    features: [
      '1 domain monitored',
      'Full 9-point security scan',
      'DNS, email, SSL, ports, subdomains',
      'HTTP headers + WHOIS + DKIM',
      'Credential breach check (HIBP)',
      'VirusTotal threat intelligence',
      'Automated pen test checks',
      'Security score + grade',
      'Email alerts (owner only)',
      '3 vendor risk scans',
      '1 cloud integration',
    ],
    missing: [
      'Staff email breach checking',
      'Shareable read-only links',
      'PDF security reports',
      'Slack alerts',
      'Score history (90 days)',
      'Multiple domains',
      'Extra alert recipients',
    ]
  },
  pro: {
    name:        'Pro',
    price:       49,
    domains:     3,
    shareLinks:  10,
    staffEmails: 500,
    vendors:     20,
    integrations: 5,
    features: [
      'Everything in Starter',
      'Up to 3 domains',
      'Staff email breach checking (500 accounts)',
      'Shareable read-only dashboard links',
      'PDF security reports',
      'Slack + webhook alerts',
      'Extra alert recipients (unlimited)',
      'Weekly email digest',
      'Score history (90 days)',
      '20 vendor risk scans',
      'All 5 cloud integrations',
      'Compliance control mapping',
      'Remediation tracker',
      '14-day free trial',
    ],
    missing: ['API access', 'Branded PDF reports', 'Up to 10 domains']
  },
  business: {
    name:        'Business',
    price:       99,
    domains:     10,
    shareLinks:  999,
    staffEmails: 9999,
    vendors:     100,
    integrations: 999,
    features: [
      'Everything in Pro',
      'Up to 10 domains',
      'Unlimited staff email checking',
      'Branded PDF reports (your logo)',
      'REST API access',
      'Unlimited share links',
      'Priority support (24h SLA)',
      '100 vendor risk scans',
      'All cloud integrations',
      'T-Mobile / vendor compliance pack',
      '14-day free trial',
    ],
    missing: []
  }
}

export function canDo(plan, action, currentCount = 0) {
  const p = PLANS[plan] ?? PLANS.free
  switch (action) {
    case 'add_domain':      return currentCount < p.domains
    case 'share_link':      return p.shareLinks > 0 && currentCount < p.shareLinks
    case 'staff_email':     return p.staffEmails > 0
    case 'pdf_report':      return plan !== 'free'
    case 'slack_alerts':    return plan !== 'free'
    case 'extra_recipients':return plan !== 'free'
    case 'score_history':   return plan !== 'free'
    case 'api_access':      return plan === 'business'
    case 'add_integration': return currentCount < p.integrations
    default: return true
  }
}

export function nextPlan(current) {
  if (current === 'free') return 'pro'
  if (current === 'pro')  return 'business'
  return null
}
