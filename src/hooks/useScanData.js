/**
 * useScanData — single source of truth for all pages.
 *
 * Reads ONLY from:
 *  1. Supabase DB (latest scan_results row for the active domain)
 *  2. Returns empty/zero values when no scan exists
 *
 * NEVER falls back to mockData. If there's no real data, pages
 * show an empty state prompting the user to run a scan.
 */
import { useState, useEffect } from 'react'
import { useApp } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { scoreColor } from '../utils/helpers'
import { useActiveDomain } from './useActiveDomain'

export function useScanData() {
  const { state } = useApp()
  const { activeDomain, loading: domainLoading } = useActiveDomain()
  const [scanData, setScanData]   = useState(null)   // latest scan_results row
  const [domainRow, setDomainRow] = useState(null)   // domains row
  const [loading, setLoading]     = useState(true)

  const userId = state.user?.id

  useEffect(() => {
    if (!userId || domainLoading) return
    if (activeDomain) loadLatestScan()
    else setLoading(false)
  }, [userId, activeDomain?.id, domainLoading])

  async function loadLatestScan() {
    if (!activeDomain) { setLoading(false); return }
    setLoading(true)
    setDomainRow(activeDomain)
    try {
      const { data: scan, error: sErr } = await supabase
        .from('scan_results')
        .select('*')
        .eq('domain_id', activeDomain.id)
        .order('scanned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sErr) { console.error('[useScanData] scan fetch:', sErr.message); return }
      if (scan) setScanData(scan)
    } finally {
      setLoading(false)
    }
  }

  const domainName = domainRow?.name ?? '—'
  const isReal     = !!scanData
  const scannedAt  = scanData?.scanned_at ?? null

  // ── Scores — zeros if no scan ────────────────────────────
  const scores = {
    overall:     isReal ? (scanData.score        ?? 0) : 0,
    dns:         isReal ? (scanData.dns_score    ?? 0) : 0,
    ssl:         isReal ? (scanData.ssl_score    ?? 0) : 0,
    email:       isReal ? (scanData.email_score  ?? 0) : 0,
    credentials: isReal ? (scanData.cred_score   ?? 0) : 0,
    ports:       isReal ? (scanData.ports_score   ?? 0)   : 0,
    subdomains:  isReal ? (scanData.subdom_score  ?? 0)   : 0,
    headers:     isReal ? (scanData.headers_score ?? 0)   : 0,
    dkim:        isReal ? (scanData.dkim_score    ?? 0)   : 0,
    whois:       isReal ? (scanData.whois_score   ?? 100) : 0,
    threats:     isReal ? (scanData.threats_score  ?? 100) : 0,
    pentest:     isReal ? (scanData.pentest_score  ?? 100) : 0,
  }

  // ── Issues — empty array if no scan ──────────────────────
  // issues includes DNS, Email, SSL, Ports, CVE, Subdomains — all from one scan
  const allIssues = isReal ? (scanData.issues ?? []) : []

  const issueCount = {
    critical: allIssues.filter(i => i.sev === 'critical').length,
    high:     allIssues.filter(i => i.sev === 'high').length,
    total:    allIssues.length,
  }

  // ── Per-section issue arrays ──────────────────────────────
  const dnsIssues   = mapIssues(allIssues, 'DNS')
  const emailIssues = mapIssues(allIssues, 'Email')
  const sslIssues   = mapIssues(allIssues, 'SSL')
  const credIssues  = mapIssues(allIssues, 'Credentials')

  // ── Score dimensions ──────────────────────────────────────
  const scoreDimensions = [
    { key:'dns',    label:'DNS health',           score: scores.dns,         color: scoreColor(scores.dns) },
    { key:'email',  label:'Email authentication', score: scores.email,       color: scoreColor(scores.email) },
    { key:'ssl',    label:'SSL / TLS',            score: scores.ssl,         color: scoreColor(scores.ssl) },
    { key:'ports',  label:'Open ports & CVEs',    score: scores.ports || (isReal ? 100 : 0), color: scoreColor(scores.ports || (isReal ? 100 : 0)) },
    { key:'creds',  label:'Credential exposure',  score: scores.credentials, color: scoreColor(scores.credentials) },
    { key:'subdoms',  label:'Subdomain surface',  score: scores.subdomains || (isReal ? 100 : 0), color: scoreColor(scores.subdomains || (isReal ? 100 : 0)) },
    { key:'headers',  label:'HTTP security headers', score: scores.headers || (isReal ? 100 : 0), color: scoreColor(scores.headers || (isReal ? 100 : 0)) },
    { key:'dkim',     label:'DKIM email signing',    score: scores.dkim    || (isReal ? 100 : 0), color: scoreColor(scores.dkim    || (isReal ? 100 : 0)) },
    { key:'whois',    label:'Domain registration',   score: scores.whois   || (isReal ? 100 : 0), color: scoreColor(scores.whois   || (isReal ? 100 : 0)) },
    { key:'threats',  label:'Threat intelligence',   score: scores.threats || (isReal ? 100 : 0), color: scoreColor(scores.threats || (isReal ? 100 : 0)) },
    { key:'pentest',  label:'Exposure checks',       score: scores.pentest || (isReal ? 100 : 0), color: scoreColor(scores.pentest || (isReal ? 100 : 0)) },
  ]

  // ── DNS records from raw_dns ──────────────────────────────
  const dnsRecords = isReal ? buildDnsRecords(scanData.raw_dns, domainName) : []

  // ── Email auth from raw_dns ───────────────────────────────
  const emailAuth = isReal ? buildEmailAuth(scanData.raw_dns?.email, domainName) : []

  // ── SSL cert ──────────────────────────────────────────────
  const sslCert = isReal ? scanData.raw_ssl : null

  // ── Spoofing issues ───────────────────────────────────────
  const spoofIssues = isReal ? buildSpoofIssues(scanData, domainName) : []

  return {
    domainName,
    domainRow,
    isReal,
    loading,
    scannedAt,
    scores,
    issueCount,
    allIssues,
    dnsIssues,
    emailIssues,
    sslIssues,
    credIssues,
    spoofIssues,
    dnsRecords,
    emailAuth,
    sslCert,
    scoreDimensions,
    shodanData:    isReal ? scanData.raw_shodan    : null,
    subdomainData: isReal ? scanData.raw_subdoms   : null,
    headersData:   isReal ? scanData.raw_headers   : null,
    dkimData:      isReal ? scanData.raw_dkim      : null,
    whoisData:     isReal ? scanData.raw_whois     : null,
    vtData:        isReal ? scanData.raw_virustotal : null,
    pentestData:   isReal ? scanData.raw_pentest     : null,
    reload: loadLatestScan,
  }
}

// ── Helpers ───────────────────────────────────────────────────

function mapIssues(issues, type) {
  return issues
    .filter(i => i.type === type)
    .map(i => ({
      id:      i.id,
      sev:     i.sev,
      name:    i.title,
      why:     i.detail ?? '',
      fix:     Array.isArray(i.fix) ? i.fix : [],
      tag:     i.sev.charAt(0).toUpperCase() + i.sev.slice(1),
      tagType: i.sev === 'critical' ? 'bad' : i.sev === 'high' ? 'warn' : i.sev === 'medium' ? 'bl' : 'ok',
    }))
}

function buildDnsRecords(raw, domainName) {
  if (!raw?.records) return []
  const { a, aaaa, mx, ns, caa, ptr, txt } = raw.records
  const records = []

  ;(a?.data ?? []).forEach((ip, i) =>
    records.push({ id:`a-${i}`, type:'A', name:domainName, value:ip, status:'ok', sev:null,
      why:`A record resolves to ${ip}.`, fix:[] }))

  ;(mx?.data ?? []).forEach((m, i) =>
    records.push({ id:`mx-${i}`, type:'MX', name:domainName, value:`${m.exchange} (p=${m.priority})`, status:'ok', sev:null,
      why:'MX record configured. Mail delivery functional.', fix:[] }))

  ;(ns?.data ?? []).forEach((n, i) =>
    records.push({ id:`ns-${i}`, type:'NS', name:domainName, value:n, status:'ok', sev:null,
      why:'Nameserver record.', fix:[] }))

  if (!ptr?.data && ptr?.ip)
    records.push({ id:'ptr', type:'PTR', name:ptr.ip, value:'— missing —', status:'crit', sev:'Critical',
      why:'Missing PTR record hurts email deliverability.',
      fix:[`Contact your hosting provider and ask them to set PTR for ${ptr.ip} → mail.${domainName}`] })

  if (!caa?.data?.length)
    records.push({ id:'caa', type:'CAA', name:domainName, value:'— not set —', status:'high', sev:'High',
      why:`Without CAA any certificate authority can issue SSL certs for ${domainName}.`,
      fix:[`Add CAA record: 0 issue "letsencrypt.org"`, 'Add: 0 issuewild ";" to block wildcard certs'] })
  else
    (caa.data ?? []).forEach((c, i) =>
      records.push({ id:`caa-${i}`, type:'CAA', name:domainName, value:`${c.critical} ${c.issue}`, status:'ok', sev:null,
        why:'CAA record restricts which CAs can issue certificates.', fix:[] }))

  return records
}

function buildEmailAuth(email, domainName) {
  if (!email) return []
  const { spf, dmarc, bimi, mtaSts } = email
  return [
    { id:'e-spf',    name:'SPF',
      score:   spf?.policy === 'hardfail' ? 95 : spf?.policy === 'softfail' ? 75 : spf?.valid ? 50 : 0,
      status:  spf?.valid ? (spf.policy === 'hardfail' ? 'ok' : 'warn') : 'crit',
      detail:  spf?.raw ?? `Not configured — anyone can send email as @${domainName}`,
      why:     'SPF authorises which servers may send email from your domain.',
      fix:     spf?.issues?.length ? spf.issues.map(m => m) : [] },
    { id:'e-dmarc',  name:'DMARC',
      score:   dmarc?.policy === 'reject' ? 100 : dmarc?.policy === 'quarantine' ? 70 : dmarc?.valid ? 30 : 0,
      status:  dmarc?.policy === 'reject' ? 'ok' : dmarc?.policy === 'quarantine' ? 'warn' : 'crit',
      detail:  dmarc?.raw ?? `Not configured — @${domainName} can be spoofed`,
      why:     'DMARC tells receiving servers what to do when email fails authentication.',
      fix:     dmarc?.policy !== 'reject' ? [`Update _dmarc.${domainName} to p=reject once SPF and DKIM are stable`] : [] },
    { id:'e-bimi',   name:'BIMI',
      score:   bimi?.configured ? 80 : 0,
      status:  bimi?.configured ? 'ok' : 'bad',
      detail:  bimi?.raw ?? 'Not configured — your logo won\'t appear in Gmail/Yahoo',
      why:     'BIMI shows your brand logo in supporting email clients.',
      fix:     bimi?.configured ? [] : ['Fix DMARC to p=reject first', `Then publish: default._bimi.${domainName} TXT "v=BIMI1; l=https://${domainName}/logo.svg"`] },
    { id:'e-mtasts', name:'MTA-STS',
      score:   mtaSts?.configured ? 80 : 0,
      status:  mtaSts?.configured ? 'ok' : 'warn',
      detail:  mtaSts?.raw ?? 'Not configured — inbound email not enforcing TLS',
      why:     'MTA-STS forces all inbound mail to use encrypted TLS connections.',
      fix:     mtaSts?.configured ? [] : [`Create /.well-known/mta-sts.txt on ${domainName}`, `Add: _mta-sts.${domainName} TXT "v=STSv1; id=20250519"`] },
  ]
}

function buildSpoofIssues(scanData, domainName) {
  const issues = []
  const dmarc  = scanData?.raw_dns?.email?.dmarc

  if (!dmarc?.valid || dmarc?.policy === 'none' || !dmarc?.policy) {
    issues.push({ id:'spoof-dmarc', sev:'critical',
      name:`Direct domain spoofing possible — DMARC not enforced on ${domainName}`,
      why:`Anyone can send email pretending to be from @${domainName}. DMARC must be at p=reject.`,
      fix:['Fix DMARC — see Email Security tab for step-by-step instructions'],
      tag:'Critical', tagType:'bad' })
  }

  const ptr = scanData?.raw_dns?.records?.ptr
  if (!ptr?.data && ptr?.ip) {
    issues.push({ id:'spoof-ptr', sev:'high',
      name:`No PTR record on mail server IP ${ptr.ip}`,
      why:'Without reverse DNS, receiving mail servers may reject your outbound email.',
      fix:[`Contact your hosting provider to set PTR for ${ptr.ip} → mail.${domainName}`],
      tag:'High', tagType:'warn' })
  }

  if (issues.length === 0) {
    issues.push({ id:'spoof-ok', sev:'low',
      name:`Spoofing risk is low — DMARC is enforced on ${domainName}`,
      why:'DMARC p=reject means unauthorised senders are rejected by receiving servers.',
      fix:[], tag:'OK', tagType:'ok' })
  }

  return issues
}
