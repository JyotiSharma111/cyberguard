/**
 * Account Settings — org name, email, data export, delete account.
 * Required before charging real money (GDPR data deletion).
 */
import React, { useState } from 'react'
import { useApp, A } from '../store/appStore'
import { supabase } from '../lib/supabase'

export default function AccountSettings() {
  const { state, send } = useApp()
  const [orgName, setOrgName]   = useState(state.profile?.org_name ?? '')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleteError, setDeleteError]     = useState('')

  const email = state.user?.email ?? ''
  const plan  = state.profile?.plan ?? 'free'

  async function saveOrgName() {
    if (!orgName.trim()) return
    setSaving(true); setSaveMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({ org_name: orgName.trim(), updated_at: new Date().toISOString() })
      .eq('id', state.user.id)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg('Saved ✓'); setTimeout(() => setSaveMsg(''), 3000) }
  }

  async function sendPasswordReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) send(A.TOAST, { msg: `Error: ${error.message}`, type:'bad' })
    else send(A.TOAST, { msg: 'Password reset email sent — check your inbox', type:'ok' })
  }

  async function deleteAccount() {
    if (confirmDelete !== email) { setDeleteError('Type your email address exactly to confirm'); return }
    setDeleting(true); setDeleteError('')
    try {
      // Delete all user data via cascade (RLS + ON DELETE CASCADE handles it)
      // Delete domains → cascades to scan_results, staff_emails, alerts, share_links, alert_settings, alert_recipients, vendors
      await supabase.from('domains').delete().eq('user_id', state.user.id)
      await supabase.from('vendors').delete().eq('user_id', state.user.id)
      await supabase.from('profiles').delete().eq('id', state.user.id)
      // Sign out — Supabase will handle auth user deletion via dashboard
      await supabase.auth.signOut()
      send(A.TOAST, { msg: 'Account deleted. All your data has been removed.', type:'ok' })
    } catch (err) {
      setDeleteError(`Error: ${err.message}. Contact support@cyberguard.io for manual deletion.`)
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:14, padding:16, maxWidth:560 }}>

      {/* Profile */}
      <Section title="Account details" icon="ti-user-circle">
        <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'4px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
            <span style={{ color:'#6b7789' }}>Email address</span>
            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#dde2ed' }}>{email}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
            <span style={{ color:'#6b7789' }}>Current plan</span>
            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#4fa6ff', background:'rgba(79,166,255,0.07)', border:'0.5px solid rgba(79,166,255,0.2)', padding:'2px 8px', borderRadius:100, textTransform:'capitalize' }}>{plan}</span>
          </div>
        </div>
      </Section>

      {/* Organisation name */}
      <Section title="Organisation name" icon="ti-building">
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <input value={orgName} onChange={e => setOrgName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveOrgName()}
            placeholder="Your company name"
            style={{ flex:1, background:'#161c2a', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:7, padding:'8px 12px', fontSize:12, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
          <button onClick={saveOrgName} disabled={saving || !orgName.trim()}
            style={{ background:'rgba(0,223,120,.07)', border:'0.5px solid rgba(0,223,120,.2)', borderRadius:7, padding:'8px 14px', fontSize:12, color:'#00df78', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', opacity:!orgName.trim()?.4:1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {saveMsg && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#00df78', marginTop:5 }}>{saveMsg}</div>}
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginTop:5, lineHeight:1.5 }}>Shown on your dashboard and in reports. Defaults to your email domain if not set.</div>
      </Section>

      {/* Password */}
      <Section title="Password" icon="ti-lock">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 0' }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.5 }}>
            We'll send a reset link to {email}
          </div>
          <button onClick={sendPasswordReset}
            style={{ background:'rgba(79,166,255,.07)', border:'0.5px solid rgba(79,166,255,.2)', borderRadius:7, padding:'7px 14px', fontSize:11, color:'#4fa6ff', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', flexShrink:0 }}>
            Send reset email
          </button>
        </div>
      </Section>

      {/* Data + GDPR */}
      <Section title="Your data" icon="ti-database">
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.7, padding:'4px 0' }}>
          CyberGuard stores: your domain names, scan results, staff email addresses you uploaded, alert settings, and alert history. We do not store passwords, payment details, or credential data from breaches.<br/><br/>
          You can delete all your data at any time using the account deletion below.
        </div>
      </Section>

      {/* Delete account — danger zone */}
      <div style={{ background:'rgba(255,71,87,0.04)', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(255,71,87,0.15)', display:'flex', alignItems:'center', gap:8 }}>
          <i className="ti ti-trash" style={{ fontSize:14, color:'#ff4757' }} aria-hidden="true"/>
          <div style={{ fontSize:12, fontWeight:600, color:'#ff4757' }}>Delete account</div>
        </div>
        <div style={{ padding:'12px 14px' }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.6, marginBottom:12 }}>
            This permanently deletes your account and all associated data — domains, scan results, staff emails, alerts, and share links. This action cannot be undone.<br/><br/>
            Type your email address to confirm:
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={confirmDelete} onChange={e => { setConfirmDelete(e.target.value); setDeleteError('') }}
              placeholder={email}
              style={{ flex:1, background:'#161c2a', border:`0.5px solid ${deleteError?'#ff4757':'rgba(255,71,87,.2)'}`, borderRadius:7, padding:'8px 12px', fontSize:11, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
            <button onClick={deleteAccount} disabled={deleting || confirmDelete !== email}
              style={{ background:'rgba(255,71,87,.1)', border:'0.5px solid rgba(255,71,87,.3)', borderRadius:7, padding:'8px 14px', fontSize:11, fontWeight:600, color:'#ff4757', cursor:deleting||confirmDelete!==email?'not-allowed':'pointer', fontFamily:'Syne,sans-serif', opacity:confirmDelete!==email?.4:1 }}>
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
          {deleteError && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ff4757', marginTop:6 }}>{deleteError}</div>}
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
        <i className={`ti ${icon}`} style={{ fontSize:14, color:'#4fa6ff' }} aria-hidden="true"/>
        <div style={{ fontSize:12, fontWeight:600, color:'#dde2ed' }}>{title}</div>
      </div>
      <div style={{ padding:'10px 14px 12px' }}>{children}</div>
    </div>
  )
}
