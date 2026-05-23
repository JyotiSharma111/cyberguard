/**
 * Domain verification — checks if a DNS TXT record exists for the cyberguard token.
 * GET /api/verify/:domain?token=cg-abc123
 */
import { Router } from 'express'
import dns from 'node:dns/promises'

const router = Router()

router.get('/:domain', async (req, res, next) => {
  const { domain } = req.params
  const { token }  = req.query

  if (!domain || !token) {
    return res.status(400).json({ ok: false, error: 'domain and token required' })
  }

  const expectedValue = `cg-${token}`
  console.log(`[verify] Checking _cyberguard-verify.${domain} for value: ${expectedValue}`)

  try {
    // Check _cyberguard-verify.domain TXT records
    const records = await dns.resolveTxt(`_cyberguard-verify.${domain}`)
    const flat    = records.map(r => r.join('')).map(s => s.trim())

    console.log(`[verify] Found TXT records:`, flat)

    if (flat.includes(expectedValue)) {
      return res.json({ ok: true, verified: true, message: 'Domain verified successfully' })
    }

    return res.json({
      ok:       true,
      verified: false,
      message:  `TXT record not found. Looking for: ${expectedValue}. Found: ${flat.join(', ') || 'nothing'}`,
    })

  } catch (err) {
    // ENODATA / ENOTFOUND = record doesn't exist yet (not an error)
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND' || err.code === 'ESERVFAIL') {
      return res.json({
        ok:       true,
        verified: false,
        message:  `No TXT records found at _cyberguard-verify.${domain} yet. DNS can take up to 48h to propagate.`,
      })
    }
    next(err)
  }
})

export default router
