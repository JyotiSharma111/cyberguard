/**
 * Uptime Monitor
 * Pings domain every 5 minutes via cron.
 * Stores results in Supabase. Sends alert if down.
 * No external service needed — just HTTP HEAD requests.
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const TIMEOUT_MS = 10000

function getClients() {
  return {
    supabase: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY),
    resend:   process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null,
  }
}

export async function checkUptime(domain) {
  const url        = `https://${domain.replace(/^https?:\/\//,'').replace(/\/.*$/,'')}`
  const startedAt  = Date.now()

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'HEAD', signal: controller.signal,
      headers: { 'User-Agent': 'CyberGuard-Uptime/1.0' },
      redirect: 'follow',
    })
    clearTimeout(timer)
    const latencyMs = Date.now() - startedAt
    return {
      domain, up: res.status < 500, status: res.status,
      latencyMs, checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    clearTimeout(timer)
    return {
      domain, up: false, status: 0,
      latencyMs: Date.now() - startedAt,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
      checkedAt: new Date().toISOString(),
    }
  }
}

export async function runUptimeChecks() {
  const { supabase, resend } = getClients()

  const { data: domains } = await supabase
    .from('domains')
    .select('id, name, user_id')
    .eq('status', 'verified')

  if (!domains?.length) return { checked: 0 }

  let checked = 0, alerts = 0

  for (const domain of domains) {
    const result = await checkUptime(domain.name)
    checked++

    // Save to uptime_checks table
    await supabase.from('uptime_checks').insert({
      domain_id:  domain.id,
      up:         result.up,
      status:     result.status,
      latency_ms: result.latencyMs,
      error:      result.error ?? null,
      checked_at: result.checkedAt,
    })

    // Check if this is a new outage (previous check was up, this one is down)
    if (!result.up) {
      const { data: prevChecks } = await supabase
        .from('uptime_checks')
        .select('up')
        .eq('domain_id', domain.id)
        .order('checked_at', { ascending: false })
        .limit(3)

      const wasUpBefore = prevChecks?.[1]?.up === true || prevChecks?.[2]?.up === true

      if (wasUpBefore && resend) {
        // New outage — send alert
        const { data: profile } = await supabase
          .from('profiles').select('email').eq('id', domain.user_id).single()

        if (profile?.email) {
          await resend.emails.send({
            from:    `CyberGuard <${process.env.RESEND_FROM ?? 'onboarding@resend.dev'}>`,
            to:      [profile.email],
            subject: `🔴 Down alert: ${domain.name} is not responding`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:16px">
                  <div style="font-size:16px;font-weight:700;color:#991b1b;margin-bottom:6px">🔴 ${domain.name} appears to be down</div>
                  <div style="font-size:13px;color:#7f1d1d">Detected at ${new Date(result.checkedAt).toLocaleTimeString()} · Status: ${result.status || 'No response'} · ${result.error ?? ''}</div>
                </div>
                <p style="color:#374151;font-size:13px">CyberGuard detected that <strong>${domain.name}</strong> is not responding. We'll send another alert when it comes back online.</p>
                <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin-top:12px">Check dashboard →</a>
              </div>`,
          })
          alerts++
        }
      }
    }

    // Check if site just recovered
    if (result.up) {
      const { data: prevChecks } = await supabase
        .from('uptime_checks').select('up')
        .eq('domain_id', domain.id)
        .order('checked_at', { ascending: false }).limit(3)

      const wasDown = prevChecks?.[1]?.up === false && prevChecks?.[2]?.up === false

      if (wasDown && resend) {
        const { data: profile } = await supabase
          .from('profiles').select('email').eq('id', domain.user_id).single()

        if (profile?.email) {
          await resend.emails.send({
            from: `CyberGuard <${process.env.RESEND_FROM ?? 'onboarding@resend.dev'}>`,
            to:   [profile.email],
            subject: `✅ Recovered: ${domain.name} is back online`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px"><div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:16px 20px"><div style="font-size:16px;font-weight:700;color:#065f46">✅ ${domain.name} is back online</div><div style="font-size:13px;color:#065f46;margin-top:4px">Response time: ${result.latencyMs}ms</div></div></div>`,
          })
          alerts++
        }
      }
    }

    await new Promise(r => setTimeout(r, 300))
  }

  return { checked, alerts }
}
