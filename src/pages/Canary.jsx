/**
 * Ransomware Canary — deploy decoy files that alert on modification.
 * No agent, no installer. One script run in terminal.
 */
import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid } from '../components/ui'
import { useApp } from '../store/appStore'
import { useScanData } from '../hooks/useScanData'
import { supabase } from '../lib/supabase'

export default function Canary() {
  const { state } = useApp()
  const { domainRow, domainName } = useScanData()
  const [platform, setPlatform]   = useState('mac')
  const [script, setScript]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [status, setStatus]       = useState(null)
  const [alerts, setAlerts]       = useState([])
  const [copied, setCopied]       = useState(false)

  const apiBase = import.meta.env.VITE_API_URL ?? ''

  useEffect(() => {
    if (domainRow) loadStatus()
  }, [domainRow?.id])

  async function loadStatus() {
    const r = await fetch(`${apiBase}/api/canary/status/${domainRow.id}`)
    const j = await r.json()
    if (j.ok) {
      setStatus(j.data)
      setAlerts(j.data.alerts ?? [])
    }
  }

  async function generateScript() {
    if (!domainRow) return
    setLoading(true)

    const { data: profile } = await supabase
      .from('profiles').select('org_name').eq('id', state.user.id).single()

    const r = await fetch(`${apiBase}/api/canary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: platform === 'windows' ? 'windows' : 'bash',
        domainId: domainRow.id,
        orgName:  profile?.org_name ?? domainName,
      })
    })
    const j = await r.json()
    if (j.ok) setScript(j.script)
    setLoading(false)
  }

  function copyScript() {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadScript() {
    const ext = platform === 'windows' ? 'ps1' : 'sh'
    const blob = new Blob([script], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cyberguard-canary.${ext}`
    a.click()
  }

  const deployCount = status?.deployments?.length ?? 0
  const alertCount  = alerts.length

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>

      <div style={{ background:'rgba(255,71,87,0.07)', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:8, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ff4757', lineHeight:1.7 }}>
        🚨 <strong>Ransomware early warning system.</strong> Deploy decoy files on your machines. If ransomware touches them, CyberGuard alerts you immediately — before it encrypts your real files.
      </div>

      <Grid cols={4} gap={10}>
        <StatCard label="How it works"    value="Canary files" note="Decoy bait for ransomware"  accent="re" />
        <StatCard label="Detection time"  value="&lt;30 sec"   note="Webhook fires instantly"     accent="gr" />
        <StatCard label="Installation"    value="Zero"         note="No agent or installer"       accent="gr" />
        <StatCard label="Active alerts"   value={alertCount}   note="Canary triggers recorded"    accent={alertCount>0?'re':'bl'} />
      </Grid>

      {/* Platform picker + generate */}
      <Card title="Generate canary script" titleIcon="ti-terminal-2">
        <div style={{ padding:'14px' }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', marginBottom:8 }}>
            Which operating system?
          </div>
          <div style={{ display:'flex', gap:6, marginBottom:14 }}>
            {[
              { id:'mac',     label:'macOS',   icon:'ti-brand-apple'   },
              { id:'linux',   label:'Linux',   icon:'ti-brand-ubuntu'  },
              { id:'windows', label:'Windows', icon:'ti-brand-windows' },
            ].map(p => (
              <button key={p.id} onClick={() => { setPlatform(p.id); setScript('') }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:7, fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace',
                  background: platform===p.id ? 'rgba(255,71,87,0.1)' : 'transparent',
                  border: `0.5px solid ${platform===p.id ? 'rgba(255,71,87,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: platform===p.id ? '#ff4757' : '#6b7789' }}>
                <i className={`ti ${p.icon}`} style={{ fontSize:12 }} aria-hidden="true"/>
                {p.label}
              </button>
            ))}
          </div>

          <button onClick={generateScript} disabled={loading || !domainRow}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:'rgba(255,71,87,0.08)', border:'0.5px solid rgba(255,71,87,0.25)', borderRadius:8, fontSize:12, fontWeight:600, color:'#ff4757', cursor:'pointer', fontFamily:'Syne,sans-serif', marginBottom: script ? 12 : 0 }}>
            <i className={`ti ${loading?'ti-loader':'ti-code'}`} style={{ fontSize:13, animation:loading?'spin 1s linear infinite':'none' }} aria-hidden="true"/>
            {loading ? 'Generating…' : 'Generate canary script'}
          </button>

          {script && (
            <>
              <div style={{ background:'#080b10', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'12px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#00df78', lineHeight:1.8, maxHeight:200, overflow:'auto', marginBottom:10, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                {script.slice(0, 500)}...
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={downloadScript}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 16px', background:'rgba(0,223,120,0.08)', border:'0.5px solid rgba(0,223,120,0.25)', borderRadius:7, fontSize:11, color:'#00df78', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>
                  <i className="ti ti-download" style={{ fontSize:11 }} aria-hidden="true"/>
                  Download script
                </button>
                <button onClick={copyScript}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 16px', background:'rgba(79,166,255,0.08)', border:'0.5px solid rgba(79,166,255,0.25)', borderRadius:7, fontSize:11, color:'#4fa6ff', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>
                  <i className={`ti ${copied?'ti-check':'ti-copy'}`} style={{ fontSize:11 }} aria-hidden="true"/>
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* How to run */}
      {script && (
        <Card title="How to run" titleIcon="ti-play">
          <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
            {platform === 'windows' ? (
              <>
                <div style={{ fontSize:12, color:'#dde2ed', marginBottom:6 }}>Run in PowerShell as Administrator:</div>
                {[
                  'Right-click Start → Windows PowerShell (Admin)',
                  'Drag and drop the downloaded .ps1 file into the PowerShell window',
                  'Press Enter — canary files will be created on your Desktop, Documents, Downloads, and Pictures',
                  'Leave the window open. It watches 24/7. Press Ctrl+C to stop.',
                  'To run on startup: copy the script to shell:startup in File Explorer',
                ].map((step, i) => (
                  <div key={i} style={{ display:'flex', gap:10, fontSize:12, color:'#6b7789' }}>
                    <span style={{ color:'#4fa6ff', fontFamily:'IBM Plex Mono,monospace', fontSize:10, flexShrink:0, marginTop:1 }}>{i+1}.</span>
                    {step}
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{ fontSize:12, color:'#dde2ed', marginBottom:6 }}>Run in Terminal:</div>
                <div style={{ background:'#080b10', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'8px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78' }}>
                  chmod +x ~/Downloads/cyberguard-canary.sh<br/>
                  ~/Downloads/cyberguard-canary.sh
                </div>
                {[
                  'The script creates canary files in Desktop, Documents, Downloads, and Pictures',
                  'It runs in the foreground — keep Terminal open or run with nohup',
                  'macOS requires fswatch (installed automatically via Homebrew if needed)',
                  'If you close Terminal, the monitoring stops. For persistent monitoring, add to crontab or launchd.',
                ].map((step, i) => (
                  <div key={i} style={{ display:'flex', gap:10, fontSize:12, color:'#6b7789' }}>
                    <span style={{ color:'#4fa6ff', fontFamily:'IBM Plex Mono,monospace', fontSize:10, flexShrink:0, marginTop:1 }}>→</span>
                    {step}
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Alert history */}
      <Card title="Canary alert history" titleIcon="ti-bell-ringing"
        badge={alertCount > 0 ? `${alertCount} triggers` : 'No triggers'} badgeType={alertCount>0?'bad':'ok'}>
        {alerts.length === 0 ? (
          <div style={{ padding:'14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78' }}>
            ✓ No canary files have been triggered. Your systems appear clean.
          </div>
        ) : (
          alerts.map((a, i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', alignItems:'flex-start' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff4757', flexShrink:0, marginTop:4 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#ff4757', marginBottom:2 }}>
                  🚨 Canary {a.event_type} — {a.hostname}
                </div>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789' }}>
                  User: {a.username} · File: {a.file_path}
                </div>
              </div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>
                {new Date(a.triggered_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
