/**
 * Documents — IRP + AUP generator.
 * Incident Response Plan + Acceptable Use Policy generator.
 */
import React, { useState } from 'react'
import { Card, Grid, StatCard } from '../components/ui'
import { useApp } from '../store/appStore'
import { useScanData } from '../hooks/useScanData'

export default function Documents() {
  const { state } = useApp()
  const { domainName, domainRow } = useScanData()

  const [form, setForm] = useState({
    orgName:      state.profile?.org_name ?? '',
    domain:       domainName ?? '',
    contactName:  '',
    contactEmail: state.user?.email ?? '',
    contactPhone: '',
  })
  const [generating, setGenerating] = useState(null)

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function generate(type) {
    setGenerating(type)
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? ''
      const res  = await fetch(`${apiBase}/api/documents/${type}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, domain: form.domain || domainName })
      })
      const json = await res.json()
      if (json.ok && json.html) {
        const win = window.open('', '_blank')
        if (win) { win.document.write(json.html); win.document.close() }
        else alert('Allow popups to open the document')
      } else {
        alert(json.error ?? 'Generation failed — is the server running?')
      }
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setGenerating(null)
  }

  const DOCS = [
    {
      id:    'irp',
      title: 'Incident Response Plan',
      icon:  'ti-fire-extinguisher',
      color: '#ff4757',
      desc:  'A customised, professional Incident Response Plan covering ransomware, account takeover, data breach, and DDoS responses. Pre-filled with your organisation details. Ready to sign and file.',
      pages: '~6 pages',
      what:  ['P1-P4 incident classification matrix', 'Response team and contact directory', 'Step-by-step procedures for 4 incident types', 'Communication plan (staff, customers, regulator)', 'Post-incident review template', 'Signature page'],
    },
    {
      id:    'aup',
      title: 'Acceptable Use Policy',
      icon:  'ti-file-check',
      color: '#4fa6ff',
      desc:  'A comprehensive Technology Acceptable Use Policy covering passwords, email, internet use, devices, cloud services, remote working, and social media. Ready to sign and distribute to staff.',
      pages: '~4 pages',
      what:  ['Password and account security rules', 'Email and internet use guidelines', 'Device security requirements', 'Remote working policy', 'Prohibited activities list', 'Staff acknowledgement signature page'],
    },
  ]

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:12, padding:16 }}>
      <Grid cols={3} gap={10}>
        <StatCard label="Documents available" value="2"   note="IRP + AUP" accent="bl" />
        <StatCard label="Generation time"     value="<5s" note="Instant PDF"  accent="gr" />
        <StatCard label="Cost"                value="$0"  note="Included"     accent="gr" />
      </Grid>

      {/* Org details form */}
      <div style={{ background:'#0f1420', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'14px 16px' }}>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#6b7789', marginBottom:10 }}>Your details — pre-filled into every document</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            ['Organisation name', 'orgName',      'text',  'Acme Ltd'],
            ['Domain',            'domain',        'text',  'yourdomain.com'],
            ['Security contact',  'contactName',   'text',  'Jane Smith'],
            ['Contact email',     'contactEmail',  'email', 'security@yourdomain.com'],
            ['Contact phone',     'contactPhone',  'tel',   '+44 7700 900000'],
          ].map(([label, key, type, placeholder]) => (
            <div key={key}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginBottom:4 }}>{label}</div>
              <input value={form[key]} onChange={e => set(key, e.target.value)}
                type={type} placeholder={placeholder}
                style={{ width:'100%', background:'#161c2a', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', fontSize:11, color:'#dde2ed', outline:'none', fontFamily:'IBM Plex Mono,monospace' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Document cards */}
      {DOCS.map(doc => (
        <Card key={doc.id} title={doc.title} titleIcon={doc.icon}>
          <div style={{ padding:'14px' }}>
            <div style={{ fontSize:12, color:'#6b7789', lineHeight:1.7, marginBottom:12 }}>{doc.desc}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.8px' }}>What's included</div>
                {doc.what.map(w => (
                  <div key={w} style={{ display:'flex', gap:6, fontSize:11, color:'#6b7789', marginBottom:4 }}>
                    <span style={{ color:'#00df78', flexShrink:0 }}>✓</span>{w}
                  </div>
                ))}
              </div>
              <div style={{ background:'rgba(255,255,255,0.02)', border:`0.5px solid ${doc.color}22`, borderRadius:8, padding:'12px', display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'#3a4455', textTransform:'uppercase', letterSpacing:'0.8px' }}>Document info</div>
                <div style={{ fontSize:11, color:'#6b7789' }}>📄 {doc.pages} · Professional format</div>
                <div style={{ fontSize:11, color:'#6b7789' }}>🖨 Print-ready PDF via browser</div>
                <div style={{ fontSize:11, color:'#6b7789' }}>✍️ Signature page included</div>
                <div style={{ fontSize:11, color:'#6b7789' }}>📅 Review annually</div>
              </div>
            </div>
            <button onClick={() => generate(doc.id)} disabled={generating === doc.id}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', background:`${doc.color}10`, border:`0.5px solid ${doc.color}33`, borderRadius:8, fontSize:12, fontWeight:600, color:doc.color, cursor:'pointer', fontFamily:'Syne,sans-serif', opacity:generating===doc.id?.7:1 }}>
              <i className={`ti ${generating===doc.id?'ti-loader':'ti-file-download'}`} style={{ fontSize:13, animation:generating===doc.id?'spin 1s linear infinite':'none' }} aria-hidden="true"/>
              {generating === doc.id ? 'Generating…' : `Generate ${doc.title}`}
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}
