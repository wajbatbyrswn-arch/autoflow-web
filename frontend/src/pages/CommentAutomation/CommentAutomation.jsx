import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { MessageCircle, Trash2, Edit3, Plus, Power, Sparkles, AlertOctagon, X, FlaskConical } from 'lucide-react'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import { parsePostUrl } from '../../lib/postUrlParser'
import { useT } from '../../lib/i18n'
import './CommentAutomation.css'

const TABS_ALL = [
  { id: 'inbox',      label: 'صندوق التعليقات' },
  { id: 'automation', label: 'اتمتة التعليقات', adminOnly: true },
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

export default function CommentAutomation({ isAdmin = false }) {
  const { t, lang } = useT()
  const confirm = useConfirm()
  const TABS = TABS_ALL.filter(tb => !tb.adminOnly || isAdmin)
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
    } catch (e) { toast.error(t('تعذّر تحميل البيانات')) }
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  async function deleteComment(id) {
    const ok = await confirm({
      title: t('حذف التعليق'),
      message: t('سنحاول حذفه من المنصة (فيسبوك/إنستغرام) وإخفاءه من الداشبورد.'),
      confirmText: t('نعم، احذف'),
      dangerous: true,
      rememberKey: 'comment_delete',
    })
    if (!ok) return
    const res = await window.api?.comments?.deleteComment?.(id)
    setComments(prev => prev.map(c => c.id === id ? { ...c, deleted: true } : c))
    if (res?.platform_deleted) toast.success(t('تم الحذف من المنصة والداشبورد ✓'))
    else toast(t('تم الإخفاء من الداشبورد. لم نتمكن من حذفه من المنصة — يرجى الحذف يدوياً من فيسبوك/إنستغرام'), { icon: 'ℹ️', duration: 6000 })
  }

  async function saveSettings(patch) {
    const next = { ...settings, ...patch }
    setSettings(next)
    await window.api?.comments?.saveSettings?.(next)
    toast.success(t('تم الحفظ'))
  }

  async function saveAutomation() {
    if (!editing.trigger_keywords?.length || !editing.comment_reply) {
      toast.error(t('الحقول المطلوبة: الكلمات المفتاحية ورد التعليق'))
      return
    }
    try {
      const saved = await window.api?.comments?.saveAutomation?.(editing)
      toast.success(t('تم الحفظ ✓'))
      setEditing(null); setKeywordInput('')
      setAutomations(prev => editing.id ? prev.map(a => a.id === editing.id ? saved : a) : [saved, ...prev])
    } catch (e) { toast.error(e.message || t('فشل الحفظ')) }
  }

  async function deleteAutomation(id) {
    const ok = await confirm({
      title: t('حذف الاتمتة'),
      message: t('سيتم حذف اتمتة المنشور نهائياً. لا يمكن التراجع.'),
      confirmText: t('نعم، احذف'),
      dangerous: true,
      rememberKey: 'automation_delete',
    })
    if (!ok) return
    await window.api?.comments?.deleteAutomation?.(id)
    setAutomations(prev => prev.filter(a => a.id !== id))
    toast.success(t('تم الحذف'))
  }

  function applyPostUrl() {
    const parsed = parsePostUrl(postUrlInput)
    if (!parsed) { setUrlParseStatus('bad'); toast.error(t('لم نستطع قراءة الرابط — تأكد أنه رابط منشور Facebook أو Instagram')); return }
    setEditing(p => ({ ...p, post_id: parsed.post_id, post_url: parsed.post_url, platform: parsed.platform }))
    setUrlParseStatus('ok')
    toast.success(`${t('تم التعرف:')} ${parsed.platform === 'facebook' ? t('فيسبوك') : t('إنستغرام')} — ID: ${parsed.post_id}`)
  }

  async function runTest() {
    if (!editing?.trigger_keywords?.length) { toast.error(t('أضف كلمة مفتاحية أولاً')); return }
    if (!editing?.comment_reply) { toast.error(t('املأ رد التعليق أولاً')); return }
    setTesting(true)
    try {
      const res = await window.api?.comments?.testAutomation?.(editing)
      if (res?.success) setTestResult(res)
      else toast.error(res?.error || t('فشل الاختبار'))
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
          <MessageCircle size={24} /> {t('اتمتة التعليقات')}
        </h1>
        <p>{t('أدر تعليقاتك على فيسبوك وإنستغرام: ردود ذكية تلقائية، حذف التعليقات السيئة، وإطلاق رسائل خاصة عند كلمات معيّنة.')}</p>
      </div>

      <div className="ca-tabs">
        {TABS.map(tb => (
          <button key={tb.id} className={`ca-tab ${tab === tb.id ? 'on' : ''}`} onClick={() => setTab(tb.id)}>
            {t(tb.label)}
          </button>
        ))}
      </div>

      {/* ===== INBOX ===== */}
      {tab === 'inbox' && (
        <div className="ca-section">
          {loading ? <div className="ca-empty">{t('جارٍ التحميل...')}</div> :
            comments.length === 0 ? <div className="ca-empty">{t('لا توجد تعليقات بعد. ستظهر هنا تلقائياً عند ربط حساباتك.')}</div> :
            <div className="comments-list">
              {comments.map(c => {
                const color = PLATFORM_COLOR[c.platform] || '#888'
                return (
                  <div key={c.id} className={`comment-card ${c.deleted ? 'deleted' : ''}`} style={{ borderRightColor: color }}>
                    <div className="cc-head">
                      <img src={PLATFORM_ICON[c.platform]} alt={c.platform} className="cc-platform-ico" />
                      <strong>{c.commenter_name || t('متابع')}</strong>
                      {c.is_negative && <span className="tag tag-red"><AlertOctagon size={11} /> {t('تعليق سلبي')}</span>}
                      {c.ai_replied && <span className="tag tag-green">✓ {t('تم الرد')}</span>}
                      {c.automation_triggered && <span className="tag tag-blue"><Sparkles size={11} /> {t('اتمتة')}</span>}
                      {c.deleted && <span className="tag tag-grey">{t('محذوف')}</span>}
                    </div>
                    <p className="cc-body">{c.content}</p>
                    {c.post_id && <div className="cc-post">{t('المنشور:')} {c.post_id.slice(0, 30)}{c.post_id.length > 30 ? '...' : ''}</div>}
                    <div className="cc-foot">
                      <span className="cc-time">{new Date(c.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'ar-EG')}</span>
                      {!c.deleted && (
                        <button className="cc-del-btn" onClick={() => deleteComment(c.id)}>
                          <Trash2 size={13} /> {t('إخفاء/حذف')}
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
              <strong>{t('كيف تعمل اتمتة التعليقات؟')}</strong>
              <p>{t('عندما يعلّق أي شخص بكلمة من الكلمات المفتاحية على أي منشور، يتم تلقائياً: 1) الرد العلني على تعليقه برسالة "الرد العام"، 2) إرسال "رسالة الخاص" (DM) للمعلّق عبر Facebook Private Reply (يعمل خلال 7 أيام من التعليق). الرد الذكي يتوقف تلقائياً لأي تعليق طابق الكلمات المفتاحية.')}</p>
            </div>
          </div>

          <button className="btn btn-primary ca-add-btn" onClick={() => { setEditing(emptyAutomation()); setPostUrlInput(''); setUrlParseStatus(null); setTestResult(null); setKeywordInput('') }}>
            <Plus size={16} /> {t('إضافة اتمتة جديدة')}
          </button>

          {automations.length === 0 ? (
            <div className="ca-empty">{t('لا توجد اتمتات بعد. اضغط "إضافة" أعلاه لبدء أول واحدة.')}</div>
          ) : (
            <div className="automations-grid">
              {automations.map(a => (
                <div key={a.id} className={`auto-card ${a.is_active ? '' : 'off'}`}>
                  <div className="auto-head">
                    <img src={PLATFORM_ICON[a.platform]} className="cc-platform-ico" />
                    <strong>{a.post_title || `${t('منشور')} ${a.post_id.slice(0, 12)}...`}</strong>
                    <span className={`tag ${a.is_active ? 'tag-green' : 'tag-grey'}`}>
                      {a.is_active ? 'نشطة' : 'متوقفة'}
                    </span>
                  </div>
                  <div className="auto-kws">
                    {(a.trigger_keywords || []).map(k => <span key={k} className="kw-chip">#{k}</span>)}
                  </div>
                  <div className="auto-preview">
                    <div><strong>{t('الرد العام:')}</strong> {a.comment_reply}</div>
                    <div><strong>{t('رسالة الخاص:')}</strong> {a.dm_message.slice(0, 80)}{a.dm_message.length > 80 ? '...' : ''}</div>
                    {a.dm_attachment_url && <div><strong>{t('مرفق:')}</strong> <a href={a.dm_attachment_url} target="_blank" rel="noreferrer">{t('رابط')}</a></div>}
                  </div>
                  <div className="auto-foot">
                    <span style={{ opacity: .6, fontSize: 12 }}>{t('تم تشغيلها')} {a.triggered_count || 0} {t('مرة')}</span>
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
              <div className="setting-title">{t('الرد الذكي على التعليقات')}</div>
              <div className="setting-desc">{t('يرد الـ AI تلقائياً على التعليقات بشكل عام ومختصر. لا يُطبَّق على المنشورات التي عليها اتمتة.')}</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={!!settings.ai_reply_comments_enabled}
                     onChange={e => saveSettings({ ai_reply_comments_enabled: e.target.checked })} />
              <span className="slider" />
            </label>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-title">{t('إخفاء التعليقات السيئة من الداشبورد')}</div>
              <div className="setting-desc">{t('عند رصد كلمات هجومية/مسيئة، يتم إخفاء التعليق من قائمة التعليقات هنا. لحذفه من المنصة (فيسبوك/إنستغرام) يجب الحذف يدوياً.')}</div>
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
              <h3>{editing.id ? t('تعديل اتمتة') : t('اتمتة جديدة')}</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>

            <div className="input-group">
              <label className="input-label">{t('المنصة')}</label>
              <select className="input" value={editing.platform} onChange={e => setEditing(p => ({ ...p, platform: e.target.value }))}>
                <option value="facebook">{t('فيسبوك')}</option>
                <option value="instagram">{t('إنستغرام')}</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">{t('رابط المنشور')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" dir="ltr" style={{ flex: 1 }}
                  placeholder="https://www.facebook.com/.../posts/...  أو  https://instagram.com/p/..."
                  value={postUrlInput}
                  onChange={e => { setPostUrlInput(e.target.value); setUrlParseStatus(null) }}
                  onBlur={() => postUrlInput && applyPostUrl()} />
                <button type="button" className="btn btn-primary" onClick={applyPostUrl}>{t('قراءة')}</button>
              </div>
              {urlParseStatus === 'ok' && editing.post_id && (
                <div className="input-hint" style={{ color: '#34d399' }}>
                  ✓ {editing.platform === 'facebook' ? t('فيسبوك') : t('إنستغرام')} — {t('معرف المنشور:')} <code>{editing.post_id}</code>
                </div>
              )}
              {urlParseStatus === 'bad' && (
                <div className="input-hint" style={{ color: '#fca5a5' }}>{t('لم نتعرف على الرابط. تأكد أنه رابط منشور FB أو IG.')}</div>
              )}
              {urlParseStatus !== 'ok' && (
                <div className="input-hint">{t('انسخ رابط المنشور من فيسبوك أو إنستغرام والصقه هنا.')}</div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">{t('عنوان المنشور (اختياري — للتمييز)')}</label>
              <input className="input" value={editing.post_title} placeholder={t('مثال: عرض الصيف 2026')}
                     onChange={e => setEditing(p => ({ ...p, post_title: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">{t('الكلمات المفتاحية للتفعيل')}</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input className="input" placeholder={t('مثال: تفاصيل')} value={keywordInput}
                       onChange={e => setKeywordInput(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())} />
                <button className="btn btn-primary" onClick={addKeyword}>{t('إضافة')}</button>
              </div>
              <div className="kw-list">
                {editing.trigger_keywords?.map(k => (
                  <span key={k} className="kw-chip removable" onClick={() => removeKeyword(k)}>
                    #{k} <X size={11} />
                  </span>
                ))}
              </div>
              <div className="input-hint">{t('إذا احتوى التعليق على أي من هذه الكلمات، تتفعّل الاتمتة.')}</div>
            </div>

            <div className="input-group">
              <label className="input-label">{t('الرد العام على التعليق')}</label>
              <input className="input" value={editing.comment_reply}
                     onChange={e => setEditing(p => ({ ...p, comment_reply: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">{t('رسالة الخاص (DM)')}</label>
              <textarea className="textarea" rows={4} value={editing.dm_message}
                        placeholder={t('اكتب رسالة التفاصيل التي سترسل للزبون...')}
                        onChange={e => setEditing(p => ({ ...p, dm_message: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">{t('رابط مرفق (اختياري)')}</label>
              <input className="input" dir="ltr" placeholder="https://..." value={editing.dm_attachment_url}
                     onChange={e => setEditing(p => ({ ...p, dm_attachment_url: e.target.value }))} />
              <div className="input-hint">{t('رابط ملف PDF، صورة، أو موقع — يُضاف لرسالة الخاص.')}</div>
            </div>

            {testResult && (
              <div style={{ background:'rgba(43,178,76,0.08)', border:'1px solid rgba(43,178,76,0.35)', borderRadius:12, padding:'14px 16px', marginTop:10 }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#6ee7b7', marginBottom:8 }}>✓ {t('نتيجة الاختبار — سيُرسَل ما يلي عندما يعلّق زبون بـ')} "{testResult.trigger_used}":</div>
                <div style={{ fontSize:13, marginBottom:6 }}><strong>↩ {t('رد التعليق العام:')}</strong></div>
                <div style={{ background:'var(--glass-bg,rgba(255,255,255,0.05))', padding:'8px 12px', borderRadius:8, fontSize:13, marginBottom:10 }}>{testResult.comment_reply}</div>
                <div style={{ fontSize:13, marginBottom:6 }}><strong>📩 {t('رسالة الخاص (DM):')}</strong></div>
                <pre style={{ background:'var(--glass-bg,rgba(255,255,255,0.05))', padding:'8px 12px', borderRadius:8, fontSize:13, whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0 }}>{testResult.dm_message}</pre>
              </div>
            )}

            <div className="ca-modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>{t('إلغاء')}</button>
              <button className="btn btn-secondary" onClick={runTest} disabled={testing}>
                <FlaskConical size={14} /> {testing ? t('جارٍ الاختبار...') : t('اختبار')}
              </button>
              <button className="btn btn-primary" onClick={saveAutomation}>{t('حفظ الاتمتة')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
