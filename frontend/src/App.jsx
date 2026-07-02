import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import TitleBar from './components/TitleBar/TitleBar'
// Dashboard is the landing route, keep it eager so first paint is instant
import Dashboard from './pages/Dashboard/Dashboard'
// All other routes lazy-loaded — drops initial bundle from ~1.4MB to ~400KB
const AIConfig          = lazy(() => import('./pages/AIConfig/AIConfig'))
const SalesAgent        = lazy(() => import('./pages/SalesAgent/SalesAgent'))
const CommentAutomation = lazy(() => import('./pages/CommentAutomation/CommentAutomation'))
const Conversations     = lazy(() => import('./pages/Conversations/Conversations'))
const Orders            = lazy(() => import('./pages/Orders/Orders'))
const Reports           = lazy(() => import('./pages/Reports/Reports'))
const Settings          = lazy(() => import('./pages/Settings/Settings'))
const Admin             = lazy(() => import('./pages/Admin/Admin'))
const Contact           = lazy(() => import('./pages/Contact/Contact'))
const Plans             = lazy(() => import('./pages/Plans/Plans'))
const Notifications     = lazy(() => import('./pages/Notifications/Notifications'))
const Complaints        = lazy(() => import('./pages/Complaints/Complaints'))
import { SubscriptionProvider } from './lib/subscription'
import { ConfirmProvider } from './components/ConfirmDialog/ConfirmDialog'
import { on } from './lib/events'
import { play } from './lib/sounds'
import { useT } from './lib/i18n'
import './styles/globals.css'

function PageLoader() {
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:'var(--text-secondary)', fontSize:14}}>
      <div className="animate-spin" style={{width:32, height:32, border:'3px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%'}} />
    </div>
  )
}

function InactiveBanner({ status }) {
  const { t } = useT()
  const nav = useNavigate()
  const isExpired = status === 'expired'
  return (
    <div style={{background: isExpired ? '#7f1d1d' : 'linear-gradient(90deg,#6C47FF,#a855f7)', color:'#fff', padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', fontSize:13}}>
      <div style={{fontWeight:600}}>
        {isExpired ? `⚠ ${t('اشتراكك منتهي — جدّد للاستمرار')}` : t('حسابك غير مُفعّل بعد — يمكنك تصفّح المنصة فقط')}
      </div>
      <div style={{display:'flex', gap:8}}>
        <button onClick={()=>nav('/plans')} style={{background:'#fff', color:'#000', border:'none', borderRadius:8, padding:'6px 16px', fontWeight:800, cursor:'pointer'}}>{t('اشترك')}</button>
        <button onClick={()=>nav('/contact')} style={{background:'rgba(255,255,255,.2)', color:'#fff', border:'1px solid rgba(255,255,255,.4)', borderRadius:8, padding:'6px 14px', fontWeight:600, cursor:'pointer'}}>{t('تواصل معنا')}</button>
      </div>
    </div>
  )
}

export default function App({ profile, onSubscriptionChange }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAdmin = !!profile?.is_admin
  const isActive = profile?.subscription_status === 'active'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Play notification sounds when events arrive from the backend.
  useEffect(() => {
    const offNotif = on('notification', (data) => {
      play(data?.type === 'complaint' ? 'complaint' : 'notify')
    })
    return () => { offNotif?.() }
  }, [])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <SubscriptionProvider profile={profile} onChange={onSubscriptionChange}>
      <ConfirmProvider>
      <HashRouter>
        <div className="app-layout">
          <Sidebar isAdmin={isAdmin} profile={profile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
          <div className="app-body">
            {!isActive && <InactiveBanner status={profile?.subscription_status} />}
            <TitleBar theme={theme} toggleTheme={toggleTheme} isActive={isActive} onMenuClick={() => setSidebarOpen(true)} />
            <main className="app-main">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  {isAdmin && <Route path="/ai-config" element={<AIConfig />} />}
                  <Route path="/sales-agent" element={<SalesAgent />} />
                  <Route path="/comments" element={<CommentAutomation isAdmin={isAdmin} />} />
                  <Route path="/conversations" element={<Conversations />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/complaints" element={<Complaints />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/plans" element={<Plans />} />
                  {isAdmin && <Route path="/admin" element={<Admin />} />}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          <Toaster position="bottom-left" toastOptions={{
            style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontFamily: 'Cairo, sans-serif' },
            duration: 3000,
          }} />
        </div>
      </HashRouter>
      </ConfirmProvider>
    </SubscriptionProvider>
  )
}
