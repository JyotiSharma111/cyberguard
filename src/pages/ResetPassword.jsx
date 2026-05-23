/**
 * ResetPassword — shown after user clicks the password reset email link.
 * Supabase fires PASSWORD_RECOVERY event which sets page to __password_reset.
 * User sets new password here, then gets signed in automatically.
 */
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp, A } from '../store/appStore'

export default function ResetPassword() {
  const { send } = useApp()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm)  { setError('Passwords do not match'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setDone(true)
    // USER_UPDATED event in appStore will sign them in and navigate to dashboard
    setTimeout(() => send(A.SET_PAGE, 'overview'), 1500)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#080b10', padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
        <LogoMark />
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#dde2ed' }}>CyberGuard</span>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.09)', borderRadius:12, padding:'28px', width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:600, color:'#dde2ed', marginBottom:3 }}>Set new password</div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>Choose a strong password for your account</div>
        </div>

        {error && (
          <div style={{ background:'rgba(255,71,87,0.07)', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:8, padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#ff4757' }}>
            {error}
          </div>
        )}

        {done && (
          <div style={{ background:'rgba(0,223,120,0.07)', border:'0.5px solid rgba(0,223,120,0.2)', borderRadius:8, padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78' }}>
            ✓ Password updated — signing you in…
          </div>
        )}

        {!done && (<>
          <Field label="New password" type="password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" autoFocus />
          <Field label="Confirm password" type="password" value={confirm}
            onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
          <button type="submit" disabled={loading}
            style={{ background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.28)', borderRadius:8, padding:'11px', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600, color:'#4fa6ff', cursor:loading?'not-allowed':'pointer', opacity:loading?.7:1 }}>
            {loading ? 'Updating…' : 'Set new password'}
          </button>
        </>)}
      </form>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789' }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        autoFocus={autoFocus} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ background:'#161c2a', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#dde2ed',
          outline:'none', width:'100%', fontFamily:'IBM Plex Mono,monospace',
          border:`0.5px solid ${focused?'rgba(79,166,255,0.4)':'rgba(255,255,255,0.09)'}`, transition:'border .15s' }} />
    </div>
  )
}

function LogoMark() {
  return (
    <div style={{ width:32, height:32, borderRadius:8, background:'rgba(79,166,255,0.08)', border:'1px solid rgba(79,166,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <div style={{ position:'absolute', width:12, height:12, border:'2px solid #4fa6ff', borderRadius:3, transform:'rotate(45deg)' }}/>
      <div style={{ position:'absolute', width:5, height:5, background:'#00df78', borderRadius:'50%' }}/>
    </div>
  )
}
