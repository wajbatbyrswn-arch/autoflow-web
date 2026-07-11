import React, { useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Landing from './auth/Landing'
import Activate from './auth/Activate'
import { useT } from './lib/i18n'
import { installWebApi } from './lib/webApi'
import { supabase } from './lib/supabaseClient'
import { rpc } from './lib/apiClient'
import { I18nProvider } from './lib/i18n'
import './styles/globals.css'

// Make window.api available before any page mounts.
installWebApi()

function Screen({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f1115)', color: 'var(--text-secondary, #9aa0ac)', fontFamily: 'Cairo, sans-serif', flexDirection: 'column', gap: 16 }}>
      {children}
    </div>
  )
}

/** Compute remaining ms in the 24-hour discount window. Returns 0 if expired. */
function discountRemaining(createdAt) {
  if (!createdAt) return 0
  const ms = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now()
  return ms > 0 ? ms : 0
}

/** Format ms to "HH:SS:MM" */
function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Welcome Discount Popup – appears once per session for accounts < 24 hours old. */
function WelcomeDiscountPopup({ createdAt, onClose }) {
  const [remaining, setRemaining] = useState(() => discountRemaining(createdAt))

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => {
      const r = discountRemaining(createdAt)
      setRemaining(r)
      if (r <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [createdAt])

  if (remaining <= 0) return null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20,
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(135deg, #1a1d24 0%, #1e2330 100%)',
        border: '2px solid rgba(108,71,255,0.5)',
        borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440,
        color: '#fff', fontFamily: 'Cairo, sans-serif', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(108,71,255,0.25), 0 0 80px rgba(108,71,255,0.1)',
        animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px', background: 'linear-gradient(135deg, #6C47FF, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          عرض ترحيبي خاص!
        </h2>
        <p style={{ fontSize: 14, color: '#9aa0ac', margin: '0 0 20px', lineHeight: 1.7 }}>
          مرحباً بك في AutoFlow Chat! احصل على خصم خاص لأول شهر
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 18, color: '#9aa0ac', textDecoration: 'line-through', opacity: 0.6 }}>40 د.أ</span>
          <span style={{ fontSize: 52, fontWeight: 900, color: '#6C47FF' }}>30</span>
          <span style={{ fontSize: 16, color: '#9aa0ac' }}>د.أ / الشهر الأول</span>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(108,71,255,0.12)', border: '1px solid rgba(108,71,255,0.3)',
          borderRadius: 12, padding: '8px 20px', margin: '12px 0 20px',
        }}>
          <span style={{ fontSize: 13, color: '#a78bfa' }}>⏳ ينتهي العرض خلال</span>
          <span style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#fff', letterSpacing: 2 }}>
            {fmtCountdown(remaining)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 20px', borderRadius: 12,
            background: 'var(--accent, #6C47FF)', color: '#fff', border: 'none',
            fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
            boxShadow: '0 4px 15px rgba(108,71,255,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.03)'; e.target.style.boxShadow = '0 6px 20px rgba(108,71,255,0.5)' }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 4px 15px rgba(108,71,255,0.4)' }}
          >
            اشترك الآن بالعرض ←
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#666', marginTop: 12 }}>
          * العرض صالح لمدة 24 ساعة فقط من لحظة إنشاء الحساب
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.9) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  )
}

function Gate() {
  const { t } = useT()
  const [session, setSession] = useState(undefined) // undefined = loading
  const [sub, setSub] = useState(null) // null = unknown, then status object
  const [subError, setSubError] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      // Only react to real sign-in/out. TOKEN_REFRESHED / focus events must NOT
      // reset the subscription check (that caused the "checking subscription" flash).
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        setSession(s)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function refreshStatus(retries = 4) {
    setSub(null); setSubError(false)
    rpc('activation:status')
      .then(profile => {
        setSub(profile)
        // Show discount popup once per session for new users (< 24h)
        if (profile?.created_at && discountRemaining(profile.created_at) > 0) {
          const key = `discount_shown_${profile.user_id}`
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1')
            setShowDiscount(true)
          }
        }
      })
      .catch(() => {
        if (retries > 0) setTimeout(() => refreshStatus(retries - 1), 2500)
        else setSubError(true)
      })
  }

  // Re-check only when the logged-in user actually changes (not on token refresh).
  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) return
    refreshStatus()
  }, [uid])

  if (session === undefined) return <Screen>{t('جارٍ التحميل...')}</Screen>
  if (!session) return <Landing />

  if (subError) {
    return (
      <Screen>
        <p>{t('تعذّر الاتصال بالخادم')}</p>
        <button onClick={refreshStatus}
          style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'var(--accent,#6C47FF)', color: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
          {t('إعادة المحاولة')}
        </button>
      </Screen>
    )
  }

  if (sub === null) return (
    <Screen>
      <p>{t('جارٍ التحقق من الاشتراك...')}</p>
      <button onClick={async () => { try { await supabase.auth.signOut() } catch {}; localStorage.clear(); location.reload() }}
        style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--text-secondary,#9aa0ac)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Cairo, sans-serif' }}>
        {t('تأخّر التحميل؟ إعادة تعيين الجلسة')}
      </button>
    </Screen>
  )

  // Inactive users still enter the app in preview mode (read-only),
  // with a top banner + locked actions. They click "اشترك" to open Plans/Activate.
  return (
    <>
      <App profile={sub} onSubscriptionChange={() => rpc('activation:status').then(setSub)} />
      {showDiscount && sub?.created_at && (
        <WelcomeDiscountPopup
          createdAt={sub.created_at}
          onClose={() => setShowDiscount(false)}
        />
      )}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <Gate />
    </I18nProvider>
  </React.StrictMode>
)

