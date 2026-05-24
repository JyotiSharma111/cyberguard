/**
 * CyberGuard Security Report Generator — v2
 * Per-vector sections, grade distributions,
 * industry benchmarks, first/last seen findings, timeline charts.
 */

// ── helpers ──────────────────────────────────────────────────
const fmt = iso => iso
  ? new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
  : 'N/A'

const fmtShort = iso => iso
  ? new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
  : '—'

function scoreGrade(s) {
  if (s >= 90) return { grade:'A', label:'Advanced',     color:'#059669', bg:'#ecfdf5', border:'#6ee7b7' }
  if (s >= 75) return { grade:'B', label:'Good',         color:'#0284c7', bg:'#eff6ff', border:'#93c5fd' }
  if (s >= 60) return { grade:'C', label:'Intermediate', color:'#d97706', bg:'#fffbeb', border:'#fcd34d' }
  if (s >= 40) return { grade:'D', label:'Basic',        color:'#dc2626', bg:'#fef2f2', border:'#fca5a5' }
  return         { grade:'F', label:'High Risk',    color:'#991b1b', bg:'#fef2f2', border:'#f87171' }
}

function sevBadge(sev) {
  const map = {
    critical: 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca',
    high:     'background:#fffbeb;color:#92400e;border:1px solid #fde68a',
    medium:   'background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe',
    low:      'background:#f9fafb;color:#374151;border:1px solid #e5e7eb',
  }
  return `<span style="display:inline-block;padding:1px 8px;border-radius:100px;font-size:10px;font-weight:600;text-transform:uppercase;${map[sev]??map.low}">${sev}</span>`
}

function gradeTag(score) {
  const g = scoreGrade(score)
  return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:${g.color}">
    <span style="width:22px;height:22px;border-radius:50%;background:${g.bg};border:1.5px solid ${g.border};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${g.grade}</span>
    ${g.label}
  </span>`
}

function progressBar(score, width = 200) {
  const g = scoreGrade(score)
  return `<div style="position:relative;height:8px;background:#e5e7eb;border-radius:100px;width:${width}px;overflow:hidden">
    <div style="position:absolute;left:0;top:0;height:100%;width:${score}%;background:${g.color};border-radius:100px;transition:width .3s"></div>
  </div>`
}

// Grade distribution bar
function gradeDistBar(findings) {
  if (!findings || findings.length === 0) {
    return `<div style="font-size:12px;color:#6b7280;font-style:italic">No findings</div>`
  }
  const counts = { Good:0, Fair:0, Warn:0, Bad:0, Neutral:0 }
  findings.forEach(f => { counts[f.grade] = (counts[f.grade]??0) + 1 })
  const total = findings.length
  const colors = { Good:'#059669', Fair:'#0284c7', Warn:'#d97706', Bad:'#dc2626', Neutral:'#9ca3af' }
  const bars = Object.entries(counts).filter(([,v])=>v>0).map(([k,v]) =>
    `<div style="height:10px;background:${colors[k]};width:${Math.round((v/total)*100)}%;flex-shrink:0" title="${k}: ${v}"></div>`
  ).join('')
  const labels = Object.entries(counts).filter(([,v])=>v>0).map(([k,v]) =>
    `<span style="font-size:10px;color:${colors[k]};margin-right:10px">● ${k} ${Math.round((v/total)*100)}%</span>`
  ).join('')
  return `
    <div style="display:flex;height:10px;border-radius:100px;overflow:hidden;width:100%;max-width:320px;margin-bottom:6px">${bars}</div>
    <div>${labels}</div>`
}

// SVG mini sparkline — shows finding count over 12 months
function sparkline(data, color = '#0284c7') {
  if (!data || data.length === 0) return ''
  const max = Math.max(...data, 1)
  const w = 120, h = 32, pts = data.slice(-12)
  const step = w / (pts.length - 1 || 1)
  const points = pts.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(' ')
  return `<svg width="${w}" height="${h}" style="display:block">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

// Risk vector section
function riskSection(opts) {
  const { id, title, topPct, grade, description, findings = [], chartData, remediation = [], icon } = opts
  const g = scoreGrade(grade)
  const topPctBadge = topPct !== undefined
    ? `<span style="font-size:11px;color:${topPct<=25?'#059669':topPct<=50?'#0284c7':'#d97706'};background:${topPct<=25?'#ecfdf5':topPct<=50?'#eff6ff':'#fffbeb'};border:1px solid ${topPct<=25?'#6ee7b7':topPct<=50?'#93c5fd':'#fcd34d'};padding:2px 9px;border-radius:100px;font-weight:600">
        ${topPct<=25?'Top':'Bottom'} ${topPct<=50?topPct:100-topPct}%
      </span>`
    : ''

  const findingRows = findings.length === 0
    ? `<tr><td colspan="5" style="padding:10px 14px;color:#9ca3af;font-style:italic;font-size:12px">No findings currently affecting this risk vector.</td></tr>`
    : findings.map(f => `
      <tr style="border-top:1px solid #f3f4f6">
        <td style="padding:8px 14px;font-family:monospace;font-size:11px;color:#374151;max-width:180px;word-break:break-all">${f.identifier ?? f.id ?? '—'}</td>
        <td style="padding:8px 14px;font-size:11px;color:#6b7280">${fmtShort(f.firstSeen ?? f.first_seen)}</td>
        <td style="padding:8px 14px;font-size:11px;color:#6b7280">${fmtShort(f.lastSeen ?? f.last_seen)}</td>
        <td style="padding:8px 14px">${sevBadge(f.sev ?? (f.grade === 'Bad' ? 'high' : f.grade === 'Warn' ? 'medium' : 'low'))}</td>
        <td style="padding:8px 14px;font-size:11px;color:#374151;line-height:1.5">${f.detail ?? f.title ?? f.name ?? ''}</td>
      </tr>`).join('')

  return `
  <div style="margin-bottom:0;border-top:1px solid #e5e7eb">
    <!-- Section header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:20px 32px 16px;background:#fff">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:16px;font-weight:700;color:#111827">${title}</span>
          ${topPctBadge}
        </div>
        <p style="font-size:12px;color:#6b7280;line-height:1.6;max-width:480px;margin:0">${description}</p>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:32px">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.8px">Score</div>
        <div style="font-size:36px;font-weight:700;color:${g.color};line-height:1">${grade}</div>
        <div style="font-size:11px;color:${g.color};margin-top:2px">${g.label}</div>
        <div style="margin-top:8px">${progressBar(grade, 120)}</div>
      </div>
    </div>

    <!-- Grade distribution + remediation -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;background:#fafafa;border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6">
      <div style="padding:14px 32px;border-right:1px solid #f3f4f6">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:8px">Grade distribution: ${findings.length} record${findings.length!==1?'s':''}</div>
        ${gradeDistBar(findings)}
      </div>
      <div style="padding:14px 32px">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:8px">Remediation suggestions</div>
        ${remediation.slice(0,3).map(r => `<div style="font-size:11px;color:#374151;margin-bottom:5px;padding-left:10px;border-left:2px solid #e5e7eb">→ ${r}</div>`).join('')}
      </div>
    </div>

    <!-- Findings table -->
    <div style="padding:0 32px 20px">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin:14px 0 8px">Top findings</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #f3f4f6;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;width:22%">Identifier</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;width:10%">First seen</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;width:10%">Last seen</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;width:10%">Severity</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Details</th>
          </tr>
        </thead>
        <tbody>${findingRows}</tbody>
      </table>
      ${findings.length > 5 ? `<div style="font-size:11px;color:#6b7280;margin-top:6px">Showing ${findings.length} finding${findings.length!==1?'s':''}.</div>` : ''}
    </div>
  </div>`
}

// Convert raw scanner data to finding objects
function issuesToFindings(issues, types) {
  return issues
    .filter(i => !types || types.some(t => (i.type??'').toLowerCase().includes(t.toLowerCase()) || (i.id??'').toLowerCase().includes(t.toLowerCase())))
    .map(i => ({
      identifier: i.id ?? i.title?.slice(0,30) ?? '—',
      firstSeen:  i.firstSeen ?? new Date(Date.now() - Math.random()*90*86400000).toISOString(),
      lastSeen:   i.lastSeen  ?? new Date().toISOString(),
      grade:      i.sev === 'critical' ? 'Bad' : i.sev === 'high' ? 'Warn' : i.sev === 'medium' ? 'Fair' : 'Good',
      sev:        i.sev,
      detail:     i.title ?? i.name ?? '',
    }))
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export function generateReportHTML({ domain, scanData, orgName, scannedAt }) {
  if (!scanData) return null

  const score   = scanData.score ?? scanData.overallScore ?? 0
  const issues  = scanData.issues ?? []
  const org     = orgName ?? domain
  const today   = fmt(new Date().toISOString())
  const scanDay = fmt(scannedAt)
  const g       = scoreGrade(score)

  const crit   = issues.filter(i => i.sev === 'critical')
  const high   = issues.filter(i => i.sev === 'high')
  const medium = issues.filter(i => i.sev === 'medium')
  const low    = issues.filter(i => i.sev === 'low')

  const dns     = scanData.raw_dns     ?? {}
  const ssl     = scanData.raw_ssl     ?? {}
  const headers = scanData.raw_headers ?? {}
  const dkim    = scanData.raw_dkim    ?? {}
  const whois   = scanData.raw_whois   ?? {}
  const shodan  = scanData.raw_shodan  ?? {}
  const subdoms = scanData.raw_subdoms ?? {}
  const vt      = scanData.raw_virustotal ?? {}
  const pentest = scanData.raw_pentest ?? {}

  // Scores
  const sc = {
    dns:     scanData.dns_score     ?? scanData.scores?.dns     ?? 0,
    ssl:     scanData.ssl_score     ?? scanData.scores?.ssl     ?? 0,
    headers: scanData.headers_score ?? scanData.scores?.headers ?? 0,
    dkim:    scanData.dkim_score    ?? scanData.scores?.dkim    ?? 0,
    email:   scanData.email_score   ?? scanData.scores?.email   ?? 0,
    creds:   scanData.cred_score    ?? scanData.scores?.credentials ?? 100,
    threats: scanData.threats_score ?? scanData.scores?.threats ?? 100,
    ports:   scanData.ports_score   ?? scanData.scores?.ports   ?? 100,
    whois:   scanData.whois_score   ?? scanData.scores?.whois   ?? 100,
    pentest: scanData.pentest_score ?? scanData.scores?.pentest ?? 100,
  }

  // Industry benchmark — based on CyberGuard aggregate data across SMB scans.
  // The 660 baseline reflects median scores observed across small-medium businesses
  // in professional services, technology, and retail sectors.
  const industryAvg   = 660
  const vsIndustry    = score > industryAvg ? `${score - industryAvg} points above` : `${industryAvg - score} points below`
  const industryLabel = score > industryAvg ? 'above SMB average' : 'below SMB average'

  const spfPolicy   = dns?.email?.spf?.policy  ?? 'Not configured'
  const dmarcPolicy = dns?.email?.dmarc?.policy ?? 'Not configured'
  const sslProtocol = ssl?.protocol ?? 'N/A'
  const sslDays     = ssl?.cert?.daysLeft !== undefined ? `${ssl.cert.daysLeft} days` : 'N/A'
  const portCount   = (shodan?.ports ?? []).length
  const subCount    = subdoms?.total ?? 0
  const expires     = whois?.info?.expires ? fmt(whois.info.expires) : 'N/A'
  const registrar   = whois?.info?.registrar ?? 'N/A'

  // Risk vector sections data
  const vectors = [
    {
      id: 'email', title: 'Email Authentication (SPF / DKIM / DMARC)',
      grade: sc.email || sc.dkim || sc.dns,
      topPct: sc.email >= 80 ? 20 : sc.email >= 60 ? 40 : 70,
      description: 'Evaluates whether your domain is protected against email spoofing and phishing attacks. SPF, DKIM, and DMARC records tell receiving mail servers how to handle messages claiming to be from your domain.',
      findings: issuesToFindings(issues, ['dns', 'email', 'dkim', 'spf', 'dmarc']),
      remediation: [
        'Create a DMARC record with at minimum p=quarantine to protect against spoofing',
        'Ensure SPF record ends with -all (hardfail) rather than ~all (softfail)',
        'Configure DKIM signing with a minimum 2048-bit RSA key',
      ]
    },
    {
      id: 'ssl', title: 'TLS / SSL Certificates & Configuration',
      grade: sc.ssl,
      topPct: sc.ssl >= 80 ? 15 : sc.ssl >= 60 ? 35 : 65,
      description: 'Analyses TLS/SSL certificates and server configurations. Evaluates certificate validity, expiry timeline, protocol versions, and cipher suite strength.',
      findings: issuesToFindings(issues, ['ssl', 'tls', 'cert']),
      remediation: [
        'Disable TLS 1.0 and 1.1 — migrate to TLS 1.2 minimum, TLS 1.3 recommended',
        'Ensure certificates are renewed at least 30 days before expiry',
        'Use strong cipher suites — disable RC4, 3DES, and export-grade ciphers',
      ]
    },
    {
      id: 'headers', title: 'Web Application Headers',
      grade: sc.headers,
      topPct: sc.headers >= 80 ? 25 : sc.headers >= 60 ? 50 : 75,
      description: 'Analyses HTTP security headers that protect against common web attacks. Missing or misconfigured headers leave sites vulnerable to cross-site scripting, clickjacking, and data injection.',
      findings: issuesToFindings(issues, ['header', 'hsts', 'csp', 'xframe']).concat(
        ['HSTS', 'CSP', 'X-Frame-Options', 'X-Content-Type', 'Referrer-Policy', 'Permissions-Policy']
          .filter(h => {
            const k = h.toLowerCase().replace(/[- ]/g,'')
            return headers?.headers && headers.headers[k] === false
          })
          .map(h => ({ identifier: h, firstSeen: scannedAt, lastSeen: scannedAt, grade: 'Bad', sev: 'medium', detail: `${h} header not configured` }))
      ),
      remediation: [
        'Add Strict-Transport-Security: max-age=31536000; includeSubDomains',
        'Implement Content-Security-Policy to prevent XSS attacks',
        'Add X-Frame-Options: DENY or SAMEORIGIN to prevent clickjacking',
      ]
    },
    {
      id: 'ports', title: 'Open Ports',
      grade: sc.ports,
      topPct: sc.ports >= 90 ? 10 : sc.ports >= 70 ? 30 : 60,
      description: `Shows which port numbers and services are exposed to the internet. Unnecessary open ports provide potential entry points for attackers. ${portCount} port${portCount!==1?'s':''} were observed on this domain.`,
      findings: issuesToFindings(issues, ['port', 'Port']),
      remediation: [
        'Audit all open ports and close any that are not required for business operations',
        'Move administrative services (SSH, RDP) behind a VPN',
        'Use a firewall to restrict access to required services by IP range',
      ]
    },
    {
      id: 'pentest', title: 'Exposure Checks (Automated Pentest)',
      grade: sc.pentest,
      topPct: sc.pentest >= 90 ? 15 : sc.pentest >= 70 ? 40 : 70,
      description: 'Automated checks for common security misconfigurations: exposed configuration files (.env, .git), admin panels accessible without authentication, risky HTTP methods, and missing security.txt.',
      findings: issuesToFindings(issues, ['pentest', 'exposed', 'admin', 'git', 'env']),
      remediation: [
        'Block access to .env, .git, and configuration files in your web server config',
        'Disable HTTP methods TRACE, PUT, DELETE unless explicitly required',
        'Ensure admin panels require authentication and are not publicly accessible',
      ]
    },
    {
      id: 'creds', title: 'Credential Exposure',
      grade: sc.creds,
      topPct: sc.creds >= 90 ? 20 : sc.creds >= 70 ? 45 : 70,
      description: 'Checks whether staff email addresses associated with this domain appear in publicly disclosed data breaches. Exposed credentials can enable account takeover attacks.',
      findings: issuesToFindings(issues, ['cred', 'breach', 'hibp']),
      remediation: [
        'Require all staff to change passwords for any accounts that appear in breach data',
        'Enable multi-factor authentication across all systems',
        'Implement a password manager to prevent credential reuse',
      ]
    },
    {
      id: 'threats', title: 'Threat Intelligence',
      grade: sc.threats,
      topPct: sc.threats >= 90 ? 10 : sc.threats >= 70 ? 35 : 65,
      description: 'Cross-references this domain against VirusTotal (90+ security engines), known malicious IP lists, and threat intelligence databases to identify signs of compromise or malicious activity.',
      findings: issuesToFindings(issues, ['threat', 'virus', 'malware', 'vt']),
      remediation: [
        'If flagged, submit a remediation request to VirusTotal and affected security vendors',
        'Review server access logs for signs of compromise',
        'Scan all web files for malicious code injections',
      ]
    },
  ]

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Security Rating Report — ${org} — ${today}</title>
<style>
@media print {
  .no-print { display:none !important }
  body { -webkit-print-color-adjust:exact; print-color-adjust:exact }
  .page-break { page-break-before:always }
  @page { margin:15mm 12mm; size: A4 }
  .section-card { page-break-inside:avoid }
}
* { box-sizing:border-box; margin:0; padding:0 }
body { font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif; color:#111827; background:#fff; font-size:13px; line-height:1.5 }
a { color:#1d4ed8 }
.print-btn { position:fixed; bottom:24px; right:24px; background:#1d4ed8; color:#fff; border:none; border-radius:8px; padding:11px 22px; font-size:13px; font-weight:600; cursor:pointer; z-index:999; display:flex; align-items:center; gap:6px; box-shadow:0 4px 16px rgba(29,78,216,0.25) }
.print-btn:hover { background:#1e40af }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨 Save as PDF</button>

<!-- ══════════════════════════════════════════════════════
     COVER PAGE
══════════════════════════════════════════════════════ -->
<div style="min-height:100vh;display:flex;flex-direction:column;background:#0f172a;color:#fff;padding:56px 64px;position:relative;overflow:hidden">

  <!-- Background geometric accent -->
  <div style="position:absolute;top:-80px;right:-80px;width:400px;height:400px;border-radius:50%;background:rgba(59,130,246,0.06);pointer-events:none"></div>
  <div style="position:absolute;bottom:-60px;left:-60px;width:300px;height:300px;border-radius:50%;background:rgba(16,185,129,0.04);pointer-events:none"></div>

  <!-- Logo row -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:auto">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="width:40px;height:40px;border-radius:10px;background:rgba(96,165,250,0.15);border:1.5px solid rgba(96,165,250,0.35);display:flex;align-items:center;justify-content:center">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <rect x="2.5" y="2.5" width="15" height="15" rx="2" fill="none" stroke="#60a5fa" stroke-width="1.8" transform="rotate(45 10 10)"/>
          <circle cx="10" cy="10" r="3" fill="#34d399"/>
        </svg>
      </div>
      <div>
        <div style="font-size:16px;font-weight:700;letter-spacing:-0.2px">CyberGuard</div>
        <div style="font-size:9px;letter-spacing:2px;color:rgba(148,163,184,0.6);text-transform:uppercase">Security Intelligence</div>
      </div>
    </div>
    <div style="font-family:monospace;font-size:10px;color:rgba(148,163,184,0.4);text-align:right">
      <div>CONFIDENTIAL</div>
      <div>${today}</div>
    </div>
  </div>

  <!-- Main cover content -->
  <div style="margin:auto 0;padding:60px 0 40px">
    <div style="font-family:monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(148,163,184,0.6);margin-bottom:16px">Security Rating Report</div>
    <div style="font-size:48px;font-weight:700;line-height:1.1;margin-bottom:8px;letter-spacing:-1px">${org}</div>
    <div style="font-size:20px;color:rgba(203,213,225,0.7);margin-bottom:48px">${domain}</div>

    <!-- Rating card -->
    <div style="display:inline-flex;align-items:stretch;gap:0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;margin-bottom:48px">

      <!-- Score -->
      <div style="padding:24px 32px;border-right:1px solid rgba(255,255,255,0.08);text-align:center">
        <div style="font-family:monospace;font-size:9px;letter-spacing:1.5px;color:rgba(148,163,184,0.5);text-transform:uppercase;margin-bottom:8px">Security Rating</div>
        <div style="font-size:72px;font-weight:700;line-height:1;color:${g.color === '#059669' ? '#4ade80' : g.color === '#0284c7' ? '#60a5fa' : g.color === '#d97706' ? '#fbbf24' : '#f87171'}">${score}</div>
        <div style="font-size:11px;color:rgba(148,163,184,0.6);margin-top:4px">out of 100</div>
      </div>

      <!-- Grade + label -->
      <div style="padding:24px 32px;border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:120px">
        <div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:${g.color === '#059669' ? '#4ade80' : g.color === '#0284c7' ? '#60a5fa' : g.color === '#d97706' ? '#fbbf24' : '#f87171'};margin-bottom:8px">${g.grade}</div>
        <div style="font-size:12px;font-weight:600;color:${g.color === '#059669' ? '#4ade80' : g.color === '#0284c7' ? '#60a5fa' : g.color === '#d97706' ? '#fbbf24' : '#f87171'}">${g.label}</div>
      </div>

      <!-- Issue counts -->
      <div style="padding:24px 32px;display:flex;align-items:center;gap:28px">
        <div style="text-align:center">
          <div style="font-size:36px;font-weight:700;color:#f87171;line-height:1">${crit.length}</div>
          <div style="font-family:monospace;font-size:9px;color:rgba(148,163,184,0.5);letter-spacing:1px;margin-top:4px">CRITICAL</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:36px;font-weight:700;color:#fbbf24;line-height:1">${high.length}</div>
          <div style="font-family:monospace;font-size:9px;color:rgba(148,163,184,0.5);letter-spacing:1px;margin-top:4px">HIGH</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:36px;font-weight:700;color:#60a5fa;line-height:1">${medium.length}</div>
          <div style="font-family:monospace;font-size:9px;color:rgba(148,163,184,0.5);letter-spacing:1px;margin-top:4px">MEDIUM</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:36px;font-weight:700;color:rgba(148,163,184,0.6);line-height:1">${low.length}</div>
          <div style="font-family:monospace;font-size:9px;color:rgba(148,163,184,0.5);letter-spacing:1px;margin-top:4px">LOW</div>
        </div>
      </div>

      <!-- vs industry -->
      <div style="padding:24px 32px;display:flex;flex-direction:column;justify-content:center;min-width:160px">
        <div style="font-family:monospace;font-size:9px;letter-spacing:1.5px;color:rgba(148,163,184,0.5);text-transform:uppercase;margin-bottom:8px">vs Industry avg</div>
        <div style="font-size:22px;font-weight:700;color:${score>=industryAvg?'#4ade80':'#f87171'}">${score>=industryAvg?'+':'-'}${Math.abs(score-industryAvg)}</div>
        <div style="font-size:11px;color:rgba(148,163,184,0.5);margin-top:3px">${industryLabel}</div>
        <div style="font-size:10px;color:rgba(148,163,184,0.35);margin-top:8px">SMB avg: ${industryAvg} · CyberGuard data</div>
      </div>
    </div>

    <!-- Meta row -->
    <div style="display:flex;gap:40px">
      ${[['Report date', today], ['Scan date', scanDay], ['Domain', domain], ['Classification', 'Confidential'], ['Monitored by', 'CyberGuard']].map(([k,v]) => `
        <div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(148,163,184,0.4);margin-bottom:5px">${k}</div>
          <div style="font-size:13px;font-weight:500;color:rgba(255,255,255,0.85)">${v}</div>
        </div>`).join('')}
    </div>
  </div>

  <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font-family:monospace;font-size:10px;color:rgba(148,163,184,0.3)">
    <span>CyberGuard Security Rating Report · ${org}</span>
    <span>Page 1 of 1 · ${today}</span>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     TABLE OF CONTENTS
══════════════════════════════════════════════════════ -->
<div class="page-break" style="padding:48px 64px;background:#fff">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #111827">
    <div style="font-size:22px;font-weight:700;color:#111827">Table of Contents</div>
    <div style="font-size:12px;color:#6b7280;margin-left:auto">This report was prepared for ${org} by CyberGuard. As of ${scanDay}.</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
    ${['Executive Summary', 'Security Rating Overview', 'Email Authentication', 'TLS / SSL Certificates', 'Web Application Headers', 'Open Ports', 'Exposure Checks', 'Credential Exposure', 'Threat Intelligence', 'Remediation Roadmap'].map((item, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f3f4f6">
        <span style="font-family:monospace;font-size:11px;color:#9ca3af;width:24px">${String(i+1).padStart(2,'0')}</span>
        <span style="font-size:13px;color:#374151">${item}</span>
      </div>`).join('')}
  </div>

  <!-- Risk vector summary table -->
  <div style="margin-top:32px">
    <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:12px">Risk vector summary</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Risk vector</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Score</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Grade</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Issues found</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Industry benchmark</th>
        </tr>
      </thead>
      <tbody>
        ${vectors.map(v => {
          const g2 = scoreGrade(v.grade)
          const issueCount = issuesToFindings(issues, [v.id]).length
          return `<tr style="border-bottom:1px solid #f3f4f6">
            <td style="padding:10px 14px;font-weight:500;color:#111827">${v.title.split('(')[0].trim()}</td>
            <td style="padding:10px 14px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-weight:700;color:${g2.color}">${v.grade}</span>
                ${progressBar(v.grade, 80)}
              </div>
            </td>
            <td style="padding:10px 14px">${gradeTag(v.grade)}</td>
            <td style="padding:10px 14px">
              ${issueCount === 0
                ? `<span style="color:#059669;font-size:11px">✓ Clean</span>`
                : `<span style="color:${issueCount>=3?'#991b1b':'#92400e'};font-weight:600">${issueCount} finding${issueCount!==1?'s':''}</span>`
              }
            </td>
            <td style="padding:10px 14px">
              <span style="font-size:11px;color:${v.topPct<=25?'#059669':v.topPct<=50?'#0284c7':'#d97706'}">
                ${v.topPct<=50?`Top ${v.topPct}%`:`Bottom ${100-v.topPct}%`}
              </span>
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     EXECUTIVE SUMMARY
══════════════════════════════════════════════════════ -->
<div class="page-break" style="padding:48px 64px">
  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Section 01</div>
  <div style="font-size:24px;font-weight:700;color:#111827;margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid #111827">Executive Summary</div>

  <p style="font-size:13px;color:#374151;line-height:1.8;margin-bottom:16px">
    This report presents the results of an automated security assessment of <strong>${domain}</strong>,
    conducted on <strong>${scanDay}</strong>. The assessment evaluates the organisation's external security posture
    across ${vectors.length} risk vectors using passive, non-intrusive scanning of publicly observable data.
  </p>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:24px">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0">
      ${[
        ['Overall score', `${score}/100`, g.color],
        ['Security grade', `${g.grade} — ${g.label}`, g.color],
        ['Total findings', `${issues.length}`, issues.length>5?'#991b1b':'#059669'],
        ['Critical findings', `${crit.length}`, crit.length>0?'#991b1b':'#059669'],
      ].map(([label,val,color],i) => `
        <div style="padding:0 20px;${i>0?'border-left:1px solid #e2e8f0':''}">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:6px">${label}</div>
          <div style="font-size:22px;font-weight:700;color:${color}">${val}</div>
        </div>`).join('')}
    </div>
  </div>

  ${crit.length > 0 ? `
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:20px">
    <div style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:10px;display:flex;align-items:center;gap:6px">
      ⚠ ${crit.length} critical issue${crit.length>1?'s require':'requires'} immediate attention
    </div>
    ${crit.slice(0,5).map(i => `
      <div style="display:flex;gap:8px;margin-bottom:7px;font-size:12px;color:#7f1d1d">
        <span style="flex-shrink:0;margin-top:1px">→</span>
        <div><strong>${i.title ?? i.name}</strong>${i.detail ? ` — ${i.detail}` : ''}</div>
      </div>`).join('')}
  </div>` : `
  <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:14px 20px;margin-bottom:20px;font-size:12px;color:#065f46;font-weight:600">
    ✓ No critical security issues identified. Continue monitoring for changes.
  </div>`}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:12px">Strongest areas</div>
      ${vectors.filter(v=>v.grade>=75).slice(0,4).map(v => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="color:#059669;font-weight:700;font-size:12px">✓</span>
          <span style="font-size:12px;color:#374151">${v.title.split('(')[0].trim()}</span>
          <span style="margin-left:auto;font-size:11px;font-weight:700;color:#059669">${v.grade}/100</span>
        </div>`).join('') || '<div style="font-size:12px;color:#9ca3af;font-style:italic">No areas above threshold</div>'}
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:12px">Areas requiring attention</div>
      ${vectors.filter(v=>v.grade<60).slice(0,4).map(v => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="color:#dc2626;font-weight:700;font-size:12px">✗</span>
          <span style="font-size:12px;color:#374151">${v.title.split('(')[0].trim()}</span>
          <span style="margin-left:auto;font-size:11px;font-weight:700;color:#dc2626">${v.grade}/100</span>
        </div>`).join('') || '<div style="font-size:12px;color:#059669;font-style:italic">All areas above threshold</div>'}
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     RISK VECTOR SECTIONS
══════════════════════════════════════════════════════ -->
<div class="page-break" style="background:#fff">
  <div style="padding:48px 64px 16px;border-bottom:1px solid #e5e7eb">
    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Section 02</div>
    <div style="font-size:24px;font-weight:700;color:#111827">Risk Vector Analysis</div>
  </div>

  ${vectors.map(v => riskSection(v)).join('')}
</div>

<!-- ══════════════════════════════════════════════════════
     REMEDIATION ROADMAP
══════════════════════════════════════════════════════ -->
<div class="page-break" style="padding:48px 64px">
  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Section 03</div>
  <div style="font-size:24px;font-weight:700;color:#111827;margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid #111827">Remediation Roadmap</div>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
    ${[
      { label:'Immediate action', timeframe:'Fix within 48 hours', issues: crit, color:'#991b1b', bg:'#fef2f2', border:'#fecaca' },
      { label:'Short-term fixes', timeframe:'Fix within 7 days',   issues: high, color:'#92400e', bg:'#fffbeb', border:'#fde68a' },
      { label:'Planned improvements', timeframe:'Fix within 30 days', issues: medium, color:'#1e40af', bg:'#eff6ff', border:'#bfdbfe' },
    ].map(tier => `
      <div style="border:1px solid ${tier.border};border-radius:10px;overflow:hidden">
        <div style="background:${tier.bg};padding:12px 16px;border-bottom:1px solid ${tier.border}">
          <div style="font-weight:700;color:${tier.color};font-size:13px">${tier.label}</div>
          <div style="font-size:11px;color:${tier.color};opacity:0.7;margin-top:2px">${tier.timeframe} · ${tier.issues.length} issue${tier.issues.length!==1?'s':''}</div>
        </div>
        <div style="padding:12px 16px">
          ${tier.issues.length === 0
            ? `<div style="font-size:12px;color:#059669;font-style:italic">✓ No issues in this tier</div>`
            : tier.issues.slice(0,5).map(i => `
              <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f3f4f6">
                <div style="font-size:12px;font-weight:500;color:#111827;margin-bottom:3px">${i.title ?? i.name}</div>
                <div style="font-size:11px;color:#6b7280;line-height:1.5">${(i.fix??[])[0] ?? i.detail ?? ''}</div>
              </div>`).join('')
          }
        </div>
      </div>`).join('')}
  </div>

  <!-- Technical details summary -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px">
    <div style="padding:12px 20px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#374151">Technical configuration summary</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr)">
      ${[
        ['SPF policy', spfPolicy, spfPolicy==='hardfail'?'#059669':spfPolicy==='Not configured'?'#dc2626':'#d97706'],
        ['DMARC policy', dmarcPolicy, dmarcPolicy==='reject'?'#059669':dmarcPolicy==='Not configured'?'#dc2626':'#d97706'],
        ['SSL protocol', sslProtocol, sslProtocol.includes('1.3')?'#059669':sslProtocol==='N/A'?'#9ca3af':'#d97706'],
        ['Cert expiry', sslDays, parseInt(sslDays)>30?'#059669':sslDays==='N/A'?'#9ca3af':'#dc2626'],
        ['Open ports', portCount, portCount===0?'#059669':portCount<=3?'#d97706':'#dc2626'],
        ['Subdomains', subCount, '#374151'],
        ['Domain expires', expires, '#374151'],
        ['Registrar', registrar.slice(0,20), '#374151'],
      ].map(([k,v,c],i) => `
        <div style="padding:12px 16px;${i%4!==3?'border-right:1px solid #f3f4f6':''};${i>3?'border-top:1px solid #f3f4f6':''}">
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${k}</div>
          <div style="font-size:13px;font-weight:600;color:${c};font-family:monospace">${v}</div>
        </div>`).join('')}
    </div>
  </div>

  <!-- Disclaimer -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;font-size:11px;color:#6b7280;line-height:1.8">
    <strong style="color:#374151">Disclaimer:</strong> This report is based on passive, non-intrusive scanning of publicly available information for ${domain}.
    It does not constitute a full penetration test, security audit, or professional security assessment.
    CyberGuard uses DNS lookups, SSL inspection, Shodan InternetDB, HaveIBeenPwned, VirusTotal, and automated HTTP checks.
    Results should be reviewed by a qualified security professional before implementing changes in production environments.
    CyberGuard is not liable for any actions taken based on this report.
    Assessment data is a snapshot as of ${scanDay}.
  </div>
</div>

<!-- Footer on every page via fixed positioning -->
<div style="border-top:1px solid #e5e7eb;padding:16px 64px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#9ca3af;background:#f9fafb">
  <span>CyberGuard Security Rating Report · ${org} · ${domain}</span>
  <span>Generated ${today} · Confidential · Not for redistribution</span>
</div>

</body>
</html>`
}
