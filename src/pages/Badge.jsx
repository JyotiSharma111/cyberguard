/**
 * Badge — get your CyberGuard trust badge
 */
import React, { useState } from 'react'
import { useApp } from '../store/appStore'
import { useScanData } from '../hooks/useScanData'

export default function Badge() {
  const { state } = useApp()
  const { domainName } = useScanData()
  const [copied, setCopied] = useState(null)
  const [style, setStyle] = useState('full')
  const [badgeData, setBadgeData] = useState(null)
  const apiBase = import.meta.env.VITE_API_URL ?? 'https://cyberguard-production-f12b.up.railway.app'
  const frontendBase = 'https://cyberguard.visull.com'

  // Fetch live badge data from API
  React.useEffect(() => {
    if (!domainName || domainName === '—') return
    fetch(`${apiBase}/api/badge/${domainName}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setBadgeData(d) })
      .catch(() => {})
  }, [domainName, apiBase])

  const score = badgeData?.score ?? 0
  const grade = badgeData?.grade ?? 'F'
  const fill = score >= 90 ? '#059669' : score >= 75 ? '#0284c7' : score >= 60 ? '#d97706' : score >= 40 ? '#dc2626' : '#991b1b'

  const badgeUrl  = `${apiBase}/api/badge/${domainName}/svg?style=${style}`
  const verifyUrl = `${frontendBase}/verify/${domainName}`

  const snippets = {
    html: `<!-- CyberGuard Trust Badge -->
<a href="${verifyUrl}" target="_blank" rel="noopener" title="Verified by CyberGuard Security">
  <img src="${badgeUrl}" alt="CyberGuard Security Badge" width="${style === 'mini' ? '90' : '200'}" height="${style === 'mini' ? '36' : '56'}" style="border:none"/>
</a>`,
    wordpress: `[cyberguard_badge domain="${domainName}" style="${style}"]`,
    markdown: `[![CyberGuard Security](${badgeUrl})](${verifyUrl})`,
  }

  async function copy(key) {
    try {
      await navigator.clipboard.writeText(snippets[key])
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  if (!domainName || domainName === '—') {
    return (
      <div style={{ padding:24 }}>
        <div style={{ background:'rgba(255,183,39,0.07)', border:'0.5px solid rgba(255,183,39,0.2)', borderRadius:10, padding:20, color:'#ffb627', fontSize:13 }}>
          Add and verify a domain first to get your trust badge.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:16, maxWidth:800 }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:'#dde2ed', marginBottom:6 }}>🛡 Trust Badge</h2>
        <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>
          Add a CyberGuard badge to your website to show visitors your domain is actively monitored for security issues.
          The badge updates automatically when you run a new scan.
        </p>
      </div>

      {/* Live preview */}
      <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:12, padding:24, marginBottom:16 }}>
        <div style={{ fontSize:11, color:'#3a4455', fontFamily:'IBM Plex Mono,monospace', marginBottom:16, textTransform:'uppercase', letterSpacing:'1px' }}>Live preview — {domainName}</div>

        {/* Style selector */}
        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {['full', 'mini'].map(s => (
            <button key={s} onClick={() => setStyle(s)}
              style={{ padding:'5px 14px', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace',
                background: style === s ? 'rgba(79,166,255,0.12)' : 'transparent',
                border: style === s ? '0.5px solid rgba(79,166,255,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                color: style === s ? '#4fa6ff' : '#6b7280' }}>
              {s === 'full' ? 'Full badge' : 'Mini badge'}
            </button>
          ))}
        </div>

        {/* Preview on dark and light backgrounds */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <div style={{ background:'#080b10', borderRadius:8, padding:20, display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
            <img src={badgeUrl} alt="Badge preview dark" style={{ border:'none' }}
              onError={e => e.target.style.display='none'}/>
            <span style={{ fontSize:10, color:'#3a4455', fontFamily:'IBM Plex Mono,monospace' }}>Dark bg</span>
          </div>
          <div style={{ background:'#f3f4f6', borderRadius:8, padding:20, display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
            <img src={badgeUrl} alt="Badge preview light" style={{ border:'none' }}
              onError={e => e.target.style.display='none'}/>
            <span style={{ fontSize:10, color:'#9ca3af', fontFamily:'IBM Plex Mono,monospace' }}>Light bg</span>
          </div>
        </div>

        {/* Current score summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            ['Score', `${score}/100`],
            ['Grade', grade],
            ['Verify URL', '↗ Public page'],
          ].map(([label, value]) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.02)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontSize:9, color:'#3a4455', fontFamily:'IBM Plex Mono,monospace', marginBottom:4, textTransform:'uppercase' }}>{label}</div>
              <div style={{ fontSize:14, fontWeight:700, color: label === 'Grade' ? fill : '#dde2ed' }}>
                {label === 'Verify URL'
                  ? <a href={verifyUrl} target="_blank" rel="noreferrer" style={{ color:'#4fa6ff', textDecoration:'none', fontSize:11 }}>View page →</a>
                  : value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embed snippets */}
      <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:11, color:'#3a4455', fontFamily:'IBM Plex Mono,monospace', marginBottom:16, textTransform:'uppercase', letterSpacing:'1px' }}>Add to your website</div>

        {[
          { key:'html',      label:'HTML',     desc:'Paste into any webpage' },
          { key:'markdown',  label:'Markdown', desc:'README or documentation' },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div>
                <span style={{ fontSize:11, fontWeight:600, color:'#dde2ed' }}>{label}</span>
                <span style={{ fontSize:10, color:'#6b7280', marginLeft:8 }}>{desc}</span>
              </div>
              <button onClick={() => copy(key)}
                style={{ fontSize:10, padding:'3px 10px', borderRadius:5, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace',
                  background: copied === key ? 'rgba(0,223,120,0.1)' : 'rgba(255,255,255,0.04)',
                  border: copied === key ? '0.5px solid rgba(0,223,120,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                  color: copied === key ? '#00df78' : '#6b7280' }}>
                {copied === key ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{ background:'#080b10', borderRadius:8, padding:'10px 12px', fontSize:10, color:'#6b7780', fontFamily:'IBM Plex Mono,monospace', overflow:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all', border:'0.5px solid rgba(255,255,255,0.04)' }}>
              {snippets[key]}
            </pre>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ background:'rgba(79,166,255,0.04)', border:'0.5px solid rgba(79,166,255,0.12)', borderRadius:10, padding:16 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'#4fa6ff', marginBottom:10 }}>How it works</div>
        {[
          'The badge image is served live from CyberGuard — it always shows your latest scan score',
          'Visitors can click the badge to see a public verification page with your full security summary',
          'The badge updates automatically every time you run a new scan — no code changes needed',
          'The verification page is public — no login required for your website visitors',
        ].map((tip, i) => (
          <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:12, color:'#6b7780' }}>
            <span style={{ color:'#4fa6ff', flexShrink:0 }}>→</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
