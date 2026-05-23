/**
 * Vendor scan route
 * GET /api/vendor/:domain
 */
import { Router } from 'express'
import { scanVendor } from '../lib/vendorScanner.js'

const router = Router()

router.get('/:domain', async (req, res, next) => {
  const domain = req.params.domain?.trim()
  if (!domain) return res.status(400).json({ ok: false, error: 'domain required' })
  try {
    const result = await scanVendor(domain)
    res.json({ ok: true, data: result })
  } catch (err) { next(err) }
})

export default router
