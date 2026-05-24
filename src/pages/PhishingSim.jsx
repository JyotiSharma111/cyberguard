/**
 * Phishing Simulation — send safe test phishing emails to staff.
 * Tracks who opens and clicks. Shows results and sends education.
 * Phishing Simulation Tool.
 */
import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid } from '../components/ui'
import { useApp } from '../store/appStore'
import { useScanData } from '../hooks/useScanData'
import { supabase } from '../lib/supabase'

const DIFFICULTY_COLOR = { easy:'#00df78', medium:'#ffb627', hard:'#ff4757' }

export default function PhishingSim() {
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const { state } = useApp()
  const { domainRow, domainName } = useScanData()
  const [templates, setTemplates]   = useState([])
  const [campaigns, setCampaigns]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [activeTab, setActiveTab]   = useState('new')

  // New campaign form
  const [form, setForm] = useState({
    name:      '',
    templateId:'',
    fromName:  state.profile?.org_name ?? 'IT Support',
    fromEmail: `noreply@${domainName ?? 'yourdomain.com'}`,
    recipients: '',   // comma-separated emails
  })
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState(null)
  const [expandedCampaign, setExpandedCampaign] = useState(null)
  const [recipients, setRecipients] = useState([])

  useEffect(() => {
    loadTemplates()
    if (state.user) loadCampaigns()
  }, [state.user?.id])

  async function loadTemplates() {
    setLoading(true)
    try {
      const res  = await fetch(`${apiBase}/api/phishing/templates`)
      const json = await res.json()
      if (json.ok) setTemplates(json.data)
    } catch {}
    setLoading(false)
  }

  async function loadCampaigns() {
    const { data } = await supabase
      .from('phishing_campaigns').select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false }).limit(20)
    setCampaigns(data ?? [])
  }

  async function loadRecipients(campaignId) {
    const { data } = await supabase
      .from('phishing_recipients').select('*')
      .eq('campaign_id', campaignId)
      .order('email', { ascending: true })
    return data ?? []
  }

  async function launchCampaign() {
    if (!form.templateId || !form.recipients || !form.name) return
    setSending(true); setResult(null)

    // Parse recipients
    const emails = form.recipients.split(/[,\n]+/).map(e => e.trim()).filter(e => e.includes('@'))
    if (emails.length === 0) { setSending(false); return }

    // Create campaign in DB
    const { data: campaign } = await supabase.from('phishing_campaigns').insert({
      user_id: state.user.id,
      domain_id: domainRow?.id,
      name: form.name,
      template_id: form.templateId,
      from_name: form.fromName,
      from_email: form.fromEmail,
      status: 'running',
      sent_count: emails.length,
    }).select().single()

    if (!campaign) { setSending(false); return }

    // Insert recipients
    const recipRows = emails.map(email => ({ campaign_id: campaign.id, email }))
    const { data: recips } = await supabase.from('phishing_recipients').insert(recipRows).select()

    // Send emails
    const res  = await fetch(`${apiBase}/api/phishing/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        domainId:   domainRow?.id,
        recipients: (recips ?? recipRows).map((r, i) => ({ id: r.id ?? i, email: r.email, org: form.fromName })),
        templateId: form.templateId,
        fromName:   form.fromName,
        fromEmail:  form.fromEmail,
        baseUrl:    window.location.origin,
      })
    })
    const json = await res.json()
    setSending(false)

    // Check for failures
    const failures = (json.data ?? []).filter(r => !r.ok)
    if (failures.length > 0) {
      const errMsg = failures[0]?.error ?? 'Unknown error'
      alert('Send error: ' + errMsg + '. Resend only allows verified domains. Use RESEND_FROM=onboarding@resend.dev or verify your domain at resend.com/domains.')
    }

    await supabase.from('phishing_campaigns').update({
      status: 'complete',
      sent_count: (json.sent ?? emails.length),
    }).eq('id', campaign.id)
    setResult({ sent: json.sent ?? emails.length, failed: json.failed ?? 0, campaign: campaign.id })
    await loadCampaigns()
    setActiveTab('results')
  }

  const totalSent    = campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0)
  const totalClicked = campaigns.reduce((s, c) => s + (c.click_count ?? 0), 0)
  const clickRate    = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>

      {/* Consent banner */}
      <div style={{ background:'rgba(255,182,39,0.07)', border:'0.5px solid rgba(255,182,39,0.2)', borderRadius:8, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ffb627', lineHeight:1.6 }}>
        ⚠ <strong>Legal requirement:</strong> Only send phishing simulations to staff who have been informed that simulations may occur (e.g. via your Acceptable Use Policy). Never target people without their organisation's consent. This tool is for security awareness training only.
      </div>

      <Grid cols={4} gap={10}>
        <StatCard label="Campaigns run"  value={campaigns.length}  note="Total"               accent="bl" />
        <StatCard label="Emails sent"    value={totalSent}          note="Total recipients"    accent="bl" />
        <StatCard label="Click rate"     value={`${clickRate}%`}    note="Industry avg: 17%"   accent={clickRate>17?'re':clickRate>8?'am':'gr'} />
        <StatCard label="Templates"      value={templates.length}   note="Ready to use"        accent="gr" />
      </Grid>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:8, padding:4, width:'fit-content' }}>
        {[['new','New campaign'],['templates','Templates'],['results','Past campaigns']].map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'6px 16px', borderRadius:6, fontSize:11, fontWeight:activeTab===id?600:400, cursor:'pointer',
              background:activeTab===id?'rgba(79,166,255,0.1)':'transparent',
              border:`0.5px solid ${activeTab===id?'rgba(79,166,255,0.25)':'transparent'}`,
              color:activeTab===id?'#4fa6ff':'#6b7789', fontFamily:'Syne,sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'new' && (
        <Card title="Launch phishing simulation" titleIcon="ti-fish-hook">
          <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
            {[
              ['Campaign name', 'name', 'text', 'e.g. Q1 2025 Phishing Test'],
              ['From name',     'fromName',  'text', 'IT Support'],
              ['From email',    'fromEmail', 'email', `noreply@${domainName}`],
            ].map(([label, key, type, placeholder]) => (
              <div key={key}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginBottom:4 }}>{label}</div>
                <input value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))}
                  type={type} placeholder={placeholder}
                  style={{ width:'100%', background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', fontSize:11, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
              </div>
            ))}

            <div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginBottom:4 }}>Template</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {templates.map(t => (
                  <label key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', border:`0.5px solid ${form.templateId===t.id?'rgba(79,166,255,0.3)':'rgba(255,255,255,0.07)'}`, borderRadius:7, cursor:'pointer', background:form.templateId===t.id?'rgba(79,166,255,0.05)':'transparent' }}>
                    <input type="radio" name="template" value={t.id} checked={form.templateId===t.id} onChange={() => setForm(p=>({...p,templateId:t.id}))} style={{ marginTop:2 }} />
                    <div>
                      <div style={{ fontSize:11, fontWeight:500, color:'#dde2ed' }}>{t.name}</div>
                      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginTop:2 }}>
                        {t.category} ·
                        <span style={{ color:DIFFICULTY_COLOR[t.difficulty], marginLeft:4 }}>{t.difficulty}</span>
                      </div>
                      <div style={{ fontSize:10, color:'#6b7789', marginTop:2 }}>{t.preview}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginBottom:4 }}>Recipients (one email per line or comma-separated)</div>
              <textarea value={form.recipients} onChange={e => setForm(p=>({...p,recipients:e.target.value}))}
                placeholder="alice@company.com&#10;bob@company.com&#10;charlie@company.com"
                rows={4}
                style={{ width:'100%', background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', fontSize:11, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace', resize:'vertical' }} />
            </div>

            {result && (
              <div style={{ background:'rgba(0,223,120,0.07)', border:'0.5px solid rgba(0,223,120,0.2)', borderRadius:7, padding:'10px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#00df78' }}>
                ✓ Campaign launched — {result.sent} emails sent. Results appear below as staff interact with the email.
              </div>
            )}

            <button onClick={launchCampaign} disabled={sending || !form.templateId || !form.recipients || !form.name}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', background:'rgba(255,71,87,0.08)', border:'0.5px solid rgba(255,71,87,0.22)', borderRadius:8, fontSize:12, fontWeight:600, color:'#ff4757', cursor:'pointer', fontFamily:'Syne,sans-serif', opacity: (!form.templateId||!form.recipients||!form.name||sending)?.4:1 }}>
              <i className={`ti ${sending?'ti-loader':'ti-fish-hook'}`} style={{ fontSize:13, animation:sending?'spin 1s linear infinite':'none' }} aria-hidden="true"/>
              {sending ? 'Sending…' : 'Launch simulation'}
            </button>
          </div>
        </Card>
      )}

      {activeTab === 'templates' && (
        <Card title="Phishing templates" titleIcon="ti-template">
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {templates.map(t => (
              <div key={t.id} style={{ padding:'12px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#dde2ed' }}>{t.name}</div>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:DIFFICULTY_COLOR[t.difficulty], background:`${DIFFICULTY_COLOR[t.difficulty]}12`, border:`0.5px solid ${DIFFICULTY_COLOR[t.difficulty]}33`, padding:'1px 7px', borderRadius:100 }}>{t.difficulty}</span>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>{t.category}</span>
                </div>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#6b7789', marginBottom:3 }}>Subject: {t.subject}</div>
                <div style={{ fontSize:11, color:'#3a4455' }}>{t.preview}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'results' && (
        <Card title="Campaign results" titleIcon="ti-chart-bar"
          badge={campaigns.length > 0 ? `${campaigns.length} campaigns` : 'No campaigns yet'} badgeType="bl">
          {campaigns.length === 0 ? (
            <div style={{ padding:'16px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>No campaigns yet — launch your first simulation.</div>
          ) : (
            campaigns.map(camp => {
              const ctr = camp.sent_count > 0 ? Math.round(((camp.click_count??0)/camp.sent_count)*100) : 0
              const isExpanded = expandedCampaign === camp.id
              return (
                <div key={camp.id}>
                  {/* Campaign row */}
                  <div
                    onClick={async () => {
                      if (isExpanded) { setExpandedCampaign(null); return }
                      setExpandedCampaign(camp.id)
                      const r = await loadRecipients(camp.id)
                      setRecipients(r)
                    }}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <i className={`ti ti-chevron-${isExpanded?'up':'down'}`} style={{ fontSize:11, color:'#3a4455', flexShrink:0 }} aria-hidden="true"/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#dde2ed', marginBottom:2 }}>{camp.name}</div>
                      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>
                        {new Date(camp.created_at).toLocaleDateString()} · {camp.template_id} · {camp.sent_count} sent
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:16, textAlign:'center' }}>
                      <div><div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:600, color:'#dde2ed' }}>{camp.sent_count??0}</div><div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455' }}>sent</div></div>
                      <div><div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:600, color:'#ffb627' }}>{camp.open_count??0}</div><div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455' }}>opened</div></div>
                      <div><div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:600, color: ctr>20?'#ff4757':ctr>10?'#ffb627':'#00df78' }}>{ctr}%</div><div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455' }}>clicked</div></div>
                    </div>
                  </div>

                  {/* Per-recipient breakdown */}
                  {isExpanded && (
                    <div style={{ background:'rgba(0,0,0,0.2)', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 80px 120px', gap:0, padding:'6px 14px 6px 48px', fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
                        <span>EMAIL</span><span style={{textAlign:'center'}}>SENT</span><span style={{textAlign:'center'}}>OPENED</span><span style={{textAlign:'center'}}>CLICKED</span><span style={{textAlign:'center'}}>LAST EVENT</span>
                      </div>
                      {recipients.length === 0 ? (
                        <div style={{ padding:'10px 48px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>Loading recipients…</div>
                      ) : (
                        recipients.map(r => (
                          <div key={r.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 80px 120px', gap:0, padding:'7px 14px 7px 48px', borderBottom:'0.5px solid rgba(255,255,255,0.04)', alignItems:'center' }}>
                            <span style={{ fontSize:11, color:'#dde2ed', fontFamily:'IBM Plex Mono,monospace' }}>{r.email}</span>
                            <span style={{ textAlign:'center', fontSize:10, color:r.sent_at?'#00df78':'#3a4455' }}>
                              {r.sent_at ? '✓' : '—'}
                            </span>
                            <span style={{ textAlign:'center', fontSize:10, color:r.opened_at?'#ffb627':'#3a4455' }}>
                              {r.opened_at ? '✓' : '—'}
                            </span>
                            <span style={{ textAlign:'center', fontSize:10, color:r.clicked_at?'#ff4757':'#3a4455', fontWeight:r.clicked_at?600:400 }}>
                              {r.clicked_at ? '⚠ YES' : '—'}
                            </span>
                            <span style={{ textAlign:'center', fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>
                              {r.clicked_at ? new Date(r.clicked_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) :
                               r.opened_at  ? new Date(r.opened_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </Card>
      )}
    </div>
  )
}
