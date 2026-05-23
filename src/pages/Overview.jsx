import React, { useState, useEffect } from 'react'
import { useApp, A } from '../store/appStore'
import { useScanData } from '../hooks/useScanData'
import { StatCard, Card, Grid, IssueRow } from '../components/ui'
import ScoreChart from '../components/ui/ScoreChart'
import OnboardingChecklist from '../components/ui/OnboardingChecklist'
import FixWizard from '../components/ui/FixWizard'
import { scoreColor } from '../utils/helpers'

const MODULES = [
  { id:'threats',    icon:'ti-radar',        bg:'rgba(255,71,87,.07)',    fg:'#ff4757', label:'Threat Detection',   phase2:true },
  { id:'domain',     icon:'ti-world',        bg:'rgba(79,166,255,.07)',   fg:'#4fa6ff', label:'Domain + Email',      phase2:false },
  { id:'darkweb',    icon:'ti-eye-off',      bg:'rgba(167,139,250,.07)', fg:'#a78bfa', label:'Dark Web Monitor',   phase2:true },
  { id:'vendor',     icon:'ti-building',     bg:'rgba(0,207,170,.07)',    fg:'#00cfaa', label:'Vendor Risk',         phase2:false },
  { id:'response',   icon:'ti-shield-check', bg:'rgba(0,223,120,.07)',    fg:'#00df78', label:'Managed Response',   phase2:true },
  { id:'compliance', icon:'ti-certificate',  bg:'rgba(0,223,120,.07)',    fg:'#00df78', label:'Compliance',          phase2:false },
  { id:'creds',      icon:'ti-key',          bg:'rgba(255,182,39,.07)',   fg:'#ffb627', label:'Credential Check',   phase2:false },
  { id:'training',   icon:'ti-school',       bg:'rgba(79,166,255,.07)',   fg:'#4fa6ff', label:'Awareness Training', phase2:true },
]

export default function Overview() {
  const { send } = useApp()
  const { domainName, isReal, loading, scores, issueCount, scoreDimensions,
          dnsIssues, emailIssues, sslIssues, scannedAt, domainRow } = useScanData()

  const [fixIssue, setFixIssue] = useState(null)

  useEffect(() => {
    const handler = (e) => setFixIssue(e.detail)
    window.addEventListener('openFixWizard', handler)
    return () => window.removeEventListener('openFixWizard', handler)
  }, [])

  const overall   = scores.overall
  const critCount = issueCount.critical
  const topIssues = [...dnsIssues, ...emailIssues, ...sslIssues]
    .filter(i => i.sev === 'critical' || i.sev === 'high').slice(0, 5)

  return (
    <>
    {fixIssue && <FixWizard issue={fixIssue} onClose={() => setFixIssue(null)} />}
    <OnboardingChecklist />
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>

      {/* No scan yet */}
      {!loading && !isReal && domainName !== '—' && (
        <div style={{ background:'rgba(79,166,255,0.07)', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:8, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#4fa6ff', display:'flex', alignItems:'center', gap:8 }}>
          <i className="ti ti-info-circle" style={{ fontSize:14, flexShrink:0 }} aria-hidden="true" />
          Domain verified. Click <strong style={{ color:'#dde2ed' }}>Run scan</strong> in the top bar to scan {domainName} and populate your dashboard with real data.
        </div>
      )}

      <Grid cols={4} gap={10}>
        <StatCard label="Security Score"   value={isReal ? `${overall}/100` : '—'}  note={isReal ? `Grade ${scores.overall >= 90?'A':scores.overall>=75?'B':scores.overall>=60?'C':'D'}` : 'Run a scan first'} accent={isReal ? (overall>=75?'gr':overall>=60?'am':'re') : 'bl'} />
        <StatCard label="Critical Issues"  value={isReal ? critCount : '—'}          note={isReal ? 'Need immediate fix' : 'Run a scan first'}                                                                          accent={isReal && critCount > 0 ? 're' : 'bl'} />
        <StatCard label="Total Issues"     value={isReal ? issueCount.total : '—'}   note={isReal ? `${issueCount.high} high severity` : 'Run a scan first'}                                                           accent={isReal && issueCount.total > 0 ? 'am' : 'bl'} />
        <StatCard label="Headers score"    value={isReal ? `${scores.headers}/100` : '—'} note="HTTP security headers" accent={isReal ? (scores.headers>=80?'gr':scores.headers>=60?'am':'re') : 'bl'} />
        <StatCard label="Domain"           value={domainName !== '—' ? domainName : 'No domain'} note={isReal ? `Last scanned ${new Date(scannedAt).toLocaleDateString()}` : 'Verified ✓'} accent="bl" />
      </Grid>

      <Grid cols={2} gap={12}>
        {/* Issues */}
        <Card title={isReal ? 'Issues found' : 'No scan data yet'} titleIcon="ti-alert-triangle"
              badge={isReal ? `${critCount} critical` : 'Run scan'} badgeType={critCount > 0 ? 'bad' : 'bl'}>
          {!isReal ? (
            <div style={{ padding:'20px 14px', textAlign:'center', color:'#3a4455', fontFamily:'IBM Plex Mono,monospace', fontSize:11, lineHeight:1.7 }}>
              No scan data yet for <strong style={{ color:'#6b7789' }}>{domainName}</strong>.<br/>
              Click <strong style={{ color:'#4fa6ff' }}>Run scan</strong> in the top bar to start.
            </div>
          ) : topIssues.length === 0 ? (
            <div style={{ padding:'16px 14px', color:'#00df78', fontFamily:'IBM Plex Mono,monospace', fontSize:11 }}>
              🎉 No critical or high issues found for {domainName}.
            </div>
          ) : (
            topIssues.map(t => <IssueRow key={t.id} sev={t.sev} name={t.name} tag={t.tag} tagType={t.tagType} fix={t.fix} why={t.why} issueId={t.id} issueTitle={t.name} />)
          )}
        </Card>

        {/* Score ring */}
        <Card title="Security posture" titleIcon="ti-chart-bar">
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 14px' }}>
            <svg width={80} height={80} viewBox="0 0 80 80" aria-label={`Security score ${overall}`}>
              <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={8}/>
              <circle cx={40} cy={40} r={34} fill="none" stroke="url(#sg2)" strokeWidth={8} strokeLinecap="round"
                strokeDasharray={`${(overall/100)*214} 214`} transform="rotate(-90 40 40)"/>
              <defs><linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4fa6ff"/><stop offset="100%" stopColor="#00df78"/>
              </linearGradient></defs>
              <text x={40} y={38} textAnchor="middle" style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, fill:'#dde2ed' }}>
                {isReal ? overall : '—'}
              </text>
              <text x={40} y={50} textAnchor="middle" style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:7, fill:'#3a4455' }}>
                {isReal ? '/100' : 'no scan'}
              </text>
            </svg>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
              {scoreDimensions.map(d => (
                <div key={d.key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:10 }}>
                  <span style={{ color:'#6b7789', flex:1 }}>{d.label}</span>
                  <div style={{ width:70, height:3, background:'rgba(255,255,255,0.04)', borderRadius:100, overflow:'hidden' }}>
                    <div style={{ width:`${d.score}%`, height:'100%', background: d.color ?? scoreColor(d.score), borderRadius:100 }}/>
                  </div>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color: d.color ?? scoreColor(d.score), width:22, textAlign:'right' }}>
                    {d.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Grid>

      {/* Score history chart */}
      {domainRow && (
        <Card title="Score history" titleIcon="ti-chart-line">
          <ScoreChart domainId={domainRow.id} height={150} />
        </Card>
      )}

      {/* Modules */}
      <Card title="Security modules" titleIcon="ti-layout-grid">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:8, padding:12 }}>
          {MODULES.map(m => (
            <button key={m.id} onClick={() => send(A.SET_PAGE, m.id)}
              style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:10, cursor:'pointer', textAlign:'left', transition:'all .12s', position:'relative' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.background='rgba(255,255,255,0.02)' }}>
              <div style={{ width:28, height:28, borderRadius:7, background:m.bg, color:m.fg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:7 }}>
                <i className={`ti ${m.icon}`} style={{ fontSize:14 }} aria-hidden="true"/>
              </div>
              <div style={{ fontSize:10, fontWeight:600, color:'#dde2ed', lineHeight:1.3, marginBottom:3 }}>{m.label}</div>
              {m.phase2 && (
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455' }}>Coming soon</div>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  </>
  )
}
