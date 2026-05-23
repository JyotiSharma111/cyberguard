import { Router } from 'express'
import { sendPhishingSimulation, PHISHING_TEMPLATES } from '../lib/phishingSimulator.js'

const router = Router()

router.get('/templates', (req, res) => {
  res.json({ ok: true, data: PHISHING_TEMPLATES.map(t => ({
    id: t.id, name: t.name, category: t.category,
    difficulty: t.difficulty, subject: t.subject, preview: t.preview
  }))})
})

router.post('/send', async (req, res, next) => {
  try {
    const { campaignId, domainId, recipients, templateId, fromName, fromEmail, baseUrl } = req.body
    const template = PHISHING_TEMPLATES.find(t => t.id === templateId)
    if (!template) return res.status(400).json({ ok: false, error: 'Template not found' })

    const results = []
    for (const recipient of recipients) {
      const r = await sendPhishingSimulation({
        campaignId, domainId, recipient, template,
        trackingBaseUrl: baseUrl ?? process.env.FRONTEND_URL ?? 'http://localhost:5173',
        fromName, fromEmail,
      })
      results.push({ email: recipient.email, ...r })
      if (!r.ok) console.error(`[phishing/send] Failed for ${recipient.email}:`, r.error)
      await new Promise(r => setTimeout(r, 500)) // rate limit
    }
    const failCount = results.filter(r => !r.ok).length
    const sentCount = results.filter(r => r.ok).length
    console.log(`[phishing/send] Campaign ${campaignId}: ${sentCount} sent, ${failCount} failed`)
    res.json({ ok: true, data: results, sent: sentCount, failed: failCount })
  } catch (err) { next(err) }
})

// Tracking endpoints — click and open pixel
router.get('/track/click/:campaignId/:recipientId', async (req, res) => {
  const { campaignId, recipientId } = req.params
  // Log the click to Supabase
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY
  if (SUPABASE_URL && SUPABASE_KEY) {
    await fetch(`${SUPABASE_URL}/rest/v1/phishing_results`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId, recipient_id: recipientId, event: 'click', event_at: new Date().toISOString() })
    }).catch(() => {})
  }
  // Redirect to education page
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  res.redirect(`${frontendUrl}/?phishing_education=${campaignId}&recipient=${recipientId}`)
})

router.get('/track/open/:campaignId/:recipientId', async (req, res) => {
  const { campaignId, recipientId } = req.params
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY
  if (SUPABASE_URL && SUPABASE_KEY) {
    await fetch(`${SUPABASE_URL}/rest/v1/phishing_results`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId, recipient_id: recipientId, event: 'open', event_at: new Date().toISOString() })
    }).catch(() => {})
  }
  // Return 1x1 transparent pixel
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  res.set('Content-Type', 'image/gif').send(pixel)
})

router.post('/m365-anomalies', async (req, res, next) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ ok: false, error: 'token required' })
    const { scanM365Anomalies } = await import('../lib/m365AnomalyScanner.js')
    const result = await scanM365Anomalies(token)
    res.json({ ok: true, data: result })
  } catch (err) { next(err) }
})

export default router
