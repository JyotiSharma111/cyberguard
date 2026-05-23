/**
 * FixWizard — provider-specific fix steps shown in a modal/drawer.
 * Called when user clicks "Fix this" on any issue.
 */
import React, { useState } from 'react'
import { PROVIDERS, getFixGuide } from '../../lib/fixWizard'

export default function FixWizard({ issue, onClose }) {
  const [providerId, setProviderId] = useState('cloudflare')

  if (!issue) return null

  const guide = getFixGuide(issue.id ?? issue.title ?? '', providerId)

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999,
      display:'flex', alignItems:'flex-end', justifyContent:'center',
      backdropFilter:'blur(4px)',
    }} onClick={onClose} aria-modal="true" role="dialog" aria-label="Fix wizard">
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'#111827', border:'0.5px solid rgba(255,255,255,0.1)',
          borderRadius:'16px 16px 0 0', width:'100%', maxWidth:640,
          maxHeight:'85vh', overflow:'auto', padding:'24px',
        }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>
              Fix wizard
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:'#dde2ed', lineHeight:1.3 }}>
              {issue.title ?? issue.name}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:'none', border:'none', color:'#6b7789', cursor:'pointer', fontSize:20, padding:'0 4px', lineHeight:1 }}
            aria-label="Close fix wizard">×</button>
        </div>

        {/* What and why */}
        {guide?.what && (
          <div style={{ background:'rgba(79,166,255,0.06)', border:'0.5px solid rgba(79,166,255,0.15)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#6b7789', lineHeight:1.6 }}>
            {guide.what}
          </div>
        )}

        {/* Provider picker */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', marginBottom:8 }}>
            Who manages your DNS / hosting?
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => setProviderId(p.id)}
                style={{
                  display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
                  borderRadius:7, fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace',
                  background: providerId===p.id ? `${p.color}14` : 'rgba(255,255,255,0.04)',
                  border: `0.5px solid ${providerId===p.id ? p.color : 'rgba(255,255,255,0.08)'}`,
                  color: providerId===p.id ? p.color : '#6b7789',
                  transition: 'all .1s',
                }}>
                <i className={`ti ${p.icon}`} style={{ fontSize:11 }} aria-hidden="true"/>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {guide ? (
          <>
            {/* Record to add (for DNS issues) */}
            {guide.record && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', marginBottom:6 }}>
                  Record to add
                </div>
                <div style={{ background:'#080b10', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#00df78', lineHeight:1.8, wordBreak:'break-all' }}>
                  {guide.record}
                </div>
                {guide.recordNote && (
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', marginTop:6, lineHeight:1.6 }}>
                    💡 {guide.recordNote}
                  </div>
                )}
              </div>
            )}

            {/* Step-by-step */}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455' }}>
                  Steps for {PROVIDERS.find(p=>p.id===providerId)?.label}
                </div>
                {guide.provider?.time && (
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#00df78', background:'rgba(0,223,120,0.08)', border:'0.5px solid rgba(0,223,120,0.2)', padding:'2px 8px', borderRadius:100 }}>
                    ~{guide.provider.time}
                  </span>
                )}
              </div>

              {guide.provider?.steps?.map((step, i) => (
                <div key={i} style={{ display:'flex', gap:10, marginBottom:10 }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    background:'rgba(79,166,255,0.1)', border:'0.5px solid rgba(79,166,255,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#4fa6ff',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize:12, color:'#dde2ed', lineHeight:1.6, paddingTop:2 }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>

            {/* Open provider link */}
            {guide.provider?.url && (
              <a href={guide.provider.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  padding:'10px', borderRadius:8, fontSize:12, fontWeight:600, textDecoration:'none',
                  background: `${PROVIDERS.find(p=>p.id===providerId)?.color}14`,
                  border: `0.5px solid ${PROVIDERS.find(p=>p.id===providerId)?.color}33`,
                  color: PROVIDERS.find(p=>p.id===providerId)?.color,
                }}>
                <i className="ti ti-external-link" style={{ fontSize:12 }} aria-hidden="true"/>
                Open {PROVIDERS.find(p=>p.id===providerId)?.label}
              </a>
            )}
          </>
        ) : (
          <div style={{ padding:'20px 0', textAlign:'center', fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'#3a4455' }}>
            No provider-specific guide for this issue yet.<br/>
            <span style={{ color:'#4fa6ff' }}>Check the fix steps in the issue detail above.</span>
          </div>
        )}

        {/* Verify button */}
        <div style={{ marginTop:16, paddingTop:16, borderTop:'0.5px solid rgba(255,255,255,0.06)', fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#3a4455', textAlign:'center' }}>
          After making changes → run a new scan from the top bar to verify the fix
        </div>
      </div>
    </div>
  )
}
