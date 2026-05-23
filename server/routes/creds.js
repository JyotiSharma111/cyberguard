/**
 * Credential check routes
 * GET  /api/creds/:domain              — domain breach check (free)
 * POST /api/creds/check                — body: { domain, emails[] }
 */
import { Router } from 'express'
import { scanCredentials } from '../lib/credScanner.js'

const router = Router()

router.get('/:domain', async (req, res, next) => {
  const domain = req.params.domain?.trim()
  if (!domain) return res.status(400).json({ ok: false, error: 'Domain required', code: 'INVALID_DOMAIN' })

  try {
    const result = await scanCredentials(domain, [], process.env.HIBP_API_KEY)
    res.json({ ok: true, data: result })
  } catch (err) {
    next(err)
  }
})

router.post('/check', async (req, res, next) => {
  const { domain, emails } = req.body ?? {}
  if (!domain) return res.status(400).json({ ok: false, error: 'domain required in body', code: 'MISSING_DOMAIN' })
  if (!Array.isArray(emails)) return res.status(400).json({ ok: false, error: 'emails must be an array', code: 'INVALID_EMAILS' })

  try {
    const result = await scanCredentials(domain, emails, process.env.HIBP_API_KEY)
    res.json({ ok: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
