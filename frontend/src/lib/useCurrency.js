import { useState, useEffect } from 'react'

let cached = null
const listeners = new Set()

export async function refreshCurrency() {
  try {
    const cfg = await window.api?.db.getStoreConfig() || {}
    cached = cfg.currency || 'JOD'
  } catch { cached = 'JOD' }
  listeners.forEach(fn => fn(cached))
  return cached
}

export function useCurrency() {
  const [cur, setCur] = useState(cached || 'JOD')
  useEffect(() => {
    const fn = (v) => setCur(v)
    listeners.add(fn)
    if (cached == null) refreshCurrency()
    else setCur(cached)
    return () => { listeners.delete(fn) }
  }, [])
  return cur
}
