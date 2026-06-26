import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import './Invoice.css'
import logoImg from '../../assets/logo.jpg'

const PREFS_KEY = 'invoice_prefs_v1'

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } catch { return {} }
}
function savePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch {}
}

const DEFAULT_PREFS = {
  show_logo: true,
  show_description: true,
  show_work_hours: true,
  show_address: true,
  show_socials: true,
  custom_note: '',
  signature: '',
  thanks_phrase: '',
  brand_color: '#1B3A8C',
}

export default function Invoice({ order, currency = 'JOD', onClose }) {
  const [store, setStore] = useState({})
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS, ...loadPrefs() })
  const [step, setStep] = useState('customize') // 'customize' | 'preview'
  // For initial setup we load store config and merge any per-store invoice fields.
  useEffect(() => {
    window.api?.db.getStoreConfig().then(s => {
      if (!s) return
      setStore(s)
      // Pre-fill store-side defaults from DB if user has saved them before.
      setPrefs(p => ({
        ...p,
        custom_note:  p.custom_note  || '',
        thanks_phrase: p.thanks_phrase || `شكراً لطلبك من ${s.store_name || 'متجرنا'} 🌹`,
        brand_color:  p.brand_color  || s.invoice_brand_color || DEFAULT_PREFS.brand_color,
        invoice_address: s.invoice_address || p.invoice_address || '',
        invoice_social:  s.invoice_social  || p.invoice_social  || { whatsapp: s.contact_phone || '', facebook: '', instagram: '' },
      }))
    }).catch(() => {})
  }, [])

  if (!order) return null

  let products = []
  try { products = JSON.parse(order.products_json) || [] } catch {}
  const subtotal = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0)
  const total = Number(order.total_amount) || subtotal
  const STATUS_AR = { new:'جديد', preparing:'قيد التجهيز', shipped:'تم الإرسال', delivered:'مُسلَّم', cancelled:'ملغي' }
  const dateStr = new Date(order.created_at).toLocaleDateString('ar-EG', { day:'numeric', month:'long', year:'numeric' })

  function updatePref(key, value) {
    setPrefs(p => {
      const next = { ...p, [key]: value }
      savePrefs(next)
      return next
    })
  }
  function updateSocial(channel, value) {
    setPrefs(p => {
      const social = { ...(p.invoice_social || {}), [channel]: value }
      const next = { ...p, invoice_social: social }
      savePrefs(next)
      return next
    })
  }

  async function persistStoreInvoiceFields() {
    // Persist invoice-specific store fields so they pre-populate next print.
    try {
      await window.api?.db.saveStoreConfig({
        invoice_address: prefs.invoice_address || '',
        invoice_social: prefs.invoice_social || null,
        invoice_brand_color: prefs.brand_color || null,
      })
    } catch (e) { console.error('[invoice persist]', e?.message || e) }
  }

  async function goPreview() {
    await persistStoreInvoiceFields()
    setStep('preview')
  }

  function buildPrintHTML() {
    const logoSrc = store.store_logo || `${window.location.origin}${logoImg}`
    const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
    const brand = prefs.brand_color || '#1B3A8C'
    const productRows = products.length ? products.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(p.name)}</strong></td>
        <td>${esc(p.quantity)}</td>
        <td>${Number(p.price || 0).toLocaleString()} ${esc(currency)}</td>
        <td>${(Number(p.price || 0) * Number(p.quantity || 1)).toLocaleString()} ${esc(currency)}</td>
      </tr>
    `).join('') : `<tr><td colspan="5" style="text-align:center;opacity:.6">—</td></tr>`

    const social = prefs.invoice_social || {}
    const socialLine = prefs.show_socials ? [
      social.whatsapp ? `📱 ${esc(social.whatsapp)}` : '',
      social.facebook ? `f ${esc(social.facebook)}` : '',
      social.instagram ? `📷 ${esc(social.instagram)}` : '',
    ].filter(Boolean).join(' &nbsp;·&nbsp; ') : ''

    return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>فاتورة ${esc(order.order_number)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: #111; direction: rtl; padding: 30px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .inv { max-width: 780px; margin: 0 auto; padding: 40px 44px; background: #fff; }
    .inv-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 4px solid ${brand}; padding-bottom: 22px; margin-bottom: 28px; }
    .inv-brand { display: flex; gap: 14px; align-items: center; }
    .inv-logo { width: 74px; height: 74px; object-fit: contain; background: #fff; border-radius: 12px; padding: 4px; border: 1px solid #e5e7eb; }
    .inv-store-name { font-size: 24px; font-weight: 900; color: ${brand}; line-height: 1.2; }
    .inv-store-meta { font-size: 13px; color: #555; margin-top: 4px; }
    .inv-store-meta + .inv-store-meta { margin-top: 2px; }
    .inv-store-desc { font-size: 12px; color: #777; margin-top: 6px; max-width: 320px; line-height: 1.6; }
    .inv-meta { text-align: left; min-width: 200px; }
    .inv-title { font-size: 28px; font-weight: 900; color: ${brand}; letter-spacing: 1px; }
    .inv-num { font-family: monospace; font-size: 13px; background: #f3f4f6; padding: 5px 12px; border-radius: 6px; display: inline-block; margin-top: 6px; color: #111; }
    .inv-date { font-size: 13px; color: #555; margin-top: 8px; }
    .inv-status { font-size: 13px; color: #2BB24C; margin-top: 6px; font-weight: 700; }
    .inv-section-title { font-size: 14px; font-weight: 800; color: ${brand}; border-right: 4px solid #2BB24C; padding-right: 10px; margin: 26px 0 14px; }
    .inv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 28px; font-size: 13.5px; }
    .inv-grid > div { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px dashed #e5e7eb; }
    .inv-grid > div.full { grid-column: 1 / -1; }
    .inv-grid span { color: #666; min-width: 80px; }
    .inv-grid strong { color: #111; }
    .inv-table { width: 100%; border-collapse: collapse; margin: 22px 0 0; font-size: 13.5px; }
    .inv-table thead th { background: ${brand}; color: #fff; padding: 13px 12px; text-align: right; font-weight: 700; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    .inv-table tbody td { padding: 13px 12px; border-bottom: 1px solid #e5e7eb; color: #111 !important; }
    @media print {
      .inv-table thead th { background: ${brand} !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .inv-table tbody td, .inv-grid strong, .inv-grid span { color: #111 !important; }
      .inv-store-name, .inv-title, .inv-section-title { color: ${brand} !important; }
      .inv-total-row.grand { background: linear-gradient(95deg, ${brand}, #2BB24C) !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    .inv-table tbody tr:nth-child(even) { background: #fafafa; }
    .inv-totals { display: flex; flex-direction: column; gap: 6px; margin-right: auto; max-width: 340px; margin-top: 22px; margin-bottom: 22px; }
    .inv-total-row { display: flex; justify-content: space-between; padding: 9px 16px; font-size: 14px; color: #111; }
    .inv-total-row.grand { background: linear-gradient(95deg, ${brand}, #2BB24C); color: #fff !important; border-radius: 10px; padding: 15px 20px; font-size: 17px; font-weight: 900; margin-top: 6px; }
    .inv-note { margin: 18px 0 8px; padding: 12px 16px; background: #fffbeb; border-right: 4px solid #f59e0b; border-radius: 8px; font-size: 13px; color: #92400e; line-height: 1.8; }
    .inv-signature { margin: 30px 0 14px; padding-top: 18px; border-top: 1px solid #e5e7eb; text-align: left; font-size: 13px; color: #555; }
    .inv-signature .sig-line { display: inline-block; min-width: 220px; border-bottom: 1px solid #999; margin: 0 10px 4px 0; }
    .inv-footer { border-top: 2px dashed #e5e7eb; padding-top: 20px; margin-top: 14px; text-align: center; font-size: 12px; color: #666; }
    .inv-thanks { font-size: 15px; font-weight: 700; color: ${brand}; margin-bottom: 8px; }
    .inv-platform { margin-bottom: 6px; }
    .inv-social { font-size: 12px; color: #555; margin: 6px 0; }
    .inv-poweredby { font-size: 11px; opacity: 0.6; margin-top: 10px; }
    @page { size: A4; margin: 12mm; }
    @media print { body { padding: 0; } .inv { padding: 8mm 10mm; } }
  </style>
</head>
<body>
  <div class="inv">
    <div class="inv-head">
      <div class="inv-brand">
        ${prefs.show_logo ? `<img src="${esc(logoSrc)}" alt="logo" class="inv-logo" onerror="this.style.display='none'">` : ''}
        <div>
          <div class="inv-store-name">${esc(store.store_name || 'متجري')}</div>
          ${store.contact_phone ? `<div class="inv-store-meta">📞 <span dir="ltr">${esc(store.contact_phone)}</span></div>` : ''}
          ${prefs.show_work_hours && store.work_hours    ? `<div class="inv-store-meta">🕘 ${esc(store.work_hours)}</div>` : ''}
          ${prefs.show_address && prefs.invoice_address  ? `<div class="inv-store-meta">📍 ${esc(prefs.invoice_address)}</div>` : ''}
          ${prefs.show_description && store.store_description ? `<div class="inv-store-desc">${esc(store.store_description)}</div>` : ''}
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-title">فاتورة</div>
        <div class="inv-num">#${esc(order.order_number)}</div>
        <div class="inv-date">${dateStr}</div>
        <div class="inv-status">الحالة: <strong>${esc(STATUS_AR[order.status] || order.status)}</strong></div>
      </div>
    </div>

    <div class="inv-section-title">بيانات العميل</div>
    <div class="inv-grid">
      <div><span>الاسم:</span><strong>${esc(order.customer_name || '—')}</strong></div>
      <div><span>الهاتف:</span><strong dir="ltr">${esc(order.customer_phone || '—')}</strong></div>
      <div><span>المدينة:</span><strong>${esc(order.customer_city || '—')}</strong></div>
      <div><span>المنطقة:</span><strong>${esc(order.customer_area || '—')}</strong></div>
      ${order.customer_notes ? `<div class="full"><span>ملاحظات:</span><strong>${esc(order.customer_notes)}</strong></div>` : ''}
    </div>

    <div class="inv-section-title">تفاصيل الطلب</div>
    <table class="inv-table">
      <thead>
        <tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>

    <div class="inv-totals">
      <div class="inv-total-row"><span>المجموع الفرعي</span><span>${subtotal.toLocaleString()} ${esc(currency)}</span></div>
      <div class="inv-total-row grand"><span>الإجمالي النهائي</span><span>${total.toLocaleString()} ${esc(currency)}</span></div>
    </div>

    ${prefs.custom_note ? `<div class="inv-note">📝 ${esc(prefs.custom_note)}</div>` : ''}

    ${prefs.signature ? `<div class="inv-signature">${esc(prefs.signature)}: <span class="sig-line"></span></div>` : ''}

    <div class="inv-footer">
      <div class="inv-thanks">${esc(prefs.thanks_phrase || `شكراً لطلبك من ${store.store_name || 'متجرنا'} 🌹`)}</div>
      <div class="inv-platform">المنصة: ${esc(order.platform || '—')}</div>
      ${socialLine ? `<div class="inv-social">${socialLine}</div>` : ''}
      <div class="inv-poweredby">مُولّدة بواسطة AutoFlow Chat · autoflowchat.shop</div>
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.focus(); window.print(); }, 400);
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
    if (!win) { alert('يرجى السماح بالنوافذ المنبثقة في المتصفح ثم المحاولة مرة أخرى.'); return }
    win.document.open()
    win.document.write(buildPrintHTML())
    win.document.close()
  }

  // ============= UI =============
  if (step === 'customize') {
    return (
      <div className="invoice-modal-overlay" onClick={onClose}>
        <div className="invoice-modal" onClick={e => e.stopPropagation()}>
          <div className="invoice-customize">
            <div className="cust-head">
              <h2>🎨 تخصيص الفاتورة قبل الطباعة</h2>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
            </div>

            <div className="cust-section">
              <h3>محتوى الفاتورة</h3>
              <div className="cust-checks">
                {[
                  ['show_logo','عرض شعار المتجر'],
                  ['show_description','عرض وصف المتجر'],
                  ['show_work_hours','عرض ساعات العمل'],
                  ['show_address','عرض عنوان المتجر'],
                  ['show_socials','عرض روابط التواصل'],
                ].map(([k,l]) => (
                  <label key={k} className="cust-check">
                    <input type="checkbox" checked={!!prefs[k]} onChange={e => updatePref(k, e.target.checked)} />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <div className="cust-section">
              <h3>حقول إضافية</h3>
              <label className="cust-field">
                <span>عنوان المتجر (يُحفظ تلقائياً)</span>
                <textarea rows={2} value={prefs.invoice_address || ''}
                  onChange={e => updatePref('invoice_address', e.target.value)}
                  placeholder="مثال: عمّان - شارع الجامعة الأردنية - مجمع الرواد" />
              </label>
              <div className="cust-3col">
                <label className="cust-field">
                  <span>📱 واتساب</span>
                  <input dir="ltr" value={prefs.invoice_social?.whatsapp || ''} placeholder="+962..." onChange={e => updateSocial('whatsapp', e.target.value)} />
                </label>
                <label className="cust-field">
                  <span>f فيسبوك</span>
                  <input dir="ltr" value={prefs.invoice_social?.facebook || ''} placeholder="@page" onChange={e => updateSocial('facebook', e.target.value)} />
                </label>
                <label className="cust-field">
                  <span>📷 إنستغرام</span>
                  <input dir="ltr" value={prefs.invoice_social?.instagram || ''} placeholder="@handle" onChange={e => updateSocial('instagram', e.target.value)} />
                </label>
              </div>
              <label className="cust-field">
                <span>ملاحظة على الفاتورة</span>
                <textarea rows={2} value={prefs.custom_note || ''} placeholder="مثال: يمكن إرجاع المنتج خلال 7 أيام بشرط عدم استخدامه"
                  onChange={e => updatePref('custom_note', e.target.value)} />
              </label>
              <label className="cust-field">
                <span>عبارة الشكر</span>
                <input value={prefs.thanks_phrase || ''} placeholder={`شكراً لطلبك من ${store.store_name || 'متجرنا'} 🌹`}
                  onChange={e => updatePref('thanks_phrase', e.target.value)} />
              </label>
              <label className="cust-field">
                <span>خط التوقيع/الختم (يظهر في الأسفل بخط للتوقيع)</span>
                <input value={prefs.signature || ''} placeholder="مثال: توقيع المسؤول"
                  onChange={e => updatePref('signature', e.target.value)} />
              </label>
            </div>

            <div className="cust-section">
              <h3>الهوية البصرية</h3>
              <label className="cust-field cust-color">
                <span>اللون الأساسي للهوية</span>
                <div className="color-row">
                  <input type="color" value={prefs.brand_color || '#1B3A8C'} onChange={e => updatePref('brand_color', e.target.value)} />
                  <input type="text" dir="ltr" value={prefs.brand_color || '#1B3A8C'} onChange={e => updatePref('brand_color', e.target.value)} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => updatePref('brand_color', '#1B3A8C')}>الافتراضي</button>
                </div>
              </label>
            </div>

            <div className="cust-foot">
              <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
              <button className="btn btn-primary" onClick={goPreview}>
                المعاينة ←
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 2: Preview ───
  const brand = prefs.brand_color || '#1B3A8C'
  const social = prefs.invoice_social || {}
  const socialBits = prefs.show_socials ? [
    social.whatsapp && `📱 ${social.whatsapp}`,
    social.facebook && `f ${social.facebook}`,
    social.instagram && `📷 ${social.instagram}`,
  ].filter(Boolean) : []

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal" onClick={e => e.stopPropagation()}>
        <div className="invoice-toolbar">
          <button className="btn btn-secondary" onClick={() => setStep('customize')}>🔙 تعديل التخصيص</button>
          <button className="btn btn-primary" onClick={handlePrint}>🖨️ طباعة / حفظ PDF</button>
          <button className="btn btn-secondary" onClick={onClose}>إغلاق</button>
        </div>

        <div className="invoice-paper" style={{ '--inv-brand': brand }}>
          <div className="inv-head" style={{ borderBottomColor: brand }}>
            <div className="inv-brand">
              {prefs.show_logo && <img src={store.store_logo || logoImg} alt="logo" className="inv-logo" />}
              <div>
                <div className="inv-store-name" style={{ color: brand }}>{store.store_name || 'متجري'}</div>
                {store.contact_phone && <div className="inv-store-meta">📞 <span dir="ltr">{store.contact_phone}</span></div>}
                {prefs.show_work_hours && store.work_hours    && <div className="inv-store-meta">🕘 {store.work_hours}</div>}
                {prefs.show_address && prefs.invoice_address  && <div className="inv-store-meta">📍 {prefs.invoice_address}</div>}
                {prefs.show_description && store.store_description && <div className="inv-store-desc">{store.store_description}</div>}
              </div>
            </div>
            <div className="inv-meta">
              <div className="inv-title" style={{ color: brand }}>فاتورة</div>
              <div className="inv-num">#{order.order_number}</div>
              <div className="inv-date">{dateStr}</div>
              <div className="inv-status">الحالة: <strong>{STATUS_AR[order.status] || order.status}</strong></div>
            </div>
          </div>

          <div className="inv-section-title" style={{ color: brand }}>بيانات العميل</div>
          <div className="inv-grid">
            <div><span>الاسم:</span><strong>{order.customer_name || '—'}</strong></div>
            <div><span>الهاتف:</span><strong dir="ltr">{order.customer_phone || '—'}</strong></div>
            <div><span>المدينة:</span><strong>{order.customer_city || '—'}</strong></div>
            <div><span>المنطقة:</span><strong>{order.customer_area || '—'}</strong></div>
            {order.customer_notes && <div className="full"><span>ملاحظات:</span><strong>{order.customer_notes}</strong></div>}
          </div>

          <div className="inv-section-title" style={{ color: brand }}>تفاصيل الطلب</div>
          <table className="inv-table">
            <thead>
              <tr style={{ background: brand }}>
                <th style={{ background: brand }}>#</th>
                <th style={{ background: brand }}>المنتج</th>
                <th style={{ background: brand }}>الكمية</th>
                <th style={{ background: brand }}>السعر</th>
                <th style={{ background: brand }}>الإجمالي</th>
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
            <div className="inv-total-row grand" style={{ background: `linear-gradient(95deg, ${brand}, #2BB24C)` }}>
              <span>الإجمالي النهائي</span>
              <span>{total.toLocaleString()} {currency}</span>
            </div>
          </div>

          {prefs.custom_note && <div className="inv-note">📝 {prefs.custom_note}</div>}
          {prefs.signature && <div className="inv-signature">{prefs.signature}: <span className="sig-line"></span></div>}

          <div className="inv-footer">
            <div className="inv-thanks" style={{ color: brand }}>
              {prefs.thanks_phrase || `شكراً لطلبك من ${store.store_name || 'متجرنا'} 🌹`}
            </div>
            <div className="inv-platform">المنصة: {order.platform || '—'}</div>
            {!!socialBits.length && <div className="inv-social">{socialBits.join(' · ')}</div>}
            <div className="inv-poweredby">مُولّدة بواسطة AutoFlow Chat · autoflowchat.shop</div>
          </div>
        </div>
      </div>
    </div>
  )
}
