import { useEffect, useState } from 'react'
import './Invoice.css'
import logoImg from '../../assets/logo.jpg'

/**
 * Printable invoice (opens a new window, prints, then closes).
 * `order` is the order row, `currency` is the store currency string.
 */
export default function Invoice({ order, currency = 'JOD', onClose }) {
  const [store, setStore] = useState({})

  useEffect(() => {
    window.api?.db.getStoreConfig().then(setStore).catch(() => {})
  }, [])

  if (!order) return null

  let products = []
  try { products = JSON.parse(order.products_json) || [] } catch {}
  const subtotal = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0)
  const total = Number(order.total_amount) || subtotal

  function handlePrint() {
    window.print()
  }

  const STATUS_AR = { new:'جديد', preparing:'قيد التجهيز', shipped:'تم الإرسال', delivered:'مُسلَّم', cancelled:'ملغي' }

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal" onClick={e => e.stopPropagation()}>
        <div className="invoice-toolbar no-print">
          <button className="btn btn-primary" onClick={handlePrint}>
            🖨️ طباعة / حفظ PDF
          </button>
          <button className="btn btn-secondary" onClick={onClose}>إغلاق</button>
        </div>

        <div className="invoice-paper" id="invoice-print">
          {/* Header */}
          <div className="inv-head">
            <div className="inv-brand">
              <img src={store.store_logo || logoImg} alt="logo" className="inv-logo" />
              <div>
                <div className="inv-store-name">{store.store_name || 'متجري'}</div>
                {store.contact_phone && <div className="inv-store-meta">📞 {store.contact_phone}</div>}
                {store.store_description && <div className="inv-store-desc">{store.store_description}</div>}
              </div>
            </div>
            <div className="inv-meta">
              <div className="inv-title">فاتورة</div>
              <div className="inv-num">#{order.order_number}</div>
              <div className="inv-date">
                {new Date(order.created_at).toLocaleDateString('ar-EG', { day:'numeric', month:'long', year:'numeric' })}
              </div>
              <div className="inv-status">
                الحالة: <strong>{STATUS_AR[order.status] || order.status}</strong>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="inv-section">
            <div className="inv-section-title">بيانات العميل</div>
            <div className="inv-grid">
              <div><span>الاسم:</span><strong>{order.customer_name || '—'}</strong></div>
              <div><span>الهاتف:</span><strong dir="ltr">{order.customer_phone || '—'}</strong></div>
              <div><span>المدينة:</span><strong>{order.customer_city || '—'}</strong></div>
              <div><span>المنطقة:</span><strong>{order.customer_area || '—'}</strong></div>
              {order.customer_notes && <div className="full"><span>ملاحظات:</span><strong>{order.customer_notes}</strong></div>}
            </div>
          </div>

          {/* Products table */}
          <table className="inv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {products.length ? products.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.quantity}</td>
                  <td>{Number(p.price || 0).toLocaleString()} {currency}</td>
                  <td>{(Number(p.price || 0) * Number(p.quantity || 1)).toLocaleString()} {currency}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} style={{textAlign:'center', opacity:.6}}>—</td></tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="inv-totals">
            <div className="inv-total-row"><span>المجموع الفرعي</span><span>{subtotal.toLocaleString()} {currency}</span></div>
            <div className="inv-total-row grand">
              <span>الإجمالي النهائي</span>
              <span>{total.toLocaleString()} {currency}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="inv-footer">
            <div className="inv-thanks">شكراً لطلبك من {store.store_name || 'متجرنا'} 🌹</div>
            <div className="inv-platform">المنصة: {order.platform || '—'}</div>
            <div className="inv-poweredby">مُولّدة بواسطة AutoFlow Chat · autoflowchat.shop</div>
          </div>
        </div>
      </div>
    </div>
  )
}
