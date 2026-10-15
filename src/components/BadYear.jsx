import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IsoScene, bbox } from '../lib/iso.jsx'
import { ASSETS, COL, SCEN, badStart, buildSeries, clamp, dur, inr } from '../lib/model.js'
import { Head, Reveal, Tick, scrollToEl } from '../lib/ui.jsx'
import Chip from './Chip.jsx'

const HH = 8, U = 17, W = 2, D = 2
const VB = bbox([{ x: 0, y: 0, z: 0, w: W, d: D, h: HH * 1.2 }], U)
const CW = 640, CH = 230, L = 64, R = 12, TP = 14, B = 28, PW = CW - L - R, PH = CH - TP - B
const NAMES = { hold: 'Kept investing', pause: 'Paused the SIP', sell: 'Sold, sat in savings' }
const COLS = { hold: 'var(--phos)', pause: 'var(--gold)', sell: 'var(--soft)' }

function Inner({ S, sc }) {
  const start = useMemo(() => badStart(S), []) // eslint-disable-line
  const series = useMemo(() => ({ hold: buildSeries(S, start, sc, 'hold'), pause: buildSeries(S, start, sc, 'pause'), sell: buildSeries(S, start, sc, 'sell') }), [S, start, sc])
  const [st, setSt] = useState({ m: 0, strat: null, phase: 'idle' })
  const decideRef = useRef(null)
  const { m, phase } = st
  const strat = st.strat || 'hold'
  const ser = series[strat]

  useEffect(() => {
    if (phase !== 'running' && phase !== 'running2') return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = setInterval(() => {
      setSt((s) => {
        const nm = s.m + 1
        if (nm >= 36) return { ...s, m: 36, phase: 'done' }
        if (s.phase === 'running' && nm === sc.trough) return { ...s, m: nm, phase: 'decide' }
        return { ...s, m: nm }
      })
    }, reduce ? 15 : phase === 'running' ? 340 : 280)
    return () => clearInterval(id)
  }, [phase, sc])

  useEffect(() => {
    if (phase === 'decide' && decideRef.current) {
      const r = decideRef.current.getBoundingClientRect()
      if (r.bottom > innerHeight - 20) scrollToEl(decideRef.current, { offset: -(innerHeight - r.height - 80) })
    }
  }, [phase])

  const dt = (phase === 'running' ? 0.34 : phase === 'running2' ? 0.28 : 0.35)
  const val = ser.val[m], put = ser.pt[m], peak = ser.peak[m]
  const dd = peak ? Math.round((1 - val / peak) * 100) : 0
  const hv = HH * clamp(val / start.ref, 0, 1.2), hp = HH * clamp(peak / start.ref, 0, 1.2)
  const blocks = useMemo(() => {
    const b = []
    let z = 0
    ser.bs[m].forEach((x, i) => {
      const sh = (hv * x) / (val || 1)
      b.push({ key: 'seg' + i, x: 0, y: 0, z, w: W, d: D, h: Math.max(sh, 0.001), c: ser.sold && m > sc.trough ? COL.grey : ASSETS[i].c })
      z += sh
    })
    b.push({ key: 'gap', x: 0, y: 0, z: hv, w: W, d: D, h: Math.max(hp - hv, 0.001), c: COL.red, op: hp - hv > 0.04 ? 0.5 : 0 })
    return b
  }, [ser, m, hv, hp, val, sc])
  const falling = phase === 'running' && m > 0 && m <= sc.trough && sc.g(m) < -0.03

  const mxv = Math.max(...series.hold.val, ...series.hold.pt) * 1.08
  const X = (i) => L + (i / 36) * PW, Y = (v) => TP + PH - (v / mxv) * PH
  const pts = (arr) => arr.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')
  const tr = sc.trough

  const finish = useMemo(() => {
    if (phase !== 'done') return null
    let base = start.vals.reduce((a, b) => a + b, 0)
    for (let t = 0; t < 36; t++) base = (base + start.c) * (1 + start.mE)
    const keys = ['hold', 'pause', 'sell'], vals = keys.map((k) => series[k].val[36])
    const mx = Math.max(...vals, base), h = series.hold.val[36], mine = series[st.strat].val[36]
    let k = 0, v = h
    while (v < base && k < 240) { v = (v + start.c) * (1 + start.mE); k++ }
    let msg
    if (st.strat === 'hold') msg = <>You kept investing through the fall. {k ? <>You finish about <b>{dur(k)}</b> behind a world with no fall, which is the real cost of a bad stretch.</> : 'You finished level with a world with no fall.'} {h >= Math.max(...vals) ? `That beat the other two choices by ${inr(h - Math.min(vals[1], vals[2]))} at the low end.` : ''}</>
    else if (st.strat === 'pause') msg = <>Pausing felt safe, and it left you {inr(h - mine)} behind someone who kept going. The units you skipped were the cheapest ones.</>
    else msg = <>Selling turned a drop on paper into a real loss. You finished {inr(h - mine)} behind someone who stayed, and you also need to decide when to buy back in.</>
    return { keys, vals, mx, base, msg }
  }, [phase, series, start, st.strat])

  const tag = phase === 'done' ? 'finished' : phase === 'decide' ? 'your call' : phase.startsWith('running') ? 'playing' : 'ready'
  const play = () => setSt({ m: 0, strat: null, phase: 'running' })
  const reset = () => setSt({ m: 0, strat: null, phase: 'idle' })
  const choose = (s) => setSt((o) => ({ ...o, strat: s, phase: 'running2' }))

  return (
    <>
      <div className="by-top">
        <Reveal className="win">
          <div className="win-bar"><span className="t">Year 3 · month <Tick value={m} duration={250} /></span><span className="r">{tag}</span></div>
          <div className={'stage ' + (falling ? 'shake' : '')}><div className="scene"><IsoScene blocks={blocks} u={U} vb={VB} dur={320} role="img" aria-label="Isometric tower of your money. In a fall it shrinks and a red block shows what is missing from the peak." /></div></div>
          <div className="legend"><span><i style={{ background: '#3b73d6' }} />Safe</span><span><i style={{ background: '#d99f3a' }} />Steady</span><span><i style={{ background: '#4fd17f' }} />Growth</span><span><i style={{ background: '#d94f4f' }} />gap from the peak</span></div>
        </Reveal>
        <Reveal className="panel" delay={0.08} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="big num"><Tick value={val} format={inr} duration={dt * 1000} /></div>
            <div className="sub">
              {m === 0 ? <>You have put in {inr(put)} so far. Press play to start.</> : <>You have put in <span className="num">{inr(put)}</span>. {dd >= 1 ? <span className="down">Down {dd}% from the peak.</span> : val >= put ? 'Back at the peak.' : ''}</>}
            </div>
          </div>
          <div className="chart" role="img" aria-label="Line chart of what your portfolio is worth against what you have put in.">
            <svg viewBox={`0 0 ${CW} ${CH}`}>
              <defs><clipPath id="by-clip"><motion.rect x={L - 2} y={0} height={CH} initial={false} animate={{ width: X(m) - L + 2 }} transition={{ duration: m === 0 ? 0.3 : dt, ease: m === 0 ? 'easeOut' : 'linear' }} /></clipPath></defs>
              {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={CW - R} y1={Y(f * mxv)} y2={Y(f * mxv)} style={{ stroke: 'var(--line)' }} /><text x={L - 8} y={Y(f * mxv) + 4} textAnchor="end">{inr(f * mxv)}</text></g>)}
              {[0, 12, 24, 36].map((i) => <text key={i} x={X(i)} y={CH - 8} textAnchor="middle">{i ? 'mo ' + i : 'start'}</text>)}
              <g clipPath="url(#by-clip)">
                <polygon style={{ fill: 'var(--phos)' }} fillOpacity=".09" points={`${X(0)},${Y(0)} ${pts(ser.val)} ${X(36)},${Y(0)}`} />
                <polyline fill="none" style={{ stroke: 'var(--soft)' }} strokeWidth="2" strokeDasharray="4 4" points={pts(ser.pt)} />
                <polyline fill="none" style={{ stroke: 'var(--phos)' }} strokeWidth="2" points={pts(ser.val)} />
              </g>
              <motion.g initial={false} animate={{ opacity: m >= tr ? 1 : 0 }} transition={{ duration: 0.4 }}>
                <line x1={X(tr)} x2={X(tr)} y1={TP} y2={TP + PH} style={{ stroke: 'var(--red)' }} strokeDasharray="2 4" opacity=".6" />
                <text x={X(tr) + 6} y={TP + 12} style={{ fill: 'var(--red)' }}>lowest point</text>
              </motion.g>
              <motion.circle r="4" style={{ fill: 'var(--phos)' }} initial={false} animate={{ cx: X(m), cy: Y(val) }} transition={{ duration: m === 0 ? 0.3 : dt, ease: m === 0 ? 'easeOut' : 'linear' }} />
              <text x={CW - R} y={Y(series.hold.pt[36]) - 8} textAnchor="end">money you put in</text>
            </svg>
          </div>
          <div className="row">
            <motion.button className="btn primary" whileTap={{ scale: 0.97 }} onClick={play} disabled={phase === 'running' || phase === 'running2' || phase === 'decide'}>{phase === 'done' ? 'Play again' : phase === 'decide' ? 'Waiting for you' : 'Play the fall'}</motion.button>
            <motion.button className="btn" whileTap={{ scale: 0.97 }} onClick={reset}>Reset</motion.button>
          </div>
        </Reveal>
      </div>
      <AnimatePresence>
        {phase === 'decide' && (
          <motion.div ref={decideRef} className="decide" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <p>Month {m}. Your money is down <b>{dd}% from its peak</b>. You have put in {inr(put)} and it is worth {inr(val)}. Nothing is lost unless you sell. Every ₹ you add now buys more units than it did before the fall. What do you do?</p>
            <div className="row">
              <button className="btn" onClick={() => choose('hold')}>Keep investing</button>
              <button className="btn" onClick={() => choose('pause')}>Pause my SIP</button>
              <button className="btn" onClick={() => choose('sell')}>Sell and sit in savings</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {finish && (
          <motion.div className="panel" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <h3 className="mini">Three years after the start</h3>
            <div className="outcomes">
              {finish.keys.map((k, i) => (
                <div key={k} className={'oc ' + (k === st.strat ? 'me' : '')}>
                  <span className="lab">{NAMES[k]}{k === st.strat ? ' (you)' : ''}</span>
                  <span className="bar"><motion.i style={{ background: COLS[k] }} initial={{ scaleX: 0 }} animate={{ scaleX: finish.vals[i] / finish.mx }} transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }} /></span>
                  <span className="num">{inr(finish.vals[i])}</span>
                </div>
              ))}
              <div className="oc">
                <span className="lab">If no fall had come</span>
                <span className="bar"><motion.i style={{ background: 'var(--line2)' }} initial={{ scaleX: 0 }} animate={{ scaleX: finish.base / finish.mx }} transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }} /></span>
                <span className="num">{inr(finish.base)}</span>
              </div>
            </div>
            <p className="verdict">{finish.msg} <span className="soft">Your plan did not change. Only the road to it did.</span></p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function BadYear({ S }) {
  const [si, setSi] = useState(0)
  const planKey = JSON.stringify([S.monthly, S.step, S.w])
  return (
    <section className="s" id="badyear">
      <Head eyebrow="04 · See a market fall first" title="Live through the fall before it is real." lede="We jump to year 3 of your plan and replay a market drop, month by month. These paths are shaped like real episodes such as 2008 and 2020. They are practice, not a forecast." />
      <div className="by">
        <Reveal>
          <div className="row" role="group" aria-label="Choose a scenario">
            {SCEN.map((s, i) => <Chip key={s.k} group="scen" on={si === i} onClick={() => setSi(i)}>{s.name}</Chip>)}
            <span className="soft" style={{ fontSize: 13 }}>{SCEN[si].desc}</span>
          </div>
        </Reveal>
        <Inner key={si + planKey} S={S} sc={SCEN[si]} />
      </div>
    </section>
  )
}
