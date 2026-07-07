/**
 * Fix Wizard — provider-specific remediation guides.
 * Maps issue IDs to step-by-step instructions for each DNS/hosting provider.
 */

export const PROVIDERS = [
  { id:'cloudflare',  label:'Cloudflare',         icon:'ti-cloud-storm',    color:'#ff6b2b' },
  { id:'godaddy',     label:'GoDaddy',             icon:'ti-letter-g',       color:'#00b140' },
  { id:'namecheap',   label:'Namecheap',           icon:'ti-flag',           color:'#de3723' },
  { id:'route53',     label:'AWS Route 53',         icon:'ti-cloud',          color:'#ffb627' },
  { id:'squarespace', label:'Squarespace',          icon:'ti-square',         color:'#111827' },
  { id:'wix',         label:'Wix',                  icon:'ti-letter-w',       color:'#0066ff' },
  { id:'ionos',       label:'IONOS / 1&1',          icon:'ti-letter-i',       color:'#003d8f' },
  { id:'google',      label:'Google Domains',       icon:'ti-brand-google',   color:'#4285f4' },
  { id:'other',       label:'Other / Manual',       icon:'ti-settings',       color:'#6b7280' },
]

// Fix guides per issue type per provider
// Each guide has: steps (array), url (where to go), time estimate
export const FIX_GUIDES = {

  // ── SPF ──────────────────────────────────────────────────
  spf: {
    title: 'Add SPF record',
    what: 'An SPF record tells receiving mail servers which servers are allowed to send email on your behalf. Without it, anyone can send email pretending to be you.',
    record: 'v=spf1 include:_spf.google.com ~all',
    recordNote: 'Replace the include: value with your email provider\'s SPF include. Common ones: Google Workspace → _spf.google.com, Microsoft 365 → spf.protection.outlook.com, Mailchimp → servers.mcsv.net',
    cloudflare: {
      time: '2 min', url: 'https://dash.cloudflare.com',
      steps: [
        'Log in at dash.cloudflare.com and select your domain',
        'Click DNS in the left sidebar',
        'Click Add record',
        'Type: TXT | Name: @ (or leave blank) | Content: v=spf1 include:YOUR_PROVIDER ~all',
        'Click Save — changes take effect within minutes on Cloudflare',
      ]
    },
    godaddy: {
      time: '3 min', url: 'https://dcc.godaddy.com',
      steps: [
        'Log in and go to My Products → DNS',
        'Scroll to the Records section and click Add',
        'Type: TXT | Host: @ | TXT Value: v=spf1 include:YOUR_PROVIDER ~all | TTL: 1 Hour',
        'Click Save',
        'Allow up to 1 hour for changes to propagate',
      ]
    },
    namecheap: {
      time: '3 min', url: 'https://www.namecheap.com/myaccount/login',
      steps: [
        'Log in → Domain List → Manage → Advanced DNS',
        'Under Host Records, click Add New Record',
        'Type: TXT Record | Host: @ | Value: v=spf1 include:YOUR_PROVIDER ~all | TTL: Automatic',
        'Click the green checkmark to save',
      ]
    },
    route53: {
      time: '5 min', url: 'https://console.aws.amazon.com/route53',
      steps: [
        'Open Route 53 → Hosted zones → click your domain',
        'Click Create record',
        'Record type: TXT | Record name: leave blank (root) | Value: "v=spf1 include:YOUR_PROVIDER ~all" (include quotes)',
        'TTL: 300 | Click Create records',
      ]
    },
    squarespace: {
      time: '3 min', url: 'https://account.squarespace.com',
      steps: [
        'Home → Settings → Domains → click your domain',
        'Click DNS Settings',
        'Click Add Record → TXT',
        'Host: @ | Data: v=spf1 include:YOUR_PROVIDER ~all',
        'Click Save',
      ]
    },
    other: {
      time: '5 min', url: null,
      steps: [
        'Log in to your DNS provider\'s control panel',
        'Find the DNS Management or Zone Editor section',
        'Add a new TXT record with: Host/Name = @ (root domain)',
        'Value = v=spf1 include:YOUR_PROVIDER_SPF_INCLUDE ~all',
        'Save and allow 1-24 hours for propagation',
        'Test with: dig TXT yourdomain.com (or use mxtoolbox.com/spf)',
      ]
    },
  },

  // ── DMARC ─────────────────────────────────────────────────
  dmarc: {
    title: 'Add DMARC record',
    what: 'DMARC tells mail servers what to do when someone fails SPF/DKIM checks — block, quarantine (spam), or do nothing. Without it, email spoofing is unpunished.',
    record: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
    recordNote: 'Start with p=quarantine. Once confident your email is working, change to p=reject for full protection. Replace the rua email with an address you control.',
    cloudflare: {
      time: '2 min', url: 'https://dash.cloudflare.com',
      steps: [
        'Log in and select your domain → DNS',
        'Click Add record',
        'Type: TXT | Name: _dmarc | Content: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
        'Click Save',
      ]
    },
    godaddy: {
      time: '3 min', url: 'https://dcc.godaddy.com',
      steps: [
        'DNS → Records → Add',
        'Type: TXT | Host: _dmarc | TXT Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
        'Click Save',
      ]
    },
    namecheap: {
      time: '3 min', url: 'https://www.namecheap.com',
      steps: [
        'Domain List → Manage → Advanced DNS → Add New Record',
        'TXT Record | Host: _dmarc | Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
        'Save with the green checkmark',
      ]
    },
    route53: {
      time: '4 min', url: 'https://console.aws.amazon.com/route53',
      steps: [
        'Route 53 → Hosted zones → your domain → Create record',
        'Record type: TXT | Record name: _dmarc',
        'Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com" (include the quotes)',
        'Click Create records',
      ]
    },
    other: {
      time: '5 min', url: null,
      steps: [
        'Go to your DNS control panel',
        'Add TXT record: Name = _dmarc | Value = v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
        'Save and wait for propagation',
        'Test with: mxtoolbox.com/dmarc or dmarcian.com/dmarc-inspector',
      ]
    },
  },

  // ── HSTS ─────────────────────────────────────────────────
  hsts: {
    title: 'Add HSTS header',
    what: 'HTTP Strict Transport Security forces browsers to always use HTTPS for your site. Without it, an attacker can downgrade connections to plain HTTP.',
    record: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
    recordNote: 'This is an HTTP response header, not a DNS record. It needs to be added to your web server config or CDN.',
    cloudflare: {
      time: '2 min', url: 'https://dash.cloudflare.com',
      steps: [
        'Select your domain in Cloudflare',
        'Go to SSL/TLS → Edge Certificates',
        'Scroll to HTTP Strict Transport Security (HSTS)',
        'Click Enable HSTS → toggle on → set max-age to 12 months',
        'Enable "Include Subdomains" if appropriate',
        'Click Save',
      ]
    },
    godaddy: {
      time: '5 min', url: null,
      steps: [
        'GoDaddy does not offer native HSTS configuration',
        'Option 1: Put Cloudflare in front of your domain (free) — Cloudflare handles HSTS',
        'Option 2: Add to your web server — nginx: add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
        'Option 3: Add via your CMS — WordPress with Yoast or security plugins can add this header',
      ]
    },
    other: {
      time: '5 min', url: null,
      steps: [
        'nginx: add to server block — add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
        'Apache: add to .htaccess — Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
        'Cloudflare: SSL/TLS → Edge Certificates → HSTS → Enable',
        'Verify with: curl -I https://yourdomain.com | grep -i strict',
      ]
    },
  },

  // ── CSP ──────────────────────────────────────────────────
  csp: {
    title: 'Add Content-Security-Policy header',
    what: 'CSP tells browsers which resources your site is allowed to load. It prevents cross-site scripting (XSS) attacks — where attackers inject malicious scripts.',
    record: "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    recordNote: 'Start with a permissive policy and tighten it over time. A strict CSP can break sites if not configured carefully — start with "report-only" mode to test.',
    cloudflare: {
      time: '5 min', url: 'https://dash.cloudflare.com',
      steps: [
        'Select your domain → Rules → Transform Rules → Modify Response Header',
        'Click Create rule → Add header',
        'Header name: Content-Security-Policy',
        'Value: default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'',
        'Click Deploy',
      ]
    },
    other: {
      time: '5 min', url: null,
      steps: [
        'nginx: add_header Content-Security-Policy "default-src \'self\';" always;',
        'Apache: Header set Content-Security-Policy "default-src \'self\';"',
        'Node.js/Express: use the helmet npm package — app.use(helmet())',
        'Start with report-only mode to catch issues: Content-Security-Policy-Report-Only',
        'Test with: csp-evaluator.withgoogle.com',
      ]
    },
  },

  // ── SSL expiry ────────────────────────────────────────────
  ssl_expiry: {
    title: 'Renew SSL certificate',
    what: 'Your SSL certificate is expiring soon. When it expires, browsers will show a security warning to all visitors, destroying trust and likely killing traffic.',
    cloudflare: {
      time: '2 min', url: 'https://dash.cloudflare.com',
      steps: [
        'Good news — if you\'re using Cloudflare, it manages SSL automatically',
        'Go to SSL/TLS → Overview and check the SSL mode is "Full" or "Full (Strict)"',
        'Cloudflare renews its edge certificate automatically — no action needed',
        'If the warning is about your origin server certificate: SSL/TLS → Origin Server → Create Certificate',
        'Select 15 years validity → install on your server',
      ]
    },
    other: {
      time: '10 min', url: 'https://letsencrypt.org',
      steps: [
        'Option 1 — Let\'s Encrypt (free, auto-renews): certbot.eff.org — install certbot and run sudo certbot --nginx or sudo certbot --apache',
        'Option 2 — Your hosting provider: most cPanel hosts have SSL Manager → AutoSSL',
        'Option 3 — Cloudflare: free SSL via proxy (dash.cloudflare.com → proxy your domain)',
        'After renewal, verify with: ssllabs.com/ssltest',
        'Set a calendar reminder 60 days before next expiry',
      ]
    },
  },

  // ── Open ports ────────────────────────────────────────────
  open_ports: {
    title: 'Close dangerous open ports',
    what: 'Ports like RDP (3389), MySQL (3306), and MongoDB (27017) should never be open to the internet. They are the most scanned ports by attackers.',
    other: {
      time: '10 min', url: null,
      steps: [
        'AWS: EC2 → Security Groups → edit inbound rules → change 0.0.0.0/0 to your office IP',
        'Azure: Network Security Groups → Inbound rules → restrict source IP',
        'GCP: VPC Network → Firewall → restrict source ranges',
        'Linux firewall: ufw deny 3306 (MySQL) | ufw deny 3389 (RDP) | ufw allow from YOUR_IP to any port 22',
        'Best practice: all admin ports (SSH, RDP, DB) should only be accessible via VPN',
        'Verify with: nmap -p 3306,3389,27017 yourdomain.com (should show filtered/closed)',
      ]
    },
  },

}

export function getFixGuide(issueId, providerId = 'other') {
  // Map issue IDs to guide keys
  const keyMap = {
    'dns-spf':     'spf',
    'dns-dmarc':   'dmarc',
    'hsts':        'hsts',
    'csp':         'csp',
    'ssl-expiry':  'ssl_expiry',
  }

  // Find matching guide by checking if issueId contains any key
  let guideKey = null
  for (const [pattern, key] of Object.entries(keyMap)) {
    if ((issueId ?? '').toLowerCase().includes(pattern.replace('dns-',''))) {
      guideKey = key; break
    }
  }

  if (!guideKey) {
    // Try direct match
    for (const key of Object.keys(FIX_GUIDES)) {
      if ((issueId ?? '').toLowerCase().includes(key)) {
        guideKey = key; break
      }
    }
  }

  if (!guideKey) return null

  const guide    = FIX_GUIDES[guideKey]
  const provider = guide[providerId] ?? guide.other ?? guide.cloudflare

  return { ...guide, provider, guideKey }
}
