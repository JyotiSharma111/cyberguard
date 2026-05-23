/**
 * Subdomain discovery routes
 * GET /api/subdomains/:domain  — crt.sh certificate transparency scan
 */
import { Router } from 'express'
import { scanSubdomains } from '../lib/subdomainScanner.js'

const router = Router()

router.get('/:domain', async (req, res, next) => {
  const domain = req.params.domain?.trim()
  if (!domain) return res.status(400).json({ ok: false, error: 'domain required' })
  try {
    const result = await scanSubdomains(domain)
    res.json({ ok: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
