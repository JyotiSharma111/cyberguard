import React, { useState, useEffect } from 'react'
import { AppProvider, useApp, A } from './store/appStore'
import { supabase } from './lib/supabase'
import { Toast } from './components/ui'
import Sidebar  from './components/layout/Sidebar'
import Topbar   from './components/layout/Topbar'
import Login    from './pages/Login'
import Onboarding from './pages/Onboarding'
import Overview   from './pages/Overview'
import Score      from './pages/Score'
import Threats    from './pages/Threats'
import Response   from './pages/Response'
import DarkWeb    from './pages/DarkWeb'
import Domain     from './pages/Domain'
import Vuln       from './pages/Vuln'
import Pentest    from './pages/Pentest'
import Creds      from './pages/Creds'
import Vendor     from './pages/Vendor'
import Compliance from './pages/Compliance'
import Training   from './pages/Training'
import Settings        from './pages/Settings'
import AccountSettings from './pages/AccountSettings'
import Billing         from './pages/Billing'
import Integrations    from './pages/Integrations'
import SetupGuides     from './pages/SetupGuides'
import ThreatAlerts  from './pages/ThreatAlerts'
import Documents     from './pages/Documents'
import PhishingSim   from './pages/PhishingSim'
import Uptime        from './pages/Uptime'
import Canary        from './pages/Canary'
import Landing         from './pages/Landing'
import ResetPassword   from './pages/ResetPassword'
import ShareView       from './pages/ShareView'

const PAGES = {
  overview: Overview, score: Score, threats: Threats, response: Response,
  darkweb: DarkWeb, domain: Domain, vuln: Vuln, pentest: Pentest,
  creds: Creds, vendor: Vendor, compliance: Compliance, training: Training,
  settings: Settings,
  account:  AccountSettings,
  billing:  Billing,
  integrations: Integrations,
  guides:        SetupGuides,
  threatalerts:  ThreatAlerts,
  documents:     Documents,
  phishing:      PhishingSim,
  uptime:        Uptime,
  canary:        Canary,
}

function AppShell() {
  const { state, send }  = useApp()
  const [hasDomain, setHasDomain] = useState(null)

  useEffect(() => {
    if (!state.user) { setHasDomain(null); return }
    checkDomain()
  }, [state.user])

  async function checkDomain() {
    setHasDomain(null)
    // Count ALL domains (pending or verified) — if any exist, go to dashboard/onboarding
    // We check verified first; if none, check for pending so user can continue verification
    const { data: domains, error } = await supabase
      .from('domains')
      .select('id, status')
      .eq('user_id', state.user.id)

    if (error) { console.error('[App] checkDomain:', error.message) }
    const verified = (domains ?? []).some(d => d.status === 'verified')
    const pending  = (domains ?? []).some(d => d.status === 'pending')
    // If verified → show dashboard
    // If only pending → show onboarding (so they can complete verification)
    // If none → show onboarding (to add domain)
    setHasDomain(verified ? true : false)
    if (!verified && !pending) {
      // Brand new user with no domains at all
    }
  }

  useEffect(() => {
    if (!state.toast) return
    const t = setTimeout(() => send(A.TOAST_CLEAR), 4000)
    return () => clearTimeout(t)
  }, [state.toast])

  // Check for share link in URL — public route, no auth needed
  const shareToken = window.location.pathname.match(/^\/share\/([a-f0-9]+)$/)?.[1]
  if (shareToken) return <ShareView token={shareToken} />

  // Password reset flow — Supabase sets page to __password_reset via onAuthStateChange
  if (state.activePage === '__password_reset') return <ResetPassword />

  if (state.authLoading || (state.user && hasDomain === null)) return <Splash />

  // Unauthenticated — show landing page, switch to login/signup on demand
  if (!state.user) {
    if (state.activePage === '__login' || state.activePage === '__login_signup') {
      return <Login defaultMode={state.activePage === '__login_signup' ? 'signup' : 'login'} />
    }
    return <Landing />
  }
  if (!hasDomain)  return <Onboarding onVerified={async () => {
    // Small delay to ensure DB write is committed before re-reading
    await new Promise(r => setTimeout(r, 500))
    checkDomain()
  }} />

  const Page = PAGES[state.activePage] ?? Overview

  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell" style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#080b10' }}>
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:199, backdropFilter:'blur(2px)' }}
          aria-hidden="true"
        />
      )}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar onMenuOpen={() => setSidebarOpen(true)} />
        <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }} className="page-scroll">
          <Page key={state.activePage} />
        </main>
      </div>
      {/* Mobile bottom nav */}
      <MobileBottomNav activeId={state.activePage} onNavigate={(id) => { send(A.SET_PAGE, id); setSidebarOpen(false) }} onMenuOpen={() => setSidebarOpen(true)} />
      {state.toast && <Toast msg={state.toast.msg} type={state.toast.type} onClose={() => send(A.TOAST_CLEAR)} />}
    </div>
  )
}

function Splash() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080b10', flexDirection:'column', gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:9, background:'rgba(79,166,255,0.08)', border:'1px solid rgba(79,166,255,0.16)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        <div style={{ position:'absolute', width:12, height:12, border:'2px solid #4fa6ff', borderRadius:3, transform:'rotate(45deg)' }}/>
        <div style={{ position:'absolute', width:5, height:5, background:'#00df78', borderRadius:'50%' }}/>
      </div>
      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>Loading…</div>
    </div>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error:null } }
  static getDerivedStateFromError(e) { return { error:e } }
  componentDidCatch(e, info) { console.error('[ErrorBoundary]', e, info.componentStack) }
  render() {
    if (this.state.error) return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080b10', padding:20 }}>
        <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:12, padding:24, maxWidth:480 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'#ff4757', marginBottom:8, fontFamily:'Syne,sans-serif' }}>Something went wrong</div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#6b7789', lineHeight:1.6, marginBottom:16 }}>{this.state.error.message}</div>
          <button onClick={() => window.location.reload()}
            style={{ background:'rgba(255,71,87,0.08)', border:'0.5px solid rgba(255,71,87,0.2)', borderRadius:8, padding:'8px 16px', color:'#ff4757', cursor:'pointer', fontFamily:'Syne,sans-serif', fontSize:12 }}>
            Reload
          </button>
        </div>
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  )
}
