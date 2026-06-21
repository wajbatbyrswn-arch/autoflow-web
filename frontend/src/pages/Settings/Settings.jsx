import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import globeIcon from '../../assets/icons/globe.png'
import profileIcon from '../../assets/icons/profile.png'
import bellIcon from '../../assets/icons/bell.png'
import monitorIcon from '../../assets/icons/monitor.png'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import telegramIcon from '../../assets/icons/telegram.png'
import whatsappIcon from '../../assets/icons/whatsapp.png'
import saveIcon from '../../assets/icons/save.png'
import './Settings.css'

const TABS = [
  { id: 0, label: 'المنصات', icon: globeIcon },
  { id: 1, label: 'الملف الشخصي', icon: profileIcon },
  { id: 2, label: 'الإشعارات', icon: bellIcon },
  { id: 3, label: 'النظام', icon: monitorIcon },
]

export default function Settings() {
  const [tab, setTab] = useState(0)

  // ── Meta Accounts (multi-account) ────────────────────────────────────────
  const [metaAccounts, setMetaAccounts] = useState([])
  const [fbConnecting, setFbConnecting] = useState(false)
  const [addingAccount, setAddingAccount] = useState(false)

  // OAuth flow state
  const [fbUserToken, setFbUserToken] = useState('')
  const [fbPages, setFbPages] = useState([])
  const [fbSelectedPage, setFbSelectedPage] = useState(null)
  const [fbOAuthStep, setFbOAuthStep] = useState('idle') // 'idle' | 'pages' | 'connecting'
  const [fbMethod, setFbMethod] = useState('oauth')     // 'oauth' | 'manual'
  const [manualFbToken, setManualFbToken] = useState('')
  const [manualFbPageId, setManualFbPageId] = useState('')

  // ── WhatsApp / Telegram ──────────────────────────────────────────────────
  const [tgToken, setTgToken] = useState('')
  const [tgStatus, setTgStatus] = useState('disconnected')
  const [tgConnecting, setTgConnecting] = useState(false)
  const [waStatus, setWaStatus] = useState('disconnected')
  const [waQrCode, setWaQrCode] = useState(null)
  const [waConnecting, setWaConnecting] = useState(false)

  // ── Profile ──────────────────────────────────────────────────────────────
  const [storeName, setStoreName] = useState('AutoFlow')
  const [storeLogo, setStoreLogo] = useState('')
  const [currency, setCurrency] = useState('IQD')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifMethod, setNotifMethod] = useState('telegram')
  const [notifTgToken, setNotifTgToken] = useState('')
  const [adminChatId, setAdminChatId] = useState('')
  const [notifEmailUser, setNotifEmailUser] = useState('')
  const [notifEmailPass, setNotifEmailPass] = useState('')
  const [notifEmailTo, setNotifEmailTo] = useState('')
  const [isSavingNotif, setIsSavingNotif] = useState(false)

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    window.api?.whatsapp.onQR(qr => { setWaQrCode(qr); setWaConnecting(false) })
    window.api?.whatsapp.onStatus(s => {
      setWaStatus(s.status)
      if (s.status === 'connected') { setWaQrCode(null); toast.success('واتساب متصل ✓') }
    })
    return () => window.api?.whatsapp.removeListeners()
  }, [])

  const loadAll = useCallback(async () => {
    // Meta accounts
    const accounts = await window.api?.meta?.getAccounts() || []
    setMetaAccounts(accounts)

    // Telegram
    const all = await window.api?.settings.getAll() || {}
    if (all.telegram_token) setTgToken(all.telegram_token)
    if (all.notif_method) setNotifMethod(all.notif_method)
    if (all.notif_telegram_token) setNotifTgToken(all.notif_telegram_token)
    if (all.admin_telegram_chat_id) setAdminChatId(all.admin_telegram_chat_id)
    if (all.notif_email_user) setNotifEmailUser(all.notif_email_user)
    if (all.notif_email_pass) setNotifEmailPass(all.notif_email_pass)
    if (all.notif_email_to) setNotifEmailTo(all.notif_email_to)

    // Store config
    const store = await window.api?.db.getStoreConfig()
    if (store) {
      setStoreName(store.store_name || 'AutoFlow')
      setStoreLogo(store.store_logo || '')
      setCurrency(store.currency || 'IQD')
    }

    // WhatsApp / Telegram statuses
    const tgS = await window.api?.telegram?.getStatus?.()
    setTgStatus(tgS?.status || 'disconnected')
    const waS = await window.api?.whatsapp.getStatus()
    setWaStatus(waS?.status || 'disconnected')
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Meta: Step 1 — OAuth login
  // ─────────────────────────────────────────────────────────────────────────
  async function startOAuth() {
    setFbConnecting(true)
    setFbOAuthStep('idle')
    setFbPages([])
    setFbSelectedPage(null)

    const oauthResult = await window.api?.facebook.oauthLogin()
    if (!oauthResult?.success) {
      setFbConnecting(false)
      return toast.error('فشل تسجيل الدخول: ' + (oauthResult?.error || 'خطأ غير معروف'))
    }
    setFbUserToken(oauthResult.token)

    const pagesResult = await window.api?.facebook.getPages(oauthResult.token)
    setFbConnecting(false)

    if (!pagesResult?.success || !pagesResult.pages?.length) {
      return toast.error('لا توجد صفحات فيسبوك مرتبطة بهذا الحساب')
    }

    // Filter out pages already connected
    const alreadyConnected = new Set(metaAccounts.map(a => a.page_id))
    const newPages = pagesResult.pages.filter(p => !alreadyConnected.has(p.id))

    if (!newPages.length) {
      return toast('جميع الصفحات المتاحة مربوطة بالفعل.', { icon: 'ℹ️' })
    }

    setFbPages(newPages)
    setFbOAuthStep('pages')
    if (newPages.length === 1) setFbSelectedPage(newPages[0])
    toast.success('تسجيل الدخول ناجح! اختر الصفحة التي تريد ربطها.')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Meta: Step 2 — Connect selected page
  // ─────────────────────────────────────────────────────────────────────────
  async function connectPage() {
    if (!fbSelectedPage) return toast.error('اختر صفحة أولاً')
    setFbConnecting(true)
    setFbOAuthStep('connecting')

    const res = await window.api?.facebook.connectWithPage({
      pageToken: fbSelectedPage.access_token,
      pageId: fbSelectedPage.id,
      pageName: fbSelectedPage.name,
    })

    if (!res?.success) {
      setFbConnecting(false)
      setFbOAuthStep('pages')
      return toast.error('فشل ربط الصفحة: ' + (res?.error || 'خطأ'))
    }

    toast.success(`فيسبوك متصل: ${fbSelectedPage.name} ✓`)

    // Save to meta_accounts
    await window.api?.meta?.saveAccount({
      page_id: fbSelectedPage.id,
      page_name: fbSelectedPage.name,
      page_token: fbSelectedPage.access_token,
    })

    // Try to link Instagram
    const igFromPage = fbSelectedPage.instagram_business_account
    let igUsername = null

    if (igFromPage?.id) {
      igUsername = igFromPage.username
      const igConnect = await window.api?.instagram.connectFromPage({
        pageToken: fbSelectedPage.access_token,
        accountId: igFromPage.id,
        username: igFromPage.username,
        pageId: fbSelectedPage.id,
      })
      if (igConnect?.success) {
        toast.success(`إنستغرام متصل تلقائياً: @${igFromPage.username} ✓`)
      } else {
        toast.error(igConnect?.error || 'فشل ربط إنستغرام — تحقق من الأذونات', { duration: 7000 })
      }
      // Update meta_account with IG info
      await window.api?.meta?.saveAccount({
        page_id: fbSelectedPage.id,
        page_name: fbSelectedPage.name,
        page_token: fbSelectedPage.access_token,
        ig_user_id: igFromPage.id,
        ig_username: igFromPage.username,
      })
    } else {
      // Fallback: try to get IG from page
      const igRes = await window.api?.instagram.getFromPage({
        pageToken: fbSelectedPage.access_token,
        userToken: fbUserToken,
        pageId: fbSelectedPage.id,
      })
      if (igRes?.success && igRes.account) {
        igUsername = igRes.account.username
        const igConnect = await window.api?.instagram.connectFromPage({
          pageToken: fbSelectedPage.access_token,
          accountId: igRes.account.id,
          username: igRes.account.username,
          pageId: fbSelectedPage.id,
        })
        if (igConnect?.success) {
          toast.success(`إنستغرام متصل تلقائياً: @${igRes.account.username} ✓`)
        } else {
          toast.error(igConnect?.error || 'فشل ربط إنستغرام — تحقق من الأذونات', { duration: 7000 })
        }
        await window.api?.meta?.saveAccount({
          page_id: fbSelectedPage.id,
          page_name: fbSelectedPage.name,
          page_token: fbSelectedPage.access_token,
          ig_user_id: igRes.account.id,
          ig_username: igRes.account.username,
        })
      } else {
        toast('لا يوجد حساب إنستغرام Business مرتبط بهذه الصفحة.', {
          icon: 'ℹ️', duration: 5000
        })
      }
    }

    // Refresh accounts list
    const accounts = await window.api?.meta?.getAccounts() || []
    setMetaAccounts(accounts)

    setFbConnecting(false)
    setFbOAuthStep('idle')
    setFbPages([])
    setFbSelectedPage(null)
    setFbUserToken('')
    setAddingAccount(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Meta: Manual connect
  // ─────────────────────────────────────────────────────────────────────────
  async function connectManual() {
    if (!manualFbToken || !manualFbPageId) {
      return toast.error('يرجى إدخال التوكن ومعرف الصفحة')
    }
    setFbConnecting(true)
    const res = await window.api?.facebook.connect({
      token: manualFbToken.trim(),
      pageId: manualFbPageId.trim(),
    })
    if (res?.success) {
      await window.api?.meta?.saveAccount({
        page_id: manualFbPageId.trim(),
        page_name: res.page?.name || 'Facebook Page',
        page_token: manualFbToken.trim(),
      })
      const accounts = await window.api?.meta?.getAccounts() || []
      setMetaAccounts(accounts)
      setManualFbToken('')
      setManualFbPageId('')
      setAddingAccount(false)
      toast.success('تم الربط اليدوي بنجاح ✓')
    } else {
      toast.error('فشل الربط: ' + (res?.error || 'خطأ'))
    }
    setFbConnecting(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Meta: Remove account
  // ─────────────────────────────────────────────────────────────────────────
  async function removeAccount(pageId, pageName) {
    await window.api?.meta?.removeAccount(pageId)
    setMetaAccounts(prev => prev.filter(a => a.page_id !== pageId))
    toast.success(`تم إزالة ${pageName}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cancel add-account flow
  // ─────────────────────────────────────────────────────────────────────────
  function cancelAdd() {
    setAddingAccount(false)
    setFbOAuthStep('idle')
    setFbPages([])
    setFbSelectedPage(null)
    setFbUserToken('')
    setManualFbToken('')
    setManualFbPageId('')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Telegram
  // ─────────────────────────────────────────────────────────────────────────
  async function connectTG() {
    if (!tgToken) return toast.error('أدخل Telegram Bot Token أولاً')
    setTgConnecting(true)
    const res = await window.api?.telegram?.connect({ token: tgToken })
    setTgConnecting(false)
    if (res?.success) { setTgStatus('connected'); toast.success('تلغرام متصل ✓') }
    else toast.error('فشل الاتصال: ' + (res?.error || 'خطأ'))
  }

  async function connectWA() {
    setWaConnecting(true); setWaQrCode(null)
    await window.api?.whatsapp.connect()
  }

  async function disconnectWA() {
    await window.api?.whatsapp.disconnect()
    setWaStatus('disconnected'); setWaQrCode(null)
    toast.success('تم قطع اتصال واتساب')
  }

  async function saveProfile() {
    setIsSavingProfile(true)
    const res = await window.api?.db.saveStoreConfig({ store_name: storeName, store_logo: storeLogo, currency })
    setIsSavingProfile(false)
    if (res?.success) { toast.success('تم حفظ الملف الشخصي ✓'); window.location.reload() }
    else toast.error('فشل الحفظ')
  }

  async function saveNotifSettings() {
    setIsSavingNotif(true)
    await window.api?.settings.set('notif_method', notifMethod)
    await window.api?.settings.set('notif_telegram_token', notifTgToken)
    await window.api?.settings.set('admin_telegram_chat_id', adminChatId)
    await window.api?.settings.set('notif_email_user', notifEmailUser)
    await window.api?.settings.set('notif_email_pass', notifEmailPass)
    await window.api?.settings.set('notif_email_to', notifEmailTo)
    setIsSavingNotif(false)
    toast.success('تم حفظ إعدادات الإشعارات ✓')
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const hasFBAccounts = metaAccounts.length > 0
  const hasIGAccounts = metaAccounts.some(a => a.ig_user_id)

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>الإعدادات</h1>
        <p>ربط المنصات وإدارة خيارات التطبيق</p>
      </div>

      <div className="settings-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`s-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <img src={t.icon} className="tab-img-icon" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="settings-content">

        {/* ── Tab 0: Platforms ── */}
        {tab === 0 && (
          <div className="animate-fade settings-grid">

            {/* WhatsApp */}
            <div className="card platform-settings-card">
              <div className="platform-settings-header">
                <div className="flex items-center gap-3">
                  <img src={whatsappIcon} className="platform-settings-img" />
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>واتساب</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>WhatsApp Baileys</div>
                  </div>
                </div>
                <span className={`badge ${waStatus==='connected'?'badge-success badge-dot':waStatus==='qr'?'badge-warning badge-dot':'badge-danger badge-dot'}`}>
                  {waStatus==='connected'?'متصل':waStatus==='qr'?'انتظر QR':'منقطع'}
                </span>
              </div>
              <div className="divider" />
              {waQrCode ? (
                <div className="qr-box animate-fade">
                  <img src={waQrCode} alt="QR Code" style={{width:180,height:180,margin:'10px auto',display:'block',borderRadius:8}} />
                  <p style={{fontSize:11,textAlign:'center',color:'var(--text-muted)'}}>امسح الرمز لربط الحساب</p>
                </div>
              ) : (
                <div className="wa-actions">
                  {waStatus !== 'connected' ? (
                    <button className="btn btn-success btn-sm w-full" onClick={connectWA} disabled={waConnecting}>
                      {waConnecting ? 'جارٍ الاتصال...' : 'اتصال بواتساب'}
                    </button>
                  ) : (
                    <button className="btn btn-danger btn-sm w-full" onClick={disconnectWA}>قطع الاتصال</button>
                  )}
                </div>
              )}
            </div>

            {/* Telegram */}
            <div className="card platform-settings-card">
              <div className="platform-settings-header">
                <div className="flex items-center gap-3">
                  <img src={telegramIcon} className="platform-settings-img" />
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>تلغرام</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>Telegram Bot API</div>
                  </div>
                </div>
                <span className={`badge ${tgStatus==='connected'?'badge-success badge-dot':'badge-danger badge-dot'}`}>
                  {tgStatus==='connected'?'متصل':'منقطع'}
                </span>
              </div>
              <div className="divider" />
              <div className="input-group">
                <label className="input-label">Bot Token</label>
                <input type="password" className="input" value={tgToken} onChange={e=>setTgToken(e.target.value)} placeholder="12345:ABCDE..." />
              </div>
              <button className="btn btn-primary btn-sm" onClick={connectTG} disabled={tgConnecting}>
                {tgConnecting ? 'جارٍ الاتصال...' : 'اتصال بتلغرام'}
              </button>
            </div>

            {/* ── Meta: Facebook + Instagram (Multi-account) ── */}
            <div className="card platform-settings-card" style={{gridColumn:'span 2'}}>
              <div className="platform-settings-header">
                <div className="flex items-center gap-3">
                  <img src={facebookIcon} className="platform-settings-img" />
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>فيسبوك + إنستغرام</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>Meta Graph API — يدعم حسابات متعددة</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${hasFBAccounts?'badge-success badge-dot':'badge-danger badge-dot'}`}>
                    {hasFBAccounts ? `${metaAccounts.length} حساب` : 'غير مربوط'}
                  </span>
                  {hasIGAccounts && (
                    <span className="badge badge-success badge-dot">إنستغرام متصل</span>
                  )}
                </div>
              </div>
              <div className="divider" />

              {/* ── Existing accounts list ── */}
              {metaAccounts.length > 0 && (
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                  {metaAccounts.map(acc => (
                    <div key={acc.page_id} style={{
                      display:'flex',alignItems:'center',justifyContent:'space-between',
                      padding:'10px 14px',borderRadius:10,
                      background:'rgba(24,119,242,0.06)',
                      border:'1px solid rgba(24,119,242,0.15)',
                    }}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <img src={facebookIcon} style={{width:20,height:20}} />
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{acc.page_name}</div>
                          {acc.ig_username && (
                            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
                              <img src={instagramIcon} style={{width:12,height:12}} />
                              <span style={{fontSize:11,color:'var(--text-muted)'}}>@{acc.ig_username}</span>
                            </div>
                          )}
                          {!acc.ig_username && (
                            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>بدون إنستغرام مرتبط</div>
                          )}
                        </div>
                        <span style={{fontSize:11,color:'#34d399',marginRight:4}}>✓ متصل</span>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{padding:'3px 10px',fontSize:11}}
                        onClick={() => removeAccount(acc.page_id, acc.page_name)}
                      >
                        إزالة
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Add new account section ── */}
              {!addingAccount ? (
                <button
                  className="btn btn-primary btn-sm"
                  style={{width:'fit-content',display:'flex',alignItems:'center',gap:6}}
                  onClick={() => setAddingAccount(true)}
                >
                  <span style={{fontSize:16,lineHeight:1}}>+</span>
                  {metaAccounts.length === 0 ? 'ربط حساب فيسبوك / إنستغرام' : 'إضافة حساب آخر'}
                </button>
              ) : (
                <div className="animate-fade" style={{
                  border:'1px solid rgba(24,119,242,0.2)',borderRadius:12,padding:16,
                  background:'rgba(24,119,242,0.04)',
                }}>
                  <div style={{fontWeight:700,fontSize:13,color:'#1877f2',marginBottom:12}}>
                    إضافة حساب جديد
                  </div>

                  {/* Method toggle */}
                  <div style={{display:'flex',gap:8,marginBottom:14,background:'var(--glass-bg)',padding:4,borderRadius:8,width:'fit-content'}}>
                    <button
                      className={`btn btn-sm ${fbMethod==='oauth'?'btn-primary':''}`}
                      onClick={() => setFbMethod('oauth')}
                      style={fbMethod!=='oauth'?{background:'transparent',color:'var(--text-muted)',border:'none'}:{}}
                    >تسجيل دخول (تلقائي)</button>
                    <button
                      className={`btn btn-sm ${fbMethod==='manual'?'btn-primary':''}`}
                      onClick={() => setFbMethod('manual')}
                      style={fbMethod!=='manual'?{background:'transparent',color:'var(--text-muted)',border:'none'}:{}}
                    >ربط يدوي (Token)</button>
                  </div>

                  {fbMethod === 'oauth' && fbOAuthStep === 'idle' && (
                    <>
                      {/* OAuth setup guide */}
                      <div style={{background:'rgba(24,119,242,0.04)',border:'1px solid rgba(24,119,242,0.15)',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
                        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:'1.8'}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}>
                            <span style={{background:'#1877f2',color:'#fff',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0,marginTop:1}}>1</span>
                            <span>
                              تأكد من إضافة{' '}
                              <code style={{background:'var(--bg-body)',padding:'1px 5px',borderRadius:4,fontSize:11}}>http://localhost:3000/oauth/callback</code>
                              {' '}في{' '}
                              <a href="#" style={{color:'#1877f2',cursor:'pointer'}}
                                onClick={e=>{e.preventDefault();window.api?.shell?.openExternal('https://developers.facebook.com/apps/3522423384579759/fb-login/settings/')}}
                              >إعدادات Facebook Login → Valid OAuth Redirect URIs</a>
                            </span>
                          </div>
                          <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                            <span style={{background:'#34d399',color:'#fff',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0,marginTop:1}}>✓</span>
                            <span>ثم اضغط «تسجيل الدخول» — ستفتح نافذة مدمجة داخل التطبيق</span>
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button
                          className="btn btn-primary"
                          style={{background:'linear-gradient(135deg,#1877f2,#0a5dc2)',display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}
                          onClick={startOAuth}
                          disabled={fbConnecting}
                        >
                          <img src={facebookIcon} style={{width:18,height:18}} />
                          {fbConnecting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول بفيسبوك'}
                        </button>
                        <button className="btn btn-sm" style={{background:'var(--glass-bg)',border:'1px solid var(--border-color)'}} onClick={cancelAdd}>
                          إلغاء
                        </button>
                      </div>
                    </>
                  )}

                  {fbMethod === 'oauth' && fbOAuthStep === 'pages' && (
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <div className="input-group">
                        <label className="input-label">اختر صفحتك على فيسبوك</label>
                        <select
                          className="input"
                          value={fbSelectedPage?.id || ''}
                          onChange={e => setFbSelectedPage(fbPages.find(p => p.id === e.target.value) || null)}
                        >
                          <option value="">-- اختر صفحة --</option>
                          {fbPages.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.instagram_business_account ? ` + @${p.instagram_business_account.username}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>
                        الصفحات التي تحتوي على علامة + تملك حساب إنستغرام Business وستربط تلقائياً
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button
                          className="btn btn-primary"
                          onClick={connectPage}
                          disabled={fbConnecting || !fbSelectedPage}
                          style={{flex:1}}
                        >
                          {fbConnecting ? 'جارٍ الاتصال...' : 'ربط الصفحة المختارة'}
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{background:'var(--glass-bg)',border:'1px solid var(--border-color)'}}
                          onClick={() => { setFbOAuthStep('idle'); setFbPages([]); setFbSelectedPage(null) }}
                        >رجوع</button>
                      </div>
                    </div>
                  )}

                  {fbMethod === 'oauth' && fbOAuthStep === 'connecting' && (
                    <div style={{textAlign:'center',padding:'20px 0',color:'var(--text-muted)',fontSize:13}}>
                      جارٍ ربط الصفحة...
                    </div>
                  )}

                  {fbMethod === 'manual' && (
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <div className="input-group">
                        <label className="input-label">رمز وصول الصفحة (Page Access Token)</label>
                        <input className="input" value={manualFbToken} onChange={e=>setManualFbToken(e.target.value)} placeholder="EAA..." />
                      </div>
                      <div className="input-group">
                        <label className="input-label">معرف الصفحة (Page ID)</label>
                        <input className="input" value={manualFbPageId} onChange={e=>setManualFbPageId(e.target.value)} placeholder="123456789..." />
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-primary" onClick={connectManual} disabled={fbConnecting} style={{flex:1}}>
                          {fbConnecting ? 'جارٍ الاتصال...' : 'ربط الحساب يدوياً'}
                        </button>
                        <button className="btn btn-sm" style={{background:'var(--glass-bg)',border:'1px solid var(--border-color)'}} onClick={cancelAdd}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No accounts warning */}
              {metaAccounts.length === 0 && !addingAccount && (
                <div style={{marginTop:10,fontSize:12,color:'var(--text-muted)',padding:'8px 12px',background:'rgba(255,100,100,0.06)',borderRadius:8,border:'1px dashed rgba(255,100,100,0.25)'}}>
                  لم يتم ربط أي حسابات فيسبوك أو إنستغرام بعد. اضغط الزر أعلاه لإضافة حسابك الأول.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Tab 1: Profile ── */}
        {tab === 1 && (
          <div className="card animate-fade profile-settings">
            <div className="card-title">تخصيص المتجر</div>
            <div className="profile-edit-layout">
              <div className="logo-upload-section">
                <div className="current-logo-preview">
                  {storeLogo ? <img src={storeLogo} alt="Preview" /> : <div className="no-logo-msg"><p>لا يوجد شعار</p></div>}
                </div>
                <div className="input-group">
                  <label className="input-label">رابط الشعار أو Base64</label>
                  <input className="input" value={storeLogo} onChange={e=>setStoreLogo(e.target.value)} placeholder="data:image/png;base64,..." />
                </div>
              </div>
              <div className="info-edit-section">
                <div className="input-group">
                  <label className="input-label">اسم المتجر</label>
                  <input className="input" value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="متجري" />
                </div>
                <div className="input-group">
                  <label className="input-label">العملة</label>
                  <select className="input" value={currency} onChange={e=>setCurrency(e.target.value)}>
                    <option value="IQD">دينار عراقي (IQD)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                  </select>
                </div>
                <button className="btn btn-primary flex-center" onClick={saveProfile} disabled={isSavingProfile}>
                  <img src={saveIcon} className="btn-img-icon" /> {isSavingProfile ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Notifications ── */}
        {tab === 2 && (
          <div className="card animate-fade">
            <div className="card-title">إعدادات الإشعارات وتنبيهات الإدارة</div>
            <div className="input-group" style={{marginBottom:20}}>
              <label className="input-label">طريقة الإرسال المفضلة</label>
              <select className="input" value={notifMethod} onChange={e=>setNotifMethod(e.target.value)}>
                <option value="telegram">بوت تليجرام فقط</option>
                <option value="email">إيميل (Gmail) فقط</option>
                <option value="both">إرسال عبر تليجرام والإيميل معاً</option>
              </select>
            </div>
            <div className="settings-grid" style={{marginBottom:20}}>
              {(notifMethod === 'telegram' || notifMethod === 'both') && (
                <div className="card" style={{background:'var(--glass-bg)',border:'1px solid var(--border-color)',boxShadow:'none'}}>
                  <h3 style={{fontSize:14,marginBottom:15}}>إعدادات تليجرام</h3>
                  <div className="input-group">
                    <label className="input-label">Token بوت الإشعارات (اختياري)</label>
                    <input className="input" value={notifTgToken} onChange={e=>setNotifTgToken(e.target.value)} placeholder="123456:ABC-DEF..." />
                    <div className="input-hint">اتركه فارغاً لاستخدام البوت الرئيسي</div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">معرف حساب المدير (Chat ID)</label>
                    <input className="input" value={adminChatId} onChange={e=>setAdminChatId(e.target.value)} placeholder="123456789" />
                  </div>
                </div>
              )}
              {(notifMethod === 'email' || notifMethod === 'both') && (
                <div className="card" style={{background:'var(--glass-bg)',border:'1px solid var(--border-color)',boxShadow:'none'}}>
                  <h3 style={{fontSize:14,marginBottom:15}}>إعدادات إيميل (Gmail)</h3>
                  <div className="input-group">
                    <label className="input-label">إيميل المرسل</label>
                    <input className="input" type="email" value={notifEmailUser} onChange={e=>setNotifEmailUser(e.target.value)} placeholder="example@gmail.com" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">كلمة مرور التطبيق (App Password)</label>
                    <input className="input" type="password" value={notifEmailPass} onChange={e=>setNotifEmailPass(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">إيميل المستلم (الإدارة)</label>
                    <input className="input" type="email" value={notifEmailTo} onChange={e=>setNotifEmailTo(e.target.value)} placeholder="manager@company.com" />
                  </div>
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={saveNotifSettings} disabled={isSavingNotif} style={{width:'100%'}}>
              <img src={saveIcon} className="btn-img-icon" /> {isSavingNotif ? 'جارٍ الحفظ...' : 'حفظ إعدادات الإشعارات'}
            </button>
          </div>
        )}

        {/* ── Tab 3: System ── */}
        {tab === 3 && (
          <div className="card animate-fade">
            <div className="card-title">النظام</div>
            <div className="system-info">
              <div className="sys-row"><span>الإصدار</span><span>AutoFlow v1.0.0</span></div>
              <div className="sys-row"><span>قاعدة البيانات</span><span>SQLite (محلي)</span></div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
