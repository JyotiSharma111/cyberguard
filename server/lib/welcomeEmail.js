/**
 * Welcome email — sent when a new user signs up.
 * Triggered via Supabase webhook or from signup route.
 * 
 * Content:
 * - Warm welcome with org name
 * - 3 clear steps to get started
 * - What they'll find (real examples of issues)
 * - Link to dashboard
 * - Reply-to set so they can just reply with questions
 */

import { Resend } from 'resend'

export async function sendWelcomeEmail({ email, orgName, frontendUrl }) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.log('[welcome] Resend not configured — skipping welcome email')
    return { ok: false, error: 'Resend not configured' }
  }

  const resend = new Resend(key)
  const url    = frontendUrl ?? process.env.FRONTEND_URL ?? 'https://cyberguard-4f4.pages.dev'
  const org    = orgName ?? 'there'
  const from   = process.env.RESEND_FROM ?? 'onboarding@resend.dev'

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to CyberGuard</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#111827">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">

  <!-- Header -->
  <tr><td style="background:#0f172a;padding:28px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <span style="font-size:16px;font-weight:700;color:#ffffff">🛡 CyberGuard</span>
        <div style="font-size:10px;letter-spacing:2px;color:rgba(148,163,184,0.6);text-transform:uppercase;margin-top:2px">Security Intelligence</div>
      </td>
      <td style="text-align:right;font-size:11px;color:rgba(148,163,184,0.4)">Welcome aboard</td>
    </tr></table>
  </td></tr>

  <!-- Hero -->
  <tr><td style="padding:32px 32px 0">
    <div style="font-size:22px;font-weight:700;color:#111827;margin-bottom:10px;line-height:1.3">
      Welcome, ${org} 👋
    </div>
    <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 24px">
      Your CyberGuard account is ready. You're 3 steps away from knowing exactly 
      what attackers can see about your business — and how to fix it.
    </p>
  </td></tr>

  <!-- 3 Steps -->
  <tr><td style="padding:0 32px 24px">
    ${[
      {
        n: '1',
        title: 'Add your domain',
        desc: 'Go to your dashboard and click "Add domain". Enter your business domain (e.g. yourbusiness.com). Takes 30 seconds.',
        color: '#4fa6ff',
      },
      {
        n: '2', 
        title: 'Verify ownership',
        desc: 'We\'ll give you a small DNS TXT record to add. This proves you own the domain. Takes 2 minutes in Cloudflare, GoDaddy, or wherever you manage your DNS.',
        color: '#00df78',
      },
      {
        n: '3',
        title: 'Run your first scan',
        desc: 'Click "Run scan". In under 90 seconds you\'ll have a security score and a list of real issues — with step-by-step fix instructions for each one.',
        color: '#a78bfa',
      },
    ].map(step => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #f1f5f9;border-radius:10px;overflow:hidden">
      <tr>
        <td style="width:44px;background:${step.color}18;text-align:center;vertical-align:top;padding:14px 0">
          <span style="font-size:16px;font-weight:700;color:${step.color}">${step.n}</span>
        </td>
        <td style="padding:12px 16px">
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:3px">${step.title}</div>
          <div style="font-size:12px;color:#6b7280;line-height:1.6">${step.desc}</div>
        </td>
      </tr>
    </table>`).join('')}
  </td></tr>

  <!-- What you'll find -->
  <tr><td style="padding:0 32px 24px">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px">
      <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">
        What most businesses find on their first scan
      </div>
      ${[
        ['🔴', 'DMARC not configured', 'Anyone can send email pretending to be you'],
        ['🟡', 'SSL certificate expiring', 'Browsers will show a warning to your visitors'],
        ['🔴', 'Staff emails in breach databases', 'Credentials from old data breaches still in use'],
        ['🟡', 'Security headers missing', 'CSP and HSTS protecting against XSS attacks'],
      ].map(([emoji, title, desc]) => `
      <div style="display:flex;gap:10px;margin-bottom:8px;font-size:12px">
        <span style="flex-shrink:0">${emoji}</span>
        <div><strong style="color:#374151">${title}</strong> — <span style="color:#6b7280">${desc}</span></div>
      </div>`).join('')}
      <div style="font-size:11px;color:#9ca3af;margin-top:8px">CyberGuard finds all of these automatically and shows you exactly how to fix each one.</div>
    </div>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 32px 28px;text-align:center">
    <a href="${url}" 
       style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:-0.2px">
      Go to my dashboard →
    </a>
    <div style="font-size:11px;color:#9ca3af;margin-top:12px">
      Questions? Just reply to this email.
    </div>
  </td></tr>

  <!-- What's included -->
  <tr><td style="background:#f8fafc;padding:18px 32px;border-top:1px solid #e5e7eb">
    <div style="font-size:11px;font-weight:600;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">
      Your free plan includes
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${[
          ['9 scanners', 'Full security check'],
          ['Email alerts', 'On any change'],
          ['Uptime monitor', '5-min checks'],
          ['Canary script', 'Ransomware detection'],
        ].map(([title, desc]) => `
        <td style="width:25%;text-align:center;padding:0 4px">
          <div style="font-size:12px;font-weight:600;color:#1d4ed8">${title}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px">${desc}</div>
        </td>`).join('')}
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb">
    <div style="font-size:11px;color:#9ca3af;text-align:center;line-height:1.7">
      You're receiving this because you created a CyberGuard account.<br>
      <a href="${url}/settings" style="color:#9ca3af">Manage email preferences</a> · 
      <a href="${url}" style="color:#9ca3af">Dashboard</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  try {
    const result = await resend.emails.send({
      from:     from,
      to:       [email],
      reply_to: from,
      subject:  `Welcome to CyberGuard — here's how to get started`,
      html,
    })

    if (result.error) {
      console.error('[welcome] Resend error:', result.error)
      return { ok: false, error: result.error.message }
    }

    console.log(`[welcome] Sent to ${email}`)
    return { ok: true, id: result.data?.id }
  } catch (err) {
    console.error('[welcome] Failed:', err.message)
    return { ok: false, error: err.message }
  }
}
