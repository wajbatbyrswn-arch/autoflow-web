import { createContext, useContext, useState, useCallback } from 'react'

/**
 * Reusable in-app confirm dialog. Replaces every native `confirm()` call.
 *
 * Usage:
 *   const ask = useConfirm()
 *   const ok = await ask({ title:'حذف؟', message:'هل أنت متأكد؟', rememberKey:'comment_delete', dangerous:true })
 *   if (ok) { ... }
 *
 * When `rememberKey` is set + the user ticks "لا تذكرني مرة أخرى" + confirms,
 * subsequent calls with the same key auto-resolve true without showing UI.
 */

const ConfirmCtx = createContext(null)

const SKIP_PREFIX = 'confirm_skip:'

function isSkipped(rememberKey) {
  if (!rememberKey) return false
  try { return localStorage.getItem(SKIP_PREFIX + rememberKey) === '1' } catch { return false }
}
function setSkipped(rememberKey) {
  if (!rememberKey) return
  try { localStorage.setItem(SKIP_PREFIX + rememberKey, '1') } catch {}
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { opts, resolve }

  const ask = useCallback((opts = {}) => {
    if (isSkipped(opts.rememberKey)) return Promise.resolve(true)
    return new Promise(resolve => setState({ opts, resolve }))
  }, [])

  const close = (result, dontAskAgain) => {
    if (!state) return
    if (result && dontAskAgain) setSkipped(state.opts.rememberKey)
    state.resolve(result)
    setState(null)
  }

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      {state && <ConfirmDialog opts={state.opts} onResult={close} />}
    </ConfirmCtx.Provider>
  )
}

export function useConfirm() {
  const ask = useContext(ConfirmCtx)
  if (!ask) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ask
}

function ConfirmDialog({ opts, onResult }) {
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const {
    title = 'تأكيد', message = '',
    confirmText = 'تأكيد', cancelText = 'إلغاء',
    dangerous = false, rememberKey = null,
  } = opts || {}

  const accent = dangerous ? '#ef4444' : 'var(--accent, #6C47FF)'

  return (
    <div onClick={() => onResult(false, false)} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={card}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background: dangerous ? 'rgba(239,68,68,0.12)' : 'rgba(108,71,255,0.12)', color: accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            {dangerous ? '⚠️' : '❓'}
          </div>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800 }}>{title}</h3>
        </div>

        <div style={{ fontSize:14, color:'var(--text-secondary, #c5cde0)', lineHeight:1.8, marginBottom:18 }}>
          {message}
        </div>

        {rememberKey && (
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)', cursor:'pointer', marginBottom:18, padding:'8px 12px', background:'var(--glass-bg, rgba(255,255,255,0.04))', borderRadius:10, border:'1px solid var(--border-color, #2a2e37)' }}>
            <input type="checkbox" checked={dontAskAgain} onChange={e => setDontAskAgain(e.target.checked)} />
            لا تذكرني مرة أخرى
          </label>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={() => onResult(false, false)} style={{ ...btnBase, background:'var(--glass-bg, rgba(255,255,255,0.06))', color:'var(--text)', border:'1px solid var(--border-color, #2a2e37)' }}>{cancelText}</button>
          <button onClick={() => onResult(true, dontAskAgain)} style={{ ...btnBase, background: accent, color:'#fff', border:'none' }}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
}
const card = {
  background: 'var(--bg-card, #1a1d24)', border: '1px solid var(--border-color, #2a2e37)',
  borderRadius: 18, padding: 26, maxWidth: 440, width: '100%', direction: 'rtl', fontFamily: 'Cairo, sans-serif',
  color: 'var(--text, #fff)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
}
const btnBase = {
  padding: '10px 22px', borderRadius: 10, fontWeight: 800, fontSize: 13.5,
  cursor: 'pointer', fontFamily: 'inherit',
}
