import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import './Orders.css'
import whatsappIcon from '../../assets/icons/whatsapp.png'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import telegramIcon from '../../assets/icons/telegram.png'
import excelIcon from '../../assets/icons/excel.png'
import { useCurrency } from '../../lib/useCurrency'
import { useT } from '../../lib/i18n'
import Invoice from './Invoice'

const STATUSES = [
  { v:'new', l:'جديد', cls:'badge-info' },
  { v:'preparing', l:'قيد التجهيز', cls:'badge-warning' },
  { v:'shipped', l:'تم الإرسال', cls:'badge-success' },
  { v:'delivered', l:'مُسلَّم', cls:'badge-success' },
  { v:'cancelled', l:'ملغي', cls:'badge-danger' },
]
const STATUS_MAP = { 'الكل':null,'جديدة':'new','نشطة':'active','مكتملة':'completed','تحتاج تدخل':'needs_attention' }
const PLATFORM_ICONS = { whatsapp: whatsappIcon, facebook: facebookIcon, instagram: instagramIcon, telegram: telegramIcon }

export default function Orders() {
  const { t, lang } = useT()
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState({ status:'', platform:'' })
  const [printing, setPrinting] = useState(null)
  const currency = useCurrency()

  useEffect(() => { loadOrders() }, [filter])

  async function loadOrders() {
    const o = await window.api?.db.getOrders(filter) || []
    setOrders(o)
  }

  async function updateStatus(id, status) {
    await window.api?.db.updateOrderStatus(id, status)
    toast.success(t('تم تحديث حالة الطلب ✓'))
    loadOrders()
    if (selected?.id === id) setSelected(o => ({ ...o, status }))
  }

  async function exportExcel() {
    const res = await window.api?.excel.exportOrders()
    if (res?.success) toast.success(t('تم تصدير الطلبات ✓'))
    else if (!res?.canceled) toast.error(t('فشل التصدير'))
  }

  function parseProducts(json) {
    try { return JSON.parse(json) || [] } catch { return [] }
  }

  const statusInfo = (v) => STATUSES.find(s => s.v === v) || { l: v, cls: 'badge-info' }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>{t('الطلبات')}</h1>
        <p>{t('جميع الطلبات المُتلقاة عبر المنصات')}</p>
      </div>

      <div className="flex justify-between items-center mb-4 gap-3">
        <div className="flex gap-2">
          <select className="select" style={{width:'auto'}} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
            <option value="">{t('كل الحالات')}</option>
            {STATUSES.map(s=><option key={s.v} value={s.v}>{t(s.l)}</option>)}
          </select>
          <select className="select" style={{width:'auto'}} value={filter.platform} onChange={e=>setFilter(f=>({...f,platform:e.target.value}))}>
            <option value="">{t('كل المنصات')}</option>
            <option value="whatsapp">{t('واتساب')}</option>
            <option value="facebook">{t('فيسبوك')}</option>
            <option value="instagram">{t('إنستغرام')}</option>
            <option value="telegram">{t('تلغرام')}</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-info">{orders.length} {t('طلب')}</span>
          <button className="btn btn-secondary btn-sm flex-center" onClick={exportExcel}>
            <img src={excelIcon} className="btn-img-icon" /> {t('تصدير Excel')}
          </button>
        </div>
      </div>

      <div className="orders-layout">
        <div className="table-wrap orders-table">
          <table>
            <thead>
              <tr><th>{t('رقم الطلب')}</th><th>{t('الزبون')}</th><th>{t('المنصة')}</th><th>{t('المبلغ')}</th><th>{t('الحالة')}</th><th>{t('التاريخ')}</th><th>{t('تفاصيل')}</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><p>{t('لا توجد طلبات بعد')}</p></div></td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className={selected?.id===o.id?'selected-row':''} onClick={()=>setSelected(o)} style={{cursor:'pointer'}}>
                  <td><code style={{background:'var(--bg-input)',padding:'2px 8px',borderRadius:4,fontSize:11}}>{o.order_number}</code></td>
                  <td><strong>{o.customer_name||'—'}</strong><div style={{fontSize:11,color:'var(--text-muted)'}}>{o.customer_phone}</div></td>
                  <td>
                    <img src={PLATFORM_ICONS[o.platform]} alt={o.platform} className="platform-tiny-img" />
                  </td>
                  <td><strong style={{color:'var(--accent2)'}}>{Number(o.total_amount||0).toLocaleString()} {currency}</strong></td>
                  <td onClick={e=>e.stopPropagation()}>
                    <select className={`status-select status-${o.status}`} value={o.status||'new'} onChange={e=>updateStatus(o.id, e.target.value)}>
                      {STATUSES.map(s => <option key={s.v} value={s.v}>{t(s.l)}</option>)}
                    </select>
                  </td>
                  <td style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(o.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar')}</td>
                  <td onClick={e=>e.stopPropagation()} style={{display:'flex', gap:4}}>
                    <button className="btn btn-secondary btn-sm" title={t('عرض')} onClick={()=>setSelected(o)}>👁</button>
                    <button className="btn btn-secondary btn-sm" title={t('طباعة')} onClick={()=>setPrinting(o)}>🖨️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {printing && <Invoice order={printing} currency={currency} onClose={()=>setPrinting(null)} />}

        {selected && (
          <div className="order-detail card animate-fade">
            <div className="flex justify-between items-center mb-4">
              <div className="card-title" style={{margin:0}}>{t('تفاصيل الطلب')}</div>
              <button className="btn btn-secondary btn-sm" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="detail-row"><span>{t('رقم الطلب')}</span><code style={{background:'var(--bg-input)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{selected.order_number}</code></div>
            <div className="detail-row"><span>{t('الزبون')}</span><strong>{selected.customer_name}</strong></div>
            <div className="detail-row"><span>{t('الهاتف')}</span><span>{selected.customer_phone}</span></div>
            <div className="detail-row"><span>{t('المدينة')}</span><span>{selected.customer_city} — {selected.customer_area}</span></div>
            {selected.customer_map_link && <div className="detail-row"><span>{t('الخريطة')}</span><a href={selected.customer_map_link} style={{color:'var(--accent)',fontSize:12}}>{t('فتح الخريطة')}</a></div>}
            {selected.customer_notes && <div className="detail-row"><span>{t('ملاحظات')}</span><span style={{color:'var(--warning)'}}>{selected.customer_notes}</span></div>}
            <div className="divider" />
            <div style={{fontWeight:600,marginBottom:8,fontSize:13}}>{t('المنتجات:')}</div>
            {parseProducts(selected.products_json).map((p,i) => (
              <div key={i} className="product-line">
                <span>{p.name}</span>
                <span style={{color:'var(--accent2)'}}>{p.quantity} × {p.price?.toLocaleString()} = {(p.quantity*p.price).toLocaleString()} {currency}</span>
              </div>
            ))}
            <div className="divider" />
            <div className="detail-row"><span>{t('المبلغ الكلي')}</span><strong style={{color:'var(--accent2)',fontSize:16}}>{Number(selected.total_amount||0).toLocaleString()} {currency}</strong></div>
            <button className="btn btn-primary flex-center" style={{marginTop:14, width:'100%', background:'linear-gradient(95deg,#1B3A8C,#2BB24C)', border:'none'}}
              onClick={()=>setPrinting(selected)}>
              🖨️ {t('طباعة الفاتورة (PDF)')}
            </button>
            <div style={{fontWeight:600,marginBottom:8,fontSize:13,marginTop:16}}>{t('تحديث الحالة:')}</div>
            <div className="status-btns">
              {STATUSES.map(s => (
                <button key={s.v} className={`btn btn-sm ${selected.status===s.v?'btn-primary':'btn-secondary'}`} onClick={()=>updateStatus(selected.id,s.v)}>{t(s.l)}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
