/**
 * Managed Response — alert history + remediation tracker.
 * Tracks open issues, lets user mark fixed, verifies by re-scanning.
 */
import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid } from '../components/ui'
import { useScanData } from '../hooks/useScanData'
import { supabase } from '../lib/supabase'

const SEV_COLOR = { critical:'#ff4757', high:'#ffb627', medium:'#4fa6ff', low:'#3a4455', info:'#00cfaa' }
const SEV_BG    = { critical:'rgba(255,71,87,.07)', high:'rgba(255,182,39,.07)', medium:'rgba(79,166,255,.07)', low:'rgba(255,255,255,.03)' }

const ROADMAP = [
  { phase:'Requires server agent',      icon:'ti-activity',    color:'#ff4757', title:'Real-time threat feed',       detail:'Watches logins, process activity, and network connections. Alerts within seconds.' },
  { phase:'Requires cloud API access',  icon:'ti-shield-x',    color:'#ff4757', title:'Automatic IP blocking',       detail:'Auto-add attacking IPs to your cloud firewall via AWS/GCP/Azure API.' },
  { phase:'Requires server agent',      icon:'ti-virus-off',   color:'#ff4757', title:'Malware detection',           detail:'File integrity monitoring — alerts when critical system files change unexpectedly.' },
  { phase:'Premium tier',               icon:'ti-headset',     color:'#a78bfa', title:'24/7 human SOC response',     detail:'Human analysts monitor alerts around the clock and handle containment.' },
]

export default function Response() {
  const { domainRow, allIssues, isReal } = useScanData()
  const [alerts, setAlerts]         = useState([])
  const [resolved, setResolved]     = useState({})  // issueId → true
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('issues')  // issues | alerts

  useEffect(() => {
    if (!domainRow) { setLoading(false); return }
    loadAlerts()
    loadResolved()
  }, [domainRow?.id])

  async function loadAlerts() {
    const { data } = await supabase
      .from('alert_log').select('*')
      .eq('domain_id', domainRow.id)
      .order('sent_at', { ascending: false }).limit(50)
    setAlerts(data ?? [])
    setLoading(false)
  }

  async function loadResolved() {
    // Store resolved state in localStorage keyed by domain+issue
    const key = `cg_resolved_${domainRow.id}`
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}')
    setResolved(saved)
  }

  function toggleResolved(issueId) {
    const key = `cg_resolved_${domainRow.id}`
    const next = { ...resolved, [issueId]: !resolved[issueId] }
    if (!next[issueId]) delete next[issueId]
    setResolved(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  const openIssues     = (allIssues ?? []).filter(i => i.sev === 'critical' || i.sev === 'high')
  const resolvedCount  = openIssues.filter(i => resolved[i.id]).length
  const openCount      = openIssues.length - resolvedCount
  const sentCount      = alerts.filter(a => !a.error).length

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Open issues"    value={openCount}    note="Critical + high"      accent={openCount>0?'re':'gr'} />
        <StatCard label="Resolved"       value={resolvedCount} note="Marked as fixed"     accent={resolvedCount>0?'gr':'bl'} />
        <StatCard label="Alerts sent"    value={sentCount}    note="Total delivered"       accent={sentCount>0?'gr':'bl'} />
        <StatCard label="Alert channel"  value="Email"        note="+ Slack if configured" accent="bl" />
      </Grid>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:8, padding:4, width:'fit-content' }}>
        {[['issues','Remediation tracker'],['alerts','Alert history']].map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'6px 16px', borderRadius:6, fontSize:11, fontWeight:activeTab===id?600:400,
              background:activeTab===id?'rgba(79,166,255,0.1)':'transparent',
              border:`0.5px solid ${activeTab===id?'rgba(79,166,255,0.25)':'transparent'}`,
              color:activeTab===id?'#4fa6ff':'#6b7789', cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'issues' && (
        <Card title="Remediation tracker — critical & high issues"
          titleIcon="ti-list-check"
          badge={openCount > 0 ? `${openCount} open` : 'All resolved'}
          badgeType={openCount > 0 ? 'bad' : 'ok'}>
          {!isReal || openIssues.length === 0 ? (
            <div style={{ padding:'20px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11,
              color: isReal ? '#00df78' : '#3a4455' }}>
              {isReal ? '🎉 No critical or high issues to track.' : 'No scan data yet — run a scan to see issues.'}
            </div>
          ) : (
            <>
              <div style={{ padding:'8px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                Click the checkbox to mark an issue as fixed. Run a new scan to verify.
              </div>
              {openIssues.map(issue => {
                const done = !!resolved[issue.id]
                return (
                  <div key={issue.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', opacity:done?0.5:1, transition:'opacity .2s' }}>
                    {/* Checkbox */}
                    <button onClick={() => toggleResolved(issue.id)}
                      style={{ width:20, height:20, borderRadius:5, flexShrink:0, marginTop:1, cursor:'pointer',
                        background: done?'rgba(0,223,120,0.15)':'transparent',
                        border:`1.5px solid ${done?'#00df78':'rgba(255,255,255,0.15)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
                      {done && <i className="ti ti-check" style={{ fontSize:11, color:'#00df78' }} aria-hidden="true"/>}
                    </button>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, color: done?'#3a4455':'#dde2ed', textDecoration:done?'line-through':'none' }}>
                          {issue.title ?? issue.name}
                        </span>
                        <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, padding:'1px 7px', borderRadius:100,
                          color:SEV_COLOR[issue.sev], background:SEV_BG[issue.sev],
                          border:`0.5px solid ${SEV_COLOR[issue.sev]}33` }}>
                          {issue.sev}
                        </span>
                        {done && (
                          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#00df78', background:'rgba(0,223,120,0.07)', border:'0.5px solid rgba(0,223,120,0.2)', padding:'1px 7px', borderRadius:100 }}>
                            Marked fixed ✓
                          </span>
                        )}
                      </div>
                      {!done && (issue.fix ?? []).length > 0 && (
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', lineHeight:1.6 }}>
                          → {(issue.fix ?? [])[0]}
                        </div>
                      )}
                    </div>
                    <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', flexShrink:0 }}>
                      {issue.type}
                    </span>
                  </div>
                )
              })}
              {resolvedCount > 0 && (
                <div style={{ padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', borderTop:'0.5px solid rgba(255,255,255,0.05)' }}>
                  {resolvedCount} issue{resolvedCount!==1?'s':''} marked fixed — run a new scan from the top bar to verify they're resolved.
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {activeTab === 'alerts' && (
        <Card title="Alert history" titleIcon="ti-bell"
          badge={alerts.length > 0 ? `${alerts.length} alerts` : 'No alerts yet'} badgeType="bl">
          {loading ? (
            <div style={{ padding:'16px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>Loading…</div>
          ) : alerts.length === 0 ? (
            <div style={{ padding:'16px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', lineHeight:1.7 }}>
              No alerts sent yet. Alerts fire when score drops, cert expires, DMARC degrades, or a breach is found.<br/>
              <span style={{ color:'#4fa6ff' }}>→ Configure recipients in Alert Settings</span>
            </div>
          ) : (
            alerts.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:SEV_COLOR[a.severity]??'#3a4455', flexShrink:0, marginTop:4 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:'#dde2ed', marginBottom:2 }}>{a.subject ?? a.type}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:SEV_COLOR[a.severity]??'#3a4455',
                      background:SEV_BG[a.severity]??'transparent', padding:'1px 7px', borderRadius:100,
                      border:`0.5px solid ${(SEV_COLOR[a.severity]??'#3a4455')}33` }}>{a.severity}</span>
                    {a.recipients?.map(r => <span key={r} style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>{r}</span>)}
                    {a.error && <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#ff4757' }}>Failed: {a.error}</span>}
                  </div>
                </div>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', textAlign:'right', flexShrink:0 }}>
                  <div>{new Date(a.sent_at).toLocaleDateString()}</div>
                  <div>{new Date(a.sent_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      <Card title="Automated response roadmap" titleIcon="ti-road">
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
