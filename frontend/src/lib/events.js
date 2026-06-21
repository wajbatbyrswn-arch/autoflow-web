import { supabase } from './supabaseClient'
import { BACKEND_URL } from './apiClient'

// Simple event bus fed by a backend SSE stream.
// Channels mirror the Electron push events (e.g. "whatsapp:qr", "webhook:event").
const listeners = new Map() // channel -> Set<cb>
let es = null

function dispatch(channel, data) {
  const set = listeners.get(channel)
  if (set) set.forEach(cb => { try { cb(data) } catch (e) { console.error(e) } })
}

async function ensureStream() {
  if (es) return
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return
  es = new EventSource(`${BACKEND_URL}/api/events?token=${encodeURIComponent(token)}`)
  es.onmessage = (ev) => {
    try {
      const { channel, data } = JSON.parse(ev.data)
      dispatch(channel, data)
    } catch {}
  }
  es.onerror = () => { es?.close(); es = null; setTimeout(ensureStream, 5000) }
}

export function on(channel, cb) {
  if (!listeners.has(channel)) listeners.set(channel, new Set())
  listeners.get(channel).add(cb)
  ensureStream()
  return () => listeners.get(channel)?.delete(cb)
}

export function removeAll(channel) {
  listeners.delete(channel)
}
