import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { MessageCircle, Trash2, Edit3, Plus, Power, Sparkles, AlertOctagon, X, FlaskConical } from 'lucide-react'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import { parsePostUrl } from '../../lib/postUrlParser'
import './CommentAutomation.css'

const TABS = [
  { id: 'inbox',      label: 'صندوق التعليقات' },
  { id: 'automation', label: 'اتمتة التعليقات' },
  { id: 'settings',   label: 'الإعدادات' },
]

const PLATFORM_ICON = { facebook: facebookIcon, instagram: instagramIcon }
const PLATFORM_NAME = { facebook: 'فيسبوك', instagram: 'إنستغرام' }
const PLATFORM_COLOR = { facebook: '#1877F2', instagram: '#C13584' }

function emptyAutomation() {
  return {
    platform: 'facebook',
    post_id: '',
    post_url: '',
    post_title: '',
    trigger_keywords: [],
    comment_reply: 'شكراً على تعليقك! تم إرسال التفاصيل لك على الخاص ✨',
    dm_message: '',
    dm_attachment_url: '',
    is_active: true,
  }
}

export default function CommentAutomation() {
  const confirm = useConfirm()
  const [tab, setTab] = useState('inbox')
  const [comments, setComments] = useState([])
  const [automations, setAutomations] = useState([])
  const [settings, setSettings] = useState({ auto_delete_bad_comments: false, ai_reply_comments_enabled: true })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [postUrlInput, setPostUrlInput] = useState('')
  const [urlParseStatus, setUrlParseStatus] = useState(null) // 'ok' | 'bad' | null
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  async function loadAll() {
    setLoading(true)
    try {
      const [c, a, s] = await Promise.all([
        window.api?.comments?.list?.({ limit: 100 }).catch(() => []) || [],
        window.api?.comments?.automations?.().catch(() => []) || [],
        window.api?.comments?.getSettings?.().catch(() => ({})) || {},
      ])
      setComments(c); setAutomations(a)
      setSettings(prev => ({ ...prev, ...s }))
    } catch (e) { toast.error('تعذّر تحميل البيانات') }
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  async function deleteComment(id) {
    const ok = await confirm({
      title: 'حذف التعليق',
      message: 'سيتم إخفاء التعليق من القائمة. هل تريد المتابعة؟',
      confirmText: 'نعم، احذف',
      dangerous: true,
      rememberKey: 'comment_delete',
    })
    if (!ok) return
    await window.api?.comments?.deleteComment?.(id)
    setComments(prev => prev.map(c => c.id === id ? { ...c, deleted: true } : c))
    toast.success('تم الحذف')
  }

  async function saveSettings(patch) {
    const next = { ...settings, ...patch }
    setSettings(next)
    await window.api?.comments?.saveSettings?.(next)
    toast.success('تم الحفظ')
  }

  async function saveAutomation() {
    if (!editing.trigger_keywords?.length || !editing.comment_reply) {
      toast.error('الحقول المطلوبة: الكلمات المفتاحية ورد التعليق')
      return
    }
    try {
      const saved = await window.api?.comments?.saveAutomation?.(editing)
      toast.success('تم الحفظ ✓')
      setEditing(null); setKeywordInput('')
      setAutomations(prev => editing.id ? prev.map(a => a.id === editing.id ? saved : a) : [saved, ...prev])
    } catch (e) { toast.error(e.message || 'فشل الحفظ') }
  }

  async function deleteAutomation(id) {
    const ok = await confirm({
      title: 'حذف الاتمتة',
      message: 'سيتم حذف اتمتة المنشور نهائياً. لا يمكن التراجع.',
      confirmText: 'نعم، احذف',
      dangerous: true,
      rememberKey: 'automation_delete',
    })
    if (!ok) return
    await window.api?.comments?.deleteAutomation?.(id)
    setAutomations(prev => prev.filter(a => a.id !== id))
    toast.success('تم الحذف')
  }

  function applyPostUrl() {
    const parsed = parsePostUrl(postUrlInput)
    if (!parsed) { setUrlParseStatus('bad'); toast.error('لم نستطع قراءة الرابط — تأكد أنه رابط منشور Facebook أو Instagram'); return }
    setEditing(p => ({ ...p, post_id: parsed.post_id, post_url: parsed.post_url, platform: parsed.platform }))
    setUrlParseStatus('ok')
    toast.success(`تم التعرف: ${parsed.platform === 'facebook' ? 'فيسبوك' : 'إنستغرام'} — ID: ${parsed.post_id}`)
  }

  async function runTest() {
    if (!editing?.trigger_keywords?.length) { toast.error('أضف كلمة مفتاحية أولاً'); return }
    if (!editing?.comment_reply) { toast.error('املأ رد التعليق أولاً'); return }
    setTesting(true)
    try {
      const res = await window.api?.comments?.testAutomation?.(editing)
      if (res?.success) setTestResult(res)
      else toast.error(res?.error || 'فشل الاختبار')
    } catch (e) { toast.error(e.message) }
    setTesting(false)
  }

  async function toggleAutomation(a) {
    await window.api?.comments?.toggleAutomation?.(a.id, !a.is_active)
    setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x))
  }

  function addKeyword() {
    const v = keywordInput.trim()
    if (!v) return
    setEditing(p => ({ ...p, trigger_keywords: [...(p.trigger_keywords || []), v] }))
    setKeywordInput('')
  }
  function removeKeyword(k) {
    setEditing(p => ({ ...p, trigger_keywords: p.trigger_keywords.filter(x => x !== k) }))
  }

  return (
    <div className="animate-fade ca-page">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageCircle size={24} /> اتمتة التعليقات
        </h1>
        <p>أدر تعليقاتك على فيسبوك وإنستغرام: ردود ذكية تلقائية، حذف التعليقات السيئة، وإطلاق رسائل خاصة عند كلمات معيّنة.</p>
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`ca-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== INBOX ===== */}
      {tab === 'inbox' && (
        <div className="ca-section">
          {loading ? <div className="ca-empty">جارٍ التحميل...</div> :
            comments.length === 0 ? <div className="ca-empty">لا توجد تعليقات بعد. ستظهر هنا تلقائياً عند ربط حساباتك.</div> :
            <div className="comments-list">
              {comments.map(c => {
                const color = PLATFORM_COLOR[c.platform] || '#888'
                return (
                  <div key={c.id} className={`comment-card ${c.deleted ? 'deleted' : ''}`} style={{ borderRightColor: color }}>
                    <div className="cc-head">
                      <img src={PLATFORM_ICON[c.platform]} alt={c.platform} className="cc-platform-ico" />
                      <strong>{c.commenter_name || 'متابع'}</strong>
                      {c.is_negative && <span className="tag tag-red"><AlertOctagon size={11} /> تعليق سلبي</span>}
                      {c.ai_replied && <span className="tag tag-green">✓ تم الرد</span>}
                      {c.automation_triggered && <span className="tag tag-blue"><Sparkles size={11} /> اتمتة</span>}
                      {c.deleted && <span className="tag tag-grey">محذوف</span>}
                    </div>
                    <p className="cc-body">{c.content}</p>
                    {c.post_id && <div className="cc-post">المنشور: {c.post_id.slice(0, 30)}{c.post_id.length > 30 ? '...' : ''}</div>}
                    <div className="cc-foot">
                      <span className="cc-time">{new Date(c.created_at).toLocaleString('ar-EG')}</span>
                      {!c.deleted && (
                        <button className="cc-del-btn" onClick={() => deleteComment(c.id)}>
                          <Trash2 size={13} /> إخفاء/حذف
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}

      {/* ===== AUTOMATIONS ===== */}
      {tab === 'automation' && (
        <div className="ca-section">
          <div className="ca-info-box">
            <Sparkles size={18} />
            <div>
              <strong>كيف تعمل اتمتة التعليقات؟</strong>
              <p>عندما يعلّق أي شخص بكلمة من الكلمات المفتاحية على أي منشور، يتم تلقائياً الرد العلني على تعليقه. الرد الذكي يتوقف تلقائياً لأي تعليق طابق الكلمات المفتاحية.</p>
              <p style={{marginTop:6, opacity:.7, fontSize:12}}>ملاحظة: رسالة الخاص (DM) محفوظة للمستقبل — Nashir لا يدعم إرسال DM جديد للمعلّقين حالياً. سيُرسَل الخاص لهم عند مراسلتهم لك أولاً.</p>
            </div>
          </div>

          <button className="btn btn-primary ca-add-btn" onClick={() => { setEditing(emptyAutomation()); setPostUrlInput(''); setUrlParseStatus(null); setTestResult(null); setKeywordInput('') }}>
            <Plus size={16} /> إضافة اتمتة جديدة
          </button>

          {automations.length === 0 ? (
            <div className="ca-empty">لا توجد اتمتات بعد. اضغط "إضافة" أعلاه لبدء أول واحدة.</div>
          ) : (
            <div className="automations-grid">
              {automations.map(a => (
                <div key={a.id} className={`auto-card ${a.is_active ? '' : 'off'}`}>
                  <div className="auto-head">
                    <img src={PLATFORM_ICON[a.platform]} className="cc-platform-ico" />
                    <strong>{a.post_title || `منشور ${a.post_id.slice(0, 12)}...`}</strong>
                    <span className={`tag ${a.is_active ? 'tag-green' : 'tag-grey'}`}>
                      {a.is_active ? 'نشطة' : 'متوقفة'}
                    </span>
                  </div>
                  <div className="auto-kws">
                    {(a.trigger_keywords || []).map(k => <span key={k} className="kw-chip">#{k}</span>)}
                  </div>
                  <div className="auto-preview">
                    <div><strong>الرد العام:</strong> {a.comment_reply}</div>
                    <div><strong>رسالة الخاص:</strong> {a.dm_message.slice(0, 80)}{a.dm_message.length > 80 ? '...' : ''}</div>
                    {a.dm_attachment_url && <div><strong>مرفق:</strong> <a href={a.dm_attachment_url} target="_blank" rel="noreferrer">رابط</a></div>}
                  </div>
                  <div className="auto-foot">
                    <span style={{ opacity: .6, fontSize: 12 }}>تم تشغيلها {a.triggered_count || 0} مرة</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleAutomation(a)}><Power size={13} /></button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(a); setKeywordInput(''); setPostUrlInput(a.post_url || ''); setUrlParseStatus(a.post_id ? 'ok' : null); setTestResult(null) }}><Edit3 size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteAutomation(a.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== SETTINGS ===== */}
      {tab === 'settings' && (
        <div className="ca-section">
          <div className="setting-row">
            <div>
              <div className="setting-title">الرد الذكي على التعليقات</div>
              <div className="setting-desc">يرد الـ AI تلقائياً على التعليقات بشكل عام ومختصر. لا يُطبَّق على المنشورات التي عليها اتمتة.</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={!!settings.ai_reply_comments_enabled}
                     onChange={e => saveSettings({ ai_reply_comments_enabled: e.target.checked })} />
              <span className="slider" />
            </label>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-title">إخفاء التعليقات السيئة من الداشبورد</div>
              <div className="setting-desc">عند رصد كلمات هجومية/مسيئة، يتم إخفاء التعليق من قائمة التعليقات هنا. لحذفه من المنصة (فيسبوك/إنستغرام) يجب الحذف يدوياً.</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={!!settings.auto_delete_bad_comments}
                     onChange={e => saveSettings({ auto_delete_bad_comments: e.target.checked })} />
              <span className="slider" />
            </label>
          </div>
        </div>
      )}

      {/* ===== EDITOR MODAL ===== */}
      {editing && (
        <div className="ca-modal-overlay" onClick={() => setEditing(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-head">
              <h3>{editing.id ? 'تعديل اتمتة' : 'اتمتة جديدة'}</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>

            <div className="input-group">
              <label className="input-label">المنصة</label>
              <select className="input" value={editing.platform} onChange={e => setEditing(p => ({ ...p, platform: e.target.value }))}>
                <option value="facebook">فيسبوك</option>
                <option value="instagram">إنستغرام</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">رابط المنشور</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" dir="ltr" style={{ flex: 1 }}
                  placeholder="https://www.facebook.com/.../posts/...  أو  https://instagram.com/p/..."
                  value={postUrlInput}
                  onChange={e => { setPostUrlInput(e.target.value); setUrlParseStatus(null) }}
                  onBlur={() => postUrlInput && applyPostUrl()} />
                <button type="button" className="btn btn-primary" onClick={applyPostUrl}>قراءة</button>
              </div>
              {urlParseStatus === 'ok' && editing.post_id && (
                <div className="input-hint" style={{ color: '#34d399' }}>
                  ✓ {editing.platform === 'facebook' ? 'فيسبوك' : 'إنستغرام'} — معرف المنشور: <code>{editing.post_id}</code>
                </div>
              )}
              {urlParseStatus === 'bad' && (
                <div className="input-hint" style={{ color: '#fca5a5' }}>لم نتعرف على الرابط. تأكد أنه رابط منشور FB أو IG.</div>
              )}
              {urlParseStatus !== 'ok' && (
                <div className="input-hint">انسخ رابط المنشور من فيسبوك أو إنستغرام والصقه هنا.</div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">عنوان المنشور (اختياري — للتمييز)</label>
              <input className="input" value={editing.post_title} placeholder="مثال: عرض الصيف 2026"
                     onChange={e => setEditing(p => ({ ...p, post_title: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">الكلمات المفتاحية للتفعيل</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input className="input" placeholder="مثال: تفاصيل" value={keywordInput}
                       onChange={e => setKeywordInput(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())} />
                <button className="btn btn-primary" onClick={addKeyword}>إضافة</button>
              </div>
              <div className="kw-list">
                {editing.trigger_keywords?.map(k => (
                  <span key={k} className="kw-chip removable" onClick={() => removeKeyword(k)}>
                    #{k} <X size={11} />
                  </span>
                ))}
              </div>
              <div className="input-hint">إذا احتوى التعليق على أي من هذه الكلمات، تتفعّل الاتمتة.</div>
            </div>

            <div className="input-group">
              <label className="input-label">الرد العام على التعليق</label>
              <input className="input" value={editing.comment_reply}
                     onChange={e => setEditing(p => ({ ...p, comment_reply: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">رسالة الخاص (DM)</label>
              <textarea className="textarea" rows={4} value={editing.dm_message}
                        placeholder="اكتب رسالة التفاصيل التي سترسل للزبون..."
                        onChange={e => setEditing(p => ({ ...p, dm_message: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">رابط مرفق (اختياري)</label>
              <input className="input" dir="ltr" placeholder="https://..." value={editing.dm_attachment_url}
                     onChange={e => setEditing(p => ({ ...p, dm_attachment_url: e.target.value }))} />
              <div className="input-hint">رابط ملف PDF، صورة، أو موقع — يُضاف لرسالة الخاص.</div>
            </div>

            {testResult && (
              <div style={{ background:'rgba(43,178,76,0.08)', border:'1px solid rgba(43,178,76,0.35)', borderRadius:12, padding:'14px 16px', marginTop:10 }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#6ee7b7', marginBottom:8 }}>✓ نتيجة الاختبار — سيُرسَل ما يلي عندما يعلّق زبون بـ "{testResult.trigger_used}":</div>
                <div style={{ fontSize:13, marginBottom:6 }}><strong>↩ رد التعليق العام:</strong></div>
                <div style={{ background:'var(--glass-bg,rgba(255,255,255,0.05))', padding:'8px 12px', borderRadius:8, fontSize:13, marginBottom:10 }}>{testResult.comment_reply}</div>
                <div style={{ fontSize:13, marginBottom:6 }}><strong>📩 رسالة الخاص (DM):</strong></div>
                <pre style={{ background:'var(--glass-bg,rgba(255,255,255,0.05))', padding:'8px 12px', borderRadius:8, fontSize:13, whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0 }}>{testResult.dm_message}</pre>
              </div>
            )}

            <div className="ca-modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>إلغاء</button>
              <button className="btn btn-secondary" onClick={runTest} disabled={testing}>
                <FlaskConical size={14} /> {testing ? 'جارٍ الاختبار...' : 'اختبار'}
              </button>
              <button className="btn btn-primary" onClick={saveAutomation}>حفظ الاتمتة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
