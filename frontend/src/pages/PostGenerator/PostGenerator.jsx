import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Upload, Download, Copy, RefreshCcw, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeProductImage, fileToBase64 } from '../../utils/analyzeProduct'
import { generatePostText } from '../../utils/generateText'
import { generatePostImage } from '../../utils/generateImage'

export default function PostGenerator() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [theme, setTheme] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  // Input states
  const [imageFile, setImageFile] = useState(null)
  const [imageBase64, setImageBase64] = useState('')
  const [productData, setProductData] = useState({
    name: '', price: '', originalPrice: '', description: '', features: []
  })
  const [postSettings, setPostSettings] = useState({
    platform: 'Instagram', tone: 'exciting', hashtagCount: 5,
    includeHook: true, includeDescription: true, includePrice: true,
    includeScarcity: false, includeSocialProof: false, includeQuestion: true,
    includeCTA: true, includeEmoji: true
  })
  
  // Output states
  const [generatedImageUrl, setGeneratedImageUrl] = useState('')
  const [generatedText, setGeneratedText] = useState('')
  const [generatedHashtags, setGeneratedHashtags] = useState([])
  const [activeTab, setActiveTab] = useState('image')

  useEffect(() => {
    async function loadTheme() {
      try {
        const themes = await window.api?.db.getBrandThemes()
        if (themes && themes.length > 0) {
          setTheme(themes[0])
        } else {
          toast('يرجى إعداد الهوية البصرية أولاً', { icon: '⚠️' })
          navigate('/post-generator/setup')
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadTheme()
  }, [navigate])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setImageFile(file)
    setLoading(true)
    
    try {
      const base64 = await fileToBase64(file)
      setImageBase64(base64)
      
      const analysis = await analyzeProductImage(base64)
      setProductData(prev => ({
        ...prev,
        name: analysis.name || prev.name,
        description: analysis.description || prev.description,
        features: analysis.features || prev.features
      }))
      toast.success('تم تحليل الصورة بنجاح')
    } catch (error) {
      toast.error('فشل تحليل الصورة، يمكنك إدخال البيانات يدوياً')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!imageBase64 && !productData.name) {
      return toast.error('يرجى رفع صورة المنتج أو إدخال اسمه على الأقل')
    }
    if (!productData.price) {
      return toast.error('يرجى إدخال السعر لتوليد صورة صحيحة')
    }
    
    setGenerating(true)
    try {
      toast.success('جاري تخيل ورسم المشهد بالذكاء الاصطناعي (قد يستغرق بعض الوقت)...', { icon: '🎨' })
      
      // 1. Generate AI Background
      const prompt = `Professional product photography of: ${productData.name || 'a product'}, ${productData.description || ''}. Beautiful, highly detailed, realistic. Studio lighting. Set in a premium environment matching the brand colors: ${theme.primary_color} and ${theme.secondary_color}. Do NOT include any text, letters, or numbers in the image.`
      
      let aiImageUrl = imageBase64
      let isAiBackground = false

      const aiRes = await window.api?.ai.generateImage(prompt)
      if (aiRes?.success && aiRes.url) {
        aiImageUrl = aiRes.url
        isAiBackground = true
      } else {
        console.warn('AI Image Generation Failed:', aiRes?.error)
        toast.error('فشل توليد صورة الذكاء الاصطناعي، سيتم استخدام التصميم البسيط')
      }

      // 2. Composite Image (Add Logo, Price, Frame)
      const imgUrl = await generatePostImage(aiImageUrl, theme, productData, isAiBackground)
      setGeneratedImageUrl(imgUrl)
      // Generate Text
      const textResult = await generatePostText(productData, theme, postSettings)
      setGeneratedText(textResult.postText)
      setGeneratedHashtags(textResult.hashtags)
      
      // Save to DB
      await window.api?.db.saveGeneratedPost({
        brand_theme_id: theme.id,
        product_name: productData.name,
        product_price: productData.price,
        product_original_price: productData.originalPrice,
        product_description: productData.description,
        product_image_url: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : '',
        generated_image_url: imgUrl,
        post_text: textResult.postText + '\n\n' + textResult.hashtags.map(h => `#${h.replace('#','')}`).join(' '),
        hashtags: textResult.hashtags,
        platform: postSettings.platform,
        tone: postSettings.tone
      })
      
      toast.success('تم توليد البوست بنجاح!')
    } catch (e) {
      console.error(e)
      toast.error('حدث خطأ أثناء توليد البوست')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyText = () => {
    const fullText = generatedText + '\n\n' + generatedHashtags.map(h => `#${h.replace('#','')}`).join(' ')
    navigator.clipboard.writeText(fullText)
    toast.success('تم نسخ نص البوست')
  }

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return
    const a = document.createElement('a')
    a.href = generatedImageUrl
    a.download = `${productData.name || 'product'}-post.png`
    a.click()
  }

  return (
    <div className="pg-create animate-fade">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>توليد بوست جديد <Sparkles className="inline-icon" size={24} color="var(--accent)" /></h1>
          <p>أدخل بيانات المنتج أو ارفع صورته، وسيتكفل الذكاء الاصطناعي بالباقي</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/post-generator')}>
          <ArrowRight size={18} /> رجوع
        </button>
      </div>

      <div className="pg-create-layout">
        {/* --- Left Column: Inputs --- */}
        <div className="pg-inputs-col">
          {/* Step 1: Image */}
          <div className="card">
            <h3 className="card-title">1. صورة المنتج</h3>
            <div className="logo-upload-zone" onClick={() => fileInputRef.current?.click()} style={{ padding: '20px' }}>
              {imageBase64 ? (
                <div className="uploaded-logo-preview">
                  <img src={"data:image/jpeg;base64," + imageBase64} alt="Product" style={{maxHeight: '100px'}} />
                  <span className="text-sm text-accent">اضغط لتغيير الصورة</span>
                </div>
              ) : (
                <div className="upload-btn">
                  {loading ? <RefreshCcw size={24} className="animate-spin text-accent" /> : <Upload size={24} />}
                  <span>{loading ? 'جاري تحليل الصورة...' : 'انقر لرفع صورة المنتج (سيتم تحليلها بالذكاء الاصطناعي)'}</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            </div>
          </div>

          {/* Step 2: Product Data */}
          <div className="card">
            <h3 className="card-title">2. تفاصيل المنتج</h3>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">اسم المنتج</label>
                <input type="text" className="input" value={productData.name} onChange={e => setProductData({...productData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">السعر الحالي</label>
                <input type="text" className="input" value={productData.price} onChange={e => setProductData({...productData, price: e.target.value})} placeholder="مثال: 50,000 دينار" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">الوصف (مختصر)</label>
              <textarea className="textarea" style={{minHeight: '60px'}} value={productData.description} onChange={e => setProductData({...productData, description: e.target.value})}></textarea>
            </div>
          </div>

          {/* Step 3: Post Settings */}
          <div className="card">
            <h3 className="card-title">3. إعدادات البوست</h3>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">المنصة المستهدفة</label>
                <select className="select" value={postSettings.platform} onChange={e => setPostSettings({...postSettings, platform: e.target.value})}>
                  <option value="Instagram">انستقرام</option>
                  <option value="Facebook">فيسبوك</option>
                  <option value="TikTok">تيك توك</option>
                  <option value="Twitter">تويتر (X)</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">النبرة التسويقية</label>
                <select className="select" value={postSettings.tone} onChange={e => setPostSettings({...postSettings, tone: e.target.value})}>
                  <option value="exciting">حماسي (جذب الانتباه)</option>
                  <option value="elegant">راقي وفخم</option>
                  <option value="friendly">ودي وقريب</option>
                  <option value="urgent">عاجل (عرض محدود)</option>
                </select>
              </div>
            </div>
            
            <div className="input-group mt-2">
              <label className="input-label">عناصر النص المراد تضمينها</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={postSettings.includeHook} onChange={e => setPostSettings({...postSettings, includeHook: e.target.checked})} /> جملة جذب (Hook)
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={postSettings.includeDescription} onChange={e => setPostSettings({...postSettings, includeDescription: e.target.checked})} /> وصف مقنع
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={postSettings.includePrice} onChange={e => setPostSettings({...postSettings, includePrice: e.target.checked})} /> السعر
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={postSettings.includeScarcity} onChange={e => setPostSettings({...postSettings, includeScarcity: e.target.checked})} /> عبارة ندرة
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={postSettings.includeQuestion} onChange={e => setPostSettings({...postSettings, includeQuestion: e.target.checked})} /> سؤال تفاعلي
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={postSettings.includeCTA} onChange={e => setPostSettings({...postSettings, includeCTA: e.target.checked})} /> رابط تواصل
                </label>
              </div>
            </div>
          </div>

          <button className="btn btn-primary w-full" style={{padding: '16px', fontSize: '16px'}} onClick={handleGenerate} disabled={generating || loading}>
            {generating ? <RefreshCcw className="animate-spin" size={20} /> : <Sparkles size={20} />}
            {generating ? 'جاري التصميم وكتابة المحتوى...' : 'توليد البوست الآن'}
          </button>
        </div>

        {/* --- Right Column: Preview --- */}
        <div className="pg-preview-col card relative">
          {generating && (
            <div className="pg-overlay-loading rounded-xl z-20">
              <RefreshCcw className="animate-spin" size={48} color="var(--accent)" />
              <h3 className="mt-4">الذكاء الاصطناعي يعمل...</h3>
              <p className="text-muted">جاري تصميم الصورة وكتابة المحتوى</p>
            </div>
          )}
          
          <div className="tabs w-full">
            <button className={"tab flex-1 " + (activeTab === 'image' ? 'active' : '')} onClick={() => setActiveTab('image')}>
              التصميم
            </button>
            <button className={"tab flex-1 " + (activeTab === 'text' ? 'active' : '')} onClick={() => setActiveTab('text')}>
              النص المكتوب
            </button>
          </div>

          {activeTab === 'image' && (
            <div className="flex-col h-full items-center justify-center">
              {generatedImageUrl ? (
                <>
                  <div className="pg-preview-canvas animate-fade">
                    <img src={generatedImageUrl} alt="Generated Post" />
                  </div>
                  <button className="btn btn-success mt-4 w-full" onClick={handleDownloadImage}>
                    <Download size={18} /> حفظ الصورة
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <Sparkles size={48} className="icon" />
                  <p>الصورة المولّدة ستظهر هنا</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="flex-col h-full flex-1">
              {generatedText ? (
                <>
                  <textarea 
                    className="pg-post-text-preview animate-fade" 
                    value={generatedText + '\n\n' + generatedHashtags.map(h => `#${h.replace('#','')}`).join(' ')}
                    onChange={(e) => setGeneratedText(e.target.value)}
                  />
                  <button className="btn btn-primary mt-4 w-full" onClick={handleCopyText}>
                    <Copy size={18} /> نسخ النص بالكامل
                  </button>
                </>
              ) : (
                <div className="empty-state flex-1">
                  <Sparkles size={48} className="icon" />
                  <p>النص المولّد سيظهر هنا</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
