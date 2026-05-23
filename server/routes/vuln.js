/**
 * Vulnerability routes
 * GET /api/vuln/:domain  — Shodan port/CVE scan
 */
import { Router } from 'express'
import { scanShodan } from '../lib/shodanScanner.js'

const router = Router()

router.get('/:domain', async (req, res, next) => {
  const domain = req.params.domain?.trim()
  if (!domain) return res.status(400).json({ ok: false, error: 'domain required' })
  try {
    const result = await scanShodan(domain)
    res.json({ ok: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
