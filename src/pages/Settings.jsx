/**
 * Settings — Alert preferences page
 * - What triggers alerts (checkboxes)
 * - Owner email always included (read-only)
 * - Add extra alert email addresses
 * - Slack webhook (optional)
 * - Send test alert button
 */
import React, { useState, useEffect } from 'react'
import { useApp } from '../store/appStore'
import { useScanData } from '../hooks/useScanData'
import { supabase } from '../lib/supabase'

const DEFAULT_SETTINGS = {
  alert_score_drop:   true,
  alert_cert_expiry:  true,
  alert_new_critical: true,
  alert_dmarc_fail:   true,
  alert_breach_found: true,
  weekly_digest:      true,
  channel_email:      true,
  channel_slack:      false,
  channel_teams:      false,
  teams_webhook_url:  '',
  slack_webhook_url:  '',
}

export default function Settings() {
  const { state, send } = useApp()
  const { domainRow }   = useScanData()

  const [settings, setSettings]     = useState(DEFAULT_SETTINGS)
  const [recipients, setRecipients] = useState([])   // extra recipients from DB
  const [newEmail, setNewEmail]     = useState('')
  const [newName, setNewName]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [addingEmail, setAddingEmail] = useState(false)
  const [testing, setTesting]       = useState(false)
  const [saveMsg, setSaveMsg]       = useState('')
  const [testMsg, setTestMsg]       = useState('')
  const [loading, setLoading]       = useState(true)

  const ownerEmail = state.user?.email ?? ''

  useEffect(() => {
    if (!domainRow) return
    loadData()
  }, [domainRow])

  async function loadData() {
    setLoading(true)
    try {
      // Load alert settings
      const { data: s } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('domain_id', domainRow.id)
        .maybeSingle()
      if (s) setSettings(s)

      // Load extra recipients
      const { data: r } = await supabase
        .from('alert_recipients')
        .select('*')
        .eq('domain_id', domainRow.id)
        .order('created_at')
      setRecipients(r ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    if (!domainRow) return
    setSaving(true)
    setSaveMsg('')

    const { error } = await supabase
      .from('alert_settings')
      .upsert({ ...settings, domain_id: domainRow.id, updated_at: new Date().toISOString() },
               { onConflict: 'domain_id' })

    setSaving(false)
    if (error) {
      setSaveMsg(`Error: ${error.message}`)
    } else {
      setSaveMsg('Settings saved ✓')
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function addRecipient() {
    const email = newEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (email === ownerEmail) return  // owner already included
    if (recipients.find(r => r.email === email)) return

    setAddingEmail(true)
    const { data, error } = await supabase
      .from('alert_recipients')
      .insert({ domain_id: domainRow.id, email, name: newName.trim() || null, active: true })
      .select()
      .single()

    setAddingEmail(false)
    if (!error && data) {
      setRecipients(prev => [...prev, data])
      setNewEmail('')
      setNewName('')
    }
  }

  async function toggleRecipient(id, active) {
    await supabase.from('alert_recipients').update({ active }).eq('id', id)
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, active } : r))
  }

  async function removeRecipient(id) {
    await supabase.from('alert_recipients').delete().eq('id', id)
    setRecipients(prev => prev.filter(r => r.id !== id))
  }

  async function sendTestAlert() {
    if (!ownerEmail) return
    setTesting(true)
    setTestMsg('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL??''}/api/alerts/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, domain: domainRow?.name })
      })
      const json = await res.json()
      if (json.sent) {
        setTestMsg(`✓ Test email sent to ${ownerEmail}`)
      } else {
        setTestMsg(`Could not send: ${json.reason ?? json.error ?? 'check RESEND_API_KEY in .env.local'}`)
      }
    } catch (err) {
      setTestMsg(`Error: ${err.message} — is the API server running?`)
    } finally {
      setTesting(false)
      setTimeout(() => setTestMsg(''), 6000)
    }
  }

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }))

  if (loading) return (
    <div style={{ padding:24, fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>Loading settings…</div>
  )

  if (!domainRow) return (
    <div style={{ padding:24, fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#6b7789' }}>
      No verified domain yet — complete onboarding first.
    </div>
  )

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:14, padding:16, maxWidth:640 }}>

      {/* Alert triggers */}
      <Section title="Alert triggers" icon="ti-bell" subtitle="Choose what sends an alert">
        {[
          { key:'alert_new_critical', label:'New critical issue detected',       desc:'Immediate alert when a new critical severity issue is found' },
          { key:'alert_score_drop',   label:'Security score drops more than 10 points', desc:'Alert when your overall score falls significantly' },
          { key:'alert_cert_expiry',  label:'SSL certificate expiring within 30 days',  desc:'Reminder before your cert expires and breaks HTTPS' },
          { key:'alert_dmarc_fail',   label:'DMARC not enforced (spoofing risk)',        desc:'Alert if DMARC policy is missing or set to p=none' },
          { key:'alert_breach_found', label:'Domain found in new breach',               desc:'Alert when your domain appears in breach data' },
          { key:'weekly_digest',      label:'Weekly security summary (every Monday)',    desc:'A digest email with your current score and open issues' },
        ].map(({ key, label, desc }) => (
          <CheckRow key={key} checked={settings[key]} onChange={() => toggle(key)} label={label} desc={desc} />
        ))}
      </Section>

      {/* Recipients */}
      <Section title="Alert recipients" icon="ti-at" subtitle="Who receives alert emails">

        {/* Owner email — always on, read-only */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(0,223,120,0.07)', border:'0.5px solid rgba(0,223,120,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className="ti ti-crown" style={{ fontSize:14, color:'#00df78' }} aria-hidden="true"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:'#dde2ed' }}>{ownerEmail}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>Account owner — always receives alerts</div>
          </div>
          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#00df78', background:'rgba(0,223,120,0.07)', border:'0.5px solid rgba(0,223,120,0.2)', padding:'2px 8px', borderRadius:100 }}>Always on</span>
        </div>

        {/* Extra recipients */}
        {recipients.map(r => (
          <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(79,166,255,0.07)', border:'0.5px solid rgba(79,166,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="ti ti-user" style={{ fontSize:14, color:'#4fa6ff' }} aria-hidden="true"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, color:'#dde2ed' }}>{r.email}</div>
              {r.name && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>{r.name}</div>}
            </div>
            {/* Toggle active */}
            <Toggle checked={r.active} onChange={() => toggleRecipient(r.id, !r.active)} />
            {/* Remove */}
            <button onClick={() => removeRecipient(r.id)}
              style={{ background:'none', border:'none', color:'#3a4455', cursor:'pointer', fontSize:16, padding:'0 4px', lineHeight:1 }}
              title={`Remove ${r.email}`} aria-label={`Remove ${r.email}`}>×</button>
          </div>
        ))}

        {/* Add new */}
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789' }}>Add an extra alert recipient:</div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Name (optional)"
              style={{ width:130, background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'8px 10px', fontSize:11, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !addingEmail && addRecipient()}
              placeholder="email@company.com" type="email"
              style={{ flex:1, background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'8px 10px', fontSize:11, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
            <button onClick={addRecipient} disabled={addingEmail || !newEmail.includes('@')}
              style={{ background:'rgba(79,166,255,0.08)', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:7, padding:'8px 14px', fontSize:11, color:'#4fa6ff', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', opacity: !newEmail.includes('@') ? 0.4 : 1 }}>
              {addingEmail ? '…' : '+ Add'}
            </button>
          </div>
        </div>
      </Section>

      {/* Slack webhook */}
      <Section title="Slack alerts (optional)" icon="ti-brand-slack" subtitle="Send alerts to a Slack channel via webhook">
        <CheckRow checked={settings.channel_slack} onChange={() => toggle('channel_slack')}
          label="Send alerts to Slack" desc="Requires a Slack incoming webhook URL" />
        {settings.channel_slack && (
          <div style={{ marginTop:10 }}>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', marginBottom:6 }}>
              Slack webhook URL — get it from your Slack workspace settings → Incoming Webhooks
            </div>
            <input value={settings.slack_webhook_url ?? ''}
              onChange={e => setSettings(prev => ({ ...prev, slack_webhook_url: e.target.value }))}
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              style={{ width:'100%', background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'9px 12px', fontSize:11, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
          </div>
        )}
      </Section>

      {/* Teams webhook */}
      <Section title="Microsoft Teams alerts (optional)" icon="ti-brand-teams" subtitle="Send alerts to a Teams channel via incoming webhook">
        <CheckRow checked={settings.channel_teams ?? false} onChange={() => toggle('channel_teams')}
          label="Send alerts to Teams" desc="Requires a Teams incoming webhook URL" />
        {settings.channel_teams && (
          <div style={{ marginTop:10 }}>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', marginBottom:6 }}>
              Teams webhook URL — Channel → ⋯ → Connectors → Incoming Webhook → Configure → Copy URL
            </div>
            <input value={settings.teams_webhook_url ?? ''}
              onChange={e => setSettings(prev => ({ ...prev, teams_webhook_url: e.target.value }))}
              placeholder="https://outlook.office.com/webhook/..."
              style={{ width:'100%', background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'9px 12px', fontSize:11, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
          </div>
        )}
      </Section>

      {/* Actions */}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <button
          onClick={async () => {
            const r = await fetch(`${import.meta.env.VITE_API_URL??''}/api/cron/weekly-digest?secret=${import.meta.env.VITE_CRON_SECRET??''}`)
            const j = await r.json()
            alert(j.ok ? `Digest sent to ${j.sent} recipient(s)` : `Failed: ${j.error}`)
          }}
          style={{ padding:'7px 14px', background:'rgba(79,166,255,0.07)', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:7, fontSize:11, color:'#4fa6ff', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', marginRight:8 }}>
          Send test digest
        </button>
        <button onClick={saveSettings} disabled={saving}
          style={{ background:'rgba(0,223,120,0.08)', border:'0.5px solid rgba(0,223,120,0.22)', borderRadius:8, padding:'10px 20px', fontSize:12, fontWeight:600, color:'#00df78', cursor:'pointer', fontFamily:'Syne,sans-serif', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>

        <button onClick={sendTestAlert} disabled={testing}
          style={{ background:'rgba(79,166,255,0.07)', border:'0.5px solid rgba(79,166,255,0.18)', borderRadius:8, padding:'10px 20px', fontSize:12, color:'#4fa6ff', cursor:'pointer', fontFamily:'Syne,sans-serif', opacity: testing ? 0.7 : 1 }}>
          {testing ? 'Sending…' : 'Send test alert'}
        </button>

        {saveMsg && (
          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color: saveMsg.startsWith('Error') ? '#ff4757' : '#00df78' }}>
            {saveMsg}
          </span>
        )}
        {testMsg && (
          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color: testMsg.startsWith('✓') ? '#00df78' : '#ffb627' }}>
            {testMsg}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function Section({ title, icon, subtitle, children }) {
  return (
    <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
        <i className={`ti ${icon}`} style={{ fontSize:14, color:'#4fa6ff' }} aria-hidden="true"/>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'#dde2ed' }}>{title}</div>
          {subtitle && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding:'4px 14px 12px' }}>{children}</div>
    </div>
  )
}

function CheckRow({ checked, onChange, label, desc }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.04)', cursor:'pointer' }}
      onClick={onChange}>
      <div style={{
        width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
        background: checked ? 'rgba(79,166,255,0.15)' : 'transparent',
        border: `1.5px solid ${checked ? '#4fa6ff' : 'rgba(255,255,255,0.15)'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .15s',
      }}>
        {checked && <i className="ti ti-check" style={{ fontSize:11, color:'#4fa6ff' }} aria-hidden="true"/>}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, color:'#dde2ed', marginBottom:2 }}>{label}</div>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', lineHeight:1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{
      width:34, height:18, borderRadius:100,
      background: checked ? 'rgba(0,223,120,0.2)' : 'rgba(255,255,255,0.05)',
      border: `0.5px solid ${checked ? 'rgba(0,223,120,0.3)' : 'rgba(255,255,255,0.1)'}`,
      cursor:'pointer', position:'relative', flexShrink:0, transition:'all .2s',
    }}>
      <div style={{
        position:'absolute', top:2,
        left: checked ? 17 : 2,
        width:13, height:13, borderRadius:'50%',
        background: checked ? '#00df78' : '#3a4455',
        transition:'all .2s',
      }}/>
    </div>
  )
}
