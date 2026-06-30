import { useEffect, useRef, useState } from 'react'
import './Mascot.css'

const MESSAGES = [
  { text: 'مرحباً! أنا AutoBot 👋', color: '#173A7A' },
  { text: 'بردّ على زبائنك 24/7 ⚡', color: '#2DB84C' },
  { text: 'واتساب · فيسبوك · انستغرام', color: '#173A7A' },
  { text: 'بوت ذكاء اصطناعي لمتجرك 🛍️', color: '#FFA51F' },
  { text: 'جرّب مجاناً الآن! 🚀', color: '#2DB84C' },
]

class AutoBot {
  constructor(canvas) {
    this.cv = canvas
    this.ctx = canvas.getContext('2d')
    this.px = 6
    this.speed = 28
    this.x = 80
    this.dir = 1
    this.t = 0
    this.walk = 0
    this.moving = true
    this.pause = 0
    this.blink = 0
    this.nextBlink = 2 + Math.random() * 3
    this.hop = 0
    this.vhop = 0
    this.waveT = 0
    this.last = performance.now()

    this.S = [
      '.....AA.....',
      '.....||.....',
      '..DBBBBBBBD.',
      '.DBBBBBBBBBD',
      '.BBWWBBBBWWB',
      '.DBBBBBBBBBD',
      '..DBmmmmmBD.',
      'BBBBBBBBBBBB',
      'BDBGGBBBBBBD',
      'BBBBBBBBBBBB',
      '.BBBBBBBBBB.',
    ]
    this.W = 12
    this.H = this.S.length
    this.legs = [{ c: 3 }, { c: 8 }]

    this.resize()
    addEventListener('resize', () => this.resize())
    requestAnimationFrame(n => this._frame(n))
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const w = this.cv.clientWidth, h = this.cv.clientHeight
    this.cw = w; this.ch = h
    this.cv.width = Math.round(w * dpr)
    this.cv.height = Math.round(h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.ctx.imageSmoothingEnabled = false
  }

  wave() {
    if (this.hop < 1) this.vhop = 180
    this.waveT = 1.6
  }

  _frame(now) {
    const dt = Math.min((now - this.last) / 1000, 0.05)
    this.last = now
    this._update(dt)
    this._draw()
    requestAnimationFrame(n => this._frame(n))
  }

  _update(dt) {
    this.t += dt
    const p = this.px
    const margin = p * 8
    const minX = margin, maxX = this.cw - margin

    if (this.vhop !== 0 || this.hop > 0) {
      this.hop += this.vhop * dt
      this.vhop -= 520 * dt
      if (this.hop <= 0) { this.hop = 0; this.vhop = 0 }
    }
    if (this.waveT > 0) this.waveT -= dt

    this.blink -= dt
    this.nextBlink -= dt
    if (this.nextBlink <= 0) {
      this.blink = 0.12
      this.nextBlink = 2.5 + Math.random() * 3.5
    }

    if (this.pause > 0) { this.pause -= dt; this.moving = false }
    else {
      this.moving = true
      if (Math.random() < 0.003) this.pause = 0.6 + Math.random()
    }

    if (this.moving) {
      this.x += this.dir * this.speed * dt
      this.walk += dt * (this.speed * 0.18 + 1.8)
      if (this.x < minX) { this.x = minX; this.dir = 1 }
      if (this.x > maxX) { this.x = maxX; this.dir = -1 }
    }
  }

  _px(lx, ly, color) {
    this.ctx.fillStyle = color
    this.ctx.fillRect(Math.round(lx), Math.round(ly), this.px, this.px)
  }

  _draw() {
    const ctx = this.ctx, p = this.px
    const navy = '#173A7A', navyD = '#0f2a5c'
    const green = '#2DB84C', white = '#fff'
    ctx.clearRect(0, 0, this.cw, this.ch)

    const groundY = this.ch - 10
    const originY = groundY - this.hop

    // ظل
    const shrink = 1 - Math.min(this.hop / 80, 0.5)
    ctx.fillStyle = 'rgba(23,58,122,0.15)'
    ctx.beginPath()
    ctx.ellipse(this.x, groundY + p * 0.5, 7 * p * shrink, p * shrink, 0, 0, Math.PI * 2)
    ctx.fill()

    const pulse = (Math.sin(this.t * 2.8) + 1) / 2
    const antBright = 0.5 + pulse * 0.5
    const ledOn = (Math.floor(this.t * 1.8) % 2) === 0

    ctx.save()
    ctx.translate(this.x, originY)
    if (this.dir < 0) ctx.scale(-1, 1)

    const X = c => (c - 5.5) * p
    const Y = r => (r - this.H) * p

    // أرجل
    this.legs.forEach((L, i) => {
      const ph = this.walk + (i ? Math.PI : 0)
      const lift = this.moving ? Math.max(0, Math.sin(ph)) : 0
      const liftPx = Math.round(lift * 1.5)
      const legH = (2 - liftPx) * p
      if (legH > 0) {
        ctx.fillStyle = navyD
        ctx.fillRect(Math.round(X(L.c)), Math.round(Y(this.H)), 2 * p, legH)
      }
    })

    // جسم
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.W; c++) {
        const ch = this.S[r][c]
        if (ch === '.') continue
        let color
        if      (ch === 'B') color = navy
        else if (ch === 'D') color = navyD
        else if (ch === 'W') color = white
        else if (ch === 'm') color = '#2a4d8e'
        else if (ch === '|') color = navyD
        else if (ch === 'A') {
          const v = Math.round(255 * antBright)
          color = `rgb(${v},${Math.round(165 * antBright + 30)},31)`
        }
        else if (ch === 'G') color = ledOn ? green : '#1a5a28'
        else continue
        this._px(X(c), Y(r), color)
      }
    }

    // هالة الهوائي
    if (antBright > 0.6) {
      ctx.fillStyle = `rgba(255,165,31,${(antBright - 0.6) * 0.5})`
      ctx.beginPath()
      ctx.arc(X(5.5) + p, Y(0) + p, p * 2.8, 0, Math.PI * 2)
      ctx.fill()
    }

    // عيون
    if (this.blink > 0) {
      ctx.fillStyle = navyD
      ctx.fillRect(Math.round(X(2)), Math.round(Y(4) + p * 0.4), 2 * p, Math.max(1, p * 0.35))
      ctx.fillRect(Math.round(X(8)), Math.round(Y(4) + p * 0.4), 2 * p, Math.max(1, p * 0.35))
    } else {
      ctx.fillStyle = navyD
      ctx.fillRect(Math.round(X(2.4)), Math.round(Y(4) + p * 0.2), Math.max(2, p * 0.6), Math.max(2, p * 0.6))
      ctx.fillRect(Math.round(X(8.4)), Math.round(Y(4) + p * 0.2), Math.max(2, p * 0.6), Math.max(2, p * 0.6))
    }

    // يد تلويح
    if (this.waveT > 0) {
      const sw = Math.sin((1.6 - this.waveT) * 14) * (14 * p / 5)
      ctx.fillStyle = navy
      const hx = X(10), hy = Y(7) + Math.sin((1.6 - this.waveT) * 5) * p
      ctx.fillRect(Math.round(hx + sw * 0.1), Math.round(hy - p), 2 * p, 2 * p)
      ctx.fillRect(Math.round(hx + sw * 0.15 + p * 1.5), Math.round(hy - p * 2), p, p)
    }

    ctx.restore()
  }
}

export default function Mascot() {
  const canvasRef = useRef(null)
  const botRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!canvasRef.current) return
    botRef.current = new AutoBot(canvasRef.current)
  }, [])

  // تدوير الرسائل كل 3 ثوان
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 3000)
    return () => clearInterval(id)
  }, [])

  const handleClick = () => {
    botRef.current?.wave()
    setOpen(o => !o)
  }

  if (!visible) return null

  const msg = MESSAGES[msgIdx]

  return (
    <div className="mascot-root">
      {/* فقاعة الرسالة */}
      {!open && (
        <div className="mascot-bubble" key={msgIdx} style={{ borderColor: msg.color }}>
          <span style={{ color: msg.color }}>{msg.text}</span>
          <div className="mascot-bubble-tail" style={{ borderTopColor: msg.color }} />
        </div>
      )}

      {/* بطاقة معلومات موسّعة */}
      {open && (
        <div className="mascot-card">
          <button className="mascot-card-close" onClick={() => setOpen(false)}>✕</button>
          <div className="mascot-card-title">🤖 AutoBot — مساعدك الذكي</div>
          <ul className="mascot-card-list">
            <li>⚡ يرد على زبائنك 24/7 بدون توقف</li>
            <li>🛍️ يأخذ الطلبات ويعرف منتجاتك</li>
            <li>📱 واتساب · فيسبوك · انستغرام</li>
            <li>📊 تقارير مبيعات يومية</li>
          </ul>
          <a
            href="#pricing"
            className="mascot-card-cta"
            onClick={() => setOpen(false)}
          >
            🚀 جرّب مجاناً الآن
          </a>
        </div>
      )}

      {/* الروبوت */}
      <div className="mascot-bot-wrap" onClick={handleClick}>
        <canvas ref={canvasRef} className="mascot-canvas" />
        <div className="mascot-pulse" />
      </div>

      {/* زر الإغلاق */}
      <button className="mascot-hide" onClick={() => setVisible(false)} title="إخفاء">×</button>
    </div>
  )
}
