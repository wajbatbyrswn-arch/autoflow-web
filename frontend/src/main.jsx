import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Login from './auth/Login'
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
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setSub(null); setSubError(false)
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

  useEffect(() => {
    if (!session) return
    refreshStatus()
  }, [session])

  if (session === undefined) return <Screen>جارٍ التحميل...</Screen>
  if (!session) return <Login />

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

  if (sub === null) return <Screen>جارٍ التحقق من الاشتراك...</Screen>

  if (sub.subscription_status !== 'active') {
    return <Activate onActivated={() => rpc('activation:status').then(setSub)} />
  }

  return <App profile={sub} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Gate />
  </React.StrictMode>
)
