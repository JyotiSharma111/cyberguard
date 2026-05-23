import { Router } from 'express'
import { scanHeaders } from '../lib/headersScanner.js'
const router = Router()
router.get('/:domain', async (req, res, next) => {
  try { res.json({ ok:true, data: await scanHeaders(req.params.domain?.trim()) }) }
  catch (err) { next(err) }
})
export default router
