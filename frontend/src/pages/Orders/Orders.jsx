import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import './Orders.css'
import whatsappIcon from '../../assets/icons/whatsapp.png'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import telegramIcon from '../../assets/icons/telegram.png'
import excelIcon from '../../assets/icons/excel.png'

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
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState({ status:'', platform:'' })

  useEffect(() => { loadOrders() }, [filter])

  async function loadOrders() {
    const o = await window.api?.db.getOrders(filter) || []
    setOrders(o)
  }

  async function updateStatus(id, status) {
    await window.api?.db.updateOrderStatus(id, status)
    toast.success('تم تحديث حالة الطلب ✓')
    loadOrders()
    if (selected?.id === id) setSelected(o => ({ ...o, status }))
  }

  async function exportExcel() {
    const res = await window.api?.excel.exportOrders()
    if (res?.success) toast.success('تم تصدير الطلبات ✓')
    else if (!res?.canceled) toast.error('فشل التصدير')
  }

  function parseProducts(json) {
    try { return JSON.parse(json) || [] } catch { return [] }
  }

  const statusInfo = (v) => STATUSES.find(s => s.v === v) || { l: v, cls: 'badge-info' }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>الطلبات</h1>
        <p>جميع الطلبات المُتلقاة عبر المنصات</p>
      </div>

      <div className="flex justify-between items-center mb-4 gap-3">
        <div className="flex gap-2">
          <select className="select" style={{width:'auto'}} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
            <option value="">كل الحالات</option>
            {STATUSES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <select className="select" style={{width:'auto'}} value={filter.platform} onChange={e=>setFilter(f=>({...f,platform:e.target.value}))}>
            <option value="">كل المنصات</option>
            <option value="whatsapp">واتساب</option>
            <option value="facebook">فيسبوك</option>
            <option value="instagram">إنستغرام</option>
            <option value="telegram">تلغرام</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-info">{orders.length} طلب</span>
          <button className="btn btn-secondary btn-sm flex-center" onClick={exportExcel}>
            <img src={excelIcon} className="btn-img-icon" /> تصدير Excel
          </button>
        </div>
      </div>

      <div className="orders-layout">
        <div className="table-wrap orders-table">
          <table>
            <thead>
              <tr><th>رقم الطلب</th><th>الزبون</th><th>المنصة</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th><th>تفاصيل</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><p>لا توجد طلبات بعد</p></div></td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className={selected?.id===o.id?'selected-row':''} onClick={()=>setSelected(o)} style={{cursor:'pointer'}}>
                  <td><code style={{background:'var(--bg-input)',padding:'2px 8px',borderRadius:4,fontSize:11}}>{o.order_number}</code></td>
                  <td><strong>{o.customer_name||'—'}</strong><div style={{fontSize:11,color:'var(--text-muted)'}}>{o.customer_phone}</div></td>
                  <td>
                    <img src={PLATFORM_ICONS[o.platform]} alt={o.platform} className="platform-tiny-img" />
                  </td>
                  <td><strong style={{color:'var(--accent2)'}}>{Number(o.total_amount||0).toLocaleString()} IQD</strong></td>
                  <td><span className={`badge ${statusInfo(o.status).cls}`}>{statusInfo(o.status).l}</span></td>
                  <td style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(o.created_at).toLocaleDateString('ar')}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={e=>{e.stopPropagation();setSelected(o)}}>👁</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="order-detail card animate-fade">
            <div className="flex justify-between items-center mb-4">
              <div className="card-title" style={{margin:0}}>تفاصيل الطلب</div>
              <button className="btn btn-secondary btn-sm" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="detail-row"><span>رقم الطلب</span><code style={{background:'var(--bg-input)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{selected.order_number}</code></div>
            <div className="detail-row"><span>الزبون</span><strong>{selected.customer_name}</strong></div>
            <div className="detail-row"><span>الهاتف</span><span>{selected.customer_phone}</span></div>
            <div className="detail-row"><span>المدينة</span><span>{selected.customer_city} — {selected.customer_area}</span></div>
            {selected.customer_map_link && <div className="detail-row"><span>الخريطة</span><a href={selected.customer_map_link} style={{color:'var(--accent)',fontSize:12}}>فتح الخريطة</a></div>}
            {selected.customer_notes && <div className="detail-row"><span>ملاحظات</span><span style={{color:'var(--warning)'}}>{selected.customer_notes}</span></div>}
            <div className="divider" />
            <div style={{fontWeight:600,marginBottom:8,fontSize:13}}>المنتجات:</div>
            {parseProducts(selected.products_json).map((p,i) => (
              <div key={i} className="product-line">
                <span>{p.name}</span>
                <span style={{color:'var(--accent2)'}}>{p.quantity} × {p.price?.toLocaleString()} = {(p.quantity*p.price).toLocaleString()}</span>
              </div>
            ))}
            <div className="divider" />
            <div className="detail-row"><span>المبلغ الكلي</span><strong style={{color:'var(--accent2)',fontSize:16}}>{Number(selected.total_amount||0).toLocaleString()} IQD</strong></div>
            <div style={{fontWeight:600,marginBottom:8,fontSize:13,marginTop:16}}>تحديث الحالة:</div>
            <div className="status-btns">
              {STATUSES.map(s => (
                <button key={s.v} className={`btn btn-sm ${selected.status===s.v?'btn-primary':'btn-secondary'}`} onClick={()=>updateStatus(selected.id,s.v)}>{s.l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
