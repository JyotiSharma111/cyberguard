/**
 * Landing page — shown to unauthenticated visitors.
 * Pitch, features, pricing, CTA.
 */
import React, { useState } from 'react'
import { useApp, A } from '../store/appStore'
import { PLANS } from '../lib/planLimits'

const FEATURES = [
  { icon:'ti-hierarchy',   color:'#4fa6ff', title:'DNS monitoring',        detail:'A, MX, PTR, CAA, DNSSEC — every record checked and scored daily.' },
  { icon:'ti-mail',        color:'#a78bfa', title:'Email authentication',  detail:'SPF, DKIM, DMARC, BIMI, MTA-STS — stop email spoofing dead.' },
  { icon:'ti-lock',        color:'#00cfaa', title:'SSL / TLS scanning',    detail:'Cert expiry, protocol version, cipher strength — never expire again.' },
  { icon:'ti-shield',      color:'#4fa6ff', title:'HTTP security headers', detail:'CSP, HSTS, X-Frame-Options — the headers most SMBs are missing.' },
  { icon:'ti-scan',        color:'#ffb627', title:'Port & CVE detection',  detail:'Shodan InternetDB scan — exposed ports and known vulnerabilities.' },
  { icon:'ti-world',       color:'#00cfaa', title:'Subdomain discovery',   detail:'Certificate transparency logs reveal forgotten and exposed subdomains.' },
  { icon:'ti-calendar',    color:'#4fa6ff', title:'Domain WHOIS & expiry', detail:'Never lose your domain — alerts 90, 30, and 7 days before expiry.' },
  { icon:'ti-key',         color:'#ff4757', title:'Credential breaches',   detail:'HaveIBeenPwned — check if your domain appeared in breach data.' },
  { icon:'ti-virus',       color:'#ff4757', title:'Threat intelligence',   detail:'VirusTotal — 90+ security engines check your domain reputation.' },
  { icon:'ti-bell',        color:'#00df78', title:'Smart alerts',          detail:'Email + Slack alerts when anything changes. Daily and weekly digests.' },
  { icon:'ti-building',    color:'#a78bfa', title:'Vendor risk grading',   detail:'Grade your suppliers A+ to F based on their security posture.' },
  { icon:'ti-file-report', color:'#4fa6ff', title:'PDF security reports',  detail:'One-click professional report for your board or compliance team.' },
]

const TESTIMONIALS = [
  { name:'Sarah M.',   role:'Director, Accountancy firm',   quote:'A client told me they got a fake invoice from "my" domain. CyberGuard showed me my DMARC was p=none. Fixed in an hour.' },
  { name:'James K.',   role:'IT Manager, Logistics co.',    quote:'I used to check these things manually every quarter. Now I get an email the moment anything changes. Saves me hours a month.' },
  { name:'Raj P.',     role:'MSP owner',                    quote:'I use it for all 15 of my clients. The vendor grading feature alone justifies the cost — I can show clients their supplier risks.' },
]

const FAQS = [
  ['What does CyberGuard actually scan?', 'We run 9 checks on every scan: DNS records, SSL certificate, email authentication (SPF/DKIM/DMARC/BIMI), HTTP security headers, open ports (via Shodan), subdomain discovery, WHOIS/domain expiry, credential breaches (HIBP), and domain reputation (VirusTotal). All passive — we never touch your servers.'],
  ['Do I need to install anything?', 'No. Everything is passive scanning of publicly available information. You add your domain, add one DNS TXT record to prove you own it, and we do the rest.'],
  ['How is this different from free tools like MXToolbox?', 'MXToolbox is a diagnostic tool — you go there when something breaks. CyberGuard monitors continuously, alerts you the moment something changes, tracks history, and gives you a single score to share with your board or clients.'],
  ['Is the free tier actually useful?', 'Yes. One domain, full scanning across all 9 checks, email alerts, and a security score. No credit card needed. You can try it and get real findings in under 5 minutes.'],
  ['Can I share my dashboard with my team?', 'Yes — generate a shareable read-only link. Your team or board can view scores and issues without needing an account. Links expire after 30 days.'],
  ['Is my data safe?', 'We only store publicly available scan data about your domain. Staff email addresses (if you upload them) are stored encrypted. You can delete all your data at any time from Account Settings.'],
]

export default function Landing({ onSignup, onLogin }) {
  const { send } = useApp()
  const [openFaq, setOpenFaq] = useState(null)

  const handleSignup = () => send(A.SET_PAGE, '__login_signup')
  const handleLogin  = () => send(A.SET_PAGE, '__login')

  return (
    <div style={{ background:'#080b10', color:'#dde2ed', fontFamily:'system-ui,-apple-system,sans-serif', minHeight:'100vh' }}>

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 48px', borderBottom:'0.5px solid rgba(255,255,255,0.06)', position:'sticky', top:0, background:'rgba(8,11,16,0.95)', backdropFilter:'blur(12px)', zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <LogoMark />
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700 }}>CyberGuard</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href="#features" style={{ fontSize:13, color:'#6b7789', textDecoration:'none' }}>Features</a>
          <a href="#pricing"  style={{ fontSize:13, color:'#6b7789', textDecoration:'none' }}>Pricing</a>
          <a href="#faq"      style={{ fontSize:13, color:'#6b7789', textDecoration:'none' }}>FAQ</a>
          <button onClick={handleLogin}
            style={{ background:'transparent', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 16px', fontSize:12, color:'#6b7789', cursor:'pointer' }}>
            Sign in
          </button>
          <button onClick={handleSignup}
            style={{ background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.3)', borderRadius:8, padding:'7px 16px', fontSize:12, fontWeight:600, color:'#4fa6ff', cursor:'pointer' }}>
            Try free →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth:900, margin:'0 auto', padding:'80px 24px 60px', textAlign:'center' }}>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#4fa6ff', letterSpacing:'2px', textTransform:'uppercase', marginBottom:20 }}>
          Security intelligence for small business
        </div>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:52, fontWeight:700, lineHeight:1.15, marginBottom:20, color:'#dde2ed' }}>
          One score.<br/>
          <span style={{ color:'#4fa6ff' }}>Nine security checks.</span><br/>
          Plain English.
        </h1>
        <p style={{ fontSize:18, color:'#6b7789', lineHeight:1.7, maxWidth:600, margin:'0 auto 36px' }}>
          CyberGuard monitors your domain's DNS, email security, SSL, open ports, credentials, and more — automatically. Get alerted the moment something changes.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={handleSignup}
            style={{ background:'rgba(79,166,255,0.1)', border:'1px solid rgba(79,166,255,0.3)', borderRadius:10, padding:'14px 32px', fontSize:15, fontWeight:700, color:'#4fa6ff', cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
            Start free — no credit card →
          </button>
          <button onClick={handleLogin}
            style={{ background:'transparent', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'14px 28px', fontSize:14, color:'#6b7789', cursor:'pointer' }}>
            Sign in
          </button>
        </div>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455', marginTop:14 }}>
          Free forever for 1 domain · No install needed · Results in 60 seconds
        </div>
      </section>

      {/* Score mockup */}
      <section style={{ maxWidth:700, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'28px', boxShadow:'0 40px 120px rgba(0,0,0,0.6)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:20 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:56, fontWeight:700, color:'#ffb627', lineHeight:1 }}>67</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>/100</div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:'#ffb627', background:'rgba(255,182,39,0.08)', border:'0.5px solid rgba(255,182,39,0.2)', borderRadius:6, padding:'2px 12px', marginTop:6 }}>Grade C</div>
            </div>
            <div style={{ flex:1 }}>
              {[['DNS health','94','#00df78'],['Email auth (DMARC)','30','#ff4757'],['SSL / TLS','88','#00df78'],['HTTP headers','45','#ffb627'],['DKIM signing','60','#ffb627'],['Open ports','100','#00df78']].map(([label,score,color]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', width:160 }}>{label}</span>
                  <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.05)', borderRadius:100 }}>
                    <div style={{ width:`${score}%`, height:'100%', background:color, borderRadius:100 }}/>
                  </div>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color, width:22, textAlign:'right' }}>{score}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'rgba(255,71,87,0.07)', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#ff4757' }}>
            🚨 DMARC p=none — anyone can send email pretending to be from @yourdomain.com
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth:1000, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:700, marginBottom:12 }}>9 checks on every scan</h2>
          <p style={{ fontSize:15, color:'#6b7789' }}>All passive — we never touch your servers. Results in under 60 seconds.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:`${f.color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={`ti ${f.icon}`} style={{ fontSize:15, color:f.color }} aria-hidden="true"/>
                </div>
                <span style={{ fontSize:12, fontWeight:600 }}>{f.title}</span>
              </div>
              <div style={{ fontSize:12, color:'#6b7789', lineHeight:1.6 }}>{f.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'18px' }}>
              <div style={{ fontSize:13, color:'#dde2ed', lineHeight:1.7, marginBottom:14, fontStyle:'italic' }}>"{t.quote}"</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#4fa6ff' }}>{t.name}</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth:900, margin:'0 auto 80px', padding:'0 24px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:700, marginBottom:12 }}>Simple pricing</h2>
          <p style={{ fontSize:15, color:'#6b7789' }}>Start free. Upgrade when you need more. Cancel anytime.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {Object.entries(PLANS).map(([key, plan]) => {
            const isPopular = key === 'pro'
            return (
              <div key={key} style={{ background:'#0f1420', border:`${isPopular?'1.5':'0.5'}px solid ${isPopular?'rgba(79,166,255,0.3)':'rgba(255,255,255,0.07)'}`, borderRadius:12, padding:'24px 20px', position:'relative', display:'flex', flexDirection:'column' }}>
                {isPopular && (
                  <div style={{ position:'absolute', top:-1, right:16, fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#4fa6ff', background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.3)', padding:'2px 10px', borderRadius:'0 0 7px 7px' }}>
                    Most popular
                  </div>
                )}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#dde2ed', marginBottom:6 }}>{plan.name}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:34, fontWeight:700 }}>${plan.price}</span>
                    <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>/month</span>
                  </div>
                  {plan.price > 0 && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#00df78', marginTop:4 }}>14-day free trial</div>}
                </div>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display:'flex', gap:8, fontSize:12, color:'#6b7789' }}>
                      <span style={{ color:'#00df78', flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={handleSignup}
                  style={{ width:'100%', background: isPopular?'rgba(79,166,255,0.1)':'rgba(255,255,255,0.04)', border:`0.5px solid ${isPopular?'rgba(79,166,255,0.3)':'rgba(255,255,255,0.1)'}`, borderRadius:8, padding:'10px', fontSize:12, fontWeight:600, color: isPopular?'#4fa6ff':'#6b7789', cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
                  {plan.price === 0 ? 'Start free' : `Start trial`}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ maxWidth:640, margin:'0 auto 80px', padding:'0 24px' }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:700, textAlign:'center', marginBottom:36 }}>Common questions</h2>
        {FAQS.map(([q, a], i) => (
          <div key={i} style={{ borderBottom:'0.5px solid rgba(255,255,255,0.07)', overflow:'hidden' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'16px 0', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontSize:14, fontWeight:500, color:'#dde2ed', flex:1, paddingRight:16 }}>{q}</span>
              <i className={`ti ti-chevron-${openFaq===i?'up':'down'}`} style={{ fontSize:14, color:'#3a4455', flexShrink:0 }} aria-hidden="true"/>
            </button>
            {openFaq === i && (
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'#6b7789', lineHeight:1.8, paddingBottom:16 }}>{a}</div>
            )}
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ textAlign:'center', padding:'60px 24px 80px', background:'rgba(79,166,255,0.04)', borderTop:'0.5px solid rgba(79,166,255,0.1)' }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:700, marginBottom:12 }}>Ready to secure your domain?</h2>
        <p style={{ fontSize:15, color:'#6b7789', marginBottom:28 }}>Takes 5 minutes. No credit card. Real findings instantly.</p>
        <button onClick={handleSignup}
          style={{ background:'rgba(79,166,255,0.1)', border:'1px solid rgba(79,166,255,0.3)', borderRadius:10, padding:'14px 36px', fontSize:15, fontWeight:700, color:'#4fa6ff', cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
          Start free — 1 domain forever →
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'0.5px solid rgba(255,255,255,0.06)', padding:'24px 48px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <LogoMark size={20} />
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600 }}>CyberGuard</span>
        </div>
        <div style={{ display:'flex', gap:20, fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>support@cyberguard.io</span>
        </div>
      </footer>
    </div>
  )
}

function LogoMark({ size = 28 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.25, background:'rgba(79,166,255,0.08)', border:'1px solid rgba(79,166,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', width:size*0.45, height:size*0.45, border:`${size*0.07}px solid #4fa6ff`, borderRadius:size*0.07, transform:'rotate(45deg)' }}/>
      <div style={{ position:'absolute', width:size*0.2, height:size*0.2, background:'#00df78', borderRadius:'50%' }}/>
    </div>
  )
}
