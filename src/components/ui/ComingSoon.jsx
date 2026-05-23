/**
 * ComingSoon — shown on pages that don't have real data yet.
 * Honest, clear, not confusing. Better than showing fake data.
 */
import React from 'react'

export default function ComingSoon({ icon = 'ti-clock', title, description, bullets = [] }) {
  return (
    <div style={{
      margin: '40px auto', maxWidth: 480, textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'rgba(79,166,255,0.07)', border: '0.5px solid rgba(79,166,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 24, color: '#4fa6ff' }} aria-hidden="true" />
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#dde2ed', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: '#6b7789', lineHeight: 1.7, maxWidth: 380 }}>
          {description}
        </div>
      </div>

      {bullets.length > 0 && (
        <div style={{
          background: '#0f1420', border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: 10, padding: '12px 16px', textAlign: 'left', width: '100%'
        }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#3a4455', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            What this will show
          </div>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: '#6b7789', padding: '3px 0', lineHeight: 1.5 }}>
              <span style={{ color: '#4fa6ff', flexShrink: 0 }}>→</span>
              {b}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3a4455' }}>
        Phase 2 feature — coming soon
      </div>
    </div>
  )
}
