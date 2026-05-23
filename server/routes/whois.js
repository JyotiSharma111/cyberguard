import { Router } from 'express'
import { scanWHOIS } from '../lib/whoisScanner.js'
const router = Router()
router.get('/:domain', async (req, res, next) => {
  try { res.json({ ok:true, data: await scanWHOIS(req.params.domain?.trim()) }) }
  catch (err) { next(err) }
})
export default router
