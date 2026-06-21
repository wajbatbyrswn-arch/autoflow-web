import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import './AIConfig.css'

import openaiIcon from '../../assets/icons/openai.png'
import anthropicIcon from '../../assets/icons/anthropic.png'
import geminiIcon from '../../assets/icons/gemini.png'
import ollamaIcon from '../../assets/icons/ollama.png'
import globeIcon from '../../assets/icons/globe.png'

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: openaiIcon, models: [
    'gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o1-preview', 
    'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
    'gpt-4o-2024-08-06', 'gpt-4o-2024-11-20'
  ] },
  { id: 'anthropic', name: 'Anthropic', icon: anthropicIcon, models: [
    'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest',
    'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'
  ] },
  { id: 'google', name: 'Google Gemini', icon: geminiIcon, models: [
    'gemini-2.0-flash', 'gemini-2.0-flash-lite-preview-02-05', 'gemini-2.0-pro-exp-02-05',
    'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'
  ] },
  { id: 'groq', name: 'Groq (Llama)', icon: openaiIcon, models: [
    'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768', 'gemma2-9b-it'
  ] },
  { id: 'mistral', name: 'Mistral AI', icon: openaiIcon, models: [
    'mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest',
    'codestral-latest', 'open-mixtral-8x22b'
  ] },
  { id: 'openrouter', name: 'OpenRouter', icon: globeIcon, models: [
    'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001', 'meta-llama/llama-3.3-70b-instruct',
    'openai/gpt-4o-mini', 'deepseek/deepseek-chat', 'mistralai/mistral-large'
  ] },
  { id: 'ollama', name: 'Ollama (محلي)', icon: ollamaIcon, models: ['llama3.2', 'mistral', 'gemma2', 'phi3', 'qwen2.5'] },
]

export default function AIConfig() {
  const [selected, setSelected] = useState('openai')
  const [configs, setConfigs] = useState({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [dynamicModels, setDynamicModels] = useState([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [modelSearch, setModelSearch] = useState('')

  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    // Load global active config
    const cfg = await window.api?.ai.getConfig()
    if (cfg) {
      setSelected(cfg.activeProvider || cfg.provider)
      setConfigs(prev => ({ ...prev, [cfg.provider]: cfg }))
    }
    
    // Load other providers' saved configs in background
    for (const p of PROVIDERS) {
      if (p.id === cfg?.provider) continue
      const pCfg = await window.api?.ai.getProviderConfig(p.id)
      if (pCfg) {
        setConfigs(prev => ({ ...prev, [p.id]: pCfg }))
      }
    }
  }

  async function fetchModels(config) {
    const cfg = config || current
    if (!cfg.apiKey && cfg.provider !== 'ollama') return
    setFetchingModels(true)
    const models = await window.api?.ai.fetchModels(cfg)
    if (models && models.error) {
      toast.error(`فشل جلب النماذج: ${models.error}`)
      setDynamicModels([])
    } else if (models && Array.isArray(models)) {
      setDynamicModels(models)
    }
    setFetchingModels(false)
  }

  const current = configs[selected] || { provider: selected, model: '', apiKey: '', baseUrl: '' }

  function updateField(field, value) {
    setConfigs(prev => ({ 
      ...prev, 
      [selected]: { ...current, [field]: value } 
    }))
  }

  useEffect(() => {
    setDynamicModels([])
    setModelSearch('')
    // Build config for the newly-selected provider from saved configs
    const newConfig = configs[selected] || { provider: selected, model: '', apiKey: '', baseUrl: '' }
    if (newConfig.apiKey || selected === 'ollama') {
      fetchModels(newConfig)
    }
  }, [selected])

  async function save() {
    await window.api?.ai.saveConfig({ ...current, provider: selected })
    toast.success('تم حفظ إعدادات الذكاء الاصطناعي ✓')
  }

  async function test() {
    setTesting(true); setTestResult(null)
    const res = await window.api?.ai.testConnection({ ...current, provider: selected })
    setTesting(false)
    setTestResult(res)
    if (res?.success) {
      toast.success('الاتصال ناجح! ✓')
      fetchModels({ ...current, provider: selected })
    }
    else toast.error('فشل الاتصال: ' + (res?.error || 'خطأ غير معروف'))
  }

  const prov = PROVIDERS.find(p => p.id === selected)

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>إعدادات الذكاء الاصطناعي</h1>
        <p>اختر مزود الـ AI وأدخل مفتاح API الخاص بك</p>
      </div>

      <div className="ai-layout">
        {/* Provider selector */}
        <div className="provider-list card">
          <div className="card-title">اختر مزود الخدمة</div>
          <div className="provider-grid-modern">
            {PROVIDERS.map(p => {
              const isActive = configs[p.id]?.apiKey || p.id === 'ollama'
              return (
                <div 
                  key={p.id} 
                  className={`provider-card-modern ${selected === p.id ? 'selected' : ''}`}
                  onClick={() => setSelected(p.id)}
                >
                  <div className="provider-icon-wrapper">
                    <img src={p.icon} alt={p.name} />
                  </div>
                  <div className="provider-info-modern">
                    <span className="provider-name-modern">{p.name}</span>
                    {isActive && <span className="setup-badge">جاهز ✓</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Config panel */}
        <div className="ai-config-panel">
          <div className="card">
            <div className="card-title">
              <img src={prov?.icon} alt={prov?.name} className="prov-title-img" />
              {prov?.name}
            </div>

            {selected !== 'ollama' && (
              <div className="input-group">
                <label className="input-label">مفتاح API</label>
                <input type="password" className="input" placeholder="sk-..." value={current.apiKey || ''} onChange={e => updateField('apiKey', e.target.value)} />
              </div>
            )}

            {selected === 'ollama' && (
              <div className="input-group">
                <label className="input-label">عنوان الخادم المحلي</label>
                <input className="input" placeholder="http://localhost:11434" value={current.baseUrl || ''} onChange={e => updateField('baseUrl', e.target.value)} />
              </div>
            )}

            <div className="input-group">
              <label className="input-label">اختيار النموذج الذكي</label>
              
              <div className="custom-model-selector">
                <div className="search-bar-container">
                  <span className="search-icon">🔍</span>
                  <input 
                    type="text" 
                    className="model-search-input-modern" 
                    placeholder="ابحث عن نموذج... (مثلاً: o1, flash, sonnet)" 
                    value={modelSearch} 
                    onChange={e => setModelSearch(e.target.value)} 
                  />
                  {fetchingModels && <div className="fetching-loader"></div>}
                </div>

                <div className="models-grid-modern">
                  {/* Default/Recommended Models */}
                  <div className="models-section">
                    <div className="section-header">النماذج المقترحة</div>
                    <div className="models-list-modern">
                      {[...new Set([...(prov?.models || [])])]
                        .filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()))
                        .map(m => (
                          <div 
                            key={m} 
                            className={`model-card-modern ${current.model === m ? 'active' : ''}`}
                            onClick={() => updateField('model', m)}
                          >
                            <div className="model-name-main">{m}</div>
                            <div className="model-badge">PRO</div>
                            {current.model === m && <span className="selected-check">✓</span>}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Dynamic Models from API */}
                  {dynamicModels.length > 0 && (
                    <div className="models-section mt-4">
                      <div className="section-header">النماذج المتوفرة في حسابك</div>
                      <div className="models-list-modern">
                        {dynamicModels
                          .filter(m => !prov?.models.includes(m)) // Hide if already in recommended
                          .filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()))
                          .map(m => (
                            <div 
                              key={m} 
                              className={`model-card-modern dynamic ${current.model === m ? 'active' : ''}`}
                              onClick={() => updateField('model', m)}
                            >
                              <div className="model-name-main">{m}</div>
                              <div className="model-badge secondary">API</div>
                              {current.model === m && <span className="selected-check">✓</span>}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="selector-footer">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => fetchModels()}
                    disabled={fetchingModels || (!current.apiKey && selected !== 'ollama')}
                  >
                    🔄 تحديث القائمة من {prov?.name}
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      updateField('model', 'custom')
                      setModelSearch('')
                    }}
                  >
                    ➕ استخدام نموذج مخصص
                  </button>
                </div>
              </div>
            </div>

            {/* Model Input - Always show if 'custom' or not in lists */}
            {(current.model === 'custom' || !current.model) && (
              <div className="input-group animate-slide-down">
                <label className="input-label">أدخل اسم النموذج يدوياً (ID)</label>
                <input
                  className="input"
                  placeholder="مثال: gpt-4o أو llama3"
                  value={current.model === 'custom' ? '' : current.model}
                  onChange={e => updateField('model', e.target.value)}
                />
              </div>
            )}

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? `✓ ${testResult.message?.slice(0, 100)}` : `✗ ${testResult.error}`}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button className="btn btn-primary" onClick={save}>حفظ الإعدادات</button>
              <button className="btn btn-secondary" onClick={test} disabled={testing}>
                {testing ? <span className="animate-spin">↻</span> : ''} اختبار الاتصال
              </button>
            </div>
          </div>

          <div className="card ai-info-card">
            <div className="card-title">معلومات المزود</div>
            <div className="info-grid">
              {selected === 'openai' && <><p>🌐 <strong>OpenAI</strong> — GPT-4o هو الأقوى والأسرع</p><p>🔗 الحصول على المفتاح: <span className="link">platform.openai.com</span></p></>}
              {selected === 'anthropic' && <><p>🌐 <strong>Anthropic</strong> — Claude 3.5 Sonnet ممتاز للعربية</p><p>🔗 الحصول على المفتاح: <span className="link">console.anthropic.com</span></p></>}
              {selected === 'google' && <><p>🌐 <strong>Google</strong> — Gemini 1.5 Pro يدعم العربية بشكل ممتاز</p><p>🔗 الحصول على المفتاح: <span className="link">aistudio.google.com</span></p></>}
              {selected === 'groq' && <><p>🌐 <strong>Groq</strong> — سرعة استثنائية مع Llama 3</p><p>🔗 الحصول على المفتاح: <span className="link">console.groq.com</span></p></>}
              {selected === 'mistral' && <><p>🌐 <strong>Mistral</strong> — نموذج أوروبي متوازن</p><p>🔗 الحصول على المفتاح: <span className="link">console.mistral.ai</span></p></>}
              {selected === 'openrouter' && <><p>🌐 <strong>OpenRouter</strong> — وصول موحد لجميع النماذج</p><p>🔗 الحصول على المفتاح: <span className="link">openrouter.ai</span></p></>}
              {selected === 'ollama' && <><p>🖥 <strong>Ollama</strong> — يعمل محلياً بدون إنترنت</p><p>📥 تثبيت: <span className="link">ollama.ai</span></p><p>▶ تشغيل: <code>ollama run llama3</code></p></>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
