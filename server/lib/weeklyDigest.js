/**
 * Weekly Security Digest — sent every Monday morning.
 * Shows score, what changed, top 3 fixes, quick wins.
 * Uses Resend (already configured).
 */

import { Resend } from 'resend'
import { getSupabase } from './supabaseServer.js'

function getClients() {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const supabase = getSupabase()
  return { resend, supabase }
}

function gradeColor(s) {
  if (s >= 75) return '#059669'
  if (s >= 60) return '#d97706'
  return '#dc2626'
}

function gradeLabel(s) {
  if (s >= 90) return 'A — Advanced'
  if (s >= 75) return 'B — Good'
  if (s >= 60) return 'C — Intermediate'
  if (s >= 40) return 'D — Basic'
  return 'F — High Risk'
}

function scoreArrow(current, previous) {
  if (!previous) return ''
  const diff = current - previous
  if (Math.abs(diff) < 2) return `<span style="color:#6b7280">→ No change</span>`
  if (diff > 0) return `<span style="color:#059669">↑ +${diff} pts since last week</span>`
  return `<span style="color:#dc2626">↓ ${diff} pts since last week</span>`
}

export function buildDigestHTML({ domain, orgName, score, previousScore, issues, scannedAt, frontendUrl }) {
  const org        = orgName ?? domain
  const crit       = issues.filter(i => i.sev === 'critical')
  const high       = issues.filter(i => i.sev === 'high')
  const total      = issues.length
  const topIssues  = [...crit, ...high].slice(0, 3)
  const scoreColor = gradeColor(score)
  const url        = frontendUrl ?? 'http://localhost:5173'
  const today      = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Weekly Security Digest — ${domain}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#111827">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">

  <!-- Header -->
  <tr><td style="background:#0f172a;padding:28px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="display:inline-flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(96,165,250,0.2);border:1.5px solid rgba(96,165,250,0.4);display:inline-block;text-align:center;line-height:32px;font-size:14px">🛡</div>
            <span style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">CyberGuard</span>
          </div>
          <div style="font-size:10px;letter-spacing:2px;color:rgba(148,163,184,0.6);text-transform:uppercase;margin-top:2px">Weekly Security Digest</div>
        </td>
        <td style="text-align:right;font-size:11px;color:rgba(148,163,184,0.4)">${today}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Domain row -->
  <tr><td style="padding:20px 32px 0;border-bottom:1px solid #f1f5f9">
    <div style="font-size:13px;color:#6b7280">Security summary for</div>
    <div style="font-size:20px;font-weight:700;color:#111827;margin-top:2px">${org}</div>
    <div style="font-size:12px;color:#9ca3af;margin-top:2px">${domain}</div>
  </td></tr>

  <!-- Score hero -->
  <tr><td style="padding:24px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:140px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:6px">Score</div>
          <div style="font-size:48px;font-weight:700;color:${scoreColor};line-height:1">${score}</div>
          <div style="font-size:11px;color:${scoreColor};margin-top:4px;font-weight:600">${gradeLabel(score)}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:6px">${scoreArrow(score, previousScore)}</div>
        </td>
        <td style="padding-left:20px;vertical-align:top">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:10px">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px">
                  <tr>
                    <td style="font-size:24px;font-weight:700;color:#991b1b;width:44px">${crit.length}</td>
                    <td>
                      <div style="font-size:12px;font-weight:600;color:#991b1b">Critical issues</div>
                      <div style="font-size:11px;color:#b91c1c">Fix immediately</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px">
                  <tr>
                    <td style="font-size:24px;font-weight:700;color:#92400e;width:44px">${high.length}</td>
                    <td>
                      <div style="font-size:12px;font-weight:600;color:#92400e">High severity issues</div>
                      <div style="font-size:11px;color:#b45309">Fix within 7 days</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Top issues -->
  ${topIssues.length > 0 ? `
  <tr><td style="padding:0 32px 24px">
    <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:12px">Top ${topIssues.length} issue${topIssues.length>1?'s':''} to fix this week</div>
    ${topIssues.map((issue, i) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border:1px solid ${issue.sev==='critical'?'#fecaca':'#fde68a'};border-radius:8px;overflow:hidden">
      <tr>
        <td style="width:4px;background:${issue.sev==='critical'?'#dc2626':'#d97706'}"></td>
        <td style="padding:12px 14px">
          <div style="display:flex;align-items:flex-start;gap:8px">
            <span style="display:inline-block;font-size:10px;font-weight:600;text-transform:uppercase;padding:1px 7px;border-radius:100px;background:${issue.sev==='critical'?'#fef2f2':'#fffbeb'};color:${issue.sev==='critical'?'#991b1b':'#92400e'};border:1px solid ${issue.sev==='critical'?'#fecaca':'#fde68a'};flex-shrink:0;margin-top:1px">${issue.sev}</span>
            <div>
              <div style="font-size:13px;font-weight:500;color:#111827;margin-bottom:3px">${issue.title ?? issue.name ?? ''}</div>
              ${(issue.fix??[])[0] ? `<div style="font-size:11px;color:#6b7280;line-height:1.5">→ ${(issue.fix)[0]}</div>` : ''}
            </div>
          </div>
        </td>
      </tr>
    </table>`).join('')}
  </td></tr>` : `
  <tr><td style="padding:0 32px 24px">
    <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:14px 16px;font-size:13px;color:#065f46;font-weight:500">
      ✓ No critical or high severity issues this week. Your security posture looks good!
    </div>
  </td></tr>`}

  <!-- Quick stats row -->
  <tr><td style="padding:0 32px 24px">
    <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:12px">This week at a glance</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <tr>
        ${[
          ['Total findings', total, total===0?'#059669':'#374151'],
          ['Critical', crit.length, crit.length>0?'#dc2626':'#059669'],
          ['High', high.length, high.length>0?'#d97706':'#059669'],
          ['Last scanned', scannedAt ? new Date(scannedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'Today', '#374151'],
        ].map(([label,val,color],i) => `
          <td style="text-align:center;padding:14px 0;${i<3?'border-right:1px solid #e2e8f0':''}">
            <div style="font-size:22px;font-weight:700;color:${color}">${val}</div>
            <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-top:3px">${label}</div>
          </td>`).join('')}
      </tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 32px 28px;text-align:center">
    <a href="${url}/dashboard" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:600">
      View full dashboard →
    </a>
    <div style="font-size:11px;color:#9ca3af;margin-top:10px">
      <a href="${url}/report" style="color:#9ca3af">Download PDF report</a> · <a href="${url}/settings" style="color:#9ca3af">Manage alerts</a>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e5e7eb">
    <div style="font-size:11px;color:#9ca3af;text-align:center">
      You're receiving this because you have CyberGuard monitoring enabled for ${domain}.<br>
      <a href="${url}/settings" style="color:#9ca3af">Manage email preferences</a> · <a href="${url}/settings" style="color:#9ca3af">Unsubscribe</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendWeeklyDigests() {
  const { resend, supabase } = getClients()
  if (!resend) {
    console.log('[weeklyDigest] Resend not configured — skipping')
    return { sent: 0, skipped: 0 }
  }

  console.log('[weeklyDigest] Starting weekly digest send...')
  let sent = 0, skipped = 0

  // Get all users with verified domains
  const { data: domains } = await supabase
    .from('domains')
    .select('id, name, user_id')
    .eq('status', 'verified')

  if (!domains?.length) return { sent: 0, skipped: 0 }

  for (const domain of domains) {
    try {
      // Get latest scan
      const { data: scans } = await supabase
        .from('scan_results')
        .select('*')
        .eq('domain_id', domain.id)
        .order('scanned_at', { ascending: false })
        .limit(2)

      if (!scans?.length) { skipped++; continue }

      const latest   = scans[0]
      const previous = scans[1]

      // Get user profile for email + org name
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, org_name, plan')
        .eq('id', domain.user_id)
        .single()

      if (!profile?.email) { skipped++; continue }

      // Get alert settings
      const { data: alertSettings } = await supabase
        .from('alert_settings')
        .select('extra_recipients')
        .eq('domain_id', domain.id)
        .maybeSingle()

      const recipients = [profile.email, ...(alertSettings?.extra_recipients ?? [])]

      const html = buildDigestHTML({
        domain:        domain.name,
        orgName:       profile.org_name,
        score:         latest.score ?? 0,
        previousScore: previous?.score,
        issues:        latest.issues ?? [],
        scannedAt:     latest.scanned_at,
        frontendUrl:   process.env.FRONTEND_URL,
      })

      await resend.emails.send({
        from:    `CyberGuard <${process.env.RESEND_FROM ?? 'onboarding@resend.dev'}>`,
        to:      recipients,
        subject: `Weekly security digest — ${domain.name} | Score: ${latest.score}/100`,
        html,
      })

      sent++
      console.log(`[weeklyDigest] Sent to ${profile.email} for ${domain.name}`)
      await new Promise(r => setTimeout(r, 200)) // rate limit
    } catch (err) {
      console.error(`[weeklyDigest] Error for ${domain.name}:`, err.message)
      skipped++
    }
  }

  console.log(`[weeklyDigest] Done — ${sent} sent, ${skipped} skipped`)
  return { sent, skipped }
}
