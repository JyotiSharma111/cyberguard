/**
 * Setup Guides — how to find API keys for each integration.
 * Plain step-by-step instructions with screenshots described.
 */
import React, { useState } from 'react'
import { Card } from '../components/ui'

const GUIDES = [
  {
    id: 'virustotal',
    title: 'VirusTotal API Key',
    icon: 'ti-virus',
    color: '#ff4757',
    time: '2 minutes',
    cost: 'Free',
    where: '.env.local → VIRUSTOTAL_API_KEY',
    steps: [
      { step: 'Go to virustotal.com and click Sign up (top right)', tip: 'Use your work email' },
      { step: 'Verify your email address', tip: 'Check spam if it doesn\'t arrive within 2 minutes' },
      { step: 'Click your profile icon (top right) → API key', tip: 'You\'ll see a long string of letters and numbers' },
      { step: 'Copy the key and add to .env.local:', code: 'VIRUSTOTAL_API_KEY=your_key_here' },
      { step: 'Restart the server: npm run server', tip: 'You should see VIRUSTOTAL_API_KEY: true in the startup log' },
      { step: 'Run a new scan — the Threats page will show real data', tip: 'Free tier: 4 requests/min, 500/day — more than enough for daily scans' },
    ]
  },
  {
    id: 'resend',
    title: 'Resend API Key (Email alerts)',
    icon: 'ti-mail',
    color: '#4fa6ff',
    time: '5 minutes',
    cost: 'Free (3,000 emails/month)',
    where: '.env.local → RESEND_API_KEY',
    steps: [
      { step: 'Go to resend.com and click Get started', tip: 'Free tier includes 3,000 emails/month — plenty for alerts' },
      { step: 'Sign up with your email and verify your account' },
      { step: 'Go to API Keys (left sidebar) → Create API Key', tip: 'Name it "CyberGuard" for easy identification' },
      { step: 'Copy the key (starts with re_) and add to .env.local:', code: 'RESEND_API_KEY=re_your_key_here' },
      { step: 'Set the From address:', code: 'RESEND_FROM=onboarding@resend.dev', tip: 'Use this until you verify your own domain. To use your own domain: Resend → Domains → Add domain → follow DNS instructions' },
      { step: 'Restart the server and go to Alert Settings → Send test alert to verify', tip: 'Test email should arrive within 30 seconds' },
    ]
  },
  {
    id: 'm365',
    title: 'Microsoft 365 (Azure App)',
    icon: 'ti-brand-windows',
    color: '#4fa6ff',
    time: '10 minutes',
    cost: 'Free (included with M365)',
    where: 'Integrations → Microsoft 365',
    steps: [
      { step: 'Go to portal.azure.com and sign in as a Global Administrator' },
      { step: 'Search for "App registrations" in the top search bar → click it' },
      { step: 'Click New registration → Name it "CyberGuard" → Register', tip: 'Leave redirect URI blank' },
      { step: 'Copy the Directory (tenant) ID and Application (client) ID from the overview page', tip: 'Both look like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { step: 'Click Certificates & secrets → New client secret → set expiry to 24 months → Add', tip: 'Copy the Value immediately — you can\'t see it again after leaving this page' },
      { step: 'Click API permissions → Add a permission → Microsoft Graph → Application permissions', tip: 'Search for and add each one:' },
      { step: 'Add these permissions: User.Read.All · Policy.Read.All · AuditLog.Read.All · Directory.Read.All · SecurityEvents.Read.All' },
      { step: 'Click Grant admin consent for [your org] → Yes', tip: 'You must be a Global Administrator to do this' },
      { step: 'Paste the three values into CyberGuard → Integrations → Microsoft 365 → Connect & scan' },
    ]
  },
  {
    id: 'aws',
    title: 'AWS Access Keys (Read-only)',
    icon: 'ti-cloud',
    color: '#ffb627',
    time: '5 minutes',
    cost: 'Free (read-only API calls)',
    where: 'Integrations → Amazon Web Services',
    steps: [
      { step: 'Go to console.aws.amazon.com and sign in' },
      { step: 'Click your account name (top right) → Security credentials', tip: 'If using IAM, go to IAM → Users instead' },
      { step: 'For security, create a dedicated read-only user: IAM → Users → Create user → name "cyberguard-readonly"' },
      { step: 'On the permissions screen: Attach policies directly → search SecurityAudit → select it', tip: 'SecurityAudit is an AWS managed policy — read-only access to all security-relevant settings' },
      { step: 'After creating the user: click the user → Security credentials → Create access key' },
      { step: 'Select "Application running outside AWS" → Next → Create', tip: 'Download the CSV or copy both keys now — you can\'t see the secret again' },
      { step: 'Paste Access key ID and Secret access key into CyberGuard → Integrations → AWS → Connect & scan' },
    ]
  },
  {
    id: 'github',
    title: 'GitHub Personal Access Token',
    icon: 'ti-brand-github',
    color: '#dde2ed',
    time: '3 minutes',
    cost: 'Free',
    where: 'Integrations → GitHub',
    steps: [
      { step: 'Go to github.com → click your profile photo (top right) → Settings' },
      { step: 'Scroll to the bottom of the left sidebar → Developer settings' },
      { step: 'Personal access tokens → Tokens (classic) → Generate new token (classic)', tip: 'Fine-grained tokens work too but classic is simpler' },
      { step: 'Set Note to "CyberGuard", set Expiration to 1 year' },
      { step: 'Select these scopes: read:org · read:user · repo · security_events', tip: 'read:org and security_events are required for organisation-level checks' },
      { step: 'Click Generate token → copy the token (starts with ghp_ or github_pat_)', tip: 'Store it safely — you can\'t see it again' },
      { step: 'Paste into CyberGuard → Integrations → GitHub. Add your organisation name if you have one.' },
    ]
  },
  {
    id: 'cloudflare',
    title: 'Cloudflare API Token',
    icon: 'ti-cloud-storm',
    color: '#ff6b2b',
    time: '3 minutes',
    cost: 'Free',
    where: 'Integrations → Cloudflare',
    steps: [
      { step: 'Go to dash.cloudflare.com and sign in' },
      { step: 'Click your profile icon (top right) → My Profile' },
      { step: 'Click API Tokens → Create Token' },
      { step: 'Use the "Read all resources" template → Continue to summary → Create Token', tip: 'Or custom: Zone → Zone Settings → Read, Zone → Zone → Read' },
      { step: 'Copy the token → paste into CyberGuard → Integrations → Cloudflare' },
      { step: 'Enter your domain name (e.g. yourdomain.com) → Connect & scan', tip: 'The domain must be on your Cloudflare account' },
    ]
  },
  {
    id: 'google',
    title: 'Google Workspace (Service Account)',
    icon: 'ti-brand-google',
    color: '#00df78',
    time: '15 minutes',
    cost: 'Free (included with Google Workspace)',
    where: 'Integrations → Google Workspace',
    steps: [
      { step: 'Go to console.cloud.google.com → Create a new project → name it "CyberGuard"' },
      { step: 'Search for "Admin SDK API" → Enable it', tip: 'Also enable "Google Workspace Admin SDK"' },
      { step: 'Go to IAM & Admin → Service Accounts → Create Service Account → name "cyberguard"' },
      { step: 'Skip optional steps → Done. Click the service account → Keys → Add Key → JSON → Download', tip: 'This downloads a .json file — keep it safe, it\'s the credential' },
      { step: 'Note the service account email (looks like cyberguard@your-project.iam.gserviceaccount.com)' },
      { step: 'Go to admin.google.com → Security → Access and data control → API controls → Manage Domain Wide Delegation' },
      { step: 'Click Add new → paste the service account\'s Client ID (found in the JSON file as "client_id")', tip: 'OAuth scopes to add: https://www.googleapis.com/auth/admin.directory.user.readonly' },
      { step: 'Open the downloaded JSON file in a text editor → copy all contents → paste into CyberGuard → Integrations → Google Workspace' },
      { step: 'Enter your super admin email → Connect & scan' },
    ]
  },
  {
    id: 'stripe',
    title: 'Stripe (Billing)',
    icon: 'ti-credit-card',
    color: '#a78bfa',
    time: '10 minutes',
    cost: '2.9% + 30¢ per transaction',
    where: '.env.local → STRIPE_SECRET_KEY etc.',
    steps: [
      { step: 'Go to dashboard.stripe.com → Sign up or sign in' },
      { step: 'Developers (top right) → API keys → copy Secret key (starts with sk_test_ for test mode)', code: 'STRIPE_SECRET_KEY=sk_test_your_key' },
      { step: 'Create your products: Products → Add product → "CyberGuard Pro" → $49/month recurring → Save', tip: 'Copy the Price ID (starts with price_)' },
      { step: 'Repeat for Business plan at $99/month:', code: 'STRIPE_PRO_PRICE_ID=price_xxx\nSTRIPE_BUSINESS_PRICE_ID=price_xxx' },
      { step: 'Set up webhook: Developers → Webhooks → Add endpoint → URL: https://your-domain.com/api/billing/webhook', tip: 'Events to listen for: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed' },
      { step: 'Copy the webhook signing secret:', code: 'STRIPE_WEBHOOK_SECRET=whsec_your_secret' },
      { step: 'For local testing, use Stripe CLI: stripe listen --forward-to localhost:3001/api/billing/webhook', tip: 'This creates a temporary webhook secret for local development' },
    ]
  },
]

export default function SetupGuides() {
  const [open, setOpen] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = GUIDES.filter(g =>
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.where.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>

      {/* Search */}
      <div style={{ position:'relative' }}>
        <i className="ti ti-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#3a4455' }} aria-hidden="true"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search guides…"
          style={{ width:'100%', background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'9px 12px 9px 34px', fontSize:12, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
      </div>

      {filtered.map(guide => (
        <div key={guide.id} style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, overflow:'hidden' }}>
          {/* Header */}
          <button onClick={() => setOpen(open === guide.id ? null : guide.id)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
            <div style={{ width:34, height:34, borderRadius:8, background:`${guide.color}12`, border:`0.5px solid ${guide.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={`ti ${guide.icon}`} style={{ fontSize:15, color:guide.color }} aria-hidden="true"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#dde2ed', marginBottom:2 }}>{guide.title}</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>{guide.where}</div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
              <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#00df78', background:'rgba(0,223,120,0.07)', border:'0.5px solid rgba(0,223,120,0.2)', padding:'2px 8px', borderRadius:100 }}>{guide.cost}</span>
              <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>{guide.time}</span>
              <i className={`ti ti-chevron-${open===guide.id?'up':'down'}`} style={{ fontSize:12, color:'#3a4455' }} aria-hidden="true"/>
            </div>
          </button>

          {/* Steps */}
          {open === guide.id && (
            <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.05)', padding:'14px' }}>
              {guide.steps.map((s, i) => (
                <div key={i} style={{ display:'flex', gap:12, marginBottom:14 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#4fa6ff', flexShrink:0, marginTop:1 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'#dde2ed', marginBottom: s.code || s.tip ? 5 : 0 }}>{s.step}</div>
                    {s.code && (
                      <div style={{ background:'#080b10', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#00df78', marginBottom: s.tip ? 5 : 0, whiteSpace:'pre' }}>
                        {s.code}
                      </div>
                    )}
                    {s.tip && (
                      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', lineHeight:1.5 }}>
                        💡 {s.tip}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
