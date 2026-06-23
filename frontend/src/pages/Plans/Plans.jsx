import { useNavigate } from 'react-router-dom'

const FEATURES = [
  'ربط فيسبوك + إنستغرام + واتساب + تلغرام',
  'موظف ذكي يرد تلقائياً 24/7 بنفس لغة العميل',
  'سجل محادثات موحّد (Inbox) مع البحث والفلترة',
  'تحويل المحادثات إلى طلبات تلقائياً',
  'تقارير وتحليلات متقدمة (إيرادات، طلبات، ذروة)',
  'لوحة منتجات مع استيراد/تصدير Excel وحقول مخصصة',
  'مولّد بوستات احترافي مدعوم بـ AI',
  'دعم فني عبر واتساب خلال دقائق',
]

const PLAN = {
  name: 'الخطة الشهرية',
  price: 25,
  currency: 'JOD',
  period: 'شهر',
  badge: 'موصى بها',
  features: FEATURES,
}

export default function Plans() {
  const nav = useNavigate()
  return (
    <div className="animate-fade" style={{padding:24, maxWidth:1100, margin:'0 auto'}}>
      <div className="page-header" style={{textAlign:'center', marginBottom:30}}>
        <h1>الخطط والأسعار</h1>
        <p>اشتراك شفاف وبدون التزامات طويلة. ألغِ متى ما أردت.</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'minmax(280px,420px)', justifyContent:'center'}}>
        <div className="card" style={{padding:30, position:'relative', border:'2px solid var(--accent)', boxShadow:'0 18px 50px -20px var(--accent)'}}>
          <span style={{position:'absolute', top:-12, right:24, background:'var(--accent)', color:'#fff', padding:'4px 14px', borderRadius:12, fontSize:12, fontWeight:700}}>
            {PLAN.badge}
          </span>
          <h2 style={{fontSize:22, fontWeight:800, marginBottom:6}}>{PLAN.name}</h2>
          <div style={{display:'flex', alignItems:'baseline', gap:6, marginTop:14, marginBottom:18}}>
            <span style={{fontSize:48, fontWeight:900, color:'var(--accent)'}}>{PLAN.price}</span>
            <span style={{fontSize:14, color:'var(--text-secondary)'}}>{PLAN.currency} / {PLAN.period}</span>
          </div>
          <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10}}>
            {PLAN.features.map((f,i) => (
              <li key={i} style={{display:'flex', alignItems:'center', gap:10, fontSize:14, lineHeight:1.5}}>
                <span style={{color:'#10b981', fontSize:18, fontWeight:900}}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button onClick={()=>nav('/settings?tab=billing')}
                  style={{marginTop:24, width:'100%', background:'var(--accent)', color:'#fff', border:'none', borderRadius:14, padding:14, fontWeight:800, fontSize:15, cursor:'pointer'}}>
            اطلب الاشتراك
          </button>
          <button onClick={()=>nav('/contact')}
                  style={{marginTop:10, width:'100%', background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border-color)', borderRadius:14, padding:12, fontWeight:600, fontSize:13, cursor:'pointer'}}>
            تواصل معنا لخطة مخصصة
          </button>
        </div>
      </div>

      <div className="card" style={{marginTop:30, padding:20, textAlign:'center', background:'var(--glass-bg)'}}>
        <div style={{fontSize:13, color:'var(--text-secondary)'}}>
          الدفع يدوي عبر التحويل البنكي أو CliQ أو زين كاش. بعد التأكيد نُفعّل اشتراكك خلال 10 دقائق ونربط حساباتك مباشرة.
        </div>
      </div>
    </div>
  )
}
