/**
 * CyberGuard App Store
 * Supabase manages the session. This store only holds UI state.
 * scan data is fetched directly from Supabase in useScanData hook.
 */
import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function getInitialPage() {
  try { return sessionStorage.getItem('cg_page') || 'overview' }
  catch { return 'overview' }
}

const INITIAL = {
  authLoading: true,
  user:        null,
  profile:     null,
  activePage:  getInitialPage(),
  scanRunning: false,
  toast:       null,
  _log:        [],
}

export const A = {
  AUTH_LOADED:    'AUTH_LOADED',
  AUTH_SIGNED_IN: 'AUTH_SIGNED_IN',
  AUTH_SIGNED_OUT:'AUTH_SIGNED_OUT',
  SET_PROFILE:    'SET_PROFILE',
  SET_PAGE:       'SET_PAGE',
  SCAN_START:     'SCAN_START',
  SCAN_DONE:      'SCAN_DONE',
  TOAST:          'TOAST',
  TOAST_CLEAR:    'TOAST_CLEAR',
}

function addLog(state, type, payload) {
  const entry = `[${new Date().toISOString()}] ${type}: ${JSON.stringify(payload ?? '').slice(0, 80)}`
  const _log  = [...state._log, entry].slice(-100)
  if (typeof window !== 'undefined') window.__CG_LOG = _log
  return _log
}

function reducer(state, action) {
  const _log = addLog(state, action.type, action.payload)
  switch (action.type) {
    case A.AUTH_LOADED:     return { ...state, _log, authLoading: false }
    case A.AUTH_SIGNED_IN:  return { ...state, _log, user: action.payload, authLoading: false }
    case A.AUTH_SIGNED_OUT: return { ...INITIAL, _log, authLoading: false }
    case A.SET_PROFILE:     return { ...state, _log, profile: action.payload }
    case A.SET_PAGE:
        try {
          if (action.payload && !action.payload.startsWith('__')) {
            sessionStorage.setItem('cg_page', action.payload)
          }
        } catch {}
        return { ...state, _log, activePage: action.payload }
    case A.SCAN_START:      return { ...state, _log, scanRunning: true }
    case A.SCAN_DONE:       return { ...state, _log, scanRunning: false }
    case A.TOAST:           return { ...state, _log, toast: action.payload }
    case A.TOAST_CLEAR:     return { ...state, _log, toast: null }
    default:
      console.warn('[Store] Unknown action:', action.type)
      return { ...state, _log }
  }
}

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)

  const send = (type, payload) => {
    if (import.meta.env.DEV) console.debug(`[Store] ${type}`, payload ?? '')
    dispatch({ type, payload })
  }

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        send(A.AUTH_SIGNED_IN, session.user)
        loadProfile(session.user.id)
      } else {
        send(A.AUTH_LOADED)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.debug('[Auth]', event)

      if (event === 'PASSWORD_RECOVERY') {
        // Password reset link clicked — show the reset form, do NOT sign them in yet
        send(A.SET_PAGE, '__password_reset')
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Don't auto-navigate if we're in password reset flow
        if (window.location.hash?.includes('type=recovery')) return
        send(A.AUTH_SIGNED_IN, session.user)
        loadProfile(session.user.id)
      }

      if (event === 'USER_UPDATED' && session?.user) {
        // Password was successfully updated — now sign them in properly
        send(A.AUTH_SIGNED_IN, session.user)
        loadProfile(session.user.id)
      }

      if (event === 'SIGNED_OUT') {
        send(A.AUTH_SIGNED_OUT)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) send(A.SET_PROFILE, data)
  }

  return <Ctx.Provider value={{ state, send }}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('[CyberGuard] useApp must be inside <AppProvider>')
  return ctx
}
