import { Router } from 'express'
import { checkUptime, runUptimeChecks } from '../lib/uptimeChecker.js'
import { createClient } from '@supabase/supabase-js'

const router = Router()

// Single domain check
router.get('/check/:domain', async (req, res, next) => {
  try {
    const result = await checkUptime(req.params.domain)
    res.json({ ok: true, data: result })
  } catch (err) { next(err) }
})

// Get uptime history for a domain
router.get('/history/:domainId', async (req, res, next) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    const { data } = await supabase
      .from('uptime_checks')
      .select('up, status, latency_ms, error, checked_at')
      .eq('domain_id', req.params.domainId)
      .order('checked_at', { ascending: false })
      .limit(288) // 24 hours at 5-min intervals

    // Calculate uptime %
    const total   = data?.length ?? 0
    const up      = data?.filter(c => c.up).length ?? 0
    const pct     = total > 0 ? ((up / total) * 100).toFixed(2) : null
    const latencies = data?.filter(c => c.up && c.latency_ms).map(c => c.latency_ms) ?? []
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : null
    const current = data?.[0]

    res.json({ ok: true, data: { checks: data ?? [], total, up, uptimePct: pct, avgLatency, current } })
  } catch (err) { next(err) }
})

// Cron — run all uptime checks
router.post('/run', async (req, res, next) => {
  try {
    const secret = req.query.secret ?? req.body?.secret
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }
    const result = await runUptimeChecks()
    res.json({ ok: true, ...result })
  } catch (err) { next(err) }
})

export default router
