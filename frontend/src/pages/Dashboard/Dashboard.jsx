import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Facebook, Instagram, Phone, Bot, MessageSquare, ShoppingCart, MessageCircle, DollarSign, CheckCircle, AlertTriangle, Info, PlusCircle, LayoutList, Megaphone, FileText, RefreshCw, BarChart2, PieChart as PieChartIcon, Clock, Settings } from 'lucide-react'
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
  const [stats, setStats] = useState({ messages_today: 0, orders_today: 0, comments_today: 0, revenue_today: 0 })
  const [waStatus, setWaStatus] = useState('disconnected')
  const [fbStatus, setFbStatus] = useState('disconnected')
  const [igStatus, setIgStatus] = useState('disconnected')
  const [tgStatus, setTgStatus] = useState('disconnected')
  const [activities, setActivities] = useState([])

  useEffect(() => {
    async function loadData() {
      try {
        const s = await window.api?.db.getStats()
        if (s) setStats(s)

        const log = await window.api?.db.getActivityLog()
        if (log) setActivities(log.slice(0, 5))

        const wa = await window.api?.whatsapp.getStatus()
        setWaStatus(wa?.status || 'disconnected')

        const fb = await window.api?.facebook.getStatus()
        setFbStatus(fb?.status || 'disconnected')

        const ig = await window.api?.instagram.getStatus()
        setIgStatus(ig?.status || 'disconnected')
        const tg = await window.api?.telegram?.getStatus?.()
        setTgStatus(tg?.status || 'disconnected')
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      }
    }
    loadData()
    const iv = setInterval(loadData, 30000)
    return () => clearInterval(iv)
  }, [])

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
        {/* Recent Activities */}
        <div className="card content-card col-activities">
          <div className="c-header">
            <span className="c-title">آخر الأنشطة</span>
            <button className="c-btn" onClick={() => navigate('/logs')}>عرض الكل</button>
          </div>
          <div className="activity-list">
            {activities.length > 0 ? activities.map((a, i) => (
              <div key={i} className="a-item">
                <div className={`a-icon ${a.platform}`}><Phone size={14} /></div>
                <div className="a-info">
                  <span className="a-text">{a.sender_name}</span>
                  <span className="a-sub">{a.content?.slice(0, 40)}...</span>
                </div>
                <div className="a-meta">
                  <span className="a-time">{a.created_at ? new Date(a.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                  <span className={`a-status ${a.dm_sent ? 'success' : 'info'}`}>{a.event_type}</span>
                </div>
              </div>
            )) : <div className="empty-state">لا توجد أنشطة حالياً</div>}
          </div>
        </div>

        {/* System Alerts */}
        <div className="card content-card col-alerts">
          <div className="c-header">
            <span className="c-title">تنبيهات النظام</span>
            <button className="c-icon-btn" onClick={() => navigate('/settings')}><Settings size={16} /></button>
          </div>
          <div className="alert-list">
            <div className="alert-item">
              <div className="al-icon success"><CheckCircle size={16} /></div>
              <div className="al-info">
                <span className="al-text">النظام يعمل</span>
                <span className="al-sub">كل الأنظمة تعمل بشكل طبيعي</span>
              </div>
            </div>
            {waStatus !== 'connected' && (
              <div className="alert-item">
                <div className="al-icon warning"><AlertTriangle size={16} /></div>
                <div className="al-info">
                  <span className="al-text">واتساب منقطع</span>
                  <span className="al-sub">يرجى فحص اتصال الهاتف</span>
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
            <button className="q-action-btn" onClick={() => navigate('/conversations')}><MessageSquare size={24} className="c-blue" /><span>محادثة جديدة</span></button>
            <button className="q-action-btn" onClick={() => navigate('/products')}><PlusCircle size={24} className="c-green" /><span>إضافة منتج</span></button>
            <button className="q-action-btn" onClick={() => navigate('/orders')}><LayoutList size={24} className="c-orange" /><span>عرض الطلبات</span></button>
            <button className="q-action-btn" onClick={() => navigate('/campaigns')}><Megaphone size={24} className="c-red" /><span>إنشاء حملة</span></button>
            <button className="q-action-btn" onClick={() => navigate('/reports')}><BarChart2 size={24} className="c-purple" /><span>التقارير</span></button>
            <button className="q-action-btn" onClick={() => navigate('/ai-config')}><RefreshCw size={24} className="c-teal" /><span>تحديث الـ AI</span></button>
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
