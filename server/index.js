import './env.js'

import express       from 'express'
import cors          from 'cors'
import { requestLogger }          from './middleware/logger.js'
import { errorHandler, notFound } from './middleware/errors.js'
import dnsRoutes        from './routes/dns.js'
import sslRoutes        from './routes/ssl.js'
import credRoutes       from './routes/creds.js'
import scanRoutes       from './routes/scan.js'
import verifyRoutes     from './routes/verify.js'
import alertRoutes      from './routes/alerts.js'
import vulnRoutes       from './routes/vuln.js'
import subdomainRoutes  from './routes/subdomains.js'
import historyRoutes    from './routes/history.js'
import vendorRoutes     from './routes/vendor.js'
import cronRoutes       from './routes/cron.js'
import billingRoutes    from './routes/billing.js'
import headersRoutes    from './routes/headers.js'
import dkimRoutes       from './routes/dkim.js'
import whoisRoutes      from './routes/whois.js'
import threatRoutes     from './routes/threats.js'
import pentestRoutes       from './routes/pentest.js'
import integrationRoutes   from './routes/integrations.js'
import threatFeedRoutes    from './routes/threatfeed.js'
import documentRoutes      from './routes/documents.js'
import phishingRoutes      from './routes/phishing.js'
import uptimeRoutes        from './routes/uptime.js'

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl)
    if (!origin) return cb(null, true)
    const allowed = [
      'http://localhost:5173',
      'http://localhost:4173',
      process.env.FRONTEND_URL,
    ].filter(Boolean)
    // Also allow any *.pages.dev, *.vercel.app, *.netlify.app
    const isAllowed = allowed.includes(origin)
      || /\.pages\.dev$/.test(origin)
      || /\.vercel\.app$/.test(origin)
      || /\.netlify\.app$/.test(origin)
    cb(null, isAllowed)
  },
  credentials: true,
}))
// Stripe webhook needs raw body — must come before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(requestLogger)

app.get('/api/health', (_req, res) => res.json({
  ok: true, service: 'CyberGuard API', version: '2.0.0', time: new Date().toISOString(),
  features: { dns:'✓', ssl:'✓', creds:'✓', shodan:'✓', subdomains:'✓', alerts: process.env.RESEND_API_KEY ? '✓' : '✗ key missing' }
}))

app.use('/api/dns',        dnsRoutes)
app.use('/api/ssl',        sslRoutes)
app.use('/api/creds',      credRoutes)
app.use('/api/scan',       scanRoutes)
app.use('/api/verify',     verifyRoutes)
app.use('/api/alerts',     alertRoutes)
app.use('/api/vuln',       vulnRoutes)
app.use('/api/subdomains', subdomainRoutes)
app.use('/api/history',    historyRoutes)
app.use('/api/vendor',     vendorRoutes)
app.use('/api/cron',       cronRoutes)
app.use('/api/billing',    billingRoutes)
app.use('/api/headers',    headersRoutes)
app.use('/api/dkim',       dkimRoutes)
app.use('/api/whois',      whoisRoutes)
app.use('/api/threats',    threatRoutes)
app.use('/api/pentest',    pentestRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/threatfeed',   threatFeedRoutes)
app.use('/api/documents',    documentRoutes)
app.use('/api/phishing',     phishingRoutes)
app.use('/api/uptime',       uptimeRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ CyberGuard API v2.0 → http://localhost:${PORT}`)
  console.log(`   Scan:       GET /api/scan/:domain`)
  console.log(`   Vuln:       GET /api/vuln/:domain`)
  console.log(`   Subdomains: GET /api/subdomains/:domain`)
  console.log(`   Alerts:     ${process.env.RESEND_API_KEY ? '✓ Resend configured' : '✗ RESEND_API_KEY missing'}\n`)
})
