import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Facebook, Instagram, Phone, Bot, MessageSquare, ShoppingCart, MessageCircle, DollarSign, CheckCircle, AlertTriangle, Info, PlusCircle, LayoutList, Megaphone, FileText, RefreshCw, BarChart2, PieChart as PieChartIcon, Clock, Settings, Bell, AlertOctagon } from 'lucide-react'
import { useSubscription } from '../../lib/subscription'
import { BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import './Dashboard.css'

import dashboardIcon from '../../assets/icons/dashboard.png'
import chatIcon from '../../assets/icons/chat.png'
import configIcon from '../../assets/icons/settings.png'
import agentIcon from '../../assets/icons/agent.png'
import commentsIcon from '../../assets/icons/comments.png'
import packageIcon from '../../assets/icons/package.png'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import whatsappIcon from '../../assets/icons/whatsapp.png'
import telegramIcon from '../../assets/icons/telegram.png'
import ordersIcon from '../../assets/icons/orders.png'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useSubscription()
  const [stats, setStats] = useState({ messages_today: 0, orders_today: 0, comments_today: 0, revenue_today: 0 })
  // Platform status derived from real linked data (Nashir accounts + telegram bot token).
  const [waStatus, setWaStatus] = useState('disconnected')
  const [fbStatus, setFbStatus] = useState('disconnected')
  const [igStatus, setIgStatus] = useState('disconnected')
  const [tgStatus, setTgStatus] = useState('disconnected')
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    async function loadData() {
      try {
        const [s, notifs, nashir] = await Promise.all([
          window.api?.db.getStats().catch(() => null),
          window.api?.notifications?.list?.({ limit: 6 }).catch(() => []) || [],
          window.api?.nashir?.status().catch(() => ({})),
        ])
        if (s) setStats(s)
        setNotifications(notifs || [])

        // Real status from Nashir: a platform is connected if it has at least one linked account.
        const platforms = nashir?.platforms || {}
        setFbStatus((platforms.facebook  || []).length > 0 ? 'connected' : 'disconnected')
        setIgStatus((platforms.instagram || []).length > 0 ? 'connected' : 'disconnected')
        setWaStatus((platforms.whatsapp  || []).length > 0 ? 'connected' : 'disconnected')
        // Telegram = the user has a bot token saved (either via Settings or set by admin).
        setTgStatus(profile?.telegram_bot_token ? 'connected' : 'disconnected')
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      }
    }
    loadData()
    const iv = setInterval(loadData, 30000)
    return () => clearInterval(iv)
  }, [profile?.telegram_bot_token])

  const barData1 = (stats.orders_by_day || []).slice(-7).map(d => ({ v: d.count }))
  const barData2 = (stats.orders_by_day || []).slice(-30).map(d => ({ v: d.count }))
  const pieData = (stats.platform_distribution || []).map(p => ({
    name: p.platform,
    value: p.count,
    color: p.platform === 'whatsapp' ? '#25D366' : p.platform === 'facebook' ? '#1877f2' : p.platform === 'instagram' ? '#E1306C' : '#9CA3AF'
  }))
  if (pieData.length === 0) pieData.push({ value: 1, color: '#2A3441' })

  // Real weekly / monthly counts from orders_by_day
  const now7 = new Date(); now7.setDate(now7.getDate() - 7)
  const now30 = new Date(); now30.setDate(now30.getDate() - 30)
  const weekOrders  = (stats.orders_by_day || []).filter(d => new Date(d.day) >= now7).reduce((a,d) => a + d.count, 0)
  const monthOrders = (stats.orders_by_day || []).filter(d => new Date(d.day) >= now30).reduce((a,d) => a + d.count, 0)
  // Most active platform
  const topPlatform = pieData.length > 0 ? pieData.reduce((a,b) => b.value > a.value ? b : a, pieData[0]) : null
  const platformLabel = { whatsapp:'واتساب', facebook:'فيسبوك', instagram:'إنستغرام', telegram:'تلغرام' }

  return (
    <div className="dashboard-container animate-fade">
      {/* Row 1: Platforms */}
      <div className="dash-row grid-4">
        <div className="card platform-card" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
          <div className="platform-info">
            <div className="p-img-container"><img src={whatsappIcon} alt="WhatsApp" className="p-img" /></div>
            <div className="p-details">
              <span className="p-name">واتساب</span>
              <span className={`p-status ${waStatus === 'connected' ? 'online' : 'offline'}`}>
                <span className="dot"></span> {waStatus === 'connected' ? 'متصل' : 'منقطع'}
              </span>
            </div>
            <div className="wifi-icon"><div className={`w-signal ${waStatus === 'connected' ? 'active' : ''}`}></div></div>
          </div>
          <div className="p-meta">Baileys (WhatsApp)</div>
        </div>

        <div className="card platform-card" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
          <div className="platform-info">
            <div className="p-img-container"><img src={telegramIcon} alt="Telegram" className="p-img" /></div>
            <div className="p-details">
              <span className="p-name">تلغرام</span>
              <span className={`p-status ${tgStatus === 'connected' ? 'online' : 'offline'}`}>
                <span className="dot"></span> {tgStatus === 'connected' ? 'متصل' : 'منقطع'}
              </span>
            </div>
            <div className="wifi-icon"><div className={`w-signal ${tgStatus === 'connected' ? 'active' : ''}`}></div></div>
          </div>
          <div className="p-meta">Telegram Bot API</div>
        </div>

        <div className="card platform-card" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
          <div className="platform-info">
            <div className="p-img-container"><img src={facebookIcon} alt="Facebook" className="p-img" /></div>
            <div className="p-details">
              <span className="p-name">فيسبوك</span>
              <span className={`p-status ${fbStatus === 'connected' ? 'online' : 'offline'}`}>
                <span className="dot"></span> {fbStatus === 'connected' ? 'متصل' : 'منقطع'}
              </span>
            </div>
            <div className="wifi-icon"><div className={`w-signal ${fbStatus === 'connected' ? 'active' : ''}`}></div></div>
          </div>
          <div className="p-meta">Meta Graph API</div>
        </div>

        <div className="card platform-card" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
          <div className="platform-info">
            <div className="p-img-container"><img src={instagramIcon} alt="Instagram" className="p-img" /></div>
            <div className="p-details">
              <span className="p-name">إنستغرام</span>
              <span className={`p-status ${igStatus === 'connected' ? 'online' : 'offline'}`}>
                <span className="dot"></span> {igStatus === 'connected' ? 'متصل' : 'منقطع'}
              </span>
            </div>
            <div className="wifi-icon"><div className={`w-signal ${igStatus === 'connected' ? 'active' : ''}`}></div></div>
          </div>
          <div className="p-meta">Instagram API</div>
        </div>
      </div>

      {/* Row 2: Main Stats */}
      <div className="dash-row grid-4">
        <div className="card stat-card" onClick={() => navigate('/conversations')} style={{ cursor: 'pointer' }}>
          <div className="stat-header">
            <div className="s-img-container"><img src={chatIcon} alt="Messages" className="s-img" /></div>
            <span className="s-title">الرسائل اليوم</span>
          </div>
          <div className="stat-body">
            <span className="s-value">{stats.messages_today}</span>
          </div>
        </div>

        <div className="card stat-card" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-header">
            <div className="s-img-container"><img src={ordersIcon} alt="Orders" className="s-img" /></div>
            <span className="s-title">الطلبات اليوم</span>
          </div>
          <div className="stat-body">
            <span className="s-value">{stats.orders_today}</span>
          </div>
        </div>

        <div className="card stat-card" onClick={() => navigate('/comments')} style={{ cursor: 'pointer' }}>
          <div className="stat-header">
            <div className="s-img-container"><img src={commentsIcon} alt="Comments" className="s-img" /></div>
            <span className="s-title">التعليقات اليوم</span>
          </div>
          <div className="stat-body">
            <span className="s-value">{stats.comments_today}</span>
          </div>
        </div>

        <div className="card stat-card" onClick={() => navigate('/reports')} style={{ cursor: 'pointer' }}>
          <div className="stat-header">
            <div className="s-img-container"><img src={packageIcon} alt="Products" className="s-img" /></div>
            <span className="s-title">إجمالي المبيعات</span>
          </div>
          <div className="stat-body">
            <span className="s-value">{Number(stats.revenue_today).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Content Grid */}
      <div className="dash-row grid-content">
        {/* Recent Notifications (replaces Activities) */}
        <div className="card content-card col-activities">
          <div className="c-header">
            <span className="c-title"><Bell size={14} style={{verticalAlign:'middle',marginLeft:6}}/> آخر الإشعارات</span>
            <button className="c-btn" onClick={() => navigate('/notifications')}>عرض الكل</button>
          </div>
          <div className="activity-list">
            {notifications.length > 0 ? notifications.map((n) => {
              const color = n.type === 'order' ? '#10b981' : n.type === 'complaint' ? '#ef4444' : '#3b82f6'
              const Icon = n.type === 'order' ? ShoppingCart : n.type === 'complaint' ? AlertOctagon : Info
              return (
                <div key={n.id} className="a-item" style={{cursor: n.conversation_id ? 'pointer' : 'default'}}
                  onClick={() => n.conversation_id ? navigate(`/conversations?open=${n.conversation_id}`) : navigate('/notifications')}>
                  <div className="a-icon" style={{background: color+'22', color}}><Icon size={14}/></div>
                  <div className="a-info">
                    <span className="a-text">{n.title}</span>
                    <span className="a-sub">{(n.body || '').slice(0, 60)}{(n.body||'').length > 60 ? '...' : ''}</span>
                  </div>
                  <div className="a-meta">
                    <span className="a-time">{new Date(n.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    {!n.is_read && <span style={{width:8, height:8, borderRadius:'50%', background:'#ef4444'}}/>}
                  </div>
                </div>
              )
            }) : <div className="empty-state">لا توجد إشعارات حالياً</div>}
          </div>
        </div>

        {/* System Alerts — real platform status */}
        <div className="card content-card col-alerts">
          <div className="c-header">
            <span className="c-title">تنبيهات النظام</span>
            <button className="c-icon-btn" onClick={() => navigate('/settings')}><Settings size={16} /></button>
          </div>
          <div className="alert-list">
            {fbStatus === 'connected' && igStatus === 'connected' && waStatus === 'connected' && tgStatus === 'connected' ? (
              <div className="alert-item">
                <div className="al-icon success"><CheckCircle size={16}/></div>
                <div className="al-info">
                  <span className="al-text">كل المنصات متصلة</span>
                  <span className="al-sub">النظام يعمل بكامل طاقته</span>
                </div>
              </div>
            ) : (
              <>
                {fbStatus !== 'connected' && (
                  <div className="alert-item">
                    <div className="al-icon warning"><AlertTriangle size={16}/></div>
                    <div className="al-info">
                      <span className="al-text">فيسبوك غير مربوط</span>
                      <span className="al-sub">تواصل معنا لربط الصفحة</span>
                    </div>
                  </div>
                )}
                {igStatus !== 'connected' && (
                  <div className="alert-item">
                    <div className="al-icon warning"><AlertTriangle size={16}/></div>
                    <div className="al-info">
                      <span className="al-text">إنستغرام غير مربوط</span>
                      <span className="al-sub">تواصل معنا لربط الحساب</span>
                    </div>
                  </div>
                )}
                {waStatus !== 'connected' && (
                  <div className="alert-item">
                    <div className="al-icon warning"><AlertTriangle size={16}/></div>
                    <div className="al-info">
                      <span className="al-text">واتساب غير مربوط</span>
                      <span className="al-sub">تواصل معنا لربط الحساب</span>
                    </div>
                  </div>
                )}
                {tgStatus !== 'connected' && (
                  <div className="alert-item">
                    <div className="al-icon info"><Info size={16}/></div>
                    <div className="al-info">
                      <span className="al-text">تلغرام غير مربوط</span>
                      <span className="al-sub">اربط بوت تلغرام من الإعدادات</span>
                    </div>
                  </div>
                )}
              </>
            )}
            {profile?.subscription_status === 'expired' && (
              <div className="alert-item">
                <div className="al-icon warning"><AlertTriangle size={16}/></div>
                <div className="al-info">
                  <span className="al-text">اشتراكك منتهي</span>
                  <span className="al-sub">جدد للاستمرار في استخدام كل المميزات</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card content-card col-actions">
          <div className="c-header">
            <span className="c-title">إجراءات سريعة</span>
          </div>
          <div className="action-grid">
            <button className="q-action-btn" onClick={() => navigate('/conversations')}><MessageSquare size={24} className="c-blue" /><span>المحادثات</span></button>
            <button className="q-action-btn" onClick={() => navigate('/sales-agent')}><PlusCircle size={24} className="c-green" /><span>إضافة منتج</span></button>
            <button className="q-action-btn" onClick={() => navigate('/orders')}><LayoutList size={24} className="c-orange" /><span>عرض الطلبات</span></button>
            <button className="q-action-btn" onClick={() => navigate('/complaints')}><AlertOctagon size={24} className="c-red" /><span>الشكاوى</span></button>
            <button className="q-action-btn" onClick={() => navigate('/reports')}><BarChart2 size={24} className="c-purple" /><span>التقارير</span></button>
            <button className="q-action-btn" onClick={() => navigate('/notifications')}><Bell size={24} className="c-teal" /><span>الإشعارات</span></button>
          </div>
        </div>
      </div>

      {/* Row 4: Bottom Stats Strip */}
      <div className="dash-row bottom-strip">
        <div className="bs-item">
          <div className="bs-info">
            <span className="bs-label">طلبات الأسبوع</span>
            <span className="bs-value">{weekOrders}</span>
            <span className="bs-sub">آخر 7 أيام</span>
          </div>
          <div className="bs-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData1}><Bar dataKey="v" fill="#10B981" radius={[2, 2, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bs-item">
          <div className="bs-info">
            <span className="bs-label">طلبات الشهر</span>
            <span className="bs-value">{monthOrders}</span>
            <span className="bs-sub">آخر 30 يوم</span>
          </div>
          <div className="bs-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData2}><Bar dataKey="v" fill="#F59E0B" radius={[2, 2, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bs-item">
          <div className="bs-info">
            <span className="bs-label">توزيع المنصات</span>
            <span className="bs-value">{pieData.length > 1 ? pieData.length + ' منصات' : pieData[0]?.name ? platformLabel[pieData[0].name] || pieData[0].name : '—'}</span>
          </div>
          <div className="bs-chart pie">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={15} outerRadius={25} stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bs-item">
          <div className="bs-info">
            <span className="bs-label">إجمالي المبيعات</span>
            <span className="bs-value">{Number(stats.revenue_total || 0).toLocaleString()}</span>
            <span className="bs-sub">كل الأوقات</span>
          </div>
          <div className="bs-icon"><DollarSign size={32} className="c-blue" /></div>
        </div>

        <div className="bs-item">
          <div className="bs-info">
            <span className="bs-label">أكثر منصة نشاطاً</span>
            <span className="bs-value">{topPlatform ? (platformLabel[topPlatform.name] || topPlatform.name) : '—'}</span>
            <span className="bs-sub">{topPlatform ? topPlatform.value + ' طلب' : 'لا يوجد بيانات بعد'}</span>
          </div>
          <div className="bs-icon"><BarChart2 size={32} className="c-green" /></div>
        </div>
      </div>

    </div>
  )
}
