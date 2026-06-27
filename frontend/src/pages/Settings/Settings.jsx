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
import { CURRENCIES } from '../../lib/currencies'
import { compressImage } from '../../lib/imageCompress'
import { refreshCurrency } from '../../lib/useCurrency'
import { useSubscription } from '../../lib/subscription'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { rpc } from '../../lib/apiClient'
import Activate from '../../auth/Activate'
import './Settings.css'

const TABS = [
  { id: 0, label: 'المنصات', icon: globeIcon },
  { id: 1, label: 'الملف الشخصي', icon: profileIcon },
  { id: 2, label: 'تنشيط الحساب', icon: saveIcon },
  { id: 3, label: 'إدارة بوت تليجرام', icon: bellIcon },
]

// Platform cards for the Nashir-based connection grid.
const PLATFORM_CARDS = [
  { key: 'whatsapp',  label: 'واتساب',     sub: 'WhatsApp Business', icon: whatsappIcon,  viaNashir: true },
  { key: 'instagram', label: 'إنستغرام',   sub: 'Instagram',         icon: instagramIcon, viaNashir: true },
  { key: 'facebook',  label: 'فيسبوك',     sub: 'Facebook Page',     icon: facebookIcon,  viaNashir: true },
  { key: 'telegram',  label: 'تلغرام',     sub: 'Telegram',          icon: telegramIcon,  viaNashir: true },
]

export default function Settings() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile, refresh: refreshSub } = useSubscription()
  const initialTab = searchParams.get('tab') === 'billing' ? 2 : 0
  const [tab, setTab] = useState(initialTab)

  // ── Nashir platform connections ──────────────────────────────────────────
  const [nashirState, setNashirState] = useState(null)
  const [nashirKeyInput, setNashirKeyInput] = useState('')
  const [nashirSaving, setNashirSaving] = useState(false)
  const [nashirLoading, setNashirLoading] = useState(false)

  const loadNashir = useCallback(async () => {
    setNashirLoading(true)
    try {
      const st = await window.api?.nashir?.status()
      setNashirState(st)
    } catch (e) { toast.error('تعذّر جلب حالة ناشر') }
    setNashirLoading(false)
  }, [])

  async function saveNashirKey() {
    setNashirSaving(true)
    try {
      const res = await window.api?.nashir?.saveKey(nashirKeyInput.trim())
      if (res?.success) { toast.success('تم حفظ المفتاح والتحقق منه ✓'); setNashirKeyInput(''); await loadNashir() }
      else toast.error(res?.error || 'فشل الحفظ')
    } catch (e) { toast.error(e.message) }
    setNashirSaving(false)
  }

  useEffect(() => { loadNashir() }, [loadNashir])

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

  // ── Telegram bot integration (real bot API) ──────────────────────────────
  const [tgBotToken, setTgBotToken] = useState('')
  const [tgChatId, setTgChatId] = useState('')
  const [tgBotInfo, setTgBotInfo] = useState(null)
  const [tgSaving, setTgSaving] = useState(false)
  const [tgTesting, setTgTesting] = useState(false)
  const [tgChats, setTgChats] = useState([])         // [{id,type,title,username}]
  const [tgFetchingChats, setTgFetchingChats] = useState(false)

  async function fetchTgChats() {
    setTgFetchingChats(true)
    try {
      const res = await rpc('telegram:listChats')
      if (res?.success) {
        setTgChats(res.chats || [])
        if (!res.chats?.length) {
          toast('ما في قنوات بعد — أضف البوت كأدمن لقناتك ثم أرسل أي رسالة فيها، ثم اضغط تحديث.', { duration: 6000, icon: 'ℹ️' })
        } else {
          toast.success(`تم جلب ${res.chats.length} قناة/جروب`)
        }
      } else {
        toast.error(res?.error || 'فشل الجلب')
      }
    } catch (e) { toast.error(e.message) }
    setTgFetchingChats(false)
  }

  async function loadTgStatus() {
    try {
      const s = await rpc('telegram:getStatus')
      if (s?.bot) setTgBotInfo(s.bot)
      else setTgBotInfo(null)
    } catch {}
  }

  async function saveTgToken() {
    setTgSaving(true)
    try {
      const res = await rpc('telegram:saveToken', { token: tgBotToken.trim() })
      if (res?.success) {
        setTgBotInfo(res.bot)
        toast.success(`تم ربط البوت: @${res.bot?.username || 'unknown'}`)
        setTgBotToken('')
      } else {
        toast.error(res?.error || 'فشل التحقق من التوكن')
      }
    } catch (e) { toast.error(e.message) }
    setTgSaving(false)
  }

  async function saveTgChat() {
    try {
      await rpc('settings:setTelegramAdminChat', { chat_id: tgChatId.trim() })
      toast.success('تم حفظ Chat ID')
    } catch (e) { toast.error(e.message) }
  }

  async function testTg() {
    setTgTesting(true)
    const res = await rpc('telegram:sendTest').catch(e => ({ success: false, error: e.message }))
    if (res?.success) toast.success('تم إرسال رسالة الاختبار ✓ — راجع القناة')
    else toast.error(res?.error || 'فشل الإرسال')
    setTgTesting(false)
  }

  // ── Notifications (legacy email) ─────────────────────────────────────────
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
    // Fire every read in parallel so the page doesn't wait for serial round-trips.
    const [accounts, all, store, tgS, waS] = await Promise.all([
      window.api?.meta?.getAccounts().catch(() => []) || [],
      window.api?.settings.getAll().catch(() => ({})) || {},
      window.api?.db.getStoreConfig().catch(() => ({})) || {},
      window.api?.telegram?.getStatus?.().catch(() => ({})) || {},
      window.api?.whatsapp.getStatus().catch(() => ({})) || {},
    ])
    setMetaAccounts(accounts || [])
    if (all?.telegram_token) setTgToken(all.telegram_token)
    if (all?.notif_method) setNotifMethod(all.notif_method)
    if (all?.notif_telegram_token) setNotifTgToken(all.notif_telegram_token)
    if (all?.admin_telegram_chat_id) setAdminChatId(all.admin_telegram_chat_id)
    if (all?.notif_email_user) setNotifEmailUser(all.notif_email_user)
    if (all?.notif_email_pass) setNotifEmailPass(all.notif_email_pass)
    if (all?.notif_email_to) setNotifEmailTo(all.notif_email_to)
    if (store) {
      setStoreName(store.store_name || 'AutoFlow')
      setStoreLogo(store.store_logo || '')
      setCurrency(store.currency || 'JOD')
    }
    setTgStatus(tgS?.status || 'disconnected')
    setWaStatus(waS?.status || 'disconnected')
    if (tgS?.bot) setTgBotInfo(tgS.bot)
    if (profile?.admin_telegram_chat_id) setTgChatId(profile.admin_telegram_chat_id)
  }, [profile])

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
    if (res?.success) {
      await refreshCurrency()
      toast.success('تم حفظ الملف الشخصي ✓')
    } else toast.error('فشل الحفظ')
  }

  async function saveNotifSettings() {
    setIsSavingNotif(true)
    await window.api?.settings.set('notif_method', notifMethod)
    await window.api?.settings.set('notif_telegram_token', notifTgToken)
    await window.api?.settings.set('admin_telegram_chat_id', adminChatId)
    // Also save on user_profiles so the backend notifications pusher can read it.
    try { await rpc('settings:setTelegramAdminChat', { chat_id: adminChatId }) } catch {}
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

        {/* ── Tab 0: Platforms (owner-managed) ── */}
        {tab === 0 && (
          <div className="animate-fade">
            <div className="card" style={{marginBottom:20, background:'linear-gradient(135deg, rgba(108,71,255,0.08), rgba(168,85,247,0.05))', border:'1px solid var(--accent)'}}>
              <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:6}}>
                <div style={{width:40, height:40, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20}}>🔗</div>
                <div className="card-title" style={{margin:0}}>كيف يتم ربط الحسابات؟</div>
              </div>
              <p style={{fontSize:13, color:'var(--text-secondary)', lineHeight:1.8, margin:0}}>
                لتسهيل التجربة عليك، <b>فريق AutoFlow يربط حساباتك</b> (فيسبوك، إنستغرام، واتساب) خلال 10 دقائق بعد التواصل معنا.
                ما عليك سوى الضغط على زر <b>(تواصل لربط الحساب)</b> أدناه. أما <b>تلغرام</b> فيمكنك ربطه بنفسك بسهولة، أو يمكن للفريق ربطه لك.
              </p>
              <button className="btn btn-primary" style={{marginTop:14}} onClick={()=>nav('/contact')}>
                تواصل معنا لربط الحسابات
              </button>
            </div>

            <div className="card">
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
                <div className="card-title" style={{margin:0}}>حالة الحسابات المربوطة</div>
                <button className="btn btn-secondary btn-sm" onClick={loadNashir} disabled={nashirLoading} style={{fontSize:12}}>
                  {nashirLoading ? '...' : '🔄 تحديث'}
                </button>
              </div>
              <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:18}}>
                سيظهر هنا تلقائياً أي حساب يربطه الفريق لك، أو تربطه بنفسك (تلغرام). اضغط تحديث بعد أن يُخبرك الفريق بإتمام الربط.
              </p>

              <div className="settings-grid">
                {PLATFORM_CARDS.map(pc => {
                  // Real connection status only — no fakes.
                  // Telegram = user has a bot token saved on their profile.
                  // FB/IG/WA = a matching account is actually returned by Nashir (after admin assignment).
                  let connected = false
                  let accounts = []
                  if (pc.key === 'telegram') {
                    connected = !!profile?.telegram_bot_token
                  } else {
                    accounts = nashirState?.platforms?.[pc.key] || []
                    connected = accounts.length > 0
                  }
                  return (
                    <div key={pc.key} className="card platform-settings-card" style={{boxShadow:'none', border:`1px solid ${connected ? '#10b981' : 'var(--border-color)'}`, position:'relative'}}>
                      <div className="platform-settings-header">
                        <div className="flex items-center gap-3">
                          <img src={pc.icon} className="platform-settings-img" />
                          <div>
                            <div style={{fontWeight:700, fontSize:15}}>{pc.label}</div>
                            <div style={{fontSize:12, color:'var(--text-muted)'}}>{pc.sub}</div>
                          </div>
                        </div>
                      </div>
                      <div className="divider" />
                      {connected ? (
                        <div style={{fontSize:13, color:'#34d399', marginBottom:12, lineHeight:1.7, display:'flex', flexDirection:'column', gap:4}}>
                          <div style={{fontWeight:700}}>✓ تم الربط</div>
                          {pc.key === 'telegram' ? (
                            <div style={{fontSize:12, color:'var(--text-secondary)'}}>بوت تلغرام مفعّل</div>
                          ) : (
                            accounts.map((a, i) => (
                              <div key={a.pageId || i} style={{fontSize:12, color:'var(--text-secondary)'}}>
                                • {a.pageName || a.page_name || a.username || '—'}
                              </div>
                            ))
                          )}
                        </div>
                      ) : pc.key === 'telegram' ? (
                        <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:12}}>
                          أدخل توكن البوت من <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>@BotFather</a> أو اطلب من الفريق ربطه لك.
                        </div>
                      ) : (
                        <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:12}}>لم يُربط بعد. تواصل معنا لربط الحساب خلال 10 دقائق.</div>
                      )}
                      {pc.key === 'telegram' ? (
                        <button className="btn btn-primary btn-sm w-full" onClick={()=>setTab(3)}>
                          {connected ? 'إدارة بوت تلغرام' : 'ربط بوت تلغرام'}
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm w-full" onClick={()=>nav('/contact')}>
                          {connected ? 'إدارة عبر الفريق' : 'تواصل لربط الحساب'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Activation / Billing ── */}
        {tab === 2 && (
          <div className="animate-fade" style={{display:'flex', justifyContent:'center'}}>
            {profile?.subscription_status === 'active' ? (
              <div className="card" style={{padding:30, maxWidth:520, textAlign:'center'}}>
                <div style={{fontSize:48, marginBottom:10}}>✓</div>
                <h2 style={{fontSize:22, fontWeight:800, marginBottom:10}}>اشتراكك مُفعّل</h2>
                <p style={{color:'var(--text-secondary)', marginBottom:18}}>
                  الخطة: <strong>{profile?.plan === 'basic' ? 'الخطة الشهرية' : profile?.plan}</strong>
                  <br/>
                  {profile?.subscription_expires_at && (
                    <>ينتهي بتاريخ <strong>{new Date(profile.subscription_expires_at).toLocaleDateString('ar-EG', { dateStyle:'long' })}</strong></>
                  )}
                </p>
                <button className="btn btn-secondary" onClick={()=>nav('/contact')}>تواصل للتجديد</button>
              </div>
            ) : (
              <Activate embedded onActivated={() => { refreshSub?.(); toast.success('تم التفعيل ✓') }} />
            )}
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
                  <label className="input-label">شعار المتجر</label>
                  <input type="file" accept="image/*" style={{ display: 'none' }} id="logo-file-input"
                    onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return
                      try {
                        const compressed = await compressImage(f, { maxDim: 400, quality: 0.85 })
                        setStoreLogo(compressed)
                      } catch { toast.error('فشل ضغط الصورة') }
                    }} />
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => document.getElementById('logo-file-input').click()}>
                      📷 اختر صورة من الجهاز
                    </button>
                    {storeLogo && <button type="button" className="btn btn-danger btn-sm" onClick={() => setStoreLogo('')}>✕ حذف</button>}
                  </div>
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
                    {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary flex-center" onClick={saveProfile} disabled={isSavingProfile}>
                  <img src={saveIcon} className="btn-img-icon" /> {isSavingProfile ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: Telegram bot management ── */}
        {tab === 3 && (
          <div className="animate-fade">
            <div className="card" style={{marginBottom:20, background:'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(43,178,76,0.04))', border:'1px solid rgba(43,178,76,0.3)'}}>
              <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:8}}>
                <div style={{width:42, height:42, borderRadius:10, background:'#229ED9', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20}}>✈</div>
                <div>
                  <div className="card-title" style={{margin:0}}>بوت تلغرام للإشعارات</div>
                  <div style={{fontSize:12, color:'var(--text-muted)'}}>اربط بوت تلغرام لاستقبال إشعارات الطلبات الجديدة والشكاوى في قناة/جروب خاص بك.</div>
                </div>
              </div>

              {tgBotInfo ? (
                <div style={{background:'rgba(43,178,76,0.1)', border:'1px solid rgba(43,178,76,0.3)', borderRadius:10, padding:'12px 16px', marginTop:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap'}}>
                  <div style={{display:'flex', alignItems:'center', gap:10, fontSize:13}}>
                    <span style={{color:'#34d399', fontSize:18}}>✓</span>
                    <div>
                      <div style={{fontWeight:700}}>البوت مربوط: <span style={{color:'#34d399'}}>@{tgBotInfo.username}</span></div>
                      <div style={{fontSize:11, color:'var(--text-muted)'}}>{tgBotInfo.first_name}</div>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={async () => {
                    if (!confirm('فصل البوت؟')) return
                    await rpc('telegram:saveToken', { token: '' })
                    setTgBotInfo(null); toast.success('تم الفصل')
                  }}>فصل البوت</button>
                </div>
              ) : (
                <>
                  <div className="input-group" style={{marginTop:14}}>
                    <label className="input-label">1. توكن البوت (من @BotFather)</label>
                    <div style={{display:'flex', gap:6}}>
                      <input className="input" dir="ltr" style={{flex:1, fontFamily:'monospace'}}
                        placeholder="123456789:AAAAAAAA..." value={tgBotToken}
                        onChange={e => setTgBotToken(e.target.value)} />
                      <button className="btn btn-primary" onClick={saveTgToken} disabled={tgSaving || !tgBotToken.trim()}>
                        {tgSaving ? '...' : 'حفظ وتحقق'}
                      </button>
                    </div>
                    <div className="input-hint">
                      أنشئ بوت جديد من <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>@BotFather</a> ثم انسخ التوكن هنا.
                    </div>
                  </div>
                </>
              )}

              {/* Chat selector — required for sending */}
              {tgBotInfo && (
                <div className="input-group" style={{marginTop:14}}>
                  <label className="input-label">2. اختر القناة/الجروب الذي ستصل عليه الإشعارات</label>

                  <div style={{background:'rgba(34,158,217,0.07)', border:'1px dashed rgba(34,158,217,0.3)', borderRadius:10, padding:'10px 14px', fontSize:12, lineHeight:1.9, marginBottom:10, color:'var(--text-secondary)'}}>
                    <strong style={{color:'var(--text)'}}>كيف تربط قناتك؟</strong><br/>
                    1) افتح قناتك/جروبك على تلغرام.<br/>
                    2) أضف البوت <strong style={{color:'#34d399'}}>@{tgBotInfo.username}</strong> كأدمن.<br/>
                    3) أرسل أي رسالة (مثل "مرحبا") داخل القناة.<br/>
                    4) اضغط زر "تحديث القنوات" أدناه.
                  </div>

                  <div style={{display:'flex', gap:6, marginBottom:10}}>
                    <button className="btn btn-secondary" style={{flex:1}} onClick={fetchTgChats} disabled={tgFetchingChats}>
                      {tgFetchingChats ? 'جارٍ الجلب...' : '🔄 تحديث قائمة القنوات'}
                    </button>
                  </div>

                  {tgChats.length > 0 ? (
                    <>
                      <select className="input" value={tgChatId} onChange={e => setTgChatId(e.target.value)} style={{marginBottom:8}}>
                        <option value="">— اختر قناة أو جروب —</option>
                        {tgChats.map(c => {
                          const typeLabel = c.type === 'channel' ? '📢 قناة'
                            : c.type === 'group' || c.type === 'supergroup' ? '👥 جروب'
                            : c.type === 'private' ? '👤 خاص' : c.type
                          return (
                            <option key={c.id} value={c.id}>
                              {typeLabel} — {c.title}{c.username ? ` (@${c.username})` : ''}
                            </option>
                          )
                        })}
                      </select>
                      <button className="btn btn-primary" style={{width:'100%'}} onClick={saveTgChat} disabled={!tgChatId}>
                        💾 حفظ الاختيار
                      </button>
                    </>
                  ) : (
                    <div style={{textAlign:'center', padding:'14px', opacity:0.6, fontSize:13, background:'var(--glass-bg)', borderRadius:10, border:'1px dashed var(--border-color)'}}>
                      لا توجد قنوات بعد. اتبع الخطوات أعلاه ثم اضغط "تحديث".
                    </div>
                  )}

                  {tgChatId && (
                    <div style={{marginTop:10, fontSize:11, opacity:0.6, fontFamily:'monospace', direction:'ltr', textAlign:'right'}}>
                      Chat ID المحفوظ: {tgChatId}
                    </div>
                  )}
                </div>
              )}

              {/* Test button */}
              {tgBotInfo && tgChatId && (
                <button className="btn btn-secondary" style={{marginTop:14, width:'100%'}} onClick={testTg} disabled={tgTesting}>
                  {tgTesting ? 'جارٍ الإرسال...' : '🧪 إرسال رسالة اختبار'}
                </button>
              )}

              <div style={{marginTop:14, fontSize:12, color:'var(--text-muted)', borderTop:'1px dashed var(--border-color)', paddingTop:12}}>
                💡 بعد الربط: أي طلب جديد أو شكوى ستظهر تلقائياً في القناة مع رابط مباشر للمحادثة على الموقع.
              </div>
            </div>

          </div>
        )}

        {/* Tab 4 (System info) removed — not useful in the web app. */}

      </div>
    </div>
  )
}
