/**
 * Billing routes — Stripe Checkout + Webhook
 *
 * POST /api/billing/create-checkout  — create Stripe Checkout session
 * POST /api/billing/portal           — open Stripe Customer Portal (manage/cancel)
 * POST /api/billing/webhook          — Stripe webhook (updates plan in Supabase)
 *
 * Setup steps:
 * 1. Create products in Stripe Dashboard:
 *    - Pro $49/mo   → copy price ID → STRIPE_PRO_PRICE_ID
 *    - Business $99/mo → copy price ID → STRIPE_BUSINESS_PRICE_ID
 * 2. Add to .env.local:
 *    STRIPE_SECRET_KEY=sk_live_...
 *    STRIPE_WEBHOOK_SECRET=whsec_...
 *    STRIPE_PRO_PRICE_ID=price_...
 *    STRIPE_BUSINESS_PRICE_ID=price_...
 */
import { Router } from 'express'
import Stripe from 'stripe'

const router = Router()

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

const SUPABASE_URL = () => process.env.SUPABASE_URL
const SUPABASE_KEY = () => process.env.SUPABASE_ANON_KEY

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL()}${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY(),
      'Authorization': `Bearer ${SUPABASE_KEY()}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    }
  })
  return res.json()
}

async function updateUserPlan(userId, plan, subscriptionId = null) {
  await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      plan,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
  })
}

// ── POST /api/billing/create-checkout ────────────────────────
router.post('/create-checkout', async (req, res, next) => {
  try {
    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ ok: false, error: 'Stripe not configured — add STRIPE_SECRET_KEY to .env.local' })

    const { userId, userEmail, plan } = req.body
    if (!userId || !userEmail || !plan) return res.status(400).json({ ok: false, error: 'userId, userEmail, plan required' })

    const PRICES = {
      pro:      process.env.STRIPE_PRO_PRICE_ID,
      business: process.env.STRIPE_BUSINESS_PRICE_ID,
    }
    const priceId = PRICES[plan]
    if (!priceId) return res.status(400).json({ ok: false, error: `No price configured for plan: ${plan}. Add STRIPE_${plan.toUpperCase()}_PRICE_ID to .env.local` })

    // Get or create Stripe customer
    const [profile] = await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`)
    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({ email: userEmail, metadata: { supabase_user_id: userId } })
      customerId = customer.id
      await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stripe_customer_id: customerId })
      })
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${frontendUrl}/?billing=cancelled`,
      metadata:   { supabase_user_id: userId, plan },
      subscription_data: {
        trial_period_days: 14,  // 14-day free trial
        metadata: { supabase_user_id: userId, plan },
      },
      allow_promotion_codes: true,
    })

    res.json({ ok: true, url: session.url })
  } catch (err) { next(err) }
})

// ── POST /api/billing/portal ──────────────────────────────────
router.post('/portal', async (req, res, next) => {
  try {
    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ ok: false, error: 'Stripe not configured' })

    const { userId } = req.body
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' })

    const [profile] = await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`)
    if (!profile?.stripe_customer_id) return res.status(400).json({ ok: false, error: 'No Stripe customer found — upgrade first' })

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    const session = await stripe.billingPortal.sessions.create({
      customer:    profile.stripe_customer_id,
      return_url:  frontendUrl,
    })

    res.json({ ok: true, url: session.url })
  } catch (err) { next(err) }
})

// ── POST /api/billing/webhook ─────────────────────────────────
// Raw body needed for Stripe signature verification
router.post('/webhook', async (req, res, next) => {
  const stripe = getStripe()
  if (!stripe) return res.status(503).send('Stripe not configured')

  const sig     = req.headers['stripe-signature']
  const secret  = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return res.status(503).send('STRIPE_WEBHOOK_SECRET not set')

  let event
  try {
    event = stripe.webhooks.constructEvent(req.rawBody ?? req.body, sig, secret)
  } catch (err) {
    console.error('[billing/webhook] Signature verification failed:', err.message)
    return res.status(400).send(`Webhook error: ${err.message}`)
  }

  console.log(`[billing/webhook] Event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId  = session.metadata?.supabase_user_id
        const plan    = session.metadata?.plan
        if (userId && plan) {
          await updateUserPlan(userId, plan, session.subscription)
          await supabaseFetch('/rest/v1/billing_events', {
            method: 'POST',
            body: JSON.stringify({ user_id:userId, event_type:'subscribed', plan_to:plan, stripe_event_id:event.id })
          })
          console.log(`[billing/webhook] ✓ ${userId} upgraded to ${plan}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break
        const plan = sub.status === 'active' ? (sub.metadata?.plan ?? 'pro') : 'free'
        await updateUserPlan(userId, plan, sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub    = event.data.object
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break
        await updateUserPlan(userId, 'free', null)
        await supabaseFetch('/rest/v1/billing_events', {
          method: 'POST',
          body: JSON.stringify({ user_id:userId, event_type:'cancelled', plan_to:'free', stripe_event_id:event.id })
        })
        console.log(`[billing/webhook] ✓ ${userId} downgraded to free`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer
        const [profile] = await supabaseFetch(`/rest/v1/profiles?stripe_customer_id=eq.${customerId}&select=id`)
        if (profile?.id) {
          await supabaseFetch('/rest/v1/billing_events', {
            method: 'POST',
            body: JSON.stringify({ user_id:profile.id, event_type:'payment_failed', stripe_event_id:event.id })
          })
        }
        break
      }
    }
  } catch (err) {
    console.error('[billing/webhook] Handler error:', err.message)
  }

  res.json({ received: true })
})

export default router
