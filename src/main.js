import './style.css'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { Engine } from './gl/engine.js'
import { Track } from './track.js'
import { drawCover } from './covers.js'
import { owner, projects, archive, experience, education } from './data.js'

gsap.registerPlugin(CustomEase)
// strong expo-like in-out used for every big move
CustomEase.create('ro', 'M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348,0.884 0.42,0.949 0.374,1 1,1')

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const html = document.documentElement
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches

const state = { view: 'featured', profile: false, panel: null, busy: false }
const OVERLAYS = { full: '.index', experience: '.experience', contact: '.contact' }
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')

// ---------- static content ----------
function fillContent() {
  $('#sr').innerHTML =
    `<h1>${owner.name}</h1><p>${owner.bio}</p><h2>Selected work</h2><ul>${[...projects, ...archive]
      .map((p) => `<li><a href="${p.url}">${p.title}</a>. ${p.desc}</li>`)
      .join('')}</ul>` +
    `<h2>Experience</h2><ul>${experience.map((x) => `<li>${x.title}, ${x.org}, ${x.dates}. ${x.bullets.join(' ')}</li>`).join('')}</ul>` +
    `<h2>Contact</h2><p><a href="mailto:${owner.email}">${owner.email}</a></p>`

  const bio = $('.profile-bio')
  bio.innerHTML = owner.bio
    .split(' ')
    .map((w) => `<span class="reveal">${w}</span>`)
    .join(' ')
  $('.profile-stats').innerHTML = `<span class="reveal">${owner.stats}</span>`
  $('.profile-links').innerHTML = owner.links
    .map((l) => `<li><a class="label reveal" href="${l.url}" target="_blank" rel="noopener" data-hover>${l.label}</a></li>`)
    .join('')

  const row = (p, i, inner) =>
    `<span class="label">${String(i + 1).padStart(2, '0')}</span><span class="idx-title">${p.title}</span><span class="label idx-tags">${p.tags.join(' · ')}</span><span class="label">${p.year}</span>`
  $('.index-list').innerHTML =
    projects.map((p, i) => `<li><button class="index-row row-anim" type="button" data-i="${i}" data-hover>${row(p, i)}</button></li>`).join('') +
    `<li class="idx-sep"><span class="label row-anim">MORE</span></li>` +
    archive
      .map((p, i) => `<li><a class="index-row row-anim" href="${p.url}" target="_blank" rel="noopener" title="${esc(p.desc)}" data-hover>${row(p, projects.length + i)}</a></li>`)
      .join('')

  $('.ov-cv').href = owner.resume
  const xp = (x) =>
    `<li><div class="xp-row row-anim"><span class="label xp-dates">${x.dates}${x.loc ? ` · ${x.loc}` : ''}</span><div><div class="xp-org">${x.org}</div><div class="label xp-title">${x.title}</div></div>${
      x.bullets ? `<ul class="xp-bullets">${x.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : '<span></span>'
    }</div></li>`
  $('.xp-list:not(.xp-edu)').innerHTML = experience.map(xp).join('')
  $('.xp-edu').innerHTML = education.map(xp).join('')

  const em = $('.ct-email')
  em.href = `mailto:${owner.email}`
  em.textContent = owner.email
  $('.ct-now').textContent = owner.now
  $('.ct-links').innerHTML = owner.links
    .map((l) => `<li><a class="label row-anim" href="${l.url}" target="_blank" rel="noopener" data-hover>${l.label} ↗</a></li>`)
    .join('')

  gsap.set('.row-anim', { yPercent: 105 })
}

// Real screenshot -> canvas, so the GL side sees the same thing as a drawn cover.
function loadCover(src, ratio) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 1600
      c.height = Math.round(1600 / ratio)
      const ctx = c.getContext('2d')
      const s = Math.max(c.width / img.width, c.height / img.height)
      ctx.drawImage(img, 0, 0, img.width * s, img.height * s)
      resolve(c)
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// ---------- boot ----------
const engine = new Engine($('.gl'))
let track

async function boot() {
  fillContent()
  const bars = $$('.loader-bar')
  const count = $('.loader-count')
  const prog = { p: 0 }
  const show = () => {
    bars.forEach((b, i) => b.style.setProperty('--p', Math.min(1, Math.max(0, prog.p * bars.length - i))))
    count.textContent = Math.round(prog.p * 100)
  }

  await Promise.race([
    Promise.all([document.fonts.load('400 40px "Instrument Serif"'), document.fonts.load('500 40px "Inter Tight"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ])

  const covers = []
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i]
    const real = p.covers ? await loadCover(p.covers[0], p.ratio) : null
    covers.push(real || drawCover({ ...p, art: p.art || 'mono' }, 0))
    gsap.to(prog, { p: (i + 1) / projects.length, duration: 0.25, onUpdate: show })
    await new Promise((r) => requestAnimationFrame(r))
  }

  track = new Track(engine, projects, covers, $('.titles'))
  track.layout()
  bindUI()
  gsap.ticker.add(tick)

  await new Promise((r) => gsap.delayedCall(0.35, r))
  const tl = gsap.timeline()
  tl.to('.loader', { autoAlpha: 0, duration: 0.6, ease: 'power2.out' })
  tl.to('.chrome', { opacity: 1, duration: 0.8, stagger: 0.06, ease: 'power2.out' }, 0.75)
  tl.to(engine.floorU.u_alpha, { value: 1, duration: 1.1, ease: 'power2.out' }, 0.9)
  tl.add(() => track.intro(), 0.5)
  tl.add(() => {
    track.enabled = true
    const slug = location.hash.replace('#/', '')
    const c = track.cards.find((c) => c.p.slug === slug)
    if (c) openPanel(c)
    else if (slug === 'index') setView('full')
    else if (OVERLAYS[slug]) setView(slug)
    else if (slug === 'profile') toggleProfile(true)
  }, 1.4)
}

// ---------- cursor ball (trail height field) ----------
const ball = { p: 0, x: 0, y: 0, sx: 0, sy: 0, e: 0, w: 1, seen: false }
const cursorEl = $('.cursor')

function updateBall(dt) {
  const k = 1 - Math.exp(-7 * dt)
  ball.sx += (ball.x - ball.sx) * k
  ball.sy += (ball.y - ball.sy) * k
  const d = Math.hypot(ball.x - ball.sx, ball.y - ball.sy) / engine.ww
  const p = Math.tanh(Math.max(0, d - 0.025) / 0.08)
  const amp = reduced ? 0 : p * p
  ball.e = Math.max(ball.e * Math.exp(-4 * dt), amp)
  engine.trailOn = ball.e > 0.004

  // shield: the dent nearly vanishes over readable text
  let dist = Infinity
  for (const el of $$('[data-gl-shield]')) {
    if (el.closest('[inert]')) continue
    const r = el.getBoundingClientRect()
    const dx = Math.max(r.left - ball.sx, 0, ball.sx - r.right)
    const dy = Math.max(r.top - ball.sy, 0, ball.sy - r.bottom)
    dist = Math.min(dist, Math.hypot(dx, dy))
  }
  const lim = 0.03 * engine.ww
  const target = dist < lim ? 0.03 + 0.97 * (dist / lim) : 1
  ball.w += (target - ball.w) * (1 - Math.exp(-10 * dt))

  const hp = engine.postU.u_holeP.value
  engine.stepTrail(dt, { x: ball.sx / engine.ww, y: 1 - ball.sy / engine.wh }, amp)
  engine.postU.u_ballA.value = engine.trailOn ? ball.p : 0
  engine.postU.u_ballWarp.value = -0.045 * ball.w * (1 - hp)
  engine.postU.u_ballShade.value = -1.2 * ball.w * (1 - hp)
}

// ---------- profile: the black hole ----------
let holeClock = 0
function toggleProfile(open = !state.profile) {
  if (state.busy || open === state.profile) return
  if (state.panel) return
  state.profile = open
  html.classList.toggle('profile-open', open)
  $('.profile-toggle').setAttribute('aria-expanded', open)
  const prof = $('.profile')
  const u = engine.postU
  gsap.killTweensOf([u.u_holeP, u.u_holeSq])
  if (open) {
    prof.inert = false
    track.enabled = false
    const disc = $('.profile-inner').getBoundingClientRect()
    u.u_holeC.value.set((disc.left + disc.width / 2) / engine.ww, 1 - (disc.top + disc.height / 2) / engine.wh)
    u.u_holeR.value = disc.width / 2 / engine.ww
    holeClock = 0
    gsap.to('.titles', { autoAlpha: 0, duration: 0.3 })
    u.u_holeSq.value = 0.12
    gsap.to(u.u_holeSq, { value: 0, duration: 0.3, ease: 'power2.out' })
    gsap.to(u.u_holeP, { value: 1, duration: reduced ? 0.01 : 0.85, ease: 'ro' })
    gsap.fromTo(
      '.profile .reveal',
      { opacity: 0, filter: 'blur(6px)', y: 6 },
      { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.012, delay: 0.35 },
    )
  } else {
    prof.inert = true
    gsap.to('.titles', { autoAlpha: 1, duration: 0.5, delay: 0.5 })
    gsap.to('.profile .reveal', { opacity: 0, filter: 'blur(4px)', duration: 0.25, stagger: 0.003 })
    gsap.to(u.u_holeSq, { value: -0.1, duration: 0.25, ease: 'power2.out' })
    gsap.to(u.u_holeP, {
      value: 0,
      duration: reduced ? 0.01 : 0.65,
      ease: 'ro',
      delay: 0.1,
      onComplete: () => {
        u.u_holeSq.value = 0
        if (state.view === 'featured') track.enabled = true
      },
    })
  }
}

// ---------- project panel: the card flies, flattens and washes white ----------
function panelRect() {
  const g = parseFloat(getComputedStyle(html).getPropertyValue('--gutter')) || 20
  const small = engine.ww < 650
  const gx = small ? g * 0.6 : g
  return { left: gx, top: gx, width: engine.ww - gx * 2, height: engine.wh - gx * 2 }
}
const rectToWorld = (r, radius) => ({
  x: r.left + r.width / 2 - engine.ww / 2,
  y: engine.wh / 2 - (r.top + r.height / 2),
  w: r.width,
  h: r.height,
  r: radius,
})

function fillPanel(p) {
  const panel = $('.panel')
  $('.panel-title', panel).textContent = p.title
  $('.panel-desc', panel).textContent = p.desc
  $('.panel-tags', panel).innerHTML =
    `<span class="dot"></span>` + [p.year, ...p.tags].map((t) => `<span class="pill">${t}</span>`).join('') + (p.award ? '<span class="trophy" title="Featured">🏆</span>' : '')
  const links = [p.live && { label: 'Live site ↗', url: p.live }, { label: 'GitHub ↗', url: p.url }].filter(Boolean)
  $('.panel-links', panel).innerHTML = links
    .map((l) => `<a class="panel-link label" href="${l.url}" target="_blank" rel="noopener" data-hover>${l.label}</a>`)
    .join('')
  const sec = (h, body) => (body ? `<h3>${h}</h3>${body}` : '')
  $('.panel-writeup', panel).innerHTML =
    sec('Why I built it', p.why && `<p>${p.why}</p>`) +
    sec('What it does', p.what && `<p>${p.what}</p>`) +
    sec("How it's built", p.how && `<p>${p.how}</p>`) +
    sec('Decisions worth noting', p.notes && `<ul>${p.notes.map((n) => `<li>${n}</li>`).join('')}</ul>`) +
    sec('Stack', p.stack && `<p class="panel-stack">${p.stack}</p>`)
  const media = $('.panel-media', panel)
  media.innerHTML = ''
  if (p.covers) {
    p.covers.forEach((src, v) => {
      const img = new Image()
      img.alt = `${p.title} screenshot ${v + 1}`
      img.decoding = 'async'
      img.src = src
      media.append(img)
    })
  } else {
    for (let v = 0; v < 3; v++) {
      const img = new Image()
      img.alt = `${p.title} view ${v + 1}`
      img.decoding = 'async'
      img.src = drawCover({ ...p, art: p.art || 'mono' }, v, 1400).toDataURL('image/jpeg', 0.86)
      media.append(img)
    }
  }
  panel.querySelector('.panel-scroll').scrollTop = 0
}

function openPanel(c, fromRect) {
  if (state.busy || state.panel) return
  if (state.profile) toggleProfile(false)
  state.busy = true
  state.panel = { c, fromRect }
  track.enabled = false
  history.replaceState(null, '', `#/${c.p.slug}`)
  fillPanel(c.p)
  gsap.to(c.u.u_hover, { value: 0, duration: 0.4 })

  const to = rectToWorld(panelRect(), 20)
  const from = fromRect ? rectToWorld(fromRect, 4) : track.pose(c)
  c.fly = { ...from }
  if (fromRect) {
    c.u.u_sheetP.value = 0
    c.u.u_white.value = 1
    c.u.u_shade.value = 0
    c.u.u_scrim.value = 0
    gsap.to(c.u.u_alpha, { value: 1, duration: 0.3 })
  }
  const d = reduced ? 0.01 : 1
  const tl = gsap.timeline({
    onComplete: () => {
      const panel = $('.panel')
      const r = panelRect()
      gsap.set(panel, { left: r.left, top: r.top, width: r.width, height: r.height, visibility: 'visible' })
      panel.inert = false
      gsap.to(['.panel-meta', '.panel-media', '.panel-close'], { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'expo.out' })
      gsap.fromTo('.panel-media img', { y: 40 }, { y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' })
      $('.panel-close').focus({ preventScroll: true })
      state.busy = false
    },
  })
  tl.to(c.fly, { ...to, duration: d, ease: 'ro' }, 0)
  tl.to(c.u.u_sheetP, { value: 0, duration: d, ease: 'ro' }, 0)
  tl.to(c.u.u_white, { value: 1, duration: d * 0.8, ease: 'power2.inOut' }, 0.1)
  tl.to(c.u.u_shade, { value: 0, duration: d, ease: 'ro' }, 0)
  tl.to(c.u.u_scrim, { value: 0, duration: d * 0.4 }, 0)
  for (const o of track.cards) if (o !== c) tl.to(o.u.u_alpha, { value: 0, duration: 0.5, ease: 'power2.out' }, 0)
  tl.to(engine.floorU.u_alpha, { value: 0, duration: 0.6 }, 0)
}

function closePanel() {
  if (state.busy || !state.panel) return
  state.busy = true
  const { c, fromRect } = state.panel
  history.replaceState(null, '', location.pathname)
  const panel = $('.panel')
  gsap.to(['.panel-meta', '.panel-media', '.panel-close'], {
    opacity: 0,
    duration: 0.25,
    onComplete: () => {
      gsap.set(panel, { visibility: 'hidden' })
      panel.inert = true
      fly()
    },
  })

  function fly() {
    const d = reduced ? 0.01 : 1
    const backToIndex = state.view === 'full' && fromRect
    const to = backToIndex ? rectToWorld($(`.index-row[data-i="${c.i}"]`).getBoundingClientRect(), 4) : track.pose(c)
    const tl = gsap.timeline({
      onComplete: () => {
        c.fly = null
        state.panel = null
        state.busy = false
        if (state.view === 'featured') track.enabled = true
        else {
          c.u.u_sheetP.value = 1
          c.u.u_white.value = 0
          c.u.u_shade.value = 1
          c.u.u_scrim.value = 1
        }
      },
    })
    tl.to(c.fly, { ...to, duration: d, ease: 'ro' }, 0)
    if (backToIndex) {
      tl.to(c.u.u_alpha, { value: 0, duration: 0.4 }, d * 0.6)
      return
    }
    tl.to(c.u.u_sheetP, { value: 1, duration: d, ease: 'ro' }, 0)
    tl.to(c.u.u_white, { value: 0, duration: d * 0.7, ease: 'power2.inOut' }, 0.1)
    tl.to(c.u.u_shade, { value: 1, duration: d, ease: 'ro' }, 0)
    tl.to(c.u.u_scrim, { value: 1, duration: d * 0.5 }, d * 0.5)
    for (const o of track.cards) if (o !== c) tl.to(o.u.u_alpha, { value: 1, duration: 0.6, ease: 'power2.out' }, d * 0.35)
    tl.to(engine.floorU.u_alpha, { value: 1, duration: 0.8 }, d * 0.4)
  }
}

// ---------- views: featured strip, full index, experience, contact ----------
function showOverlay(v, delay) {
  const el = $(OVERLAYS[v])
  el.inert = false
  el.style.visibility = 'visible'
  const rows = $$('.row-anim', el)
  gsap.fromTo(rows, { yPercent: 105 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: Math.min(0.045, 0.6 / rows.length), delay })
}
function hideOverlay(v) {
  const el = $(OVERLAYS[v])
  el.inert = true
  gsap.to($$('.row-anim', el), { yPercent: -105, duration: 0.5, ease: 'expo.in', stagger: 0.015, onComplete: () => (el.style.visibility = 'hidden') })
}
function setView(v) {
  if (state.busy || state.panel || v === state.view) return
  if (state.profile) toggleProfile(false)
  const prev = state.view
  state.view = v
  $$('.view-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.view === v))
  if (prev === 'featured') {
    track.enabled = false
    track.cards.forEach((c, k) => gsap.to(c.u.u_alpha, { value: 0, duration: 0.5, delay: k * 0.02 }))
    gsap.to(engine.floorU.u_alpha, { value: 0, duration: 0.5 })
    gsap.to('.titles', { autoAlpha: 0, duration: 0.3 })
  } else hideOverlay(prev)
  if (v === 'featured') {
    gsap.to(engine.floorU.u_alpha, { value: 1, duration: 1, delay: 0.4 })
    gsap.to('.titles', { autoAlpha: 1, duration: 0.5, delay: 0.5 })
    gsap.delayedCall(0.45, () => {
      track.intro()
      track.enabled = true
    })
  } else showOverlay(v, prev === 'featured' ? 0.2 : 0.45)
}

// ---------- ui wiring ----------
function bindUI() {
  $('.profile-toggle').addEventListener('click', () => toggleProfile())
  $('.panel-close').addEventListener('click', closePanel)
  $$('.view-btn').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)))
  $('.index-list').addEventListener('click', (e) => {
    const row = e.target.closest('.index-row')
    if (!row) return
    openPanel(track.cards[+row.dataset.i], row.getBoundingClientRect())
  })

  window.addEventListener('click', (e) => {
    if (track.suppressClick || e.target.closest('a,button,.panel')) return
    if (state.profile) {
      const r = $('.profile-inner').getBoundingClientRect()
      const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom
      if (!inside) toggleProfile(false)
      return
    }
    if (state.view !== 'featured' || state.panel) return
    const c = track.cardAt(e.clientX, e.clientY)
    if (c) openPanel(c)
  })

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (state.panel) closePanel()
    else if (state.profile) toggleProfile(false)
    else if (state.view === 'full') setView('featured')
  })

  window.addEventListener('pointermove', (e) => {
    ball.x = e.clientX
    ball.y = e.clientY
    if (!ball.seen) {
      ball.sx = ball.x
      ball.sy = ball.y
      ball.seen = true
    }
    if (fine) gsap.to(ball, { p: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
    gsap.set(cursorEl, { x: e.clientX, y: e.clientY })
    const hot = e.target.closest('[data-hover]')
    cursorEl.classList.toggle('is-link', !!hot)
  })
  document.addEventListener('pointerleave', () => gsap.to(ball, { p: 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' }))
  window.addEventListener('pointerdown', () => cursorEl.classList.add('is-down'))
  window.addEventListener('pointerup', () => cursorEl.classList.remove('is-down'))

  let rt
  window.addEventListener('resize', () => {
    clearTimeout(rt)
    rt = setTimeout(() => {
      engine.resize()
      track.layout()
      if (state.panel && !state.busy) {
        const r = panelRect()
        Object.assign(state.panel.c.fly, rectToWorld(r, 20))
        gsap.set('.panel', { left: r.left, top: r.top, width: r.width, height: r.height })
      }
    }, 80)
  })
}

// ---------- loop ----------
let time = 0
function tick(_, deltaMs) {
  const dt = Math.min(deltaMs / 1000, 1 / 20)
  const ratio = Math.min(dt / (1 / 60), 2)
  time += dt
  holeClock += dt
  engine.postU.u_holeT.value = holeClock
  track.update(ratio)
  if (fine) updateBall(dt)
  engine.render(time)
}

boot().catch((e) => console.error("boot failed", e?.stack || e))
