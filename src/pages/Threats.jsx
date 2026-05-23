/**
 * Threats — real VirusTotal data + active monitoring + roadmap
 */
import React from 'react'
import { StatCard, Card, Grid, IssueRow, EmptyState } from '../components/ui'
import { useScanData } from '../hooks/useScanData'

const ROADMAP = [
  { phase:'Requires server agent',       icon:'ti-radar',        color:'#ff4757', title:'Real-time threat detection',  detail:'Detects brute-force attacks and suspicious logins as they happen. Needs a lightweight agent on your servers.' },
  { phase:'Requires email integration',  icon:'ti-fish-hook',    color:'#ff4757', title:'Phishing email detection',    detail:'Scans inbound emails for phishing indicators. Requires access to your email provider API.' },
  { phase:'Requires identity provider',  icon:'ti-user-x',       color:'#ff4757', title:'Anomalous login detection',   detail:'Flags logins from new countries or unusual hours. Integrates with Google Workspace or Microsoft 365.' },
  { phase:'Premium tier',                icon:'ti-shield-check', color:'#a78bfa', title:'Automated threat response',   detail:'Auto-block attacking IPs and quarantine compromised sessions without manual intervention.' },
]

export default function Threats() {
  const { domainName, isReal, scores, issueCount, vtData, allIssues } = useScanData()

  const threatIssues = (allIssues ?? []).filter(i => i.type === 'Threats')
  const critCount    = issueCount.critical ?? 0
  const vtScore      = scores.threats ?? (isReal ? 100 : 0)

  const vtStats = vtData?.stats ?? null
  // Only show nag if VT genuinely didn't run (no score saved)
  // skipped:true in old scan data is stale — if there's a real score, VT worked
  const vtSkipped = vtData?.skipped && !vtData?.stats && (scores.threats === 0 || scores.threats === undefined)

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Threat score"    value={isReal ? `${vtScore}/100` : '—'}     note={vtSkipped ? 'Add VT key' : isReal ? 'VirusTotal scan' : 'Run scan first'} accent={vtScore >= 90 ? 'gr' : vtScore >= 70 ? 'am' : 're'} />
        <StatCard label="Malicious flags" value={isReal ? (vtStats?.malicious ?? 0) : '—'} note={`of ${vtStats?.total ?? 0} engines`} accent={(vtStats?.malicious ?? 0) > 0 ? 're' : 'gr'} />
        <StatCard label="Suspicious"      value={isReal ? (vtStats?.suspicious ?? 0) : '—'} note="flags from engines" accent={(vtStats?.suspicious ?? 0) > 0 ? 'am' : 'gr'} />
        <StatCard label="Critical issues" value={critCount} note="all categories" accent={critCount > 0 ? 're' : 'gr'} />
      </Grid>

      {/* VirusTotal results */}
      <Card title="Threat intelligence — VirusTotal" titleIcon="ti-virus"
            badge={!isReal ? 'Run scan first' : vtSkipped ? 'Add API key' : vtStats?.malicious > 0 ? `${vtStats.malicious} engines flagged` : 'Clean'}
            badgeType={!isReal || vtSkipped ? 'bl' : vtStats?.malicious > 0 ? 'bad' : 'ok'}>

        {!isReal ? (
          <EmptyState icon="ti-radar" msg="No scan data yet — click Run scan in the top bar" />
        ) : vtSkipped ? (
          <div style={{ padding:'14px' }}>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ffb627', lineHeight:1.7, marginBottom:10 }}>
              VirusTotal API key not configured. Add it to enable threat intelligence scanning against 90+ security engines.
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', lineHeight:1.7, marginBottom:10 }}>
              1. Sign up free at <strong style={{ color:'#4fa6ff' }}>virustotal.com</strong><br/>
              2. Go to your profile → API Key<br/>
              3. Add to <code style={{ background:'rgba(255,255,255,0.05)', padding:'1px 5px', borderRadius:3 }}>.env.local</code>:<br/>
              <code style={{ background:'rgba(255,255,255,0.05)', padding:'3px 8px', borderRadius:3, display:'inline-block', marginTop:4 }}>VIRUSTOTAL_API_KEY=your_key_here</code><br/>
              4. Restart the server and rescan
            </div>
          </div>
        ) : threatIssues.length === 0 ? (
          <div style={{ padding:'16px 14px' }}>
            <div style={{ color:'#00df78', fontFamily:'IBM Plex Mono,monospace', fontSize:12, marginBottom:8 }}>
              ✓ {domainName} is clean across {vtStats?.total ?? 0} security engines
            </div>
            {vtStats && (
              <div style={{ display:'flex', gap:12, fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>
                <span><span style={{ color:'#00df78' }}>{vtStats.harmless}</span> harmless</span>
                <span><span style={{ color:'#3a4455' }}>{vtStats.undetected}</span> undetected</span>
                {vtData?.lastAnalysisDate && <span>Last checked: {new Date(vtData.lastAnalysisDate).toLocaleDateString()}</span>}
              </div>
            )}
          </div>
        ) : (
          threatIssues.map(i => <IssueRow key={i.id} sev={i.sev} name={i.name} tag={i.tag} tagType={i.tagType} why={i.why} fix={i.fix} />)
        )}
      </Card>

      {/* Active monitoring today */}
      <Card title="What we actively monitor" titleIcon="ti-eye">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:12 }}>
          {[
            { icon:'ti-hierarchy',  color:'#4fa6ff', title:'DNS change detection',        detail:`Daily rescan of ${domainName ?? 'your domain'}. Any DNS record change triggers an immediate alert.` },
            { icon:'ti-lock',       color:'#4fa6ff', title:'SSL cert expiry monitoring',  detail:'Alerts 30 days before your cert expires, then again at 14 and 7 days.' },
            { icon:'ti-mail',       color:'#a78bfa', title:'DMARC + DKIM monitoring',     detail:'Checks daily that your email authentication is still enforced.' },
            { icon:'ti-virus',      color:'#ff4757', title:'VirusTotal threat intel',     detail:`Cross-references ${domainName ?? 'your domain'} against 90+ security engines on every scan.` },
          ].map((item, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <i className={`ti ${item.icon}`} style={{ fontSize:15, color:item.color }} aria-hidden="true"/>
                <div style={{ fontSize:11, fontWeight:600, color:'#dde2ed' }}>{item.title}</div>
              </div>
              <div style={{ fontSize:11, color:'#6b7789', lineHeight:1.6 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Roadmap */}
      <Card title="Advanced threat detection roadmap" titleIcon="ti-road">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:12 }}>
          {ROADMAP.map((item, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:28, height:28, borderRadius:7, background:`${item.color}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:14, color:item.color }} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#dde2ed' }}>{item.title}</div>
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:item.color }}>{item.phase}</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:'#6b7789', lineHeight:1.6 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
