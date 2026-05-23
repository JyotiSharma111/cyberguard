/**
 * Topbar — page title + run scan + share button
 * Uses real domain name from useScanData
 */
import React, { useEffect } from 'react'
import { useApp, A } from '../../store/appStore'
import { useScanData } from '../../hooks/useScanData'
import { fullScan } from '../../lib/api'
import ReportButton from '../ui/ReportButton'
import { supabase } from '../../lib/supabase'

const PAGE_META = {
  overview:   ['ti-layout-dashboard', 'Dashboard'],
  score:      ['ti-chart-bar',        'Security Score'],
  threats:    ['ti-radar',            'Threat Detection'],
  response:   ['ti-shield-check',     'Managed Response'],
  darkweb:    ['ti-eye-off',          'Dark Web Monitor'],
  domain:     ['ti-world',            'Domain Monitor'],
  vuln:       ['ti-scan',             'Vulnerability Scan'],
  pentest:    ['ti-lock-open',        'Pen Testing'],
  creds:      ['ti-key',              'Credential Check'],
  vendor:     ['ti-building',         'Vendor Risk'],
  compliance: ['ti-certificate',      'Compliance'],
  training:   ['ti-school',           'Awareness Training'],
  settings:   ['ti-bell',             'Alert Settings'],
  account:    ['ti-user-circle',      'Account & Data'],
  billing:    ['ti-credit-card',       'Billing & Plans'],
  integrations:['ti-plug',              'Cloud & Identity'],
  guides:        ['ti-book',              'Setup Guides'],
  threatalerts:  ['ti-radar-2',           'Threat Alerts'],
  documents:     ['ti-file-text',         'Policy Documents'],
  phishing:      ['ti-fish-hook',         'Phishing Simulations'],
  uptime:        ['ti-activity',          'Uptime Monitor'],
}

export default function Topbar() {
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const { state, send } = useApp()
  const { domainName, domainRow, reload } = useScanData()
  const [icon, title] = PAGE_META[state.activePage] ?? ['ti-layout-dashboard', 'Dashboard']

  // Auto-clear toast
  useEffect(() => {
    if (!state.toast) return
    const t = setTimeout(() => send(A.TOAST_CLEAR), 4000)
    return () => clearTimeout(t)
  }, [state.toast])

  const doScan = async () => {
    if (state.scanRunning || !domainRow) return
    send(A.SCAN_START)
    send(A.TOAST, { msg: `Scanning ${domainName}…`, type: 'bl' })

    const result = await fullScan(domainRow.name)
    if (result.ok && result.data) {
      const sd    = result.data
      const score = Math.min(100, Math.max(0, sd.overallScore ?? 0))
      const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'

      await supabase.from('scan_results').insert({
        domain_id:   domainRow.id,
        score,
        grade,
        dns_score:   sd.scores?.dns          ?? 0,
        ssl_score:   sd.scores?.ssl          ?? 0,
        email_score: sd.dns?.email ? Math.round((sd.scores?.dns ?? 0) * 0.7) : 0,
        cred_score:  sd.scores?.credentials  ?? 0,
        ports_score: sd.scores?.ports        ?? 0,
        subdom_score: sd.scores?.subdomains  ?? 0,
        issues:      sd.issues               ?? [],
        raw_dns:     sd.dns                  ?? {},
        raw_ssl:     sd.ssl                  ?? {},
        raw_creds:   sd.credentials          ?? {},
        raw_shodan:  sd.shodan               ?? {},
        raw_subdoms: sd.subdomains           ?? {},
        headers_score: sd.scores?.headers    ?? 0,
        dkim_score:    sd.scores?.dkim       ?? 0,
        whois_score:   sd.scores?.whois      ?? 100,
        threats_score: sd.scores?.threats    ?? 100,
        raw_headers:   sd.headers            ?? {},
        raw_dkim:      sd.dkim               ?? {},
        raw_whois:     sd.whois              ?? {},
        raw_virustotal: sd.virustotal        ?? {},
        pentest_score:  sd.scores?.pentest    ?? 0,
        raw_pentest:    sd.pentest            ?? {},
      })

      await supabase.from('domains')
        .update({ last_scanned: new Date().toISOString() })
        .eq('id', domainRow.id)

      reload()

      // Fire alerts — check what changed vs previous scan
      try {
        const { data: prev } = await supabase
          .from('scan_results')
          .select('score, issues, raw_ssl, raw_dns')
          .eq('domain_id', domainRow.id)
          .order('scanned_at', { ascending: false })
          .range(1, 1)
          .maybeSingle()

        // Get alert settings + recipients
        const { data: settings } = await supabase
          .from('alert_settings').select('*').eq('domain_id', domainRow.id).maybeSingle()
        const { data: extras }   = await supabase
          .from('alert_recipients').select('email').eq('domain_id', domainRow.id).eq('active', true)

        const recipients = [...new Set([state.user?.email, ...(extras?.map(r=>r.email)??[])].filter(Boolean))]

        if (recipients.length) {
          fetch(`${apiBase}/api/alerts/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain: domainRow.name,
              currentScan: { domain: domainRow.name, score, issues: sd.issues??[], raw_ssl: sd.ssl??{}, raw_dns: sd.dns??{} },
              previousScan: prev ? { ...prev, domain: domainRow.name } : null,
              recipients,
              settings,
            })
          }).catch(e => console.warn('[alerts]', e.message))
        }
      } catch (e) {
        console.warn('[Topbar] alert check failed:', e.message)
      }

      send(A.TOAST, { msg: `Scan complete — score: ${score}/100`, type: 'ok' })
    } else {
      send(A.TOAST, { msg: `Scan failed: ${result.error ?? 'Check API server'}`, type: 'bad' })
    }
    send(A.SCAN_DONE)
  }

  const doShare = async () => {
    if (!domainRow) return
    // Create share link in Supabase
    const { data, error } = await supabase
      .from('share_links')
      .insert({ domain_id: domainRow.id, label: 'Shared dashboard' })
      .select('token')
      .single()

    if (error) {
      send(A.TOAST, { msg: `Could not create share link: ${error.message}`, type: 'bad' })
      return
    }

    const url = `${window.location.origin}/share/${data.token}`
    try {
      await navigator.clipboard.writeText(url)
      send(A.TOAST, { msg: 'Share link copied — read-only, expires in 30 days', type: 'ok' })
    } catch {
      send(A.TOAST, { msg: `Share link: ${url}`, type: 'bl' })
    }
  }

  return (
    <header style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 16px', height:46, background:'#0f1420',
      borderBottom:'0.5px solid rgba(255,255,255,0.06)', flexShrink:0
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600, color:'#dde2ed' }}>
        <i className={`ti ${icon}`} style={{ fontSize:15, color:'#4fa6ff' }} aria-hidden="true" />
        {title}
        {domainName !== '—' && (
          <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', fontWeight:400 }}>
            — {domainName}
          </span>
        )}
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <ReportButton domainRow={domainRow} profile={state.profile} />
        <button onClick={doShare} disabled={!domainRow}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', background:'transparent', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, fontSize:11, color:'#6b7789', cursor: domainRow ? 'pointer' : 'not-allowed', fontFamily:'Syne,sans-serif', opacity: domainRow ? 1 : 0.4 }}>
          <i className="ti ti-share" style={{ fontSize:12 }} aria-hidden="true" /> Share
        </button>

        <button onClick={doScan} disabled={state.scanRunning || !domainRow}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', background:'rgba(79,166,255,0.08)', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:7, fontSize:11, color:'#4fa6ff', cursor: state.scanRunning || !domainRow ? 'not-allowed' : 'pointer', fontFamily:'Syne,sans-serif', opacity: !domainRow ? 0.4 : 1 }}>
          <i className={`ti ${state.scanRunning ? 'ti-loader' : 'ti-radar'}`}
             style={{ fontSize:12, animation: state.scanRunning ? 'spin 1s linear infinite' : 'none' }}
             aria-hidden="true" />
          {state.scanRunning ? 'Scanning…' : 'Run scan'}
        </button>

        <button style={{ width:30, height:30, background:'transparent', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}
          aria-label="Alerts">
          <i className="ti ti-bell" style={{ fontSize:14, color:'#6b7789' }} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
