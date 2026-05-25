import { Router } from 'express'
import { generatePowerShellCanary, generateBashCanary } from '../lib/canaryGenerator.js'
import { getSupabase } from '../lib/supabaseServer.js'
import { Resend } from 'resend'

const router = Router()

// Generate script for user
router.post('/generate', async (req, res, next) => {
  try {
    const { platform, domainId, orgName } = req.body
    const baseUrl    = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    // Build webhook URL from the request's own host (works on Railway automatically)
    const proto      = req.headers['x-forwarded-proto'] ?? 'https'
    const host       = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3001'
    const apiUrl     = process.env.BACKEND_URL ?? `${proto}://${host}`
    const webhookUrl = `${apiUrl}/api/canary/alert`

    const script = platform === 'windows'
      ? generatePowerShellCanary({ webhookUrl, orgName: orgName ?? 'Your Organisation', domainId })
      : generateBashCanary({ webhookUrl, orgName: orgName ?? 'Your Organisation', domainId })

    const filename = platform === 'windows' ? 'cyberguard-canary.ps1' : 'cyberguard-canary.sh'
    res.json({ ok: true, script, filename, webhookUrl })
  } catch (err) { next(err) }
})

// Receive canary alert (called by the script when triggered)
router.post('/alert', async (req, res, next) => {
  try {
    const { canaryId, orgName, event, filePath, hostname, username, platform, timestamp } = req.body
    console.log(`[canary] 🚨 ALERT from ${orgName} — ${event} on ${hostname} by ${username}`)

    const supabase = getSupabase()

    // Save to canary_alerts table
    await supabase.from('canary_alerts').insert({
      canary_id:  canaryId,
      org_name:   orgName,
      event_type: event,
      file_path:  filePath,
      hostname,
      username,
      platform,
      triggered_at: timestamp ?? new Date().toISOString(),
    }).catch(console.error)

    // Send immediate email alert
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)

      // Find domain owner by canary
      const { data: canary } = await supabase
        .from('canary_deployments')
        .select('domain_id, user_id')
        .eq('canary_id', canaryId)
        .maybeSingle()

      if (canary?.user_id) {
        const { data: profile } = await supabase
          .from('profiles').select('email').eq('id', canary.user_id).single()

        if (profile?.email) {
          await resend.emails.send({
            from:    `CyberGuard <${process.env.RESEND_FROM ?? 'onboarding@resend.dev'}>`,
            to:      [profile.email],
            subject: `🚨 RANSOMWARE CANARY TRIGGERED — ${orgName}`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
                <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:20px 24px;margin-bottom:20px">
                  <div style="font-size:20px;font-weight:700;color:#991b1b;margin-bottom:8px">🚨 Canary file triggered</div>
                  <div style="font-size:13px;color:#7f1d1d">A ransomware canary file was ${event} — this may indicate active ransomware on your network.</div>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
                  ${[['Organisation', orgName], ['Event', event.toUpperCase()], ['File', filePath], ['Computer', hostname], ['User', username], ['Platform', platform ?? 'Unknown'], ['Time', new Date(timestamp).toLocaleString()]].map(([k,v]) => `
                  <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151;border:1px solid #e5e7eb;width:35%">${k}</td>
                  <td style="padding:8px 12px;color:#111827;border:1px solid #e5e7eb;font-family:monospace">${v}</td></tr>`).join('')}
                </table>
                <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 16px;margin-bottom:16px">
                  <strong style="color:#78350f">Immediate actions:</strong>
                  <ol style="margin:8px 0 0 16px;color:#92400e;font-size:12px;line-height:1.8">
                    <li>Isolate the affected machine from the network immediately</li>
                    <li>Do NOT turn it off — forensic data is in memory</li>
                    <li>Contact your cyber insurance provider</li>
                    <li>Follow your Incident Response Plan</li>
                  </ol>
                </div>
                <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">Open CyberGuard dashboard →</a>
              </div>`,
          })
        }
      }
    }

    // Also send to Slack/Teams if configured
    // (alert engine handles this via stored settings)

    res.json({ ok: true, message: 'Alert received' })
  } catch (err) { next(err) }
})

// Get canary status for a domain
router.get('/status/:domainId', async (req, res, next) => {
  try {
    const supabase = getSupabase()
    const { data: deployments } = await supabase
      .from('canary_deployments')
      .select('*')
      .eq('domain_id', req.params.domainId)
      .order('created_at', { ascending: false })

    const { data: alerts } = await supabase
      .from('canary_alerts')
      .select('*')
      .in('canary_id', (deployments ?? []).map(d => d.canary_id))
      .order('triggered_at', { ascending: false })
      .limit(20)

    res.json({ ok: true, data: { deployments: deployments ?? [], alerts: alerts ?? [] } })
  } catch (err) { next(err) }
})

// Save canary deployment record
router.post('/deploy', async (req, res, next) => {
  try {
    const { canaryId, domainId, userId, platform, hostname } = req.body
    const supabase = getSupabase()
    await supabase.from('canary_deployments').insert({
      canary_id: canaryId, domain_id: domainId,
      user_id: userId, platform, hostname,
      deployed_at: new Date().toISOString(),
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
