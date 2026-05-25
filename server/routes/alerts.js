/**
 * Alert routes
 * POST /api/alerts/trigger  — called after a scan, checks for changes and sends
 * POST /api/alerts/digest   — send weekly digest for a domain
 * GET  /api/alerts/test     — send a test alert to verify config
 */
import { Router } from 'express'
import { detectChanges, sendAlert, sendWeeklyDigest } from '../lib/alertEngine.js'

const router = Router()

/**
 * POST /api/alerts/trigger
 * Body: { domain, domainId, currentScan, previousScan, recipients, settings }
 */
router.post('/trigger', async (req, res, next) => {
  try {
    const { domain, currentScan, previousScan, recipients, settings } = req.body

    if (!domain || !currentScan) {
      return res.status(400).json({ ok: false, error: 'domain and currentScan required' })
    }
    // Detect what changed first (always, even with no recipients)
    const triggered = detectChanges(currentScan, previousScan)

    if (!recipients?.length) {
      return res.json({ ok: true, triggered: triggered.length, sent: 0, reason: 'no recipients configured' })
    }

    // Filter by what the user has enabled in settings
    const filtered = triggered.filter(alert => {
      if (!settings) return true  // no settings = send everything
      if (alert.type === 'new_critical' && !settings.alert_new_critical) return false
      if (alert.type === 'score_drop'   && !settings.alert_score_drop)   return false
      if (alert.type === 'cert_expiry'  && !settings.alert_cert_expiry)  return false
      if (alert.type === 'dmarc_fail'   && !settings.alert_dmarc_fail)   return false
      if (alert.type === 'breach_found' && !settings.alert_breach_found) return false
      return true
    })

    let sent = 0
    const log = []

    for (const alert of filtered) {
      const result = await sendAlert({ domain, alert, recipients, scanData: currentScan })
      if (result.sent) sent++
      log.push({ type: alert.type, ...result })
    }

    console.log(`[alerts/trigger] ${domain}: ${triggered.length} triggered, ${sent} sent`)
    res.json({ ok: true, triggered: triggered.length, sent, log })

  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/alerts/digest
 * Body: { domain, scanData, recipients }
 */
router.post('/digest', async (req, res, next) => {
  try {
    const { domain, scanData, recipients } = req.body
    if (!domain || !recipients?.length) {
      return res.status(400).json({ ok: false, error: 'domain and recipients required' })
    }
    const result = await sendWeeklyDigest({ domain, scanData, recipients })
    res.json({ ok: true, ...result })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/alerts/test
 * Body: { email, domain }
 * Sends a test email so the user can verify their setup works
 */
router.post('/test', async (req, res, next) => {
  try {
    const { email, domain, slackWebhook, teamsWebhook } = req.body
    if (!email) return res.status(400).json({ ok: false, error: 'email required' })

    const result = await sendAlert({
      domain: domain ?? 'your-domain.com',
      alert: {
        type:          'test',
        severity:      'info',
        subject:       '✅ CyberGuard alerts are working',
        detail:        'This is a test alert from CyberGuard. Your alert settings are configured correctly.',
        slackWebhook:  slackWebhook ?? null,
        teamsWebhook:  teamsWebhook ?? null,
      },
      recipients: [email],
      scanData: null,
    })
    res.json({ ok: true, ...result })
  } catch (err) {
    next(err)
  }
})

export default router
