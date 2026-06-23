import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Bot, ReplyAll, MessageCircle, FileSpreadsheet, Receipt, LineChart, Bell, Settings, Database, History, Megaphone, CheckCircle, Sparkles } from 'lucide-react'
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
  { to: '/comments', icon: commentsIcon, label: 'أتمتة التعليقات', isImage: true },
  { to: '/post-generator', icon: Sparkles, label: 'مولّد البوستات', isImage: false, badge: 'جديد' },
  { to: '/orders', icon: ordersIcon, label: 'الفواتير', isImage: true },
  { to: '/reports', icon: reportsIcon, label: 'التقارير', isImage: true },
  { to: '/notifications', icon: bellIcon, label: 'الإشعارات', isImage: true },
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
            {NAV_TOOLS.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                {item.isImage ? (
                  <img src={item.icon} alt={item.label} className="nav-img-icon" />
                ) : (
                  <item.icon size={18} className="nav-icon" />
                )}
                <span className="nav-label">{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            ))}
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
