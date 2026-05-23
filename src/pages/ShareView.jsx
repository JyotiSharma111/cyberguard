/**
 * Public share link page — /share/:token
 * Read-only view of a domain's security dashboard.
 * No login required. Respects expiry and revocation.
 * Staff emails shown masked. No settings accessible.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { StatCard, Card, Grid, IssueRow } from '../components/ui'
import ScoreChart from '../components/ui/ScoreChart'

export default function ShareView({ token }) {
  const [state, setState] = useState('loading')  // loading|valid|expired|invalid
  const [shareData, setShareData] = useState(null)
  const [scan, setScan] = useState(null)

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    loadShare()
  }, [token])

  async function loadShare() {
    // Look up the share link (public RLS policy allows reading valid tokens)
    const { data: link, error } = await supabase
      .from('share_links')
      .select('*, domains(name, user_id)')
      .eq('token', token)
      .eq('revoked', false)
      .maybeSingle()

    if (error || !link) { setState('invalid'); return }
    if (new Date(link.expires_at) < new Date()) { setState('expired'); return }

    // Increment view counter
    await supabase.from('share_links')
      .update({ views: (link.views ?? 0) + 1 })
      .eq('id', link.id)

    setShareData(link)

    // Load latest scan for this domain
    const { data: latestScan } = await supabase
      .from('scan_results')
      .select('*')
      .eq('domain_id', link.domain_id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setScan(latestScan)
    setState('valid')
  }

  if (state === 'loading') return <Splash msg="Loading shared dashboard…" />
  if (state === 'expired') return <ErrorPage title="Link expired" msg="This share link has expired. Ask the owner to generate a new one." />
  if (state === 'invalid') return <ErrorPage title="Link not found" msg="This share link is invalid or has been revoked." />

  const domain = shareData?.domains?.name ?? '—'
  const score  = scan?.score ?? 0
  const grade  = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
  const issues = scan?.issues ?? []
  const crit   = issues.filter(i => i.sev === 'critical')
  const high   = issues.filter(i => i.sev === 'high')

  return (
    <div style={{ minHeight:'100vh', background:'#080b10', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ background:'#0f1420', borderBottom:'0.5px solid rgba(255,255,255,0.07)', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <LogoMark />
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'#dde2ed' }}>CyberGuard</span>
          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>/ shared view</span>
        </div>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>
          Read-only · {domain} · Expires {new Date(shareData.expires_at).toLocaleDateString()}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:20, maxWidth:900, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Score hero */}
        <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'20px 24px', display:'flex', alignItems:'center', gap:24 }}>
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:52, fontWeight:700, lineHeight:1, color: score>=75?'#00df78':score>=60?'#ffb627':'#ff4757' }}>{score}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>/ 100</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, marginTop:4, padding:'2px 12px', borderRadius:6, background: score>=75?'rgba(0,223,120,0.08)':'rgba(255,182,39,0.08)', color: score>=75?'#00df78':'#ffb627', border:`0.5px solid ${score>=75?'rgba(0,223,120,0.2)':'rgba(255,182,39,0.2)'}` }}>Grade {grade}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:600, color:'#dde2ed', marginBottom:4 }}>Security report — {domain}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', marginBottom:12 }}>
              {scan ? `Last scanned: ${new Date(scan.scanned_at).toLocaleString()}` : 'No scan data yet'}
            </div>
            <Grid cols={4} gap={8}>
              <StatCard label="Critical" value={crit.length}   note="issues" accent={crit.length>0?'re':'gr'} />
              <StatCard label="High"     value={high.length}   note="issues" accent={high.length>0?'am':'gr'} />
              <StatCard label="Total"    value={issues.length} note="issues" accent="bl" />
              <StatCard label="Domain"   value={domain}        note="verified" accent="bl" />
            </Grid>
          </div>
        </div>

        {/* Score history */}
        {shareData?.domain_id && (
          <Card title="Score history" titleIcon="ti-chart-line">
            <ScoreChart domainId={shareData.domain_id} height={140} />
          </Card>
        )}

        {/* Issues — no fix steps in shared view (that's owner-only detail) */}
        <Card title="Security issues" titleIcon="ti-alert-triangle"
              badge={crit.length > 0 ? `${crit.length} critical` : `${issues.length} total`}
              badgeType={crit.length > 0 ? 'bad' : issues.length > 0 ? 'warn' : 'ok'}>
          {issues.length === 0 ? (
            <div style={{ padding:'16px 14px', color:'#00df78', fontFamily:'IBM Plex Mono,monospace', fontSize:11 }}>🎉 No issues found.</div>
          ) : (
            issues.map(i => (
              <div key={i.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:i.sev==='critical'?'#ff4757':i.sev==='high'?'#ffb627':'#4fa6ff', flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:11.5, color:'#dde2ed' }}>{i.title ?? i.name}</span>
                <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, padding:'2px 8px', borderRadius:100,
                  color:i.sev==='critical'?'#ff4757':i.sev==='high'?'#ffb627':'#4fa6ff',
                  background:i.sev==='critical'?'rgba(255,71,87,.07)':i.sev==='high'?'rgba(255,182,39,.07)':'rgba(79,166,255,.07)',
                  border:`0.5px solid ${i.sev==='critical'?'rgba(255,71,87,.2)':i.sev==='high'?'rgba(255,182,39,.2)':'rgba(79,166,255,.2)'}` }}>
                  {i.sev}
                </span>
              </div>
            ))
          )}
        </Card>

        {/* CTA */}
        <div style={{ background:'rgba(79,166,255,0.05)', border:'0.5px solid rgba(79,166,255,0.15)', borderRadius:10, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#dde2ed', marginBottom:3 }}>Want to monitor your own domain?</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789' }}>Free to start — DNS, email, SSL, breach detection</div>
          </div>
          <a href="/" style={{ background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.25)', borderRadius:8, padding:'9px 18px', fontSize:12, fontWeight:600, color:'#4fa6ff', textDecoration:'none', fontFamily:'Syne,sans-serif', flexShrink:0 }}>
            Try CyberGuard free →
          </a>
        </div>
      </div>
    </div>
  )
}

function Splash({ msg }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080b10', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>{msg}</div>
  )
}

function ErrorPage({ title, msg }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080b10', padding:20 }}>
      <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:12, padding:28, maxWidth:400, textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:600, color:'#ff4757', marginBottom:8, fontFamily:'Syne,sans-serif' }}>{title}</div>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#6b7789', lineHeight:1.6, marginBottom:16 }}>{msg}</div>
        <a href="/" style={{ color:'#4fa6ff', fontFamily:'IBM Plex Mono,monospace', fontSize:11 }}>← Go to CyberGuard</a>
      </div>
    </div>
  )
}

function LogoMark() {
  return (
    <div style={{ width:26, height:26, borderRadius:7, background:'rgba(79,166,255,0.08)', border:'1px solid rgba(79,166,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <div style={{ position:'absolute', width:9, height:9, border:'1.5px solid #4fa6ff', borderRadius:2, transform:'rotate(45deg)' }}/>
      <div style={{ position:'absolute', width:4, height:4, background:'#00df78', borderRadius:'50%' }}/>
    </div>
  )
}
