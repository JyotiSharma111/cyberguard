/**
 * UpgradePrompt — shown inline when a user hits a plan limit.
 * Compact version for inside cards, full version for modals.
 */
import React, { useState } from 'react'
import { useApp } from '../../store/appStore'
import { PLANS, nextPlan } from '../../lib/planLimits'
import { createCheckout } from '../../lib/api'

export default function UpgradePrompt({ feature, compact = false }) {
  const { state } = useApp()
  const [loading, setLoading] = useState(false)

  const currentPlan = state.profile?.plan ?? 'free'
  const targetPlan  = nextPlan(currentPlan)
  if (!targetPlan) return null  // already on business

  const plan   = PLANS[targetPlan]
  const userId = state.user?.id
  const email  = state.user?.email

  async function handleUpgrade() {
    if (!userId || !email) return
    setLoading(true)
    const result = await createCheckout(userId, email, targetPlan)
    setLoading(false)
    if (result.ok && result.data?.url) {
      window.location.href = result.data.url
    } else {
      alert(result.error ?? 'Could not open checkout — make sure STRIPE_SECRET_KEY is set in .env.local')
    }
  }

  if (compact) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'rgba(79,166,255,0.05)', border:'0.5px solid rgba(79,166,255,0.15)', borderRadius:8, margin:'8px 14px' }}>
        <div>
          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#4fa6ff' }}>
            {feature} — available on {plan.name} (${plan.price}/mo)
          </span>
        </div>
        <button onClick={handleUpgrade} disabled={loading}
          style={{ background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.25)', borderRadius:6, padding:'5px 12px', fontSize:11, fontWeight:600, color:'#4fa6ff', cursor:'pointer', fontFamily:'Syne,sans-serif', flexShrink:0 }}>
          {loading ? 'Loading…' : `Upgrade to ${plan.name} →`}
        </button>
      </div>
    )
  }

  return (
    <div style={{ background:'#0f1420', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:12, padding:'24px 24px', maxWidth:420, margin:'20px auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'rgba(79,166,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-crown" style={{ fontSize:16, color:'#4fa6ff' }} aria-hidden="true"/>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#dde2ed' }}>{plan.name} plan</div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>${plan.price}/month · 14-day free trial</div>
        </div>
      </div>

      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', marginBottom:12 }}>
        {feature} requires the {plan.name} plan.
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:16 }}>
        {plan.features.slice(0,6).map(f => (
          <div key={f} style={{ display:'flex', gap:8, fontSize:11, color:'#6b7789' }}>
            <span style={{ color:'#00df78', flexShrink:0 }}>✓</span>{f}
          </div>
        ))}
      </div>

      <button onClick={handleUpgrade} disabled={loading}
        style={{ width:'100%', background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.3)', borderRadius:8, padding:'11px', fontSize:13, fontWeight:600, color:'#4fa6ff', cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
        {loading ? 'Opening checkout…' : `Start free trial — ${plan.name} $${plan.price}/mo →`}
      </button>

      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', textAlign:'center', marginTop:8 }}>
        14-day free trial · Cancel anytime · No credit card until trial ends
      </div>
    </div>
  )
}
