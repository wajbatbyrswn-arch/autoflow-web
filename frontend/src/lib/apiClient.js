import { supabase } from './supabaseClient'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * RPC call mirroring Electron IPC channels.
 * channel e.g. "db:getProducts", payload = the single argument the handler expects.
 */
export async function rpc(channel, payload) {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  let res
  try {
    res = await fetch(`${BACKEND_URL}/api/rpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ channel, payload }),
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    let msg = res.statusText
    try { msg = (await res.json()).error || msg } catch {}
    throw new Error(msg)
  }
  const json = await res.json()
  return json.result
}

export { BACKEND_URL }
