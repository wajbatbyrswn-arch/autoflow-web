import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { rpc } from '../lib/apiClient'

export default function Activate({ onActivated }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function activate(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const result = await rpc('activation:activate', { code })
      if (result?.success) onActivated?.()
    } catch (err) {
      setError(err.message || 'كود غير صحيح')
    }
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    location.reload()
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>تفعيل الاشتراك</h1>
        <p style={styles.sub}>أدخل كود التفعيل الذي حصلت عليه من فريق AutoFlow</p>
        <form onSubmit={activate} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            maxLength={8}
            style={styles.input}
          />
          {error && <p style={styles.err}>{error}</p>}
          <button type="submit" disabled={loading || code.length < 6} style={styles.btn}>
            {loading ? 'جارٍ التفعيل...' : 'تفعيل'}
          </button>
        </form>
        <button onClick={logout} style={styles.logout}>تسجيل الخروج</button>
      </div>
    </div>
  )
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f1115)', fontFamily: 'Cairo, sans-serif' },
  card: { background: 'var(--bg-card, #1a1d24)', border: '1px solid var(--border-color, #2a2e37)', borderRadius: 20, padding: 40, width: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  title: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #fff)', margin: 0 },
  sub: { color: 'var(--text-secondary, #9aa0ac)', margin: 0, fontSize: 14, textAlign: 'center' },
  input: { textAlign: 'center', fontSize: 22, letterSpacing: 6, fontFamily: 'monospace', padding: 12, borderRadius: 12, border: '1px solid var(--border-color, #2a2e37)', background: 'var(--bg-main, #0f1115)', color: 'var(--text-primary, #fff)' },
  btn: { background: 'var(--accent, #6C47FF)', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' },
  err: { color: '#ff5c5c', fontSize: 13, textAlign: 'center', margin: 0 },
  logout: { background: 'none', border: 'none', color: 'var(--text-secondary, #9aa0ac)', fontSize: 13, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' },
}
