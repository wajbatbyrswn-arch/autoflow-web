import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Palette, Image as ImageIcon, Settings as SettingsIcon, Check, ArrowRight, ArrowLeft, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useT } from '../../lib/i18n'

export default function BrandSetup() {
  const { t } = useT()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState({
    name: 'هويتي الجديدة',
    primary_color: '#6C47FF',
    secondary_color: '#FF6B6B',
    background_color: '#FFFFFF',
    text_color: '#1A1A1A',
    logo_url: '',
    font_style: 'modern',
    frame_style: 'none',
    price_position: 'top-right',
    logo_position: 'top-left',
    aspect_ratio: '1:1',
    dialect: 'formal',
    contact_link: '',
    brand_description: '',
  })

  useEffect(() => {
    // Load existing theme if any
    async function load() {
      try {
        const themes = await window.api?.db.getBrandThemes()
        if (themes && themes.length > 0) {
          setTheme(themes[0])
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const handleNext = () => setStep(s => Math.min(s + 1, 3))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  const handleSave = async () => {
    setLoading(true)
    try {
      await window.api?.db.saveBrandTheme(theme)
      toast.success(t('تم حفظ الهوية البصرية بنجاح'))
      navigate('/post-generator')
    } catch (e) {
      toast.error(t('حدث خطأ أثناء الحفظ'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setTheme({ ...theme, logo_url: ev.target.result })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="brand-setup animate-fade">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>{t('إعداد الهوية البصرية')}</h1>
          <p>{t('حدد تفاصيل علامتك التجارية لتطبيقها تلقائياً على جميع البوستات المولدّة')}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/post-generator')}>
          <ArrowRight size={18} /> {t('رجوع')}
        </button>
      </div>

      <div className="pg-wizard-header">
        <div className={`pg-wizard-step ${step >= 1 ? 'active' : ''}`}>
          <div className="pg-step-icon"><Palette size={20} /></div>
          <span>{t('الألوان')}</span>
        </div>
        <div className="pg-wizard-line"></div>
        <div className={`pg-wizard-step ${step >= 2 ? 'active' : ''}`}>
          <div className="pg-step-icon"><ImageIcon size={20} /></div>
          <span>{t('الشعار والأصول')}</span>
        </div>
        <div className="pg-wizard-line"></div>
        <div className={`pg-wizard-step ${step >= 3 ? 'active' : ''}`}>
          <div className="pg-step-icon"><SettingsIcon size={20} /></div>
          <span>{t('الإعدادات والنبرة')}</span>
        </div>
      </div>

      <div className="card pg-wizard-body mt-6">
        {step === 1 && (
          <div className="pg-step-content animate-fade">
            <h3 className="card-title">{t('اختر ألوان هويتك')}</h3>
            <div className="input-group">
              <label className="input-label">{t('اسم الهوية (للتمييز)')}</label>
              <input type="text" className="input" value={theme.name} onChange={e => setTheme({...theme, name: e.target.value})} />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">{t('اللون الرئيسي (للأزرار والسعر)')}</label>
                <div className="color-picker-wrap">
                  <input type="color" className="color-input" value={theme.primary_color} onChange={e => setTheme({...theme, primary_color: e.target.value})} />
                  <span className="color-value">{theme.primary_color}</span>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{t('اللون الثانوي')}</label>
                <div className="color-picker-wrap">
                  <input type="color" className="color-input" value={theme.secondary_color} onChange={e => setTheme({...theme, secondary_color: e.target.value})} />
                  <span className="color-value">{theme.secondary_color}</span>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{t('لون الخلفية (للبوست)')}</label>
                <div className="color-picker-wrap">
                  <input type="color" className="color-input" value={theme.background_color} onChange={e => setTheme({...theme, background_color: e.target.value})} />
                  <span className="color-value">{theme.background_color}</span>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{t('لون النصوص الأساسية')}</label>
                <div className="color-picker-wrap">
                  <input type="color" className="color-input" value={theme.text_color} onChange={e => setTheme({...theme, text_color: e.target.value})} />
                  <span className="color-value">{theme.text_color}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pg-step-content animate-fade">
            <h3 className="card-title">{t('أصول العلامة التجارية')}</h3>
            <div className="input-group">
              <label className="input-label">{t('شعار المتجر (Logo)')}</label>
              <div className="logo-upload-zone">
                {theme.logo_url ? (
                  <div className="uploaded-logo-preview">
                    <img src={theme.logo_url} alt="Logo" />
                    <button className="btn btn-danger btn-sm" onClick={() => setTheme({...theme, logo_url: ''})}>{t('إزالة')}</button>
                  </div>
                ) : (
                  <label className="upload-btn">
                    <Upload size={24} />
                    <span>{t('انقر لرفع الشعار (PNG بخلفية شفافة)')}</span>
                    <input type="file" accept="image/png, image/svg+xml" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">{t('وصف المتجر (يستخدمه الذكاء الاصطناعي لفهم نشاطك)')}</label>
              <textarea className="textarea" placeholder={t('مثال: متجر إلكتروني متخصص في بيع الساعات الذكية والإكسسوارات بأسعار تنافسية...')} value={theme.brand_description} onChange={e => setTheme({...theme, brand_description: e.target.value})}></textarea>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pg-step-content animate-fade">
            <h3 className="card-title">{t('التنسيق والنبرة التسويقية')}</h3>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">{t('موضع السعر على الصورة')}</label>
                <select className="select" value={theme.price_position} onChange={e => setTheme({...theme, price_position: e.target.value})}>
                  <option value="top-right">{t('أعلى اليمين')}</option>
                  <option value="bottom-left">{t('أسفل اليسار')}</option>
                  <option value="bottom-bar">{t('شريط سفلي عريض')}</option>
                  <option value="center">{t('وسط أسفل المنتج')}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{t('موضع الشعار')}</label>
                <select className="select" value={theme.logo_position} onChange={e => setTheme({...theme, logo_position: e.target.value})}>
                  <option value="top-left">{t('أعلى اليسار')}</option>
                  <option value="top-right">{t('أعلى اليمين')}</option>
                  <option value="bottom-center">{t('أسفل المنتصف')}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{t('أبعاد الصورة الافتراضية')}</label>
                <select className="select" value={theme.aspect_ratio} onChange={e => setTheme({...theme, aspect_ratio: e.target.value})}>
                  <option value="1:1">{t('مربع 1:1 (انستقرام/فيسبوك)')}</option>
                  <option value="4:5">{t('طولي 4:5 (انستقرام بورتريه)')}</option>
                  <option value="16:9">{t('أفقي 16:9 (يوتيوب/تويتر)')}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{t('إطار الصورة')}</label>
                <select className="select" value={theme.frame_style} onChange={e => setTheme({...theme, frame_style: e.target.value})}>
                  <option value="none">{t('بدون إطار')}</option>
                  <option value="thin">{t('إطار رفيع')}</option>
                  <option value="thick">{t('إطار سميك')}</option>
                  <option value="rounded">{t('حواف دائرية رفيعة')}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{t('لهجة النصوص الافتراضية')}</label>
                <select className="select" value={theme.dialect} onChange={e => setTheme({...theme, dialect: e.target.value})}>
                  <option value="formal">{t('لغة عربية فصحى بسيطة')}</option>
                  <option value="jordanian">{t('لهجة أردنية')}</option>
                  <option value="saudi">{t('لهجة سعودية')}</option>
                  <option value="egyptian">{t('لهجة مصرية')}</option>
                  <option value="gulf">{t('لهجة خليجية عامة')}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{t('رابط التواصل المباشر (CTA)')}</label>
                <input type="text" className="input" placeholder={t('رابط واتساب أو المتجر')} value={theme.contact_link} onChange={e => setTheme({...theme, contact_link: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        <div className="pg-wizard-footer mt-6 flex justify-between">
          <button className="btn btn-secondary" onClick={handlePrev} disabled={step === 1}>
            <ArrowRight size={18} /> {t('السابق')}
          </button>

          {step < 3 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              {t('التالي')} <ArrowLeft size={18} />
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleSave} disabled={loading}>
              <Check size={18} /> {loading ? t('جاري الحفظ...') : t('حفظ وإنهاء')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
