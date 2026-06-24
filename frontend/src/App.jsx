import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import TitleBar from './components/TitleBar/TitleBar'
import Dashboard from './pages/Dashboard/Dashboard'
import AIConfig from './pages/AIConfig/AIConfig'
import SalesAgent from './pages/SalesAgent/SalesAgent'
import CommentAutomation from './pages/CommentAutomation/CommentAutomation'
import Conversations from './pages/Conversations/Conversations'
import Orders from './pages/Orders/Orders'
import Reports from './pages/Reports/Reports'
import Settings from './pages/Settings/Settings'
import Admin from './pages/Admin/Admin'
import Contact from './pages/Contact/Contact'
import Plans from './pages/Plans/Plans'
import Notifications from './pages/Notifications/Notifications'
import Complaints from './pages/Complaints/Complaints'
import { SubscriptionProvider } from './lib/subscription'
import './styles/globals.css'

function InactiveBanner({ status }) {
  const nav = useNavigate()
  const isExpired = status === 'expired'
  return (
    <div style={{background: isExpired ? '#7f1d1d' : 'linear-gradient(90deg,#6C47FF,#a855f7)', color:'#fff', padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', fontSize:13}}>
      <div style={{fontWeight:600}}>
        {isExpired ? '⚠ اشتراكك منتهي — جدّد للاستمرار' : 'حسابك غير مُفعّل بعد — يمكنك تصفّح المنصة فقط'}
      </div>
      <div style={{display:'flex', gap:8}}>
        <button onClick={()=>nav('/plans')} style={{background:'#fff', color:'#000', border:'none', borderRadius:8, padding:'6px 16px', fontWeight:800, cursor:'pointer'}}>اشترك</button>
        <button onClick={()=>nav('/contact')} style={{background:'rgba(255,255,255,.2)', color:'#fff', border:'1px solid rgba(255,255,255,.4)', borderRadius:8, padding:'6px 14px', fontWeight:600, cursor:'pointer'}}>تواصل معنا</button>
      </div>
    </div>
  )
}

export default function App({ profile, onSubscriptionChange }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const isAdmin = !!profile?.is_admin
  const isActive = profile?.subscription_status === 'active'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <SubscriptionProvider profile={profile} onChange={onSubscriptionChange}>
      <HashRouter>
        <div className="app-layout">
          <Sidebar isAdmin={isAdmin} profile={profile} />
          <div className="app-body">
            {!isActive && <InactiveBanner status={profile?.subscription_status} />}
            <TitleBar theme={theme} toggleTheme={toggleTheme} isActive={isActive} />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                {isAdmin && <Route path="/ai-config" element={<AIConfig />} />}
                <Route path="/sales-agent" element={<SalesAgent />} />
                <Route path="/comments" element={<CommentAutomation />} />
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
            </main>
          </div>
          <Toaster position="bottom-left" toastOptions={{
            style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontFamily: 'Cairo, sans-serif' },
            duration: 3000,
          }} />
        </div>
      </HashRouter>
    </SubscriptionProvider>
  )
}
