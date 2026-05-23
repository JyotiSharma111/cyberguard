/**
 * Login — email/password only. Clean, simple, no OAuth.
 * Handles: sign in, sign up, forgot password.
 */
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ defaultMode = 'login' }) {
  const [mode, setMode]         = useState(defaultMode)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')

  const clear = () => { setError(''); setMessage('') }

  function validate() {
    if (!email.trim())        return 'Email is required'
    if (!email.includes('@')) return 'Enter a valid email address'
    if (mode === 'reset')     return null
    if (!password)            return 'Password is required'
    if (mode === 'signup') {
      if (password.length < 8)  return 'Password must be at least 8 characters'
      if (!orgName.trim())      return 'Enter your business or organisation name'
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    clear()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(), password
        })
        if (error) throw error

      } else if (mode === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            data: { org_name: orgName.trim() },
            emailRedirectTo: `${window.location.origin}/`
          }
        })
        if (signUpError) throw signUpError

        // If email confirmation is disabled in Supabase, user is signed in immediately
        // If enabled, session will be null and we show the check email message
        if (signUpData.session) {
          // Already signed in — onAuthStateChange handles navigation
          return
        }
        setMessage('Check your email for a confirmation link. Check spam if you do not see it.')
        setMode('login')

      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`
        })
        if (error) throw error
        setMessage('Password reset email sent — check your inbox.')
        setMode('login')
      }
    } catch (err) {
      const msg = err.message
        .replace('Invalid login credentials', 'Incorrect email or password — check and try again')
        .replace('User already registered', 'Account already exists — try signing in instead')
        .replace('Email not confirmed', 'Please confirm your email first — check your inbox')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#080b10', padding:20 }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
        <LogoMark />
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, color:'#dde2ed' }}>CyberGuard</span>
      </div>
      <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', marginBottom:32, letterSpacing:'1.5px' }}>
        SECURITY INTELLIGENCE FOR SMALL BUSINESS
      </p>

      <form onSubmit={handleSubmit} noValidate style={{
        background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.09)',
        borderRadius:12, padding:'28px 28px 22px', width:'100%', maxWidth:340,
        display:'flex', flexDirection:'column', gap:14
      }}>
        {/* Heading */}
        <div>
          <div style={{ fontSize:16, fontWeight:600, color:'#dde2ed', marginBottom:3 }}>
            { mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password' }
          </div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>
            { mode === 'login'  && 'Welcome back' }
            { mode === 'signup' && 'Free to start — no credit card needed' }
            { mode === 'reset'  && "We'll email you a reset link" }
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'rgba(255,71,87,0.07)', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:8, padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#ff4757', lineHeight:1.5 }}>
            {error}
          </div>
        )}
        {/* Success */}
        {message && (
          <div style={{ background:'rgba(0,223,120,0.07)', border:'0.5px solid rgba(0,223,120,0.2)', borderRadius:8, padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78', lineHeight:1.5 }}>
            {message}
          </div>
        )}

        {/* Fields */}
        {mode === 'signup' && (
          <Field label="Business / organisation name" type="text" value={orgName}
            onChange={e => setOrgName(e.target.value)} placeholder="Acme Ltd" autoFocus />
        )}
        <Field label="Work email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
          autoFocus={mode !== 'signup'} />
        {mode !== 'reset' && (
          <Field label="Password" type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'} />
        )}

        {mode === 'login' && (
          <div style={{ textAlign:'right', marginTop:-8 }}>
            <Anchor onClick={() => { setMode('reset'); clear() }}>Forgot password?</Anchor>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading} style={{
          background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.28)',
          borderRadius:8, padding:'11px', fontFamily:'Syne,sans-serif', fontSize:13,
          fontWeight:600, color:'#4fa6ff', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, transition:'all .15s',
        }}>
          {loading ? 'Please wait…'
            : mode === 'login'  ? 'Sign in'
            : mode === 'signup' ? 'Create free account'
            : 'Send reset link'}
        </button>

        {/* Mode switcher */}
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', textAlign:'center', paddingTop:2 }}>
          {mode === 'login'  && <>No account? <Anchor onClick={() => { setMode('signup'); clear() }}>Sign up free</Anchor></>}
          {mode === 'signup' && <>Already have an account? <Anchor onClick={() => { setMode('login'); clear() }}>Sign in</Anchor></>}
          {mode === 'reset'  && <>Remember it? <Anchor onClick={() => { setMode('login'); clear() }}>Back to sign in</Anchor></>}
        </div>
      </form>

      {/* Feature hints */}
      <div style={{ display:'flex', gap:20, marginTop:28 }}>
        {['DNS monitoring','Email security','SSL alerts','Breach detection'].map(f => (
          <span key={f} style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#00df78', display:'inline-block' }}/>
            {f}
          </span>
        ))}
      </div>
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
          border:`0.5px solid ${focused ? 'rgba(79,166,255,0.4)' : 'rgba(255,255,255,0.09)'}`,
          transition:'border .15s' }} />
    </div>
  )
}

function Anchor({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{ background:'none', border:'none', color:'#4fa6ff', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontSize:10 }}>
      {children}
    </button>
  )
}

function LogoMark() {
  return (
    <div style={{ width:36, height:36, borderRadius:9, background:'rgba(79,166,255,0.08)', border:'1px solid rgba(79,166,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <div style={{ position:'absolute', width:13, height:13, border:'2px solid #4fa6ff', borderRadius:3, transform:'rotate(45deg)' }}/>
      <div style={{ position:'absolute', width:5, height:5, background:'#00df78', borderRadius:'50%' }}/>
    </div>
  )
}
