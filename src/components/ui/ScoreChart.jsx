/**
 * ScoreChart — shows security score over time.
 * Uses recharts (already in package.json).
 * Reads scan history from Supabase via the /api/history endpoint.
 */
import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'

function scoreColor(score) {
  if (score >= 75) return '#00df78'
  if (score >= 60) return '#ffb627'
  return '#ff4757'
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const score = payload[0]?.value
  return (
    <div style={{ background: '#0f1420', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6b7789', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: scoreColor(score) }}>{score}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#3a4455' }}>/ 100</div>
    </div>
  )
}

export default function ScoreChart({ domainId, height = 140 }) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!domainId) { setLoading(false); return }
    loadHistory()
  }, [domainId])

  async function loadHistory() {
    setLoading(true)
    try {
      // Query scan_results directly from Supabase (RLS ensures only own data)
      const { data: rows, error: err } = await supabase
        .from('scan_results')
        .select('score, scanned_at')
        .eq('domain_id', domainId)
        .order('scanned_at', { ascending: true })
        .limit(90)

      if (err) { setError(err.message); return }

      const formatted = (rows ?? []).map(r => ({
        date:  new Date(r.scanned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        score: r.score ?? 0,
      }))
      setData(formatted)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3a4455' }}>
      Loading history…
    </div>
  )

  if (error) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#ff4757', padding: 16 }}>
      Could not load history: {error}
    </div>
  )

  if (data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3a4455' }}>
      No history yet — score chart will appear after your first scan
    </div>
  )

  if (data.length === 1) return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 700, color: scoreColor(data[0].score) }}>{data[0].score}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3a4455' }}>First scan — run more scans to see history chart</div>
    </div>
  )

  // Latest and oldest for delta
  const latest  = data[data.length - 1]?.score ?? 0
  const oldest  = data[0]?.score ?? 0
  const delta   = latest - oldest
  const deltaColor = delta > 0 ? '#00df78' : delta < 0 ? '#ff4757' : '#6b7789'
  const deltaStr = delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${delta} from first scan`

  return (
    <div>
      {/* Mini stats above chart */}
      <div style={{ display: 'flex', gap: 20, padding: '8px 14px 4px', alignItems: 'baseline' }}>
        <div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: scoreColor(latest) }}>{latest}</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3a4455', marginLeft: 4 }}>current</span>
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: deltaColor }}>
          {deltaStr}
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3a4455' }}>
          {data.length} scan{data.length !== 1 ? 's' : ''}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 14, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fill: '#3a4455' }}
            axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fill: '#3a4455' }}
            axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {/* Grade lines */}
          <ReferenceLine y={75} stroke="rgba(0,223,120,0.15)"  strokeDasharray="4 4" label={{ value: 'B', fill: '#3a4455', fontSize: 9 }} />
          <ReferenceLine y={60} stroke="rgba(255,182,39,0.15)" strokeDasharray="4 4" label={{ value: 'C', fill: '#3a4455', fontSize: 9 }} />
          <Line type="monotone" dataKey="score" stroke="#4fa6ff" strokeWidth={2}
            dot={{ fill: '#4fa6ff', strokeWidth: 0, r: 3 }}
            activeDot={{ fill: '#4fa6ff', r: 5, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
