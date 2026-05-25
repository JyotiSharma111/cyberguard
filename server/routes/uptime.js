import { Router } from 'express'
import { checkUptime, runUptimeChecks } from '../lib/uptimeChecker.js'
import { createClient } from '@supabase/supabase-js'

const router = Router()

// Single domain check — runs check AND saves to DB
router.get('/check/:domain', async (req, res, next) => {
  try {
    const domain = req.params.domain
    const result = await checkUptime(domain)

    // Save to DB if we can find the domain_id
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

    // Look up domain_id from domain name
    const { data: domainRow } = await supabase
      .from('domains')
      .select('id')
      .eq('name', domain)
      .maybeSingle()

    if (domainRow?.id) {
      await supabase.from('uptime_checks').insert({
        domain_id:  domainRow.id,
        up:         result.up,
        status:     result.status,
        latency_ms: result.latencyMs,
        error:      result.error ?? null,
        checked_at: result.checkedAt,
      })
    }

    res.json({ ok: true, data: result, saved: !!domainRow?.id })
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

// Cron — run all uptime checks (accepts both GET and POST)
async function handleRun(req, res, next) {
  try {
    const secret = req.query.secret ?? req.body?.secret
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized — add ?secret=YOUR_CRON_SECRET' })
    }
    const result = await runUptimeChecks()
    res.json({ ok: true, ...result })
  } catch (err) { next(err) }
}

router.get('/run',  handleRun)
router.post('/run', handleRun)

export default router
