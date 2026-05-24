/**
 * Vendor Risk — stores in Supabase, shows rich detail per vendor.
 * Grading: A+ to F based on DNS + SSL + email auth posture.
 */
import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid, IssueRow, EmptyState } from '../components/ui'
import { useApp } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { scanVendorDomain } from '../lib/api'

const GRADE_STYLE = {
  'A+':{ fg:'#00df78', bg:'rgba(0,223,120,0.08)',  border:'rgba(0,223,120,0.2)' },
  'A': { fg:'#00df78', bg:'rgba(0,223,120,0.08)',  border:'rgba(0,223,120,0.2)' },
  'A-':{ fg:'#00df78', bg:'rgba(0,223,120,0.08)',  border:'rgba(0,223,120,0.2)' },
  'B+':{ fg:'#4fa6ff', bg:'rgba(79,166,255,0.08)', border:'rgba(79,166,255,0.2)' },
  'B': { fg:'#4fa6ff', bg:'rgba(79,166,255,0.08)', border:'rgba(79,166,255,0.2)' },
  'B-':{ fg:'#4fa6ff', bg:'rgba(79,166,255,0.08)', border:'rgba(79,166,255,0.2)' },
  'C+':{ fg:'#ffb627', bg:'rgba(255,182,39,0.08)', border:'rgba(255,182,39,0.2)' },
  'C': { fg:'#ffb627', bg:'rgba(255,182,39,0.08)', border:'rgba(255,182,39,0.2)' },
  'C-':{ fg:'#ffb627', bg:'rgba(255,182,39,0.08)', border:'rgba(255,182,39,0.2)' },
  'D': { fg:'#ff4757', bg:'rgba(255,71,87,0.08)',  border:'rgba(255,71,87,0.2)' },
  'F': { fg:'#ff4757', bg:'rgba(255,71,87,0.08)',  border:'rgba(255,71,87,0.2)' },
  '?': { fg:'#3a4455', bg:'rgba(255,255,255,0.02)',border:'rgba(255,255,255,0.06)' },
}

const FINDING_ICON = { ok:'#00df78', warn:'#ffb627', risk:'#ff4757' }

const CATEGORIES = ['CRM', 'Cloud', 'Email', 'Payments', 'Dev Tools', 'Communications', 'HR', 'Security', 'Analytics', 'Storage', 'Other']

export default function Vendor() {
  const { state } = useApp()
  const [vendors, setVendors]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState(null)   // domain string
  const [newDomain, setNewDomain]     = useState('')
  const [newName, setNewName]         = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [adding, setAdding]           = useState(false)
  const [addError, setAddError]       = useState('')
  const [rescanning, setRescanning]   = useState(null)   // domain being rescanned

  useEffect(() => {
    if (!state.user) return
    loadVendors()
  }, [state.user])

  async function loadVendors() {
    setLoading(true)
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false })
    setVendors(data ?? [])
    setLoading(false)
  }

  async function addVendor() {
    const d = newDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
    if (!d) { setAddError('Enter a domain name'); return }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}$/.test(d)) { setAddError('Enter a valid domain e.g. salesforce.com'); return }
    if (vendors.find(v => v.domain === d)) { setAddError('Already in your vendor list'); return }
    setAddError(''); setAdding(true)

    // Scan the vendor domain
    const result = await scanVendorDomain(d)
    const sd     = result.ok ? result.data : null

    const row = {
      user_id:      state.user.id,
      domain:       d,
      name:         newName.trim() || d,
      category:     newCategory || null,
      score:        sd?.score        ?? null,
      grade:        sd?.grade        ?? '?',
      dns_score:    sd?.dns_score    ?? 0,
      ssl_score:    sd?.ssl_score    ?? 0,
      email_score:  sd?.email_score  ?? 0,
      issues:       sd?.issues       ?? [],
      raw_dns:      sd?.raw_dns      ?? {},
      raw_ssl:      sd?.raw_ssl      ?? {},
      summary:      sd?.summary      ?? [],
      last_scanned: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('vendors').insert(row).select().single()
    setAdding(false)
    if (error) { setAddError(error.message); return }

    setVendors(prev => [data, ...prev])
    setNewDomain(''); setNewName(''); setNewCategory('')
    setExpanded(d)
  }

  async function rescanVendor(domain) {
    setRescanning(domain)
    const result = await scanVendorDomain(domain)
    if (!result.ok) {
      console.error('[Vendor] rescan failed:', result.error)
      alert(`Scan failed: ${result.error ?? 'Unknown error'}. Make sure the API server is running (npm run server).`)
      setRescanning(null)
      return
    }

    const sd = result.data
    await supabase.from('vendors').update({
      score:        sd.score,
      grade:        sd.grade,
      dns_score:    sd.dns_score,
      ssl_score:    sd.ssl_score,
      email_score:  sd.email_score,
      issues:       sd.issues ?? [],
      raw_dns:      sd.raw_dns ?? {},
      raw_ssl:      sd.raw_ssl ?? {},
      summary:      sd.summary ?? [],
      last_scanned: new Date().toISOString(),
    }).eq('user_id', state.user.id).eq('domain', domain)

    setVendors(prev => prev.map(v => v.domain === domain ? { ...v, ...sd, last_scanned: new Date().toISOString() } : v))
    setRescanning(null)
  }

  async function removeVendor(id) {
    await supabase.from('vendors').delete().eq('id', id)
    setVendors(prev => prev.filter(v => v.id !== id))
    setExpanded(null)
  }

  const atRisk   = vendors.filter(v => v.grade && ['C', 'C-', 'D', 'F'].some(g => v.grade.startsWith(g[0]))).length
  const healthy  = vendors.filter(v => v.grade && ['A', 'B'].some(g => v.grade.startsWith(g))).length

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Vendors tracked" value={vendors.length}  note="In your list"              accent="bl" />
        <StatCard label="At risk (C-F)"   value={atRisk}          note="Need attention"            accent={atRisk > 0 ? 're' : 'gr'} />
        <StatCard label="Healthy (A-B)"   value={healthy}         note="Good posture"              accent={healthy > 0 ? 'gr' : 'bl'} />
        <StatCard label="Grading basis"   value="DNS+SSL+Email"   note="Free public scan"          accent="bl" />
      </Grid>

      {/* Add vendor */}
      <Card title="Add a vendor to track" titleIcon="ti-plus">
        <div style={{ padding:'12px 14px' }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.6, marginBottom:12 }}>
            Enter any vendor's domain. CyberGuard scans their public DNS records, SSL certificate, and email authentication (SPF/DKIM/DMARC) and gives them a security grade from A+ to F.
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <input value={newDomain} onChange={e => { setNewDomain(e.target.value); setAddError('') }}
              onKeyDown={e => e.key === 'Enter' && !adding && addVendor()}
              placeholder="vendor-domain.com" disabled={adding}
              style={{ flex:2, minWidth:140, background:'#161c2a', border:`0.5px solid ${addError?'#ff4757':'rgba(255,255,255,.08)'}`, borderRadius:7, padding:'8px 12px', fontSize:12, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Display name (optional)" disabled={adding}
              style={{ flex:2, minWidth:140, background:'#161c2a', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:7, padding:'8px 12px', fontSize:12, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} disabled={adding}
              style={{ flex:1, minWidth:110, background:'#161c2a', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:7, padding:'8px 12px', fontSize:12, color: newCategory ? '#dde2ed' : '#3a4455', outline:'none', fontFamily:'IBM Plex Mono,monospace' }}>
              <option value="">Category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={addVendor} disabled={adding || !newDomain}
              style={{ background:'rgba(79,166,255,.08)', border:'0.5px solid rgba(79,166,255,.22)', borderRadius:7, padding:'8px 16px', fontSize:12, color:'#4fa6ff', cursor:adding||!newDomain?'not-allowed':'pointer', fontFamily:'IBM Plex Mono,monospace', opacity: !newDomain ? 0.4 : 1 }}>
              {adding ? 'Scanning…' : '+ Add & scan'}
            </button>
          </div>
          {addError && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ff4757', marginTop:6 }}>{addError}</div>}
        </div>
      </Card>

      {/* Vendor list */}
      <Card title="Vendor security ratings" titleIcon="ti-building"
            badge={vendors.length > 0 ? `${vendors.length} vendors` : 'None yet'} badgeType="bl">
        {loading ? (
          <div style={{ padding:'20px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>Loading…</div>
        ) : vendors.length === 0 ? (
          <EmptyState icon="ti-building" msg="No vendors added yet — add your key suppliers, cloud providers, and SaaS tools above" />
        ) : (
          vendors.map(v => {
            const gs       = GRADE_STYLE[v.grade] ?? GRADE_STYLE['?']
            const isOpen   = expanded === v.domain
            const scanning = rescanning === v.domain
            const issues   = v.issues ?? []
            const summary  = v.summary ?? []

            return (
              <div key={v.id} style={{ borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                {/* Main row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : v.domain)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', cursor:'pointer', transition:'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{ width:36, height:36, borderRadius:8, background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:700, color:'#6b7789', flexShrink:0 }}>
                    {(v.name ?? v.domain).slice(0,2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'#dde2ed', display:'flex', alignItems:'center', gap:6 }}>
                      {v.name ?? v.domain}
                      {v.category && <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', padding:'1px 7px', borderRadius:100 }}>{v.category}</span>}
                    </div>
                    <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginTop:2 }}>
                      {v.domain} · {v.last_scanned ? `Scanned ${new Date(v.last_scanned).toLocaleDateString()}` : 'Not yet scanned'}
                    </div>
                  </div>

                  {/* Score bars — only show if real data exists */}
                  {v.score !== null && v.dns_score > 0 && (
                    <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                      {[['DNS', v.dns_score], ['SSL', v.ssl_score], ['Email', v.email_score]].map(([label, score]) => (
                        <div key={label} style={{ textAlign:'center', width:36 }}>
                          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', marginBottom:2 }}>{label}</div>
                          <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:100, overflow:'hidden' }}>
                            <div style={{ width:`${score}%`, height:'100%', background: score>=75?'#00df78':score>=60?'#ffb627':'#ff4757', borderRadius:100 }}/>
                          </div>
                          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#6b7789', marginTop:1 }}>{score}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(v.score === null || v.dns_score === 0) && !scanning && (
                    <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#ffb627' }}>Click to scan</div>
                  )}

                  {/* Grade badge */}
                  <div style={{ width:42, height:42, borderRadius:8, background:gs.bg, border:`1.5px solid ${gs.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:gs.fg, lineHeight:1 }}>{v.grade ?? '?'}</div>
                    {v.score !== null && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', marginTop:1 }}>{v.score}</div>}
                  </div>

                  {/* Chevron */}
                  <i className="ti ti-chevron-right" style={{ fontSize:12, color:'#3a4455', flexShrink:0, transform:isOpen?'rotate(90deg)':'none', transition:'transform .2s' }} aria-hidden="true"/>
                </div>

                {/* Expanded detail */}
                {isOpen && !scanning && v.grade === '?' && (
                  <div style={{ padding:'10px 14px 0 62px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ffb627' }}>
                    ⚠ No scan data — click Rescan below to fetch current security data for {v.domain}
                  </div>
                )}
                {isOpen && (
                  <div className="animate-fade-in" style={{ background:'rgba(255,255,255,0.02)', borderTop:'0.5px solid rgba(255,255,255,0.05)', padding:'14px 14px 14px 62px' }}>

                    {/* Summary findings */}
                    {(v.summary ?? []).length > 0 && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', letterSpacing:'1px', textTransform:'uppercase', marginBottom:6 }}>Security findings</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          {(v.summary ?? []).map((f, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:7, fontSize:11, color:'#6b7789', lineHeight:1.5 }}>
                              <span style={{ width:7, height:7, borderRadius:'50%', background:FINDING_ICON[f.type]??'#3a4455', flexShrink:0, marginTop:3 }}/>
                              {f.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technical detail grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                      {[
                        ['SPF policy',    v.raw_dns?.email?.spf?.policy ?? 'not set'],
                        ['DMARC policy',  v.raw_dns?.email?.dmarc?.policy ?? 'not set'],
                        ['BIMI',          v.raw_dns?.email?.bimi?.configured ? 'configured' : 'not set'],
                        ['SSL protocol',  v.raw_ssl?.protocol ?? 'N/A'],
                        ['Cert expiry',   v.raw_ssl?.cert?.daysLeft !== undefined ? `${v.raw_ssl.cert.daysLeft} days` : 'N/A'],
                        ['Cipher',        v.raw_ssl?.cipher?.rating ?? 'N/A'],
                      ].map(([k, val]) => (
                        <div key={k} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.05)', borderRadius:6, padding:'8px 10px' }}>
                          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:3 }}>{k}</div>
                          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#dde2ed' }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Issues */}
                    {issues.filter(i => i.sev === 'critical' || i.sev === 'high').length > 0 && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', letterSpacing:'1px', textTransform:'uppercase', marginBottom:6 }}>Issues detected</div>
                        {issues.filter(i => i.sev === 'critical' || i.sev === 'high').slice(0,4).map(i => (
                          <div key={i.id} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:11, color:'#6b7789', borderBottom:'0.5px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ width:7, height:7, borderRadius:'50%', background:i.sev==='critical'?'#ff4757':'#ffb627', flexShrink:0, marginTop:3 }}/>
                            {i.title ?? i.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* What this means for you */}
                    <div style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.05)', borderRadius:7, padding:'10px 12px', marginBottom:12 }}>
                      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', letterSpacing:'1px', textTransform:'uppercase', marginBottom:5 }}>What this means for you</div>
                      <div style={{ fontSize:11, color:'#6b7789', lineHeight:1.7 }}>
                        {v.grade?.startsWith('A')
                          ? `${v.name ?? v.domain} has strong security posture. Low risk to your organisation as a vendor.`
                          : v.grade?.startsWith('B')
                          ? `${v.name ?? v.domain} has acceptable security with some gaps. Monitor quarterly.`
                          : v.grade?.startsWith('C')
                          ? `${v.name ?? v.domain} has significant security gaps. Consider sending a security questionnaire and requesting a remediation timeline.`
                          : v.grade === 'D' || v.grade === 'F'
                          ? `${v.name ?? v.domain} has critical security weaknesses. Evaluate whether to continue using this vendor or escalate to your risk committee.`
                          : 'Scan this vendor to see their risk assessment.'
                        }
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => rescanVendor(v.domain)} disabled={scanning}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'rgba(79,166,255,.07)', border:'0.5px solid rgba(79,166,255,.2)', borderRadius:6, fontSize:10, color:'#4fa6ff', cursor:scanning?'not-allowed':'pointer', fontFamily:'IBM Plex Mono,monospace' }}>
                        <i className={`ti ${scanning?'ti-loader':'ti-refresh'}`} style={{ fontSize:11, animation:scanning?'spin 1s linear infinite':'none' }} aria-hidden="true"/>
                        {scanning ? 'Rescanning…' : 'Rescan'}
                      </button>
                      <a href={`https://${v.domain}`} target="_blank" rel="noopener noreferrer"
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'transparent', border:'0.5px solid rgba(255,255,255,.07)', borderRadius:6, fontSize:10, color:'#6b7789', textDecoration:'none', fontFamily:'IBM Plex Mono,monospace' }}>
                        <i className="ti ti-external-link" style={{ fontSize:11 }} aria-hidden="true"/> Visit site
                      </a>
                      <button onClick={() => removeVendor(v.id)}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'transparent', border:'0.5px solid rgba(255,71,87,.15)', borderRadius:6, fontSize:10, color:'#ff4757', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', marginLeft:'auto' }}>
                        <i className="ti ti-trash" style={{ fontSize:11 }} aria-hidden="true"/> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </Card>

      {/* Grading explainer */}
      <Card title="How vendor grading works" titleIcon="ti-info-circle">
        <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.7 }}>
            Every vendor is scored on three dimensions (each 0–100) and combined into an overall grade:
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[
              { label:'DNS health (35%)',    color:'#4fa6ff', detail:'A, MX, PTR, CAA records. DNSSEC. DNS propagation.' },
              { label:'SSL / TLS (35%)',     color:'#00cfaa', detail:'Certificate validity and expiry. Protocol version. Cipher strength.' },
              { label:'Email auth (30%)',    color:'#a78bfa', detail:'SPF policy. DKIM selectors. DMARC enforcement level. BIMI. MTA-STS.' },
            ].map(item => (
              <div key={item.label} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:7, padding:'10px 12px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:item.color, marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:11, color:'#6b7789', lineHeight:1.5 }}>{item.detail}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
            {[['A+/A/A-','85–100','#00df78'],['B+/B/B-','70–84','#4fa6ff'],['C+/C/C-','55–69','#ffb627'],['D','40–54','#ff4757'],['F','0–39','#ff4757']].map(([g,r,c]) => (
              <div key={g} style={{ background:'rgba(255,255,255,0.02)', border:`0.5px solid ${c}33`, borderRadius:6, padding:'7px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:14, fontWeight:700, color:c }}>{g}</div>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginTop:2 }}>{r}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
