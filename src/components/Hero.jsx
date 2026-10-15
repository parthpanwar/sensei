import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IsoScene, bbox } from '../lib/iso.jsx'
import { COL, GOALS, dateOf, expPath, fmt } from '../lib/model.js'
import { scrollToEl } from '../lib/ui.jsx'

const U = 15, H = 9
const D = 24

function build(data, prog, t, reduce) {
  const vmax = data[data.length - 1].v
  const out = []
  data.forEach((d, i) => {
    const ap = reduce ? 1 : Math.min(1, Math.max(0, prog * 14 - i * 0.9))
    const e = 1 - Math.pow(1 - ap, 3)
    const hv = Math.pow(d.v / vmax, 0.7) * H * e + 0.05
    let dip = 0
    if (i === 6) dip = reduce ? 0.6 : Math.pow(Math.max(0, Math.sin(t * 1.1)), 3)
    const loss = hv * 0.34 * dip, hn = hv - loss
    const hc = Math.min(hn, hn * (d.c / d.v)), hg = hn - hc
    const x = i * 1.45
    out.push({ key: 'c' + i, x, y: 0, z: 0, w: 1, d: 1.7, h: Math.max(hc, 0.04), c: COL.blue })
    if (hg > 0.02) out.push({ key: 'g' + i, x, y: 0, z: hc, w: 1, d: 1.7, h: hg, c: COL.green })
    if (loss > 0.03) out.push({ key: 'l' + i, x, y: 0, z: hn, w: 1, d: 1.7, h: loss, c: COL.red, op: 0.8 })
  })
  return out
}

function HeroScene({ S, booted }) {
  const reduce = useReducedMotion()
  const data = useMemo(() => {
    const path = expPath(S, D * 12)
    return Array.from({ length: 12 }, (_, i) => ({ v: path.V[(i + 1) * 24], c: path.C[(i + 1) * 24] }))
  }, [S.monthly, S.step, S.w.join()]) // eslint-disable-line
  const vb = useMemo(() => {
    const vmax = data[11].v
    return bbox(data.map((d, i) => ({ x: i * 1.45, y: 0, z: 0, w: 1, d: 1.7, h: Math.pow(d.v / vmax, 0.7) * H + 0.05 })), U)
  }, [data])
  const [fr, setFr] = useState({ p: 0, t: 0 })
  useEffect(() => {
    if (!booted) return
    if (reduce) { setFr({ p: 1, t: 0 }); return }
    let raf = 0
    const t0 = performance.now()
    const loop = (now) => {
      const t = (now - t0) / 1000
      setFr({ p: Math.min(1, t / 1.8), t })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [booted, reduce])
  const blocks = useMemo(() => build(data, fr.p, fr.t, reduce), [data, fr, reduce])
  return <IsoScene blocks={blocks} u={U} vb={vb} tween={false} role="img" aria-label="Isometric towers, one every two years. Blue is money you put in, green is what it grew. One tower dips in a market fall, then recovers." />
}

export default function Hero({ S, r, booted }) {
  const g = GOALS[S.goal]
  const live = isFinite(r.p50)
    ? <>At ₹{fmt(S.monthly)} a month, <strong>{g.label}</strong> most likely lands around <strong>{dateOf(r.p50)}</strong>. It could be {dateOf(r.p10)} or {isFinite(r.p90) ? dateOf(r.p90) : 'much later'}.</>
    : <>At ₹{fmt(S.monthly)} a month, {g.label} is out of reach in 50 years. Raise the amount below.</>
  const line = (txt, i, cls) => (
    <span className={'l ' + (cls || '')}>
      <motion.span style={{ display: 'block' }} initial={{ y: '115%' }} animate={booted ? { y: 0 } : {}} transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}>{txt}</motion.span>
    </span>
  )
  const fade = (i) => ({ initial: { opacity: 0, y: 18 }, animate: booted ? { opacity: 1, y: 0 } : {}, transition: { duration: 0.8, delay: 0.35 + i * 0.1, ease: [0.22, 1, 0.36, 1] } })
  return (
    <section className="hero">
      <div>
        <h1>{line('Money makes more sense', 0)}{line('with Sensei.', 1, 's')}</h1>
        <motion.p className="lede" {...fade(0)}>Your first stipend. Your first savings goal. Your first look at investing. Learn the fundamentals, explore your options, and discover what building wealth could look like one lesson at a time.</motion.p>
        <motion.div className="row" style={{ marginTop: 28 }} {...fade(1)}>
          <a className="btn primary" href="#plan" onClick={(e) => { e.preventDefault(); scrollToEl('#plan') }}>Build my plan</a>
          <a className="btn" href="#badyear" onClick={(e) => { e.preventDefault(); scrollToEl('#badyear') }}>See a market fall first</a>
        </motion.div>
        <motion.div {...fade(2)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={isFinite(r.p50) ? dateOf(r.p50) + g.label : 'x'} className="hero-live" id="heroLive" aria-live="polite"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              {live}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </div>
      <motion.div className="win"
        initial={{ opacity: 0, scaleY: 0.02, filter: 'brightness(3)' }}
        animate={booted ? { opacity: 1, scaleY: 1, filter: 'brightness(1)' } : {}}
        transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}>
        <div className="win-bar">
          <span className="dot" style={{ background: '#ff5f57' }} /><span className="dot" style={{ background: '#febc2e' }} /><span className="dot" style={{ background: '#28c840' }} />
          <span className="t">aarav · ₹{fmt(S.monthly)} a month · {S.w.join(' / ')} mix</span><span className="r">simulated</span>
        </div>
        <div className="stage"><HeroScene S={S} booted={booted} /></div>
        <div className="legend">
          <span><i style={{ background: '#3b73d6' }} />money you put in</span><span><i style={{ background: '#4fd17f' }} />what it grew</span>
          <span><i style={{ background: '#d94f4f' }} />a market fall</span><span className="faint">one tower every 2 years</span>
        </div>
      </motion.div>
    </section>
  )
}
