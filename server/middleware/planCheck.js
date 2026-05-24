/**
 * Plan enforcement middleware.
 * 
 * How it works:
 * - Frontend sends Supabase JWT in Authorization header
 * - Middleware decodes it to get user_id
 * - Looks up profile to get current plan
 * - Checks against planLimits rules
 * - Returns 403 with upgrade message if over limit
 * 
 * Usage:
 *   router.post('/scan', requirePlan('add_domain'), handler)
 *   router.get('/report', requirePlan('pdf_report'), handler)
 */

import { createClient } from '@supabase/supabase-js'

const PLAN_LIMITS = {
  free: {
    domains: 1, vendors: 3, integrations: 1,
    staffEmails: false, pdfReport: false,
    slackAlerts: false, teamsAlerts: false,
    shareLinks: false, scoreHistory: false,
    apiAccess: false, compliancePack: false,
    phishingCampaigns: 1, canaryScripts: 1,
  },
  pro: {
    domains: 3, vendors: 20, integrations: 5,
    staffEmails: true, pdfReport: true,
    slackAlerts: true, teamsAlerts: true,
    shareLinks: true, scoreHistory: true,
    apiAccess: false, compliancePack: false,
    phishingCampaigns: 999, canaryScripts: 10,
  },
  business: {
    domains: 10, vendors: 100, integrations: 999,
    staffEmails: true, pdfReport: true,
    slackAlerts: true, teamsAlerts: true,
    shareLinks: true, scoreHistory: true,
    apiAccess: true, compliancePack: true,
    phishingCampaigns: 999, canaryScripts: 999,
  }
}

const GATE_MESSAGES = {
  pdf_report:        { message: 'PDF reports require Pro ($49/mo)', upgrade: 'pro' },
  slack_alerts:      { message: 'Slack alerts require Pro ($49/mo)', upgrade: 'pro' },
  teams_alerts:      { message: 'Teams alerts require Pro ($49/mo)', upgrade: 'pro' },
  share_links:       { message: 'Share links require Pro ($49/mo)', upgrade: 'pro' },
  staff_emails:      { message: 'Staff email checking requires Pro ($49/mo)', upgrade: 'pro' },
  score_history:     { message: 'Score history requires Pro ($49/mo)', upgrade: 'pro' },
  api_access:        { message: 'API access requires Business ($99/mo)', upgrade: 'business' },
  compliance_pack:   { message: 'T-Mobile compliance pack requires Business ($99/mo)', upgrade: 'business' },
  add_domain:        { message: 'You have reached your domain limit. Upgrade to add more.', upgrade: 'pro' },
  add_integration:   { message: 'You have reached your integration limit. Upgrade to add more.', upgrade: 'pro' },
  phishing_campaign: { message: 'Upgrade to Pro for unlimited phishing simulations', upgrade: 'pro' },
  canary_deploy:     { message: 'Upgrade to Pro to deploy canary scripts on more machines', upgrade: 'pro' },
}

// Extract user from Supabase JWT (server-side, no SDK needed)
async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// Get user's current plan from profiles table
async function getUserPlan(userId) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=plan`,
    {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      }
    }
  )
  const data = await res.json()
  return data?.[0]?.plan ?? 'free'
}

// Get current usage counts for limits that depend on count
async function getUserCounts(userId) {
  const headers = {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    'Prefer': 'count=exact',
    'Range': '0-0',
  }
  const base = process.env.SUPABASE_URL

  const [domainsRes, vendorsRes, integrationsRes] = await Promise.all([
    fetch(`${base}/rest/v1/domains?user_id=eq.${userId}&status=eq.verified`, { headers }),
    fetch(`${base}/rest/v1/vendor_checks?user_id=eq.${userId}`, { headers }),
    fetch(`${base}/rest/v1/integrations?user_id=eq.${userId}`, { headers }),
  ])

  const parseCount = (res) => {
    const range = res.headers.get('content-range')
    return range ? parseInt(range.split('/')[1] ?? '0', 10) : 0
  }

  return {
    domains:      parseCount(domainsRes),
    vendors:      parseCount(vendorsRes),
    integrations: parseCount(integrationsRes),
  }
}

/**
 * Main middleware factory.
 * 
 * @param {string} action - The action to check (matches GATE_MESSAGES keys)
 * @param {object} options
 * @param {boolean} options.soft - If true, attaches plan info but doesn't block
 */
export function requirePlan(action, options = {}) {
  return async (req, res, next) => {
    try {
      // Skip plan check if Supabase not configured
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return next()
      }

      const user = await getUserFromToken(req.headers.authorization)
      
      // If no auth header, allow through (public endpoints)
      // Protected endpoints should use requireAuth separately
      if (!user) {
        if (options.soft) { req.plan = 'free'; req.planLimits = PLAN_LIMITS.free }
        return next()
      }

      const plan   = await getUserPlan(user.id)
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
      const counts = await getUserCounts(user.id)

      // Attach to request for downstream use
      req.userId    = user.id
      req.userEmail = user.email
      req.plan      = plan
      req.planLimits = limits
      req.counts    = counts

      if (options.soft) return next()

      // Check the specific action
      let allowed = true

      switch (action) {
        case 'pdf_report':        allowed = limits.pdfReport;        break
        case 'slack_alerts':      allowed = limits.slackAlerts;      break
        case 'teams_alerts':      allowed = limits.teamsAlerts;      break
        case 'share_links':       allowed = limits.shareLinks;       break
        case 'staff_emails':      allowed = limits.staffEmails;      break
        case 'score_history':     allowed = limits.scoreHistory;     break
        case 'api_access':        allowed = limits.apiAccess;        break
        case 'compliance_pack':   allowed = limits.compliancePack;   break
        case 'add_domain':        allowed = counts.domains < limits.domains; break
        case 'add_integration':   allowed = counts.integrations < limits.integrations; break
        case 'phishing_campaign': allowed = true; break // checked separately with count
        case 'canary_deploy':     allowed = true; break // checked separately with count
        default:                  allowed = true
      }

      if (!allowed) {
        const gate = GATE_MESSAGES[action] ?? { message: 'Upgrade required', upgrade: 'pro' }
        return res.status(403).json({
          ok: false,
          error: gate.message,
          upgrade: gate.upgrade,
          currentPlan: plan,
          action,
        })
      }

      return next()
    } catch (err) {
      console.error('[planCheck] Error:', err.message)
      // Don't block on middleware errors — fail open
      return next()
    }
  }
}

// Attach user info without blocking
export const attachUser = requirePlan('none', { soft: true })
