import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { rpc, BACKEND_URL } from '../../lib/apiClient'

const STATUS = { active: 'نشط', inactive: 'غير نشط', expired: 'منتهي' }
const PROVIDER_LABELS = { google: 'Google Gemini', openai: 'OpenAI', anthropic: 'Anthropic', groq: 'Groq', mistral: 'Mistral', openrouter: 'OpenRouter', ollama: 'Ollama' }

export default function Admin() {
  const [codes, setCodes] = useState([])
  const [users, setUsers] = useState([])
  const [count, setCount] = useState(1)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [nashirAccounts, setNashirAccounts] = useState([])
  const [aiProviders, setAiProviders] = useState([])
  const [aiActive, setAiActive] = useState('google')

  async function load() {
    try {
      setCodes(await rpc('admin:getCodes'))
      setUsers(await rpc('admin:getUsers'))
      setNashirAccounts(await rpc('admin:nashirAccounts').catch(() => []))
      const ai = await rpc('admin:getAiProviders').catch(() => null)
      if (ai) { setAiProviders(ai.providers || []); setAiActive(ai.active || 'google') }
    } catch (e) { toast.error(e.message) }
  }
  useEffect(() => { load() }, [])

  async function generate() {
    setLoading(true)
    try {
      const created = await rpc('admin:generateCodes', { count, duration_days: days })
      setCodes(prev => [...created, ...prev])
      toast.success(`تم توليد ${created.length} كود`)
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  async function updateUser(target_user_id, patch) {
    try {
      await rpc('admin:updateUser', { target_user_id, ...patch })
      setUsers(prev => prev.map(u => u.user_id === target_user_id ? { ...u, ...patch } : u))
      toast.success('تم التحديث')
    } catch (e) { toast.error(e.message) }
  }

  const unused = codes.filter(c => !c.used_by)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>لوحة الإدارة</h1>

      <section style={card}>
        <h2 style={h2}>توليد أكواد التفعيل</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={lbl}>عدد الأكواد
            <input type="number" min={1} max={50} value={count} onChange={e => setCount(+e.target.value)} style={inp} />
          </label>
          <label style={lbl}>مدة الاشتراك (يوم)
            <input type="number" min={1} value={days} onChange={e => setDays(+e.target.value)} style={inp} />
          </label>
          <button onClick={generate} disabled={loading} style={btn}>{loading ? '...' : 'توليد'}</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {unused.map(c => (
            <button key={c.id} onClick={() => { navigator.clipboard.writeText(c.code); toast.success('تم النسخ') }}
              style={chip} title="نسخ">{c.code} <span style={{ opacity: .6, fontSize: 11 }}>{c.duration_days}د</span></button>
          ))}
          {!unused.length && <span style={{ opacity: .6 }}>لا توجد أكواد متاحة</span>}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>المستخدمون ({users.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr style={{ textAlign: 'right', opacity: .7 }}>
            <th style={th}>المتجر</th><th style={th}>ID</th><th style={th}>الحالة</th><th style={th}>الموديل</th><th style={th}>الانتهاء</th><th style={th}>تلغرام (توكن)</th><th style={th}>صفحات ناشر</th><th style={th}>Webhook + Business</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} style={{ borderTop: '1px solid var(--border-color,#2a2e37)' }}>
                <td style={td}>{u.full_name || u.email || u.user_id.slice(0, 8)}</td>
                <td style={{ ...td, fontFamily:'monospace', fontSize:11, opacity:.6 }}>
                  <span style={{cursor:'pointer'}} title={u.user_id} onClick={()=>{ navigator.clipboard.writeText(u.user_id); toast.success('نُسخ الـ ID') }}>
                    {u.user_id.slice(0,8)}
                  </span>
                </td>
                <td style={td}>
                  <select value={u.subscription_status} onChange={e => updateUser(u.user_id, { subscription_status: e.target.value })} style={sel}>
                    <option value="active">نشط</option><option value="inactive">غير نشط</option><option value="expired">منتهي</option>
                  </select>
                </td>
                <td style={td}>
                  <select value={u.ai_provider || ''} onChange={e => updateUser(u.user_id, { ai_provider: e.target.value })} style={sel}>
                    <option value="">⭐ الافتراضي ({PROVIDER_LABELS[aiActive] || aiActive})</option>
                    {aiProviders.map(p => (
                      <option key={p.provider} value={p.provider}>{PROVIDER_LABELS[p.provider] || p.provider}{p.model ? ` — ${p.model}` : ''}</option>
                    ))}
                  </select>
                </td>
                <td style={td}>
                  <input type="date" defaultValue={(u.subscription_expires_at || '').slice(0,10)}
                    onBlur={e => { const v = e.target.value; if (v !== (u.subscription_expires_at||'').slice(0,10)) updateUser(u.user_id, { subscription_expires_at: v ? new Date(v).toISOString() : null }) }}
                    style={{ ...sel, fontSize: 12 }} />
                </td>
                <td style={{ ...td, minWidth: 220 }}>
                  <input dir="ltr" placeholder="123456:ABC..."
                    defaultValue={u.telegram_bot_token || ''}
                    onBlur={e => { if (e.target.value !== (u.telegram_bot_token||'')) updateUser(u.user_id, { telegram_bot_token: e.target.value.trim() }) }}
                    style={{ ...sel, width: '100%', fontSize: 11, fontFamily:'monospace' }} />
                  <div style={{ fontSize: 10, opacity: .5, marginTop: 2 }}>توكن بوت تلغرام للمستخدم</div>
                </td>
                <td style={td}>
                  <select multiple value={(u.nashir_account_ids || []).map(String)} style={{ ...sel, minWidth: 180, minHeight: 64 }}
                    onChange={e => {
                      const ids = Array.from(e.target.selectedOptions).map(o => o.value)
                      updateUser(u.user_id, { nashir_account_ids: ids })
                    }}>
                    {nashirAccounts.map(a => (
                      <option key={a.pageId} value={a.pageId}>{a.platform === 'instagram' ? '📸' : '📘'} {a.pageName}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 10, opacity: .5, marginTop: 2 }}>اتركه فارغاً = كل الرسائل</div>
                </td>
                <td style={{ ...td, minWidth: 260 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input dir="ltr" readOnly value={`${BACKEND_URL}/api/nashir/webhook/${u.nashir_webhook_token || ''}`}
                      style={{ ...sel, flex: 1, fontSize: 11, fontFamily: 'monospace' }}
                      onFocus={e => e.target.select()} />
                    <button onClick={() => { navigator.clipboard.writeText(`${BACKEND_URL}/api/nashir/webhook/${u.nashir_webhook_token || ''}`); toast.success('تم نسخ رابط الويبهوك') }}
                      style={{ ...btn, padding: '6px 12px' }}>نسخ</button>
                  </div>
                  <input dir="ltr" placeholder="business_id (من ناشر)"
                    defaultValue={u.nashir_business_id || ''}
                    onBlur={e => { if (e.target.value !== (u.nashir_business_id||'')) updateUser(u.user_id, { nashir_business_id: e.target.value.trim() }) }}
                    style={{ ...sel, width: '100%', fontSize: 12 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

const card = { background: 'var(--bg-card,#1a1d24)', border: '1px solid var(--border-color,#2a2e37)', borderRadius: 16, padding: 20 }
const h2 = { fontSize: 16, fontWeight: 700, marginBottom: 14 }
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, opacity: .8 }
const inp = { padding: 8, borderRadius: 10, border: '1px solid var(--border-color,#2a2e37)', background: 'var(--bg-main,#0f1115)', color: 'inherit', width: 110 }
const btn = { background: 'var(--accent,#6C47FF)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontWeight: 700, cursor: 'pointer' }
const chip = { fontFamily: 'monospace', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border-color,#2a2e37)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 11, wordBreak: 'break-all', maxWidth: 280 }
const th = { padding: '8px 6px' }
const td = { padding: '10px 6px' }
const sel = { padding: 6, borderRadius: 8, border: '1px solid var(--border-color,#2a2e37)', background: 'var(--bg-main,#0f1115)', color: 'inherit' }
