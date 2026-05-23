import { Router } from 'express'
import { generateIRP, generateAUP } from '../lib/documentGenerator.js'
const router = Router()
router.post('/irp', (req, res) => {
  const html = generateIRP(req.body)
  res.json({ ok: true, html })
})
router.post('/aup', (req, res) => {
  const html = generateAUP(req.body)
  res.json({ ok: true, html })
})
export default router
