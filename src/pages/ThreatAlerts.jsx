/**
 * Threat Alerts — live threat intelligence from CISA, AlienVault OTX, NCSC.
 * Cybersecurity Threat Alerts feed.
 */
import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid } from '../components/ui'

const SEV_COLOR = { critical:'#ff4757', high:'#ffb627', medium:'#4fa6ff', low:'#3a4455' }
const SEV_BG    = { critical:'rgba(255,71,87,.07)', high:'rgba(255,182,39,.07)', medium:'rgba(79,166,255,.07)', low:'rgba(255,255,255,.03)' }
const SOURCE_COLOR = { 'CISA KEV':'#ff4757', 'AlienVault OTX':'#ffb627', 'NCSC':'#4fa6ff' }

export default function ThreatAlerts() {
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState('all')

  useEffect(() => { loadFeed() }, [])

  async function loadFeed() {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${apiBase}/api/threatfeed`)
      const json = await res.json()
      if (json.ok) setData(json.data)
      else setError(json.error ?? 'Failed to fetch threat feed')
    } catch (err) {
      setError(`Error: ${err.message} — make sure the API server is running`)
    }
    setLoading(false)
  }

  const items    = data?.items ?? []
  const filtered = filter === 'all' ? items : items.filter(i => i.source === filter)
  const critical = items.filter(i => i.severity === 'critical').length
  const sources  = [...new Set(items.map(i => i.source))]

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Threat alerts"  value={loading ? '…' : items.length}    note="Live feed"          accent="bl" />
        <StatCard label="Critical CVEs"  value={loading ? '…' : critical}         note="CISA KEV catalog"   accent={critical>0?'re':'gr'} />
        <StatCard label="Sources"        value={loading ? '…' : sources.length}   note="CISA · OTX · NCSC" accent="bl" />
        <StatCard label="Last updated"   value={data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'} note="Auto-refreshes" accent="bl" />
      </Grid>

      {/* Source filter + refresh */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {['all', ...sources].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding:'5px 14px', borderRadius:100, fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace',
              background: filter===s ? `${SOURCE_COLOR[s]??'rgba(79,166,255,0.15)'}` : 'transparent',
              border:`0.5px solid ${filter===s ? (SOURCE_COLOR[s]??'#4fa6ff') : 'rgba(255,255,255,0.08)'}`,
              color: filter===s ? (s==='all'?'#4fa6ff':(SOURCE_COLOR[s]??'#4fa6ff')) : '#6b7789', opacity:filter===s?1:0.7 }}>
            {s === 'all' ? 'All sources' : s}
          </button>
        ))}
        <button onClick={loadFeed} disabled={loading}
          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', color:'#6b7789' }}>
          <i className={`ti ${loading?'ti-loader':'ti-refresh'}`} style={{ fontSize:11, animation:loading?'spin 1s linear infinite':'none' }} aria-hidden="true"/>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background:'rgba(255,71,87,0.07)', border:'0.5px solid rgba(255,71,87,0.15)', borderRadius:8, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ff4757' }}>{error}</div>
      )}

      <Card title="Live threat intelligence" titleIcon="ti-radar"
        badge={filtered.length > 0 ? `${filtered.length} items` : loading ? 'Loading…' : 'No items'}
        badgeType={critical > 0 ? 'bad' : 'bl'}>
        {loading ? (
          <div style={{ padding:'20px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>Fetching threat intelligence from CISA, AlienVault OTX, and NCSC…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'16px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>No threat alerts found. This may mean the feed timed out — click Refresh to try again.</div>
        ) : (
          filtered.map((item, i) => (
            <div key={item.id ?? i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:SEV_COLOR[item.severity]??'#3a4455', flexShrink:0, marginTop:5 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#dde2ed', marginBottom:3, lineHeight:1.4 }}>
                  {item.url
                    ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color:'#dde2ed', textDecoration:'none' }}
                        onMouseEnter={e=>e.currentTarget.style.color='#4fa6ff'}
                        onMouseLeave={e=>e.currentTarget.style.color='#dde2ed'}>
                        {item.title} <i className="ti ti-external-link" style={{ fontSize:10, verticalAlign:'middle' }} aria-hidden="true"/>
                      </a>
                    : item.title
                  }
                </div>
                {item.description && (
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.5, marginBottom:4 }}>
                    {item.description}
                  </div>
                )}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, padding:'1px 7px', borderRadius:100,
                    color:SOURCE_COLOR[item.source]??'#3a4455',
                    background:`${SOURCE_COLOR[item.source]??'rgba(255,255,255,0.05)'}18`,
                    border:`0.5px solid ${SOURCE_COLOR[item.source]??'rgba(255,255,255,0.07)'}44` }}>
                    {item.source}
                  </span>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, padding:'1px 7px', borderRadius:100,
                    color:SEV_COLOR[item.severity]??'#3a4455',
                    background:SEV_BG[item.severity]??'transparent',
                    border:`0.5px solid ${(SEV_COLOR[item.severity]??'#3a4455')}33` }}>
                    {item.severity}
                  </span>
                  {item.vendor && <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>{item.vendor}</span>}
                  {item.product && <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>· {item.product}</span>}
                  {item.date && <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginLeft:'auto' }}>{new Date(item.date).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Source info */}
      <Card title="Intelligence sources" titleIcon="ti-database">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:12 }}>
          {[
            { name:'CISA KEV', color:'#ff4757', icon:'ti-shield-half', desc:'US Cybersecurity & Infrastructure Security Agency — Known Exploited Vulnerabilities catalog. The definitive list of CVEs actively exploited in the wild.', cost:'Free, no key', update:'Daily' },
            { name:'AlienVault OTX', color:'#ffb627', icon:'ti-virus', desc:'Open Threat Exchange — community-powered threat intelligence. Pulses from security researchers worldwide covering malware, phishing campaigns, and attack infrastructure.', cost:'Free key at otx.alienvault.com', update:'Real-time' },
            { name:'NCSC', color:'#4fa6ff', icon:'ti-building-bank', desc:'UK National Cyber Security Centre — authoritative advisories and guidance for UK businesses. Especially relevant for UK-based organisations.', cost:'Free, no key', update:'Weekly' },
          ].map(s => (
            <div key={s.name} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize:14, color:s.color }} aria-hidden="true"/>
                <div style={{ fontSize:11, fontWeight:600, color:'#dde2ed' }}>{s.name}</div>
              </div>
              <div style={{ fontSize:11, color:'#6b7789', lineHeight:1.5, marginBottom:6 }}>{s.desc}</div>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#00df78' }}>{s.cost}</span>
                <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>· {s.update}</span>
              </div>
            </div>
          ))}
        </div>
        {!data?.sources?.otx && (
          <div style={{ margin:'0 12px 12px', padding:'10px 12px', background:'rgba(255,182,39,0.07)', border:'0.5px solid rgba(255,182,39,0.2)', borderRadius:7, fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ffb627' }}>
            💡 Add OTX_API_KEY to .env.local for AlienVault threat intelligence. Free key at otx.alienvault.com
          </div>
        )}
      </Card>
    </div>
  )
}
