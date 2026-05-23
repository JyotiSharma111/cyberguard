/**
 * Email Security Scanner
 * Parses SPF, DKIM, DMARC, BIMI, MTA-STS records and scores them.
 * All analysis is done from DNS data — no SMTP connections needed.
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

const TIMEOUT = 5000;

async function safeResolveTxt(host) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve([]), TIMEOUT);
    dns.resolveTxt(host, (err, records) => {
      clearTimeout(timer);
      if (err) return resolve([]);
      resolve((records || []).map(r => Array.isArray(r) ? r.join('') : r));
    });
  });
}

/** Parse SPF record into structured data */
function parseSpf(record) {
  if (!record) return null;
  const parts = record.split(/\s+/);
  const mechanisms = parts.slice(1); // skip "v=spf1"
  const all = mechanisms.find(m => m.endsWith('all'));
  const includes = mechanisms.filter(m => m.startsWith('include:')).map(m => m.replace('include:', ''));
  const ips = mechanisms.filter(m => m.startsWith('ip4:') || m.startsWith('ip6:')).map(m => m.split(':')[1]);
  const dnsLookups = includes.length + (mechanisms.filter(m => m.startsWith('a') || m.startsWith('mx')).length);

  let policy = 'none';
  if (all === '-all') policy = 'hardfail';
  else if (all === '~all') policy = 'softfail';
  else if (all === '?all') policy = 'neutral';
  else if (all === '+all') policy = 'pass'; // dangerous

  let score = 0;
  const issues = [];
  if (all === '+all') { score -= 40; issues.push({ severity: 'critical', msg: '+all allows anyone to send as your domain' }); }
  else if (all === '~all') { score = 70; issues.push({ severity: 'medium', msg: 'Softfail (~all) — upgrade to -all for full protection' }); }
  else if (all === '-all') score = 100;
  else { score = 20; issues.push({ severity: 'high', msg: 'No "all" mechanism — SPF has no default action' }); }

  if (dnsLookups > 10) issues.push({ severity: 'high', msg: `${dnsLookups} DNS lookups exceed the 10-lookup SPF limit` });

  return { record, policy, includes, ips, dnsLookups, score: Math.max(0, score), issues };
}

/** Parse DMARC record */
function parseDmarc(record) {
  if (!record) return null;
  const tags = {};
  record.split(';').forEach(part => {
    const [k, v] = part.trim().split('=');
    if (k && v !== undefined) tags[k.trim()] = v.trim();
  });

  const policy = tags['p'] || 'none';
  const pct = parseInt(tags['pct'] || '100');
  const rua = tags['rua'] || null;
  const ruf = tags['ruf'] || null;
  const sp = tags['sp'] || policy; // subdomain policy
  const adkim = tags['adkim'] || 'r'; // r=relaxed, s=strict
  const aspf = tags['aspf'] || 'r';

  let score = 0;
  const issues = [];
  if (policy === 'none') { score = 20; issues.push({ severity: 'critical', msg: 'p=none provides NO protection — anyone can spoof your domain', fix: 'Escalate to p=quarantine then p=reject. Add rua= for reports first.' }); }
  else if (policy === 'quarantine') { score = 65; issues.push({ severity: 'medium', msg: 'p=quarantine — good start, escalate to p=reject', fix: 'Change to p=reject once you\'ve verified all legitimate senders pass DMARC' }); }
  else if (policy === 'reject') { score = pct === 100 ? 100 : 80; if (pct < 100) issues.push({ severity: 'low', msg: `pct=${pct} — not applied to all mail` }); }
  if (!rua) issues.push({ severity: 'medium', msg: 'No rua= reporting address — you won\'t receive DMARC reports', fix: 'Add rua=mailto:dmarc@yourdomain.com' });

  return { record, policy, pct, rua, ruf, sp, adkim, aspf, score, issues };
}

/** Check DKIM for a domain — tests common selectors */
async function checkDkim(domain) {
  const commonSelectors = ['google', 'mail', 'default', 'k1', 's1', 's2', 'selector1', 'selector2', 'smtp', 'sendgrid', 'em', 'mimecast'];
  const found = [];
  const checks = commonSelectors.map(async (sel) => {
    const host = `${sel}._domainkey.${domain}`;
    const records = await safeResolveTxt(host);
    const dkim = records.find(r => r.includes('v=DKIM1') || r.includes('p='));
    if (dkim) {
      // Extract key length from public key
      const pMatch = dkim.match(/p=([A-Za-z0-9+/=]+)/);
      const keyB64 = pMatch ? pMatch[1] : '';
      const keyBytes = keyB64.length > 0 ? Math.floor(keyB64.length * 0.75) : 0;
      // RSA key size approximation: 256 bytes = 2048-bit
      const bits = keyBytes > 200 ? 2048 : keyBytes > 100 ? 1024 : keyBytes > 0 ? 512 : 0;
      found.push({ selector: sel, record: dkim, bits, weak: bits > 0 && bits < 2048 });
    }
  });
  await Promise.allSettled(checks);

  const issues = [];
  found.forEach(k => {
    if (k.weak) issues.push({ severity: 'high', msg: `DKIM selector "${k.selector}" uses ${k.bits}-bit key — upgrade to 2048-bit`, fix: `Rotate DKIM key in your email provider to generate a new 2048-bit key pair` });
  });
  if (found.length === 0) issues.push({ severity: 'high', msg: 'No DKIM records found for common selectors' });

  const score = found.length === 0 ? 0 : found.some(k => !k.weak) ? 100 : 50;
  return { selectors: found, score, issues };
}

/** Check MTA-STS */
async function checkMtaSts(domain) {
  const records = await safeResolveTxt(`_mta-sts.${domain}`);
  const record = records.find(r => r.startsWith('v=STSv1')) || null;
  if (!record) return { configured: false, mode: null, score: 0, issues: [{ severity: 'medium', msg: 'MTA-STS not configured — inbound mail can be downgraded to plaintext', fix: 'Create /.well-known/mta-sts.txt and _mta-sts DNS TXT record' }] };

  // Optionally fetch the policy file
  let mode = 'none';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://mta-sts.${domain}/.well-known/mta-sts.txt`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      const modeMatch = text.match(/mode:\s*(\w+)/);
      if (modeMatch) mode = modeMatch[1];
    }
  } catch (_) { mode = 'unknown'; }

  const issues = [];
  let score = 60;
  if (mode === 'testing') { score = 60; issues.push({ severity: 'medium', msg: 'MTA-STS mode is "testing" — not enforcing', fix: 'Change mode: testing to mode: enforce in your mta-sts.txt policy file' }); }
  else if (mode === 'enforce') score = 100;
  else if (mode === 'none') { score = 20; issues.push({ severity: 'high', msg: 'MTA-STS mode is "none" — disabled' }); }

  return { configured: true, record, mode, score, issues };
}

/** Scoring weights */
const WEIGHTS = { spf: 0.25, dkim: 0.30, dmarc: 0.35, mtaSts: 0.10 };

export async function scanEmail(domain) {
  const start = Date.now();
  console.log(`[email] Scanning: ${domain}`);

  // Run all checks in parallel
  const [txtRecords, dmarcRecords, bimiRecords, dkimResult, mtaStsResult, mxRecords] = await Promise.allSettled([
    safeResolveTxt(domain),
    safeResolveTxt(`_dmarc.${domain}`),
    safeResolveTxt(`default._bimi.${domain}`),
    checkDkim(domain),
    checkMtaSts(domain),
    new Promise((res) => dns.resolveMx(domain, (err, recs) => res(err ? [] : recs || []))),
  ]);

  const txt = txtRecords.status === 'fulfilled' ? txtRecords.value : [];
  const dmarcTxt = dmarcRecords.status === 'fulfilled' ? dmarcRecords.value : [];
  const bimiTxt = bimiRecords.status === 'fulfilled' ? bimiRecords.value : [];
  const dkim = dkimResult.status === 'fulfilled' ? dkimResult.value : { selectors: [], score: 0, issues: [{ severity: 'high', msg: 'DKIM check failed' }] };
  const mtaSts = mtaStsResult.status === 'fulfilled' ? mtaStsResult.value : { configured: false, score: 0, issues: [] };
  const mx = mxRecords.status === 'fulfilled' ? mxRecords.value : [];

  // Parse records
  const spfRecord = txt.find(r => r.startsWith('v=spf1')) || null;
  const spf = parseSpf(spfRecord);

  const dmarcRecord = dmarcTxt.find(r => r.startsWith('v=DMARC1')) || null;
  const dmarc = parseDmarc(dmarcRecord);

  const bimiRecord = bimiTxt.find(r => r.startsWith('v=BIMI1')) || null;
  const bimi = bimiRecord
    ? { configured: true, record: bimiRecord, issues: [] }
    : { configured: false, issues: [{ severity: 'low', msg: 'BIMI not configured — missing brand logo in inbox', fix: 'Requires DMARC p=reject first, then publish BIMI TXT record' }] };

  // Weighted overall score
  const spfScore = spf?.score ?? 0;
  const dkimScore = dkim.score;
  const dmarcScore = dmarc?.score ?? 0;
  const mtaStsScore = mtaSts.score;

  const overallScore = Math.round(
    spfScore * WEIGHTS.spf +
    dkimScore * WEIGHTS.dkim +
    dmarcScore * WEIGHTS.dmarc +
    mtaStsScore * WEIGHTS.mtaSts
  );

  // Collect all issues
  const allIssues = [
    ...(spf?.issues || []).map(i => ({ ...i, category: 'SPF' })),
    ...(dkim.issues || []).map(i => ({ ...i, category: 'DKIM' })),
    ...(dmarc?.issues || []).map(i => ({ ...i, category: 'DMARC' })),
    ...(mtaSts.issues || []).map(i => ({ ...i, category: 'MTA-STS' })),
    ...(bimi.issues || []).map(i => ({ ...i, category: 'BIMI' })),
  ];

  const elapsed = Date.now() - start;
  console.log(`[email] Scan complete: ${domain} → score ${overallScore} (${elapsed}ms)`);

  return {
    domain,
    score: overallScore,
    scores: { spf: spfScore, dkim: dkimScore, dmarc: dmarcScore, mtaSts: mtaStsScore },
    records: { spf, dkim, dmarc, mtaSts, bimi, mx },
    issues: allIssues,
    scannedAt: new Date().toISOString(),
    elapsed,
  };
}
