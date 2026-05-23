/**
 * SSL/TLS Scanner — connects to domain on port 443 and inspects the certificate.
 * Uses Node built-in tls module. No external API needed.
 */
import tls from 'node:tls'

/**
 * Connect to host:port over TLS and return the peer certificate.
 * Resolves with { cert, protocol, cipher } or rejects with a typed error.
 */
function getTLSInfo(host, port = 443, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false },
      () => {
        try {
          const cert     = socket.getPeerCertificate(true)
          const protocol = socket.getProtocol()   // e.g. 'TLSv1.3'
          const cipher   = socket.getCipher()      // { name, version }
          socket.destroy()
          resolve({ cert, protocol, cipher })
        } catch (err) {
          socket.destroy()
          reject(Object.assign(err, { code: 'CERT_PARSE_ERROR' }))
        }
      }
    )

    socket.setTimeout(timeoutMs, () => {
      socket.destroy()
      reject(Object.assign(new Error(`TLS connect timed out after ${timeoutMs}ms`), { code: 'TIMEOUT' }))
    })

    socket.on('error', (err) => {
      socket.destroy()
      reject(err)
    })
  })
}

/**
 * Evaluate cipher suite strength.
 * Returns 'strong' | 'acceptable' | 'weak'
 */
function rateCipher(cipherName) {
  if (!cipherName) return 'unknown'
  const weak = ['RC4', 'DES', '3DES', 'NULL', 'EXPORT', 'MD5', 'anon']
  if (weak.some(w => cipherName.toUpperCase().includes(w))) return 'weak'
  if (cipherName.includes('ECDHE') || cipherName.includes('DHE')) return 'strong'
  return 'acceptable'
}

/**
 * Parse a cert's valid_to / valid_from into Date objects safely.
 */
function parseCertDates(cert) {
  const from  = cert?.valid_from ? new Date(cert.valid_from) : null
  const to    = cert?.valid_to   ? new Date(cert.valid_to)   : null
  const now   = new Date()
  const daysLeft = to ? Math.floor((to - now) / (1000 * 60 * 60 * 24)) : null
  return { from, to, daysLeft, expired: daysLeft !== null && daysLeft < 0 }
}

/**
 * Scan SSL/TLS for a domain. Returns structured result + issues[].
 */
export async function scanSSL(domain) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('scanSSL: domain must be a non-empty string')
  }

  const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
  console.log(`[sslScanner] Scanning ${cleanDomain}:443`)

  const issues = []
  let score = 100
  let tlsInfo = null
  let connectError = null

  try {
    tlsInfo = await getTLSInfo(cleanDomain)
  } catch (err) {
    connectError = { code: err.code ?? 'CONNECT_ERROR', message: err.message }
    console.warn(`[sslScanner] Could not connect to ${cleanDomain}:443 — ${err.code}: ${err.message}`)
    issues.push({
      id: 'no-tls', sev: 'critical', type: 'SSL',
      title: `Cannot connect to ${cleanDomain} on port 443`,
      detail: `${err.code ?? 'Error'}: ${err.message}`,
      fix: ['Ensure your server is listening on port 443', 'Check firewall rules allow inbound TCP 443', 'Verify your SSL certificate is installed correctly']
    })
    score = 0
    return { domain: cleanDomain, scannedAt: new Date().toISOString(), score, connectError, issues, cert: null, protocol: null, cipher: null }
  }

  const { cert, protocol, cipher } = tlsInfo
  const { from, to, daysLeft, expired } = parseCertDates(cert)
  const cipherRating = rateCipher(cipher?.name)

  // ── Protocol checks ───────────────────────────────────────
  if (protocol === 'TLSv1' || protocol === 'TLSv1.1') {
    issues.push({
      id: 'old-tls', sev: 'high', type: 'SSL',
      title: `${protocol} is outdated and insecure`,
      detail: 'TLS 1.0 and 1.1 have known vulnerabilities. Disable them on your server.',
      fix: ['In nginx: ssl_protocols TLSv1.2 TLSv1.3;', 'In Apache: SSLProtocol -all +TLSv1.2 +TLSv1.3', 'Restart your web server after changing']
    })
    score -= 20
  }

  // ── Certificate expiry ────────────────────────────────────
  if (expired) {
    issues.push({
      id: 'cert-expired', sev: 'critical', type: 'SSL',
      title: `Certificate EXPIRED ${Math.abs(daysLeft)} days ago`,
      detail: `Expired ${to?.toLocaleDateString()}. Browsers block all HTTPS traffic with a hard error.`,
      fix: ['Run: certbot renew', 'Or log in to your CA dashboard and renew manually', 'Install new cert and restart web server']
    })
    score -= 40
  } else if (daysLeft !== null && daysLeft < 7) {
    issues.push({
      id: 'cert-expiring-critical', sev: 'critical', type: 'SSL',
      title: `Certificate expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — renew immediately`,
      detail: `Expiry: ${to?.toLocaleDateString()}. Browsers will block traffic when it expires.`,
      fix: ['Run: certbot renew --dry-run (test first)', 'Then: certbot renew', 'Check auto-renewal: systemctl status certbot.timer', `Verify after renewal: openssl s_client -connect ${cleanDomain}:443 2>/dev/null | grep -A2 "Certificate chain"`]
    })
    score -= 25
  } else if (daysLeft !== null && daysLeft < 30) {
    issues.push({
      id: 'cert-expiring-soon', sev: 'high', type: 'SSL',
      title: `Certificate expires in ${daysLeft} days`,
      detail: `Expiry: ${to?.toLocaleDateString()}. Renew soon to avoid service disruption.`,
      fix: ['Run: certbot renew', 'Set up auto-renewal if not already: systemctl enable certbot.timer']
    })
    score -= 10
  }

  // ── Cipher strength ───────────────────────────────────────
  if (cipherRating === 'weak') {
    issues.push({
      id: 'weak-cipher', sev: 'high', type: 'SSL',
      title: `Weak cipher suite: ${cipher?.name}`,
      detail: 'This cipher is considered insecure and should be disabled.',
      fix: ['In nginx: ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;', 'Restart nginx after changing']
    })
    score -= 20
  }

  // ── Self-signed check ─────────────────────────────────────
  if (cert?.issuer?.CN === cert?.subject?.CN) {
    issues.push({
      id: 'self-signed', sev: 'high', type: 'SSL',
      title: 'Self-signed certificate detected',
      detail: 'Browsers will show a scary warning to all visitors.',
      fix: ['Get a free trusted certificate from Let\'s Encrypt: certbot --nginx -d ' + cleanDomain, 'Or use Cloudflare\'s free SSL']
    })
    score -= 20
  }

  score = Math.max(0, score)

  return {
    domain:     cleanDomain,
    scannedAt:  new Date().toISOString(),
    score,
    connectError: null,
    protocol,
    cipher:     { name: cipher?.name, version: cipher?.version, rating: cipherRating },
    cert: {
      subject:  cert?.subject,
      issuer:   cert?.issuer,
      validFrom: from?.toISOString(),
      validTo:   to?.toISOString(),
      daysLeft,
      expired,
      fingerprint: cert?.fingerprint256,
      subjectAltNames: cert?.subjectaltname ?? null,
    },
    issues,
  }
}
