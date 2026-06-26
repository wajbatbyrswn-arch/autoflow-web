import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Bell, ShoppingCart, AlertTriangle, Info, Trash2, MessageCircle } from 'lucide-react'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'

const TYPE_META = {
  order:     { label: 'طلب جديد', color: '#10b981', Icon: ShoppingCart },
  complaint: { label: 'شكوى',      color: '#ef4444', Icon: AlertTriangle },
  system:    { label: 'نظام',      color: '#3b82f6', Icon: Info },
}

export default function Notifications() {
  const nav = useNavigate()
  const confirm = useConfirm()
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await window.api?.notifications?.list?.({ limit: 100, type: filter === 'all' ? null : filter }) || []
      setItems(data)
    } catch (e) { toast.error('تعذّر جلب الإشعارات') }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function markRead(id) {
    await window.api?.notifications?.markRead?.(id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }
  async function del(id) {
    const ok = await confirm({ title: 'حذف الإشعار', message: 'هل تريد حذف هذا الإشعار نهائياً؟', confirmText: 'حذف', dangerous: true, rememberKey: 'notif_delete' })
    if (!ok) return
    await window.api?.notifications?.delete?.(id)
    setItems(prev => prev.filter(n => n.id !== id))
  }
  async function markAll() {
    await window.api?.notifications?.markAllRead?.()
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('تم وضع علامة مقروء على الكل')
  }

  function openConversation(id) {
    if (id) nav(`/conversations?open=${id}`)
  }

  const FILTERS = [
    { v: 'all', l: 'الكل' },
    { v: 'order', l: 'طلبات' },
    { v: 'complaint', l: 'شكاوى' },
    { v: 'system', l: 'نظام' },
  ]

  return (
    <div className="animate-fade" style={{ padding: 24 }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:10 }}><Bell size={26}/> الإشعارات</h1>
          <p>كل ما يحدث في متجرك في مكان واحد، مع إشعارات فورية على تلغرام.</p>
        </div>
        <button className="btn btn-secondary" onClick={markAll}>وضع علامة مقروء على الكل</button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            style={{
              padding:'8px 18px', borderRadius:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              background: filter === f.v ? 'var(--accent, #6C47FF)' : 'transparent',
              color: filter === f.v ? '#fff' : 'inherit',
              border: '1px solid var(--border-color, #2a2e37)',
            }}>{f.l}</button>
        ))}
      </div>

      {loading && <div style={{ opacity:.6, padding:30, textAlign:'center' }}>جارٍ التحميل...</div>}
      {!loading && items.length === 0 && (
        <div className="card" style={{ padding:40, textAlign:'center', opacity:.6 }}>
          <Bell size={36} style={{ opacity:.4, marginBottom:10 }} />
          <div>لا توجد إشعارات.</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {items.map(n => {
          const meta = TYPE_META[n.type] || TYPE_META.system
          const Icon = meta.Icon
          return (
            <div key={n.id} className="card" style={{
              padding:16, display:'flex', alignItems:'flex-start', gap:14,
              borderRight: `4px solid ${meta.color}`,
              background: n.is_read ? 'var(--bg-card)' : 'rgba(108,71,255,0.04)',
              cursor: n.is_read ? 'default' : 'pointer',
            }}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div style={{
                width:42, height:42, borderRadius:12, background: meta.color+'22',
                display:'flex', alignItems:'center', justifyContent:'center', color: meta.color,
                flexShrink: 0,
              }}>
                <Icon size={20} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ background: meta.color, color:'#fff', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>{meta.label}</span>
                  <strong style={{ fontSize:14 }}>{n.title}</strong>
                  {!n.is_read && <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444' }} />}
                  <span style={{ marginRight:'auto', fontSize:11, opacity:.5 }}>{new Date(n.created_at).toLocaleString('ar-EG')}</span>
                </div>
                <pre style={{ whiteSpace:'pre-wrap', margin:0, fontSize:13, color:'var(--text-secondary)', fontFamily:'inherit' }}>{n.body}</pre>
                {n.conversation_id && (
                  <button onClick={(e) => { e.stopPropagation(); openConversation(n.conversation_id) }}
                    style={{ marginTop:10, padding:'6px 14px', borderRadius:8, border:'1px solid var(--accent,#6C47FF)', background:'transparent', color:'var(--accent,#6C47FF)', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }}>
                    <MessageCircle size={14}/> فتح المحادثة
                  </button>
                )}
              </div>
              <button onClick={(e) => { e.stopPropagation(); del(n.id) }} title="حذف"
                style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', padding:6 }}>
                <Trash2 size={16}/>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
