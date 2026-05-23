/**
 * Billing page — plan comparison, upgrade, manage subscription.
 */
import React, { useState } from 'react'
import { useApp } from '../store/appStore'
import { PLANS } from '../lib/planLimits'
import { createCheckout, openBillingPortal } from '../lib/api'

const PLAN_COLORS = {
  free:     { fg:'#6b7789', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.08)' },
  pro:      { fg:'#4fa6ff', bg:'rgba(79,166,255,0.07)', border:'rgba(79,166,255,0.2)' },
  business: { fg:'#00df78', bg:'rgba(0,223,120,0.07)', border:'rgba(0,223,120,0.2)' },
}

export default function Billing() {
  const { state } = useApp()
  const [loading, setLoading] = useState(null)  // plan string being loaded

  const currentPlan = state.profile?.plan ?? 'free'
  const userId      = state.user?.id
  const email       = state.user?.email

  async function upgrade(plan) {
    if (!userId || !email || plan === currentPlan) return
    setLoading(plan)
    const result = await createCheckout(userId, email, plan)
    setLoading(null)
    if (result.ok && result.data?.url) {
      window.location.href = result.data.url
    } else {
      alert(result.error ?? 'Could not open checkout — check STRIPE_SECRET_KEY in .env.local')
    }
  }

  async function manageSubscription() {
    if (!userId) return
    setLoading('portal')
    const result = await openBillingPortal(userId)
    setLoading(null)
    if (result.ok && result.data?.url) {
      window.location.href = result.data.url
    } else {
      alert(result.error ?? 'Could not open billing portal')
    }
  }

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:14, padding:16 }}>

      {/* Current plan banner */}
      <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#dde2ed', marginBottom:3 }}>
            Current plan: <span style={{ color:PLAN_COLORS[currentPlan]?.fg }}>{PLANS[currentPlan]?.name ?? currentPlan}</span>
          </div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>
            {currentPlan === 'free'
              ? 'Free forever — upgrade for more domains, reports and alerts'
              : `$${PLANS[currentPlan]?.price}/month — 14-day free trial included`}
          </div>
        </div>
        {currentPlan !== 'free' && (
          <button onClick={manageSubscription} disabled={loading === 'portal'}
            style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'7px 14px', fontSize:11, color:'#6b7789', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>
            {loading === 'portal' ? 'Opening…' : 'Manage / Cancel'}
          </button>
        )}
      </div>

      {/* Plan cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrent  = key === currentPlan
          const isUpgrade  = ['free','pro'].indexOf(key) > ['free','pro'].indexOf(currentPlan)
          const colors     = PLAN_COLORS[key]

          return (
            <div key={key} style={{
              background: isCurrent ? colors.bg : '#0f1420',
              border: `${isCurrent ? '1.5px' : '0.5px'} solid ${isCurrent ? colors.border : 'rgba(255,255,255,0.07)'}`,
              borderRadius:12, padding:'20px 18px', display:'flex', flexDirection:'column', gap:12,
              position:'relative',
            }}>
              {isCurrent && (
                <div style={{ position:'absolute', top:-1, right:14, fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:colors.fg, background:colors.bg, border:`0.5px solid ${colors.border}`, padding:'2px 10px', borderRadius:'0 0 7px 7px' }}>
                  Current plan
                </div>
              )}
              {key === 'pro' && !isCurrent && (
                <div style={{ position:'absolute', top:-1, right:14, fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#4fa6ff', background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.2)', padding:'2px 10px', borderRadius:'0 0 7px 7px' }}>
                  Most popular
                </div>
              )}

              <div>
                <div style={{ fontSize:15, fontWeight:700, color:colors.fg, marginBottom:3 }}>{plan.name}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:700, color:'#dde2ed' }}>
                    ${plan.price}
                  </span>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>/month</span>
                </div>
                {plan.price > 0 && (
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#00df78', marginTop:3 }}>14-day free trial</div>
                )}
              </div>

              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', gap:7, fontSize:11, color:'#6b7789', lineHeight:1.5 }}>
                    <span style={{ color:'#00df78', flexShrink:0 }}>✓</span>{f}
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} style={{ display:'flex', gap:7, fontSize:11, color:'#3a4455', lineHeight:1.5 }}>
                    <span style={{ flexShrink:0 }}>·</span>{f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => upgrade(key)}
                disabled={isCurrent || loading === key || !isUpgrade}
                style={{
                  width:'100%', padding:'10px', borderRadius:8, fontSize:12, fontWeight:600,
                  fontFamily:'Syne,sans-serif', cursor: isCurrent || !isUpgrade ? 'not-allowed' : 'pointer',
                  transition:'all .15s', opacity: loading === key ? 0.7 : 1,
                  background: isCurrent ? 'transparent' : colors.bg,
                  border:     isCurrent ? `0.5px solid ${colors.border}` : `0.5px solid ${colors.border}`,
                  color:      isCurrent ? colors.fg : colors.fg,
                }}>
                {loading === key ? 'Opening…'
                  : isCurrent   ? 'Current plan'
                  : isUpgrade   ? `Upgrade to ${plan.name}`
                  : 'Downgrade'}
              </button>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'14px 16px' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#dde2ed', marginBottom:10 }}>Common questions</div>
        {[
          ['Is there really a free tier?', 'Yes — 1 domain, DNS/email/SSL scanning, and email alerts are free forever. No credit card needed to start.'],
          ['What happens after the free trial?', 'At the end of your 14-day trial, your card is charged for the first month. Cancel anytime before then with no charge.'],
          ['Can I change plans?', 'Yes — upgrade or downgrade anytime. Downgrades take effect at the end of your billing period.'],
          ['How do I cancel?', 'Click "Manage / Cancel" above. You keep Pro features until the end of your paid period.'],
          ['Is my data deleted if I cancel?', 'No — your account and data stay on the free tier. Delete your account in Account Settings to remove all data.'],
        ].map(([q, a]) => (
          <div key={q} style={{ padding:'8px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:12, color:'#dde2ed', marginBottom:3 }}>{q}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.6 }}>{a}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
