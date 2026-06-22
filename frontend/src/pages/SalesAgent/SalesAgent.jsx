import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { CURRENCIES } from '../../lib/currencies'
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
const PERSONALITIES = [{v:'friendly',l:'ودي ومرح'},{v:'formal',l:'رسمي واحترافي'},{v:'professional',l:'احترافي'}]
const LANGUAGES = [{v:'ar',l:'عربي'},{v:'en',l:'English'},{v:'multi',l:'متعدد اللغات'}]

// Built-in product fields (mapped to real columns). The owner can toggle these on/off.
const BUILTIN_FIELDS = [
  { key: 'sku', label: 'رقم المنتج (SKU)', type: 'text' },
  { key: 'category', label: 'الفئة', type: 'text' },
  { key: 'price', label: 'السعر', type: 'number' },
  { key: 'quantity', label: 'الكمية', type: 'number' },
  { key: 'sizes', label: 'المقاسات', type: 'text' },
  { key: 'description', label: 'وصف المنتج', type: 'textarea' },
]
const DEFAULT_FIELD_CONFIG = { enabled: BUILTIN_FIELDS.map(f => f.key), custom: [] }

export default function SalesAgent() {
  const [tab, setTab] = useState(0)
  const navigate = useNavigate()
  const [store, setStore] = useState({ store_name:'', store_description:'', language:'ar', work_hours:'', ai_personality:'friendly', currency:'JOD', contact_phone:'', system_prompt:'', product_fields:null })
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)
  const [fieldConfig, setFieldConfig] = useState(DEFAULT_FIELD_CONFIG)
  const [showFieldManager, setShowFieldManager] = useState(false)
  const imgInputRef = useRef(null)
  const excelInputRef = useRef(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const cfg = await window.api?.db.getStoreConfig() || {}
    setStore(s => ({ ...s, ...cfg }))
    if (cfg.product_fields && cfg.product_fields.enabled) setFieldConfig(cfg.product_fields)
    const prods = await window.api?.db.getProducts() || []
    setProducts(prods)
  }

  async function saveStore() {
    await window.api?.db.saveStoreConfig(store)
    toast.success('تم حفظ إعدادات المتجر ✓')
  }

  // ---- Field customization ----
  const enabledBuiltins = BUILTIN_FIELDS.filter(f => fieldConfig.enabled.includes(f.key))
  function toggleBuiltin(key) {
    setFieldConfig(c => ({ ...c, enabled: c.enabled.includes(key) ? c.enabled.filter(k => k !== key) : [...c.enabled, key] }))
  }
  function addCustomField(label) {
    const l = (label || '').trim(); if (!l) return
    const key = 'cf_' + l.replace(/\s+/g, '_').toLowerCase()
    if (fieldConfig.custom.some(c => c.key === key)) return toast.error('الحقل موجود')
    setFieldConfig(c => ({ ...c, custom: [...c.custom, { key, label: l }] }))
  }
  function removeCustomField(key) {
    setFieldConfig(c => ({ ...c, custom: c.custom.filter(f => f.key !== key) }))
  }
  async function saveFieldConfig() {
    const next = { ...store, product_fields: fieldConfig }
    setStore(next)
    await window.api?.db.saveStoreConfig(next)
    setShowFieldManager(false)
    toast.success('تم حفظ تخصيص الحقول ✓')
  }

  function buildPrompt() {
    const personality = PERSONALITIES.find(p => p.v === store.ai_personality)?.l || 'ودي'
    const currencyLabel = CURRENCIES.find(c => c.v === store.currency)?.l || store.currency
    const productLines = products.map(p => {
      const extras = (fieldConfig.custom || []).map(cf => p.custom_fields?.[cf.key] ? `${cf.label}: ${p.custom_fields[cf.key]}` : '').filter(Boolean).join(' | ')
      return `• ${p.name} | السعر: ${p.price} ${store.currency} | الكمية: ${p.quantity}${p.sizes ? ' | المقاسات: '+p.sizes : ''}${p.description ? ' | '+p.description : ''}${extras ? ' | '+extras : ''}`
    }).join('\n')
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

=== قاعدة المنتجات ===
${productLines || '⚠️ لا توجد منتجات مضافة حالياً. اعتذر للزبون بلباقة.'}

=== مراحل البيع ===
1️⃣ الترحيب وفهم الطلب
2️⃣ جمع بيانات التوصيل (الاسم، الهاتف، العنوان) خطوة بخطوة
3️⃣ تأكيد الطلب كفاتورة واضحة 🧾
4️⃣ تسجيل الطلب وإرسال JSON داخل [ORDER_READY]...[/ORDER_READY]

=== صيغة JSON ===
[ORDER_READY]
{"customer_name":"","customer_phone":"","customer_city":"","customer_area":"","products":[{"name":"","quantity":1,"price":0}],"total_amount":0}
[/ORDER_READY]`
    setStore(s => ({ ...s, system_prompt: prompt }))
    toast.success('تم بناء الـ System Prompt ✓')
  }

  const emptyProduct = { sku:'', name:'', description:'', price:'', quantity:'', sizes:'', image_url:'', category:'', notes:'', custom_fields:{} }

  function onPickImage(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (f.size > 2 * 1024 * 1024) return toast.error('الصورة كبيرة (الحد 2MB)')
    const reader = new FileReader()
    reader.onload = () => setEditing(p => ({ ...p, image_url: reader.result }))
    reader.readAsDataURL(f)
  }

  async function saveProduct() {
    if (!editing?.name) return toast.error('اسم المنتج مطلوب')
    await window.api?.db.saveProduct(editing)
    toast.success('تم حفظ المنتج ✓')
    setEditing(null)
    setProducts(await window.api?.db.getProducts() || [])
  }

  async function deleteProduct(id) {
    if (!confirm('حذف هذا المنتج؟')) return
    await window.api?.db.deleteProduct(id)
    setProducts(p => p.filter(x => x.id !== id))
    toast.success('تم حذف المنتج')
  }

  // ---- Excel (client-side) ----
  async function onImportExcel(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try {
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
      if (!rows.length) return toast.error('الملف فارغ')
      let count = 0
      for (const r of rows) {
        const name = r.name || r.Name || r['الاسم'] || r['اسم المنتج']
        if (!name) continue
        await window.api?.db.saveProduct({
          name: String(name),
          sku: r.sku || r.SKU || r['رقم المنتج'] || '',
          price: Number(r.price || r['السعر'] || 0) || 0,
          quantity: Number(r.quantity || r['الكمية'] || 0) || 0,
          category: r.category || r['الفئة'] || '',
          sizes: r.sizes || r['المقاسات'] || '',
          description: r.description || r['الوصف'] || r['وصف المنتج'] || '',
          custom_fields: {},
        })
        count++
      }
      toast.success(`تم استيراد ${count} منتج ✓`)
      setProducts(await window.api?.db.getProducts() || [])
    } catch (err) {
      toast.error('فشل قراءة الملف — تأكد أنه Excel صحيح')
    }
  }

  function exportExcel() {
    if (!products.length) return toast.error('لا توجد منتجات للتصدير')
    const data = products.map(p => {
      const base = { name: p.name, sku: p.sku, price: p.price, quantity: p.quantity, category: p.category, sizes: p.sizes, description: p.description }
      for (const cf of (fieldConfig.custom || [])) base[cf.label] = p.custom_fields?.[cf.key] || ''
      return base
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Products')
    XLSX.writeFile(wb, `products-${Date.now()}.xlsx`)
    toast.success('تم التصدير ✓')
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
              <input className="input" value={store.contact_phone||''} onChange={e => setStore(s=>({...s,contact_phone:e.target.value}))} placeholder="+962..." />
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
              <select className="select" value={store.currency||'JOD'} onChange={e => setStore(s=>({...s,currency:e.target.value}))}>
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
          <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={onImportExcel} />
          <input ref={imgInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={onPickImage} />
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm flex-center" onClick={() => setEditing(emptyProduct)}>
                <img src={addIcon} className="btn-img-icon" /> منتج جديد
              </button>
              <button className="btn btn-secondary btn-sm flex-center" onClick={() => excelInputRef.current?.click()}>
                <img src={excelIcon} className="btn-img-icon" /> استيراد Excel
              </button>
              <button className="btn btn-secondary btn-sm flex-center" onClick={exportExcel}>
                <img src={excelIcon} className="btn-img-icon" /> تصدير Excel
              </button>
              <button className="btn btn-secondary btn-sm flex-center" onClick={() => setShowFieldManager(true)}>
                <img src={settingsIcon} className="btn-img-icon" /> تخصيص الحقول
              </button>
            </div>
            <span className="badge badge-info">{products.length} منتج</span>
          </div>

          {/* Field manager modal */}
          {showFieldManager && (
            <div className="card mb-4 animate-fade">
              <div className="card-title">تخصيص حقول المنتجات</div>
              <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>فعّل أو ألغِ الحقول الافتراضية، وأضف حقولاً خاصة بمنتجاتك.</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:14}}>
                {BUILTIN_FIELDS.map(f => (
                  <label key={f.key} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,background:'var(--glass-bg)',padding:'6px 10px',borderRadius:8,cursor:'pointer'}}>
                    <input type="checkbox" checked={fieldConfig.enabled.includes(f.key)} onChange={() => toggleBuiltin(f.key)} />
                    {f.label}
                  </label>
                ))}
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>حقول مخصّصة</div>
                {(fieldConfig.custom||[]).map(cf => (
                  <div key={cf.key} style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--glass-bg)',padding:'4px 10px',borderRadius:8,margin:'0 6px 6px 0'}}>
                    {cf.label}
                    <button className="btn btn-danger btn-sm" style={{padding:'1px 7px'}} onClick={() => removeCustomField(cf.key)}>✕</button>
                  </div>
                ))}
                <div className="flex gap-2" style={{marginTop:6}}>
                  <input className="input" id="new-field-input" placeholder="اسم الحقل الجديد (مثلاً: اللون، الوزن)" style={{maxWidth:280}}
                    onKeyDown={e => { if (e.key==='Enter') { addCustomField(e.target.value); e.target.value='' } }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => { const el=document.getElementById('new-field-input'); addCustomField(el.value); el.value='' }}>+ إضافة</button>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-primary btn-sm" onClick={saveFieldConfig}>حفظ التخصيص</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowFieldManager(false)}>إغلاق</button>
              </div>
            </div>
          )}

          {editing && (
            <div className="card mb-4 animate-fade product-form">
              <div className="card-title">{editing.id ? 'تعديل المنتج' : 'منتج جديد'}</div>
              <div className="grid-3">
                <div className="input-group"><label className="input-label">اسم المنتج *</label><input className="input" value={editing.name||''} onChange={e=>setEditing(p=>({...p,name:e.target.value}))} /></div>
                {enabledBuiltins.filter(f => f.type !== 'textarea').map(f => (
                  <div className="input-group" key={f.key}>
                    <label className="input-label">{f.label}</label>
                    <input type={f.type==='number'?'number':'text'} className="input" value={editing[f.key]||''} onChange={e=>setEditing(p=>({...p,[f.key]:e.target.value}))} placeholder={f.key==='sizes'?'S, M, L, XL':''} />
                  </div>
                ))}
                {(fieldConfig.custom||[]).map(cf => (
                  <div className="input-group" key={cf.key}>
                    <label className="input-label">{cf.label}</label>
                    <input className="input" value={editing.custom_fields?.[cf.key]||''} onChange={e=>setEditing(p=>({...p,custom_fields:{...(p.custom_fields||{}),[cf.key]:e.target.value}}))} />
                  </div>
                ))}
              </div>
              {enabledBuiltins.some(f => f.key==='description') && (
                <div className="input-group"><label className="input-label">وصف المنتج</label><textarea className="textarea" style={{minHeight:70}} value={editing.description||''} onChange={e=>setEditing(p=>({...p,description:e.target.value}))} /></div>
              )}
              <div className="input-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">صورة المنتج</label>
                <div className="product-image-row">
                  {editing?.image_url && <img src={editing.image_url} alt="product" className="product-thumb" />}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => imgInputRef.current?.click()}>📷 اختر صورة من الجهاز</button>
                  {editing?.image_url && <button type="button" className="btn btn-danger btn-sm" onClick={() => setEditing(p => ({...p, image_url: ''}))}>✕ حذف</button>}
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
              <thead><tr><th>الصورة</th><th>الاسم</th><th>السعر</th><th>الكمية</th><th>الفئة</th><th>إجراء</th></tr></thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><p>لا توجد منتجات — أضف أو استورد من Excel</p></div></td></tr>
                ) : products.map(p => (
                  <tr key={p.id}>
                    <td>{p.image_url ? <img src={p.image_url} alt={p.name} className="product-table-thumb" /> : <div className="no-img">📦</div>}</td>
                    <td><strong>{p.name}</strong>{p.description && <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.description.slice(0,40)}</div>}</td>
                    <td><strong style={{color:'var(--accent-green)'}}>{Number(p.price||0).toLocaleString()}</strong></td>
                    <td><span className={`badge ${p.quantity > 0 ? 'badge-success' : 'badge-danger'}`}>{p.quantity ?? '—'}</span></td>
                    <td>{p.category||'—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm p-1" onClick={() => setEditing({ ...p, custom_fields: p.custom_fields || {} })} title="تعديل"><img src={editIcon} className="btn-img-icon" /></button>
                        <button className="btn btn-danger btn-sm p-1" onClick={() => deleteProduct(p.id)} title="حذف"><img src={deleteIcon} className="btn-img-icon" /></button>
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
          <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:16}}>التعليمات التي تُعطى للـ AI ليعمل كموظف مبيعات لمتجرك. يُبنى تلقائياً من إعدادات المتجر والمنتجات.</p>
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
