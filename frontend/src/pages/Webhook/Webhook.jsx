import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import globeIcon from '../../assets/icons/globe.png'
import './Webhook.css'

export default function Webhook() {
  const [webhookStatus, setWebhookStatus] = useState('offline')
  const [port, setPort] = useState(3000)
  const [verifyToken, setVerifyToken] = useState('AutoFlowSecretToken123')
  
  const [ngrokStatus, setNgrokStatus] = useState('offline')
  const [ngrokToken, setNgrokToken] = useState('')
  const [ngrokLogs, setNgrokLogs] = useState([])
  const [ngrokUrl, setNgrokUrl] = useState('')
  const [webhookLogs, setWebhookLogs] = useState([])

  const ngrokLogRef = useRef(null)
  const whLogRef = useRef(null)

  useEffect(() => {
    loadStatus()

    // Listeners for Webhook
    window.api?.webhook.onEvent((event) => {
      setWebhookLogs(prev => [`[EVENT] Received: ${JSON.stringify(event)}`, ...prev].slice(0, 50))
      toast.success('تم استلام حدث جديد من فيسبوك!')
    })

    // Listeners for Ngrok
    window.api?.ngrok.onLog((log) => {
      setNgrokLogs(prev => [`[NGROK] ${log}`, ...prev].slice(0, 100))
    })

    return () => {
      window.api?.webhook.removeListeners()
      window.api?.ngrok.removeListeners()
    }
  }, [])

  async function loadStatus() {
    const wh = await window.api?.webhook.getStatus()
    if (wh) {
      setWebhookStatus(wh.isRunning ? 'online' : 'offline')
      setPort(wh.port || 3000)
      setVerifyToken(wh.verifyToken || 'autoflow_secure_token')
    }

    const ngrokData = await window.api?.ngrok.getStatus()
    if (ngrokData) {
      setNgrokStatus(ngrokData.isRunning ? 'online' : 'offline')
      if (ngrokData.url) setNgrokUrl(ngrokData.url)
    }
    
    // Load saved ngrokToken from settings if any
    const savedToken = await window.api?.settings.get('ngrok_token')
    if (savedToken) setNgrokToken(savedToken)
  }

  async function toggleWebhook() {
    if (webhookStatus === 'online') {
      await window.api?.webhook.stop()
      setWebhookStatus('offline')
      setWebhookLogs(prev => ['[SYSTEM] Webhook Server Stopped', ...prev])
      toast('تم إيقاف سيرفر الويب هوك')
    } else {
      setWebhookStatus('connecting')
      const res = await window.api?.webhook.start({ port, verifyToken })
      if (res?.success) {
        setWebhookStatus('online')
        setWebhookLogs(prev => [`[SYSTEM] Webhook Server Started on port ${port}`, ...prev])
        toast.success('سيرفر الويب هوك يعمل الآن')
      } else {
        setWebhookStatus('offline')
        toast.error('فشل تشغيل السيرفر: ' + res?.error)
      }
    }
  }

  async function toggleNgrok() {
    if (ngrokStatus === 'online') {
      await window.api?.ngrok.stop()
      setNgrokStatus('offline')
      setNgrokUrl('')
      toast('تم إيقاف اتصال Ngrok')
    } else {
      setNgrokStatus('connecting')
      if (ngrokToken) await window.api?.settings.set('ngrok_token', ngrokToken)
      
      const res = await window.api?.ngrok.start({ port, token: ngrokToken })
      if (res?.success) {
        setNgrokStatus('online')
        setNgrokUrl(res.url)
        toast.success('تم إنشاء النفق بنجاح!')
      } else {
        setNgrokStatus('offline')
        toast.error('فشل الاتصال: ' + (res?.error || 'خطأ غير معروف'))
      }
    }
  }

  function copyToClipboard(text, msg) {
    navigator.clipboard.writeText(text)
    toast.success(msg || 'تم النسخ')
  }

  return (
    <div className="webhook-page">
      <div className="page-header">
        <h1>إدارة الويب هوك (Webhook)</h1>
        <p>ربط التطبيق المحلي بفيسبوك عبر Ngrok لاستقبال الرسائل والاختبار</p>
      </div>

      <div className="webhook-grid">
        
        {/* Webhook Server Card */}
        <div className="webhook-card">
          <div className="webhook-card-header">
            <div className="webhook-card-title">
              <img src={globeIcon} alt="Webhook" style={{width: 20}} />
              سيرفر الويب هوك المحلي
            </div>
            <span className={`webhook-status status-${webhookStatus}`}>
              {webhookStatus === 'online' ? 'يعمل' : webhookStatus === 'connecting' ? 'جاري التشغيل...' : 'متوقف'}
            </span>
          </div>

          <div className="webhook-form-group">
            <label className="webhook-label">المنفذ (Port)</label>
            <input 
              type="number" 
              className="webhook-input" 
              value={port} 
              onChange={e => setPort(Number(e.target.value))}
              disabled={webhookStatus === 'online'}
            />
          </div>

          <div className="webhook-form-group">
            <label className="webhook-label">رمز التحقق (Verify Token)</label>
            <div style={{display:'flex', gap:8}}>
              <input 
                type="text" 
                className="webhook-input" 
                value={verifyToken} 
                onChange={e => setVerifyToken(e.target.value)}
                disabled={webhookStatus === 'online'}
                style={{flex: 1}}
              />
              <button className="webhook-btn" style={{background: 'rgba(255,255,255,0.1)'}} onClick={() => copyToClipboard(verifyToken, 'تم نسخ رمز التحقق')}>
                نسخ
              </button>
            </div>
            <span style={{fontSize: 11, color: '#94a3b8'}}>انسخ هذا الرمز وضعه في إعدادات Webhooks في فيسبوك</span>
          </div>

          <button 
            className={`webhook-btn ${webhookStatus === 'online' ? 'webhook-btn-danger' : 'webhook-btn-primary'}`}
            onClick={toggleWebhook}
            style={{marginTop: 'auto'}}
          >
            {webhookStatus === 'online' ? 'إيقاف السيرفر' : 'تشغيل السيرفر'}
          </button>
        </div>

        {/* Ngrok Tunnel Card */}
        <div className="webhook-card">
          <div className="webhook-card-header">
            <div className="webhook-card-title">
              <span style={{color: '#3b82f6', fontSize: 20}}>⚡</span>
              Cloudflare Tunnel
            </div>
            <span className={`webhook-status status-${ngrokStatus}`}>
              {ngrokStatus === 'online' ? 'متصل بالإنترنت' : ngrokStatus === 'connecting' ? 'جاري الاتصال...' : 'غير متصل'}
            </span>
          </div>

          <div className="webhook-form-group">
            <label className="webhook-label" style={{color:'#34d399'}}>✓ لا يحتاج إلى توكن — يعمل مجاناً بدون تسجيل</label>
            <div style={{fontSize:11,color:'#64748b',marginTop:4}}>
              يستخدم Cloudflare Tunnel بدلاً من Ngrok — أسرع واستقراراً أفضل
            </div>
          </div>

          <div className="webhook-form-group">
            <label className="webhook-label">رابط الويب هوك الخاص بك (لإضافته في فيسبوك)</label>
            <div style={{display:'flex', gap:8}}>
              <input 
                type="text" 
                className="webhook-input" 
                value={ngrokUrl ? `${ngrokUrl}/webhook` : 'بانتظار تشغيل Ngrok...'} 
                disabled
                style={{flex: 1, color: ngrokUrl ? '#fff' : '#64748b'}}
              />
              {ngrokUrl && (
                <button className="webhook-btn" style={{background: 'rgba(255,255,255,0.1)'}} onClick={() => copyToClipboard(`${ngrokUrl}/webhook`, 'تم نسخ الرابط العام')}>
                  نسخ
                </button>
              )}
            </div>
            <span style={{fontSize: 11, color: '#94a3b8'}}>انسخ هذا الرابط بالكامل عندما يظهر وضعه في إعدادات فيسبوك.</span>
          </div>

          <button 
            className={`webhook-btn ${ngrokStatus === 'online' ? 'webhook-btn-danger' : 'webhook-btn-primary'}`}
            onClick={toggleNgrok}
            style={{marginTop: 'auto'}}
          >
            {ngrokStatus === 'online' ? 'إيقاف النفق' : 'توليد رابط عام (Cloudflare Tunnel)'}
          </button>
        </div>

        {/* Logs */}
        <div className="webhook-card webhook-logs-card">
          <div className="webhook-card-header">
            <div className="webhook-card-title">سجلات النشاط (Logs)</div>
            <button className="webhook-btn" style={{padding: '4px 10px', fontSize: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)'}} onClick={() => { setNgrokLogs([]); setWebhookLogs([]) }}>مسح</button>
          </div>
          
          <div style={{display:'flex', gap:20}}>
             <div style={{flex:1}}>
               <h3 style={{fontSize: 13, color: '#94a3b8', marginBottom: 8}}>طلبات الويب هوك (Facebook Events)</h3>
               <div className="webhook-log-box" ref={whLogRef}>
                 {webhookLogs.length === 0 && <div style={{color: '#475569', textAlign: 'center', marginTop: 20}}>لا توجد طلبات بعد...</div>}
                 {webhookLogs.map((log, i) => (
                   <div key={i} className="log-entry">
                     <span className="log-info">{log}</span>
                   </div>
                 ))}
               </div>
             </div>

             <div style={{flex:1}}>
               <h3 style={{fontSize: 13, color: '#94a3b8', marginBottom: 8}}>سجلات Ngrok</h3>
               <div className="webhook-log-box" ref={ngrokLogRef}>
                 {ngrokLogs.length === 0 && <div style={{color: '#475569', textAlign: 'center', marginTop: 20}}>السجلات فارغة...</div>}
                 {ngrokLogs.map((log, i) => (
                   <div key={i} className="log-entry">
                     <span style={{color: log.includes('ERR') || log.includes('error') ? '#f87171' : '#e2e8f0'}}>{log}</span>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
