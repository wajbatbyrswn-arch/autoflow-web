import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Sun, Moon, Calendar, LogOut, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import './TitleBar.css'

export default function TitleBar({ theme, toggleTheme, isActive = true }) {
  const logout = async () => { await supabase.auth.signOut(); location.reload() }
  const nav = useNavigate()

  const [now, setNow] = useState(new Date())
  const [storeName, setStoreName] = useState('AutoFlow')

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    window.api?.db.getStoreConfig().then(cfg => {
      if (cfg?.store_name) setStoreName(cfg.store_name)
    }).catch(() => {})
  }, [])

  const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="titlebar">
      <div className="titlebar-drag" />

      <div className="header-left-content">
        <div className="header-titles">
          <h1 className="page-title">{storeName}</h1>
          <p className="page-subtitle">👋 مرحباً بك في لوحة التحكم</p>
        </div>
      </div>

      <div className="header-right-content">
        <div className="header-actions">
          {!isActive && (
            <button
              onClick={() => nav('/plans')}
              style={{display:'inline-flex', alignItems:'center', gap:6, background:'linear-gradient(90deg,#6C47FF,#a855f7)', color:'#fff', border:'none', borderRadius:10, padding:'8px 18px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', fontSize:13, boxShadow:'0 6px 18px -8px #6C47FF'}}>
              <Sparkles size={14} /> اشترك
            </button>
          )}

          <div className="datetime-display">
            <Calendar size={14} />
            <span>{dateStr}</span>
            <span className="time-divider" />
            <span className="time-live">{timeStr}</span>
          </div>

          {/* Dark / Light toggle */}
          <button
            className="action-btn theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'تبديل للوضع المضيء' : 'تبديل للوضع المظلم'}
          >
            {theme === 'dark'
              ? <Sun size={18} className="sun-icon" />
              : <Moon size={18} className="moon-icon" />
            }
          </button>

          <button className="action-btn">
            <Bell size={18} />
          </button>
        </div>

        <button className="action-btn" onClick={logout} title="تسجيل الخروج">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  )
}
