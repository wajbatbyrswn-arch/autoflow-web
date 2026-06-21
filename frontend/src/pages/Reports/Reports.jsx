import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts'
import trendingIcon from '../../assets/icons/trending.png'
import revenueIcon from '../../assets/icons/revenue.png'
import ordersIcon from '../../assets/icons/orders.png'
import usersIcon from '../../assets/icons/users.png'
import activityIcon from '../../assets/icons/activity.png'
import packageIcon from '../../assets/icons/package.png'
import clockIcon from '../../assets/icons/clock.png'
import pieChartIcon from '../../assets/icons/pie-chart.png'
import './Reports.css'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Reports() {
  const [stats, setStats] = useState({ 
    orders_by_day: [], 
    top_products: [], 
    messages_today: 0, 
    orders_today: 0, 
    orders_total: 0, 
    revenue_today: 0, 
    revenue_total: 0, 
    active_conversations: 0,
    platform_distribution: []
  })

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const s = await window.api?.db.getStats() || {}
    const topMap = {}
    ;(s.top_products || []).forEach(o => {
      try {
        const prods = JSON.parse(o.products_json) || []
        prods.forEach(p => { topMap[p.name] = (topMap[p.name] || 0) + (p.quantity || 1) })
      } catch {}
    })
    const top = Object.entries(topMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,value])=>({ name, value }))
    setStats({ ...s, top_products_parsed: top })
  }

  const daily = (stats.orders_by_day || []).slice(-30).map(d => ({
    day: (d.date || '').slice(5),
    orders: d.count || 0,
    revenue: Math.round(d.revenue || 0),
  }))

  const platformData = (stats.platform_distribution || []).map(p => ({
    name: p.name === 'whatsapp' ? 'واتساب' : p.name === 'facebook' ? 'فيسبوك' : 'إنستغرام',
    value: p.value || 0
  }))

  // Calculated metrics
  const avgOrderValue = stats.orders_total > 0 ? Math.round(stats.revenue_total / stats.orders_total) : 0
  const conversionRate = stats.messages_today > 0 ? ((stats.orders_today / stats.messages_today) * 100).toFixed(1) : 0

  return (
    <div className="reports-container animate-fade">
      <div className="page-header">
        <div className="header-icon-box"><img src={trendingIcon} className="header-img-icon" /></div>
        <div>
          <h1>التحليلات المتقدمة</h1>
          <p>رؤية شاملة لأداء متجرك عبر جميع المنصات</p>
        </div>
      </div>

      {/* KPI Section */}
      <div className="reports-grid grid-4">
        <div className="card kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon blue"><img src={revenueIcon} className="kpi-img-icon" /></div>
            <span className="kpi-label">إجمالي الإيرادات</span>
          </div>
          <div className="kpi-value">{Number(stats.revenue_total || 0).toLocaleString()} <span className="currency">IQD</span></div>
          <div className="kpi-footer">
            <span className="trend-up">↑ 12%</span> منذ الشهر الماضي
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon green"><img src={ordersIcon} className="kpi-img-icon" /></div>
            <span className="kpi-label">إجمالي الطلبات</span>
          </div>
          <div className="kpi-value">{stats.orders_total}</div>
          <div className="kpi-footer">
            <span className="trend-up">↑ 8%</span> منذ الشهر الماضي
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon purple"><img src={usersIcon} className="kpi-img-icon" /></div>
            <span className="kpi-label">معدل التحويل</span>
          </div>
          <div className="kpi-value">{conversionRate}%</div>
          <div className="kpi-footer">
            <span className="trend-down">↓ 2%</span> منذ الشهر الماضي
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon orange"><img src={revenueIcon} className="kpi-img-icon" /></div>
            <span className="kpi-label">متوسط قيمة الطلب</span>
          </div>
          <div className="kpi-value">{avgOrderValue.toLocaleString()} <span className="currency">IQD</span></div>
          <div className="kpi-footer">
            <span className="trend-up">↑ 5%</span> منذ الشهر الماضي
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="reports-grid grid-main">
        <div className="card chart-card main-chart">
          <div className="chart-header">
            <div className="chart-title-group">
              <img src={activityIcon} className="chart-title-img" />
              <span className="chart-title">أداء الإيرادات والطلبات</span>
            </div>
            <div className="chart-tabs">
              <button className="c-tab active">30 يوم</button>
              <button className="c-tab">7 أيام</button>
            </div>
          </div>
          <div className="chart-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'var(--text-muted)', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:'var(--text-muted)', fontSize: 11}} />
                <Tooltip 
                  contentStyle={{background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  itemStyle={{fontFamily:'Cairo', fontSize: 13}}
                />
                <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="orders" name="الطلبات" stroke="#10b981" strokeWidth={3} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card platform-share">
          <div className="chart-header">
            <div className="chart-title-group">
              <img src={pieChartIcon} className="chart-title-img" />
              <span className="chart-title">توزيع المنصات</span>
            </div>
          </div>
          <div className="chart-body pie-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={platformData.length ? platformData : [{name:'لا بيانات', value: 1}]} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {platformData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  {!platformData.length && <Cell fill="var(--border)" />}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {platformData.map((p, i) => (
                <div key={i} className="legend-item">
                  <div className="legend-dot" style={{ background: COLORS[i % COLORS.length] }}></div>
                  <span className="legend-label">{p.name}</span>
                  <span className="legend-value">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Tables & Details */}
      <div className="reports-grid grid-2">
        <div className="card detail-card">
          <div className="chart-header">
            <div className="chart-title-group">
              <img src={packageIcon} className="chart-title-img" />
              <span className="chart-title">أكثر المنتجات مبيعاً</span>
            </div>
          </div>
          <div className="top-products-list">
            {stats.top_products_parsed?.length ? stats.top_products_parsed.map((p, i) => (
              <div key={i} className="prod-row">
                <div className="prod-info">
                  <div className="prod-rank">{i + 1}</div>
                  <span className="prod-name">{p.name}</span>
                </div>
                <div className="prod-progress-bg">
                  <div className="prod-progress-fill" style={{ width: `${(p.value / stats.top_products_parsed[0].value) * 100}%`, background: COLORS[i % COLORS.length] }}></div>
                </div>
                <span className="prod-count">{p.value} قطعة</span>
              </div>
            )) : <div className="empty-state">لا توجد بيانات</div>}
          </div>
        </div>

        <div className="card detail-card">
          <div className="chart-header">
            <div className="chart-title-group">
              <img src={clockIcon} className="chart-title-img" />
              <span className="chart-title">أوقات الذروة</span>
            </div>
          </div>
          <div className="peak-times-visual">
            <div className="empty-state">سيتم تحليل أوقات الذروة بناءً على نشاط الرسائل والطلبات قريباً.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

