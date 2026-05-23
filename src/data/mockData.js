/**
 * Mock data — replace each section with real API calls later.
 * Every field is typed in comments so you know the shape.
 */

export const MOCK_THREATS = [
  { id: 't1', sev: 'critical', name: 'SSH brute force — 45.33.49.121 → 10.0.1.4',     tag: 'network', time: '2m ago',
    fix: ['Block IP at firewall: iptables -A INPUT -s 45.33.49.121 -j DROP', 'Check successful logins: grep "Accepted" /var/log/auth.log', 'Disable password auth in /etc/ssh/sshd_config: PasswordAuthentication no', 'Install fail2ban: apt install fail2ban'] },
  { id: 't2', sev: 'critical', name: 'Phishing email delivered — hr@acme.com clicked',  tag: 'email',   time: '14m ago',
    fix: ['Isolate the hr@ workstation from the network immediately', 'Force password reset + revoke all sessions for hr@acme.com', 'Check browser history and running processes for stealers', 'Report phishing domain to Google SafeBrowsing'] },
  { id: 't3', sev: 'high',     name: 'CVE-2025-3821 exploit attempt — 10.0.1.4',        tag: 'vuln',    time: '1h ago',
    fix: ['sudo apt update && sudo apt upgrade nginx', 'Verify: nginx -v (must be 1.26.1+)', 'sudo systemctl restart nginx', 'Review access logs for unusual POST requests'] },
  { id: 't4', sev: 'medium',   name: 'Unusual admin login — dev.acme.com',              tag: 'access',  time: '3h ago',
    fix: ['Review login audit log for that account', 'Force MFA re-enrollment if suspicious', 'Check for any config changes made during that session'] },
  { id: 't5', sev: 'low',      name: 'SSL cert expires in 7 days — api.acme.com',       tag: 'ssl',     time: 'today',
    fix: ['Run: certbot renew --dry-run (test first)', 'Then: certbot renew', 'Check auto-renewal timer: systemctl status certbot.timer', 'Verify cert after renewal: openssl s_client -connect api.acme.com:443'] },
]

export const MOCK_DNS = [
  { id: 'd1', type: 'A',     name: 'acme.com',       value: '104.21.48.92',            status: 'ok',   sev: null,
    why: 'A record resolves correctly. All 29 global nodes return the same IP. TTL 300s is appropriate.',
    fix: [] },
  { id: 'd2', type: 'MX',    name: 'acme.com',       value: 'mail.acme.com (p=10)',     status: 'ok',   sev: null,
    why: 'MX record configured and resolves. Mail delivery functional.',
    fix: [] },
  { id: 'd3', type: 'TXT',   name: 'acme.com',       value: 'v=spf1 include:google…',  status: 'ok',   sev: null,
    why: 'SPF record present and valid.',
    fix: [] },
  { id: 'd4', type: 'PTR',   name: '104.21.48.92',   value: '— missing —',             status: 'crit', sev: 'Critical',
    why: 'Mail servers check reverse DNS. Missing PTR causes rejection or spam-folder.',
    fix: ['Log in to your hosting provider / ISP control panel', 'Find Reverse DNS / PTR settings under IP management', 'Set PTR: 104.21.48.92 → mail.acme.com', 'Wait 24-48h then verify: dig -x 104.21.48.92 +short'] },
  { id: 'd5', type: 'DNSSEC',name: 'acme.com',       value: 'Signed but DS missing',   status: 'crit', sev: 'Critical',
    why: 'DNSSEC enabled but DS record missing at registrar — trust chain broken.',
    fix: ['Go to your domain registrar (GoDaddy/Namecheap/etc.)', 'Find DNSSEC settings for acme.com', 'Copy DS record from your DNS provider (Key tag: 42801, Alg: 8)', 'Add DS record at registrar', 'Verify: dig DS acme.com +short'] },
  { id: 'd6', type: 'CAA',   name: 'acme.com',       value: '— not configured —',      status: 'high', sev: 'High',
    why: 'Without CAA, any certificate authority can issue SSL certs for your domain.',
    fix: ['Add CAA record: 0 issue "letsencrypt.org"', 'Add: 0 issuewild ";" to block wildcards', 'Add: 0 iodef "mailto:security@acme.com" for abuse reports', 'Verify: dig CAA acme.com'] },
]

export const MOCK_EMAIL = [
  { id: 'e1', name: 'SPF',      score: 95, status: 'ok',
    detail: 'v=spf1 include:_spf.google.com include:sendgrid.net ~all · 7 authorized senders',
    why: 'SPF correctly configured. Consider upgrading ~all to -all once DMARC is at p=reject.',
    fix: [] },
  { id: 'e2', name: 'DKIM',     score: 72, status: 'warn',
    detail: 'Google selector: 2048-bit RSA ✓  |  SendGrid selector: 1024-bit RSA ⚠ weak key',
    why: '1024-bit RSA keys are considered weak. Upgrade SendGrid DKIM key to 2048-bit.',
    fix: ['In SendGrid: Settings → Sender Authentication → your domain → Edit', 'Click "Rotate DKIM key" to generate a 2048-bit key', 'Copy new TXT value and update DNS: s1._domainkey.acme.com', 'Click Verify in SendGrid after DNS propagates (up to 48h)'] },
  { id: 'e3', name: 'DMARC',    score: 40, status: 'crit',
    detail: 'Policy: p=none — monitoring only, NO enforcement. Anyone can spoof @acme.com.',
    why: 'With p=none anyone can send email from @acme.com. This is the highest-impact fix you can make.',
    fix: ['Set up reporting inbox: dmarc@acme.com', 'Update TXT record to: v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@acme.com', 'Monitor reports for 2 weeks — fix any legitimate senders failing auth', 'Increase pct=100 then change to p=reject for full protection'] },
  { id: 'e4', name: 'BIMI',     score: 0,  status: 'bad',
    detail: 'Not configured — requires DMARC p=quarantine or p=reject first.',
    why: 'BIMI shows your logo in Gmail, Yahoo, Apple Mail. Requires DMARC enforcement first.',
    fix: ['First: fix DMARC to p=reject (see above)', 'Prepare a square SVG logo hosted at your domain', 'Obtain a Verified Mark Certificate (VMC) from DigiCert or Entrust', 'Publish: default._bimi.acme.com TXT "v=BIMI1; l=https://acme.com/logo.svg; a=https://acme.com/vmc.pem"'] },
  { id: 'e5', name: 'MTA-STS',  score: 60, status: 'warn',
    detail: 'Policy file found · Mode: testing (should be enforce) · TLS-RPT configured.',
    why: 'MTA-STS in testing mode does not enforce TLS. Upgrade to enforce mode.',
    fix: ['Update /.well-known/mta-sts.txt: change "mode: testing" to "mode: enforce"', 'Increment DNS TXT id: _mta-sts.acme.com TXT "v=STSv1; id=20250519"', 'Test with: mxtoolbox.com/mta-sts.aspx'] },
]

export const MOCK_VULNS = [
  { id: 'v1', cvss: 9.1, sev: 'critical', cve: 'CVE-2025-3821', name: 'Remote code execution — nginx 1.18',       asset: 'web01.acme.com',
    fix: ['sudo apt update && sudo apt upgrade nginx', 'Verify: nginx -v (must be 1.26.1+)', 'sudo systemctl restart nginx', 'Check logs for prior exploitation: grep -i "CVE-2025-3821" /var/log/nginx/access.log'] },
  { id: 'v2', cvss: 9.0, sev: 'critical', cve: 'CVE-2024-7890', name: 'Auth bypass — Apache 2.4.51',              asset: 'app01.acme.com',
    fix: ['sudo apt update && sudo apt install apache2', 'Verify: apache2 -v (must be 2.4.62+)', 'Test virtual host configs still work after upgrade'] },
  { id: 'v3', cvss: 7.8, sev: 'high',     cve: null,             name: 'Open RDP port 3389 exposed to internet',  asset: 'dev.acme.com',
    fix: ['Block port 3389 in firewall from all IPs except VPN range', 'Require VPN before RDP is accessible', 'Enable Network Level Authentication (NLA) in Windows settings'] },
  { id: 'v4', cvss: 7.2, sev: 'high',     cve: null,             name: '4 services running with default credentials', asset: 'internal',
    fix: ['Audit all services: netstat -tlnp', 'Change default credentials on each identified service immediately', 'Use a password manager to generate unique credentials per service'] },
  { id: 'v5', cvss: 5.4, sev: 'medium',   cve: null,             name: 'HSTS not set on 2 subdomains',            asset: 'staging + dev',
    fix: ['Add header in nginx: add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;', 'Test with: curl -I https://staging.acme.com | grep -i strict'] },
]

export const MOCK_CREDS = [
  { id: 'c1', email: 'j.smith@acme.com',  source: 'LinkedIn 2024',  type: 'plaintext', status: 'active',
    fix: ['Force password reset in IdP immediately', 'Revoke all active sessions', 'Enable TOTP MFA', 'Review account audit log for last 30 days'] },
  { id: 'c2', email: 'ceo@acme.com',       source: 'Dropbox 2023',   type: 'plaintext', status: 'active',
    fix: ['Force reset immediately — executive account is high priority', 'Enroll in hardware security key (YubiKey)', 'Review email forwarding rules and OAuth app access', 'Check for suspicious inbox rules auto-forwarding emails'] },
  { id: 'c3', email: 'it-admin@acme.com',  source: 'RockYou2024',    type: 'hash',      status: 'active',
    fix: ['Force reset — hash may be crackable', 'Enable MFA', 'Audit all systems this account has access to'] },
  { id: 'c4', email: 'hr@acme.com',        source: 'Adobe 2023',     type: 'hash',      status: 'active',
    fix: ['Force reset', 'Enable MFA', 'Note: this account also clicked a phishing link recently — prioritize'] },
  { id: 'c5', email: 'dev@acme.com',       source: 'HaveIBeenPwned', type: 'plaintext', status: 'resolved',
    fix: [] },
]

export const MOCK_VENDORS = [
  { id: 'vn1', name: 'AWS',         cat: 'Cloud Infrastructure', grade: 'A+', score: 970, sev: 'ok',
    fix: [] },
  { id: 'vn2', name: 'Salesforce',  cat: 'CRM Platform',         grade: 'A',  score: 900, sev: 'ok',
    fix: [] },
  { id: 'vn3', name: 'Slack',       cat: 'Team Messaging',       grade: 'B+', score: 820, sev: 'ok',
    fix: [] },
  { id: 'vn4', name: 'Zoom',        cat: 'Video Communications', grade: 'B-', score: 720, sev: 'warn',
    fix: ['Request Zoom SOC 2 report / latest security attestation', 'Enforce meeting passcodes by policy', 'Disable file transfer in Zoom admin settings', 'Enable waiting rooms by default'] },
  { id: 'vn5', name: 'GitHub',      cat: 'Dev Tooling',          grade: 'C+', score: 620, sev: 'crit',
    fix: ['Send security questionnaire to GitHub account team', 'Enable GitHub Advanced Security + secret scanning on all repos', 'Audit and rotate all personal access tokens — scope to minimum permissions', 'Review org-level access — remove unnecessary members'] },
]

export const MOCK_COMPLIANCE = [
  { id: 'co1', name: 'SOC 2 Type II', pct: 91, sev: 'ok',
    gaps: [], fix: [] },
  { id: 'co2', name: 'ISO 27001:2022', pct: 84, sev: 'ok',
    gaps: ['A.9.4 — MFA not enforced on all privileged access'], fix: ['Enable MFA on all admin accounts in IdP'] },
  { id: 'co3', name: 'NIST CSF 2.0',  pct: 68, sev: 'warn',
    gaps: ['Identify: asset inventory incomplete (62%)', 'Protect: MFA gaps', 'Respond: IR plan not tested in 12 months'],
    fix: ['Complete asset inventory using network discovery tool', 'Test incident response plan with tabletop exercise', 'Update disaster recovery runbook'] },
  { id: 'co4', name: 'HIPAA',         pct: 72, sev: 'warn',
    gaps: ['Audit controls not fully implemented', 'Encryption at rest gaps on 3 systems'],
    fix: ['Enable full-disk encryption on remaining systems', 'Implement audit logging on all PHI systems'] },
  { id: 'co5', name: 'PCI DSS v4.0',  pct: 45, sev: 'crit',
    gaps: ['Req 6: 5 unpatched critical CVEs', 'Req 8: MFA not on all CDE access', 'Req 10: Audit logging gaps', 'Req 11: Quarterly scan overdue'],
    fix: ['Patch all critical CVEs (see Vulnerability Scan)', 'Enforce MFA on all cardholder data environment access', 'Enable audit logging on all CDE systems', 'Schedule and complete quarterly vulnerability scan'] },
]

export const MOCK_TRAINING = [
  { id: 'tr1', name: 'Phishing Awareness',       total: 87, done: 82, sev: 'ok' },
  { id: 'tr2', name: 'Password Hygiene',         total: 87, done: 77, sev: 'ok' },
  { id: 'tr3', name: 'Social Engineering',       total: 87, done: 63, sev: 'warn' },
  { id: 'tr4', name: 'Incident Reporting',       total: 87, done: 48, sev: 'warn' },
  { id: 'tr5', name: 'GDPR & Data Handling',     total: 87, done: 30, sev: 'crit' },
]

export const MOCK_SCORE = {
  overall: 820,
  grade: 'B+',
  dimensions: [
    { key: 'dns',       label: 'DNS health',           score: 94, weight: '15%', color: 'var(--gr)' },
    { key: 'email',     label: 'Email authentication', score: 71, weight: '15%', color: 'var(--am)' },
    { key: 'ssl',       label: 'SSL / TLS',            score: 88, weight: '12%', color: 'var(--gr)' },
    { key: 'attack',    label: 'Attack surface',       score: 62, weight: '10%', color: 'var(--am)' },
    { key: 'darkweb',   label: 'Dark web exposure',    score: 55, weight: '15%', color: 'var(--re)' },
    { key: 'vuln',      label: 'Vulnerability posture',score: 68, weight: '18%', color: 'var(--am)' },
    { key: 'vendor',    label: 'Vendor risk',          score: 74, weight: '10%', color: 'var(--am)' },
    { key: 'phishing',  label: 'Phishing resilience',  score: 65, weight: '5%',  color: 'var(--am)' },
  ],
}

export const MOCK_DARKWEB = [
  { id: 'dw1', tag: 'Credentials', sev: 'crit', text: '14 email/password pairs found on breach forum', source: 'BreachForums', time: '3h ago',
    fix: ['Force password reset for all 14 accounts in IdP immediately', 'Revoke all active sessions and API tokens for those accounts', 'Enable TOTP MFA on all accounts', 'Review audit logs for last 30 days for each account'] },
  { id: 'dw2', tag: 'Mention',     sev: 'crit', text: 'acme.com referenced in ransomware Telegram channel', source: 'Telegram', time: '8h ago',
    fix: ['Escalate to CISO and legal team immediately', 'Enable enhanced monitoring on all critical systems for 72h', 'Verify offline backups are current and restorable', 'Activate incident response plan — brief IT and security team'] },
  { id: 'dw3', tag: 'Data leak',   sev: 'high', text: 'Internal IP range posted on paste site', source: 'Pastebin', time: '2d ago',
    fix: ['Take note of exposed IPs and review firewall rules for each', 'Check if any of those IPs have public-facing services that should be internal', 'Consider rotating any API keys or credentials that may have been nearby in the paste'] },
  { id: 'dw4', tag: 'Credentials', sev: 'high', text: '3 executive email addresses in combo list', source: 'Combo list', time: '5d ago',
    fix: ['Force password reset for all 3 executive accounts', 'Enroll executives in hardware security keys (YubiKey)', 'Check for unusual login attempts on those accounts over last 30 days'] },
]

export const MOCK_PENTEST = [
  { id: 'pt1', sev: 'critical', name: 'SQL injection on /api/search endpoint',  status: 'open',
    fix: ['Replace all string-concatenated SQL with parameterized queries', "cursor.execute('SELECT * FROM items WHERE name = %s', (user_input,))", 'Run SAST tool (Semgrep / Bandit) across codebase to find all injection points', 'Retest with SQLmap after fix: sqlmap -u "https://acme.com/api/search?q=test"'] },
  { id: 'pt2', sev: 'critical', name: 'Exposed .git directory on staging server', status: 'open',
    fix: ['Add to nginx config: location ~ /\\.git { deny all; return 404; }', 'Also block: .env .DS_Store .svn .htpasswd', 'Verify with: curl -I https://staging.acme.com/.git/config (should return 404)'] },
  { id: 'pt3', sev: 'high',     name: 'SSRF vulnerability in image upload handler', status: 'open',
    fix: ['Validate and allowlist URL schemes (only https://) before fetching', 'Block requests to internal IP ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16', 'Use a dedicated sandboxed service for external URL fetching'] },
  { id: 'pt4', sev: 'high',     name: 'Weak password policy — minimum 6 chars', status: 'fixed',
    fix: [] },
  { id: 'pt5', sev: 'medium',   name: 'Directory traversal on legacy API',       status: 'fixed',
    fix: [] },
]

export const MOCK_RESPONSE = [
  { id: 'r1', status: 'contained', title: 'Ransomware process tree terminated', detail: 'Endpoint quarantined. Process tree killed. Malicious files quarantined by EDR.', time: 'Yesterday 11:42' },
  { id: 'r2', status: 'contained', title: 'C2 beacon blocked at firewall',       detail: 'IP 185.220.101.x banned at perimeter. No data exfiltration detected.', time: '2 days ago' },
  { id: 'r3', status: 'reviewing', title: 'Suspicious PowerShell execution',     detail: 'Flagged by EDR. Analyst review in progress — encoded command decoded, appears benign but unverified.', time: '3 days ago' },
  { id: 'r4', status: 'contained', title: 'Data exfiltration attempt blocked',   detail: '4.3GB outbound transfer to unknown IP stopped. Source process identified and terminated.', time: '1 week ago' },
]
