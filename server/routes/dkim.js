import { Router } from 'express'
import { scanDKIM } from '../lib/dkimScanner.js'
const router = Router()
router.get('/:domain', async (req, res, next) => {
  try { res.json({ ok:true, data: await scanDKIM(req.params.domain?.trim()) }) }
  catch (err) { next(err) }
})
export default router
