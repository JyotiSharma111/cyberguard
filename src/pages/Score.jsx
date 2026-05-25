import React from 'react'
import { useApp } from '../store/appStore'
import { useScanData } from '../hooks/useScanData'
import { StatCard, UpgradePrompt, Card, Grid, IssueRow } from '../components/ui'
import ScoreChart from '../components/ui/ScoreChart'
import ReportButton from '../components/ui/ReportButton'
import { scoreColor } from '../utils/helpers'

export default function Score() {
  const { state } = useApp()
  const plan = state.profile?.plan ?? 'free'
  if (plan === 'free') {
    return (
      <div style={{ padding:16 }}>
        <UpgradePrompt
          feature="Score history"
          message="Track your security score over time and see what changed. Upgrade to Pro to unlock 90-day score history."
          upgrade="pro"
        />
      </div>
    )
  }
  const {
    domainName, domainRow, isReal, scores, issueCount, scoreDimensions,
    dnsIssues, emailIssues, sslIssues, scannedAt,
    whoisData, headersData, dkimData,
  } = useScanData()

  const overall = scores.overall
  const grade   = overall >= 90 ? 'A' : overall >= 75 ? 'B+' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F'

  const whoisIssues  = (whoisData?.issues   ?? []).map(i => ({ ...i, name:i.title??i.name, tag:i.sev, tagType:i.sev==='critical'?'bad':i.sev==='high'?'warn':'bl', fix:i.fix??[] }))
  const headerIssues = (headersData?.issues ?? []).map(i => ({ ...i, name:i.title??i.name, tag:i.sev, tagType:i.sev==='high'?'warn':'bl', fix:i.fix??[] }))
  const dkimIssues   = (dkimData?.issues    ?? []).map(i => ({ ...i, name:i.title??i.name, tag:i.sev, tagType:'warn', fix:i.fix??[] }))

  const priorityFixes = [...dnsIssues, ...emailIssues, ...sslIssues, ...whoisIssues, ...headerIssues, ...dkimIssues]
    .filter(i => i.sev === 'critical' || i.sev === 'high').slice(0, 6)

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={4} gap={10}>
        <StatCard label="Security score"  value={String(overall)} note={`Grade ${grade}`} accent={overall>=75?'gr':overall>=60?'am':'re'} />
        <StatCard label="Critical issues" value={issueCount.critical} note="Fix immediately" accent={issueCount.critical>0?'re':'gr'} />
        <StatCard label="High issues"     value={issueCount.high} note="Fix within 7 days" accent={issueCount.high>0?'am':'gr'} />
        <StatCard label="Last scan" value={scannedAt?new Date(scannedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Never'} note={domainName} accent="bl" />
      </Grid>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <ReportButton domainRow={domainRow} profile={state.profile} />
      </div>

      {!isReal && (
        <div style={{ background:'rgba(255,182,39,.07)', border:'0.5px solid rgba(255,182,39,.2)', borderRadius:8, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#ffb627' }}>
          ⚠ No scan data yet for {domainName}. Click Run scan to see your real score.
        </div>
      )}

      {domainRow && (
        <Card title="Score history — last 90 days" titleIcon="ti-chart-line">
          <ScoreChart domainId={domainRow.id} height={160} />
        </Card>
      )}

      <Grid cols={2} gap={12}>
        <Card title="Score breakdown" titleIcon="ti-chart-bar">
          <div style={{ padding:'8px 0' }}>
            {scoreDimensions.map(d => (
              <div key={d.key} style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 14px' }}>
                <span style={{ fontSize:11, color:'#6b7789', width:180, flexShrink:0 }}>{d.label}</span>
                <div style={{ flex:1, height:4, background:'#161c2a', borderRadius:100, overflow:'hidden' }}>
                  <div style={{ width:`${d.score}%`, height:'100%', background:d.color??scoreColor(d.score), borderRadius:100, transition:'width .5s' }} />
                </div>
                <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:d.color??scoreColor(d.score), width:26, textAlign:'right' }}>{d.score}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Grade guide" titleIcon="ti-info-circle">
          {[['A (90–100)','Excellent — maintain and monitor','gr'],['B (75–89)','Good — fix high issues in 7 days','gr'],['C (60–74)','Gaps — remediation plan needed','am'],['D (40–59)','Poor — escalate urgently','re'],['F (0–39)','Critical — act immediately','re']].map(([g,d,c]) => (
            <div key={g} style={{ display:'flex', gap:10, padding:'8px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', alignItems:'center' }}>
              <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:`var(--${c})`, width:90, flexShrink:0 }}>{g}</span>
              <span style={{ fontSize:11, color:'#6b7789' }}>{d}</span>
            </div>
          ))}
        </Card>
      </Grid>

      {priorityFixes.length > 0 && (
        <Card title="Priority fixes" titleIcon="ti-list-check">
          {priorityFixes.map((f,i) => <IssueRow key={f.id??i} sev={f.sev} name={f.name} tag={f.tag} tagType={f.tagType} why={f.why} fix={f.fix} />)}
        </Card>
      )}

      {priorityFixes.length === 0 && isReal && (
        <div style={{ padding:'20px', textAlign:'center', color:'#00df78', fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>
          🎉 No critical or high issues found for {domainName}!
        </div>
      )}
    </div>
  )
}
