import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import './SalesAgent.css'

import storeIcon from '../../assets/icons/store.png'
import packageIcon from '../../assets/icons/package.png'
import agentIcon from '../../assets/icons/agent.png'
import excelIcon from '../../assets/icons/excel.png'
import addIcon from '../../assets/icons/add.png'
import editIcon from '../../assets/icons/edit.png'
import deleteIcon from '../../assets/icons/delete.png'
import settingsIcon from '../../assets/icons/settings.png'

const TABS = [
  { label: 'إعداد المتجر', icon: storeIcon },
  { label: 'المنتجات', icon: packageIcon },
  { label: 'System Prompt', icon: agentIcon },
]
const CURRENCIES = [
  { v:'IQD', l:'د.ع - دينار عراقي' },
  { v:'USD', l:'$ - دولار أمريكي' },
  { v:'AED', l:'د.إ - درهم إماراتي' },
  { v:'SAR', l:'ر.س - ريال سعودي' },
  { v:'EGP', l:'ج.م - جنيه مصري' },
  { v:'JOD', l:'د.أ - دينار أردني' },
  { v:'KWD', l:'د.ك - دينار كويتي' },
  { v:'BHD', l:'د.ب - دينار بحريني' },
  { v:'OMR', l:'ر.ع - ريال عماني' },
  { v:'QAR', l:'ر.ق - ريال قطري' },
  { v:'LBP', l:'ل.ل - ليرة لبنانية' },
  { v:'SYP', l:'ل.س - ليرة سورية' },
  { v:'TRY', l:'₺ - ليرة تركية' },
  { v:'EUR', l:'€ - يورو' },
  { v:'GBP', l:'£ - جنيه إسترليني' },
  { v:'CAD', l:'C$ - دولار كندي' },
  { v:'AUD', l:'A$ - دولار أسترالي' },
  { v:'CNY', l:'¥ - يوان صيني' },
  { v:'INR', l:'₹ - روبية هندية' },
  { v:'PKR', l:'₨ - روبية باكستانية' },
]
const PERSONALITIES = [{v:'friendly',l:'ودي ومرح'},{v:'formal',l:'رسمي واحترافي'},{v:'professional',l:'احترافي'}]
const LANGUAGES = [{v:'ar',l:'عربي'},{v:'en',l:'English'},{v:'multi',l:'متعدد اللغات'}]

export default function SalesAgent() {
  const [tab, setTab] = useState(0)
  const navigate = useNavigate()
  const [store, setStore] = useState({ store_name:'', store_description:'', language:'ar', work_hours:'', ai_personality:'friendly', currency:'IQD', contact_phone:'', system_prompt:'' })
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const cfg = await window.api?.db.getStoreConfig() || {}
    setStore(s => ({ ...s, ...cfg }))
    const prods = await window.api?.db.getProducts() || []
    setProducts(prods)
  }

  async function saveStore() {
    await window.api?.db.saveStoreConfig(store)
    toast.success('تم حفظ إعدادات المتجر ✓')
  }

  function buildPrompt() {
    const personality = PERSONALITIES.find(p => p.v === store.ai_personality)?.l || 'ودي'
    const currencyLabel = CURRENCIES.find(c => c.v === store.currency)?.l || store.currency
    const productLines = products.map(p =>
      `• ${p.name} | السعر: ${p.price} ${store.currency} | الكمية: ${p.quantity}${p.sizes ? ' | المقاسات: '+p.sizes : ''}${p.description ? ' | '+p.description : ''}`
    ).join('\n')

    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].join('، ')
    const categoriesText = categories ? `نبيع: ${categories}` : store.store_description || 'منتجات متنوعة'

    const prompt = `أنت موظف مبيعات ذكي واحترافي في متجر "${store.store_name}".
${categoriesText}
الشخصية: ${personality} — تستخدم الإيموجي بشكل طبيعي في ردودك 🎯
العملة الرسمية: ${currencyLabel}
ساعات العمل: ${store.work_hours || 'على مدار الساعة ⏰'}
رقم خدمة العملاء: ${store.contact_phone || 'غير محدد'}

=== رسالة الترحيب (أرسلها عند أول رد) ===
"أهلاً وسهلاً بك في ${store.store_name}! 🎉\n${categoriesText}\nكيف أستطيع مساعدتك اليوم؟ 😊"

=== أسلوب التواصل ===
• استخدم إيموجي مناسبة في كل رسالة ✅❤️🛒💫
• كن مختصراً وواضحاً، لا تطول الردود
• إذا سأل عن منتج، أعطه الصورة (إذا متوفرة) والوصف والسعر
• إذا لم يجد ما يريد، اعتذر بلطف وعرض البدائل

=== قاعدة المنتجات ===
${productLines || '⚠️ لا توجد منتجات مضافة حالياً. اعتذر للزبون بلباقة.'}

=== مراحل البيع (اتبعها بالترتيب) ===
1️⃣ الترحيب وفهم الطلب
   • رحب، استفسر عن المطلوب، أجب على الأسئلة

2️⃣ جمع بيانات التوصيل (خطوة بخطوة - لا تطلب كلها دفعة واحدة)
   1. اسأل: "ما اسمك الكريم؟ 😊" (انتظر الإجابة)
   2. اسأل: "وما رقم هاتفك؟ 📱" (انتظر)
   3. اسأل: "وعنوانك التفصيلي (المدينة والمنطقة)؟ 📍" (انتظر)

3️⃣ تأكيد الطلب
   • اعرض ملخص الطلب كفاتورة واضحة 🧾
   • "هل تؤكد طلبك؟ ✅"

4️⃣ تسجيل الطلب
   • شكّره واعطه وقت التوصيل المتوقع 🚚
   • أرسل JSON داخل [ORDER_READY]...[/ORDER_READY]

=== صيغة JSON ===
[ORDER_READY]
{
  "customer_name": "الاسم الكامل",
  "customer_phone": "رقم الهاتف",
  "customer_city": "المدينة",
  "customer_area": "المنطقة والتفاصيل",
  "products": [{"name": "اسم المنتج", "quantity": 1, "price": 1000}],
  "total_amount": 1000
}
[/ORDER_READY]`
    setStore(s => ({ ...s, system_prompt: prompt }))
    toast.success('تم بناء الـ System Prompt ✓')
  }

  const emptyProduct = { sku:'', name:'', description:'', price:'', quantity:'', sizes:'', image_url:'', category:'', notes:'' }

  async function pickProductImage() {
    try {
      const res = await window.api?.dialog?.showOpenDialog({
        title: 'اختر صورة المنتج',
        filters: [{ name: 'الصور', extensions: ['jpg','jpeg','png','webp','gif'] }],
        properties: ['openFile'],
      })
      if (res?.canceled || !res?.filePaths?.length) return
      const filePath = res.filePaths[0]
      // Read file as base64 via IPC
      const base64 = await window.api?.fs?.readFileBase64(filePath)
      if (base64) {
        const ext = filePath.split('.').pop().toLowerCase()
        setEditing(p => ({ ...p, image_url: `data:image/${ext};base64,${base64}` }))
        toast.success('تم تحميل الصورة ✓')
      }
    } catch (e) {
      toast.error('فشل تحميل الصورة')
    }
  }

  async function saveProduct() {
    if (!editing?.name) return toast.error('اسم المنتج مطلوب')
    await window.api?.db.saveProduct(editing)
    toast.success('تم حفظ المنتج ✓')
    setEditing(null)
    const prods = await window.api?.db.getProducts() || []
    setProducts(prods)
  }

  async function deleteProduct(id) {
    if (!confirm('حذف هذا المنتج؟')) return
    await window.api?.db.deleteProduct(id)
    setProducts(p => p.filter(x => x.id !== id))
    toast.success('تم حذف المنتج')
  }

  async function importExcel() {
    const res = await window.api?.excel.importProducts()
    if (res?.success) { toast.success(`تم استيراد ${res.count} منتج ✓`); const p = await window.api?.db.getProducts(); setProducts(p||[]) }
    else if (!res?.canceled) toast.error(res?.error || 'فشل الاستيراد')
  }

  async function exportExcel() {
    const res = await window.api?.excel.exportProducts()
    if (res?.success) toast.success('تم التصدير ✓')
    else if (!res?.canceled) toast.error('فشل التصدير')
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>وكيل المبيعات الذكي</h1>
        <p>أتمتة المبيعات من الاستفسار حتى الفاتورة</p>
      </div>

      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={i} className={`tab ${tab===i?'active':''}`} onClick={() => setTab(i)}>
            <img src={t.icon} alt={t.label} className="tab-img-icon" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 0: Store Settings */}
      {tab === 0 && (
        <div className="card animate-fade">
          <div className="card-title">معلومات المتجر</div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">اسم المتجر</label>
              <input className="input" value={store.store_name||''} onChange={e => setStore(s=>({...s,store_name:e.target.value}))} placeholder="مثال: متجر الأزياء الراقية" />
            </div>
            <div className="input-group">
              <label className="input-label">رقم التواصل</label>
              <input className="input" value={store.contact_phone||''} onChange={e => setStore(s=>({...s,contact_phone:e.target.value}))} placeholder="+964..." />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">وصف المتجر</label>
            <textarea className="textarea" value={store.store_description||''} onChange={e => setStore(s=>({...s,store_description:e.target.value}))} placeholder="ماذا يبيع متجرك؟ ما هي خدماتك؟" />
          </div>
          <div className="grid-3">
            <div className="input-group">
              <label className="input-label">اللغة الافتراضية</label>
              <select className="select" value={store.language||'ar'} onChange={e => setStore(s=>({...s,language:e.target.value}))}>
                {LANGUAGES.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">شخصية الـ AI</label>
              <select className="select" value={store.ai_personality||'friendly'} onChange={e => setStore(s=>({...s,ai_personality:e.target.value}))}>
                {PERSONALITIES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">العملة</label>
              <select className="select" value={store.currency||'IQD'} onChange={e => setStore(s=>({...s,currency:e.target.value}))}>
                {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">ساعات العمل</label>
            <input className="input" value={store.work_hours||''} onChange={e => setStore(s=>({...s,work_hours:e.target.value}))} placeholder="مثال: 9 صباحاً - 10 مساءً" />
          </div>
          <button className="btn btn-primary" onClick={saveStore}>حفظ الإعدادات</button>
        </div>
      )}

      {/* Tab 1: Products */}
      {tab === 1 && (
        <div className="animate-fade">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm flex-center" onClick={() => setEditing(emptyProduct)}>
                <img src={addIcon} className="btn-img-icon" /> منتج جديد
              </button>
              <button className="btn btn-secondary btn-sm flex-center" onClick={importExcel}>
                <img src={excelIcon} className="btn-img-icon" /> استيراد Excel
              </button>
              <button className="btn btn-secondary btn-sm flex-center" onClick={exportExcel}>
                <img src={excelIcon} className="btn-img-icon" /> تصدير Excel
              </button>
            </div>
            <span className="badge badge-info">{products.length} منتج</span>
          </div>

          {editing && (
            <div className="card mb-4 animate-fade product-form">
              <div className="card-title">{editing.id ? 'تعديل المنتج' : 'منتج جديد'}</div>
              <div className="grid-3">
                <div className="input-group"><label className="input-label">رقم المنتج (SKU)</label><input className="input" value={editing.sku||''} onChange={e=>setEditing(p=>({...p,sku:e.target.value}))} /></div>
                <div className="input-group"><label className="input-label">اسم المنتج *</label><input className="input" value={editing.name||''} onChange={e=>setEditing(p=>({...p,name:e.target.value}))} /></div>
                <div className="input-group"><label className="input-label">الفئة</label><input className="input" value={editing.category||''} onChange={e=>setEditing(p=>({...p,category:e.target.value}))} /></div>
                <div className="input-group"><label className="input-label">السعر</label><input type="number" className="input" value={editing.price||''} onChange={e=>setEditing(p=>({...p,price:e.target.value}))} /></div>
                <div className="input-group"><label className="input-label">الكمية</label><input type="number" className="input" value={editing.quantity||''} onChange={e=>setEditing(p=>({...p,quantity:e.target.value}))} /></div>
                <div className="input-group"><label className="input-label">المقاسات</label><input className="input" value={editing.sizes||''} onChange={e=>setEditing(p=>({...p,sizes:e.target.value}))} placeholder="S, M, L, XL" /></div>
              </div>
              <div className="input-group"><label className="input-label">وصف المنتج</label><textarea className="textarea" style={{minHeight:70}} value={editing.description||''} onChange={e=>setEditing(p=>({...p,description:e.target.value}))} /></div>
              <div className="input-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">صورة المنتج</label>
                <div className="product-image-row">
                  {editing?.image_url && (
                    <img src={editing.image_url} alt="product" className="product-thumb" />
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={pickProductImage}>
                    📷 اختر صورة من الجهاز
                  </button>
                  {editing?.image_url && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setEditing(p => ({...p, image_url: ''}))}>✕ حذف</button>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-primary btn-sm" onClick={saveProduct}>حفظ المنتج</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>إلغاء</button>
              </div>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead><tr><th>الصورة</th><th>SKU</th><th>الاسم</th><th>السعر</th><th>الكمية</th><th>المقاسات</th><th>الفئة</th><th>إجراء</th></tr></thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><p>لا توجد منتجات — أضف أو استورد من Excel</p></div></td></tr>
                ) : products.map(p => (
                  <tr key={p.id}>
                    <td>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="product-table-thumb" />
                        : <div className="no-img">📦</div>
                      }
                    </td>
                    <td><span className="badge badge-info">{p.sku||'—'}</span></td>
                    <td><strong>{p.name}</strong>{p.description && <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.description.slice(0,40)}</div>}</td>
                    <td><strong style={{color:'var(--accent-green)'}}>{Number(p.price||0).toLocaleString()}</strong></td>
                    <td><span className={`badge ${p.quantity > 0 ? 'badge-success' : 'badge-danger'}`}>{p.quantity ?? '—'}</span></td>
                    <td>{p.sizes||'—'}</td>
                    <td>{p.category||'—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm p-1" onClick={() => setEditing(p)} title="تعديل">
                          <img src={editIcon} className="btn-img-icon" />
                        </button>
                        <button className="btn btn-danger btn-sm p-1" onClick={() => deleteProduct(p.id)} title="حذف">
                          <img src={deleteIcon} className="btn-img-icon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: System Prompt */}
      {tab === 2 && (
        <div className="card animate-fade">
          <div className="card-title">System Prompt الذكي</div>
          <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:16}}>هذا هو التعليمات التي تُعطى للـ AI لكي يعمل كموظف مبيعات لمتجرك. يُبنى تلقائياً من إعدادات المتجر والمنتجات.</p>
          <button className="btn btn-secondary btn-sm mb-4" onClick={buildPrompt}>بناء تلقائي من إعدادات المتجر</button>
          <div className="input-group">
            <label className="input-label">System Prompt (قابل للتعديل اليدوي)</label>
            <textarea className="textarea" style={{minHeight:350,fontFamily:'monospace',fontSize:13,direction:'rtl'}} value={store.system_prompt||''} onChange={e => setStore(s=>({...s,system_prompt:e.target.value}))} />
          </div>
          <button className="btn btn-primary" onClick={saveStore}>حفظ الـ System Prompt</button>
        </div>
      )}

      {/* Shortcut to Platform Settings */}
      <div className="card animate-fade" style={{marginTop:16,background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(99,102,241,0.02))',border:'1px solid rgba(99,102,241,0.2)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={settingsIcon} style={{width:28,height:28,opacity:0.85}} alt="settings" />
            <div>
              <div style={{fontWeight:600,fontSize:14}}>ربط وسائل التواصل الاجتماعي</div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>لربط واتساب وتلغرام وفيسبوك وإنستغرام، اذهب إلى صفحة الإعدادات ← المنصات</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/settings')}>فتح الإعدادات</button>
        </div>
      </div>
    </div>
  )
}
