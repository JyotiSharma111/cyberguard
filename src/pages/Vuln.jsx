/**
 * Vulnerability Scan — real data from Shodan InternetDB + SSL scan.
 * Shows open ports, CVEs detected on public IPs, SSL issues.
 */
import React, { useState } from 'react'
import { StatCard, Card, Grid, IssueRow, EmptyState } from '../components/ui'
import { useScanData } from '../hooks/useScanData'
import { useApp, A } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { scanVuln } from '../lib/api'

export default function Vuln() {
  const { domainName, domainRow, isReal, sslIssues, shodanData, scores, reload } = useScanData()
  const { send } = useApp()
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

  const ports     = shodanData?.ports      ?? []
  const vulns     = shodanData?.vulns      ?? []
  const ips       = shodanData?.ips        ?? []
  const portScore = scores.ports ?? (isReal ? 100 : 0)

  const critPorts = ports.filter(p => p.risk === 'critical')
  const highPorts = ports.filter(p => p.risk === 'high')
  const critVulns = vulns.filter(v => v.severity === 'critical')

  // Port + CVE issues from scan
  const portIssues = [
    ...sslIssues,
    ...(isReal ? [
      ...critPorts.map(p => ({
        id: `port-${p.port}`, sev: 'critical',
        name: `${p.name} (port ${p.port}) exposed to internet`,
        why: p.note,
        fix: p.port === 3389
          ? ['Block port 3389 in firewall — restrict to VPN range only', 'Require VPN before RDP is accessible', 'Enable Network Level Authentication (NLA)']
          : p.port === 22
          ? ['Set PasswordAuthentication no in /etc/ssh/sshd_config', 'Use SSH key pairs only', 'Consider fail2ban for brute-force protection']
          : [`Block port ${p.port} from public internet in your firewall/security group`, 'Restrict to internal network or VPN only'],
        tag: 'Critical', tagType: 'bad',
      })),
      ...highPorts.map(p => ({
        id: `port-h-${p.port}`, sev: 'high',
        name: `${p.name} (port ${p.port}) — review exposure`,
        why: p.note,
        fix: [`Review whether port ${p.port} needs to be publicly accessible`, 'Restrict to known IP ranges in your firewall if possible'],
        tag: 'High', tagType: 'warn',
      })),
      ...critVulns.map(v => ({
        id: `cve-${v.cve}`, sev: 'critical',
        name: `${v.cve} detected on ${ips[0] ?? 'your server IP'}`,
        why: `Shodan detected ${v.cve} on your public IP. This means one of your running services has a known vulnerability.`,
        fix: ['Run: sudo apt update && sudo apt upgrade (for Linux servers)', `Search "${v.cve}" at nvd.nist.gov for the specific affected software`, 'After patching, click Rescan to verify it no longer appears'],
        tag: 'Critical', tagType: 'bad',
      })),
    ] : []),
  ]

  async function runVulnScan() {
    if (!domainRow || scanning) return
    setScanning(true)
    setScanError('')

    const result = await scanVuln(domainRow.name)
    setScanning(false)

    if (!result.ok) {
      setScanError(result.error ?? 'Scan failed')
      return
    }

    const sd = result.data
    // Update the latest scan_results row with Shodan data
    const { data: latest } = await supabase
      .from('scan_results')
      .select('id, score')
      .eq('domain_id', domainRow.id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest) {
      await supabase.from('scan_results').update({
        ports_score: sd.score ?? 0,
        raw_shodan:  sd,
      }).eq('id', latest.id)
      reload()
      send(A.TOAST, { msg: `Port scan complete — ${sd.ports?.length ?? 0} ports, ${sd.vulns?.length ?? 0} CVEs found`, type: sd.issues?.length > 0 ? 'warn' : 'ok' })
    }
  }

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Port score"      value={isReal ? `${portScore}/100` : '—'} note={isReal ? `${critPorts.length} critical ports` : 'Run scan first'} accent={portScore >= 80 ? 'gr' : portScore >= 60 ? 'am' : 're'} />
        <StatCard label="Open ports"      value={isReal ? ports.length : '—'}       note={isReal ? `${critPorts.length + highPorts.length} risky` : 'No data'} accent={critPorts.length > 0 ? 're' : 'bl'} />
        <StatCard label="CVEs detected"   value={isReal ? vulns.length : '—'}       note={isReal ? `on ${ips[0] ?? 'your IP'}` : 'No data'} accent={critVulns.length > 0 ? 're' : 'gr'} />
        <StatCard label="SSL score"       value={isReal ? `${scores.ssl}/100` : '—'} note="Cert + protocol" accent={scores.ssl >= 80 ? 'gr' : 'am'} />
      </Grid>

      {/* Control bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'10px 14px' }}>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.6 }}>
          {isReal
            ? `Shodan scan of ${ips.join(', ')} · ${domainName}`
            : `Port scanning uses Shodan InternetDB — free, no API key needed`}
          {!isReal && <span style={{ color:'#4fa6ff', marginLeft:8 }}>Click Scan ports to start</span>}
        </div>
        <button onClick={runVulnScan} disabled={scanning || !domainRow}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', background:'rgba(79,166,255,0.07)', border:'0.5px solid rgba(79,166,255,0.18)', borderRadius:7, fontSize:11, color:'#4fa6ff', cursor: scanning || !domainRow ? 'not-allowed' : 'pointer', fontFamily:'IBM Plex Mono,monospace' }}>
          <i className={`ti ${scanning ? 'ti-loader' : 'ti-scan'}`} style={{ fontSize:12, animation: scanning ? 'spin 1s linear infinite' : 'none' }} aria-hidden="true"/>
          {scanning ? 'Scanning…' : 'Scan ports'}
        </button>
      </div>

      {scanError && (
        <div style={{ background:'rgba(255,71,87,0.07)', border:'0.5px solid rgba(255,71,87,0.15)', borderRadius:8, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ff4757' }}>
          {scanError} — please try again in a moment
        </div>
      )}

      <Card title="Vulnerabilities — click any for fix steps" titleIcon="ti-scan"
            badge={portIssues.filter(i=>i.sev==='critical').length > 0 ? `${portIssues.filter(i=>i.sev==='critical').length} critical` : `${portIssues.length} issues`}
            badgeType={portIssues.some(i=>i.sev==='critical') ? 'bad' : portIssues.length > 0 ? 'warn' : 'ok'}>
        {!isReal
          ? <EmptyState icon="ti-scan" msg="No scan data yet — click 'Scan ports' above to check your server's open ports and CVEs" />
          : portIssues.length === 0
          ? <div style={{ padding:'16px 14px', color:'#00df78', fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>🎉 No vulnerable ports or critical CVEs detected on {domainName}.</div>
          : portIssues.map(i => <IssueRow key={i.id} sev={i.sev} name={i.name} tag={i.tag} tagType={i.tagType} why={i.why} fix={i.fix} />)
        }
      </Card>

      {/* Port list if data available */}
      {isReal && ports.length > 0 && (
        <Card title={`All open ports on ${ips[0] ?? domainName}`} titleIcon="ti-network">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:6, padding:12 }}>
            {ports.map(p => (
              <div key={p.port} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:7, padding:'8px 10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background: p.risk==='critical'?'#ff4757':p.risk==='high'?'#ffb627':p.risk==='low'?'#00df78':'#4fa6ff', flexShrink:0 }}/>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:600, color:'#dde2ed' }}>{p.port}</span>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#6b7789' }}>{p.name}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
