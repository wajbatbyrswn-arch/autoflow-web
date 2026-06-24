import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
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

function Reveal({ children, delay = 0, as = 'div', className = '', style = {} }) {
  const [ref, shown] = useReveal()
  const Tag = as
  return (
    <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  )
}

const FEATURES = [
  { i: '🤖', t: 'موظف مبيعات ذكي', d: 'يرد على زبائنك تلقائياً 24/7 بنفس لغتهم، يعرف منتجاتك، أسعارك، ويُتمّ الطلب لحدّ ما يحطّك العنوان والرقم.' },
  { i: '💬', t: 'صندوق وارد موحّد', d: 'كل رسائل فيسبوك، إنستغرام، واتساب، وتلغرام في مكان واحد. ما عاد عندك تنقل بين الحسابات.' },
  { i: '🛒', t: 'تحويل المحادثة إلى طلب', d: 'لحظة ما الزبون يقول "أكّد"، الطلب يتسجّل تلقائياً في لوحة الطلبات بكامل بياناته.' },
  { i: '📊', t: 'تحليلات وتقارير ذكية', d: 'إيرادات، متوسط الطلب، أوقات الذروة، توزيع المنصات — كل شي قدامك بـ realtime.' },
  { i: '✨', t: 'مولّد بوستات AI', d: 'اطلب من الـ AI ينشأ لك بوستات احترافية بصور ومحتوى مناسب لمتجرك.' },
  { i: '🔒', t: 'فصل كامل لكل متجر', d: 'بيانات متجرك معزولة تماماً. لا أحد يقدر يشوف محادثاتك أو زبائنك.' },
]

const STEPS = [
  { n: 1, t: 'سجّل دخول بحساب Google', d: 'ثانية واحدة، بدون كلمة مرور.' },
  { n: 2, t: 'تواصل معنا عبر واتساب', d: 'فريقنا يربط لك حسابات فيسبوك، إنستغرام، وواتساب خلال 10 دقائق.' },
  { n: 3, t: 'فعّل اشتراكك', d: 'احصل على كود التفعيل، أدخله، وابدأ البيع التلقائي.' },
  { n: 4, t: 'نَم بأمان', d: 'الـ AI يشتغل ويرد ويبيع وأنت بالخارج.' },
]

const FAQ = [
  { q: 'هل أحتاج خبرة تقنية لاستخدام المنصة؟', a: 'لا أبداً. فريقنا يربط لك كل شي في أقل من 10 دقائق، وأنت تستخدم لوحة بسيطة بالعربية.' },
  { q: 'هل المنصة تدعم اللغة العربية بكل اللهجات؟', a: 'نعم. الـ AI يرد بنفس لهجة الزبون (أردنية، خليجية، مصرية، فصحى) ويميّز سياق المحادثة.' },
  { q: 'كم سعر الاشتراك؟', a: 'الخطة الشهرية 25 دينار أردني، تشمل كل المميزات بدون قيود.' },
  { q: 'هل بياناتي آمنة؟', a: 'نعم. كل متجر منفصل تماماً، والمحادثات مشفّرة، والمنصة مبنية على Supabase الأمنية.' },
]

export default function Landing() {
  const [yearScroll, setYearScroll] = useState(0)
  useEffect(() => {
    const onScroll = () => setYearScroll(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing">
      {/* Animated background */}
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Header */}
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <div className="lp-brand">
            <div className="lp-brand-mark">A</div>
            <span className="lp-brand-text">AutoFlow</span>
          </div>
          <nav className="lp-nav">
            <a href="#features">المميزات</a>
            <a href="#how">كيف يعمل</a>
            <a href="#pricing">الأسعار</a>
            <a href="#contact">تواصل</a>
          </nav>
          <button className="lp-btn lp-btn-primary" onClick={loginGoogle}>
            تسجيل الدخول
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="lp-container">
          <Reveal>
            <span className="hero-badge">
              <span className="dot-pulse" />
              منصة عربية بالكامل · مدعومة بـ AI
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="hero-title">
              متجرك يبيع <span className="grad">حتى وأنت نائم</span>
              <br/>بفضل الذكاء الاصطناعي
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="hero-sub">
              AutoFlow هو موظف المبيعات الذكي اللي يرد على كل رسالة من زبائنك تلقائياً، يجمع البيانات، يؤكّد الطلب،
              ويسجّله في لوحة التحكم — على فيسبوك، إنستغرام، واتساب، وتلغرام دفعة وحدة.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="hero-cta">
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={loginGoogle}>
                ابدأ الآن مجاناً ←
              </button>
              <a href="#features" className="lp-btn lp-btn-ghost lp-btn-lg">شاهد المميزات</a>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="hero-trust">
              <span>✓ بدون بطاقة دفع</span>
              <span>✓ ربط خلال 10 دقائق</span>
              <span>✓ دعم عربي مباشر</span>
            </div>
          </Reveal>

          {/* Floating mock dashboard */}
          <Reveal delay={500}>
            <div className="hero-mock" style={{ transform: `translateY(${yearScroll * -0.04}px)` }}>
              <div className="mock-window">
                <div className="mock-bar">
                  <span className="mock-dot red"></span>
                  <span className="mock-dot yellow"></span>
                  <span className="mock-dot green"></span>
                  <span className="mock-url">autoflowchat.shop/dashboard</span>
                </div>
                <div className="mock-body">
                  <div className="mock-side">
                    <div className="mock-item active">📊 لوحة التحكم</div>
                    <div className="mock-item">💬 المحادثات <span className="mock-badge">12</span></div>
                    <div className="mock-item">🛒 الطلبات <span className="mock-badge">5</span></div>
                    <div className="mock-item">📈 التقارير</div>
                  </div>
                  <div className="mock-content">
                    <div className="mock-stats">
                      <div className="mock-stat">
                        <div className="mock-stat-l">إيرادات اليوم</div>
                        <div className="mock-stat-v">٢٤٠ د.أ</div>
                        <div className="mock-stat-up">↑ ١٢٪</div>
                      </div>
                      <div className="mock-stat">
                        <div className="mock-stat-l">طلبات جديدة</div>
                        <div className="mock-stat-v">١٨</div>
                        <div className="mock-stat-up">↑ ٨٪</div>
                      </div>
                      <div className="mock-stat">
                        <div className="mock-stat-l">رسائل اليوم</div>
                        <div className="mock-stat-v">١٢٣</div>
                        <div className="mock-stat-up">↑ ٢٢٪</div>
                      </div>
                    </div>
                    <div className="mock-chat">
                      <div className="mock-msg in">مرحبا، بدي معلومات عن العطر</div>
                      <div className="mock-msg out">أهلاً! عندنا عدة أنواع، حضرتك بتفضل عطر شرقي أو غربي؟ 🌹</div>
                      <div className="mock-msg in">شرقي</div>
                      <div className="mock-msg out">رائع! اخترنا لحضرتك "عبير العود" بـ ٣٥ دينار. بدك تأكيد الطلب؟ ✨</div>
                      <div className="mock-typing"><span></span><span></span><span></span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-strip">
        <div className="lp-container stats-grid">
          <Reveal delay={0}><div className="stat"><div className="stat-n">٤</div><div className="stat-l">منصات مدعومة</div></div></Reveal>
          <Reveal delay={80}><div className="stat"><div className="stat-n">٢٤/٧</div><div className="stat-l">رد فوري</div></div></Reveal>
          <Reveal delay={160}><div className="stat"><div className="stat-n">١٠د</div><div className="stat-l">للربط الكامل</div></div></Reveal>
          <Reveal delay={240}><div className="stat"><div className="stat-n">+٩٠٪</div><div className="stat-l">رضا الزبائن</div></div></Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">المميزات</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">كل اللي تحتاجه لإدارة متجرك في مكان واحد</h2></Reveal>
          <Reveal delay={120}><p className="section-sub">من استقبال أول رسالة لحدّ تسجيل الطلب — AutoFlow يتولّى كل شي.</p></Reveal>

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

      {/* How it works */}
      <section id="how" className="how">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">كيف يعمل</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">٤ خطوات وبتصير تبيع تلقائياً</h2></Reveal>

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

      {/* Pricing */}
      <section id="pricing" className="pricing">
        <div className="lp-container">
          <Reveal><div className="section-eyebrow">الأسعار</div></Reveal>
          <Reveal delay={60}><h2 className="section-title">خطة واحدة بسيطة، كل المميزات</h2></Reveal>

          <Reveal delay={120} className="price-card-wrap">
            <div className="price-card">
              <div className="price-badge">الأكثر طلباً</div>
              <h3 className="price-name">الخطة الشهرية</h3>
              <div className="price-amount">
                <span className="price-num">٢٥</span>
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

      {/* About */}
      <section id="about" className="about">
        <div className="lp-container about-grid">
          <Reveal>
            <div className="about-text">
              <div className="section-eyebrow">من نحن</div>
              <h2 className="section-title">فريق أردني يبني أدوات تخدم التجار العرب</h2>
              <p className="section-sub">
                AutoFlow أُسس بهدف واحد: نوفّر للتاجر الصغير والمتوسط أداة قوية كان يستحيل بناءها لوحده.
                نحن لا نبيع برنامج — نبيع راحة بال وزيادة في المبيعات وفريق صامت يشتغل عنك ٢٤ ساعة.
              </p>
              <p className="section-sub">
                مقرّنا في الأردن، وزبائننا في كل الوطن العربي. نتكلم عربي، نفهم لهجاتكم، ونعرف تحديات السوق المحلي.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="about-stats">
              <div className="about-stat"><div className="as-n">٢٠٢٦</div><div className="as-l">تأسست</div></div>
              <div className="about-stat"><div className="as-n">🇯🇴</div><div className="as-l">صناعة أردنية</div></div>
              <div className="about-stat"><div className="as-n">+٠</div><div className="as-l">سعداء بخدمتك أول</div></div>
              <div className="about-stat"><div className="as-n">∞</div><div className="as-l">تحديثات مستمرة</div></div>
            </div>
          </Reveal>
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

      {/* Contact / Final CTA */}
      <section id="contact" className="contact-cta">
        <div className="lp-container">
          <Reveal>
            <div className="cta-box">
              <h2>جاهز تبدأ؟</h2>
              <p>سجّل دخول بثانية وفريقنا يربط لك كل شي خلال ١٠ دقائق.</p>
              <div className="cta-actions">
                <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={loginGoogle}>
                  ابدأ الآن مجاناً ←
                </button>
              </div>
              <div className="cta-socials">
                <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="social wa">واتساب · +962 7 7074 8793</a>
                <a href={FACEBOOK_LINK} target="_blank" rel="noreferrer" className="social fb">فيسبوك</a>
                <a href={INSTAGRAM_LINK} target="_blank" rel="noreferrer" className="social ig">إنستغرام</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-brand">
            <div className="lp-brand-mark">A</div>
            <span className="lp-brand-text">AutoFlow</span>
          </div>
          <div className="lp-footer-text">
            © 2026 AutoFlow · صُنع في 🇯🇴 الأردن
          </div>
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
