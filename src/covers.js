// Procedural "site screenshot" covers, one art direction per project.
// variant 0 = card hero, 1..2 = gallery panels shown in the project view.

const FONT = '"Inter Tight", "Helvetica Neue", Arial, sans-serif'
const SERIF = '"Instrument Serif", "Times New Roman", serif'

function rng(seed) {
  let s = 0
  for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function font(ctx, size, weight = 400, family = FONT) {
  ctx.font = `${weight} ${size}px ${family}`
}

function nav(ctx, W, label, fg, accent) {
  font(ctx, W * 0.012, 500)
  ctx.fillStyle = fg
  ctx.globalAlpha = 0.85
  ctx.fillText(label, W * 0.035, W * 0.04)
  const items = ['Work', 'About', 'Notes', 'Contact']
  let x = W * 0.62
  for (const it of items) {
    ctx.fillText(it, x, W * 0.04)
    x += W * 0.07
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = accent
  roundRect(ctx, W * 0.9, W * 0.024, W * 0.066, W * 0.026, W * 0.013)
  ctx.fill()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function grain(ctx, W, H, amt = 14) {
  const img = ctx.getImageData(0, 0, W, H)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

const ART = {
  orderbook(ctx, W, H, r, v) {
    ctx.fillStyle = '#0b0d0c'
    ctx.fillRect(0, 0, W, H)
    nav(ctx, W, 'MATCHBOOK', '#e9efe9', '#c6ff4a')
    const mid = H * 0.56
    const rows = 22
    const rh = (H * 0.72) / rows
    for (let i = 0; i < rows; i++) {
      const ask = i < rows / 2
      const y = H * 0.18 + i * rh
      const depth = (0.25 + r() * 0.75) * (1 - Math.abs(i - rows / 2) / rows)
      ctx.fillStyle = ask ? 'rgba(255,92,92,0.18)' : 'rgba(198,255,74,0.18)'
      ctx.fillRect(W * 0.55, y, W * 0.4 * depth, rh - 3)
      font(ctx, rh * 0.5, 500, 'ui-monospace, Menlo, monospace')
      ctx.fillStyle = ask ? '#ff7a7a' : '#c6ff4a'
      const px = (101.5 + (rows / 2 - i) * 0.01).toFixed(2)
      ctx.fillText(px, W * 0.565, y + rh * 0.68)
      ctx.fillStyle = '#8b958e'
      ctx.fillText(String(Math.floor(r() * 9000 + 100)), W * 0.68, y + rh * 0.68)
    }
    font(ctx, W * (v ? 0.07 : 0.1), 300, SERIF)
    ctx.fillStyle = '#e9efe9'
    ctx.fillText(v === 2 ? '0.30µs' : '2.08M', W * 0.05, mid)
    font(ctx, W * 0.016, 500)
    ctx.fillStyle = '#8b958e'
    ctx.fillText(v === 2 ? 'P50 LATENCY · PRICE-TIME PRIORITY' : 'ORDERS / SECOND · SINGLE CORE', W * 0.052, mid + W * 0.04)
    ctx.strokeStyle = '#c6ff4a'
    ctx.lineWidth = W * 0.002
    ctx.beginPath()
    let y = H * 0.8
    for (let x = 0; x < W * 0.48; x += W * 0.01) {
      y += (r() - 0.5) * H * 0.03
      ctx.lineTo(W * 0.05 + x, y)
    }
    ctx.stroke()
  },

  globe(ctx, W, H, r, v) {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, W * 0.6)
    g.addColorStop(0, '#2a1410')
    g.addColorStop(1, '#090606')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    nav(ctx, W, 'CRISIS HUB', '#f3e7df', '#ff5b2e')
    const cx = W * (v === 1 ? 0.7 : 0.5)
    const cy = H * 0.58
    const R = H * 0.36
    ctx.strokeStyle = 'rgba(255,170,130,0.35)'
    ctx.lineWidth = 1.2
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath()
      ctx.ellipse(cx, cy, R * Math.cos((i / 7) * Math.PI * 0.5), R, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      const yy = cy + (i / 7) * R
      const rr = Math.sqrt(Math.max(0, R * R - (yy - cy) ** 2))
      ctx.ellipse(cx, yy, rr, rr * 0.18, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (let i = 0; i < 52; i++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * R * 0.92
      const x = cx + Math.cos(a) * d
      const y = cy + Math.sin(a) * d
      const s = 2 + r() * 6
      const gg = ctx.createRadialGradient(x, y, 0, x, y, s * 4)
      gg.addColorStop(0, 'rgba(255,110,60,0.9)')
      gg.addColorStop(1, 'rgba(255,110,60,0)')
      ctx.fillStyle = gg
      ctx.beginPath()
      ctx.arc(x, y, s * 4, 0, Math.PI * 2)
      ctx.fill()
    }
    font(ctx, W * 0.075, 400, SERIF)
    ctx.fillStyle = '#f3e7df'
    ctx.textAlign = v === 1 ? 'left' : 'center'
    ctx.fillText(v === 1 ? '52 crises,' : 'See it. Then act.', v === 1 ? W * 0.05 : W * 0.5, H * 0.2)
    if (v === 1) ctx.fillText('one map.', W * 0.05, H * 0.2 + W * 0.075)
    ctx.textAlign = 'left'
  },

  transit(ctx, W, H, r, v) {
    ctx.fillStyle = '#f2f0ea'
    ctx.fillRect(0, 0, W, H)
    nav(ctx, W, 'TRIPCOMPARE', '#151515', '#0039a6')
    const lines = [
      ['A', '#0039a6', 'AirTrain + A', '$11.15', '71 min'],
      ['E', '#0039a6', 'AirTrain + E', '$11.15', '58 min'],
      ['L', '#e2a400', 'LIRR + AirTrain', '$16.75', '44 min'],
      ['T', '#151515', 'Yellow cab', '$70.00', '52 min'],
      ['R', '#7a7a7a', 'Rideshare', '$82.40', '55 min'],
    ]
    font(ctx, W * 0.085, 600)
    ctx.fillStyle = '#151515'
    ctx.fillText(['JFK → Midtown', 'Cheapest: $11.15', 'LGA → Midtown'][v], W * 0.04, H * 0.27)
    const top = H * 0.37
    const rh = (H * 0.56) / lines.length
    lines.forEach(([k, c, name, cost, time], i) => {
      const y = top + i * rh
      ctx.fillStyle = i === [2, 0, 3][v] ? '#fff' : 'rgba(255,255,255,0.55)'
      roundRect(ctx, W * 0.04, y, W * 0.92, rh * 0.82, rh * 0.2)
      ctx.fill()
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(W * 0.04 + rh * 0.42, y + rh * 0.41, rh * 0.26, 0, Math.PI * 2)
      ctx.fill()
      font(ctx, rh * 0.3, 700)
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(k, W * 0.04 + rh * 0.42, y + rh * 0.52)
      ctx.textAlign = 'left'
      ctx.fillStyle = '#151515'
      font(ctx, rh * 0.28, 500)
      ctx.fillText(name, W * 0.04 + rh * 0.9, y + rh * 0.52)
      ctx.fillText(cost, W * 0.62, y + rh * 0.52)
      ctx.fillText(time, W * 0.8, y + rh * 0.52)
    })
  },

  pipeline(ctx, W, H, r, v) {
    ctx.fillStyle = '#ece6ff'
    ctx.fillRect(0, 0, W, H)
    nav(ctx, W, 'FOUNDRY', '#1b1530', '#6b4dff')
    const steps = ['Ideator', 'Architect', 'Builder', 'Verifier', 'Reviewer', 'Refiner']
    font(ctx, W * 0.11, 400, SERIF)
    ctx.fillStyle = '#1b1530'
    ctx.fillText(v === 2 ? 'Six agents,' : 'Idea in.', W * 0.05, H * 0.3)
    ctx.fillStyle = '#6b4dff'
    ctx.fillText(v === 2 ? 'one product.' : 'Product out.', W * 0.05, H * 0.3 + W * 0.1)
    const y = H * 0.76
    const gap = (W * 0.9) / steps.length
    steps.forEach((s, i) => {
      const x = W * 0.05 + i * gap
      ctx.fillStyle = i <= (v === 1 ? 5 : 3) ? '#1b1530' : 'rgba(27,21,48,0.15)'
      roundRect(ctx, x, y - H * 0.06, gap * 0.86, H * 0.12, H * 0.06)
      ctx.fill()
      font(ctx, W * 0.017, 500)
      ctx.fillStyle = i <= (v === 1 ? 5 : 3) ? '#ece6ff' : '#1b1530'
      ctx.textAlign = 'center'
      ctx.fillText(s, x + gap * 0.43, y + W * 0.006)
      ctx.textAlign = 'left'
    })
  },

  chart(ctx, W, H, r, v) {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#071a2b')
    g.addColorStop(1, '#03090f')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    nav(ctx, W, 'PORTFOLIOGUARD', '#d9ecff', '#3ab0ff')
    const x0 = W * 0.05
    const x1 = W * 0.95
    const pts = []
    let y = H * 0.75
    for (let x = x0; x <= x1; x += W * 0.006) {
      y += (r() - 0.53) * H * 0.025
      y = Math.min(H * 0.9, Math.max(H * 0.35, y))
      pts.push([x, y])
    }
    const fill = ctx.createLinearGradient(0, H * 0.35, 0, H)
    fill.addColorStop(0, 'rgba(58,176,255,0.35)')
    fill.addColorStop(1, 'rgba(58,176,255,0)')
    ctx.beginPath()
    ctx.moveTo(x0, H)
    pts.forEach(([a, b]) => ctx.lineTo(a, b))
    ctx.lineTo(x1, H)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.beginPath()
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)))
    ctx.strokeStyle = '#3ab0ff'
    ctx.lineWidth = W * 0.0022
    ctx.stroke()
    font(ctx, W * 0.016, 500)
    ctx.fillStyle = '#7fa6c4'
    const tabs = ['Signals', 'Paper', 'Risk', 'Backtest']
    tabs.forEach((t, i) => {
      ctx.fillStyle = i === v ? '#d9ecff' : '#4d6c84'
      ctx.fillText(t.toUpperCase(), x0 + i * W * 0.1, H * 0.2)
    })
    font(ctx, W * 0.07, 300)
    ctx.fillStyle = '#d9ecff'
    ctx.fillText('+18.4%', x0, H * 0.32)
  },

  terminal(ctx, W, H, r, v) {
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)
    nav(ctx, W, 'SIEMLET', '#e6e6e6', '#ff3b30')
    font(ctx, H * 0.024, 400, 'ui-monospace, Menlo, monospace')
    const evts = ['sshd: Failed password for root', 'sshd: Accepted publickey for deploy', 'sudo: pam_unix(sudo:auth) failure', 'sshd: Invalid user admin', 'cron: session opened for user root']
    for (let i = 0; i < 26; i++) {
      const e = evts[Math.floor(r() * evts.length)]
      const bad = /Failed|Invalid|failure/.test(e)
      ctx.fillStyle = bad ? '#ff5f56' : '#5f6b63'
      const ip = `10.0.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}`
      ctx.fillText(`09:${String(10 + i).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}  ${ip}  ${e}`, W * 0.04, H * 0.14 + i * H * 0.031)
    }
    ctx.fillStyle = 'rgba(10,10,10,0.6)'
    ctx.fillRect(W * 0.52, 0, W * 0.48, H)
    font(ctx, W * 0.1, 700)
    ctx.fillStyle = '#ff3b30'
    ctx.fillText(v === 1 ? 'SPRAY' : 'ALERT', W * 0.56, H * 0.5)
    font(ctx, W * 0.018, 500)
    ctx.fillStyle = '#e6e6e6'
    ctx.fillText(v === 1 ? '14 users · 1 source · 60s window' : 'SSH brute force · 42 attempts / 60s', W * 0.565, H * 0.58)
  },

  water(ctx, W, H, r, v) {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#bfe7ff')
    g.addColorStop(1, '#3d8fd6')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    nav(ctx, W, 'HYDROSENSE', '#06263d', '#ffffff')
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      const base = H * (0.55 + i * 0.09)
      ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base + Math.sin(x / (W * 0.09) + i * 1.3) * H * 0.025)
      ctx.lineTo(W, H)
      ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.05})`
      ctx.fill()
    }
    const cx = W * 0.72
    const cy = H * 0.4
    ctx.fillStyle = '#06263d'
    roundRect(ctx, cx - H * 0.17, cy - H * 0.21, H * 0.34, H * 0.42, H * 0.09)
    ctx.fill()
    ctx.strokeStyle = '#4fc3ff'
    ctx.lineWidth = H * 0.022
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, H * 0.11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (v === 1 ? 0.45 : 0.72))
    ctx.stroke()
    font(ctx, H * 0.05, 600)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(v === 1 ? '250ml' : '72%', cx, cy + H * 0.018)
    ctx.textAlign = 'left'
    font(ctx, W * 0.08, 400, SERIF)
    ctx.fillStyle = '#06263d'
    ctx.fillText('Drink now,', W * 0.05, H * 0.3)
    ctx.fillText('not later.', W * 0.05, H * 0.3 + W * 0.08)
  },

  floorplan(ctx, W, H, r, v) {
    ctx.fillStyle = '#efe9df'
    ctx.fillRect(0, 0, W, H)
    nav(ctx, W, 'FLOORPLATE', '#2b2620', '#c24d2c')
    ctx.strokeStyle = '#2b2620'
    ctx.lineWidth = W * 0.003
    const x = W * 0.45
    const y = H * 0.15
    const w = W * 0.5
    const h = H * 0.75
    ctx.strokeRect(x, y, w, h)
    const rooms = 7
    for (let i = 0; i < rooms; i++) {
      const rx = x + r() * w * 0.8
      const ry = y + r() * h * 0.8
      const rw = w * (0.15 + r() * 0.25)
      const rh = h * (0.15 + r() * 0.25)
      ctx.fillStyle = i % 3 === 0 ? 'rgba(194,77,44,0.25)' : 'rgba(43,38,32,0.06)'
      ctx.fillRect(rx, ry, Math.min(rw, x + w - rx), Math.min(rh, y + h - ry))
      ctx.strokeRect(rx, ry, Math.min(rw, x + w - rx), Math.min(rh, y + h - ry))
    }
    font(ctx, W * 0.09, 400, SERIF)
    ctx.fillStyle = '#2b2620'
    ctx.fillText(v === 2 ? '137 tests.' : 'Every desk,', W * 0.04, H * 0.42)
    ctx.fillText(v === 2 ? 'Zero drift.' : 'accounted.', W * 0.04, H * 0.42 + W * 0.09)
    font(ctx, W * 0.016, 500)
    ctx.fillStyle = '#c24d2c'
    ctx.fillText('OCCUPANCY 81.2% · 14 SITES · DUCKDB', W * 0.042, H * 0.42 + W * 0.15)
  },
}

export function drawCover(project, variant = 0, width = 1600) {
  const W = width
  const H = Math.round(width / project.ratio)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ART[project.art](ctx, W, H, rng(project.slug + variant), variant)
  grain(ctx, W, H)
  return c
}
