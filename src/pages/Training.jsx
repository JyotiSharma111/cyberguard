import React from 'react'
import { Card, Grid, StatCard } from '../components/ui'
import { useScanData } from '../hooks/useScanData'

const FREE_RESOURCES = [
  { category:'Official guidance', color:'#4fa6ff', items:[
    { title:'NCSC Cyber Aware',            url:'https://www.ncsc.gov.uk/cyberaware',         detail:'UK National Cyber Security Centre — free practical guides for businesses' },
    { title:'CISA Free Cybersecurity Tools', url:'https://www.cisa.gov/free-cybersecurity-services-tools', detail:'US govt free tools and resources — great for SMBs' },
    { title:'NIST Small Business Guide',   url:'https://www.nist.gov/cybersecurity/small-business', detail:'Plain-English cybersecurity guide specifically for small businesses' },
  ]},
  { category:'Email security setup', color:'#a78bfa', items:[
    { title:'MXToolbox DMARC Guide',       url:'https://mxtoolbox.com/dmarc/details', detail:'Step-by-step DMARC setup guide with testing tools' },
    { title:'DMARC.org',                   url:'https://dmarc.org/overview', detail:'Official DMARC documentation and deployment guide' },
    { title:'Google Postmaster Tools',     url:'https://postmaster.google.com', detail:'See how Gmail rates your domain\'s email reputation' },
  ]},
  { category:'Free training', color:'#00cfaa', items:[
    { title:'KnowBe4 Free Tools',          url:'https://www.knowbe4.com/free-it-security-tools', detail:'Free phishing test, email exposure check, domain spoof test' },
    { title:'Google Phishing Quiz',        url:'https://phishingquiz.withgoogle.com', detail:'8-question quiz to test your team\'s phishing awareness — share with staff' },
    { title:'SANS Cyber Aces',             url:'https://www.cyberaces.org', detail:'Free online cybersecurity course — OS, networking, system administration' },
  ]},
  { category:'Password & access', color:'#ffb627', items:[
    { title:'Have I Been Pwned',           url:'https://haveibeenpwned.com', detail:'Check if any email address appears in known breach data' },
    { title:'Bitwarden (free)',            url:'https://bitwarden.com', detail:'Free open-source password manager — better than reusing passwords' },
    { title:'1Password Teams',             url:'https://1password.com/teams', detail:'$3/user/month — worth it if your team shares credentials' },
  ]},
  { category:'DNS & web security', color:'#4fa6ff', items:[
    { title:'Cloudflare Free Plan',        url:'https://cloudflare.com', detail:'Free CDN + DDoS protection + DNS management for your domain' },
    { title:'SSL Labs SSL Test',           url:'https://www.ssllabs.com/ssltest', detail:'Free deep SSL/TLS analysis — industry standard A+ to F grading' },
    { title:'Mozilla Observatory',        url:'https://observatory.mozilla.org', detail:'Free HTTP security header scanner — same checks as CyberGuard' },
  ]},
  { category:'Incident response', color:'#ff4757', items:[
    { title:'NCSC Incident Management',   url:'https://www.ncsc.gov.uk/collection/incident-management', detail:'What to do when something goes wrong — step-by-step response guide' },
    { title:'CISA Ransomware Guide',      url:'https://www.cisa.gov/ransomware', detail:'Free guide on preventing and recovering from ransomware attacks' },
    { title:'Action Fraud (UK)',          url:'https://www.actionfraud.police.uk', detail:'UK national reporting centre for fraud and cybercrime' },
  ]},
]

const ROADMAP = [
  { phase:'Coming soon', icon:'ti-school',    color:'#ffb627', title:'Security awareness modules',  detail:'10-minute interactive micro-learning on phishing, passwords, GDPR, and remote work.' },
  { phase:'Coming soon', icon:'ti-fish-hook', color:'#ffb627', title:'Phishing simulations',        detail:'Safe fake phishing emails sent to your staff list. Tracks who clicks and delivers training.' },
  { phase:'Coming soon', icon:'ti-chart-bar', color:'#ffb627', title:'Team completion dashboard',   detail:'Track training completion by team member. Set deadlines and send reminders.' },
  { phase:'Premium tier',icon:'ti-certificate',color:'#a78bfa',title:'Compliance training certs',   detail:'GDPR, HIPAA, PCI DSS-aligned training with certificates for audit evidence.' },
]

export default function Training() {
  const { isReal, issueCount } = useScanData()

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={3} gap={10}>
        <StatCard label="Free resources"  value="24"  note="Curated links"          accent="gr" />
        <StatCard label="Categories"      value="6"   note="Covering all key areas"  accent="bl" />
        <StatCard label="Cost"            value="$0"  note="All free or open source" accent="gr" />
      </Grid>

      {/* Free resources */}
      {FREE_RESOURCES.map(section => (
        <Card key={section.category} title={section.category} titleIcon="ti-external-link">
          <div style={{ display:'flex', flexDirection:'column' }}>
            {section.items.map(item => (
              <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px',
                  borderBottom:'0.5px solid rgba(255,255,255,0.05)', textDecoration:'none',
                  transition:'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{ width:28, height:28, borderRadius:7, background:`${section.color}12`,
                  border:`0.5px solid ${section.color}30`, display:'flex', alignItems:'center',
                  justifyContent:'center', flexShrink:0 }}>
                  <i className="ti ti-external-link" style={{ fontSize:12, color:section.color }} aria-hidden="true"/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#4fa6ff', marginBottom:2 }}>{item.title}</div>
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.5 }}>{item.detail}</div>
                </div>
                <i className="ti ti-arrow-up-right" style={{ fontSize:12, color:'#3a4455', flexShrink:0, marginTop:3 }} aria-hidden="true"/>
              </a>
            ))}
          </div>
        </Card>
      ))}

      {/* Roadmap */}
      <Card title="Training platform roadmap" titleIcon="ti-road">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:12 }}>
          {ROADMAP.map((item, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:28, height:28, borderRadius:7, background:`${item.color}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:14, color:item.color }} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#dde2ed' }}>{item.title}</div>
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:item.color }}>{item.phase}</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:'#6b7789', lineHeight:1.6 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
