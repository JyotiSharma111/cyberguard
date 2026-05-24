/**
 * UpgradePrompt — shown when a user hits a plan limit.
 * Used as an inline banner or modal overlay.
 */
import React from 'react'
import { useApp, A } from '../../store/appStore'

export default function UpgradePrompt({ 
  feature, 
  message, 
  upgrade = 'pro', 
  inline = false,
  onDismiss 
}) {
  const { send } = useApp()

  const plans = {
    pro:      { name:'Pro', price:'$49/mo', color:'#4fa6ff' },
    business: { name:'Business', price:'$99/mo', color:'#00df78' },
  }
  const plan = plans[upgrade] ?? plans.pro

  const content = (
    <div style={{
      background: inline ? 'rgba(79,166,255,0.06)' : '#0f1420',
      border: `0.5px solid rgba(79,166,255,0.25)`,
      borderRadius: 10,
      padding: inline ? '12px 16px' : '24px',
      display: 'flex',
      alignItems: inline ? 'center' : 'flex-start',
      gap: 12,
      flexDirection: inline ? 'row' : 'column',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: inline ? 12 : 15, 
          fontWeight: 600, 
          color: '#dde2ed',
          marginBottom: 4,
          display: 'flex', 
          alignItems: 'center', 
          gap: 6 
        }}>
          <i className="ti ti-lock" style={{ fontSize: 13, color: plan.color }} aria-hidden="true"/>
          {feature || 'Upgrade required'}
        </div>
        <div style={{ 
          fontSize: inline ? 11 : 13, 
          color: '#6b7789', 
          lineHeight: 1.6 
        }}>
          {message || `This feature requires ${plan.name}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => send(A.SET_PAGE, 'billing')}
          style={{
            padding: inline ? '6px 14px' : '9px 20px',
            background: `${plan.color}14`,
            border: `0.5px solid ${plan.color}44`,
            borderRadius: 7,
            fontSize: inline ? 11 : 13,
            fontWeight: 600,
            color: plan.color,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
          Upgrade to {plan.name} →
        </button>
        {onDismiss && (
          <button onClick={onDismiss}
            style={{ background: 'none', border: 'none', color: '#3a4455', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
            aria-label="Dismiss">×</button>
        )}
      </div>
    </div>
  )

  if (inline) return content

  // Modal overlay
  return (
    <div style={{ 
      position: 'fixed', inset: 0, 
      background: 'rgba(0,0,0,0.6)', 
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onDismiss}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '100%' }}>
        {content}
      </div>
    </div>
  )
}
