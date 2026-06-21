import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import './CommentAutomation.css'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import commentsIcon from '../../assets/icons/comments.png'
import addIcon from '../../assets/icons/add.png'
import editIcon from '../../assets/icons/edit.png'
import deleteIcon from '../../assets/icons/delete.png'

const PLATFORMS = ['facebook','instagram']
const TRIGGER_TYPES = [{v:'all',l:'الجميع'},{v:'keyword',l:'كلمة مفتاحية'},{v:'emoji',l:'إيموجي محدد'}]
const REPLY_TYPES = [{v:'text',l:'رد نصي ثابت'},{v:'ai',l:'رد بالـ AI'},{v:'none',l:'بدون رد علني'}]
const empty = { name:'', platform:'facebook', post_url:'', target:'all', trigger_type:'keyword', trigger_value:'', reply_type:'text', reply_text:'', dm_enabled:false, dm_text:'', require_follow:false, is_active:true }

export default function CommentAutomation() {
  const [tab, setTab] = useState(0)
  const [campaigns, setCampaigns] = useState([])
  const [logs, setLogs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const c = await window.api?.db.getCampaigns() || []
    setCampaigns(c)
    const l = await window.api?.db.getActivityLog() || []
    setLogs(l)
  }

  async function saveCampaign() {
    if (!form.name) return toast.error('اسم الحملة مطلوب')
    await window.api?.db.saveCampaign(form)
    toast.success('تم حفظ الحملة ✓')
    setShowForm(false); setForm(empty)
    loadAll()
  }

  async function deleteCampaign(id) {
    if (!confirm('حذف هذه الحملة؟')) return
    await window.api?.db.deleteCampaign(id)
    toast.success('تم الحذف')
    loadAll()
  }

  async function toggleActive(camp) {
    await window.api?.db.saveCampaign({ ...camp, is_active: !camp.is_active })
    loadAll()
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>أتمتة التعليقات</h1>
        <p>ردود تلقائية ذكية على تعليقات فيسبوك وإنستغرام</p>
      </div>

      <div className="tabs">
        {[
          { label: 'الحملات', icon: commentsIcon },
          { label: 'سجل الأنشطة', icon: commentsIcon }
        ].map((t, i) => (
          <button key={i} className={`tab ${tab===i?'active':''}`} onClick={() => setTab(i)}>
            <img src={t.icon} alt={t.label} className="tab-img-icon" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Campaigns */}
      {tab === 0 && (
        <div className="animate-fade">
          <div className="flex justify-between items-center mb-4">
            <button className="btn btn-primary btn-sm flex-center" onClick={() => { setForm(empty); setShowForm(true) }}>
              <img src={addIcon} className="btn-img-icon" /> حملة جديدة
            </button>
            <span className="badge badge-info">{campaigns.length} حملة</span>
          </div>

          {showForm && (
            <div className="card mb-4 campaign-form animate-fade">
              <div className="card-title">{form.id ? 'تعديل الحملة' : 'حملة جديدة'}</div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">اسم الحملة *</label>
                  <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="مثال: حملة رمضان" />
                </div>
                <div className="input-group">
                  <label className="input-label">المنصة</label>
                  <select className="select" value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))}>
                    <option value="facebook">فيسبوك</option>
                    <option value="instagram">إنستغرام</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">رابط المنشور / الريلز</label>
                <input className="input" value={form.post_url} onChange={e=>setForm(f=>({...f,post_url:e.target.value}))} placeholder="https://facebook.com/..." />
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">نوع المُشغِّل</label>
                  <select className="select" value={form.trigger_type} onChange={e=>setForm(f=>({...f,trigger_type:e.target.value}))}>
                    {TRIGGER_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                {form.trigger_type !== 'all' && (
                  <div className="input-group">
                    <label className="input-label">{form.trigger_type==='keyword'?'الكلمة المفتاحية':'الإيموجي'}</label>
                    <input className="input" value={form.trigger_value} onChange={e=>setForm(f=>({...f,trigger_value:e.target.value}))} placeholder={form.trigger_type==='keyword'?'السعر؟ كيف أطلب':'❤️'} />
                  </div>
                )}
              </div>
              <div className="input-group">
                <label className="input-label">نوع الرد العلني</label>
                <select className="select" value={form.reply_type} onChange={e=>setForm(f=>({...f,reply_type:e.target.value}))}>
                  {REPLY_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              {form.reply_type !== 'none' && form.reply_type !== 'ai' && (
                <div className="input-group">
                  <label className="input-label">نص الرد العلني</label>
                  <textarea className="textarea" style={{minHeight:80}} value={form.reply_text} onChange={e=>setForm(f=>({...f,reply_text:e.target.value}))} placeholder="شكراً على تعليقك! راسلنا خاصةً للتفاصيل" />
                </div>
              )}
              <div className="divider" />
              <div className="toggle-row">
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>تفعيل الرسالة الخاصة (DM)</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>إرسال رسالة خاصة لكل من علّق</div>
                </div>
                <label className="toggle"><input type="checkbox" checked={form.dm_enabled} onChange={e=>setForm(f=>({...f,dm_enabled:e.target.checked}))} /><span className="toggle-slider"></span></label>
              </div>
              {form.dm_enabled && (
                <div className="input-group mt-4">
                  <label className="input-label">نص الرسالة الخاصة</label>
                  <textarea className="textarea" style={{minHeight:100}} value={form.dm_text} onChange={e=>setForm(f=>({...f,dm_text:e.target.value}))} placeholder="أهلاً! شكراً لاهتمامك. إليك التفاصيل..." />
                </div>
              )}
              {form.dm_enabled && (
                <div className="toggle-row">
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>شرط المتابعة</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>أرسل DM فقط للمتابعين</div>
                  </div>
                  <label className="toggle"><input type="checkbox" checked={form.require_follow} onChange={e=>setForm(f=>({...f,require_follow:e.target.checked}))} /><span className="toggle-slider"></span></label>
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button className="btn btn-primary btn-sm" onClick={saveCampaign}>حفظ الحملة</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>إلغاء</button>
              </div>
            </div>
          )}

          <div className="campaigns-grid">
            {campaigns.length === 0 ? (
              <div className="card"><div className="empty-state"><p>لا توجد حملات — أنشئ أولى حملاتك!</p></div></div>
            ) : campaigns.map(c => (
              <div key={c.id} className={`card camp-card ${!c.is_active?'inactive':''}`}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <img src={c.platform === 'facebook' ? facebookIcon : instagramIcon} className="platform-mini-img" />
                    <div>
                      <div className="camp-name">{c.name}</div>
                      <span className={`badge ${c.platform==='facebook'?'badge-info':'badge-danger'}`}>{c.platform==='facebook'?'فيسبوك':'إنستغرام'}</span>
                    </div>
                  </div>
                  <label className="toggle"><input type="checkbox" checked={!!c.is_active} onChange={() => toggleActive(c)} /><span className="toggle-slider"></span></label>
                </div>
                <div className="camp-details">
                  <div>المشغل: {TRIGGER_TYPES.find(t=>t.v===c.trigger_type)?.l}{c.trigger_value ? ': '+c.trigger_value : ''}</div>
                  <div>الرد: {REPLY_TYPES.find(t=>t.v===c.reply_type)?.l}</div>
                  {c.dm_enabled ? <div>الرسائل الخاصة: مفعّل{c.require_follow?' (للمتابعين فقط)':''}</div> : null}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-secondary btn-sm flex-center" onClick={() => { setForm({...c, dm_enabled:!!c.dm_enabled, require_follow:!!c.require_follow, is_active:!!c.is_active}); setShowForm(true) }}>
                    <img src={editIcon} className="btn-img-icon" /> تعديل
                  </button>
                  <button className="btn btn-danger btn-sm flex-center" onClick={() => deleteCampaign(c.id)}>
                    <img src={deleteIcon} className="btn-img-icon" /> حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {tab === 1 && (
        <div className="card animate-fade">
          <div className="card-title">سجل الأنشطة</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>المنصة</th><th>المعلِّق</th><th>التعليق</th><th>الرد</th><th>DM</th><th>الوقت</th></tr></thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><p>لا توجد أنشطة بعد</p></div></td></tr>
                ) : logs.map((l,i) => (
                  <tr key={i}>
                    <td>
                      <img src={l.platform === 'facebook' ? facebookIcon : l.platform === 'instagram' ? instagramIcon : commentsIcon} className="platform-tiny-img" />
                    </td>
                    <td><strong>{l.sender_name||'—'}</strong></td>
                    <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.content||'—'}</td>
                    <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.reply_text||'—'}</td>
                    <td>{l.dm_sent ? <span className="badge badge-success">✓</span> : <span className="badge badge-danger">—</span>}</td>
                    <td style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(l.created_at).toLocaleString('ar')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
