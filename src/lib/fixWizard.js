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
export const FIX_GUIDES = {

  // ── SPF ──────────────────────────────────────────────────
  spf: {
    title: 'Add SPF record',
    what: 'An SPF record tells receiving mail servers which servers are allowed to send email on your behalf. Without it, anyone can send email pretending to be you.',
    record: 'v=spf1 include:_spf.google.com ~all',
    recordNote: 'Replace the include: value with your email provider\'s SPF include. Common ones: Google Workspace → _spf.google.com, Microsoft 365 → spf.protection.outlook.com, Mailchimp → servers.mcsv.net',
    cloudflare: { time: '2 min', url: 'https://dash.cloudflare.com',
      steps: ['Log in at dash.cloudflare.com and select your domain', 'Click DNS in the left sidebar', 'Click Add record', 'Type: TXT | Name: @ (or leave blank) | Content: v=spf1 include:YOUR_PROVIDER ~all', 'Click Save — changes take effect within minutes on Cloudflare'] },
    godaddy: { time: '3 min', url: 'https://dcc.godaddy.com',
      steps: ['Log in and go to My Products → DNS', 'Scroll to the Records section and click Add', 'Type: TXT | Host: @ | TXT Value: v=spf1 include:YOUR_PROVIDER ~all | TTL: 1 Hour', 'Click Save', 'Allow up to 1 hour for changes to propagate'] },
    namecheap: { time: '3 min', url: 'https://www.namecheap.com/myaccount/login',
      steps: ['Log in → Domain List → Manage → Advanced DNS', 'Under Host Records, click Add New Record', 'Type: TXT Record | Host: @ | Value: v=spf1 include:YOUR_PROVIDER ~all | TTL: Automatic', 'Click the green checkmark to save'] },
    route53: { time: '5 min', url: 'https://console.aws.amazon.com/route53',
      steps: ['Open Route 53 → Hosted zones → click your domain', 'Click Create record', 'Record type: TXT | Record name: @ | Value: "v=spf1 include:YOUR_PROVIDER ~all"', 'Click Create records'] },
    squarespace: { time: '5 min', url: 'https://account.squarespace.com/domains',
      steps: ['Go to Domains → Edit DNS → DNS Settings', 'Click Add Record', 'Type: TXT | Host: @ | Data: v=spf1 include:YOUR_PROVIDER ~all', 'Save'] },
    wix: { time: '5 min', url: 'https://www.wix.com/account/domains',
      steps: ['Go to Manage Domain → DNS Records', 'Click Add Record → TXT', 'Host: @ | Value: v=spf1 include:YOUR_PROVIDER ~all', 'Save'] },
    ionos: { time: '5 min', url: 'https://my.ionos.com',
      steps: ['Log in → Domains & SSL → DNS', 'Add TXT record: Host @ | Value: v=spf1 include:YOUR_PROVIDER ~all', 'Save'] },
    google: { time: '3 min', url: 'https://domains.google.com',
      steps: ['Select domain → DNS → Manage custom records', 'Create new record: Type TXT | Name @ | Data: v=spf1 include:YOUR_PROVIDER ~all', 'Save'] },
    other: { time: '5 min', url: '',
      steps: ['Log in to your DNS / domain registrar control panel', 'Find DNS Management or DNS Records', 'Add a TXT record: Host=@ Value=v=spf1 include:YOUR_PROVIDER ~all', 'Save and wait up to 30 minutes to propagate', 'Verify: dig TXT yourdomain.com +short'] },
  },

  // ── DMARC ────────────────────────────────────────────────
  dmarc: {
    title: 'Add DMARC record',
    what: 'DMARC tells receiving mail servers what to do when an email fails SPF or DKIM checks. Without it, spoofed emails from your domain will land in inboxes.',
    record: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
    recordNote: 'Start with p=quarantine (send failing emails to spam). Once you\'ve monitored for 30 days and confirmed no legitimate mail is failing, upgrade to p=reject. The rua= address receives daily reports — use your real email.',
    cloudflare: { time: '3 min', url: 'https://dash.cloudflare.com',
      steps: ['Log in → select domain → DNS → Add record', 'Type: TXT | Name: _dmarc | Content: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com', 'Click Save', 'Wait 10–30 minutes then verify: dig TXT _dmarc.yourdomain.com +short'] },
    godaddy: { time: '5 min', url: 'https://dcc.godaddy.com',
      steps: ['DNS → Add Record', 'Type: TXT | Host: _dmarc | TXT Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com | TTL: 1 Hour', 'Save'] },
    namecheap: { time: '3 min', url: 'https://www.namecheap.com/myaccount/login',
      steps: ['Advanced DNS → Add New Record → TXT Record', 'Host: _dmarc | Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com', 'Save'] },
    route53: { time: '5 min', url: 'https://console.aws.amazon.com/route53',
      steps: ['Route 53 → Hosted zone → Create record', 'Name: _dmarc | Type: TXT | Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"', 'Create records'] },
    squarespace: { time: '5 min', url: 'https://account.squarespace.com/domains', steps: ['DNS Settings → Add TXT record', 'Host: _dmarc | Data: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com', 'Save'] },
    wix: { time: '5 min', url: 'https://www.wix.com/account/domains', steps: ['DNS Records → Add TXT', 'Host: _dmarc | Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com', 'Save'] },
    ionos: { time: '5 min', url: 'https://my.ionos.com', steps: ['DNS → Add TXT record', 'Host: _dmarc | Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com', 'Save'] },
    google: { time: '3 min', url: 'https://domains.google.com', steps: ['DNS → Custom records → Create: Type TXT | Name _dmarc | Data v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com', 'Save'] },
    other: { time: '5 min', url: '', steps: ['Add TXT record: Host=_dmarc Value=v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com', 'Save and verify: dig TXT _dmarc.yourdomain.com +short'] },
  },

  // ── HSTS ─────────────────────────────────────────────────
  hsts: {
    title: 'Add HSTS header',
    what: 'HSTS (HTTP Strict Transport Security) forces browsers to always use HTTPS for your site, preventing protocol downgrade attacks and cookie hijacking.',
    cloudflare: { time: '2 min', url: 'https://dash.cloudflare.com',
      steps: ['Log in → select domain → SSL/TLS → Edge Certificates', 'Scroll to HTTP Strict Transport Security (HSTS)', 'Click Enable HSTS', 'Set Max Age Header to 6 months (15768000 seconds)', 'Enable "Include subdomains" if you want all subdomains covered', 'Click Save'] },
    other: { time: '10 min', url: '',
      steps: ['Add this header to your web server config:', 'Strict-Transport-Security: max-age=31536000; includeSubDomains', 'nginx: add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;', 'Apache: Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"', 'Restart your web server after making changes', 'Verify: curl -I https://yourdomain.com | grep Strict'] },
    godaddy: { time: '10 min', url: 'https://dcc.godaddy.com', steps: ['For shared hosting: contact GoDaddy support — they can add headers', 'For VPS/Dedicated: edit .htaccess or nginx config directly'] },
    namecheap: { time: '10 min', url: 'https://www.namecheap.com/myaccount/login', steps: ['For cPanel hosting: add to .htaccess: Header set Strict-Transport-Security "max-age=31536000"', 'For VPS: edit nginx or Apache config directly'] },
    route53: { time: '15 min', url: 'https://aws.amazon.com/cloudfront', steps: ['Use CloudFront → create Response Headers Policy → add Strict-Transport-Security header', 'Or configure directly on your EC2 instance web server'] },
    squarespace: { time: '0 min', url: '', steps: ['Squarespace automatically sets HSTS for all sites', 'If you see this issue, contact Squarespace support'] },
    wix: { time: '0 min', url: '', steps: ['Wix automatically handles HSTS', 'If you see this issue, contact Wix support'] },
    ionos: { time: '10 min', url: 'https://my.ionos.com', steps: ['Add to .htaccess: Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"', 'Or contact IONOS support for help'] },
    google: { time: '10 min', url: 'https://cloud.google.com', steps: ['Google Cloud: Load Balancer → Policies → Response headers → add HSTS header', 'Or add to your application server config'] },
  },

  // ── CSP ──────────────────────────────────────────────────
  csp: {
    title: 'Add Content Security Policy',
    what: 'CSP tells browsers which resources (scripts, styles, images) are allowed to load on your page. It\'s the most effective defence against cross-site scripting (XSS) attacks.',
    cloudflare: { time: '10 min', url: 'https://dash.cloudflare.com',
      steps: ['Log in → your domain → Rules → Transform Rules → Modify Response Headers', 'Click Create Rule', 'Set header name: Content-Security-Policy', 'Start with a basic value: default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'', 'Save and test your site — tighten the policy once you know which domains your site loads resources from'] },
    other: { time: '15 min', url: '',
      steps: ['Start in report-only mode to avoid breaking your site:', 'Content-Security-Policy-Report-Only: default-src \'self\'', 'nginx: add_header Content-Security-Policy "default-src \'self\'" always;', 'Apache: Header always set Content-Security-Policy "default-src \'self\'"', 'Check browser console for violations and adjust the policy', 'Switch to Content-Security-Policy once the policy is clean'] },
    godaddy: { time: '15 min', url: 'https://dcc.godaddy.com', steps: ['For shared hosting: add to .htaccess', 'Header set Content-Security-Policy "default-src \'self\'"', 'For VPS: edit nginx or Apache config'] },
    namecheap: { time: '15 min', url: 'https://www.namecheap.com/myaccount/login', steps: ['cPanel: add to .htaccess: Header set Content-Security-Policy "default-src \'self\'"', 'Test thoroughly — CSP can break functionality if too restrictive'] },
    route53: { time: '15 min', url: 'https://aws.amazon.com/cloudfront', steps: ['CloudFront: Response Headers Policy → add Content-Security-Policy', 'Or add directly to your application server config'] },
    squarespace: { time: '5 min', url: 'https://account.squarespace.com', steps: ['Squarespace has limited CSP control — contact support', 'Or use Cloudflare as a proxy in front of Squarespace'] },
    wix: { time: '5 min', url: 'https://www.wix.com', steps: ['Wix has limited CSP control — contact support', 'Or use Cloudflare as a proxy in front of Wix'] },
    ionos: { time: '15 min', url: 'https://my.ionos.com', steps: ['Add to .htaccess: Header set Content-Security-Policy "default-src \'self\'"', 'Or use Cloudflare as a proxy'] },
    google: { time: '15 min', url: 'https://cloud.google.com', steps: ['Cloud Load Balancer → Response headers policy → add Content-Security-Policy', 'Or add directly to your application config'] },
  },

  // ── SSL EXPIRY ───────────────────────────────────────────
  ssl_expiry: {
    title: 'Renew SSL certificate',
    what: 'Your SSL certificate is expiring soon. When it expires, browsers will show a full-screen security warning to every visitor, and they will likely leave.',
    cloudflare: { time: '0 min', url: 'https://dash.cloudflare.com',
      steps: ['Cloudflare manages SSL automatically — your certificate renews itself', 'If you see this issue, check that your domain is proxied through Cloudflare (orange cloud icon in DNS)', 'If using a custom certificate, go to SSL/TLS → Edge Certificates → upload renewed cert'] },
    other: { time: '15 min', url: '',
      steps: ['Let\'s Encrypt (free): run: sudo certbot renew', 'Certbot installs: sudo apt install certbot python3-certbot-nginx', 'Auto-renew: add to cron: 0 0 * * * certbot renew --quiet', 'For paid certs: log in to your CA and download the renewed certificate, then install on your server'] },
    godaddy: { time: '10 min', url: 'https://dcc.godaddy.com', steps: ['SSL Certificates → Manage → Renew', 'Complete the renewal and re-download/install the certificate'] },
    namecheap: { time: '10 min', url: 'https://www.namecheap.com/myaccount/login', steps: ['SSL Certificates → renew your certificate', 'Follow the validation steps and reinstall'] },
    route53: { time: '15 min', url: 'https://aws.amazon.com/certificate-manager', steps: ['AWS Certificate Manager → your cert → Request renewal', 'Or use ACM to get a free auto-renewing certificate'] },
    squarespace: { time: '0 min', url: '', steps: ['Squarespace auto-renews SSL — this issue should not appear', 'Contact Squarespace support if it does'] },
    wix: { time: '0 min', url: '', steps: ['Wix auto-renews SSL — this issue should not appear', 'Contact Wix support if it does'] },
    ionos: { time: '10 min', url: 'https://my.ionos.com', steps: ['SSL Certificates → your domain → Renew', 'Follow reinstall instructions'] },
    google: { time: '5 min', url: 'https://console.cloud.google.com', steps: ['Cloud Load Balancer → Certificates → create new managed cert', 'Google-managed certificates auto-renew'] },
  },

  // ── OPEN PORTS ───────────────────────────────────────────
  open_ports: {
    title: 'Close dangerous open ports',
    what: 'Your server has database or admin ports (MySQL 3306, Redis 6379, RDP 3389, MongoDB 27017) exposed to the entire internet. These should only be accessible from known IP addresses, never from 0.0.0.0.',
    cloudflare: { time: '5 min', url: 'https://dash.cloudflare.com',
      steps: ['Cloudflare proxies only HTTP/HTTPS — direct ports on your server are not covered by Cloudflare', 'You need to fix this at your server or cloud provider firewall', 'Log in to your cloud provider (AWS/Azure/GCP/DigitalOcean) and edit the firewall/security group'] },
    other: { time: '15 min', url: '',
      steps: ['Log in to your cloud provider control panel', 'AWS: EC2 → Security Groups → edit inbound rules → change 0.0.0.0/0 to your office IP', 'Azure: Network Security Groups → Inbound rules → restrict source IP', 'GCP: VPC Network → Firewall → restrict source ranges', 'Linux: ufw deny 3306 | ufw deny 3389 | ufw allow from YOUR_IP to any port 22', 'Best practice: put all admin ports behind a VPN', 'Verify: run another scan to confirm ports are closed'] },
    godaddy: { time: '10 min', url: 'https://dcc.godaddy.com', steps: ['For VPS: log in to server panel → Firewall settings', 'Block all inbound traffic on database ports except from your IP', 'Contact GoDaddy support if you need help with firewall settings'] },
    namecheap: { time: '10 min', url: 'https://www.namecheap.com/myaccount/login', steps: ['For VPS: SSH in and configure ufw or iptables', 'sudo ufw deny 3306 && sudo ufw deny 3389 && sudo ufw enable', 'Only allow specific IPs to access database ports'] },
    route53: { time: '10 min', url: 'https://console.aws.amazon.com/ec2', steps: ['EC2 → Security Groups → select your instance\'s security group', 'Edit inbound rules → change database port rules from 0.0.0.0/0 to your-ip/32', 'Save rules — takes effect immediately'] },
    squarespace: { time: '0 min', url: '', steps: ['Squarespace manages all server infrastructure — this issue should not appear', 'If it does, contact Squarespace support'] },
    wix: { time: '0 min', url: '', steps: ['Wix manages all server infrastructure', 'Contact Wix support if this appears'] },
    ionos: { time: '10 min', url: 'https://my.ionos.com', steps: ['Server & Cloud → Firewall → configure rules', 'Block database ports from public access'] },
    google: { time: '10 min', url: 'https://console.cloud.google.com', steps: ['GCP Console → VPC Network → Firewall rules', 'Edit or create rules to restrict database port access to specific IPs only'] },
  },

  // ── MX RECORD ────────────────────────────────────────────
  no_mx: {
    title: 'Add MX record',
    what: 'An MX record tells other mail servers where to deliver email for your domain. Without one, no one can send email to your domain and email-based verification services will fail.',
    record: 'yourdomain.com MX 10 mail.yourdomain.com',
    recordNote: 'Use your email provider\'s MX values. Google Workspace: aspmx.l.google.com (priority 1) | Microsoft 365: yourdomain-com.mail.protection.outlook.com (priority 0) | Zoho: mx.zoho.com (priority 10)',
    cloudflare: { time: '2 min', url: 'https://dash.cloudflare.com',
      steps: ['Log in → DNS → Add record', 'Type: MX | Name: @ | Mail server: your provider value (e.g. aspmx.l.google.com) | Priority: 1', 'Save — verify: dig MX yourdomain.com +short'] },
    godaddy: { time: '5 min', url: 'https://dcc.godaddy.com',
      steps: ['DNS → delete any existing MX records first', 'Add → MX | Host: @ | Points to: your mail server | Priority: 1 | TTL: 1 Hour', 'Save'] },
    namecheap: { time: '3 min', url: 'https://www.namecheap.com/myaccount/login',
      steps: ['Advanced DNS → Mail Settings → Custom MX', 'Enter your email provider\'s MX server values', 'Save'] },
    route53: { time: '5 min', url: 'https://console.aws.amazon.com/route53',
      steps: ['Hosted zone → Create record → MX', 'Value: 1 aspmx.l.google.com (Google) or your provider value', 'Create records'] },
    squarespace: { time: '3 min', url: 'https://account.squarespace.com/domains', steps: ['Domains → DNS Settings → Add MX record with your mail server value', 'Save'] },
    wix: { time: '3 min', url: 'https://www.wix.com/account/domains', steps: ['DNS Records → Add MX record', 'Enter your mail server value and priority', 'Save'] },
    ionos: { time: '3 min', url: 'https://my.ionos.com', steps: ['DNS Settings → Add MX record with mail server value', 'Save'] },
    google: { time: '3 min', url: 'https://domains.google.com', steps: ['DNS → Custom records → Add MX | Enter mail server and priority', 'Save'] },
    other: { time: '5 min', url: '', steps: ['Log in to your DNS provider', 'Add MX record: Host=@ Value=your-mail-server Priority=1', 'Common: Google=aspmx.l.google.com | M365=yourdomain-com.mail.protection.outlook.com', 'Save and wait up to 30min to propagate'] },
  },

  // ── CAA RECORD ───────────────────────────────────────────
  no_caa: {
    title: 'Add CAA record',
    what: 'A CAA record restricts which certificate authorities can issue SSL certs for your domain. Without one, any CA can issue a certificate for your domain — including ones used in phishing attacks.',
    record: '0 issue "letsencrypt.org"',
    recordNote: 'Replace letsencrypt.org with your SSL provider. Find your current CA by clicking the padlock on your website. Common values: letsencrypt.org, digicert.com, sectigo.com, pki.goog (Google).',
    cloudflare: { time: '2 min', url: 'https://dash.cloudflare.com',
      steps: ['Login → DNS → Add record', 'Type: CAA | Name: @ | Flags: 0 | Tag: issue | CA domain name: letsencrypt.org', 'Save'] },
    godaddy: { time: '3 min', url: 'https://dcc.godaddy.com', steps: ['DNS → Add → CAA | Host: @ | Value: 0 issue "letsencrypt.org"', 'Save'] },
    namecheap: { time: '3 min', url: 'https://www.namecheap.com/myaccount/login', steps: ['Advanced DNS → Add CAA Record | Flags: 0 | Tag: issue | Value: letsencrypt.org', 'Save'] },
    route53: { time: '5 min', url: 'https://console.aws.amazon.com/route53', steps: ['Hosted zone → Create record → CAA | Value: 0 issue "letsencrypt.org"', 'Create records'] },
    squarespace: { time: '3 min', url: 'https://account.squarespace.com/domains', steps: ['DNS Settings → Add CAA record with 0 issue "letsencrypt.org"', 'Save'] },
    wix: { time: '3 min', url: 'https://www.wix.com/account/domains', steps: ['DNS Records → Add CAA record', 'Save'] },
    ionos: { time: '3 min', url: 'https://my.ionos.com', steps: ['DNS Settings → Add CAA record', 'Save'] },
    google: { time: '3 min', url: 'https://domains.google.com', steps: ['DNS → Custom records → CAA → 0 issue "letsencrypt.org"', 'Save'] },
    other: { time: '5 min', url: '', steps: ['Log in to DNS provider', 'Add CAA record: Host=@ Type=CAA Value=0 issue "letsencrypt.org"', 'Save'] },
  },

  // ── DKIM ─────────────────────────────────────────────────
  dkim: {
    title: 'Enable DKIM signing',
    what: 'DKIM adds a cryptographic signature to every email you send, letting recipients verify it genuinely came from you and was not modified in transit.',
    cloudflare: { time: '5 min', url: 'https://dash.cloudflare.com',
      steps: ['DKIM keys come from your EMAIL PROVIDER — not from Cloudflare', 'Google Workspace: Admin Console → Apps → Google Workspace → Gmail → Authenticate email → Generate new record', 'Microsoft 365: Microsoft 365 Admin Centre → Settings → Domains → DKIM tab → Enable', 'Copy the TXT record your provider shows you', 'In Cloudflare: DNS → Add record → Type: TXT | Name: [selector]._domainkey | Value: the key string', 'Verify: dig TXT google._domainkey.yourdomain.com +short'] },
    other: { time: '10 min', url: '',
      steps: ['DKIM keys are generated by your email provider:', 'Google Workspace: Admin Console → Apps → Gmail → Authenticate email', 'Microsoft 365: Admin Centre → Settings → Domains → DKIM tab', 'Zoho: Mail Admin Console → Email Authentication → DKIM', 'Copy the TXT record exactly including the selector prefix (e.g. google._domainkey)', 'Add the TXT record at your DNS provider', 'Return to your email provider and click Verify / Enable'] },
    godaddy: { time: '10 min', url: 'https://dcc.godaddy.com', steps: ['Get DKIM TXT record from your email provider', 'DNS → Add TXT | Host: [selector]._domainkey | Value: DKIM key', 'Save'] },
    namecheap: { time: '10 min', url: 'https://www.namecheap.com', steps: ['Get DKIM record from email provider', 'Advanced DNS → Add TXT with selector._domainkey as host', 'Save'] },
    route53: { time: '10 min', url: 'https://console.aws.amazon.com/route53', steps: ['Get DKIM value from email provider', 'Create TXT record with selector._domainkey as name', 'Save'] },
    squarespace: { time: '10 min', url: 'https://account.squarespace.com/domains', steps: ['Get DKIM record from email provider → DNS Settings → Add TXT record', 'Save'] },
    wix: { time: '10 min', url: 'https://www.wix.com/account/domains', steps: ['Get DKIM record from email provider → DNS Records → Add TXT record', 'Save'] },
    ionos: { time: '10 min', url: 'https://my.ionos.com', steps: ['Get DKIM record from email provider → DNS Settings → Add TXT record', 'Save'] },
    google: { time: '10 min', url: 'https://domains.google.com', steps: ['Get DKIM record from email provider → DNS → Custom records → Add TXT', 'Save'] },
  },

  // ── TLS PROTOCOL ─────────────────────────────────────────
  no_tls: {
    title: 'Upgrade TLS protocol',
    what: 'Your server supports old TLS versions (1.0 or 1.1) that have known security vulnerabilities. Modern browsers flag these as insecure. You should support only TLS 1.2 and TLS 1.3.',
    cloudflare: { time: '2 min', url: 'https://dash.cloudflare.com',
      steps: ['Log in → select your domain → SSL/TLS → Edge Certificates', 'Set Minimum TLS Version to TLS 1.2', 'Save — takes effect immediately, no server restart needed'] },
    other: { time: '15 min', url: '',
      steps: ['nginx: add to server block: ssl_protocols TLSv1.2 TLSv1.3;', 'Apache: SSLProtocol -all +TLSv1.2 +TLSv1.3', 'Restart web server after changes: sudo systemctl restart nginx', 'Verify with SSL Labs: ssllabs.com/ssltest'] },
    godaddy: { time: '5 min', url: 'https://dcc.godaddy.com', steps: ['For shared hosting contact GoDaddy support to disable TLS 1.0/1.1', 'For VPS configure nginx or Apache directly'] },
    namecheap: { time: '5 min', url: 'https://www.namecheap.com', steps: ['For shared hosting contact Namecheap support', 'For VPS configure nginx or Apache directly'] },
    route53: { time: '10 min', url: 'https://aws.amazon.com/cloudfront', steps: ['Use CloudFront as CDN — it supports TLS 1.2+ by default', 'CloudFront → Distribution → Viewer Protocol Policy → TLS 1.2'] },
    squarespace: { time: '0 min', url: '', steps: ['Squarespace manages TLS automatically', 'Contact Squarespace support if this issue persists'] },
    wix: { time: '0 min', url: '', steps: ['Wix manages TLS automatically', 'Contact Wix support if this issue persists'] },
    ionos: { time: '5 min', url: 'https://my.ionos.com', steps: ['Hosting → SSL Settings → enable TLS 1.2+ only', 'Or contact IONOS support for help'] },
    google: { time: '5 min', url: 'https://console.cloud.google.com', steps: ['Cloud Load Balancer → SSL policies → set minimum TLS to 1.2'] },
  },
}

export function getFixGuide(issueId, providerId = 'other') {
  const id = (issueId ?? '').toLowerCase()

  // Match real scanner issue IDs to fix guide keys
  let guideKey = null

  if      (id.includes('spf'))                               guideKey = 'spf'
  else if (id.includes('dmarc'))                             guideKey = 'dmarc'
  else if (id.includes('hsts'))                              guideKey = 'hsts'
  else if (id.includes('csp'))                               guideKey = 'csp'
  else if (id.includes('ssl-expiry') || id.includes('cert')) guideKey = 'ssl_expiry'
  else if (id.includes('no-tls') || id === 'tls')            guideKey = 'no_tls'
  else if (id.includes('port'))                              guideKey = 'open_ports'
  else if (id === 'no-mx' || id.includes('no-mx'))           guideKey = 'no_mx'
  else if (id === 'no-caa' || id.includes('no-caa'))         guideKey = 'no_caa'
  else if (id.includes('dkim'))                              guideKey = 'dkim'
  else {
    for (const key of Object.keys(FIX_GUIDES)) {
      if (id.includes(key.replace(/_/g, '-')) || id.includes(key)) {
        guideKey = key; break
      }
    }
  }

  if (!guideKey) return null

  const guide    = FIX_GUIDES[guideKey]
  const provider = guide[providerId] ?? guide.other ?? guide.cloudflare

  return { ...guide, provider, guideKey }
}
