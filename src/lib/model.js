export const NOW = new Date()
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
export const sum = (a) => a.reduce((s, x) => s + x, 0)
export const fmt = (n) => Math.round(n).toLocaleString('en-IN')

export function inr(n) {
  n = Math.round(n)
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(n >= 1e6 ? 1 : 2) + ' L'
  return '₹' + fmt(n)
}
export const dateOf = (m) =>
  new Date(NOW.getFullYear(), NOW.getMonth() + m, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
export function dur(m) {
  const y = Math.floor(m / 12), mo = m % 12
  if (!y) return mo + ' mo'
  if (!mo) return y + ' yr'
  return y + 'y ' + mo + 'm'
}

const tone = (k) => ({ t: `var(--${k}-t)`, l: `var(--${k}-l)`, r: `var(--${k}-r)` })
export const COL = {
  blue: tone('b'), gold: tone('y'), green: tone('n'), red: tone('r'), accent: tone('a'),
  grey: { t: 'var(--g-t)', l: 'var(--g-l)', r: 'var(--g-r)' },
  white: { t: 'var(--w-t)', l: 'var(--w-l)', r: 'var(--w-r)' },
}

export const ASSETS = [
  { k: 'safe', name: 'Safe', sub: 'Fixed deposit', mu: 0.065, sg: 0.01, css: 'var(--c-safe)', c: COL.blue },
  { k: 'steady', name: 'Steady', sub: 'Gold + bonds', mu: 0.085, sg: 0.09, css: 'var(--c-steady)', c: COL.gold },
  { k: 'growth', name: 'Growth', sub: 'Index fund', mu: 0.12, sg: 0.18, css: 'var(--c-growth)', c: COL.green },
]
export const RHO = [[1, 0.2, 0.05], [0.2, 1, 0.35], [0.05, 0.35, 1]]
export const PRESETS = [['Careful', [70, 20, 10]], ['Balanced', [30, 20, 50]], ['Bold', [10, 10, 80]]]
export const GOALS = [
  { label: '₹10 lakh', sub: 'a million rupees', v: 1e6 },
  { label: '₹1 crore', sub: 'ten million rupees', v: 1e7 },
  { label: '$1 million', sub: 'about ₹8.5 crore', v: 8.5e7 },
]
export const DEFAULT_PLAN = { monthly: 8000, step: 5, w: [30, 20, 50], goal: 1, real: false }

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function gauss(r) {
  let u = 0
  while (!u) u = r()
  const v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const N = 300, T = 600
const DEFL = new Float64Array(T + 1).map((_, t) => Math.pow(1.05, t / 12))
const L22 = Math.sqrt(1 - RHO[0][1] ** 2)
const L32 = (RHO[1][2] - RHO[0][2] * RHO[0][1]) / L22
const L33 = Math.sqrt(1 - RHO[0][2] ** 2 - L32 * L32)
const Z = [new Float32Array(N * T), new Float32Array(N * T), new Float32Array(N * T)]
{
  const r = mulberry32(20261015)
  for (let i = 0; i < N * T; i++) {
    const a = gauss(r), b = gauss(r), c = gauss(r)
    Z[0][i] = a
    Z[1][i] = RHO[0][1] * a + L22 * b
    Z[2][i] = RHO[0][2] * a + L32 * b + L33 * c
  }
}
export { DEFL }

export const contribAt = (p, t) => p.monthly * Math.pow(1 + p.step / 100, Math.floor(t / 12))

export function simulate(p, goal, real) {
  const w = p.w.map((x) => x / 100)
  const drift = sum(ASSETS.map((a, i) => (w[i] * (a.mu - 0.5 * a.sg * a.sg)) / 12))
  const co = ASSETS.map((a, i) => (w[i] * a.sg) / Math.sqrt(12))
  const cp = new Float64Array(T)
  for (let t = 0; t < T; t++) cp[t] = contribAt(p, t)
  const times = new Float64Array(N)
  for (let n = 0; n < N; n++) {
    let v = 0, f = Infinity
    const o = n * T
    for (let t = 0; t < T; t++) {
      v += cp[t]
      v *= 1 + drift + co[0] * Z[0][o + t] + co[1] * Z[1][o + t] + co[2] * Z[2][o + t]
      if (v >= (real ? goal * DEFL[t + 1] : goal)) { f = t + 1; break }
    }
    times[n] = f
  }
  times.sort()
  const q = (x) => times[Math.floor(x * (N - 1))]
  return { p10: q(0.1), p50: q(0.5), p90: q(0.9) }
}

export function expPath(p, months) {
  const w = p.w.map((x) => x / 100)
  const m = sum(ASSETS.map((a, i) => w[i] * a.mu)) / 12
  const V = [0], C = [0]
  let v = 0, c = 0
  for (let t = 0; t < months; t++) {
    const k = contribAt(p, t)
    v = (v + k) * (1 + m); c += k
    V.push(v); C.push(c)
  }
  return { V, C, m }
}

export function mixStats(w) {
  const x = w.map((a) => a / 100)
  const mu = sum(ASSETS.map((a, i) => x[i] * a.mu))
  let v = 0
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) v += x[i] * x[j] * ASSETS[i].sg * ASSETS[j].sg * RHO[i][j]
  return { mu, sd: Math.sqrt(v) }
}
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x))
}
export const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2))

export function shiftMix(w, pts) {
  const n = w.slice()
  let d = pts
  for (const k of [0, 1]) { const t = Math.min(d, n[k]); n[k] -= t; d -= t }
  n[2] += pts - d
  return n
}
export function setMix(w, i, v) {
  const rest = 100 - v
  const others = [0, 1, 2].filter((k) => k !== i)
  const osum = w[others[0]] + w[others[1]]
  const nw = [0, 0, 0]
  nw[i] = v
  if (osum === 0) nw[others[0]] = Math.round(rest / 2 / 5) * 5
  else nw[others[0]] = Math.round((rest * w[others[0]]) / osum / 5) * 5
  nw[others[1]] = rest - nw[others[0]]
  return nw
}

export function marketRet(r) {
  const a = gauss(r), b = gauss(r), c = gauss(r)
  const z = [a, RHO[0][1] * a + L22 * b, RHO[0][2] * a + L32 * b + L33 * c]
  return ASSETS.map((s, i) => (s.mu - 0.5 * s.sg * s.sg) / 12 + (s.sg / Math.sqrt(12)) * z[i])
}

/* bad-year scenarios */
export const SCEN = [
  { k: 'crash', name: 'Sharp crash', desc: 'Growth falls 38% in 8 months, then takes about 22 to recover.', trough: 8,
    g: (t) => (t <= 8 ? Math.pow(0.62, 1 / 8) - 1 : t <= 30 ? Math.pow(1 / 0.62, 1 / 22) - 1 : 0.01) },
  { k: 'grind', name: 'Two weak years', desc: 'Growth drifts down 23% over 24 months, then rebounds in a year.', trough: 24,
    g: (t) => (t <= 24 ? -0.011 : 0.03) },
]

export function badStart(S) {
  const path = expPath(S, 36)
  return { vals: S.w.map((x) => (path.V[36] * x) / 100), put: path.C[36], c: contribAt(S, 36), ref: path.V[36] * 1.9, mE: path.m }
}
export function buildSeries(S, start, sc, strat) {
  const d = sc.trough
  const b = start.vals.slice()
  let put = start.put, sold = false
  const val = [sum(b)], pt = [put], peak = [sum(b)], bs = [b.slice()]
  for (let t = 1; t <= 36; t++) {
    if (strat === 'sell' && t === d + 1 && !sold) { const s = sum(b); b[0] = s; b[1] = 0; b[2] = 0; sold = true }
    const c = strat === 'pause' && t > d ? 0 : start.c
    if (sold) b[0] += c
    else for (let i = 0; i < 3; i++) b[i] += (c * S.w[i]) / 100
    put += c
    if (sold) b[0] *= 1.0025
    else { const g = sc.g(t); b[0] *= 1.005; b[1] *= 1 + 0.25 * g + 0.003; b[2] *= 1 + g }
    val.push(sum(b)); pt.push(put); peak.push(Math.max(peak[t - 1], sum(b))); bs.push(b.slice())
  }
  return { val, pt, peak, bs, sold: strat === 'sell' }
}
