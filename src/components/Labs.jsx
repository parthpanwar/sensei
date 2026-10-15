import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { IsoScene, bbox } from '../lib/iso.jsx'
import { COL, clamp, gauss, inr, mulberry32 } from '../lib/model.js'
import { Tick } from '../lib/ui.jsx'
import Range from './Range.jsx'

function Shell({ title, hint, controls, scene, children }) {
  return (
    <div className="optlab">
      <div className="lab-head"><h3>{title}</h3><span>{hint}</span></div>
      <div className="lab-body">
        <div className="lab-ctl">{controls}</div>
        <div className="lab-scene">{scene}{children}</div>
      </div>
    </div>
  )
}
const Ctl = ({ id, label, out, children }) => (
  <div className="ctl"><label htmlFor={id}>{label} <output className="num">{out}</output></label>{children}</div>
)
const Tile = ({ label, value, tone }) => (
  <div><small>{label}</small><strong className={'num ' + (tone || '')}>{value}</strong></div>
)

/* ---------- Savings: cushion builder ---------- */
const SU = 17, SW = 2, SD = 2, SH = 7
const SVB = bbox([{ x: 0, y: 0, z: 0, w: SW, d: SD, h: SH }], SU, [
  { x: SW + 0.7, y: 0, z: SH, t: '₹60,000 cushion' }, { x: 0, y: SD + 0.4, z: 0, t: '₹60,000', anchor: 'end' },
])
function SavingsLab() {
  const [target, setTarget] = useState(16000)
  const [topup, setTopup] = useState(1500)
  const [frac, setFrac] = useState(100)
  const plan = useMemo(() => {
    let b = 0, m = 0
    const arr = [0]
    while (b < target && m < 240) { b = (b + topup) * (1 + 0.03 / 12); m++; arr.push(b) }
    return { months: m, arr }
  }, [target, topup])
  const month = Math.round((frac / 100) * plan.months)
  const bal = Math.min(target, plan.arr[month] ?? 0)
  const h = Math.max(0.001, SH * (bal / target))
  const blocks = useMemo(() => [
    { key: 'tank', x: 0, y: 0, z: 0, w: SW, d: SD, h: SH, wire: true, stroke: 'var(--ghost)', op: 0.55 },
    { key: 'fill', x: 0.12, y: 0.12, z: 0, w: SW - 0.24, d: SD - 0.24, h, c: COL.blue },
  ], [h])
  const labels = useMemo(() => [
    { key: 'cap', x: SW + 0.7, y: 0, z: SH, t: inr(target) + ' cushion', fill: 'var(--text)' },
    { key: 'bal', x: 0, y: SD + 0.4, z: h, t: inr(bal), anchor: 'end', fill: 'var(--blue)' },
  ], [target, bal, h])
  const ready = new Date(new Date().getFullYear(), new Date().getMonth() + plan.months, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  const nominal = target * Math.pow(1.03, 5), real = nominal / Math.pow(1.05, 5)
  return (
    <Shell title="Cushion builder" hint="Interest 3% a year, prices rise 5% a year"
      controls={<>
        <Ctl id="sv-target" label="Cushion size" out={'₹' + target.toLocaleString('en-IN')}><Range id="sv-target" min={5000} max={60000} step={1000} value={target} onChange={setTarget} /></Ctl>
        <Ctl id="sv-top" label="Put in each month" out={'₹' + topup.toLocaleString('en-IN')}><Range id="sv-top" min={500} max={4000} step={250} value={topup} onChange={setTopup} /></Ctl>
        <Ctl id="sv-time" label="Move through time" out={'month ' + month}><Range id="sv-time" min={0} max={100} step={1} value={frac} onChange={setFrac} /></Ctl>
        <div className="tiles">
          <Tile label="Full in" value={plan.months + ' months'} />
          <Tile label="Ready by" value={ready} />
        </div>
        <div className="tiles" style={{ marginTop: 10 }}>
          <Tile label="Interest in 5 yrs" value={'+' + inr(nominal - target)} tone="pos" />
          <Tile label="Same money buys" value={inr(real)} tone="neg" />
        </div>
        <p className="lab-note">A full cushion earns a little and loses a little buying power. That is fine. Its job is to stop you selling investments in a fall. <b>Once it is full, stop.</b></p>
      </>}
      scene={<IsoScene blocks={blocks} u={SU} vb={SVB} labels={labels} dur={420} role="img" aria-label="An isometric tank filling with your cushion savings." />} />
  )
}

/* ---------- Bonds: rate seesaw ---------- */
const BU = 19
const BX = [0, 2.6, 5.2]
function BondsLab() {
  const [shock, setShock] = useState(1)
  const [yrs, setYrs] = useState(1)
  const D = 3.5, y = 0.07, fd = 0.065, d = shock / 100
  const base = 1e4 * Math.pow(1 + y, yrs)
  const fund = 1e4 * (1 - D * d) * Math.pow(1 + y + d, yrs)
  const fdv = 1e4 * Math.pow(1 + fd, yrs)
  const H = (v) => clamp((v / 1e4 - 0.85) / 0.4, 0.05, 1.3) * 6
  const blocks = useMemo(() => [
    { key: 'fd', x: BX[0], y: 0, z: 0, w: 1.4, d: 1.4, h: H(fdv), c: COL.blue },
    { key: 'fund', x: BX[1], y: 0, z: 0, w: 1.4, d: 1.4, h: H(fund), c: COL.gold },
    { key: 'calm', x: BX[2], y: 0, z: 0, w: 1.4, d: 1.4, h: H(base), c: COL.green },
    { key: 'put', x: -0.3, y: -0.3, z: H(1e4), w: 7.4, d: 2, h: 0, wire: true, flat: true, stroke: 'var(--goalwire)', op: 0.5 },
  ], [fdv, fund, base]) // eslint-disable-line
  const labels = [
    { key: 'l1', x: BX[0] + 1.4, y: 1.4, z: 0, t: 'FD', anchor: 'middle', dy: 18 },
    { key: 'l2', x: BX[1] + 1.4, y: 1.4, z: 0, t: 'Fund', anchor: 'middle', dy: 18 },
    { key: 'l3', x: BX[2] + 1.4, y: 1.4, z: 0, t: 'No shock', anchor: 'middle', dy: 18 },
    { key: 'lp', x: 7, y: 0, z: H(1e4), t: '₹10,000 in', fill: 'var(--text)', dx: 8 },
  ]
  const vb = useMemo(() => bbox([{ x: -0.3, y: -0.3, z: 0, w: 7.4, d: 2, h: 6.2 }], BU, [{ x: 7, y: 0, z: 2.6, t: '₹10,000 in', dx: 8 }, { x: BX[2] + 1.4, y: 1.4, z: 0, t: 'No shock', anchor: 'middle', dy: 18 }]), [])
  const priceHit = -D * shock
  const caught = yrs >= D
  return (
    <Shell title="Interest-rate seesaw" hint="₹10,000 in a debt fund (about 3.5 yr maturity, 7%) or a 6.5% fixed deposit"
      controls={<>
        <Ctl id="bd-shock" label="Rates move by" out={(shock > 0 ? '+' : '') + shock.toFixed(2) + '%'}><Range id="bd-shock" min={-2} max={2} step={0.25} value={shock} onChange={setShock} /></Ctl>
        <Ctl id="bd-yrs" label="You hold for" out={yrs + (yrs === 1 ? ' year' : ' years')}><Range id="bd-yrs" min={1} max={5} step={1} value={yrs} onChange={setYrs} /></Ctl>
        <div className="tiles">
          <Tile label="Fixed deposit" value={<Tick value={fdv} format={inr} />} />
          <Tile label="Debt fund" value={<Tick value={fund} format={inr} />} tone={fund >= fdv ? 'pos' : 'neg'} />
        </div>
        <p className="lab-note">
          {shock === 0 ? 'Rates stay put, so the fund simply earns its 7%.' : <>If rates {shock > 0 ? 'rise' : 'fall'} {Math.abs(shock).toFixed(2)}%, the fund price moves <b>{priceHit > 0 ? '+' : ''}{priceHit.toFixed(1)}%</b> on day one. </>}
          {shock > 0 && (caught ? ' Held this long, the higher interest has repaid the drop.' : ' Sell now and the dip is real. Wait about 3.5 years and it is repaid.')}
          {shock < 0 && ' Lower rates lift the price now but cut what it earns later.'}
        </p>
      </>}
      scene={<IsoScene blocks={blocks} u={BU} vb={vb} labels={labels} dur={420} role="img" aria-label="Three isometric towers comparing a fixed deposit with a debt fund after an interest-rate change." />} />
  )
}

/* ---------- Stocks: ten random picks ---------- */
const TU = 14, N = 10
const MED_INDEX = Math.exp((Math.log(1.12) - 0.5 * 0.18 * 0.18) * 5)
function stock(r) {
  if (r() < 0.06) return 0.05
  return Math.exp((Math.log(1.12) - 0.5 * 0.4 * 0.4) * 5 + 0.4 * Math.sqrt(5) * gauss(r))
}
const GAP = 1.45
const TH = (m) => clamp(m, 0, 4) / 4 * 8
const TVB = bbox([...Array(N + 1)].map((_, i) => ({ x: i * GAP, y: 0, z: 0, w: 1, d: 1.2, h: 8.2 })), TU, [{ x: 0, y: 1.2, z: 0, t: 'x', dy: 18 }])
function StocksLab() {
  const [seed, setSeed] = useState(7)
  const picks = useMemo(() => { const r = mulberry32(seed); return Array.from({ length: N }, () => stock(r)) }, [seed])
  const stats = useMemo(() => {
    const r = mulberry32(99)
    let beat = 0, lost = 0, basketBeat = 0
    const T = 2000
    for (let b = 0; b < T; b++) {
      let tot = 0
      for (let i = 0; i < N; i++) { const m = stock(r); tot += m; if (m > MED_INDEX) beat++; if (m < 1) lost++ }
      if (tot / N > MED_INDEX) basketBeat++
    }
    return { beat: beat / (T * N), lost: lost / (T * N), basket: basketBeat / T }
  }, [])
  const blocks = useMemo(() => [
    ...picks.map((m, i) => ({ key: 's' + i, x: i * GAP, y: 0, z: 0, w: 1, d: 1.2, h: Math.max(TH(m), 0.05), c: m < 1 ? COL.red : m < MED_INDEX ? COL.gold : COL.green })),
    { key: 'idx', x: N * GAP + 0.4, y: 0, z: 0, w: 1, d: 1.2, h: TH(MED_INDEX), c: COL.blue },
    { key: 'put', x: -0.3, y: -0.3, z: TH(1), w: (N + 1) * GAP + 0.9, d: 1.8, h: 0, wire: true, flat: true, stroke: 'var(--goalwire)', op: 0.5 },
  ], [picks])
  const labels = [
    { key: 'i', x: N * GAP + 0.4 + 1, y: 1.2, z: 0, t: 'Index', anchor: 'middle', dy: 18 },
    { key: 'p', x: -0.3, y: 0, z: TH(1), t: '₹1,000 each', anchor: 'end', fill: 'var(--text)', dx: -6 },
  ]
  const vb = useMemo(() => bbox([...Array(N + 1)].map((_, i) => ({ x: i * GAP, y: 0, z: 0, w: 1, d: 1.2, h: 8 })), TU, [{ x: -0.3, y: 0, z: 2, t: '₹1,000 each', anchor: 'end', dx: -6 }, { x: 0, y: 1.2, z: 0, t: 'Index', dy: 18 }]), [])
  const finals = picks.map((m) => m * 1000)
  const beatN = picks.filter((m) => m > MED_INDEX).length
  const lostN = picks.filter((m) => m < 1).length
  const total = finals.reduce((a, b) => a + b, 0)
  const idxTotal = N * 1000 * MED_INDEX
  return (
    <Shell title="Ten random stocks, five years" hint="Same 12% average as the index, but 40% yearly swings and a 6% chance a company collapses"
      controls={<>
        <div className="row" style={{ marginBottom: 14 }}>
          <motion.button className="btn primary" whileTap={{ scale: 0.97 }} onClick={() => setSeed(Math.floor(Math.random() * 1e6))}>Roll 10 new stocks</motion.button>
        </div>
        <div className="tiles">
          <Tile label="Beat the index" value={beatN + ' of 10'} tone={beatN >= 5 ? 'pos' : 'neg'} />
          <Tile label="Lost money" value={lostN + ' of 10'} tone={lostN ? 'neg' : ''} />
        </div>
        <div className="tiles" style={{ marginTop: 10 }}>
          <Tile label="Your ₹10,000 became" value={<Tick value={total} format={inr} />} tone={total >= idxTotal ? 'pos' : 'neg'} />
          <Tile label="Index would be" value={inr(idxTotal)} />
        </div>
        <p className="lab-note">Across 2,000 simulated baskets, <b>{Math.round(stats.beat * 100)}%</b> of single stocks beat the index, <b>{Math.round(stats.lost * 100)}%</b> lost money, and a 10-stock basket beat it only <b>{Math.round(stats.basket * 100)}%</b> of the time. Big winners are rare, and you cannot tell them in advance.</p>
      </>}
      scene={<IsoScene blocks={blocks} u={TU} vb={vb} labels={labels} dur={650} role="img" aria-label="Ten isometric towers for ten random stocks beside one tower for the index." />} />
  )
}

export const LABS = { savings: SavingsLab, bonds: BondsLab, stocks: StocksLab }
