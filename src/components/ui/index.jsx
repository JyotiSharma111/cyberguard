/**
 * Shared UI primitives — single source of truth for every reusable element.
 * All components are defensive: they handle null/undefined props gracefully.
 */
import React, { useState } from 'react'
import { sevColor, scoreColor, statusChip, safeArr } from '../../utils/helpers'

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label = '', value = '—', note = '', accent = 'bl' }) {
  const accentMap = { gr:'var(--gr)', am:'var(--am)', re:'var(--re)', bl:'var(--bl)', pu:'var(--pu)', tl:'var(--tl)' }
  const color = accentMap[accent] ?? 'var(--bl)'
  return (
    <div style={{ background:'var(--bg2)', border:'0.5px solid var(--b)', borderRadius:'var(--radius-lg)', padding:'12px 14px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:color, borderRadius:'2px 2px 0 0' }} />
      <div style={{ fontFamily:'var(--fm)', fontSize:9, color:'var(--t3)', letterSpacing:'.7px', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'var(--fh)', fontSize:24, fontWeight:700, lineHeight:1, color }}>{value}</div>
      {note && <div style={{ fontFamily:'var(--fm)', fontSize:9, color:'var(--t3)', marginTop:4 }}>{note}</div>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ title, titleIcon, badge, badgeType = 'bl', children, noPad = false }) {
  return (
    <div style={{ background:'var(--bg2)', border:'0.5px solid var(--b)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
      {(title || badge) && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'0.5px solid var(--b)' }}>
          {title && (
            <span style={{ fontSize:12, fontWeight:600, color:'var(--t)', display:'flex', alignItems:'center', gap:7 }}>
              {titleIcon && <i className={`ti ${titleIcon}`} style={{ fontSize:14, color:'var(--bl)' }} aria-hidden="true" />}
              {title}
            </span>
          )}
          {badge && <Chip label={badge} type={badgeType} />}
        </div>
      )}
      <div style={noPad ? {} : {}}>{children}</div>
    </div>
  )
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
export function Chip({ label = '', type = 'bl', pulse = false }) {
  const map = {
    ok:   { color:'var(--gr)', bg:'var(--gr-b)', border:'rgba(0,223,120,.18)' },
    warn: { color:'var(--am)', bg:'var(--am-b)', border:'rgba(255,182,39,.18)' },
    bad:  { color:'var(--re)', bg:'var(--re-b)', border:'rgba(255,71,87,.18)' },
    bl:   { color:'var(--bl)', bg:'var(--bl-b)', border:'rgba(79,166,255,.18)' },
    pu:   { color:'var(--pu)', bg:'var(--pu-b)', border:'rgba(167,139,250,.18)' },
    tl:   { color:'var(--tl)', bg:'var(--tl-b)', border:'rgba(0,207,170,.18)' },
  }
  const s = map[type] ?? map.bl
  return (
    <span style={{ fontFamily:'var(--fm)', fontSize:9, padding:'2px 8px', borderRadius:100, border:`0.5px solid ${s.border}`, background:s.bg, color:s.color, display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
      {pulse && <span className="pulse-dot" style={{ width:5, height:5, borderRadius:'50%', background:s.color, flexShrink:0 }} />}
      {label}
    </span>
  )
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────
export function ScoreBar({ label = '', score = 0, width = 120 }) {
  const color = scoreColor(score)
  const safeScore = Math.min(100, Math.max(0, Number(score) || 0))
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 14px' }}>
      <span style={{ fontSize:11, color:'var(--t2)', width:150, flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:4, background:'var(--bg4)', borderRadius:100, overflow:'hidden', maxWidth:width }}>
        <div style={{ width:`${safeScore}%`, height:'100%', background:color, borderRadius:100 }} />
      </div>
      <span style={{ fontFamily:'var(--fm)', fontSize:10, color, width:26, textAlign:'right', flexShrink:0 }}>{safeScore}</span>
    </div>
  )
}

// ─── IssueRow — expandable row with inline fix panel ─────────────────────────
export function IssueRow({ sev = 'low', name = '', tag = '', tagType = 'bl', fix = [], why = '', extra = null, issueId = null, issueTitle = null }) {
  const [open, setOpen] = useState(false)
  const fixes = safeArr(fix)
  const dotColor = sevColor(sev)

  return (
    <div style={{ borderBottom:'0.5px solid var(--b)' }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 14px', cursor:'pointer', transition:'background .1s', background: open ? 'var(--bg3)' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg3)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
        role="button"
        aria-expanded={open}
      >
        <span style={{ width:7, height:7, borderRadius:'50%', background:dotColor, flexShrink:0, display:'inline-block' }} />
        <span style={{ flex:1, fontSize:11.5, color:'var(--t)', lineHeight:1.4 }}>{name}</span>
        {tag && <Chip label={tag} type={tagType} />}
        <i className={`ti ti-chevron-right`} aria-hidden="true"
          style={{ fontSize:12, color:'var(--t3)', flexShrink:0, transform: open ? 'rotate(90deg)' : 'none', transition:'transform .2s' }} />
      </div>

      {/* Fix panel */}
      {open && (
        <div className="animate-fade-in" style={{ background:'var(--bg3)', borderTop:'0.5px solid var(--b)', padding:'10px 14px 12px 30px' }}>
          {why && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontFamily:'var(--fm)', fontSize:8, color:'var(--t3)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>Why it matters</div>
              <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.6 }}>{why}</div>
            </div>
          )}
          {fixes.length > 0 && (
            <div>
              <div style={{ fontFamily:'var(--fm)', fontSize:8, color:'var(--t3)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:6 }}>How to fix</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {fixes.map((step, i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ fontFamily:'var(--fm)', fontSize:9, color:'var(--gr)', background:'var(--gr-b)', border:'0.5px solid rgba(0,223,120,.18)', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</span>
                    {(() => {
                      const isCmd = step.startsWith('sudo') || step.includes('dig ') || step.includes('grep ') || step.startsWith('v=') || step.includes('certbot') || step.startsWith('curl') || step.startsWith('iptables')
                      return <span style={{ lineHeight:1.5, fontFamily: isCmd ? 'var(--fm)' : 'inherit', fontSize: isCmd ? 10 : 11, color: isCmd ? 'var(--tl)' : 'var(--t2)' }}>{step}</span>
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
          {extra}
          {/* Fix Wizard trigger */}
          {(issueId || issueTitle) && (
            <div style={{ marginTop: fixes.length > 0 ? 8 : 0 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const evt = new CustomEvent('openFixWizard', { detail: { id: issueId, title: issueTitle ?? name, fix, sev } })
                  window.dispatchEvent(evt)
                }}
                style={{ fontFamily:'var(--fm)', fontSize:9, color:'#4fa6ff', background:'rgba(79,166,255,0.08)', border:'0.5px solid rgba(79,166,255,0.2)', borderRadius:5, padding:'3px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <i className="ti ti-wand" style={{ fontSize:9 }} aria-hidden="true"/>
                Step-by-step fix wizard →
              </button>
            </div>
          )}
          {fixes.length === 0 && !why && (
            <div style={{ fontSize:11, color:'var(--gr)', fontFamily:'var(--fm)' }}>No action required — all checks passing.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SectionGrid ──────────────────────────────────────────────────────────────
export function Grid({ cols = 4, gap = 10, children }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`, gap }}>
      {children}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, color = 'var(--bl)', height = 4 }) {
  const safe = Math.min(100, Math.max(0, Number(value) || 0))
  return (
    <div style={{ flex:1, height, background:'var(--bg4)', borderRadius:100, overflow:'hidden' }}>
      <div style={{ width:`${safe}%`, height:'100%', background:color, borderRadius:100 }} />
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'ti-circle-check', msg = 'No issues found' }) {
  return (
    <div style={{ padding:'24px 14px', textAlign:'center', color:'var(--t3)', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <i className={`ti ${icon}`} style={{ fontSize:28 }} aria-hidden="true" />
      <span style={{ fontSize:12, fontFamily:'var(--fm)' }}>{msg}</span>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ msg = '', type = 'bl', onClose }) {
  const map = { ok:'var(--gr)', warn:'var(--am)', bad:'var(--re)', bl:'var(--bl)' }
  const color = map[type] ?? 'var(--bl)'
  return (
    <div style={{ position:'fixed', bottom:20, right:20, zIndex:999, background:'var(--bg3)', border:`0.5px solid ${color}44`, borderRadius:'var(--radius-lg)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, maxWidth:360, boxShadow:'0 4px 24px rgba(0,0,0,.4)' }}>
      <span style={{ fontSize:12, color:'var(--t)', flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--t3)', fontSize:16, lineHeight:1, padding:0 }} aria-label="Close">✕</button>
    </div>
  )
}

export { default as FixWizard } from './FixWizard'

export { default as UpgradePrompt } from './UpgradePrompt'
