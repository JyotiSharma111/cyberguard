import React, { useState, useEffect } from 'react'
import { StatCard, Card, Grid, IssueRow, EmptyState } from '../components/ui'
import { useScanData } from '../hooks/useScanData'
import { supabase } from '../lib/supabase'
import { useApp } from '../store/appStore'
import UpgradePrompt from '../components/ui/UpgradePrompt'
import { canDo } from '../lib/planLimits'

export default function Creds() {
  const { domainName, scores, credIssues } = useScanData()
  const { state } = useApp()
  const [staffEmails, setStaffEmails] = useState([])
  const [loadingEmails, setLoadingEmails] = useState(true)
  const [domainId, setDomainId] = useState(null)

  // Load staff emails from Supabase if any have been uploaded
  useEffect(() => {
    if (!state.user) return
    loadStaffEmails()
  }, [state.user, domainName])

  async function loadStaffEmails() {
    setLoadingEmails(true)
    try {
      // Get the domain ID first
      const { data: domain } = await supabase
        .from('domains')
        .select('id')
        .eq('user_id', state.user.id)
        .eq('name', domainName)
        .maybeSingle()

      if (!domain) return
      setDomainId(domain.id)

      // Load staff emails for this domain
      const { data: emails } = await supabase
        .from('staff_emails')
        .select('*')
        .eq('domain_id', domain.id)
        .order('breach_count', { ascending: false })

      setStaffEmails(emails ?? [])
    } finally {
      setLoadingEmails(false)
    }
  }

  const breachedEmails = staffEmails.filter(e => e.breach_count > 0)
  const credScore      = scores.credentials ?? 0

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Credential score"  value={`${credScore}/100`} note={credScore < 70 ? 'Breaches found' : 'Looking good'} accent={credScore >= 80 ? 'gr' : credScore >= 60 ? 'am' : 're'} />
        <StatCard label="Staff emails"      value={staffEmails.length} note={staffEmails.length === 0 ? 'None uploaded yet' : 'In your list'} accent="bl" />
        <StatCard label="Breached accounts" value={breachedEmails.length} note={breachedEmails.length > 0 ? 'Need password reset' : 'None found'} accent={breachedEmails.length > 0 ? 're' : 'gr'} />
        <StatCard label="Domain check"      value={credIssues.length > 0 ? 'Issues found' : 'Clean'} note="HIBP domain scan" accent={credIssues.length > 0 ? 'am' : 'gr'} />
      </Grid>

      {/* Domain-level issues — real data from HIBP scan */}
      {credIssues.length > 0 && (
        <Card title={`Domain breach check — ${domainName}`} titleIcon="ti-key" badge={`${credIssues.length} issue${credIssues.length > 1 ? 's' : ''}`} badgeType="bad">
          {credIssues.map(i => <IssueRow key={i.id} sev={i.sev} name={i.name} tag={i.tag} tagType={i.tagType} why={i.why} fix={i.fix} />)}
        </Card>
      )}

      {/* Staff emails — from user's own uploaded list */}
      <Card
        title="Staff email breach check"
        titleIcon="ti-users"
        badge={loadingEmails ? 'Loading…' : staffEmails.length > 0 ? `${staffEmails.length} emails` : 'No emails yet'}
        badgeType={breachedEmails.length > 0 ? 'bad' : 'ok'}
      >
        {loadingEmails ? (
          <div style={{ padding:'20px 14px', fontFamily:'IBM Plex Mono, monospace', fontSize:11, color:'#3a4455' }}>Loading…</div>
        ) : staffEmails.length === 0 ? (
          <div style={{ padding:'16px 14px' }}>
            <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:10, color:'#6b7789', lineHeight:1.7, marginBottom:12 }}>
              No staff emails uploaded yet. Upload a CSV with your team's email addresses to check them against the HaveIBeenPwned breach database.
              <br/><br/>
              <strong style={{ color:'#ffb627' }}>Important:</strong> You should only upload email addresses for your own organisation — people who have consented to have their accounts monitored.
            </div>
            <UploadCSV domainId={domainId} onComplete={loadStaffEmails} />
          </div>
        ) : (
          <div>
            {staffEmails.map(e => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background: e.breach_count > 0 ? '#ff4757' : '#00df78', flexShrink:0 }} />
                <span style={{ flex:1, fontFamily:'IBM Plex Mono, monospace', fontSize:11, color:'#dde2ed' }}>
                  {/* Mask email slightly for share-link safety */}
                  {e.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c)}
                </span>
                {e.name && <span style={{ fontSize:11, color:'#6b7789' }}>{e.name}</span>}
                <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:9, padding:'2px 8px', borderRadius:100,
                  color: e.breach_count > 0 ? '#ff4757' : '#00df78',
                  background: e.breach_count > 0 ? 'rgba(255,71,87,.08)' : 'rgba(0,223,120,.08)',
                  border: `0.5px solid ${e.breach_count > 0 ? 'rgba(255,71,87,.25)' : 'rgba(0,223,120,.25)'}` }}>
                  {e.breach_count > 0 ? `${e.breach_count} breach${e.breach_count > 1?'es':''}` : 'Clean'}
                </span>
              </div>
            ))}
            <div style={{ padding:'10px 14px', borderTop:'0.5px solid rgba(255,255,255,0.05)' }}>
              <UploadCSV domainId={domainId} onComplete={loadStaffEmails} label="Upload more emails" />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function UploadCSV({ domainId, onComplete, label = 'Upload staff email CSV' }) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || !domainId) return

    setUploading(true)
    setResult('')

    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

      let added = 0
      const errors = []

      for (const line of lines.slice(0, 500)) { // max 500 per upload
        // Support: email only, or name,email, or email,name
        const parts = line.split(',').map(p => p.trim().replace(/"/g, ''))
        const email  = parts.find(p => p.includes('@'))
        const name   = parts.find(p => !p.includes('@')) ?? null

        if (!email || !email.includes('@')) {
          errors.push(`Skipped: ${line}`)
          continue
        }

        const { error } = await supabase.from('staff_emails').upsert(
          { domain_id: domainId, email: email.toLowerCase(), name },
          { onConflict: 'domain_id,email', ignoreDuplicates: true }
        )
        if (error) errors.push(`Error on ${email}: ${error.message}`)
        else added++
      }

      setResult(`✓ Added ${added} emails${errors.length > 0 ? ` (${errors.length} skipped)` : ''}`)
      if (added > 0) onComplete?.()
    } catch (err) {
      setResult(`Error: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 14px',
        background:'rgba(79,166,255,.08)', border:'0.5px solid rgba(79,166,255,.25)', borderRadius:8,
        fontSize:11, color:'#4fa6ff', cursor: uploading ? 'not-allowed' : 'pointer',
        fontFamily:'IBM Plex Mono, monospace', opacity: uploading ? 0.7 : 1 }}>
        <i className="ti ti-upload" style={{ fontSize:13 }} aria-hidden="true" />
        {uploading ? 'Uploading…' : label}
        <input type="file" accept=".csv,.txt" onChange={handleFile} disabled={uploading} style={{ display:'none' }} />
      </label>
      {result && <div style={{ marginTop:6, fontFamily:'IBM Plex Mono, monospace', fontSize:10, color: result.startsWith('✓') ? '#00df78' : '#ff4757' }}>{result}</div>}
      <div style={{ marginTop:6, fontFamily:'IBM Plex Mono, monospace', fontSize:9, color:'#3a4455', lineHeight:1.5 }}>
        CSV format: one email per line, or: name,email — max 500 rows per upload
      </div>
    </div>
  )
}
