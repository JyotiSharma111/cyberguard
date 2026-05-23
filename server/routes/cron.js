/**
 * Cron rescan endpoint
 * GET /api/cron/rescan?secret=YOUR_CRON_SECRET
 *
 * Call this from:
 *   · cron-job.org (free) — set URL + secret, schedule daily
 *   · Or Supabase Edge Functions
 *   · Or any external cron service
 *
 * It picks up domains queued by queue_daily_rescans() in Supabase
 * and scans them one by one, saving results and triggering alerts.
 */
import { Router } from 'express'
import { sendWeeklyDigests } from '../lib/weeklyDigest.js'
import { scanDomain }    from '../lib/dnsScanner.js'
import { scanSSL }       from '../lib/sslScanner.js'
import { scanCredentials } from '../lib/credScanner.js'
import { detectChanges, sendAlert } from '../lib/alertEngine.js'

const router = Router()

router.get('/rescan', async (req, res, next) => {
  // Simple secret check — set CRON_SECRET in .env.local
  const secret = process.env.CRON_SECRET
  if (secret && req.query.secret !== secret) {
    return res.status(401).json({ ok: false, error: 'Invalid cron secret' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ ok: false, error: 'Supabase not configured' })
  }

  try {
    // First queue domains that need rescanning
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/queue_daily_rescans`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    })

    // Get queued domains
    const qRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rescan_queue?processed=eq.false&limit=10&select=id,domain_id,domains(name)`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    const queue = await qRes.json()

    if (!Array.isArray(queue) || queue.length === 0) {
      return res.json({ ok: true, processed: 0, message: 'No domains queued' })
    }

    console.log(`[cron] Processing ${queue.length} domains`)
    let processed = 0

    for (const item of queue) {
      const domain = item.domains?.name
      if (!domain) continue

      try {
        // Run scan
        const [dns, ssl, cred] = await Promise.allSettled([
          scanDomain(domain),
          scanSSL(domain),
          scanCredentials(domain, [], process.env.HIBP_API_KEY),
        ])

        const dnsData  = dns.status  === 'fulfilled' ? dns.value  : { score:0, issues:[] }
        const sslData  = ssl.status  === 'fulfilled' ? ssl.value  : { score:0, issues:[] }
        const credData = cred.status === 'fulfilled' ? cred.value : { score:0, issues:[] }

        const overall  = Math.round((dnsData.score*0.35) + (sslData.score*0.35) + (credData.score*0.30))
        const allIssues = [...(dnsData.issues??[]), ...(sslData.issues??[]), ...(credData.issues??[])]
        const grade    = overall>=90?'A':overall>=75?'B':overall>=60?'C':overall>=40?'D':'F'

        // Save scan result
        const scanRow = {
          domain_id:  item.domain_id,
          score:      overall, grade,
          dns_score:  dnsData.score, ssl_score: sslData.score,
          email_score: 0, cred_score: credData.score,
          issues: allIssues, raw_dns: dnsData, raw_ssl: sslData, raw_creds: credData,
        }
        const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/scan_results`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(scanRow)
        })
        const [saved] = await saveRes.json()

        // Get previous scan to detect changes
        const prevRes = await fetch(
          `${SUPABASE_URL}/rest/v1/scan_results?domain_id=eq.${item.domain_id}&order=scanned_at.desc&limit=2&select=*`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        )
        const [current, previous] = await prevRes.json()

        // Get alert settings + recipients
        const settingsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/alert_settings?domain_id=eq.${item.domain_id}`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        )
        const [settings] = await settingsRes.json() ?? [null]

        // Get recipients (owner email + extra)
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/domains?id=eq.${item.domain_id}&select=profiles(email)`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        )
        const [domainRow] = await profileRes.json() ?? [null]
        const ownerEmail  = domainRow?.profiles?.email

        const recipRes = await fetch(
          `${SUPABASE_URL}/rest/v1/alert_recipients?domain_id=eq.${item.domain_id}&active=eq.true&select=email`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        )
        const extraRecips = await recipRes.json() ?? []
        const recipients  = [...new Set([ownerEmail, ...extraRecips.map(r=>r.email)].filter(Boolean))]

        // Fire alerts if anything changed
        if (recipients.length && current) {
          const triggered = detectChanges(
            { ...current, domain, issues: allIssues },
            previous ? { ...previous, domain } : null
          )
          for (const alert of triggered) {
            await sendAlert({ domain, alert, recipients, scanData: current })
          }
        }

        // Mark as processed
        await fetch(`${SUPABASE_URL}/rest/v1/rescan_queue?id=eq.${item.id}`, {
          method: 'PATCH',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ processed: true, processed_at: new Date().toISOString() })
        })

        processed++
        console.log(`[cron] ✓ ${domain} — score: ${overall}`)
      } catch (err) {
        console.error(`[cron] ✗ ${domain}:`, err.message)
      }
    }

    res.json({ ok: true, processed, queued: queue.length })
  } catch (err) {
    next(err)
  }
})


router.post('/weekly-digest', async (req, res, next) => {
  try {
    const secret = req.query.secret ?? req.body?.secret
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }
    const result = await sendWeeklyDigests()
    res.json({ ok: true, ...result })
  } catch (err) { next(err) }
})

router.get('/weekly-digest', async (req, res, next) => {
  try {
    const secret = req.query.secret
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }
    const result = await sendWeeklyDigests()
    res.json({ ok: true, ...result })
  } catch (err) { next(err) }
})

export default router
