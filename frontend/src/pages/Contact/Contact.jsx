import whatsappIcon from '../../assets/icons/whatsapp.png'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import { useT } from '../../lib/i18n'

const WHATSAPP = '+962 7 7074 8793'
const WHATSAPP_LINK = 'https://wa.me/962770748793'
const FACEBOOK_LINK = 'https://www.facebook.com/profile.php?id=61585073873212&locale=ar_AR'
const INSTAGRAM_LINK = 'https://www.instagram.com/auto_flowran/'

const CHANNELS = [
  { id:'wa', label:'واتساب', sub:WHATSAPP, href:WHATSAPP_LINK, icon:whatsappIcon, color:'#25D366' },
  { id:'fb', label:'فيسبوك', sub:'صفحتنا الرسمية', href:FACEBOOK_LINK, icon:facebookIcon, color:'#1877F2' },
  { id:'ig', label:'إنستغرام', sub:'@auto_flowran', href:INSTAGRAM_LINK, icon:instagramIcon, color:'#E4405F' },
]

export default function Contact() {
  const { t } = useT()
  return (
    <div className="animate-fade" style={{padding:24}}>
      <div className="page-header" style={{marginBottom:24}}>
        <h1>{t('تواصل معنا')}</h1>
        <p>{t('اختر الطريقة الأنسب لك وفريقنا سيرد عليك خلال دقائق')}</p>
      </div>

      <div className="card" style={{padding:28, marginBottom:20}}>
        <h2 style={{fontSize:18, marginBottom:10, fontWeight:700}}>{t('كيف نساعدك؟')}</h2>
        <p style={{color:'var(--text-secondary)', fontSize:14, lineHeight:1.8}}>
          {t('فريق AutoFlow يربط لك حسابات فيسبوك، إنستغرام، وواتساب بمنصتك خلال 10 دقائق بعد دفع رسوم الاشتراك. كل ما عليك التواصل معنا عبر إحدى القنوات أدناه وتزويدنا بصلاحيات إدارية بسيطة على صفحتك، ونتولى الباقي.')}
        </p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16}}>
        {CHANNELS.map(c => (
          <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer"
             className="card contact-channel"
             style={{padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:12, textDecoration:'none', color:'inherit', transition:'transform .15s, border-color .15s', cursor:'pointer'}}
             onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=c.color}}
             onMouseLeave={e=>{e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor=''}}>
            <div style={{width:70, height:70, borderRadius:'50%', background:c.color+'22', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <img src={c.icon} alt={c.label} style={{width:42, height:42, objectFit:'contain'}} />
            </div>
            <div style={{fontWeight:800, fontSize:16}}>{t(c.label)}</div>
            <div style={{fontSize:12, color:'var(--text-muted)', direction:'ltr'}}>{c.sub === 'صفحتنا الرسمية' ? t('صفحتنا الرسمية') : c.sub}</div>
            <span style={{marginTop:6, padding:'8px 22px', borderRadius:10, background:c.color, color:'#fff', fontWeight:700, fontSize:13}}>
              {t('فتح المحادثة')}
            </span>
          </a>
        ))}
      </div>

      <div className="card" style={{padding:20, marginTop:24, background:'var(--glass-bg)', border:'1px dashed var(--border-color)'}}>
        <div style={{fontSize:13, color:'var(--text-secondary)', lineHeight:1.9}}>
          <strong style={{color:'var(--text-primary)'}}>{t('ساعات الدعم:')}</strong> {t('يومياً من 9 صباحاً حتى 11 مساءً (بتوقيت الأردن).')}
          <br/>{t('الرد عبر واتساب عادةً خلال أقل من 30 دقيقة.')}
        </div>
      </div>
    </div>
  )
}
