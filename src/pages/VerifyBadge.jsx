/**
 * Public verification page — /verify/:domain
 * Visitors land here when they click a CyberGuard badge.
 * No auth required.
 */
import React, { useEffect, useState } from 'react'

export default function VerifyBadge() {
  const domain = window.location.pathname.replace('/verify/', '').replace(/\/$/, '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const apiBase = import.meta.env.VITE_API_URL ?? ''

  useEffect(() => {
    if (!domain) return
    fetch(`${apiBase}/api/badge/${domain}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [domain])

  function gradeColor(score) {
    if (score >= 90) return '#059669'
    if (score >= 75) return '#0284c7'
    if (score >= 60) return '#d97706'
    if (score >= 40) return '#dc2626'
    return '#991b1b'
  }

  function gradeLabel(score) {
    if (score >= 90) return 'Advanced'
    if (score >= 75) return 'Good'
    if (score >= 60) return 'Intermediate'
    if (score >= 40) return 'Basic'
    return 'High Risk'
  }

  const fill = data?.score != null ? gradeColor(data.score) : '#6b7280'

  return (
    <div style={{ minHeight:'100vh', background:'#080b10', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'#0f1420', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, maxWidth:480, width:'100%', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#0a1628,#0f2040)', padding:32, textAlign:'center', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,223,120,0.08)', border:'1px solid rgba(0,223,120,0.2)', borderRadius:100, padding:'6px 16px', fontSize:12, color:'#00df78', marginBottom:20 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#00df78', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
            {loading ? 'Checking...' : data?.verified ? 'Live Verified' : 'Not Verified'}
          </div>

          <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:4, wordBreak:'break-all' }}>{domain}</div>

          {!loading && data?.verified && (
            <>
              <div style={{ width:72, height:72, borderRadius:'50%', background:fill, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, fontWeight:700, color:'white', margin:'20px auto 8px' }}>
                {data.grade}
              </div>
              <div style={{ fontSize:28, fontWeight:700, color:'#fff' }}>
                {data.score}<span style={{ fontSize:16, color:'#6b7280' }}>/100</span>
              </div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>Security Score</div>
            </>
          )}

          {!loading && !data?.verified && (
            <div style={{ color:'#ff4757', fontSize:13, marginTop:8 }}>
              This domain has not been verified by CyberGuard
            </div>
          )}

          {loading && (
            <div style={{ color:'#6b7280', fontSize:13, marginTop:16 }}>Loading verification data...</div>
          )}
        </div>

        {/* Data rows */}
        {!loading && data?.verified && (
          <div style={{ padding:24 }}>
            {[
              ['Domain', domain],
              ['Security grade', `${data.grade} — ${gradeLabel(data.score)}`],
              ['Critical issues', data.criticalCount === 0 ? '✓ None' : String(data.criticalCount)],
              ['High issues', data.highCount === 0 ? '✓ None' : String(data.highCount)],
              ['Last scanned', data.scannedAt],
              ['Monitored by', '🛡 CyberGuard'],
            ].map(([label, value], i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize:13 }}>
                <span style={{ color:'#6b7280' }}>{label}</span>
                <span style={{ fontWeight:600, color: label === 'Critical issues' && data.criticalCount > 0 ? '#ff4757' : label === 'High issues' && data.highCount > 0 ? '#ffb627' : label === 'Security grade' ? fill : '#dde2ed' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:'16px 24px', background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.05)', textAlign:'center', fontSize:11, color:'#3a4455' }}>
          Verified by{' '}
          <a href="https://cyberguard.visull.com" target="_blank" rel="noreferrer" style={{ color:'#4fa6ff', textDecoration:'none' }}>
            CyberGuard Security Intelligence
          </a>
          {' · '}
          <a href="https://cyberguard.visull.com" target="_blank" rel="noreferrer" style={{ color:'#4fa6ff', textDecoration:'none' }}>
            Scan your domain free →
          </a>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}`}</style>
    </div>
  )
}
