import * as THREE from 'three'
import gsap from 'gsap'
import { cardVert, cardFrag } from './gl/shaders.js'
import { createSheet } from './gl/sheet.js'

const lerp = (a, b, t) => a + (b - a) * t
const wrap = (v, lo, hi) => {
  const r = hi - lo
  return ((((v - lo) % r) + r) % r) + lo
}

// The infinite strip: layout, input, per-frame card + title placement, hit-testing.
export class Track {
  constructor(engine, projects, covers, titleRoot) {
    this.engine = engine
    this.t = 0
    this.a = 0
    this.vel = 0
    this.enabled = false
    this.hovered = null
    this.pointer = { x: -1, y: -1, inside: false }
    this.sheetState = { W: 1, V: 0, C: 1, lean: -0.12 }
    this.sheetJS = createSheet(this.sheetState)

    const geo = new THREE.PlaneGeometry(1, 1, 48, 24)
    this.cards = projects.map((p, i) => {
      const tex = new THREE.CanvasTexture(covers[i])
      tex.anisotropy = 8
      tex.minFilter = THREE.LinearMipmapLinearFilter
      const u = {
        ...engine.sheetU,
        u_map: { value: tex },
        u_img: { value: new THREE.Vector2(covers[i].width, covers[i].height) },
        u_size: { value: new THREE.Vector2(1, 1) },
        u_radius: { value: 0.04 },
        u_alpha: { value: 0 },
        u_shade: { value: 1 },
        u_spread: { value: 1 },
        u_scrim: { value: 1 },
        u_white: { value: 0 },
        u_sheetP: { value: 1 },
        u_hover: { value: 0 },
        u_dent: { value: 0.1 },
      }
      const mesh = new THREE.Mesh(
        geo,
        new THREE.ShaderMaterial({ vertexShader: cardVert, fragmentShader: cardFrag, uniforms: u, transparent: true, side: THREE.DoubleSide, extensions: {} }),
      )
      mesh.layers.enable(1)
      mesh.frustumCulled = false
      engine.scene.add(mesh)

      const title = document.createElement('div')
      title.className = 'card-title'
      title.innerHTML = `<span class="name"></span>`
      title.querySelector('.name').textContent = p.title
      const arrow = document.createElement('div')
      arrow.className = 'card-title card-arrow'
      arrow.innerHTML = '<span class="arrow">→</span>'
      titleRoot.append(title, arrow)

      return { p, i, mesh, u, title, arrow, w: 0, h: 0, base: 0, x: 0, offX: 0, intro: 0, fly: null, hit: [] }
    })
    this.#bindInput()
  }

  layout() {
    const { ww, wh } = this.engine
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    this.small = ww < 650
    this.rem = rem
    const gap = rem
    let x = 0
    for (const c of this.cards) {
      if (this.small) {
        c.w = ww - 4 * rem
        c.h = Math.min(c.w / c.p.ratio, wh * 0.6)
        c.w = c.h * c.p.ratio
      } else {
        c.h = Math.min(wh * 0.435, 55 * rem)
        c.w = c.h * c.p.ratio
      }
      c.base = x + c.w / 2
      x += c.w + gap
    }
    this.total = x
    this.radius = 2 * rem
    this.sheetState.C = 1
    this.engine.sheetU.u_C.value = this.sheetState.C
    for (const c of this.cards) c.u.u_spread.value = this.small ? 0.6 : 1
    this.engine.layoutFloor(Math.max(...this.cards.map((c) => c.h)))
    if (!this.started) {
      this.a = this.t = this.cards[0].base
      this.started = true
    }
  }

  // ---------------- input ----------------
  push(d) {
    if (!this.enabled) return
    this.t += d
    const ww = this.engine.ww
    this.t = this.a + Math.tanh((this.t - this.a) / ww) * ww
  }

  #bindInput() {
    let last = 0
    let lastFast = 0
    this.notch = 0
    window.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.engine.wh : 1
        const d = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * k * 1.25
        const now = performance.now()
        const dt = now - last
        last = now
        if (dt < 30) lastFast = now
        if (Math.abs(d) >= 40 && dt >= 30 && now - lastFast >= 500) this.notch += d * 2
        else this.push(d)
      },
      { passive: false },
    )

    window.addEventListener('keydown', (e) => {
      const wh = this.engine.wh
      const map = { ArrowRight: 100, ArrowDown: 100, ArrowLeft: -100, ArrowUp: -100, PageDown: 0.9 * wh, PageUp: -0.9 * wh, ' ': 0.9 * wh }
      if (map[e.key] !== undefined && this.enabled) {
        e.preventDefault()
        this.push(e.shiftKey && e.key === ' ' ? -map[e.key] : map[e.key])
      }
    })

    // drag (mouse) and swipe (touch) share one path with different gains
    let drag = null
    window.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a,button,.panel')) return
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, on: false, last: 0, t: 0, touch: e.pointerType !== 'mouse' }
    })
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = e.clientX
      this.pointer.y = e.clientY
      this.pointer.inside = true
      if (!drag) return
      const dx = e.clientX - drag.x
      if (!drag.on && Math.abs(e.clientX - drag.sx) > 10 && Math.abs(e.clientX - drag.sx) > Math.abs(e.clientY - drag.sy)) {
        drag.on = true
        document.documentElement.classList.add('grabbing')
      }
      if (drag.on) {
        const d = -dx * (drag.touch ? 3.25 : 1.5)
        this.push(d)
        drag.last = d
        drag.t = performance.now()
      }
      drag.x = e.clientX
      drag.y = e.clientY
    })
    const end = () => {
      if (!drag) return
      if (drag.on) {
        if (drag.touch) this.push(drag.last * 35 / 3.25)
        else if (performance.now() - drag.t < 100) this.push(drag.last * 12)
        this.suppressClick = true
        setTimeout(() => (this.suppressClick = false), 0)
      }
      document.documentElement.classList.remove('grabbing')
      drag = null
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    document.addEventListener('pointerleave', () => (this.pointer.inside = false))
  }

  // ---------------- frame ----------------
  update(ratio) {
    if (this.notch) {
      const k = 1 - Math.pow(1 - 0.22, ratio)
      const d = this.notch * k
      this.notch -= d
      if (Math.abs(this.notch) < 0.5) this.notch = 0
      this.push(d)
    }
    this.a = lerp(this.a, this.t, Math.min(1, 0.1 * ratio))
    this.a = Math.round(this.a * 100) / 100
    const v = this.t - this.a
    const tv = Math.tanh(v / (this.small ? 245 : 550))
    this.vel = tv * Math.abs(tv)
    const V = Math.min(1, Math.abs(this.vel))
    this.engine.sheetU.u_V.value = V
    this.sheetState.V = V
    this.sheetState.W = this.engine.ww / 2

    const span = this.total
    for (const c of this.cards) {
      c.x = wrap(c.base - this.a, -span / 2, span / 2)
      const f = c.fly
      // fading cards must not punch depth holes; the flying card always wins
      c.mesh.material.depthWrite = !f && c.u.u_alpha.value > 0.99
      c.mesh.material.depthTest = !f
      c.mesh.renderOrder = f ? 10 : 0
      if (f) {
        c.mesh.position.set(f.x, f.y, 0)
        c.mesh.scale.set(f.w, f.h, 1)
        c.u.u_size.value.set(f.w, f.h)
        c.u.u_radius.value = f.r / f.h
      } else {
        c.mesh.position.set(c.x + c.offX, 0, 0)
        c.mesh.scale.set(c.w, c.h, 1)
        c.u.u_size.value.set(c.w, c.h)
        c.u.u_radius.value = this.radius / c.h
      }
      this.#placeTitle(c)
    }
    this.#hover()
  }

  // bottom-left title and bottom-right arrow ride on the deformed card
  #placeTitle(c) {
    const P = c.u.u_sheetP.value
    const cx = c.mesh.position.x
    const cy = c.mesh.position.y
    const w = c.mesh.scale.x
    const h = c.mesh.scale.y
    const insetX = 2 * this.rem
    const insetY = 1 * this.rem
    const vis = c.u.u_alpha.value * c.u.u_scrim.value

    const bl = this.sheetJS(cx - w / 2 + insetX, cy - h / 2 + insetY, 0, P)
    const br = this.sheetJS(cx + w / 2 - insetX, cy - h / 2 + insetY, 0, P)
    const a = this.engine.project(...bl, this._pa || (this._pa = {}))
    const b = this.engine.project(...br, this._pb || (this._pb = {}))
    const onScreen = a.x < this.engine.ww + 50 && b.x > -50 && vis > 0.01
    c.title.style.opacity = onScreen ? vis : 0
    c.arrow.style.opacity = onScreen ? vis : 0
    if (!onScreen) return
    const ang = Math.atan2(b.y - a.y, b.x - a.x)
    c.title.style.transform = `translate3d(${a.x}px, ${a.y}px, 0) translateY(-100%) rotate(${ang}rad) scale(${a.s})`
    c.title.style.transformOrigin = '0 100%'
    c.arrow.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) translate(-100%, -100%) rotate(${ang}rad) scale(${b.s})`
    c.arrow.style.transformOrigin = '100% 100%'

    // perimeter polygon for hit-testing
    const pts = []
    const N = 6
    for (let k = 0; k <= N; k++) pts.push(this.sheetJS(cx - w / 2 + (w * k) / N, cy - h / 2, 0, P))
    for (let k = 0; k <= N; k++) pts.push(this.sheetJS(cx + w / 2 - (w * k) / N, cy + h / 2, 0, P))
    c.hit = pts.map((p) => {
      const s = this.engine.project(...p)
      return [s.x, s.y]
    })
  }

  cardAt(x, y) {
    let best = null
    for (const c of this.cards) {
      if (c.u.u_alpha.value < 0.5 || !inPoly(x, y, c.hit)) continue
      if (!best || Math.abs(c.x) < Math.abs(best.x)) best = c
    }
    return best
  }

  #hover() {
    const fine = matchMedia('(hover: hover)').matches
    const c = fine && this.enabled && this.pointer.inside ? this.cardAt(this.pointer.x, this.pointer.y) : null
    if (c === this.hovered) return
    if (this.hovered) {
      gsap.to(this.hovered.u.u_hover, { value: 0, duration: 0.5, ease: 'expo.out' })
      this.hovered.arrow.classList.remove('is-hover')
    }
    this.hovered = c
    if (c) {
      gsap.to(c.u.u_hover, { value: 1, duration: 0.5, ease: 'expo.out' })
      c.arrow.classList.add('is-hover')
    }
    document.querySelector('.cursor')?.classList.toggle('is-hover', !!c)
  }

  // the card's current flat pose on the strip, in world px
  pose(c) {
    return { x: c.x, y: 0, w: c.w, h: c.h, r: this.radius }
  }

  // cards slide in from either side, nearest first
  intro(delay = 0) {
    const W = this.engine.ww / 2
    const order = [...this.cards].sort((p, q) => Math.abs(p.x) - Math.abs(q.x))
    order.forEach((c, k) => {
      c.offX = (c.x >= 0 ? 1 : -1) * W * 0.5
      gsap.to(c, { offX: 0, duration: 1.25, ease: 'expo.out', delay: delay + k * 0.05 })
      gsap.to(c.u.u_alpha, { value: 1, duration: 0.625, ease: 'power2.out', delay: delay + k * 0.05 })
    })
  }
}

function inPoly(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
