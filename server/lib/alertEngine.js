/**
 * Alert Engine — compares latest scan to previous scan,
 * determines what changed, and sends emails via Resend.
 *
 * Called:
 *  1. After every scan completes (check for immediate alerts)
 *  2. By daily cron job for weekly digest
 */
import { Resend } from 'resend'

// Never instantiate Resend at module load — throws if key is missing.
// getResend() is called lazily only when actually sending an email.
const FROM    = process.env.RESEND_FROM   ?? 'onboarding@resend.dev'
const APP_URL = process.env.FRONTEND_URL  ?? 'http://localhost:5173'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('[alertEngine] RESEND_API_KEY is not set.')
    console.error('[alertEngine] → Open .env.local and add: RESEND_API_KEY=re_yourkey')
    return null
  }
  console.log('[alertEngine] Using Resend key:', key.slice(0, 8) + '...')
  return new Resend(key)
}

/**
 * Compare two scan results and return triggered alert types.
 * prev can be null (first scan ever).
 */
export function detectChanges(current, prev) {
  const triggered = []

  if (!current) return triggered

  // New critical issue
  const currentCrit = (current.issues ?? []).filter(i => i.sev === 'critical').length
  const prevCrit    = prev ? (prev.issues ?? []).filter(i => i.sev === 'critical').length : 0
  if (currentCrit > prevCrit) {
    triggered.push({
      type:     'new_critical',
      severity: 'critical',
      subject:  `🚨 New critical security issue on ${current.domain}`,
      detail:   `${currentCrit - prevCrit} new critical issue(s) found. Your score: ${current.score}/100.`,
    })
  }

  // Score drop > 10 points
  if (prev && current.score < prev.score - 10) {
    triggered.push({
      type:     'score_drop',
      severity: 'high',
      subject:  `⚠️ Security score dropped for ${current.domain}`,
      detail:   `Score dropped from ${prev.score} to ${current.score} (-${prev.score - current.score} points).`,
    })
  }

  // SSL cert expiry
  const ssl = current.raw_ssl
  if (ssl?.cert?.daysLeft !== undefined && ssl.cert.daysLeft <= 30 && ssl.cert.daysLeft >= 0) {
    const urgency = ssl.cert.daysLeft <= 7 ? '🚨' : '⚠️'
    triggered.push({
      type:     'cert_expiry',
      severity: ssl.cert.daysLeft <= 7 ? 'critical' : 'high',
      subject:  `${urgency} SSL certificate expiring in ${ssl.cert.daysLeft} days — ${current.domain}`,
      detail:   `Your SSL certificate expires on ${new Date(ssl.cert.validTo).toLocaleDateString()}. Renew it before it expires to avoid downtime.`,
    })
  }

  // DMARC not enforced
  const dmarc = current.raw_dns?.email?.dmarc
  if (dmarc && (!dmarc.policy || dmarc.policy === 'none')) {
    // Only alert on first scan or if it changed
    const wasBad = prev?.raw_dns?.email?.dmarc?.policy === 'none' || !prev?.raw_dns?.email?.dmarc?.policy
    if (!prev || !wasBad) {
      triggered.push({
        type:     'dmarc_fail',
        severity: 'high',
        subject:  `⚠️ Email spoofing possible on ${current.domain}`,
        detail:   `DMARC is set to p=none — anyone can send email pretending to be from @${current.domain}. This needs immediate attention.`,
      })
    }
  }

  return triggered
}

/**
 * Build HTML email body for an alert.
 */
function buildAlertHtml({ domain, subject, detail, issues = [], score, appUrl }) {
  const topIssues = issues.filter(i => i.sev === 'critical' || i.sev === 'high').slice(0, 5)

  const issueRows = topIssues.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #1c2435;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${i.sev==='critical'?'#ff4757':'#ffb627'};margin-right:8px;vertical-align:middle;"></span>
        <span style="color:#dde2ed;font-size:13px;">${i.title ?? i.name ?? ''}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #1c2435;color:#6b7789;font-size:12px;text-align:right;">${i.sev}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080b10;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#0f1420;border:1px solid #1c2435;border-radius:12px;overflow:hidden;">

    <!-- Header -->
    <div style="background:#0f1420;padding:24px 28px;border-bottom:1px solid #1c2435;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:28px;height:28px;background:rgba(79,166,255,0.12);border:1px solid rgba(79,166,255,0.25);border-radius:7px;"></div>
        <span style="color:#dde2ed;font-size:16px;font-weight:600;">CyberGuard</span>
      </div>
      <h1 style="margin:0;color:#dde2ed;font-size:18px;font-weight:600;line-height:1.4;">${subject}</h1>
    </div>

    <!-- Body -->
    <div style="padding:24px 28px;">
      <p style="margin:0 0 16px;color:#6b7789;font-size:14px;line-height:1.6;">
        ${detail}
      </p>

      ${score !== undefined ? `
      <div style="background:#080b10;border:1px solid #1c2435;border-radius:8px;padding:14px 16px;margin-bottom:20px;display:inline-block;">
        <div style="color:#6b7789;font-size:11px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Security Score</div>
        <div style="color:${score>=75?'#00df78':score>=60?'#ffb627':'#ff4757'};font-size:28px;font-weight:700;font-family:monospace;">${score}<span style="font-size:14px;color:#3a4455;">/100</span></div>
      </div>
      ` : ''}

      ${topIssues.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;background:#080b10;border:1px solid #1c2435;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        <thead>
          <tr style="background:#0a0e18;">
            <th style="padding:8px 12px;text-align:left;color:#3a4455;font-size:10px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;font-weight:500;">Issue</th>
            <th style="padding:8px 12px;text-align:right;color:#3a4455;font-size:10px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;font-weight:500;">Severity</th>
          </tr>
        </thead>
        <tbody>${issueRows}</tbody>
      </table>
      ` : ''}

      <a href="${appUrl}/dashboard" style="display:inline-block;background:rgba(79,166,255,0.12);border:1px solid rgba(79,166,255,0.25);border-radius:8px;padding:12px 24px;color:#4fa6ff;text-decoration:none;font-size:13px;font-weight:600;">
        View dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #1c2435;">
      <p style="margin:0;color:#3a4455;font-size:11px;font-family:monospace;">
        CyberGuard alert for ${domain} · <a href="${appUrl}/settings/alerts" style="color:#3a4455;">Manage alert settings</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Send alert emails.
 * recipients: array of email strings
 */
export async function sendAlert({ domain, alert, recipients, scanData }) {
  const resend = getResend()
  if (!resend) {
    return { sent: false, reason: 'no_api_key — add RESEND_API_KEY to .env.local' }
  }

  if (!recipients?.length) {
    console.warn('[alertEngine] No recipients — skipping')
    return { sent: false, reason: 'no_recipients' }
  }

  const html = buildAlertHtml({
    domain,
    subject:  alert.subject,
    detail:   alert.detail,
    issues:   scanData?.issues ?? [],
    score:    scanData?.score,
    appUrl:   APP_URL,
  })

  try {
    const result = await resend.emails.send({
      from:    FROM,
      to:      recipients,
      subject: alert.subject,
      html,
    })
    console.log(`[alertEngine] Sent "${alert.type}" to ${recipients.join(', ')}`)
    return { sent: true, id: result.id }
  } catch (err) {
    console.error('[alertEngine] Send failed:', err.message)
    return { sent: false, error: err.message }
  }
}

/**
 * Build and send weekly digest email.
 */
export async function sendWeeklyDigest({ domain, scanData, recipients }) {
  if (!scanData) return { sent: false, reason: 'no_scan_data' }

  const score     = scanData.score ?? 0
  const grade     = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
  const critical  = (scanData.issues ?? []).filter(i => i.sev === 'critical').length
  const high      = (scanData.issues ?? []).filter(i => i.sev === 'high').length

  const alert = {
    type:     'weekly_digest',
    severity: 'info',
    subject:  `📊 Weekly security report — ${domain} — Grade ${grade}`,
    detail:   `Your weekly security summary for ${domain}. Score: ${score}/100 (Grade ${grade}). ${critical} critical issue${critical !== 1 ? 's' : ''}, ${high} high issue${high !== 1 ? 's' : ''}.`,
  }

  return sendAlert({ domain, alert, recipients, scanData })
}
