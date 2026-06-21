import { useNavigate } from 'react-router-dom'
import { Sparkles, Palette, Image as ImageIcon, History } from 'lucide-react'

export default function PostGeneratorHome() {
  const navigate = useNavigate()

  return (
    <div className="pg-home">
      <div className="page-header">
        <h1>مولّد البوستات الذكي <Sparkles className="inline-icon" size={24} color="var(--accent)" /></h1>
        <p>قم بإنشاء بوستات احترافية لمتجرك باستخدام الذكاء الاصطناعي بخطوات بسيطة</p>
      </div>

      <div className="grid-3 mt-4">
        <div className="card pg-action-card" onClick={() => navigate('/post-generator/setup')}>
          <div className="pg-icon-wrapper purple">
            <Palette size={32} />
          </div>
          <h3>إعداد الهوية البصرية</h3>
          <p>قم بتحديد ألوان متجرك، الخطوط، الشعار والأسلوب العام للبوستات لضمان التناسق.</p>
          <button className="btn btn-secondary mt-4 w-full">البدء في الإعداد</button>
        </div>

        <div className="card pg-action-card" onClick={() => navigate('/post-generator/create')}>
          <div className="pg-icon-wrapper teal">
            <ImageIcon size={32} />
          </div>
          <h3>توليد بوست جديد</h3>
          <p>ارفع صورة المنتج ودع الذكاء الاصطناعي يصمم لك الصورة ويكتب نصاً تسويقياً جذاباً.</p>
          <button className="btn btn-primary mt-4 w-full">توليد الآن</button>
        </div>

        <div className="card pg-action-card" onClick={() => navigate('/post-generator/history')}>
          <div className="pg-icon-wrapper gold">
            <History size={32} />
          </div>
          <h3>سجل البوستات</h3>
          <p>تصفح البوستات التي قمت بتوليدها سابقاً، وحمل الصور أو انسخ النصوص لاستخدامها.</p>
          <button className="btn btn-secondary mt-4 w-full">عرض السجل</button>
        </div>
      </div>
    </div>
  )
}
