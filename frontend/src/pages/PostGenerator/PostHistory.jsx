import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Copy, Download, Trash2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useT } from '../../lib/i18n'

export default function PostHistory() {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const data = await window.api?.db.getGeneratedPosts()
      setPosts(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('هل أنت متأكد من حذف هذا البوست؟'))) return
    try {
      await window.api?.db.deleteGeneratedPost(id)
      setPosts(posts.filter(p => p.id !== id))
      toast.success(t('تم الحذف بنجاح'))
    } catch (e) {
      toast.error(t('حدث خطأ أثناء الحذف'))
    }
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
    toast.success(t('تم نسخ النص'))
  }

  const downloadImage = (url, name) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `post-${name}-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="pg-history animate-fade">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>{t('سجل البوستات السابقة')}</h1>
          <p>{t('تصفح البوستات التي قمت بتوليدها مسبقاً')}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/post-generator')}>
          <ArrowRight size={18} /> {t('رجوع')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-8"><div className="spinner"><Calendar size={32} /></div></div>
      ) : posts.length === 0 ? (
        <div className="empty-state card">
          <Calendar size={48} className="icon" />
          <p>{t('لا يوجد بوستات مولّدة حتى الآن.')}</p>
          <button className="btn btn-primary" onClick={() => navigate('/post-generator/create')}>{t('توليد أول بوست')}</button>
        </div>
      ) : (
        <div className="pg-history-grid mt-4">
          {posts.map(post => (
            <div key={post.id} className="card pg-history-item p-0 overflow-hidden relative">
              <img src={post.generated_image_url} alt="Generated" className="pg-history-img" />
              <div className="pg-history-details">
                <div className="flex justify-between items-center mb-2">
                  <span className="badge badge-info">{post.platform}</span>
                  <span className="text-xs text-muted">{new Date(post.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-SA')}</span>
                </div>
                <div className="pg-history-text">{post.post_text}</div>
                <div className="flex gap-2 mt-auto pt-4">
                  <button className="btn btn-secondary btn-sm flex-1" onClick={() => copyText(post.post_text)}>
                    <Copy size={14} /> {t('نسخ النص')}
                  </button>
                  <button className="btn btn-primary btn-sm flex-1" onClick={() => downloadImage(post.generated_image_url, post.product_name)}>
                    <Download size={14} /> {t('تحميل')}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(post.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
