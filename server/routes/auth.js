/**
 * Auth webhook — called by Supabase when a new user signs up.
 * Sends welcome email.
 * 
 * Setup in Supabase:
 * Database → Webhooks → Create webhook
 *   Table: auth.users
 *   Events: INSERT
 *   URL: https://your-railway-url.up.railway.app/api/auth/webhook
 *   HTTP method: POST
 */

import { Router } from 'express'
import { sendWelcomeEmail } from '../lib/welcomeEmail.js'

const router = Router()

// Supabase webhook — fires on new user signup
router.post('/webhook', async (req, res) => {
  try {
    const { type, record } = req.body

    // Only handle new user signups
    if (type !== 'INSERT' || !record?.email) {
      return res.json({ ok: true, skipped: true })
    }

    const email   = record.email
    const orgName = record.raw_user_meta_data?.org_name ?? ''

    console.log(`[auth/webhook] New signup: ${email} — sending welcome email`)

    // Send async — don't wait, don't block response
    sendWelcomeEmail({
      email,
      orgName,
      frontendUrl: process.env.FRONTEND_URL,
    }).catch(err => console.error('[auth/webhook] Welcome email failed:', err.message))

    return res.json({ ok: true })
  } catch (err) {
    console.error('[auth/webhook] Error:', err.message)
    return res.json({ ok: true }) // always 200 to Supabase
  }
})

// Manual trigger — useful for testing
// GET /api/auth/send-welcome?email=test@example.com
router.get('/send-welcome', async (req, res) => {
  const { email, org } = req.query
  if (!email) return res.status(400).json({ ok: false, error: 'email required' })

  const result = await sendWelcomeEmail({
    email,
    orgName: org ?? 'there',
    frontendUrl: process.env.FRONTEND_URL,
  })

  res.json(result)
})

export default router
