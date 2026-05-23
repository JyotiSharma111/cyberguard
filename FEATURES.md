# CyberGuard — Feature Documentation

Complete reference for every feature, how it works, what it needs, and known limitations.

---

## Table of Contents
1. [Core Scanning](#1-core-scanning)
2. [Cloud Integrations](#2-cloud-integrations)
3. [People & Policies](#3-people--policies)
4. [Platform Features](#4-platform-features)
5. [Alerts & Notifications](#5-alerts--notifications)
6. [Billing & Plans](#6-billing--plans)
7. [Known Limitations & Honest Notes](#7-known-limitations--honest-notes)

---

## 1. Core Scanning

### How scans work
Every scan runs 9 scanners in parallel via `Promise.allSettled()`. If one scanner fails or times out, the others continue. Results are saved to `scan_results` table in Supabase.

**Trigger:** Click "Run scan" in the top bar → calls `GET /api/scan/:domain` → saves to DB → reloads scan data.

**Full scan timeout:** ~90 seconds max.

---

### DNS Scanner
**File:** `server/lib/dnsScanner.js`
**Route:** `GET /api/dns/:domain`
**What it checks:**
- SPF record — exists, policy type (hardfail `-all`, softfail `~all`, none `+all`)
- DMARC record — exists, policy (`none`, `quarantine`, `reject`), reporting address
- BIMI record — brand logo in email (cosmetic but shows maturity)
- MTA-STS — mail transport security policy
- DKIM — checks 21 common selectors (google, mail, default, k1, k2, etc.)
- NS, SOA, CAA, MX, TXT, PTR records
**Data source:** Node.js built-in `dns` module — no API key needed.
**Score:** 0–100 based on SPF policy strength, DMARC enforcement, BIMI, MTA-STS.

---

### SSL/TLS Scanner
**File:** `server/lib/sslScanner.js`
**Route:** `GET /api/ssl/:domain`
**What it checks:**
- Protocol version (TLS 1.0/1.1/1.2/1.3)
- Certificate expiry — days remaining, alert if < 30 days
- Certificate issuer and validity
- Cipher suite rating
**Data source:** Node.js `tls` module — direct TCP connection to port 443. No API key.
**Score:** 100 for TLS 1.3 + valid cert. Deductions for old protocols, expiring certs, weak ciphers.

---

### HTTP Headers Scanner
**File:** `server/lib/headersScanner.js`
**Route:** `GET /api/headers/:domain`
**What it checks:**
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
**Data source:** HTTP HEAD request to the domain. No API key.
**Score:** Each missing header deducts points. CSP and HSTS worth most.

---

### Shodan Port Scanner
**File:** `server/lib/shodanScanner.js`
**Route:** `GET /api/vuln/:domain`
**What it checks:**
- Open ports on all IPs for the domain
- CVEs associated with those services (from Shodan's InternetDB)
**Data source:** `https://internetdb.shodan.io/{ip}` — completely free, no API key needed.
**Score:** Deductions for dangerous open ports (RDP 3389, MySQL 3306, MongoDB 27017, Redis 6379, etc.)
**Limitation:** Shodan InternetDB only covers IPs already in Shodan's database. Very new or very small sites may return no data.

---

### Subdomain Scanner
**File:** `server/lib/subdomainScanner.js`
**Route:** `GET /api/subdomains/:domain`
**What it checks:**
- All subdomains found in certificate transparency logs
**Data source:** `https://crt.sh/?q=%.{domain}&output=json` — free, no API key.
**Score:** Deductions if many subdomains found (larger attack surface) or if known risky subdomains detected.
**Limitation:** Only finds subdomains that have had SSL certificates issued. Private/internal subdomains won't appear.

---

### WHOIS Scanner
**File:** `server/lib/whoisScanner.js`
**Route:** `GET /api/whois/:domain`
**What it checks:**
- Domain expiry date — alert if < 60 days
- Registrar name
- Domain age
- Transfer lock status
- DNSSEC configured
**Data source:** RDAP protocol (`https://rdap.org/domain/{domain}`) — free, no API key.
**Score:** Deductions for expiring domain, no transfer lock, new domain (< 1 year old).

---

### Automated Pentest
**File:** `server/lib/pentestScanner.js`
**Route:** `GET /api/pentest/:domain`
**What it checks (25+ checks):**
- Exposed files: `.env`, `.env.local`, `.git/config`, `.git/HEAD`, `wp-config.php`, `config.php`, `database.yml`, `backup.zip`, `backup.sql`, `dump.sql`, `phpinfo.php`, `info.php`
- Exposed admin panels: `/admin`, `/wp-admin`, `/phpmyadmin`, `/adminer.php`
- Risky HTTP methods: TRACE, PUT, DELETE, CONNECT
- HTTP → HTTPS redirect (should return 301/302, not 200)
- Directory listing at `/images/`
- Missing `security.txt` at `/.well-known/security.txt`
**Data source:** Direct HTTP requests to the domain. No API key.
**Score:** Critical findings (exposed .env, .git) deduct 25pts each. High findings deduct 15pts.

---

### VirusTotal Scanner
**File:** `server/lib/virusTotalScanner.js`
**Route:** `GET /api/threats/:domain`
**What it checks:**
- Domain reputation across 90+ security engines
- Malicious/suspicious/clean vote counts
- Last analysis date
**Data source:** VirusTotal API v3 — **requires free API key** from virustotal.com.
**API key:** Set `VIRUSTOTAL_API_KEY` in `.env.local`.
**Rate limit:** Free tier = 4 requests/minute, 500/day. Plenty for daily scans.
**If no key:** Returns `skipped: true` — Threats page shows "Add API key" message.
**Score:** 100 if clean. Deductions based on number of malicious/suspicious flags.

---

### Credential Scanner (HIBP)
**File:** `server/lib/credScanner.js`
**Route:** `GET /api/creds/:domain`
**What it checks:**
- Whether the domain appears in any HaveIBeenPwned breach
- Staff email addresses (if uploaded) checked individually
**Data source:** HaveIBeenPwned API v3 — domain search is free, no key needed. Per-email search requires HIBP API key ($3.50/month).
**Score:** Deductions for number of breaches and severity.

---

## 2. Cloud Integrations

All integrations are **read-only**. CyberGuard never writes, modifies, or deletes anything in your cloud accounts.

### How integrations work
1. User enters credentials in Integrations page
2. Credentials saved to `integrations` table in Supabase (encrypted at rest by Supabase)
3. User clicks "Connect & scan"
4. Frontend POSTs credentials to `/api/integrations/{type}/scan`
5. Server scans using the provider's API
6. Results saved back to `integrations` table

---

### Microsoft 365
**File:** `server/lib/m365Scanner.js` + `server/lib/m365AnomalyScanner.js`
**Required:** Azure App Registration with these Graph API permissions (Application type, not Delegated):
- `User.Read.All`
- `Policy.Read.All`
- `AuditLog.Read.All`
- `Directory.Read.All`
- `SecurityEvents.Read.All`

**What it checks:**
- MFA registration status per user
- Admin accounts without MFA (critical finding)
- Global administrator count (flag if > 3)
- Security Defaults enabled/disabled
- Microsoft Secure Score
- Risky users flagged by Microsoft Identity Protection
- Inbox rules forwarding email to external addresses (BEC indicator)
- Third-party OAuth apps with high-privilege permissions (Mail.ReadWrite, Files.ReadWrite.All etc.)
- New Global Admin accounts created in last 7 days

**Setup time:** ~10 minutes. See Setup Guides page in the app.

---

### Amazon Web Services
**File:** `server/lib/awsScanner.js`
**Required:** IAM user with `SecurityAudit` managed policy (read-only).

**What it checks:**
- Root account MFA status (critical if missing)
- Root access keys (critical if exist — should never exist)
- IAM password policy strength
- S3 buckets — public access block settings, server-side encryption
- EC2 security groups — dangerous ports open to 0.0.0.0/0 (RDP 3389, MySQL 3306, MongoDB 27017, Redis 6379, Elasticsearch 9200, MSSQL 1433)

**Setup time:** ~5 minutes. See Setup Guides page in the app.

---

### GitHub
**File:** `server/lib/githubScanner.js`
**Required:** Personal Access Token with scopes: `read:org`, `read:user`, `repo`, `security_events`

**What it checks:**
- Account owner 2FA status
- Organisation members without 2FA
- Open secret scanning alerts (exposed API keys in repos)
- Dependabot critical vulnerability alerts
- Branch protection on default branches

**Setup time:** ~3 minutes.

---

### Cloudflare
**File:** `server/lib/cloudflareScanner.js`
**Required:** API Token with Zone:Read permission.

**What it checks:**
- SSL mode (Off/Flexible/Full/Full Strict) — Flexible is a security risk
- Always Use HTTPS setting
- HSTS via Cloudflare
- WAF security level
- Minimum TLS version

**Setup time:** ~3 minutes.

---

### Google Workspace
**File:** `server/lib/googleWorkspaceScanner.js`
**Required:** Service Account JSON key + Domain-wide delegation configured in Google Admin.

**What it checks:**
- 2-step verification per user
- Admin accounts without 2SV
- User count, suspended accounts

**Setup time:** ~15 minutes (most complex setup).

---

## 3. People & Policies

### Phishing Simulations
**File:** `server/lib/phishingSimulator.js`
**Route:** `POST /api/phishing/send`
**Required:** Resend API key + `RESEND_FROM` set in environment.

**⚠ IMPORTANT — Why emails may not arrive:**
Resend only allows sending from **verified domains** or the default `onboarding@resend.dev`. The "From email" field in the phishing form is cosmetic for the display name — the actual sending address is always `RESEND_FROM` from your environment.

**To make phishing emails work:**
1. Set `RESEND_FROM=onboarding@resend.dev` in Railway env vars (default, always works)
2. Or verify your own domain in Resend (resend.com/domains) and use that

**4 templates available:**
- IT Password Reset (easy) — fake IT helpdesk password expiry
- CEO Wire Transfer (medium) — Business Email Compromise simulation
- Missed Parcel Delivery (easy) — fake Royal Mail delivery notice
- Shared Document (medium) — fake SharePoint file share

**Tracking:**
- Open tracking: 1x1 pixel at `/api/phishing/track/open/:campaignId/:recipientId`
- Click tracking: redirect at `/api/phishing/track/click/:campaignId/:recipientId`
- Clickers are redirected to an education page explaining the simulation
- Results stored in `phishing_results` table

**Legal note:** Only send to staff who have been informed simulations may occur (e.g. via your AUP).

---

### Incident Response Plan (IRP) Generator
**File:** `server/lib/documentGenerator.js`
**Route:** `POST /api/documents/irp`
**Required:** API server running, no external API keys needed.

**What it generates:**
- ~6 page professional HTML document (printable to PDF via browser)
- Incident classification matrix (P1 Critical → P4 Low)
- Response team contacts (pre-filled with your details)
- Step-by-step procedures for: Ransomware, Account Takeover, Data Breach, DDoS
- Communication plan (staff, customers, ICO/regulator)
- Post-incident review template
- Signature page

**If you get "Unexpected end of JSON input":**
This means the frontend is calling `/api/documents/irp` as a relative URL, which hits Cloudflare Pages (not Railway). The fix is in v18-launch — ensure `VITE_API_URL` is set and the Documents page uses it.

---

### Acceptable Use Policy (AUP) Generator
**File:** `server/lib/documentGenerator.js`
**Route:** `POST /api/documents/aup`
Same as IRP — generates ~4 page AUP covering passwords, email, devices, remote work, social media.

---

### Threat Alerts Feed
**File:** `server/lib/threatFeedScanner.js`
**Route:** `GET /api/threatfeed`
**Data sources:**
- **CISA KEV:** US govt Known Exploited Vulnerabilities catalog. Updated daily. Free, no key. Returns last 10 added CVEs.
- **AlienVault OTX:** Community threat intelligence. Free key at otx.alienvault.com. Set `OTX_API_KEY` in env vars.
- **NCSC:** UK National Cyber Security Centre advisories. RSS feed, no key needed.

**Refresh:** Manual (click Refresh button) or call `/api/threatfeed` from a cron.

---

### Compliance Mapping
**File:** `src/pages/Compliance.jsx` (frontend only — no API call)
**How it works:** Maps your existing scan data to compliance controls. No external API needed.

**Frameworks covered:**
- SOC 2: 6 controls (CC6.1, CC6.6, CC6.7, CC6.8, CC7.1, CC8.1)
- NIST CSF: 6 controls (PR.DS-2, PR.DS-6, PR.AC-5, DE.CM-1, PR.IP-1, ID.AM-1)
- ISO 27001: 6 controls (A.10.1, A.12.1, A.12.6, A.13.1, A.13.2, A.14.1)

**Important disclaimer:** These are technical controls only. Real SOC 2/ISO 27001 certification requires a human auditor, HR policies, physical security controls, and costs $15,000–$50,000. This shows your technical readiness only.

---

## 4. Platform Features

### Security Report (PDF)
**File:** `src/lib/generateReport.js`
**How it works:** Generates HTML in the browser, opens in new tab. User prints to PDF via browser (Ctrl+P / Cmd+P → Save as PDF).

**Report structure:**
1. Cover page — score, grade, issue counts, vs industry average
2. Table of contents + risk vector summary table
3. Executive summary
4. Risk vector analysis (one section per scanner, mirrors BitSight format)
5. Remediation roadmap (Immediate/Short-term/Planned)

**"Industry average" note:**
The 660 SMB average shown in the report is a **baseline estimate** based on typical scores observed across SMB domains, not a live database of millions of companies like BitSight. It's clearly labelled "SMB avg · CyberGuard data" in the report. Honest context: an average SMB with no security team scores around 60–70 on our scale.

---

### Uptime Monitor
**File:** `server/lib/uptimeChecker.js`
**Route:** `GET /api/uptime/check/:domain`, `GET /api/uptime/history/:domainId`, `POST /api/uptime/run`

**How it works:**
- HTTP HEAD request to `https://yourdomain.com` — measures response time and status code
- Results stored in `uptime_checks` table
- Down alert sent via Resend when site goes from up → down
- Recovery alert sent when site comes back up

**Automatic monitoring:**
Not automatic by default — requires a cron job to call `POST /api/uptime/run?secret=YOUR_CRON_SECRET` every 5 minutes.

**Free cron options:**
- GitHub Actions (free): schedule a workflow to call the endpoint
- EasyCron free tier: 1 job, 5-minute interval
- Railway cron jobs (paid add-on)

---

### Weekly Email Digest
**File:** `server/lib/weeklyDigest.js`
**Route:** `GET/POST /api/cron/weekly-digest`

**What it sends:**
- Your security score (large, colour-coded)
- Score change vs last week (up/down arrow)
- Critical and high issue counts
- Top 3 issues to fix this week with first fix step
- Weekly stats table
- Link back to dashboard

**How to schedule:**
Call `POST /api/cron/weekly-digest?secret=YOUR_CRON_SECRET` every Monday morning via:
- GitHub Actions cron
- EasyCron
- Any HTTP cron service

**Test it:** Settings page → "Send test digest" button.

---

### Fix Wizard
**File:** `src/lib/fixWizard.js` + `src/components/ui/FixWizard.jsx`
**How it works:** Pure frontend — no API call needed.

**When you click "Step-by-step fix wizard →" on any issue:**
1. Bottom drawer slides up
2. Shows what the issue is in plain English
3. Shows the exact DNS record or config to add
4. Provider picker: Cloudflare, GoDaddy, Namecheap, AWS Route 53, Squarespace, Wix, IONOS, Google Domains
5. Numbered steps specific to your provider
6. "Open Cloudflare" button links directly to the right page

**Supported issue types:** SPF, DMARC, HSTS, CSP, SSL expiry, open ports.

---

### Vendor Risk Grading
**File:** `server/lib/vendorScanner.js`
**Route:** `GET /api/vendor/:domain`
**Timeout:** 45 seconds (DNS + SSL in parallel)

**How it works:**
Runs DNS + SSL scans on any domain you enter. Grades from A+ to F based on combined score.

**Grade thresholds:**
- A+ ≥ 97 | A ≥ 93 | A- ≥ 90
- B+ ≥ 87 | B ≥ 83 | B- ≥ 80
- C+ ≥ 77 | C ≥ 73 | C- ≥ 70
- D 40–69 | F < 40

---

### Share Links
**Route:** `GET /share/:token`
**How it works:** Generates a token stored in `share_tokens` table. Public URL shows read-only dashboard — no login required. Token can be revoked.

---

### Alert Engine
**File:** `server/lib/alertEngine.js`
**Route:** `POST /api/alerts/trigger`

**Detects changes between scans:**
- Score drops > 10 points → `score_drop` alert
- New critical issues → `new_critical` alert
- SSL cert expiry < 30 days → `cert_expiry` alert
- DMARC policy degraded (reject → quarantine → none) → `dmarc_fail` alert
- Domain expiry < 60 days → `domain_expiry` alert

**Delivery channels:**
- Email via Resend (always)
- Slack via webhook URL (if configured in Settings)

---

## 5. Alerts & Notifications

### Email alerts
**Required:** `RESEND_API_KEY` and `RESEND_FROM` set.

`RESEND_FROM` must be either:
- `onboarding@resend.dev` (default, always works on free Resend tier)
- A domain you have verified in Resend (resend.com/domains)

**Free Resend limit:** 3,000 emails/month — plenty for alerts and weekly digests.

### Slack alerts
Set a Slack Incoming Webhook URL in Settings → Alert Settings → Slack webhook. Free via Slack app directory.

---

## 6. Billing & Plans

**Current state:** Stripe is wired in code but not active — Stripe keys not configured.

**To activate billing:**
1. Create products in Stripe dashboard
2. Add to Railway env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`

**Plan limits enforced (planLimits.js):**
| Feature | Free | Pro ($49) | Business ($99) |
|---------|------|-----------|----------------|
| Domains | 1 | 3 | 10 |
| Vendors | 3 | 20 | 100 |
| Staff emails | 0 | 500 | Unlimited |
| Share links | 0 | 10 | Unlimited |
| PDF reports | ✗ | ✓ | ✓ (branded) |
| Slack alerts | ✗ | ✓ | ✓ |
| Cloud integrations | 1 | 5 | Unlimited |
| API access | ✗ | ✗ | ✓ |

---

## 7. Known Limitations & Honest Notes

### What CyberGuard IS
- External security posture monitoring (what attackers can see from the internet)
- Cloud misconfiguration detection (via read-only APIs)
- Email security configuration checking
- Security document generation
- Staff phishing simulation

### What CyberGuard IS NOT
- An endpoint agent (cannot monitor laptops/desktops)
- An internal network monitor (cannot see inside your office network)
- A SIEM (not a log aggregation platform)
- A 24/7 human SOC (you are the human — CyberGuard alerts you)

### Honest notes on specific features

**Industry average in report:** 660 is an estimated SMB baseline, not a live database. Labelled clearly as "SMB avg · CyberGuard data."

**DKIM scanning:** Checks 21 common selectors. If your DKIM uses an unusual selector name it may not be detected. Check Domain page → Email tab to verify.

**Shodan data:** Uses InternetDB (free tier). Data may be 1–30 days old. Some IPs may not be in Shodan's database.

**Subdomain scanner:** Only finds subdomains with SSL certificates (via crt.sh). Private/internal subdomains are invisible.

**Pentest checks:** Automated and passive — not a real pen test. A human pen tester can find business logic flaws, authenticated vulnerabilities, and custom application issues that automated checks cannot.

**Compliance mapping:** 18 technical controls only. Not a substitute for a real audit.

**Phishing simulations:** Requires Resend to send from `onboarding@resend.dev` or a verified domain. Custom from-addresses (e.g. `it@yourcompany.com`) require domain verification in Resend.

**AWS scanner:** Requires `SecurityAudit` IAM policy. CloudTrail anomaly detection (root logins, unusual API calls) is not yet built — coming next.

---

## Environment Variables Reference

### Frontend (Cloudflare Pages)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✓ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✓ | Supabase anon/public key |
| `VITE_API_URL` | ✓ in prod | Railway backend URL |

### Backend (Railway)
| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✓ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✓ | Supabase anon key |
| `RESEND_API_KEY` | ✓ | Email sending (resend.com) |
| `RESEND_FROM` | ✓ | From address (`onboarding@resend.dev` default) |
| `VIRUSTOTAL_API_KEY` | Recommended | Free at virustotal.com |
| `NODE_ENV` | ✓ | Set to `production` |
| `FRONTEND_URL` | ✓ | Cloudflare Pages URL (for CORS) |
| `CRON_SECRET` | Recommended | Any random string — protects cron endpoints |
| `OTX_API_KEY` | Optional | AlienVault OTX threat feed (free) |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | For billing | Stripe Price ID for Pro plan |
| `STRIPE_BUSINESS_PRICE_ID` | For billing | Stripe Price ID for Business plan |
