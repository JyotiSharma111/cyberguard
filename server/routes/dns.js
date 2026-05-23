/**
 * DNS routes
 * GET /api/dns/:domain  — full DNS scan
 */
import { Router } from 'express'
import { scanDomain } from '../lib/dnsScanner.js'

const router = Router()

// Validate domain param — rejects obvious junk before hitting DNS
function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') return 'Domain is required'
  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (clean.length < 3)   return 'Domain too short'
  if (clean.length > 253) return 'Domain too long'
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-\.]*\.[a-zA-Z]{2,}$/.test(clean)) return `Invalid domain format: ${clean}`
  return null
}

router.get('/:domain', async (req, res, next) => {
  const { domain } = req.params
  const validationError = validateDomain(domain)

  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError, code: 'INVALID_DOMAIN' })
  }

  try {
    const result = await scanDomain(domain)
    res.json({ ok: true, data: result })
  } catch (err) {
    // Pass to centralised error handler
    next(err)
  }
})

export default router
