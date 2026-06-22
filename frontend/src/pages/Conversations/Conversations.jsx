import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import './Conversations.css'

import whatsappIcon from '../../assets/icons/whatsapp.png'
import facebookIcon from '../../assets/icons/facebook.png'
import instagramIcon from '../../assets/icons/instagram.png'
import telegramIcon from '../../assets/icons/telegram.png'
import sendIcon from '../../assets/icons/send.png'

const PLATFORM_ICONS = {
  whatsapp: whatsappIcon,
  facebook: facebookIcon,
  instagram: instagramIcon,
  telegram: telegramIcon,
}

const PLATFORM_COLORS = {
  whatsapp: '#25D366',
  facebook: '#1877F2',
  instagram: '#C13584',
  telegram: '#229ED9',
}

const PLATFORMS = [
  { id: 'all', label: 'الكل', icon: null },
  { id: 'whatsapp', label: 'واتساب', icon: whatsappIcon },
  { id: 'facebook', label: 'فيسبوك', icon: facebookIcon },
  { id: 'instagram', label: 'إنستغرام', icon: instagramIcon },
  { id: 'telegram', label: 'تلغرام', icon: telegramIcon },
]

const STATUS_MAP = {
  new: 'جديدة',
  active: 'نشطة',
  completed: 'مكتملة',
  needs_attention: 'تدخل',
}

export default function Conversations() {
  const [convs, setConvs] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Load conversations when platform filter changes
  useEffect(() => { loadConvs() }, [platformFilter])

  // Load messages when selected conversation changes
  useEffect(() => {
    if (selected) loadMessages(selected.id)
  }, [selected])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Lightweight polling fallback (SSE can be flaky across hosts): refresh every 5s.
  useEffect(() => {
    const iv = setInterval(() => {
      loadConvs()
      if (selected) loadMessages(selected.id)
    }, 5000)
    return () => clearInterval(iv)
  }, [selected, platformFilter])

  // Real-time message listeners
  useEffect(() => {
    const onMsg = () => {
      loadConvs()
      if (selected) loadMessages(selected.id)
    }

    window.api?.whatsapp.onMessage(onMsg)
    window.api?.facebook.onMessage(onMsg)
    window.api?.instagram.onMessage(onMsg)
    window.api?.telegram?.onMessage(onMsg)

    return () => {
      window.api?.whatsapp.removeListeners?.()
      // Remove fb/ig/telegram listeners too
      try { window.api?.facebook?.removeListeners?.() } catch {}
      try { window.api?.instagram?.removeListeners?.() } catch {}
      try { window.api?.telegram?.removeListeners?.() } catch {}
    }
  }, [selected])

  async function loadConvs() {
    const filters = platformFilter !== 'all' ? { platform: platformFilter } : {}
    const c = await window.api?.db.getConversations(filters) || []
    setConvs(c)
  }

  async function loadMessages(id) {
    const m = await window.api?.db.getMessages(id) || []
    setMessages(m)
  }

  async function sendReply() {
    if (!reply.trim() || !selected || sending) return
    const msg = reply.trim()
    setReply('')
    setSending(true)

    let res = null
    try {
      if (selected.platform === 'telegram') {
        res = await window.api?.telegram?.sendMessage({ to: selected.sender_id, message: msg })
      } else {
        // facebook / instagram / whatsapp all go through Nashir's inbox reply.
        res = await window.api?.inbox?.reply(selected.id, msg)
      }

      if (res?.success === false) {
        toast.error('فشل الإرسال: ' + (res.error || 'خطأ'))
        setReply(msg) // restore so user can retry
      } else {
        // Small delay then reload to catch DB-saved message
        setTimeout(async () => {
          await loadMessages(selected.id)
          await loadConvs()
        }, 200)
      }
    } catch (e) {
      toast.error('خطأ في الإرسال')
      setReply(msg)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendReply()
    }
  }

  const platformColor = selected ? PLATFORM_COLORS[selected.platform] : null

  return (
    <div className="conv-layout animate-fade">
      {/* Left panel */}
      <div className="conv-list-panel">
        <div className="conv-list-header">
          <h2>المحادثات</h2>
          <span className="conv-count">{convs.length}</span>
        </div>

        {/* Platform filter tabs */}
        <div className="platform-tabs">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              className={`platform-tab ${platformFilter === p.id ? 'active' : ''}`}
              style={platformFilter === p.id && p.id !== 'all' ? { borderColor: PLATFORM_COLORS[p.id], color: PLATFORM_COLORS[p.id] } : {}}
              onClick={() => setPlatformFilter(p.id)}
            >
              {p.icon && <img src={p.icon} alt={p.label} className="ptab-icon" />}
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <div className="conv-list">
          {convs.length === 0 ? (
            <div className="empty-state">
              <p>لا توجد محادثات</p>
              <span style={{fontSize:12, color:'var(--text-muted)'}}>
                {platformFilter !== 'all' ? `لا توجد محادثات ${PLATFORMS.find(p=>p.id===platformFilter)?.label}` : 'ستظهر المحادثات هنا عند ورود رسائل'}
              </span>
            </div>
          ) : convs.map(c => (
            <div
              key={c.id}
              className={`conv-item ${selected?.id === c.id ? 'active' : ''}`}
              onClick={() => setSelected(c)}
            >
              <div
                className="conv-avatar"
                style={{ borderColor: PLATFORM_COLORS[c.platform] || 'var(--border-color)' }}
              >
                <img src={PLATFORM_ICONS[c.platform]} alt={c.platform} className="conv-platform-img" />
              </div>
              <div className="conv-info">
                <div className="conv-name">{c.sender_name || c.sender_id}</div>
                <div className="conv-last">{c.last_message?.slice(0, 45) || '...'}</div>
              </div>
              <div className="conv-meta">
                <span className={`badge ${
                  c.status === 'active' ? 'badge-success' :
                  c.status === 'needs_attention' ? 'badge-warning' :
                  c.status === 'new' ? 'badge-info' : 'badge-default'
                }`} style={{fontSize:10}}>
                  {STATUS_MAP[c.status] || c.status}
                </span>
                {c.last_message_at && (
                  <div style={{fontSize:10,color:'var(--text-muted)',marginTop:4}}>
                    {new Date(c.last_message_at).toLocaleTimeString('ar', {hour:'2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: chat panel */}
      <div className="chat-panel">
        {!selected ? (
          <div className="empty-state" style={{height:'100%', flexDirection:'column', gap:12}}>
            <div style={{fontSize:48, opacity:0.3}}>💬</div>
            <p>اختر محادثة من القائمة</p>
            <span style={{fontSize:12, color:'var(--text-muted)'}}>ستظهر الرسائل هنا</span>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header" style={{borderBottom: `2px solid ${platformColor}22`}}>
              <div className="flex items-center gap-3">
                <div className="chat-avatar" style={{background: `${platformColor}22`, border:`1px solid ${platformColor}44`}}>
                  <img src={PLATFORM_ICONS[selected.platform]} alt={selected.platform} className="chat-header-img" />
                </div>
                <div>
                  <div style={{fontWeight:700, fontSize:15}}>{selected.sender_name || selected.sender_id}</div>
                  <div style={{fontSize:11, color: platformColor, display:'flex', alignItems:'center', gap:4}}>
                    <span style={{width:6, height:6, borderRadius:'50%', background: platformColor, display:'inline-block'}}></span>
                    {selected.platform} · {STATUS_MAP[selected.status] || selected.status}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <span style={{fontSize:11, color:'var(--text-muted)', background:'var(--glass-bg)', padding:'4px 10px', borderRadius:20, border:'1px solid var(--border-color)'}}>
                  ID: {selected.sender_id}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-state" style={{height:'100%'}}>
                  <p style={{color:'var(--text-muted)', fontSize:13}}>لا توجد رسائل بعد</p>
                </div>
              ) : messages.map((m, i) => {
                // customer = incoming (right). assistant = AI reply (left, green). agent = manual reply (left, blue).
                const cls = m.sender === 'customer' ? 'incoming' : (m.sender === 'assistant' ? 'ai' : 'agent')
                return (
                  <div key={i} className={`msg-bubble ${cls}`}>
                    {m.sender === 'assistant' && <span className="msg-tag">🤖 رد ذكي</span>}
                    {m.sender === 'agent' && <span className="msg-tag">👤 ردّك</span>}
                    <div className="msg-text">{m.content}</div>
                    <div className="msg-time">
                      {new Date(m.created_at).toLocaleTimeString('ar', {hour:'2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="chat-input-row">
              <input
                ref={inputRef}
                className="input"
                style={{flex:1}}
                placeholder="اكتب ردًا... (Enter للإرسال)"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button
                className="btn btn-primary flex-center"
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                style={{background: platformColor || undefined, opacity: sending ? 0.7 : 1}}
              >
                {sending ? (
                  <span style={{display:'inline-block', animation:'spin 1s linear infinite'}}>↻</span>
                ) : (
                  <img src={sendIcon} className="btn-img-icon" alt="إرسال" />
                )}
                {sending ? 'جارٍ...' : 'إرسال'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
