import { useNavigate } from 'react-router-dom'
import { Sparkles, Palette, Image as ImageIcon, History } from 'lucide-react'
import { useT } from '../../lib/i18n'

export default function PostGeneratorHome() {
  const { t } = useT()
  const navigate = useNavigate()

  return (
    <div className="pg-home">
      <div className="page-header">
        <h1>{t('مولّد البوستات الذكي')} <Sparkles className="inline-icon" size={24} color="var(--accent)" /></h1>
        <p>{t('قم بإنشاء بوستات احترافية لمتجرك باستخدام الذكاء الاصطناعي بخطوات بسيطة')}</p>
      </div>

      <div className="grid-3 mt-4">
        <div className="card pg-action-card" onClick={() => navigate('/post-generator/setup')}>
          <div className="pg-icon-wrapper purple">
            <Palette size={32} />
          </div>
          <h3>{t('إعداد الهوية البصرية')}</h3>
          <p>{t('قم بتحديد ألوان متجرك، الخطوط، الشعار والأسلوب العام للبوستات لضمان التناسق.')}</p>
          <button className="btn btn-secondary mt-4 w-full">{t('البدء في الإعداد')}</button>
        </div>

        <div className="card pg-action-card" onClick={() => navigate('/post-generator/create')}>
          <div className="pg-icon-wrapper teal">
            <ImageIcon size={32} />
          </div>
          <h3>{t('توليد بوست جديد')}</h3>
          <p>{t('ارفع صورة المنتج ودع الذكاء الاصطناعي يصمم لك الصورة ويكتب نصاً تسويقياً جذاباً.')}</p>
          <button className="btn btn-primary mt-4 w-full">{t('توليد الآن')}</button>
        </div>

        <div className="card pg-action-card" onClick={() => navigate('/post-generator/history')}>
          <div className="pg-icon-wrapper gold">
            <History size={32} />
          </div>
          <h3>{t('سجل البوستات')}</h3>
          <p>{t('تصفح البوستات التي قمت بتوليدها سابقاً، وحمل الصور أو انسخ النصوص لاستخدامها.')}</p>
          <button className="btn btn-secondary mt-4 w-full">{t('عرض السجل')}</button>
        </div>
      </div>
    </div>
  )
}
