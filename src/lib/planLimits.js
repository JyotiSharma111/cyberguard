export const PLANS = {
  free: {
    name:        'Starter',
    price:       0,
    domains:     1,
    shareLinks:  0,
    staffEmails: 0,
    vendors:     3,
    integrations: 1,
    phishingCampaigns: 1,       // 1 campaign/month on free
    canaryScripts: 1,           // canary on free — key differentiator
    weeklyDigest: false,
    uptime: true,               // uptime monitoring on free
    features: [
      '1 domain monitored',
      'Full 9-scanner security scan',
      'DNS, email, SSL, ports, subdomains',
      'HTTP headers + WHOIS + DKIM',
      'Credential breach check (HIBP)',
      'VirusTotal threat intelligence',
      'Automated pentest checks',
      'Security score + grade',
      'Email alerts (owner only)',
      'Uptime monitoring',
      'Ransomware canary script (1 machine)',
      '3 vendor risk scans',
      '1 cloud integration',
      '1 phishing simulation/month',
    ],
    missing: [
      'Staff email breach checking',
      'Shareable read-only links',
      'PDF security reports',
      'Slack + Teams alerts',
      'Weekly email digest',
      'Score history (90 days)',
      'Multiple domains',
      'Unlimited phishing campaigns',
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
    phishingCampaigns: 999,
    canaryScripts: 10,
    weeklyDigest: true,
    uptime: true,
    features: [
      'Everything in Starter',
      'Up to 3 domains',
      'Staff email breach checking (500 accounts)',
      'Shareable read-only dashboard links',
      'PDF security reports',
      'Slack + Teams webhook alerts',
      'Microsoft Teams alerts',
      'Extra alert recipients (unlimited)',
      'Weekly email digest',
      'Score history (90 days)',
      'Unlimited phishing simulations',
      'Ransomware canary (10 machines)',
      '20 vendor risk scans',
      'All 5 cloud integrations',
      'Compliance control mapping',
      'Remediation tracker',
      '14-day free trial',
    ],
    missing: ['API access', 'Branded PDF reports', 'Up to 10 domains', 'Vendor compliance pack']
  },
  business: {
    name:        'Business',
    price:       99,
    domains:     10,
    shareLinks:  999,
    staffEmails: 9999,
    vendors:     100,
    integrations: 999,
    phishingCampaigns: 999,
    canaryScripts: 999,
    weeklyDigest: true,
    uptime: true,
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
      'Vendor compliance pack',
      'Unlimited canary deployments',
      '14-day free trial',
    ],
    missing: []
  }
}

export function canDo(plan, action, currentCount = 0) {
  const p = PLANS[plan] ?? PLANS.free
  switch (action) {
    case 'add_domain':         return currentCount < p.domains
    case 'share_link':         return p.shareLinks > 0 && currentCount < p.shareLinks
    case 'staff_email':        return p.staffEmails > 0
    case 'pdf_report':         return plan !== 'free'
    case 'slack_alerts':       return plan !== 'free'
    case 'teams_alerts':       return plan !== 'free'
    case 'weekly_digest':      return p.weeklyDigest
    case 'extra_recipients':   return plan !== 'free'
    case 'score_history':      return plan !== 'free'
    case 'api_access':         return plan === 'business'
    case 'compliance_pack':    return plan === 'business'
    case 'add_integration':    return currentCount < p.integrations
    case 'phishing_campaign':  return currentCount < p.phishingCampaigns
    case 'canary_deploy':      return currentCount < p.canaryScripts
    default: return true
  }
}

export function nextPlan(current) {
  if (current === 'free') return 'pro'
  if (current === 'pro')  return 'business'
  return null
}

// Human-readable feature gate messages
export const GATE_MESSAGES = {
  pdf_report:       { title: 'PDF reports — Pro feature', desc: 'Upgrade to Pro ($49/mo) to generate and download security reports.' },
  slack_alerts:     { title: 'Slack alerts — Pro feature', desc: 'Upgrade to Pro ($49/mo) to send alerts to Slack channels.' },
  teams_alerts:     { title: 'Teams alerts — Pro feature', desc: 'Upgrade to Pro ($49/mo) to send alerts to Microsoft Teams.' },
  share_link:       { title: 'Share links — Pro feature', desc: 'Upgrade to Pro ($49/mo) to create shareable read-only dashboard links.' },
  staff_email:      { title: 'Staff email checking — Pro feature', desc: 'Upgrade to Pro ($49/mo) to check staff email addresses against breach databases.' },
  score_history:    { title: 'Score history — Pro feature', desc: 'Upgrade to Pro ($49/mo) to see your security score trend over 90 days.' },
  weekly_digest:    { title: 'Weekly digest — Pro feature', desc: 'Upgrade to Pro ($49/mo) to receive weekly email security summaries.' },
  api_access:       { title: 'API access — Business feature', desc: 'Upgrade to Business ($99/mo) for REST API access.' },
  compliance_pack:  { title: 'Vendor compliance pack — Business feature', desc: 'Upgrade to Business ($99/mo) for the one-click vendor compliance export.' },
  canary_deploy:    { title: 'Canary limit reached', desc: 'Upgrade to Pro ($49/mo) to deploy canary scripts on up to 10 machines.' },
  phishing_campaign:{ title: 'Phishing campaign limit reached', desc: 'Upgrade to Pro ($49/mo) for unlimited phishing simulations.' },
}
