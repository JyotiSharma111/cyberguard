import { Router } from 'express'
import { scanM365 }             from '../lib/m365Scanner.js'
import { scanAWS }              from '../lib/awsScanner.js'
import { scanGoogleWorkspace }  from '../lib/googleWorkspaceScanner.js'
import { scanGitHub }           from '../lib/githubScanner.js'
import { scanCloudflare }       from '../lib/cloudflareScanner.js'

const router = Router()

const SCANNERS = {
  m365:    (body) => scanM365({ tenantId: body.tenantId, clientId: body.clientId, clientSecret: body.clientSecret }),
  aws:     (body) => scanAWS({ accessKeyId: body.accessKeyId, secretAccessKey: body.secretAccessKey, region: body.region }),
  google:  (body) => scanGoogleWorkspace({ serviceAccountKeyJson: body.serviceAccountKeyJson, adminEmail: body.adminEmail }),
  github:  (body) => scanGitHub({ token: body.token, org: body.org }),
  cloudflare: (body) => scanCloudflare({ apiToken: body.apiToken, zoneId: body.zoneId, domain: body.domain }),
}

Object.entries(SCANNERS).forEach(([type, scanner]) => {
  router.post(`/${type}/scan`, async (req, res, next) => {
    try {
      const result = await scanner(req.body)
      res.json({ ok: true, data: result })
    } catch (err) { next(err) }
  })
})

export default router
