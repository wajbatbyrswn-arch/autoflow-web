import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { play as playSound } from '../../lib/sounds'
import { LayoutDashboard, MessageSquare, Bot, ReplyAll, MessageCircle, FileSpreadsheet, Receipt, LineChart, Bell, Settings, Database, History, Megaphone, CheckCircle, Sparkles, AlertOctagon } from 'lucide-react'
import './Sidebar.css'
import logoImg from '../../assets/logo.jpg'

import dashboardIcon from '../../assets/icons/dashboard.png'
import chatIcon from '../../assets/icons/chat.png'
import settingsIcon from '../../assets/icons/settings.png'
import agentIcon from '../../assets/icons/agent.png'
import commentsIcon from '../../assets/icons/comments.png'
import packageIcon from '../../assets/icons/package.png'
import ordersIcon from '../../assets/icons/orders.png'
import reportsIcon from '../../assets/icons/revenue.png'
import bellIcon from '../../assets/icons/bell.png'
import configIcon from '../../assets/icons/settings.png'
import globeIcon from '../../assets/icons/globe.png'

const NAV_MAIN = [
  { to: '/dashboard', icon: dashboardIcon, label: 'لوحة التحكم', isImage: true },
  { to: '/conversations', icon: chatIcon, label: 'المحادثات', isImage: true },
]

const NAV_TOOLS = [
  { to: '/sales-agent', icon: agentIcon, label: 'الرد الذكي على الزبائن', isImage: true },
  { to: '/complaints', icon: AlertOctagon, label: 'الشكاوى', isImage: false, badgeKey: 'complaints' },
  { to: '/orders', icon: ordersIcon, label: 'الفواتير', isImage: true },
  { to: '/reports', icon: reportsIcon, label: 'التقارير', isImage: true },
  { to: '/notifications', icon: bellIcon, label: 'الإشعارات', isImage: true, badgeKey: 'unread' },
  { to: '/settings', icon: settingsIcon, label: 'الإعدادات', isImage: true },
  { to: '/contact', icon: MessageCircle, label: 'تواصل معنا', isImage: false },
  { to: '/plans', icon: Sparkles, label: 'الخطط والأسعار', isImage: false },
]

function planLabel(status, plan, expires) {
  if (status === 'expired') return { txt: 'منتهي', cls: 'expired' }
  if (status !== 'active') return { txt: 'غير مفعّل', cls: 'inactive' }
  const days = expires ? Math.max(0, Math.ceil((new Date(expires) - new Date()) / 86400000)) : null
  return { txt: `${plan === 'basic' ? 'الخطة الشهرية' : (plan || 'مفعّل')}${days != null ? ` — ${days} يوم` : ''}`, cls: 'active' }
}

export default function Sidebar({ isAdmin, profile = null }) {
  const [storeInfo, setStoreInfo] = useState({ store_name: 'AutoFlow', store_logo: '' })
  const [counts, setCounts] = useState({ unread: 0, complaints: 0 })

  useEffect(() => {
    async function loadStoreInfo() {
      try {
        const info = await window.api?.db.getStoreConfig()
        if (info) setStoreInfo(info)
      } catch (e) {
        console.error('Failed to load store info:', e)
      }
    }
    loadStoreInfo()
  }, [])

  // Track previous counts to detect growth → ring the chime.
  const prevRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      try {
        const [unread, complaintsList] = await Promise.all([
          window.api?.notifications?.unreadCount?.().catch(() => ({ count: 0 })) || { count: 0 },
          window.api?.notifications?.list?.({ type: 'complaint', limit: 50 }).catch(() => []) || [],
        ])
        if (cancelled) return
        const openComplaints = (complaintsList || []).filter(c => !c.is_read).length
        const next = { unread: unread?.count || 0, complaints: openComplaints }
        // Audible signal: skip first load (avoid initial chime), play on growth.
        const prev = prevRef.current
        if (prev) {
          if (next.complaints > prev.complaints) playSound('complaint')
          else if (next.unread > prev.unread)   playSound('notify')
        }
        prevRef.current = next
        setCounts(next)
      } catch {}
    }
    loadCounts()
    const iv = setInterval(loadCounts, 15000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-img-container">
          <img src={storeInfo.store_logo || logoImg} alt="AutoFlow Logo" className="app-logo-img" />
        </div>
        <div className="logo-text">
          <span className="logo-name">{storeInfo.store_name}</span>
          <span className="logo-sub">نظام الأتمتة الذكي</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <nav className="sidebar-nav">
          {NAV_MAIN.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {item.isImage ? (
                <img src={item.icon} alt={item.label} className="nav-img-icon" />
              ) : (
                <item.icon size={18} className="nav-icon" />
              )}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav-group">
          <div className="nav-group-title">الأدوات</div>
          <nav className="sidebar-nav">
            {NAV_TOOLS.map(item => {
              const liveCount = item.badgeKey ? counts[item.badgeKey] : 0
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  {item.isImage ? (
                    <img src={item.icon} alt={item.label} className="nav-img-icon" />
                  ) : (
                    <item.icon size={18} className="nav-icon" />
                  )}
                  <span className="nav-label">{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                  {!!liveCount && <span className="nav-badge" style={{background:'#ef4444', color:'#fff'}}>{liveCount}</span>}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {isAdmin && (
          <div className="nav-group">
            <div className="nav-group-title">الإدارة</div>
            <nav className="sidebar-nav">
              <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Database size={18} className="nav-icon" />
                <span className="nav-label">لوحة الإدارة</span>
              </NavLink>
              <NavLink to="/ai-config" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <img src={configIcon} alt="AI" className="nav-img-icon" />
                <span className="nav-label">الذكاء الاصطناعي</span>
              </NavLink>
              <NavLink to="/comments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <img src={commentsIcon} alt="comments" className="nav-img-icon" />
                <span className="nav-label">أتمتة التعليقات</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="profile-card">
          <div className="profile-avatar">
            {storeInfo.store_logo ? (
              <img src={storeInfo.store_logo} alt="Store Logo" className="store-avatar-img" />
            ) : (
              <div className="avatar-placeholder"></div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name">{storeInfo.store_name}</div>
            <div className="profile-plan" style={{
              color: profile?.subscription_status === 'active' ? '#34d399'
                   : profile?.subscription_status === 'expired' ? '#f87171' : '#fbbf24'
            }}>
              {planLabel(profile?.subscription_status, profile?.plan, profile?.subscription_expires_at).txt}
            </div>
            {profile?.subscription_status === 'active' && profile?.subscription_expires_at && (
              <div style={{fontSize:10, opacity:.55, marginTop:2}}>
                ينتهي {new Date(profile.subscription_expires_at).toLocaleDateString('ar-EG', { day:'numeric', month:'short', year:'numeric' })}
              </div>
            )}
          </div>
        </div>
        {profile?.user_id && (
          <div style={{fontSize:10, opacity:.5, padding:'4px 8px', fontFamily:'monospace', direction:'ltr', textAlign:'center'}}>
            ID: {String(profile.user_id).slice(0, 8)}
          </div>
        )}
        <div className="version-badge">v1.0.0</div>
      </div>
    </aside>
  )
}
