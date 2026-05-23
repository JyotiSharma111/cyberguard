/**
 * Document Generator — creates professional PDF-quality HTML documents.
 * Incident Response Plan + Acceptable Use Policy.
 * Auto-filled with customer's org name, domain, contacts.
 */

function fmt(iso) {
  return new Date(iso ?? Date.now()).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
}

const CSS = `
  @media print { .no-print{display:none!important} @page{margin:20mm 15mm} body{-webkit-print-color-adjust:exact;print-color-adjust:exact} }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#1a1a1a;background:#fff;font-size:13px;line-height:1.6}
  .print-btn{position:fixed;bottom:24px;right:24px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;padding:12px 24px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(29,78,216,0.3);z-index:999}
  .header{background:#0f172a;color:#fff;padding:40px 56px 32px}
  .header-logo{display:flex;align-items:center;gap:10px;margin-bottom:24px}
  .logo-mark{width:36px;height:36px;border-radius:9px;background:rgba(96,165,250,0.2);border:1.5px solid rgba(96,165,250,0.4);display:flex;align-items:center;justify-content:center}
  .doc-type{font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(148,163,184,0.8);margin-bottom:10px}
  .doc-title{font-size:32px;font-weight:700;margin-bottom:8px}
  .doc-sub{color:rgba(203,213,225,0.7);font-size:15px;margin-bottom:24px}
  .doc-meta{display:flex;gap:32px;font-size:12px}
  .doc-meta span{color:rgba(148,163,184,0.6)} .doc-meta strong{color:rgba(255,255,255,0.85);display:block;margin-top:2px}
  .content{max-width:860px;margin:0 auto;padding:40px 56px}
  h2{font-size:18px;font-weight:700;color:#111;margin:36px 0 14px;padding:10px 16px;background:#f8fafc;border-left:4px solid #1d4ed8;border-radius:0 6px 6px 0}
  h3{font-size:14px;font-weight:600;color:#1d4ed8;margin:20px 0 8px}
  p{margin-bottom:12px;color:#374151}
  ul,ol{margin:8px 0 14px 20px} li{margin-bottom:6px;color:#374151}
  table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px} th{background:#f1f5f9;padding:9px 12px;text-align:left;font-weight:600;color:#374151;border:1px solid #e2e8f0} td{padding:9px 12px;border:1px solid #e2e8f0;vertical-align:top}
  .highlight-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin:14px 0}
  .warning-box{background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;margin:14px 0}
  .severity-critical{color:#dc2626;font-weight:600} .severity-high{color:#d97706;font-weight:600} .severity-medium{color:#2563eb;font-weight:600}
  .footer{border-top:1px solid #e5e7eb;padding:18px 56px;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;background:#f9fafb}
  .signature-line{border-bottom:1px solid #374151;width:220px;height:40px;margin:20px 0 5px} .sig-label{font-size:11px;color:#6b7280}
  .toc{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:20px 0}
  .toc h3{margin-top:0} .toc li{margin-bottom:4px} .toc a{color:#1d4ed8;text-decoration:none}
`

export function generateIRP({ orgName, domain, contactName, contactEmail, contactPhone }) {
  const org     = orgName ?? domain
  const today   = fmt(new Date().toISOString())
  const contact = contactName ?? 'Security Contact'
  const email   = contactEmail ?? `security@${domain}`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Incident Response Plan — ${org}</title><style>${CSS}</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨 Save as PDF</button>

<div class="header">
  <div class="header-logo">
    <div class="logo-mark"><svg width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="2" width="14" height="14" rx="2" fill="none" stroke="#60a5fa" stroke-width="1.5" transform="rotate(45 9 9)"/><circle cx="9" cy="9" r="3" fill="#34d399"/></svg></div>
    <div style="font-size:15px;font-weight:700;color:#fff">CyberGuard</div>
  </div>
  <div class="doc-type">Incident Response Plan</div>
  <div class="doc-title">${org}</div>
  <div class="doc-sub">Cybersecurity Incident Response Plan · ${domain}</div>
  <div class="doc-meta">
    <div><span>Document date</span><strong>${today}</strong></div>
    <div><span>Document owner</span><strong>${contact}</strong></div>
    <div><span>Review cycle</span><strong>Annual</strong></div>
    <div><span>Classification</span><strong>Confidential</strong></div>
  </div>
</div>

<div class="content">

<div class="toc">
  <h3>Contents</h3>
  <ol>
    <li>Purpose and scope</li><li>Incident classification</li><li>Response team</li>
    <li>Detection and reporting</li><li>Response procedures by incident type</li>
    <li>Communication plan</li><li>Post-incident review</li><li>Contact directory</li>
  </ol>
</div>

<h2>1. Purpose and Scope</h2>
<p>This Incident Response Plan (IRP) defines the procedures ${org} will follow to detect, contain, eradicate, and recover from cybersecurity incidents affecting our systems, data, and operations.</p>
<p>This plan applies to all IT systems, cloud services, user accounts, and data assets operated by or on behalf of ${org}, including the domain <strong>${domain}</strong> and all associated services.</p>
<div class="highlight-box"><strong>Objective:</strong> Minimise the impact of security incidents, protect sensitive data, maintain regulatory compliance, and restore normal operations as quickly as possible.</div>

<h2>2. Incident Classification</h2>
<table>
  <tr><th>Severity</th><th>Description</th><th>Examples</th><th>Response time</th></tr>
  <tr><td class="severity-critical">P1 — Critical</td><td>Active attack, data breach, ransomware, full system compromise</td><td>Ransomware deployed, data exfiltration, admin account takeover</td><td>Immediate — within 1 hour</td></tr>
  <tr><td class="severity-high">P2 — High</td><td>Significant threat, likely impact to operations or data</td><td>Phishing click with credential entry, suspicious admin activity, malware detected</td><td>Within 4 hours</td></tr>
  <tr><td class="severity-medium">P3 — Medium</td><td>Potential threat, limited impact</td><td>Failed brute force, suspicious email, policy violation</td><td>Within 24 hours</td></tr>
  <tr><td>P4 — Low</td><td>Minor issue, no immediate risk</td><td>Phishing email blocked, expired certificate, misconfiguration</td><td>Within 72 hours</td></tr>
</table>

<h2>3. Incident Response Team</h2>
<table>
  <tr><th>Role</th><th>Name</th><th>Contact</th><th>Responsibility</th></tr>
  <tr><td>Incident Commander</td><td>${contact}</td><td>${email}</td><td>Oversee response, make decisions, communicate with leadership</td></tr>
  <tr><td>Technical Lead</td><td>${contact}</td><td>${email}</td><td>Investigate, contain, and eradicate the threat</td></tr>
  <tr><td>Communications Lead</td><td>[Add name]</td><td>[Add contact]</td><td>Internal and external communications</td></tr>
  <tr><td>Legal / Compliance</td><td>[Add name]</td><td>[Add contact]</td><td>Regulatory notifications, legal advice</td></tr>
</table>

<h2>4. Detection and Reporting</h2>
<h3>Automated detection (CyberGuard)</h3>
<p>CyberGuard monitors <strong>${domain}</strong> continuously and sends immediate alerts for: score drops, SSL expiry, DMARC degradation, credential breaches, M365 sign-in anomalies, suspicious inbox rules, and cloud misconfigurations.</p>
<h3>Manual reporting</h3>
<p>Staff should report suspected incidents immediately to <strong>${email}</strong>. Reporting a suspected incident is always the right action — there is no penalty for false alarms.</p>
<div class="warning-box"><strong>Never:</strong> Try to fix an active incident alone, share details on public channels, pay a ransom without executive approval, or delete logs thinking it helps.</div>

<h2>5. Response Procedures</h2>
<h3>5.1 Ransomware</h3>
<ol>
  <li>Immediately disconnect affected machines from the network (unplug ethernet / disable Wi-Fi)</li>
  <li>Do NOT turn off the machine — forensic data is in memory</li>
  <li>Photograph the ransom note with a phone camera</li>
  <li>Contact your cyber insurance provider immediately</li>
  <li>Report to Action Fraud (UK: 0300 123 2040) or FBI IC3 (US)</li>
  <li>Engage a qualified incident response firm before making any payment decisions</li>
  <li>Restore from clean offline backups once the threat is contained</li>
</ol>
<h3>5.2 Account Takeover / Phishing</h3>
<ol>
  <li>Immediately reset the compromised account password from a clean device</li>
  <li>Revoke all active sessions: M365 → Azure AD → User → Revoke sessions</li>
  <li>Enable MFA if not already active</li>
  <li>Check inbox rules for external forwarding (CyberGuard M365 anomaly scanner does this automatically)</li>
  <li>Review sent emails in the last 72 hours for any emails sent by the attacker</li>
  <li>Notify anyone the attacker may have emailed posing as the compromised user</li>
</ol>
<h3>5.3 Data Breach</h3>
<ol>
  <li>Identify what data was accessed and when</li>
  <li>Contain: change credentials, revoke API keys, close the vulnerability</li>
  <li>UK GDPR: notify ICO within 72 hours if personal data was involved (ico.org.uk)</li>
  <li>US: follow state-specific breach notification laws (most require 30–90 days)</li>
  <li>Notify affected individuals if high risk to their rights and freedoms</li>
  <li>Document everything — regulators will ask for a detailed timeline</li>
</ol>
<h3>5.4 DDoS Attack</h3>
<ol>
  <li>Enable Cloudflare "Under Attack" mode if using Cloudflare</li>
  <li>Contact your hosting provider — they have DDoS mitigation tools</li>
  <li>Enable rate limiting on critical endpoints</li>
  <li>Most DDoS attacks last less than 24 hours — document and wait if impact is limited</li>
</ol>

<h2>6. Communication Plan</h2>
<table>
  <tr><th>Audience</th><th>When</th><th>Channel</th><th>What to say</th></tr>
  <tr><td>Internal staff</td><td>Within 2 hours of P1/P2</td><td>Email / Teams</td><td>"We are investigating a security incident. Do not use [affected system] until further notice."</td></tr>
  <tr><td>Customers</td><td>Within 24 hours if data affected</td><td>Email</td><td>What happened, what data was affected, what you are doing, what they should do</td></tr>
  <tr><td>Regulator (ICO)</td><td>Within 72 hours if personal data</td><td>ico.org.uk portal</td><td>Nature of breach, categories of data, approximate numbers, likely consequences, measures taken</td></tr>
  <tr><td>Cyber insurance</td><td>Immediately for P1</td><td>Phone</td><td>Nature of incident — they may direct the response</td></tr>
</table>

<h2>7. Post-Incident Review</h2>
<p>Within 5 business days of containment, conduct a post-incident review to capture:</p>
<ul>
  <li>Root cause — how did this happen?</li>
  <li>Timeline — when was it first introduced, when detected, when contained?</li>
  <li>Impact — what data, systems, or operations were affected?</li>
  <li>What worked — what detection/response went well?</li>
  <li>Improvements — what would have prevented this or reduced impact?</li>
  <li>Actions — specific changes to implement before next review</li>
</ul>
<p>Document findings in the CyberGuard incident log and update this IRP accordingly.</p>

<h2>8. Contact Directory</h2>
<table>
  <tr><th>Organisation</th><th>Contact</th><th>When to call</th></tr>
  <tr><td>Internal security contact</td><td>${email}${contactPhone ? ` · ${contactPhone}` : ''}</td><td>All incidents</td></tr>
  <tr><td>Cyber insurance</td><td>[Add your insurer + policy number]</td><td>P1 incidents immediately</td></tr>
  <tr><td>Action Fraud (UK)</td><td>0300 123 2040 · actionfraud.police.uk</td><td>All cybercrime incidents</td></tr>
  <tr><td>ICO (UK data breaches)</td><td>0303 123 1113 · ico.org.uk</td><td>Within 72 hours of personal data breach</td></tr>
  <tr><td>NCSC (serious incidents)</td><td>ncsc.gov.uk/report</td><td>Critical national infrastructure or significant impact</td></tr>
  <tr><td>Microsoft Support</td><td>support.microsoft.com</td><td>M365 account compromise</td></tr>
  <tr><td>Your hosting provider</td><td>[Add contact]</td><td>Server compromise, DDoS</td></tr>
</table>

<br/><br/>
<p><strong>Document approved by:</strong></p>
<div class="signature-line"></div>
<div class="sig-label">${contact} · ${org} · ${today}</div>

</div>
<div class="footer">
  <span>${org} — Incident Response Plan · Confidential</span>
  <span>Generated by CyberGuard · ${today} · Review annually</span>
</div>
</body></html>`
}

export function generateAUP({ orgName, domain, contactName, contactEmail }) {
  const org   = orgName ?? domain
  const today = fmt(new Date().toISOString())

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Acceptable Use Policy — ${org}</title><style>${CSS}</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨 Save as PDF</button>

<div class="header">
  <div class="header-logo">
    <div class="logo-mark"><svg width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="2" width="14" height="14" rx="2" fill="none" stroke="#60a5fa" stroke-width="1.5" transform="rotate(45 9 9)"/><circle cx="9" cy="9" r="3" fill="#34d399"/></svg></div>
    <div style="font-size:15px;font-weight:700;color:#fff">CyberGuard</div>
  </div>
  <div class="doc-type">Policy Document</div>
  <div class="doc-title">${org}</div>
  <div class="doc-sub">Technology Acceptable Use Policy</div>
  <div class="doc-meta">
    <div><span>Effective date</span><strong>${today}</strong></div>
    <div><span>Policy owner</span><strong>${contactName ?? org}</strong></div>
    <div><span>Review cycle</span><strong>Annual</strong></div>
    <div><span>Applies to</span><strong>All staff and contractors</strong></div>
  </div>
</div>

<div class="content">

<h2>1. Purpose</h2>
<p>This Acceptable Use Policy (AUP) defines acceptable and unacceptable use of ${org}'s technology resources, including computers, mobile devices, email, internet access, cloud services, and any tools used in connection with work at ${org}.</p>
<p>The purpose is to protect ${org}, its staff, and its customers from security risks, legal liability, and reputational harm that can arise from inappropriate use of technology.</p>

<h2>2. Scope</h2>
<p>This policy applies to all employees, contractors, consultants, and any person accessing ${org} systems or data, whether on-site or remotely. It covers all devices used for work purposes, including personally-owned devices (BYOD).</p>

<h2>3. Password and Account Security</h2>
<ul>
  <li>Use a unique, strong password for every work account (minimum 12 characters, mix of letters, numbers, symbols)</li>
  <li>Never share passwords with colleagues, even temporarily</li>
  <li>Enable multi-factor authentication (MFA) on all work accounts where available</li>
  <li>Use a password manager — do not write passwords on paper or store in unencrypted files</li>
  <li>Report any suspected account compromise to ${contactEmail ?? `security@${domain}`} immediately</li>
  <li>Never use ${domain} email credentials on personal sites or non-work services</li>
</ul>

<h2>4. Email Use</h2>
<ul>
  <li>Use the ${domain} email account only for legitimate business purposes</li>
  <li>Do not click links or open attachments in unexpected emails — verify with the sender by phone if unsure</li>
  <li>Do not forward work emails to personal accounts</li>
  <li>Do not set up automatic email forwarding to external addresses</li>
  <li>Be cautious of requests for urgent payments, credential resets, or sensitive information via email</li>
  <li>Report suspicious emails to ${contactEmail ?? `security@${domain}`} rather than simply deleting them</li>
</ul>

<h2>5. Internet and Web Use</h2>
<ul>
  <li>Use work devices and the internet connection primarily for business purposes</li>
  <li>Do not visit sites that are illegal, offensive, or likely to expose the organisation to malware</li>
  <li>Do not download software from unofficial sources — use approved channels only</li>
  <li>Be aware that internet usage on ${org} systems may be monitored for security purposes</li>
  <li>Use a VPN when connecting to ${org} systems from public Wi-Fi networks</li>
</ul>

<h2>6. Device Security</h2>
<ul>
  <li>Lock your screen when leaving your desk (Windows: Win+L, Mac: Ctrl+Cmd+Q)</li>
  <li>Enable full-disk encryption on all devices used for work (BitLocker on Windows, FileVault on Mac)</li>
  <li>Keep operating systems and applications updated — enable automatic updates</li>
  <li>Do not disable antivirus or security software</li>
  <li>Report lost or stolen devices to ${contactEmail ?? `security@${domain}`} immediately</li>
  <li>Do not connect unknown USB drives or external devices to work computers</li>
</ul>

<h2>7. Cloud Services and Data</h2>
<ul>
  <li>Only use ${org}-approved cloud services for storing or sharing work data</li>
  <li>Do not store sensitive customer or financial data in personal cloud accounts (personal Google Drive, Dropbox, etc.)</li>
  <li>Do not share ${org} data with unauthorised third parties</li>
  <li>When sharing files externally, use access-controlled links with expiry dates where possible</li>
  <li>Delete data from personal devices when it is no longer needed for work</li>
</ul>

<h2>8. Remote Working</h2>
<ul>
  <li>Ensure your home network is protected with a strong Wi-Fi password (WPA2 or WPA3)</li>
  <li>Use the ${org} VPN when accessing internal systems remotely</li>
  <li>Be aware of your surroundings when handling confidential information on video calls or in public</li>
  <li>Do not allow family members or others to use devices set up for work</li>
</ul>

<h2>9. Social Media</h2>
<ul>
  <li>Do not post confidential ${org} information, customer details, or financial information on social media</li>
  <li>Clearly distinguish between personal opinions and official ${org} positions</li>
  <li>Do not accept LinkedIn or other professional connection requests from unknown individuals claiming to be from ${org} customers or partners without verifying</li>
</ul>

<h2>10. Prohibited Activities</h2>
<p>The following are strictly prohibited and may result in disciplinary action or termination:</p>
<ul>
  <li>Accessing or attempting to access systems, data, or accounts you are not authorised to use</li>
  <li>Installing unapproved software, especially remote access tools, on ${org} devices</li>
  <li>Disabling or bypassing security controls</li>
  <li>Using ${org} systems for cryptocurrency mining or any activity that benefits only yourself</li>
  <li>Sharing customer personal data with unauthorised parties (GDPR violation)</li>
  <li>Any activity that is illegal under applicable law</li>
</ul>

<h2>11. Reporting Security Incidents</h2>
<p>If you suspect a security incident — including receiving a suspicious email, noticing unexpected account activity, or losing a device — report it immediately to:</p>
<div class="highlight-box">
  <strong>${contactName ?? 'Security Contact'}</strong><br/>
  Email: ${contactEmail ?? `security@${domain}`}<br/>
  ${contactName ? `Domain: ${domain}` : ''}
</div>
<p>There is no penalty for reporting suspected incidents in good faith. Early reporting significantly reduces potential damage.</p>

<h2>12. Policy Violations</h2>
<p>Violations of this policy may result in disciplinary action up to and including termination of employment or contract. Serious violations involving illegal activity may be reported to law enforcement.</p>

<h2>13. Acknowledgement</h2>
<p>By signing below, I confirm that I have read, understood, and agree to comply with this Acceptable Use Policy.</p>
<br/>
<table style="border:none">
  <tr>
    <td style="border:none;padding:0 40px 0 0">
      <div class="signature-line"></div>
      <div class="sig-label">Employee signature</div>
      <br/>
      <div class="signature-line"></div>
      <div class="sig-label">Printed name</div>
    </td>
    <td style="border:none">
      <div class="signature-line"></div>
      <div class="sig-label">Job title</div>
      <br/>
      <div class="signature-line"></div>
      <div class="sig-label">Date</div>
    </td>
  </tr>
</table>

</div>
<div class="footer">
  <span>${org} — Technology Acceptable Use Policy</span>
  <span>Generated by CyberGuard · ${today} · Review annually</span>
</div>
</body></html>`
}
