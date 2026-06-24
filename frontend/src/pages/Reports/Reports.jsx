import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts'
import { useCurrency } from '../../lib/useCurrency'
import { TrendingUp, ShoppingCart, Users, DollarSign, Clock, Package,
         CheckCircle, AlertOctagon, BarChart3, PieChart as PieIcon } from 'lucide-react'
import './Reports.css'

const COLORS = ['#1B3A8C', '#2BB24C', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const PLATFORM_NAMES = { whatsapp:'واتساب', facebook:'فيسبوك', instagram:'إنستغرام', telegram:'تلغرام' }
const STATUS_NAMES = { new:'جديد', preparing:'قيد التجهيز', shipped:'تم الإرسال', delivered:'مُسلَّم', cancelled:'ملغي' }
const STATUS_COLORS = { new:'#3b82f6', preparing:'#f59e0b', shipped:'#8b5cf6', delivered:'#10b981', cancelled:'#ef4444' }

function SummaryRow({ label, value, hint, accent }) {
  return (
    <div className="summary-row">
      <div>
        <div className="summary-label">{label}</div>
        {hint && <div className="summary-hint">{hint}</div>}
      </div>
      <div className="summary-value" style={accent ? { color: accent } : null}>{value}</div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, hint, color, delta }) {
  return (
    <div className="card kpi-card-pro">
      <div className="kpi-pro-head">
        <div className="kpi-pro-icon" style={{ background: color + '22', color }}>
          <Icon size={22} />
        </div>
        <span className="kpi-pro-label">{label}</span>
      </div>
      <div className="kpi-pro-value">{value}</div>
      <div className="kpi-pro-footer">
        {delta != null && (
          <span className={delta >= 0 ? 'trend-up' : 'trend-down'}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
          </span>
        )}
        {hint && <span style={{ opacity:.6 }}>{hint}</span>}
      </div>
    </div>
  )
}

export default function Reports() {
  const currency = useCurrency()
  const [stats, setStats] = useState({
    orders_by_day: [], top_products: [], messages_today: 0, orders_today: 0,
    orders_total: 0, revenue_today: 0, revenue_total: 0, revenue_pending: 0,
    delivered_count: 0, active_conversations: 0,
    platform_distribution: [], status_distribution: [], hourly_distribution: [],
    deltas: { revenue_pct: 0, orders_pct: 0, avg_pct: 0 },
  })
  const [range, setRange] = useState('30')   // '7' | '30'
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
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
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Build daily series (filled with zeros for missing days)
  const daily = useMemo(() => {
    const days = Number(range)
    const map = new Map()
    ;(stats.orders_by_day || []).forEach(d => map.set((d.day || d.date || '').slice(0, 10), d))
    const arr = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0)
      const key = d.toISOString().slice(0, 10)
      const row = map.get(key) || { count: 0, revenue: 0 }
      arr.push({
        day: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
        orders: Number(row.count || 0),
        revenue: Math.round(Number(row.revenue || 0)),
      })
    }
    return arr
  }, [stats.orders_by_day, range])

  const platformData = (stats.platform_distribution || []).map(p => ({
    name: PLATFORM_NAMES[p.platform] || p.platform || '—',
    value: p.count || 0,
    platformKey: p.platform,
  })).filter(p => p.value > 0)

  const statusData = (stats.status_distribution || []).map(s => ({
    name: STATUS_NAMES[s.status] || s.status || '—',
    value: s.count || 0,
    statusKey: s.status,
  }))

  const peakHours = (stats.hourly_distribution || []).map(h => ({
    hour: `${String(h.hour).padStart(2,'0')}:00`,
    count: h.count || 0,
  }))

  const avgOrderValue = stats.delivered_count > 0 ? Math.round(stats.revenue_total / stats.delivered_count) : 0
  const conversionRate = stats.messages_today > 0 ? +((stats.orders_today / stats.messages_today) * 100).toFixed(1) : 0
  const completionRate = stats.orders_total > 0 ? Math.round((stats.delivered_count / stats.orders_total) * 100) : 0
  const d = stats.deltas || { revenue_pct: 0, orders_pct: 0, avg_pct: 0 }

  return (
    <div className="reports-pro animate-fade">
      <div className="page-header rep-head">
        <div className="rep-head-text">
          <div className="rep-head-eyebrow">
            <BarChart3 size={14}/> التقارير والتحليلات
          </div>
          <h1>أداء متجرك بنظرة واحدة</h1>
          <p>تحليل عميق لكل ما يحدث — إيرادات، طلبات، عملاء، منصات، وأوقات الذروة.</p>
        </div>
        <div className="rep-controls">
          <div className="rep-tabs">
            <button className={range === '7' ? 'on' : ''} onClick={() => setRange('7')}>7 أيام</button>
            <button className={range === '30' ? 'on' : ''} onClick={() => setRange('30')}>30 يوم</button>
          </div>
          <button className="btn btn-secondary" onClick={load}>↻ تحديث</button>
        </div>
      </div>

      {/* KPI cards row */}
      <div className="kpi-grid">
        <StatCard icon={DollarSign} label="إجمالي الإيرادات" color="#10b981"
          value={`${Number(stats.revenue_total || 0).toLocaleString()} ${currency}`}
          delta={d.revenue_pct} hint="من الطلبات المسلَّمة فقط" />
        <StatCard icon={ShoppingCart} label="إجمالي الطلبات" color="#3b82f6"
          value={stats.orders_total || 0} delta={d.orders_pct}
          hint={`مُسلَّمة: ${stats.delivered_count || 0}`} />
        <StatCard icon={Package} label="متوسط قيمة الطلب" color="#f59e0b"
          value={`${avgOrderValue.toLocaleString()} ${currency}`}
          delta={d.avg_pct} hint="للطلب المُسلَّم" />
        <StatCard icon={TrendingUp} label="معدل التحويل" color="#8b5cf6"
          value={`${conversionRate}%`} hint={`${stats.messages_today} رسالة → ${stats.orders_today} طلب اليوم`} />
        <StatCard icon={CheckCircle} label="معدل الإتمام" color="#06b6d4"
          value={`${completionRate}%`} hint={`${stats.delivered_count}/${stats.orders_total}`} />
        <StatCard icon={Users} label="محادثات نشطة" color="#ec4899"
          value={stats.active_conversations || 0} hint="حالياً تحت المعالجة" />
      </div>

      {/* Main chart: revenue + orders area combo */}
      <div className="card rep-card">
        <div className="rep-card-head">
          <div className="rep-card-title"><TrendingUp size={16}/> الإيرادات والطلبات — آخر {range} يوم</div>
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2BB24C" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#2BB24C" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gOrd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B3A8C" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#1B3A8C" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light, rgba(255,255,255,0.06))" />
              <XAxis dataKey="day" tick={{ fill:'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, fontFamily:'Cairo' }} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name={`الإيرادات (${currency})`} stroke="#2BB24C" strokeWidth={3} fill="url(#gRev)" />
              <Area type="monotone" dataKey="orders"  name="عدد الطلبات" stroke="#1B3A8C" strokeWidth={3} fill="url(#gOrd)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column row: daily orders bars + status pie */}
      <div className="rep-grid-2">
        <div className="card rep-card">
          <div className="rep-card-head"><div className="rep-card-title"><BarChart3 size={16}/> طلبات يومية</div></div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light, rgba(255,255,255,0.06))" />
                <XAxis dataKey="day" tick={{ fill:'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                <YAxis allowDecimals={false} tick={{ fill:'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, fontFamily:'Cairo' }} />
                <Bar dataKey="orders" name="طلبات" fill="#1B3A8C" radius={[8,8,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card rep-card">
          <div className="rep-card-head"><div className="rep-card-title"><PieIcon size={16}/> توزيع الحالات</div></div>
          <div style={{ height: 280, display:'flex', alignItems:'center' }}>
            {statusData.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                       label={(e) => `${e.name}: ${e.value}`} labelLine={false}>
                    {statusData.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.statusKey] || COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ width:'100%', textAlign:'center', opacity:.5 }}>لا توجد بيانات</div>}
          </div>
        </div>
      </div>

      {/* Two-column row: peak hours + platforms */}
      <div className="rep-grid-2">
        <div className="card rep-card">
          <div className="rep-card-head"><div className="rep-card-title"><Clock size={16}/> أوقات الذروة (آخر 30 يوم)</div></div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light, rgba(255,255,255,0.06))" />
                <XAxis dataKey="hour" interval={2} tick={{ fill:'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{ fill:'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, fontFamily:'Cairo' }} />
                <Bar dataKey="count" name="طلبات" fill="#f59e0b" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card rep-card">
          <div className="rep-card-head"><div className="rep-card-title"><BarChart3 size={16}/> توزيع المنصات</div></div>
          <div style={{ height: 240 }}>
            {platformData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light, rgba(255,255,255,0.06))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill:'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={80}/>
                  <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, fontFamily:'Cairo' }} />
                  <Bar dataKey="value" name="طلبات" radius={[0,8,8,0]}>
                    {platformData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', opacity:.5 }}>لا توجد بيانات</div>}
          </div>
        </div>
      </div>

      {/* Two-column: top products + KPI summary */}
      <div className="rep-grid-2">
        <div className="card rep-card">
          <div className="rep-card-head"><div className="rep-card-title"><Package size={16}/> أكثر المنتجات مبيعاً</div></div>
          <div className="top-products-list">
            {stats.top_products_parsed?.length ? stats.top_products_parsed.map((p, i) => (
              <div key={i} className="prod-row">
                <div className="prod-info">
                  <div className="prod-rank" style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</div>
                  <span className="prod-name">{p.name}</span>
                </div>
                <div className="prod-progress-bg">
                  <div className="prod-progress-fill"
                       style={{ width: `${(p.value / stats.top_products_parsed[0].value) * 100}%`, background: COLORS[i % COLORS.length] }} />
                </div>
                <span className="prod-count">{p.value} قطعة</span>
              </div>
            )) : <div style={{ opacity:.5, padding:30, textAlign:'center' }}>لا توجد بيانات بعد</div>}
          </div>
        </div>

        <div className="card rep-card">
          <div className="rep-card-head"><div className="rep-card-title">ملخص الأداء</div></div>
          <div style={{ padding:'4px 6px' }}>
            <SummaryRow label="إيرادات اليوم" value={`${Number(stats.revenue_today||0).toLocaleString()} ${currency}`} accent="#2BB24C" />
            <SummaryRow label="إيرادات قيد التحصيل" value={`${Number(stats.revenue_pending||0).toLocaleString()} ${currency}`} hint="طلبات لم تُسلَّم بعد" accent="#f59e0b" />
            <SummaryRow label="طلبات اليوم" value={stats.orders_today || 0} />
            <SummaryRow label="رسائل اليوم" value={stats.messages_today || 0} />
            <SummaryRow label="المحادثات النشطة" value={stats.active_conversations || 0} />
            <SummaryRow label="معدل الإتمام" value={`${completionRate}%`} hint="مُسلَّم ÷ إجمالي" />
          </div>
        </div>
      </div>
    </div>
  )
}
