import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import logoImg from '../assets/logo.jpg'
import './Landing.css'

const WHATSAPP_LINK = 'https://wa.me/962770748793'
const FACEBOOK_LINK = 'https://www.facebook.com/profile.php?id=61585073873212&locale=ar_AR'
const INSTAGRAM_LINK = 'https://www.instagram.com/auto_flowran/'

async function loginGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

function useReveal() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect() }
    }, { threshold: 0.18 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return [ref, shown]
}

function Reveal({ children, delay = 0, className = '', style = {} }) {
  const [ref, shown] = useReveal()
  return (
    <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

const TABS = [
  { id: 'home',    label: 'الرئيسية' },
  { id: 'product', label: 'المنتج' },
  { id: 'how',     label: 'كيف يعمل' },
  { id: 'pricing', label: 'الأسعار' },
  { id: 'reviews', label: 'آراء العملاء' },
  { id: 'about',   label: 'عنا وتواصل' },
]

const FEATURES = [
  { i: '🤖', t: 'موظف مبيعات ذكي', d: 'يرد على زبائنك تلقائياً 24/7 بنفس لغتهم، يعرف منتجاتك، أسعارك، ويُتمّ الطلب لحدّ ما يحطّك العنوان والرقم.' },
  { i: '💬', t: 'صندوق وارد موحّد', d: 'كل رسائل فيسبوك، إنستغرام، واتساب، وتلغرام في مكان واحد. ما عاد عندك تنقل بين الحسابات.' },
  { i: '🛒', t: 'تحويل المحادثة إلى طلب', d: 'لحظة ما الزبون يقول "أكّد"، الطلب يتسجّل تلقائياً في لوحة الطلبات بكامل بياناته.' },
  { i: '📊', t: 'تحليلات وتقارير ذكية', d: 'إيرادات، متوسط الطلب، أوقات الذروة، توزيع المنصات — كل شي قدامك بـ realtime.' },
  { i: '✨', t: 'مولّد بوستات AI', d: 'اطلب من الـ AI ينشأ لك بوستات احترافية بصور ومحتوى مناسب لمتجرك.' },
  { i: '🔒', t: 'فصل كامل لكل متجر', d: 'بيانات متجرك معزولة تماماً. لا أحد يقدر يشوف محادثاتك أو زبائنك.' },
]

const PROBLEMS = [
  { i: '😩', t: 'رسائل تضيع', d: 'زبون كتبلك الساعة 3 صباحاً وما رديت — راح اشترى من غيرك.' },
  { i: '🔁', t: 'نفس الأسئلة 100 مرة', d: '"كم السعر؟" "هل متوفر؟" — ساعات يومياً تضيع.' },
  { i: '🤯', t: 'تنقّل بين المنصات', d: 'فيسبوك، إنستا، واتساب، تلغرام — مستحيل تتابعهم.' },
  { i: '📉', t: 'طلبات بلا متابعة', d: 'الزبون قال "بدي اطلب" والمحادثة ضاعت بين 50 رسالة.' },
]

const STEPS = [
  { n: 1, t: 'سجّل دخول بحساب Google', d: 'ثانية واحدة، بدون كلمة مرور.' },
  { n: 2, t: 'تواصل معنا عبر واتساب', d: 'فريقنا يربط لك حسابات فيسبوك، إنستغرام، وواتساب خلال 10 دقائق.' },
  { n: 3, t: 'فعّل اشتراكك', d: 'احصل على كود التفعيل، أدخله، وابدأ البيع التلقائي.' },
  { n: 4, t: 'نَم بأمان', d: 'الـ AI يشتغل ويرد ويبيع وأنت بالخارج.' },
]

const USE_CASES = [
  { e: '👗', t: 'متاجر الأزياء', d: 'يجاوب على المقاسات، الألوان، الصور، ويسجّل طلب التوصيل تلقائياً.' },
  { e: '💄', t: 'العطور والتجميل', d: 'يعرّف الزبون على المنتجات، يقترح بدائل، ويُتمّ البيع.' },
  { e: '📱', t: 'الإلكترونيات', d: 'يقارن المواصفات، يجاوب أسئلة تقنية، ويحجز الجهاز.' },
  { e: '🍰', t: 'الحلويات والمأكولات', d: 'يستقبل الطلبات، يحسب الإجمالي، ويأخذ بيانات التوصيل.' },
  { e: '💍', t: 'الإكسسوارات', d: 'يعرض الموديلات، الأسعار، ويتعامل مع الجملة والمفرد.' },
  { e: '🏪', t: 'أي متجر يستقبل DM', d: 'لو عندك صفحة FB أو IG وتستقبل رسائل — AutoFlow يناسبك.' },
]

const COMPARE = [
  { f: 'الرد على الرسائل', before: 'يدوي · ساعات ضائعة', after: 'تلقائي · فوري 24/7' },
  { f: 'فقدان طلبات', before: 'كثير (رسائل ضائعة)', after: 'لا · كل رسالة تُلتقط' },
  { f: 'المنصات', before: '4 تطبيقات منفصلة', after: 'صندوق وارد واحد' },
  { f: 'تسجيل الطلبات', before: 'ورقة وقلم أو Excel', after: 'تلقائي عند التأكيد' },
  { f: 'وقت العمل', before: '12 ساعة على الأقل', after: '٢٤ ساعة بدون توقف' },
  { f: 'تحليل الأداء', before: 'لا يوجد', after: 'تقارير حية ذكية' },
]

const TESTIMONIALS = [
  { n: 'أحمد العبد الله', r: 'متجر عطور — عمّان', t: 'الـ AI ردّ على 47 رسالة ليلة وحدة وأنا نايم. صحيت لقيت 12 طلب جديد. حرفياً غيّر حياتي.', a: 'أ' },
  { n: 'سارة الحوراني', r: 'متجر ملابس — إربد', t: 'كنت أصرف 5 ساعات يومياً أرد على رسائل. هلأ AutoFlow يردّ عني وأنا بركّز على التصميمات.', a: 'س' },
  { n: 'محمد القاضي', r: 'إكسسوارات — الزرقاء', t: 'ما توقعت ذكي بهالشكل. يفهم اللهجة الأردنية ويتعامل مع الزبون كأنه إنسان فعلاً.', a: 'م' },
]

const FAQ = [
  { q: 'هل أحتاج خبرة تقنية لاستخدام المنصة؟', a: 'لا أبداً. فريقنا يربط لك كل شي في أقل من 10 دقائق، وأنت تستخدم لوحة بسيطة بالعربية.' },
  { q: 'هل المنصة تدعم اللغة العربية بكل اللهجات؟', a: 'نعم. الـ AI يرد بنفس لهجة الزبون (أردنية، خليجية، مصرية، فصحى) ويميّز سياق المحادثة.' },
  { q: 'كم سعر الاشتراك؟', a: 'الخطة الشهرية 25 دينار أردني، تشمل كل المميزات بدون قيود.' },
  { q: 'هل بياناتي آمنة؟', a: 'نعم. كل متجر منفصل تماماً، والمحادثات مشفّرة، والمنصة مبنية على Supabase الأمنية.' },
]

/* =========================================================
   TAB SECTIONS
   ========================================================= */

function HomeTab() {
  return (
    <>
      <section className="hero">
        <div className="lp-container hero-grid">
          <div className="hero-text">
            <Reveal>
              <span className="hero-badge">
                <span className="dot-pulse" />
                منصة عربية بالكامل · مدعومة بـ AI
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="hero-title">
                متجرك يبيع <span className="grad">حتى وأنت نائم</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="hero-sub">
                AutoFlow Chat هو موظف المبيعات الذكي اللي يرد على كل رسالة من زبائنك تلقائياً،
                يجمع البيانات، يؤكّد الطلب، ويسجّله في لوحة التحكم — على فيسبوك، إنستغرام، واتساب، وتلغرام دفعة وحدة.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="hero-cta">
                <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={loginGoogle}>
                  ابدأ الآن مجاناً ←
                </button>
                <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="lp-btn lp-btn-ghost lp-btn-lg">
                  تواصل واتساب
                </a>
              </div>
            </Reveal>
            <Reveal delay={400}>
              <div className="hero-trust">
                <span>✓ بدون بطاقة دفع</span>
                <span>✓ ربط خلال 10 دقائق</span>
                <span>✓ دعم عربي مباشر</span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={150} className="hero-visual">
            <div className="hero-logo-wrap">
              <div className="hero-logo-ring" />
              <img src={logoImg} alt="AutoFlow Chat" className="hero-logo-img" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Platforms strip */}
      <section className="platforms-strip">
        <div className="lp-container">
          <Reveal><div className="platforms-label">يعمل مع كل المنصات اللي تستخدمها</div></Reveal>
          <Reveal delay={100}>
            <div className="platforms-row">
              <div className="plat-pill"><span className="plat-ico fb">f</span> فيسبوك</div>
              <div className="plat-pill"><span className="plat-ico ig">📷</span> إنستغرام</div>
              <div className="plat-pill"><span className="plat-ico wa">💬</span> واتساب</div>
              <div className="plat-pill"><span className="plat-ico tg">✈</span> تلغرام</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Quick stats */}
      <section className="stats-strip">
        <div className="lp-container stats-grid">
          <Reveal delay={0}><div className="stat"><div className="stat-n">4</div><div className="stat-l">منصات مدعومة</div></div></Reveal>
          <Reveal delay={80}><div className="stat"><div className="stat-n">24/7</div><div className="stat-l">رد فوري</div></div></Reveal>
          <Reveal delay={160}><div className="stat"><div className="stat-n">10د</div><div className="stat-l">للربط الكامل</div></div></Reveal>
          <Reveal delay={240}><div className="stat"><div className="stat-n">+90%</div><div className="stat-l">رضا الزبائن</div></div></Reveal>
        </div>
      </section>
    </>
  )
}

function ProductTab() {
  return (
    <>
      <section className="problems">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow pain">المشاكل اللي بتواجهك</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">هل هذي مشاكل تعرفها؟</h2></Reveal>
          <Reveal delay={120}><p className="section-sub">كل تاجر يبيع أونلاين يعاني من هذي الأمور كل يوم — AutoFlow يحلّها لك من جذورها.</p></Reveal>
          <div className="problems-grid">
            {PROBLEMS.map((p, i) => (
              <Reveal key={i} delay={i * 60} className="problem-card">
                <div className="problem-ico">{p.i}</div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">المميزات</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">كل اللي تحتاجه لإدارة متجرك في مكان واحد</h2></Reveal>
          <Reveal delay={120}><p className="section-sub">من استقبال أول رسالة لحدّ تسجيل الطلب — AutoFlow Chat يتولّى كل شي.</p></Reveal>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 70} className="feature-card">
                <div className="feature-ico">{f.i}</div>
                <h3 className="feature-t">{f.t}</h3>
                <p className="feature-d">{f.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function HowTab() {
  return (
    <>
      <section className="how">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">كيف يعمل</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">4 خطوات وبتصير تبيع تلقائياً</h2></Reveal>

          <div className="steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100} className="step">
                <div className="step-n">{s.n}</div>
                <div className="step-c">
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="use-cases">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">لمن يناسب؟</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">أي متجر يستفيد من AutoFlow</h2></Reveal>
          <Reveal delay={120}><p className="section-sub">سواء كنت تبيع عطور، ملابس، إكسسوارات، أو إلكترونيات — الـ AI يتعلم منتجاتك ويبيعها لك.</p></Reveal>
          <div className="usecases-grid">
            {USE_CASES.map((u, i) => (
              <Reveal key={i} delay={i * 60} className="usecase-card">
                <div className="usecase-emoji">{u.e}</div>
                <h3>{u.t}</h3>
                <p>{u.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function PricingTab() {
  return (
    <section className="pricing">
      <div className="lp-container">
        <Reveal><div className="section-eyebrow center">الأسعار</div></Reveal>
        <Reveal delay={60}><h2 className="section-title center">خطة واحدة بسيطة، كل المميزات</h2></Reveal>

        <Reveal delay={120} className="price-card-wrap">
          <div className="price-card">
            <div className="price-badge">الأكثر طلباً</div>
            <h3 className="price-name">الخطة الشهرية</h3>
            <div className="price-amount">
              <span className="price-num">25</span>
              <span className="price-cur">د.أ</span>
              <span className="price-per">/شهر</span>
            </div>
            <ul className="price-list">
              <li>✓ ربط فيسبوك + إنستغرام + واتساب + تلغرام</li>
              <li>✓ موظف ذكي يرد 24/7 بنفس لغة العميل</li>
              <li>✓ صندوق وارد موحّد + تحويل الطلبات تلقائياً</li>
              <li>✓ تقارير وتحليلات متقدمة</li>
              <li>✓ مولّد بوستات احترافي بـ AI</li>
              <li>✓ ربط حساباتك خلال 10 دقائق</li>
              <li>✓ دعم فني عبر واتساب</li>
            </ul>
            <button className="lp-btn lp-btn-primary lp-btn-lg lp-w-full" onClick={loginGoogle}>
              ابدأ الآن ←
            </button>
            <p className="price-note">ألغِ متى ما أردت · بدون التزامات</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function ReviewsTab() {
  return (
    <>
      <section className="compare">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">قبل / بعد</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">شو الفرق مع AutoFlow؟</h2></Reveal>

          <Reveal delay={120}>
            <div className="compare-table">
              <div className="ct-head">
                <div className="ct-cell ct-feature">المهمة</div>
                <div className="ct-cell ct-bad">بدون AutoFlow</div>
                <div className="ct-cell ct-good">مع AutoFlow</div>
              </div>
              {COMPARE.map((c, i) => (
                <div key={i} className="ct-row">
                  <div className="ct-cell ct-feature">{c.f}</div>
                  <div className="ct-cell ct-bad">✕ {c.before}</div>
                  <div className="ct-cell ct-good">✓ {c.after}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="testimonials">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">آراء العملاء</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">تجارب حقيقية من تجار حقيقيين</h2></Reveal>
          <div className="testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 80} className="testi-card">
                <div className="testi-quote">"</div>
                <p className="testi-text">{t.t}</p>
                <div className="testi-foot">
                  <div className="testi-avatar">{t.a}</div>
                  <div>
                    <div className="testi-name">{t.n}</div>
                    <div className="testi-role">{t.r}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function AboutTab() {
  return (
    <>
      {/* Big prominent contact cards */}
      <section className="contact-section">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow center">تواصل معنا</div></Reveal>
          <Reveal delay={60}><h2 className="section-title center">نحن هنا لمساعدتك خلال دقائق</h2></Reveal>
          <Reveal delay={120}><p className="section-sub center">اختر القناة الأنسب لك. فريقنا يردّ عادةً خلال 30 دقيقة من 9 صباحاً حتى 11 مساءً (بتوقيت الأردن).</p></Reveal>

          <div className="contact-grid">
            <Reveal delay={0}>
              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="contact-card wa">
                <div className="contact-ico" style={{background:'#25D366'}}>
                  <svg viewBox="0 0 32 32" width="34" height="34" fill="#fff"><path d="M16 .4a15.6 15.6 0 0 0-13.3 23.7L.4 31.6l7.7-2.2A15.6 15.6 0 1 0 16 .4Zm0 28.5a12.8 12.8 0 0 1-6.6-1.8l-.5-.3-4.6 1.3 1.3-4.4-.3-.5a12.9 12.9 0 1 1 10.7 5.7Zm7.3-9.7c-.4-.2-2.4-1.2-2.7-1.3-.4-.1-.7-.2-1 .2-.3.4-1.1 1.3-1.4 1.6-.2.3-.5.3-.9.1a10.5 10.5 0 0 1-5.2-4.5c-.4-.7.4-.6 1.1-2 .1-.3 0-.5 0-.7 0-.2-.9-2.2-1.3-3-.3-.8-.7-.7-1-.7h-.8c-.3 0-.8.1-1.2.6-.4.5-1.6 1.6-1.6 3.8 0 2.3 1.6 4.5 1.9 4.8.2.3 3.3 5 8 7 3 .8 4.2.9 5.7.7.9-.1 2.4-1 2.7-2 .4-1 .4-1.8.3-2 0-.1-.4-.3-.8-.5Z"/></svg>
                </div>
                <h3>واتساب</h3>
                <div className="contact-detail" dir="ltr">+962 7 7074 8793</div>
                <p>أسرع وأبسط طريقة للتواصل. رد فوري خلال دقائق.</p>
                <span className="contact-action" style={{background:'#25D366'}}>افتح محادثة</span>
              </a>
            </Reveal>

            <Reveal delay={100}>
              <a href={FACEBOOK_LINK} target="_blank" rel="noreferrer" className="contact-card fb">
                <div className="contact-ico" style={{background:'#1877F2'}}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="#fff"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.02 10.13 11.93v-8.43H7.08v-3.5h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.23 2.69.23v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.5h-2.8V24C19.61 23.09 24 18.1 24 12.07Z"/></svg>
                </div>
                <h3>فيسبوك</h3>
                <div className="contact-detail">صفحتنا الرسمية</div>
                <p>تابع آخر الأخبار، التحديثات، وأفكار التسويق على فيسبوك.</p>
                <span className="contact-action" style={{background:'#1877F2'}}>زيارة الصفحة</span>
              </a>
            </Reveal>

            <Reveal delay={200}>
              <a href={INSTAGRAM_LINK} target="_blank" rel="noreferrer" className="contact-card ig">
                <div className="contact-ico" style={{background:'linear-gradient(135deg,#E4405F,#C13584,#F5A623)'}}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="#fff"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07ZM12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.55a5.88 5.88 0 0 0-2.13 1.39A5.88 5.88 0 0 0 .62 4.14C.33 4.9.13 5.77.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.55 2.91a5.88 5.88 0 0 0 1.39 2.13 5.88 5.88 0 0 0 2.13 1.39c.76.29 1.63.49 2.91.55C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.55a5.88 5.88 0 0 0 2.13-1.39 5.88 5.88 0 0 0 1.39-2.13c.29-.76.49-1.63.55-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.55-2.91a5.88 5.88 0 0 0-1.39-2.13A5.88 5.88 0 0 0 19.86.62C19.1.33 18.23.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z"/></svg>
                </div>
                <h3>إنستغرام</h3>
                <div className="contact-detail" dir="ltr">@auto_flowran</div>
                <p>شاهد لقطات من المنصة، شهادات العملاء، ومحتوى تعليمي يومي.</p>
                <span className="contact-action" style={{background:'linear-gradient(135deg,#E4405F,#C13584)'}}>متابعة الحساب</span>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* About / Mission */}
      <section className="about">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">من نحن</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">فريق متخصّص في أتمتة المبيعات للتجار العرب</h2></Reveal>
          <Reveal delay={120}>
            <p className="section-sub" style={{maxWidth:820}}>
              AutoFlow Chat منصة مبنية على تقنيات الذكاء الاصطناعي الحديثة لتمكين أصحاب المتاجر الإلكترونية
              من إدارة محادثات زبائنهم وتحويلها إلى مبيعات بشكل تلقائي وآمن. نؤمن أن التاجر يستحق أداة قوية تحرّر وقته
              وتنمّي دخله بدون تعقيد تقني.
            </p>
          </Reveal>

          <div className="values-grid">
            <Reveal delay={0} className="value-card">
              <div className="value-ico">🎯</div>
              <h3>مهمتنا</h3>
              <p>تمكين كل تاجر صغير ومتوسط في الوطن العربي من امتلاك موظف مبيعات ذكي بتكلفة معقولة، وبدون أي خبرة تقنية.</p>
            </Reveal>
            <Reveal delay={100} className="value-card">
              <div className="value-ico">👁</div>
              <h3>رؤيتنا</h3>
              <p>أن نصبح المنصة الأولى عربياً لأتمتة خدمة العملاء والمبيعات على وسائل التواصل الاجتماعي.</p>
            </Reveal>
            <Reveal delay={200} className="value-card">
              <div className="value-ico">⚡</div>
              <h3>قيمنا</h3>
              <p>السرعة في الدعم، الوضوح في التعامل، خصوصية البيانات، وتطوير مستمر يخدم تجربتك.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">أسئلة شائعة</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">إجابات على الأسئلة المتكررة</h2></Reveal>

          <div className="faq-list">
            {FAQ.map((f, i) => (
              <Reveal key={i} delay={i * 60}>
                <details className="faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="contact-cta">
        <div className="lp-container">
          <Reveal>
            <div className="cta-box">
              <h2>جاهز تبدأ؟</h2>
              <p>سجّل دخول بثانية وفريقنا يربط لك كل شي خلال 10 دقائق.</p>
              <div className="cta-actions">
                <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={loginGoogle}>
                  ابدأ الآن مجاناً ←
                </button>
                <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="lp-btn lp-btn-ghost lp-btn-lg">
                  تواصل واتساب
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}

const TAB_COMPONENTS = {
  home: HomeTab,
  product: ProductTab,
  how: HowTab,
  pricing: PricingTab,
  reviews: ReviewsTab,
  about: AboutTab,
}

export default function Landing() {
  const [active, setActive] = useState('home')
  const ActiveTab = TAB_COMPONENTS[active] || HomeTab

  // The app's global CSS sets html/body/#root to overflow:hidden for the
  // in-app dashboard layout. The landing needs to scroll, so we toggle a
  // class on mount and clear it on unmount.
  useEffect(() => {
    document.documentElement.classList.add('landing-mode')
    document.body.classList.add('landing-mode')
    const root = document.getElementById('root')
    if (root) root.classList.add('landing-mode')
    return () => {
      document.documentElement.classList.remove('landing-mode')
      document.body.classList.remove('landing-mode')
      if (root) root.classList.remove('landing-mode')
    }
  }, [])

  useEffect(() => {
    // Scroll to top when tab changes for a clean section reveal.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [active])

  return (
    <div className="landing">
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <div className="lp-brand">
            <img src={logoImg} alt="AutoFlow Chat" className="lp-brand-logo" />
            <span className="lp-brand-text">AutoFlow Chat</span>
          </div>

          <nav className="lp-tabs" role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`lp-tab ${active === t.id ? 'active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <button className="lp-btn lp-btn-primary" onClick={loginGoogle}>
            تسجيل الدخول
          </button>
        </div>
      </header>

      <main className="lp-main" key={active}>
        <ActiveTab />
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-brand">
            <img src={logoImg} alt="AutoFlow Chat" className="lp-brand-logo sm" />
            <span className="lp-brand-text">AutoFlow Chat</span>
          </div>
          <div className="lp-footer-text">© 2026 AutoFlow Chat · صُنع في 🇯🇴 الأردن</div>
          <div className="lp-footer-links">
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">واتساب</a>
            <a href={FACEBOOK_LINK} target="_blank" rel="noreferrer">فيسبوك</a>
            <a href={INSTAGRAM_LINK} target="_blank" rel="noreferrer">إنستغرام</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
