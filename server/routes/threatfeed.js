import { Router } from 'express'
import { fetchThreatFeed } from '../lib/threatFeedScanner.js'
const router = Router()
router.get('/', async (req, res, next) => {
  try {
    const data = await fetchThreatFeed(process.env.OTX_API_KEY)
    res.json({ ok: true, data })
  } catch (err) { next(err) }
})
export default router
