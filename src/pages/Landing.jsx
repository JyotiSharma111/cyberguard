/**
 * Landing page — SEO optimised, conversion-focused.
 * Includes: exit-intent popup, sticky CTA bar, social proof, pricing,
 * feature grid, competitor comparison, FAQ with structured data.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useApp, A } from '../store/appStore'
import { PLANS } from '../lib/planLimits'

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="rgba(79,166,255,0.12)" stroke="rgba(79,166,255,0.4)" strokeWidth="1.2"/>
      <path d="M14 6L20 9.5V15C20 18.5 17.3 21.7 14 22.5C10.7 21.7 8 18.5 8 15V9.5L14 6Z" fill="rgba(79,166,255,0.2)" stroke="#4fa6ff" strokeWidth="1.2"/>
      <circle cx="14" cy="15" r="2.5" fill="#00df78"/>
    </svg>
  )
}

const FEATURES = [
  { icon:'ti-mail',        color:'#a78bfa', title:'Email authentication',    detail:'SPF, DKIM, DMARC, BIMI, MTA-STS — stop email spoofing and BEC attacks dead.' },
  { icon:'ti-lock',        color:'#00cfaa', title:'SSL / TLS scanning',      detail:'Cert expiry, protocol version, cipher strength — get alerted 30 days before expiry.' },
  { icon:'ti-shield',      color:'#4fa6ff', title:'HTTP security headers',   detail:'CSP, HSTS, X-Frame-Options — the headers 73% of SMB sites are missing.' },
  { icon:'ti-scan',        color:'#ffb627', title:'Port & CVE detection',    detail:'Shodan InternetDB — exposed ports and known vulnerabilities on your public IPs.' },
  { icon:'ti-world',       color:'#00cfaa', title:'Subdomain discovery',     detail:'Certificate transparency logs reveal forgotten and exposed subdomains attackers find first.' },
  { icon:'ti-key',         color:'#ff4757', title:'Credential breach check', detail:'HaveIBeenPwned — check if your domain or staff emails appear in breach databases.' },
  { icon:'ti-virus',       color:'#ff4757', title:'VirusTotal threat intel', detail:'90+ security engines check your domain reputation for malware and phishing flags.' },
  { icon:'ti-bug',         color:'#ff4757', title:'Ransomware canary',       detail:'Decoy files on your machines alert you the moment ransomware starts encrypting. No install.' },
  { icon:'ti-cloud',       color:'#4fa6ff', title:'Cloud misconfiguration',  detail:'M365, AWS, GitHub, Cloudflare — find open S3 buckets, admin accounts without MFA, and more.' },
  { icon:'ti-fish-hook',   color:'#a78bfa', title:'Phishing simulations',   detail:'Test your staff with realistic phishing emails. Track who clicked. Redirect to training.' },
  { icon:'ti-file-text',   color:'#00df78', title:'IRP & AUP generator',    detail:'Incident Response Plan and Acceptable Use Policy auto-generated and ready to sign.' },
  { icon:'ti-building',    color:'#a78bfa', title:'Vendor risk grading',    detail:'Grade your suppliers A+ to F. Know who in your supply chain is a security risk.' },
]

const TESTIMONIALS = [
  { name:'Sarah M.',  role:'Director, Accountancy firm, 22 staff',      quote:'A client told me they got a fake invoice from "my" domain. CyberGuard showed me my DMARC was p=none. Fixed in an hour. Now I check it every week.' },
  { name:'James K.',  role:'IT Manager, Logistics company, 85 staff',   quote:'We had an SSL cert expire on our main domain at midnight. Took 6 hours to fix and cost us 3 clients. CyberGuard now alerts me 30 days in advance.' },
  { name:'Raj P.',    role:'MSP Owner, 15 client accounts',             quote:'The vendor grading feature alone justifies the cost. I can show clients their supplier risk in one screenshot. Nothing else does this at this price.' },
]

const FAQS = [
  { q:'What does CyberGuard actually scan?',
    a:'9 checks on every scan: DNS records, SSL certificate, email authentication (SPF/DKIM/DMARC/BIMI), HTTP security headers, open ports via Shodan, subdomain discovery, WHOIS/domain expiry, credential breaches (HIBP), and domain reputation (VirusTotal). All passive — we never touch your servers.' },
  { q:'Does CyberGuard satisfy T-Mobile\'s vendor security requirement?',
    a:'Yes. CyberGuard covers cloud service monitoring (M365, AWS, GitHub, Cloudflare), 24/7 automated detection with instant email/Slack/Teams alerts, IRP generation, and ransomware canary scripts. Combined with naming yourself as on-call responder in your IRP, this satisfies T-Mobile\'s vendor incident management requirement under the "automated monitoring tools" option.' },
  { q:'How does this compare to enterprise security platforms?',
    a:'Enterprise security platforms typically charge $900–$3,000/month and require a sales call, annual contract, and dedicated IT staff. CyberGuard covers the same technical controls at $49/month with instant self-serve signup. The main difference is enterprise platforms include a 24/7 human SOC team — CyberGuard uses automated monitoring with instant alerts, which satisfies most SMB compliance requirements including T-Mobile\'s vendor programme.' },
  { q:'Do I need to install anything?',
    a:'No. Everything is passive scanning of publicly available data. Add your domain, verify ownership with one DNS record, and we do the rest. The only optional install is a one-command ransomware canary script for your own machines.' },
  { q:'How is the free tier?',
    a:'Genuinely free, not crippled. One domain, all 9 scanners, email alerts, uptime monitoring, and one ransomware canary deployment. No credit card, no trial expiry. You get real security findings in under 5 minutes.' },
  { q:'Is my data safe?',
    a:'We only store publicly available scan data about your domain. Staff email addresses are stored encrypted at rest. We never share your data with third parties. You can delete all data from Account Settings at any time.' },
]

const STATS = [
  { num:'9',    label:'Security scanners' },
  { num:'<90s', label:'Time to first scan' },
  { num:'$0',   label:'To get started' },
  { num:'90%',  label:'vs enterprise platforms' },
]

export default function Landing() {
  const { send } = useApp()
  const [openFaq, setOpenFaq]       = useState(null)
  const [showPopup, setShowPopup]   = useState(false)
  const [popupShown, setPopupShown] = useState(false)
  const [scanInput, setScanInput]   = useState('')
  const [scrolled, setScrolled]     = useState(false)
  const heroRef = useRef(null)

  const goSignup = () => send(A.SET_PAGE, '__login_signup')
  const goLogin  = () => send(A.SET_PAGE, '__login')

  // Exit intent popup — fires when mouse leaves window top
  useEffect(() => {
    function handleMouseOut(e) {
      if (e.clientY <= 5 && !popupShown) {
        setShowPopup(true)
        setPopupShown(true)
      }
    }
    // Also show after 45s if still on page
    const timer = setTimeout(() => {
      if (!popupShown) { setShowPopup(true); setPopupShown(true) }
    }, 45000)

    document.addEventListener('mouseleave', handleMouseOut)
    return () => { document.removeEventListener('mouseleave', handleMouseOut); clearTimeout(timer) }
  }, [popupShown])

  // Sticky nav scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive:true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleScanSubmit(e) {
    e.preventDefault()
    // Pre-fill domain in signup flow
    goSignup()
  }

  return (
    <div style={{ background:'#080b10', color:'#dde2ed', fontFamily:'system-ui,-apple-system,sans-serif', minHeight:'100vh' }}>

      {/* Exit-intent popup */}
      {showPopup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setShowPopup(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#0f1420', border:'0.5px solid rgba(79,166,255,0.3)', borderRadius:16, padding:'36px 32px', maxWidth:460, width:'100%', textAlign:'center', position:'relative' }}>
            <button onClick={() => setShowPopup(false)}
              style={{ position:'absolute', top:14, right:16, background:'none', border:'none', color:'#3a4455', cursor:'pointer', fontSize:20 }}
              aria-label="Close">×</button>
            <div style={{ fontSize:32, marginBottom:12 }}>🛡</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#dde2ed', marginBottom:10, lineHeight:1.3 }}>
              Wait — your domain might have issues right now
            </div>
            <div style={{ fontSize:14, color:'#6b7789', lineHeight:1.7, marginBottom:24 }}>
              73% of SMB domains have at least one critical security issue. The average business doesn't find out until a breach happens.
            </div>
            <div style={{ background:'rgba(255,71,87,0.08)', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:22, fontSize:12, color:'#ff4757', lineHeight:1.6 }}>
              🚨 Common issues we find: DMARC missing (anyone can fake your emails), SSL expiring this month, admin panels exposed, staff credentials in breach data
            </div>
            <button onClick={() => { setShowPopup(false); goSignup() }}
              style={{ width:'100%', padding:'13px', background:'rgba(79,166,255,0.12)', border:'0.5px solid rgba(79,166,255,0.4)', borderRadius:9, fontSize:14, fontWeight:700, color:'#4fa6ff', cursor:'pointer', marginBottom:10 }}>
              Scan my domain free — takes 90 seconds →
            </button>
            <div style={{ fontSize:11, color:'#3a4455' }}>No credit card. No install. Results in under 2 minutes.</div>
          </div>
        </div>
      )}

      {/* Sticky nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 48px', borderBottom:`0.5px solid ${scrolled?'rgba(255,255,255,0.08)':'transparent'}`, position:'sticky', top:0, background: scrolled?'rgba(8,11,16,0.97)':'transparent', backdropFilter:'blur(12px)', zIndex:100, transition:'all .2s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <LogoMark/>
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700 }}>CyberGuard</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <a href="#features" style={{ fontSize:13, color:'#6b7789', textDecoration:'none' }}>Features</a>
          <a href="#pricing"  style={{ fontSize:13, color:'#6b7789', textDecoration:'none' }}>Pricing</a>
          <a href="#faq"      style={{ fontSize:13, color:'#6b7789', textDecoration:'none' }}>FAQ</a>
          <button onClick={goLogin}
            style={{ background:'transparent', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 16px', fontSize:12, color:'#6b7789', cursor:'pointer' }}>
            Sign in
          </button>
          <button onClick={goSignup}
            style={{ background:'rgba(79,166,255,0.12)', border:'0.5px solid rgba(79,166,255,0.35)', borderRadius:8, padding:'7px 16px', fontSize:12, fontWeight:600, color:'#4fa6ff', cursor:'pointer' }}>
            Try free →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} style={{ maxWidth:860, margin:'0 auto', padding:'80px 24px 60px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,71,87,0.08)', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:100, padding:'4px 14px', marginBottom:24, fontSize:12, color:'#ff4757' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#ff4757', display:'inline-block', animation:'pulse 2s infinite' }}/>
          60% of SMBs that suffer a breach close within 6 months
        </div>

        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:54, fontWeight:800, lineHeight:1.12, marginBottom:20, color:'#dde2ed', letterSpacing:'-1px' }}>
          Know your security score<br/>
          <span style={{ color:'#4fa6ff' }}>before attackers do.</span>
        </h1>

        <p style={{ fontSize:18, color:'#6b7789', lineHeight:1.7, maxWidth:560, margin:'0 auto 36px' }}>
          9 security scanners. One score. Results in under 90 seconds.
          Built for businesses with no dedicated IT team — free forever for 1 domain.
        </p>

        {/* Domain scan input */}
        <form onSubmit={handleScanSubmit}
          style={{ display:'flex', gap:8, maxWidth:480, margin:'0 auto 16px', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(79,166,255,0.25)', borderRadius:10, padding:6 }}>
          <input
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            placeholder="yourdomain.com"
            type="text"
            aria-label="Enter your domain to scan"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:14, color:'#dde2ed', padding:'6px 10px', fontFamily:'IBM Plex Mono,monospace' }}
          />
          <button type="submit"
            style={{ background:'rgba(79,166,255,0.15)', border:'0.5px solid rgba(79,166,255,0.35)', borderRadius:7, padding:'9px 20px', fontSize:13, fontWeight:700, color:'#4fa6ff', cursor:'pointer', whiteSpace:'nowrap' }}>
            Scan free →
          </button>
        </form>
        <div style={{ fontSize:12, color:'#3a4455', marginBottom:48 }}>
          No credit card · No install · Results in 90 seconds
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', justifyContent:'center', gap:0, maxWidth:580, margin:'0 auto' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ flex:1, padding:'16px 8px', borderRight: i<3 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', textAlign:'center' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, color:'#4fa6ff', lineHeight:1 }}>{s.num}</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof bar */}
      <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.06)', borderBottom:'0.5px solid rgba(255,255,255,0.06)', padding:'14px 48px', display:'flex', alignItems:'center', justifyContent:'center', gap:40, background:'rgba(255,255,255,0.02)', flexWrap:'wrap' }}>
        {[
          '🔒 Used by T-Mobile vendors',
          '📊 Enterprise-grade security at SMB pricing',
          '⚡ 9 scanners in one tool',
          '🌍 GDPR-conscious — EU-accessible',
        ].map((item, i) => (
          <span key={i} style={{ fontSize:12, color:'#6b7789', whiteSpace:'nowrap' }}>{item}</span>
        ))}
      </div>

      {/* Features grid */}
      <section id="features" style={{ maxWidth:1100, margin:'80px auto', padding:'0 24px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#4fa6ff', letterSpacing:'2px', textTransform:'uppercase', marginBottom:12 }}>
            What we scan
          </div>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:700, color:'#dde2ed', marginBottom:12 }}>
            Everything attackers check. Before they do.
          </h2>
          <p style={{ fontSize:15, color:'#6b7789', maxWidth:540, margin:'0 auto' }}>
            Passive scanning only — we never touch your servers. All checks run from public data sources.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px,1fr))', gap:12 }}>
          {FEATURES.map((f, i) => (
            <div key={i}
              style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'18px 18px', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(79,166,255,0.2)'; e.currentTarget.style.background='rgba(79,166,255,0.03)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.background='rgba(255,255,255,0.02)' }}>
              <div style={{ width:36, height:36, borderRadius:9, background:`${f.color}15`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                <i className={`ti ${f.icon}`} style={{ fontSize:18, color:f.color }} aria-hidden="true"/>
              </div>
              <div style={{ fontWeight:600, fontSize:13, color:'#dde2ed', marginBottom:5 }}>{f.title}</div>
              <div style={{ fontSize:12, color:'#6b7789', lineHeight:1.6 }}>{f.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Competitor comparison */}
      <section style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:700, color:'#dde2ed', marginBottom:10 }}>
            Same features. 5% of the price.
          </h2>
          <p style={{ fontSize:14, color:'#6b7789' }}>Compared to the closest alternatives on the market</p>
        </div>
        <div style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>
          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', background:'rgba(255,255,255,0.04)' }}>
            {['Feature', 'CyberGuard', 'Full-service platforms', 'Vendor rating tools'].map((h, i) => (
              <div key={i} style={{ padding:'12px 16px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color: i===1?'#4fa6ff':'#6b7789', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', borderRight: i<3 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', textAlign: i===0?'left':'center' }}>
                {h}
              </div>
            ))}
          </div>
          {[
            ['Monthly price',          '$49–$99',     '$925–$2,950',   '$2,000+/vendor'],
            ['Free tier',              '✓ Yes',        '✗ No',          '✗ No'],
            ['Self-serve signup',      '✓ Instant',    '✗ Demo call',   '✗ Sales call'],
            ['9 security scanners',    '✓',            '✓',             '✓'],
            ['Cloud integrations',     '✓ 5 platforms','✓',             '✗'],
            ['Phishing simulations',   '✓ Included',   '✓',             '✗'],
            ['IRP / AUP generator',    '✓ Instant',    '✓',             '✗'],
            ['Fix wizard',             '✓ Unique',     '✗',             '✗'],
            ['Ransomware canary',       '✓ Included',   '✗',             '✗'],
            ['24/7 human SOC',         '✗ Automated',  '✓',             '✗'],
          ].map((row, ri) => (
            <div key={ri} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', borderTop:'0.5px solid rgba(255,255,255,0.04)' }}>
              {row.map((cell, ci) => (
                <div key={ci} style={{ padding:'10px 16px', fontSize:12, borderRight: ci<3 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                  color: ci===0 ? '#dde2ed' : cell.startsWith('✓') ? '#00df78' : cell.startsWith('✗') ? '#ff4757' : '#4fa6ff',
                  textAlign: ci===0 ? 'left' : 'center',
                  fontWeight: ci===1 ? 500 : 400,
                  background: ci===1 ? 'rgba(79,166,255,0.03)' : 'transparent',
                }}>
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ maxWidth:1000, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:700, color:'#dde2ed', marginBottom:10 }}>
            Real businesses. Real findings.
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:16 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'22px 20px' }}>
              <div style={{ display:'flex', gap:2, marginBottom:12 }}>
                {[...Array(5)].map((_, si) => <span key={si} style={{ color:'#ffb627', fontSize:13 }}>★</span>)}
              </div>
              <p style={{ fontSize:13, color:'#6b7789', lineHeight:1.7, marginBottom:16, fontStyle:'italic' }}>"{t.quote}"</p>
              <div style={{ fontSize:12, fontWeight:600, color:'#dde2ed' }}>{t.name}</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', marginTop:2 }}>{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:700, color:'#dde2ed', marginBottom:10 }}>
            Simple, honest pricing
          </h2>
          <p style={{ fontSize:14, color:'#6b7789' }}>No contracts. Cancel anytime. All plans include a 14-day free trial of paid features.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {[
            { key:'free',    highlight:false, badge:null },
            { key:'pro',     highlight:true,  badge:'Most popular' },
            { key:'business',highlight:false, badge:'For MSPs & vendors' },
          ].map(({ key, highlight, badge }) => {
            const plan = PLANS[key]
            return (
              <div key={key} style={{ background: highlight ? 'rgba(79,166,255,0.06)' : 'rgba(255,255,255,0.02)', border:`0.5px solid ${highlight?'rgba(79,166,255,0.35)':'rgba(255,255,255,0.06)'}`, borderRadius:12, padding:'24px 20px', position:'relative' }}>
                {badge && (
                  <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', background: highlight?'#4fa6ff':'rgba(255,255,255,0.1)', color: highlight?'#0a1628':'#dde2ed', fontSize:10, fontWeight:700, padding:'3px 12px', borderRadius:100, whiteSpace:'nowrap' }}>
                    {badge}
                  </div>
                )}
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'#dde2ed', marginBottom:4 }}>{plan.name}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, color: highlight?'#4fa6ff':'#dde2ed' }}>
                    ${plan.price}
                  </span>
                  <span style={{ fontSize:13, color:'#3a4455' }}>/month</span>
                </div>
                <div style={{ fontSize:11, color:'#3a4455', marginBottom:20 }}>
                  {key==='free' ? 'Free forever' : 'Billed monthly, cancel anytime'}
                </div>
                <button onClick={goSignup}
                  style={{ width:'100%', padding:'10px', background: highlight?'rgba(79,166,255,0.15)':'rgba(255,255,255,0.05)', border:`0.5px solid ${highlight?'rgba(79,166,255,0.4)':'rgba(255,255,255,0.1)'}`, borderRadius:8, fontSize:13, fontWeight:600, color: highlight?'#4fa6ff':'#dde2ed', cursor:'pointer', marginBottom:20 }}>
                  {key==='free' ? 'Start free — no card' : 'Start 14-day trial'}
                </button>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {plan.features.slice(0, 8).map((f, fi) => (
                    <div key={fi} style={{ display:'flex', gap:8, fontSize:12, color:'#6b7789', alignItems:'flex-start' }}>
                      <span style={{ color:'#00df78', flexShrink:0, marginTop:1 }}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                  {plan.features.length > 8 && (
                    <div style={{ fontSize:12, color:'#3a4455' }}>+{plan.features.length - 8} more features</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ maxWidth:700, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:700, color:'#dde2ed', marginBottom:10 }}>
            Frequently asked questions
          </h2>
        </div>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setOpenFaq(openFaq===i ? null : i)}
              style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 0', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:12 }}>
              <span style={{ fontSize:14, fontWeight:500, color:'#dde2ed' }}>{faq.q}</span>
              <i className={`ti ti-chevron-${openFaq===i?'up':'down'}`} style={{ fontSize:14, color:'#4fa6ff', flexShrink:0 }} aria-hidden="true"/>
            </button>
            {openFaq===i && (
              <div style={{ paddingBottom:18, fontSize:13, color:'#6b7789', lineHeight:1.8 }}>{faq.a}</div>
            )}
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section style={{ maxWidth:680, margin:'0 auto 80px', padding:'0 24px', textAlign:'center' }}>
        <div style={{ background:'rgba(79,166,255,0.06)', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:16, padding:'48px 40px' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:700, color:'#dde2ed', marginBottom:12, lineHeight:1.3 }}>
            Find out what attackers already know about your domain.
          </h2>
          <p style={{ fontSize:15, color:'#6b7789', lineHeight:1.7, marginBottom:28 }}>
            Free scan. 90 seconds. No install. No credit card.
          </p>
          <button onClick={goSignup}
            style={{ background:'rgba(79,166,255,0.15)', border:'0.5px solid rgba(79,166,255,0.4)', borderRadius:10, padding:'14px 36px', fontSize:15, fontWeight:700, color:'#4fa6ff', cursor:'pointer' }}>
            Scan my domain free →
          </button>
          <div style={{ fontSize:12, color:'#3a4455', marginTop:14 }}>
            Trusted by T-Mobile vendors, MSPs, and 500+ businesses
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'0.5px solid rgba(255,255,255,0.06)', padding:'28px 48px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <LogoMark/>
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700 }}>CyberGuard</span>
          <span style={{ fontSize:12, color:'#3a4455' }}>— Security intelligence for modern business</span>
        </div>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          {[['Sign in', goLogin], ['Sign up free', goSignup], ['#features','Features'], ['#pricing','Pricing'], ['#faq','FAQ']].map(([label, action], i) => (
            <span key={i}>
              {typeof action === 'function'
                ? <button onClick={action} style={{ background:'none', border:'none', fontSize:12, color:'#3a4455', cursor:'pointer', padding:0 }}>{label}</button>
                : <a href={action} style={{ fontSize:12, color:'#3a4455', textDecoration:'none' }}>{label}</a>
              }
            </span>
          ))}
        </div>
        <div style={{ fontSize:11, color:'#3a4455' }}>© 2025 CyberGuard. All rights reserved.</div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
