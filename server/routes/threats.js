import { Router } from 'express'
import { scanVirusTotal } from '../lib/virusTotalScanner.js'
const router = Router()
router.get('/:domain', async (req, res, next) => {
  try {
    res.json({ ok:true, data: await scanVirusTotal(req.params.domain?.trim(), process.env.VIRUSTOTAL_API_KEY) })
  } catch (err) { next(err) }
})
export default router
