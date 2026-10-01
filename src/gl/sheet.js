// JS twin of `sheet()` in shaders.js. Used to place DOM titles and hit-test cards.
const SPAN = 1.15
const SHIFT = -0.2
const BANK = -0.16
const DIAG = 0.03
const REAR_Y = 0.1
const REAR_Z = 0.2
const TWIST = 1.8

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function createSheet(u) {
  const shapeF = (q) => (((1 - q * q) * (1 - u.C) + Math.sin(Math.PI * q) * u.C) * Math.exp(-q * q))
  const shapeD = (q) => (shapeF(q + 0.001) - shapeF(q - 0.001)) * 500
  const ramp = (s) => {
    s = Math.min(1, Math.max(-1, s))
    return s * (1.5 - 0.5 * s * s)
  }

  // p: {x, y, z} on the flat strip (px, centre origin, y up) -> deformed point
  return function sheet(x, y, z, P = 1) {
    const W = u.W
    const V = u.V
    const D = W * 0.2 * (1 + 1.1 * V)
    const xs = x / W
    const q = xs * SPAN + SHIFT
    const ds = shapeD(q)
    const a = (BANK * ds) / Math.PI * u.C + TWIST * V * smooth(0.3, 0.9, Math.abs(xs)) * Math.sign(xs)
    const m = 1 - smooth(-1, 0.3, xs)
    const zs = -D * shapeF(q) + W * u.lean * ramp(xs) + REAR_Z * W * V * m
    const sy = y * Math.cos(a) + DIAG * x + REAR_Y * W * V * m
    const sz = z + y * Math.sin(a) + zs
    return [x, y + (sy - y) * P, z + (sz - z) * P]
  }
}
