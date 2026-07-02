import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { rpc } from '../lib/apiClient'
import { useT } from '../lib/i18n'

const WHATSAPP_LINK = 'https://wa.me/962770748793'
const FACEBOOK_LINK = 'https://www.facebook.com/profile.php?id=61585073873212&locale=ar_AR'
const INSTAGRAM_LINK = 'https://www.instagram.com/auto_flowran/'

export default function Activate({ onActivated, embedded = false }) {
  const { t } = useT()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function activate(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const result = await rpc('activation:activate', { code: code.trim() })
      if (result?.success) onActivated?.()
    } catch (err) {
      setError(err.message || t('كود غير صحيح'))
    }
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    location.reload()
  }

  const body = (
    <div style={styles.card}>
      <h1 style={styles.title}>{t('تنشيط الحساب')}</h1>
      <p style={styles.sub}>
        {t('لتنشيط الحساب يجب وضع الكود.')}
        <br/>
        <span style={{fontSize:12, opacity:.85}}>
          {t('تواصل معنا لتنشيط الحساب حسب الخطة المختارة.')}
        </span>
      </p>
      <form onSubmit={activate} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder={t('ادخل كود التفعيل (20 رمز)')}
          maxLength={24}
          dir="ltr"
          style={styles.input}
          autoComplete="off"
        />
        {error && <p style={styles.err}>{error}</p>}
        <button type="submit" disabled={loading || code.length < 8} style={styles.btn}>
          {loading ? t('جارٍ التفعيل...') : t('تفعيل')}
        </button>
      </form>

      <div style={styles.divider}>{t('أو')}</div>

      <div style={{display:'flex', flexDirection:'column', gap:8, width:'100%'}}>
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" style={{...styles.contactBtn, background:'#25D366'}}>
          {t('تواصل عبر واتساب')}
        </a>
        <div style={{display:'flex', gap:8}}>
          <a href={FACEBOOK_LINK} target="_blank" rel="noreferrer" style={{...styles.contactBtn, background:'#1877F2', flex:1}}>{t('فيسبوك')}</a>
          <a href={INSTAGRAM_LINK} target="_blank" rel="noreferrer" style={{...styles.contactBtn, background:'#E4405F', flex:1}}>{t('إنستغرام')}</a>
        </div>
      </div>

      {!embedded && (
        <button onClick={logout} style={styles.logout}>{t('تسجيل الخروج')}</button>
      )}
    </div>
  )

  if (embedded) return body
  return <div style={styles.wrap}>{body}</div>
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f1115)', fontFamily: 'Cairo, sans-serif', padding: 16 },
  card: { background: 'var(--bg-card, #1a1d24)', border: '1px solid var(--border-color, #2a2e37)', borderRadius: 20, padding: 32, width: 420, maxWidth:'100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  title: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #fff)', margin: 0 },
  sub: { color: 'var(--text-secondary, #9aa0ac)', margin: 0, fontSize: 14, textAlign: 'center', lineHeight:1.8 },
  input: { textAlign: 'center', fontSize: 14, letterSpacing: 2, fontFamily: 'monospace', padding: 12, borderRadius: 12, border: '1px solid var(--border-color, #2a2e37)', background: 'var(--bg-main, #0f1115)', color: 'var(--text-primary, #fff)' },
  btn: { background: 'var(--accent, #6C47FF)', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' },
  err: { color: '#ff5c5c', fontSize: 13, textAlign: 'center', margin: 0 },
  logout: { background: 'none', border: 'none', color: 'var(--text-secondary, #9aa0ac)', fontSize: 13, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', marginTop: 4 },
  divider: { width:'100%', textAlign:'center', position:'relative', fontSize:12, color:'var(--text-muted)', margin:'4px 0' },
  contactBtn: { textAlign:'center', textDecoration:'none', color:'#fff', padding:'10px 14px', borderRadius:12, fontWeight:700, fontSize:13, fontFamily:'Cairo, sans-serif' },
}
