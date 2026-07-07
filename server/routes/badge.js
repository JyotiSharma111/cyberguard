import express from 'express'
import { getSupabase } from '../lib/supabaseServer.js'
const router = express.Router()
function gradeColor(s){if(s>=90)return{fill:'#059669',grade:'A'};if(s>=75)return{fill:'#0284c7',grade:'B'};if(s>=60)return{fill:'#d97706',grade:'C'};if(s>=40)return{fill:'#dc2626',grade:'D'};return{fill:'#991b1b',grade:'F'}}
function scoreGrade(s){if(s>=90)return'A';if(s>=75)return'B';if(s>=60)return'C';if(s>=40)return'D';return'F'}
router.get('/:domain',async(req,res)=>{
  const domain=req.params.domain.toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'')
  const sb=getSupabase()
  try{
    const{data:d}=await sb.from('domains').select('id,name,verified_at').eq('name',domain).maybeSingle()
    if(!d)return res.json({ok:false,error:'Domain not found',verified:false})
    const{data:scan}=await sb.from('scan_results').select('score,scanned_at,issues').eq('domain_id',d.id).order('scanned_at',{ascending:false}).limit(1).maybeSingle()
    if(!scan)return res.json({ok:false,error:'No scan data',verified:false})
    const score=scan.score??0,issues=scan.issues??[]
    res.json({ok:true,domain:d.name,verified:!!d.verified_at,score,grade:scoreGrade(score),criticalCount:issues.filter(i=>i.sev==='critical').length,highCount:issues.filter(i=>i.sev==='high').length,scannedAt:scan.scanned_at?new Date(scan.scanned_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—',verifyUrl:`${process.env.FRONTEND_URL??'https://cyberguard.visull.com'}/verify/${domain}`})
  }catch(e){res.status(500).json({ok:false,error:e.message})}
})
router.get('/:domain/svg',async(req,res)=>{
  const domain=req.params.domain.toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'')
  const style=req.query.style??'full',sb=getSupabase()
  res.setHeader('Content-Type','image/svg+xml')
  res.setHeader('Cache-Control','public, max-age=3600')
  res.setHeader('Access-Control-Allow-Origin','*')
  try{
    const{data:d}=await sb.from('domains').select('id,verified_at').eq('name',domain).maybeSingle()
    if(!d?.verified_at)return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56"><rect width="200" height="56" rx="10" fill="#1f2937"/><text x="100" y="32" font-family="system-ui" font-size="11" fill="#6b7280" text-anchor="middle">Not verified by CyberGuard</text></svg>`)
    const{data:scan}=await sb.from('scan_results').select('score,scanned_at').eq('domain_id',d.id).order('scanned_at',{ascending:false}).limit(1).maybeSingle()
    const score=scan?.score??0,{fill,grade}=gradeColor(score),dt=scan?.scanned_at?new Date(scan.scanned_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'
    if(style==='mini')return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="36"><rect width="90" height="36" rx="7" fill="#0f1420" stroke="${fill}" stroke-width="1"/><rect width="36" height="36" rx="7" fill="${fill}"/><text x="18" y="24" font-family="system-ui" font-size="16" font-weight="700" fill="white" text-anchor="middle">${grade}</text><text x="63" y="14" font-family="system-ui" font-size="9" fill="#9ca3af" text-anchor="middle">Security</text><text x="63" y="27" font-family="system-ui" font-size="13" font-weight="700" fill="white" text-anchor="middle">${score}/100</text></svg>`)
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#0a1628"/><stop offset="100%" stop-color="#0f2040"/></linearGradient></defs><rect width="200" height="56" rx="10" fill="url(#bg)" stroke="${fill}" stroke-width="1" stroke-opacity="0.6"/><circle cx="32" cy="28" r="18" fill="${fill}"/><text x="32" y="34" font-family="system-ui" font-size="18" font-weight="700" fill="white" text-anchor="middle">${grade}</text><text x="62" y="20" font-family="system-ui" font-size="9" fill="#9ca3af">🛡 CyberGuard</text><text x="62" y="36" font-family="system-ui" font-size="15" font-weight="700" fill="white">${score}<tspan font-size="10" fill="#6b7280">/100</tspan></text><circle cx="170" cy="16" r="4" fill="#00df78" opacity="0.9"/><circle cx="170" cy="16" r="7" fill="#00df78" opacity="0.3"><animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/></circle><text x="110" y="49" font-family="system-ui" font-size="8" fill="#3a4455" text-anchor="middle">Scanned ${dt}</text></svg>`)
  }catch(e){res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56"><rect width="200" height="56" rx="10" fill="#1f2937"/><text x="100" y="32" font-family="system-ui" font-size="11" fill="#6b7280" text-anchor="middle">Badge unavailable</text></svg>`)}
})
router.get('/:domain/verify',async(req,res)=>{
  const domain=req.params.domain.toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'')
  const sb=getSupabase()
  try{
    const{data:d}=await sb.from('domains').select('id,name,verified_at').eq('name',domain).maybeSingle()
    const{data:scan}=d?(await sb.from('scan_results').select('score,scanned_at,issues').eq('domain_id',d.id).order('scanned_at',{ascending:false}).limit(1).maybeSingle()):{data:null}
    const score=scan?.score??0,issues=scan?.issues??[],{fill,grade}=gradeColor(score)
    const critical=issues.filter(i=>i.sev==='critical').length,high=issues.filter(i=>i.sev==='high').length
    const scannedAt=scan?.scanned_at?new Date(scan.scanned_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}):'—'
    const verified=!!d?.verified_at,gl=score>=90?'Advanced':score>=75?'Good':score>=60?'Intermediate':score>=40?'Basic':'High Risk'
    res.setHeader('Content-Type','text/html')
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${domain} — CyberGuard Verification</title><style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;background:#080b10;color:#dde2ed;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#0f1420;border:1px solid rgba(255,255,255,.07);border-radius:16px;max-width:480px;width:100%;overflow:hidden}.hdr{background:linear-gradient(135deg,#0a1628,#0f2040);padding:32px;text-align:center;border-bottom:1px solid rgba(255,255,255,.06)}.badge{display:inline-flex;align-items:center;gap:8px;background:rgba(0,223,120,.08);border:1px solid rgba(0,223,120,.2);border-radius:100px;padding:6px 16px;font-size:12px;color:#00df78;margin-bottom:20px}.dot{width:8px;height:8px;border-radius:50%;background:#00df78;animation:pulse 2s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px}.row:last-child{border-bottom:none}</style></head><body><div class="card"><div class="hdr"><div class="badge"><span class="dot"></span>${verified?'Live Verified':'Not Verified'}</div><div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;word-break:break-all">${domain}</div>${verified&&scan?`<div style="width:72px;height:72px;border-radius:50%;background:${fill};display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:white;margin:20px auto 8px">${grade}</div><div style="font-size:28px;font-weight:700;color:#fff">${score}<span style="font-size:16px;color:#6b7280">/100</span></div><div style="font-size:12px;color:#6b7280;margin-top:4px">Security Score</div>`:`<div style="color:#ff4757;font-size:13px;margin-top:8px">This domain has not been verified by CyberGuard</div>`}</div>${verified&&scan?`<div style="padding:24px"><div class="row"><span style="color:#6b7280">Domain</span><span style="font-weight:600">${domain}</span></div><div class="row"><span style="color:#6b7280">Grade</span><span style="font-weight:600;color:${fill}">${grade} — ${gl}</span></div><div class="row"><span style="color:#6b7280">Critical issues</span><span style="font-weight:600;color:${critical>0?'#ff4757':'#00df78'}">${critical===0?'✓ None':critical}</span></div><div class="row"><span style="color:#6b7280">High issues</span><span style="font-weight:600;color:${high>0?'#ffb627':'#00df78'}">${high===0?'✓ None':high}</span></div><div class="row"><span style="color:#6b7280">Last scanned</span><span style="font-weight:600">${scannedAt}</span></div><div class="row"><span style="color:#6b7280">Monitored by</span><span style="font-weight:600">🛡 CyberGuard</span></div></div>`:''}<div style="padding:16px 24px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.05);text-align:center;font-size:11px;color:#3a4455">Verified by <a href="https://cyberguard.visull.com" style="color:#4fa6ff;text-decoration:none">CyberGuard</a> · <a href="https://cyberguard.visull.com" style="color:#4fa6ff;text-decoration:none">Scan free →</a></div></div></body></html>`)
  }catch(e){res.status(500).send('Verification unavailable')}
})
export default router
