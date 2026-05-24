/**
 * Login — sign in, sign up (with password strength + confirm), forgot password.
 * Strong password: 8+ chars, uppercase, number, special char.
 * Confirm password field on signup.
 */
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

// Password strength checker
function checkStrength(pw) {
  const rules = [
    { label: '8+ characters',       ok: pw.length >= 8 },
    { label: 'Uppercase letter',     ok: /[A-Z]/.test(pw) },
    { label: 'Number',               ok: /[0-9]/.test(pw) },
    { label: 'Special character',    ok: /[^A-Za-z0-9]/.test(pw) },
  ]
  const score = rules.filter(r => r.ok).length
  return { rules, score, strong: score === 4 }
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColors = ['', '#ff4757', '#ffb627', '#4fa6ff', '#00df78']

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="rgba(79,166,255,0.12)" stroke="rgba(79,166,255,0.4)" strokeWidth="1.2"/>
      <path d="M14 6L20 9.5V15C20 18.5 17.3 21.7 14 22.5C10.7 21.7 8 18.5 8 15V9.5L14 6Z" fill="rgba(79,166,255,0.2)" stroke="#4fa6ff" strokeWidth="1.2"/>
      <circle cx="14" cy="15" r="2.5" fill="#00df78"/>
    </svg>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, onKeyDown }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display:'block', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.8px' }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{ width:'100%', background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'10px 36px 10px 12px', fontSize:13, color:'#dde2ed', outline:'none', boxSizing:'border-box', fontFamily:'system-ui,sans-serif' }}
          onFocus={e => e.target.style.borderColor='rgba(79,166,255,0.4)'}
          onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#3a4455', padding:0, fontSize:14 }}
            aria-label={show ? 'Hide password' : 'Show password'}>
            <i className={`ti ${show ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true"/>
          </button>
        )}
      </div>
    </div>
  )
}

export default function Login({ defaultMode = 'login' }) {
  const [mode, setMode]           = useState(defaultMode)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [orgName, setOrgName]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [message, setMessage]     = useState('')
  const [remember, setRemember]   = useState(true)

  const clear = () => { setError(''); setMessage('') }
  const strength = mode === 'signup' ? checkStrength(password) : null

  function validate() {
    if (!email.trim())              return 'Email is required'
    if (!email.includes('@'))       return 'Enter a valid email address'
    if (mode === 'reset')           return null
    if (!password)                  return 'Password is required'
    if (mode === 'signup') {
      if (!strength.strong)         return 'Password must be 8+ characters with uppercase, number, and special character'
      if (password !== confirm)     return 'Passwords do not match'
      if (!orgName.trim())          return 'Enter your business or organisation name'
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
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error

      } else if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            data: { org_name: orgName.trim() },
            emailRedirectTo: `${window.location.origin}/`,
          }
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setMessage('Check your email for a confirmation link. Check spam if you don\'t see it.')
        }

      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setMessage('Password reset email sent — check your inbox.')
      }
    } catch (err) {
      setError(
        (err.message || 'Something went wrong')
          .replace('Invalid login credentials', 'Incorrect email or password — try again')
          .replace('Email not confirmed', 'Please confirm your email first — check your inbox')
          .replace('User already registered', 'An account with this email already exists — sign in instead')
      )
    } finally {
      setLoading(false)
    }
  }

  const titles = { login:'Welcome back', signup:'Start free — no card needed', reset:'Reset your password' }
  const subs   = { login:'Sign in to your CyberGuard dashboard', signup:'Join thousands of businesses monitoring their security', reset:'We\'ll email you a link to reset your password' }

  return (
    <div style={{ minHeight:'100vh', background:'#080b10', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:32 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <LogoMark/>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:'#dde2ed' }}>CyberGuard</span>
          </div>
          <div style={{ fontSize:18, fontWeight:600, color:'#dde2ed', textAlign:'center', marginBottom:4 }}>{titles[mode]}</div>
          <div style={{ fontSize:13, color:'#6b7789', textAlign:'center' }}>{subs[mode]}</div>
        </div>

        {/* Card */}
        <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:12, padding:28 }}>

          {/* Mode tabs */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:8, padding:3, marginBottom:22 }}>
            {[['login','Sign in'],['signup','Sign up']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); clear(); setPassword(''); setConfirm('') }}
                style={{ flex:1, padding:'7px', fontSize:12, fontWeight:600, border:'none', borderRadius:6, cursor:'pointer', transition:'all .15s',
                  background: mode===m ? 'rgba(79,166,255,0.12)' : 'transparent',
                  color: mode===m ? '#4fa6ff' : '#6b7789',
                }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <Field label="Business / organisation name" value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Ltd" autoComplete="organization"/>
            )}

            <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" autoComplete={mode==='login'?'email':'username'}/>

            {mode !== 'reset' && (
              <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode==='signup'?'Min 8 chars, uppercase, number, symbol':'Your password'}
                autoComplete={mode==='login'?'current-password':'new-password'}/>
            )}

            {/* Password strength meter — signup only */}
            {mode === 'signup' && password.length > 0 && (
              <div style={{ marginBottom:14, marginTop:-8 }}>
                <div style={{ display:'flex', gap:3, marginBottom:5 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex:1, height:3, borderRadius:100,
                      background: i <= strength.score ? strengthColors[strength.score] : 'rgba(255,255,255,0.06)',
                      transition:'background .2s' }}/>
                  ))}
                </div>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color: strengthColors[strength.score] }}>
                  {strengthLabels[strength.score]}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 12px', marginTop:5 }}>
                  {strength.rules.map(r => (
                    <span key={r.label} style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9,
                      color: r.ok ? '#00df78' : '#3a4455' }}>
                      {r.ok ? '✓' : '○'} {r.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm password — signup only */}
            {mode === 'signup' && (
              <>
                <Field label="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter your password" autoComplete="new-password"/>
                {confirm.length > 0 && (
                  <div style={{ marginBottom:12, marginTop:-10, fontFamily:'IBM Plex Mono,monospace', fontSize:10,
                    color: password === confirm ? '#00df78' : '#ff4757' }}>
                    {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </>
            )}

            {/* Remember me / forgot password row */}
            {mode === 'login' && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:'#6b7789' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ accentColor:'#4fa6ff' }}/>
                  Remember me
                </label>
                <button type="button" onClick={() => { setMode('reset'); clear() }}
                  style={{ background:'none', border:'none', fontSize:12, color:'#4fa6ff', cursor:'pointer', padding:0 }}>
                  Forgot password?
                </button>
              </div>
            )}

            {error   && <div style={{ background:'rgba(255,71,87,0.08)', border:'0.5px solid rgba(255,71,87,0.25)', borderRadius:7, padding:'9px 12px', fontSize:12, color:'#ff4757', marginBottom:14, lineHeight:1.5 }}>{error}</div>}
            {message && <div style={{ background:'rgba(0,223,120,0.08)', border:'0.5px solid rgba(0,223,120,0.2)',  borderRadius:7, padding:'9px 12px', fontSize:12, color:'#00df78', marginBottom:14, lineHeight:1.5 }}>{message}</div>}

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', background: loading ? 'rgba(79,166,255,0.05)' : 'rgba(79,166,255,0.12)', border:'0.5px solid rgba(79,166,255,0.3)', borderRadius:8, fontSize:13, fontWeight:600, color:'#4fa6ff', cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .15s' }}
              onMouseEnter={e => { if(!loading) e.target.style.background='rgba(79,166,255,0.18)' }}
              onMouseLeave={e => { if(!loading) e.target.style.background='rgba(79,166,255,0.12)' }}>
              {loading && <i className="ti ti-loader" style={{ animation:'spin 1s linear infinite', fontSize:14 }} aria-hidden="true"/>}
              {loading ? 'Please wait…' : mode==='login' ? 'Sign in' : mode==='signup' ? 'Create free account' : 'Send reset email'}
            </button>

            {mode === 'reset' && (
              <button type="button" onClick={() => { setMode('login'); clear() }}
                style={{ width:'100%', marginTop:10, padding:'10px', background:'transparent', border:'none', fontSize:12, color:'#6b7789', cursor:'pointer' }}>
                ← Back to sign in
              </button>
            )}
          </form>

          {mode === 'signup' && (
            <p style={{ fontSize:11, color:'#3a4455', textAlign:'center', marginTop:14, lineHeight:1.6 }}>
              By creating an account you agree to our{' '}
              <a href="/terms" style={{ color:'#4fa6ff' }}>Terms of Service</a> and{' '}
              <a href="/privacy" style={{ color:'#4fa6ff' }}>Privacy Policy</a>.
            </p>
          )}
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#3a4455', marginTop:16 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode==='login'?'signup':'login'); clear(); setPassword(''); setConfirm('') }}
            style={{ background:'none', border:'none', color:'#4fa6ff', cursor:'pointer', fontSize:12, padding:0 }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
