/**
 * Domain Monitor — reads entirely from useScanData hook (Supabase).
 * Zero mock data. Shows empty state with instructions when no scan exists.
 */
import React, { useState } from 'react'
import { useScanData } from '../hooks/useScanData'
import { scanSubdomains } from '../lib/api'
import { useApp, A } from '../store/appStore'
import { StatCard, Card, Grid, IssueRow, EmptyState } from '../components/ui'
import { supabase } from '../lib/supabase'
import { fullScan } from '../lib/api'

const TABS = ['DNS Records', 'Email Security', 'SSL / TLS', 'Spoofing Risk', 'Subdomains', 'HTTP Headers', 'WHOIS']

export default function Domain() {
  const { state, send } = useApp()
  const { domainName, domainRow, isReal, loading, scannedAt,
          dnsIssues, emailIssues, sslIssues, spoofIssues,
          dnsRecords, emailAuth, scores, subdomainData, headersData, whoisData, dkimData, reload } = useScanData()

  const [tab, setTab]         = useState(0)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

  const rescan = async () => {
    if (!domainRow || scanning) return
    setScanning(true)
    setScanError('')

    const result = await fullScan(domainRow.name)
    if (!result.ok) {
      setScanError(result.error ?? 'Scan failed — is the API server running?')
      setScanning(false)
      return
    }

    const sd    = result.data
    const score = Math.min(100, Math.max(0, sd.overallScore ?? 0))
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'

    await supabase.from('scan_results').insert({
      domain_id:   domainRow.id,
      score, grade,
      dns_score:   sd.scores?.dns          ?? 0,
      ssl_score:   sd.scores?.ssl          ?? 0,
      email_score: sd.scores?.dns ? Math.round((sd.scores.dns) * 0.7) : 0,
      cred_score:  sd.scores?.credentials  ?? 0,
      issues:      sd.issues               ?? [],
      raw_dns:     sd.dns                  ?? {},
      raw_ssl:     sd.ssl                  ?? {},
      raw_creds:   sd.credentials          ?? {},
    })
    await supabase.from('domains').update({ last_scanned: new Date().toISOString() }).eq('id', domainRow.id)

    reload()
    setScanning(false)
  }

  const noScanState = !isReal && !loading

  const tabContent = [
    // DNS tab
    <div key="dns">
      {dnsRecords.length === 0
        ? <EmptyState icon="ti-hierarchy" msg={noScanState ? `No scan data yet — click Rescan to scan ${domainName}` : 'No DNS records found'} />
        : dnsRecords.map(r => (
          <IssueRow key={r.id}
            sev={r.status === 'ok' ? 'low' : r.status === 'high' ? 'high' : 'critical'}
            name={`${r.type}  ·  ${r.name}  →  ${r.value}`}
            tag={r.sev ?? 'OK'}
            tagType={r.status === 'ok' ? 'ok' : r.status === 'high' ? 'warn' : 'bad'}
            why={r.why} fix={r.fix ?? []} />
        ))
      }
    </div>,

    // Email tab
    <div key="email">
      {emailAuth.length === 0
        ? <EmptyState icon="ti-mail" msg={noScanState ? `No scan data yet — click Rescan to scan ${domainName}` : 'No email auth data found'} />
        : emailAuth.map(e => (
          <IssueRow key={e.id}
            sev={e.status === 'ok' ? 'low' : e.status === 'warn' ? 'high' : 'critical'}
            name={`${e.name}  —  ${e.detail}`}
            tag={`${e.score}/100`}
            tagType={e.status === 'ok' ? 'ok' : e.status === 'warn' ? 'warn' : 'bad'}
            why={e.why} fix={e.fix ?? []} />
        ))
      }
      {/* DKIM results */}
      {dkimData && (
        <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding:'8px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', letterSpacing:'1px', textTransform:'uppercase' }}>
            DKIM — {dkimData.missing ? 'Not found' : `${dkimData.found?.length} selector${dkimData.found?.length!==1?'s':''} found`}
          </div>
          {dkimData.missing ? (
            <IssueRow sev="high" name="DKIM not configured — email authentication incomplete"
              tag="High" tagType="warn"
              why={`Checked ${dkimData.selectorsChecked} common selectors — none found. Without DKIM, emails may be rejected or marked as spam.`}
              fix={['Google Workspace: Admin Console → Gmail → Authenticate email → Generate record', 'Microsoft 365: Admin Center → Settings → Domains → DNS records → DKIM']} />
          ) : (
            dkimData.found?.map(f => (
              <div key={f.selector} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#00df78', flexShrink:0 }}/>
                <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#dde2ed', flex:1 }}>{f.selector}._domainkey.{domainName}</span>
                <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#00df78', background:'rgba(0,223,120,.07)', border:'0.5px solid rgba(0,223,120,.2)', padding:'2px 8px', borderRadius:100 }}>Found ✓</span>
              </div>
            ))
          )}
          {(dkimData.issues ?? []).filter(i => i.sev !== 'high' || !dkimData.missing).map(i => (
            <IssueRow key={i.id} sev={i.sev} name={i.title??i.name} tag={i.sev} tagType="warn" why={i.detail} fix={i.fix??[]} />
          ))}
        </div>
      )}
    </div>,

    // SSL tab
    <div key="ssl">
      {sslIssues.length === 0
        ? <EmptyState icon="ti-lock" msg={noScanState ? `No scan data yet — click Rescan to scan ${domainName}` : '✓ No SSL issues found'} />
        : sslIssues.map(i => <IssueRow key={i.id} sev={i.sev} name={i.name} tag={i.tag} tagType={i.tagType} why={i.why} fix={i.fix} />)
      }
    </div>,

    // Spoofing tab
    <div key="spoof">
      {spoofIssues.length === 0
        ? <EmptyState icon="ti-shield-check" msg={noScanState ? `No scan data yet — click Rescan to scan ${domainName}` : '✓ No spoofing risks detected'} />
        : spoofIssues.map(i => <IssueRow key={i.id} sev={i.sev} name={i.name} tag={i.tag} tagType={i.tagType} why={i.why} fix={i.fix} />)
      }
    </div>,
  ]

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="DNS Score"    value={isReal ? `${scores.dns}/100` : '—'}  note={isReal ? 'Real scan' : 'No scan yet'} accent={isReal ? (scores.dns>=80?'gr':'am') : 'bl'} />
        <StatCard label="Email Score"  value={isReal ? `${scores.email}/100` : '—'} note={isReal ? 'SPF/DKIM/DMARC' : 'No scan yet'} accent={isReal ? (scores.email>=70?'gr':'re') : 'bl'} />
        <StatCard label="SSL Score"    value={isReal ? `${scores.ssl}/100` : '—'}  note={isReal ? 'Cert + protocol' : 'No scan yet'} accent={isReal ? (scores.ssl>=80?'gr':'am') : 'bl'} />
        <StatCard label="Last scanned" value={isReal ? new Date(scannedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Never'} note={domainName} accent="bl" />
      </Grid>

      <Card title={`${domainName} — Domain Monitor`} titleIcon="ti-world"
            badge={isReal ? '● Live data' : '● No scan yet'} badgeType={isReal ? 'ok' : 'bl'}>

        {/* Control bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>
            {isReal
              ? `Last scanned: ${new Date(scannedAt).toLocaleString()}`
              : `No scan data — click Rescan to analyse ${domainName}`}
          </span>
          <button onClick={rescan} disabled={scanning || !domainRow}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'rgba(79,166,255,0.07)', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:6, fontSize:10, color:'#4fa6ff', cursor: scanning || !domainRow ? 'not-allowed' : 'pointer', fontFamily:'IBM Plex Mono,monospace', opacity: !domainRow ? 0.4 : 1 }}>
            <i className={`ti ${scanning ? 'ti-loader' : 'ti-refresh'}`}
               style={{ fontSize:11, animation: scanning ? 'spin 1s linear infinite' : 'none' }} aria-hidden="true"/>
            {scanning ? 'Scanning…' : 'Rescan'}
          </button>
        </div>

        {scanError && (
          <div style={{ padding:'8px 14px', background:'rgba(255,71,87,0.07)', borderBottom:'0.5px solid rgba(255,71,87,0.15)', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ff4757' }}>
            {scanError} — please try again or contact support if this continues
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, padding:'10px 14px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              style={{ padding:'6px 12px', fontSize:11, cursor:'pointer', borderRadius:'6px 6px 0 0',
                color: tab===i ? '#4fa6ff' : '#6b7789',
                background: tab===i ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: `0.5px solid ${tab===i ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                fontFamily:'Syne,sans-serif', marginBottom:-1, transition:'all .12s' }}>
              {t}
            </button>
          ))}
        </div>

        {tab < 4 && tabContent[tab]}

        {/* Subdomains tab */}

        {/* HTTP Headers tab */}
        {tab === 5 && (
          <div>
            {!isReal || !headersData ? (
              <div style={{ padding:'16px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.7 }}>
                No headers data yet. Trigger a full scan to check HTTP security headers.
              </div>
            ) : (
              <div>
                {/* Header values grid */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6, padding:12, borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                  {[
                    ['HSTS',               headersData.headers?.hsts],
                    ['Content-Security-Policy', headersData.headers?.csp],
                    ['X-Frame-Options',    headersData.headers?.xframe],
                    ['X-Content-Type-Options', headersData.headers?.xcontent],
                    ['Referrer-Policy',    headersData.headers?.referrer],
                    ['Permissions-Policy', headersData.headers?.permissions],
                    ['Server',             headersData.headers?.server],
                  ].map(([name, val]) => (
                    <div key={name} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.05)', borderRadius:6, padding:'8px 10px' }}>
                      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.6px' }}>{name}</div>
                      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color: val ? '#00df78' : '#ff4757', wordBreak:'break-all' }}>
                        {val ? val.slice(0, 60) + (val.length > 60 ? '…' : '') : '— not set'}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Issues */}
                {(headersData.issues ?? []).length === 0
                  ? <div style={{ padding:'12px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78' }}>✓ All security headers are configured</div>
                  : (headersData.issues ?? []).map(i => <IssueRow key={i.id} sev={i.sev} name={i.title ?? i.name} tag={i.sev} tagType={i.sev==='high'?'warn':i.sev==='medium'?'bl':'ok'} why={i.detail} fix={i.fix ?? []} />)
                }
              </div>
            )}
          </div>
        )}

        {/* WHOIS tab */}
        {tab === 6 && (
          <div>
            {!isReal || !whoisData || whoisData.error ? (
              <div style={{ padding:'16px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.7 }}>
                {whoisData?.error ?? 'No WHOIS data yet. Trigger a full scan to fetch domain registration details.'}
              </div>
            ) : (
              <div>
                {/* WHOIS info grid */}
                {whoisData.info && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, padding:12, borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                    {[
                      ['Registrar',     whoisData.info.registrar ?? 'Unknown'],
                      ['Registered',    whoisData.info.registered ? new Date(whoisData.info.registered).toLocaleDateString() : 'Unknown'],
                      ['Expires',       whoisData.info.expires ? new Date(whoisData.info.expires).toLocaleDateString() : 'Unknown'],
                      ['Days to expiry',whoisData.info.daysToExpiry !== null ? `${whoisData.info.daysToExpiry} days` : 'Unknown'],
                      ['Domain age',    whoisData.info.ageYears !== null ? `${whoisData.info.ageYears} year${whoisData.info.ageYears !== 1 ? 's' : ''}` : 'Unknown'],
                      ['Transfer lock', whoisData.info.locked ? 'Enabled ✓' : 'Not enabled'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.05)', borderRadius:6, padding:'8px 10px' }}>
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'#3a4455', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.6px' }}>{k}</div>
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#dde2ed' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Issues */}
                {(whoisData.issues ?? []).length === 0
                  ? <div style={{ padding:'12px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78' }}>✓ Domain registration looks healthy</div>
                  : (whoisData.issues ?? []).map(i => <IssueRow key={i.id} sev={i.sev} name={i.title ?? i.name} tag={i.sev} tagType={i.sev==='critical'?'bad':i.sev==='high'?'warn':'bl'} why={i.detail} fix={i.fix ?? []} />)
                }
              </div>
            )}
          </div>
        )}

                {tab === 4 && (
          <div>
            {!isReal || !subdomainData ? (
              <div style={{ padding:'16px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.7 }}>
                  Subdomain discovery scans Certificate Transparency logs (crt.sh) to find all subdomains
                  that have ever had an SSL certificate — even old, forgotten ones that may be vulnerable.
                </div>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#4fa6ff' }}>
                  → Trigger a full scan from the top bar to discover subdomains for {domainName}
                </div>
              </div>
            ) : (
              <div>
                {/* Takeover risks first */}
                {(subdomainData.issues ?? []).map(i => (
                  <IssueRow key={i.id} sev={i.sev} name={i.title ?? i.name}
                    tag={i.sev.charAt(0).toUpperCase() + i.sev.slice(1)} tagType={i.sev === 'critical' ? 'bad' : 'warn'}
                    why={i.detail} fix={i.fix ?? []} />
                ))}

                {/* Subdomain list */}
                {(subdomainData.subdomains ?? []).length > 0 && (
                  <div>
                    <div style={{ padding:'10px 14px 6px', fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', letterSpacing:'1px', textTransform:'uppercase', borderTop: subdomainData.issues?.length > 0 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
                      {subdomainData.total} subdomains discovered
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:4, padding:'4px 14px 14px' }}>
                      {(subdomainData.subdomains ?? []).map(sub => {
                        const hasRisk = (subdomainData.checked ?? []).find(c => c.name === sub && c.takeoverRisk)
                        return (
                          <div key={sub} style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ width:5, height:5, borderRadius:'50%', background: hasRisk ? '#ff4757' : '#3a4455', flexShrink:0 }}/>
                            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color: hasRisk ? '#ff4757' : '#6b7789' }}>{sub}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {(subdomainData.subdomains ?? []).length === 0 && (subdomainData.issues ?? []).length === 0 && (
                  <div style={{ padding:'16px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78' }}>
                    🎉 No subdomains found in certificate logs for {domainName}.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
