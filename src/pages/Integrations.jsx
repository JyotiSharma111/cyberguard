/**
 * Integrations — M365, AWS, Google Workspace, GitHub, Cloudflare.
 * Read-only API connections. Credentials stored encrypted in Supabase.
 */
import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid, IssueRow } from '../components/ui'
import { useApp } from '../store/appStore'
import { supabase } from '../lib/supabase'

// Integration definitions — all read-only, all free APIs
const INTEGRATION_DEFS = {
  m365: {
    label: 'Microsoft 365',
    icon:  'ti-brand-windows',
    color: '#4fa6ff',
    desc:  'MFA status, admin accounts, Secure Score, Security Defaults',
    fields: [
      { key:'tenantId',     label:'Directory (Tenant) ID',  type:'text',     placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key:'clientId',     label:'Application (Client) ID', type:'text',    placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key:'clientSecret', label:'Client Secret Value',     type:'password', placeholder:'Paste secret value here' },
    ],
    setup: [
      'portal.azure.com → App registrations → New registration → name it "CyberGuard"',
      'Copy Directory (tenant) ID and Application (client) ID',
      'Certificates & secrets → New client secret → copy the Value',
      'API permissions → Microsoft Graph → Application → add: User.Read.All, Policy.Read.All, Directory.Read.All, SecurityEvents.Read.All → Grant admin consent',
    ]
  },
  aws: {
    label: 'Amazon Web Services',
    icon:  'ti-cloud',
    color: '#ffb627',
    desc:  'Root MFA, S3 public buckets, IAM password policy, open security groups',
    fields: [
      { key:'accessKeyId',     label:'Access Key ID',     type:'text',     placeholder:'AKIAIOSFODNN7EXAMPLE' },
      { key:'secretAccessKey', label:'Secret Access Key', type:'password', placeholder:'wJalrXUtnFEMI...' },
      { key:'region',          label:'Primary region',    type:'text',     placeholder:'us-east-1' },
    ],
    setup: [
      'IAM → Users → Create user → name "cyberguard-readonly"',
      'Attach policies → SecurityAudit (AWS managed, read-only)',
      'User → Security credentials → Create access key → Application outside AWS',
      'Copy Access key ID and Secret access key',
    ]
  },
  google: {
    label: 'Google Workspace',
    icon:  'ti-brand-google',
    color: '#00df78',
    desc:  'MFA/2SV enforcement, admin accounts, user security status',
    fields: [
      { key:'serviceAccountKeyJson', label:'Service Account JSON key', type:'textarea', placeholder:'Paste the full contents of your downloaded service account JSON key file' },
      { key:'adminEmail',            label:'Super admin email',        type:'text',     placeholder:'admin@yourcompany.com' },
    ],
    setup: [
      'console.cloud.google.com → New project → Enable Admin SDK API',
      'IAM & Admin → Service Accounts → Create → download JSON key',
      'admin.google.com → Security → API Controls → Domain-wide delegation → Add client ID with scopes: admin.directory.user.readonly, admin.directory.domain.readonly',
      'Paste the full JSON key file contents and your super admin email',
    ]
  },
  github: {
    label: 'GitHub',
    icon:  'ti-brand-github',
    color: '#dde2ed',
    desc:  'Secret scanning alerts, Dependabot, 2FA enforcement, branch protection',
    fields: [
      { key:'token', label:'Personal Access Token', type:'password', placeholder:'github_pat_...' },
      { key:'org',   label:'Organisation name (optional)', type:'text', placeholder:'your-org-name (leave blank for personal account)' },
    ],
    setup: [
      'github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)',
      'Generate new token → select scopes: read:org, read:user, repo, security_events',
      'Paste token above. Organisation name is optional — adds org-level checks.',
    ]
  },
  cloudflare: {
    label: 'Cloudflare',
    icon:  'ti-cloud-storm',
    color: '#ff6b2b',
    desc:  'SSL mode, WAF security level, HSTS, Always HTTPS, TLS version',
    fields: [
      { key:'apiToken', label:'API Token', type:'password', placeholder:'Cloudflare API token' },
      { key:'domain',   label:'Domain name', type:'text',  placeholder:'yourdomain.com' },
    ],
    setup: [
      'dash.cloudflare.com → My Profile → API Tokens → Create Token',
      'Use template: Read all resources → or custom: Zone:Zone:Read, Zone:Zone Settings:Read',
      'Paste token and your domain name above',
    ]
  },
}

export default function Integrations() {
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const { state } = useApp()
  const [integrations, setIntegrations] = useState({})
  const [loading, setLoading]           = useState(true)
  const [scanning, setScanning]         = useState(null)
  const [expanded, setExpanded]         = useState(null)
  const [forms, setForms]               = useState({})
  const [errors, setErrors]             = useState({})
  const [setupOpen, setSetupOpen]       = useState(null)

  useEffect(() => {
    if (!state.user) return
    loadIntegrations()
  }, [state.user?.id])

  async function loadIntegrations() {
    setLoading(true)
    const { data } = await supabase.from('integrations').select('*').eq('user_id', state.user.id)
    const map = {}
    const initialForms = {}
    for (const row of data ?? []) {
      map[row.type] = row
      // Pre-fill non-secret fields
      const def = INTEGRATION_DEFS[row.type]
      if (def) {
        const prefilled = {}
        def.fields.forEach(f => {
          if (f.type !== 'password' && row.config?.[f.key]) prefilled[f.key] = row.config[f.key]
          else prefilled[f.key] = ''
        })
        initialForms[row.type] = prefilled
      }
    }
    // Init empty forms for unconnected integrations
    Object.entries(INTEGRATION_DEFS).forEach(([type, def]) => {
      if (!initialForms[type]) {
        const empty = {}
        def.fields.forEach(f => { empty[f.key] = f.key === 'region' ? 'us-east-1' : '' })
        initialForms[type] = empty
      }
    })
    setIntegrations(map)
    setForms(initialForms)
    setLoading(false)
  }

  function setField(type, key, value) {
    setForms(prev => ({ ...prev, [type]: { ...(prev[type]??{}), [key]: value } }))
    setErrors(prev => ({ ...prev, [type]: '' }))
  }

  async function saveAndScan(type) {
    const def    = INTEGRATION_DEFS[type]
    const form   = forms[type] ?? {}
    const existing = integrations[type]?.config ?? {}

    // Merge: keep existing secrets if not re-entered
    const config = { ...existing }
    def.fields.forEach(f => {
      if (form[f.key]) config[f.key] = form[f.key]
    })

    // Basic validation
    const requiredFilled = def.fields.filter(f => !f.key.toLowerCase().includes('optional') && f.key !== 'org' && f.key !== 'zoneId')
      .every(f => config[f.key])
    if (!requiredFilled) {
      setErrors(prev => ({ ...prev, [type]: 'Please fill in all required fields' }))
      return
    }

    setScanning(type)
    setErrors(prev => ({ ...prev, [type]: '' }))

    // Save config
    await supabase.from('integrations').upsert(
      { user_id: state.user.id, type, config, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,type' }
    )

    // Run scan
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL??''}/api/integrations/${type}/scan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const json = await res.json()

      if (!json.ok) {
        setErrors(prev => ({ ...prev, [type]: json.data?.error ?? json.error ?? 'Scan failed' }))
        setScanning(null); return
      }

      const result = json.data
      if (result.skipped) {
        setErrors(prev => ({ ...prev, [type]: result.reason }))
        setScanning(null); return
      }

      await supabase.from('integrations').update({
        last_scanned: new Date().toISOString(),
        last_score: result.score,
        last_issues: result.issues ?? [],
        raw_result: result,
      }).eq('user_id', state.user.id).eq('type', type)

      await loadIntegrations()
      setExpanded(type)
    } catch (err) {
      setErrors(prev => ({ ...prev, [type]: `Error: ${err.message} — is the API server running?` }))
    }
    setScanning(null)
  }

  async function remove(type) {
    await supabase.from('integrations').delete().eq('user_id', state.user.id).eq('type', type)
    setIntegrations(prev => { const n={...prev}; delete n[type]; return n })
    const empty = {}
    INTEGRATION_DEFS[type].fields.forEach(f => { empty[f.key] = f.key === 'region' ? 'us-east-1' : '' })
    setForms(prev => ({ ...prev, [type]: empty }))
  }

  const connected    = Object.keys(integrations)
  const totalIssues  = connected.flatMap(t => integrations[t]?.last_issues ?? [])
  const critCount    = totalIssues.filter(i => i.sev === 'critical').length
  const avgScore     = connected.length
    ? Math.round(connected.reduce((s,t) => s + (integrations[t]?.last_score ?? 100), 0) / connected.length)
    : null

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Connected"      value={connected.length} note={`of ${Object.keys(INTEGRATION_DEFS).length} available`} accent="bl" />
        <StatCard label="Avg cloud score" value={avgScore !== null ? `${avgScore}/100` : '—'} note="Across integrations" accent={avgScore>=80?'gr':avgScore>=60?'am':'re'} />
        <StatCard label="Cloud issues"   value={totalIssues.length} note={`${critCount} critical`} accent={critCount>0?'re':totalIssues.length>0?'am':'gr'} />
        <StatCard label="Cloud coverage"  value={connected.length >= 2 ? '✓ Good' : 'Add integrations'} note="Cloud & identity layer" accent={connected.length>=2?'gr':'am'} />
      </Grid>

      {Object.entries(INTEGRATION_DEFS).map(([type, def]) => {
        const data      = integrations[type]
        const isConnected = !!data
        const isScanning  = scanning === type
        const form        = forms[type] ?? {}
        const err         = errors[type]
        const issues      = data?.last_issues ?? []
        const score       = data?.last_score
        const isExpanded  = expanded === type

        return (
          <Card key={type}
            title={def.label} titleIcon={def.icon}
            badge={isConnected ? (score >= 80 ? 'Healthy' : `${issues.length} issues`) : 'Not connected'}
            badgeType={isConnected ? (score >= 80 ? 'ok' : issues.length > 0 ? 'warn' : 'ok') : 'bl'}>

            {/* Setup guide */}
            <div style={{ padding:'8px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setSetupOpen(setupOpen===type?null:type)}
                style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#4fa6ff', padding:0 }}>
                <i className={`ti ti-chevron-${setupOpen===type?'up':'down'}`} style={{ fontSize:10 }} aria-hidden="true"/>
                {isConnected ? 'View setup guide' : `How to connect ${def.label} (5 min)`}
              </button>
              {setupOpen === type && (
                <div style={{ marginTop:10, fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.9 }}>
                  {def.setup.map((step, i) => (
                    <div key={i}><span style={{ color:'#4fa6ff' }}>{i+1}.</span> {step}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Form fields */}
            <div style={{ padding:'12px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display:'grid', gridTemplateColumns: def.fields.length === 1 ? '1fr' : def.fields.some(f=>f.type==='textarea') ? '1fr' : `repeat(${Math.min(def.fields.length, 3)},1fr)`, gap:8, marginBottom:8 }}>
                {def.fields.map(f => (
                  <div key={f.key}>
                    <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginBottom:4 }}>{f.label}</div>
                    {f.type === 'textarea'
                      ? <textarea value={form[f.key]??''} onChange={e => setField(type, f.key, e.target.value)}
                          placeholder={f.placeholder} rows={4}
                          style={{ width:'100%', background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', fontSize:10, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace', resize:'vertical' }} />
                      : <input value={form[f.key]??''} onChange={e => setField(type, f.key, e.target.value)}
                          type={f.type} placeholder={isConnected && f.type==='password' ? '••••••••• (enter to update)' : f.placeholder}
                          style={{ width:'100%', background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', fontSize:10, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
                    }
                  </div>
                ))}
              </div>

              {err && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ff4757', marginBottom:8 }}>{err}</div>}

              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button onClick={() => saveAndScan(type)} disabled={isScanning}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:7, fontSize:11, cursor:isScanning?'not-allowed':'pointer', fontFamily:'IBM Plex Mono,monospace',
                    background:`${def.color}12`, border:`0.5px solid ${def.color}33`, color:def.color, opacity:isScanning?.7:1 }}>
                  <i className={`ti ${isScanning?'ti-loader':'ti-scan'}`} style={{ fontSize:11, animation:isScanning?'spin 1s linear infinite':'none' }} aria-hidden="true"/>
                  {isScanning ? `Scanning ${def.label}…` : isConnected ? 'Rescan' : 'Connect & scan'}
                </button>
                {isConnected && (
                  <button onClick={() => remove(type)}
                    style={{ padding:'7px 12px', borderRadius:7, fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', background:'transparent', border:'0.5px solid rgba(255,71,87,0.2)', color:'#ff4757' }}>
                    Disconnect
                  </button>
                )}
                {data?.last_scanned && (
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginLeft:'auto' }}>
                    {new Date(data.last_scanned).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Results */}
            {isConnected && (
              <>
                {/* Score + findings summary */}
                {data.raw_result?.findings && (
                  <div style={{ display:'flex', gap:16, padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', flexWrap:'wrap' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color: score>=80?'#00df78':score>=60?'#ffb627':'#ff4757' }}>{score}</div>
                      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455' }}>score</div>
                    </div>
                    {Object.entries(data.raw_result.findings).filter(([,v]) => typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string').slice(0,5).map(([k,v]) => (
                      <div key={k} style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:600, color: String(v).includes('✗')||v===false?'#ff4757':String(v).includes('✓')||v===true?'#00df78':'#dde2ed' }}>
                          {typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v)}
                        </div>
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455' }}>{k.replace(/([A-Z])/g,' $1').toLowerCase()}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Toggle issues */}
                {issues.length > 0 && (
                  <button onClick={() => setExpanded(isExpanded ? null : type)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'none', border:'none', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ffb627', borderBottom:'0.5px solid rgba(255,255,255,0.05)', width:'100%', textAlign:'left' }}>
                    <i className={`ti ti-chevron-${isExpanded?'up':'down'}`} style={{ fontSize:10 }} aria-hidden="true"/>
                    {isExpanded ? 'Hide' : 'Show'} {issues.length} issue{issues.length>1?'s':''}
                  </button>
                )}
                {isExpanded && issues.map(i => (
                  <IssueRow key={i.id} sev={i.sev} name={i.title} tag={i.sev}
                    tagType={i.sev==='critical'?'bad':i.sev==='high'?'warn':'bl'}
                    why={i.detail} fix={i.fix??[]} />
                ))}
                {issues.length === 0 && (
                  <div style={{ padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78' }}>
                    ✓ No security issues found in {def.label}
                  </div>
                )}
              </>
            )}

            {!isConnected && (
              <div style={{ padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>
                {def.desc}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
