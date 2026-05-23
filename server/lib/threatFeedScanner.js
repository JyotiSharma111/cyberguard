/**
 * Threat Feed — pulls from free public threat intelligence sources.
 * CISA Known Exploited Vulnerabilities + AlienVault OTX + NCSC alerts.
 * No API key needed for CISA. Free key for AlienVault OTX.
 */

const TIMEOUT_MS = 10000

async function safeFetch(url, headers = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'CyberGuard/1.0', ...headers } })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const ct = res.headers.get('content-type') ?? ''
    const data = ct.includes('json') ? await res.json() : await res.text()
    return { ok: true, data }
  } catch (err) {
    clearTimeout(timer)
    return { ok: false, error: err.name === 'AbortError' ? 'TIMEOUT' : err.message }
  }
}

/** Fetch CISA KEV — known exploited vulnerabilities catalog (free, no key) */
async function fetchCISAKEV() {
  const r = await safeFetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json')
  if (!r.ok || !r.data?.vulnerabilities) return []
  // Return last 10 added
  return r.data.vulnerabilities
    .slice(-10)
    .reverse()
    .map(v => ({
      id:          v.cveID,
      title:       v.vulnerabilityName,
      vendor:      v.vendorProject,
      product:     v.product,
      description: v.shortDescription,
      dueDate:     v.dueDate,
      severity:    'critical',
      source:      'CISA KEV',
      url:         `https://www.cisa.gov/known-exploited-vulnerabilities-catalog`,
      date:        v.dateAdded,
    }))
}

/** Fetch AlienVault OTX — free, requires free API key */
async function fetchOTX(apiKey) {
  if (!apiKey) return []
  const r = await safeFetch(
    'https://otx.alienvault.com/api/v1/pulses/subscribed?limit=10&sort=-modified',
    { 'X-OTX-API-KEY': apiKey }
  )
  if (!r.ok || !r.data?.results) return []
  return r.data.results.map(p => ({
    id:          p.id,
    title:       p.name,
    description: p.description?.slice(0, 200),
    tags:        p.tags?.slice(0, 5),
    severity:    p.adversary ? 'high' : 'medium',
    source:      'AlienVault OTX',
    url:         `https://otx.alienvault.com/pulse/${p.id}`,
    date:        p.modified,
  }))
}

/** Fetch NCSC advisory RSS (UK National Cyber Security Centre) */
async function fetchNCSC() {
  const r = await safeFetch('https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml')
  if (!r.ok || !r.data) return []
  // Parse simple RSS
  const items = []
  const matches = r.data.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const match of matches) {
    const xml   = match[1]
    const title = xml.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? xml.match(/<title>(.*?)<\/title>/)?.[1] ?? ''
    const link  = xml.match(/<link>(.*?)<\/link>/)?.[1] ?? ''
    const date  = xml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
    const desc  = xml.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? ''
    if (title) items.push({ id: link, title, description: desc.replace(/<[^>]+>/g,'').slice(0,200), severity:'medium', source:'NCSC', url:link, date })
  }
  return items.slice(0, 5)
}

export async function fetchThreatFeed(otxApiKey = null) {
  console.log('[threatFeed] Fetching threat intelligence...')

  const [cisa, otx, ncsc] = await Promise.allSettled([
    fetchCISAKEV(),
    fetchOTX(otxApiKey),
    fetchNCSC(),
  ])

  const all = [
    ...(cisa.status === 'fulfilled' ? cisa.value : []),
    ...(otx.status  === 'fulfilled' ? otx.value  : []),
    ...(ncsc.status === 'fulfilled' ? ncsc.value  : []),
  ]

  console.log(`[threatFeed] Got ${all.length} threat items`)
  return {
    items:       all,
    fetchedAt:   new Date().toISOString(),
    sources: {
      cisa:  cisa.status  === 'fulfilled' ? cisa.value.length  : 0,
      otx:   otx.status   === 'fulfilled' ? otx.value.length   : 0,
      ncsc:  ncsc.status  === 'fulfilled' ? ncsc.value.length  : 0,
    }
  }
}
