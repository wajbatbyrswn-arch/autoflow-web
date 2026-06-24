import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Landing from './auth/Landing'
import Activate from './auth/Activate'
import { installWebApi } from './lib/webApi'
import { supabase } from './lib/supabaseClient'
import { rpc } from './lib/apiClient'
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

function Gate() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [sub, setSub] = useState(null) // null = unknown, then status object
  const [subError, setSubError] = useState(false)

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
      .then(setSub)
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

  if (session === undefined) return <Screen>جارٍ التحميل...</Screen>
  if (!session) return <Landing />

  if (subError) {
    return (
      <Screen>
        <p>تعذّر الاتصال بالخادم</p>
        <button onClick={refreshStatus}
          style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'var(--accent,#6C47FF)', color: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
          إعادة المحاولة
        </button>
      </Screen>
    )
  }

  if (sub === null) return (
    <Screen>
      <p>جارٍ التحقق من الاشتراك...</p>
      <button onClick={async () => { try { await supabase.auth.signOut() } catch {}; localStorage.clear(); location.reload() }}
        style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--text-secondary,#9aa0ac)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Cairo, sans-serif' }}>
        تأخّر التحميل؟ إعادة تعيين الجلسة
      </button>
    </Screen>
  )

  // Inactive users still enter the app in preview mode (read-only),
  // with a top banner + locked actions. They click "اشترك" to open Plans/Activate.
  return <App profile={sub} onSubscriptionChange={() => rpc('activation:status').then(setSub)} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Gate />
  </React.StrictMode>
)
