/**
 * CyberGuard Trust Badge
 * GET /api/badge/:domain        — JSON data
 * GET /api/badge/:domain/svg    — Embeddable SVG badge
 * GET /api/badge/:domain/verify — Public verification page (HTML)
 */
import express from 'express'
import { getSupabase } from '../lib/supabaseServer.js'

const router = express.Router()

// ── Helpers ──────────────────────────────────────────────
function gradeColor(score) {
  if (score >= 90) return { fill: '#059669', text: '#ecfdf5', grade: 'A' }
  if (score >= 75) return { fill: '#0284c7', text: '#eff6ff', grade: 'B' }
  if (score >= 60) return { fill: '#d97706', text: '#fffbeb', grade: 'C' }
  if (score >= 40) return { fill: '#dc2626', text: '#fef2f2', grade: 'D' }
  return             { fill: '#991b1b', text: '#fef2f2', grade: 'F' }
}

function scoreGrade(score) {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

// ── GET /api/badge/:domain — JSON data ───────────────────
router.get('/:domain', async (req, res) => {
  const domain = req.params.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const sb = getSupabase()

  try {
    // Look up domain
    const { data: domainRow } = await sb
      .from('domains')
      .select('id, name, verified_at')
      .eq('name', domain)
      .maybeSingle()

    if (!domainRow) return res.json({ ok: false, error: 'Domain not found', verified: false })

    // Get latest scan — show data regardless of verified status
    const { data: scan } = await sb
      .from('scan_results')
      .select('score, scanned_at, issues')
      .eq('domain_id', domainRow.id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!scan) return res.json({ ok: false, error: 'No scan data yet — run a scan first', verified: false })

    const score = scan.score ?? 0
    const issues = scan.issues ?? []
    const criticalCount = issues.filter(i => i.sev === 'critical').length
    const highCount = issues.filter(i => i.sev === 'high').length
    const grade = scoreGrade(score)
    const scannedAt = scan.scanned_at ? new Date(scan.scanned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'

    res.json({
      ok: true,
      domain: domainRow.name,
      verified: !!domainRow.verified_at,
      score,
      grade,
      criticalCount,
      highCount,
      scannedAt,
      verifyUrl: `https://cyberguard.visull.com/verify/${domain}`,
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── GET /api/badge/:domain/svg — Embeddable SVG ──────────
router.get('/:domain/svg', async (req, res) => {
  const domain = req.params.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const style  = req.query.style ?? 'full' // 'full' | 'mini' | 'dark'
  const sb = getSupabase()

  try {
    const { data: domainRow } = await sb
      .from('domains').select('id, verified').eq('name', domain).maybeSingle()

    // Show badge for any domain that has scan data
    const { data: scan } = await sb
      .from('scan_results').select('score, scanned_at')
      .eq('domain_id', domainRow.id)
      .order('scanned_at', { ascending: false }).limit(1).maybeSingle()

    const score = scan?.score ?? 0
    const { fill, text, grade } = gradeColor(score)
    const scannedDate = scan?.scanned_at
      ? new Date(scan.scanned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—'

    res.setHeader('Content-Type', 'image/svg+xml')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (style === 'mini') {
      // Mini badge — score + grade only, 90x36
      return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="36">
        <rect width="90" height="36" rx="7" fill="#0f1420" stroke="${fill}" stroke-width="1"/>
        <rect width="36" height="36" rx="7" fill="${fill}"/>
        <text x="18" y="24" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="white" text-anchor="middle">${grade}</text>
        <text x="63" y="14" font-family="system-ui,sans-serif" font-size="9" fill="#9ca3af" text-anchor="middle">Security</text>
        <text x="63" y="27" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="white" text-anchor="middle">${score}/100</text>
      </svg>`)
    }

    // Full badge — 200x56
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#0a1628"/>
          <stop offset="100%" stop-color="#0f2040"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- Background -->
      <rect width="200" height="56" rx="10" fill="url(#bg)" stroke="${fill}" stroke-width="1" stroke-opacity="0.6"/>
      <!-- Grade circle -->
      <circle cx="32" cy="28" r="18" fill="${fill}" filter="url(#glow)"/>
      <text x="32" y="34" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">${grade}</text>
      <!-- Shield icon -->
      <text x="62" y="20" font-family="system-ui,sans-serif" font-size="9" fill="#9ca3af">🛡 CyberGuard</text>
      <!-- Score -->
      <text x="62" y="36" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="white">${score}<tspan font-size="10" fill="#6b7280">/100</tspan></text>
      <!-- Pulse dot -->
      <circle cx="170" cy="16" r="4" fill="#00df78" opacity="0.9"/>
      <circle cx="170" cy="16" r="7" fill="#00df78" opacity="0.3">
        <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>
      <text x="110" y="49" font-family="system-ui,sans-serif" font-size="8" fill="#3a4455" text-anchor="middle">Scanned ${scannedDate}</text>
    </svg>`)

  } catch (e) {
    res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56">
      <rect width="200" height="56" rx="10" fill="#1f2937"/>
      <text x="100" y="32" font-family="system-ui,sans-serif" font-size="11" fill="#6b7280" text-anchor="middle">Badge unavailable</text>
    </svg>`)
  }
})

// ── GET /api/badge/:domain/verify — Public HTML page ─────
router.get('/:domain/verify', async (req, res) => {
  const domain = req.params.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const sb = getSupabase()

  try {
    const { data: domainRow } = await sb
      .from('domains').select('id, name, verified_at').eq('name', domain).maybeSingle()

    const { data: scan } = domainRow ? await sb
      .from('scan_results').select('score, scanned_at, issues')
      .eq('domain_id', domainRow.id)
      .order('scanned_at', { ascending: false }).limit(1).maybeSingle()
      : { data: null }

    const score = scan?.score ?? 0
    const issues = scan?.issues ?? []
    const { fill, grade } = gradeColor(score)
    const critical = issues.filter(i => i.sev === 'critical').length
    const high = issues.filter(i => i.sev === 'high').length
    const scannedAt = scan?.scanned_at
      ? new Date(scan.scanned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—'

    const verified = !!(domainRow && scan) // show as verified if domain exists and has been scanned

    res.setHeader('Content-Type', 'text/html')
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${domain} — CyberGuard Verification</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:#080b10;color:#dde2ed;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#0f1420;border:1px solid rgba(255,255,255,0.07);border-radius:16px;max-width:480px;width:100%;overflow:hidden}
    .header{background:linear-gradient(135deg,#0a1628,#0f2040);padding:32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)}
    .badge{display:inline-flex;align-items:center;gap:8px;background:rgba(0,223,120,0.08);border:1px solid rgba(0,223,120,0.2);border-radius:100px;padding:6px 16px;font-size:12px;color:#00df78;margin-bottom:20px}
    .dot{width:8px;height:8px;border-radius:50%;background:#00df78;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
    .domain{font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;word-break:break-all}
    .grade-circle{width:72px;height:72px;border-radius:50%;background:${fill};display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:white;margin:20px auto 8px}
    .score-text{font-size:28px;font-weight:700;color:#fff}
    .score-sub{font-size:12px;color:#6b7280;margin-top:4px}
    .body{padding:24px}
    .row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px}
    .row:last-child{border-bottom:none}
    .label{color:#6b7280}
    .value{font-weight:600;color:#dde2ed}
    .footer{padding:16px 24px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-size:11px;color:#3a4455}
    .footer a{color:#4fa6ff;text-decoration:none}
    .not-verified{color:#ff4757;font-size:13px;margin-top:8px}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge"><span class="dot"></span>${verified ? 'Live Verified' : 'Not Verified'}</div>
      <div class="domain">${domain}</div>
      ${verified ? `
      <div class="grade-circle">${grade}</div>
      <div class="score-text">${score}<span style="font-size:16px;color:#6b7280">/100</span></div>
      <div class="score-sub">Security Score</div>
      ` : `<div class="not-verified">This domain has not been verified by CyberGuard</div>`}
    </div>
    ${verified && scan ? `
    <div class="body">
      <div class="row"><span class="label">Domain</span><span class="value">${domain}</span></div>
      <div class="row"><span class="label">Security grade</span><span class="value" style="color:${fill}">${grade} — ${score >= 90 ? 'Advanced' : score >= 75 ? 'Good' : score >= 60 ? 'Intermediate' : score >= 40 ? 'Basic' : 'High Risk'}</span></div>
      <div class="row"><span class="label">Critical issues</span><span class="value" style="color:${critical > 0 ? '#ff4757' : '#00df78'}">${critical === 0 ? '✓ None' : critical}</span></div>
      <div class="row"><span class="label">High issues</span><span class="value" style="color:${high > 0 ? '#ffb627' : '#00df78'}">${high === 0 ? '✓ None' : high}</span></div>
      <div class="row"><span class="label">Last scanned</span><span class="value">${scannedAt}</span></div>
      <div class="row"><span class="label">Monitored by</span><span class="value">🛡 CyberGuard</span></div>
    </div>
    ` : ''}
    <div class="footer">
      Verified by <a href="https://cyberguard.visull.com" target="_blank">CyberGuard Security Intelligence</a>
      · <a href="https://cyberguard.visull.com" target="_blank">Scan your domain free →</a>
    </div>
  </div>
</body>
</html>`)
  } catch (e) {
    res.status(500).send('Verification page unavailable')
  }
})

export default router
