import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../store/appStore'

export function useActiveDomain() {
  const { state } = useApp()
  const [domains, setDomains]               = useState([])
  const [activeDomainId, setActiveDomainId] = useState(null)
  const [loading, setLoading]               = useState(true)
  const loadedRef = useRef(false)   // prevent re-running on every render

  const userId = state.user?.id

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    if (loadedRef.current) return   // already loaded — don't loop
    loadDomains()
  }, [userId])  // only re-run when userId changes — NOT when loadDomains changes

  async function loadDomains() {
    loadedRef.current = true
    setLoading(true)

    // Retry up to 3 times for post-verification race condition
    for (let i = 0; i < 3; i++) {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'verified')
        .order('created_at', { ascending: true })

      if (error) { console.error('[useActiveDomain]', error.message); break }

      const list = data ?? []
      if (list.length > 0 || i === 2) {
        setDomains(list)
        const saved = localStorage.getItem(`cg_active_domain_${userId}`)
        const valid = list.find(d => d.id === saved)
        setActiveDomainId(valid?.id ?? list[0]?.id ?? null)
        setLoading(false)
        return
      }
      await new Promise(r => setTimeout(r, 800))
    }
    setLoading(false)
  }

  function switchDomain(domainId) {
    setActiveDomainId(domainId)
    if (userId) localStorage.setItem(`cg_active_domain_${userId}`, domainId)
  }

  // Exposed reload — resets the guard so it can fetch again
  function reload() {
    loadedRef.current = false
    loadDomains()
  }

  const activeDomain = domains.find(d => d.id === activeDomainId) ?? domains[0] ?? null

  return { domains, activeDomain, activeDomainId, switchDomain, loading, reload }
}
