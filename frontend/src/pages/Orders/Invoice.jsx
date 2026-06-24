import { useEffect, useState } from 'react'
import './Invoice.css'
import logoImg from '../../assets/logo.jpg'

/**
 * Printable invoice (opens a brand-new window with self-contained HTML + CSS, then prints).
 * Bypasses all the `visibility:hidden` / fixed-positioning pitfalls of in-page print.
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

  const STATUS_AR = { new:'جديد', preparing:'قيد التجهيز', shipped:'تم الإرسال', delivered:'مُسلَّم', cancelled:'ملغي' }
  const dateStr = new Date(order.created_at).toLocaleDateString('ar-EG', { day:'numeric', month:'long', year:'numeric' })

  // Build standalone HTML for the print window. Logo is the user's store_logo
  // (a data URL or remote URL) — both work fine when embedded directly.
  function buildPrintHTML() {
    const logoSrc = store.store_logo || `${window.location.origin}${logoImg}`
    const escape = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
    const productRows = products.length ? products.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escape(p.name)}</strong></td>
        <td>${escape(p.quantity)}</td>
        <td>${Number(p.price || 0).toLocaleString()} ${escape(currency)}</td>
        <td>${(Number(p.price || 0) * Number(p.quantity || 1)).toLocaleString()} ${escape(currency)}</td>
      </tr>
    `).join('') : `<tr><td colspan="5" style="text-align:center;opacity:.6">—</td></tr>`

    return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>فاتورة ${escape(order.order_number)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: #111; direction: rtl; padding: 30px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .inv { max-width: 780px; margin: 0 auto; padding: 40px 44px; background: #fff; }
    .inv-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 4px solid #1B3A8C; padding-bottom: 22px; margin-bottom: 28px; }
    .inv-brand { display: flex; gap: 14px; align-items: center; }
    .inv-logo { width: 74px; height: 74px; object-fit: contain; background: #fff; border-radius: 12px; padding: 4px; border: 1px solid #e5e7eb; }
    .inv-store-name { font-size: 24px; font-weight: 900; color: #1B3A8C; line-height: 1.2; }
    .inv-store-meta { font-size: 13px; color: #555; margin-top: 4px; }
    .inv-store-meta + .inv-store-meta { margin-top: 2px; }
    .inv-store-desc { font-size: 12px; color: #777; margin-top: 6px; max-width: 320px; line-height: 1.6; }
    .inv-meta { text-align: left; min-width: 200px; }
    .inv-title { font-size: 28px; font-weight: 900; color: #1B3A8C; letter-spacing: 1px; }
    .inv-num { font-family: monospace; font-size: 13px; background: #f3f4f6; padding: 5px 12px; border-radius: 6px; display: inline-block; margin-top: 6px; color: #111; }
    .inv-date { font-size: 13px; color: #555; margin-top: 8px; }
    .inv-status { font-size: 13px; color: #2BB24C; margin-top: 6px; font-weight: 700; }
    .inv-section-title { font-size: 14px; font-weight: 800; color: #1B3A8C; border-right: 4px solid #2BB24C; padding-right: 10px; margin: 26px 0 14px; }
    .inv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 28px; font-size: 13.5px; }
    .inv-grid > div { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px dashed #e5e7eb; }
    .inv-grid > div.full { grid-column: 1 / -1; }
    .inv-grid span { color: #666; min-width: 80px; }
    .inv-grid strong { color: #111; }
    .inv-table { width: 100%; border-collapse: collapse; margin: 22px 0 0; font-size: 13.5px; }
    .inv-table thead th { background: #1B3A8C; color: #fff; padding: 13px 12px; text-align: right; font-weight: 700; font-size: 13px; }
    .inv-table tbody td { padding: 13px 12px; border-bottom: 1px solid #e5e7eb; color: #111; }
    .inv-table tbody tr:nth-child(even) { background: #fafafa; }
    .inv-totals { display: flex; flex-direction: column; gap: 6px; margin-right: auto; max-width: 340px; margin-top: 22px; margin-bottom: 30px; }
    .inv-total-row { display: flex; justify-content: space-between; padding: 9px 16px; font-size: 14px; color: #111; }
    .inv-total-row.grand { background: linear-gradient(95deg, #1B3A8C, #2BB24C); color: #fff !important; border-radius: 10px; padding: 15px 20px; font-size: 17px; font-weight: 900; margin-top: 6px; }
    .inv-footer { border-top: 2px dashed #e5e7eb; padding-top: 20px; margin-top: 14px; text-align: center; font-size: 12px; color: #666; }
    .inv-thanks { font-size: 15px; font-weight: 700; color: #1B3A8C; margin-bottom: 8px; }
    .inv-platform { margin-bottom: 6px; }
    .inv-poweredby { font-size: 11px; opacity: 0.6; margin-top: 10px; }
    @page { size: A4; margin: 12mm; }
    @media print {
      body { padding: 0; }
      .inv { padding: 8mm 10mm; }
    }
  </style>
</head>
<body>
  <div class="inv">
    <div class="inv-head">
      <div class="inv-brand">
        <img src="${escape(logoSrc)}" alt="logo" class="inv-logo" onerror="this.style.display='none'">
        <div>
          <div class="inv-store-name">${escape(store.store_name || 'متجري')}</div>
          ${store.contact_phone ? `<div class="inv-store-meta">📞 <span dir="ltr">${escape(store.contact_phone)}</span></div>` : ''}
          ${store.work_hours    ? `<div class="inv-store-meta">🕘 ${escape(store.work_hours)}</div>` : ''}
          ${store.store_description ? `<div class="inv-store-desc">${escape(store.store_description)}</div>` : ''}
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-title">فاتورة</div>
        <div class="inv-num">#${escape(order.order_number)}</div>
        <div class="inv-date">${dateStr}</div>
        <div class="inv-status">الحالة: <strong>${escape(STATUS_AR[order.status] || order.status)}</strong></div>
      </div>
    </div>

    <div class="inv-section-title">بيانات العميل</div>
    <div class="inv-grid">
      <div><span>الاسم:</span><strong>${escape(order.customer_name || '—')}</strong></div>
      <div><span>الهاتف:</span><strong dir="ltr">${escape(order.customer_phone || '—')}</strong></div>
      <div><span>المدينة:</span><strong>${escape(order.customer_city || '—')}</strong></div>
      <div><span>المنطقة:</span><strong>${escape(order.customer_area || '—')}</strong></div>
      ${order.customer_notes ? `<div class="full"><span>ملاحظات:</span><strong>${escape(order.customer_notes)}</strong></div>` : ''}
    </div>

    <div class="inv-section-title">تفاصيل الطلب</div>
    <table class="inv-table">
      <thead>
        <tr>
          <th>#</th>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>

    <div class="inv-totals">
      <div class="inv-total-row"><span>المجموع الفرعي</span><span>${subtotal.toLocaleString()} ${escape(currency)}</span></div>
      <div class="inv-total-row grand">
        <span>الإجمالي النهائي</span>
        <span>${total.toLocaleString()} ${escape(currency)}</span>
      </div>
    </div>

    <div class="inv-footer">
      <div class="inv-thanks">شكراً لطلبك من ${escape(store.store_name || 'متجرنا')} 🌹</div>
      <div class="inv-platform">المنصة: ${escape(order.platform || '—')}</div>
      <div class="inv-poweredby">مُولّدة بواسطة AutoFlow Chat · autoflowchat.shop</div>
    </div>
  </div>
  <script>
    // Wait for the logo + fonts to load, then trigger print.
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    });
    window.addEventListener('afterprint', function() {
      setTimeout(function() { window.close(); }, 200);
    });
  </script>
</body>
</html>`
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=900,height=750')
    if (!win) {
      alert('يرجى السماح بالنوافذ المنبثقة في المتصفح ثم المحاولة مرة أخرى.')
      return
    }
    win.document.open()
    win.document.write(buildPrintHTML())
    win.document.close()
  }

  // ========== On-screen preview ==========
  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal" onClick={e => e.stopPropagation()}>
        <div className="invoice-toolbar">
          <button className="btn btn-primary" onClick={handlePrint}>
            🖨️ طباعة / حفظ PDF
          </button>
          <button className="btn btn-secondary" onClick={onClose}>إغلاق</button>
        </div>

        <div className="invoice-paper">
          <div className="inv-head">
            <div className="inv-brand">
              <img src={store.store_logo || logoImg} alt="logo" className="inv-logo" />
              <div>
                <div className="inv-store-name">{store.store_name || 'متجري'}</div>
                {store.contact_phone && <div className="inv-store-meta">📞 <span dir="ltr">{store.contact_phone}</span></div>}
                {store.work_hours    && <div className="inv-store-meta">🕘 {store.work_hours}</div>}
                {store.store_description && <div className="inv-store-desc">{store.store_description}</div>}
              </div>
            </div>
            <div className="inv-meta">
              <div className="inv-title">فاتورة</div>
              <div className="inv-num">#{order.order_number}</div>
              <div className="inv-date">{dateStr}</div>
              <div className="inv-status">الحالة: <strong>{STATUS_AR[order.status] || order.status}</strong></div>
            </div>
          </div>

          <div className="inv-section-title">بيانات العميل</div>
          <div className="inv-grid">
            <div><span>الاسم:</span><strong>{order.customer_name || '—'}</strong></div>
            <div><span>الهاتف:</span><strong dir="ltr">{order.customer_phone || '—'}</strong></div>
            <div><span>المدينة:</span><strong>{order.customer_city || '—'}</strong></div>
            <div><span>المنطقة:</span><strong>{order.customer_area || '—'}</strong></div>
            {order.customer_notes && <div className="full"><span>ملاحظات:</span><strong>{order.customer_notes}</strong></div>}
          </div>

          <div className="inv-section-title">تفاصيل الطلب</div>
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
              )) : <tr><td colSpan={5} style={{textAlign:'center', opacity:.6}}>—</td></tr>}
            </tbody>
          </table>

          <div className="inv-totals">
            <div className="inv-total-row"><span>المجموع الفرعي</span><span>{subtotal.toLocaleString()} {currency}</span></div>
            <div className="inv-total-row grand">
              <span>الإجمالي النهائي</span>
              <span>{total.toLocaleString()} {currency}</span>
            </div>
          </div>

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
