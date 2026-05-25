/**
 * Uptime Monitor page — shows real-time status, history, and response time.
 */
import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid } from '../components/ui'
import { useScanData } from '../hooks/useScanData'
import { supabase } from '../lib/supabase'

export default function Uptime() {
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const { domainRow, domainName } = useScanData()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!domainRow) return
    loadHistory()
  }, [domainRow?.id])

  async function loadHistory() {
    setLoading(true)
    const r = await fetch(`${import.meta.env.VITE_API_URL??''}/api/uptime/history/${domainRow.id}`)
    const j = await r.json()
    if (j.ok) setData(j.data)
    setLoading(false)
  }

  async function checkNow() {
    if (!domainName || checking) return
    setChecking(true)
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL??''}/api/uptime/check/${domainName}`)
      const j = await r.json()
      if (j.ok && j.data) {
        // Update current status immediately without waiting for DB
        setData(prev => ({
          ...(prev ?? {}),
          current: { ...j.data, latency_ms: j.data.latencyMs },
          checks:  [{ up: j.data.up, status: j.data.status, latency_ms: j.data.latencyMs, error: j.data.error, checked_at: j.data.checkedAt }, ...(prev?.checks ?? [])],
          total:   (prev?.total ?? 0) + 1,
          up:      (prev?.up ?? 0) + (j.data.up ? 1 : 0),
        }))
      }
    } catch (err) {
      console.error('[Uptime] checkNow failed:', err.message)
    }
    setChecking(false)
    // Reload from DB to get accurate history
    setTimeout(() => loadHistory(), 1500)
  }

  const current    = data?.current
  const isUp       = current?.up ?? null
  const uptimePct  = data?.uptimePct
  const avgLatency = data?.avgLatency
  const checks     = data?.checks ?? []

  // Build 24-hour grid (288 checks at 5-min intervals)
  const last288 = checks.slice(0, 288).reverse()

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard
          label="Current status"
          value={loading ? '…' : isUp === null ? 'No data' : isUp ? 'Online' : 'Down'}
          note={current?.latencyMs ? `${current.latencyMs}ms response` : 'Run check first'}
          accent={isUp === null ? 'bl' : isUp ? 'gr' : 're'}
        />
        <StatCard label="Uptime (24h)"   value={uptimePct != null ? `${uptimePct}%` : '—'} note="Based on 5-min checks" accent={uptimePct == null ? 'bl' : parseFloat(uptimePct)>=99?'gr':parseFloat(uptimePct)>=95?'am':'re'} />
        <StatCard label="Avg response"   value={avgLatency ? `${avgLatency}ms` : '—'}        note="Last 24 hours"        accent={avgLatency<500?'gr':avgLatency<2000?'am':'re'} />
        <StatCard label="Checks today"   value={loading ? '…' : checks.length}               note="5-minute interval"    accent="bl" />
      </Grid>

      {/* Status bar + check now */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0f1420', border:`0.5px solid ${isUp===false?'rgba(255,71,87,0.3)':isUp?'rgba(0,223,120,0.2)':'rgba(255,255,255,0.06)'}`, borderRadius:8, padding:'10px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:10, height:10, borderRadius:'50%',
            background: isUp===null?'#3a4455':isUp?'#00df78':'#ff4757',
            boxShadow: isUp?'0 0 8px rgba(0,223,120,0.5)':isUp===false?'0 0 8px rgba(255,71,87,0.5)':'none',
          }}/>
          <span style={{ fontSize:13, fontWeight:500, color:'#dde2ed' }}>
            {domainName}
          </span>
          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#6b7789' }}>
            {isUp === null ? 'Not checked yet' : isUp ? `Online · ${current?.latencyMs}ms` : `Down · ${current?.error ?? 'No response'}`}
          </span>
        </div>
        <button onClick={checkNow} disabled={checking || !domainName}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'rgba(79,166,255,0.07)', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:7, fontSize:11, color:'#4fa6ff', cursor:checking?'not-allowed':'pointer', fontFamily:'IBM Plex Mono,monospace' }}>
          <i className={`ti ${checking?'ti-loader':'ti-refresh'}`} style={{ fontSize:11, animation:checking?'spin 1s linear infinite':'none' }} aria-hidden="true"/>
          {checking ? 'Checking…' : 'Check now'}
        </button>
      </div>

      {/* 24-hour timeline grid */}
      <Card title="24-hour uptime timeline" titleIcon="ti-timeline"
        badge={uptimePct != null ? `${uptimePct}% uptime` : 'No data yet'} badgeType={uptimePct == null ? 'bl' : parseFloat(uptimePct)>=99?'ok':'warn'}>
        <div style={{ padding:'14px 14px 10px' }}>
          <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginBottom:8 }}>
            {last288.length === 0 ? (
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455', padding:'8px 0' }}>
                No checks yet — click "Check now" to start monitoring, or wait for the cron to run.
              </div>
            ) : (
              last288.map((check, i) => (
                <div key={i}
                  title={`${new Date(check.checked_at).toLocaleTimeString()} — ${check.up ? `Up (${check.latency_ms}ms)` : `Down: ${check.error ?? check.status}`}`}
                  style={{
                    width:5, height:20, borderRadius:2,
                    background: check.up ? '#00df78' : '#ff4757',
                    opacity: check.up ? (check.latency_ms > 2000 ? 0.6 : 1) : 1,
                    cursor:'pointer',
                    flexShrink:0,
                  }}
                />
              ))
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>
            <span>24 hours ago</span>
            <span>Now</span>
          </div>
          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <span style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#00df78' }}>
              <span style={{ width:8, height:8, borderRadius:2, background:'#00df78', display:'inline-block' }}/> Online
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#ff4757' }}>
              <span style={{ width:8, height:8, borderRadius:2, background:'#ff4757', display:'inline-block' }}/> Down
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>
              Each bar = 5 minutes
            </span>
          </div>
        </div>
      </Card>

      {/* Response time chart */}
      {checks.filter(c=>c.up && c.latency_ms).length > 0 && (
        <Card title="Response time (last 24h)" titleIcon="ti-activity">
          <div style={{ padding:'14px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:60 }}>
              {checks.slice(0, 144).reverse().filter(c=>c.latency_ms).map((c, i) => {
                const max  = Math.max(...checks.filter(x=>x.latency_ms).map(x=>x.latency_ms), 1)
                const h    = Math.max(2, Math.round((c.latency_ms / max) * 56))
                const col  = c.latency_ms < 500 ? '#00df78' : c.latency_ms < 2000 ? '#ffb627' : '#ff4757'
                return (
                  <div key={i} title={`${c.latency_ms}ms at ${new Date(c.checked_at).toLocaleTimeString()}`}
                    style={{ width:4, height:h, background:col, borderRadius:1, flexShrink:0, alignSelf:'flex-end' }}
                  />
                )
              })}
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginTop:6 }}>
              Green &lt;500ms · Amber 500ms–2s · Red &gt;2s · Avg: {avgLatency}ms
            </div>
          </div>
        </Card>
      )}

      {/* Recent incidents */}
      <Card title="Recent incidents" titleIcon="ti-alert-triangle"
        badge={checks.filter(c=>!c.up).length > 0 ? `${checks.filter(c=>!c.up).length} outages` : 'No incidents'} badgeType={checks.filter(c=>!c.up).length>0?'warn':'ok'}>
        {checks.filter(c=>!c.up).length === 0 ? (
          <div style={{ padding:'14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78' }}>
            ✓ No outages recorded in the last 24 hours.
          </div>
        ) : (
          checks.filter(c=>!c.up).slice(0, 10).map((c, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff4757', flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'#dde2ed' }}>
                  {c.error ?? `HTTP ${c.status}`}
                </div>
              </div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>
                {new Date(c.checked_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Setup instructions */}
      {checks.length === 0 && (
        <div style={{ background:'rgba(255,182,39,0.07)', border:'0.5px solid rgba(255,182,39,0.2)', borderRadius:8, padding:'12px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ffb627', lineHeight:1.8 }}>
          <strong>To enable automatic 5-minute checks:</strong><br/>
          Set up a cron job to call: <code style={{ background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:3 }}>POST /api/uptime/run?secret=YOUR_CRON_SECRET</code> every 5 minutes.<br/>
          Services: EasyCron (free), GitHub Actions (free), Render cron jobs, Railway cron.<br/>
          Or call it manually with the "Check now" button above.
        </div>
      )}
    </div>
  )
}
