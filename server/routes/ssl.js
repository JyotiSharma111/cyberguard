/**
 * SSL routes
 * GET /api/ssl/:domain
 */
import { Router } from 'express'
import { scanSSL } from '../lib/sslScanner.js'

const router = Router()

router.get('/:domain', async (req, res, next) => {
  const domain = req.params.domain?.trim()
  if (!domain) return res.status(400).json({ ok: false, error: 'Domain required', code: 'INVALID_DOMAIN' })

  try {
    const result = await scanSSL(domain)
    res.json({ ok: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
