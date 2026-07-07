/**
 * Onboarding — add domain → DNS TXT verification → first scan.
 * Uses Supabase DB to store domain + verify token.
 */
import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { PLANS } from '../lib/planLimits'
import { useApp, A } from '../store/appStore'
import { fullScan, verifyDomain } from '../lib/api'

const STEP_LABELS = ['Account', 'Domain', 'Verify', 'Scan']

export default function Onboarding(props) {
  const { state, send } = useApp()
  const [step, setStep]         = useState(2)
  const [domain, setDomain]     = useState('')
  const [domainError, setDomainError] = useState('')
  const [domainRow, setDomainRow] = useState(null)   // the DB row
  const [saving, setSaving]     = useState(false)
  const [verifyStatus, setVerifyStatus] = useState('idle') // idle|checking|found|not_found
  const [verifyError, setVerifyError]   = useState('')
  const [scanProgress, setScanProgress] = useState({})
  const [scanDone, setScanDone] = useState(false)
  const [scanError, setScanError] = useState('')
  const pollRef = useRef(null)

  // Clean up polling on unmount
  useEffect(() => () => clearInterval(pollRef.current), [])

  // On mount — check if user already has a pending domain and restore state
  useEffect(() => {
    if (!state.user) return
    restoreExistingDomain()
  }, [state.user?.id])

  async function restoreExistingDomain() {
    const { data: existing } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', state.user.id)
      .in('status', ['pending', 'failed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      // User already added a domain — skip step 2, go straight to verification
      setDomainRow(existing)
      setDomain(existing.name)
      setStep(3)
      console.log('[Onboarding] Restored pending domain:', existing.name, 'token:', existing.verify_token)
    }
  }

  // ── Step 2: Add domain ────────────────────────────────────
  function validateDomain(d) {
    const clean = d.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
    if (!clean) return 'Enter a domain name'
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-.]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(clean))
      return 'Enter a valid domain e.g. yourcompany.com'
    return null
  }

  async function addDomain() {
    const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
    const err   = validateDomain(clean)
    if (err) { setDomainError(err); return }
    setDomainError('')
    setSaving(true)

    try {
      // Check if user already added this domain
      const { data: existing } = await supabase
        .from('domains')
        .select('*')
        .eq('user_id', state.user.id)
        .eq('name', clean)
        .maybeSingle()

      if (existing) {
        // Domain already exists — ALWAYS use the existing row and its token
        // Never create a new row (would generate a new token and break DNS verification)
        setDomainRow(existing)
        setDomain(clean)
        setStep(existing.status === 'verified' ? 4 : 3)
        setSaving(false)
        return
      }

      // Check plan limits (free = 1 domain)
      const { count } = await supabase
        .from('domains')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', state.user.id)

      const plan  = state.profile?.plan ?? 'free'
      const limit = PLANS[plan]?.domains ?? 1
      if (count >= limit) {
        setDomainError(`Your ${PLANS[plan]?.name ?? plan} plan allows ${limit} domain(s). Upgrade on the Billing page for more.`)
        setSaving(false)
        return
      }

      // Insert new domain
      const { data, error } = await supabase
        .from('domains')
        .insert({ user_id: state.user.id, name: clean, status: 'pending' })
        .select()
        .single()

      if (error) {
        // Parse friendly error messages from our DB trigger
        if (error.message?.includes('domain_already_claimed')) {
          setDomainError(`${clean} is already verified by another account. If this is your domain, sign in with the account you used to verify it, or contact support.`)
        } else if (error.message?.includes('domain_already_added')) {
          setDomainError(`You already added ${clean}. Sign out and back in to continue verification.`)
        } else {
          setDomainError(error.message)
        }
        setSaving(false)
        return
      }
      setDomainRow(data)
      setDomain(clean)
      setStep(3)
    } catch (err) {
      console.error('[Onboarding] addDomain:', err.message)
      setDomainError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Step 3: Verify domain ownership via DNS TXT ───────────
  async function checkVerification() {
    if (!domainRow) return
    setVerifyStatus('checking')
    setVerifyError('')

    // Use the centralised api.js client — routed through Vite proxy to port 3001
    const result = await verifyDomain(domainRow.name, domainRow.verify_token)

    if (!result.ok) {
      setVerifyStatus('not_found')
      // Give a clear error depending on what went wrong
      if (!result.error || result.error.includes('timed out') || result.error.includes('fetch')) {
        setVerifyError('Cannot reach the API server. Make sure both terminals are running:\n1. npm run server\n2. npm run dev')
      } else {
        setVerifyError(result.error)
      }
      return
    }

    const json = result.data ?? {}

    if (json.verified) {
      setVerifyStatus('found')
      // Mark domain verified in Supabase
      await supabase.from('domains').update({
        status: 'verified',
        verified_at: new Date().toISOString()
      }).eq('id', domainRow.id)

      setDomainRow(prev => ({ ...prev, status: 'verified', verified_at: new Date().toISOString() }))
      clearInterval(pollRef.current)
      setTimeout(() => setStep(4), 800)
    } else {
      setVerifyStatus('not_found')
      setVerifyError(json.message ?? 'TXT record not found yet — DNS can take up to 48h to propagate')
    }
  }

  function startPolling() {
    checkVerification()
    pollRef.current = setInterval(checkVerification, 30000)
  }

  // ── Step 4: Run first scan ────────────────────────────────
  const scanStarted = useRef(false)
  useEffect(() => {
    if (step !== 4 || scanStarted.current || !domainRow) return
    scanStarted.current = true
    runScan()
  }, [step])

  async function runScan() {
    setScanError('')
    const steps  = ['dns', 'email', 'ssl', 'ports', 'darkweb', 'vuln']

    // Animate steps while real scan runs in parallel
    let i = 0
    const tick = () => {
      if (i > 0) setScanProgress(p => ({ ...p, [steps[i-1]]: 'done' }))
      if (i < steps.length) setScanProgress(p => ({ ...p, [steps[i]]: 'running' }))
      i++
    }
    tick()
    const anim = setInterval(tick, 600)

    const result = await fullScan(domainRow.name)
    clearInterval(anim)
    steps.forEach(s => setScanProgress(p => ({ ...p, [s]: 'done' })))

    if (!result.ok) {
      setScanError(result.error)
      console.warn('[Onboarding] Scan failed:', result.error)
    } else {
      // Persist scan result to Supabase
      const sd = result.data
      const grade = sd.overallScore >= 90 ? 'A' : sd.overallScore >= 75 ? 'B' : sd.overallScore >= 60 ? 'C' : sd.overallScore >= 40 ? 'D' : 'F'
      await supabase.from('scan_results').insert({
        domain_id:  domainRow.id,
        score:      Math.min(100, Math.max(0, sd.overallScore ?? 0)),
        grade,
        dns_score:  sd.scores?.dns  ?? 0,
        ssl_score:  sd.scores?.ssl  ?? 0,
        email_score: sd.dns?.email ? 70 : 0,
        cred_score: sd.scores?.credentials ?? 0,
        issues:     sd.issues    ?? [],
        raw_dns:    sd.dns       ?? {},
        raw_ssl:    sd.ssl       ?? {},
        raw_creds:  sd.credentials ?? {},
      })
      // Update domain last_scanned
      await supabase.from('domains').update({ last_scanned: new Date().toISOString() }).eq('id', domainRow.id)
    }

    setScanDone(true)
  }

  function finish() {
    // Tell App.jsx the domain is now verified — re-check and show dashboard
    if (props.onVerified) {
      props.onVerified()
    } else {
      window.location.reload()
    }
  }

  const SCAN_STEPS = [
    { key:'dns',     label:'DNS records',           color:'#4fa6ff' },
    { key:'email',   label:'Email authentication',  color:'#a78bfa' },
    { key:'ssl',     label:'SSL / TLS certs',       color:'#00cfaa' },
    { key:'ports',   label:'Open ports & services', color:'#ffb627' },
    { key:'darkweb', label:'Dark web exposure',     color:'#a78bfa' },
    { key:'vuln',    label:'Vulnerability index',   color:'#00cfaa' },
  ]

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', background:'#080b10', padding:'32px 20px 20px' }}>
      <Logo />

      <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.09)', borderRadius:14, padding:28, width:'100%', maxWidth:460, display:'flex', flexDirection:'column', gap:16, marginTop:8 }}>

        {/* Step indicator */}
        <div style={{ display:'flex', alignItems:'center' }}>
          {STEP_LABELS.map((lbl, i) => {
            const n = i + 1
            const done   = n < step
            const active = n === step
            return (
              <React.Fragment key={lbl}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:600, flexShrink:0,
                    background: done?'rgba(0,223,120,.12)':active?'rgba(79,166,255,.12)':'#161c2a',
                    color: done?'#00df78':active?'#4fa6ff':'#3a4455',
                    border: `0.5px solid ${done?'rgba(0,223,120,.25)':active?'rgba(79,166,255,.3)':'rgba(255,255,255,.06)'}`,
                  }}>{done ? '✓' : n}</div>
                  <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:done?'#00df78':active?'#4fa6ff':'#3a4455' }}>{lbl}</span>
                </div>
                {i < STEP_LABELS.length-1 && <div style={{ flex:1, height:'0.5px', background:'rgba(255,255,255,.06)', margin:'0 8px' }} />}
              </React.Fragment>
            )
          })}
        </div>

        {/* ── STEP 2: Domain input ── */}
        {step === 2 && (
          <>
            <div>
              <div style={{ fontSize:16, fontWeight:600, color:'#dde2ed', marginBottom:4 }}>Add your domain</div>
              <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#6b7789', lineHeight:1.6 }}>
                CyberGuard will scan your DNS, email security, SSL cert, and check for credential breaches — automatically.
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={domain} onChange={e=>{setDomain(e.target.value);setDomainError('')}}
                onKeyDown={e=>e.key==='Enter'&&addDomain()} placeholder="yourdomain.com" autoFocus
                style={{ flex:1, background:'#161c2a', border:`0.5px solid ${domainError?'#ff4757':'rgba(255,255,255,.09)'}`, borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono, monospace' }} />
              <button onClick={addDomain} disabled={saving}
                style={{ background:'rgba(79,166,255,.12)', border:'0.5px solid rgba(79,166,255,.3)', borderRadius:8, padding:'10px 16px', fontSize:12, color:'#4fa6ff', cursor:saving?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', fontWeight:600, opacity:saving?.7:1 }}>
                {saving ? '…' : 'Add'}
              </button>
            </div>
            {domainError && <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#ff4757', marginTop:-8 }}>{domainError}</div>}
          </>
        )}

        {/* ── STEP 3: DNS verification ── */}
        {step === 3 && domainRow && (
          <>
            <div>
              <div style={{ fontSize:16, fontWeight:600, color:'#dde2ed', marginBottom:4 }}>Verify you own this domain</div>
              <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#6b7789', lineHeight:1.6 }}>
                Add the following TXT record to your DNS provider (GoDaddy, Cloudflare, Namecheap, etc.). This proves you own {domainRow.name}.
              </div>
            </div>

            <div style={{ background:'#161c2a', border:'0.5px solid rgba(255,255,255,.09)', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:9, color:'#3a4455', marginBottom:8, letterSpacing:'1px', textTransform:'uppercase' }}>DNS TXT record to add</div>
              <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'6px 12px', fontFamily:'IBM Plex Mono, monospace', fontSize:11 }}>
                <span style={{ color:'#6b7789' }}>Type</span><span style={{ color:'#dde2ed' }}>TXT</span>
                <span style={{ color:'#6b7789' }}>Name / Host</span><span style={{ color:'#4fa6ff' }}>_cyberguard-verify</span>
                <span style={{ color:'#6b7789' }}>Value</span><span style={{ color:'#00df78', wordBreak:'break-all' }}>cg-{domainRow.verify_token}</span>
                <span style={{ color:'#6b7789' }}>TTL</span><span style={{ color:'#dde2ed' }}>300 (or lowest available)</span>
              </div>
            </div>

            <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#6b7789', lineHeight:1.6 }}>
              After adding the record, click "Check now". DNS can take a few minutes to a few hours to propagate.
            </div>

            {verifyError && (
              <div style={{ background:'rgba(255,182,39,.08)', border:'0.5px solid rgba(255,182,39,.25)', borderRadius:8, padding:'10px 12px' }}>
                {verifyError.split('\n').map((line, i) => (
                  <div key={i} style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#ffb627', lineHeight:1.7 }}>{line}</div>
                ))}
              </div>
            )}
            {verifyStatus === 'found' && <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:11, color:'#00df78' }}>✓ Domain verified! Starting scan…</div>}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={checkVerification} disabled={verifyStatus==='checking'||verifyStatus==='found'}
                style={{ flex:1, background:'rgba(79,166,255,.12)', border:'0.5px solid rgba(79,166,255,.3)', borderRadius:8, padding:'10px', fontSize:13, fontWeight:600, color:'#4fa6ff', cursor:'pointer', fontFamily:'Syne, sans-serif' }}>
                {verifyStatus==='checking' ? 'Checking…' : verifyStatus==='found' ? 'Verified ✓' : 'Check now'}
              </button>
              <button onClick={startPolling} disabled={verifyStatus==='found'}
                style={{ background:'#161c2a', border:'0.5px solid rgba(255,255,255,.09)', borderRadius:8, padding:'10px 14px', fontSize:11, color:'#6b7789', cursor:'pointer', fontFamily:'IBM Plex Mono, monospace' }}>
                Auto-check
              </button>
            </div>

            {/* Debug info — shows the exact status so user knows what's happening */}
            <div style={{ background:'#0a0d12', border:'0.5px solid rgba(255,255,255,.06)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:9, color:'#3a4455', marginBottom:6, letterSpacing:'1px', textTransform:'uppercase' }}>Status</div>
              <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#6b7789', display:'flex', flexDirection:'column', gap:3 }}>
                <span>API server: <a href="http://localhost:3001/api/health" target="_blank" rel="noopener noreferrer" style={{ color:'#4fa6ff' }}>check health</a></span>
                <span>Verify status: <span style={{ color: verifyStatus==='found'?'#00df78':verifyStatus==='checking'?'#4fa6ff':verifyStatus==='not_found'?'#ffb627':'#3a4455' }}>{verifyStatus}</span></span>
                <span>Looking for TXT: <span style={{ color:'#00df78' }}>_cyberguard-verify.{domainRow.name}</span></span>
                <span>With value: <span style={{ color:'#00df78' }}>cg-{domainRow.verify_token}</span></span>
              </div>
            </div>

            <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#3a4455', textAlign:'center' }}>
              Added the record but having trouble?{' '}
              <a href="https://docs.cyberguard.io/verification" target="_blank" rel="noopener noreferrer" style={{ color:'#4fa6ff' }}>View guide →</a>
            </div>
          </>
        )}

        {/* ── STEP 4: Scan progress ── */}
        {step === 4 && (
          <>
            <div>
              <div style={{ fontSize:16, fontWeight:600, color:'#dde2ed', marginBottom:4 }}>
                {scanDone ? '✓ Scan complete!' : 'Running first scan…'}
              </div>
              <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#6b7789', lineHeight:1.5 }}>
                {scanError
                  ? <span style={{ color:'#ffb627' }}>Unable to reach the API server — please refresh and try again</span>
                  : <span>Scanning <strong style={{ color:'#dde2ed' }}>{domainRow?.name}</strong> {scanDone ? '— results saved' : '— please wait'}</span>
                }
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {SCAN_STEPS.map(s => {
                const status = scanProgress[s.key]
                return (
                  <div key={s.key}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#6b7789', marginBottom:3 }}>
                      <span>{s.label}</span>
                      <span style={{ color: status==='done'?'#00df78':status==='running'?s.color:'#3a4455' }}>
                        {status==='done'?'✓ Done':status==='running'?'Scanning…':'Queued'}
                      </span>
                    </div>
                    <div style={{ height:3, background:'#161c2a', borderRadius:100, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:100, transition:'width .5s ease',
                        background: status==='done'?'#00df78':s.color,
                        width: status==='done'?'100%':status==='running'?'65%':'0%' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={finish} disabled={!scanDone}
              style={{
                background: scanDone?'rgba(0,223,120,.12)':'#161c2a',
                border:`0.5px solid ${scanDone?'rgba(0,223,120,.3)':'rgba(255,255,255,.06)'}`,
                borderRadius:8, padding:11, fontSize:13, fontWeight:600,
                color: scanDone?'#00df78':'#3a4455',
                cursor: scanDone?'pointer':'not-allowed', transition:'all .3s',
                fontFamily:'Syne, sans-serif',
              }}>
              {scanDone ? 'Open dashboard →' : 'Scanning…'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Logo() {
  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', maxWidth:460, marginBottom:28 }}>
      {/* Left: logo mark + wordmark */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'rgba(79,166,255,.08)', border:'1px solid rgba(79,166,255,.18)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <div style={{ position:'absolute', width:11, height:11, border:'1.5px solid #4fa6ff', borderRadius:2, transform:'rotate(45deg)' }} />
          <div style={{ position:'absolute', width:4.5, height:4.5, background:'#00df78', borderRadius:'50%' }} />
        </div>
        <span style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, color:'#dde2ed' }}>CyberGuard</span>
      </div>
      {/* Right: sign out */}
      <button
        onClick={handleSignOut}
        style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'IBM Plex Mono, monospace', fontSize:11, color:'#3a4455', padding:'4px 8px', borderRadius:6, transition:'color .15s' }}
        onMouseEnter={e => e.target.style.color='#6b7789'}
        onMouseLeave={e => e.target.style.color='#3a4455'}
      >
        Sign out ↗
      </button>
    </div>
  )
}