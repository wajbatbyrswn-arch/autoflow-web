import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import PostGeneratorRoot from './pages/PostGenerator/PostGeneratorRoot'
import Admin from './pages/Admin/Admin'
import './styles/globals.css'

export default function App({ profile }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const isAdmin = !!profile?.is_admin

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <HashRouter>
      <div className="app-layout">
        <Sidebar isAdmin={isAdmin} />
        <div className="app-body">
          <TitleBar theme={theme} toggleTheme={toggleTheme} />
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
              <Route path="/post-generator/*" element={<PostGeneratorRoot />} />
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
  )
}
