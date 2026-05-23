/**
 * Dark Web Monitor — real HIBP breach data + roadmap of deeper monitoring.
 */
import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid, IssueRow } from '../components/ui'
import { useScanData } from '../hooks/useScanData'
import { supabase } from '../lib/supabase'

const ROADMAP = [
  { phase:'Requires paid feed', icon:'ti-brand-telegram', title:'Telegram channel monitoring', detail:'Scan ransomware and initial-access-broker Telegram channels for mentions of your domain, email addresses, or brand name.' },
  { phase:'Coming soon', icon:'ti-file-text',       title:'Paste site monitoring',       detail:'Real-time alerts when your domain, IPs, or email addresses appear on Pastebin, Ghostbin, and similar sites.' },
  { phase:'Requires paid feed', icon:'ti-world-www',       title:'Dark web forum scanning',     detail:'Monitor BreachForums and similar sites for credential dumps containing your domain\'s email addresses.' },
  { phase:'Premium tier', icon:'ti-eye',             title:'Brand impersonation detection', detail:'Detect lookalike domains registered to impersonate your brand and phishing kits targeting your customers.' },
]

export default function DarkWeb() {
  const { domainName, domainRow, credIssues, scores, isReal } = useScanData()
  const [staffBreaches, setStaffBreaches] = useState([])
  const [domainBreaches, setDomainBreaches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!domainRow) { setLoading(false); return }
    loadBreachData()
  }, [domainRow])

  async function loadBreachData() {
    setLoading(true)
    // Load staff emails with breach data
    const { data: staff } = await supabase
      .from('staff_emails')
      .select('email, name, breach_count, breach_sources')
      .eq('domain_id', domainRow.id)
      .gt('breach_count', 0)
      .order('breach_count', { ascending: false })

    setStaffBreaches(staff ?? [])

    // Domain-level breach issues from scan
    setDomainBreaches(credIssues ?? [])
    setLoading(false)
  }

  const credScore    = scores.credentials ?? 0
  const totalBreached = staffBreaches.length
  const totalSources  = [...new Set(staffBreaches.flatMap(s => s.breach_sources ?? []))].length

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Credential score"  value={isReal ? `${credScore}/100` : '—'} note={credScore < 70 ? 'Breaches found' : 'Looking good'} accent={credScore >= 80 ? 'gr' : credScore >= 60 ? 'am' : 're'} />
        <StatCard label="Breached accounts" value={totalBreached}   note="From your staff list"       accent={totalBreached > 0 ? 're' : 'gr'} />
        <StatCard label="Breach sources"    value={totalSources}    note="Unique data sources"        accent={totalSources > 0 ? 'am' : 'gr'} />
        <StatCard label="HIBP check"        value={isReal ? 'Done' : '—'} note="HaveIBeenPwned scan" accent={isReal ? 'gr' : 'bl'} />
      </Grid>

      {/* Domain-level breaches — real HIBP data */}
      {domainBreaches.length > 0 && (
        <Card title={`Domain breach findings — ${domainName}`} titleIcon="ti-key" badge={`${domainBreaches.length} issue${domainBreaches.length > 1?'s':''}`} badgeType="bad">
          {domainBreaches.map(i => (
            <IssueRow key={i.id} sev={i.sev} name={i.name} tag={i.tag} tagType={i.tagType} why={i.why} fix={i.fix} />
          ))}
        </Card>
      )}

      {/* Staff breaches */}
      <Card title="Staff account breaches" titleIcon="ti-users"
            badge={loading ? 'Loading…' : totalBreached > 0 ? `${totalBreached} breached` : staffBreaches.length === 0 ? 'Upload staff list' : 'All clear'}
            badgeType={totalBreached > 0 ? 'bad' : 'ok'}>
        {loading ? (
          <div style={{ padding:'16px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>Loading…</div>
        ) : staffBreaches.length === 0 && totalBreached === 0 ? (
          <div style={{ padding:'16px 14px' }}>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.7, marginBottom:10 }}>
              No breached accounts found yet.{' '}
              {domainRow ? 'Upload your staff email list on the Credential Check page to check individual accounts.' : 'Complete onboarding and upload your staff list to enable per-account breach checking.'}
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#4fa6ff' }}>
              → Go to Credential Check to upload your staff CSV
            </div>
          </div>
        ) : (
          staffBreaches.map(s => (
            <div key={s.email} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff4757', flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#dde2ed' }}>
                  {s.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c)}
                </div>
                {s.name && <div style={{ fontSize:10, color:'#6b7789', marginTop:1 }}>{s.name}</div>}
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ff4757' }}>{s.breach_count} breach{s.breach_count > 1?'es':''}</div>
                {s.breach_sources?.length > 0 && (
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>{s.breach_sources.slice(0,2).join(', ')}{s.breach_sources.length > 2 ? ` +${s.breach_sources.length-2}` : ''}</div>
                )}
              </div>
            </div>
          ))
        )}
      </Card>

      {/* What we currently monitor */}
      <Card title="What we monitor today" titleIcon="ti-eye">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:12 }}>
          {[
            { icon:'ti-database',   color:'#00df78', title:'HaveIBeenPwned domain scan',  detail:`Checks if ${domainName || 'your domain'} appeared in any known public breach database. Free, runs on every scan.` },
            { icon:'ti-users',      color:'#00df78', title:'Per-account breach checking',  detail:'Upload your staff CSV and we check each email against HIBP. Shows which accounts are in breach data and which sources.' },
            { icon:'ti-certificate',color:'#4fa6ff', title:'Subdomain certificate monitoring', detail:'Certificate transparency logs reveal shadow IT and forgotten subdomains that may be exposed.' },
            { icon:'ti-lock',       color:'#4fa6ff', title:'DMARC spoofing detection',    detail:'If your DMARC policy is weak, attackers can impersonate your email. We flag this immediately.' },
          ].map((item, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <i className={`ti ${item.icon}`} style={{ fontSize:16, color:item.color }} aria-hidden="true"/>
                <div style={{ fontSize:11, fontWeight:600, color:'#dde2ed' }}>{item.title}</div>
              </div>
              <div style={{ fontSize:11, color:'#6b7789', lineHeight:1.6 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Roadmap */}
      <Card title="Deep dark web monitoring — roadmap" titleIcon="ti-road">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:12 }}>
          {ROADMAP.map((item, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:28, height:28, borderRadius:7, background:'rgba(167,139,250,0.07)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:14, color:'#a78bfa' }} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#dde2ed' }}>{item.title}</div>
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9,
                    color: item.phase === 'Coming soon' ? '#ffb627'
                         : item.phase === 'Premium tier' ? '#a78bfa'
                         : item.phase.startsWith('Requires') ? '#ff4757'
                         : '#ffb627' }}>{item.phase}</div>
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
