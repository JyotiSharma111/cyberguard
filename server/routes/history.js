/**
 * Score history — fetches scan_results from Supabase for charting.
 * GET /api/history/:domainId
 *
 * Uses Supabase REST API directly from the server side.
 */
import { Router } from 'express'

const router = Router()

router.get('/:domainId', async (req, res, next) => {
  const { domainId } = req.params
  if (!domainId) return res.status(400).json({ ok: false, error: 'domainId required' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ ok: false, error: 'Supabase not configured on server' })
  }

  try {
    // Fetch last 90 days of scans for this domain
    const url = `${SUPABASE_URL}/rest/v1/scan_results?domain_id=eq.${domainId}&order=scanned_at.desc&limit=90&select=score,scanned_at`
    const resp = await fetch(url, {
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    })

    if (!resp.ok) throw new Error(`Supabase returned ${resp.status}`)

    const rows = await resp.json()
    res.json({ ok: true, data: rows ?? [] })
  } catch (err) {
    next(err)
  }
})

export default router
