import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IsoScene, bbox } from '../lib/iso.jsx'
import { ASSETS, GOALS, clamp, contribAt, expPath, inr, marketRet, mulberry32, sum } from '../lib/model.js'
import { Head, Reveal, Tick } from '../lib/ui.jsx'

const HH = 8, U = 17, W = 2, D = 2
const VB = bbox([{ x: 0, y: 0, z: 0, w: W, d: D, h: HH + 0.5 }, { x: -0.25, y: -0.25, z: 0, w: W + 0.5, d: D + 0.5, h: 0.1 }], U, [{ x: W + 0.7, y: 0, z: HH + 0.5, t: 'plan pace' }, { x: W + 0.7, y: 0, z: 0, t: 'plan pace' }])

function step(h, n, rng, S) {
  const vals = h.vals.slice()
  let put = h.put, m = h.m
  for (let k = 0; k < n; k++) {
    const c = contribAt(S, m)
    for (let i = 0; i < 3; i++) vals[i] += (c * S.w[i]) / 100
    put += c
    const rt = marketRet(rng)
    for (let i = 0; i < 3; i++) vals[i] *= 1 + rt[i]
    m++
  }
  return { vals, put, m }
}

const collapse = { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }

export default function Hold({ S }) {
  const key = JSON.stringify([S.monthly, S.step, S.w, S.goal])
  const rng = useRef(null)
  const init = () => { rng.current = mulberry32(77); return step({ vals: [0, 0, 0], put: 0, m: 0 }, 18, rng.current, S) }
  const [h, setH] = useState(init)
  const first = useRef(true)
  const [showTable, setShowTable] = useState(false)
  useEffect(() => { if (first.current) { first.current = false; return } setH(init()) }, [key]) // eslint-disable-line

  const goal = GOALS[S.goal].v
  const v = sum(h.vals)
  const exp = useMemo(() => expPath(S, Math.max(h.m, 1)).V[h.m] || 0, [key, h.m]) // eslint-disable-line
  const hv = Math.max(0.15, HH * Math.sqrt(clamp(v / goal, 0, 1)))
  const he = Math.max(0.15, HH * Math.sqrt(clamp(exp / goal, 0, 1)))
  const blocks = useMemo(() => {
    const b = [{ key: 'goalT', x: 0, y: 0, z: 0, w: W, d: D, h: HH, wire: true, stroke: 'var(--ghost)', op: 0.45 }]
    let z = 0
    h.vals.forEach((x, i) => {
      const sh = (hv * x) / (v || 1)
      b.push({ key: 'seg' + i, x: 0.15, y: 0.15, z, w: W - 0.3, d: D - 0.3, h: Math.max(sh, 0.001), c: ASSETS[i].c })
      z += sh
    })
    b.push({ key: 'plan', x: -0.25, y: -0.25, z: he, w: W + 0.5, d: D + 0.5, h: 0, wire: true, flat: true, stroke: 'var(--gold)', op: 0.95 })
    return b
  }, [h, hv, he, v])
  const labels = useMemo(() => [
    { key: 'plan', x: W + 0.7, y: 0, z: he, t: 'plan pace', fill: 'var(--gold)' },
    { key: 'goal', x: W + 0.7, y: 0, z: HH + (Math.abs(he - HH) < 0.7 ? 0.7 : 0), t: 'goal' },
  ], [he])

  const ratio = exp ? v / exp : 1
  const diff = h.m ? Math.round((Math.abs(v - exp) / Math.max(exp, 1)) * 100) : 0
  let cls = 'ok', txt = 'On pace', sent = 'You are on pace. Nothing to do except the next month.'
  if (ratio > 1.03) { txt = 'Ahead'; sent = 'You are ahead of plan. Markets have been kind so far, which is not guaranteed to last.' }
  else if (ratio < 0.97) { cls = ratio < 0.88 ? 'bad' : 'warn'; txt = 'Behind'; sent = `You are ${diff}% behind plan right now. That is normal in a real market, and it does not change the plan.` }
  const pct = (v / goal) * 100
  const sh = h.vals.map((x) => (x / (v || 1)) * 100)
  const drift = S.w.map((t, i) => sh[i] - t)
  const mx = drift.reduce((a, b, i) => (Math.abs(b) > Math.abs(drift[a]) ? i : a), 0)
  const nudge = Math.abs(drift[mx]) >= 8

  return (
    <section className="s" id="hold">
      <Head eyebrow="03 · Manage it over time" title="One tower, one sentence." lede="This is a sample run of your plan, already 18 months in. Add a month or jump a year. The gold outline is where the plan expected you to be." />
      <div className="hold">
        <Reveal className="win" style={{ alignSelf: 'start' }}>
          <div className="win-bar"><span className="t">Month <Tick value={h.m} duration={400} /> of your plan</span><span className="r">sample run</span></div>
          <div className="stage"><div className="scene"><IsoScene blocks={blocks} u={U} vb={VB} labels={labels} role="img" aria-label="An isometric tower showing what you hold, with a dashed goal tower around it." /></div></div>
          <div className="legend"><span><i style={{ background: '#3b73d6' }} />Safe</span><span><i style={{ background: '#d99f3a' }} />Steady</span><span><i style={{ background: '#4fd17f' }} />Growth</span></div>
        </Reveal>
        <Reveal className="panel" delay={0.08} style={{ display: 'flex', flexDirection: 'column' }}>
          <div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={txt} className={'pill ' + cls} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>{txt}</motion.span>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={sent} className="status" aria-live="polite" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>{sent}</motion.p>
          </AnimatePresence>
          <div className="trio">
            <div><small>Worth now</small><strong className="num"><Tick value={v} format={inr} /></strong></div>
            <div><small>You put in</small><strong className="num"><Tick value={h.put} format={inr} /></strong></div>
            <div><small>To goal</small><strong className="num"><Tick value={pct} format={(n) => (n < 10 ? n.toFixed(1) : Math.round(n)) + '%'} /></strong>
              <div className="prog"><motion.i initial={false} animate={{ scaleX: Math.min(1, pct / 100) }} transition={{ type: 'spring', stiffness: 120, damping: 24 }} /></div></div>
          </div>
          <AnimatePresence initial={false}>
            {nudge && (
              <motion.div className="collapse" {...collapse}>
                <div className="nudge" style={{ marginBottom: 16 }}>
                  <span><b>{ASSETS[mx].name}</b> is now {Math.round(sh[mx])}% of your money. The plan says {S.w[mx]}%. Rebalancing sells a little of what grew and tops up the rest.</span>
                  <div className="row"><button className="btn sm" onClick={() => setH((o) => ({ ...o, vals: S.w.map((x) => (sum(o.vals) * x) / 100) }))}>Rebalance to plan</button></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="row">
            <motion.button className="btn primary" whileTap={{ scale: 0.97 }} onClick={() => setH((o) => step(o, 1, rng.current, S))}>Add month {h.m + 1} · ₹{Math.round(contribAt(S, h.m)).toLocaleString('en-IN')}</motion.button>
            <motion.button className="btn" whileTap={{ scale: 0.97 }} onClick={() => setH((o) => step(o, 12, rng.current, S))}>Skip ahead a year</motion.button>
            <motion.button className="btn" whileTap={{ scale: 0.97 }} onClick={() => setH(init())}>Reset</motion.button>
          </div>
          <div style={{ marginTop: 18 }}>
            <button className="chip" aria-expanded={showTable} onClick={() => setShowTable((x) => !x)}>{showTable ? 'Hide holdings' : 'Show holdings'}</button>
          </div>
          <AnimatePresence initial={false}>
            {showTable && (
              <motion.div className="collapse" {...collapse}>
                <div className="tscroll">
                  <table>
                    <thead><tr><th>Bucket</th><th>Held in</th><th>Worth</th><th>Share · plan</th></tr></thead>
                    <tbody>
                      {ASSETS.map((a, i) => (
                        <tr key={a.k}><td><span className="sw-dot" style={{ background: a.css }} />{a.name}</td><td>{a.sub}</td><td className="num">{inr(h.vals[i])}</td><td className="num">{Math.round(sh[i])}% · {S.w[i]}%</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  )
}
