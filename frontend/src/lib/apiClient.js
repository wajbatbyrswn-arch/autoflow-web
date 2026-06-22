import { supabase } from './supabaseClient'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

async function authHeader() {
  try {
    // getSession() can hang if supabase-js gets stuck refreshing a stale token.
    // Race it with a timeout so a request never blocks forever.
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('session-timeout')), 7000)),
    ])
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
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
