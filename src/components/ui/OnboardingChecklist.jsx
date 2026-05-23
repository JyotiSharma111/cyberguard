/**
 * OnboardingChecklist — "Setup X% complete" progress bar.
 * Shown on Dashboard until all steps are done.
 * Checks real data from Supabase to determine completion.
 */
import React, { useState, useEffect } from 'react'
import { useApp, A } from '../../store/appStore'
import { supabase } from '../../lib/supabase'
import { useScanData } from '../../hooks/useScanData'

export default function OnboardingChecklist() {
  const { state, send } = useApp()
  const { isReal, scores, domainRow, dkimData } = useScanData()
  const [staffCount, setStaffCount]     = useState(0)
  const [vendorCount, setVendorCount]   = useState(0)
  const [alertSettings, setAlertSettings] = useState(null)
  const [dismissed, setDismissed]       = useState(false)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    if (!state.user || !domainRow) return
    loadData()
  }, [state.user?.id, domainRow?.id])

  async function loadData() {
    const [staffR, vendorR, alertR] = await Promise.all([
      supabase.from('staff_emails').select('id', { count:'exact', head:true }).eq('domain_id', domainRow.id),
      supabase.from('vendors').select('id', { count:'exact', head:true }).eq('user_id', state.user.id),
      supabase.from('alert_settings').select('*').eq('domain_id', domainRow.id).maybeSingle(),
    ])
    setStaffCount(staffR.count ?? 0)
    setVendorCount(vendorR.count ?? 0)
    setAlertSettings(alertR.data)
    setLoading(false)
  }

  const checks = [
    {
      id:    'domain',
      done:  !!domainRow,
      label: 'Domain verified',
      detail:'You\'ve verified ownership of your domain',
      action: null,
    },
    {
      id:    'scan',
      done:  isReal,
      label: 'First scan complete',
      detail:'Run a security scan to get your initial score',
      action: () => document.getElementById('run-scan-btn')?.click(),
      actionLabel: 'Run scan',
    },
    {
      id:    'dkim',
      done:  dkimData && !dkimData.missing,
      label: 'DKIM configured',
      detail:'Email signing prevents spoofing and improves deliverability',
      action: () => send(A.SET_PAGE, 'domain'),
      actionLabel: 'View email security',
    },
    {
      id:    'alerts',
      done:  !!alertSettings,
      label: 'Alert settings configured',
      detail:'Get notified when something changes',
      action: () => send(A.SET_PAGE, 'settings'),
      actionLabel: 'Configure alerts',
    },
    {
      id:    'staff',
      done:  staffCount > 0,
      label: 'Staff email list uploaded',
      detail:'Check if your team\'s accounts appear in breach data',
      action: () => send(A.SET_PAGE, 'creds'),
      actionLabel: 'Upload staff list',
    },
    {
      id:    'vendor',
      done:  vendorCount > 0,
      label: 'First vendor added',
      detail:'Grade your key suppliers\' security posture',
      action: () => send(A.SET_PAGE, 'vendor'),
      actionLabel: 'Add a vendor',
    },
  ]

  const doneCount = checks.filter(c => c.done).length
  const pct       = Math.round((doneCount / checks.length) * 100)
  const allDone   = doneCount === checks.length

  // Auto-dismiss when 100% or if user has seen it enough
  const dismissKey = `cg_checklist_dismissed_${state.user?.id}`
  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey) === 'true')
  }, [state.user?.id])

  function dismiss() {
    localStorage.setItem(dismissKey, 'true')
    setDismissed(true)
  }

  if (loading || dismissed || (allDone && doneCount === checks.length)) return null

  return (
    <div style={{ background:'#0f1420', border:`0.5px solid ${pct===100?'rgba(0,223,120,0.25)':'rgba(79,166,255,0.2)'}`, borderRadius:10, overflow:'hidden', marginBottom:4 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:600, color:'#dde2ed' }}>
            Setup {pct}% complete
          </div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455' }}>
            {doneCount}/{checks.length} steps done
          </div>
        </div>
        <button onClick={dismiss}
          style={{ background:'none', border:'none', color:'#3a4455', cursor:'pointer', fontSize:16, lineHeight:1, padding:'0 2px' }}
          title="Dismiss checklist" aria-label="Dismiss setup checklist">×</button>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:'rgba(255,255,255,0.05)' }}>
        <div style={{ height:'100%', width:`${pct}%`, background: pct===100?'#00df78':'#4fa6ff', transition:'width .5s' }}/>
      </div>

      {/* Steps */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
        {checks.map((check, i) => (
          <div key={check.id}
            style={{ padding:'10px 12px', borderRight: i%3!==2?'0.5px solid rgba(255,255,255,0.05)':'none', borderBottom: i<3?'0.5px solid rgba(255,255,255,0.05)':'none', display:'flex', flexDirection:'column', gap:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:18, height:18, borderRadius:5, flexShrink:0,
                background: check.done ? 'rgba(0,223,120,0.12)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${check.done ? 'rgba(0,223,120,0.3)' : 'rgba(255,255,255,0.1)'}`,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {check.done
                  ? <i className="ti ti-check" style={{ fontSize:10, color:'#00df78' }} aria-hidden="true"/>
                  : <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'block' }}/>
                }
              </div>
              <span style={{ fontSize:11, fontWeight:500, color: check.done ? '#6b7789' : '#dde2ed',
                textDecoration: check.done ? 'line-through' : 'none' }}>
                {check.label}
              </span>
            </div>
            {!check.done && (
              <div style={{ paddingLeft:25 }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginBottom:5, lineHeight:1.5 }}>
                  {check.detail}
                </div>
                {check.action && (
                  <button onClick={check.action}
                    style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#4fa6ff', background:'none', border:'none', cursor:'pointer', padding:0, textDecoration:'underline' }}>
                    {check.actionLabel} →
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
