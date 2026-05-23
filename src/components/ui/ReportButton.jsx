/**
 * ReportButton — generates and opens a printable HTML security report.
 * User clicks "Print / Save as PDF" in the browser's print dialog.
 * Works entirely in the browser — no server needed.
 */
import React, { useState } from 'react'
import { generateReportHTML } from '../../lib/generateReport'
import { supabase } from '../../lib/supabase'

export default function ReportButton({ domainRow, profile, style = {} }) {
  const [loading, setLoading] = useState(false)

  async function handleReport() {
    if (!domainRow || loading) return
    setLoading(true)

    try {
      // Fetch latest scan result
      const { data: scan } = await supabase
        .from('scan_results')
        .select('*')
        .eq('domain_id', domainRow.id)
        .order('scanned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!scan) {
        alert('No scan data yet — run a scan first before generating a report.')
        return
      }

      const html = generateReportHTML({
        domain:    domainRow.name,
        scanData:  scan,
        orgName:   profile?.org_name,
        scannedAt: scan.scanned_at,
      })

      if (!html) {
        alert('Could not generate report — no scan data available.')
        return
      }

      // Open in new tab — user can print/save as PDF
      const win = window.open('', '_blank')
      if (!win) {
        alert('Could not open report — please allow popups for this site.')
        return
      }
      win.document.write(html)
      win.document.close()
    } catch (err) {
      console.error('[ReportButton]', err)
      alert(`Report generation failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReport}
      disabled={loading || !domainRow}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px',
        background: 'rgba(0,223,120,0.08)', border: '0.5px solid rgba(0,223,120,0.25)',
        borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#00df78',
        cursor: loading || !domainRow ? 'not-allowed' : 'pointer',
        fontFamily: 'Syne, sans-serif',
        opacity: !domainRow ? 0.4 : 1,
        transition: 'all .15s',
        ...style,
      }}
    >
      <i className={`ti ${loading ? 'ti-loader' : 'ti-file-analytics'}`}
         style={{ fontSize: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }}
         aria-hidden="true" />
      {loading ? 'Generating…' : 'Get report'}
    </button>
  )
}
