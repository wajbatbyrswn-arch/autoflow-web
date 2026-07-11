import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../lib/i18n'
import { useSubscription } from '../../lib/subscription'

const FEATURES = [
  'ربط فيسبوك + إنستغرام + واتساب + تلغرام',
  'موظف ذكي يرد تلقائياً 24/7 بنفس لغة العميل',
  'سجل محادثات موحّد (Inbox) مع البحث والفلترة',
  'تحويل المحادثات إلى طلبات تلقائياً',
  'تقارير وتحليلات متقدمة (إيرادات، طلبات، ذروة)',
  'لوحة منتجات مع استيراد/تصدير Excel وحقول مخصصة',
  'إدارة الشكاوى وإشعارات فورية على تلغرام',
  'دعم فني عبر واتساب خلال دقائق',
]

const ORIGINAL_PRICE = 40
const DISCOUNT_PRICE = 30

/** Compute remaining ms in the 24-hour discount window. */
function discountRemaining(createdAt) {
  if (!createdAt) return 0
  const ms = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now()
  return ms > 0 ? ms : 0
}

/** Format ms to "HH:MM:SS" */
function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Plans() {
  const { t } = useT()
  const nav = useNavigate()
  const { profile } = useSubscription()
  const createdAt = profile?.created_at

  const [remaining, setRemaining] = useState(() => discountRemaining(createdAt))

  useEffect(() => {
    if (!createdAt) return
    setRemaining(discountRemaining(createdAt))
    const id = setInterval(() => {
      const r = discountRemaining(createdAt)
      setRemaining(r)
      if (r <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [createdAt])

  const hasDiscount = remaining > 0
  const displayPrice = hasDiscount ? DISCOUNT_PRICE : ORIGINAL_PRICE

  return (
    <div className="animate-fade" style={{padding:24, maxWidth:1100, margin:'0 auto'}}>
      <div className="page-header" style={{textAlign:'center', marginBottom:30}}>
        <h1>{t('الخطط والأسعار')}</h1>
        <p>{t('اشتراك شفاف وبدون التزامات طويلة. ألغِ متى ما أردت.')}</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'minmax(280px,420px)', justifyContent:'center'}}>
        <div className="card" style={{padding:30, position:'relative', border:'2px solid var(--accent)', boxShadow:'0 18px 50px -20px var(--accent)'}}>
          {/* Discount badge */}
          {hasDiscount && (
            <div style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
              padding: '6px 18px', borderRadius: 20, fontSize: 12, fontWeight: 800,
              boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              animation: 'pulse 2s infinite',
            }}>
              <span>🎉</span>
              <span>{t('خصم ترحيبي نشط')}</span>
            </div>
          )}

          <span style={{position:'absolute', top: hasDiscount ? 18 : -12, right:24, background:'var(--accent)', color:'#fff', padding:'4px 14px', borderRadius:12, fontSize:12, fontWeight:700}}>
            {t('موصى بها')}
          </span>
          <h2 style={{fontSize:22, fontWeight:800, marginBottom:6, marginTop: hasDiscount ? 14 : 0}}>{t('الخطة الشهرية')}</h2>

          {/* Price display */}
          <div style={{display:'flex', alignItems:'baseline', gap:6, marginTop:14, marginBottom: hasDiscount ? 8 : 18}}>
            {hasDiscount && (
              <span style={{fontSize: 22, color:'var(--text-secondary)', textDecoration:'line-through', opacity: 0.5}}>
                {ORIGINAL_PRICE}
              </span>
            )}
            <span style={{fontSize:48, fontWeight:900, color: hasDiscount ? '#10b981' : 'var(--accent)'}}>{displayPrice}</span>
            <span style={{fontSize:14, color:'var(--text-secondary)'}}>JOD / {t('شهر')}</span>
          </div>

          {/* Countdown timer */}
          {hasDiscount && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 10, padding: '6px 16px', marginBottom: 18, fontSize: 13,
            }}>
              <span style={{color: '#34d399'}}>⏳ {t('ينتهي العرض خلال')}</span>
              <span style={{fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: '#10b981', letterSpacing: 1}}>
                {fmtCountdown(remaining)}
              </span>
            </div>
          )}

          <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10}}>
            {FEATURES.map((f,i) => (
              <li key={i} style={{display:'flex', alignItems:'center', gap:10, fontSize:14, lineHeight:1.5}}>
                <span style={{color:'#10b981', fontSize:18, fontWeight:900}}>✓</span>
                <span>{t(f)}</span>
              </li>
            ))}
          </ul>
          <button onClick={()=>nav('/settings?tab=billing')}
                  style={{marginTop:24, width:'100%', background: hasDiscount ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--accent)', color:'#fff', border:'none', borderRadius:14, padding:14, fontWeight:800, fontSize:15, cursor:'pointer', boxShadow: hasDiscount ? '0 4px 15px rgba(16,185,129,0.4)' : 'none', transition:'transform 0.2s, box-shadow 0.2s'}}>
            {hasDiscount ? t('اشترك الآن بالسعر المخفّض ←') : t('اطلب الاشتراك')}
          </button>
          <button onClick={()=>nav('/contact')}
                  style={{marginTop:10, width:'100%', background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border-color)', borderRadius:14, padding:12, fontWeight:600, fontSize:13, cursor:'pointer'}}>
            {t('تواصل معنا لخطة مخصصة')}
          </button>
        </div>
      </div>

      <div className="card" style={{marginTop:30, padding:20, textAlign:'center', background:'var(--glass-bg)'}}>
        <div style={{fontSize:13, color:'var(--text-secondary)'}}>
          {t('الدفع يدوي عبر التحويل البنكي أو CliQ أو زين كاش. بعد التأكيد نُفعّل اشتراكك خلال 10 دقائق ونربط حساباتك مباشرة.')}
        </div>
      </div>

      {hasDiscount && (
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
          }
        `}</style>
      )}
    </div>
  )
}
