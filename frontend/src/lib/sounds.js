/**
 * Simple notification chimes. Two flavours:
 *  - 'notify'    : new order or info notification (cheerful chime)
 *  - 'complaint' : urgent complaint (sharper, more attention-grabbing)
 *
 * Audio is synthesized with WebAudio (no asset files needed, fast load,
 * works offline). Respects a localStorage mute flag.
 */

const MUTE_KEY = 'notification_muted'

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
}
export function setMuted(v) {
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0') } catch {}
}

let ctx = null
function getCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  }
  return ctx
}

function tone(ctx, freq, startOffset, duration, gain = 0.18) {
  const now = ctx.currentTime + startOffset
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(gain, now + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(g); g.connect(ctx.destination)
  osc.start(now); osc.stop(now + duration + 0.05)
}

export function play(kind) {
  if (isMuted()) return
  const c = getCtx(); if (!c) return
  // Resume context (browsers suspend it until first user gesture).
  if (c.state === 'suspended') c.resume().catch(() => {})

  if (kind === 'complaint') {
    // Two sharp descending tones — urgent.
    tone(c, 880, 0,    0.18, 0.22)
    tone(c, 660, 0.16, 0.22, 0.22)
    tone(c, 880, 0.42, 0.18, 0.22)
  } else {
    // Pleasant two-note chime — major third up.
    tone(c, 659.25, 0,    0.20, 0.18) // E5
    tone(c, 880,    0.14, 0.28, 0.18) // A5
  }
}
