import React, { useState } from 'react'
import { useApp, A } from '../../store/appStore'
import { supabase } from '../../lib/supabase'
import { useScanData } from '../../hooks/useScanData'
import { useActiveDomain } from '../../hooks/useActiveDomain'

const NAV = [
  { section: 'Overview' },
  { id: 'overview',   label: 'Dashboard',          icon: 'ti-layout-dashboard' },
  { id: 'score',      label: 'Security Score',      icon: 'ti-chart-bar' },
  { section: 'Detection' },
  { id: 'uptime',       label: 'Uptime Monitor',         icon: 'ti-activity' },
  { id: 'threatalerts', label: 'Threat Alerts',         icon: 'ti-radar-2' },
  { id: 'threats',    label: 'Threat Detection',    icon: 'ti-radar' },
  { id: 'response',   label: 'Managed Response',    icon: 'ti-shield-check' },
  { id: 'darkweb',    label: 'Dark Web Monitor',    icon: 'ti-eye-off' },
  { section: 'Assessment' },
  { id: 'domain',     label: 'Domain Monitor',      icon: 'ti-world' },
  { id: 'vuln',       label: 'Vulnerability Scan',  icon: 'ti-scan' },
  { id: 'pentest',    label: 'Pen Testing',         icon: 'ti-lock-open' },
  { id: 'creds',      label: 'Credential Check',    icon: 'ti-key' },
  { section: 'Cloud' },
  { id: 'integrations', label: 'Cloud & Identity',     icon: 'ti-plug' },
  { section: 'Risk' },
  { id: 'vendor',     label: 'Vendor Risk',         icon: 'ti-building' },
  { id: 'compliance', label: 'Compliance',          icon: 'ti-certificate' },
  { id: 'training',   label: 'Awareness Training',  icon: 'ti-school' },
  { section: 'People & Policies' },
  { id: 'phishing',     label: 'Phishing Simulations',  icon: 'ti-fish-hook' },
  { id: 'documents',    label: 'Policy Documents',      icon: 'ti-file-text' },
  { section: 'Account' },
  { id: 'settings',   label: 'Alert Settings',      icon: 'ti-bell' },
  { id: 'account',    label: 'Account & Data',      icon: 'ti-user-circle' },
  { id: 'billing',    label: 'Billing & Plans',     icon: 'ti-credit-card' },
  { id: 'guides',     label: 'Setup Guides',         icon: 'ti-book' },
]

export default function Sidebar() {
  const { state, send }  = useApp()
  const { domainRow }    = useScanData()
  const [confirmOut, setConfirmOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const email  = state.user?.email ?? ''
  const org    = state.profile?.org_name ?? email.split('@')[1] ?? 'My Organisation'
  const plan   = state.profile?.plan ?? 'free'
  const avatar = org[0]?.toUpperCase() ?? 'U'
  const domain = domainRow?.name ?? '—'

  const handleSignOut = async () => {
    if (!confirmOut) {
      setConfirmOut(true)
      setTimeout(() => setConfirmOut(false), 3000)
      return
    }
    setSigningOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[Sidebar] signOut:', error.message)
      send(A.TOAST, { msg: `Sign out failed: ${error.message}`, type: 'bad' })
      setSigningOut(false)
      setConfirmOut(false)
    }
    // onAuthStateChange handles the rest
  }

  return (
    <aside style={{ width:192, background:'#0f1420', borderRight:'0.5px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', flexShrink:0, height:'100%' }}>

      {/* Logo + domain */}
      <div style={{ borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'13px 13px 8px' }}>
          <LogoMark />
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#dde2ed' }}>CyberGuard</span>
        </div>
        <DomainSwitcher onNavigate={() => send(A.SET_PAGE, 'domain')} />
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'4px 0' }} aria-label="Main navigation">
        {NAV.map((item, i) => {
          if (item.section) return (
            <div key={`s${i}`} style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', letterSpacing:'1.5px', textTransform:'uppercase', padding:'10px 14px 3px' }}>
              {item.section}
            </div>
          )
          const active = state.activePage === item.id
          return (
            <button key={item.id} onClick={() => send(A.SET_PAGE, item.id)}
              aria-current={active ? 'page' : undefined}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 11px', margin:'1px 6px', borderRadius:7, fontSize:11.5, cursor:'pointer', textAlign:'left', width:'calc(100% - 12px)', transition:'all .12s', whiteSpace:'nowrap',
                color:      active ? '#4fa6ff' : '#6b7789',
                background: active ? 'rgba(79,166,255,0.07)' : 'transparent',
                border:     active ? '0.5px solid rgba(79,166,255,0.12)' : '0.5px solid transparent',
              }}>
              <i className={`ti ${item.icon}`} style={{ fontSize:14, width:15, flexShrink:0 }} aria-hidden="true"/>
              <span style={{ flex:1 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:'10px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'0 2px' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#4fa6ff', flexShrink:0 }}>
            {avatar}
          </div>
          <div style={{ overflow:'hidden', flex:1 }}>
            <div style={{ fontSize:11, color:'#dde2ed', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{org}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
          </div>
          <button onClick={() => send(A.SET_PAGE, 'billing')}
            style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, padding:'2px 6px', borderRadius:100, background:'rgba(79,166,255,0.07)', color:'#4fa6ff', border:'0.5px solid rgba(79,166,255,0.15)', flexShrink:0, cursor:'pointer', textTransform:'capitalize' }}>
            {plan}
          </button>
        </div>

        <button onClick={handleSignOut} disabled={signingOut} aria-label="Sign out"
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'7px 10px', borderRadius:7, fontSize:11, cursor: signingOut ? 'not-allowed' : 'pointer', fontFamily:'Syne,sans-serif', transition:'all .15s', opacity: signingOut ? 0.6 : 1,
            color:      confirmOut ? '#ff4757' : '#6b7789',
            background: confirmOut ? 'rgba(255,71,87,0.07)' : 'transparent',
            border:     confirmOut ? '0.5px solid rgba(255,71,87,0.2)' : '0.5px solid rgba(255,255,255,0.06)',
          }}>
          <i className={`ti ${signingOut ? 'ti-loader' : 'ti-logout'}`}
             style={{ fontSize:13, animation: signingOut ? 'spin 1s linear infinite' : 'none' }} aria-hidden="true"/>
          {signingOut ? 'Signing out…' : confirmOut ? 'Tap again to confirm' : 'Sign out'}
        </button>
      </div>
    </aside>
  )
}


function DomainSwitcher({ onNavigate }) {
  const { domains, activeDomain, switchDomain } = useActiveDomain()
  const [open, setOpen] = useState(false)

  if (!activeDomain) return null

  return (
    <div style={{ position:'relative', margin:'0 8px 8px' }}>
      <button
        onClick={() => domains.length > 1 ? setOpen(o => !o) : onNavigate()}
        style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 10px', background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:7, cursor:'pointer', width:'100%' }}>
        <span style={{ width:5, height:5, borderRadius:'50%', background:'#00df78', flexShrink:0 }}/>
        <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {activeDomain.name}
        </span>
        {domains.length > 1 && (
          <i className="ti ti-chevron-down" style={{ fontSize:10, color:'#3a4455', transform:open?'rotate(180deg)':'none', transition:'transform .15s' }} aria-hidden="true"/>
        )}
      </button>

      {open && domains.length > 1 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:7, zIndex:100, marginTop:3, overflow:'hidden' }}>
          {domains.map(d => (
            <button key={d.id}
              onClick={() => { switchDomain(d.id); setOpen(false) }}
              style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'8px 10px', background: d.id===activeDomain.id?'rgba(79,166,255,0.07)':'transparent', border:'none', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background: d.id===activeDomain.id?'#4fa6ff':'#3a4455', flexShrink:0 }}/>
              <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color: d.id===activeDomain.id?'#4fa6ff':'#6b7789', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {d.name}
              </span>
              {d.id===activeDomain.id && <i className="ti ti-check" style={{ fontSize:10, color:'#4fa6ff' }} aria-hidden="true"/>}
            </button>
          ))}
          <button
            onClick={() => { onNavigate(); setOpen(false) }}
            style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'7px 10px', background:'transparent', border:'none', cursor:'pointer', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
            <i className="ti ti-plus" style={{ fontSize:10, color:'#4fa6ff' }} aria-hidden="true"/>
            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#4fa6ff' }}>Manage domains</span>
          </button>
        </div>
      )}
    </div>
  )
}

function LogoMark() {
  return (
    <div style={{ width:24, height:24, borderRadius:6, background:'rgba(79,166,255,0.07)', border:'1px solid rgba(79,166,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', width:8, height:8, border:'1.5px solid #4fa6ff', borderRadius:2, transform:'rotate(45deg)' }}/>
      <div style={{ position:'absolute', width:3.5, height:3.5, background:'#00df78', borderRadius:'50%' }}/>
    </div>
  )
}
