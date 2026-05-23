/**
 * Compliance — maps scan data to SOC 2, NIST CSF, ISO 27001 controls.
 * Shows % ready based on technical controls we can verify.
 */
import React, { useState } from 'react'
import { StatCard, Card, Grid } from '../components/ui'
import { useScanData } from '../hooks/useScanData'

// Map scan scores/issues to compliance controls
function buildControls(scores, issues, isReal) {
  if (!isReal) return []

  const hasDmarc     = !issues.some(i => i.id?.includes('dmarc') || i.title?.toLowerCase().includes('dmarc'))
  const hasSpf       = !issues.some(i => i.id?.includes('spf')   || i.title?.toLowerCase().includes('spf'))
  const hasDkim      = !issues.some(i => i.id?.includes('dkim')  || i.title?.toLowerCase().includes('dkim'))
  const hasHsts      = !issues.some(i => i.id?.includes('hsts')  || i.title?.toLowerCase().includes('hsts'))
  const hasCsp       = !issues.some(i => i.id?.includes('csp')   || i.title?.toLowerCase().includes('content-security'))
  const sslOk        = (scores.ssl ?? 0) >= 70
  const noExpiredCert= !issues.some(i => i.title?.toLowerCase().includes('cert') && i.sev === 'critical')
  const noCritPorts  = !issues.some(i => i.type === 'Ports' && i.sev === 'critical')
  const noExposedFiles = !issues.some(i => i.type === 'Pentest' && i.sev === 'critical')
  const whoisOk      = (scores.whois ?? 100) >= 80
  const vtOk         = (scores.threats ?? 100) >= 80
  const headersOk    = (scores.headers ?? 0) >= 60

  return [
    // SOC 2 controls
    { framework:'SOC 2', id:'CC6.1',  name:'Encryption in transit',         pass: sslOk,           detail: sslOk ? 'TLS configured correctly' : 'SSL score below 70 — fix SSL issues' },
    { framework:'SOC 2', id:'CC6.7',  name:'Email spoofing prevention',     pass: hasDmarc&&hasSpf, detail: hasDmarc&&hasSpf ? 'DMARC + SPF configured' : 'DMARC or SPF not enforced' },
    { framework:'SOC 2', id:'CC6.6',  name:'External threat monitoring',    pass: vtOk,            detail: vtOk ? 'No malicious reputation flags' : 'Domain flagged by threat intelligence' },
    { framework:'SOC 2', id:'CC7.1',  name:'Vulnerability detection',       pass: noCritPorts,     detail: noCritPorts ? 'No critical ports exposed' : 'Critical ports open to internet' },
    { framework:'SOC 2', id:'CC8.1',  name:'Change management — cert expiry', pass: noExpiredCert, detail: noExpiredCert ? 'SSL certificate valid' : 'Certificate expired or expiring soon' },
    { framework:'SOC 2', id:'CC6.8',  name:'Malware prevention',            pass: noExposedFiles,  detail: noExposedFiles ? 'No exposed config files found' : 'Sensitive files publicly accessible' },

    // NIST CSF controls
    { framework:'NIST',  id:'PR.DS-2', name:'Data in transit protected',    pass: sslOk && hasHsts, detail: sslOk && hasHsts ? 'TLS + HSTS configured' : 'Upgrade SSL and add HSTS header' },
    { framework:'NIST',  id:'PR.DS-6', name:'Integrity checking',           pass: hasDkim,         detail: hasDkim ? 'DKIM signing configured' : 'DKIM not found — email integrity unverified' },
    { framework:'NIST',  id:'PR.AC-5', name:'Network integrity',            pass: noCritPorts,     detail: noCritPorts ? 'No dangerous ports exposed' : 'Critical services exposed to internet' },
    { framework:'NIST',  id:'DE.CM-1', name:'Network monitoring',           pass: vtOk,            detail: vtOk ? 'Threat intel clean' : 'Domain has threat intelligence flags' },
    { framework:'NIST',  id:'PR.IP-1', name:'Baseline configuration',       pass: headersOk,       detail: headersOk ? 'Security headers configured' : 'Missing critical HTTP security headers' },
    { framework:'NIST',  id:'ID.AM-1', name:'Asset inventory — domain',     pass: whoisOk,         detail: whoisOk ? 'Domain registration healthy' : 'Domain expiring or transfer lock missing' },

    // ISO 27001 controls
    { framework:'ISO 27001', id:'A.10.1', name:'Cryptographic policy',      pass: sslOk,           detail: sslOk ? 'Strong encryption in use' : 'Weak or misconfigured SSL/TLS' },
    { framework:'ISO 27001', id:'A.13.1', name:'Network security controls', pass: noCritPorts && hasHsts, detail: noCritPorts && hasHsts ? 'Network controls in place' : 'Open ports or missing HSTS' },
    { framework:'ISO 27001', id:'A.12.6', name:'Technical vulnerability mgmt', pass: noExposedFiles && noCritPorts, detail: noExposedFiles && noCritPorts ? 'No known technical vulnerabilities' : 'Vulnerabilities need remediation' },
    { framework:'ISO 27001', id:'A.13.2', name:'Information transfer',      pass: hasSpf && hasDmarc && hasDkim, detail: hasSpf && hasDmarc && hasDkim ? 'Email authentication complete' : 'Incomplete email authentication' },
    { framework:'ISO 27001', id:'A.14.1', name:'Security in development',   pass: hasCsp,          detail: hasCsp ? 'Content-Security-Policy configured' : 'Missing CSP header — XSS risk' },
    { framework:'ISO 27001', id:'A.12.1', name:'Change management',         pass: noExpiredCert && whoisOk, detail: noExpiredCert && whoisOk ? 'Certificates and domain managed' : 'Certificate or domain management issues' },
  ]
}

const FRAMEWORKS = ['All', 'SOC 2', 'NIST', 'ISO 27001']
const FW_COLOR   = { 'SOC 2':'#4fa6ff', 'NIST':'#a78bfa', 'ISO 27001':'#00cfaa' }

export default function Compliance() {
  const { isReal, scores, allIssues } = useScanData()
  const [activeFramework, setActiveFramework] = useState('All')

  const controls = buildControls(scores, allIssues ?? [], isReal)
  const filtered = activeFramework === 'All' ? controls : controls.filter(c => c.framework === activeFramework)
  const passCount = filtered.filter(c => c.pass).length
  const pct       = filtered.length > 0 ? Math.round((passCount / filtered.length) * 100) : 0

  const fwStats = ['SOC 2', 'NIST', 'ISO 27001'].map(fw => {
    const fwControls = controls.filter(c => c.framework === fw)
    const fwPass     = fwControls.filter(c => c.pass).length
    return { fw, pass: fwPass, total: fwControls.length, pct: Math.round((fwPass / fwControls.length) * 100) }
  })

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Technical controls" value={isReal ? `${pct}%` : '—'} note={isReal ? `${passCount}/${filtered.length} passing` : 'Run scan first'} accent={pct>=80?'gr':pct>=60?'am':'re'} />
        {fwStats.map(s => (
          <StatCard key={s.fw} label={s.fw} value={isReal ? `${s.pct}%` : '—'} note={isReal ? `${s.pass}/${s.total} controls` : '—'} accent={s.pct>=80?'gr':s.pct>=60?'am':'re'} />
        ))}
      </Grid>

      {!isReal && (
        <div style={{ background:'rgba(255,182,39,0.07)', border:'0.5px solid rgba(255,182,39,0.2)', borderRadius:8, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ffb627' }}>
          ⚠ Run a scan first — compliance controls are mapped from your real scan data.
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ background:'rgba(79,166,255,0.05)', border:'0.5px solid rgba(79,166,255,0.15)', borderRadius:8, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#4fa6ff', lineHeight:1.7 }}>
        ℹ These are <strong>technical controls only</strong> — automated checks based on your domain scan data. 
        Full SOC 2/ISO 27001 certification also requires HR policies, physical security, access controls, and a certified auditor. 
        This gives you a technical readiness score, not a certification.
      </div>

      {/* Framework filter */}
      <div style={{ display:'flex', gap:4 }}>
        {FRAMEWORKS.map(fw => (
          <button key={fw} onClick={() => setActiveFramework(fw)}
            style={{ padding:'5px 14px', borderRadius:6, fontSize:11, cursor:'pointer',
              background: activeFramework===fw ? `${FW_COLOR[fw]??'rgba(255,255,255,0.1)'}18` : 'transparent',
              border:`0.5px solid ${activeFramework===fw ? (FW_COLOR[fw]??'rgba(79,166,255,0.3)') : 'rgba(255,255,255,0.07)'}`,
              color: activeFramework===fw ? (FW_COLOR[fw]??'#4fa6ff') : '#6b7789',
              fontFamily:'IBM Plex Mono,monospace' }}>
            {fw}
          </button>
        ))}
      </div>

      <Card title={`${activeFramework === 'All' ? 'All frameworks' : activeFramework} — technical controls`}
        titleIcon="ti-certificate"
        badge={isReal ? `${passCount}/${filtered.length} passing` : 'No data'}
        badgeType={pct>=80?'ok':pct>=60?'warn':'bad'}>
        {filtered.map(ctrl => (
          <div key={`${ctrl.framework}-${ctrl.id}`}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width:20, height:20, borderRadius:5, flexShrink:0,
              background: ctrl.pass ? 'rgba(0,223,120,0.1)' : 'rgba(255,71,87,0.07)',
              border:`1px solid ${ctrl.pass ? 'rgba(0,223,120,0.3)' : 'rgba(255,71,87,0.2)'}`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className={`ti ${ctrl.pass ? 'ti-check' : 'ti-x'}`}
                style={{ fontSize:11, color: ctrl.pass ? '#00df78' : '#ff4757' }} aria-hidden="true"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:'#dde2ed', marginBottom:2 }}>{ctrl.name}</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color: ctrl.pass ? '#3a4455' : '#ff4757' }}>
                {ctrl.detail}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9,
                color: FW_COLOR[ctrl.framework] ?? '#3a4455',
                background:`${FW_COLOR[ctrl.framework]??'rgba(255,255,255,0.05)'}12`,
                border:`0.5px solid ${FW_COLOR[ctrl.framework]??'rgba(255,255,255,0.07)'}33`,
                padding:'1px 7px', borderRadius:100 }}>
                {ctrl.framework}
              </div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginTop:2 }}>{ctrl.id}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* What full audit requires */}
      <Card title="What a full audit requires beyond this" titleIcon="ti-info-circle">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:12 }}>
          {[
            { icon:'ti-users',       color:'#ffb627', title:'HR & access policies',        detail:'Onboarding/offboarding procedures, access control policies, background checks. Documented and auditable.' },
            { icon:'ti-building',    color:'#ffb627', title:'Physical security',            detail:'Office access controls, clean desk policy, visitor logs. Required for ISO 27001.' },
            { icon:'ti-file-text',   color:'#4fa6ff', title:'Risk register',                detail:'Formal documented risk assessment updated annually. Required for all three frameworks.' },
            { icon:'ti-certificate', color:'#a78bfa', title:'Certified auditor',            detail:'SOC 2 Type II requires a CPA firm. ISO 27001 requires an accredited certification body. Budget $15k–$50k.' },
          ].map((item, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                <i className={`ti ${item.icon}`} style={{ fontSize:13, color:item.color }} aria-hidden="true"/>
                <span style={{ fontSize:11, fontWeight:600, color:'#dde2ed' }}>{item.title}</span>
              </div>
              <div style={{ fontSize:11, color:'#6b7789', lineHeight:1.5 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
