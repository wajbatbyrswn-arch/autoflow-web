import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertOctagon, MessageCircle, CheckCircle2, Play, Trash2 } from 'lucide-react'

export default function Complaints() {
  const nav = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await window.api?.notifications?.list?.({ type: 'complaint', limit: 100 }) || []
      setItems(data)
    } catch { toast.error('تعذّر جلب الشكاوى') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function markResolved(c) {
    await window.api?.notifications?.markRead?.(c.id)
    setItems(prev => prev.map(n => n.id === c.id ? { ...n, is_read: true } : n))
    toast.success('تم تعليمها كمحلولة')
  }
  async function resumeAI(c) {
    if (!c.conversation_id) return
    await window.api?.conversations?.resumeAI?.(c.conversation_id)
    toast.success('تم استئناف الرد الذكي')
  }
  async function del(c) {
    if (!confirm('حذف الشكوى من السجل؟')) return
    await window.api?.notifications?.delete?.(c.id)
    setItems(prev => prev.filter(n => n.id !== c.id))
  }

  const open = items.filter(c => !c.is_read)
  const resolved = items.filter(c => c.is_read)

  function Card({ c }) {
    return (
      <div className="card" style={{ padding:18, borderRight:'4px solid #ef4444', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
          <span style={{ background:'#ef4444', color:'#fff', padding:'3px 10px', borderRadius:8, fontSize:11, fontWeight:800 }}>
            {c.is_read ? 'محلولة' : 'مفتوحة'}
          </span>
          <strong style={{ fontSize:15 }}>{c.title}</strong>
          <span style={{ marginRight:'auto', fontSize:11, opacity:.55 }}>
            {new Date(c.created_at).toLocaleString('ar-EG')}
          </span>
        </div>
        <pre style={{ whiteSpace:'pre-wrap', margin:'0 0 12px', fontSize:13.5, color:'var(--text-secondary)', fontFamily:'inherit', lineHeight:1.8 }}>{c.body}</pre>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {c.conversation_id && (
            <button onClick={() => nav(`/conversations?open=${c.conversation_id}`)}
              style={{ background:'var(--accent,#6C47FF)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }}>
              <MessageCircle size={14}/> الانتقال إلى الدردشة
            </button>
          )}
          {!c.is_read && (
            <button onClick={() => markResolved(c)}
              style={{ background:'#10b981', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }}>
              <CheckCircle2 size={14}/> تعليمها محلولة
            </button>
          )}
          {c.conversation_id && (
            <button onClick={() => resumeAI(c)}
              style={{ background:'transparent', color:'var(--text)', border:'1px solid var(--border-color,#2a2e37)', borderRadius:8, padding:'8px 16px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }}>
              <Play size={14}/> استئناف الرد الذكي
            </button>
          )}
          <button onClick={() => del(c)} title="حذف"
            style={{ background:'transparent', color:'#ef4444', border:'1px solid rgba(239,68,68,0.4)', borderRadius:8, padding:'8px 12px', cursor:'pointer', marginRight:'auto' }}>
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade" style={{ padding:24 }}>
      <div className="page-header">
        <h1 style={{ display:'flex', alignItems:'center', gap:10 }}><AlertOctagon size={26}/> الشكاوى</h1>
        <p>الشكاوى المرصودة تلقائياً من محادثات الزبائن. الرد الذكي يتوقف فوراً عند رصد شكوى.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        <div className="card" style={{ padding:18, textAlign:'center' }}>
          <div style={{ fontSize:32, fontWeight:900, color:'#ef4444' }}>{open.length}</div>
          <div style={{ opacity:.6, fontSize:13 }}>مفتوحة</div>
        </div>
        <div className="card" style={{ padding:18, textAlign:'center' }}>
          <div style={{ fontSize:32, fontWeight:900, color:'#10b981' }}>{resolved.length}</div>
          <div style={{ opacity:.6, fontSize:13 }}>محلولة</div>
        </div>
        <div className="card" style={{ padding:18, textAlign:'center' }}>
          <div style={{ fontSize:32, fontWeight:900 }}>{items.length}</div>
          <div style={{ opacity:.6, fontSize:13 }}>إجمالي</div>
        </div>
      </div>

      {loading && <div style={{ opacity:.6, padding:30, textAlign:'center' }}>جارٍ التحميل...</div>}
      {!loading && items.length === 0 && (
        <div className="card" style={{ padding:40, textAlign:'center', opacity:.6 }}>
          <AlertOctagon size={36} style={{ opacity:.4, marginBottom:10 }} />
          <div>لا توجد شكاوى — أداء ممتاز! 🎉</div>
        </div>
      )}

      {open.length > 0 && (
        <>
          <h3 style={{ margin:'10px 0 12px', fontSize:14, opacity:.7 }}>الشكاوى المفتوحة</h3>
          {open.map(c => <Card key={c.id} c={c} />)}
        </>
      )}
      {resolved.length > 0 && (
        <>
          <h3 style={{ margin:'24px 0 12px', fontSize:14, opacity:.7 }}>الشكاوى المحلولة</h3>
          {resolved.map(c => <Card key={c.id} c={c} />)}
        </>
      )}
    </div>
  )
}
