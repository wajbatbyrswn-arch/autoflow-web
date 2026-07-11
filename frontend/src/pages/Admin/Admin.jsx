import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { rpc, BACKEND_URL } from '../../lib/apiClient'
import { useT } from '../../lib/i18n'

const STATUS = { active: 'نشط', inactive: 'غير نشط', expired: 'منتهي' }
const PROVIDER_LABELS = { google: 'Google Gemini', openai: 'OpenAI', anthropic: 'Anthropic', groq: 'Groq', mistral: 'Mistral', openrouter: 'OpenRouter', ollama: 'Ollama' }

export default function Admin() {
  const { t } = useT()
  const [codes, setCodes] = useState([])
  const [users, setUsers] = useState([])
  const [count, setCount] = useState(1)
  const [days, setDays] = useState(30)
  const [tgModal, setTgModal] = useState(null) // { user, tokenInput, botInfo, chats, selectedChat, loading }
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
      toast.success(`${t('تم توليد')} ${created.length} ${t('كود')}`)
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  async function updateUser(target_user_id, patch) {
    try {
      await rpc('admin:updateUser', { target_user_id, ...patch })
      setUsers(prev => prev.map(u => u.user_id === target_user_id ? { ...u, ...patch } : u))
      toast.success(t('تم التحديث'))
    } catch (e) { toast.error(e.message) }
  }

  const unused = codes.filter(c => !c.used_by)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('لوحة الإدارة')}</h1>
        <button onClick={() => toast.success('تم تشغيل الاختبار بنجاح! 🚀')} style={{ ...btn, background: '#22c55e' }}>Test 🚀</button>
      </div>

      <section style={card}>
        <h2 style={h2}>{t('توليد أكواد التفعيل')}</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={lbl}>{t('عدد الأكواد')}
            <input type="number" min={1} max={50} value={count} onChange={e => setCount(+e.target.value)} style={inp} />
          </label>
          <label style={lbl}>{t('مدة الاشتراك (يوم)')}
            <input type="number" min={1} value={days} onChange={e => setDays(+e.target.value)} style={inp} />
          </label>
          <button onClick={generate} disabled={loading} style={btn}>{loading ? '...' : t('توليد')}</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {unused.map(c => (
            <button key={c.id} onClick={() => { navigator.clipboard.writeText(c.code); toast.success(t('تم النسخ')) }}
              style={chip} title={t('نسخ')}>{c.code} <span style={{ opacity: .6, fontSize: 11 }}>{c.duration_days}{t('د')}</span></button>
          ))}
          {!unused.length && <span style={{ opacity: .6 }}>{t('لا توجد أكواد متاحة')}</span>}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>{t('المستخدمون')} ({users.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr style={{ textAlign: 'right', opacity: .7 }}>
            <th style={th}>{t('المتجر')}</th><th style={th}>ID</th><th style={th}>{t('الحالة')}</th><th style={th}>{t('الخصم')}</th><th style={th}>{t('الموديل')}</th><th style={th}>{t('الانتهاء')}</th><th style={th}>{t('تلغرام (توكن)')}</th><th style={th}>{t('صفحات ناشر')}</th><th style={th}>Webhook + Business</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} style={{ borderTop: '1px solid var(--border-color,#2a2e37)' }}>
                <td style={td}>{u.full_name || u.email || u.user_id.slice(0, 8)}</td>
                <td style={{ ...td, fontFamily:'monospace', fontSize:11, opacity:.6 }}>
                  <span style={{cursor:'pointer'}} title={u.user_id} onClick={()=>{ navigator.clipboard.writeText(u.user_id); toast.success(t('نُسخ الـ ID')) }}>
                    {u.user_id.slice(0,8)}
                  </span>
                </td>
                <td style={td}>
                  <select value={u.subscription_status} onChange={e => updateUser(u.user_id, { subscription_status: e.target.value })} style={sel}>
                    <option value="active">{t('نشط')}</option><option value="inactive">{t('غير نشط')}</option><option value="expired">{t('منتهي')}</option>
                  </select>
                </td>
                <td style={td}>
                  <DiscountBadge createdAt={u.created_at} />
                </td>
                <td style={td}>
                  <select value={u.ai_provider || ''} onChange={e => updateUser(u.user_id, { ai_provider: e.target.value })} style={sel}>
                    <option value="">⭐ {t('الافتراضي')} ({PROVIDER_LABELS[aiActive] || aiActive})</option>
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
                <td style={{ ...td, minWidth: 200 }}>
                  <button onClick={() => setTgModal({
                    user: u,
                    tokenInput: u.telegram_bot_token || '',
                    botInfo: u.telegram_bot_token ? { username: 'محفوظ' } : null,
                    chats: [], selectedChat: u.admin_telegram_chat_id || '', loading: false,
                  })}
                    style={{ ...btn, padding: '8px 14px', fontSize: 12, width: '100%' }}>
                    🤖 {t('إدارة بوت تلغرام')}
                  </button>
                  <div style={{ fontSize: 10, opacity: .55, marginTop: 4, textAlign: 'center', direction: 'rtl' }}>
                    {u.telegram_bot_token ? (
                      <span style={{ color: '#34d399' }}>● {t('مربوط')} {u.admin_telegram_chat_id ? `· ${u.admin_telegram_chat_id.slice(0, 14)}…` : t('(بدون قناة)')}</span>
                    ) : <span style={{ color: '#fca5a5' }}>○ {t('غير مربوط')}</span>}
                  </div>
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
                  <div style={{ fontSize: 10, opacity: .5, marginTop: 2 }}>{t('اتركه فارغاً = كل الرسائل')}</div>
                  <PlatformsCheckboxes user={u} onChange={(platforms) => {
                    rpc('admin:setLinkedPlatforms', { target_user_id: u.user_id, platforms })
                      .then(() => {
                        setUsers(prev => prev.map(x => x.user_id === u.user_id ? { ...x, nashir_linked_platforms: platforms } : x))
                        toast.success(t('تم تحديث المنصات'))
                      })
                      .catch(e => toast.error(e.message))
                  }} />
                </td>
                <td style={{ ...td, minWidth: 260 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input dir="ltr" readOnly value={`${BACKEND_URL}/api/nashir/webhook/${u.nashir_webhook_token || ''}`}
                      style={{ ...sel, flex: 1, fontSize: 11, fontFamily: 'monospace' }}
                      onFocus={e => e.target.select()} />
                    <button onClick={() => { navigator.clipboard.writeText(`${BACKEND_URL}/api/nashir/webhook/${u.nashir_webhook_token || ''}`); toast.success(t('تم نسخ رابط الويبهوك')) }}
                      style={{ ...btn, padding: '6px 12px' }}>{t('نسخ')}</button>
                  </div>
                  <input dir="ltr" placeholder={t('business_id (من ناشر)')}
                    defaultValue={u.nashir_business_id || ''}
                    onBlur={e => { if (e.target.value !== (u.nashir_business_id||'')) updateUser(u.user_id, { nashir_business_id: e.target.value.trim() }) }}
                    style={{ ...sel, width: '100%', fontSize: 12 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {tgModal && <TelegramModal state={tgModal} setState={setTgModal} onSaved={(patch) => {
        setUsers(prev => prev.map(u => u.user_id === tgModal.user.user_id ? { ...u, ...patch } : u))
      }} />}
    </div>
  )
}

function TelegramModal({ state, setState, onSaved }) {
  const { t } = useT()
  const { user, tokenInput, botInfo, chats, selectedChat, loading } = state
  async function saveToken() {
    setState(s => ({ ...s, loading: true }))
    try {
      const res = await rpc('admin:tgSaveTokenFor', { target_user_id: user.user_id, token: tokenInput.trim() })
      if (res?.success) {
        toast.success(res.bot ? `${t('تم الربط:')} @${res.bot.username}` : t('تم الحفظ'))
        setState(s => ({ ...s, botInfo: res.bot || null, loading: false }))
        onSaved({ telegram_bot_token: tokenInput.trim() })
      } else { toast.error(res?.error || t('فشل التحقق')); setState(s => ({ ...s, loading: false })) }
    } catch (e) { toast.error(e.message); setState(s => ({ ...s, loading: false })) }
  }
  async function fetchChats() {
    setState(s => ({ ...s, loading: true }))
    try {
      const res = await rpc('admin:tgListChatsFor', { target_user_id: user.user_id })
      if (res?.success) {
        setState(s => ({ ...s, chats: res.chats || [], loading: false }))
        if (!res.chats?.length) toast(t('أضف البوت للقناة كأدمن وأرسل رسالة، ثم أعد المحاولة'), { duration: 6000, icon: 'ℹ️' })
      } else { toast.error(res?.error || t('فشل الجلب')); setState(s => ({ ...s, loading: false })) }
    } catch (e) { toast.error(e.message); setState(s => ({ ...s, loading: false })) }
  }
  async function saveChat() {
    if (!selectedChat) return
    try {
      await rpc('admin:tgSaveChatFor', { target_user_id: user.user_id, chat_id: selectedChat })
      toast.success(t('تم حفظ القناة'))
      onSaved({ admin_telegram_chat_id: selectedChat })
    } catch (e) { toast.error(e.message) }
  }
  async function sendTest() {
    setState(s => ({ ...s, loading: true }))
    const res = await rpc('admin:tgTestFor', { target_user_id: user.user_id }).catch(e => ({ success: false, error: e.message }))
    setState(s => ({ ...s, loading: false }))
    if (res?.success) toast.success(t('وصلت رسالة الاختبار ✓'))
    else toast.error(res?.error || t('فشل'))
  }
  return (
    <div onClick={() => setState(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:9999, padding:'40px 20px', overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card,#1a1d24)', border:'1px solid var(--border-color,#2a2e37)', borderRadius:16, padding:24, width:'100%', maxWidth:520, color:'var(--text,#fff)', direction:'rtl', fontFamily:'Cairo,sans-serif' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, paddingBottom:12, borderBottom:'1px solid var(--border-color,#2a2e37)' }}>
          <h3 style={{ margin:0, fontSize:17 }}>🤖 {t('بوت تلغرام')} · {user.full_name || user.email || user.user_id.slice(0,8)}</h3>
          <button onClick={() => setState(null)} style={{ background:'transparent', border:'none', color:'#fff', fontSize:18, cursor:'pointer' }}>✕</button>
        </div>

        {/* Step 1: token */}
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:6 }}>{t('1. توكن البوت (من @BotFather)')}</label>
          <div style={{ display:'flex', gap:6 }}>
            <input dir="ltr" value={tokenInput} placeholder="123456789:AAAA..." onChange={e => setState(s => ({ ...s, tokenInput: e.target.value }))}
              style={{ ...sel, flex:1, fontFamily:'monospace', fontSize:12 }} />
            <button onClick={saveToken} disabled={loading || !tokenInput.trim()} style={{ ...btn, padding:'8px 16px', fontSize:12 }}>
              {loading ? '...' : t('حفظ وتحقق')}
            </button>
          </div>
          {botInfo && <div style={{ marginTop:6, fontSize:12, color:'#34d399' }}>✓ {botInfo.username ? `@${botInfo.username}` : t('محفوظ')}</div>}
        </div>

        {/* Step 2: chats */}
        {botInfo && (
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:6 }}>{t('2. اختر القناة/الجروب')}</label>
            <div style={{ background:'rgba(34,158,217,0.07)', border:'1px dashed rgba(34,158,217,0.3)', borderRadius:8, padding:'8px 12px', fontSize:11, lineHeight:1.8, marginBottom:8, color:'var(--text-secondary,#c5cde0)' }}>
              {t('أضف البوت للقناة كأدمن، أرسل أي رسالة، ثم اضغط جلب القنوات.')}
            </div>
            <button onClick={fetchChats} disabled={loading} style={{ ...btn, background:'transparent', border:'1px solid var(--border-color,#2a2e37)', color:'var(--text)', width:'100%', marginBottom:8 }}>
              {loading ? t('جارٍ الجلب...') : '🔄 ' + t('جلب القنوات/الجروبات')}
            </button>
            {chats.length > 0 ? (
              <>
                <select value={selectedChat} onChange={e => setState(s => ({ ...s, selectedChat: e.target.value }))}
                  style={{ ...sel, width:'100%', padding:9, fontSize:13, marginBottom:8 }}>
                  <option value="">— {t('اختر')} —</option>
                  {chats.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.type === 'channel' ? '📢 ' + t('قناة') : c.type === 'group' || c.type === 'supergroup' ? '👥 ' + t('جروب') : '👤 ' + t('خاص')} — {c.title}{c.username ? ` (@${c.username})` : ''}
                    </option>
                  ))}
                </select>
                <button onClick={saveChat} disabled={!selectedChat} style={{ ...btn, width:'100%', padding:'9px 16px', fontSize:13 }}>💾 {t('حفظ الاختيار')}</button>
              </>
            ) : selectedChat ? (
              <div style={{ fontSize:12, opacity:.7, padding:'8px 12px', background:'var(--glass-bg,rgba(255,255,255,0.04))', borderRadius:8, fontFamily:'monospace', direction:'ltr', textAlign:'right' }}>
                {t('المحفوظ حالياً:')} {selectedChat}
              </div>
            ) : null}
          </div>
        )}

        {/* Step 3: test */}
        {botInfo && selectedChat && (
          <button onClick={sendTest} disabled={loading} style={{ ...btn, background:'#10b981', width:'100%', padding:'10px 16px', fontSize:13 }}>
            {loading ? t('جارٍ الإرسال...') : '🧪 ' + t('إرسال رسالة اختبار')}
          </button>
        )}
      </div>
    </div>
  )
}

function DiscountBadge({ createdAt }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!createdAt) return
    const ms = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now()
    if (ms <= 0) return
    const id = setInterval(() => setTick(t => t + 1), 60000) // re-render every minute
    return () => clearInterval(id)
  }, [createdAt])

  if (!createdAt) return <span style={{ opacity: 0.4, fontSize: 11 }}>—</span>
  const ms = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now()
  if (ms <= 0) return <span style={{ color: '#9aa0ac', fontSize: 11 }}>منتهي</span>

  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  return (
    <span style={{ color: '#10b981', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      🎉 نشط ({hours}س {mins}د)
    </span>
  )
}

function PlatformsCheckboxes({ user, onChange }) {
  const current = Array.isArray(user.nashir_linked_platforms) ? user.nashir_linked_platforms : []
  const PLATFORMS = [
    { key: 'facebook',  label: '📘 FB' },
    { key: 'instagram', label: '📸 IG' },
    { key: 'whatsapp',  label: '🟢 WA' },
    { key: 'telegram',  label: '✈️ TG' },
  ]
  function toggle(key) {
    const next = current.includes(key) ? current.filter(p => p !== key) : [...current, key]
    onChange(next)
  }
  return (
    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap', borderTop: '1px dashed var(--border-color,#2a2e37)', paddingTop: 6 }}>
      {PLATFORMS.map(p => (
        <label key={p.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, cursor: 'pointer', padding: '2px 6px', borderRadius: 6, background: current.includes(p.key) ? 'rgba(108,71,255,0.2)' : 'transparent', border: '1px solid ' + (current.includes(p.key) ? 'var(--accent,#6C47FF)' : 'var(--border-color,#2a2e37)') }}>
          <input type="checkbox" checked={current.includes(p.key)} onChange={() => toggle(p.key)} style={{ margin: 0 }} />
          {p.label}
        </label>
      ))}
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
